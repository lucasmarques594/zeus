# Arquitetura Técnica

> Última atualização: 2026-05-08

## 1. Visão geral

O `pizzaria-game` é uma **SPA estática** que roda 100% no navegador. Toda a lógica de jogo, parsing e execução da DSL acontece no client. O backend (KRATOS, repo separado) é usado apenas para autenticação, persistência de scores e leaderboard global.

```
┌─────────────────────────────────────────────────────┐
│  Browser do jogador                                 │
│                                                     │
│  ┌──────────────┐    ┌──────────────────────────┐  │
│  │  Phaser 3    │    │  Engine da DSL           │  │
│  │  (renderer)  │◄──►│  Lexer → Parser → AST    │  │
│  │              │    │  Interpreter (generator) │  │
│  └──────┬───────┘    └──────────┬───────────────┘  │
│         │                       │                  │
│         └───────────┬───────────┘                  │
│                     ▼                              │
│            ┌────────────────┐                      │
│            │  WorldHandle   │                      │
│            │  (game/world)  │                      │
│            └────────────────┘                      │
│                     │                              │
│  ┌──────────────────┴───────────┐                  │
│  │  Monaco Editor               │                  │
│  │  (input do código)           │                  │
│  └──────────────────────────────┘                  │
└──────────────────────┬──────────────────────────────┘
                       │ HTTP (Bearer JWT)
                       ▼
┌─────────────────────────────────────────────────────┐
│  KRATOS Backend (repo separado)                     │
│  - POST /auth/login                                 │
│  - POST /runs                                       │
│  - GET  /leaderboard/:gameId                        │
└─────────────────────────────────────────────────────┘
```

## 2. Camadas

### 2.1. Engine (`src/engine/`)

Implementação completa da linguagem Portugol-Pizzaria.

| Arquivo | Responsabilidade |
|---|---|
| `lexer.ts` | Tokenização (Chevrotain) |
| `parser.ts` | Parsing (Chevrotain CstParser → AST) |
| `ast.ts` | Definições TypeScript dos nós da AST |
| `interpreter.ts` | AST walker baseado em generator function |
| `errors.ts` | Catálogo central de erros didáticos |
| `i18n/pt-BR.ts` | Mensagens de erro em PT-BR |

**Princípio de design:** a engine não sabe nada sobre Phaser, KRATOS ou DOM. Ela é uma biblioteca pura de TS, testável isoladamente. Recebe um `WorldHandle` (interface) e devolve resultado de execução.

### 2.2. Game (`src/game/`)

Lógica de domínio do mundo do jogo.

| Arquivo | Responsabilidade |
|---|---|
| `world.ts` | Estado do mundo (grid, player, items) + implementa `WorldHandle` |
| `pizzeria.ts` | Regras específicas (cozimento, pedidos, ingredientes) |
| `orders.ts` | Sistema de pedidos (geração, fila, paciência) |
| `scoring.ts` | Cálculo de score por nível |

**Princípio:** a camada Game não sabe nada sobre renderização. Ela mantém o estado e expõe operações puras. O Phaser observa o estado e renderiza.

### 2.3. Scenes (`src/scenes/`)

Cenas do Phaser. São a camada de apresentação.

| Cena | Função |
|---|---|
| `BootScene` | Carrega assets (sprites, tilemaps) |
| `MenuScene` | Menu principal (login, continuar) |
| `LevelSelectScene` | Seleção de nível |
| `GameScene` | Renderização do jogo + integração com editor |
| `EditorScene` | Editor de código Monaco (overlay sobre GameScene) |

### 2.4. API (`src/api/`)

Cliente HTTP do KRATOS. Camada fina, sem lógica de negócio.

## 3. Fluxo de execução de uma run

1. **Jogador escreve código** no Monaco Editor.
2. **Clique em "Executar"**: `parse(source)` → AST.
3. Se houver erro de sintaxe: exibe mensagens didáticas, não executa.
4. **Cria `Interpreter`** com AST + `WorldHandle` do nível atual.
5. **Game loop do Phaser**: a cada frame (ou conforme velocidade), chama `interp.step()`.
6. Cada step:
   - Avalia parte da AST.
   - Se chama um built-in (ex: `mover("leste")`), invoca `world.callBuiltin()`.
   - World atualiza estado interno (move o sprite, atualiza ticks).
   - Phaser observa mudança e renderiza.
7. **Quando programa termina**:
   - `world.evaluateWinCondition()` checa se o nível foi vencido.
   - Calcula score com `scoring.compute(world, level)`.
   - Se vitória: chama `kratosClient.submitRun(...)`.
   - Exibe modal de resultado com score e leaderboard.

## 4. Decisões arquiteturais (ADRs)

### ADR-001: AST walker em vez de eval/Function/Worker

**Contexto:** Precisamos executar código do jogador de forma segura, controlada e pedagógica.

**Decisão:** Implementar AST walker próprio com generator function.

**Consequências:**
- ✅ Sandbox por construção (não há acesso a APIs do browser)
- ✅ Step-by-step debug visual viável
- ✅ Controle preciso de tick rate
- ✅ Limites de execução triviais
- ❌ Mais código pra manter
- ❌ Performance inferior a eval (irrelevante pra jogo turn-based)

**Alternativas rejeitadas:**
- `eval()`: inseguro, sem controle de tempo
- `new Function()`: idem, leak de globalThis
- Web Worker com JS: perde debug visual, IPC chato
- QuickJS-WASM: complexidade desproporcional

### ADR-002: Portugol como DSL

Ver discussão completa em `dsl-spec.md` seção 1.

### ADR-003: Repositório separado do KRATOS

**Contexto:** O KRATOS é uma plataforma de jogos educativos genérica. O `pizzaria-game` é um jogo específico.

**Decisão:** Mantê-los em repos separados, com KRATOS expondo API REST.

**Consequências:**
- ✅ Bounded contexts respeitados
- ✅ Deploy independente (jogo vai pra CDN, KRATOS pra VPS)
- ✅ KRATOS pode hospedar outros jogos no futuro
- ❌ Necessidade de versionamento de API entre os dois

### ADR-004: Tick-based em vez de real-time

**Contexto:** Precisamos de leaderboard justo e replay determinístico.

**Decisão:** Modelo tick-based puro. Cada built-in consome ticks fixos.

**Consequências:**
- ✅ Score reproduzível (mesmo código → mesmo score)
- ✅ Replay viável no futuro (anti-cheat opcional)
- ✅ Speed control trivial (1x, 2x, 5x, 10x)
- ❌ Não suporta gameplay real-time (não é nosso caso)

## 5. Integração com KRATOS

### 5.1. Mudanças necessárias no KRATOS

Para suportar o pizzaria-game, o backend KRATOS precisa de:

1. **Nova entidade `Run`** (separada de `GameSession`):
   ```typescript
   interface Run {
     id: string
     userId: string         // referencia User direto, não Child
     gameId: string         // 'pizzaria-game'
     levelId: number
     score: number          // unbounded (não cap em 100)
     ticksUsed: number
     pizzasDelivered: number
     pizzasBurned: number
     sourceCode: string     // código do jogador (anti-cheat manual)
     dslVersion: string
     completedAt: Date
   }
   ```

2. **Endpoints novos**:
   - `POST /runs` — submeter resultado
   - `GET /runs/me` — histórico pessoal
   - `GET /leaderboard/:gameId?level=N&limit=M` — top N por nível

3. **Índice composto** em MongoDB:
   - `{ gameId: 1, levelId: 1, score: -1 }`

4. **Rate limiting** em `/runs`:
   - 10 submissões/min por usuário (impede spam)

5. **Verificação de JWT_SECRET** em produção:
   - Remover fallback hardcoded em `auth.routes.ts`
   - Falhar fast se a env var não existir

Ver detalhes em `../KRATOS/backend/src/...` (repo separado).

### 5.2. Versionamento

A versão da DSL é incluída em todo payload. Mudanças incompatíveis na linguagem invalidam runs antigas (não são exibidas no leaderboard da nova versão), mas runs antigas permanecem no histórico pessoal.

## 6. Performance

### 6.1. Bundle size

Targets:
- Initial bundle: < 500KB gzipped
- Lazy-loaded chunks: Phaser (~200KB), Monaco (~400KB), Chevrotain (~80KB)

### 6.2. Runtime

- Game loop: 60 FPS estável
- Step do interpreter: < 1ms para operações simples
- Parsing: < 10ms para programas de até 200 linhas

## 7. Testes

### 7.1. Estratégia

- **Unit tests** (`tests/engine/`): cobertura ampla do parser e interpretador
- **Integration tests**: parse + interpret + executa contra um WorldMock
- **Snapshot tests**: programas de referência → resultado esperado
- **E2E**: a definir (Playwright?)

### 7.2. Casos críticos

- Cada nível tem teste com sua `referenceSolution` que **deve passar**
- Programas com loops infinitos param dentro do limite de ticks
- Mensagens de erro são consistentes (snapshot)

# Pizzaria Code 🍕

> Jogo educativo de programação inspirado em *The Farmer Was Replaced*, com tema de pizzaria e DSL em **Portugol** (português brasileiro).
>
> Público-alvo: 12-14 anos aprendendo programação pela primeira vez.

[![Status](https://img.shields.io/badge/status-MVP%20jog%C3%A1vel-green)]()
[![DSL](https://img.shields.io/badge/DSL-Portugol-yellow)]()
[![Stack](https://img.shields.io/badge/stack-TypeScript%20%7C%20Canvas%202D%20%7C%20Vite-blue)]()
[![Bundle](https://img.shields.io/badge/bundle-52KB%20%2F%2015KB%20gzip-success)]()

---

## 🎯 Sobre

O jogador escreve código em **Portugol** (português brasileiro) para automatizar uma pizzaria. Conforme progride, desbloqueia novos comandos e estruturas (loops, condicionais, funções), aprendendo conceitos de programação estruturada de forma natural.

**Status atual:** MVP jogável com **6 níveis** funcionais (0-5), motor de DSL completo, renderer Canvas 2D com pixel art procedural, editor de código integrado.

A integração com backend (autenticação, leaderboard global, persistência) está prevista para conexão futura com o projeto irmão **[KRATOS](https://github.com/Dionromero/KRATOS)** — o cliente HTTP já está stub-ado em `src/api/`.

---

## ✨ O que funciona hoje

- ✅ **Lexer hand-written** com indentação significativa (Python-style)
- ✅ **Parser recursivo descendente** com error recovery
- ✅ **Interpretador generator-based** com controle de tick, sandbox e limites
- ✅ **6 níveis** com curva pedagógica suave (de "mover 1 casa" até "loops + atendimento"):
  - Nível 0 — Primeira instrução (`mover`)
  - Nível 1 — Sequência de comandos
  - Nível 2 — Repetição manual (proposital)
  - Nível 3 — Loop `para` (introdução)
  - Nível 4 — `pegar()` + `entregar()` (interação)
  - Nível 5 — `enquanto` + múltiplos pedidos
- ✅ **Pixel art procedural** desenhada via Canvas 2D (sem assets externos)
- ✅ **Editor integrado** com Tab=4 espaços, Ctrl+Enter executa, dicas, mostra solução
- ✅ **Mensagens de erro didáticas** em PT-BR
- ✅ **Speed control** (1x até 30x) e pause/resume
- ✅ **12 testes passando** cobrindo lexer + integração end-to-end

## 🗺️ Roadmap

- [ ] Níveis 6-10 (já desenhados em `docs/levels.json`, falta implementar): `senao_se`, `funcao`, montagem de pizza, forno
- [ ] Syntax highlight no editor (CodeMirror leve)
- [ ] Integração KRATOS (auth + submissão de score + leaderboard)
- [ ] Animações de transição entre tiles (lerp do movimento)
- [ ] Som (clique de botão, sucesso, falha)
- [ ] Modo step-by-step com highlight da linha em execução

---

## 🚀 Começando

### Pré-requisitos

- Node.js >= 20 (ou Bun)

### Instalação

```bash
git clone <url-deste-repo> pizzaria-game
cd pizzaria-game
npm install
```

### Rodar em modo dev

```bash
npm run dev
```

Abre em `http://localhost:5173` automaticamente. Você verá:

- **Header** com logo "PizzariaCode"
- **Sidebar** à esquerda com a lista dos níveis (clique pra navegar)
- **Painel de história** explicando o nível atual
- **Canvas** com o mundo do jogo renderizado
- **Editor** de Portugol embaixo
- **Console** com mensagens de execução e erros

Comece pelo **Nível 0**: escreva `mover("leste")` no editor e clique em ▶ Executar (ou Ctrl+Enter).

### Build de produção

```bash
npm run build
```

Gera `dist/` com bundle de ~52KB (15KB gzipped). Pode servir em qualquer CDN (Cloudflare Pages, Vercel, GitHub Pages, etc).

### Testes

```bash
npm test
```

Roda 12 testes cobrindo lexer e integração engine+world. As `referenceSolution` de cada nível viram regressão automática — se você quebrar a engine, o teste do nível falha.

### Type checking

```bash
npm run typecheck
```

---

## 🏗️ Stack técnico

| Camada | Tecnologia | Por quê |
|---|---|---|
| Linguagem | TypeScript 5.6 strict | Type safety, alinhamento com KRATOS |
| Build | Vite 5.4 | HMR rápido, bundle enxuto |
| Renderer | Canvas 2D puro | Zero dependências, pixel art procedural |
| Parser | Hand-written (recursive descent) | Controle total de mensagens de erro em PT-BR |
| Execução | Generator function | Sandbox + tick control + step-by-step |
| Testes | Vitest 2.0 | Roda em ESM, mesma config do Vite |

**Decisão deliberada:** sem Phaser, sem Monaco, sem Chevrotain. Esses são bons frameworks mas pra um MVP educativo eles trazem overhead de bundle (1MB+) e complexidade desproporcional. Quando o jogo crescer, dá pra trocar pedaços específicos sem reescrever o motor.

---

## 📁 Estrutura

```
pizzaria-game/
├── docs/                      # Documentação de design
│   ├── dsl-spec.md            # Especificação completa da linguagem
│   ├── levels.json            # 11 níveis desenhados (6 implementados)
│   ├── error-catalog.md       # Catálogo de erros em PT-BR
│   └── architecture.md        # Decisões arquiteturais (ADRs)
│
├── src/
│   ├── engine/                # Interpretador da DSL
│   │   ├── lexer.ts           # Tokenizer hand-written
│   │   ├── parser.ts          # Parser recursivo descendente
│   │   ├── ast.ts             # Definições da AST
│   │   ├── interpreter.ts     # AST walker generator-based
│   │   └── errors.ts          # Catálogo de erros
│   │
│   ├── game/                  # Lógica de domínio
│   │   ├── world.ts           # Mundo + WorldHandle + built-ins
│   │   ├── types.ts           # Tipos compartilhados
│   │   └── levels.ts          # Níveis 0-5 implementados
│   │
│   ├── ui/                    # Interface
│   │   ├── app.ts             # Orquestra tudo (editor, canvas, controles)
│   │   └── renderer.ts        # Canvas 2D com pixel art procedural
│   │
│   ├── api/                   # Cliente KRATOS (stub para conexão futura)
│   │   └── kratos-client.ts
│   │
│   ├── main.ts                # Entry point
│   └── style.css              # CSS com identidade visual
│
├── tests/engine/
│   ├── lexer.test.ts          # Testes do tokenizer
│   └── integration.test.ts    # End-to-end com níveis de referência
│
├── index.html
├── package.json
├── tsconfig.json
├── vite.config.ts
└── README.md
```

---

## 🎮 Como jogar

1. Abre `http://localhost:5173` depois do `npm run dev`
2. Lê a história e o objetivo do nível atual
3. Escreve o código no editor (Portugol — em português, indentação por 4 espaços)
4. Clica em ▶ Executar (ou Ctrl+Enter)
5. Vê o entregador se mover no canvas
6. Se acertar: ✅ vitória com pontuação. Se errar: console mostra o que aconteceu
7. Avança pro próximo nível na sidebar

**Atalhos do editor:**
- `Ctrl+Enter` (ou `Cmd+Enter`) — executar
- `Tab` — inserir 4 espaços (indentação)

---

## 🔌 Integração futura com KRATOS

O cliente HTTP já está pronto em `src/api/kratos-client.ts` com os endpoints planejados:

- `POST /auth/login` → autenticação
- `POST /runs` → submissão de score após cada nível
- `GET /leaderboard/:gameId` → top N global

Pra conectar:

1. **No KRATOS**, criar entidade `Run` (separada de `GameSession`), adicionar endpoint POST /runs, criar índice composto `{ gameId, levelId, score: -1 }` no MongoDB
2. **No `pizzaria-game`**, descomentar a chamada `kratosClient.submitRun(...)` em `src/ui/app.ts` (`checkVictory()`)
3. **Adicionar tela de login** antes do jogo, salvando o JWT em memória (não localStorage por enquanto)

Ver `docs/architecture.md` seção 5 para detalhes.

---

## 📚 Documentação

Toda a documentação de design está em `docs/`:

- **[`dsl-spec.md`](docs/dsl-spec.md)** — Especificação da linguagem (gramática, built-ins, semântica)
- **[`levels.json`](docs/levels.json)** — Definição dos 11 níveis (6 implementados, 5 desenhados)
- **[`error-catalog.md`](docs/error-catalog.md)** — Catálogo de mensagens de erro
- **[`architecture.md`](docs/architecture.md)** — Decisões técnicas e ADRs

---

## 🤝 Contribuindo

Projeto pessoal em fase inicial. Issues e sugestões bem-vindas, especialmente:

- Feedback pedagógico depois de testar com crianças reais
- Bugs no parser ou interpretador
- Ideias de novos níveis ou mecânicas

---

## 📄 Licença

A definir.

---

## 🙏 Agradecimentos

- [The Farmer Was Replaced](https://store.steampowered.com/app/2060160/The_Farmer_Was_Replaced/) — inspiração direta do modelo de gameplay
- [Portugol Studio](https://univali-lite.github.io/Portugol-Studio/) — referência para a sintaxe da DSL

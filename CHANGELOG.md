# Changelog

## [0.1.0] — MVP jogável

### Adicionado
- **Documentação de design completa** (`docs/`)
  - Especificação da DSL Portugol-Pizzaria
  - 11 níveis desenhados (6 implementados)
  - Catálogo de erros didáticos em PT-BR
  - Arquitetura técnica com ADRs

- **Motor da DSL** (`src/engine/`)
  - Lexer hand-written com indentação significativa
  - Parser recursivo descendente com error recovery
  - Interpretador generator-based com tick control e sandbox
  - Catálogo de erros centralizado

- **Mundo do jogo** (`src/game/`)
  - 14 funções built-in (mover, virar, pegar, entregar, etc)
  - Sistema de pedidos com fila
  - Forno com estados (cozinhando/pronto/queimado)
  - 6 níveis implementados (0-5)

- **Interface** (`src/ui/`)
  - Canvas 2D com pixel art procedural
  - Editor de Portugol com atalhos (Ctrl+Enter, Tab)
  - Sidebar com lista de níveis
  - Console de logs e painel de erros
  - Speed control (1x-30x), pause/resume

- **Cliente KRATOS** (`src/api/`)
  - Stub para integração futura (auth + submitRun + leaderboard)

- **Testes**
  - 7 testes do lexer
  - 5 testes de integração end-to-end
  - Soluções de referência dos níveis viram regressão automática

### Pendente
- Implementar níveis 6-10 (já desenhados em `docs/levels.json`)
- Syntax highlight no editor
- Integração com KRATOS (auth + submissão de score)
- Animações de transição do movimento
- Som

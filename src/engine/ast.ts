/**
 * Definições de nós da AST do Portugol-Pizzaria.
 *
 * A árvore sintática abstrata é o resultado do parser e a entrada do interpretador.
 * Todos os nós têm metadata de localização (linha/coluna) para mensagens de erro.
 *
 * Ver: docs/dsl-spec.md seção 3 (Gramática EBNF)
 */

export interface SourceLocation {
  line: number
  column: number
}

export interface NodeBase {
  loc: SourceLocation
}

// ============================================================================
// Programa (raiz)
// ============================================================================

export interface Program extends NodeBase {
  type: 'Program'
  body: Statement[]
}

// ============================================================================
// Statements
// ============================================================================

export type Statement =
  | Assignment
  | IfStatement
  | WhileStatement
  | ForStatement
  | FunctionDeclaration
  | ReturnStatement
  | BreakStatement
  | ContinueStatement
  | ExpressionStatement

export interface Assignment extends NodeBase {
  type: 'Assignment'
  target: Identifier
  value: Expression
}

export interface IfStatement extends NodeBase {
  type: 'IfStatement'
  test: Expression
  consequent: Statement[]
  alternates: { test: Expression; body: Statement[] }[] // senao_se
  alternate: Statement[] | null // senao
}

export interface WhileStatement extends NodeBase {
  type: 'WhileStatement'
  test: Expression
  body: Statement[]
}

export interface ForStatement extends NodeBase {
  type: 'ForStatement'
  variable: Identifier
  start: Expression
  end: Expression
  step: Expression | null
  body: Statement[]
}

export interface FunctionDeclaration extends NodeBase {
  type: 'FunctionDeclaration'
  name: Identifier
  params: Identifier[]
  body: Statement[]
}

export interface ReturnStatement extends NodeBase {
  type: 'ReturnStatement'
  argument: Expression | null
}

export interface BreakStatement extends NodeBase {
  type: 'BreakStatement'
}

export interface ContinueStatement extends NodeBase {
  type: 'ContinueStatement'
}

export interface ExpressionStatement extends NodeBase {
  type: 'ExpressionStatement'
  expression: Expression
}

// ============================================================================
// Expressões
// ============================================================================

export type Expression =
  | NumberLiteral
  | StringLiteral
  | BooleanLiteral
  | NullLiteral
  | Identifier
  | BinaryExpression
  | UnaryExpression
  | LogicalExpression
  | CallExpression

export interface NumberLiteral extends NodeBase {
  type: 'NumberLiteral'
  value: number
}

export interface StringLiteral extends NodeBase {
  type: 'StringLiteral'
  value: string
}

export interface BooleanLiteral extends NodeBase {
  type: 'BooleanLiteral'
  value: boolean
}

export interface NullLiteral extends NodeBase {
  type: 'NullLiteral'
}

export interface Identifier extends NodeBase {
  type: 'Identifier'
  name: string
}

export type BinaryOperator = '+' | '-' | '*' | '/' | '%' | '==' | '!=' | '<' | '>' | '<=' | '>='

export interface BinaryExpression extends NodeBase {
  type: 'BinaryExpression'
  operator: BinaryOperator
  left: Expression
  right: Expression
}

export type UnaryOperator = '-' | 'nao'

export interface UnaryExpression extends NodeBase {
  type: 'UnaryExpression'
  operator: UnaryOperator
  argument: Expression
}

export type LogicalOperator = 'e' | 'ou'

export interface LogicalExpression extends NodeBase {
  type: 'LogicalExpression'
  operator: LogicalOperator
  left: Expression
  right: Expression
}

export interface CallExpression extends NodeBase {
  type: 'CallExpression'
  callee: Identifier
  args: Expression[]
}

// ============================================================================
// Helpers
// ============================================================================

export type AnyNode = Program | Statement | Expression

import type {
  Program,
  Statement,
  Expression,
  Assignment,
  IfStatement,
  WhileStatement,
  ForStatement,
  FunctionDeclaration,
  ReturnStatement,
  BreakStatement,
  ContinueStatement,
  ExpressionStatement,
  Identifier,
  BinaryExpression,
  BinaryOperator,
  CallExpression,
} from './ast'
import type { Token, TokenType } from './lexer'
import { tokenize } from './lexer'
import type { DSLError } from './errors'

export interface ParseResult {
  ast: Program | null
  errors: DSLError[]
}

class ParseError extends Error {
  constructor(public readonly dslError: DSLError) {
    super(dslError.message)
  }
}

export class Parser {
  private pos = 0
  private errors: DSLError[] = []

  constructor(private readonly tokens: Token[]) {}

  parse(): ParseResult {
    const body: Statement[] = []
    const firstToken = this.tokens[0]
    const startLoc = { line: firstToken?.line ?? 1, column: firstToken?.column ?? 1 }

    while (this.peek().type === 'NEWLINE') this.advance()

    while (this.peek().type !== 'EOF') {
      try {
        const stmt = this.parseStatement()
        if (stmt) body.push(stmt)
      } catch (e) {
        if (e instanceof ParseError) {
          this.errors.push(e.dslError)
          this.synchronize()
        } else {
          throw e
        }
      }
      while (this.peek().type === 'NEWLINE') this.advance()
    }

    const ast: Program = {
      type: 'Program',
      loc: startLoc,
      body,
    }

    return { ast, errors: this.errors }
  }

  private parseStatement(): Statement | null {
    const tok = this.peek()
    switch (tok.type) {
      case 'SE':
        return this.parseIf()
      case 'ENQUANTO':
        return this.parseWhile()
      case 'PARA':
        return this.parseFor()
      case 'FUNCAO':
        return this.parseFunction()
      case 'RETORNAR':
        return this.parseReturn()
      case 'PARAR':
        return this.parseBreak()
      case 'CONTINUAR':
        return this.parseContinue()
      case 'NEWLINE':
      case 'DEDENT':
        this.advance()
        return null
      default:
        return this.parseAssignmentOrExpr()
    }
  }

  private parseIf(): IfStatement {
    const seTok = this.expect('SE', "esperava 'se'")
    const test = this.parseExpression()
    this.expect('COLON', "esperava ':' depois da condição")
    const consequent = this.parseBlock()

    const alternates: { test: Expression; body: Statement[] }[] = []
    while (this.peek().type === 'SENAO_SE') {
      this.advance()
      const altTest = this.parseExpression()
      this.expect('COLON', "esperava ':' depois da condição do 'senao_se'")
      const altBody = this.parseBlock()
      alternates.push({ test: altTest, body: altBody })
    }

    let alternate: Statement[] | null = null
    if (this.peek().type === 'SENAO') {
      this.advance()
      this.expect('COLON', "esperava ':' depois de 'senao'")
      alternate = this.parseBlock()
    }

    return {
      type: 'IfStatement',
      loc: { line: seTok.line, column: seTok.column },
      test,
      consequent,
      alternates,
      alternate,
    }
  }

  private parseWhile(): WhileStatement {
    const tok = this.expect('ENQUANTO', "esperava 'enquanto'")
    const test = this.parseExpression()
    this.expect('COLON', "esperava ':' depois da condição")
    const body = this.parseBlock()
    return {
      type: 'WhileStatement',
      loc: { line: tok.line, column: tok.column },
      test,
      body,
    }
  }

  private parseFor(): ForStatement {
    const tok = this.expect('PARA', "esperava 'para'")
    const varTok = this.expect('IDENT', 'esperava nome de variável depois de "para"')
    const variable: Identifier = {
      type: 'Identifier',
      loc: { line: varTok.line, column: varTok.column },
      name: varTok.value,
    }
    this.expect('DE', "esperava 'de' depois do nome da variável")
    const start = this.parseExpression()
    this.expect('ATE', "esperava 'ate' depois do valor inicial")
    const end = this.parseExpression()
    let step: Expression | null = null
    if (this.peek().type === 'PASSO') {
      this.advance()
      step = this.parseExpression()
    }
    this.expect('COLON', "esperava ':' antes do bloco do 'para'")
    const body = this.parseBlock()
    return {
      type: 'ForStatement',
      loc: { line: tok.line, column: tok.column },
      variable,
      start,
      end,
      step,
      body,
    }
  }

  private parseFunction(): FunctionDeclaration {
    const tok = this.expect('FUNCAO', "esperava 'funcao'")
    const nameTok = this.expect('IDENT', 'esperava nome da função')
    const name: Identifier = {
      type: 'Identifier',
      loc: { line: nameTok.line, column: nameTok.column },
      name: nameTok.value,
    }
    this.expect('LPAREN', "esperava '(' depois do nome da função")
    const params: Identifier[] = []
    if (this.peek().type !== 'RPAREN') {
      do {
        const p = this.expect('IDENT', 'esperava nome de parâmetro')
        params.push({
          type: 'Identifier',
          loc: { line: p.line, column: p.column },
          name: p.value,
        })
        if (this.peek().type === 'COMMA') this.advance()
        else break
      } while (this.peek().type !== 'RPAREN' && this.peek().type !== 'EOF')
    }
    this.expect('RPAREN', "esperava ')' depois dos parâmetros")
    this.expect('COLON', "esperava ':' antes do corpo da função")
    const body = this.parseBlock()
    return {
      type: 'FunctionDeclaration',
      loc: { line: tok.line, column: tok.column },
      name,
      params,
      body,
    }
  }

  private parseReturn(): ReturnStatement {
    const tok = this.expect('RETORNAR', "esperava 'retornar'")
    let argument: Expression | null = null
    if (this.peek().type !== 'NEWLINE' && this.peek().type !== 'EOF') {
      argument = this.parseExpression()
    }
    return {
      type: 'ReturnStatement',
      loc: { line: tok.line, column: tok.column },
      argument,
    }
  }

  private parseBreak(): BreakStatement {
    const tok = this.expect('PARAR', "esperava 'parar'")
    return { type: 'BreakStatement', loc: { line: tok.line, column: tok.column } }
  }

  private parseContinue(): ContinueStatement {
    const tok = this.expect('CONTINUAR', "esperava 'continuar'")
    return { type: 'ContinueStatement', loc: { line: tok.line, column: tok.column } }
  }

  private parseAssignmentOrExpr(): Statement {
    const expr = this.parseExpression()
    if (this.peek().type === 'ASSIGN') {
      if (expr.type !== 'Identifier') {
        throw new ParseError({
          kind: 'syntax',
          code: 'E008',
          loc: expr.loc,
          message: `🍕 Não dá pra atribuir valor aqui (linha ${expr.loc.line})`,
          hint: "Só dá pra usar '=' com um nome de variável do lado esquerdo.",
        })
      }
      this.advance()
      const value = this.parseExpression()
      const assignment: Assignment = {
        type: 'Assignment',
        loc: expr.loc,
        target: expr,
        value,
      }
      return assignment
    }
    const exprStmt: ExpressionStatement = {
      type: 'ExpressionStatement',
      loc: expr.loc,
      expression: expr,
    }
    return exprStmt
  }

  private parseBlock(): Statement[] {
    while (this.peek().type === 'NEWLINE') this.advance()
    this.expect('INDENT', 'esperava um bloco indentado (4 espaços) abaixo')
    const stmts: Statement[] = []
    while (this.peek().type !== 'DEDENT' && this.peek().type !== 'EOF') {
      try {
        const s = this.parseStatement()
        if (s) stmts.push(s)
      } catch (e) {
        if (e instanceof ParseError) {
          this.errors.push(e.dslError)
          this.synchronize()
        } else {
          throw e
        }
      }
      while (this.peek().type === 'NEWLINE') this.advance()
    }
    if (this.peek().type === 'DEDENT') this.advance()
    if (stmts.length === 0) {
      this.errors.push({
        kind: 'syntax',
        code: 'E002',
        loc: { line: this.peek().line, column: this.peek().column },
        message: `🍕 Bloco vazio`,
        hint: "Depois de ':', precisa ter pelo menos um comando indentado abaixo.",
      })
    }
    return stmts
  }

  private parseExpression(): Expression {
    return this.parseOr()
  }

  private parseOr(): Expression {
    let left = this.parseAnd()
    while (this.peek().type === 'OU') {
      const opTok = this.advance()
      const right = this.parseAnd()
      left = {
        type: 'LogicalExpression',
        loc: { line: opTok.line, column: opTok.column },
        operator: 'ou',
        left,
        right,
      }
    }
    return left
  }

  private parseAnd(): Expression {
    let left = this.parseNot()
    while (this.peek().type === 'E') {
      const opTok = this.advance()
      const right = this.parseNot()
      left = {
        type: 'LogicalExpression',
        loc: { line: opTok.line, column: opTok.column },
        operator: 'e',
        left,
        right,
      }
    }
    return left
  }

  private parseNot(): Expression {
    if (this.peek().type === 'NAO') {
      const opTok = this.advance()
      const arg = this.parseNot()
      return {
        type: 'UnaryExpression',
        loc: { line: opTok.line, column: opTok.column },
        operator: 'nao',
        argument: arg,
      }
    }
    return this.parseComparison()
  }

  private parseComparison(): Expression {
    let left = this.parseAdditive()
    const compOps: Partial<Record<TokenType, BinaryOperator>> = {
      EQ: '==',
      NEQ: '!=',
      LT: '<',
      GT: '>',
      LTE: '<=',
      GTE: '>=',
    }
    const op = compOps[this.peek().type]
    if (op) {
      const opTok = this.advance()
      const right = this.parseAdditive()
      const expr: BinaryExpression = {
        type: 'BinaryExpression',
        loc: { line: opTok.line, column: opTok.column },
        operator: op,
        left,
        right,
      }
      left = expr
    }
    return left
  }

  private parseAdditive(): Expression {
    let left = this.parseMultiplicative()
    while (this.peek().type === 'PLUS' || this.peek().type === 'MINUS') {
      const opTok = this.advance()
      const right = this.parseMultiplicative()
      const expr: BinaryExpression = {
        type: 'BinaryExpression',
        loc: { line: opTok.line, column: opTok.column },
        operator: opTok.type === 'PLUS' ? '+' : '-',
        left,
        right,
      }
      left = expr
    }
    return left
  }

  private parseMultiplicative(): Expression {
    let left = this.parseUnary()
    while (
      this.peek().type === 'MUL' ||
      this.peek().type === 'DIV' ||
      this.peek().type === 'MOD'
    ) {
      const opTok = this.advance()
      const right = this.parseUnary()
      const op: BinaryOperator =
        opTok.type === 'MUL' ? '*' : opTok.type === 'DIV' ? '/' : '%'
      const expr: BinaryExpression = {
        type: 'BinaryExpression',
        loc: { line: opTok.line, column: opTok.column },
        operator: op,
        left,
        right,
      }
      left = expr
    }
    return left
  }

  private parseUnary(): Expression {
    if (this.peek().type === 'MINUS') {
      const opTok = this.advance()
      const arg = this.parseUnary()
      return {
        type: 'UnaryExpression',
        loc: { line: opTok.line, column: opTok.column },
        operator: '-',
        argument: arg,
      }
    }
    return this.parsePrimary()
  }

  private parsePrimary(): Expression {
    const tok = this.peek()
    switch (tok.type) {
      case 'NUMBER': {
        this.advance()
        return {
          type: 'NumberLiteral',
          loc: { line: tok.line, column: tok.column },
          value: parseFloat(tok.value),
        }
      }
      case 'STRING': {
        this.advance()
        return {
          type: 'StringLiteral',
          loc: { line: tok.line, column: tok.column },
          value: tok.value,
        }
      }
      case 'VERDADEIRO': {
        this.advance()
        return {
          type: 'BooleanLiteral',
          loc: { line: tok.line, column: tok.column },
          value: true,
        }
      }
      case 'FALSO': {
        this.advance()
        return {
          type: 'BooleanLiteral',
          loc: { line: tok.line, column: tok.column },
          value: false,
        }
      }
      case 'NULO': {
        this.advance()
        return { type: 'NullLiteral', loc: { line: tok.line, column: tok.column } }
      }
      case 'IDENT': {
        this.advance()
        const id: Identifier = {
          type: 'Identifier',
          loc: { line: tok.line, column: tok.column },
          name: tok.value,
        }
        if (this.peek().type === 'LPAREN') {
          this.advance()
          const args: Expression[] = []
          if (this.peek().type !== 'RPAREN') {
            do {
              args.push(this.parseExpression())
              if (this.peek().type === 'COMMA') this.advance()
              else break
            } while (this.peek().type !== 'RPAREN' && this.peek().type !== 'EOF')
          }
          this.expect('RPAREN', "esperava ')' fechando a chamada de função")
          const call: CallExpression = {
            type: 'CallExpression',
            loc: id.loc,
            callee: id,
            args,
          }
          return call
        }
        return id
      }
      case 'LPAREN': {
        this.advance()
        const expr = this.parseExpression()
        this.expect('RPAREN', "esperava ')' fechando a expressão")
        return expr
      }
      default:
        throw new ParseError({
          kind: 'syntax',
          code: 'E007',
          loc: { line: tok.line, column: tok.column },
          message: `🍕 Não esperava '${tok.value || tok.type}' aqui (linha ${tok.line})`,
          hint: 'Verifique se você fechou todos os parênteses e blocos corretamente.',
        })
    }
  }

  private peek(): Token {
    return this.tokens[this.pos] ?? {
      type: 'EOF',
      value: '',
      line: 0,
      column: 0,
    }
  }

  private advance(): Token {
    const tok = this.tokens[this.pos]
    if (this.pos < this.tokens.length) this.pos++
    return tok
  }

  private expect(type: TokenType, hint: string): Token {
    const tok = this.peek()
    if (tok.type !== type) {
      const message =
        type === 'COLON'
          ? `🍕 Faltou o ':' na linha ${tok.line}`
          : `🍕 ${hint} (linha ${tok.line})`
      throw new ParseError({
        kind: 'syntax',
        code: type === 'COLON' ? 'E003' : 'E007',
        loc: { line: tok.line, column: tok.column },
        message,
        hint:
          type === 'COLON'
            ? "Estruturas como 'se', 'enquanto', 'para' e 'funcao' precisam terminar com ':'"
            : hint,
      })
    }
    return this.advance()
  }

  private synchronize(): void {
    while (this.peek().type !== 'EOF') {
      const t = this.peek().type
      if (t === 'NEWLINE' || t === 'DEDENT') {
        this.advance()
        return
      }
      if (
        t === 'SE' ||
        t === 'ENQUANTO' ||
        t === 'PARA' ||
        t === 'FUNCAO' ||
        t === 'RETORNAR'
      ) {
        return
      }
      this.advance()
    }
  }
}

export function parse(source: string): ParseResult {
  const { tokens, errors: lexErrors } = tokenize(source)
  const parseErrors: DSLError[] = lexErrors.map((e) => ({
    kind: 'syntax' as const,
    code: 'E000',
    loc: { line: e.line, column: e.column },
    message: e.message,
    hint: e.hint,
  }))
  const parser = new Parser(tokens)
  const result = parser.parse()
  return {
    ast: result.ast,
    errors: [...parseErrors, ...result.errors],
  }
}

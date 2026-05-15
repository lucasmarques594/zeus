/**
 * Lexer do Portugol-Pizzaria.
 *
 * Escrito à mão (sem dependência externa) para ter controle total sobre
 * indentação significativa, palavras-chave com/sem acento, e mensagens de erro.
 */

export type TokenType =
  // Literais
  | 'NUMBER'
  | 'STRING'
  | 'IDENT'
  // Palavras-chave
  | 'SE'
  | 'SENAO'
  | 'SENAO_SE'
  | 'ENQUANTO'
  | 'PARA'
  | 'DE'
  | 'ATE'
  | 'PASSO'
  | 'FUNCAO'
  | 'RETORNAR'
  | 'PARAR'
  | 'CONTINUAR'
  | 'E'
  | 'OU'
  | 'NAO'
  | 'VERDADEIRO'
  | 'FALSO'
  | 'NULO'
  // Operadores
  | 'EQ'
  | 'NEQ'
  | 'LT'
  | 'GT'
  | 'LTE'
  | 'GTE'
  | 'ASSIGN'
  | 'PLUS'
  | 'MINUS'
  | 'MUL'
  | 'DIV'
  | 'MOD'
  // Pontuação
  | 'LPAREN'
  | 'RPAREN'
  | 'COMMA'
  | 'COLON'
  // Estrutura
  | 'NEWLINE'
  | 'INDENT'
  | 'DEDENT'
  | 'EOF'

export interface Token {
  type: TokenType
  value: string
  line: number
  column: number
}

export interface LexError {
  line: number
  column: number
  message: string
  hint?: string
}

// Normaliza acentos para comparação de palavras-chave
function normalize(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
}

const KEYWORDS: Record<string, TokenType> = {
  se: 'SE',
  senao: 'SENAO',
  senao_se: 'SENAO_SE',
  enquanto: 'ENQUANTO',
  para: 'PARA',
  de: 'DE',
  ate: 'ATE',
  passo: 'PASSO',
  funcao: 'FUNCAO',
  retornar: 'RETORNAR',
  parar: 'PARAR',
  continuar: 'CONTINUAR',
  e: 'E',
  ou: 'OU',
  nao: 'NAO',
  verdadeiro: 'VERDADEIRO',
  falso: 'FALSO',
  nulo: 'NULO',
}

export class Lexer {
  private pos = 0
  private line = 1
  private column = 1
  private tokens: Token[] = []
  private errors: LexError[] = []
  private indentStack: number[] = [0]
  private parenDepth = 0 // dentro de parênteses, NEWLINE/INDENT são ignorados
  private atLineStart = true

  constructor(private readonly source: string) {}

  tokenize(): { tokens: Token[]; errors: LexError[] } {
    while (this.pos < this.source.length) {
      if (this.atLineStart && this.parenDepth === 0) {
        this.handleIndentation()
        this.atLineStart = false
        if (this.pos >= this.source.length) break
      }

      const ch = this.source[this.pos]

      if (ch === '\n') {
        if (this.parenDepth === 0) {
          this.addToken('NEWLINE', '\n')
          this.atLineStart = true
        }
        this.advance()
        continue
      }

      if (ch === ' ' || ch === '\t') {
        this.advance()
        continue
      }

      if (ch === '#') {
        // Comentário até fim da linha
        while (this.pos < this.source.length && this.source[this.pos] !== '\n') {
          this.advance()
        }
        continue
      }

      if (ch === '"') {
        this.readString()
        continue
      }

      if (this.isDigit(ch)) {
        this.readNumber()
        continue
      }

      if (this.isIdentStart(ch)) {
        this.readIdentifier()
        continue
      }

      if (this.readOperator()) continue

      // Caractere desconhecido
      this.errors.push({
        line: this.line,
        column: this.column,
        message: `🍕 Caractere inesperado '${ch}' na linha ${this.line}`,
        hint: 'Verifique se você não digitou um caractere especial sem querer.',
      })
      this.advance()
    }

    // Fim do arquivo: gerar DEDENTs pra zerar a pilha
    if (this.tokens.length > 0 && this.tokens[this.tokens.length - 1].type !== 'NEWLINE') {
      this.addToken('NEWLINE', '\n')
    }
    while (this.indentStack.length > 1) {
      this.indentStack.pop()
      this.addToken('DEDENT', '')
    }
    this.addToken('EOF', '')

    return { tokens: this.tokens, errors: this.errors }
  }

  private handleIndentation(): void {
    // Mede a indentação da linha atual
    let indent = 0
    while (this.pos < this.source.length) {
      const ch = this.source[this.pos]
      if (ch === ' ') {
        indent++
        this.advance()
      } else if (ch === '\t') {
        indent += 4 // tab = 4 espaços
        this.advance()
      } else {
        break
      }
    }

    // Linha vazia ou só comentário? Ignora indentação
    if (this.pos >= this.source.length) return
    const ch = this.source[this.pos]
    if (ch === '\n' || ch === '#') return

    const currentIndent = this.indentStack[this.indentStack.length - 1]
    if (indent > currentIndent) {
      this.indentStack.push(indent)
      this.addToken('INDENT', '')
    } else if (indent < currentIndent) {
      while (this.indentStack.length > 1 && this.indentStack[this.indentStack.length - 1] > indent) {
        this.indentStack.pop()
        this.addToken('DEDENT', '')
      }
      const top = this.indentStack[this.indentStack.length - 1]
      if (top !== indent) {
        this.errors.push({
          line: this.line,
          column: 1,
          message: `🍕 Indentação errada na linha ${this.line}`,
          hint: 'Verifique se você usou 4 espaços consistentes. Não misture tabs e espaços.',
        })
      }
    }
  }

  private readString(): void {
    const startLine = this.line
    const startCol = this.column
    this.advance() // pula "
    let value = ''
    while (this.pos < this.source.length && this.source[this.pos] !== '"') {
      if (this.source[this.pos] === '\n') {
        this.errors.push({
          line: startLine,
          column: startCol,
          message: `🍕 Texto sem fim na linha ${startLine}`,
          hint: 'Textos no Portugol-Pizzaria usam aspas duplas. Esqueceu de fechar?',
        })
        return
      }
      if (this.source[this.pos] === '\\' && this.pos + 1 < this.source.length) {
        const next = this.source[this.pos + 1]
        if (next === 'n') value += '\n'
        else if (next === 't') value += '\t'
        else if (next === '"') value += '"'
        else if (next === '\\') value += '\\'
        else value += next
        this.advance()
        this.advance()
      } else {
        value += this.source[this.pos]
        this.advance()
      }
    }
    if (this.pos >= this.source.length) {
      this.errors.push({
        line: startLine,
        column: startCol,
        message: `🍕 Texto sem fim na linha ${startLine}`,
        hint: 'Textos no Portugol-Pizzaria usam aspas duplas. Esqueceu de fechar?',
      })
      return
    }
    this.advance() // pula "
    this.tokens.push({ type: 'STRING', value, line: startLine, column: startCol })
  }

  private readNumber(): void {
    const startLine = this.line
    const startCol = this.column
    let value = ''
    while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
      value += this.source[this.pos]
      this.advance()
    }
    if (this.pos < this.source.length && this.source[this.pos] === '.') {
      value += '.'
      this.advance()
      while (this.pos < this.source.length && this.isDigit(this.source[this.pos])) {
        value += this.source[this.pos]
        this.advance()
      }
    }
    this.tokens.push({ type: 'NUMBER', value, line: startLine, column: startCol })
  }

  private readIdentifier(): void {
    const startLine = this.line
    const startCol = this.column
    let value = ''
    while (this.pos < this.source.length && this.isIdentPart(this.source[this.pos])) {
      value += this.source[this.pos]
      this.advance()
    }
    const normalized = normalize(value.toLowerCase())
    const kwType = KEYWORDS[normalized]
    if (kwType) {
      this.tokens.push({ type: kwType, value: normalized, line: startLine, column: startCol })
    } else {
      this.tokens.push({ type: 'IDENT', value, line: startLine, column: startCol })
    }
  }

  private readOperator(): boolean {
    const startLine = this.line
    const startCol = this.column
    const ch = this.source[this.pos]
    const next = this.source[this.pos + 1]

    // Operadores compostos primeiro
    if (ch === '=' && next === '=') {
      this.advance()
      this.advance()
      this.tokens.push({ type: 'EQ', value: '==', line: startLine, column: startCol })
      return true
    }
    if (ch === '!' && next === '=') {
      this.advance()
      this.advance()
      this.tokens.push({ type: 'NEQ', value: '!=', line: startLine, column: startCol })
      return true
    }
    if (ch === '<' && next === '=') {
      this.advance()
      this.advance()
      this.tokens.push({ type: 'LTE', value: '<=', line: startLine, column: startCol })
      return true
    }
    if (ch === '>' && next === '=') {
      this.advance()
      this.advance()
      this.tokens.push({ type: 'GTE', value: '>=', line: startLine, column: startCol })
      return true
    }

    // Simples
    const single: Record<string, TokenType> = {
      '=': 'ASSIGN',
      '<': 'LT',
      '>': 'GT',
      '+': 'PLUS',
      '-': 'MINUS',
      '*': 'MUL',
      '/': 'DIV',
      '%': 'MOD',
      '(': 'LPAREN',
      ')': 'RPAREN',
      ',': 'COMMA',
      ':': 'COLON',
    }
    if (single[ch]) {
      const type = single[ch]
      this.advance()
      if (type === 'LPAREN') this.parenDepth++
      else if (type === 'RPAREN') this.parenDepth = Math.max(0, this.parenDepth - 1)
      this.tokens.push({ type, value: ch, line: startLine, column: startCol })
      return true
    }
    return false
  }

  private addToken(type: TokenType, value: string): void {
    this.tokens.push({ type, value, line: this.line, column: this.column })
  }

  private advance(): void {
    const ch = this.source[this.pos]
    this.pos++
    if (ch === '\n') {
      this.line++
      this.column = 1
    } else {
      this.column++
    }
  }

  private isDigit(ch: string): boolean {
    return ch >= '0' && ch <= '9'
  }

  private isIdentStart(ch: string): boolean {
    return /[a-zA-Z_à-üÀ-Ü]/.test(ch)
  }

  private isIdentPart(ch: string): boolean {
    return /[a-zA-Z0-9_à-üÀ-Ü]/.test(ch)
  }
}

export function tokenize(source: string): { tokens: Token[]; errors: LexError[] } {
  return new Lexer(source).tokenize()
}

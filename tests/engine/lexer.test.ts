/**
 * Testes do lexer.
 *
 * Para rodar: npm test
 */

import { describe, it, expect } from 'vitest'
import { tokenize } from '../../src/engine/lexer'

describe('tokenize', () => {
  it('tokeniza um programa simples', () => {
    const { tokens, errors } = tokenize('mover("leste")')
    expect(errors).toHaveLength(0)
    const types = tokens.map((t) => t.type).filter((t) => t !== 'EOF' && t !== 'NEWLINE')
    expect(types).toEqual(['IDENT', 'LPAREN', 'STRING', 'RPAREN'])
  })

  it('reconhece palavras-chave', () => {
    const { tokens, errors } = tokenize('se x == 1:\n    mover("norte")')
    expect(errors).toHaveLength(0)
    const types = tokens.map((t) => t.type)
    expect(types).toContain('SE')
    expect(types).toContain('EQ')
    expect(types).toContain('COLON')
    expect(types).toContain('INDENT')
  })

  it('aceita palavras-chave com acento', () => {
    const { tokens, errors } = tokenize('para i de 1 até 5:\n    mover("leste")')
    expect(errors).toHaveLength(0)
    const types = tokens.map((t) => t.type)
    expect(types).toContain('ATE')
  })

  it('ignora comentários', () => {
    const { tokens, errors } = tokenize('# isto é um comentário\nmover("leste")')
    expect(errors).toHaveLength(0)
    const types = tokens.map((t) => t.type)
    expect(types).not.toContain('COMMENT')
  })

  it('detecta string não fechada', () => {
    const { errors } = tokenize('mover("leste\n)')
    expect(errors.length).toBeGreaterThan(0)
  })

  it('emite INDENT/DEDENT em blocos', () => {
    const code = 'se 1 == 1:\n    mover("leste")\n    mover("norte")\nmover("sul")'
    const { tokens } = tokenize(code)
    const types = tokens.map((t) => t.type)
    expect(types).toContain('INDENT')
    expect(types).toContain('DEDENT')
  })

  it('tokeniza loop para', () => {
    const { tokens, errors } = tokenize('para i de 1 ate 10:\n    mover("leste")')
    expect(errors).toHaveLength(0)
    const types = tokens.map((t) => t.type)
    expect(types).toContain('PARA')
    expect(types).toContain('DE')
    expect(types).toContain('ATE')
  })
})

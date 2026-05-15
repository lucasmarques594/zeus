/**
 * Catálogo de erros do Portugol-Pizzaria.
 *
 * Toda mensagem de erro do interpretador passa por aqui. Mensagens são em PT-BR
 * e seguem padrão pedagógico (ver docs/error-catalog.md).
 *
 * Princípios:
 * - Nunca culpar o jogador
 * - Mostrar onde o erro aconteceu (linha/coluna)
 * - Sugerir a próxima ação
 * - Vocabulário simples, adequado a 12-14 anos
 */

import type { SourceLocation } from './ast'

export type ErrorKind = 'syntax' | 'type' | 'runtime' | 'domain' | 'warning'

export interface DSLError {
  kind: ErrorKind
  code: string
  loc: SourceLocation
  message: string
  hint?: string
  suggestion?: string
}

// ============================================================================
// Erros de sintaxe (E001-E099)
// ============================================================================

export const SyntaxErrors = {
  indentMismatch: (loc: SourceLocation): DSLError => ({
    kind: 'syntax',
    code: 'E001',
    loc,
    message: `🍕 Indentação errada na linha ${loc.line}`,
    hint: 'Verifique se você usou 4 espaços (não tabs misturados) e se o bloco está alinhado com as outras linhas do mesmo nível.',
  }),

  emptyBlock: (loc: SourceLocation): DSLError => ({
    kind: 'syntax',
    code: 'E002',
    loc,
    message: `🍕 Bloco vazio na linha ${loc.line}`,
    hint: "Depois de 'se', 'enquanto', 'para' ou 'funcao', precisa ter pelo menos um comando indentado abaixo.",
  }),

  missingColon: (loc: SourceLocation): DSLError => ({
    kind: 'syntax',
    code: 'E003',
    loc,
    message: `🍕 Faltou o ':' na linha ${loc.line}`,
    hint: "Estruturas como 'se', 'enquanto', 'para' e 'funcao' precisam terminar com dois pontos antes do bloco.",
  }),

  unclosedParen: (loc: SourceLocation): DSLError => ({
    kind: 'syntax',
    code: 'E004',
    loc,
    message: `🍕 Parênteses sem par na linha ${loc.line}`,
    hint: "Você abriu um '(' mas esqueceu de fechar com ')'. Conte os parênteses na linha.",
  }),

  unclosedString: (loc: SourceLocation): DSLError => ({
    kind: 'syntax',
    code: 'E005',
    loc,
    message: `🍕 Texto sem fim na linha ${loc.line}`,
    hint: 'Textos no Portugol-Pizzaria usam aspas duplas. Exemplo: "norte"',
  }),

  unknownWord: (loc: SourceLocation, word: string, suggestion?: string): DSLError => ({
    kind: 'syntax',
    code: 'E006',
    loc,
    message: `🍕 Não entendi '${word}' na linha ${loc.line}`,
    hint: suggestion
      ? `Você quis dizer '${suggestion}'?`
      : 'Olhe a lista de comandos disponíveis neste nível.',
    ...(suggestion ? { suggestion } : {}),
  }),

  featureLocked: (loc: SourceLocation, feature: string, unlockLevel: number): DSLError => ({
    kind: 'syntax',
    code: 'E010',
    loc,
    message: `🍕 Você ainda não desbloqueou '${feature}' (linha ${loc.line})`,
    hint: `Este comando estará disponível no nível ${unlockLevel}. Por enquanto, tente resolver com os comandos que você já tem.`,
  }),
} as const

// ============================================================================
// Erros de tipo (E100-E199)
// ============================================================================

export const TypeErrors = {
  invalidAddOperands: (loc: SourceLocation, leftType: string, rightType: string): DSLError => ({
    kind: 'type',
    code: 'E100',
    loc,
    message: `🍕 Não dá pra somar ${leftType} com ${rightType} (linha ${loc.line})`,
    hint: "'+' funciona com dois números OU dois textos, não misturados.",
  }),

  invalidComparison: (loc: SourceLocation): DSLError => ({
    kind: 'type',
    code: 'E101',
    loc,
    message: `🍕 Comparação estranha na linha ${loc.line}`,
    hint: 'Verifique se as duas coisas que você está comparando são do mesmo tipo.',
  }),

  wrongArgType: (
    loc: SourceLocation,
    fnName: string,
    expected: string,
    got: string
  ): DSLError => ({
    kind: 'type',
    code: 'E102',
    loc,
    message: `🍕 '${fnName}' espera ${expected}, não ${got} (linha ${loc.line})`,
    hint: 'Olhe a documentação da função para ver o tipo correto do argumento.',
  }),

  notAFunction: (loc: SourceLocation, name: string): DSLError => ({
    kind: 'type',
    code: 'E103',
    loc,
    message: `🍕 '${name}' não é uma função (linha ${loc.line})`,
    hint: `Você tentou usar '${name}()' como função, mas é uma variável. Para ler o valor, escreva apenas '${name}' sem os parênteses.`,
  }),

  wrongArgCount: (
    loc: SourceLocation,
    fnName: string,
    expected: number,
    got: number
  ): DSLError => ({
    kind: 'type',
    code: 'E104',
    loc,
    message: `🍕 '${fnName}' precisa de ${expected} argumento(s), você passou ${got} (linha ${loc.line})`,
    hint: 'Verifique a assinatura da função na documentação.',
  }),
} as const

// ============================================================================
// Erros de runtime (E200-E299)
// ============================================================================

export const RuntimeErrors = {
  undefinedVariable: (loc: SourceLocation, name: string): DSLError => ({
    kind: 'runtime',
    code: 'E200',
    loc,
    message: `🍕 Não conheço a variável '${name}' (linha ${loc.line})`,
    hint: 'Variáveis nascem na primeira atribuição. Você criou ela antes de usar?',
  }),

  divisionByZero: (loc: SourceLocation): DSLError => ({
    kind: 'runtime',
    code: 'E201',
    loc,
    message: `🍕 Divisão por zero na linha ${loc.line}`,
    hint: "Antes de dividir, verifique com 'se' se o divisor não é zero.",
  }),

  tickLimitExceeded: (loc: SourceLocation, limit: number): DSLError => ({
    kind: 'runtime',
    code: 'E202',
    loc,
    message: `🍕 Ufa, o programa demorou demais!`,
    hint: `Você usou mais de ${limit} ticks. Provavelmente tem um loop que nunca termina. Revise seus 'enquanto'.`,
  }),

  recursionTooDeep: (loc: SourceLocation, limit: number): DSLError => ({
    kind: 'runtime',
    code: 'E203',
    loc,
    message: `🍕 Função se chamando demais (linha ${loc.line})`,
    hint: `Sua função se chamou mais de ${limit} vezes seguidas. Adicione uma condição de parada.`,
  }),

  returnOutsideFunction: (loc: SourceLocation): DSLError => ({
    kind: 'runtime',
    code: 'E204',
    loc,
    message: `🍕 'retornar' só funciona dentro de funções (linha ${loc.line})`,
    hint: "'retornar' encerra uma função e devolve um valor. Só faz sentido dentro de 'funcao NOME():'.",
  }),

  breakOutsideLoop: (loc: SourceLocation): DSLError => ({
    kind: 'runtime',
    code: 'E205',
    loc,
    message: `🍕 'parar' só funciona dentro de loops (linha ${loc.line})`,
    hint: "'parar' interrompe um loop. Só faz sentido dentro de 'enquanto' ou 'para'.",
  }),
} as const

// ============================================================================
// Eventos de domínio (D001-D099) — não interrompem execução, são avisos
// ============================================================================

export const DomainEvents = {
  hitWall: (loc: SourceLocation, direction: string): DSLError => ({
    kind: 'domain',
    code: 'D001',
    loc,
    message: `🍕 Ops! O entregador bateu numa parede.`,
    hint: `Você mandou mover("${direction}"), mas tinha uma parede. Use peca_em_frente() para verificar antes.`,
  }),

  handsAlreadyFull: (loc: SourceLocation): DSLError => ({
    kind: 'domain',
    code: 'D002',
    loc,
    message: `🍕 As mãos do entregador já estão cheias!`,
    hint: 'Use soltar() ou entregar() antes de pegar outro item.',
  }),

  handsEmpty: (loc: SourceLocation): DSLError => ({
    kind: 'domain',
    code: 'D003',
    loc,
    message: `🍕 As mãos estão vazias, não dá pra soltar nada.`,
    hint: 'Chame pegar() antes para pegar algo.',
  }),

  burnedPizza: (loc: SourceLocation): DSLError => ({
    kind: 'domain',
    code: 'D006',
    loc,
    message: `🍕 Pizza queimada! 😢`,
    hint: 'Use estado_forno() em loop com esperar() para tirar no momento exato.',
  }),

  rawPizza: (loc: SourceLocation): DSLError => ({
    kind: 'domain',
    code: 'D007',
    loc,
    message: `🍕 Pizza crua! 😬`,
    hint: 'Aguarde até estado_forno() retornar "pronto".',
  }),
} as const

/**
 * Formata um erro como string legível (útil para logging/debug).
 * Para apresentação no editor, use o objeto DSLError diretamente.
 */
export function formatError(err: DSLError): string {
  let out = `[${err.code}] ${err.message}`
  if (err.hint) out += `\n   💡 Dica: ${err.hint}`
  return out
}

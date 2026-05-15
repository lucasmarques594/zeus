/**
 * Interpretador da DSL Portugol-Pizzaria.
 *
 * Implementação como AST walker baseado em generator function.
 * Cada `yield` corresponde a um "tick" do mundo do jogo.
 *
 * Características:
 * - Step-by-step: o caller controla quando avançar (suporta pause, speed control)
 * - Sandbox: só executa nodes da AST que reconhecemos
 * - Limites: ticks, recursão e iterações são monitorados
 */

import type {
  Program,
  Statement,
  Expression,
  Identifier,
  CallExpression,
} from './ast'
import { RuntimeErrors, TypeErrors, type DSLError } from './errors'

export type DSLValue = number | string | boolean | null

export interface WorldHandle {
  callBuiltin(name: string, args: DSLValue[]): { result: DSLValue; ticks: number }
  hasBuiltin(name: string): boolean
}

export interface ExecutionLimits {
  maxTicks: number
  maxRecursionDepth: number
  maxIterationsWithoutTick: number
}

export const DEFAULT_LIMITS: ExecutionLimits = {
  maxTicks: 10_000,
  maxRecursionDepth: 100,
  maxIterationsWithoutTick: 100_000,
}

export type StepResult =
  | { kind: 'tick'; ticksUsed: number; line: number }
  | { kind: 'done'; ticksUsed: number }
  | { kind: 'error'; error: DSLError; ticksUsed: number }

// Sentinelas para controle de fluxo (sem usar exceções pra performance)
const BREAK = Symbol('break')
const CONTINUE = Symbol('continue')

type ControlSignal = typeof BREAK | typeof CONTINUE | { kind: 'return'; value: DSLValue }

class RuntimeError extends Error {
  constructor(public readonly dslError: DSLError) {
    super(dslError.message)
  }
}

type Scope = Map<string, DSLValue>

interface UserFunction {
  params: string[]
  body: Statement[]
  declaredLoc: { line: number; column: number }
}

export class Interpreter {
  private globals: Scope = new Map()
  private callStack: Scope[] = []
  private functions: Map<string, UserFunction> = new Map()
  private ticksUsed = 0
  private iterCount = 0
  private generator: Generator<StepResult, StepResult, void> | null = null
  private currentLine = 1
  private finished = false

  constructor(
    private readonly program: Program,
    private readonly world: WorldHandle,
    private readonly limits: ExecutionLimits = DEFAULT_LIMITS
  ) {}

  /** Avança um passo. Retorna 'tick', 'done' ou 'error'. */
  step(): StepResult {
    if (this.finished) {
      return { kind: 'done', ticksUsed: this.ticksUsed }
    }
    if (!this.generator) {
      this.generator = this.execute()
    }
    try {
      const { value, done } = this.generator.next()
      if (done) {
        this.finished = true
        return value ?? { kind: 'done', ticksUsed: this.ticksUsed }
      }
      return value
    } catch (e) {
      this.finished = true
      if (e instanceof RuntimeError) {
        return { kind: 'error', error: e.dslError, ticksUsed: this.ticksUsed }
      }
      throw e
    }
  }

  /** Executa até terminar e retorna o resultado final. */
  runToCompletion(): StepResult {
    let last: StepResult = { kind: 'done', ticksUsed: 0 }
    while (!this.finished) {
      last = this.step()
      if (last.kind === 'done' || last.kind === 'error') break
    }
    return last
  }

  /** Linha atualmente em execução (1-indexed). */
  getCurrentLine(): number {
    return this.currentLine
  }

  /** Snapshot do escopo atual (útil pro painel de variáveis). */
  getScope(): Record<string, DSLValue> {
    const out: Record<string, DSLValue> = {}
    for (const [k, v] of this.globals) out[k] = v
    if (this.callStack.length > 0) {
      const top = this.callStack[this.callStack.length - 1]
      for (const [k, v] of top) out[k] = v
    }
    return out
  }

  /** Ticks consumidos até agora. */
  getTicksUsed(): number {
    return this.ticksUsed
  }

  // ============================================================================
  // Execução
  // ============================================================================

  private *execute(): Generator<StepResult, StepResult, void> {
    // Pré-pass: registra todas as declarações de função
    for (const stmt of this.program.body) {
      if (stmt.type === 'FunctionDeclaration') {
        this.functions.set(stmt.name.name, {
          params: stmt.params.map((p) => p.name),
          body: stmt.body,
          declaredLoc: stmt.loc,
        })
      }
    }

    // Executa statements top-level
    for (const stmt of this.program.body) {
      if (stmt.type === 'FunctionDeclaration') continue
      const signal = yield* this.execStmt(stmt)
      if (signal && typeof signal === 'object' && 'kind' in signal && signal.kind === 'return') {
        // Return em top-level: aceita silenciosamente, encerra
        break
      }
      if (signal === BREAK || signal === CONTINUE) {
        throw new RuntimeError(RuntimeErrors.breakOutsideLoop(stmt.loc))
      }
    }

    return { kind: 'done', ticksUsed: this.ticksUsed }
  }

  private *execStmt(
    stmt: Statement
  ): Generator<StepResult, ControlSignal | undefined, void> {
    this.currentLine = stmt.loc.line
    this.bumpIter()

    switch (stmt.type) {
      case 'Assignment': {
        const value = this.eval(stmt.value)
        this.setVariable(stmt.target.name, value)
        return undefined
      }

      case 'ExpressionStatement': {
        const expr = stmt.expression
        if (expr.type === 'CallExpression') {
          const ticks = yield* this.execCall(expr)
          if (ticks > 0) {
            yield { kind: 'tick', ticksUsed: this.ticksUsed, line: stmt.loc.line }
          }
        } else {
          this.eval(expr)
        }
        return undefined
      }

      case 'IfStatement': {
        if (toBool(this.eval(stmt.test))) {
          return yield* this.execBlock(stmt.consequent)
        }
        for (const alt of stmt.alternates) {
          if (toBool(this.eval(alt.test))) {
            return yield* this.execBlock(alt.body)
          }
        }
        if (stmt.alternate) {
          return yield* this.execBlock(stmt.alternate)
        }
        return undefined
      }

      case 'WhileStatement': {
        while (toBool(this.eval(stmt.test))) {
          this.bumpIter()
          const sig = yield* this.execBlock(stmt.body)
          if (sig === BREAK) break
          if (sig === CONTINUE) continue
          if (sig && typeof sig === 'object' && sig.kind === 'return') return sig
        }
        return undefined
      }

      case 'ForStatement': {
        const start = toNumber(this.eval(stmt.start), stmt.loc)
        const end = toNumber(this.eval(stmt.end), stmt.loc)
        const step = stmt.step ? toNumber(this.eval(stmt.step), stmt.loc) : 1
        if (step === 0) {
          throw new RuntimeError({
            kind: 'runtime',
            code: 'E206',
            loc: stmt.loc,
            message: `🍕 Passo do 'para' não pode ser zero (linha ${stmt.loc.line})`,
            hint: "O 'passo' precisa ser positivo (subindo) ou negativo (descendo).",
          })
        }
        const cmp = step > 0 ? (i: number) => i <= end : (i: number) => i >= end
        for (let i = start; cmp(i); i += step) {
          this.bumpIter()
          this.setVariable(stmt.variable.name, i)
          const sig = yield* this.execBlock(stmt.body)
          if (sig === BREAK) break
          if (sig === CONTINUE) continue
          if (sig && typeof sig === 'object' && sig.kind === 'return') return sig
        }
        return undefined
      }

      case 'FunctionDeclaration': {
        // Já registrado no pré-pass; nada a fazer aqui
        return undefined
      }

      case 'ReturnStatement': {
        const value = stmt.argument ? this.eval(stmt.argument) : null
        return { kind: 'return', value }
      }

      case 'BreakStatement':
        return BREAK

      case 'ContinueStatement':
        return CONTINUE
    }
  }

  private *execBlock(
    body: Statement[]
  ): Generator<StepResult, ControlSignal | undefined, void> {
    for (const s of body) {
      const sig = yield* this.execStmt(s)
      if (sig !== undefined) return sig
    }
    return undefined
  }

  private *execCall(
    call: CallExpression
  ): Generator<StepResult, number, void> {
    const name = call.callee.name
    const args = call.args.map((a) => this.eval(a))

    // Função do usuário
    const userFn = this.functions.get(name)
    if (userFn) {
      if (this.callStack.length >= this.limits.maxRecursionDepth) {
        throw new RuntimeError(
          RuntimeErrors.recursionTooDeep(call.loc, this.limits.maxRecursionDepth)
        )
      }
      if (args.length !== userFn.params.length) {
        throw new RuntimeError(
          TypeErrors.wrongArgCount(call.loc, name, userFn.params.length, args.length)
        )
      }
      const localScope: Scope = new Map()
      for (let i = 0; i < userFn.params.length; i++) {
        localScope.set(userFn.params[i], args[i])
      }
      this.callStack.push(localScope)
      try {
        const sig = yield* this.execBlock(userFn.body)
        if (sig && typeof sig === 'object' && sig.kind === 'return') {
          // valor de retorno disponível via .value mas funções não usam aqui
        }
      } finally {
        this.callStack.pop()
      }
      return 0 // funções do usuário não consomem tick (cada built-in dentro consome)
    }

    // Built-in
    if (this.world.hasBuiltin(name)) {
      const { ticks } = this.world.callBuiltin(name, args)
      this.ticksUsed += ticks
      if (this.ticksUsed > this.limits.maxTicks) {
        throw new RuntimeError(RuntimeErrors.tickLimitExceeded(call.loc, this.limits.maxTicks))
      }
      return ticks
    }

    throw new RuntimeError({
      kind: 'runtime',
      code: 'E207',
      loc: call.loc,
      message: `🍕 Não conheço a função '${name}' (linha ${call.loc.line})`,
      hint: 'Verifique se você digitou o nome certo. Olhe a lista de comandos disponíveis.',
    })
  }

  // ============================================================================
  // Avaliação de expressões (pura, não consome ticks)
  // ============================================================================

  private eval(expr: Expression): DSLValue {
    this.bumpIter()
    switch (expr.type) {
      case 'NumberLiteral':
        return expr.value
      case 'StringLiteral':
        return expr.value
      case 'BooleanLiteral':
        return expr.value
      case 'NullLiteral':
        return null
      case 'Identifier':
        return this.getVariable(expr)
      case 'BinaryExpression': {
        const l = this.eval(expr.left)
        const r = this.eval(expr.right)
        switch (expr.operator) {
          case '+':
            if (typeof l === 'number' && typeof r === 'number') return l + r
            if (typeof l === 'string' && typeof r === 'string') return l + r
            throw new RuntimeError(TypeErrors.invalidAddOperands(expr.loc, typeOf(l), typeOf(r)))
          case '-':
            return num(l, expr.loc) - num(r, expr.loc)
          case '*':
            return num(l, expr.loc) * num(r, expr.loc)
          case '/': {
            const rn = num(r, expr.loc)
            if (rn === 0) throw new RuntimeError(RuntimeErrors.divisionByZero(expr.loc))
            return num(l, expr.loc) / rn
          }
          case '%': {
            const rn = num(r, expr.loc)
            if (rn === 0) throw new RuntimeError(RuntimeErrors.divisionByZero(expr.loc))
            return num(l, expr.loc) % rn
          }
          case '==':
            return l === r
          case '!=':
            return l !== r
          case '<':
            return num(l, expr.loc) < num(r, expr.loc)
          case '>':
            return num(l, expr.loc) > num(r, expr.loc)
          case '<=':
            return num(l, expr.loc) <= num(r, expr.loc)
          case '>=':
            return num(l, expr.loc) >= num(r, expr.loc)
        }
        break
      }
      case 'UnaryExpression': {
        const v = this.eval(expr.argument)
        if (expr.operator === '-') return -num(v, expr.loc)
        if (expr.operator === 'nao') return !toBool(v)
        break
      }
      case 'LogicalExpression': {
        const l = this.eval(expr.left)
        if (expr.operator === 'e') {
          if (!toBool(l)) return false
          return toBool(this.eval(expr.right))
        } else {
          if (toBool(l)) return true
          return toBool(this.eval(expr.right))
        }
      }
      case 'CallExpression': {
        // Chamada de função usada como expressão
        // Funções do usuário podem retornar valor
        const name = expr.callee.name
        const args = expr.args.map((a) => this.eval(a))
        const userFn = this.functions.get(name)
        if (userFn) {
          if (this.callStack.length >= this.limits.maxRecursionDepth) {
            throw new RuntimeError(
              RuntimeErrors.recursionTooDeep(expr.loc, this.limits.maxRecursionDepth)
            )
          }
          if (args.length !== userFn.params.length) {
            throw new RuntimeError(
              TypeErrors.wrongArgCount(expr.loc, name, userFn.params.length, args.length)
            )
          }
          const localScope: Scope = new Map()
          for (let i = 0; i < userFn.params.length; i++) {
            localScope.set(userFn.params[i], args[i])
          }
          this.callStack.push(localScope)
          try {
            const sig = this.runBlockSync(userFn.body)
            if (sig && typeof sig === 'object' && sig.kind === 'return') {
              return sig.value
            }
            return null
          } finally {
            this.callStack.pop()
          }
        }
        if (this.world.hasBuiltin(name)) {
          const { result, ticks } = this.world.callBuiltin(name, args)
          this.ticksUsed += ticks
          if (this.ticksUsed > this.limits.maxTicks) {
            throw new RuntimeError(
              RuntimeErrors.tickLimitExceeded(expr.loc, this.limits.maxTicks)
            )
          }
          return result
        }
        throw new RuntimeError({
          kind: 'runtime',
          code: 'E207',
          loc: expr.loc,
          message: `🍕 Não conheço a função '${name}' (linha ${expr.loc.line})`,
          hint: 'Verifique se você digitou o nome certo.',
        })
      }
    }
    return null
  }

  /**
   * Versão síncrona do execBlock, usada quando uma função do usuário
   * é chamada DENTRO de uma expressão (não pode yield).
   * Built-ins ainda são chamados, mas sem pausar entre ticks.
   */
  private runBlockSync(body: Statement[]): ControlSignal | undefined {
    for (const s of body) {
      const sig = this.execStmtSync(s)
      if (sig !== undefined) return sig
    }
    return undefined
  }

  private execStmtSync(stmt: Statement): ControlSignal | undefined {
    this.currentLine = stmt.loc.line
    this.bumpIter()

    switch (stmt.type) {
      case 'Assignment':
        this.setVariable(stmt.target.name, this.eval(stmt.value))
        return undefined
      case 'ExpressionStatement':
        this.eval(stmt.expression)
        return undefined
      case 'IfStatement':
        if (toBool(this.eval(stmt.test))) return this.runBlockSync(stmt.consequent)
        for (const alt of stmt.alternates) {
          if (toBool(this.eval(alt.test))) return this.runBlockSync(alt.body)
        }
        if (stmt.alternate) return this.runBlockSync(stmt.alternate)
        return undefined
      case 'WhileStatement':
        while (toBool(this.eval(stmt.test))) {
          this.bumpIter()
          const sig = this.runBlockSync(stmt.body)
          if (sig === BREAK) break
          if (sig === CONTINUE) continue
          if (sig && typeof sig === 'object' && sig.kind === 'return') return sig
        }
        return undefined
      case 'ForStatement': {
        const start = toNumber(this.eval(stmt.start), stmt.loc)
        const end = toNumber(this.eval(stmt.end), stmt.loc)
        const step = stmt.step ? toNumber(this.eval(stmt.step), stmt.loc) : 1
        const cmp = step > 0 ? (i: number) => i <= end : (i: number) => i >= end
        for (let i = start; cmp(i); i += step) {
          this.bumpIter()
          this.setVariable(stmt.variable.name, i)
          const sig = this.runBlockSync(stmt.body)
          if (sig === BREAK) break
          if (sig === CONTINUE) continue
          if (sig && typeof sig === 'object' && sig.kind === 'return') return sig
        }
        return undefined
      }
      case 'ReturnStatement': {
        const value = stmt.argument ? this.eval(stmt.argument) : null
        return { kind: 'return', value }
      }
      case 'BreakStatement':
        return BREAK
      case 'ContinueStatement':
        return CONTINUE
      case 'FunctionDeclaration':
        return undefined
    }
  }

  // ============================================================================
  // Variáveis
  // ============================================================================

  private getVariable(id: Identifier): DSLValue {
    if (this.callStack.length > 0) {
      const local = this.callStack[this.callStack.length - 1]
      if (local.has(id.name)) return local.get(id.name) ?? null
    }
    if (this.globals.has(id.name)) return this.globals.get(id.name) ?? null
    throw new RuntimeError(RuntimeErrors.undefinedVariable(id.loc, id.name))
  }

  private setVariable(name: string, value: DSLValue): void {
    if (this.callStack.length > 0) {
      this.callStack[this.callStack.length - 1].set(name, value)
    } else {
      this.globals.set(name, value)
    }
  }

  private bumpIter(): void {
    this.iterCount++
    if (this.iterCount > this.limits.maxIterationsWithoutTick * 10) {
      throw new RuntimeError(
        RuntimeErrors.tickLimitExceeded(
          { line: this.currentLine, column: 1 },
          this.limits.maxTicks
        )
      )
    }
  }
}

// ============================================================================
// Helpers
// ============================================================================

function toBool(v: DSLValue): boolean {
  if (v === null) return false
  if (typeof v === 'boolean') return v
  if (typeof v === 'number') return v !== 0
  if (typeof v === 'string') return v.length > 0
  return false
}

function typeOf(v: DSLValue): string {
  if (v === null) return 'nulo'
  if (typeof v === 'number') return 'número'
  if (typeof v === 'string') return 'texto'
  if (typeof v === 'boolean') return 'lógico'
  return 'desconhecido'
}

function num(v: DSLValue, loc: { line: number; column: number }): number {
  if (typeof v === 'number') return v
  throw new RuntimeError({
    kind: 'type',
    code: 'E105',
    loc,
    message: `🍕 Esperava um número, mas veio ${typeOf(v)} (linha ${loc.line})`,
    hint: 'Operações aritméticas funcionam só com números.',
  })
}

function toNumber(v: DSLValue, loc: { line: number; column: number }): number {
  return num(v, loc)
}

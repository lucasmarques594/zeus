/**
 * CycleRunner — executa código em ciclos durante o dia.
 *
 * Loop principal do modo tycoon. A cada ciclo:
 * 1. Reseta posição do jogador para o spawn
 * 2. Executa o código do jogador do início ao fim
 * 3. Se acabar com sucesso, recomeça
 * 4. Se erro de runtime, para até o fim do dia
 *
 * Mantém limite de ticks por execução pra evitar travamento da UI.
 */

import { Interpreter, type StepResult, DEFAULT_LIMITS } from '@engine/interpreter'
import type { Program } from '@engine/ast'
import type { DSLError } from '@engine/errors'
import type { GameWorld } from './world'

export type CycleResult =
  | { kind: 'cycle_completed'; cycleNumber: number; ticksInCycle: number }
  | { kind: 'frozen'; error: DSLError; cycleNumber: number }
  | { kind: 'tick_progress' }

export interface CycleRunnerStats {
  cyclesCompleted: number
  totalTicks: number
  isFrozen: boolean
  freezeError: DSLError | null
}

export class CycleRunner {
  private interpreter: Interpreter | null = null
  private cyclesCompleted = 0
  private totalTicks = 0
  private frozen = false
  private freezeError: DSLError | null = null

  constructor(
    private readonly program: Program,
    private readonly world: GameWorld
  ) {
    this.startNewCycle()
  }

  /**
   * Executa um passo. Pode resultar em:
   * - tick_progress: avançou normalmente
   * - cycle_completed: terminou o ciclo, próximo já está no ar
   * - frozen: erro de runtime, robô travou pelo resto do dia
   */
  step(): CycleResult {
    if (this.frozen) {
      return { kind: 'frozen', error: this.freezeError!, cycleNumber: this.cyclesCompleted }
    }
    if (!this.interpreter) {
      return { kind: 'tick_progress' }
    }

    const result: StepResult = this.interpreter.step()

    if (result.kind === 'tick') {
      this.totalTicks++
      return { kind: 'tick_progress' }
    }
    if (result.kind === 'done') {
      const ticksInCycle = result.ticksUsed
      this.cyclesCompleted++
      this.startNewCycle()
      return {
        kind: 'cycle_completed',
        cycleNumber: this.cyclesCompleted,
        ticksInCycle,
      }
    }
    if (result.kind === 'error') {
      this.frozen = true
      this.freezeError = result.error
      this.interpreter = null
      return {
        kind: 'frozen',
        error: result.error,
        cycleNumber: this.cyclesCompleted,
      }
    }
    return { kind: 'tick_progress' }
  }

  private startNewCycle(): void {
    // Reset mágico: jogador volta ao spawn, mãos vazias
    this.world.resetPlayerToSpawn()
    // Recria o interpreter pra começar do início
    this.interpreter = new Interpreter(this.program, this.world, {
      ...DEFAULT_LIMITS,
      // Tycoon precisa de mais ticks porque o ciclo pode ser longo
      maxTicks: 50_000,
    })
  }

  getStats(): CycleRunnerStats {
    return {
      cyclesCompleted: this.cyclesCompleted,
      totalTicks: this.totalTicks,
      isFrozen: this.frozen,
      freezeError: this.freezeError,
    }
  }

  getCurrentLine(): number {
    return this.interpreter?.getCurrentLine() ?? 0
  }

  getScope(): Record<string, unknown> {
    return this.interpreter?.getScope() ?? {}
  }
}

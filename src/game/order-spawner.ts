/**
 * OrderSpawner — gera pedidos durante o dia em ritmo controlado.
 *
 * Diferente do modo tutorial (onde pedidos vêm pré-carregados em `orderQueue`),
 * no modo tycoon os pedidos chegam ao longo do tempo baseados em:
 * - Tempo de jogo decorrido
 * - Dia atual (mais avançado = mais pedidos)
 * - Capacidade (mesas livres)
 * - Sabores disponíveis
 */

import { orderIntervalGameSeconds, ORDERS } from './balance'
import type { GameState } from './game-state'
import type { Order, IngredientType } from './types'

export interface SpawnContext {
  day: number
  gameSecondsElapsed: number
  availableFlavors: string[]
  /** Quantidade de mesas com paciência ativa (não foram embora). */
  activeTableNumbers: number[]
  /** Quais mesas já têm pedido aguardando. */
  tablesWithPendingOrder: Set<number>
}

export class OrderSpawner {
  private lastSpawnAtGameSeconds = 0
  private spawnedOrders = 0

  /** Chamado a cada tick do dia. Retorna pedidos novos (zero ou um). */
  tryGenerate(ctx: SpawnContext): Order[] {
    const interval = orderIntervalGameSeconds(ctx.day)
    const elapsedSinceLastSpawn = ctx.gameSecondsElapsed - this.lastSpawnAtGameSeconds

    // Garante backlog inicial
    if (this.spawnedOrders < ORDERS.initialBacklog) {
      return this.generateOne(ctx)
    }

    if (elapsedSinceLastSpawn < interval) return []
    return this.generateOne(ctx)
  }

  private generateOne(ctx: SpawnContext): Order[] {
    // Pega uma mesa livre (sem pedido pendente)
    const freeTables = ctx.activeTableNumbers.filter(
      (n) => !ctx.tablesWithPendingOrder.has(n)
    )
    if (freeTables.length === 0) return []

    const tableNumber = freeTables[Math.floor(Math.random() * freeTables.length)]
    const flavor = ctx.availableFlavors[
      Math.floor(Math.random() * ctx.availableFlavors.length)
    ] as IngredientType

    this.lastSpawnAtGameSeconds = ctx.gameSecondsElapsed
    this.spawnedOrders++
    return [{ tableNumber, flavor }]
  }

  reset(): void {
    this.lastSpawnAtGameSeconds = 0
    this.spawnedOrders = 0
  }
}

/**
 * Helper pra construir o SpawnContext a partir do estado atual.
 */
export function buildSpawnContext(
  state: GameState,
  activeTableNumbers: number[],
  tablesWithPendingOrder: Set<number>
): SpawnContext {
  return {
    day: state.dayClock.day,
    gameSecondsElapsed: state.dayClock.gameSecondsElapsed,
    availableFlavors: state.capacity.availableFlavors,
    activeTableNumbers,
    tablesWithPendingOrder,
  }
}

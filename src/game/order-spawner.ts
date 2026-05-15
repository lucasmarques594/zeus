

import { orderIntervalGameSeconds, ORDERS } from './balance'
import type { GameState } from './game-state'
import type { Order, IngredientType } from './types'

export interface SpawnContext {
  day: number
  gameSecondsElapsed: number
  availableFlavors: string[]
  activeTableNumbers: number[]
  tablesWithPendingOrder: Set<number>
}

export class OrderSpawner {
  private lastSpawnAtGameSeconds = 0
  private spawnedOrders = 0

  tryGenerate(ctx: SpawnContext): Order[] {
    const interval = orderIntervalGameSeconds(ctx.day)
    const elapsedSinceLastSpawn = ctx.gameSecondsElapsed - this.lastSpawnAtGameSeconds

    if (this.spawnedOrders < ORDERS.initialBacklog) {
      return this.generateOne(ctx)
    }

    if (elapsedSinceLastSpawn < interval) return []
    return this.generateOne(ctx)
  }

  private generateOne(ctx: SpawnContext): Order[] {
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

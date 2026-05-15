/**
 * Estado persistente do jogador (entre dias e entre sessões).
 *
 * Separado do `WorldState` (que é o estado *atual* do mundo durante um dia).
 * GameState sobrevive ao fim do dia; WorldState é recriado a cada novo dia.
 */

import type { DayClockState } from './day-clock'
import { INITIAL_CAPACITY } from './balance'

/**
 * Catálogo de features que podem ser desbloqueadas via loja.
 */
export type FeatureId =
  // Estruturas de controle
  | 'if'
  | 'else'
  | 'else_if'
  | 'while'
  | 'for'
  | 'function'
  // Operadores
  | 'comparison_ops'
  | 'logical_ops'
  // Tipos
  | 'text_type'
  | 'bool_type'
  // Built-ins
  | 'proximo_pedido'
  | 'peca_em_frente'
  | 'escrever'
  | 'segurando'
  | 'status_mesa'
  | 'ingrediente_em'
  // Hardware
  | 'extra_table'
  | 'extra_oven'
  | 'extra_robot'
  // Cardápio
  | 'flavor_frango'
  | 'flavor_margherita'
  | 'flavor_portuguesa'

export interface GameState {
  /** Versão do schema (pra migrações futuras). */
  schemaVersion: number
  /** Dinheiro acumulado. */
  money: number
  /** Estado do relógio (pra retomar dia em andamento). */
  dayClock: DayClockState
  /** Features compradas. */
  ownedFeatures: FeatureId[]
  /** Capacidade atual (cresce com compras). */
  capacity: {
    tables: number
    ovens: number
    robots: number
    availableFlavors: string[]
  }
  /** Código de cada robô. Robot 0 = primeiro robô. */
  robotCode: Record<number, string>
  /** Estatísticas acumuladas. */
  stats: {
    totalDays: number
    totalPizzasDelivered: number
    totalMoneyEarned: number
    bestSingleDay: { day: number; money: number }
  }
  /** Quando começou a jogar (ISO). */
  startedAt: string
  /** Última vez que salvou (ISO). */
  lastSavedAt: string
}

export const GAME_STATE_SCHEMA_VERSION = 1

/**
 * Cria um GameState novo (Dia 1, sem features compradas).
 */
export function createInitialGameState(): GameState {
  return {
    schemaVersion: GAME_STATE_SCHEMA_VERSION,
    money: INITIAL_CAPACITY.startingMoney,
    dayClock: {
      day: 1,
      gameSecondsElapsed: 0,
      status: 'pre_day',
    },
    ownedFeatures: [],
    capacity: {
      tables: INITIAL_CAPACITY.tables,
      ovens: 1,
      robots: INITIAL_CAPACITY.robots,
      availableFlavors: [...INITIAL_CAPACITY.availableFlavors],
    },
    robotCode: { 0: '' },
    stats: {
      totalDays: 0,
      totalPizzasDelivered: 0,
      totalMoneyEarned: 0,
      bestSingleDay: { day: 0, money: 0 },
    },
    startedAt: new Date().toISOString(),
    lastSavedAt: new Date().toISOString(),
  }
}

/**
 * Helpers de leitura.
 */
export function hasFeature(state: GameState, feature: FeatureId): boolean {
  return state.ownedFeatures.includes(feature)
}

export function hasFlavor(state: GameState, flavor: string): boolean {
  return state.capacity.availableFlavors.includes(flavor)
}

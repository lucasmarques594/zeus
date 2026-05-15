/**
 * Tipos centrais do mundo do jogo da pizzaria.
 */

export type Direction = 'norte' | 'sul' | 'leste' | 'oeste'

export type TileType =
  | 'chao'
  | 'parede'
  | 'balcao'
  | 'mesa'
  | 'forno'
  | 'ingrediente'
  | 'caixa'
  | 'lixo'
  | 'goal' // alvo (níveis simples de movimento)

export type IngredientType = 'massa' | 'molho' | 'queijo' | 'calabresa' | 'frango'

export type PizzaState = 'crua' | 'cozinhando' | 'pronta' | 'queimada'

export interface Pizza {
  state: PizzaState
  flavor: IngredientType // sabor do topping principal
  cookTicks: number // quantos ticks já cozinhou
}

export interface Tile {
  x: number
  y: number
  type: TileType
  ingredient?: IngredientType
  tableNumber?: number
  // Para balcão: pode ter pizza pronta empilhada
  pizzaReady?: boolean
}

export interface Forno {
  x: number
  y: number
  pizza: Pizza | null
}

export interface Order {
  tableNumber: number
  flavor: IngredientType
}

export interface Mesa {
  tableNumber: number
  x: number
  y: number
  waitingFor: IngredientType | null
  served: boolean
  patience: number // ticks restantes até ficar "irritada" (não usado em níveis simples)
}

export interface PlayerState {
  x: number
  y: number
  facing: Direction
  holding: 'pizza_pronta' | IngredientType | null
}

export interface WorldState {
  width: number
  height: number
  player: PlayerState
  tiles: Tile[][]
  fornos: Forno[]
  mesas: Mesa[]
  orderQueue: Order[]
  deliveredCount: number
  burnedCount: number
  money: number
}

export interface LevelDefinition {
  id: number
  title: string
  subtitle: string
  concept: string
  objective: string
  story: string
  availableFunctions: string[]
  availableKeywords: string[]
  maxTicks: number
  scoreFormula: string
  grid: {
    width: number
    height: number
    playerStart: { x: number; y: number; facing: Direction }
    tiles: Array<{
      x: number
      y: number
      type: string
      ingredient?: string
      tableNumber?: number
      item?: string
    }>
    orderQueue?: string[] // formato "mesa,sabor"
  }
  winCondition: string
  referenceSolution: string
  hints: string[]
}

// Direção -> delta (x, y)
export const DIRECTION_DELTAS: Record<Direction, { dx: number; dy: number }> = {
  norte: { dx: 0, dy: -1 },
  sul: { dx: 0, dy: 1 },
  leste: { dx: 1, dy: 0 },
  oeste: { dx: -1, dy: 0 },
}

export const DIRECTIONS: Direction[] = ['norte', 'sul', 'leste', 'oeste']

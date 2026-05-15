

import type { WorldHandle, DSLValue } from '@engine/interpreter'
import type {
  Direction,
  LevelDefinition,
  Tile,
  Forno,
  Mesa,
  Order,
  WorldState,
  IngredientType,
  PlayerState,
} from './types'
import { DIRECTION_DELTAS, DIRECTIONS } from './types'

const COOK_TICKS_READY = 5
const COOK_TICKS_BURN = 10

export class GameWorld implements WorldHandle {
  public state: WorldState
  private allowedBuiltins: Set<string>
  private log: string[] = []

  constructor(private readonly level: LevelDefinition) {
    this.state = this.initFromLevel(level)
    this.allowedBuiltins = new Set([...level.availableFunctions, 'escrever'])
  }


  hasBuiltin(name: string): boolean {
    return this.allowedBuiltins.has(name) || BUILTIN_REGISTRY[name] !== undefined
  }

  callBuiltin(name: string, args: DSLValue[]): { result: DSLValue; ticks: number } {
    const def = BUILTIN_REGISTRY[name]
    if (!def) {
      return { result: null, ticks: 0 }
    }
    if (!this.allowedBuiltins.has(name)) {
      this.log.push(`🍕 '${name}' ainda não está disponível neste nível.`)
      return { result: null, ticks: 0 }
    }
    return def.fn(this, args)
  }

  getLog(): string[] {
    return this.log
  }

  clearLog(): void {
    this.log = []
  }

  addLog(msg: string): void {
    this.log.push(msg)
  }


  private initFromLevel(level: LevelDefinition): WorldState {
    const { width, height, playerStart, tiles, orderQueue } = level.grid

    const grid: Tile[][] = []
    for (let y = 0; y < height; y++) {
      const row: Tile[] = []
      for (let x = 0; x < width; x++) {
        row.push({ x, y, type: 'chao' })
      }
      grid.push(row)
    }

    const fornos: Forno[] = []
    const mesas: Mesa[] = []

    for (const t of tiles) {
      const tile = grid[t.y]?.[t.x]
      if (!tile) continue
      tile.type = t.type as Tile['type']
      if (t.ingredient) tile.ingredient = t.ingredient as IngredientType
      if (t.tableNumber !== undefined) tile.tableNumber = t.tableNumber
      if (t.type === 'balcao' && (t.item === 'pizza_pronta' || t.item === 'pizza_infinita')) {
        tile.pizzaReady = true
        ;(tile as Tile & { infinite?: boolean }).infinite = t.item === 'pizza_infinita'
      }
      if (t.type === 'forno') {
        fornos.push({ x: t.x, y: t.y, pizza: null })
      }
      if (t.type === 'mesa' && t.tableNumber !== undefined) {
        mesas.push({
          tableNumber: t.tableNumber,
          x: t.x,
          y: t.y,
          waitingFor: null,
          served: false,
          patience: 1000,
        })
      }
    }

    const orders: Order[] = (orderQueue ?? []).map((s) => {
      const [tableStr, flavor] = s.split(',')
      return {
        tableNumber: parseInt(tableStr, 10),
        flavor: flavor as IngredientType,
      }
    })

    for (const ord of orders) {
      const mesa = mesas.find((m) => m.tableNumber === ord.tableNumber)
      if (mesa && !mesa.waitingFor) {
        mesa.waitingFor = ord.flavor
      }
    }

    const player: PlayerState = {
      x: playerStart.x,
      y: playerStart.y,
      facing: playerStart.facing,
      holding: null,
    }

    return {
      width,
      height,
      player,
      tiles: grid,
      fornos,
      mesas,
      orderQueue: orders,
      deliveredCount: 0,
      burnedCount: 0,
      money: 0,
      totalTicks: 0,
      victoryReached: false,
      victoryAtTick: 0,
    }
  }

  getTileInFront(): Tile | null {
    const { dx, dy } = DIRECTION_DELTAS[this.state.player.facing]
    const x = this.state.player.x + dx
    const y = this.state.player.y + dy
    if (x < 0 || y < 0 || x >= this.state.width || y >= this.state.height) return null
    return this.state.tiles[y][x]
  }

  getFornoAt(x: number, y: number): Forno | null {
    return this.state.fornos.find((f) => f.x === x && f.y === y) ?? null
  }

  getMesaByNumber(n: number): Mesa | null {
    return this.state.mesas.find((m) => m.tableNumber === n) ?? null
  }

  advanceTicks(n: number): void {
    for (let i = 0; i < n; i++) {
      this.state.totalTicks++
      for (const forno of this.state.fornos) {
        if (forno.pizza) {
          forno.pizza.cookTicks++
          if (forno.pizza.cookTicks >= COOK_TICKS_BURN) {
            forno.pizza.state = 'queimada'
          } else if (forno.pizza.cookTicks >= COOK_TICKS_READY) {
            forno.pizza.state = 'pronta'
          } else if (forno.pizza.cookTicks > 0) {
            forno.pizza.state = 'cozinhando'
          }
        }
      }
      this.recordWinAttempt()
    }
  }


  evaluateWinCondition(): boolean {
    const cond = this.level.winCondition
    if (cond.startsWith('player_on_tile_type:')) {
      const target = cond.split(':')[1]
      const tile = this.state.tiles[this.state.player.y][this.state.player.x]
      return tile.type === target
    }
    if (cond.startsWith('table_served:')) {
      const n = parseInt(cond.split(':')[1], 10)
      const mesa = this.getMesaByNumber(n)
      return mesa?.served === true
    }
    if (cond === 'all_orders_delivered') {
      return (
        this.state.orderQueue.length === 0 &&
        this.state.mesas.every((m) => m.served || m.waitingFor === null)
      )
    }
    return false
  }


  recordWinAttempt(): void {
    if (!this.state.victoryReached && this.evaluateWinCondition()) {
      this.state.victoryReached = true
      this.state.victoryAtTick = this.state.totalTicks
    }
  }

  hasWon(): boolean {
    return this.state.victoryReached
  }
}

type BuiltinFn = (
  world: GameWorld,
  args: DSLValue[]
) => { result: DSLValue; ticks: number }

interface BuiltinDef {
  name: string
  fn: BuiltinFn
}

const BUILTIN_REGISTRY: Record<string, BuiltinDef> = {}

function register(name: string, fn: BuiltinFn): void {
  BUILTIN_REGISTRY[name] = { name, fn }
}


register('mover', (world, args) => {
  const dir = args[0]
  if (typeof dir !== 'string' || !DIRECTIONS.includes(dir as Direction)) {
    world.addLog('🍕 mover() espera uma direção: "norte", "sul", "leste" ou "oeste".')
    return { result: null, ticks: 1 }
  }
  world.state.player.facing = dir as Direction
  const tile = world.getTileInFront()
  if (!tile || tile.type === 'parede') {
    world.addLog(`🍕 Ops! O entregador bateu numa parede ao tentar ir para ${dir}.`)
    world.advanceTicks(1)
    return { result: null, ticks: 1 }
  }
  world.state.player.x = tile.x
  world.state.player.y = tile.y
  world.advanceTicks(1)
  return { result: null, ticks: 1 }
})

register('virar', (world, args) => {
  const dir = args[0]
  if (typeof dir !== 'string' || !DIRECTIONS.includes(dir as Direction)) {
    world.addLog('🍕 virar() espera uma direção.')
    return { result: null, ticks: 1 }
  }
  world.state.player.facing = dir as Direction
  world.advanceTicks(1)
  return { result: null, ticks: 1 }
})

register('posicao', (world) => {
  return { result: `${world.state.player.x},${world.state.player.y}`, ticks: 0 }
})

register('direcao_atual', (world) => {
  return { result: world.state.player.facing, ticks: 0 }
})


register('pegar', (world) => {
  if (world.state.player.holding !== null) {
    world.addLog('🍕 As mãos do entregador já estão cheias! Use soltar() ou entregar() antes.')
    world.advanceTicks(1)
    return { result: false, ticks: 1 }
  }
  const tile = world.getTileInFront()
  if (!tile) {
    world.addLog('🍕 Não tem nada na frente pra pegar.')
    world.advanceTicks(1)
    return { result: false, ticks: 1 }
  }
  if (tile.type === 'balcao' && tile.pizzaReady) {
    world.state.player.holding = 'pizza_pronta'
    const infinite = (tile as Tile & { infinite?: boolean }).infinite
    if (!infinite) tile.pizzaReady = false
    world.advanceTicks(1)
    return { result: true, ticks: 1 }
  }
  if (tile.type === 'ingrediente' && tile.ingredient) {
    world.state.player.holding = tile.ingredient
    world.advanceTicks(1)
    return { result: true, ticks: 1 }
  }
  world.addLog('🍕 Não tem nada que dê pra pegar na sua frente.')
  world.advanceTicks(1)
  return { result: false, ticks: 1 }
})

register('soltar', (world) => {
  if (world.state.player.holding === null) {
    world.addLog('🍕 As mãos estão vazias, não dá pra soltar nada.')
    world.advanceTicks(1)
    return { result: false, ticks: 1 }
  }
  world.state.player.holding = null
  world.advanceTicks(1)
  return { result: true, ticks: 1 }
})

register('segurando', (world) => {
  return { result: world.state.player.holding, ticks: 0 }
})

register('peca_em_frente', (world) => {
  const tile = world.getTileInFront()
  if (!tile) return { result: 'parede', ticks: 0 }
  return { result: tile.type, ticks: 0 }
})


register('ingrediente_em', (world) => {
  const tile = world.getTileInFront()
  if (!tile || tile.type !== 'ingrediente') return { result: null, ticks: 0 }
  return { result: tile.ingredient ?? null, ticks: 0 }
})

register('estado_forno', (world) => {
  const tile = world.getTileInFront()
  if (!tile || tile.type !== 'forno') return { result: 'vazio', ticks: 0 }
  const forno = world.getFornoAt(tile.x, tile.y)
  if (!forno || !forno.pizza) return { result: 'vazio', ticks: 0 }
  return { result: forno.pizza.state, ticks: 0 }
})


register('proximo_pedido', (world) => {
  if (world.state.orderQueue.length === 0) return { result: null, ticks: 0 }
  const ord = world.state.orderQueue[0]
  return { result: `${ord.tableNumber},${ord.flavor}`, ticks: 0 }
})

register('entregar', (world, args) => {
  const tableNum = args[0]
  if (typeof tableNum !== 'number') {
    world.addLog('🍕 entregar() espera o número da mesa.')
    return { result: false, ticks: 1 }
  }
  if (world.state.player.holding === null) {
    world.addLog('🍕 Você não está segurando nada para entregar.')
    world.advanceTicks(1)
    return { result: false, ticks: 1 }
  }
  const mesa = world.getMesaByNumber(tableNum)
  if (!mesa) {
    world.addLog(`🍕 Mesa ${tableNum} não existe.`)
    world.advanceTicks(1)
    return { result: false, ticks: 1 }
  }
  const pdx = Math.abs(world.state.player.x - mesa.x)
  const pdy = Math.abs(world.state.player.y - mesa.y)
  if (pdx + pdy > 1) {
    world.addLog(`🍕 Você está longe demais da mesa ${tableNum} pra entregar.`)
    world.advanceTicks(1)
    return { result: false, ticks: 1 }
  }
  world.state.player.holding = null
  mesa.served = true
  const idx = world.state.orderQueue.findIndex((o) => o.tableNumber === tableNum)
  if (idx >= 0) world.state.orderQueue.splice(idx, 1)
  const next = world.state.orderQueue.find((o) => o.tableNumber === tableNum)
  if (next) {
    mesa.waitingFor = next.flavor
    mesa.served = false
  } else {
    mesa.waitingFor = null
  }
  world.state.deliveredCount++
  world.state.money += 1500
  world.advanceTicks(1)
  return { result: true, ticks: 1 }
})

register('status_mesa', (world, args) => {
  const n = args[0]
  if (typeof n !== 'number') return { result: 'vazia', ticks: 0 }
  const mesa = world.getMesaByNumber(n)
  if (!mesa) return { result: 'vazia', ticks: 0 }
  if (mesa.served) return { result: 'servida', ticks: 0 }
  if (mesa.waitingFor) return { result: 'esperando', ticks: 0 }
  return { result: 'vazia', ticks: 0 }
})


register('escrever', (world, args) => {
  const msg = args.map(stringifyValue).join(' ')
  world.addLog(`📝 ${msg}`)
  return { result: null, ticks: 0 }
})

register('esperar', (world, args) => {
  const n = args[0]
  if (typeof n !== 'number' || n < 0) return { result: null, ticks: 0 }
  const ticks = Math.floor(n)
  world.advanceTicks(ticks)
  return { result: null, ticks }
})

register('aleatorio', (_world, args) => {
  const min = typeof args[0] === 'number' ? args[0] : 0
  const max = typeof args[1] === 'number' ? args[1] : 100
  return { result: Math.floor(Math.random() * (max - min + 1)) + min, ticks: 0 }
})

register('tick_atual', () => {
  return { result: 0, ticks: 0 }
})

register('dinheiro', (world) => {
  return { result: world.state.money, ticks: 0 }
})

function stringifyValue(v: DSLValue): string {
  if (v === null) return 'nulo'
  if (typeof v === 'boolean') return v ? 'verdadeiro' : 'falso'
  return String(v)
}

/**
 * Testes do modo tycoon: ciclos, paciência, persistência.
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { parse } from '../../src/engine/parser'
import { GameWorld } from '../../src/game/world'
import { CycleRunner } from '../../src/game/cycle-runner'
import { DayClock } from '../../src/game/day-clock'
import { OrderSpawner, buildSpawnContext } from '../../src/game/order-spawner'
import { createInitialGameState } from '../../src/game/game-state'
import { createTycoonLevel } from '../../src/game/level-tycoon'
import { dayDurationSeconds, orderIntervalGameSeconds } from '../../src/game/balance'

describe('balance', () => {
  it('dia 1 dura 180 segundos', () => {
    expect(dayDurationSeconds(1)).toBe(180)
  })

  it('cada dia adiciona 5 segundos até o limite', () => {
    expect(dayDurationSeconds(2)).toBe(185)
    expect(dayDurationSeconds(10)).toBe(225)
    expect(dayDurationSeconds(1000)).toBe(600) // cap
  })

  it('intervalo de pedidos diminui com o dia', () => {
    const dia1 = orderIntervalGameSeconds(1)
    const dia20 = orderIntervalGameSeconds(20)
    expect(dia20).toBeLessThan(dia1)
  })
})

describe('DayClock', () => {
  let clock: DayClock
  beforeEach(() => {
    clock = new DayClock(1)
  })

  it('começa em pre_day', () => {
    expect(clock.getState().status).toBe('pre_day')
  })

  it('display mostra 18:00 no início', () => {
    expect(clock.getClockDisplay()).toBe('18:00')
  })

  it('avança para próximo dia', () => {
    clock.advanceDay()
    expect(clock.getState().day).toBe(2)
    expect(clock.getState().gameSecondsElapsed).toBe(0)
  })

  it('pode ser pausado e retomado', () => {
    clock.start()
    clock.pause()
    expect(clock.getState().status).toBe('paused')
    clock.resume()
    expect(clock.getState().status).toBe('running')
  })
})

describe('GameWorld - modo tycoon', () => {
  it('inicializa com mode=tycoon quando especificado', () => {
    const level = createTycoonLevel(3, ['calabresa'])
    const world = new GameWorld(level, 'tycoon')
    expect(world.state.mode).toBe('tycoon')
  })

  it('inicializa com mode=tutorial por padrão (retrocompat)', () => {
    const level = createTycoonLevel(3, ['calabresa'])
    const world = new GameWorld(level)
    expect(world.state.mode).toBe('tutorial')
  })

  it('resetPlayerToSpawn volta jogador pro spawn point', () => {
    const level = createTycoonLevel(3, ['calabresa'])
    const world = new GameWorld(level, 'tycoon')
    const spawn = world.state.playerSpawnPoint
    // Move jogador
    world.state.player.x = 0
    world.state.player.y = 0
    world.state.player.holding = 'pizza_pronta'
    world.resetPlayerToSpawn()
    expect(world.state.player.x).toBe(spawn.x)
    expect(world.state.player.y).toBe(spawn.y)
    expect(world.state.player.facing).toBe(spawn.facing)
    expect(world.state.player.holding).toBeNull()
  })

  it('paciência: cliente vira impaciente após 30s', () => {
    const level = createTycoonLevel(3, ['calabresa'])
    const world = new GameWorld(level, 'tycoon')
    world.addOrder({ tableNumber: 1, flavor: 'calabresa' }, 0)
    world.advancePatience(15)
    expect(world.state.mesas[0].patienceStage).toBe('feliz')
    world.advancePatience(35)
    expect(world.state.mesas[0].patienceStage).toBe('impaciente')
  })

  it('paciência: cliente vai embora após 90s', () => {
    const level = createTycoonLevel(3, ['calabresa'])
    const world = new GameWorld(level, 'tycoon')
    world.addOrder({ tableNumber: 1, flavor: 'calabresa' }, 0)
    const initialMoney = world.state.money
    world.advancePatience(100)
    expect(world.state.mesas[0].patienceStage).toBe('foi_embora')
    expect(world.state.money).toBeLessThan(initialMoney) // penalidade
    expect(world.state.abandonedCount).toBe(1)
  })

  it('paciência: tutorial mode não aplica decay', () => {
    const level = createTycoonLevel(3, ['calabresa'])
    const world = new GameWorld(level, 'tutorial')
    world.addOrder({ tableNumber: 1, flavor: 'calabresa' }, 0)
    world.advancePatience(1000)
    // Em tutorial, advancePatience é no-op
    expect(world.state.mesas[0].patienceStage).toBe('feliz')
  })
})

describe('OrderSpawner', () => {
  it('gera pedido inicial (backlog)', () => {
    const spawner = new OrderSpawner()
    const state = createInitialGameState()
    const ctx = buildSpawnContext(state, [1, 2, 3], new Set())
    const orders = spawner.tryGenerate(ctx)
    expect(orders.length).toBe(1)
  })

  it('não gera se todas as mesas têm pedido', () => {
    const spawner = new OrderSpawner()
    spawner.tryGenerate(buildSpawnContext(createInitialGameState(), [1], new Set())) // gasta o backlog
    const orders = spawner.tryGenerate(
      buildSpawnContext(createInitialGameState(), [1], new Set([1]))
    )
    expect(orders.length).toBe(0)
  })
})

describe('CycleRunner', () => {
  it('completa ciclos quando código termina com sucesso', () => {
    const level = createTycoonLevel(3, ['calabresa'])
    const world = new GameWorld(level, 'tycoon')
    world.setAllowedBuiltins(['mover'])
    const { ast } = parse('mover("sul")')
    const runner = new CycleRunner(ast!, world)

    let cyclesObserved = 0
    for (let i = 0; i < 50; i++) {
      const r = runner.step()
      if (r.kind === 'cycle_completed') cyclesObserved++
    }

    expect(cyclesObserved).toBeGreaterThan(1)
    expect(runner.getStats().isFrozen).toBe(false)
  })

  it('reset de posição funciona entre ciclos', () => {
    const level = createTycoonLevel(3, ['calabresa'])
    const world = new GameWorld(level, 'tycoon')
    world.setAllowedBuiltins(['mover'])
    const spawn = world.state.playerSpawnPoint
    const { ast } = parse('mover("sul")')
    const runner = new CycleRunner(ast!, world)

    // Roda alguns steps até completar pelo menos um ciclo
    for (let i = 0; i < 20; i++) {
      const r = runner.step()
      if (r.kind === 'cycle_completed') {
        // Imediatamente após o ciclo, posição deve ser o spawn
        expect(world.state.player.x).toBe(spawn.x)
        expect(world.state.player.y).toBe(spawn.y)
        return
      }
    }
    throw new Error('Nenhum ciclo completou')
  })
})

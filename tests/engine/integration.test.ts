import { describe, it, expect } from 'vitest'
import { parse } from '../../src/engine/parser'
import { Interpreter } from '../../src/engine/interpreter'
import { GameWorld } from '../../src/game/world'
import { LEVELS } from '../../src/game/levels'

describe('integração engine+world', () => {
  it('nível 0: solução de referência vence', () => {
    const level = LEVELS[0]
    const { ast, errors } = parse(level.referenceSolution)
    expect(errors).toHaveLength(0)
    expect(ast).not.toBeNull()

    const world = new GameWorld(level)
    const interp = new Interpreter(ast!, world)
    const result = interp.runToCompletion()

    expect(result.kind).toBe('done')
    expect(world.hasWon()).toBe(true)
  })

  it('nível 3: loop para resolve com 10 ticks', () => {
    const level = LEVELS[3]
    const { ast, errors } = parse(level.referenceSolution)
    expect(errors).toHaveLength(0)

    const world = new GameWorld(level)
    const interp = new Interpreter(ast!, world)
    interp.runToCompletion()

    expect(world.hasWon()).toBe(true)
    expect(interp.getTicksUsed()).toBe(10)
  })

  it('nível 4: pegar e entregar pizza', () => {
    const level = LEVELS[4]
    const { ast, errors } = parse(level.referenceSolution)
    expect(errors).toHaveLength(0)

    const world = new GameWorld(level)
    const interp = new Interpreter(ast!, world)
    interp.runToCompletion()

    expect(world.hasWon()).toBe(true)
    expect(world.state.deliveredCount).toBe(1)
  })

  it('detecta loop infinito (limite de ticks)', () => {
    const code = 'enquanto verdadeiro:\n    mover("leste")'
    const { ast } = parse(code)
    const world = new GameWorld(LEVELS[0])
    const interp = new Interpreter(ast!, world, {
      maxTicks: 50,
      maxRecursionDepth: 100,
      maxIterationsWithoutTick: 100_000,
    })
    const result = interp.runToCompletion()
    expect(result.kind).toBe('error')
  })

  it('feature bloqueada não causa parse error mas é detectada à parte', () => {
    const code = 'enquanto verdadeiro:\n    mover("leste")'
    const { errors } = parse(code)
    expect(errors).toHaveLength(0) // parser aceita, app filtra
  })

  it('vitória é sticky: jogador passa pelo alvo e sai, ainda venceu', () => {
    // Nível 0: alvo está em (2,1). Jogador começa em (1,1) virado para leste.
    // Ele anda pra leste (pisa no alvo) e depois pra oeste (sai dele).
    // Mesmo terminando fora do alvo, a vitória deve estar registrada.
    const code = 'mover("leste")\nmover("oeste")'
    const level = LEVELS[0]
    const { ast } = parse(code)
    const world = new GameWorld(level)
    const interp = new Interpreter(ast!, world)
    interp.runToCompletion()

    expect(world.hasWon()).toBe(true)
    expect(world.evaluateWinCondition()).toBe(false) // não está mais no alvo
    expect(world.state.victoryAtTick).toBe(1) // venceu no tick 1
  })
})

/**
 * Smoke test de integração: parse + interpreter + world.
 * Verifica que o nível 0 (mover uma casa) é vencível com a solução de referência.
 */

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
    expect(world.checkWin()).toBe(true)
  })

  it('nível 3: loop para resolve com 10 ticks', () => {
    const level = LEVELS[3]
    const { ast, errors } = parse(level.referenceSolution)
    expect(errors).toHaveLength(0)

    const world = new GameWorld(level)
    const interp = new Interpreter(ast!, world)
    interp.runToCompletion()

    expect(world.checkWin()).toBe(true)
    expect(interp.getTicksUsed()).toBe(10)
  })

  it('nível 4: pegar e entregar pizza', () => {
    const level = LEVELS[4]
    const { ast, errors } = parse(level.referenceSolution)
    expect(errors).toHaveLength(0)

    const world = new GameWorld(level)
    const interp = new Interpreter(ast!, world)
    interp.runToCompletion()

    expect(world.checkWin()).toBe(true)
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
    // Apenas parsing — a checagem de keywords bloqueadas é feita pela App
    const code = 'enquanto verdadeiro:\n    mover("leste")'
    const { errors } = parse(code)
    expect(errors).toHaveLength(0) // parser aceita, app filtra
  })
})

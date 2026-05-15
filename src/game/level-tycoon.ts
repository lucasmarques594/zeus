

import type { LevelDefinition } from './types'


export function createTycoonLevel(numTables: number, availableFlavors: string[]): LevelDefinition {
  const tiles: LevelDefinition['grid']['tiles'] = [
    { x: 3, y: 1, type: 'balcao', item: 'pizza_infinita' },
    { x: 4, y: 1, type: 'balcao', item: 'pizza_infinita' },
    { x: 5, y: 1, type: 'balcao', item: 'pizza_infinita' },
  ]

  const mesaPositions = [
    { x: 1, y: 5 }, 
    { x: 4, y: 5 }, 
    { x: 7, y: 5 }, 
    { x: 1, y: 3 }, 
    { x: 7, y: 3 }, 
    { x: 4, y: 3 }, 
  ]

  for (let i = 0; i < Math.min(numTables, mesaPositions.length); i++) {
    const pos = mesaPositions[i]
    tiles.push({ x: pos.x, y: pos.y, type: 'mesa', tableNumber: i + 1 })
  }

  return {
    id: -1, 
    title: 'Pizzaria',
    subtitle: 'Modo Tycoon',
    concept: 'Automatize a pizzaria escrevendo código',
    objective: 'Atenda quantos clientes conseguir antes do fim do dia.',
    story: 'Você é o gerente da pizzaria. Programe seu robô pra atender clientes.',
    availableFunctions: ['mover', 'virar', 'pegar', 'entregar'],
    availableKeywords: [], 
    maxTicks: 50000,
    scoreFormula: 'money',
    grid: {
      width: 9,
      height: 7,
      playerStart: { x: 4, y: 3, facing: 'sul' },
      tiles,
    },
    winCondition: 'no_win',
    referenceSolution: '# Comece simples:\nmover("norte")\npegar()\nmover("sul")\nentregar(1)\n',
    hints: [
      'No tycoon, seu código roda em loop até o fim do dia.',
      'O robô volta pro lugar inicial a cada vez que o código termina.',
      'Quanto mais eficiente o código, mais clientes você atende.',
    ],
  }
}

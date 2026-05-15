/**
 * Mapa padrão da pizzaria no modo tycoon.
 *
 * Tem balcão central com pizza_infinita (estoque ilimitado pro MVP),
 * 3 mesas iniciais (mais via loja), e o spawn point do robô.
 *
 * Estrutura compatível com LevelDefinition pra reaproveitar `GameWorld`.
 */

import type { LevelDefinition } from './types'

/**
 * Cria a definição do mapa tycoon com N mesas.
 * Pra MVP, layout fixo com até 6 mesas pré-posicionadas.
 */
export function createTycoonLevel(numTables: number, availableFlavors: string[]): LevelDefinition {
  // Layout 9x7: balcão central, mesas em fileira inferior
  const tiles: LevelDefinition['grid']['tiles'] = [
    // Balcão (linha 1, colunas 3-5)
    { x: 3, y: 1, type: 'balcao', item: 'pizza_infinita' },
    { x: 4, y: 1, type: 'balcao', item: 'pizza_infinita' },
    { x: 5, y: 1, type: 'balcao', item: 'pizza_infinita' },
  ]

  // Mesas em posições pré-definidas (até 6)
  const mesaPositions = [
    { x: 1, y: 5 }, // mesa 1
    { x: 4, y: 5 }, // mesa 2
    { x: 7, y: 5 }, // mesa 3
    { x: 1, y: 3 }, // mesa 4 (expansão)
    { x: 7, y: 3 }, // mesa 5 (expansão)
    { x: 4, y: 3 }, // mesa 6 (expansão, mas vai sobrepor balcão se for caso)
  ]

  for (let i = 0; i < Math.min(numTables, mesaPositions.length); i++) {
    const pos = mesaPositions[i]
    tiles.push({ x: pos.x, y: pos.y, type: 'mesa', tableNumber: i + 1 })
  }

  return {
    id: -1, // -1 indica tycoon (não é nível numerado)
    title: 'Pizzaria',
    subtitle: 'Modo Tycoon',
    concept: 'Automatize a pizzaria escrevendo código',
    objective: 'Atenda quantos clientes conseguir antes do fim do dia.',
    story: 'Você é o gerente da pizzaria. Programe seu robô pra atender clientes.',
    availableFunctions: ['mover', 'virar', 'pegar', 'entregar'], // mais via loja
    availableKeywords: [], // todas via loja
    maxTicks: 50000,
    scoreFormula: 'money',
    grid: {
      width: 9,
      height: 7,
      playerStart: { x: 4, y: 3, facing: 'sul' },
      tiles,
    },
    winCondition: 'no_win', // tycoon não tem condição de vitória
    referenceSolution: '# Comece simples:\nmover("norte")\npegar()\nmover("sul")\nentregar(1)\n',
    hints: [
      'No tycoon, seu código roda em loop até o fim do dia.',
      'O robô volta pro lugar inicial a cada vez que o código termina.',
      'Quanto mais eficiente o código, mais clientes você atende.',
    ],
  }
}

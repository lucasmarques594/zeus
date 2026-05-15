/**
 * Definições dos níveis do jogo.
 *
 * Versão MVP com 5 níveis funcionais. Os outros 6 (até 10) ficam como TODO
 * pra adicionar conforme o jogador testa e dá feedback.
 *
 * Especificação completa: ../../docs/levels.json
 */

import type { LevelDefinition } from './types'

export const LEVELS: LevelDefinition[] = [
  // ============================================================================
  // NÍVEL 0 - Primeiro programa
  // ============================================================================
  {
    id: 0,
    title: 'Olá, pizzaria!',
    subtitle: 'Sua primeira instrução',
    concept: 'Um programa é uma sequência de comandos executados pelo computador',
    objective: 'Mover o personagem uma única casa para o leste.',
    story:
      'Bem-vindo à pizzaria! Antes de aprender a fazer pizza, você precisa aprender a se mover. Mande o entregador andar uma casa para o leste usando mover("leste").',
    availableFunctions: ['mover'],
    availableKeywords: [],
    maxTicks: 10,
    scoreFormula: '1000 - ticks * 10',
    grid: {
      width: 5,
      height: 3,
      playerStart: { x: 1, y: 1, facing: 'leste' },
      tiles: [{ x: 2, y: 1, type: 'goal' }],
    },
    winCondition: 'player_on_tile_type:goal',
    referenceSolution: 'mover("leste")\n',
    hints: [
      'Use a função mover() passando uma direção como texto.',
      'Direções aceitas: "norte", "sul", "leste", "oeste".',
      'Não esqueça das aspas em torno da direção.',
    ],
  },
  // ============================================================================
  // NÍVEL 1 - Sequência
  // ============================================================================
  {
    id: 1,
    title: 'Caminho até a mesa',
    subtitle: 'Sequências de comandos',
    concept: 'Comandos são executados na ordem em que aparecem',
    objective: 'Levar o entregador até a casa marcada seguindo um caminho.',
    story: 'Um cliente está esperando. Guie o entregador até ele passo a passo.',
    availableFunctions: ['mover', 'virar'],
    availableKeywords: [],
    maxTicks: 50,
    scoreFormula: '1000 - ticks * 20',
    grid: {
      width: 7,
      height: 5,
      playerStart: { x: 0, y: 2, facing: 'leste' },
      tiles: [
        { x: 6, y: 0, type: 'goal' },
        { x: 1, y: 0, type: 'parede' },
        { x: 1, y: 1, type: 'parede' },
        { x: 5, y: 3, type: 'parede' },
        { x: 5, y: 4, type: 'parede' },
      ],
    },
    winCondition: 'player_on_tile_type:goal',
    referenceSolution:
      'mover("leste")\nmover("leste")\nmover("leste")\nmover("leste")\nmover("norte")\nmover("norte")\nmover("leste")\nmover("leste")\n',
    hints: [
      'Cada comando move o personagem uma única casa.',
      'mover() vira automaticamente na direção e anda.',
      'Olhe o mapa antes de planejar a rota.',
    ],
  },
  // ============================================================================
  // NÍVEL 2 - Repetição manual cansa
  // ============================================================================
  {
    id: 2,
    title: 'O caminho longo',
    subtitle: 'Quando repetir cansa...',
    concept: 'Repetir comandos manualmente é tedioso e cheio de erros',
    objective: 'Mover o personagem 10 casas para o leste. É repetitivo de propósito.',
    story:
      'A pizzaria é grande. Para chegar ao depósito, são 10 passos. Escreva mover() 10 vezes — no próximo nível, você vai aprender um jeito melhor.',
    availableFunctions: ['mover'],
    availableKeywords: [],
    maxTicks: 30,
    scoreFormula: '1000 - ticks * 10',
    grid: {
      width: 12,
      height: 3,
      playerStart: { x: 0, y: 1, facing: 'leste' },
      tiles: [{ x: 10, y: 1, type: 'goal' }],
    },
    winCondition: 'player_on_tile_type:goal',
    referenceSolution:
      'mover("leste")\nmover("leste")\nmover("leste")\nmover("leste")\nmover("leste")\nmover("leste")\nmover("leste")\nmover("leste")\nmover("leste")\nmover("leste")\n',
    hints: [
      'Sim, este nível é tedioso! Isso é proposital.',
      'Tente perceber o padrão: o mesmo comando se repete várias vezes.',
      'No próximo nível, você vai aprender uma forma mais inteligente.',
    ],
  },
  // ============================================================================
  // NÍVEL 3 - Loop para
  // ============================================================================
  {
    id: 3,
    title: 'Loops salvam o dia',
    subtitle: "Repetição com 'para'",
    concept: 'Estruturas de repetição executam um bloco várias vezes',
    objective: 'Mover 10 casas para o leste, mas agora usando um único loop `para`.',
    story:
      "Lembra do nível anterior, escrevendo mover() 10 vezes? Agora você vai fazer a mesma coisa em apenas duas linhas usando o comando 'para'.",
    availableFunctions: ['mover'],
    availableKeywords: ['para', 'de', 'ate'],
    maxTicks: 30,
    scoreFormula: '1000 - ticks * 5',
    grid: {
      width: 12,
      height: 3,
      playerStart: { x: 0, y: 1, facing: 'leste' },
      tiles: [{ x: 10, y: 1, type: 'goal' }],
    },
    winCondition: 'player_on_tile_type:goal',
    referenceSolution: 'para i de 1 ate 10:\n    mover("leste")\n',
    hints: [
      'A sintaxe é: para VARIAVEL de INICIO ate FIM:',
      'O bloco do loop é indentado com 4 espaços.',
      'A variável i conta de 1 até 10, e o bloco executa 10 vezes.',
    ],
  },
  // ============================================================================
  // NÍVEL 4 - Pegar e entregar
  // ============================================================================
  {
    id: 4,
    title: 'Pegar e entregar',
    subtitle: 'Interação com o mundo',
    concept: 'Algumas funções modificam o estado do mundo, outras consultam',
    objective: 'Pegar uma pizza no balcão e entregar à mesa 1.',
    story:
      'Tem uma pizza pronta no balcão e um cliente esperando na mesa 1. Pegue a pizza e leve até ele.',
    availableFunctions: ['mover', 'virar', 'pegar', 'entregar'],
    availableKeywords: [],
    maxTicks: 50,
    scoreFormula: '1000 - ticks * 20',
    grid: {
      width: 7,
      height: 5,
      playerStart: { x: 3, y: 2, facing: 'norte' },
      tiles: [
        { x: 3, y: 1, type: 'balcao', item: 'pizza_pronta' },
        { x: 1, y: 4, type: 'mesa', tableNumber: 1 },
      ],
      orderQueue: ['1,calabresa'],
    },
    winCondition: 'table_served:1',
    referenceSolution:
      'pegar()\nmover("sul")\nmover("sul")\nmover("oeste")\nmover("oeste")\nentregar(1)\n',
    hints: [
      'O personagem começa virado pro balcão. Você pode pegar direto.',
      'Para chegar à mesa 1, vá para o sul e depois para o oeste.',
      'entregar(1) entrega o que está segurando à mesa 1.',
    ],
  },
  // ============================================================================
  // NÍVEL 5 - while + multiple orders
  // ============================================================================
  {
    id: 5,
    title: 'Atender enquanto puder',
    subtitle: "Loop condicional com 'enquanto'",
    concept: 'Repetir enquanto uma condição for verdadeira',
    objective: 'Atender vários pedidos seguidos da fila.',
    story:
      "A fila tem 4 pedidos da mesa 1. Use 'enquanto' para atender todos eles, voltando ao balcão a cada vez.",
    availableFunctions: ['mover', 'virar', 'pegar', 'entregar', 'proximo_pedido'],
    availableKeywords: ['enquanto'],
    maxTicks: 200,
    scoreFormula: 'pedidos * 100 - ticks',
    grid: {
      width: 5,
      height: 5,
      playerStart: { x: 2, y: 2, facing: 'norte' },
      tiles: [
        { x: 2, y: 1, type: 'balcao', item: 'pizza_infinita' },
        { x: 1, y: 4, type: 'mesa', tableNumber: 1 },
      ],
      orderQueue: ['1,calabresa', '1,frango', '1,calabresa', '1,frango'],
    },
    winCondition: 'all_orders_delivered',
    referenceSolution:
      'enquanto proximo_pedido() != nulo:\n    pegar()\n    mover("sul")\n    mover("sul")\n    mover("oeste")\n    entregar(1)\n    mover("leste")\n    mover("norte")\n    mover("norte")\n',
    hints: [
      "'enquanto' continua executando o bloco até a condição ficar falsa.",
      'Não esqueça de voltar à posição inicial dentro do loop!',
      'Cada iteração precisa terminar com o personagem em condições de fazer outra.',
    ],
  },
]

export function getLevel(id: number): LevelDefinition | null {
  return LEVELS.find((l) => l.id === id) ?? null
}

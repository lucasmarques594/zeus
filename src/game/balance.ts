/**
 * Constantes de balanceamento do modo tycoon.
 *
 * TODOS os números mágicos do gameplay vivem aqui. Quando o balanceamento
 * estiver ruim (provavelmente o tempo todo no início), é só ajustar.
 *
 * Princípio: não há valor literal de gameplay fora deste arquivo.
 */

// ============================================================================
// Tempo do dia
// ============================================================================

export const DAY_CLOCK = {
  /** Hora em que o dia começa (formato 24h). */
  startHour: 18,
  /** Hora em que o dia termina (0 = meia-noite). */
  endHour: 24,
  /** Duração do Dia 1 em segundos reais. */
  baseDurationSeconds: 180,
  /** Cada dia adicional adiciona X segundos. */
  durationIncrementPerDay: 5,
  /** Máximo de segundos por dia (impede explosão exponencial). */
  maxDurationSeconds: 600, // ~10 min, atingido por volta do Dia 80
}

/**
 * Calcula a duração real de um dia em segundos.
 * Dia 1 = 180s, Dia 2 = 185s, Dia 30 = 325s, cap em 600s.
 */
export function dayDurationSeconds(day: number): number {
  const linear =
    DAY_CLOCK.baseDurationSeconds + (day - 1) * DAY_CLOCK.durationIncrementPerDay
  return Math.min(linear, DAY_CLOCK.maxDurationSeconds)
}

// ============================================================================
// Fluxo de pedidos
// ============================================================================

export const ORDERS = {
  /** Intervalo base entre pedidos no Dia 1 (em segundos do jogo). */
  baseIntervalGameSeconds: 60,
  /** Cada dia reduz o intervalo em X segundos (mais pedidos). */
  intervalReductionPerDay: 1.5,
  /** Intervalo mínimo (impede pedidos em cascata impossíveis de atender). */
  minIntervalGameSeconds: 15,
  /** Quantos pedidos chegam logo no início do dia (pra robô já ter o que fazer). */
  initialBacklog: 1,
}

export function orderIntervalGameSeconds(day: number): number {
  const interval = ORDERS.baseIntervalGameSeconds - (day - 1) * ORDERS.intervalReductionPerDay
  return Math.max(interval, ORDERS.minIntervalGameSeconds)
}

// ============================================================================
// Paciência dos clientes (3 estágios)
// ============================================================================

export type PatienceStage = 'feliz' | 'impaciente' | 'foi_embora'

export const PATIENCE = {
  /** Tempo (em segundos de jogo) até o cliente ficar impaciente. */
  happyDurationGameSeconds: 30,
  /** Tempo (em segundos de jogo) até o cliente ir embora depois de ficar impaciente. */
  impatientDurationGameSeconds: 90,
  /** Penalidade financeira ao cliente ir embora. */
  abandonPenalty: 5,
}

// ============================================================================
// Pagamento por pedido
// ============================================================================

export const PAYMENT = {
  /** Pizza simples entregue feliz. */
  basePrice: 15,
  /** Multiplicador quando cliente está impaciente. */
  impatientMultiplier: 0.6, // R$ 9
  /** Bônus por sabor especial (calabresa = base, demais somam isso). */
  flavorBonusBySabor: {
    calabresa: 0,
    frango: 5,
    margherita: 10,
    portuguesa: 15,
  } as Record<string, number>,
}

/**
 * Calcula quanto vale uma entrega baseado em paciência atual e sabor.
 */
export function calculatePayment(stage: PatienceStage, flavor: string): number {
  if (stage === 'foi_embora') return -PATIENCE.abandonPenalty
  const flavorBonus = PAYMENT.flavorBonusBySabor[flavor] ?? 0
  const base = PAYMENT.basePrice + flavorBonus
  if (stage === 'impaciente') {
    return Math.floor(base * PAYMENT.impatientMultiplier)
  }
  return base // feliz
}

// ============================================================================
// Capacidade inicial
// ============================================================================

export const INITIAL_CAPACITY = {
  /** Quantas mesas existem no Dia 1. */
  tables: 3,
  /** Quais sabores estão disponíveis no Dia 1. */
  availableFlavors: ['calabresa'] as string[],
  /** Dinheiro inicial. */
  startingMoney: 0,
  /** Robôs iniciais. */
  robots: 1,
}

// ============================================================================
// Tempo real → tempo de jogo
// ============================================================================

/**
 * Quantos segundos do jogo passam por segundo real.
 * Dia 1: 6h de jogo (das 18h às 24h) em 180s reais = 120 segundos de jogo por segundo real.
 */
export function gameSecondsPerRealSecond(day: number): number {
  const totalGameSeconds = (DAY_CLOCK.endHour - DAY_CLOCK.startHour) * 3600
  return totalGameSeconds / dayDurationSeconds(day)
}

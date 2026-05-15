
export const DAY_CLOCK = {
  startHour: 18,
  endHour: 24,
  baseDurationSeconds: 180,
  durationIncrementPerDay: 5,
  maxDurationSeconds: 600,
}

export function dayDurationSeconds(day: number): number {
  const linear =
    DAY_CLOCK.baseDurationSeconds + (day - 1) * DAY_CLOCK.durationIncrementPerDay
  return Math.min(linear, DAY_CLOCK.maxDurationSeconds)
}

export const ORDERS = {
  baseIntervalGameSeconds: 60,
  intervalReductionPerDay: 1.5,
  minIntervalGameSeconds: 15,
  initialBacklog: 1,
}

export function orderIntervalGameSeconds(day: number): number {
  const interval = ORDERS.baseIntervalGameSeconds - (day - 1) * ORDERS.intervalReductionPerDay
  return Math.max(interval, ORDERS.minIntervalGameSeconds)
}


export type PatienceStage = 'feliz' | 'impaciente' | 'foi_embora'

export const PATIENCE = {
  happyDurationGameSeconds: 30,
  impatientDurationGameSeconds: 90,
  abandonPenalty: 5,
}

export const PAYMENT = {
  basePrice: 15,
  impatientMultiplier: 0.6, // R$ 9
  flavorBonusBySabor: {
    calabresa: 0,
    frango: 5,
    margherita: 10,
    portuguesa: 15,
  } as Record<string, number>,
}


export function calculatePayment(stage: PatienceStage, flavor: string): number {
  if (stage === 'foi_embora') return -PATIENCE.abandonPenalty
  const flavorBonus = PAYMENT.flavorBonusBySabor[flavor] ?? 0
  const base = PAYMENT.basePrice + flavorBonus
  if (stage === 'impaciente') {
    return Math.floor(base * PAYMENT.impatientMultiplier)
  }
  return base 
}


export const INITIAL_CAPACITY = {
  tables: 3,
  availableFlavors: ['calabresa'] as string[],
  startingMoney: 0,
  robots: 1,
}

export function gameSecondsPerRealSecond(day: number): number {
  const totalGameSeconds = (DAY_CLOCK.endHour - DAY_CLOCK.startHour) * 3600
  return totalGameSeconds / dayDurationSeconds(day)
}

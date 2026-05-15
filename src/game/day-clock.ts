/**
 * Relógio do dia.
 *
 * Responsável por converter tempo real (performance.now) em tempo de jogo
 * (18:00 → 24:00) e detectar fim de dia.
 *
 * Pausável — se o jogador fecha a aba, o tempo decorrido não acumula.
 */

import { DAY_CLOCK, dayDurationSeconds, gameSecondsPerRealSecond } from './balance'

export interface DayClockState {
  /** Dia atual (1-indexed). */
  day: number
  /** Segundos de jogo decorridos no dia atual (0 a 21600). */
  gameSecondsElapsed: number
  /** Status do relógio. */
  status: 'pre_day' | 'running' | 'paused' | 'ended'
}

export class DayClock {
  private state: DayClockState
  private lastTick: number | null = null

  constructor(day = 1) {
    this.state = {
      day,
      gameSecondsElapsed: 0,
      status: 'pre_day',
    }
  }

  getState(): Readonly<DayClockState> {
    return this.state
  }

  /** Carrega estado salvo (usado ao restaurar sessão). */
  loadState(state: DayClockState): void {
    this.state = { ...state }
    this.lastTick = null
  }

  start(): void {
    this.state.status = 'running'
    this.lastTick = performance.now()
  }

  pause(): void {
    if (this.state.status === 'running') {
      this.state.status = 'paused'
      this.lastTick = null
    }
  }

  resume(): void {
    if (this.state.status === 'paused') {
      this.state.status = 'running'
      this.lastTick = performance.now()
    }
  }

  /**
   * Avança o relógio baseado em tempo real decorrido desde a última chamada.
   * Chamar a cada frame (no game loop). Retorna se o dia acabou neste tick.
   */
  tick(): { ended: boolean; secondsAdded: number } {
    if (this.state.status !== 'running') return { ended: false, secondsAdded: 0 }

    const now = performance.now()
    if (this.lastTick === null) {
      this.lastTick = now
      return { ended: false, secondsAdded: 0 }
    }

    const realDeltaSeconds = (now - this.lastTick) / 1000
    this.lastTick = now

    const gameSecondsDelta = realDeltaSeconds * gameSecondsPerRealSecond(this.state.day)
    this.state.gameSecondsElapsed += gameSecondsDelta

    const totalGameSeconds = (DAY_CLOCK.endHour - DAY_CLOCK.startHour) * 3600
    if (this.state.gameSecondsElapsed >= totalGameSeconds) {
      this.state.gameSecondsElapsed = totalGameSeconds
      this.state.status = 'ended'
      return { ended: true, secondsAdded: gameSecondsDelta }
    }

    return { ended: false, secondsAdded: gameSecondsDelta }
  }

  /** Retorna o relógio atual no formato "HH:MM". */
  getClockDisplay(): string {
    const totalMinutes =
      DAY_CLOCK.startHour * 60 + Math.floor(this.state.gameSecondsElapsed / 60)
    const h = Math.floor(totalMinutes / 60) % 24
    const m = totalMinutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  /** Progresso 0-1 do dia. */
  getProgress(): number {
    const total = (DAY_CLOCK.endHour - DAY_CLOCK.startHour) * 3600
    return Math.min(1, this.state.gameSecondsElapsed / total)
  }

  /** Quanto falta em segundos reais. */
  getRealSecondsRemaining(): number {
    const totalReal = dayDurationSeconds(this.state.day)
    return Math.max(0, totalReal * (1 - this.getProgress()))
  }

  /** Avança para o próximo dia. Zera o relógio. */
  advanceDay(): void {
    this.state.day++
    this.state.gameSecondsElapsed = 0
    this.state.status = 'pre_day'
    this.lastTick = null
  }
}



import { DAY_CLOCK, dayDurationSeconds, gameSecondsPerRealSecond } from './balance'

export interface DayClockState {
  day: number
  gameSecondsElapsed: number
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

  getClockDisplay(): string {
    const totalMinutes =
      DAY_CLOCK.startHour * 60 + Math.floor(this.state.gameSecondsElapsed / 60)
    const h = Math.floor(totalMinutes / 60) % 24
    const m = totalMinutes % 60
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`
  }

  getProgress(): number {
    const total = (DAY_CLOCK.endHour - DAY_CLOCK.startHour) * 3600
    return Math.min(1, this.state.gameSecondsElapsed / total)
  }

  getRealSecondsRemaining(): number {
    const totalReal = dayDurationSeconds(this.state.day)
    return Math.max(0, totalReal * (1 - this.getProgress()))
  }

  advanceDay(): void {
    this.state.day++
    this.state.gameSecondsElapsed = 0
    this.state.status = 'pre_day'
    this.lastTick = null
  }
}

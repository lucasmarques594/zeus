const KEY_PREFIX = 'pcg'
const SCHEMA_VERSION = 1

export interface LevelProgress {
  levelId: number
  completed: boolean
  bestScore: number
  bestTicks: number
  completedAt: string 
  attempts: number
}

interface StorageEnvelope<T> {
  version: number
  data: T
  savedAt: string
}

class LocalRepository {

  private available(): boolean {
    try {
      const probe = `${KEY_PREFIX}.__probe__`
      localStorage.setItem(probe, '1')
      localStorage.removeItem(probe)
      return true
    } catch {
      return false
    }
  }

  private read<T>(key: string): T | null {
    if (!this.available()) return null
    try {
      const raw = localStorage.getItem(`${KEY_PREFIX}.${key}`)
      if (!raw) return null
      const env = JSON.parse(raw) as StorageEnvelope<T>
      if (env.version !== SCHEMA_VERSION) {
        return null
      }
      return env.data
    } catch {
      return null
    }
  }

  private write<T>(key: string, data: T): boolean {
    if (!this.available()) return false
    try {
      const env: StorageEnvelope<T> = {
        version: SCHEMA_VERSION,
        data,
        savedAt: new Date().toISOString(),
      }
      localStorage.setItem(`${KEY_PREFIX}.${key}`, JSON.stringify(env))
      return true
    } catch {
      return false
    }
  }


  saveCode(levelId: number, source: string): void {
    this.write(`code.${levelId}`, source)
  }

  loadCode(levelId: number): string | null {
    return this.read<string>(`code.${levelId}`)
  }

  getProgress(levelId: number): LevelProgress | null {
    return this.read<LevelProgress>(`progress.${levelId}`)
  }

  recordCompletion(levelId: number, score: number, ticks: number): { newBest: boolean } {
    const current = this.getProgress(levelId)
    const attempts = (current?.attempts ?? 0) + 1
    const newBest = !current || score > current.bestScore
    const updated: LevelProgress = {
      levelId,
      completed: true,
      bestScore: newBest ? score : current!.bestScore,
      bestTicks: newBest ? ticks : current!.bestTicks,
      completedAt: newBest ? new Date().toISOString() : current!.completedAt,
      attempts,
    }
    this.write(`progress.${levelId}`, updated)
    return { newBest }
  }

  recordAttempt(levelId: number): void {
    const current = this.getProgress(levelId)
    if (current) {
      current.attempts++
      this.write(`progress.${levelId}`, current)
    } else {
      this.write(`progress.${levelId}`, {
        levelId,
        completed: false,
        bestScore: 0,
        bestTicks: 0,
        completedAt: '',
        attempts: 1,
      })
    }
  }

  getAllCompleted(): number[] {
    if (!this.available()) return []
    const completed: number[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key?.startsWith(`${KEY_PREFIX}.progress.`)) {
        const levelId = parseInt(key.split('.').pop()!, 10)
        const p = this.getProgress(levelId)
        if (p?.completed) completed.push(levelId)
      }
    }
    return completed.sort((a, b) => a - b)
  }

  clearAll(): void {
    if (!this.available()) return
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(`${KEY_PREFIX}.`)) keys.push(k)
    }
    for (const k of keys) localStorage.removeItem(k)
  }
}

export const localRepo = new LocalRepository()

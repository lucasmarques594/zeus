/**
 * Sistema centralizado de gerenciamento de áudio
 * Gerencia música de fundo, efeitos sonoros e configurações de volume
 */

export type SoundEffect = 'select' | 'success' | 'error'
export type MusicTrack = 'theme'

interface AudioSettings {
  masterVolume: number
  musicVolume: number
  sfxVolume: number
  musicEnabled: boolean
  sfxEnabled: boolean
}

const STORAGE_KEY = 'pizzaria-code-audio-settings'
const DEFAULT_SETTINGS: AudioSettings = {
  masterVolume: 0.7,
  musicVolume: 0.3,
  sfxVolume: 0.8,
  musicEnabled: true,
  sfxEnabled: true,
}

export class AudioManager {
  private static instance: AudioManager | null = null
  private settings: AudioSettings
  private musicTracks: Map<MusicTrack, HTMLAudioElement> = new Map()
  private sfxSounds: Map<SoundEffect, HTMLAudioElement> = new Map()
  private currentMusic: HTMLAudioElement | null = null
  private initialized = false

  private constructor() {
    this.settings = this.loadSettings()
  }

  static getInstance(): AudioManager {
    if (!AudioManager.instance) {
      AudioManager.instance = new AudioManager()
    }
    return AudioManager.instance
  }

  async initialize(): Promise<void> {
    if (this.initialized) return

    try {
      // Carregar música tema
      const themeMusic = new Audio()
      themeMusic.src = new URL('../assets/audio/Pizzaiolo_Sera.mp3', import.meta.url).href
      themeMusic.loop = true
      themeMusic.volume = this.getMusicVolume()
      this.musicTracks.set('theme', themeMusic)

      // Carregar efeitos sonoros
      const selectSfx = new Audio()
      selectSfx.src = new URL('../assets/audio/UI_SELECT_song.mp3', import.meta.url).href
      selectSfx.volume = this.getSfxVolume()
      this.sfxSounds.set('select', selectSfx)

      const successSfx = new Audio()
      successSfx.src = new URL('../assets/audio/UI_SUCESS.mp3', import.meta.url).href
      successSfx.volume = this.getSfxVolume()
      this.sfxSounds.set('success', successSfx)

      const errorSfx = new Audio()
      errorSfx.src = new URL('../assets/audio/UI_ERROR.mp3', import.meta.url).href
      errorSfx.volume = this.getSfxVolume()
      this.sfxSounds.set('error', errorSfx)

      this.initialized = true
    } catch (error) {
      console.error('Erro ao inicializar sistema de áudio:', error)
    }
  }

  playMusic(track: MusicTrack): void {
    if (!this.settings.musicEnabled || !this.initialized) return

    const music = this.musicTracks.get(track)
    if (!music) return

    // Parar música anterior se houver
    if (this.currentMusic && this.currentMusic !== music) {
      this.currentMusic.pause()
      this.currentMusic.currentTime = 0
    }

    this.currentMusic = music
    music.volume = this.getMusicVolume()
    music.play().catch((err) => {
      console.warn('Erro ao tocar música:', err)
    })
  }

  stopMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.pause()
      this.currentMusic.currentTime = 0
      this.currentMusic = null
    }
  }

  pauseMusic(): void {
    if (this.currentMusic) {
      this.currentMusic.pause()
    }
  }

  resumeMusic(): void {
    if (this.currentMusic && this.settings.musicEnabled) {
      this.currentMusic.play().catch((err) => {
        console.warn('Erro ao retomar música:', err)
      })
    }
  }

  playSfx(effect: SoundEffect): void {
    if (!this.settings.sfxEnabled || !this.initialized) return

    const sound = this.sfxSounds.get(effect)
    if (!sound) return

    // Clone o áudio para permitir múltiplas reproduções simultâneas
    const clone = sound.cloneNode() as HTMLAudioElement
    clone.volume = this.getSfxVolume()
    clone.play().catch((err) => {
      console.warn('Erro ao tocar efeito sonoro:', err)
    })
  }

  setMasterVolume(volume: number): void {
    this.settings.masterVolume = Math.max(0, Math.min(1, volume))
    this.updateVolumes()
    this.saveSettings()
  }

  setMusicVolume(volume: number): void {
    this.settings.musicVolume = Math.max(0, Math.min(1, volume))
    this.updateVolumes()
    this.saveSettings()
  }

  setSfxVolume(volume: number): void {
    this.settings.sfxVolume = Math.max(0, Math.min(1, volume))
    this.updateVolumes()
    this.saveSettings()
  }

  toggleMusic(): void {
    this.settings.musicEnabled = !this.settings.musicEnabled
    if (!this.settings.musicEnabled) {
      this.pauseMusic()
    } else {
      this.resumeMusic()
    }
    this.saveSettings()
  }

  toggleSfx(): void {
    this.settings.sfxEnabled = !this.settings.sfxEnabled
    this.saveSettings()
  }

  getSettings(): Readonly<AudioSettings> {
    return { ...this.settings }
  }

  private getMusicVolume(): number {
    return this.settings.masterVolume * this.settings.musicVolume
  }

  private getSfxVolume(): number {
    return this.settings.masterVolume * this.settings.sfxVolume
  }

  private updateVolumes(): void {
    if (this.currentMusic) {
      this.currentMusic.volume = this.getMusicVolume()
    }

    this.sfxSounds.forEach((sound) => {
      sound.volume = this.getSfxVolume()
    })
  }

  private loadSettings(): AudioSettings {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) }
      }
    } catch (error) {
      console.warn('Erro ao carregar configurações de áudio:', error)
    }
    return { ...DEFAULT_SETTINGS }
  }

  private saveSettings(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings))
    } catch (error) {
      console.warn('Erro ao salvar configurações de áudio:', error)
    }
  }
}

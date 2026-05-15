/**
 * Sistema de menu principal do jogo
 * Gerencia navegação entre telas: Menu, Jogo, Leaderboard, Configurações
 */

import { AudioManager } from '@/audio/audio-manager'

export type MenuScreen = 'main-menu' | 'game' | 'leaderboard' | 'settings'

export interface MenuCallbacks {
  onStartGame: () => void
  onShowLeaderboard: () => void
  onShowSettings: () => void
  onBackToMenu: () => void
}

export class MenuManager {
  private currentScreen: MenuScreen = 'main-menu'
  private audioManager: AudioManager
  private callbacks: MenuCallbacks
  private rootElement: HTMLElement | null = null

  constructor(callbacks: MenuCallbacks) {
    this.callbacks = callbacks
    this.audioManager = AudioManager.getInstance()
  }

  async mount(root: HTMLElement): Promise<void> {
    this.rootElement = root
    await this.audioManager.initialize()
    this.showMainMenu()
    // Música é iniciada pelo main.ts com auto-play + fallback de user gesture
  }

  showMainMenu(): void {
    if (!this.rootElement) return
    
    this.currentScreen = 'main-menu'
    this.rootElement.innerHTML = this.getMainMenuTemplate()
    this.attachMainMenuEvents()
  }

  showGame(): void {
    this.currentScreen = 'game'
    this.callbacks.onStartGame()
  }

  showLeaderboard(): void {
    if (!this.rootElement) return
    
    this.currentScreen = 'leaderboard'
    this.rootElement.innerHTML = this.getLeaderboardTemplate()
    this.attachLeaderboardEvents()
  }

  showSettings(): void {
    if (!this.rootElement) return
    
    this.currentScreen = 'settings'
    this.rootElement.innerHTML = this.getSettingsTemplate()
    this.attachSettingsEvents()
  }

  getCurrentScreen(): MenuScreen {
    return this.currentScreen
  }

  private attachMainMenuEvents(): void {
    const btnStart = document.getElementById('btn-menu-start')
    const btnLeaderboard = document.getElementById('btn-menu-leaderboard')
    const btnSettings = document.getElementById('btn-menu-settings')

    btnStart?.addEventListener('click', () => {
      this.audioManager.playSfx('select')
      this.showGame()
    })

    btnLeaderboard?.addEventListener('click', () => {
      this.audioManager.playSfx('select')
      this.showLeaderboard()
    })

    btnSettings?.addEventListener('click', () => {
      this.audioManager.playSfx('select')
      this.showSettings()
    })
  }

  private attachLeaderboardEvents(): void {
    const btnBack = document.getElementById('btn-back-to-menu')
    const btnClear = document.getElementById('btn-clear-scores')

    btnBack?.addEventListener('click', () => {
      this.audioManager.playSfx('select')
      this.callbacks.onBackToMenu()
    })

    btnClear?.addEventListener('click', () => {
      if (confirm('Tem certeza que deseja limpar todos os recordes?')) {
        this.clearAllScores()
        this.audioManager.playSfx('success')
        this.showLeaderboard() // Recarrega a tela
      }
    })
  }

  private attachSettingsEvents(): void {
    const btnBack = document.getElementById('btn-back-to-menu-settings')
    const masterSlider = document.getElementById('slider-master-volume') as HTMLInputElement
    const musicSlider = document.getElementById('slider-music-volume') as HTMLInputElement
    const sfxSlider = document.getElementById('slider-sfx-volume') as HTMLInputElement
    const toggleMusic = document.getElementById('toggle-music')
    const toggleSfx = document.getElementById('toggle-sfx')
    const btnTestSfx = document.getElementById('btn-test-sfx')

    btnBack?.addEventListener('click', () => {
      this.audioManager.playSfx('select')
      this.callbacks.onBackToMenu()
    })

    masterSlider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      this.audioManager.setMasterVolume(value)
      this.updateVolumeLabel('master-volume-value', value)
    })

    musicSlider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      this.audioManager.setMusicVolume(value)
      this.updateVolumeLabel('music-volume-value', value)
    })

    sfxSlider?.addEventListener('input', (e) => {
      const value = parseFloat((e.target as HTMLInputElement).value)
      this.audioManager.setSfxVolume(value)
      this.updateVolumeLabel('sfx-volume-value', value)
    })

    toggleMusic?.addEventListener('click', () => {
      this.audioManager.toggleMusic()
      this.audioManager.playSfx('select')
      this.updateToggleButtons()
    })

    toggleSfx?.addEventListener('click', () => {
      this.audioManager.toggleSfx()
      // Não toca SFX aqui para evitar confusão se desabilitado
      this.updateToggleButtons()
    })

    btnTestSfx?.addEventListener('click', () => {
      this.audioManager.playSfx('success')
    })
  }

  private updateVolumeLabel(id: string, value: number): void {
    const label = document.getElementById(id)
    if (label) {
      label.textContent = `${Math.round(value * 100)}%`
    }
  }

  private updateToggleButtons(): void {
    const settings = this.audioManager.getSettings()
    const toggleMusic = document.getElementById('toggle-music')
    const toggleSfx = document.getElementById('toggle-sfx')

    if (toggleMusic) {
      toggleMusic.textContent = settings.musicEnabled ? '🔊 Ativada' : '🔇 Desativada'
      toggleMusic.className = settings.musicEnabled ? 'btn btn-success' : 'btn btn-secondary'
    }

    if (toggleSfx) {
      toggleSfx.textContent = settings.sfxEnabled ? '🔊 Ativados' : '🔇 Desativados'
      toggleSfx.className = settings.sfxEnabled ? 'btn btn-success' : 'btn btn-secondary'
    }
  }

  private getMainMenuTemplate(): string {
    return `
      <div class="menu-container">
        <div class="menu-content">
          <div class="menu-header">
            <div class="menu-logo">
              <span class="menu-logo-icon">🍕</span>
              <h1 class="menu-logo-text">Pizzaria<span class="menu-logo-accent">Code</span></h1>
            </div>
            <p class="menu-subtitle">Aprenda a programar em Portugol</p>
          </div>
          
          <div class="menu-buttons">
            <button id="btn-menu-start" class="menu-btn menu-btn-primary">
              <span class="menu-btn-icon">▶</span>
              <span class="menu-btn-text">Iniciar Jogo</span>
            </button>
            
            <button id="btn-menu-leaderboard" class="menu-btn menu-btn-secondary">
              <span class="menu-btn-icon">🏆</span>
              <span class="menu-btn-text">Leaderboard</span>
            </button>
            
            <button id="btn-menu-settings" class="menu-btn menu-btn-secondary">
              <span class="menu-btn-icon">⚙️</span>
              <span class="menu-btn-text">Configurações</span>
            </button>
          </div>

          <div class="menu-footer">
            <p class="menu-credits">Desenvolvido com ❤️ para aprender programação</p>
          </div>
        </div>
      </div>
    `
  }

  private getLeaderboardTemplate(): string {
    const scores = this.getAllScores()
    
    let scoresHtml = ''
    if (scores.length === 0) {
      scoresHtml = '<div class="leaderboard-empty">Nenhum nível completado ainda. Jogue para aparecer aqui! 🍕</div>'
    } else {
      scoresHtml = `
        <div class="leaderboard-table">
          <div class="leaderboard-header">
            <div class="leaderboard-col">Nível</div>
            <div class="leaderboard-col">Título</div>
            <div class="leaderboard-col">Melhor Score</div>
            <div class="leaderboard-col">Ticks</div>
            <div class="leaderboard-col">Tentativas</div>
          </div>
          ${scores.map((score) => `
            <div class="leaderboard-row">
              <div class="leaderboard-col leaderboard-level">${score.levelId}</div>
              <div class="leaderboard-col leaderboard-title">${score.title}</div>
              <div class="leaderboard-col leaderboard-score">${score.bestScore} pts</div>
              <div class="leaderboard-col leaderboard-ticks">${score.bestTicks}</div>
              <div class="leaderboard-col leaderboard-attempts">${score.attempts}</div>
            </div>
          `).join('')}
        </div>
      `
    }

    return `
      <div class="menu-container">
        <div class="menu-content menu-content-wide">
          <div class="menu-header">
            <h1 class="menu-title">🏆 Leaderboard</h1>
            <p class="menu-subtitle">Seus melhores recordes por nível</p>
          </div>
          
          ${scoresHtml}

          <div class="menu-actions">
            <button id="btn-clear-scores" class="btn btn-danger">
              🗑️ Limpar Recordes
            </button>
            <button id="btn-back-to-menu" class="btn btn-primary">
              ← Voltar ao Menu
            </button>
          </div>
        </div>
      </div>
    `
  }

  private getSettingsTemplate(): string {
    const settings = this.audioManager.getSettings()

    return `
      <div class="menu-container">
        <div class="menu-content">
          <div class="menu-header">
            <h1 class="menu-title">⚙️ Configurações</h1>
            <p class="menu-subtitle">Ajuste suas preferências de áudio</p>
          </div>
          
          <div class="settings-panel">
            <div class="settings-section">
              <h3 class="settings-section-title">🔊 Volume Geral</h3>
              <div class="settings-control">
                <label class="settings-label">Master</label>
                <input 
                  id="slider-master-volume" 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value="${settings.masterVolume}"
                  class="settings-slider"
                />
                <span id="master-volume-value" class="settings-value">${Math.round(settings.masterVolume * 100)}%</span>
              </div>
            </div>

            <div class="settings-section">
              <h3 class="settings-section-title">🎵 Música</h3>
              <div class="settings-control">
                <label class="settings-label">Volume da Música</label>
                <input 
                  id="slider-music-volume" 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value="${settings.musicVolume}"
                  class="settings-slider"
                />
                <span id="music-volume-value" class="settings-value">${Math.round(settings.musicVolume * 100)}%</span>
              </div>
              <div class="settings-control">
                <button id="toggle-music" class="btn ${settings.musicEnabled ? 'btn-success' : 'btn-secondary'}">
                  ${settings.musicEnabled ? '🔊 Ativada' : '🔇 Desativada'}
                </button>
              </div>
            </div>

            <div class="settings-section">
              <h3 class="settings-section-title">🔔 Efeitos Sonoros</h3>
              <div class="settings-control">
                <label class="settings-label">Volume dos SFX</label>
                <input 
                  id="slider-sfx-volume" 
                  type="range" 
                  min="0" 
                  max="1" 
                  step="0.01" 
                  value="${settings.sfxVolume}"
                  class="settings-slider"
                />
                <span id="sfx-volume-value" class="settings-value">${Math.round(settings.sfxVolume * 100)}%</span>
              </div>
              <div class="settings-control">
                <button id="toggle-sfx" class="btn ${settings.sfxEnabled ? 'btn-success' : 'btn-secondary'}">
                  ${settings.sfxEnabled ? '🔊 Ativados' : '🔇 Desativados'}
                </button>
                <button id="btn-test-sfx" class="btn btn-ghost">
                  🔔 Testar Som
                </button>
              </div>
            </div>
          </div>

          <div class="menu-actions">
            <button id="btn-back-to-menu-settings" class="btn btn-primary">
              ← Voltar ao Menu
            </button>
          </div>
        </div>
      </div>
    `
  }

  private getAllScores(): Array<{
    levelId: number
    title: string
    bestScore: number
    bestTicks: number
    attempts: number
    completed: boolean
  }> {
    const scores: Array<{
      levelId: number
      title: string
      bestScore: number
      bestTicks: number
      attempts: number
      completed: boolean
    }> = []

    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('pizzaria-level-progress-')) {
          const levelId = parseInt(key.replace('pizzaria-level-progress-', ''), 10)
          const data = JSON.parse(localStorage.getItem(key) || '{}')
          
          if (data.completed) {
            scores.push({
              levelId,
              title: data.title || `Nível ${levelId}`,
              bestScore: data.bestScore || 0,
              bestTicks: data.bestTicks || 0,
              attempts: data.attempts || 0,
              completed: data.completed,
            })
          }
        }
      }

      // Ordenar por levelId
      scores.sort((a, b) => a.levelId - b.levelId)
    } catch (error) {
      console.error('Erro ao carregar scores:', error)
    }

    return scores
  }

  private clearAllScores(): void {
    try {
      const keys: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key?.startsWith('pizzaria-level-progress-')) {
          keys.push(key)
        }
      }
      keys.forEach((key) => localStorage.removeItem(key))
    } catch (error) {
      console.error('Erro ao limpar scores:', error)
    }
  }
}

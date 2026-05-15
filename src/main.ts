import './style.css'
import './menu/menu-styles.css'
import { App } from './ui/app'
import { MenuManager } from './menu/menu-manager'
import { AudioManager } from './audio/audio-manager'

const root = document.getElementById('app')
if (!root) {
  throw new Error('#app não encontrado no HTML')
}

// Inicializar sistema de áudio
const audioManager = AudioManager.getInstance()

// Criar instância do jogo
const app = new App()

// Criar gerenciador de menu com callbacks
const menuManager = new MenuManager({
  onStartGame: () => {
    // Monta o jogo quando iniciar
    app.mount(root)
  },
  onShowLeaderboard: () => {
    menuManager.showLeaderboard()
  },
  onShowSettings: () => {
    menuManager.showSettings()
  },
  onBackToMenu: () => {
    menuManager.showMainMenu()
  },
})

// Montar menu principal
menuManager.mount(root)

// Auto-play música ao abrir o navegador
// Browsers bloqueiam autoplay sem user gesture, então tentamos direto
// e caso falhe, registramos um listener one-shot na primeira interação
;(async () => {
  await audioManager.initialize()
  try {
    audioManager.playMusic('theme')
  } catch {
    // Autoplay bloqueado — tocar na primeira interação do usuário
    const startOnInteraction = () => {
      audioManager.playMusic('theme')
      document.removeEventListener('click', startOnInteraction)
      document.removeEventListener('keydown', startOnInteraction)
      document.removeEventListener('touchstart', startOnInteraction)
    }
    document.addEventListener('click', startOnInteraction, { once: false })
    document.addEventListener('keydown', startOnInteraction, { once: false })
    document.addEventListener('touchstart', startOnInteraction, { once: false })
  }
})()

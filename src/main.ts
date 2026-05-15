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
// playMusic() engole erros de autoplay internamente (.catch),
// então registramos listeners na primeira interação do usuário
// incondicionalmente — é a única forma garantida nos browsers modernos.
;(async () => {
  await audioManager.initialize()
  // Tenta tocar direto (funciona se o browser permitir autoplay)
  audioManager.playMusic('theme')

  // Fallback: na primeira interação do usuário, garante que a música comece
  const ensureMusic = () => {
    audioManager.playMusic('theme')
    document.removeEventListener('click', ensureMusic)
    document.removeEventListener('keydown', ensureMusic)
    document.removeEventListener('touchstart', ensureMusic)
  }
  document.addEventListener('click', ensureMusic)
  document.addEventListener('keydown', ensureMusic)
  document.addEventListener('touchstart', ensureMusic)
})()

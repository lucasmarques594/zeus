import './style.css'
import { App } from './ui/app'

const root = document.getElementById('app')
if (!root) {
  throw new Error('#app não encontrado no HTML')
}

const app = new App()
app.mount(root)

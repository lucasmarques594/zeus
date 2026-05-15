/**
 * Aplicação principal — orquestra UI, parser, interpretador e renderer.
 */

import { parse } from '@engine/parser'
import { Interpreter, type StepResult } from '@engine/interpreter'
import { type DSLError } from '@engine/errors'
import { GameWorld } from '@game/world'
import { LEVELS, getLevel } from '@game/levels'
import type { LevelDefinition } from '@game/types'
import { CanvasRenderer } from './renderer'

type AppPhase = 'idle' | 'running' | 'paused' | 'done' | 'error'

interface AppState {
  currentLevelId: number
  phase: AppPhase
  speed: number // ticks por segundo
  world: GameWorld | null
  interpreter: Interpreter | null
  renderer: CanvasRenderer | null
  lastStepTime: number
  highlightLine: number | null
}

export class App {
  private state: AppState
  private editorEl!: HTMLTextAreaElement
  private canvasEl!: HTMLCanvasElement
  private logEl!: HTMLDivElement
  private errorsEl!: HTMLDivElement
  private statusEl!: HTMLDivElement
  private storyEl!: HTMLDivElement
  private levelListEl!: HTMLDivElement

  constructor() {
    this.state = {
      currentLevelId: 0,
      phase: 'idle',
      speed: 5,
      world: null,
      interpreter: null,
      renderer: null,
      lastStepTime: 0,
      highlightLine: null,
    }
  }

  mount(root: HTMLElement): void {
    root.innerHTML = TEMPLATE
    this.editorEl = root.querySelector('#editor') as HTMLTextAreaElement
    this.canvasEl = root.querySelector('#canvas') as HTMLCanvasElement
    this.logEl = root.querySelector('#log') as HTMLDivElement
    this.errorsEl = root.querySelector('#errors') as HTMLDivElement
    this.statusEl = root.querySelector('#status') as HTMLDivElement
    this.storyEl = root.querySelector('#story') as HTMLDivElement
    this.levelListEl = root.querySelector('#level-list') as HTMLDivElement

    this.state.renderer = new CanvasRenderer(this.canvasEl)
    this.attachEvents()
    this.buildLevelList()
    this.loadLevel(0)
    this.startRenderLoop()
  }

  private attachEvents(): void {
    const get = <T extends HTMLElement>(sel: string) => document.querySelector(sel) as T

    get<HTMLButtonElement>('#btn-run').addEventListener('click', () => this.run())
    get<HTMLButtonElement>('#btn-pause').addEventListener('click', () => this.togglePause())
    get<HTMLButtonElement>('#btn-stop').addEventListener('click', () => this.stop())
    get<HTMLButtonElement>('#btn-reset').addEventListener('click', () => this.resetLevel())
    get<HTMLButtonElement>('#btn-solution').addEventListener('click', () => this.showSolution())
    get<HTMLButtonElement>('#btn-hint').addEventListener('click', () => this.showHint())

    const speed = get<HTMLInputElement>('#speed')
    speed.addEventListener('input', () => {
      this.state.speed = parseInt(speed.value, 10)
      ;(document.querySelector('#speed-label') as HTMLElement).textContent = `${this.state.speed}x`
    })

    // Atalho: Ctrl+Enter executa
    this.editorEl.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault()
        this.run()
      }
      // Tab insere 4 espaços
      if (e.key === 'Tab') {
        e.preventDefault()
        const start = this.editorEl.selectionStart
        const end = this.editorEl.selectionEnd
        const value = this.editorEl.value
        this.editorEl.value = value.substring(0, start) + '    ' + value.substring(end)
        this.editorEl.selectionStart = this.editorEl.selectionEnd = start + 4
      }
    })
  }

  private buildLevelList(): void {
    this.levelListEl.innerHTML = ''
    for (const level of LEVELS) {
      const btn = document.createElement('button')
      btn.className = 'level-btn'
      btn.dataset.id = String(level.id)
      btn.innerHTML = `
        <span class="level-num">${level.id}</span>
        <span class="level-title">${level.title}</span>
      `
      btn.addEventListener('click', () => this.loadLevel(level.id))
      this.levelListEl.appendChild(btn)
    }
  }

  private loadLevel(id: number): void {
    this.stop()
    const level = getLevel(id)
    if (!level) return
    this.state.currentLevelId = id
    this.state.world = new GameWorld(level)
    this.state.renderer!.resize(this.state.world.state)

    // Atualiza UI
    this.storyEl.innerHTML = `
      <h2>Nível ${level.id}: ${level.title}</h2>
      <p class="subtitle">${level.subtitle}</p>
      <p class="story">${level.story}</p>
      <p class="objective"><strong>Objetivo:</strong> ${level.objective}</p>
      <p class="available">
        <strong>Disponível:</strong>
        ${level.availableFunctions.map((f) => `<code>${f}()</code>`).join(' ')}
        ${level.availableKeywords.map((k) => `<code>${k}</code>`).join(' ')}
      </p>
    `

    // Highlight nível atual
    document.querySelectorAll('.level-btn').forEach((b) => b.classList.remove('active'))
    document.querySelector(`.level-btn[data-id="${id}"]`)?.classList.add('active')

    // Limpa editor se vazio, ou se está mudando de nível
    this.editorEl.value = this.editorEl.value.trim() ? this.editorEl.value : ''
    this.editorEl.placeholder = `# Nível ${id}: ${level.title}\n# Escreva seu código aqui e clique em ▶ Executar\n# Atalho: Ctrl+Enter`

    this.clearLog()
    this.clearErrors()
    this.setStatus('idle', 'Pronto')
  }

  private resetLevel(): void {
    this.loadLevel(this.state.currentLevelId)
  }

  private run(): void {
    this.stop()
    this.clearErrors()
    this.clearLog()
    const source = this.editorEl.value

    // Parse
    const { ast, errors } = parse(source)
    if (errors.length > 0 || !ast) {
      this.showErrors(errors)
      this.setStatus('error', `${errors.length} erro(s)`)
      return
    }

    // Verifica features bloqueadas
    const level = getLevel(this.state.currentLevelId)
    if (level) {
      const blockedErrors = this.checkBlockedFeatures(source, level)
      if (blockedErrors.length > 0) {
        this.showErrors(blockedErrors)
        this.setStatus('error', 'Comando bloqueado')
        return
      }
    }

    // Reset world
    const lv = getLevel(this.state.currentLevelId)
    if (!lv) return
    this.state.world = new GameWorld(lv)
    this.state.interpreter = new Interpreter(ast, this.state.world)
    this.state.phase = 'running'
    this.state.lastStepTime = performance.now()
    this.setStatus('running', 'Executando...')
  }

  private stop(): void {
    this.state.phase = 'idle'
    this.state.interpreter = null
    this.state.highlightLine = null
  }

  private togglePause(): void {
    if (this.state.phase === 'running') {
      this.state.phase = 'paused'
      this.setStatus('paused', 'Pausado')
    } else if (this.state.phase === 'paused') {
      this.state.phase = 'running'
      this.state.lastStepTime = performance.now()
      this.setStatus('running', 'Executando...')
    }
  }

  private showSolution(): void {
    const level = getLevel(this.state.currentLevelId)
    if (!level) return
    if (confirm('Mostrar a solução de referência? Você pode aprender mais tentando sozinho!')) {
      this.editorEl.value = level.referenceSolution
    }
  }

  private showHint(): void {
    const level = getLevel(this.state.currentLevelId)
    if (!level || level.hints.length === 0) return
    const idx = Math.floor(Math.random() * level.hints.length)
    this.appendLog(`💡 Dica: ${level.hints[idx]}`)
  }

  private startRenderLoop(): void {
    const loop = () => {
      this.tick()
      this.render()
      requestAnimationFrame(loop)
    }
    loop()
  }

  private tick(): void {
    if (this.state.phase !== 'running' || !this.state.interpreter) return
    const now = performance.now()
    const interval = 1000 / this.state.speed
    if (now - this.state.lastStepTime < interval) return

    const result: StepResult = this.state.interpreter.step()
    this.state.lastStepTime = now

    if (result.kind === 'tick') {
      this.state.highlightLine = result.line
      // Log mensagens do mundo
      if (this.state.world) {
        const log = this.state.world.getLog()
        for (const msg of log) this.appendLog(msg)
        this.state.world.clearLog()
      }
    } else if (result.kind === 'done') {
      this.state.phase = 'done'
      this.checkVictory()
    } else if (result.kind === 'error') {
      this.state.phase = 'error'
      this.showErrors([result.error])
      this.setStatus('error', 'Erro de execução')
    }
  }

  private checkVictory(): void {
    if (!this.state.world) return
    const win = this.state.world.checkWin()
    const ticks = this.state.interpreter?.getTicksUsed() ?? 0
    if (win) {
      const level = getLevel(this.state.currentLevelId)!
      const score = computeScore(level, ticks, this.state.world)
      this.appendLog(`✅ Nível completo! Ticks: ${ticks} • Score: ${score}`)
      this.setStatus('done', `✅ Vitória! Score: ${score}`)
      // TODO: aqui faria a chamada pra kratosClient.submitRun(...)
    } else {
      this.appendLog(`❌ Programa terminou mas o objetivo não foi atingido. Ticks: ${ticks}`)
      this.setStatus('done', 'Tente de novo')
    }
  }

  private render(): void {
    if (!this.state.world || !this.state.renderer) return
    this.state.renderer.render(this.state.world.state)

    // Highlight da linha no editor (visual via CSS variable)
    if (this.state.highlightLine !== null) {
      this.editorEl.style.setProperty('--highlight-line', String(this.state.highlightLine))
    }
  }

  // ============================================================================
  // Helpers de UI
  // ============================================================================

  private appendLog(msg: string): void {
    const div = document.createElement('div')
    div.className = 'log-entry'
    div.textContent = msg
    this.logEl.appendChild(div)
    this.logEl.scrollTop = this.logEl.scrollHeight
  }

  private clearLog(): void {
    this.logEl.innerHTML = ''
  }

  private showErrors(errors: DSLError[]): void {
    this.errorsEl.innerHTML = ''
    for (const err of errors) {
      const div = document.createElement('div')
      div.className = 'error-entry'
      div.innerHTML = `
        <div class="error-msg">${escapeHtml(err.message)}</div>
        ${err.hint ? `<div class="error-hint">💡 ${escapeHtml(err.hint)}</div>` : ''}
        <div class="error-loc">linha ${err.loc.line}, coluna ${err.loc.column}</div>
      `
      this.errorsEl.appendChild(div)
    }
  }

  private clearErrors(): void {
    this.errorsEl.innerHTML = ''
  }

  private setStatus(phase: AppPhase, text: string): void {
    this.state.phase = phase === 'running' || phase === 'paused' ? phase : this.state.phase
    this.statusEl.textContent = text
    this.statusEl.className = `status status-${phase}`
  }

  private checkBlockedFeatures(source: string, level: LevelDefinition | null): DSLError[] {
    if (!level) return []
    const errors: DSLError[] = []
    // Verifica keywords bloqueadas
    const allKeywords: { name: string; pattern: RegExp; unlockNote: string }[] = [
      { name: 'se', pattern: /\bse\s/, unlockNote: 'nível 5' },
      { name: 'enquanto', pattern: /\benquanto\b/, unlockNote: 'nível 5+' },
      { name: 'para', pattern: /\bpara\s\w+\sde\b/, unlockNote: 'nível 3' },
      { name: 'funcao', pattern: /\bfun[cç][aã]o\b/, unlockNote: 'níveis mais avançados' },
    ]
    for (const kw of allKeywords) {
      if (kw.pattern.test(source) && !level.availableKeywords.includes(kw.name)) {
        errors.push({
          kind: 'syntax',
          code: 'E010',
          loc: { line: 1, column: 1 },
          message: `🍕 Você ainda não desbloqueou '${kw.name}'`,
          hint: `Este comando estará disponível em ${kw.unlockNote}. Tente resolver com os comandos que você já tem.`,
        })
      }
    }
    return errors
  }
}

function computeScore(level: LevelDefinition | null, ticks: number, world: GameWorld): number {
  if (!level) return 0
  // Fórmula simplificada — implementação completa interpretaria scoreFormula
  const delivered = world.state.deliveredCount
  if (level.scoreFormula.includes('pedidos')) {
    return Math.max(0, delivered * 100 - ticks)
  }
  return Math.max(0, 1000 - ticks * 10)
}

function escapeHtml(s: string): string {
  const div = document.createElement('div')
  div.textContent = s
  return div.innerHTML
}

// ============================================================================
// Template HTML
// ============================================================================

const TEMPLATE = `
<div class="app">
  <header class="header">
    <div class="logo">
      <span class="logo-icon">🍕</span>
      <span class="logo-text">Pizzaria<span class="logo-accent">Code</span></span>
    </div>
    <div class="header-info">
      <span class="header-tag">Aprenda a programar em Portugol</span>
    </div>
  </header>
  <aside class="sidebar">
    <h3 class="sidebar-title">Níveis</h3>
    <div id="level-list" class="level-list"></div>
  </aside>
  <main class="main">
    <section class="story-panel" id="story"></section>
    <section class="game-panel">
      <canvas id="canvas"></canvas>
      <div class="game-controls">
        <button id="btn-run" class="btn btn-primary" title="Ctrl+Enter">▶ Executar</button>
        <button id="btn-pause" class="btn">⏸ Pausar</button>
        <button id="btn-stop" class="btn">⏹ Parar</button>
        <button id="btn-reset" class="btn">↺ Resetar</button>
        <div class="speed-control">
          <label for="speed">Velocidade:</label>
          <input id="speed" type="range" min="1" max="30" value="5" />
          <span id="speed-label">5x</span>
        </div>
        <div id="status" class="status status-idle">Pronto</div>
      </div>
    </section>
    <section class="editor-panel">
      <div class="editor-header">
        <span class="editor-title">Seu código (Portugol)</span>
        <div class="editor-actions">
          <button id="btn-hint" class="btn btn-ghost">💡 Dica</button>
          <button id="btn-solution" class="btn btn-ghost">📖 Solução</button>
        </div>
      </div>
      <textarea id="editor" spellcheck="false" autocomplete="off"></textarea>
    </section>
    <section class="output-panel">
      <div class="tabs">
        <div class="tab tab-active">Console</div>
      </div>
      <div id="errors" class="errors"></div>
      <div id="log" class="log"></div>
    </section>
  </main>
</div>
`

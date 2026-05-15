/**
 * Renderer Canvas 2D para o mundo da pizzaria.
 *
 * Pixel art procedural: tudo desenhado com formas geométricas, sem assets externos.
 * Isso mantém o bundle leve e o jogo funciona offline.
 */

import type { WorldState, Tile, Direction } from '@game/types'

const TILE_SIZE = 64
const COLORS = {
  bg: '#1c1917',
  gridLine: '#292524',
  floor: '#3f3f46',
  floorAlt: '#44403c',
  wall: '#1c1917',
  wallTop: '#0c0a09',
  goal: '#fbbf24',
  goalRing: '#f59e0b',
  balcao: '#a16207',
  balcaoTop: '#ca8a04',
  forno: '#7c2d12',
  fornoMouth: '#fbbf24',
  fornoGlow: '#f97316',
  mesa: '#92400e',
  mesaTop: '#b45309',
  caixa: '#374151',
  lixo: '#525252',
  player: '#fbbf24',
  playerEye: '#1c1917',
  playerSkin: '#fde68a',
  // Ingredientes
  massa: '#fef3c7',
  molho: '#dc2626',
  queijo: '#fef08a',
  calabresa: '#9f1239',
  frango: '#fed7aa',
  pizza: '#fbbf24',
  pizzaTop: '#dc2626',
}

export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D

  constructor(private readonly canvas: HTMLCanvasElement) {
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Canvas 2D context não disponível')
    this.ctx = ctx
    // Pixel-perfect rendering
    this.ctx.imageSmoothingEnabled = false
  }

  resize(world: WorldState): void {
    const dpr = window.devicePixelRatio || 1
    const w = world.width * TILE_SIZE
    const h = world.height * TILE_SIZE
    this.canvas.width = w * dpr
    this.canvas.height = h * dpr
    this.canvas.style.width = `${w}px`
    this.canvas.style.height = `${h}px`
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    this.ctx.imageSmoothingEnabled = false
  }

  render(world: WorldState, highlightTile?: { x: number; y: number }): void {
    const { ctx } = this
    ctx.fillStyle = COLORS.bg
    ctx.fillRect(0, 0, world.width * TILE_SIZE, world.height * TILE_SIZE)

    // Renderiza tiles
    for (let y = 0; y < world.height; y++) {
      for (let x = 0; x < world.width; x++) {
        this.drawTile(world.tiles[y][x], x, y)
      }
    }

    // Fornos (sobrepõe o tile)
    for (const f of world.fornos) {
      this.drawForno(f.x, f.y, f.pizza)
    }

    // Highlight (tile em destaque, ex: tile em frente ao jogador)
    if (highlightTile) {
      ctx.strokeStyle = '#fbbf2455'
      ctx.lineWidth = 3
      ctx.strokeRect(
        highlightTile.x * TILE_SIZE + 2,
        highlightTile.y * TILE_SIZE + 2,
        TILE_SIZE - 4,
        TILE_SIZE - 4
      )
    }

    // Jogador
    this.drawPlayer(world.player.x, world.player.y, world.player.facing, world.player.holding)
  }

  private drawTile(tile: Tile, gx: number, gy: number): void {
    const { ctx } = this
    const x = gx * TILE_SIZE
    const y = gy * TILE_SIZE

    // Piso base (xadrez sutil)
    const isAlt = (gx + gy) % 2 === 0
    ctx.fillStyle = isAlt ? COLORS.floor : COLORS.floorAlt
    ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
    ctx.strokeStyle = COLORS.gridLine
    ctx.lineWidth = 1
    ctx.strokeRect(x + 0.5, y + 0.5, TILE_SIZE - 1, TILE_SIZE - 1)

    switch (tile.type) {
      case 'parede': {
        ctx.fillStyle = COLORS.wall
        ctx.fillRect(x, y, TILE_SIZE, TILE_SIZE)
        ctx.fillStyle = COLORS.wallTop
        ctx.fillRect(x, y, TILE_SIZE, 8)
        // Padrão de tijolos
        ctx.fillStyle = '#171717'
        for (let row = 0; row < 4; row++) {
          const offset = row % 2 === 0 ? 0 : TILE_SIZE / 4
          for (let col = 0; col < 2; col++) {
            ctx.fillRect(
              x + col * (TILE_SIZE / 2) + offset,
              y + 12 + row * 13,
              TILE_SIZE / 2 - 2,
              2
            )
          }
        }
        break
      }
      case 'goal': {
        // Alvo dourado pulsante
        const cx = x + TILE_SIZE / 2
        const cy = y + TILE_SIZE / 2
        const t = Date.now() / 400
        const r = TILE_SIZE / 3 + Math.sin(t) * 3
        ctx.fillStyle = COLORS.goal
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.fill()
        ctx.strokeStyle = COLORS.goalRing
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(cx, cy, r + 4, 0, Math.PI * 2)
        ctx.stroke()
        ctx.fillStyle = '#fef3c7'
        ctx.font = 'bold 24px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('★', cx, cy)
        break
      }
      case 'balcao': {
        ctx.fillStyle = COLORS.balcao
        ctx.fillRect(x + 4, y + 8, TILE_SIZE - 8, TILE_SIZE - 16)
        ctx.fillStyle = COLORS.balcaoTop
        ctx.fillRect(x + 4, y + 8, TILE_SIZE - 8, 12)
        // Pizza pronta no balcão
        if (tile.pizzaReady) {
          this.drawPizzaIcon(x + TILE_SIZE / 2, y + TILE_SIZE / 2 + 4, 14)
        }
        break
      }
      case 'mesa': {
        const cx = x + TILE_SIZE / 2
        const cy = y + TILE_SIZE / 2
        // Mesa circular
        ctx.fillStyle = COLORS.mesa
        ctx.beginPath()
        ctx.arc(cx, cy, TILE_SIZE / 2 - 8, 0, Math.PI * 2)
        ctx.fill()
        ctx.fillStyle = COLORS.mesaTop
        ctx.beginPath()
        ctx.arc(cx, cy - 2, TILE_SIZE / 2 - 10, 0, Math.PI * 2)
        ctx.fill()
        // Número da mesa
        if (tile.tableNumber !== undefined) {
          ctx.fillStyle = '#fef3c7'
          ctx.font = 'bold 18px monospace'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillText(String(tile.tableNumber), cx, cy)
        }
        break
      }
      case 'ingrediente': {
        if (tile.ingredient) {
          this.drawIngredient(x, y, tile.ingredient)
        }
        break
      }
      case 'caixa': {
        ctx.fillStyle = COLORS.caixa
        ctx.fillRect(x + 6, y + 10, TILE_SIZE - 12, TILE_SIZE - 18)
        ctx.fillStyle = '#fbbf24'
        ctx.font = 'bold 24px monospace'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText('$', x + TILE_SIZE / 2, y + TILE_SIZE / 2)
        break
      }
      case 'lixo': {
        ctx.fillStyle = COLORS.lixo
        ctx.fillRect(x + 12, y + 16, TILE_SIZE - 24, TILE_SIZE - 24)
        ctx.fillStyle = '#262626'
        ctx.fillRect(x + 10, y + 14, TILE_SIZE - 20, 4)
        break
      }
    }
  }

  private drawIngredient(x: number, y: number, type: string): void {
    const { ctx } = this
    const cx = x + TILE_SIZE / 2
    // Caixote
    ctx.fillStyle = '#78350f'
    ctx.fillRect(x + 8, y + 16, TILE_SIZE - 16, TILE_SIZE - 24)
    ctx.fillStyle = '#92400e'
    ctx.fillRect(x + 8, y + 16, TILE_SIZE - 16, 4)
    // Conteúdo
    const color = (COLORS as Record<string, string>)[type] || '#94a3b8'
    ctx.fillStyle = color
    ctx.fillRect(x + 14, y + 24, TILE_SIZE - 28, TILE_SIZE - 38)
    // Label
    ctx.fillStyle = '#fef3c7'
    ctx.font = 'bold 9px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText(type.substring(0, 6).toUpperCase(), cx, y + TILE_SIZE - 4)
  }

  private drawForno(gx: number, gy: number, pizza: { state: string } | null): void {
    const { ctx } = this
    const x = gx * TILE_SIZE
    const y = gy * TILE_SIZE
    // Corpo do forno
    ctx.fillStyle = COLORS.forno
    ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, TILE_SIZE - 12)
    ctx.fillStyle = '#581c0c'
    ctx.fillRect(x + 6, y + 6, TILE_SIZE - 12, 6)
    // Boca do forno
    ctx.fillStyle = pizza ? COLORS.fornoGlow : '#1c1917'
    ctx.fillRect(x + 14, y + 20, TILE_SIZE - 28, TILE_SIZE - 36)
    // Pizza dentro?
    if (pizza) {
      const cx = x + TILE_SIZE / 2
      const cy = y + TILE_SIZE / 2 + 4
      if (pizza.state === 'cozinhando' || pizza.state === 'crua') {
        this.drawPizzaIcon(cx, cy, 8, '#fef3c7')
      } else if (pizza.state === 'pronta') {
        this.drawPizzaIcon(cx, cy, 8)
      } else if (pizza.state === 'queimada') {
        this.drawPizzaIcon(cx, cy, 8, '#1c1917')
      }
    }
    // Letras FORNO
    ctx.fillStyle = '#fef3c7'
    ctx.font = 'bold 8px monospace'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'bottom'
    ctx.fillText('FORNO', x + TILE_SIZE / 2, y + TILE_SIZE - 3)
  }

  private drawPizzaIcon(cx: number, cy: number, r: number, base?: string): void {
    const { ctx } = this
    ctx.fillStyle = base ?? COLORS.pizza
    ctx.beginPath()
    ctx.arc(cx, cy, r, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = COLORS.pizzaTop
    ctx.beginPath()
    ctx.arc(cx - r / 2, cy - r / 3, r / 4, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + r / 3, cy + r / 4, r / 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, cy + r / 2, r / 5, 0, Math.PI * 2)
    ctx.fill()
  }

  private drawPlayer(gx: number, gy: number, facing: Direction, holding: string | null): void {
    const { ctx } = this
    const cx = gx * TILE_SIZE + TILE_SIZE / 2
    const cy = gy * TILE_SIZE + TILE_SIZE / 2

    // Sombra
    ctx.fillStyle = '#00000055'
    ctx.beginPath()
    ctx.ellipse(cx, cy + 18, 16, 5, 0, 0, Math.PI * 2)
    ctx.fill()

    // Corpo (avental laranja)
    ctx.fillStyle = '#ea580c'
    ctx.fillRect(cx - 12, cy - 4, 24, 22)
    // Listra branca do avental
    ctx.fillStyle = '#fef3c7'
    ctx.fillRect(cx - 12, cy - 4, 24, 4)

    // Cabeça
    ctx.fillStyle = COLORS.playerSkin
    ctx.beginPath()
    ctx.arc(cx, cy - 12, 10, 0, Math.PI * 2)
    ctx.fill()

    // Chapéu de chef
    ctx.fillStyle = '#fef3c7'
    ctx.fillRect(cx - 10, cy - 22, 20, 6)
    ctx.beginPath()
    ctx.arc(cx, cy - 24, 8, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx - 6, cy - 22, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + 6, cy - 22, 6, 0, Math.PI * 2)
    ctx.fill()

    // Olhos (direção)
    ctx.fillStyle = COLORS.playerEye
    let eyeDx = 0
    let eyeDy = 0
    switch (facing) {
      case 'norte':
        eyeDy = -2
        break
      case 'sul':
        eyeDy = 2
        break
      case 'leste':
        eyeDx = 2
        break
      case 'oeste':
        eyeDx = -2
        break
    }
    ctx.fillRect(cx - 4 + eyeDx, cy - 14 + eyeDy, 2, 3)
    ctx.fillRect(cx + 2 + eyeDx, cy - 14 + eyeDy, 2, 3)

    // Indicador de direção (seta sutil)
    ctx.fillStyle = '#fbbf2488'
    ctx.beginPath()
    const dist = 28
    switch (facing) {
      case 'norte':
        ctx.moveTo(cx, cy - dist)
        ctx.lineTo(cx - 5, cy - dist + 6)
        ctx.lineTo(cx + 5, cy - dist + 6)
        break
      case 'sul':
        ctx.moveTo(cx, cy + dist)
        ctx.lineTo(cx - 5, cy + dist - 6)
        ctx.lineTo(cx + 5, cy + dist - 6)
        break
      case 'leste':
        ctx.moveTo(cx + dist, cy)
        ctx.lineTo(cx + dist - 6, cy - 5)
        ctx.lineTo(cx + dist - 6, cy + 5)
        break
      case 'oeste':
        ctx.moveTo(cx - dist, cy)
        ctx.lineTo(cx - dist + 6, cy - 5)
        ctx.lineTo(cx - dist + 6, cy + 5)
        break
    }
    ctx.closePath()
    ctx.fill()

    // Item segurado (em cima da cabeça)
    if (holding) {
      ctx.fillStyle = '#fef3c755'
      ctx.fillRect(cx - 10, cy - 36, 20, 12)
      if (holding === 'pizza_pronta') {
        this.drawPizzaIcon(cx, cy - 30, 6)
      } else {
        const color = (COLORS as Record<string, string>)[holding] || '#94a3b8'
        ctx.fillStyle = color
        ctx.fillRect(cx - 7, cy - 34, 14, 8)
      }
    }
  }
}

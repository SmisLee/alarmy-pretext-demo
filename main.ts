import {
  layoutNextLine,
  layoutWithLines,
  prepareWithSegments,
  walkLineRanges,
  type LayoutCursor,
  type PreparedTextWithSegments,
} from '@chenglou/pretext'

const BODY_FONT = '18px "Iowan Old Style", "Palatino Linotype", "Apple SD Gothic Neo", "Noto Serif KR", "Book Antiqua", Palatino, serif'
const BODY_LINE_HEIGHT = 30
const HEADLINE_FONT_FAMILY = '"Iowan Old Style", "Palatino Linotype", "Apple SD Gothic Neo", "Noto Serif KR", "Book Antiqua", Palatino, serif'
const HEADLINE_TEXT = 'WAKE UP WITH ALARMY'
const GUTTER = 48
const COL_GAP = 40
const BOTTOM_GAP = 20
const DROP_CAP_LINES = 3
const MIN_SLOT_WIDTH = 50
const NARROW_BREAKPOINT = 760
const NARROW_GUTTER = 20
const NARROW_COL_GAP = 20
const NARROW_BOTTOM_GAP = 16
const CLOCK_RADIUS = 130
const NARROW_CLOCK_SCALE = 0.7

type Interval = { left: number; right: number }
type PositionedLine = { x: number; y: number; width: number; text: string }
type CircleObstacle = { cx: number; cy: number; r: number; hPad: number; vPad: number }
type RectObstacle = { x: number; y: number; w: number; h: number }
type PullquotePlacement = { colIdx: number; yFrac: number; wFrac: number; side: 'left' | 'right' }
type PullquoteRect = RectObstacle & { lines: PositionedLine[]; colIdx: number }
type HeadlineFit = { fontSize: number; lines: PositionedLine[] }
type PullquoteSpec = { prepared: PreparedTextWithSegments; placement: PullquotePlacement }
type PointerSample = { x: number; y: number }
type PointerState = { x: number; y: number }
type ClockState = { x: number; y: number; r: number }
type DragState = {
  startPointerX: number; startPointerY: number
  startClockX: number; startClockY: number
}
type InteractionMode = 'idle' | 'text-select'
type AppState = {
  clock: ClockState
  pointer: PointerState
  drag: DragState | null
  interactionMode: InteractionMode
  selectionActive: boolean
  events: { pointerDown: PointerSample | null; pointerMove: PointerSample | null; pointerUp: PointerSample | null }
}

const BODY_TEXT = `Alarmy는 전 세계 7,500만 사용자가 선택한 알람 앱입니다. 단순히 소리를 울리는 알람이 아닙니다. 사진 찍기, 수학 문제 풀기, QR 코드 스캔 등 미션을 완료해야만 알람이 꺼집니다. 확실히 잠에서 깨어나야 할 때, Alarmy가 있습니다.

매일 아침, 수백만 명의 사용자가 Alarmy와 함께 하루를 시작합니다. 기상 미션부터 수면 분석, 코골이 녹음까지 — 건강한 수면 습관을 만드는 올인원 수면 솔루션입니다. 단순한 알람 앱을 넘어, 당신의 아침을 바꾸는 라이프스타일 도구입니다.

미션 알람은 Alarmy의 핵심입니다. 사진 미션은 지정한 장소의 사진을 찍어야 알람이 해제됩니다. 침대에서 나와 세면대까지 걸어가야 하죠. 흔들기 미션은 스마트폰을 일정 횟수 흔들어야 합니다. 수학 미션은 간단한 산수부터 복잡한 방정식까지, 두뇌를 깨우는 데 효과적입니다. 타이핑 미션은 주어진 문장을 정확히 입력해야 합니다. 이 모든 미션은 하나의 목표를 향합니다 — 당신이 확실히 잠에서 깨어나는 것.

수면 분석 기능은 수면 패턴을 추적하고, 코골이를 녹음하여 수면 품질을 시각화합니다. 매일 밤 얼마나 깊이 잤는지, 몇 번 뒤척였는지, 코골이가 얼마나 심했는지를 데이터로 보여줍니다. 이 데이터는 더 나은 수면 습관을 만드는 출발점이 됩니다.

알람 소리도 풍부합니다. 인기 음악부터 커스텀 사운드까지, 원하는 소리로 아침을 맞이하세요. Spotify와 연동하면 좋아하는 플레이리스트로 기상할 수 있습니다. 점점 커지는 볼륨, 진동 패턴, 스누즈 제한 등 세밀한 설정이 가능합니다.

Alarmy는 2012년 처음 세상에 나왔습니다. 그때부터 지금까지, "확실히 깨워주는 알람"이라는 하나의 약속을 지켜왔습니다. App Store와 Google Play에서 모두 최고 평점을 유지하고 있으며, 전 세계 150개국 이상에서 사랑받고 있습니다. 매일 아침, Alarmy는 수백만 명의 하루를 엽니다.

이 페이지의 텍스트는 CSS가 아닌 JavaScript로 레이아웃됩니다. pretext 라이브러리는 DOM을 건드리지 않고 텍스트를 측정하고 배치합니다. 화면 중앙의 시계를 드래그해보세요. 텍스트가 실시간으로 시계를 피해 흘러가는 것을 볼 수 있습니다. 이것이 DOM 없는 텍스트 레이아웃의 힘입니다.

브라우저의 텍스트 렌더링 파이프라인은 30년 전 정적 문서를 위해 설계되었습니다. 텍스트의 높이나 줄바꿈 위치를 알려면 DOM에 물어봐야 하고, DOM은 그 대가로 레이아웃 리플로우를 요구합니다. pretext는 canvas의 measureText를 활용해 이 비용을 제거합니다. 한 번 측정한 폰트 메트릭을 캐시하고, 이후의 레이아웃은 순수한 산술 연산으로 처리합니다.

결과는 극적입니다. DOM 측정으로 500개 텍스트 블록을 처리하면 15-30밀리초가 걸리고 500번의 리플로우가 발생합니다. pretext로는 같은 작업이 0.05밀리초에 끝나고, 리플로우는 0번입니다. 300배에서 600배의 성능 향상. 이것이 가능한 이유는 단순합니다 — DOM에 묻지 않으면, DOM이 대가를 요구하지 않습니다.

이 기술 데모에서 보이는 시계 주위의 텍스트 리플로우는 매 프레임 실행됩니다. 각 프레임에서 레이아웃 엔진은 모든 텍스트 라인에 대해 장애물 교차를 계산하고, 사용 가능한 수평 슬롯을 결정하며, 각 라인을 정확한 너비와 위치에 배치합니다. 총 계산 시간은 보통 0.5밀리초 미만입니다. 15킬로바이트, 의존성 제로, DOM 읽기 제로. 그리고 텍스트는 흐릅니다.`

const PULLQUOTE_TEXTS = [
  '"확실히 잠에서 깨어나야 할 때, Alarmy가 답입니다. 전 세계 7,500만 사용자가 증명합니다."',
  '"15킬로바이트, 의존성 제로, DOM 읽기 제로. 그리고 텍스트는 흐릅니다."',
]

function getRequiredDiv(id: string): HTMLDivElement {
  const element = document.getElementById(id)
  if (!(element instanceof HTMLDivElement)) throw new Error(`#${id} not found`)
  return element
}

function carveTextLineSlots(base: Interval, blocked: Interval[]): Interval[] {
  let slots = [base]
  for (let blockedIndex = 0; blockedIndex < blocked.length; blockedIndex++) {
    const interval = blocked[blockedIndex]!
    const next: Interval[] = []
    for (let slotIndex = 0; slotIndex < slots.length; slotIndex++) {
      const slot = slots[slotIndex]!
      if (interval.right <= slot.left || interval.left >= slot.right) {
        next.push(slot)
        continue
      }
      if (interval.left > slot.left) next.push({ left: slot.left, right: interval.left })
      if (interval.right < slot.right) next.push({ left: interval.right, right: slot.right })
    }
    slots = next
  }
  return slots.filter(slot => slot.right - slot.left >= MIN_SLOT_WIDTH)
}

function circleIntervalForBand(
  cx: number, cy: number, r: number,
  bandTop: number, bandBottom: number,
  hPad: number, vPad: number,
): Interval | null {
  const top = bandTop - vPad
  const bottom = bandBottom + vPad
  if (top >= cy + r || bottom <= cy - r) return null
  const minDy = cy >= top && cy <= bottom ? 0 : cy < top ? top - cy : cy - bottom
  if (minDy >= r) return null
  const maxDx = Math.sqrt(r * r - minDy * minDy)
  return { left: cx - maxDx - hPad, right: cx + maxDx + hPad }
}

const stage = getRequiredDiv('stage')

const W0 = window.innerWidth
const H0 = window.innerHeight

await document.fonts.ready

const preparedBody = prepareWithSegments(BODY_TEXT, BODY_FONT)
const PQ_FONT = `italic 19px ${HEADLINE_FONT_FAMILY}`
const PQ_LINE_HEIGHT = 27
const preparedPullquotes = PULLQUOTE_TEXTS.map(text => prepareWithSegments(text, PQ_FONT))
const pullquoteSpecs: PullquoteSpec[] = [
  { prepared: preparedPullquotes[0]!, placement: { colIdx: 0, yFrac: 0.48, wFrac: 0.52, side: 'right' } },
  { prepared: preparedPullquotes[1]!, placement: { colIdx: 1, yFrac: 0.32, wFrac: 0.5, side: 'left' } },
]

const DROP_CAP_SIZE = BODY_LINE_HEIGHT * DROP_CAP_LINES - 4
const DROP_CAP_FONT = `700 ${DROP_CAP_SIZE}px ${HEADLINE_FONT_FAMILY}`
const DROP_CAP_TEXT = BODY_TEXT[0]!
const preparedDropCap = prepareWithSegments(DROP_CAP_TEXT, DROP_CAP_FONT)

let dropCapWidth = 0
walkLineRanges(preparedDropCap, 9999, line => { dropCapWidth = line.width })
const DROP_CAP_TOTAL_W = Math.ceil(dropCapWidth) + 10

const dropCapEl = document.createElement('div')
dropCapEl.className = 'drop-cap'
dropCapEl.textContent = DROP_CAP_TEXT
dropCapEl.style.font = DROP_CAP_FONT
dropCapEl.style.lineHeight = `${DROP_CAP_SIZE}px`
stage.appendChild(dropCapEl)

// 시계 캔버스 생성
const clockCanvas = document.createElement('canvas')
clockCanvas.className = 'clock-canvas'
const isNarrowInit = W0 < NARROW_BREAKPOINT
const initialRadius = CLOCK_RADIUS * (isNarrowInit ? NARROW_CLOCK_SCALE : 1)
clockCanvas.width = initialRadius * 2
clockCanvas.height = initialRadius * 2
clockCanvas.style.position = 'absolute'
clockCanvas.style.zIndex = '10'
clockCanvas.style.cursor = 'grab'
clockCanvas.style.pointerEvents = 'auto'
clockCanvas.style.boxShadow = '0 0 80px rgba(252,49,76,0.25)'
clockCanvas.style.borderRadius = '50%'
stage.appendChild(clockCanvas)

const linePool: HTMLDivElement[] = []
const headlinePool: HTMLDivElement[] = []
const pullquoteLinePool: HTMLDivElement[] = []
const pullquoteBoxPool: HTMLDivElement[] = []
const domCache = {
  stage,
  dropCap: dropCapEl,
  bodyLines: linePool,
  headlineLines: headlinePool,
  pullquoteLines: pullquoteLinePool,
  pullquoteBoxes: pullquoteBoxPool,
  clockCanvas,
}

const st: AppState = {
  clock: {
    x: W0 / 2,
    y: H0 / 2,
    r: initialRadius,
  },
  pointer: { x: -9999, y: -9999 },
  drag: null,
  interactionMode: 'idle',
  selectionActive: false,
  events: { pointerDown: null, pointerMove: null, pointerUp: null },
}

function syncPool(pool: HTMLDivElement[], count: number, className: string): void {
  while (pool.length < count) {
    const element = document.createElement('div')
    element.className = className
    stage.appendChild(element)
    pool.push(element)
  }
  for (let index = 0; index < pool.length; index++) {
    pool[index]!.style.display = index < count ? '' : 'none'
  }
}

let cachedHeadlineWidth = -1
let cachedHeadlineHeight = -1
let cachedHeadlineMaxSize = -1
let cachedHeadlineFontSize = 24
let cachedHeadlineLines: PositionedLine[] = []

function fitHeadline(maxWidth: number, maxHeight: number, maxSize: number = 92): HeadlineFit {
  if (maxWidth === cachedHeadlineWidth && maxHeight === cachedHeadlineHeight && maxSize === cachedHeadlineMaxSize) {
    return { fontSize: cachedHeadlineFontSize, lines: cachedHeadlineLines }
  }
  cachedHeadlineWidth = maxWidth
  cachedHeadlineHeight = maxHeight
  cachedHeadlineMaxSize = maxSize
  let lo = 20
  let hi = maxSize
  let best = lo
  let bestLines: PositionedLine[] = []

  while (lo <= hi) {
    const size = Math.floor((lo + hi) / 2)
    const font = `700 ${size}px ${HEADLINE_FONT_FAMILY}`
    const lineHeight = Math.round(size * 0.93)
    const prepared = prepareWithSegments(HEADLINE_TEXT, font)
    let breaksWord = false
    let lineCount = 0
    walkLineRanges(prepared, maxWidth, line => {
      lineCount++
      if (line.end.graphemeIndex !== 0) breaksWord = true
    })
    const totalHeight = lineCount * lineHeight
    if (!breaksWord && totalHeight <= maxHeight) {
      best = size
      const result = layoutWithLines(prepared, maxWidth, lineHeight)
      bestLines = result.lines.map((line, index) => ({
        x: 0, y: index * lineHeight, text: line.text, width: line.width,
      }))
      lo = size + 1
    } else {
      hi = size - 1
    }
  }
  cachedHeadlineFontSize = best
  cachedHeadlineLines = bestLines
  return { fontSize: best, lines: bestLines }
}

function layoutColumn(
  prepared: PreparedTextWithSegments,
  startCursor: LayoutCursor,
  regionX: number, regionY: number, regionW: number, regionH: number,
  lineHeight: number,
  circleObstacles: CircleObstacle[],
  rectObstacles: RectObstacle[],
  singleSlotOnly: boolean = false,
): { lines: PositionedLine[]; cursor: LayoutCursor } {
  let cursor: LayoutCursor = startCursor
  let lineTop = regionY
  const lines: PositionedLine[] = []
  let textExhausted = false

  while (lineTop + lineHeight <= regionY + regionH && !textExhausted) {
    const bandTop = lineTop
    const bandBottom = lineTop + lineHeight
    const blocked: Interval[] = []

    for (let i = 0; i < circleObstacles.length; i++) {
      const ob = circleObstacles[i]!
      const interval = circleIntervalForBand(ob.cx, ob.cy, ob.r, bandTop, bandBottom, ob.hPad, ob.vPad)
      if (interval !== null) blocked.push(interval)
    }
    for (let i = 0; i < rectObstacles.length; i++) {
      const rect = rectObstacles[i]!
      if (bandBottom <= rect.y || bandTop >= rect.y + rect.h) continue
      blocked.push({ left: rect.x, right: rect.x + rect.w })
    }

    const slots = carveTextLineSlots({ left: regionX, right: regionX + regionW }, blocked)
    if (slots.length === 0) { lineTop += lineHeight; continue }

    const orderedSlots = singleSlotOnly
      ? [slots.reduce((best, slot) => {
          const bestW = best.right - best.left
          const slotW = slot.right - slot.left
          if (slotW > bestW) return slot
          if (slotW < bestW) return best
          return slot.left < best.left ? slot : best
        })]
      : [...slots].sort((a, b) => a.left - b.left)

    for (let i = 0; i < orderedSlots.length; i++) {
      const slot = orderedSlots[i]!
      const slotWidth = slot.right - slot.left
      const line = layoutNextLine(prepared, cursor, slotWidth)
      if (line === null) { textExhausted = true; break }
      lines.push({ x: Math.round(slot.left), y: Math.round(lineTop), text: line.text, width: line.width })
      cursor = line.end
    }
    lineTop += lineHeight
  }
  return { lines, cursor }
}

function hitTestClock(clock: ClockState, px: number, py: number): boolean {
  const dx = px - clock.x
  const dy = py - clock.y
  return dx * dx + dy * dy <= clock.r * clock.r
}

function pointerSampleFromEvent(event: PointerEvent): PointerSample {
  return { x: event.clientX, y: event.clientY }
}

function isSelectableTextTarget(target: EventTarget | null): boolean {
  return target instanceof Element && target.closest('.line, .headline-line, .pullquote-line') !== null
}

function hasActiveTextSelection(): boolean {
  const selection = window.getSelection()
  return selection !== null && !selection.isCollapsed && selection.rangeCount > 0
}

function clearQueuedPointerEvents(): void {
  st.events.pointerDown = null
  st.events.pointerMove = null
  st.events.pointerUp = null
}

function enterTextSelectionMode(): void {
  st.interactionMode = 'text-select'
  clearQueuedPointerEvents()
  domCache.stage.style.userSelect = ''
  domCache.stage.style.webkitUserSelect = ''
  document.body.style.cursor = ''
}

function syncSelectionState(): void {
  st.selectionActive = hasActiveTextSelection()
  if (st.selectionActive) {
    enterTextSelectionMode()
  } else if (st.interactionMode === 'text-select' && st.drag === null) {
    st.interactionMode = 'idle'
  }
}

function isTextSelectionInteractionActive(): boolean {
  return st.interactionMode === 'text-select' || st.selectionActive
}

function drawClock(ctx: CanvasRenderingContext2D, r: number): void {
  const now = new Date()
  const hours = now.getHours() % 12
  const minutes = now.getMinutes()
  const seconds = now.getSeconds()
  const millis = now.getMilliseconds()
  const smoothSeconds = seconds + millis / 1000

  ctx.clearRect(0, 0, r * 2, r * 2)
  ctx.save()
  ctx.translate(r, r)

  // Face
  ctx.beginPath()
  ctx.arc(0, 0, r - 2, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(15, 15, 20, 0.92)'
  ctx.fill()
  ctx.strokeStyle = 'rgba(252, 49, 76, 0.3)'
  ctx.lineWidth = 2
  ctx.stroke()

  // Hour marks
  for (let i = 0; i < 12; i++) {
    const angle = (i * Math.PI) / 6
    const isQuarter = i % 3 === 0
    const outerR = r - 10
    const innerR = isQuarter ? r - 26 : r - 20
    ctx.beginPath()
    ctx.moveTo(Math.cos(angle) * innerR, Math.sin(angle) * innerR)
    ctx.lineTo(Math.cos(angle) * outerR, Math.sin(angle) * outerR)
    ctx.strokeStyle = isQuarter ? '#FC314C' : '#FC6D80'
    ctx.lineWidth = isQuarter ? 3 : 1.5
    ctx.lineCap = 'round'
    ctx.stroke()
  }

  // "ALARMY" text
  ctx.fillStyle = '#FC6D80'
  ctx.font = `600 ${Math.round(r * 0.1)}px "Helvetica Neue", Helvetica, sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText('ALARMY', 0, r * 0.28)

  // Hour hand
  const hourAngle = ((hours + minutes / 60) * Math.PI) / 6 - Math.PI / 2
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(Math.cos(hourAngle) * r * 0.45, Math.sin(hourAngle) * r * 0.45)
  ctx.strokeStyle = '#e8e4dc'
  ctx.lineWidth = 5
  ctx.lineCap = 'round'
  ctx.stroke()

  // Minute hand
  const minuteAngle = ((minutes + smoothSeconds / 60) * Math.PI) / 30 - Math.PI / 2
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(Math.cos(minuteAngle) * r * 0.65, Math.sin(minuteAngle) * r * 0.65)
  ctx.strokeStyle = '#e8e4dc'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.stroke()

  // Second hand
  const secondAngle = (smoothSeconds * Math.PI) / 30 - Math.PI / 2
  ctx.beginPath()
  ctx.moveTo(Math.cos(secondAngle + Math.PI) * r * 0.12, Math.sin(secondAngle + Math.PI) * r * 0.12)
  ctx.lineTo(Math.cos(secondAngle) * r * 0.75, Math.sin(secondAngle) * r * 0.75)
  ctx.strokeStyle = '#FC314C'
  ctx.lineWidth = 1.5
  ctx.lineCap = 'round'
  ctx.stroke()

  // Center dot
  ctx.beginPath()
  ctx.arc(0, 0, 5, 0, Math.PI * 2)
  ctx.fillStyle = '#FC314C'
  ctx.fill()

  ctx.restore()
}

let scheduledRaf: number | null = null
function scheduleRender(): void {
  if (scheduledRaf !== null) return
  scheduledRaf = requestAnimationFrame(function renderFrame() {
    scheduledRaf = null
    render()
    scheduleRender() // 항상 다음 프레임 예약 (초침 애니메이션)
  })
}

stage.addEventListener('pointerdown', event => {
  if (event.pointerType === 'touch' && isSelectableTextTarget(event.target)) {
    enterTextSelectionMode()
    return
  }
  const hit = hitTestClock(st.clock, event.clientX, event.clientY)
  if (hit) {
    event.preventDefault()
  } else if (event.pointerType === 'touch' && st.selectionActive) {
    enterTextSelectionMode()
    return
  }
  st.events.pointerDown = pointerSampleFromEvent(event)
  scheduleRender()
})

stage.addEventListener('touchmove', event => {
  if (isTextSelectionInteractionActive()) return
  event.preventDefault()
}, { passive: false })

window.addEventListener('pointermove', event => {
  if (event.pointerType === 'touch' && isTextSelectionInteractionActive() && st.drag === null) return
  st.events.pointerMove = pointerSampleFromEvent(event)
  scheduleRender()
})

window.addEventListener('pointerup', event => {
  if (event.pointerType === 'touch' && isTextSelectionInteractionActive() && st.drag === null) {
    syncSelectionState()
    return
  }
  if (event.pointerType === 'touch') syncSelectionState()
  st.events.pointerUp = pointerSampleFromEvent(event)
  scheduleRender()
})

window.addEventListener('pointercancel', event => {
  if (event.pointerType === 'touch') syncSelectionState()
  st.events.pointerUp = pointerSampleFromEvent(event)
  scheduleRender()
})

window.addEventListener('resize', () => scheduleRender())
document.addEventListener('selectionchange', () => { syncSelectionState(); scheduleRender() })

function render(): void {
  if (isTextSelectionInteractionActive() && st.drag === null) return

  const pageWidth = document.documentElement.clientWidth
  const pageHeight = document.documentElement.clientHeight
  const isNarrow = pageWidth < NARROW_BREAKPOINT
  const gutter = isNarrow ? NARROW_GUTTER : GUTTER
  const colGap = isNarrow ? NARROW_COL_GAP : COL_GAP
  const bottomGap = isNarrow ? NARROW_BOTTOM_GAP : BOTTOM_GAP
  const clockRadiusScale = isNarrow ? NARROW_CLOCK_SCALE : 1
  const clock = st.clock

  // 반응형 시계 반경 업데이트
  clock.r = CLOCK_RADIUS * clockRadiusScale

  let pointer = st.pointer
  let drag = st.drag
  if (st.events.pointerDown !== null) {
    const down = st.events.pointerDown
    pointer = down
    if (drag === null) {
      const hit = hitTestClock(clock, down.x, down.y)
      if (hit) {
        drag = { startPointerX: down.x, startPointerY: down.y, startClockX: clock.x, startClockY: clock.y }
      }
    }
  }
  if (st.events.pointerMove !== null) {
    const move = st.events.pointerMove
    pointer = move
    if (drag !== null) {
      clock.x = drag.startClockX + (move.x - drag.startPointerX)
      clock.y = drag.startClockY + (move.y - drag.startPointerY)
    }
  }
  if (st.events.pointerUp !== null) {
    const up = st.events.pointerUp
    pointer = up
    if (drag !== null) {
      const dx = up.x - drag.startPointerX
      const dy = up.y - drag.startPointerY
      clock.x = drag.startClockX + dx
      clock.y = drag.startClockY + dy
      drag = null
    }
  }

  const circleObstacles: CircleObstacle[] = [
    { cx: clock.x, cy: clock.y, r: clock.r, hPad: 16, vPad: 4 }
  ]

  const headlineWidth = Math.min(pageWidth - gutter * 2 - (isNarrow ? 12 : 0), 1000)
  const maxHeadlineHeight = Math.floor(pageHeight * (isNarrow ? 0.2 : 0.24))
  const { fontSize: headlineSize, lines: headlineLines } = fitHeadline(headlineWidth, maxHeadlineHeight, isNarrow ? 38 : 92)
  const headlineLineHeight = Math.round(headlineSize * 0.93)
  const headlineFont = `700 ${headlineSize}px ${HEADLINE_FONT_FAMILY}`
  const headlineHeight = headlineLines.length * headlineLineHeight

  const bodyTop = gutter + headlineHeight + (isNarrow ? 14 : 20)
  const bodyHeight = pageHeight - bodyTop - bottomGap
  const columnCount = pageWidth > 1000 ? 3 : pageWidth > 640 ? 2 : 1
  const totalGutter = gutter * 2 + colGap * (columnCount - 1)
  const maxContentWidth = Math.min(pageWidth, 1500)
  const columnWidth = Math.floor((maxContentWidth - totalGutter) / columnCount)
  const contentLeft = Math.round((pageWidth - (columnCount * columnWidth + (columnCount - 1) * colGap)) / 2)
  const column0X = contentLeft

  const dropCapRect: RectObstacle = { x: column0X - 2, y: bodyTop - 2, w: DROP_CAP_TOTAL_W, h: DROP_CAP_LINES * BODY_LINE_HEIGHT + 2 }

  const pullquoteRects: PullquoteRect[] = []
  for (let i = 0; i < pullquoteSpecs.length; i++) {
    if (isNarrow) break
    const { prepared, placement } = pullquoteSpecs[i]!
    if (placement.colIdx >= columnCount) continue
    const pqW = Math.round(columnWidth * placement.wFrac)
    const pqLines = layoutWithLines(prepared, pqW - 20, PQ_LINE_HEIGHT).lines
    const pqH = pqLines.length * PQ_LINE_HEIGHT + 16
    const colX = contentLeft + placement.colIdx * (columnWidth + colGap)
    const pqX = placement.side === 'right' ? colX + columnWidth - pqW : colX
    const pqY = Math.round(bodyTop + bodyHeight * placement.yFrac)
    const positioned = pqLines.map((line, li) => ({ x: pqX + 20, y: pqY + 8 + li * PQ_LINE_HEIGHT, text: line.text, width: line.width }))
    pullquoteRects.push({ x: pqX, y: pqY, w: pqW, h: pqH, lines: positioned, colIdx: placement.colIdx })
  }

  const allBodyLines: PositionedLine[] = []
  let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 1 }
  for (let col = 0; col < columnCount; col++) {
    const colX = contentLeft + col * (columnWidth + colGap)
    const rects: RectObstacle[] = []
    if (col === 0) rects.push(dropCapRect)
    for (let ri = 0; ri < pullquoteRects.length; ri++) {
      const pq = pullquoteRects[ri]!
      if (pq.colIdx !== col) continue
      rects.push({ x: pq.x, y: pq.y, w: pq.w, h: pq.h })
    }
    const result = layoutColumn(preparedBody, cursor, colX, bodyTop, columnWidth, bodyHeight, BODY_LINE_HEIGHT, circleObstacles, rects, isNarrow)
    allBodyLines.push(...result.lines)
    cursor = result.cursor
  }

  let totalPqLines = 0
  for (let i = 0; i < pullquoteRects.length; i++) totalPqLines += pullquoteRects[i]!.lines.length

  const hoveredClock = hitTestClock(clock, pointer.x, pointer.y)
  const cursorStyle = drag !== null ? 'grabbing' : hoveredClock ? 'grab' : ''

  st.pointer = pointer
  st.drag = drag
  st.events.pointerDown = null
  st.events.pointerMove = null
  st.events.pointerUp = null

  syncPool(domCache.headlineLines, headlineLines.length, 'headline-line')
  for (let i = 0; i < headlineLines.length; i++) {
    const el = domCache.headlineLines[i]!
    const line = headlineLines[i]!
    el.textContent = line.text
    el.style.left = `${gutter}px`
    el.style.top = `${gutter + line.y}px`
    el.style.font = headlineFont
    el.style.lineHeight = `${headlineLineHeight}px`
  }

  domCache.dropCap.style.left = `${column0X}px`
  domCache.dropCap.style.top = `${bodyTop}px`

  syncPool(domCache.bodyLines, allBodyLines.length, 'line')
  for (let i = 0; i < allBodyLines.length; i++) {
    const el = domCache.bodyLines[i]!
    const line = allBodyLines[i]!
    el.textContent = line.text
    el.style.left = `${line.x}px`
    el.style.top = `${line.y}px`
    el.style.font = BODY_FONT
    el.style.lineHeight = `${BODY_LINE_HEIGHT}px`
  }

  syncPool(domCache.pullquoteBoxes, pullquoteRects.length, 'pullquote-box')
  syncPool(domCache.pullquoteLines, totalPqLines, 'pullquote-line')
  let pqLineIdx = 0
  for (let i = 0; i < pullquoteRects.length; i++) {
    const pq = pullquoteRects[i]!
    const boxEl = domCache.pullquoteBoxes[i]!
    boxEl.style.left = `${pq.x}px`
    boxEl.style.top = `${pq.y}px`
    boxEl.style.width = `${pq.w}px`
    boxEl.style.height = `${pq.h}px`
    for (let li = 0; li < pq.lines.length; li++) {
      const el = domCache.pullquoteLines[pqLineIdx]!
      const line = pq.lines[li]!
      el.textContent = line.text
      el.style.left = `${line.x}px`
      el.style.top = `${line.y}px`
      el.style.font = PQ_FONT
      el.style.lineHeight = `${PQ_LINE_HEIGHT}px`
      pqLineIdx++
    }
  }

  // 시계 캔버스 업데이트
  const canvas = domCache.clockCanvas
  const newSize = clock.r * 2
  if (canvas.width !== newSize || canvas.height !== newSize) {
    canvas.width = newSize
    canvas.height = newSize
  }
  canvas.style.left = `${clock.x - clock.r}px`
  canvas.style.top = `${clock.y - clock.r}px`
  canvas.style.width = `${newSize}px`
  canvas.style.height = `${newSize}px`

  const ctx = canvas.getContext('2d')
  if (ctx) {
    drawClock(ctx, clock.r)
  }

  domCache.stage.style.userSelect = drag !== null ? 'none' : ''
  domCache.stage.style.webkitUserSelect = drag !== null ? 'none' : ''
  document.body.style.cursor = cursorStyle
}

scheduleRender()

'use client'
import { useEffect, useRef, useState, useCallback } from 'react'
import toast from 'react-hot-toast'

interface CanvasEditorProps {
  templateJson: any
  onSave: (fullCanvasJson: any, exportedDataUrl?: string) => void
  onCancel: () => void
  withExport?: boolean
}

// Canvas stores coordinates in 1080×1350 space.
// The Fabric canvas renders at full 1080×1350 so CSS downscaling keeps things sharp.
// SCALE=1 means stored coords == display coords — no transform needed.
const CANVAS_WIDTH   = 1080
const CANVAS_HEIGHT  = 1350
const DISPLAY_WIDTH  = 1080
const DISPLAY_HEIGHT = 1350
const SCALE          = DISPLAY_WIDTH / CANVAS_WIDTH   // 1.0

const isText   = (t: string) => { const l = (t ?? '').toLowerCase(); return l === 'textbox' || l === 'text' || l === 'i-text' }
const isRect   = (t: string) => (t ?? '').toLowerCase() === 'rect'
const isCircle = (t: string) => (t ?? '').toLowerCase() === 'circle'
const isImage  = (t: string) => { const l = (t ?? '').toLowerCase(); return l === 'image' || l === 'fabricimage' }

const FONTS = [
  { value: 'Syne',             label: 'Syne'             },
  { value: 'IBM Plex Sans',    label: 'IBM Plex Sans'    },
  { value: 'Inter',            label: 'Inter'            },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Montserrat',       label: 'Montserrat'       },
  { value: 'Raleway',          label: 'Raleway'          },
  { value: 'Oswald',           label: 'Oswald'           },
  { value: 'Lato',             label: 'Lato'             },
  { value: 'Plus Jakarta Sans',label: 'Plus Jakarta Sans'},
]
const FONTS_URL = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&family=IBM+Plex+Sans:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Inter:wght@300;400;500;700&family=Playfair+Display:ital,wght@0,400;0,700;1,400&family=Montserrat:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Raleway:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Oswald:wght@300;400;700&family=Lato:ital,wght@0,300;0,400;0,700;1,300;1,400&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'

type BlurType = 'gaussian' | 'motion' | 'radial' | 'box'

// Instagram-style filter presets.
// adj: array of {t, v} where t = 'b'rightness | 'c'ontrast | 's'aturation | 'h'ue,  v = -100..100 (degrees for hue)
const FILTER_PRESETS = [
  { name: 'Normal',    label: 'Normal',    swatch: 'linear-gradient(135deg,#888,#555)',              adj: [] as {t:string,v:number}[] },
  { name: 'Clarendon', label: 'Clarendon', swatch: 'linear-gradient(135deg,#5b8fd4,#2c5f9e)',        adj: [{t:'b',v:10},{t:'c',v:10},{t:'s',v:20}] },
  { name: 'Juno',      label: 'Juno',      swatch: 'linear-gradient(135deg,#f5a623,#e07b00)',        adj: [{t:'b',v:5},{t:'c',v:10},{t:'s',v:15},{t:'h',v:-15}] },
  { name: 'Lark',      label: 'Lark',      swatch: 'linear-gradient(135deg,#c8e6c9,#81c784)',        adj: [{t:'b',v:8},{t:'c',v:-10},{t:'s',v:-15}] },
  { name: 'Reyes',     label: 'Reyes',     swatch: 'linear-gradient(135deg,#d4a57a,#c47a3a)',        adj: [{t:'b',v:18},{t:'c',v:-20},{t:'s',v:-25}] },
  { name: 'Valencia',  label: 'Valencia',  swatch: 'linear-gradient(135deg,#f0c060,#d4943a)',        adj: [{t:'b',v:8},{t:'c',v:8},{t:'h',v:15}] },
  { name: 'Slumber',   label: 'Slumber',   swatch: 'linear-gradient(135deg,#9b8fb0,#6b5f80)',        adj: [{t:'b',v:5},{t:'c',v:-10},{t:'s',v:-20}] },
  { name: 'Lo-Fi',     label: 'Lo-Fi',     swatch: 'linear-gradient(135deg,#2d1b3d,#6b2d6b)',        adj: [{t:'c',v:30},{t:'s',v:30},{t:'b',v:-5}] },
  { name: 'Mayfair',   label: 'Mayfair',   swatch: 'linear-gradient(135deg,#f0d5c0,#d4a090)',        adj: [{t:'b',v:8},{t:'s',v:10},{t:'h',v:8}] },
  { name: 'Chrome',    label: 'Chrome',    swatch: 'linear-gradient(135deg,#8eaabf,#4a7090)',        adj: [{t:'s',v:-30},{t:'c',v:20},{t:'b',v:5}] },
  { name: 'Fade',      label: 'Fade',      swatch: 'linear-gradient(135deg,#c8c0b0,#a09888)',        adj: [{t:'b',v:10},{t:'c',v:-20},{t:'s',v:-15}] },
  { name: 'B&W',       label: 'B&W',       swatch: 'linear-gradient(135deg,#fff,#333)',              adj: [{t:'s',v:-100}] },
] as const

type LeftTab = 'canvas' | 'text' | 'media' | 'shapes' | 'layers'

export interface LiveLayer {
  lumenId: string
  type: string
}

// Resolve a CSS custom-property value so the Canvas 2D API can use it.
// `getComputedStyle` reads the current theme-resolved colour from the document root.
function resolveCSSVar(val: string | null | undefined): string {
  if (!val || typeof val !== 'string') return val ?? 'transparent'
  const match = val.match(/^var\(--([^)]+)\)$/)
  if (!match) return val
  const resolved = getComputedStyle(document.documentElement)
    .getPropertyValue(`--${match[1]}`).trim()
  return resolved || val
}

function layerIcon(type: string, lumenId: string): string {
  if (lumenId === 'background-image') return 'image'
  if (lumenId === 'overlay')          return 'gradient'
  if (lumenId === 'logo')             return 'circle'
  const t = (type ?? '').toLowerCase()
  if (t === 'textbox' || t === 'text' || t === 'i-text') return 'title'
  if (t === 'circle')  return 'circle'
  if (t === 'rect')    return 'rectangle'
  if (t === 'image' || t === 'fabricimage') return 'image'
  return 'layers'
}

export function CanvasEditor({ templateJson, onSave, onCancel, withExport }: CanvasEditorProps) {
  const canvasRef     = useRef<HTMLCanvasElement>(null)
  const guideRef      = useRef<HTMLCanvasElement>(null)
  const fabricRef     = useRef<any>(null)
  const fileInputRef  = useRef<HTMLInputElement>(null)
  const canvasAreaRef = useRef<HTMLDivElement>(null)
  const colorPickerRef = useRef<HTMLInputElement>(null)
  const undoStack     = useRef<string[]>([])
  const redoStack     = useRef<string[]>([])
  const clipboardRef   = useRef<any>(null)
  const manualZoom     = useRef(false)
  const canvasOuterRef = useRef<HTMLDivElement>(null)
  const canvasInnerRef = useRef<HTMLDivElement>(null)   // inner scale div — direct DOM zoom
  const canvasScaleRef = useRef(1)   // mirrors canvasScale for use in passive handlers
  const panOffsetRef   = useRef({ x: 0, y: 0 })        // accumulated pan offset for transform-based panning
  const serializing    = useRef(false)                  // guard: blocks pushUndo during reload / snapshot capture
  const lastSavedState = useRef<string>('')             // canvas JSON of the last settled state (BEFORE the next action)

  const [ready, setReady]               = useState(false)
  const [selectedObj, setSelectedObj]   = useState<any>(null)
  const [saving, setSaving]             = useState(false)
  const [uploading, setUploading]       = useState(false)
  const [assetPickerOpen, setAssetPickerOpen] = useState(false)
  const [brandAssets, setBrandAssets]   = useState<{ id: string; public_url: string; name?: string }[]>([])
  const [assetsLoading, setAssetsLoading] = useState(false)
  const [error, setError]               = useState<string | null>(null)
  const [canvasScale, setCanvasScale]   = useState(1)
  const [activeLeftTab, setActiveLeftTab] = useState<LeftTab>('canvas')
  const [leftSidebarOpen, setLeftSidebarOpen] = useState(typeof window !== 'undefined' ? window.innerWidth > 767 : true)
  const [rightPanelMinimized, setRightPanelMinimized] = useState(typeof window !== 'undefined' ? window.innerWidth <= 767 : false)
  const [layers, setLayers]             = useState<LiveLayer[]>([])

  const openLeftPanel = useCallback(() => {
    setLeftSidebarOpen(true)
    if (typeof window !== 'undefined' && window.innerWidth <= 767) setRightPanelMinimized(true)
  }, [])

  const openRightPanel = useCallback(() => {
    setRightPanelMinimized(false)
    if (typeof window !== 'undefined' && window.innerWidth <= 767) setLeftSidebarOpen(false)
  }, [])

  // Text properties
  const [textAlign, setTextAlign]   = useState<string>('left')
  const [fontFamily, setFontFamily] = useState<string>('IBM Plex Sans')
  const [fontWeight, setFontWeight] = useState<string>('400')
  const [isItalic, setIsItalic]     = useState(false)
  const [fontSize, setFontSize]     = useState(32)
  const [textWidth, setTextWidth]   = useState(400)
  const [lineHeight, setLineHeight] = useState(1.16)
  const [charSpacing, setCharSpacing] = useState(0)
  const [textColor, setTextColor]   = useState('#F6F2EA')

  // Shared / shape properties
  const [opacity, setOpacity]       = useState(1)
  const [fillColor, setFillColor]   = useState('#000000')
  const [strokeColor, setStrokeColor] = useState('#000000')
  const [strokeWidth, setStrokeWidth] = useState(0)
  const [radius, setRadius]         = useState(0)

  // Position
  const [posX, setPosX] = useState(0)
  const [posY, setPosY] = useState(0)

  // Image effects (0-100 scale for UI; mapped internally)
  const [effectBlur,       setEffectBlur]       = useState(0)
  const [effectBW,         setEffectBW]         = useState(0)
  const [effectBrightness, setEffectBrightness] = useState(0)   // -100 to 100
  const [effectContrast,   setEffectContrast]   = useState(0)   // -100 to 100

  // Preview mode
  const [isPreview, setIsPreview] = useState(false)

  // Effects popover
  const [showEffects, setShowEffects] = useState(false)
  const [effectsTab, setEffectsTab]   = useState<'blur' | 'filters' | 'adjust'>('blur')
  const [blurType, setBlurType]           = useState<BlurType>('gaussian')
  const [activePreset, setActivePreset]   = useState<string | null>(null)
  const [blurAngle,       setBlurAngle]       = useState(0)
  const [blurCenterX,     setBlurCenterX]     = useState(50)
  const [blurCenterY,     setBlurCenterY]     = useState(50)
  const [blurInnerRadius, setBlurInnerRadius] = useState(0)   // 0-100: sharp zone radius %
  const [filterIntensity, setFilterIntensity] = useState(100)

  // ── Toggle Fabric interactivity in preview mode ───────────────────────────────
  useEffect(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    if (isPreview) {
      canvas.discardActiveObject()
      canvas.selection = false
      canvas.getObjects().forEach((o: any) => { o.selectable = false; o.evented = false })
      canvas.renderAll()
      setSelectedObj(null)
    } else {
      canvas.selection = true
      canvas.getObjects().forEach((o: any) => {
        o.selectable = o._originalSelectable !== false
        o.evented    = true
      })
      canvas.renderAll()
    }
  }, [isPreview])

  // Google Fonts are now injected inside init() so we can await the link load
  // before calling document.fonts.load() — leaving this comment as a marker.

  // ── Scale canvas to fill available viewport space ─────────────────────────────
  useEffect(() => {
    const el = canvasAreaRef.current
    if (!el) return
    const ro = new ResizeObserver(() => {
      if (manualZoom.current) return          // user has manually zoomed — don't override
      const pad = 64
      const W = el.clientWidth  - pad * 2
      const H = el.clientHeight - pad * 2
      const scale = Math.min(W / DISPLAY_WIDTH, H / DISPLAY_HEIGHT, 1)
      setCanvasScale(Math.max(0.1, scale))
    })
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  // Keep canvasScaleRef in sync so wheel handler (captured once) always sees the latest value
  useEffect(() => { canvasScaleRef.current = canvasScale }, [canvasScale])

  // ── Scroll + Ctrl-scroll zoom ─────────────────────────────────────────────────
  useEffect(() => {
    const container = canvasAreaRef.current
    if (!container) return

    const handler = (e: WheelEvent) => {
      // Plain scroll → let the overflow:auto container handle it natively (smooth, GPU-accelerated)
      if (!e.ctrlKey) return

      // Ctrl+scroll → zoom to cursor, fully synchronous (no rAF, no React re-render in hot path)
      e.preventDefault()
      manualZoom.current = true

      const outer = canvasOuterRef.current
      const inner = canvasInnerRef.current
      if (!outer || !inner) return

      const oldScale = canvasScaleRef.current
      const delta    = e.deltaY < 0 ? 0.06 : -0.06
      const newScale = Math.max(0.1, Math.min(2, oldScale + delta))

      // 1. Read canvas viewport position BEFORE any DOM change
      const oRect = outer.getBoundingClientRect()
      const fx = (e.clientX - oRect.left) / oldScale   // canvas-space X under cursor
      const fy = (e.clientY - oRect.top)  / oldScale   // canvas-space Y under cursor

      // 2. Mutate DOM synchronously — bypasses React's render cycle entirely
      outer.style.width     = `${DISPLAY_WIDTH  * newScale}px`
      outer.style.height    = `${DISPLAY_HEIGHT * newScale}px`
      inner.style.transform = `scale(${newScale})`

      // 3. Read corrected rect immediately (DOM is already updated, no animation in flight)
      const newRect = outer.getBoundingClientRect()
      container.scrollLeft += (newRect.left + fx * newScale) - e.clientX
      container.scrollTop  += (newRect.top  + fy * newScale) - e.clientY

      // 4. Sync React state — reconciler will write the same pixel values, no visual change
      canvasScaleRef.current = newScale
      setCanvasScale(newScale)
    }

    container.addEventListener('wheel', handler, { passive: false })
    return () => container.removeEventListener('wheel', handler)
  }, [])

  // ── Ctrl+Left-Click pan ───────────────────────────────────────────────────────
  useEffect(() => {
    const container = canvasAreaRef.current
    if (!container) return

    let isPanning = false
    let lastX = 0
    let lastY = 0

    const stopPan = () => {
      if (!isPanning) return
      isPanning = false
      container.style.cursor = ''
      // Re-enable Fabric interaction
      const fc = fabricRef.current
      if (fc) { fc.selection = true; fc.defaultCursor = 'default' }
    }

    const onMouseDown = (e: MouseEvent) => {
      if (!e.ctrlKey || e.button !== 0) return
      isPanning = true
      lastX = e.clientX
      lastY = e.clientY
      container.style.cursor = 'grabbing'
      // Disable Fabric object selection while panning
      const fc = fabricRef.current
      if (fc) { fc.selection = false; fc.defaultCursor = 'grabbing'; fc.discardActiveObject(); fc.renderAll() }
      e.preventDefault()
    }

    const onMouseMove = (e: MouseEvent) => {
      if (!isPanning) return
      const dx = e.clientX - lastX
      const dy = e.clientY - lastY
      const pan  = panOffsetRef.current
      pan.x     += dx
      pan.y     += dy
      const outer = canvasOuterRef.current
      if (outer) outer.style.transform = `translate(${pan.x}px, ${pan.y}px)`
      lastX = e.clientX
      lastY = e.clientY
    }

    const onMouseUp  = () => stopPan()
    const onKeyUp = (e: KeyboardEvent) => { if (e.key === 'Control') stopPan() }

    container.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
    window.addEventListener('keyup', onKeyUp)

    return () => {
      container.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
      window.removeEventListener('keyup', onKeyUp)
    }
  }, [])

  // ── Pinch-to-resize selected element (mobile two-finger gesture) ──────────────
  useEffect(() => {
    const container = canvasAreaRef.current
    if (!container) return

    let isPinching   = false
    let initialDist  = 0
    let initScaleX   = 1
    let initScaleY   = 1
    let initFontSize = 32
    let initWidth    = 200
    let pinnedObj: any = null   // captured at touchstart — avoids getActiveObject() every frame
    let rafId: number | null = null
    let latestRatio  = 1

    function pinchDist(touches: TouchList) {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.hypot(dx, dy)
    }

    function applyScale(ratio: number) {
      const fc  = fabricRef.current
      const obj = pinnedObj
      if (!obj || !fc) return

      if (obj.type === 'textbox') {
        const newFontSize = Math.max(4, initFontSize * ratio)   // float — no rounding here
        const newWidth    = Math.max(20, initWidth * ratio)
        obj.set({ fontSize: newFontSize, width: newWidth, scaleX: 1, scaleY: 1 })
        obj.dirty = true
      } else {
        obj.set({
          scaleX: Math.max(0.05, initScaleX * ratio),
          scaleY: Math.max(0.05, initScaleY * ratio),
        })
      }

      obj.setCoords()
      fc.renderAll()   // synchronous — avoids queuing multiple deferred renders
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      const fc  = fabricRef.current
      const obj = fc?.getActiveObject()
      if (!obj) return

      isPinching   = true
      initialDist  = pinchDist(e.touches)
      initScaleX   = obj.scaleX  ?? 1
      initScaleY   = obj.scaleY  ?? 1
      initFontSize = obj.fontSize ?? 32
      initWidth    = obj.width    ?? 200
      pinnedObj    = obj
      latestRatio  = 1

      // Lock Fabric's own move/scale handling so it doesn't fight our transform
      obj.lockMovementX = true
      obj.lockMovementY = true
      fc.selection = false
      e.preventDefault()
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isPinching || e.touches.length !== 2) return
      e.preventDefault()

      latestRatio = pinchDist(e.touches) / initialDist

      // One RAF per display frame — prevents stacking renders faster than 60fps
      if (rafId === null) {
        rafId = requestAnimationFrame(() => {
          rafId = null
          applyScale(latestRatio)
        })
      }
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!isPinching) return
      if (e.touches.length < 2) {
        isPinching = false

        // Cancel any pending frame and apply the final ratio immediately
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
        applyScale(latestRatio)

        const obj = pinnedObj
        const fc  = fabricRef.current
        if (obj) {
          obj.lockMovementX = false
          obj.lockMovementY = false
        }
        if (fc) {
          fc.selection = true
          // Sync React panel state once after the gesture settles
          if (obj?.type === 'textbox') setFontSize(Math.round((obj.fontSize ?? 32) / SCALE))
        }
        pinnedObj = null
        pushUndo()
      }
    }

    container.addEventListener('touchstart',  onTouchStart, { passive: false })
    container.addEventListener('touchmove',   onTouchMove,  { passive: false })
    container.addEventListener('touchend',    onTouchEnd)
    container.addEventListener('touchcancel', onTouchEnd)

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      container.removeEventListener('touchstart',  onTouchStart)
      container.removeEventListener('touchmove',   onTouchMove)
      container.removeEventListener('touchend',    onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  // ── Pinch-to-zoom canvas (mobile, fires when no object is selected) ──────────
  useEffect(() => {
    const container = canvasAreaRef.current
    if (!container) return

    let isZooming    = false
    let zoomInitDist = 0
    let zoomInitScale = 1
    let latestRatio  = 1
    let latestMidX   = 0
    let latestMidY   = 0
    let rafId: number | null = null

    function dist(touches: TouchList) {
      const dx = touches[0].clientX - touches[1].clientX
      const dy = touches[0].clientY - touches[1].clientY
      return Math.hypot(dx, dy)
    }

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 2) return
      const obj = fabricRef.current?.getActiveObject()
      if (obj) return  // object selected → existing pinch-resize handler owns this gesture
      isZooming     = true
      zoomInitDist  = dist(e.touches)
      zoomInitScale = canvasScaleRef.current
      latestRatio   = 1
      e.preventDefault()
    }

    const onTouchMove = (e: TouchEvent) => {
      if (!isZooming || e.touches.length !== 2) return
      e.preventDefault()
      latestRatio = dist(e.touches) / zoomInitDist
      latestMidX  = (e.touches[0].clientX + e.touches[1].clientX) / 2
      latestMidY  = (e.touches[0].clientY + e.touches[1].clientY) / 2
      if (rafId !== null) return
      rafId = requestAnimationFrame(() => {
        rafId = null
        const outer = canvasOuterRef.current
        const inner = canvasInnerRef.current
        if (!outer || !inner) return
        const oldScale = canvasScaleRef.current
        const newScale = Math.max(0.1, Math.min(2, zoomInitScale * latestRatio))
        if (newScale === oldScale) return
        const oRect = outer.getBoundingClientRect()
        const fx = (latestMidX - oRect.left) / oldScale
        const fy = (latestMidY - oRect.top)  / oldScale
        outer.style.width     = `${DISPLAY_WIDTH  * newScale}px`
        outer.style.height    = `${DISPLAY_HEIGHT * newScale}px`
        inner.style.transform = `scale(${newScale})`
        const newRect = outer.getBoundingClientRect()
        container.scrollLeft += (newRect.left + fx * newScale) - latestMidX
        container.scrollTop  += (newRect.top  + fy * newScale) - latestMidY
        canvasScaleRef.current = newScale
        setCanvasScale(newScale)
        manualZoom.current = true
      })
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (!isZooming) return
      if (e.touches.length < 2) {
        isZooming = false
        if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null }
      }
    }

    container.addEventListener('touchstart',  onTouchStart, { passive: false })
    container.addEventListener('touchmove',   onTouchMove,  { passive: false })
    container.addEventListener('touchend',    onTouchEnd)
    container.addEventListener('touchcancel', onTouchEnd)
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      container.removeEventListener('touchstart',  onTouchStart)
      container.removeEventListener('touchmove',   onTouchMove)
      container.removeEventListener('touchend',    onTouchEnd)
      container.removeEventListener('touchcancel', onTouchEnd)
    }
  }, [])

  // ── Tap outside the post → deselect (mobile) ────────────────────────────────
  useEffect(() => {
    const container = canvasAreaRef.current
    if (!container) return

    let startX = 0, startY = 0

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return
      startX = e.touches[0].clientX
      startY = e.touches[0].clientY
    }

    const onTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return
      const t = e.changedTouches[0]
      if (Math.hypot(t.clientX - startX, t.clientY - startY) > 10) return // drag, not tap

      const outer = canvasOuterRef.current
      const fc    = fabricRef.current
      if (!outer || !fc || !fc.getActiveObject()) return

      const rect   = outer.getBoundingClientRect()
      const onPost = t.clientX >= rect.left && t.clientX <= rect.right &&
                     t.clientY >= rect.top  && t.clientY <= rect.bottom
      if (!onPost) {
        fc.discardActiveObject()
        fc.renderAll()
      }
    }

    container.addEventListener('touchstart', onTouchStart, { passive: true })
    container.addEventListener('touchend',   onTouchEnd,   { passive: true })
    return () => {
      container.removeEventListener('touchstart', onTouchStart)
      container.removeEventListener('touchend',   onTouchEnd)
    }
  }, [])

  // ── Sync UI state when selected object changes ────────────────────────────────
  useEffect(() => {
    if (!selectedObj) return
    const t = selectedObj.type ?? ''
    setPosX(Math.round((selectedObj.left ?? 0) / SCALE))
    setPosY(Math.round((selectedObj.top  ?? 0) / SCALE))
    setOpacity(selectedObj.opacity ?? 1)

    if (isText(t)) {
      setTextAlign(selectedObj.textAlign ?? 'left')
      setFontFamily(selectedObj.fontFamily ?? 'IBM Plex Sans')
      const w = String(selectedObj.fontWeight ?? '400')
      setFontWeight(w === 'bold' ? '700' : w === 'normal' ? '400' : w)
      setIsItalic(selectedObj.fontStyle === 'italic')
      setTextWidth(Math.round((selectedObj.width ?? 400) / SCALE))
      setFontSize(Math.round((selectedObj.fontSize ?? 32) / SCALE))
      setLineHeight(selectedObj.lineHeight ?? 1.16)
      setCharSpacing(selectedObj.charSpacing ?? 0)
      const fc = selectedObj.fill
      setTextColor(typeof fc === 'string' && fc.startsWith('#') ? fc : '#F6F2EA')
    }

    if (isRect(t) || isCircle(t)) {
      const fc = selectedObj.fill
      setFillColor(typeof fc === 'string' && fc.startsWith('#') ? fc : '#b68d40')
      setStrokeColor(selectedObj.stroke ?? '#000000')
      setStrokeWidth(selectedObj.strokeWidth ?? 0)
      if (isRect(t)) setRadius(selectedObj.rx ?? 0)
    }

    if (isImage(t)) {
      const fl = (selectedObj.filters ?? []) as any[]
      const bf = fl.find((f: any) => f.type === 'Blur')
      const sf = fl.find((f: any) => f.type === 'Saturation')
      const lf = fl.find((f: any) => f.type === 'Brightness')
      const cf = fl.find((f: any) => f.type === 'Contrast')
      const mf = fl.find((f: any) => f.type === 'Convolute')
      const rf = fl.find((f: any) => f.type === 'Blur' && f._blurType === 'radial')
      const blurAmt   = selectedObj._blurAmount      != null ? selectedObj._blurAmount      : (bf ? Math.round(bf.blur * 100) : 0)
      const bwAmt     = selectedObj._effectBW        != null ? selectedObj._effectBW        : (sf ? Math.round(-(sf.saturation) * 100) : 0)
      const brightAmt = selectedObj._effectBrightness!= null ? selectedObj._effectBrightness: (lf ? Math.round(lf.brightness * 100) : 0)
      const contAmt   = selectedObj._effectContrast  != null ? selectedObj._effectContrast  : (cf ? Math.round(cf.contrast * 100) : 0)
      const blurT     = selectedObj._blurType ?? (mf ? (mf._blurType ?? 'motion') : (rf ? 'radial' : 'gaussian'))
      const blurAng   = selectedObj._blurAngle   ?? 0
      const blurCX    = selectedObj._blurCenterX  ?? 50
      const blurCY    = selectedObj._blurCenterY  ?? 50
      const blurIR    = selectedObj._blurInnerRadius ?? 0
      const intensity = selectedObj._filterIntensity ?? 100
      const preset    = selectedObj._activePreset ?? null
      setEffectBlur(blurAmt)
      setEffectBW(bwAmt)
      setEffectBrightness(brightAmt)
      setEffectContrast(contAmt)
      setBlurType(blurT as BlurType)
      setBlurAngle(blurAng)
      setBlurCenterX(blurCX)
      setBlurCenterY(blurCY)
      setBlurInnerRadius(blurIR)
      setFilterIntensity(intensity)
      setActivePreset(preset)
      // Re-apply filters from stored metadata to ensure Fabric visual state is
      // always in sync — guards against restoreFilters() not firing correctly on load.
      if (blurAmt > 0 || preset || bwAmt || brightAmt || contAmt) {
        applyFilters(blurAmt, blurT as BlurType, bwAmt, brightAmt, contAmt, preset, intensity, blurAng, blurCX, blurCY, blurIR)
      }
    } else {
      setEffectBlur(0); setEffectBW(0); setEffectBrightness(0); setEffectContrast(0)
      setBlurType('gaussian'); setBlurAngle(0); setBlurCenterX(50); setBlurCenterY(50)
      setBlurInnerRadius(0); setFilterIntensity(100); setActivePreset(null)
    }
  }, [selectedObj])

  // ── Refresh layers list ───────────────────────────────────────────────────────
  const refreshLayers = useCallback(() => {
    const canvas = fabricRef.current
    if (!canvas) return
    const objs = [...canvas.getObjects()].reverse()
    setLayers(objs.map((o: any) => ({ lumenId: o.lumenId ?? o.type ?? 'layer', type: o.type ?? '' })))
  }, [])

  // ── Keyboard hotkeys (Del, Ctrl+C, Ctrl+V) ───────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const canvas = fabricRef.current
      if (!canvas) return
      const tag  = (document.activeElement as HTMLElement)?.tagName
      const inputType = (document.activeElement as HTMLInputElement)?.type ?? ''
      const isTyping = tag === 'INPUT' || tag === 'TEXTAREA'
      // isTextTyping: true only for text-entry inputs — excludes range/color/number so Ctrl+Z/Y still work
      const isTextTyping = isTyping && !['range', 'color', 'number'].includes(inputType)
      const activeObj = canvas.getActiveObject()
      // Never steal keystrokes while a Fabric textbox is in edit mode
      if (activeObj?.isEditing) return

      // Delete / Backspace — remove selected object(s)
      if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping) {
        if (!activeObj) return
        e.preventDefault()
        if ((activeObj.type ?? '').toLowerCase() === 'activeselection') {
          // Multi-select: remove each member first, then discard the now-empty selection
          const toRemove = ((activeObj as any).getObjects() as any[]).slice()
          toRemove.forEach((o: any) => canvas.remove(o))
          canvas.discardActiveObject()
        } else {
          canvas.remove(activeObj)
          canvas.discardActiveObject()
        }
        canvas.renderAll()
        setSelectedObj(null)
        refreshLayers()
      }

      // Ctrl+C — copy active object to clipboard
      if (e.ctrlKey && e.key === 'c') {
        if (activeObj) { clipboardRef.current = activeObj; e.preventDefault() }
      }

      // Ctrl+Z — undo
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey && !isTextTyping) {
        e.preventDefault()
        performUndo()
        return
      }

      // Ctrl+Y / Ctrl+Shift+Z — redo
      if (e.ctrlKey && (e.key === 'y' || (e.shiftKey && e.key === 'z')) && !isTextTyping) {
        e.preventDefault()
        performRedo()
        return
      }

      // Ctrl+V — paste clipboard object with offset
      if (e.ctrlKey && e.key === 'v') {
        const src = clipboardRef.current
        if (!src) return
        e.preventDefault()
        src.clone().then((clone: any) => {
          clone.set({ left: (src.left ?? 0) + 24, top: (src.top ?? 0) + 24 })
          clone.lumenId = `${src.lumenId ?? 'obj'}_paste_${Date.now()}`
          if (src._originalSrc) clone._originalSrc = src._originalSrc
          canvas.add(clone)
          canvas.setActiveObject(clone)
          canvas.renderAll()
          setSelectedObj(clone)
          refreshLayers()
        })
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [refreshLayers])

  // ── Load an image via plain <img> ─────────────────────────────────────────────
  function loadImageElement(url: string): Promise<HTMLImageElement> {
    return new Promise((resolve, reject) => {
      const el = new Image()
      el.crossOrigin = 'anonymous'
      el.onload  = () => resolve(el)
      el.onerror = () => reject(new Error(`Failed to load image: ${url}`))
      el.src = url
    })
  }

  // ── Build a Fabric object from stored 1080-space JSON ─────────────────────────
  async function buildFabricObject(src: any): Promise<any> {
    const { Rect, Textbox, FabricImage, Circle } = await import('fabric')
    const type = (src.type ?? '').toLowerCase()

    const width  = (src.width  ?? 200) * SCALE
    const height = (src.height ?? 100) * SCALE
    const left   = (src.left   ?? 0)   * SCALE
    const top    = (src.top    ?? 0)   * SCALE

    let obj: any = null
    const origin = { originX: 'left' as const, originY: 'top' as const }

    // Restore serialised Fabric image filters (color grades + non-radial blurs).
    // Radial spin blur is NOT restored here — it is re-applied after the object is
    // selected via the selectedObj effect calling applyFilters() with stored metadata.
    async function restoreFilters(target: any, srcFilters: any[] | undefined) {
      if (!srcFilters?.length) return
      const { filters: fab } = await import('fabric')
      target.filters = srcFilters.map((f: any) => {
        // Skip radial Blur entries — spin blur is handled separately
        if (f.type === 'Blur' && f.blurType === 'radial') return null
        if (f.type === 'Blur')        { const ff = new (fab as any).Blur({ blur: f.blur }); if (f.blurType) ff._blurType = f.blurType; return ff }
        if (f.type === 'Saturation')  return new (fab as any).Saturation({ saturation: f.saturation })
        if (f.type === 'Brightness')  return new (fab as any).Brightness({ brightness: f.brightness })
        if (f.type === 'Contrast')    return new (fab as any).Contrast({ contrast: f.contrast })
        if (f.type === 'HueRotation') return new (fab as any).HueRotation({ rotation: f.rotation })
        if (f.type === 'Convolute')   { const ff = new (fab as any).Convolute({ matrix: f.matrix }); ff._blurType = f.blurType; if (f.angle != null) ff._angle = f.angle; return ff }
        return null
      }).filter(Boolean)
      target.applyFilters()
    }

    if (src.src && !isText(type) && !isCircle(type)) {
      try {
        const el = await loadImageElement(src.src)
        obj = new FabricImage(el)
        obj.set({ left, top, scaleX: width / (obj.width || 1), scaleY: height / (obj.height || 1), opacity: src.opacity ?? 1, selectable: src.selectable !== false, ...origin })
        ;(obj as any)._originalSrc = src.src
        await restoreFilters(obj, src.filters)
        // Restore blur/filter metadata stored at the image-object level
        if (src.blurAmount         != null) (obj as any)._blurAmount         = src.blurAmount
        if (src.blurType)                   (obj as any)._blurType            = src.blurType
        if (src.blurAngle          != null) (obj as any)._blurAngle           = src.blurAngle
        if (src.blurCenterX        != null) (obj as any)._blurCenterX         = src.blurCenterX
        if (src.blurCenterY        != null) (obj as any)._blurCenterY         = src.blurCenterY
        if (src.blurInnerRadius    != null) (obj as any)._blurInnerRadius     = src.blurInnerRadius
        if (src.filterIntensity    != null) (obj as any)._filterIntensity     = src.filterIntensity
        if (src.activePreset       != null) (obj as any)._activePreset        = src.activePreset
        if (src.effectBW           != null) (obj as any)._effectBW            = src.effectBW
        if (src.effectBrightness   != null) (obj as any)._effectBrightness    = src.effectBrightness
        if (src.effectContrast     != null) (obj as any)._effectContrast      = src.effectContrast
      } catch {
        obj = new Rect({ left, top, width, height, fill: resolveCSSVar('var(--surface-2)'), selectable: src.selectable !== false, ...origin })
      }
    } else if (isRect(type)) {
      obj = new Rect({ left, top, width, height, fill: resolveCSSVar(src.fill ?? 'transparent'), opacity: src.opacity ?? 1, angle: src.angle ?? 0, rx: src.rx ?? 0, ry: src.ry ?? 0, stroke: src.stroke ? resolveCSSVar(src.stroke) : null, strokeWidth: src.strokeWidth ?? 0, selectable: src.selectable !== false, ...origin })
    } else if (isCircle(type)) {
      obj = new Circle({ left, top, radius: (src.radius ?? 50) * SCALE, fill: resolveCSSVar(src.fill ?? 'var(--candle)'), opacity: src.opacity ?? 1, angle: src.angle ?? 0, stroke: src.stroke ? resolveCSSVar(src.stroke) : null, strokeWidth: src.strokeWidth ?? 0, selectable: src.selectable !== false, ...origin })
    } else if (isText(type)) {
      // Apply scaleX to width — canvas_json from old pool templates may carry scaleX != 1
      const srcScaleX = src.scaleX ?? 1
      const textWidth = width * srcScaleX

      obj = new Textbox(src.text ?? '', {
        left, top,
        width: textWidth,
        fontSize:    (src.fontSize  ?? 32)  * SCALE,
        fontFamily:  src.fontFamily  ?? 'sans-serif',
        fontWeight:  src.fontWeight  ?? 'normal',
        fontStyle:   src.fontStyle   ?? 'normal',
        fill:        resolveCSSVar(src.fill ?? 'var(--parchment)'),
        lineHeight:  src.lineHeight  ?? 1.16,
        textAlign:   src.textAlign   ?? 'left',
        charSpacing: src.charSpacing ?? (src.letterSpacing && src.fontSize
          ? Math.round(src.letterSpacing / src.fontSize * 1000)
          : 0),
        ...(src.padding != null ? { padding: src.padding } : {}),
        opacity:      src.opacity     ?? 1,
        angle:        src.angle       ?? 0,
        selectable:   src.selectable !== false,
        editable:     true,
        lockScalingY: false,
        ...origin,
      })
      ;(obj as any).setControlsVisibility({ mb: true })

      // ── CSS word-wrap calibration ─────────────────────────────────────────────
      // Fabric uses Canvas 2D ctx.measureText() which can measure diacritical
      // characters (č, á, ž …) 3-8% narrower than CSS. For borderline text this
      // causes the editor to show a single clipped line while the render wraps.
      //
      // Fix: simulate CSS word-wrap using DOM spans (fonts are already loaded —
      // init() awaits document.fonts.ready before calling buildFabricObject).
      // When CSS would wrap, insert explicit \n at the same break points so Fabric
      // renders identical line breaks WITHOUT touching width/left/textAlign.
      // The original text (no \n) is stored in _originalText and written back on
      // save so the canvas_json stays clean.
      const textStr = src.text ?? ''
      if (!textStr.includes('\n') && textStr.includes(' ') && textWidth > 0) {
        try {
          const displayFontSize = (src.fontSize ?? 32) * SCALE
          const charSpacingCSS = src.charSpacing
            ? `letter-spacing:${src.charSpacing / 1000}em`
            : src.letterSpacing
            ? `letter-spacing:${(src.letterSpacing as number) * SCALE}px`
            : ''
          const fontCSS = [
            'position:absolute', 'visibility:hidden', 'top:-9999px', 'left:-9999px',
            'white-space:nowrap',
            `font-size:${displayFontSize}px`,
            `font-family:'${src.fontFamily ?? 'sans-serif'}',sans-serif`,
            `font-weight:${src.fontWeight ?? 'normal'}`,
            `font-style:${src.fontStyle ?? 'normal'}`,
            charSpacingCSS,
          ].filter(Boolean).join(';')

          const probe = document.createElement('span')
          probe.setAttribute('style', fontCSS)
          document.body.appendChild(probe)

          probe.textContent = textStr
          const cssFullWidth = probe.offsetWidth

          if (cssFullWidth > textWidth) {
            // Simulate full CSS word-wrap to collect every line break point.
            const words = textStr.split(' ')
            const lines: string[] = []
            let line = ''
            for (const word of words) {
              const candidate = line ? `${line} ${word}` : word
              probe.textContent = candidate
              if (probe.offsetWidth > textWidth && line) {
                lines.push(line)
                line = word
              } else {
                line = candidate
              }
            }
            if (line) lines.push(line)

            if (lines.length > 1) {
              const ta = src.textAlign ?? obj.textAlign ?? 'left'
              obj.set({ text: lines.join('\n') })
              // Re-apply textAlign: Fabric can reset it internally when text changes
              obj.set({ textAlign: ta })
            }
          }

          document.body.removeChild(probe)
        } catch {
          // DOM measurement unavailable — leave text unchanged
        }
      }
    } else if (isImage(type) && src.src) {
      try {
        const el = await loadImageElement(src.src)
        obj = new FabricImage(el)
        obj.set({ left, top, scaleX: width / (obj.width || 1), scaleY: height / (obj.height || 1), opacity: src.opacity ?? 1, selectable: src.selectable !== false, ...origin })
        ;(obj as any)._originalSrc = src.src
        await restoreFilters(obj, src.filters)
        // Restore blur/filter metadata stored at the image-object level
        if (src.blurAmount         != null) (obj as any)._blurAmount         = src.blurAmount
        if (src.blurType)                   (obj as any)._blurType            = src.blurType
        if (src.blurAngle          != null) (obj as any)._blurAngle           = src.blurAngle
        if (src.blurCenterX        != null) (obj as any)._blurCenterX         = src.blurCenterX
        if (src.blurCenterY        != null) (obj as any)._blurCenterY         = src.blurCenterY
        if (src.blurInnerRadius    != null) (obj as any)._blurInnerRadius     = src.blurInnerRadius
        if (src.filterIntensity    != null) (obj as any)._filterIntensity     = src.filterIntensity
        if (src.activePreset       != null) (obj as any)._activePreset        = src.activePreset
        if (src.effectBW           != null) (obj as any)._effectBW            = src.effectBW
        if (src.effectBrightness   != null) (obj as any)._effectBrightness    = src.effectBrightness
        if (src.effectContrast     != null) (obj as any)._effectContrast      = src.effectContrast
      } catch {
        obj = new Rect({ left, top, width, height, fill: resolveCSSVar('var(--surface-2)'), selectable: src.selectable !== false, ...origin })
      }
    }

    if (obj) obj.lumenId = src.lumenId ?? src.type
    return obj
  }

  // ── Serialize canvas back to 1080-space JSON ──────────────────────────────────
  function collectCanvasJson(): any {
    const canvas = fabricRef.current
    if (!canvas) return templateJson

    if (((canvas.getActiveObject()?.type) ?? '').toLowerCase() === 'activeselection') {
      canvas.discardActiveObject()
    }

    const objects = canvas.getObjects().map((obj: any) => {
      const t      = (obj.type ?? '').toLowerCase()
      const scaleX = obj.scaleX ?? 1
      const scaleY = obj.scaleY ?? 1

      const base: any = {
        type:       obj.type,
        lumenId:    obj.lumenId ?? obj.type,
        left:       Math.round((obj.left  ?? 0) / SCALE),
        top:        Math.round((obj.top   ?? 0) / SCALE),
        opacity:    obj.opacity ?? 1,
        angle:      obj.angle   ?? 0,
        fill:       obj.fill    ?? 'transparent',
        selectable: obj.selectable !== false,
      }

      if (isText(t)) {
        base.width      = Math.round((obj.width  ?? 200) * scaleX / SCALE)
        base.height     = Math.round((obj.height ?? 100) * scaleY / SCALE)
        base.text       = obj.text ?? ''
        base.fontSize   = Math.round((obj.fontSize ?? 32) / SCALE)
        base.fontFamily = obj.fontFamily ?? 'sans-serif'
        base.fontWeight = obj.fontWeight ?? 'normal'
        base.fontStyle  = obj.fontStyle  ?? 'normal'
        base.textAlign  = obj.textAlign  ?? 'left'
        base.lineHeight = obj.lineHeight ?? 1.16
        base.charSpacing = obj.charSpacing ?? 0
        if (obj.padding != null) base.padding = obj.padding
      } else if (isCircle(t)) {
        const r = Math.round((obj.radius ?? 50) * scaleX / SCALE)
        base.radius = r
        base.width  = r * 2
        base.height = r * 2
        if (obj.stroke) { base.stroke = obj.stroke; base.strokeWidth = obj.strokeWidth ?? 0 }
      } else if (isRect(t)) {
        base.width  = Math.round((obj.width  ?? 200) * scaleX / SCALE)
        base.height = Math.round((obj.height ?? 100) * scaleY / SCALE)
        base.rx     = Math.round((obj.rx ?? 0) / SCALE)
        base.ry     = Math.round((obj.ry ?? 0) / SCALE)
        if (obj.stroke) { base.stroke = obj.stroke; base.strokeWidth = obj.strokeWidth ?? 0 }
      } else if (isImage(t)) {
        base.width  = Math.round((obj.width  ?? 200) * scaleX / SCALE)
        base.height = Math.round((obj.height ?? 100) * scaleY / SCALE)
        base.src    = (obj as any)._originalSrc ?? obj.getSrc?.() ?? (obj as any)._element?.src ?? ''
        base.type   = 'image'
        const serializedFilters = ((obj.filters ?? []) as any[]).map((f: any) => {
          if (f.type === 'Blur')        return { type: 'Blur',        blur:       f.blur, ...(f._blurType ? { blurType: f._blurType } : {}) }
          if (f.type === 'Saturation')  return { type: 'Saturation',  saturation: f.saturation }
          if (f.type === 'Brightness')  return { type: 'Brightness',  brightness: f.brightness }
          if (f.type === 'Contrast')    return { type: 'Contrast',    contrast:   f.contrast }
          if (f.type === 'HueRotation') return { type: 'HueRotation', rotation:   f.rotation }
          if (f.type === 'Convolute')   return { type: 'Convolute',   matrix:     f.matrix, blurType: f._blurType, ...(f._angle != null ? { angle: f._angle } : {}) }
          return null
        }).filter(Boolean)
        if (serializedFilters.length > 0) base.filters = serializedFilters
        // Persist image-level blur/filter metadata for render engine
        if ((obj as any)._blurAmount         != null) base.blurAmount         = (obj as any)._blurAmount
        if ((obj as any)._blurType)                   base.blurType           = (obj as any)._blurType
        if ((obj as any)._blurAngle          != null) base.blurAngle          = (obj as any)._blurAngle
        if ((obj as any)._blurCenterX        != null) base.blurCenterX        = (obj as any)._blurCenterX
        if ((obj as any)._blurCenterY        != null) base.blurCenterY        = (obj as any)._blurCenterY
        if ((obj as any)._blurInnerRadius    != null) base.blurInnerRadius    = (obj as any)._blurInnerRadius
        if ((obj as any)._filterIntensity    != null) base.filterIntensity    = (obj as any)._filterIntensity
        if ((obj as any)._activePreset       != null) base.activePreset       = (obj as any)._activePreset
        if ((obj as any)._effectBW           != null) base.effectBW           = (obj as any)._effectBW
        if ((obj as any)._effectBrightness   != null) base.effectBrightness   = (obj as any)._effectBrightness
        if ((obj as any)._effectContrast     != null) base.effectContrast     = (obj as any)._effectContrast
      }

      return base
    })

    return {
      version:    templateJson?.version ?? '5.3.0',
      background: canvas.backgroundColor ?? resolveCSSVar(templateJson?.background ?? 'var(--carbon)'),
      width:      CANVAS_WIDTH,
      height:     CANVAS_HEIGHT,
      objects,
    }
  }

  // ── History helpers ───────────────────────────────────────────────────────────
  //
  // KEY INSIGHT: object:modified fires AFTER the canvas has already changed, so
  // capturing state there and pushing it to undoStack gives the NEW state — undo
  // would pop it, restore the same thing, and nothing would change visually.
  //
  // CORRECT PATTERN:
  //   • `lastSavedState` always holds the canvas JSON *before* the last action.
  //   • `pushUndo()` pushes lastSavedState (= before-state) to undoStack,
  //     then refreshes lastSavedState to the current (after-state).
  //   • `performUndo` pushes current state to redoStack, pops before-state, reloads it.
  //   • `reloadCanvas` holds `serializing = true` for its full duration so
  //     object:added / object:removed events don't corrupt the stacks.
  //
  function pushUndo() {
    if (serializing.current) return
    const before = lastSavedState.current
    // Capture the after-state and update lastSavedState for the next action
    serializing.current = true
    let after = before
    try {
      after = JSON.stringify(collectCanvasJson())
    } finally {
      serializing.current = false
    }
    if (!before || before === after) return   // nothing actually changed
    undoStack.current.push(before)            // ← push the BEFORE state
    if (undoStack.current.length > 40) undoStack.current.shift()
    redoStack.current = []
    lastSavedState.current = after

  }

  async function performUndo() {

    if (undoStack.current.length === 0) return
    // Save current state to redo stack (current = lastSavedState at this point)
    serializing.current = true
    const current = JSON.stringify(collectCanvasJson())
    serializing.current = false
    redoStack.current.push(current)
    const prev = undoStack.current.pop()!
    await reloadCanvas(JSON.parse(prev))
  }

  async function performRedo() {

    if (redoStack.current.length === 0) return
    serializing.current = true
    const current = JSON.stringify(collectCanvasJson())
    serializing.current = false
    undoStack.current.push(current)
    lastSavedState.current = current
    const next = redoStack.current.pop()!
    await reloadCanvas(JSON.parse(next))
  }

  async function reloadCanvas(json: any) {
    const canvas = fabricRef.current
    if (!canvas) return
    // Hold serializing = true for the entire reload so that object:added /
    // object:removed events can't call pushUndo on partial canvas state.
    serializing.current = true
    try {
      canvas.clear()
      for (const src of json.objects ?? []) {
        try {
          const obj = await buildFabricObject(src)
          if (obj) canvas.add(obj)
        } catch {}
      }
      canvas.renderAll()
      setSelectedObj(null)
      refreshLayers()
      // Settle lastSavedState to the freshly-restored canvas
      lastSavedState.current = JSON.stringify(collectCanvasJson())
    } finally {
      serializing.current = false
    }
  }

  // ── Init ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    let canvas: any
    let mounted = true

    async function init() {
      // 1. Ensure the Google Fonts <link> is in the document and WAIT for it to
      //    parse — document.fonts.load() only works after @font-face rules exist.
      const fontLinkId = 'lumen-editor-fonts'
      let fontLink = document.getElementById(fontLinkId) as HTMLLinkElement | null
      if (!fontLink) {
        fontLink = document.createElement('link')
        fontLink.id = fontLinkId
        fontLink.rel = 'stylesheet'
        fontLink.href = FONTS_URL
        document.head.appendChild(fontLink)
      }
      // If the stylesheet hasn't loaded yet, wait for it (non-fatal on error)
      if (!fontLink.sheet) {
        await new Promise<void>(resolve => {
          fontLink!.addEventListener('load',  () => resolve(), { once: true })
          fontLink!.addEventListener('error', () => resolve(), { once: true })
        })
      }

      // 2. Force-load every weight/style we use so Fabric measures text correctly.
      try {
        await Promise.race([
          Promise.all(
            FONTS.flatMap(f => [
              document.fonts.load(`300 16px '${f.value}'`),
              document.fonts.load(`400 16px '${f.value}'`),
              document.fonts.load(`700 16px '${f.value}'`),
              document.fonts.load(`italic 300 16px '${f.value}'`),
              document.fonts.load(`italic 400 16px '${f.value}'`),
              document.fonts.load(`italic 700 16px '${f.value}'`),
            ])
          ),
          new Promise<void>(resolve => setTimeout(resolve, 6000)),
        ])
      } catch { /* font load errors are non-fatal */ }
      // Give the browser's font pipeline time to commit loaded fonts to Canvas2D
      try { await (document as any).fonts.ready } catch {}
      await new Promise<void>(r => requestAnimationFrame(() => r()))
      await new Promise<void>(r => requestAnimationFrame(() => r()))
      const { Canvas } = await import('fabric')
      if (!mounted || !canvasRef.current) return
      if (canvasRef.current.hasAttribute('data-fabric')) return

      const isTouchDevice = typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches
      canvas = new Canvas(canvasRef.current, {
        width:  DISPLAY_WIDTH,
        height: DISPLAY_HEIGHT,
        enableRetinaScaling: false,
        selection: !isTouchDevice,
        preserveObjectStacking: true,
      })
      canvas.backgroundColor = resolveCSSVar(templateJson?.background ?? 'var(--carbon)')
      fabricRef.current = canvas

      const lowerEl   = (canvas as any).lowerCanvasEl as HTMLCanvasElement
      const upperEl   = (canvas as any).upperCanvasEl as HTMLCanvasElement | undefined
      const wrapperEl = (canvas as any).wrapperEl as HTMLElement | undefined
      ;[lowerEl, upperEl, wrapperEl].forEach(el => {
        if (el) { el.style.width = `${DISPLAY_WIDTH}px`; el.style.height = `${DISPLAY_HEIGHT}px` }
      })

      for (const src of templateJson?.objects ?? []) {
        if (!mounted) break
        try {
          const obj = await buildFabricObject(src)
          if (obj) canvas.add(obj)
        } catch (err) {
          console.error('[CanvasEditor] object error:', src?.lumenId, err)
        }
      }

      if (!mounted) return
      canvas.renderAll()
      refreshLayers()
      setReady(true)

      // Seed the baseline so the first user action has a valid before-state to push.
      // serializing is used here just to suppress the discardActiveObject event inside collectCanvasJson.
      serializing.current = true
      lastSavedState.current = JSON.stringify(collectCanvasJson())
      serializing.current = false


      canvas.on('selection:created', () => { setSelectedObj(canvas.getActiveObject() ?? null); if (window.innerWidth > 767) setRightPanelMinimized(false) })
      canvas.on('selection:updated', () => { setSelectedObj(canvas.getActiveObject() ?? null); if (window.innerWidth > 767) setRightPanelMinimized(false) })
      canvas.on('selection:cleared', () => setSelectedObj(null))

      canvas.on('object:added',    () => { refreshLayers(); pushUndo() })
      canvas.on('object:removed',  () => { refreshLayers(); pushUndo() })
      canvas.on('object:modified', (e: any) => {
        refreshLayers()
        pushUndo()

        // If an object is dragged completely off-canvas, return it to centre
        const obj = e.target
        if (!obj) return
        const oW = (obj.width  ?? 0) * (obj.scaleX ?? 1)
        const oH = (obj.height ?? 0) * (obj.scaleY ?? 1)
        const oL = obj.left ?? 0
        const oT = obj.top  ?? 0
        const fullyOutside =
          oL + oW < 0 || oL > DISPLAY_WIDTH ||
          oT + oH < 0 || oT > DISPLAY_HEIGHT
        if (fullyOutside) {
          obj.set({ left: (DISPLAY_WIDTH - oW) / 2, top: (DISPLAY_HEIGHT - oH) / 2 })
          obj.setCoords()
          canvas.requestRenderAll()
        }
      })

      // Textbox scaling: scale fontSize proportionally
      canvas.on('object:scaling', (e: any) => {
        const obj = e.target
        if (!obj || obj.type !== 'textbox') return
        const sx = obj.scaleX ?? 1
        const sy = obj.scaleY ?? 1
        const scale = Math.max(sx, sy)
        const newFontSize = Math.max(4, Math.round((obj.fontSize ?? 32) * scale))
        const newWidth    = Math.max(20, (obj.width ?? 200) * sx)
        obj.set({ fontSize: newFontSize, width: newWidth, scaleX: 1, scaleY: 1 })
        obj.dirty = true
        obj.setCoords()
        setFontSize(Math.round(newFontSize / SCALE))
      })

      // ── Alignment guides + snapping ──────────────────────────────────────────
      const SNAP_THRESHOLD = 6
      const GUIDE_COLOR    = resolveCSSVar('var(--candle)')

      function drawGuides(hLines: number[], vLines: number[]) {
        const gc = guideRef.current
        if (!gc) return
        const ctx = gc.getContext('2d')!
        ctx.clearRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT)
        ctx.strokeStyle = GUIDE_COLOR
        ctx.lineWidth   = 1
        ctx.setLineDash([4, 3])
        hLines.forEach(y => { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(DISPLAY_WIDTH, y); ctx.stroke() })
        vLines.forEach(x => { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, DISPLAY_HEIGHT); ctx.stroke() })
      }

      function clearGuides() {
        const gc = guideRef.current
        if (!gc) return
        gc.getContext('2d')!.clearRect(0, 0, DISPLAY_WIDTH, DISPLAY_HEIGHT)
      }

      canvas.on('object:moving', (e: any) => {
        const obj = e.target
        if (!obj) return

        // ActiveSelection (and Group) uses originX:'center' so obj.left/top IS the center,
        // not the top-left corner.  Regular objects use originX:'left'.
        const isAS   = (obj.type ?? '').toLowerCase() === 'activeselection'
        const oWidth  = (obj.width  ?? 0) * (obj.scaleX ?? 1)
        const oHeight = (obj.height ?? 0) * (obj.scaleY ?? 1)
        const oLeft   = isAS ? (obj.left ?? 0) - oWidth  / 2 : (obj.left ?? 0)
        const oTop    = isAS ? (obj.top  ?? 0) - oHeight / 2 : (obj.top  ?? 0)
        const oCenterX = oLeft + oWidth  / 2
        const oCenterY = oTop  + oHeight / 2
        const oRight   = oLeft + oWidth
        const oBottom  = oTop  + oHeight

        const cCX = DISPLAY_WIDTH  / 2
        const cCY = DISPLAY_HEIGHT / 2

        const hGuides: number[] = []
        const vGuides: number[] = []
        let snapLeft = oLeft
        let snapTop  = oTop

        function trySnapV(val: number, target: number, guide: number[]): number {
          if (Math.abs(val - target) <= SNAP_THRESHOLD) { guide.push(target); return target }
          return val
        }

        snapLeft = trySnapV(oCenterX, cCX, vGuides) - oWidth / 2
        const snapL1 = trySnapV(oLeft, cCX, vGuides)
        if (snapL1 !== oLeft) snapLeft = snapL1
        const snapR1 = trySnapV(oRight, cCX, vGuides)
        if (snapR1 !== oRight) snapLeft = snapR1 - oWidth

        snapTop = trySnapV(oCenterY, cCY, hGuides) - oHeight / 2
        const snapT1 = trySnapV(oTop, cCY, hGuides)
        if (snapT1 !== oTop) snapTop = snapT1
        const snapB1 = trySnapV(oBottom, cCY, hGuides)
        if (snapB1 !== oBottom) snapTop = snapB1 - oHeight

        snapLeft = trySnapV(oLeft, 0, vGuides)
        const snapR2 = trySnapV(oRight, DISPLAY_WIDTH, vGuides)
        if (snapR2 !== oRight) snapLeft = snapR2 - oWidth
        snapTop = trySnapV(oTop, 0, hGuides)
        const snapB2 = trySnapV(oBottom, DISPLAY_HEIGHT, hGuides)
        if (snapB2 !== oBottom) snapTop = snapB2 - oHeight

        canvas.getObjects().forEach((other: any) => {
          if (other === obj) return
          const oW2 = (other.width  ?? 0) * (other.scaleX ?? 1)
          const oH2 = (other.height ?? 0) * (other.scaleY ?? 1)
          const otherL  = other.left ?? 0
          const otherT  = other.top  ?? 0
          const otherR  = otherL + oW2
          const otherB  = otherT + oH2
          const otherCX = otherL + oW2 / 2
          const otherCY = otherT + oH2 / 2

          for (const srcX of [oLeft, oCenterX, oRight]) {
            for (const tgtX of [otherL, otherCX, otherR]) {
              const s = trySnapV(srcX, tgtX, vGuides)
              if (s !== srcX) snapLeft = s - (srcX - oLeft)
            }
          }
          for (const srcY of [oTop, oCenterY, oBottom]) {
            for (const tgtY of [otherT, otherCY, otherB]) {
              const s = trySnapV(srcY, tgtY, hGuides)
              if (s !== srcY) snapTop = s - (srcY - oTop)
            }
          }
        })

        // Convert snap coords (always left/top edge) back to what Fabric expects per origin
        const finalLeft = isAS ? snapLeft + oWidth  / 2 : snapLeft
        const finalTop  = isAS ? snapTop  + oHeight / 2 : snapTop
        obj.set({ left: finalLeft, top: finalTop })
        obj.setCoords()
        // When moving an ActiveSelection, force each textbox member to re-render —
        // Fabric doesn't dirty-flag text objects inside the group automatically,
        // causing the text content to lag behind its bounding box.
        if ((obj.type ?? '').toLowerCase() === 'activeselection') {
          ;(obj as any).getObjects().forEach((member: any) => {
            member.setCoords()
            if (isText(member.type ?? '')) member.dirty = true
          })
        }
        drawGuides(hGuides, vGuides)
      })

      canvas.on('object:modified', clearGuides)
      canvas.on('mouse:up',        clearGuides)
    }

    init().catch(err => {
      console.error('[CanvasEditor] init failed:', err)
      setError(String(err?.message ?? err))
    })

    return () => {
      mounted = false
      try { canvas?.dispose() } catch { /* ignore */ }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Layer ordering ─────────────────────────────────────────────────────────────
  function moveLayerUp(lumenId: string) {
    const canvas = fabricRef.current
    if (!canvas) return
    const obj = canvas.getObjects().find((o: any) => (o.lumenId ?? o.type) === lumenId)
    if (!obj) return
    canvas.bringObjectForward(obj)
    canvas.renderAll()
    refreshLayers()
  }

  function moveLayerDown(lumenId: string) {
    const canvas = fabricRef.current
    if (!canvas) return
    const obj = canvas.getObjects().find((o: any) => (o.lumenId ?? o.type) === lumenId)
    if (!obj) return
    canvas.sendObjectBackwards(obj)
    canvas.renderAll()
    refreshLayers()
  }

  function selectLayer(lumenId: string) {
    const canvas = fabricRef.current
    if (!canvas) return
    const obj = canvas.getObjects().find((o: any) => (o.lumenId ?? o.type) === lumenId)
    if (!obj) return
    canvas.setActiveObject(obj)
    canvas.renderAll()
    setSelectedObj(obj)
  }

  // ── Add shapes ────────────────────────────────────────────────────────────────
  async function addLayer(shapeType: 'rect' | 'circle' | 'textbox') {
    const canvas = fabricRef.current
    if (!canvas) return
    const { Rect, Circle, Textbox } = await import('fabric')
    const id = `${shapeType}_${Date.now()}`
    const cx = DISPLAY_WIDTH  / 2
    const cy = DISPLAY_HEIGHT / 2
    let obj: any

    if (shapeType === 'rect') {
      const w = 200 * SCALE, h = 120 * SCALE
      obj = new Rect({ left: cx - w / 2, top: cy - h / 2, width: w, height: h, fill: resolveCSSVar('var(--candle)'), selectable: true, originX: 'left', originY: 'top' })
    } else if (shapeType === 'circle') {
      const r = 80 * SCALE
      obj = new Circle({ left: cx - r, top: cy - r, radius: r, fill: resolveCSSVar('var(--candle)'), selectable: true, originX: 'left', originY: 'top' })
    } else {
      const w = 400 * SCALE, fs = 40 * SCALE
      obj = new Textbox('Text', { left: cx - w / 2, top: cy - fs, width: w, fontSize: fs, fontFamily: 'IBM Plex Sans', fontWeight: 'normal', fill: resolveCSSVar('var(--parchment)'), editable: true, selectable: true, lockScalingY: false, originX: 'left', originY: 'top' })
      obj.setControlsVisibility({ mb: true })
    }

    obj.lumenId = id
    canvas.add(obj)
    canvas.setActiveObject(obj)
    canvas.renderAll()
    setSelectedObj(obj)
    refreshLayers()
  }

  // ── Images ─────────────────────────────────────────────────────────────────────
  async function addImageToCanvas(loadUrl: string, persistUrl?: string) {
    const canvas = fabricRef.current
    if (!canvas) return
    const { FabricImage } = await import('fabric')
    const el  = await loadImageElement(loadUrl)
    const img = new FabricImage(el)
    const maxW  = DISPLAY_WIDTH  * 0.7
    const maxH  = DISPLAY_HEIGHT * 0.7
    const scale = Math.min(maxW / (img.width || 1), maxH / (img.height || 1), 1)
    img.set({
      scaleX: scale, scaleY: scale,
      left: (DISPLAY_WIDTH  - (img.width  || 0) * scale) / 2,
      top:  (DISPLAY_HEIGHT - (img.height || 0) * scale) / 2,
      originX: 'left' as const, originY: 'top' as const,
    })
    ;(img as any).lumenId = `image_${Date.now()}`
    ;(img as any)._originalSrc = persistUrl ?? loadUrl
    canvas.add(img)
    canvas.setActiveObject(img)
    canvas.renderAll()
    setSelectedObj(img)
    refreshLayers()
  }

  async function uploadImage(file: File) {
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await fetch('/api/brand-brain/assets/upload', { method: 'POST', body: formData })
      if (!res.ok) { const e = await res.json(); toast.error(`Upload failed: ${e.error ?? res.status}`); return }
      const { public_url } = await res.json()
      const localUrl = URL.createObjectURL(file)
      await addImageToCanvas(localUrl, public_url)
    } catch (err) {
      toast.error('Upload failed')
      console.error('[CanvasEditor] uploadImage:', err)
    } finally {
      setUploading(false)
    }
  }

  async function openAssetPicker() {
    setAssetsLoading(true)
    try {
      const res = await fetch('/api/brand-brain/assets')
      const data = await res.json()
      setBrandAssets(Array.isArray(data) ? data : [])
    } catch {
      toast.error('Could not load brand assets')
    } finally {
      setAssetsLoading(false)
    }
  }

  // ── Delete ─────────────────────────────────────────────────────────────────────
  function deleteSelected() {
    const canvas = fabricRef.current
    if (!canvas || !selectedObj) return
    canvas.remove(selectedObj)
    canvas.discardActiveObject()
    canvas.renderAll()
    setSelectedObj(null)
    refreshLayers()
  }

  // ── Duplicate layer ────────────────────────────────────────────────────────────
  async function duplicateSelected() {
    const canvas = fabricRef.current
    if (!canvas || !selectedObj) return
    const clone = await selectedObj.clone()
    clone.set({ left: (selectedObj.left ?? 0) + 16, top: (selectedObj.top ?? 0) + 16 })
    clone.lumenId = `${selectedObj.lumenId ?? 'obj'}_copy_${Date.now()}`
    if ((selectedObj as any)._originalSrc) (clone as any)._originalSrc = (selectedObj as any)._originalSrc
    canvas.add(clone)
    canvas.setActiveObject(clone)
    canvas.renderAll()
    setSelectedObj(clone)
    refreshLayers()
  }

  // ── Lock selection ─────────────────────────────────────────────────────────────
  function lockSelected() {
    if (!selectedObj) return
    const locked = !selectedObj.lockMovementX
    selectedObj.set({
      lockMovementX: locked, lockMovementY: locked,
      lockScalingX: locked, lockScalingY: locked,
      lockRotation: locked,
    })
    fabricRef.current?.requestRenderAll()
  }

  // ── Center ─────────────────────────────────────────────────────────────────────
  function centerH() {
    const canvas = fabricRef.current
    const obj = canvas?.getActiveObject()
    if (!canvas || !obj) return
    if (obj.originX === 'center') obj.set('left', DISPLAY_WIDTH / 2)
    else obj.set('left', (DISPLAY_WIDTH - obj.getScaledWidth()) / 2)
    obj.setCoords()
    canvas.requestRenderAll()
  }

  function centerV() {
    const canvas = fabricRef.current
    const obj = canvas?.getActiveObject()
    if (!canvas || !obj) return
    if (obj.originY === 'center') obj.set('top', DISPLAY_HEIGHT / 2)
    else obj.set('top', (DISPLAY_HEIGHT - obj.getScaledHeight()) / 2)
    obj.setCoords()
    canvas.requestRenderAll()
  }

  // ── Property updaters ──────────────────────────────────────────────────────────
  function updateText(value: string) {
    if (!selectedObj) return
    selectedObj.set('text', value)
    selectedObj.dirty = true
    fabricRef.current?.requestRenderAll()
  }

  function updateFill(color: string) {
    if (!selectedObj) return
    selectedObj.set('fill', color)
    fabricRef.current?.requestRenderAll()
    pushUndo()
  }

  function updateFontSize(size: number) {
    if (!selectedObj) return
    selectedObj.set('fontSize', size * SCALE)
    selectedObj.dirty = true
    fabricRef.current?.requestRenderAll()
  }

  function updateFontFamily(family: string) {
    if (!selectedObj) return
    selectedObj.set('fontFamily', family)
    selectedObj.dirty = true
    setFontFamily(family)
    fabricRef.current?.requestRenderAll()
    pushUndo()
  }

  function updateFontWeight(weight: string) {
    if (!selectedObj) return
    selectedObj.set('fontWeight', weight)
    selectedObj.dirty = true
    setFontWeight(weight)
    fabricRef.current?.requestRenderAll()
    pushUndo()
  }

  function updateTextWidth(width: number) {
    if (!selectedObj) return
    selectedObj.set('width', width * SCALE)
    selectedObj.dirty = true
    setTextWidth(width)
    fabricRef.current?.requestRenderAll()
  }

  function updateItalic() {
    if (!selectedObj) return
    const next = isItalic ? 'normal' : 'italic'
    selectedObj.set('fontStyle', next)
    selectedObj.dirty = true
    setIsItalic(!isItalic)
    fabricRef.current?.requestRenderAll()
    pushUndo()
  }

  function updateTextAlign(align: string) {
    const canvas = fabricRef.current
    const obj = canvas?.getActiveObject() ?? selectedObj
    if (!obj) return
    obj.set('textAlign', align)
    obj.dirty = true
    setTextAlign(align)
    canvas?.renderAll()
    pushUndo()
  }

  function updateOpacity(val: number) {
    if (!selectedObj) return
    selectedObj.set('opacity', val)
    setOpacity(val)
    fabricRef.current?.requestRenderAll()
  }

  function updateLineHeight(val: number) {
    if (!selectedObj) return
    selectedObj.set('lineHeight', val)
    selectedObj.dirty = true
    setLineHeight(val)
    fabricRef.current?.requestRenderAll()
  }

  function updateCharSpacing(val: number) {
    if (!selectedObj) return
    selectedObj.set('charSpacing', val)
    selectedObj.dirty = true
    setCharSpacing(val)
    fabricRef.current?.requestRenderAll()
  }

  function updateStroke(color: string, width: number) {
    if (!selectedObj) return
    selectedObj.set({ stroke: color, strokeWidth: width })
    setStrokeColor(color)
    setStrokeWidth(width)
    fabricRef.current?.requestRenderAll()
    pushUndo()
  }

  function updateRadius(val: number) {
    if (!selectedObj) return
    selectedObj.set({ rx: val * SCALE, ry: val * SCALE })
    setRadius(val)
    fabricRef.current?.requestRenderAll()
  }

  // ── Blur kernel helpers ───────────────────────────────────────────────────────
  function makeMotionKernel(amount: number, angle = 0): number[] {
    const n = amount <= 30 ? 3 : amount <= 60 ? 5 : 9
    const kernel = new Array(n * n).fill(0)
    const mid = Math.floor(n / 2)
    const rad = (angle * Math.PI) / 180
    const dx = Math.cos(rad)
    const dy = Math.sin(rad)
    // Trace a line through the center of the kernel at the given angle
    for (let step = -mid; step <= mid; step++) {
      const px = Math.round(mid + step * dx)
      const py = Math.round(mid + step * dy)
      if (px >= 0 && px < n && py >= 0 && py < n) kernel[py * n + px] += 1
    }
    const sum = kernel.reduce((a, b) => a + b, 0) || 1
    return kernel.map(v => v / sum)
  }

  function makeBoxKernel(amount: number): number[] {
    const n = amount <= 30 ? 3 : amount <= 60 ? 5 : 7
    const total = n * n
    return new Array(total).fill(1 / total)
  }

  // ── applyFilters ─────────────────────────────────────────────────────────────
  // Builds the full Fabric filter stack for the active image object:
  //   1. color-grade preset (scaled by intensity)  2. blur  3. manual B&W / brightness / contrast
  async function applyFilters(
    blur: number,
    blurTypeArg: BlurType,
    bw: number,
    brightness: number,
    contrast: number,
    presetName: string | null,
    intensity = 100,
    angle = 0,
    centerX = 50,
    centerY = 50,
    innerRadius = 0,
  ) {
    const canvas = fabricRef.current
    const obj = canvas?.getActiveObject() ?? selectedObj
    if (!canvas || !obj || !isImage(obj.type ?? '')) return
    const { filters: fab } = await import('fabric')
    const fl: any[] = []
    const intensityScale = intensity / 100

    // 1. Preset color grade (scaled by intensity slider)
    if (presetName && presetName !== 'Normal') {
      const preset = FILTER_PRESETS.find(p => p.name === presetName)
      if (preset) {
        for (const adj of preset.adj) {
          if (adj.t === 'b') fl.push(new (fab as any).Brightness({ brightness: adj.v * intensityScale / 100 }))
          else if (adj.t === 'c') fl.push(new (fab as any).Contrast({ contrast: adj.v * intensityScale / 100 }))
          else if (adj.t === 's') fl.push(new (fab as any).Saturation({ saturation: adj.v * intensityScale / 100 }))
          else if (adj.t === 'h') fl.push(new (fab as any).HueRotation({ rotation: (adj.v * intensityScale / 180) * Math.PI }))
        }
      }
    }

    // 2. Blur by type
    if (blur > 0) {
      if (blurTypeArg === 'gaussian') {
        fl.push(new (fab as any).Blur({ blur: blur / 100 }))
      } else if (blurTypeArg === 'motion') {
        const ff = new (fab as any).Convolute({ matrix: makeMotionKernel(blur, angle) })
        ff._blurType = 'motion'
        ff._angle = angle
        fl.push(ff)
      } else if (blurTypeArg === 'box') {
        const ff = new (fab as any).Convolute({ matrix: makeBoxKernel(blur) })
        ff._blurType = 'box'
        fl.push(ff)
      } else if (blurTypeArg === 'radial') {
        // Spin blur is applied via Canvas 2D AFTER Fabric's pipeline — no Fabric filter needed
      }
    }

    // 3. Manual fine-tune (additive on top of preset)
    if (bw > 0)           fl.push(new (fab as any).Saturation({ saturation: -(bw / 100) }))
    if (brightness !== 0) fl.push(new (fab as any).Brightness({ brightness: brightness / 100 }))
    if (contrast !== 0)   fl.push(new (fab as any).Contrast({ contrast: contrast / 100 }))

    // Store metadata on the image object for serialization / render engine
    ;(obj as any)._blurAmount        = blur
    ;(obj as any)._blurType          = blurTypeArg
    ;(obj as any)._blurAngle         = angle
    ;(obj as any)._blurCenterX       = centerX
    ;(obj as any)._blurCenterY       = centerY
    ;(obj as any)._blurInnerRadius   = innerRadius
    ;(obj as any)._filterIntensity   = intensity
    ;(obj as any)._activePreset      = presetName
    ;(obj as any)._effectBW          = bw
    ;(obj as any)._effectBrightness  = brightness
    ;(obj as any)._effectContrast    = contrast

    obj.filters = fl
    obj.applyFilters()

    // ── Radial / spin blur — Canvas 2D post-process ───────────────────────────
    // Fabric's filter pipeline finishes above and caches color grades in _filteredEl.
    // We draw N copies of that cached element (or the original) rotated around the
    // focal point using `lighter` compositing so each pixel gets the additive average
    // of N source pixels sampled at slight rotation offsets.
    // Focal point pixels don't move → result = original (sharp).
    // Distant pixels sample different source locations → blurred into circular arcs.
    if (blurTypeArg === 'radial' && blur > 0) {
      // _filteredEl = color-graded canvas (or undefined when no color grades)
      const srcEl: HTMLCanvasElement | HTMLImageElement =
        (obj as any)._filteredEl ?? (obj as any)._originalElement ?? (obj as any)._element
      if (srcEl) {
        const sw: number = (srcEl as HTMLCanvasElement).width  ?? (srcEl as HTMLImageElement).naturalWidth  ?? 1
        const sh: number = (srcEl as HTMLCanvasElement).height ?? (srcEl as HTMLImageElement).naturalHeight ?? 1
        const spinCanvas = document.createElement('canvas')
        spinCanvas.width = sw; spinCanvas.height = sh
        const spinCtx = spinCanvas.getContext('2d')!
        const N = Math.min(13, Math.max(7, Math.round(blur / 7)))
        const maxAngle = blur * 0.0022              // radians
        const cx = (centerX / 100) * sw
        const cy = (centerY / 100) * sh
        spinCtx.globalCompositeOperation = 'lighter'
        spinCtx.globalAlpha = 1 / N
        for (let i = 0; i < N; i++) {
          const a = (i / (N - 1) - 0.5) * 2 * maxAngle
          spinCtx.save()
          spinCtx.translate(cx, cy); spinCtx.rotate(a); spinCtx.translate(-cx, -cy)
          spinCtx.drawImage(srcEl, 0, 0)
          spinCtx.restore()
        }
        // Restore original pixels inside the sharp zone circle (feathered edge)
        if (innerRadius > 0) {
          const r = (innerRadius / 100) * Math.min(sw, sh) / 2
          const feather = Math.max(1, r * 0.15)
          // Draw original masked to center circle, composited over spin result
          const maskCanvas = document.createElement('canvas')
          maskCanvas.width = sw; maskCanvas.height = sh
          const maskCtx = maskCanvas.getContext('2d')!
          maskCtx.drawImage(srcEl, 0, 0)
          maskCtx.globalCompositeOperation = 'destination-in'
          const grad = maskCtx.createRadialGradient(cx, cy, Math.max(0, r - feather), cx, cy, r + feather)
          grad.addColorStop(0, 'rgba(0,0,0,1)')
          grad.addColorStop(1, 'rgba(0,0,0,0)')
          maskCtx.fillStyle = grad
          maskCtx.fillRect(0, 0, sw, sh)
          spinCtx.globalCompositeOperation = 'source-over'
          spinCtx.globalAlpha = 1
          spinCtx.drawImage(maskCanvas, 0, 0)
        }
        ;(obj as any)._filteredEl = spinCanvas
        ;(obj as any)._filterScalingX = 1
        ;(obj as any)._filterScalingY = 1
        obj.set('dirty', true)
      }
    }

    canvas.renderAll()
  }

  function updatePosition(x: number, y: number) {
    if (!selectedObj) return
    selectedObj.set({ left: x * SCALE, top: y * SCALE })
    selectedObj.setCoords()
    setPosX(x); setPosY(y)
    fabricRef.current?.requestRenderAll()
  }

  // ── Save ───────────────────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    try {
      const json = collectCanvasJson()
      if (withExport && fabricRef.current) {
        const dataUrl = fabricRef.current.toDataURL({ format: 'png', multiplier: 1 })
        onSave(json, dataUrl)
      } else {
        onSave(json)
      }
    } finally {
      setSaving(false)
    }
  }

  const selType       = selectedObj?.type ?? ''
  const isMultiSelect = selType.toLowerCase() === 'activeselection'
  const selIsText     = !isMultiSelect && isText(selType)
  const selIsRect     = !isMultiSelect && isRect(selType)
  const selIsCircle   = !isMultiSelect && isCircle(selType)
  const selIsImage    = !isMultiSelect && isImage(selType)
  const selIsShape    = selIsRect || selIsCircle

  // ── Style helpers ──────────────────────────────────────────────────────────────
  const panel: React.CSSProperties = {
    background: 'var(--surface)',
    padding: '20px 16px',
    borderRadius: 12,
    border: '1px solid var(--border)',
    marginBottom: 12,
  }

  const sectionLabel: React.CSSProperties = {
    fontSize: 10,
    letterSpacing: '0.12em',
    textTransform: 'uppercase',
    color: 'var(--muted)',
    fontFamily: 'var(--font-syne)',
    fontWeight: 700,
    marginBottom: 12,
    display: 'block',
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--surface-2)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    color: 'var(--parchment)',
    fontFamily: 'var(--font-ibm)',
    fontSize: 13,
    padding: '6px 10px',
    width: '100%',
    outline: 'none',
  }

  const rangeStyle: React.CSSProperties = {
    width: '100%',
    accentColor: 'var(--candle)',
    cursor: 'pointer',
  }

  const propRow: React.CSSProperties = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    gap: 8,
  }

  const propLabel: React.CSSProperties = {
    fontSize: 12,
    color: 'var(--sand)',
    fontFamily: 'var(--font-ibm)',
    flexShrink: 0,
    minWidth: 70,
  }

  const iconBtn = (active = false): React.CSSProperties => ({
    width: 30, height: 30,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: active ? 'rgba(182,141,64,0.15)' : 'transparent',
    border: 'none', borderRadius: 6, cursor: 'pointer',
    color: active ? 'var(--candle)' : 'var(--sand)',
    transition: 'background 0.12s, color 0.12s',
  })

  const navItem = (active: boolean): React.CSSProperties => ({
    display: 'flex', alignItems: 'center', gap: 12,
    padding: '11px 16px',
    background: active ? 'var(--surface-2)' : 'transparent',
    borderRight: active ? '2px solid var(--candle)' : '2px solid transparent',
    color: active ? 'var(--candle)' : 'var(--muted)',
    cursor: 'pointer',
    fontFamily: 'var(--font-ibm)',
    fontSize: 13,
    fontWeight: active ? 600 : 400,
    transition: 'all 0.15s',
    userSelect: 'none',
  })

  // ── Render ─────────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: 'var(--carbon)', overflow: 'hidden', fontFamily: 'var(--font-ibm)' }}>
      <style>{`
        .ce-mobile-hint { display: none; }
        .ce-left-toggle { left: 0; transition: left 0.38s cubic-bezier(0.4,0,0.2,1), color 0.15s; }
        @media (max-width: 767px) {
          .ce-left-aside  { position: absolute !important; top: 0 !important; left: 0 !important; height: 100% !important; z-index: 50 !important; }
          .ce-left-toggle.open { left: 220px; }
          .ce-mobile-hint { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 8px 16px; background: rgba(182,141,64,0.08); border-bottom: 1px solid rgba(182,141,64,0.15); font-family: var(--font-ibm); font-size: 11px; color: var(--sand); flex-shrink: 0; }
          .ce-topbar-logo { display: none; }
          .ce-topbar-tabs { margin-left: 0 !important; }
          .ce-topbar-discard { display: none !important; }
          .ce-topbar-divider { display: none !important; }
          .ce-topbar-save { padding: 6px 12px !important; font-size: 12px !important; }
          .ce-topbar-right { gap: 4px !important; }
        }
      `}</style>

      {/* ─── TOP BAR ─────────────────────────────────────────────────────────── */}
      <header style={{
        height: 56, display: 'flex', alignItems: 'center',
        padding: '0 20px', flexShrink: 0,
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        gap: 8, zIndex: 20,
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginRight: 16 }}>
          <svg width="18" height="18" viewBox="0 0 28 28" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="14" cy="14" r="3.5" fill="var(--candle)"/>
            <line x1="14" y1="7" x2="14" y2="2"  stroke="var(--candle)" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="14" y1="21" x2="14" y2="26" stroke="var(--candle)" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="7" y1="14" x2="2"  y2="14" stroke="var(--candle)" strokeWidth="1.6" strokeLinecap="round"/>
            <line x1="21" y1="14" x2="26" y2="14" stroke="var(--candle)" strokeWidth="1.6" strokeLinecap="round"/>
          </svg>
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 16, color: 'var(--candle)', letterSpacing: '-0.02em' }}>Lumen</span>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 2 }}>
          {([
            { label: 'Canvas',  active: !isPreview, action: () => setIsPreview(false) },
            { label: 'Preview', active: isPreview,  action: () => setIsPreview(true)  },
          ]).map(({ label, active, action }) => (
            <button
              key={label}
              onClick={action}
              style={{
                padding: '6px 14px', borderRadius: 8,
                fontSize: 13, fontWeight: active ? 600 : 400,
                color: active ? 'var(--candle)' : 'var(--muted)',
                background: active ? 'rgba(182,141,64,0.08)' : 'transparent',
                border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-ibm)',
                transition: 'color 0.2s, background 0.2s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = 'var(--sand)' }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = 'var(--muted)' }}
            >{label}</button>
          ))}
        </div>

        {/* Right actions */}
        <div className="ce-topbar-right" style={{ marginLeft: 'auto', display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="ce-topbar-discard"
            onClick={onCancel}
            style={{
              background: 'transparent', border: '1px solid var(--border)',
              color: 'var(--sand)', padding: '6px 16px', borderRadius: 20,
              cursor: 'pointer', fontFamily: 'var(--font-ibm)', fontSize: 13, fontWeight: 500,
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(182,141,64,0.4)'; e.currentTarget.style.color = 'var(--parchment)' }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}
          >
            Discard
          </button>
          <button
            className="ce-topbar-save"
            onClick={handleSave}
            disabled={saving || !ready}
            style={{
              background: 'linear-gradient(135deg, var(--candle), var(--ember))',
              color: '#fff', border: 'none', padding: '6px 20px', borderRadius: 20,
              cursor: saving ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 13,
              opacity: !ready ? 0.5 : 1,
              boxShadow: '0 2px 16px rgba(182,141,64,0.25)',
              transition: 'opacity 0.15s, transform 0.1s',
            }}
            onMouseEnter={e => { if (!saving && ready) e.currentTarget.style.transform = 'scale(1.03)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
          >
            {saving ? 'Saving…' : 'Save Design'}
          </button>

          <div className="ce-topbar-divider" style={{ width: 1, height: 20, background: 'var(--border)', margin: '0 4px' }} />

          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: 6, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'color 0.15s' }}
            title="Close editor"
            onMouseEnter={e => e.currentTarget.style.color = 'var(--parchment)'}
            onMouseLeave={e => e.currentTarget.style.color = 'var(--muted)'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M3 3l10 10M13 3L3 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
          </button>
        </div>
      </header>

      {/* Mobile hint */}
      <div className="ce-mobile-hint">
        <span className="material-symbols-outlined" style={{ fontSize: 14 }}>info</span>
        For the best editing experience, use a desktop browser
      </div>

      {/* ─── BODY ─────────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0, overflow: 'hidden' }}>

        {/* ─── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
        <aside className="ce-left-aside" style={{
          width: (isPreview || !leftSidebarOpen) ? 0 : 220,
          flexShrink: 0,
          background: 'var(--surface)',
          borderRight: (isPreview || !leftSidebarOpen) ? 'none' : '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflowY: 'auto',
          overflow: 'hidden',
          opacity: (isPreview || !leftSidebarOpen) ? 0 : 1,
          pointerEvents: (isPreview || !leftSidebarOpen) ? 'none' : 'auto',
          transition: 'width 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.25s ease',
        }}>
          {/* Sidebar header */}
          <div style={{ padding: '20px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, color: 'var(--parchment)' }}>Editor</div>
            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', letterSpacing: '0.06em', textTransform: 'uppercase', marginTop: 2 }}>Canvas v1</div>
          </div>

          {/* Nav items */}
          <nav style={{ flex: 1, paddingTop: 8 }}>
            {([
              { id: 'canvas',  label: 'Canvas',  icon: 'dashboard' },
              { id: 'text',    label: 'Text',    icon: 'title' },
              { id: 'media',   label: 'Media',   icon: 'image' },
              { id: 'shapes',  label: 'Shapes',  icon: 'category' },
              { id: 'layers',  label: 'Layers',  icon: 'layers' },
            ] as const).map(({ id, label, icon }) => (
              <div
                key={id}
                onClick={() => setActiveLeftTab(id)}
                style={navItem(activeLeftTab === id)}
                onMouseEnter={e => {
                  if (activeLeftTab !== id) {
                    e.currentTarget.style.color = 'var(--candle)'
                    e.currentTarget.style.background = 'rgba(182,141,64,0.05)'
                  }
                }}
                onMouseLeave={e => {
                  if (activeLeftTab !== id) {
                    e.currentTarget.style.color = 'var(--muted)'
                    e.currentTarget.style.background = 'transparent'
                  }
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
                <span>{label}</span>
              </div>
            ))}
          </nav>

          {/* Tab content */}
          <div style={{ borderTop: '1px solid var(--border)', flex: 1, overflowY: 'auto', padding: '12px 0' }}>

            {activeLeftTab === 'canvas' && (
              <div style={{ padding: '8px 16px' }}>
                <span style={sectionLabel}>Canvas Info</span>
                <div style={{ ...panel, padding: '12px 14px' }}>
                  <div style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', lineHeight: 1.8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Size</span><span>1080 × 1350</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Ratio</span><span>4 : 5</span></div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: 'var(--muted)' }}>Zoom</span><span>{Math.round(canvasScale * 100)}%</span></div>
                  </div>
                </div>
                <span style={{ ...sectionLabel, marginTop: 8 }}>Alignment</span>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                  {[
                    { label: 'Center H', action: centerH },
                    { label: 'Center V', action: centerV },
                  ].map(({ label, action }) => (
                    <button
                      key={label}
                      onClick={action}
                      disabled={!selectedObj}
                      style={{
                        flex: 1, padding: '8px 6px',
                        background: 'var(--surface-2)',
                        border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--sand)',
                        fontSize: 11, fontFamily: 'var(--font-ibm)',
                        cursor: selectedObj ? 'pointer' : 'not-allowed',
                        opacity: selectedObj ? 1 : 0.4,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { if (selectedObj) { e.currentTarget.style.borderColor = 'var(--candle)'; e.currentTarget.style.color = 'var(--parchment)' } }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}
                    >{label}</button>
                  ))}
                </div>
              </div>
            )}

            {activeLeftTab === 'text' && (
              <div style={{ padding: '8px 16px' }}>
                <span style={sectionLabel}>Add Text</span>
                <button
                  onClick={() => addLayer('textbox')}
                  disabled={!ready}
                  style={{
                    width: '100%', padding: '10px 14px', marginBottom: 16,
                    background: 'var(--surface-2)', border: '1.5px dashed var(--border)',
                    borderRadius: 10, color: 'var(--sand)',
                    display: 'flex', alignItems: 'center', gap: 8,
                    cursor: 'pointer', fontFamily: 'var(--font-ibm)', fontSize: 13,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--candle)'; e.currentTarget.style.color = 'var(--parchment)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>add</span>
                  Add text layer
                </button>
                <span style={sectionLabel}>Font Presets</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {FONTS.map(f => (
                    <div
                      key={f.value}
                      onClick={() => { addLayer('textbox').then(() => updateFontFamily(f.value)) }}
                      style={{
                        padding: '8px 12px', borderRadius: 8,
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        cursor: 'pointer', fontSize: 13,
                        fontFamily: f.value,
                        color: 'var(--sand)',
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--candle)'; e.currentTarget.style.color = 'var(--parchment)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}
                    >
                      {f.label}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeLeftTab === 'media' && (
              <div style={{ padding: '8px 16px' }}>
                <span style={sectionLabel}>Upload Image</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  style={{ display: 'none' }}
                  onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f); e.target.value = '' }}
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!ready || uploading}
                  style={{
                    width: '100%', padding: '12px 14px', marginBottom: 16,
                    background: 'var(--surface-2)', border: '1.5px dashed var(--border)',
                    borderRadius: 10, color: uploading ? 'var(--candle)' : 'var(--sand)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    cursor: uploading ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-ibm)', fontSize: 13,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { if (!uploading) { e.currentTarget.style.borderColor = 'var(--candle)'; e.currentTarget.style.color = 'var(--parchment)' } }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = uploading ? 'var(--candle)' : 'var(--sand)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 16 }}>upload</span>
                  {uploading ? 'Uploading…' : 'Upload image'}
                </button>

                <span style={sectionLabel}>Brand Assets</span>
                {brandAssets.length === 0 && (
                  <button
                    onClick={openAssetPicker}
                    disabled={!ready}
                    style={{
                      width: '100%', padding: '9px 14px', marginBottom: 10,
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 10, color: 'var(--sand)',
                      display: 'flex', alignItems: 'center', gap: 8,
                      cursor: 'pointer', fontFamily: 'var(--font-ibm)', fontSize: 13,
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--candle)'; e.currentTarget.style.color = 'var(--parchment)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>grid_view</span>
                    Browse brand assets
                  </button>
                )}
                {brandAssets.length > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 6 }}>
                    {brandAssets.map(asset => (
                      <div
                        key={asset.id}
                        onClick={() => addImageToCanvas(asset.public_url, asset.public_url)}
                        title={asset.name ?? 'Asset'}
                        style={{
                          cursor: 'pointer', borderRadius: 8, overflow: 'hidden',
                          aspectRatio: '1', background: 'var(--surface-2)',
                          border: '1px solid var(--border)', transition: 'border-color .15s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--candle)'}
                        onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={asset.public_url} alt={asset.name ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeLeftTab === 'shapes' && (
              <div style={{ padding: '8px 16px' }}>
                <span style={sectionLabel}>Add Shape</span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {([
                    { label: 'Rectangle', type: 'rect',   icon: 'rectangle', desc: 'Rounded or sharp' },
                    { label: 'Circle',    type: 'circle', icon: 'circle',    desc: 'Oval or perfect' },
                  ] as const).map(({ label, type, icon, desc }) => (
                    <button
                      key={type}
                      onClick={() => addLayer(type)}
                      disabled={!ready}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 12,
                        padding: '12px 14px',
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        borderRadius: 10, cursor: 'pointer',
                        textAlign: 'left', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--candle)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)' }}
                    >
                      <span className="material-symbols-outlined" style={{ fontSize: 22, color: 'var(--candle)' }}>{icon}</span>
                      <div>
                        <div style={{ fontSize: 13, color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', fontWeight: 500 }}>{label}</div>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>{desc}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeLeftTab === 'layers' && (
              <div style={{ padding: '8px 16px' }}>
                <span style={sectionLabel}>Layer Stack</span>
                {layers.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', padding: '12px 0' }}>No layers yet</div>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {layers.map((layer, i) => {
                    const isSelected = selectedObj && (selectedObj.lumenId ?? selectedObj.type) === layer.lumenId
                    return (
                      <div
                        key={layer.lumenId + i}
                        onClick={() => selectLayer(layer.lumenId)}
                        style={{
                          display: 'flex', alignItems: 'center', gap: 8,
                          padding: '8px 10px', borderRadius: 10,
                          background: isSelected ? 'rgba(182,141,64,0.1)' : 'var(--surface-2)',
                          border: `1px solid ${isSelected ? 'rgba(182,141,64,0.3)' : 'var(--border)'}`,
                          cursor: 'pointer', transition: 'all 0.12s',
                        }}
                      >
                        <span className="material-symbols-outlined" style={{ fontSize: 14, color: isSelected ? 'var(--candle)' : 'var(--muted)', flexShrink: 0 }}>
                          {layerIcon(layer.type, layer.lumenId)}
                        </span>
                        <span style={{ flex: 1, fontSize: 11, color: isSelected ? 'var(--parchment)' : 'var(--sand)', fontFamily: 'var(--font-ibm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {layer.lumenId}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                          <button
                            onClick={e => { e.stopPropagation(); moveLayerUp(layer.lumenId) }}
                            disabled={i === 0}
                            style={{ background: 'none', border: 'none', color: i === 0 ? 'var(--muted)' : 'var(--sand)', cursor: i === 0 ? 'default' : 'pointer', padding: '1px 3px', fontSize: 9, lineHeight: 1 }}
                          >▲</button>
                          <button
                            onClick={e => { e.stopPropagation(); moveLayerDown(layer.lumenId) }}
                            disabled={i === layers.length - 1}
                            style={{ background: 'none', border: 'none', color: i === layers.length - 1 ? 'var(--muted)' : 'var(--sand)', cursor: i === layers.length - 1 ? 'default' : 'pointer', padding: '1px 3px', fontSize: 9, lineHeight: 1 }}
                          >▼</button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* New Asset button at bottom */}
          <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', flexShrink: 0 }}>
            <button
              onClick={() => { setActiveLeftTab('media'); openAssetPicker() }}
              style={{
                width: '100%', padding: '9px 0',
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                borderRadius: 10, color: 'var(--candle)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                cursor: 'pointer', fontFamily: 'var(--font-ibm)', fontSize: 12, fontWeight: 600,
                transition: 'all 0.15s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = 'rgba(182,141,64,0.08)'; e.currentTarget.style.borderColor = 'var(--candle)' }}
              onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface-2)'; e.currentTarget.style.borderColor = 'var(--border)' }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 14 }}>add</span>
              New Asset
            </button>
          </div>
        </aside>

        {/* ─── CANVAS AREA ─────────────────────────────────────────────────────── */}
        <main style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          overflow: 'hidden', position: 'relative',
          background: isPreview ? 'var(--carbon)' : 'var(--surface-3)',
          transition: 'background 0.4s ease',
        }}>
          {/* Canvas toolbar — hidden in preview */}
          <div style={{
            height: isPreview ? 0 : 44,
            display: 'flex', alignItems: 'center',
            padding: isPreview ? 0 : '0 16px', flexShrink: 0,
            background: 'var(--surface)',
            borderBottom: isPreview ? 'none' : '1px solid var(--border)',
            gap: 4,
            overflow: 'hidden',
            opacity: isPreview ? 0 : 1,
            pointerEvents: isPreview ? 'none' : 'auto',
            transition: 'height 0.32s cubic-bezier(0.4,0,0.2,1), opacity 0.2s ease',
          }}>
            <button
              onClick={performUndo}
              title="Undo"
              style={{ ...iconBtn(), width: 32, height: 32 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,69,56,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M2 5h6a4 4 0 010 8H5M2 5l3-3M2 5l3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
            <button
              onClick={performRedo}
              title="Redo"
              style={{ ...iconBtn(), width: 32, height: 32 }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,69,56,0.2)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M12 5H6a4 4 0 000 8h3M12 5l-3-3M12 5l-3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>

            <div style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 6px' }} />

            <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)' }}>1080 × 1350 px</span>

            <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 2 }}>
              <button style={{ ...iconBtn(), width: 32, height: 32 }} title="Zoom out"
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,69,56,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => {
                  const newScale = Math.max(0.1, canvasScale - 0.1)
                  manualZoom.current = true
                  const outer = canvasOuterRef.current
                  const inner = canvasInnerRef.current
                  if (outer) { outer.style.width = `${DISPLAY_WIDTH * newScale}px`; outer.style.height = `${DISPLAY_HEIGHT * newScale}px` }
                  if (inner) inner.style.transform = `scale(${newScale})`
                  canvasScaleRef.current = newScale
                  setCanvasScale(newScale)
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>zoom_out</span>
              </button>
              <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', minWidth: 36, textAlign: 'center' }}>
                {Math.round(canvasScale * 100)}%
              </span>
              <button style={{ ...iconBtn(), width: 32, height: 32 }} title="Zoom in"
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,69,56,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                onClick={() => {
                  const newScale = Math.min(2, canvasScale + 0.1)
                  manualZoom.current = true
                  const outer = canvasOuterRef.current
                  const inner = canvasInnerRef.current
                  if (outer) { outer.style.width = `${DISPLAY_WIDTH * newScale}px`; outer.style.height = `${DISPLAY_HEIGHT * newScale}px` }
                  if (inner) inner.style.transform = `scale(${newScale})`
                  canvasScaleRef.current = newScale
                  setCanvasScale(newScale)
                }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>zoom_in</span>
              </button>
              <button
                style={{ ...iconBtn(), width: 32, height: 32, background: leftSidebarOpen ? 'rgba(182,141,64,0.12)' : 'transparent', color: leftSidebarOpen ? 'var(--candle)' : 'var(--muted)' }}
                title="Toggle panel"
                onClick={() => setLeftSidebarOpen(v => !v)}
                onMouseEnter={e => { if (!leftSidebarOpen) e.currentTarget.style.background = 'rgba(78,69,56,0.2)' }}
                onMouseLeave={e => { e.currentTarget.style.background = leftSidebarOpen ? 'rgba(182,141,64,0.12)' : 'transparent' }}
              >
                <span className="material-symbols-outlined" style={{ fontSize: 16 }}>grid_view</span>
              </button>
            </div>
          </div>

          {/* Canvas wrapper — scroll root */}
          <div ref={canvasAreaRef} style={{
            flex: 1, overflow: 'auto', position: 'relative',
          }}>
            {/* Inner centering shell — at least fills the scroll viewport */}
            <div style={{
              minWidth: '100%', minHeight: '100%',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: isPreview ? 48 : 32,
              gap: isPreview ? 28 : 20,
              boxSizing: 'border-box',
              transition: 'padding 0.38s cubic-bezier(0.4,0,0.2,1)',
            }}>
            {/* Fabric canvas — outer div reserves the correct layout space; inner div scales from top-left */}
            <div ref={canvasOuterRef} style={{
              position: 'relative', flexShrink: 0,
              width: DISPLAY_WIDTH * canvasScale,
              height: DISPLAY_HEIGHT * canvasScale,
              boxShadow: isPreview
                ? '0 32px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.2)'
                : '0 12px 48px rgba(0,0,0,0.4)',
              outline: isPreview ? 'none' : '1.5px solid rgba(212,168,75,0.35)',
              borderRadius: isPreview ? 20 : 4,
              overflow: 'hidden',
              lineHeight: 0,
              transition: 'border-radius 0.38s cubic-bezier(0.4,0,0.2,1), box-shadow 0.38s ease',
            }}>
              <div ref={canvasInnerRef} style={{
                position: 'absolute', top: 0, left: 0,
                width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT,
                transform: `scale(${canvasScale})`,
                transformOrigin: 'top left',
              }}>
                {!ready && !error && (
                  <div style={{
                    position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: 'var(--surface)', zIndex: 10,
                    color: 'var(--sand)', fontFamily: 'var(--font-ibm)', fontSize: 14,
                  }}>
                    Loading canvas…
                  </div>
                )}
                {error && (
                  <div style={{
                    position: 'absolute', inset: 0, padding: 24,
                    color: '#ff6b6b', fontFamily: 'var(--font-ibm)', fontSize: 13,
                    background: 'var(--surface)', zIndex: 10,
                  }}>
                    Canvas error: {error}
                  </div>
                )}
                <canvas ref={canvasRef} />
                <canvas ref={guideRef} width={DISPLAY_WIDTH} height={DISPLAY_HEIGHT}
                  style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }}
                />
                {/* Radial blur sharp-zone overlay */}
                {(() => {
                  if (!selectedObj || blurType !== 'radial' || effectBlur <= 0) return null
                  const objW = (selectedObj.width  ?? 0) * (selectedObj.scaleX ?? 1)
                  const objH = (selectedObj.height ?? 0) * (selectedObj.scaleY ?? 1)
                  const cx = (selectedObj.left ?? 0) + (blurCenterX / 100) * objW
                  const cy = (selectedObj.top  ?? 0) + (blurCenterY / 100) * objH
                  const r  = blurInnerRadius > 0 ? (blurInnerRadius / 100) * Math.min(objW, objH) / 2 : 0
                  return (
                    <svg
                      width={DISPLAY_WIDTH} height={DISPLAY_HEIGHT}
                      style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 6, overflow: 'visible' }}
                    >
                      {r > 0 && (
                        <circle
                          cx={cx} cy={cy} r={r}
                          fill="none"
                          stroke="rgba(212,168,75,0.85)"
                          strokeWidth={1.5}
                          strokeDasharray="6 4"
                        />
                      )}
                      {/* Focal point crosshair */}
                      <circle cx={cx} cy={cy} r={4} fill="rgba(212,168,75,0.9)" />
                      <circle cx={cx} cy={cy} r={6} fill="none" stroke="rgba(255,255,255,0.7)" strokeWidth={1} />
                    </svg>
                  )
                })()}
              </div>
            </div>

            </div>{/* end inner centering shell */}
          </div>{/* end canvasAreaRef scroll root */}

          {/* ─── Fixed bottom bar — floats over the canvas, never scrolls ── */}
          <div style={{
            position: 'absolute', bottom: 20, left: 0, right: 0,
            display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', alignItems: 'center', gap: 10,
            pointerEvents: 'none', zIndex: 20,
          }}>
            {isPreview ? (
              <button
                onClick={() => setIsPreview(false)}
                style={{
                  pointerEvents: 'auto',
                  background: 'rgba(20, 20, 18, 0.82)',
                  backdropFilter: 'blur(12px)',
                  WebkitBackdropFilter: 'blur(12px)',
                  border: '1px solid rgba(182,141,64,0.35)',
                  borderRadius: 999, padding: '10px 24px',
                  display: 'flex', alignItems: 'center', gap: 10,
                  boxShadow: '0 8px 32px rgba(0,0,0,0.35)',
                  color: 'var(--sand)',
                  cursor: 'pointer',
                  fontFamily: 'var(--font-ibm)',
                  fontSize: 13,
                  fontWeight: 500,
                  transition: 'all 0.2s',
                  animation: 'fadeInUp 0.3s ease',
                }}
                onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(182,141,64,0.7)'; e.currentTarget.style.color = 'var(--parchment)' }}
                onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(182,141,64,0.35)'; e.currentTarget.style.color = 'var(--sand)' }}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none"><path d="M10 4H5a3 3 0 000 6h2M10 4l-2-2M10 4l-2 2" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                Exit Preview
              </button>
            ) : (
              <div style={{
                pointerEvents: 'auto',
                background: 'rgba(20, 20, 18, 0.78)',
                backdropFilter: 'blur(12px)',
                WebkitBackdropFilter: 'blur(12px)',
                border: '1px solid rgba(78,69,56,0.4)',
                borderRadius: 999, padding: '8px 20px',
                display: 'flex', alignItems: 'center', gap: 20,
                boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
              }}>
                {/* Hidden fill color picker triggered by Colors button */}
                <input
                  ref={colorPickerRef}
                  type="color"
                  style={{ display: 'none' }}
                  onChange={e => {
                    if (selectedObj) {
                      updateFill(e.target.value)
                      if (isText(selType)) setTextColor(e.target.value)
                      else setFillColor(e.target.value)
                    }
                  }}
                />

                {([
                  {
                    icon: 'palette', label: 'Colors', active: false,
                    action: () => {
                      if (!selectedObj) return
                      openLeftPanel()
                      if (colorPickerRef.current) {
                        const cur = isText(selType) ? textColor : fillColor
                        colorPickerRef.current.value = cur.startsWith('#') ? cur : '#b68d40'
                        colorPickerRef.current.click()
                      }
                    },
                  },
                  {
                    icon: 'text_fields', label: 'Type', active: false,
                    action: () => { setActiveLeftTab('text'); openLeftPanel() },
                  },
                  {
                    icon: 'filter_b_and_w', label: 'Effects', active: showEffects,
                    action: () => {
                      // Auto-select the first image layer if nothing is selected
                      if (!showEffects && !selIsImage) {
                        const canvas = fabricRef.current
                        if (canvas) {
                          const imgObj = canvas.getObjects().find((o: any) => isImage(o.type ?? ''))
                          if (imgObj) {
                            canvas.setActiveObject(imgObj)
                            canvas.renderAll()
                            setSelectedObj(imgObj)
                          }
                        }
                      }
                      setShowEffects(v => !v)
                      openRightPanel()
                    },
                  },
                ]).map(({ icon, label, active, action }) => (
                  <button
                    key={label}
                    onClick={action}
                    style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                      background: 'none', border: 'none', cursor: 'pointer',
                      color: active ? 'var(--candle)' : 'var(--sand)', transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = 'var(--candle)'}
                    onMouseLeave={e => e.currentTarget.style.color = active ? 'var(--candle)' : 'var(--sand)'}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 18 }}>{icon}</span>
                    <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-ibm)', fontWeight: 700 }}>{label}</span>
                  </button>
                ))}

                <div style={{ width: 1, height: 24, background: 'rgba(78,69,56,0.5)' }} />

                <button
                  onClick={deleteSelected}
                  disabled={!selectedObj}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                    background: 'none', border: 'none',
                    cursor: selectedObj ? 'pointer' : 'not-allowed',
                    color: selectedObj ? '#c0392b' : 'var(--muted)',
                    transition: 'color 0.15s',
                  }}
                  onMouseEnter={e => { if (selectedObj) e.currentTarget.style.color = '#e74c3c' }}
                  onMouseLeave={e => { e.currentTarget.style.color = selectedObj ? '#c0392b' : 'var(--muted)' }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 18 }}>delete</span>
                  <span style={{ fontSize: 9, textTransform: 'uppercase', letterSpacing: '0.06em', fontFamily: 'var(--font-ibm)', fontWeight: 700 }}>Clear</span>
                </button>
              </div>
            )}
          </div>
        {/* ─── LEFT SIDEBAR TOGGLE TAB ─────────────────────────────────────────── */}
        {!isPreview && (
          <button
            className={`ce-left-toggle${leftSidebarOpen ? ' open' : ''}`}
            onClick={() => leftSidebarOpen ? setLeftSidebarOpen(false) : openLeftPanel()}
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 51,
              width: 20, height: 44,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderLeft: 'none',
              borderRadius: '0 6px 6px 0',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--muted)',
              padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--parchment)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
            title={leftSidebarOpen ? 'Close panel' : 'Open panel'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {leftSidebarOpen ? 'chevron_left' : 'chevron_right'}
            </span>
          </button>
        )}

        {/* ─── RIGHT PANEL TOGGLE TAB ───────────────────────────────────────────── */}
        {selectedObj && !isPreview && (
          <button
            onClick={() => rightPanelMinimized ? openRightPanel() : setRightPanelMinimized(true)}
            style={{
              position: 'absolute',
              right: rightPanelMinimized ? 0 : 272,
              top: '50%',
              transform: 'translateY(-50%)',
              zIndex: 31,
              width: 20, height: 44,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRight: 'none',
              borderRadius: '6px 0 0 6px',
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--muted)',
              transition: 'right 0.38s cubic-bezier(0.4,0,0.2,1), color 0.15s',
              padding: 0,
            }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--parchment)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
            title={rightPanelMinimized ? 'Open panel' : 'Minimise panel'}
          >
            <span className="material-symbols-outlined" style={{ fontSize: 14 }}>
              {rightPanelMinimized ? 'chevron_left' : 'chevron_right'}
            </span>
          </button>
        )}

        {/* ─── RIGHT PROPERTIES / EFFECTS PANEL — absolutely overlays the canvas ── */}
        <aside className="ce-right-aside" style={{
          position: 'absolute', right: 0, top: 0, height: '100%',
          width: (isPreview || !selectedObj || rightPanelMinimized) ? 0 : 272,
          background: 'var(--surface)',
          borderLeft: (isPreview || !selectedObj || rightPanelMinimized) ? 'none' : '1px solid var(--border)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          opacity: (isPreview || !selectedObj || rightPanelMinimized) ? 0 : 1,
          pointerEvents: (isPreview || !selectedObj || rightPanelMinimized) ? 'none' : 'auto',
          transition: 'width 0.38s cubic-bezier(0.4,0,0.2,1), opacity 0.22s ease',
          zIndex: 30,
        }}>
          <div style={{ padding: '14px 16px 12px', borderBottom: '1px solid var(--border)', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, color: 'var(--parchment)' }}>{showEffects ? 'Effects' : 'Properties'}</div>
            {showEffects && (
              <button onClick={() => setShowEffects(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', lineHeight: 1, padding: '2px 4px', display: 'flex', alignItems: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 15 }}>close</span>
              </button>
            )}
          </div>

          {showEffects ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>
            {/* Category icon tabs */}
            <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
              {([
                { id: 'blur',    icon: 'blur_on',       label: 'Blur'    },
                { id: 'filters', icon: 'filter_b_and_w', label: 'Filters' },
                { id: 'adjust',  icon: 'tune',          label: 'Adjust'  },
              ] as const).map(({ id, icon, label }) => {
                const active = effectsTab === id
                return (
                  <button
                    key={id}
                    onClick={() => setEffectsTab(id)}
                    style={{
                      flex: 1,
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                      padding: '10px 6px',
                      background: active ? 'rgba(182,141,64,0.14)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${active ? 'rgba(182,141,64,0.45)' : 'rgba(78,69,56,0.35)'}`,
                      borderRadius: 10,
                      cursor: 'pointer',
                      color: active ? 'var(--candle)' : 'var(--sand)',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--parchment)' } }}
                    onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--sand)' } }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 20 }}>{icon}</span>
                    <span style={{ fontSize: 9, fontFamily: 'var(--font-ibm)', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
                  </button>
                )
              })}
            </div>

            {/* Divider */}
            <div style={{ height: 1, background: 'rgba(78,69,56,0.35)', marginBottom: 14 }} />

            {/* Blur tab */}
            {effectsTab === 'blur' && (
              <>
                {!selIsImage ? (
                  <div style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', textAlign: 'center', padding: '8px 0 4px', lineHeight: 1.7, opacity: 0.7 }}>
                    Select an image layer<br/>to apply blur
                  </div>
                ) : (
                  <div>
                    {/* Blur type picker */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 5, marginBottom: 14 }}>
                      {([
                        { id: 'gaussian' as BlurType, label: 'Gaussian', icon: 'blur_on' },
                        { id: 'motion'   as BlurType, label: 'Motion',   icon: 'motion_blur' },
                        { id: 'radial'   as BlurType, label: 'Radial',   icon: 'lens_blur' },
                        { id: 'box'      as BlurType, label: 'Box',      icon: 'blur_linear' },
                      ]).map(({ id, label, icon }) => {
                        const active = blurType === id
                        return (
                          <button
                            key={id}
                            onClick={() => { setBlurType(id); if (effectBlur > 0) applyFilters(effectBlur, id, effectBW, effectBrightness, effectContrast, activePreset, filterIntensity, blurAngle, blurCenterX, blurCenterY, blurInnerRadius) }}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                              padding: '8px 4px',
                              background: active ? 'rgba(182,141,64,0.14)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${active ? 'rgba(182,141,64,0.5)' : 'rgba(78,69,56,0.3)'}`,
                              borderRadius: 8, cursor: 'pointer',
                              color: active ? 'var(--candle)' : 'var(--sand)',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.07)'; e.currentTarget.style.color = 'var(--parchment)' } }}
                            onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = 'var(--sand)' } }}
                          >
                            <span className="material-symbols-outlined" style={{ fontSize: 16 }}>{icon}</span>
                            <span style={{ fontSize: 8, fontFamily: 'var(--font-ibm)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>{label}</span>
                          </button>
                        )
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', textTransform: 'capitalize' }}>{blurType} Blur</span>
                      <span style={{ fontSize: 11, color: 'var(--parchment)', fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>{effectBlur}</span>
                    </div>
                    <input type="range" min={0} max={100} step={1} value={effectBlur}
                      onChange={e => { const v = Number(e.target.value); setEffectBlur(v); applyFilters(v, blurType, effectBW, effectBrightness, effectContrast, activePreset, filterIntensity, blurAngle, blurCenterX, blurCenterY, blurInnerRadius) }}
                      onMouseUp={() => pushUndo()}
                      style={rangeStyle}
                    />
                    {/* Direction slider for motion blur */}
                    {blurType === 'motion' && effectBlur > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'var(--font-ibm)' }}>Direction</span>
                          <span style={{ fontSize: 11, color: 'var(--parchment)', fontFamily: 'monospace' }}>{blurAngle}°</span>
                        </div>
                        <input type="range" min={0} max={360} step={1} value={blurAngle}
                          onChange={e => { const v = Number(e.target.value); setBlurAngle(v); applyFilters(effectBlur, blurType, effectBW, effectBrightness, effectContrast, activePreset, filterIntensity, v, blurCenterX, blurCenterY, blurInnerRadius) }}
                          onMouseUp={() => pushUndo()}
                          style={rangeStyle}
                        />
                      </div>
                    )}
                    {/* Focal center circle picker for radial blur */}
                    {blurType === 'radial' && effectBlur > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <span style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', display: 'block', marginBottom: 8 }}>Focal Center</span>
                        <div
                          style={{
                            width: '100%', aspectRatio: '2 / 1',
                            background: 'rgba(255,255,255,0.04)',
                            border: '1px solid rgba(78,69,56,0.45)',
                            borderRadius: 8, position: 'relative', cursor: 'crosshair',
                            overflow: 'hidden', userSelect: 'none',
                          }}
                          onPointerDown={e => {
                            const rect = e.currentTarget.getBoundingClientRect()
                            const cx = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)))
                            const cy = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)))
                            setBlurCenterX(cx); setBlurCenterY(cy)
                            applyFilters(effectBlur, blurType, effectBW, effectBrightness, effectContrast, activePreset, filterIntensity, blurAngle, cx, cy, blurInnerRadius)
                            e.currentTarget.setPointerCapture(e.pointerId)
                          }}
                          onPointerMove={e => {
                            if (!(e.buttons & 1)) return
                            const rect = e.currentTarget.getBoundingClientRect()
                            const cx = Math.max(0, Math.min(100, Math.round(((e.clientX - rect.left) / rect.width) * 100)))
                            const cy = Math.max(0, Math.min(100, Math.round(((e.clientY - rect.top) / rect.height) * 100)))
                            setBlurCenterX(cx); setBlurCenterY(cy)
                            applyFilters(effectBlur, blurType, effectBW, effectBrightness, effectContrast, activePreset, filterIntensity, blurAngle, cx, cy, blurInnerRadius)
                          }}
                          onPointerUp={() => pushUndo()}
                        >
                          <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(78,69,56,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(78,69,56,0.3) 1px, transparent 1px)', backgroundSize: '25% 25%', pointerEvents: 'none' }} />
                          <div style={{ position: 'absolute', inset: 0, background: `radial-gradient(circle at ${blurCenterX}% ${blurCenterY}%, rgba(182,141,64,0.15) 0%, transparent 55%)`, pointerEvents: 'none' }} />
                          <div style={{ position: 'absolute', left: `${blurCenterX}%`, top: `${blurCenterY}%`, transform: 'translate(-50%, -50%)', width: 14, height: 14, borderRadius: '50%', background: 'var(--candle)', border: '2px solid rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.5)', pointerEvents: 'none' }} />
                        </div>
                        <div style={{ marginTop: 5, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>X: {blurCenterX}%</span><span>Y: {blurCenterY}%</span>
                        </div>
                      </div>
                    )}
                    {/* Sharp zone slider for radial blur */}
                    {blurType === 'radial' && effectBlur > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'var(--font-ibm)' }}>Sharp Zone</span>
                          <span style={{ fontSize: 11, color: 'var(--parchment)', fontFamily: 'monospace' }}>{blurInnerRadius}%</span>
                        </div>
                        <input type="range" min={0} max={100} step={1} value={blurInnerRadius}
                          onChange={e => { const v = Number(e.target.value); setBlurInnerRadius(v); applyFilters(effectBlur, blurType, effectBW, effectBrightness, effectContrast, activePreset, filterIntensity, blurAngle, blurCenterX, blurCenterY, v) }}
                          onMouseUp={() => pushUndo()}
                          style={rangeStyle}
                        />
                      </div>
                    )}
                    {effectBlur > 0 && (
                      <button
                        onClick={() => { setEffectBlur(0); setBlurInnerRadius(0); applyFilters(0, blurType, effectBW, effectBrightness, effectContrast, activePreset, filterIntensity, blurAngle, blurCenterX, blurCenterY, 0); pushUndo() }}
                        style={{ marginTop: 10, fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                      >Reset blur</button>
                    )}
                  </div>
                )}
              </>
            )}

            {/* Filters tab */}
            {effectsTab === 'filters' && (
              <>
                {!selIsImage ? (
                  <div style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', textAlign: 'center', padding: '8px 0 4px', lineHeight: 1.7, opacity: 0.7 }}>
                    Select an image layer<br/>to apply filters
                  </div>
                ) : (
                  <>
                    {/* Filter presets grid */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 5, marginBottom: 14 }}>
                      {FILTER_PRESETS.map(preset => {
                        const isActive = activePreset === preset.name || (!activePreset && preset.name === 'Normal')
                        return (
                          <button
                            key={preset.name}
                            onClick={() => {
                              const next = preset.name === 'Normal' ? null : preset.name
                              setActivePreset(next)
                              applyFilters(effectBlur, blurType, effectBW, effectBrightness, effectContrast, next, filterIntensity, blurAngle, blurCenterX, blurCenterY, blurInnerRadius)
                              pushUndo()
                            }}
                            style={{
                              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                              padding: '7px 4px 6px',
                              background: isActive ? 'rgba(182,141,64,0.14)' : 'rgba(255,255,255,0.04)',
                              border: `1px solid ${isActive ? 'rgba(182,141,64,0.55)' : 'rgba(78,69,56,0.3)'}`,
                              borderRadius: 8, cursor: 'pointer',
                              transition: 'all 0.15s',
                            }}
                            onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.07)' }}
                            onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'rgba(255,255,255,0.04)' }}
                          >
                            <div style={{ width: 28, height: 20, borderRadius: 4, background: preset.swatch, border: `1.5px solid ${isActive ? 'rgba(182,141,64,0.5)' : 'rgba(255,255,255,0.1)'}` }} />
                            <span style={{ fontSize: 8, fontFamily: 'var(--font-ibm)', fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: isActive ? 'var(--candle)' : 'var(--sand)', textAlign: 'center', lineHeight: 1.2 }}>
                              {preset.label}
                            </span>
                          </button>
                        )
                      })}
                    </div>

                    <div style={{ height: 1, background: 'rgba(78,69,56,0.35)', marginBottom: 12 }} />

                    {/* Fine-tune sliders — Intensity (preset only), Brightness, Contrast */}
                    {([
                      ...(activePreset ? [{ label: 'Intensity', value: filterIntensity, min: 0, max: 200, set: (v: number) => { setFilterIntensity(v); applyFilters(effectBlur, blurType, effectBW, effectBrightness, effectContrast, activePreset, v, blurAngle, blurCenterX, blurCenterY, blurInnerRadius) } }] : []),
                      { label: 'Brightness', value: effectBrightness, min: -100, max: 100, set: (v: number) => { setEffectBrightness(v); applyFilters(effectBlur, blurType, effectBW, v, effectContrast, activePreset, filterIntensity, blurAngle, blurCenterX, blurCenterY, blurInnerRadius) } },
                      { label: 'Contrast',   value: effectContrast,   min: -100, max: 100, set: (v: number) => { setEffectContrast(v);   applyFilters(effectBlur, blurType, effectBW, effectBrightness, v, activePreset, filterIntensity, blurAngle, blurCenterX, blurCenterY, blurInnerRadius) } },
                    ]).map(({ label, value, min, max, set }) => (
                      <div key={label} style={{ marginBottom: 12 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'var(--font-ibm)' }}>{label}</span>
                          <span style={{ fontSize: 11, color: 'var(--parchment)', fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>{label === 'Intensity' ? `${value}%` : value}</span>
                        </div>
                        <input type="range" min={min} max={max} step={1} value={value}
                          onChange={e => set(Number(e.target.value))}
                          onMouseUp={() => pushUndo()}
                          style={rangeStyle}
                        />
                      </div>
                    ))}
                    {(activePreset || effectBW !== 0 || effectBrightness !== 0 || effectContrast !== 0) && (
                      <button
                        onClick={() => {
                          setActivePreset(null); setEffectBW(0); setEffectBrightness(0); setEffectContrast(0); setFilterIntensity(100)
                          applyFilters(effectBlur, blurType, 0, 0, 0, null, 100, blurAngle, blurCenterX, blurCenterY, blurInnerRadius); pushUndo()
                        }}
                        style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', background: 'none', border: 'none', cursor: 'pointer', padding: 0, textDecoration: 'underline' }}
                      >Reset filters</button>
                    )}
                  </>
                )}
              </>
            )}

            {/* Adjust tab — works on any layer */}
            {effectsTab === 'adjust' && (
              <>
                {!selectedObj ? (
                  <div style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'var(--font-ibm)', textAlign: 'center', padding: '8px 0 4px', lineHeight: 1.7, opacity: 0.7 }}>
                    Select a layer<br/>to adjust properties
                  </div>
                ) : (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'var(--font-ibm)' }}>Opacity</span>
                      <span style={{ fontSize: 11, color: 'var(--parchment)', fontFamily: 'monospace', minWidth: 28, textAlign: 'right' }}>{Math.round(opacity * 100)}</span>
                    </div>
                    <input type="range" min={0} max={100} step={1} value={Math.round(opacity * 100)}
                      onChange={e => updateOpacity(Number(e.target.value) / 100)}
                      onMouseUp={() => pushUndo()}
                      style={rangeStyle}
                    />
                  </div>
                )}
              </>
            )}
          </div>
          ) : (
          <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

            {!selectedObj && (
              <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', textAlign: 'center', paddingTop: 40, lineHeight: 1.7 }}>
                Select an element<br/>to see its properties
              </div>
            )}

            {selectedObj && (
              <>
                {/* ── POSITIONING ── */}
                <div style={{ marginBottom: 16 }}>
                  <span style={sectionLabel}>Positioning</span>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {(['X', 'Y'] as const).map(axis => (
                      <div key={axis} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
                        <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginBottom: 4 }}>{axis} Axis</div>
                        <input
                          type="number"
                          value={axis === 'X' ? posX : posY}
                          onChange={e => {
                            const v = Number(e.target.value)
                            if (axis === 'X') updatePosition(v, posY)
                            else updatePosition(posX, v)
                          }}
                          style={{ background: 'transparent', border: 'none', outline: 'none', color: 'var(--parchment)', fontFamily: 'monospace', fontSize: 13, width: '100%', padding: 0 }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* ── TEXT PROPERTIES ── */}
                {selIsText && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={sectionLabel}>Typography</span>

                    {/* Font family */}
                    <div style={{ ...propRow, flexDirection: 'column', alignItems: 'stretch' }}>
                      <div style={{ ...propLabel, marginBottom: 4 }}>Font Family</div>
                      <select
                        value={fontFamily}
                        onChange={e => updateFontFamily(e.target.value)}
                        style={{ ...inputStyle, fontFamily: fontFamily }}
                      >
                        {FONTS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
                      </select>
                    </div>

                    {/* Font size */}
                    <div style={{ ...propRow }}>
                      <span style={propLabel}>Size</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button style={{ ...iconBtn(), width: 26, height: 26 }}
                          onClick={() => { const n = Math.max(6, fontSize - 1); setFontSize(n); updateFontSize(n); pushUndo() }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,69,56,0.2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <svg width="8" height="2" viewBox="0 0 8 2"><line x1="0" y1="1" x2="8" y2="1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                        <input
                          type="number" min={6} max={300} value={fontSize}
                          onChange={e => { const n = Number(e.target.value); setFontSize(n); updateFontSize(n) }}
                          onBlur={() => pushUndo()}
                          style={{ ...inputStyle, width: 52, textAlign: 'center', padding: '4px 4px' }}
                        />
                        <button style={{ ...iconBtn(), width: 26, height: 26 }}
                          onClick={() => { const n = fontSize + 1; setFontSize(n); updateFontSize(n); pushUndo() }}
                          onMouseEnter={e => e.currentTarget.style.background = 'rgba(78,69,56,0.2)'}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <svg width="8" height="8" viewBox="0 0 8 8"><line x1="4" y1="0" x2="4" y2="8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/><line x1="0" y1="4" x2="8" y2="4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                        </button>
                      </div>
                    </div>

                    {/* Font weight */}
                    <div style={{ ...propRow, flexDirection: 'column', alignItems: 'stretch' }}>
                      <div style={{ ...propLabel, marginBottom: 4 }}>Weight</div>
                      <select
                        value={fontWeight}
                        onChange={e => updateFontWeight(e.target.value)}
                        style={{ ...inputStyle, fontFamily: fontFamily, fontWeight: fontWeight as any }}
                      >
                        {[
                          { value: '100', label: 'Thin · 100' },
                          { value: '200', label: 'ExtraLight · 200' },
                          { value: '300', label: 'Light · 300' },
                          { value: '400', label: 'Regular · 400' },
                          { value: '500', label: 'Medium · 500' },
                          { value: '600', label: 'SemiBold · 600' },
                          { value: '700', label: 'Bold · 700' },
                          { value: '800', label: 'ExtraBold · 800' },
                          { value: '900', label: 'Black · 900' },
                        ].map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    </div>

                    {/* Italic + text width */}
                    <div style={propRow}>
                      <span style={propLabel}>Italic</span>
                      <button
                        onClick={updateItalic}
                        style={{ ...iconBtn(isItalic), width: 30, height: 30, fontStyle: 'italic', fontFamily: 'Georgia, serif', fontSize: 14 }}
                        onMouseEnter={e => e.currentTarget.style.background = isItalic ? 'rgba(182,141,64,0.25)' : 'rgba(78,69,56,0.2)'}
                        onMouseLeave={e => e.currentTarget.style.background = isItalic ? 'rgba(182,141,64,0.15)' : 'transparent'}
                      >I</button>
                    </div>

                    {/* Text width */}
                    <div style={propRow}>
                      <span style={propLabel}>Width</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <input
                          type="number" min={20} max={1080} value={textWidth}
                          onChange={e => updateTextWidth(Number(e.target.value))}
                          style={{ ...inputStyle, width: 72, textAlign: 'right', padding: '4px 8px' }}
                        />
                        <span style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', flexShrink: 0 }}>px</span>
                      </div>
                    </div>

                    {/* Color */}
                    <div style={propRow}>
                      <span style={propLabel}>Color</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ position: 'relative', width: 28, height: 28 }}>
                          <input
                            key={selectedObj.lumenId + '_tc'} type="color"
                            value={textColor.startsWith('#') ? textColor : '#F6F2EA'}
                            onChange={e => { setTextColor(e.target.value); updateFill(e.target.value) }}
                            style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                          />
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: textColor.startsWith('#') ? textColor : '#F6F2EA', border: '2px solid var(--border)' }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'monospace' }}>{textColor.startsWith('#') ? textColor.toUpperCase() : textColor}</span>
                      </div>
                    </div>

                    {/* Alignment */}
                    <div style={propRow}>
                      <span style={propLabel}>Align</span>
                      <div style={{ display: 'flex', gap: 2 }}>
                        {([
                          { value: 'left',   icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="1" y1="2" x2="11" y2="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="1" y1="5" x2="8" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="1" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="1" y1="11" x2="6" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
                          { value: 'center', icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="1" y1="2" x2="11" y2="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="3" y1="5" x2="9" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="1" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="4" y1="11" x2="8" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
                          { value: 'right',  icon: <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><line x1="1" y1="2" x2="11" y2="2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="4" y1="5" x2="11" y2="5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="1" y1="8" x2="11" y2="8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/><line x1="6" y1="11" x2="11" y2="11" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/></svg> },
                        ] as const).map(({ value, icon }) => (
                          <button key={value} onClick={() => updateTextAlign(value)}
                            style={{ ...iconBtn(textAlign === value), width: 30, height: 30 }}
                            onMouseEnter={e => e.currentTarget.style.background = textAlign === value ? 'rgba(182,141,64,0.25)' : 'rgba(78,69,56,0.2)'}
                            onMouseLeave={e => e.currentTarget.style.background = textAlign === value ? 'rgba(182,141,64,0.15)' : 'transparent'}
                          >{icon}</button>
                        ))}
                      </div>
                    </div>

                    {/* Line height */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={propLabel}>Line Height</span>
                        <span style={{ fontSize: 12, color: 'var(--parchment)', fontFamily: 'monospace' }}>{lineHeight.toFixed(2)}</span>
                      </div>
                      <input type="range" min={0.8} max={3} step={0.05} value={lineHeight}
                        onChange={e => updateLineHeight(Number(e.target.value))}
                        onMouseUp={() => pushUndo()}
                        style={rangeStyle}
                      />
                    </div>

                    {/* Char spacing */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={propLabel}>Spacing</span>
                        <span style={{ fontSize: 12, color: 'var(--parchment)', fontFamily: 'monospace' }}>{charSpacing}</span>
                      </div>
                      <input type="range" min={-200} max={800} step={10} value={charSpacing}
                        onChange={e => updateCharSpacing(Number(e.target.value))}
                        onMouseUp={() => pushUndo()}
                        style={rangeStyle}
                      />
                    </div>

                    {/* Quick edit textarea */}
                    <div style={{ marginTop: 4 }}>
                      <div style={{ ...propLabel, marginBottom: 6 }}>Content</div>
                      <textarea
                        key={selectedObj.lumenId + '_text'}
                        defaultValue={selectedObj.text}
                        onChange={e => updateText(e.target.value)}
                        rows={3}
                        placeholder="Edit text…"
                        style={{ ...inputStyle, resize: 'vertical', minHeight: 60 }}
                      />
                    </div>
                  </div>
                )}

                {/* ── SHAPE PROPERTIES ── */}
                {selIsShape && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={sectionLabel}>Appearance</span>

                    {/* Fill color */}
                    <div style={propRow}>
                      <span style={propLabel}>Fill</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ position: 'relative', width: 28, height: 28 }}>
                          <input
                            key={selectedObj.lumenId + '_fill'} type="color"
                            value={fillColor.startsWith('#') ? fillColor : '#b68d40'}
                            onChange={e => { setFillColor(e.target.value); updateFill(e.target.value) }}
                            style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                          />
                          <div style={{ width: 28, height: 28, borderRadius: 6, background: fillColor.startsWith('#') ? fillColor : '#b68d40', border: '2px solid var(--border)' }} />
                        </div>
                        <span style={{ fontSize: 12, color: 'var(--sand)', fontFamily: 'monospace' }}>{fillColor.startsWith('#') ? fillColor.toUpperCase() : fillColor}</span>
                      </div>
                    </div>

                    {/* Stroke */}
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                        <span style={propLabel}>Border</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div style={{ position: 'relative', width: 24, height: 24 }}>
                            <input type="color"
                              value={strokeColor.startsWith('#') ? strokeColor : '#000000'}
                              onChange={e => updateStroke(e.target.value, strokeWidth)}
                              style={{ opacity: 0, position: 'absolute', inset: 0, cursor: 'pointer', width: '100%', height: '100%' }}
                            />
                            <div style={{ width: 24, height: 24, borderRadius: 4, background: strokeColor.startsWith('#') ? strokeColor : '#000', border: '2px solid var(--border)' }} />
                          </div>
                          <input
                            type="number" min={0} max={40} value={strokeWidth}
                            onChange={e => updateStroke(strokeColor, Number(e.target.value))}
                            style={{ ...inputStyle, width: 56, padding: '4px 8px' }}
                            placeholder="0"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Corner radius — rect only */}
                    {selIsRect && (
                      <div style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={propLabel}>Radius</span>
                          <span style={{ fontSize: 12, color: 'var(--parchment)', fontFamily: 'monospace' }}>{Math.round(radius)}px</span>
                        </div>
                        <input type="range" min={0} max={540} step={4} value={radius}
                          onChange={e => updateRadius(Number(e.target.value))}
                          onMouseUp={() => pushUndo()}
                          style={rangeStyle}
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* ── IMAGE PROPERTIES ── */}
                {selIsImage && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={sectionLabel}>Media</span>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 10 }}>
                      {['Width', 'Height'].map((dim) => {
                        const val = dim === 'Width'
                          ? Math.round((selectedObj.width ?? 0) * (selectedObj.scaleX ?? 1) / SCALE)
                          : Math.round((selectedObj.height ?? 0) * (selectedObj.scaleY ?? 1) / SCALE)
                        return (
                          <div key={dim} style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 10, padding: '8px 10px' }}>
                            <div style={{ fontSize: 10, color: 'var(--muted)', fontFamily: 'var(--font-ibm)', marginBottom: 4 }}>{dim}</div>
                            <span style={{ fontSize: 13, color: 'var(--parchment)', fontFamily: 'monospace' }}>{val}px</span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {/* ── EFFECTS — images only ── */}
                {selIsImage && (
                  <div style={{ marginBottom: 16 }}>
                    <span style={sectionLabel}>Effects</span>
                    {([
                      { label: 'Blur',       value: effectBlur,       min: 0,    max: 100, step: 1, set: (v: number) => { setEffectBlur(v);       applyFilters(v,          blurType, effectBW, effectBrightness, effectContrast, activePreset, filterIntensity, blurAngle, blurCenterX, blurCenterY, blurInnerRadius) } },
                      { label: 'B&W',        value: effectBW,         min: 0,    max: 100, step: 1, set: (v: number) => { setEffectBW(v);         applyFilters(effectBlur, blurType, v,        effectBrightness, effectContrast, activePreset, filterIntensity, blurAngle, blurCenterX, blurCenterY, blurInnerRadius) } },
                      { label: 'Brightness', value: effectBrightness, min: -100, max: 100, step: 1, set: (v: number) => { setEffectBrightness(v); applyFilters(effectBlur, blurType, effectBW, v,               effectContrast, activePreset, filterIntensity, blurAngle, blurCenterX, blurCenterY, blurInnerRadius) } },
                      { label: 'Contrast',   value: effectContrast,   min: -100, max: 100, step: 1, set: (v: number) => { setEffectContrast(v);   applyFilters(effectBlur, blurType, effectBW, effectBrightness, v,             activePreset, filterIntensity, blurAngle, blurCenterX, blurCenterY, blurInnerRadius) } },
                    ]).map(({ label, value, min, max, step, set }) => (
                      <div key={label} style={{ marginBottom: 10 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                          <span style={propLabel}>{label}</span>
                          <span style={{ fontSize: 12, color: 'var(--parchment)', fontFamily: 'monospace' }}>{value}</span>
                        </div>
                        <input type="range" min={min} max={max} step={step} value={value}
                          onChange={e => set(Number(e.target.value))}
                          onMouseUp={() => pushUndo()}
                          style={rangeStyle}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* ── OPACITY — shared ── */}
                <div style={{ marginBottom: 16 }}>
                  {!selIsText && <span style={sectionLabel}>Appearance</span>}
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={propLabel}>Opacity</span>
                      <span style={{ fontSize: 12, color: 'var(--parchment)', fontFamily: 'monospace' }}>{Math.round(opacity * 100)}%</span>
                    </div>
                    <input type="range" min={0} max={1} step={0.01} value={opacity}
                      onChange={e => updateOpacity(Number(e.target.value))}
                      onMouseUp={() => pushUndo()}
                      style={rangeStyle}
                    />
                  </div>
                </div>

                {/* ── LAYER ACTIONS ── */}
                <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => { const id = selectedObj?.lumenId ?? selectedObj?.type; if (id) moveLayerUp(id) }}
                      title="Bring forward"
                      style={{
                        flex: 1, padding: '8px 0',
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--sand)',
                        fontSize: 11, fontFamily: 'var(--font-ibm)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--candle)'; e.currentTarget.style.color = 'var(--parchment)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 1v8M2 4l3-3 3 3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Forward
                    </button>
                    <button
                      onClick={() => { const id = selectedObj?.lumenId ?? selectedObj?.type; if (id) moveLayerDown(id) }}
                      title="Send backward"
                      style={{
                        flex: 1, padding: '8px 0',
                        background: 'var(--surface-2)', border: '1px solid var(--border)',
                        borderRadius: 8, color: 'var(--sand)',
                        fontSize: 11, fontFamily: 'var(--font-ibm)', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4,
                        transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--candle)'; e.currentTarget.style.color = 'var(--parchment)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}
                    >
                      <svg width="10" height="10" viewBox="0 0 10 10"><path d="M5 9V1M8 6l-3 3-3-3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/></svg>
                      Backward
                    </button>
                  </div>
                  <button
                    onClick={duplicateSelected}
                    style={{
                      width: '100%', padding: '9px 0',
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 8, color: 'var(--sand)',
                      fontSize: 12, fontFamily: 'var(--font-ibm)', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--candle)'; e.currentTarget.style.color = 'var(--parchment)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--sand)' }}
                  >
                    Duplicate Layer
                  </button>
                  <button
                    onClick={lockSelected}
                    style={{
                      width: '100%', padding: '9px 0',
                      background: 'transparent', border: '1px solid var(--border)',
                      borderRadius: 8, color: 'var(--muted)',
                      fontSize: 12, fontFamily: 'var(--font-ibm)', cursor: 'pointer',
                      transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(182,141,64,0.3)'; e.currentTarget.style.color = 'var(--sand)' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--muted)' }}
                  >
                    {selectedObj?.lockMovementX ? 'Unlock Selection' : 'Lock Selection'}
                  </button>
                </div>
              </>
            )}
          </div>
          )}
        </aside>
        </main>
      </div>

      {/* ─── BRAND ASSET PICKER MODAL ─────────────────────────────────────────── */}
      {assetPickerOpen && (
        <div
          onClick={() => setAssetPickerOpen(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 60, background: 'rgba(0,0,0,0.65)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 16, width: 560, maxHeight: '70vh',
              display: 'flex', flexDirection: 'column', overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
            }}
          >
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
              <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 15, color: 'var(--parchment)' }}>Brand Assets</span>
              <button onClick={() => setAssetPickerOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--sand)', cursor: 'pointer', fontSize: 20, lineHeight: 1, padding: '2px 6px' }}>×</button>
            </div>
            <div style={{ padding: 16, overflowY: 'auto', flex: 1 }}>
              {assetsLoading ? (
                <div style={{ color: 'var(--sand)', fontFamily: 'var(--font-ibm)', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>Loading…</div>
              ) : brandAssets.length === 0 ? (
                <div style={{ color: 'var(--muted)', fontFamily: 'var(--font-ibm)', fontSize: 13, padding: '32px 0', textAlign: 'center' }}>
                  No brand assets yet. Upload them in Brand Brain → Assets.
                </div>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
                  {brandAssets.map(asset => (
                    <div
                      key={asset.id}
                      onClick={async () => { setAssetPickerOpen(false); await addImageToCanvas(asset.public_url, asset.public_url) }}
                      style={{ cursor: 'pointer', borderRadius: 10, overflow: 'hidden', aspectRatio: '1', background: 'var(--surface-2)', border: '1px solid var(--border)', transition: 'border-color .15s, transform .15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--candle)'; e.currentTarget.style.transform = 'scale(1.03)' }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.transform = 'scale(1)' }}
                      title={asset.name ?? 'Asset'}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={asset.public_url} alt={asset.name ?? ''} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

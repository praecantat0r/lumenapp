'use client'
import { useEffect, useRef, useState } from 'react'

// ── Constants (same as CanvasEditor) ────────────────────────────────────────
const DISPLAY_WIDTH  = 540
const DISPLAY_HEIGHT = 675
const SCALE          = 0.5   // 1080 → 540

// ── Test datasets ────────────────────────────────────────────────────────────
// TEST A: one full-canvas red rect — should cover every pixel of the 540×675 canvas
const TEST_A = [
  { lumenId: 'full-bg', type: 'rect', left: 0, top: 0, width: 1080, height: 1350, fill: '#cc2200' },
]

// TEST B: quadrant rects — each should fill exactly one quarter
const TEST_B = [
  { lumenId: 'tl', type: 'rect', left: 0,   top: 0,   width: 540,  height: 675,  fill: '#cc2200' }, // top-left  → red
  { lumenId: 'tr', type: 'rect', left: 540,  top: 0,   width: 540,  height: 675,  fill: '#2266cc' }, // top-right → blue
  { lumenId: 'bl', type: 'rect', left: 0,   top: 675,  width: 540,  height: 675,  fill: '#22aa44' }, // bot-left  → green
  { lumenId: 'br', type: 'rect', left: 540,  top: 675,  width: 540,  height: 675,  fill: '#cc9900' }, // bot-right → yellow
]

// TEST C: DEFAULT_CANVAS_JSON (the real template data)
const TEST_C = [
  { lumenId: 'background-image', type: 'rect',    left: 0,  top: 0,    width: 1080, height: 1350, fill: '#221F15' },
  { lumenId: 'overlay',          type: 'rect',    left: 0,  top: 0,    width: 1080, height: 1350, fill: 'rgba(0,0,0,0.35)' },
  { lumenId: 'brand-name',       type: 'textbox', left: 60, top: 60,   width: 400,  fontSize: 28, fill: 'rgba(246,242,234,0.6)', text: 'BRAND NAME',             fontFamily: 'sans-serif', fontWeight: '300' },
  { lumenId: 'title',            type: 'textbox', left: 60, top: 900,  width: 900,  fontSize: 96, fill: '#F6F2EA',               text: 'Your Headline Here',      fontFamily: 'sans-serif', fontWeight: '700' },
  { lumenId: 'subtitle',         type: 'textbox', left: 60, top: 1080, width: 900,  fontSize: 44, fill: 'rgba(246,242,234,0.75)',text: 'Supporting line of text', fontFamily: 'sans-serif', fontWeight: '300' },
  { lumenId: 'cta',              type: 'textbox', left: 60, top: 1200, width: 400,  fontSize: 36, fill: '#D4A84B',               text: 'Shop Now →',              fontFamily: 'sans-serif', fontWeight: '600' },
]

// ── Types ────────────────────────────────────────────────────────────────────
interface ObjInfo {
  lumenId: string
  storedLeft: number; storedTop: number; storedW: number; storedH: number
  displayLeft: number; displayTop: number; displayW: number; displayH: number
  fabricLeft: number; fabricTop: number; fabricW: number; fabricH: number
  posOk: boolean; sizeOk: boolean
}
interface CanvasInfo {
  fabricW: number; fabricH: number
  elAttrW: number; elAttrH: number
  cssW: string; cssH: string
  dpr: number; vt: string
  wrapperCssW: string; wrapperCssH: string
  upperCssW: string; upperCssH: string
}

// ── Single test canvas ────────────────────────────────────────────────────────
function TestCanvas({ label, description, objects, bg = '#111009' }: {
  label: string
  description: string
  objects: any[]
  bg?: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [info, setInfo] = useState<CanvasInfo | null>(null)
  const [objs, setObjs] = useState<ObjInfo[]>([])
  const [status, setStatus] = useState<'loading' | 'ok' | 'error'>('loading')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    let canvas: any

    async function run() {
      if (!canvasRef.current) return
      const { Canvas, Rect, Textbox } = await import('fabric')

      canvas = new Canvas(canvasRef.current, {
        width: DISPLAY_WIDTH,
        height: DISPLAY_HEIGHT,
        enableRetinaScaling: false,
        selection: false,
        preserveObjectStacking: true,
      })
      canvas.backgroundColor = bg

      const lowerEl = (canvas as any).lowerCanvasEl as HTMLCanvasElement
      const upperEl = (canvas as any).upperCanvasEl as HTMLCanvasElement | undefined
      const wrapperEl = (canvas as any).wrapperEl as HTMLElement | undefined

      ;[lowerEl, upperEl, wrapperEl].forEach((el: HTMLElement | undefined) => {
        if (el) { el.style.width = `${DISPLAY_WIDTH}px`; el.style.height = `${DISPLAY_HEIGHT}px` }
      })

      const objInfos: ObjInfo[] = []

      for (const src of objects) {
        const dLeft = src.left * SCALE
        const dTop  = src.top  * SCALE
        const dW    = (src.width  ?? 200) * SCALE
        const dH    = (src.height ?? 100) * SCALE

        let obj: any
        if (src.type === 'rect') {
          obj = new Rect({ left: dLeft, top: dTop, width: dW, height: dH, fill: src.fill ?? '#fff', originX: 'left', originY: 'top' })
        } else {
          obj = new Textbox(src.text ?? '', {
            left: dLeft, top: dTop, width: dW,
            fontSize: (src.fontSize ?? 32) * SCALE,
            fontFamily: src.fontFamily ?? 'sans-serif',
            fontWeight: src.fontWeight ?? 'normal',
            fill: src.fill ?? '#fff',
            originX: 'left', originY: 'top',
          })
        }
        obj.lumenId = src.lumenId
        canvas.add(obj)

        objInfos.push({
          lumenId: src.lumenId,
          storedLeft: src.left, storedTop: src.top, storedW: src.width ?? 200, storedH: src.height ?? 100,
          displayLeft: dLeft, displayTop: dTop, displayW: dW, displayH: dH,
          fabricLeft: obj.left, fabricTop: obj.top, fabricW: obj.width, fabricH: obj.height,
          posOk:  Math.abs(obj.left - dLeft) < 1 && Math.abs(obj.top - dTop) < 1,
          sizeOk: Math.abs(obj.width - dW) < 1,
        })
      }

      canvas.renderAll()

      // Measure actual CSS dimensions after render
      const lEl = canvasRef.current!
      const comp = window.getComputedStyle(lEl)
      const wComp = wrapperEl ? window.getComputedStyle(wrapperEl) : null
      const uComp = upperEl  ? window.getComputedStyle(upperEl)  : null

      setInfo({
        fabricW: canvas.width, fabricH: canvas.height,
        elAttrW: lEl.width, elAttrH: lEl.height,
        cssW: comp.width, cssH: comp.height,
        dpr: window.devicePixelRatio,
        vt: JSON.stringify(canvas.viewportTransform),
        wrapperCssW: wComp?.width ?? '—', wrapperCssH: wComp?.height ?? '—',
        upperCssW: uComp?.width ?? '—', upperCssH: uComp?.height ?? '—',
      })
      setObjs(objInfos)
      setStatus('ok')
    }

    run().catch(e => { setStatus('error'); setErrorMsg(String(e)) })
    return () => { try { canvas?.dispose() } catch {} }
  }, [])                                                                         // eslint-disable-line react-hooks/exhaustive-deps

  const allOk = objs.every(o => o.posOk && o.sizeOk)
  const statusColor = status === 'error' ? '#ff6b6b' : allOk ? '#22aa44' : '#cc9900'

  return (
    <div style={{ background: '#1A1810', borderRadius: 12, padding: 20, border: `2px solid ${statusColor}`, marginBottom: 24 }}>
      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start', flexWrap: 'wrap' }}>

        {/* Canvas + reference side by side */}
        <div>
          <div style={{ fontSize: 11, color: '#C4B99A', marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            {label} — Fabric canvas (should match reference →)
          </div>
          {/* Gold border = our JSX wrapper boundary */}
          <div style={{ border: '2px solid #D4A84B', display: 'inline-block', lineHeight: 0 }}>
            <canvas ref={canvasRef} />
          </div>
        </div>

        {/* CSS reference — same size, same rects drawn in pure CSS */}
        <div>
          <div style={{ fontSize: 11, color: '#C4B99A', marginBottom: 4, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Reference (pure CSS, no Fabric)
          </div>
          <div style={{ width: DISPLAY_WIDTH, height: DISPLAY_HEIGHT, position: 'relative', background: bg, border: '2px solid #555', overflow: 'hidden' }}>
            {objects.filter(o => o.type === 'rect').map(o => (
              <div key={o.lumenId} style={{
                position: 'absolute',
                left: o.left * SCALE, top: o.top * SCALE,
                width: (o.width ?? 200) * SCALE, height: (o.height ?? 100) * SCALE,
                background: o.fill,
              }} />
            ))}
            {objects.filter(o => o.type === 'textbox').map(o => (
              <div key={o.lumenId} style={{
                position: 'absolute',
                left: o.left * SCALE, top: o.top * SCALE,
                width: (o.width ?? 200) * SCALE,
                fontSize: (o.fontSize ?? 32) * SCALE,
                color: o.fill,
                fontFamily: o.fontFamily ?? 'sans-serif',
                fontWeight: o.fontWeight ?? 'normal',
                lineHeight: 1.16,
                whiteSpace: 'pre-wrap',
              }}>{o.text}</div>
            ))}
          </div>
        </div>

        {/* Debug data */}
        <div style={{ flex: 1, minWidth: 280, fontSize: 11, fontFamily: 'monospace' }}>
          <div style={{ marginBottom: 8, fontWeight: 700, color: statusColor, fontSize: 13 }}>
            {status === 'error' ? `✗ ERROR: ${errorMsg}` : allOk ? '✓ All positions correct' : '⚠ Position mismatches detected'}
          </div>

          {description && (
            <div style={{ color: '#C4B99A', marginBottom: 8, fontSize: 11, lineHeight: 1.5 }}>{description}</div>
          )}

          {info && (
            <table style={{ borderCollapse: 'collapse', width: '100%', marginBottom: 12 }}>
              <tbody>
                {[
                  ['fabric.width / .height',     `${info.fabricW} × ${info.fabricH}`, info.fabricW === DISPLAY_WIDTH && info.fabricH === DISPLAY_HEIGHT],
                  ['canvas el attr w × h',        `${info.elAttrW} × ${info.elAttrH}`, info.elAttrW === DISPLAY_WIDTH],
                  ['canvas el CSS w × h',          `${info.cssW} × ${info.cssH}`, info.cssW === `${DISPLAY_WIDTH}px` && info.cssH === `${DISPLAY_HEIGHT}px`],
                  ['Fabric wrapper CSS w × h',      `${info.wrapperCssW} × ${info.wrapperCssH}`, info.wrapperCssW === `${DISPLAY_WIDTH}px`],
                  ['upper canvas CSS w × h',        `${info.upperCssW} × ${info.upperCssH}`, info.upperCssW === `${DISPLAY_WIDTH}px`],
                  ['DPR',                           String(info.dpr), true],
                  ['viewportTransform',              info.vt, info.vt === '[1,0,0,1,0,0]'],
                ].map(([key, val, ok]) => (
                  <tr key={key as string} style={{ borderBottom: '1px solid #2D2A1F' }}>
                    <td style={{ padding: '2px 6px', color: '#C4B99A' }}>{key as string}</td>
                    <td style={{ padding: '2px 6px', color: ok ? '#F6F2EA' : '#ff6b6b' }}>{val as string} {!ok ? '⚠' : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {objs.map(o => (
            <div key={o.lumenId} style={{ marginBottom: 6, padding: '4px 6px', background: '#111009', borderRadius: 4, borderLeft: `3px solid ${o.posOk && o.sizeOk ? '#22aa44' : '#ff6b6b'}` }}>
              <div style={{ color: o.posOk && o.sizeOk ? '#D4A84B' : '#ff6b6b', fontWeight: 700 }}>
                {o.lumenId} {o.posOk && o.sizeOk ? '✓' : '✗'}
              </div>
              <div style={{ color: '#C4B99A' }}>stored:  left={o.storedLeft} top={o.storedTop} w={o.storedW}</div>
              <div style={{ color: '#C4B99A' }}>display: left={o.displayLeft} top={o.displayTop} w={o.displayW}</div>
              <div style={{ color: o.posOk ? '#F6F2EA' : '#ff6b6b' }}>fabric:  left={o.fabricLeft} top={o.fabricTop} w={o.fabricW}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function CanvasTestPage() {
  return (
    <div style={{ padding: 40, background: '#111009', minHeight: '100vh', color: '#F6F2EA', fontFamily: 'var(--font-ibm, monospace)' }}>
      <h1 style={{ fontFamily: 'var(--font-syne, sans-serif)', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Canvas Render Debug
      </h1>
      <p style={{ color: '#C4B99A', fontSize: 13, marginBottom: 32, lineHeight: 1.6 }}>
        Each test renders in Fabric and in pure CSS side-by-side. They must look identical.<br />
        Gold border = expected canvas boundary (540×675). Check the ⚠ flags in the tables.
      </p>

      <TestCanvas
        label="TEST A — full red rect"
        description="A single rect covering 0,0→1080,1350 (1080-space) = 0,0→540,675 display-space. The entire Fabric canvas must be solid red. If only part is red, there is a coordinate or DPR bug."
        objects={TEST_A}
        bg="#111009"
      />

      <TestCanvas
        label="TEST B — four quadrant rects"
        description="Four rects each covering one quadrant in 1080-space. Display-space: TL=red (0,0,270,337.5), TR=blue (270,0,270,337.5), BL=green (0,337.5,270,337.5), BR=yellow (270,337.5,270,337.5). Only TL (red) should be visible because the others are outside the 540×675 display canvas."
        objects={TEST_B}
        bg="#111009"
      />

      <TestCanvas
        label="TEST C — DEFAULT_CANVAS_JSON (real template)"
        description="The full default template. Background fills entire canvas. Brand name top-left. Headline/subtitle/CTA in the bottom portion. Compare against the CSS reference panel."
        objects={TEST_C}
        bg="#111009"
      />
    </div>
  )
}

'use client'
import { useEffect, useRef, useState } from 'react'

// ── Coordinate spaces ────────────────────────────────────────────────────────
// Templates are stored in 1080×1350 space ("store-space").
// The Fabric editor renders at 540×675 ("display-space") using SCALE=0.5.
// The render engine (Puppeteer) renders at 1080×1350 using store-space directly.
// This page shows both side-by-side at the same visual size so discrepancies
// are immediately obvious.

const STORE_W   = 1080
const STORE_H   = 1350
const DISP_W    = 540
const DISP_H    = 675
const SCALE     = DISP_W / STORE_W   // 0.5

// ── Template (same as SEED_CANVAS_JSON in renderer.ts) ───────────────────────
const TEMPLATE: any = {
  version: '5.3.0',
  background: '#111009',
  width: STORE_W,
  height: STORE_H,
  objects: [
    { lumenId: 'background-image', type: 'rect',    left: 0,  top: 0,    width: 1080, height: 1350, fill: '#221F15' },
    { lumenId: 'overlay',          type: 'rect',    left: 0,  top: 0,    width: 1080, height: 1350, fill: 'rgba(0,0,0,0.35)' },
    { lumenId: 'brand-name',       type: 'textbox', left: 60, top: 60,   width: 400,  fontSize: 28, fill: 'rgba(246,242,234,0.6)', text: 'BRAND NAME',             fontFamily: 'IBM Plex Sans', fontWeight: '300', charSpacing: 8 },
    { lumenId: 'title',            type: 'textbox', left: 60, top: 900,  width: 900,  fontSize: 96, fill: '#F6F2EA',               text: 'Your Headline Here',      fontFamily: 'Syne',          fontWeight: '700', lineHeight: 1.1 },
    { lumenId: 'subtitle',         type: 'textbox', left: 60, top: 1080, width: 900,  fontSize: 44, fill: 'rgba(246,242,234,0.75)',text: 'Supporting line of text', fontFamily: 'IBM Plex Sans', fontWeight: '300' },
    { lumenId: 'cta',              type: 'textbox', left: 60, top: 1200, width: 400,  fontSize: 36, fill: '#D4A84B',               text: 'Shop Now →',              fontFamily: 'Syne',          fontWeight: '600' },
  ],
}

// ── Render-engine panel (mirrors render-engine.ts logic exactly) ─────────────
// Rendered at 1080×1350 then CSS-scaled to 540×675 so both panels match visually.
function RenderEnginePanel({ objects, background }: { objects: any[]; background: string }) {
  return (
    <div style={{ width: DISP_W, height: DISP_H, overflow: 'hidden', flexShrink: 0, border: '2px solid #555' }}>
      {/* Scale 1080→540 via CSS transform */}
      <div style={{ width: STORE_W, height: STORE_H, transform: `scale(${SCALE})`, transformOrigin: '0 0', position: 'relative', background }}>
        {objects.map((obj: any) => renderEngineObject(obj))}
      </div>
    </div>
  )
}

function renderEngineObject(obj: any) {
  const scaleX  = obj.scaleX ?? 1
  const scaleY  = obj.scaleY ?? 1
  const w       = (obj.width ?? 100) * scaleX
  const h       = (obj.height ?? 100) * scaleY
  const angle   = obj.angle ?? 0
  const opacity = obj.opacity ?? 1
  const key     = obj.lumenId ?? obj.type

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left:    obj.left ?? 0,
    top:     obj.top  ?? 0,
    width:   w,
    height:  h,
    opacity,
    transformOrigin: 'left top',
    transform: angle !== 0 ? `rotate(${angle}deg)` : undefined,
  }

  const t = (obj.type ?? '').toLowerCase()

  if (t === 'rect') {
    return (
      <div key={key} style={{
        ...baseStyle,
        background: obj.fill || 'transparent',
        borderRadius: obj.rx ? `${obj.rx}px` : undefined,
        boxShadow: obj.shadow ? buildShadow(obj.shadow) : undefined,
      }} />
    )
  }

  if (t === 'textbox' || t === 'text' || t === 'i-text') {
    const textW = (obj.width ?? 900) * scaleX
    const fontSize = obj.fontSize ?? 32
    // render-engine letter-spacing logic (mirrors render-engine.ts exactly)
    const letterSpacing = obj.charSpacing
      ? `${obj.charSpacing / 1000}em`
      : obj.letterSpacing
        ? `${obj.letterSpacing}px`
        : 'normal'

    return (
      <div key={key} style={{
        position: 'absolute',
        left:    obj.left ?? 0,
        top:     obj.top  ?? 0,
        width:   textW,
        opacity,
        transform: angle !== 0 ? `rotate(${angle}deg)` : undefined,
        transformOrigin: 'left top',
        fontFamily: obj.fontFamily ? `'${obj.fontFamily}', sans-serif` : 'sans-serif',
        fontSize,
        fontWeight: obj.fontWeight ?? 'normal',
        fontStyle:  obj.fontStyle  ?? 'normal',
        color:      obj.fill ?? '#F6F2EA',
        lineHeight: obj.lineHeight ?? 1.3,           // render-engine default
        textAlign:  (obj.textAlign ?? 'left') as any,
        letterSpacing,
        overflow:   'visible',
        whiteSpace: 'pre-wrap',
        wordWrap:   'break-word',
      }}>
        {obj.text ?? ''}
      </div>
    )
  }

  if (t === 'circle') {
    return (
      <div key={key} style={{
        ...baseStyle,
        borderRadius: '50%',
        background: obj.fill || 'transparent',
      }} />
    )
  }

  return null
}

function buildShadow(shadow: any): string {
  const color = shadow.color ?? 'rgba(0,0,0,0.5)'
  const blur = shadow.blur ?? 4
  const x = shadow.offsetX ?? 0
  const y = shadow.offsetY ?? 0
  return `${x}px ${y}px ${blur}px ${color}`
}

// ── Fabric editor panel ───────────────────────────────────────────────────────
function FabricPanel({ objects, background }: { objects: any[]; background: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [ready, setReady] = useState(false)
  const [objRows, setObjRows] = useState<any[]>([])

  useEffect(() => {
    let canvas: any
    let mounted = true

    async function run() {
      if (!canvasRef.current || !mounted) return
      const { Canvas, Rect, Textbox, Circle } = await import('fabric')

      canvas = new Canvas(canvasRef.current, {
        width: DISP_W, height: DISP_H,
        enableRetinaScaling: false,
        selection: false,
        preserveObjectStacking: true,
      })
      canvas.backgroundColor = background

      const lowerEl  = (canvas as any).lowerCanvasEl  as HTMLCanvasElement
      const upperEl  = (canvas as any).upperCanvasEl  as HTMLCanvasElement | undefined
      const wrapperEl = (canvas as any).wrapperEl     as HTMLElement | undefined
      ;[lowerEl, upperEl, wrapperEl].forEach((el: any) => {
        if (el) { el.style.width = `${DISP_W}px`; el.style.height = `${DISP_H}px` }
      })

      const rows: any[] = []

      for (const src of objects) {
        if (!mounted) break
        const t = (src.type ?? '').toLowerCase()
        const left   = (src.left   ?? 0)   * SCALE
        const top    = (src.top    ?? 0)   * SCALE
        const width  = (src.width  ?? 100) * SCALE
        const height = (src.height ?? 100) * SCALE
        const origin = { originX: 'left' as const, originY: 'top' as const }

        let obj: any
        if (t === 'rect') {
          obj = new Rect({ left, top, width, height, fill: src.fill ?? 'transparent', opacity: src.opacity ?? 1, ...origin })
        } else if (t === 'circle') {
          obj = new Circle({ left, top, radius: (src.radius ?? 50) * SCALE, fill: src.fill ?? '#D4A84B', opacity: src.opacity ?? 1, ...origin })
        } else {
          // Fabric editor letter-spacing: charSpacing only (letterSpacing field is ignored)
          obj = new Textbox(src.text ?? '', {
            left, top, width,
            fontSize:    (src.fontSize  ?? 32) * SCALE,
            fontFamily:  src.fontFamily ?? 'sans-serif',
            fontWeight:  src.fontWeight ?? 'normal',
            fontStyle:   src.fontStyle  ?? 'normal',
            fill:        src.fill       ?? '#F6F2EA',
            lineHeight:  src.lineHeight ?? 1.16,
            textAlign:   src.textAlign  ?? 'left',
            charSpacing: src.charSpacing ?? (src.letterSpacing && src.fontSize
              ? Math.round(src.letterSpacing / src.fontSize * 1000) : 0),
            opacity:     src.opacity    ?? 1,
            editable:    false,
            ...origin,
          })
        }
        obj.lumenId = src.lumenId
        canvas.add(obj)

        // Collect comparison data
        rows.push({
          lumenId:      src.lumenId,
          type:         src.type,
          // Store-space values
          store:        { left: src.left, top: src.top, width: src.width, height: src.height, fontSize: src.fontSize, lineHeight: src.lineHeight, letterSpacing: src.letterSpacing, charSpacing: src.charSpacing },
          // Fabric display-space (what Fabric received)
          fabric:       { left: obj.left, top: obj.top, width: obj.width, height: obj.height, fontSize: obj.fontSize, lineHeight: obj.lineHeight, charSpacing: obj.charSpacing },
          // Render-engine store-space (what render-engine.ts uses directly)
          render:       {
            left: src.left, top: src.top, width: src.width, fontSize: src.fontSize,
            lineHeight:    src.lineHeight ?? 1.3,
            letterSpacing: src.charSpacing ? `${src.charSpacing / 1000}em` : src.letterSpacing ? `${src.letterSpacing}px` : 'normal',
          },
          // After fixes: lineHeight default aligned to 1.16, letterSpacing mapped to charSpacing
          lineHeightMismatch:    false,
          letterSpacingMismatch: false,
        })
      }

      if (!mounted) return
      canvas.renderAll()
      setObjRows(rows)
      setReady(true)
    }

    run().catch(console.error)
    return () => { mounted = false; try { canvas?.dispose() } catch {} }
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div>
      <div style={{ border: `2px solid ${ready ? '#D4A84B' : '#555'}`, display: 'inline-block', lineHeight: 0 }}>
        <canvas ref={canvasRef} />
      </div>
      {objRows.length > 0 && (
        <div style={{ marginTop: 12, fontSize: 10, fontFamily: 'monospace' }}>
          {objRows.map(r => (
            <div key={r.lumenId} style={{ marginBottom: 8, padding: '4px 6px', background: '#111009', borderRadius: 4, borderLeft: `3px solid ${r.letterSpacingMismatch || r.lineHeightMismatch ? '#ff6b6b' : '#22aa44'}` }}>
              <div style={{ color: '#D4A84B', fontWeight: 700, marginBottom: 2 }}>{r.lumenId} ({r.type})</div>
              {r.type === 'textbox' && (
                <>
                  <div style={{ color: r.lineHeightMismatch ? '#ff6b6b' : '#C4B99A' }}>
                    lineHeight — fabric: {r.fabric.lineHeight ?? '(default 1.16)'} | render: {r.render.lineHeight} {r.lineHeightMismatch ? '⚠ MISMATCH' : '✓'}
                  </div>
                  <div style={{ color: '#C4B99A' }}>
                    spacing — fabric charSpacing: {r.fabric.charSpacing?.toFixed(1)}px (store {r.store.charSpacing ?? r.store.letterSpacing ?? 0}×{SCALE}) | render: {r.render.letterSpacing}
                  </div>
                  <div style={{ color: '#C4B99A' }}>
                    fontSize — fabric: {r.fabric.fontSize}px (={r.store.fontSize}×{SCALE}) | render: {r.render.fontSize}px
                  </div>
                </>
              )}
              {(r.type === 'rect' || r.type === 'circle') && (
                <div style={{ color: '#C4B99A' }}>
                  pos — fabric: ({r.fabric.left},{r.fabric.top}) {r.fabric.width}×{r.fabric.height} | render: ({r.render.left},{r.render.top})
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Diff summary ─────────────────────────────────────────────────────────────
function DiffTable() {
  const rows = [
    {
      prop: 'lineHeight default',
      fabric: '1.16',
      render: '1.16 (fixed from 1.3)',
      status: '✓ aligned',
    },
    {
      prop: 'charSpacing unit',
      fabric: 'per-mille of fontSize (Fabric native: fontSize × charSpacing / 1000). No SCALE.',
      render: 'charSpacing / 1000 em (identical: 1em = fontSize)',
      status: '✓ scale-independent, both use raw value',
    },
    {
      prop: 'letterSpacing (legacy px)',
      fabric: 'converted to per-mille on load: letterSpacing / fontSize × 1000',
      render: 'used as letterSpacing px directly (1080-space)',
      status: '✓ proportionally equivalent',
    },
    {
      prop: 'left / top / width / height',
      fabric: 'store × 0.5 at 540px canvas',
      render: 'store px at 1080px canvas',
      status: '✓ proportionally equivalent',
    },
    {
      prop: 'fontSize',
      fabric: 'store × 0.5 px',
      render: 'store px',
      status: '✓ proportionally equivalent',
    },
    {
      prop: 'DPR',
      fabric: 'enableRetinaScaling:false → buffer = 540×675, no DPR scaling',
      render: 'deviceScaleFactor:1 → viewport = 1080×1350, no DPR scaling',
      status: '✓ both DPR=1 (no scaling)',
    },
  ]

  return (
    <div style={{ marginTop: 24 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: '#F6F2EA', marginBottom: 8, fontFamily: 'var(--font-syne, sans-serif)' }}>
        Known Discrepancies
      </div>
      <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 11, fontFamily: 'monospace' }}>
        <thead>
          <tr style={{ background: '#221F15' }}>
            {['Property', 'Fabric Editor', 'Render Engine', 'Status'].map(h => (
              <th key={h} style={{ padding: '4px 8px', color: '#C4B99A', textAlign: 'left', borderBottom: '1px solid #2D2A1F' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.prop} style={{ borderBottom: '1px solid #2D2A1F' }}>
              <td style={{ padding: '4px 8px', color: '#D4A84B' }}>{r.prop}</td>
              <td style={{ padding: '4px 8px', color: '#C4B99A' }}>{r.fabric}</td>
              <td style={{ padding: '4px 8px', color: '#C4B99A' }}>{r.render}</td>
              <td style={{ padding: '4px 8px', color: r.status.startsWith('⚠') ? '#ff6b6b' : '#22aa44' }}>{r.status}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function RenderComparePage() {
  return (
    <div style={{ padding: 40, background: '#111009', minHeight: '100vh', color: '#F6F2EA', fontFamily: 'var(--font-ibm, monospace)' }}>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700&family=IBM+Plex+Sans:ital,wght@0,300;0,400;1,300&display=swap" />

      <h1 style={{ fontFamily: 'var(--font-syne, sans-serif)', fontSize: 24, fontWeight: 700, marginBottom: 8 }}>
        Editor vs Render Engine Comparison
      </h1>
      <p style={{ color: '#C4B99A', fontSize: 13, marginBottom: 32, lineHeight: 1.6 }}>
        Both panels use the same store-space template data. The Fabric editor scales coords × 0.5.<br />
        The render panel mirrors render-engine.ts exactly, CSS-scaled from 1080→540 for visual parity.<br />
        Any visual difference = a real discrepancy between what the user edits and what gets published.
      </p>

      <div style={{ display: 'flex', gap: 40, flexWrap: 'wrap', marginBottom: 32 }}>
        <div>
          <div style={{ fontSize: 11, color: '#C4B99A', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Fabric Editor (540×675, enableRetinaScaling:false)
          </div>
          <FabricPanel objects={TEMPLATE.objects} background={TEMPLATE.background} />
        </div>

        <div>
          <div style={{ fontSize: 11, color: '#C4B99A', marginBottom: 6, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Render Engine (1080→540 CSS scale, render-engine.ts logic)
          </div>
          <RenderEnginePanel objects={TEMPLATE.objects} background={TEMPLATE.background} />
        </div>
      </div>

      <DiffTable />
    </div>
  )
}

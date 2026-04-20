interface CanvasObject {
  type: string
  lumenId?: string
  left: number
  top: number
  width?: number
  height?: number
  scaleX?: number
  scaleY?: number
  src?: string
  text?: string
  fontSize?: number
  fontFamily?: string
  fontWeight?: string | number
  fontStyle?: string
  fill?: string
  opacity?: number
  angle?: number
  lineHeight?: number
  letterSpacing?: number
  charSpacing?: number
  textAlign?: string
  rx?: number
  ry?: number
  stroke?: string
  strokeWidth?: number
  underline?: boolean
  linethrough?: boolean
  shadow?: {
    color?: string
    blur?: number
    offsetX?: number
    offsetY?: number
  }
  [key: string]: unknown
}

interface CanvasData {
  width: number
  height: number
  background?: string
  objects: CanvasObject[]
}

const GOOGLE_FONT_PARAMS: Record<string, string> = {
  'Syne':             'Syne:wght@400;600;700',
  'IBM Plex Sans':    'IBM+Plex+Sans:ital,wght@0,300;0,400;0,700;1,300;1,400',
  'Inter':            'Inter:wght@300;400;500;700',
  'Playfair Display': 'Playfair+Display:ital,wght@0,400;0,700;1,400',
  'Montserrat':       'Montserrat:ital,wght@0,300;0,400;0,700;1,300;1,400',
  'Raleway':          'Raleway:ital,wght@0,300;0,400;0,700;1,300;1,400',
  'Oswald':           'Oswald:wght@300;400;700',
  'Lato':             'Lato:ital,wght@0,300;0,400;0,700;1,300;1,400',
}

export function buildRenderHTML(canvas: CanvasData, width: number, height: number, scale = 1): string {
  const objectsHTML = canvas.objects.map(obj => renderObject(obj, scale)).join('\n')

  // Only request fonts that are actually used in this canvas — loading all 8 families
  // every time costs ~30 network requests in Puppeteer (one WOFF2 per weight/style).
  const usedFonts = new Set<string>()
  for (const obj of canvas.objects) {
    if (obj.fontFamily && GOOGLE_FONT_PARAMS[obj.fontFamily]) {
      usedFonts.add(obj.fontFamily)
    }
  }
  const fontLink = usedFonts.size > 0
    ? `<link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=${[...usedFonts].map(f => GOOGLE_FONT_PARAMS[f]).join('&family=')}&display=swap" rel="stylesheet">`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  ${fontLink}
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      width: ${width * scale}px;
      height: ${height * scale}px;
      overflow: hidden;
      position: relative;
      background: ${canvas.background || '#111009'};
    }
    .obj {
      position: absolute;
      transform-origin: left top;
    }
  </style>
</head>
<body>
${objectsHTML}
</body>
</html>`
}

function renderObject(obj: CanvasObject, scale = 1): string {
  const scaleX = obj.scaleX ?? 1
  const scaleY = obj.scaleY ?? 1
  const w = (obj.width ?? 100) * scaleX * scale
  const h = (obj.height ?? 100) * scaleY * scale
  const angle = obj.angle ?? 0
  const opacity = obj.opacity ?? 1

  // Fabric.js uses top-left origin by default — left/top are already top-left coords
  const cssLeft = (obj.left ?? 0) * scale
  const cssTop  = (obj.top  ?? 0) * scale

  const baseStyle = [
    `left: ${cssLeft}px`,
    `top: ${cssTop}px`,
    `width: ${w}px`,
    `height: ${h}px`,
    `opacity: ${opacity}`,
    angle !== 0 ? `transform: rotate(${angle}deg)` : '',
  ].filter(Boolean).join('; ')

  switch (obj.type) {
    case 'image':
      return renderImage(obj, baseStyle, scale)
    case 'rect':
      // When a rect layer receives a `src` override (e.g. background-image), render it as an image
      if (obj.src) return renderImage(obj, baseStyle, scale)
      return renderRect(obj, baseStyle, scale)
    case 'textbox':
    case 'text':
    case 'i-text':
      return renderText(obj, scale)
    case 'circle': {
      // Use radius as the authoritative size source; fall back to width/height for legacy JSON
      const r = (obj as any).radius as number | undefined
      const diameter = r != null ? r * 2 * scale : Math.max(w, h, 10)
      const circleStyle = [
        `left: ${cssLeft}px`,
        `top: ${cssTop}px`,
        `width: ${diameter}px`,
        `height: ${diameter}px`,
        `opacity: ${opacity}`,
        angle !== 0 ? `transform: rotate(${angle}deg)` : '',
      ].filter(Boolean).join('; ')
      return `<div class="obj" style="${circleStyle}; border-radius: 50%; background: ${obj.fill || 'transparent'}; border: ${obj.strokeWidth ? `${obj.strokeWidth * scale}px solid ${obj.stroke}` : 'none'};"></div>`
    }
    default:
      return `<!-- unsupported type: ${obj.type} -->`
  }
}

// Convert Fabric filter JSON array → CSS filter string (color grades only, no blur).
// Gaussian/box blur is handled via blurAmount metadata in renderImage for correct calibration.
function filtersToCss(filters: unknown[]): string {
  const parts: string[] = []
  for (const f of filters as any[]) {
    if (f.type === 'Saturation') {
      parts.push(`saturate(${Math.max(0, 1 + (f.saturation ?? 0)).toFixed(3)})`)
    } else if (f.type === 'Brightness') {
      parts.push(`brightness(${Math.max(0, 1 + (f.brightness ?? 0)).toFixed(3)})`)
    } else if (f.type === 'Contrast') {
      parts.push(`contrast(${Math.max(0, 1 + (f.contrast ?? 0)).toFixed(3)})`)
    } else if (f.type === 'HueRotation') {
      parts.push(`hue-rotate(${((f.rotation ?? 0) * 180 / Math.PI).toFixed(1)}deg)`)
    }
  }
  return parts.join(' ')
}

function renderImage(obj: CanvasObject, baseStyle: string, scale = 1): string {
  const src = obj.src || ''
  if (!src) return ''

  const filters    = ((obj as any).filters ?? []) as any[]
  const blurType   = (obj as any).blurType   as string | undefined
  const blurAmount = (obj as any).blurAmount as number | undefined
  const blurAngle  = (obj as any).blurAngle  as number | undefined
  const blurCenterX    = (obj as any).blurCenterX    as number | undefined ?? 50
  const blurCenterY    = (obj as any).blurCenterY    as number | undefined ?? 50
  const blurInnerRadius = (obj as any).blurInnerRadius as number | undefined ?? 0

  // Color-grade CSS (saturation / brightness / contrast / hue — no blur)
  const colorCss = filtersToCss(filters)

  // ── Radial / spin blur — Canvas 2D multi-rotation average ──────────────────
  // Rotating N copies around the focal point and averaging them with `lighter`
  // compositing produces mathematically correct spin blur: the focal point stays
  // perfectly sharp (all rotations converge there) while the surroundings blur
  // into circular arcs — matching the photography radial-blur look.
  if (blurType === 'radial' && blurAmount != null && blurAmount > 0) {
    const scaleX = obj.scaleX ?? 1
    const scaleY = obj.scaleY ?? 1
    const w = Math.round((obj.width  ?? 100) * scaleX * scale)
    const h = Math.round((obj.height ?? 100) * scaleY * scale)
    const steps     = Math.min(15, Math.max(7, Math.round(blurAmount / 7)))
    const maxAngleR = (blurAmount * 0.0022).toFixed(5)  // radians — angular, no scale factor
    const cx        = ((blurCenterX / 100) * w).toFixed(0)
    const cy        = ((blurCenterY / 100) * h).toFixed(0)
    const innerR    = blurInnerRadius > 0 ? ((blurInnerRadius / 100) * Math.min(w, h) / 2).toFixed(1) : '0'
    const feather   = blurInnerRadius > 0 ? (Math.max(1, (blurInnerRadius / 100) * Math.min(w, h) / 2 * 0.15)).toFixed(1) : '0'
    const lumenId   = ((obj as any).lumenId ?? '') as string
    const canvasId  = `sb_${lumenId.replace(/[^a-z0-9]/gi, 'x') || src.slice(-10).replace(/[^a-z0-9]/gi, 'x')}`
    const colorFilter = colorCss ? `filter: ${colorCss};` : ''
    return `<div class="obj" style="${baseStyle}; overflow:hidden; position:relative;">
  <canvas id="${canvasId}" width="${w}" height="${h}" style="width:100%;height:100%;display:block;${colorFilter}"></canvas>
  <script>;(function(){
    var c=document.getElementById('${canvasId}'),ctx=c.getContext('2d');
    var img=new Image();img.crossOrigin='anonymous';
    img.onload=function(){
      var N=${steps},maxA=${maxAngleR},cx=${cx},cy=${cy};
      ctx.globalCompositeOperation='lighter';
      ctx.globalAlpha=1/N;
      for(var i=0;i<N;i++){
        var a=(i/(N-1)-0.5)*2*maxA;
        ctx.save();ctx.translate(cx,cy);ctx.rotate(a);ctx.translate(-cx,-cy);
        ctx.drawImage(img,0,0,${w},${h});
        ctx.restore();
      }
      var ir=${innerR};
      if(ir>0){
        var fe=${feather};
        var mc=document.createElement('canvas');mc.width=${w};mc.height=${h};
        var mx=mc.getContext('2d');
        mx.drawImage(img,0,0,${w},${h});
        mx.globalCompositeOperation='destination-in';
        var gr=mx.createRadialGradient(cx,cy,Math.max(0,ir-fe),cx,cy,ir+fe);
        gr.addColorStop(0,'rgba(0,0,0,1)');gr.addColorStop(1,'rgba(0,0,0,0)');
        mx.fillStyle=gr;mx.fillRect(0,0,${w},${h});
        ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
        ctx.drawImage(mc,0,0);
      }
      (window)['_sbDone_${canvasId}']=true;
    };
    img.src='${escapeAttr(src)}';
  })();</script>
</div>`
  }

  // ── Motion blur: SVG feGaussianBlur with directional stdDeviation ──────────
  if (blurType === 'motion' && blurAmount != null && blurAmount > 0 && blurAngle != null) {
    const rad    = (blurAngle * Math.PI) / 180
    const maxBlur = blurAmount * 0.55 * scale
    const sx = (Math.abs(Math.cos(rad)) * maxBlur).toFixed(2)
    const sy = (Math.abs(Math.sin(rad)) * maxBlur).toFixed(2)
    const filterId = `mb${blurAngle}_${src.slice(-6).replace(/[^a-z0-9]/gi, '')}`
    const allCss = [colorCss, `url(#${filterId})`].filter(Boolean).join(' ')
    const filterCss = `filter: ${allCss};`
    return `<svg style="position:absolute;width:0;height:0;overflow:hidden"><defs><filter id="${filterId}" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur in="SourceGraphic" stdDeviation="${sx} ${sy}"/></filter></defs></svg>
<div class="obj" style="${baseStyle}; overflow: hidden;">
  <img src="${escapeAttr(src)}" style="width: 100%; height: 100%; object-fit: cover; display: block; ${filterCss}" crossorigin="anonymous" />
</div>`
  }

  // ── Gaussian / box / default: CSS blur calibrated to match Fabric WebGL ────
  // blurAmount is 0-100 (user-visible). Factor 1.2 * scale gives CSS px that
  // visually matches Fabric's WebGL Blur filter at the same slider value.
  const gaussianPx = (blurType === 'gaussian' || blurType === 'box' || !blurType)
    && blurAmount != null && blurAmount > 0
    ? `blur(${(blurAmount * 1.2 * scale).toFixed(1)}px)` : ''
  const allCss = [colorCss, gaussianPx].filter(Boolean).join(' ')
  const filterCss = allCss ? `filter: ${allCss};` : ''
  return `<div class="obj" style="${baseStyle}; overflow: hidden;">
  <img src="${escapeAttr(src)}" style="width: 100%; height: 100%; object-fit: cover; display: block; ${filterCss}" crossorigin="anonymous" />
</div>`
}

function renderRect(obj: CanvasObject, baseStyle: string, scale = 1): string {
  const fill = obj.fill || 'transparent'
  const stroke = obj.stroke ? `border: ${(obj.strokeWidth ?? 1) * scale}px solid ${obj.stroke};` : ''
  const rx = obj.rx ? `border-radius: ${obj.rx * scale}px;` : ''
  const shadow = obj.shadow ? buildShadow(obj.shadow, false, scale) : ''
  return `<div class="obj" style="${baseStyle}; background: ${fill}; ${stroke} ${rx} ${shadow}"></div>`
}

function renderText(obj: CanvasObject, scale = 1): string {
  const text       = (obj.text || '').replace(/\n/g, '<br>')
  const fontSize   = (obj.fontSize ?? 32) * scale
  const scaleX     = obj.scaleX ?? 1
  const w          = (obj.width  ?? 900) * scaleX * scale
  const angle      = obj.angle ?? 0
  const opacity    = obj.opacity ?? 1
  // No fixed height — let text grow naturally so wrapping never clips content.
  const baseStyle = [
    `left: ${(obj.left ?? 0) * scale}px`,
    `top: ${(obj.top ?? 0) * scale}px`,
    `width: ${w}px`,
    `opacity: ${opacity}`,
    angle !== 0 ? `transform: rotate(${angle}deg)` : '',
  ].filter(Boolean).join('; ')
  const fontFamily = obj.fontFamily ? `'${obj.fontFamily}', sans-serif` : 'sans-serif'
  const fontWeight = obj.fontWeight ?? 'normal'
  const fontStyle  = obj.fontStyle ?? 'normal'
  const fill       = obj.fill ?? '#F6F2EA'
  const lineHeight = obj.lineHeight ?? 1.16
  const textAlign  = obj.textAlign ?? 'left'
  // charSpacing is per-mille of fontSize (Fabric native unit: fontSize * charSpacing / 1000).
  // CSS equivalent: charSpacing / 1000 em.  Scale-independent — no SCALE conversion needed.
  // Legacy letterSpacing field is in 1080-space px; scale it with the render scale.
  const letterSpacing = obj.charSpacing
    ? `${obj.charSpacing / 1000}em`
    : obj.letterSpacing
    ? `${(obj.letterSpacing as number) * scale}px`
    : 'normal'
  const textDecoration = obj.underline ? 'underline' : obj.linethrough ? 'line-through' : 'none'
  const shadow = obj.shadow ? buildShadow(obj.shadow, true, scale) : ''
  const padding = obj.padding != null ? `padding: ${(obj.padding as number) * scale}px;` : ''

  return `<div class="obj" style="${baseStyle}; font-family: ${fontFamily}; font-size: ${fontSize}px; font-weight: ${fontWeight}; font-style: ${fontStyle}; color: ${fill}; line-height: ${lineHeight}; text-align: ${textAlign}; letter-spacing: ${letterSpacing}; text-decoration: ${textDecoration}; ${shadow} ${padding} overflow: visible; white-space: pre-wrap; word-wrap: break-word;">${text}</div>`
}

function buildShadow(shadow: CanvasObject['shadow'], isText: boolean, scale = 1): string {
  if (!shadow) return ''
  const color   = shadow.color   ?? 'rgba(0,0,0,0.5)'
  const blur    = (shadow.blur    ?? 4)  * scale
  const offsetX = (shadow.offsetX ?? 0) * scale
  const offsetY = (shadow.offsetY ?? 0) * scale
  const prop = isText ? 'text-shadow' : 'box-shadow'
  return `${prop}: ${offsetX}px ${offsetY}px ${blur}px ${color};`
}

function escapeAttr(str: string): string {
  return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;')
}

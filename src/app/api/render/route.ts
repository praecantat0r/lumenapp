import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { buildRenderHTML } from '@/lib/render-engine'
import { v4 as uuid } from 'uuid'

function getServiceClient() {
  return createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

export const maxDuration = 60

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mergeCanvasOverrides(objects: any[], overrides: Record<string, Record<string, unknown>>): any[] {
  const existingIds = new Set(objects.map((o: any) => o.lumenId).filter(Boolean))

  // Update existing template objects with overrides
  const merged = objects.map((obj: any) => {
    const lumenId = obj.lumenId
    if (lumenId && overrides[lumenId]) {
      return { ...obj, ...overrides[lumenId] }
    }
    return obj
  })

  // Append new objects that the user added (not present in the template)
  for (const [lumenId, override] of Object.entries(overrides)) {
    if (!existingIds.has(lumenId)) {
      merged.push(override)
    }
  }

  return merged
}

async function renderHTMLToPNG(html: string, width: number, height: number): Promise<Buffer> {
  const puppeteer = await import('puppeteer')
  const browser = await puppeteer.default.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
    ],
  })

  try {
    const page = await browser.newPage()
    await page.setViewport({ width, height, deviceScaleFactor: 1 })
    // 'load' fires when the page + all linked stylesheets/images are done — much faster
    // than 'networkidle0' which waits for every last font WOFF2 to finish downloading.
    // The evaluate blocks below handle fonts and spin-blur canvases explicitly.
    await page.setContent(html, { waitUntil: 'load', timeout: 30000 })

    await page.evaluate(() => {
      const fontTimeout = new Promise<void>(r => setTimeout(r, 4000))
      const fontsLoaded = document.fonts.ready.then(() =>
        Promise.all(
          ['Syne', 'IBM Plex Sans'].map(family =>
            document.fonts.load(`700 32px "${family}"`).catch(() => {})
          )
        )
      ).then(() => {})
      return Promise.race([fontsLoaded, fontTimeout])
    })

    await page.evaluate(() =>
      Promise.all([
        // Wait for all <img> tags to finish loading
        ...Array.from(document.images).map(img =>
          img.complete
            ? Promise.resolve()
            : new Promise<void>(r => { img.onload = () => r(); img.onerror = () => r() })
        ),
        // Wait for spin-blur canvases: their JS loads an Image and draws on onload.
        // We allow up to 5 s for all of them to finish.
        new Promise<void>(resolve => {
          const canvases = Array.from(document.querySelectorAll('canvas[id^="sb_"]'))
          if (canvases.length === 0) { resolve(); return }
          // The inline scripts set window._sbDone_<id> = true when onload completes.
          // Poll until all flags are set or timeout.
          const start = Date.now()
          const poll = () => {
            const allDone = canvases.every(c => (window as any)[`_sbDone_${c.id}`])
            if (allDone || Date.now() - start > 5000) resolve()
            else setTimeout(poll, 50)
          }
          poll()
        }),
      ])
    )

    const screenshot = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width, height },
      omitBackground: false,
    })

    return Buffer.from(screenshot)
  } finally {
    await browser.close()
  }
}

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('Authorization')
  if (authHeader !== `Bearer ${process.env.RENDER_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { template_id, canvas_overrides } = await req.json()
  if (!template_id) return NextResponse.json({ error: 'template_id required' }, { status: 400 })

  const serviceClient = getServiceClient()

  const { data: template, error } = await serviceClient
    .from('templates')
    .select('*')
    .eq('id', template_id)
    .single()

  if (error || !template) {
    return NextResponse.json({ error: 'Template not found' }, { status: 404 })
  }

  const mergedObjects = mergeCanvasOverrides(
    template.canvas_json.objects,
    canvas_overrides || {}
  )
  const canvasData = { ...template.canvas_json, objects: mergedObjects }
  const html = buildRenderHTML(canvasData, template.width, template.height)

  let pngBuffer: Buffer
  try {
    pngBuffer = await renderHTMLToPNG(html, template.width, template.height)
  } catch (err: unknown) {
    console.error('Puppeteer render failed:', err)
    return NextResponse.json(
      { error: 'Render failed: ' + (err instanceof Error ? err.message : String(err)) },
      { status: 500 }
    )
  }

  const fileName = `${uuid()}.png`
  const { error: uploadError } = await serviceClient.storage
    .from('generated-images')
    .upload(fileName, pngBuffer, { contentType: 'image/png', upsert: false })

  if (uploadError) {
    return NextResponse.json({ error: 'Upload failed: ' + uploadError.message }, { status: 500 })
  }

  const { data: urlData } = serviceClient.storage
    .from('generated-images')
    .getPublicUrl(fileName)

  return NextResponse.json({ render_url: urlData.publicUrl, file_name: fileName })
}

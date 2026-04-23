import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
const MAX_SIZE = 15 * 1024 * 1024

function mimeToExt(mime: string): string {
  return mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1]
}

function hasValidMagicBytes(bytes: Uint8Array, mime: string): boolean {
  switch (mime) {
    case 'image/jpeg': return bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF
    case 'image/png':  return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47
    case 'image/webp': return bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46
                           && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    case 'image/gif':  return bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38
    default: return false
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    if (file.size > MAX_SIZE)
      return NextResponse.json({ error: 'File too large' }, { status: 413 })

    const mime = file.type.toLowerCase()
    if (!ALLOWED_MIME.has(mime))
      return NextResponse.json({ error: 'Invalid file type' }, { status: 415 })

    const bytes = new Uint8Array(await file.arrayBuffer())
    if (!hasValidMagicBytes(bytes, mime))
      return NextResponse.json({ error: 'Invalid file content' }, { status: 415 })

    const path = `${user.id}/${crypto.randomUUID()}.${mimeToExt(mime)}`

    const service = createServiceClient()
    const { error } = await service.storage
      .from('brand-assets')
      .upload(path, bytes, { contentType: mime, cacheControl: '3600', upsert: false })

    if (error) {
      console.error('[/api/upload] storage error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: { publicUrl } } = service.storage
      .from('brand-assets')
      .getPublicUrl(path)

    return NextResponse.json({ publicUrl, path })
  } catch (err: unknown) {
    console.error('[/api/upload] unexpected error:', err)
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}

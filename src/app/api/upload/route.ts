import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient as createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function POST(req: NextRequest) {
  try {
    // Authenticate the requesting user
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

    const ext  = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${user.id}/${Date.now()}.${ext}`

    // Use service role to bypass bucket RLS
    const service = createServiceClient()
    const { error } = await service.storage
      .from('brand-assets')
      .upload(path, file, { contentType: file.type, cacheControl: '3600', upsert: false })

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

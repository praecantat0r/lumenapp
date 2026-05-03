import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient as createClient } from '@/lib/supabase/server'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: photo } = await supabase
    .from('product_photos')
    .select('status, image_url')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!photo) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ status: photo.status, image_url: photo.image_url })
}

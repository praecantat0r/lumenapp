import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // Auth via user client, update via service client (bypasses RLS UPDATE policy)
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params
  const body = await req.json()
  const updates: Record<string, string> = {}

  if (body.type !== undefined) {
    const VALID_TYPES = ['product_photo', 'label', 'logo', 'photo', 'other']
    if (!VALID_TYPES.includes(body.type)) return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    updates.type = body.type
  }
  if (body.description !== undefined) updates.description = body.description

  if (Object.keys(updates).length === 0) return NextResponse.json({ error: 'Nothing to update' }, { status: 400 })

  const service = createServiceClient()
  const { error } = await service
    .from('brand_assets')
    .update(updates)
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id } = await params

  // Get the asset first to get storage_path
  const { data: asset } = await supabase
    .from('brand_assets')
    .select('storage_path')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!asset) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete from storage
  await supabase.storage.from('brand-assets').remove([asset.storage_path])

  // Delete from DB
  const { error } = await supabase
    .from('brand_assets')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

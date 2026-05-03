import { NextRequest, NextResponse } from 'next/server'
import { createRouteClient as createClient } from '@/lib/supabase/server'
import { getLimits } from '@/lib/plans'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('brand_assets')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('plan')
    .eq('id', user.id)
    .single()

  const limits = getLimits(profile?.plan ?? 'free')

  if (limits.assets !== -1) {
    const { count } = await supabase
      .from('brand_assets')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', user.id)
    if ((count ?? 0) >= limits.assets) {
      return NextResponse.json({
        error: `Asset limit reached (${limits.assets}). Upgrade your plan to upload more assets.`,
      }, { status: 403 })
    }
  }

  const body = await req.json()
  const { storage_path, public_url, type, name } = body

  const { data, error } = await supabase
    .from('brand_assets')
    .insert({ user_id: user.id, storage_path, public_url, type: type || 'photo', name })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

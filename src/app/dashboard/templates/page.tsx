import { redirect } from 'next/navigation'
import { createClient, getUser } from '@/lib/supabase/server'
import { createServiceClient } from '@/lib/supabase/service'
import { seedUserDefaultTemplate } from '@/lib/renderer'
import { TemplatesClient } from '@/components/dashboard/TemplatesClient'

export const metadata = { title: 'Templates — Lumen' }

export default async function TemplatesPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  const supabase = await createClient()

  // Ensure user has at least one library template (no-op if DB migration not run yet)
  try { await seedUserDefaultTemplate(user.id) } catch { /* migration pending */ }

  const serviceClient = createServiceClient()
  const { data: templates, error } = await serviceClient
    .from('templates')
    .select('id, name, description, thumbnail_url, is_user_template, use_for_generation')
    .eq('user_id', user.id)
    .eq('is_user_template', true)
    .eq('is_active', true)
    .order('created_at', { ascending: true })

  if (error?.message?.includes('is_user_template')) {
    return (
      <div style={{ padding: '48px 36px', fontFamily: 'var(--font-ibm)', color: 'var(--muted)', fontSize: 13 }}>
        <strong style={{ color: 'var(--candle)', fontSize: 14 }}>DB migration required</strong>
        <p style={{ marginTop: 8 }}>Run the two SQL statements from the plan in your Supabase SQL editor, then reload this page.</p>
        <pre style={{ marginTop: 12, background: 'var(--surface-2)', padding: 16, borderRadius: 8, fontSize: 12, color: 'var(--sand)', overflowX: 'auto' }}>{`ALTER TABLE templates
  ADD COLUMN IF NOT EXISTS is_user_template   BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS use_for_generation BOOLEAN DEFAULT true;`}</pre>
      </div>
    )
  }

  return <TemplatesClient initialTemplates={templates || []} />
}

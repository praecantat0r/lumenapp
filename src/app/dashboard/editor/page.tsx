import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EditorClient } from '@/components/dashboard/EditorClient'

export default async function EditorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <EditorClient />
}

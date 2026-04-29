import { getUser } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { EditorClient } from '@/components/dashboard/EditorClient'

export default async function EditorPage() {
  const user = await getUser()
  if (!user) redirect('/login')

  return <EditorClient />
}

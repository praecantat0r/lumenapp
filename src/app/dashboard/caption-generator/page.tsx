import { createClient } from '@/lib/supabase/server'
import { CaptionGeneratorClient } from '@/components/dashboard/CaptionGeneratorClient'

export default async function CaptionGeneratorPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  return <CaptionGeneratorClient />
}

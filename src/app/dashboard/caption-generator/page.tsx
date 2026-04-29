import { getUser } from '@/lib/supabase/server'
import { CaptionGeneratorClient } from '@/components/dashboard/CaptionGeneratorClient'

export default async function CaptionGeneratorPage() {
  const user = await getUser()
  if (!user) return null

  return <CaptionGeneratorClient />
}

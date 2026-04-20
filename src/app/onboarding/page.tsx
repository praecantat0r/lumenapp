import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bb } = await supabase
    .from('brand_brains')
    .select('onboarding_complete')
    .eq('user_id', user.id)
    .single()

  if (bb?.onboarding_complete) redirect('/dashboard/overview')

  return <OnboardingWizard userId={user.id} />
}

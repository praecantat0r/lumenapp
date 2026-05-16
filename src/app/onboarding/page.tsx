import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard'

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ plan?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: bb } = await supabase
    .from('brand_brains')
    .select('onboarding_complete')
    .eq('user_id', user.id)
    .single()

  const { plan } = await searchParams
  if (bb?.onboarding_complete) {
    redirect(plan === 'starter' || plan === 'growth'
      ? `/dashboard/billing?checkout=${plan}`
      : '/dashboard/overview')
  }

  return <OnboardingWizard userId={user.id} checkoutPlan={plan === 'starter' || plan === 'growth' ? plan : undefined} />
}

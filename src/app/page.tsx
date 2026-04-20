import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: bb } = await supabase
      .from('brand_brains')
      .select('onboarding_complete')
      .eq('user_id', user.id)
      .single()

    if (bb?.onboarding_complete) {
      redirect('/dashboard/overview')
    } else {
      redirect('/onboarding')
    }
  }

  redirect('/login')
}

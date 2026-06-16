import { getUser } from '@/lib/supabase/server'
import { DescribeClient } from '@/components/dashboard/DescribeClient'

export default async function DescribePage() {
  const user = await getUser()
  if (!user) return null
  return <DescribeClient />
}

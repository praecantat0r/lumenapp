import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { PostDetailClient } from '@/components/dashboard/PostDetailClient'

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: post } = await supabase
    .from('posts')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single()

  if (!post) notFound()

  return <PostDetailClient post={post} />
}

import { createClient, getUser } from '@/lib/supabase/server'
import { PostsClient } from '@/components/dashboard/PostsClient'
import type { Post, BrandAsset } from '@/types'

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; filter?: string }>
}) {
  const { q, page: pageParam, filter: filterParam } = await searchParams
  const user = await getUser()
  if (!user) return null

  const supabase = await createClient()

  // Load all posts in one query — filtering, search and pagination are done client-side
  const [{ data: postsData }, { data: assets }] = await Promise.all([
    supabase
      .from('posts')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(500),
    supabase.from('brand_assets').select('*').eq('user_id', user.id).order('created_at', { ascending: false }),
  ])

  return (
    <PostsClient
      posts={(postsData || []) as Post[]}
      brandAssets={(assets || []) as BrandAsset[]}
      initialQuery={q ?? ''}
      initialFilter={filterParam || 'all'}
      initialPage={Math.max(1, parseInt(pageParam || '1', 10))}
    />
  )
}

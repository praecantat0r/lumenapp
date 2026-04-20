import { createClient } from '@/lib/supabase/server'
import { PostsClient } from '@/components/dashboard/PostsClient'
import type { Post, BrandAsset } from '@/types'

const PAGE_SIZE = 24

export default async function PostsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string; filter?: string }>
}) {
  const { q, page: pageParam, filter: filterParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const filter = filterParam || 'all'
  const page   = Math.max(1, parseInt(pageParam || '1', 10))
  const offset = (page - 1) * PAGE_SIZE

  const userId = user.id

  function countQ(status?: string) {
    let cq = supabase.from('posts').select('*', { count: 'exact', head: true }).eq('user_id', userId)
    if (status) cq = cq.eq('status', status)
    if (q) cq = cq.or(`caption.ilike.%${q}%,hashtags.ilike.%${q}%`)
    return cq
  }

  const [
    { count: countAll },
    { count: countPending },
    { count: countApproved },
    { count: countPublished },
    { count: countFailed },
    postsResult,
    { data: assets },
  ] = await Promise.all([
    countQ(),
    countQ('pending_review'),
    countQ('approved'),
    countQ('published'),
    countQ('failed'),
    (() => {
      let q2 = supabase
        .from('posts')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
      if (filter !== 'all') q2 = q2.eq('status', filter)
      if (q) q2 = q2.or(`caption.ilike.%${q}%,hashtags.ilike.%${q}%`)
      return q2.range(offset, offset + PAGE_SIZE - 1)
    })(),
    supabase.from('brand_assets').select('*').eq('user_id', userId).order('created_at', { ascending: false }),
  ])

  const counts = {
    all:            countAll            ?? 0,
    pending_review: countPending        ?? 0,
    approved:       countApproved       ?? 0,
    published:      countPublished      ?? 0,
    failed:         countFailed         ?? 0,
  }

  const totalForFilter =
    filter === 'all'            ? (countAll      ?? 0) :
    filter === 'pending_review' ? (countPending  ?? 0) :
    filter === 'approved'       ? (countApproved ?? 0) :
    filter === 'published'      ? (countPublished ?? 0) :
                                  (countFailed   ?? 0)

  return (
    <PostsClient
      posts={(postsResult.data || []) as Post[]}
      counts={counts}
      brandAssets={(assets || []) as BrandAsset[]}
      initialQuery={q ?? ''}
      initialFilter={filter}
      page={page}
      totalPages={Math.ceil(totalForFilter / PAGE_SIZE)}
    />
  )
}

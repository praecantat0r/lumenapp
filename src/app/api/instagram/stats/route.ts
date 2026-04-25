import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { decryptToken } from '@/lib/token-crypto'

const IG_BASE = 'https://graph.instagram.com/v21.0'

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: igConn } = await supabase
    .from('instagram_connections')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!igConn) return NextResponse.json({ error: 'Instagram not connected' }, { status: 400 })

  const periodDays = Math.min(90, Math.max(7, parseInt(req.nextUrl.searchParams.get('period') || '30', 10)))
  const until = Math.floor(Date.now() / 1000)
  const since = until - periodDays * 24 * 60 * 60

  const accessToken = decryptToken(igConn.access_token)

  try {
    // Parallel fetches: daily insights, profile (followers_count field), lifetime follower metric, media
    // Use /me — the stored user-id is an Instagram-scoped ID that only works via /me with this token type
    const [reachImpRes, profileRes, follMetricRes, mediaRes] = await Promise.all([
      fetch(`${IG_BASE}/me/insights?metric=impressions,reach&period=day&since=${since}&until=${until}&access_token=${accessToken}`),
      fetch(`${IG_BASE}/me?fields=followers_count,media_count&access_token=${accessToken}`),
      fetch(`${IG_BASE}/me/insights?metric=follower_count&period=lifetime&access_token=${accessToken}`),
      fetch(`${IG_BASE}/me/media?fields=id,caption,timestamp,like_count,comments_count&limit=50&access_token=${accessToken}`)
    ])

    const [reachImpData, profileData, follMetricData, mediaData] = await Promise.all([
      reachImpRes.json(), profileRes.json(), follMetricRes.json(), mediaRes.json()
    ])

    // Resolve follower count: try profile field first, fall back to lifetime metric
    const followerFromProfile: number = profileData.followers_count ?? 0
    const followerFromMetric: number  = follMetricData.data?.[0]?.values?.[0]?.value ?? 0
    const followerCount = followerFromProfile || followerFromMetric

    const followerInsight = followerCount > 0
      ? [{ name: 'follower_count', values: [{ value: followerCount, end_time: new Date().toISOString() }] }]
      : []

    const insights = [
      ...((reachImpData.data as unknown[]) || []),
      ...followerInsight,
    ]

    const posts: Array<{ id: string; caption?: string; timestamp: string; like_count?: number; comments_count?: number }> =
      (mediaData.data || []).slice(0, 10)

    const postInsightResults = await Promise.allSettled(
      posts.map(post =>
        fetch(`${IG_BASE}/${post.id}/insights?metric=impressions,reach,saved&access_token=${accessToken}`)
          .then(r => r.json())
      )
    )

    const enrichedPosts = posts.map((post, i) => {
      const result = postInsightResults[i]
      let reach = 0, impressions = 0, saves = 0
      if (result.status === 'fulfilled' && Array.isArray(result.value?.data)) {
        for (const m of result.value.data) {
          const val = Array.isArray(m.values) ? (m.values[0]?.value ?? 0) : (m.value ?? 0)
          if (m.name === 'reach') reach = val
          else if (m.name === 'impressions') impressions = val
          else if (m.name === 'saved') saves = val
        }
      }
      return { ...post, reach, impressions, saves }
    })

    return NextResponse.json({ insights, media: enrichedPosts })
  } catch (err: unknown) {
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Stats fetch failed' }, { status: 500 })
  }
}

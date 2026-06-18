const IG_BASE = 'https://graph.instagram.com/v21.0'

export async function publishToInstagram(
  _igUserId: string,
  accessToken: string,
  imageUrl: string,
  caption: string
): Promise<{ instagram_post_id: string; permalink: string }> {
  // Step A: Create media container
  const containerRes = await fetch(`${IG_BASE}/me/media`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      image_url: imageUrl,
      caption,
      access_token: accessToken,
    }),
  })
  const containerData = await containerRes.json()
  if (!containerData.id) {
    const code = containerData?.error?.code
    if (code === 200 || code === 10) {
      throw new Error('Instagram permission error — please disconnect and reconnect your Instagram account in Settings, then try again.')
    }
    throw new Error(`IG container creation failed: ${JSON.stringify(containerData)}`)
  }

  // Step B: Poll until container is ready (Instagram processes the image asynchronously)
  const MAX_POLLS = 20
  const POLL_INTERVAL_MS = 3000
  for (let i = 0; i < MAX_POLLS; i++) {
    await new Promise(r => setTimeout(r, POLL_INTERVAL_MS))
    const statusRes = await fetch(
      `${IG_BASE}/${containerData.id}?fields=status_code&access_token=${accessToken}`
    )
    const statusData = await statusRes.json()
    if (statusData.status_code === 'FINISHED') break
    if (statusData.status_code === 'ERROR') {
      throw new Error(`IG media container processing failed: ${JSON.stringify(statusData)}`)
    }
    if (i === MAX_POLLS - 1) {
      throw new Error('IG media container timed out waiting to be ready for publishing')
    }
  }

  // Step C: Publish container
  const publishRes = await fetch(`${IG_BASE}/me/media_publish`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      creation_id: containerData.id,
      access_token: accessToken,
    }),
  })
  const publishData = await publishRes.json()
  if (!publishData.id) throw new Error(`IG publish failed: ${JSON.stringify(publishData)}`)

  // Get permalink
  const permalinkRes = await fetch(
    `${IG_BASE}/${publishData.id}?fields=permalink&access_token=${accessToken}`
  )
  const permalinkData = await permalinkRes.json()

  return {
    instagram_post_id: publishData.id,
    permalink: permalinkData.permalink || '',
  }
}

export async function refreshInstagramToken(accessToken: string): Promise<{ access_token: string; expires_in: number }> {
  const res = await fetch(
    `${IG_BASE}/refresh_access_token?grant_type=ig_refresh_token&access_token=${accessToken}`
  )
  return res.json()
}

export async function getInstagramStats(accessToken: string, since: number, until: number) {
  const insightsRes = await fetch(
    `${IG_BASE}/me/insights?metric=impressions,reach,profile_views,follower_count&period=day&since=${since}&until=${until}&access_token=${accessToken}`
  )
  const insights = await insightsRes.json()

  const mediaRes = await fetch(
    `${IG_BASE}/me/media?fields=id,caption,media_url,timestamp,like_count,comments_count&access_token=${accessToken}`
  )
  const media = await mediaRes.json()

  return { insights: insights.data || [], media: media.data || [] }
}

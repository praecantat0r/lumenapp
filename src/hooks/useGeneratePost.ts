'use client'
import { useState } from 'react'

export type GenerateConfig = {
  assetMode: 'original' | 'auto' | 'specific' | 'composite'
  assetUrl?: string
  assetName?: string
  assetType?: string
  assetDescription?: string
  scenicAssetUrl?: string
  scenicAssetName?: string
  scenicAssetDescription?: string
  productAssetUrl?: string
  productAssetName?: string
  productAssetDescription?: string
}

const MAX_POLL_ATTEMPTS = 100

export function useGeneratePost(
  steps: string[],
  onSuccess: () => void,
  onError: (msg: string) => void,
) {
  const [generating, setGenerating] = useState(false)
  const [genStep, setGenStep] = useState(steps[0] ?? '')

  async function generatePost(config: GenerateConfig) {
    setGenerating(true)
    setGenStep(steps[0] ?? '')
    let stepIdx = 0
    const stepInterval = setInterval(() => {
      stepIdx = Math.min(stepIdx + 1, steps.length - 1)
      setGenStep(steps[stepIdx] ?? '')
    }, 18000)

    try {
      const res = await fetch('/api/generate/pipeline', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      })
      if (!res.ok) {
        const e = await res.json()
        throw new Error(e.error || 'Generation failed')
      }
      const { post_id } = await res.json()

      let pollCount = 0
      let delay = 3000
      const MAX_DELAY = 15000

      function schedulePoll() {
        setTimeout(async () => {
          try {
            pollCount++
            if (pollCount > MAX_POLL_ATTEMPTS) {
              clearInterval(stepInterval)
              setGenerating(false)
              onError('Generation timed out. Please check your posts.')
              return
            }
            const s = await fetch(`/api/posts/${post_id}/status`)
            const d = await s.json()
            if (d.status === 'pending_review' || d.status === 'failed') {
              clearInterval(stepInterval)
              setGenerating(false)
              if (d.status === 'pending_review') onSuccess()
              else onError('Generation failed.')
              return
            }
            delay = Math.min(delay * 1.5, MAX_DELAY)
            schedulePoll()
          } catch { schedulePoll() }
        }, delay)
      }
      schedulePoll()
    } catch (err: unknown) {
      clearInterval(stepInterval)
      onError(err instanceof Error ? err.message : 'Generation failed')
      setGenerating(false)
    }
  }

  return { generating, genStep, generatePost }
}

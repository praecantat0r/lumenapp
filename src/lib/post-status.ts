export const POST_STATUS_CONFIG = {
  pending_review: {
    color: '#b68d40',
    colorAlt: '#D4A84B',
    bg: 'rgba(212,168,75,.18)',
    border: '1px solid rgba(212,168,75,.3)',
    cardBg: 'rgba(14,14,13,0.8)',
    cardBorder: 'rgba(182,141,64,0.2)',
    icon: 'pending',
  },
  approved: {
    color: '#6EBF8B',
    colorAlt: '#6EBF8B',
    bg: 'rgba(110,191,139,.14)',
    border: '1px solid rgba(110,191,139,.25)',
    cardBg: 'rgba(14,14,13,0.8)',
    cardBorder: 'rgba(110,191,139,0.25)',
    icon: 'check_circle',
  },
  published: {
    color: '#7AABFF',
    colorAlt: '#7AABFF',
    bg: 'rgba(100,160,255,.14)',
    border: '1px solid rgba(100,160,255,.25)',
    cardBg: 'rgba(78,69,56,0.7)',
    cardBorder: 'rgba(255,255,255,0.1)',
    icon: 'publish',
  },
  failed: {
    color: '#E07070',
    colorAlt: '#ffb4ab',
    bg: 'rgba(224,112,112,.14)',
    border: '1px solid rgba(224,112,112,.25)',
    cardBg: 'rgba(147,0,10,0.75)',
    cardBorder: 'rgba(255,180,171,0.2)',
    icon: 'error',
  },
  generating: {
    color: '#C4B99A',
    colorAlt: '#C4B99A',
    bg: 'rgba(120,112,88,.15)',
    border: '1px solid rgba(120,112,88,.2)',
    cardBg: 'rgba(14,14,13,0.8)',
    cardBorder: 'rgba(201,194,181,0.15)',
    icon: 'autorenew',
  },
} as const

export type PostStatus = keyof typeof POST_STATUS_CONFIG

export function getStatusConfig(status: string) {
  return POST_STATUS_CONFIG[status as PostStatus] ?? POST_STATUS_CONFIG.generating
}

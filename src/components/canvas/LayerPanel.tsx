'use client'

export interface LiveLayer {
  lumenId: string
  type: string
}
//logosss
interface LayerPanelProps {
  layers: LiveLayer[]        // top-to-bottom visual order (index 0 = front)
  selectedLumenId?: string
  onSelectLayer: (lumenId: string) => void
  onMoveUp:   (lumenId: string) => void
  onMoveDown: (lumenId: string) => void
}

function layerIcon(type: string, lumenId: string): string {
  if (lumenId === 'background-image') return 'image'
  if (lumenId === 'overlay')          return 'gradient'
  if (lumenId === 'logo')             return 'circle'
  const t = (type ?? '').toLowerCase()
  if (t === 'textbox' || t === 'text' || t === 'i-text') return 'title'
  if (t === 'circle')  return 'circle'
  if (t === 'rect')    return 'rectangle'
  if (t === 'image' || t === 'fabricimage') return 'image'
  return 'layers'
}

export function LayerPanel({ layers, selectedLumenId, onSelectLayer, onMoveUp, onMoveDown }: LayerPanelProps) {
  return (
    <div style={{ padding: '0' }}>
      {layers.length === 0 && (
        <div style={{
          padding: '12px 0',
          fontSize: 12,
          color: 'var(--muted)',
          fontFamily: 'var(--font-ibm)',
        }}>
          No layers yet
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {layers.map((layer, i) => {
          const isSelected = selectedLumenId === layer.lumenId
          return (
            <div
              key={layer.lumenId}
              onClick={() => onSelectLayer(layer.lumenId)}
              style={{
                display: 'flex', alignItems: 'center', gap: 8,
                padding: '8px 10px', borderRadius: 10,
                background: isSelected ? 'rgba(182,141,64,0.1)' : 'var(--surface-2)',
                border: `1px solid ${isSelected ? 'rgba(182,141,64,0.3)' : 'var(--border)'}`,
                cursor: 'pointer',
                transition: 'all 0.12s',
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 14, color: isSelected ? 'var(--candle)' : 'var(--muted)', flexShrink: 0 }}
              >
                {layerIcon(layer.type, layer.lumenId)}
              </span>

              <span style={{
                flex: 1,
                fontSize: 11,
                color: isSelected ? 'var(--parchment)' : 'var(--sand)',
                fontFamily: 'var(--font-ibm)',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}>
                {layer.lumenId}
              </span>

              {/* Reorder buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                <button
                  title="Move forward"
                  disabled={i === 0}
                  onClick={e => { e.stopPropagation(); onMoveUp(layer.lumenId) }}
                  style={{
                    background: 'none', border: 'none', padding: '2px 4px',
                    color: i === 0 ? 'var(--muted)' : 'var(--sand)',
                    cursor: i === 0 ? 'default' : 'pointer',
                    fontSize: 9, lineHeight: 1,
                  }}
                >▲</button>
                <button
                  title="Send backward"
                  disabled={i === layers.length - 1}
                  onClick={e => { e.stopPropagation(); onMoveDown(layer.lumenId) }}
                  style={{
                    background: 'none', border: 'none', padding: '2px 4px',
                    color: i === layers.length - 1 ? 'var(--muted)' : 'var(--sand)',
                    cursor: i === layers.length - 1 ? 'default' : 'pointer',
                    fontSize: 9, lineHeight: 1,
                  }}
                >▼</button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

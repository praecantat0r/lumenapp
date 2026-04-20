'use client'
import { useT } from './LangContext'

interface TweakState {
  heroVariant: 'A' | 'B'
  headline: string
  ctaLabel: string
  feedDensity: string
  theme: string
  sections: Record<string, boolean>
}

interface TweaksPanelProps {
  open: boolean
  state: TweakState
  onChange: (patch: Partial<TweakState> & { sections?: Partial<TweakState['sections']> }) => void
  onClose: () => void
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div style={{ fontSize: 10, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 12, fontWeight: 500 }}>{title}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{children}</div>
    </div>
  )
}

function Radio({ label, value, options, onChange }: { label: string; value: string; options: { v: string; label: string }[]; onChange: (v: string) => void }) {
  return (
    <div>
      <div style={{ fontSize: 11, color: 'var(--sand)', marginBottom: 6, fontWeight: 300 }}>{label}</div>
      <div style={{ display: 'flex', gap: 4, padding: 3, background: 'var(--surface)', borderRadius: 9999, border: '1px solid var(--border)' }}>
        {options.map(o => (
          <button key={o.v} onClick={() => onChange(o.v)}
            style={{
              flex: 1, padding: '6px 10px', borderRadius: 9999, border: 'none',
              background: value === o.v ? 'var(--candle)' : 'transparent',
              color: value === o.v ? '#fff' : 'var(--sand)',
              fontFamily: 'var(--font-ibm)', fontSize: 11, cursor: 'pointer', transition: 'all .15s',
            }}>{o.label}</button>
        ))}
      </div>
    </div>
  )
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }}>
      <span style={{ fontSize: 12, color: 'var(--parchment)', fontWeight: 300 }}>{label}</span>
      <span onClick={() => onChange(!value)} style={{
        position: 'relative', width: 32, height: 18, borderRadius: 9999,
        background: value ? 'var(--candle)' : 'var(--surface-3)',
        transition: 'background .15s', flexShrink: 0, display: 'block',
      }}>
        <span style={{
          position: 'absolute', top: 2, left: value ? 16 : 2,
          width: 14, height: 14, borderRadius: '50%', background: '#fff',
          transition: 'left .15s', display: 'block',
        }}/>
      </span>
    </label>
  )
}

function TextInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={{ fontSize: 11, color: 'var(--sand)', fontWeight: 300 }}>{label}</span>
      <input value={value || ''} onChange={e => onChange(e.target.value)} placeholder="default"
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          color: 'var(--parchment)', padding: '7px 10px', borderRadius: 8,
          fontSize: 12, fontFamily: 'var(--font-ibm)', outline: 'none',
        }}/>
    </label>
  )
}

export function TweaksPanel({ open, state, onChange, onClose }: TweaksPanelProps) {
  const { t } = useT()
  if (!open) return null

  const secNames = t.tweaks.secNames
  const sec = (key: string, visible: boolean) => ({ ...state.sections, [key]: visible })

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 100,
      width: 320, maxHeight: 'calc(100vh - 48px)', overflowY: 'auto',
      background: 'var(--surface-2)', border: '1px solid rgba(78,69,56,0.65)',
      borderRadius: 14, boxShadow: '0 30px 80px rgba(0,0,0,0.6)',
      fontFamily: 'var(--font-ibm)',
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '14px 16px', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16, color: 'var(--candle)' }}>tune</span>
          <span style={{ fontFamily: 'var(--font-syne)', fontWeight: 700, fontSize: 14, color: 'var(--candle)' }}>{t.tweaks.title}</span>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', padding: 4, display: 'flex' }}>
          <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
        </button>
      </div>

      <div style={{ padding: 16, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <Group title={t.tweaks.hero}>
          <Radio label={t.tweaks.variation} value={state.heroVariant} options={[
            { v: 'A', label: t.tweaks.variationA },
            { v: 'B', label: t.tweaks.variationB },
          ]} onChange={v => onChange({ heroVariant: v as 'A' | 'B' })} />
          <TextInput label={t.tweaks.headline} value={state.headline} onChange={v => onChange({ headline: v })} />
          <TextInput label={t.tweaks.ctaLabel} value={state.ctaLabel} onChange={v => onChange({ ctaLabel: v })} />
        </Group>

        <Group title={t.tweaks.feedSec}>
          <Radio label={t.tweaks.density} value={state.feedDensity} options={[
            { v: 'sparse', label: t.tweaks.sparse },
            { v: 'default', label: t.tweaks.default },
            { v: 'dense', label: t.tweaks.dense },
          ]} onChange={v => onChange({ feedDensity: v })} />
        </Group>

        <Group title={t.tweaks.sections}>
          {([
            ['howItWorks', secNames.howItWorks],
            ['features',   secNames.features],
            ['brandBrain', secNames.brandBrain],
            ['beforeAfter',secNames.beforeAfter],
            ['feed',       secNames.feed],
            ['video',      secNames.video],
            ['testimonials',secNames.testimonials],
            ['pricing',    secNames.pricing],
            ['faq',        secNames.faq],
          ] as [string, string][]).map(([k, l]) => (
            <Toggle key={k} label={l} value={!!state.sections[k]}
              onChange={v => onChange({ sections: sec(k, v) })} />
          ))}
        </Group>
      </div>
    </div>
  )
}

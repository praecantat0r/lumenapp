'use client'
import { Button, LumenWordmark } from './ui'
import { useT } from './LangContext'
import { useBreakpoint } from './useBreakpoint'

const LINK_HREFS: Record<string, string> = {
  'Privacy': '/landing/privacy',
  'Terms': '/landing/terms',
}

export function Footer({ onCTA }: { onCTA: () => void }) {
  const { t } = useT()
  const { isMobile, isTablet } = useBreakpoint()

  return (
    <footer style={{ position: 'relative' }}>
      {/* Big CTA band */}
      <section style={{
        padding: isMobile ? '72px 20px' : '120px 32px', position: 'relative', overflow: 'hidden',
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
      }}>
        <div style={{
          position: 'absolute', top: -150, left: '50%', transform: 'translateX(-50%)',
          width: 1000, height: 500, pointerEvents: 'none',
          background: 'radial-gradient(ellipse at center, rgba(212,168,75,0.2) 0%, transparent 65%)',
        }}/>
        <div style={{ position: 'relative', maxWidth: 900, margin: '0 auto', textAlign: 'center' }}>
          <h2 style={{
            margin: 0, fontFamily: 'var(--font-syne)', fontWeight: 700,
            fontSize: isMobile ? 'clamp(32px, 9vw, 48px)' : 'clamp(40px, 6vw, 80px)', lineHeight: 1.05,
            letterSpacing: '-0.035em', color: 'var(--parchment)',
            textWrap: 'balance' as React.CSSProperties['textWrap'],
          }}>
            {t.footer.cta_1}{' '}
            <span style={{ fontStyle: 'italic', fontWeight: 400, color: 'var(--candle)' }}>{t.footer.cta_2}</span>
          </h2>
          <p style={{
            margin: '24px auto 0', fontFamily: 'var(--font-ibm)', fontWeight: 300,
            fontSize: isMobile ? 16 : 18, lineHeight: 1.55, color: 'var(--sand)', maxWidth: 560,
          }}>{t.footer.cta_sub}</p>
          <div style={{ marginTop: 36, display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
            <Button variant="primary" size="lg" icon="arrow_forward" onClick={onCTA}>{t.footer.trial}</Button>
            <Button variant="ghost" size="lg">{t.footer.sales}</Button>
          </div>
        </div>
      </section>

      {/* Footer links */}
      <section style={{ padding: isMobile ? '40px 20px 24px' : '64px 32px 32px' }}>
        {isMobile ? (
          <div style={{ maxWidth: 1240, margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <LumenWordmark size={18} />
              <div style={{ display: 'flex', gap: 16 }}>
                {['Twitter', 'Instagram'].map(name => (
                  <a key={name} href="#" style={{ fontFamily: 'var(--font-ibm)', fontSize: 12, color: 'var(--muted)', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--candle)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                  >{name}</a>
                ))}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px 32px', marginBottom: 28 }}>
              {t.footer.cols.map(c => (
                <div key={c.title}>
                  <div style={{
                    fontFamily: 'var(--font-ibm)', fontSize: 9, letterSpacing: '0.15em',
                    textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 500, marginBottom: 10,
                  }}>{c.title}</div>
                  <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {c.links.map(l => (
                      <li key={l}>
                        <a href={LINK_HREFS[l] ?? '#'} style={{ fontFamily: 'var(--font-ibm)', fontSize: 12, color: 'var(--sand)', fontWeight: 300, textDecoration: 'none' }}
                          onMouseEnter={e => (e.currentTarget.style.color = 'var(--candle)')}
                          onMouseLeave={e => (e.currentTarget.style.color = 'var(--sand)')}
                        >{l}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>

            <div style={{ paddingTop: 20, borderTop: '1px solid var(--border)', fontFamily: 'var(--font-ibm)', fontSize: 11, color: 'var(--muted)' }}>
              {t.footer.copyright}
            </div>
          </div>
        ) : (
          <>
            <div style={{
              maxWidth: 1240, margin: '0 auto',
              display: 'grid',
              gridTemplateColumns: isTablet ? '1fr 1fr' : '1.5fr repeat(4, 1fr)',
              gap: 40,
            }}>
              <div>
                <LumenWordmark size={18} />
                <p style={{ marginTop: 16, fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'var(--sand)', fontWeight: 300, lineHeight: 1.6, maxWidth: 280 }}>
                  {t.footer.about}
                </p>
                <div style={{ marginTop: 24 }}>
                  <div style={{
                    fontFamily: 'var(--font-ibm)', fontSize: 10, letterSpacing: '0.15em',
                    textTransform: 'uppercase', color: 'var(--muted)', marginBottom: 10, fontWeight: 500,
                  }}>{t.footer.dispatches}</div>
                  <form onSubmit={e => e.preventDefault()} style={{ display: 'flex', gap: 6, maxWidth: 320 }}>
                    <input type="email" placeholder={t.footer.emailPh}
                      style={{
                        flex: 1, background: 'var(--surface)', border: '1px solid var(--border)',
                        borderRadius: 9999, padding: '9px 16px', fontSize: 13,
                        color: 'var(--parchment)', fontFamily: 'var(--font-ibm)', outline: 'none',
                      }}/>
                    <button type="submit" style={{
                      padding: '9px 16px', borderRadius: 9999, border: 'none',
                      background: 'var(--candle)', color: '#fff', fontFamily: 'var(--font-syne)',
                      fontWeight: 700, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
                    }}>{t.footer.subscribe}</button>
                  </form>
                </div>
              </div>

              {isTablet ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px 40px', gridColumn: '2 / -1' }}>
                  {t.footer.cols.map(c => (
                    <div key={c.title}>
                      <div style={{
                        fontFamily: 'var(--font-ibm)', fontSize: 10, letterSpacing: '0.15em',
                        textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 500, marginBottom: 16,
                      }}>{c.title}</div>
                      <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {c.links.map(l => (
                          <li key={l}>
                            <a href={LINK_HREFS[l] ?? '#'} style={{ fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'var(--sand)', fontWeight: 300, textDecoration: 'none', transition: 'color .15s' }}
                              onMouseEnter={e => (e.currentTarget.style.color = 'var(--candle)')}
                              onMouseLeave={e => (e.currentTarget.style.color = 'var(--sand)')}
                            >{l}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              ) : (
                t.footer.cols.map(c => (
                  <div key={c.title}>
                    <div style={{
                      fontFamily: 'var(--font-ibm)', fontSize: 10, letterSpacing: '0.15em',
                      textTransform: 'uppercase', color: 'var(--candle)', fontWeight: 500, marginBottom: 16,
                    }}>{c.title}</div>
                    <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {c.links.map(l => (
                        <li key={l}>
                          <a href={LINK_HREFS[l] ?? '#'} style={{ fontFamily: 'var(--font-ibm)', fontSize: 13, color: 'var(--sand)', fontWeight: 300, textDecoration: 'none', transition: 'color .15s' }}
                            onMouseEnter={e => (e.currentTarget.style.color = 'var(--candle)')}
                            onMouseLeave={e => (e.currentTarget.style.color = 'var(--sand)')}
                          >{l}</a>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
            </div>

            <div style={{
              maxWidth: 1240, margin: '40px auto 0', paddingTop: 24,
              borderTop: '1px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              fontFamily: 'var(--font-ibm)', fontSize: 12, color: 'var(--muted)',
              flexWrap: 'wrap', gap: 12,
            }}>
              <div>{t.footer.copyright}</div>
              <div style={{ display: 'flex', gap: 18, flexWrap: 'wrap' }}>
                {['Twitter', 'Instagram', 'GitHub', 'LinkedIn'].map(name => (
                  <a key={name} href="#" style={{ color: 'var(--muted)', textDecoration: 'none' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--candle)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--muted)')}
                  >{name}</a>
                ))}
              </div>
            </div>
          </>
        )}
      </section>
    </footer>
  )
}

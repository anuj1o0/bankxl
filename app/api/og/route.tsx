import { ImageResponse } from '@vercel/og'
import { NextRequest } from 'next/server'

export const runtime = 'edge'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const title = searchParams.get('title') || 'Bank Statement PDF to Excel in 15 Seconds'
  const sub = searchParams.get('sub') || 'Trusted by 1,200+ CAs across India'

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          display: 'flex',
          flexDirection: 'column',
          background: 'linear-gradient(135deg, #0a0d14 0%, #0d1422 50%, #0a1628 100%)',
          padding: '64px',
          fontFamily: 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Grid background dots */}
        <div style={{
          position: 'absolute', inset: 0, opacity: 0.04,
          backgroundImage: 'radial-gradient(circle, #ffffff 1px, transparent 1px)',
          backgroundSize: '32px 32px',
          display: 'flex',
        }} />

        {/* Glow blob */}
        <div style={{
          position: 'absolute', top: '-100px', right: '-100px',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(0,168,107,0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          display: 'flex',
        }} />

        {/* Logo row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '48px' }}>
          <div style={{
            width: '44px', height: '44px', borderRadius: '10px',
            background: 'linear-gradient(135deg, #00a86b, #00d084)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '22px', fontWeight: '700', color: '#fff',
          }}>B</div>
          <span style={{ fontSize: '22px', fontWeight: '600', color: '#ffffff', letterSpacing: '-0.02em' }}>BankXL</span>
          <div style={{
            marginLeft: '12px', padding: '4px 12px',
            background: 'rgba(0,168,107,0.15)', border: '1px solid rgba(0,168,107,0.3)',
            borderRadius: '20px', fontSize: '12px', color: '#00a86b',
            display: 'flex', alignItems: 'center',
          }}>
            ● Live
          </div>
        </div>

        {/* Main title */}
        <div style={{
          fontSize: title.length > 50 ? '44px' : '52px',
          fontWeight: '700', color: '#ffffff',
          lineHeight: '1.15', letterSpacing: '-0.03em',
          marginBottom: '20px', maxWidth: '900px',
          display: 'flex', flexWrap: 'wrap',
        }}>
          {title}
        </div>

        {/* Subtitle */}
        <div style={{ fontSize: '22px', color: 'rgba(255,255,255,0.55)', marginBottom: '48px', display: 'flex' }}>
          {sub}
        </div>

        {/* Stats row */}
        <div style={{ display: 'flex', gap: '32px', marginTop: 'auto' }}>
          {[
            { v: '1,200+', l: 'CAs onboard' },
            { v: '50,000+', l: 'Statements converted' },
            { v: '99.5%', l: 'Accuracy' },
            { v: '15s', l: 'Avg conversion' },
          ].map(s => (
            <div key={s.l} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <span style={{ fontSize: '28px', fontWeight: '700', color: '#00a86b', letterSpacing: '-0.02em' }}>{s.v}</span>
              <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>{s.l}</span>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div style={{
          position: 'absolute', bottom: '0', left: '0', right: '0',
          height: '4px',
          background: 'linear-gradient(90deg, #00a86b, #00d084, #0066ff, #00a86b)',
          display: 'flex',
        }} />
      </div>
    ),
    { width: 1200, height: 630 }
  )
}

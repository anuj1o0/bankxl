// Returns a visual color + initials badge for any bank name.
// We don't ship trademarked logos — instead, deterministic color + monogram per bank.

const BANK_COLORS: Record<string, string> = {
  'state bank of india': '#1B3D7B',
  'sbi': '#1B3D7B',
  'hdfc bank': '#1F4097',
  'icici bank': '#B02418',
  'axis bank': '#9F1F32',
  'kotak mahindra bank': '#E63946',
  'punjab national bank': '#A6275C',
  'canara bank': '#0E5BBE',
  'bank of baroda': '#E96921',
  'idfc first bank': '#762381',
  'indusind bank': '#971F30',
  'yes bank': '#003366',
  'federal bank': '#0F3D86',
  'union bank of india': '#A52A2A',
  'rbl bank': '#5C2D8F',
  'idbi bank': '#C7993D',
  'bank of india': '#FFC72C',
  'au small finance bank': '#7F1F36',
  'paytm payments bank': '#00BAF2',
  'airtel payments bank': '#E4002B',
  'standard chartered': '#0473EA',
  'citibank': '#003B6B',
  'hsbc': '#DB0011',
  'dbs bank': '#EF1B23',
}

function colorFor(name: string): string {
  const k = name.toLowerCase().trim()
  for (const [keyword, color] of Object.entries(BANK_COLORS)) {
    if (k.includes(keyword)) return color
  }
  // deterministic fallback color from hash
  let hash = 0
  for (let i = 0; i < k.length; i++) hash = (hash * 31 + k.charCodeAt(i)) & 0xffff
  const palette = ['#7e57c2', '#26a69a', '#ec407a', '#5c6bc0', '#ef6c00', '#00838f', '#558b2f', '#ad1457']
  return palette[hash % palette.length]
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(p => !/^bank$|^of$|^the$|^limited$|^ltd$/i.test(p))
  if (parts.length === 0) return name.slice(0, 2).toUpperCase()
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export default function BankIcon({ name, size = 28 }: { name?: string | null; size?: number }) {
  if (!name) {
    return (
      <div style={{
        width: size, height: size, borderRadius: 6,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      }}>
        <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" stroke="#7a8499" strokeWidth="1.8" strokeLinecap="round">
          <path d="M3 21h18M5 21V10l7-7 7 7v11M9 21V12h6v9" />
        </svg>
      </div>
    )
  }
  const bg = colorFor(name)
  return (
    <div style={{
      width: size, height: size, borderRadius: 6,
      background: bg, color: '#fff',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      fontFamily: 'DM Mono, monospace', fontSize: Math.max(9, size * 0.35), fontWeight: 600, letterSpacing: 0.5,
      boxShadow: 'inset 0 -1px 0 rgba(0,0,0,0.15)',
    }}>
      {initials(name)}
    </div>
  )
}

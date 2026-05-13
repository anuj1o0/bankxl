import Link from 'next/link'

export default function Logo({ size = 18 }: { size?: number }) {
  return (
    <Link href="/" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 8 }}>
      <span style={{
        width: size + 14, height: size + 14, background: 'var(--accent)', borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <svg width={size - 2} height={size - 2} viewBox="0 0 20 20" fill="none" stroke="var(--on-accent)" strokeWidth="1.8" strokeLinecap="round">
          <rect x="3" y="2" width="10" height="13" rx="2" />
          <path d="M7 6h4M7 9h4M7 12h2" />
          <path d="M13 9l4 4-4 4M17 13H9.5" />
        </svg>
      </span>
      <span style={{ fontWeight: 600, fontSize: size, letterSpacing: '-0.02em', color: 'var(--text)' }}>
        Bank<span style={{ color: 'var(--accent)' }}>XL</span>
      </span>
    </Link>
  )
}

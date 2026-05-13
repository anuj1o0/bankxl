interface Props {
  width?: number | string
  height?: number | string
  radius?: number
  className?: string
  style?: React.CSSProperties
}

export function Skeleton({ width, height = 14, radius = 6, className, style }: Props) {
  return (
    <div className={`bxl-skeleton ${className ?? ''}`}
      style={{
        width: width ?? '100%',
        height,
        borderRadius: radius,
        ...style,
      }} />
  )
}

export function SkeletonCard() {
  return (
    <div style={{ background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: 12, padding: 18 }}>
      <Skeleton width={70} height={9} radius={3} />
      <div style={{ height: 12 }} />
      <Skeleton width={90} height={26} radius={5} />
      <div style={{ height: 8 }} />
      <Skeleton width={130} height={9} radius={3} />
    </div>
  )
}

export function SkeletonTableRow() {
  return (
    <div style={{ padding: '14px 18px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', alignItems: 'center', gap: 14 }}>
      <Skeleton width={28} height={28} radius={6} />
      <div style={{ flex: 1 }}>
        <Skeleton width="60%" height={11} />
        <div style={{ height: 6 }} />
        <Skeleton width="35%" height={9} />
      </div>
      <Skeleton width={60} height={9} />
      <Skeleton width={70} height={20} radius={20} />
    </div>
  )
}

export function GlobalSkeletonStyles() {
  return (
    <style jsx global>{`
      .bxl-skeleton {
        display: inline-block;
        background: linear-gradient(90deg,
          var(--surface-2) 0%,
          var(--surface-3) 50%,
          var(--surface-2) 100%);
        background-size: 200% 100%;
        animation: bxl-shimmer 1.4s ease-in-out infinite;
      }
      @keyframes bxl-shimmer {
        0% { background-position: 200% 0; }
        100% { background-position: -200% 0; }
      }
    `}</style>
  )
}

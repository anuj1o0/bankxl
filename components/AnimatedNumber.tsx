'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  end: number
  duration?: number
  format?: (n: number) => string
  start?: number
}

export default function AnimatedNumber({ end, duration = 1500, start = 0, format }: Props) {
  const [value, setValue] = useState(start)
  const ref = useRef<HTMLSpanElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!ref.current) return
    const obs = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && !startedRef.current) {
          startedRef.current = true
          const t0 = performance.now()
          const tick = (now: number) => {
            const t = Math.min((now - t0) / duration, 1)
            const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
            setValue(start + (end - start) * ease)
            if (t < 1) requestAnimationFrame(tick)
            else setValue(end)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.4 }
    )
    obs.observe(ref.current)
    return () => obs.disconnect()
  }, [end, start, duration])

  return <span ref={ref}>{format ? format(value) : Math.round(value).toLocaleString('en-IN')}</span>
}

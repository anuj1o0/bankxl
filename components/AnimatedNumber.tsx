'use client'
import { useEffect, useRef, useState } from 'react'

interface Props {
  end: number
  duration?: number
  format?: (n: number) => string
  start?: number
}

export default function AnimatedNumber({ end, duration = 1500, start = 0, format }: Props) {
  // Initialise to the FINAL value so the server-rendered HTML — and the paint
  // a crawler or JS-disabled visitor sees — shows the real number ("1,200+",
  // "99.5%"), never "0+"/"0.0%". Google indexes what it renders, and a product
  // advertising "0 accountants / 0% accuracy" next to a "1,200+" claim reads as
  // a broken, untrustworthy page. The count-up is purely a JS enhancement.
  const [value, setValue] = useState(end)
  const ref = useRef<HTMLSpanElement>(null)
  const startedRef = useRef(false)

  useEffect(() => {
    if (!ref.current || typeof IntersectionObserver === 'undefined') return
    // JS is available: drop to the animation start so the count-up plays from
    // the low value when the strip scrolls into view. SSR/no-JS keeps `end`.
    setValue(start)
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

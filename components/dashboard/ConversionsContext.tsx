'use client'
import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { track } from '@/lib/track'

export type JobStatus = 'queued' | 'uploading' | 'extracting' | 'building' | 'done' | 'error'
export interface Job {
  id: string
  filename: string
  format: 'excel' | 'csv' | 'json' | 'tally'
  status: JobStatus
  progress: number
  startedAt: number
  completedAt?: number
  blob?: Blob
  filename_out?: string
  error?: string
  errorCanTopup?: boolean
  txCount?: number
  pages?: number
  bank?: string
  warning?: string
  conversionId?: string
  downloaded?: boolean
}

interface Ctx {
  jobs: Job[]
  active: Job[]
  recent: Job[]
  startJob: (file: File, format: Job['format']) => string
  download: (jobId: string) => void
  dismiss: (jobId: string) => void
  retry: (jobId: string) => void
  clearAll: () => void
}

const ConversionsContext = createContext<Ctx | null>(null)

export function ConversionsProvider({ children, onComplete }: { children: ReactNode; onComplete?: () => void }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const updateJob = useCallback((id: string, fields: Partial<Job>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...fields } : j))
  }, [])

  const runProgress = useCallback((id: string, signal: { cancelled: boolean }) => {
    const stages: { status: JobStatus; until: number; duration: number }[] = [
      { status: 'uploading', until: 25, duration: 800 },
      { status: 'extracting', until: 88, duration: 18000 },
    ]
    let prog = 0
    let stageIdx = 0
    const start = Date.now()
    const tick = () => {
      if (signal.cancelled) return
      const stage = stages[stageIdx]
      if (!stage) return
      const stageStart = start + stages.slice(0, stageIdx).reduce((s, st) => s + st.duration, 0)
      const t = Math.min((Date.now() - stageStart) / stage.duration, 1)
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      const startProg = stageIdx === 0 ? 0 : stages[stageIdx - 1].until
      prog = startProg + (stage.until - startProg) * ease
      updateJob(id, { progress: prog, status: stage.status })
      if (t >= 1 && stageIdx < stages.length - 1) {
        stageIdx++
      }
      if (prog < 88) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [updateJob])

  const startJob = useCallback((file: File, format: Job['format']) => {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const job: Job = {
      id, filename: file.name, format,
      status: 'queued', progress: 0, startedAt: Date.now(),
    }
    setJobs(prev => [job, ...prev])
    track('upload_started', { format, surface: 'dashboard' })

    const signal = { cancelled: false }
    setTimeout(() => runProgress(id, signal), 100)

    const formData = new FormData()
    formData.append('pdf', file)
    formData.append('format', format)

    ;(async () => {
      try {
        const res = await fetch('/api/convert', { method: 'POST', body: formData })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          signal.cancelled = true
          track('conversion_failed', { format, surface: 'dashboard', reason: data.canTopup ? 'usage_limit' : 'extraction_error' })
          updateJob(id, {
            status: 'error',
            error: data.error || 'Conversion failed',
            errorCanTopup: !!data.canTopup,
            progress: 0,
            completedAt: Date.now(),
          })
          return
        }
        updateJob(id, { status: 'building', progress: 95 })
        const blob = await res.blob()
        const txCount = parseInt(res.headers.get('X-Transactions-Count') || '0')
        const pages = parseInt(res.headers.get('X-Pages-Count') || '1')
        const bank = res.headers.get('X-Bank-Name') || ''
        const conversionId = res.headers.get('X-Conversion-Id') || ''
        const warningHeader = res.headers.get('X-Extraction-Warning')
        const warning = warningHeader ? decodeURIComponent(warningHeader) : undefined
        const ext = format === 'excel' ? 'xlsx' : format === 'csv' ? 'csv' : format === 'json' ? 'json' : 'xml'
        const filename_out = file.name.replace(/\.pdf$/i, '') + '_bankxl.' + ext
        signal.cancelled = true
        updateJob(id, { status: 'done', progress: 100, blob, filename_out, txCount, pages, bank, warning, conversionId, completedAt: Date.now() })
        track('conversion_complete', { format, surface: 'dashboard', pages, txCount, bank })
        onCompleteRef.current?.()
      } catch (e: any) {
        signal.cancelled = true
        track('conversion_failed', { format, surface: 'dashboard', reason: 'network_error' })
        updateJob(id, { status: 'error', error: e.message || 'Network error', progress: 0, completedAt: Date.now() })
      }
    })()

    return id
  }, [updateJob, runProgress])

  const download = useCallback((jobId: string) => {
    const j = jobs.find(x => x.id === jobId)
    if (!j?.blob || !j.filename_out) return
    const url = URL.createObjectURL(j.blob)
    const a = document.createElement('a')
    a.href = url; a.download = j.filename_out; a.click()
    URL.revokeObjectURL(url)
    updateJob(jobId, { downloaded: true })
  }, [jobs, updateJob])

  const dismiss = useCallback((jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId))
  }, [])

  const retry = useCallback((jobId: string) => {
    setJobs(prev => prev.filter(j => j.id !== jobId))
  }, [])

  const clearAll = useCallback(() => {
    setJobs(prev => prev.filter(j => j.status !== 'done' && j.status !== 'error'))
  }, [])

  const active = jobs.filter(j => j.status !== 'done' && j.status !== 'error')
  const recent = jobs.filter(j => j.status === 'done' || j.status === 'error')

  return (
    <ConversionsContext.Provider value={{ jobs, active, recent, startJob, download, dismiss, retry, clearAll }}>
      {children}
    </ConversionsContext.Provider>
  )
}

export function useConversions() {
  const ctx = useContext(ConversionsContext)
  if (!ctx) throw new Error('useConversions must be used inside ConversionsProvider')
  return ctx
}

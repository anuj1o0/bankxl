'use client'
import { createContext, useContext, useState, useCallback, useRef, ReactNode } from 'react'
import { track } from '@/lib/track'
import { convertPdf, ConvertError } from '@/lib/convert-client'

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
  // Source file kept ONLY while it may still be needed (in-flight, or a failure
  // the user might opt to share). Cleared on success to free the reference.
  file?: File
  reportState?: 'idle' | 'sending' | 'sent'
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
  reportSample: (jobId: string) => void
}

const ConversionsContext = createContext<Ctx | null>(null)

export function ConversionsProvider({ children, onComplete }: { children: ReactNode; onComplete?: () => void }) {
  const [jobs, setJobs] = useState<Job[]>([])
  const onCompleteRef = useRef(onComplete)
  onCompleteRef.current = onComplete

  const updateJob = useCallback((id: string, fields: Partial<Job>) => {
    setJobs(prev => prev.map(j => j.id === id ? { ...j, ...fields } : j))
  }, [])

  // setInterval, NOT requestAnimationFrame: rAF is paused in hidden tabs, so
  // with rAF a job's progress bar froze whenever the user switched tabs —
  // and looked exactly like a hung conversion. Intervals keep firing
  // (throttled) in background tabs.
  const runProgress = useCallback((id: string, signal: { cancelled: boolean }) => {
    const stages: { status: JobStatus; until: number; duration: number }[] = [
      { status: 'uploading', until: 25, duration: 800 },
      { status: 'extracting', until: 88, duration: 18000 },
    ]
    let prog = 0
    let stageIdx = 0
    const start = Date.now()
    const iv = setInterval(() => {
      if (signal.cancelled) { clearInterval(iv); return }
      const stage = stages[stageIdx]
      if (!stage) { clearInterval(iv); return }
      const stageStart = start + stages.slice(0, stageIdx).reduce((s, st) => s + st.duration, 0)
      const t = Math.min((Date.now() - stageStart) / stage.duration, 1)
      const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t
      const startProg = stageIdx === 0 ? 0 : stages[stageIdx - 1].until
      prog = startProg + (stage.until - startProg) * ease
      updateJob(id, { progress: prog, status: stage.status })
      if (t >= 1 && stageIdx < stages.length - 1) {
        stageIdx++
      }
      if (prog >= 88) clearInterval(iv)
    }, 50)
  }, [updateJob])

  const startJob = useCallback((file: File, format: Job['format']) => {
    const id = `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
    const job: Job = {
      id, filename: file.name, format,
      status: 'queued', progress: 0, startedAt: Date.now(),
      file, reportState: 'idle',
    }
    setJobs(prev => [job, ...prev])
    track('upload_started', { format, surface: 'dashboard' })

    const signal = { cancelled: false }
    setTimeout(() => runProgress(id, signal), 100)

    ;(async () => {
      try {
        const out = await convertPdf(file, format, {
          onProgress: p => {
            // Real per-chunk progress from the chunked pipeline replaces the
            // simulated animation the moment it starts reporting.
            if (p.phase === 'extracting' && p.chunksTotal) {
              signal.cancelled = true
              updateJob(id, { status: 'extracting', progress: 15 + 75 * ((p.chunksDone ?? 0) / p.chunksTotal) })
            } else if (p.phase === 'building') {
              signal.cancelled = true
              updateJob(id, { status: 'building', progress: 95 })
            }
          },
        })
        signal.cancelled = true
        updateJob(id, {
          status: 'done', progress: 100,
          blob: out.blob, filename_out: out.filenameOut,
          txCount: out.txCount, pages: out.pages, bank: out.bank,
          warning: out.warning, conversionId: out.conversionId,
          completedAt: Date.now(),
          file: undefined, // success: drop the source-file reference
        })
        track('conversion_complete', { format, surface: 'dashboard', pages: out.pages, txCount: out.txCount, bank: out.bank })
        onCompleteRef.current?.()
      } catch (e: any) {
        signal.cancelled = true
        const isNetwork = !(e instanceof ConvertError)
        track('conversion_failed', { format, surface: 'dashboard', reason: isNetwork ? 'network_error' : (e.canTopup ? 'usage_limit' : 'extraction_error') })
        updateJob(id, {
          status: 'error',
          error: isNetwork ? (e?.message || 'Network error') : e.message,
          errorCanTopup: e instanceof ConvertError && e.canTopup,
          progress: 0,
          completedAt: Date.now(),
        })
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

  // Opt-in: share a failed statement so we can add support for its format.
  // Only sent when the user clicks; uses the source File retained on the job.
  const reportSample = useCallback(async (jobId: string) => {
    const j = jobs.find(x => x.id === jobId)
    if (!j?.file || j.reportState === 'sending' || j.reportState === 'sent') return
    updateJob(jobId, { reportState: 'sending' })
    track('sample_report_started', { format: j.format, surface: 'bulk' })
    try {
      const fd = new FormData()
      fd.append('pdf', j.file)
      if (j.bank) fd.append('bank', j.bank)
      const res = await fetch('/api/report-statement', { method: 'POST', body: fd })
      if (!res.ok) throw new Error('report failed')
      updateJob(jobId, { reportState: 'sent' })
      track('sample_report_sent', { format: j.format, surface: 'bulk' })
    } catch {
      updateJob(jobId, { reportState: 'idle' })
    }
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
    <ConversionsContext.Provider value={{ jobs, active, recent, startJob, download, dismiss, retry, clearAll, reportSample }}>
      {children}
    </ConversionsContext.Provider>
  )
}

export function useConversions() {
  const ctx = useContext(ConversionsContext)
  if (!ctx) throw new Error('useConversions must be used inside ConversionsProvider')
  return ctx
}

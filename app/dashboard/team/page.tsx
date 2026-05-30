'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import TopBar from '@/components/dashboard/TopBar'

interface Member {
  id: string
  member_email: string
  member_id: string | null
  status: 'invited' | 'active' | 'removed'
  invited_at: string
  accepted_at: string | null
}

export default function TeamPage() {
  const { isFirm } = useDashboard()
  const [members, setMembers] = useState<Member[]>([])
  const [max, setMax] = useState(5)
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [inviting, setInviting] = useState(false)
  const [error, setError] = useState('')
  const [msg, setMsg] = useState('')

  const load = async () => {
    setLoading(true)
    const res = await fetch('/api/team', { cache: 'no-store' })
    if (res.ok) {
      const data = await res.json()
      setMembers(data.members || [])
      setMax(data.max || 5)
    }
    setLoading(false)
  }

  useEffect(() => { if (isFirm) load() }, [isFirm])

  const invite = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setMsg(''); setInviting(true)
    const res = await fetch('/api/team', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email }) })
    const data = await res.json()
    setInviting(false)
    if (!res.ok) { setError(data.error || 'Could not invite.'); return }
    setEmail('')
    setMsg(data.member.status === 'active'
      ? `${data.member.member_email} added (already a BankXL user).`
      : `Invitation queued. ${data.member.member_email} will be added when they sign up.`)
    setTimeout(() => setMsg(''), 5000)
    load()
  }

  const remove = async (id: string, email: string) => {
    if (!confirm(`Remove ${email} from your team?`)) return
    const res = await fetch(`/api/team?id=${id}`, { method: 'DELETE' })
    if (res.ok) load()
  }

  if (!isFirm) {
    return (
      <>
        <TopBar title="Team" subtitle="Firm feature" />
        <div style={{ padding: 28, maxWidth: 720 }}>
          <div style={{ padding: 56, textAlign: 'center', background: 'linear-gradient(135deg, var(--accent-bg), var(--accent-bg))', border: '1px solid var(--accent-border)', borderRadius: 18 }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>👥</div>
            <h2 style={{ fontSize: 26, fontWeight: 600, marginBottom: 10, letterSpacing: '-0.02em' }}>Team is a Firm feature</h2>
            <p style={{ fontSize: 14, color: 'var(--text-dim)', marginBottom: 28, maxWidth: 480, margin: '0 auto 28px', lineHeight: 1.7 }}>
              Invite up to 5 team members to share your Firm subscription. Articles, junior accountants, partners — everyone uses your unlimited plan under one bill.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link href="/pricing" style={{ padding: '12px 28px', background: 'var(--accent)', color: 'var(--on-accent)', borderRadius: 10, fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
                Upgrade to Firm — ₹1,499/mo
              </Link>
            </div>
          </div>
        </div>
      </>
    )
  }

  const activeCount = members.filter(m => m.status !== 'removed').length

  return (
    <>
      <TopBar title="Team" subtitle={`${activeCount} of ${max} seats used`} />
      <div style={{ padding: 28, maxWidth: 880 }}>

        {/* Info */}
        <div style={{ padding: 18, background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 12, marginBottom: 22, display: 'flex', gap: 14, alignItems: 'flex-start' }}>
          <span style={{ fontSize: 22 }}>💡</span>
          <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.7 }}>
            <strong style={{ color: 'var(--text)' }}>How it works:</strong> invited team members will sign up themselves with their own email/password. Once they create their account, they automatically get access to your Firm-tier features (unlimited conversions, all formats, API). Their conversions count against your shared Firm plan, not theirs.
          </div>
        </div>

        {/* Invite form */}
        <div style={{ background: 'var(--zebra)', border: '1px solid var(--border)', borderRadius: 12, padding: 22, marginBottom: 22 }}>
          <h2 style={{ fontSize: 16, fontWeight: 600, marginBottom: 14 }}>Invite a member</h2>
          <form onSubmit={invite} style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <input value={email} onChange={e => setEmail(e.target.value)} type="email" required placeholder="member@yourfirm.com"
              disabled={activeCount >= max}
              style={{ flex: 1, minWidth: 240, padding: '11px 14px', background: 'var(--zebra)', border: '1px solid var(--border-strong)', borderRadius: 9, color: 'var(--text)', fontFamily: 'Sora,sans-serif', fontSize: 14, outline: 'none' }} />
            <button type="submit" disabled={inviting || activeCount >= max}
              style={{ padding: '11px 24px', background: activeCount >= max ? 'var(--hover)' : 'var(--accent)', color: activeCount >= max ? 'var(--text-faint)' : 'var(--on-accent)', border: 'none', borderRadius: 9, fontFamily: 'Sora,sans-serif', fontSize: 13, fontWeight: 600, cursor: inviting || activeCount >= max ? 'not-allowed' : 'pointer' }}>
              {inviting ? 'Sending...' : activeCount >= max ? 'Team full' : 'Send invite'}
            </button>
          </form>
          {error && <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--error-bg)', border: '1px solid var(--error-border)', borderRadius: 8, fontSize: 13, color: 'var(--error)' }}>{error}</div>}
          {msg && <div style={{ marginTop: 12, padding: '10px 14px', background: 'var(--accent-bg)', border: '1px solid var(--accent-border)', borderRadius: 8, fontSize: 13, color: 'var(--accent)' }}>{msg}</div>}
        </div>

        {/* Members list */}
        <div style={{ background: 'var(--zebra)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ padding: '14px 22px', borderBottom: '1px solid var(--hover)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: 14, fontWeight: 600 }}>Members</span>
            <span className="mono" style={{ fontSize: 11, color: 'var(--text-muted)' }}>{activeCount} / {max}</span>
          </div>
          {loading ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: 13 }}>Loading...</div>
          ) : members.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center' }}>
              <div style={{ fontSize: 36, marginBottom: 8, opacity: 0.4 }}>👥</div>
              <p style={{ fontSize: 13, color: 'var(--text-dim)' }}>No team members yet. Invite your first one above.</p>
            </div>
          ) : (
            <div>
              {members.map(m => (
                <div key={m.id} style={{ padding: '16px 22px', borderTop: '1px solid var(--hover)', display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: m.status === 'active' ? 'linear-gradient(135deg, var(--accent), var(--accent-strong))' : 'var(--border)',
                    color: m.status === 'active' ? 'var(--on-accent)' : 'var(--text-muted)',
                    fontWeight: 600, fontSize: 14,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    {m.member_email[0]?.toUpperCase()}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{m.member_email}</div>
                    <div className="mono" style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 2 }}>
                      {m.status === 'active'
                        ? `Active since ${new Date(m.accepted_at!).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
                        : `Invited ${new Date(m.invited_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })} · waiting for sign-up`}
                    </div>
                  </div>
                  <span style={{
                    fontSize: 9, padding: '3px 9px', borderRadius: 20, fontFamily: 'DM Mono, monospace', letterSpacing: 0.5,
                    background: m.status === 'active' ? 'var(--accent-bg-strong)' : 'var(--warning-bg)',
                    color: m.status === 'active' ? 'var(--accent)' : 'var(--warning)',
                    border: `1px solid ${m.status === 'active' ? 'var(--accent-border)' : 'var(--warning-border)'}`,
                  }}>
                    {m.status === 'active' ? 'ACTIVE' : 'PENDING'}
                  </span>
                  <button onClick={() => remove(m.id, m.member_email)} aria-label="Remove"
                    style={{ width: 30, height: 30, borderRadius: 6, background: 'var(--error-bg)', color: 'var(--error)', border: '1px solid var(--error-border)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ marginTop: 18, fontSize: 12, color: 'var(--text-muted)', textAlign: 'center' }}>
          Need more than {max} seats? Email <a href="mailto:sales@bankxlai.com" style={{ color: 'var(--accent)', textDecoration: 'none' }}>sales@bankxlai.com</a>
        </div>
      </div>
    </>
  )
}

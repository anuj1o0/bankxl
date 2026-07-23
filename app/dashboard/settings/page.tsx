'use client'
import { useState, useEffect } from 'react'
import { useDashboard } from '@/components/dashboard/DashboardContext'
import TopBar from '@/components/dashboard/TopBar'

const FORMATS = [
  { key: 'excel', label: 'Excel (.xlsx)' },
  { key: 'csv', label: 'CSV' },
  { key: 'json', label: 'JSON' },
  { key: 'tally', label: 'Tally XML' },
]

function Section({ title, desc, children, badge }: { title: string; desc?: string; children: any; badge?: string }) {
  return (
    <div style={{ background: 'var(--zebra)', border: '1px solid var(--border)', borderRadius: 12, padding: 24, marginBottom: 16 }}>
      <div style={{ marginBottom: 16, display: 'flex', alignItems: 'baseline', gap: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h2>
        {badge && (
          <span style={{ fontSize: 9, padding: '2px 7px', borderRadius: 20, background: 'var(--accent-bg-strong)', color: 'var(--accent)', border: '1px solid var(--accent-border)', fontFamily: 'DM Mono, monospace', letterSpacing: 0.5 }}>{badge}</span>
        )}
      </div>
      {desc && <div style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 18, marginTop: -8, lineHeight: 1.6 }}>{desc}</div>}
      {children}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', background: 'var(--zebra)',
  border: '1px solid var(--border-strong)', borderRadius: 9,
  color: 'var(--text)', fontFamily: 'Sora,sans-serif', fontSize: 14, outline: 'none',
}

const labelStyle: React.CSSProperties = { fontSize: 12, color: 'var(--text-dim)', display: 'block', marginBottom: 6 }

export default function SettingsPage() {
  const { profile, isFirm, refresh } = useDashboard()
  const [fullName, setFullName] = useState('')
  const [brandName, setBrandName] = useState('')
  const [defaultFormat, setDefaultFormat] = useState('excel')
  const [emailNotifications, setEmailNotifications] = useState(true)
  const [saving, setSaving] = useState('')
  const [savedMsg, setSavedMsg] = useState('')

  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '')
      setBrandName(profile.brand_name || '')
      setDefaultFormat(profile.default_format || 'excel')
      setEmailNotifications(profile.email_notifications ?? true)
    }
  }, [profile])

  const save = async (key: string, body: any) => {
    setSaving(key); setSavedMsg('')
    const res = await fetch('/api/profile', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const data = await res.json()
    setSaving('')
    if (!res.ok) { setSavedMsg(`Error: ${data.error || 'Could not save'}`); setTimeout(() => setSavedMsg(''), 3500); return }
    setSavedMsg('✓ Saved')
    setTimeout(() => setSavedMsg(''), 1800)
    refresh()
  }

  return (
    <>
      <TopBar title="Settings" subtitle="Personal preferences and account configuration" />
      <div style={{ padding: 28, maxWidth: 720 }}>
        {savedMsg && (
          <div style={{ position: 'fixed', top: 80, right: 28, padding: '10px 16px', background: 'var(--accent-bg-strong)', color: 'var(--accent)', border: '1px solid var(--accent-glow)', borderRadius: 9, fontSize: 13, zIndex: 100 }}>
            {savedMsg}
          </div>
        )}

        <Section title="Profile" desc="How you appear inside BankXL.">
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Full name</label>
            <input value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your name" style={inputStyle} />
          </div>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Email (read-only)</label>
            <input value={profile?.email || ''} disabled style={{ ...inputStyle, opacity: 0.6, cursor: 'not-allowed' }} />
          </div>
          <button onClick={() => save('profile', { full_name: fullName })} disabled={saving === 'profile'}
            style={{ padding: '10px 18px', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', fontFamily: 'Sora,sans-serif' }}>
            {saving === 'profile' ? 'Saving...' : 'Save profile'}
          </button>
        </Section>

        <Section title="Conversion preferences" desc="Defaults applied to new conversions.">
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Default output format</label>
            <select value={defaultFormat} onChange={e => setDefaultFormat(e.target.value)} style={{ ...inputStyle, cursor: 'pointer' }}>
              {FORMATS.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
            </select>
          </div>
          <button onClick={() => save('format', { default_format: defaultFormat })} disabled={saving === 'format'}
            style={{ padding: '10px 18px', background: 'var(--accent)', color: 'var(--on-accent)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: saving ? 'wait' : 'pointer', fontFamily: 'Sora,sans-serif' }}>
            {saving === 'format' ? 'Saving...' : 'Save preferences'}
          </button>
        </Section>

        <Section title="White-label" desc="Replace 'BankXL' on your generated Excel files with your firm's name. Visible inside the file's metadata and Summary sheet." badge={isFirm ? undefined : 'FIRM'}>
          <div style={{ marginBottom: 14 }}>
            <label style={labelStyle}>Firm / Brand name</label>
            <input value={brandName} onChange={e => setBrandName(e.target.value)} disabled={!isFirm}
              placeholder={isFirm ? 'e.g. Sharma & Associates' : 'Upgrade to Firm to enable'}
              style={{ ...inputStyle, opacity: isFirm ? 1 : 0.5, cursor: isFirm ? 'text' : 'not-allowed' }} />
          </div>
          <button onClick={() => save('brand', { brand_name: brandName })} disabled={!isFirm || saving === 'brand'}
            style={{ padding: '10px 18px', background: isFirm ? 'var(--accent)' : 'var(--hover)', color: isFirm ? 'var(--on-accent)' : 'var(--text-faint)', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: !isFirm || saving ? 'not-allowed' : 'pointer', fontFamily: 'Sora,sans-serif' }}>
            {saving === 'brand' ? 'Saving...' : 'Save brand name'}
          </button>
        </Section>

        <Section title="Notifications" desc="Email updates from BankXL.">
          <label style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer' }}>
            <input type="checkbox" checked={emailNotifications} onChange={e => { setEmailNotifications(e.target.checked); save('notif', { email_notifications: e.target.checked }) }}
              style={{ width: 16, height: 16, accentColor: 'var(--accent)' }} />
            <span style={{ fontSize: 13 }}>Send me product updates and tips (max 1 email/month)</span>
          </label>
        </Section>

        <Section title="Danger zone">
          <p style={{ fontSize: 13, color: 'var(--text-dim)', marginBottom: 14, lineHeight: 1.7 }}>
            To delete your account and all associated data, email <a href="mailto:support@banlxlai.com" style={{ color: 'var(--accent)' }}>support@banlxlai.com</a>. We'll process within 7 days.
          </p>
        </Section>
      </div>
    </>
  )
}

import LegalPage from '@/components/LegalPage'

export const metadata = {
  title: 'Refund Policy — BankXL',
  description: 'BankXL refund and cancellation policy.',
}

export default function Refund() {
  return (
    <LegalPage title="Refund & Cancellation Policy" updated="May 2026">
      <p>We want BankXL to genuinely work for you. If it doesn't, you should get your money back. Here's how:</p>

      <h2>Pro & Firm subscriptions</h2>
      <ul>
        <li><strong>7-day refund window</strong> from the date of your first charge if the Service doesn't work for your use case.</li>
        <li>Email <a href="mailto:support@bankxlai.com">support@bankxlai.com</a> with the reason — we usually refund within 24 hours.</li>
        <li>After the 7-day window, you can cancel anytime from your dashboard. You keep access until the end of the current billing period; no further charges will be made.</li>
        <li>For annual plans, prorated refunds are available within the first 30 days.</li>
      </ul>

      <h2>Day Pass</h2>
      <p>Day Pass is a one-time ₹49 purchase. Refunds are available only if the Service was completely non-functional during your 24-hour window. Email us with the issue.</p>

      <h2>How to cancel</h2>
      <ol>
        <li>Sign in to your <a href="/dashboard">dashboard</a></li>
        <li>Click "Manage subscription" → opens Stripe billing portal</li>
        <li>Click "Cancel plan"</li>
      </ol>
      <p>Your Pro/Firm features remain active until the end of the current billing period.</p>

      <h2>How to delete your account</h2>
      <p>Email <a href="mailto:privacy@bankxlai.com">privacy@bankxlai.com</a>. We will delete your account and all associated data within 7 days.</p>

      <h2>Refund timing</h2>
      <p>Once approved, refunds are issued by Stripe and typically arrive in 5–10 business days, depending on your card issuer.</p>

      <h2>Questions?</h2>
      <p>Reach us at <a href="mailto:support@bankxlai.com">support@bankxlai.com</a> — we read every email.</p>
    </LegalPage>
  )
}

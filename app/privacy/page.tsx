import LegalPage from '@/components/LegalPage'

export const metadata = {
  title: 'Privacy Policy',
  description: 'How BankXL handles your data, files, and personal information.',
}

export default function Privacy() {
  return (
    <LegalPage title="Privacy Policy" updated="May 2026">
      <p>
        BankXL ("we", "us", "our") respects your privacy. This policy explains what we collect, why we collect it, and how we handle your data when you use our service.
      </p>

      <h2>1. What we collect</h2>
      <h3>Account information</h3>
      <ul>
        <li>Email address (required to sign in)</li>
        <li>Full name (optional, used for invoices)</li>
        <li>If you sign in with Google: your Google account email and basic profile info</li>
      </ul>
      <h3>Billing information</h3>
      <p>
        Stripe handles all payments. We never see or store your credit card or bank details. We store your Stripe customer ID and subscription status only.
      </p>
      <h3>Conversion metadata</h3>
      <p>For each conversion we store:</p>
      <ul>
        <li>Filename of the uploaded PDF</li>
        <li>File size in bytes</li>
        <li>Number of pages and transactions extracted</li>
        <li>Bank name (auto-detected, optional)</li>
        <li>Processing duration and status</li>
      </ul>

      <h2>2. What we do NOT store</h2>
      <p><strong>We do not store the PDF files you upload.</strong> Files are processed entirely in server memory and discarded the moment the conversion completes (success or failure). Nothing is written to disk — ever.</p>
      <p><strong>We do not store the extracted transactions.</strong> Transactions are returned to you in the output file (Excel/CSV/JSON/Tally) and never saved on our servers.</p>
      <p><strong>Your financial data never leaves our servers.</strong> All parsing is done by our deterministic engine running on our own infrastructure. Your bank statements are never sent to any third-party service for processing — no external APIs, no cloud AI, no data sharing of any kind.</p>
      <p><strong>We cannot read your statements.</strong> There is no admin panel, no logging, and no mechanism for any person at BankXL to access or view the contents of your uploaded files.</p>

      <h2>3. Third-party services</h2>
      <p>Your financial data (PDF contents, transactions) is <strong>never shared</strong> with any third party. The only external services we use are:</p>
      <ul>
        <li><strong>Supabase</strong> — authentication and account database only (hosted in EU/US). Does not receive your PDF or transaction data.</li>
        <li><strong>Razorpay</strong> — payment processing (PCI-DSS compliant). Does not receive your PDF or transaction data.</li>
        <li><strong>Vercel</strong> — hosting infrastructure. Processes your request but does not persist file contents beyond the request lifecycle.</li>
      </ul>

      <h2>4. Cookies</h2>
      <p>We use only essential cookies for authentication (Supabase session tokens). No tracking, analytics, or advertising cookies.</p>

      <h2>5. Your rights</h2>
      <ul>
        <li><strong>Access</strong> — request a copy of all data we have about you</li>
        <li><strong>Deletion</strong> — request permanent deletion of your account and all associated data</li>
        <li><strong>Correction</strong> — update incorrect personal information from your dashboard</li>
        <li><strong>Export</strong> — download your conversion history as JSON</li>
      </ul>
      <p>Email <a href="mailto:privacy@banlxlai.com">privacy@banlxlai.com</a> for any of these requests. We respond within 7 days.</p>

      <h2>6. Children</h2>
      <p>BankXL is not intended for use by individuals under 18.</p>

      <h2>7. Changes to this policy</h2>
      <p>We will notify users by email of any material changes at least 14 days before they take effect.</p>

      <h2>8. Contact</h2>
      <p>Questions? Email <a href="mailto:privacy@banlxlai.com">privacy@banlxlai.com</a> or write to us at our registered address (provided on request).</p>
    </LegalPage>
  )
}

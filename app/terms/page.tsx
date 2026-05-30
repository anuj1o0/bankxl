import LegalPage from '@/components/LegalPage'

export const metadata = {
  title: 'Terms of Service — BankXL',
  description: 'Terms of Service governing your use of BankXL.',
}

export default function Terms() {
  return (
    <LegalPage title="Terms of Service" updated="May 2026">
      <p>By using BankXL ("Service"), you agree to these Terms. If you don't agree, don't use the Service.</p>

      <h2>1. Eligibility</h2>
      <p>You must be at least 18 years old and have legal authority to enter into this agreement.</p>

      <h2>2. Account</h2>
      <p>You are responsible for keeping your login credentials secure. Notify us immediately at <a href="mailto:support@bankxlai.com">support@bankxlai.com</a> if you suspect unauthorized access.</p>

      <h2>3. Acceptable use</h2>
      <p>You agree to use BankXL only with documents you legally own or have permission to convert. Specifically, you agree NOT to:</p>
      <ul>
        <li>Upload statements that don't belong to you (or your authorized clients)</li>
        <li>Reverse engineer or attempt to circumvent any limit/feature</li>
        <li>Resell, white-label, or sublicense BankXL without a Firm plan</li>
        <li>Abuse the Service (DDoS, automated scraping beyond plan limits, etc.)</li>
      </ul>

      <h2>4. Subscription & billing</h2>
      <ul>
        <li>Plans are billed monthly or annually in advance via Stripe.</li>
        <li>The Day Pass is a one-time payment with no auto-renewal.</li>
        <li>You can upgrade, downgrade, or cancel anytime from your dashboard. Cancellation takes effect at the end of the current billing period.</li>
        <li>Prices are in INR and include applicable GST.</li>
      </ul>

      <h2>5. Refunds</h2>
      <p>See our <a href="/refund">Refund Policy</a>. In short: 7-day refund window if the Service genuinely doesn't work for your use case.</p>

      <h2>6. Service availability</h2>
      <p>We aim for 99.5% uptime but do not guarantee uninterrupted service. Scheduled maintenance is announced via email. We are not liable for losses arising from downtime.</p>

      <h2>7. Accuracy</h2>
      <p>BankXL uses AI to extract data. While we strive for high accuracy (typically 99%+), we do not guarantee 100% accuracy. <strong>You are responsible for reviewing the converted output before using it for accounting, tax, or legal purposes.</strong></p>

      <h2>8. Intellectual property</h2>
      <p>You retain full ownership of your statements and converted output. We retain ownership of the BankXL platform, code, and brand.</p>

      <h2>9. Limitation of liability</h2>
      <p>To the maximum extent permitted by Indian law, BankXL's total liability shall not exceed the amount you paid in the previous 12 months. We are not liable for indirect, consequential, or special damages.</p>

      <h2>10. Termination</h2>
      <p>We reserve the right to suspend or terminate accounts that violate these Terms. You may delete your account anytime from the dashboard.</p>

      <h2>11. Governing law</h2>
      <p>These Terms are governed by the laws of India. Disputes shall be resolved in the courts of [your registered city], India.</p>

      <h2>12. Changes</h2>
      <p>We may update these Terms occasionally. Material changes will be communicated via email at least 14 days before they take effect.</p>

      <h2>13. Contact</h2>
      <p>Questions? <a href="mailto:support@bankxlai.com">support@bankxlai.com</a></p>
    </LegalPage>
  )
}

export interface BankPageData {
  slug: string
  name: string
  shortName: string
  tagline: string
  metaDescription: string
  keywords: string[]
  color: string
  statementFeatures: string[]
  faqs: { q: string; a: string }[]
  steps: string[]
  formats: string[]
}

export const BANK_PAGES: Record<string, BankPageData> = {
  sbi: {
    slug: 'sbi',
    name: 'State Bank of India',
    shortName: 'SBI',
    tagline: 'Convert SBI bank statement PDF to Excel instantly',
    metaDescription: 'Convert your SBI (State Bank of India) bank statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with SBI e-statements, passbook PDFs, and password-protected files. Free to try.',
    keywords: ['sbi bank statement to excel', 'sbi statement pdf to excel', 'convert sbi statement', 'sbi e-statement to excel', 'sbi bank statement converter', 'state bank of india statement excel', 'sbi passbook to excel'],
    color: '#1a237e',
    statementFeatures: ['SBI e-Statements (internet banking)', 'SBI YONO app statements', 'SBI passbook PDFs', 'Password-protected SBI PDFs (after unlock)', 'Multi-page SBI statements (up to 500+ pages)', 'SBI salary account statements', 'SBI current account statements'],
    steps: ['Download your SBI statement from YONO or internet banking', 'Upload the PDF to BankXL', 'Get clean Excel with all transactions in 15 seconds'],
    formats: ['Excel (.xlsx) with color-coded debits/credits', 'CSV for import into any software', 'JSON for developers', 'Tally XML for direct Tally import'],
    faqs: [
      { q: 'Does BankXL work with password-protected SBI PDFs?', a: 'Yes, but you need to remove the password first using Adobe Acrobat or any free PDF unlocker. Once unlocked, BankXL handles the rest perfectly.' },
      { q: 'Which SBI statement formats does BankXL support?', a: 'All of them — SBI e-statements from internet banking, YONO app statements, branch-generated passbook PDFs, and mini-statement PDFs. Both current and savings accounts.' },
      { q: 'How accurate is the SBI statement conversion?', a: 'For digitally generated SBI PDFs, accuracy is 99.5%+. For scanned SBI passbook PDFs, it\'s 95%+ depending on scan quality. Always verify before final use.' },
      { q: 'Can I convert SBI statements for Tally import?', a: 'Yes. BankXL exports SBI transactions as Tally XML, which you can import directly into Tally Prime or Tally ERP 9 without any manual entry.' },
      { q: 'What if my SBI statement has 12 months of transactions?', a: 'No problem. BankXL handles statements of any length — even 500+ pages with thousands of transactions. The Pro plan (₹499/mo) gives you 800 pages per month.' },
    ],
  },

  hdfc: {
    slug: 'hdfc',
    name: 'HDFC Bank',
    shortName: 'HDFC',
    tagline: 'Convert HDFC Bank statement PDF to Excel instantly',
    metaDescription: 'Convert your HDFC Bank statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with HDFC NetBanking statements, HDFC mobile app statements and password-protected PDFs. Free to try.',
    keywords: ['hdfc bank statement to excel', 'hdfc statement pdf to excel', 'convert hdfc bank statement', 'hdfc netbanking statement excel', 'hdfc bank statement converter', 'hdfc statement to tally'],
    color: '#004c97',
    statementFeatures: ['HDFC NetBanking e-statements', 'HDFC MobileBanking app statements', 'HDFC salary account statements', 'HDFC current account statements', 'HDFC NRI account statements', 'Password-protected HDFC PDFs (after unlock)', 'Multi-year HDFC statements'],
    steps: ['Log into HDFC NetBanking or mobile app and download your statement', 'Upload the PDF to BankXL', 'Download your Excel with all transactions in 15 seconds'],
    formats: ['Excel (.xlsx) with color-coded debits/credits', 'CSV for import into any software', 'JSON for developers', 'Tally XML for direct Tally import'],
    faqs: [
      { q: 'Does BankXL support HDFC password-protected statements?', a: 'Yes — HDFC statements are often password-protected with your date of birth. Remove the password using any free PDF tool first, then upload to BankXL.' },
      { q: 'Can I convert HDFC NRI account statements?', a: 'Yes. BankXL works with all HDFC account types including NRE, NRO, and FCNR accounts.' },
      { q: 'How do I get my HDFC statement for conversion?', a: 'Log into HDFC NetBanking → Accounts → Select account → e-Statement → Download PDF. Or use the HDFC Mobile Banking app → Statements section.' },
      { q: 'Does it work with older HDFC statement formats?', a: 'Yes. BankXL handles all HDFC statement formats from 2015 onwards. If an older format doesn\'t work, email us and we\'ll fix it in 48 hours.' },
      { q: 'Can I import HDFC transactions directly into Tally?', a: 'Absolutely. Select the Tally XML format when downloading and import directly into Tally Prime or ERP 9 using the standard bank import feature.' },
    ],
  },

  icici: {
    slug: 'icici',
    name: 'ICICI Bank',
    shortName: 'ICICI',
    tagline: 'Convert ICICI Bank statement PDF to Excel instantly',
    metaDescription: 'Convert your ICICI Bank statement PDF to Excel, CSV or Tally XML in 15 seconds. Supports ICICI iMobile, netbanking statements and password-protected PDFs. Free to try.',
    keywords: ['icici bank statement to excel', 'icici statement pdf to excel', 'icici bank statement converter', 'icici imobile statement excel', 'icici netbanking statement download excel', 'icici statement to tally'],
    color: '#f77f00',
    statementFeatures: ['ICICI iMobile app statements', 'ICICI Internet Banking e-statements', 'ICICI salary account statements', 'ICICI Pockets statements', 'ICICI NRI account statements', 'Password-protected ICICI PDFs', 'ICICI credit card statements'],
    steps: ['Download your ICICI statement from iMobile or Internet Banking', 'Upload the PDF to BankXL', 'Download your formatted Excel in 15 seconds'],
    formats: ['Excel (.xlsx) with color-coded debits/credits', 'CSV for import into any software', 'JSON for developers', 'Tally XML for direct Tally import'],
    faqs: [
      { q: 'How do I download my ICICI Bank statement?', a: 'Log into ICICI Internet Banking → My Accounts → View Statement → Download PDF. Or use iMobile → Account Statement → Choose date range → Download.' },
      { q: 'Does BankXL work with ICICI password-protected PDFs?', a: 'Yes — ICICI often protects statements with your date of birth (DDMMYYYY format). Remove the password first, then upload to BankXL for instant conversion.' },
      { q: 'Can I convert ICICI credit card statements to Excel?', a: 'Yes. BankXL extracts all transactions from ICICI credit card statements too, including transaction descriptions, dates, amounts, and balances.' },
      { q: 'Does BankXL handle ICICI NRI account statements?', a: 'Yes. All ICICI account types are supported — savings, current, NRE, NRO, and FCNR accounts.' },
      { q: 'Can I batch convert multiple ICICI statements at once?', a: 'Yes — the Firm plan includes bulk ZIP upload, so you can upload 50 statements at once and download all converted files in one ZIP.' },
    ],
  },

  axis: {
    slug: 'axis',
    name: 'Axis Bank',
    shortName: 'Axis',
    tagline: 'Convert Axis Bank statement PDF to Excel instantly',
    metaDescription: 'Convert your Axis Bank statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with Axis Bank NetBanking, mobile app statements and password-protected PDFs. Free to try.',
    keywords: ['axis bank statement to excel', 'axis bank statement pdf to excel', 'axis bank statement converter', 'convert axis bank statement', 'axis bank netbanking statement excel', 'axis statement to tally'],
    color: '#800000',
    statementFeatures: ['Axis Bank NetBanking e-statements', 'Axis Bank mobile app statements', 'Axis Bank salary account statements', 'Axis Bank current account statements', 'Password-protected Axis PDFs', 'Multi-page Axis statements'],
    steps: ['Log into Axis Bank NetBanking or mobile app and download your statement', 'Upload the PDF to BankXL', 'Get your Excel with all transactions in 15 seconds'],
    formats: ['Excel (.xlsx) with color-coded debits/credits', 'CSV for import into any software', 'JSON for developers', 'Tally XML for direct Tally import'],
    faqs: [
      { q: 'How do I download my Axis Bank statement?', a: 'Log into Axis Bank Internet Banking → Accounts → Select account → Account Statement → Download as PDF. Or use the Axis Mobile app → Statements section.' },
      { q: 'Does BankXL support Axis Bank password-protected statements?', a: 'Yes — after removing the password. Axis Bank often uses your date of birth or account number as the password. Use any free PDF tool to unlock first.' },
      { q: 'Can I convert Axis Bank statements for Tally?', a: 'Yes. BankXL exports Axis Bank transactions as Tally XML for direct import into Tally Prime or ERP 9.' },
      { q: 'Does BankXL work with Axis Bank current account statements?', a: 'Absolutely. Both savings and current account statements from Axis Bank are fully supported.' },
      { q: 'What if my Axis statement has handwritten entries?', a: 'BankXL\'s AI uses OCR to read scanned and handwritten entries, though accuracy may vary. For best results, use digital e-statements from internet banking.' },
    ],
  },

  kotak: {
    slug: 'kotak',
    name: 'Kotak Mahindra Bank',
    shortName: 'Kotak',
    tagline: 'Convert Kotak Mahindra Bank statement PDF to Excel instantly',
    metaDescription: 'Convert your Kotak Mahindra Bank statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with Kotak 811, NetBanking, mobile app statements and password-protected PDFs. Free to try.',
    keywords: ['kotak bank statement to excel', 'kotak mahindra statement pdf to excel', 'kotak 811 statement converter', 'kotak netbanking statement excel', 'kotak bank statement converter', 'kotak statement to tally'],
    color: '#ee3124',
    statementFeatures: ['Kotak NetBanking e-statements', 'Kotak 811 digital bank statements', 'Kotak Mobile Banking app statements', 'Kotak salary account statements', 'Kotak current account statements', 'Password-protected Kotak PDFs'],
    steps: ['Download your Kotak statement from NetBanking or the Kotak app', 'Upload the PDF to BankXL', 'Get clean Excel with all transactions in 15 seconds'],
    formats: ['Excel (.xlsx) with color-coded debits/credits', 'CSV for import into any software', 'JSON for developers', 'Tally XML for direct Tally import'],
    faqs: [
      { q: 'How do I download my Kotak Bank statement?', a: 'Log into Kotak NetBanking → My Accounts → Select account → Account Statement → Download PDF. Or in the Kotak app → Accounts → Statement → Download.' },
      { q: 'Does BankXL support Kotak 811 statements?', a: 'Yes. Kotak 811 is a fully digital bank — its statements are clean PDFs that BankXL converts with 99%+ accuracy.' },
      { q: 'Can I convert Kotak Bank statements for Tally import?', a: 'Yes. Export your converted statement as Tally XML and import directly into Tally Prime or ERP 9.' },
      { q: 'Does BankXL handle Kotak password-protected PDFs?', a: 'Yes — after removing the password. Kotak often uses your date of birth (DD/MM/YYYY) or a custom password. Unlock first, then convert.' },
      { q: 'Can BankXL handle Kotak statements with foreign currency transactions?', a: 'Yes. BankXL extracts all transaction data including foreign currency amounts and exchange rates as they appear in the statement.' },
    ],
  },

  pnb: {
    slug: 'pnb',
    name: 'Punjab National Bank',
    shortName: 'PNB',
    tagline: 'Convert PNB bank statement PDF to Excel instantly',
    metaDescription: 'Convert your Punjab National Bank (PNB) statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with PNB ONE app, internet banking statements. Free to try.',
    keywords: ['pnb bank statement to excel', 'punjab national bank statement pdf excel', 'pnb statement converter', 'pnb one statement excel', 'convert pnb bank statement'],
    color: '#ff6600',
    statementFeatures: ['PNB ONE app statements', 'PNB Internet Banking e-statements', 'PNB savings account statements', 'PNB current account statements', 'PNB Jan Dhan account statements'],
    steps: ['Download your PNB statement from PNB ONE app or internet banking', 'Upload the PDF to BankXL', 'Get your Excel with all transactions in 15 seconds'],
    formats: ['Excel (.xlsx)', 'CSV', 'JSON', 'Tally XML'],
    faqs: [
      { q: 'How do I download my PNB statement?', a: 'Log into PNB ONE app or internet banking → Accounts → Account Statement → Select date range → Download PDF.' },
      { q: 'Does BankXL work with old PNB statement formats?', a: 'Yes. BankXL handles PNB statements from 2010 onwards in both old and new formats.' },
      { q: 'Can I convert PNB statements to Tally XML?', a: 'Yes. Select Tally XML format at download and import directly into Tally Prime or ERP 9.' },
    ],
  },

  canara: {
    slug: 'canara',
    name: 'Canara Bank',
    shortName: 'Canara',
    tagline: 'Convert Canara Bank statement PDF to Excel instantly',
    metaDescription: 'Convert your Canara Bank statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with Canara ai1 app and internet banking statements. Free to try.',
    keywords: ['canara bank statement to excel', 'canara bank pdf to excel', 'canara statement converter', 'canara ai1 statement excel', 'convert canara bank statement'],
    color: '#007a33',
    statementFeatures: ['Canara ai1 app statements', 'Canara Internet Banking statements', 'Canara savings and current account statements', 'Multi-page Canara statements'],
    steps: ['Download your Canara statement from the app or internet banking', 'Upload the PDF to BankXL', 'Get your Excel with all transactions in 15 seconds'],
    formats: ['Excel (.xlsx)', 'CSV', 'JSON', 'Tally XML'],
    faqs: [
      { q: 'How do I get my Canara Bank statement?', a: 'Use the Canara ai1 app (Accounts → Statements → Download) or Canara Internet Banking → Account Statement → Download PDF.' },
      { q: 'Does BankXL convert Canara Bank statements accurately?', a: 'Yes. Canara Bank statements have a consistent format that BankXL reads with 99%+ accuracy.' },
    ],
  },

  'bank-of-baroda': {
    slug: 'bank-of-baroda',
    name: 'Bank of Baroda',
    shortName: 'BoB',
    tagline: 'Convert Bank of Baroda statement PDF to Excel instantly',
    metaDescription: 'Convert your Bank of Baroda (BoB) statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with Bob World app and internet banking. Free to try.',
    keywords: ['bank of baroda statement to excel', 'bob bank statement pdf excel', 'bank of baroda statement converter', 'bob world statement excel', 'convert bank of baroda statement'],
    color: '#f26522',
    statementFeatures: ['Bob World app statements', 'Bank of Baroda internet banking statements', 'BoB savings and current account statements', 'BoB NRI account statements'],
    steps: ['Download your BoB statement from Bob World app or internet banking', 'Upload the PDF to BankXL', 'Download your Excel in 15 seconds'],
    formats: ['Excel (.xlsx)', 'CSV', 'JSON', 'Tally XML'],
    faqs: [
      { q: 'How do I download my Bank of Baroda statement?', a: 'Use the Bob World app → Accounts → Statement → Download, or BoB internet banking → My Accounts → Account Statement → Download PDF.' },
      { q: 'Can I use the converted BoB statement with Tally?', a: 'Yes. Download the Tally XML format and import directly into Tally Prime or ERP 9.' },
    ],
  },

  'idfc-first': {
    slug: 'idfc-first',
    name: 'IDFC First Bank',
    shortName: 'IDFC First',
    tagline: 'Convert IDFC First Bank statement PDF to Excel instantly',
    metaDescription: 'Convert your IDFC First Bank statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with IDFC First Bank mobile app and internet banking. Free to try.',
    keywords: ['idfc first bank statement to excel', 'idfc first statement pdf excel', 'idfc first bank statement converter', 'idfc bank statement excel', 'convert idfc statement'],
    color: '#f26522',
    statementFeatures: ['IDFC First Bank mobile app statements', 'IDFC First Internet Banking statements', 'IDFC First salary account statements', 'IDFC First FIRST Classic/Wealth statements'],
    steps: ['Download your IDFC First statement from the app or internet banking', 'Upload the PDF to BankXL', 'Get your Excel in 15 seconds'],
    formats: ['Excel (.xlsx)', 'CSV', 'JSON', 'Tally XML'],
    faqs: [
      { q: 'How do I get my IDFC First Bank statement?', a: 'Open the IDFC First Bank app → Accounts → Account Statement → Download PDF, or use internet banking → Accounts → e-Statement → Download.' },
      { q: 'Does BankXL handle IDFC First Bank\'s statement format accurately?', a: 'Yes. IDFC First Bank statements are clean digital PDFs that BankXL reads with 99%+ accuracy.' },
    ],
  },

  indusind: {
    slug: 'indusind',
    name: 'IndusInd Bank',
    shortName: 'IndusInd',
    tagline: 'Convert IndusInd Bank statement PDF to Excel instantly',
    metaDescription: 'Convert your IndusInd Bank statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with IndusMobile app and internet banking. Free to try.',
    keywords: ['indusind bank statement to excel', 'indusind statement pdf excel', 'indusmobile statement converter', 'indusind bank statement excel', 'convert indusind statement'],
    color: '#004a97',
    statementFeatures: ['IndusMobile app statements', 'IndusInd Internet Banking statements', 'IndusInd savings and current account statements', 'IndusInd NRI statements'],
    steps: ['Download your IndusInd statement from IndusMobile or internet banking', 'Upload the PDF to BankXL', 'Get your Excel in 15 seconds'],
    formats: ['Excel (.xlsx)', 'CSV', 'JSON', 'Tally XML'],
    faqs: [
      { q: 'How do I download my IndusInd Bank statement?', a: 'Use the IndusMobile app → Accounts → Account Statement → Download, or internet banking → Accounts → e-Statement → Download PDF.' },
      { q: 'Can I convert IndusInd statements for Tally?', a: 'Yes. Export as Tally XML and import directly into Tally Prime or ERP 9.' },
    ],
  },

  'yes-bank': {
    slug: 'yes-bank',
    name: 'Yes Bank',
    shortName: 'Yes Bank',
    tagline: 'Convert Yes Bank statement PDF to Excel instantly',
    metaDescription: 'Convert your Yes Bank statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with YES PAY, YES Mobile and internet banking statements. Free to try.',
    keywords: ['yes bank statement to excel', 'yes bank pdf to excel', 'yes bank statement converter', 'yes mobile statement excel', 'convert yes bank statement'],
    color: '#00439c',
    statementFeatures: ['YES Mobile app statements', 'Yes Bank Internet Banking statements', 'Yes Bank savings account statements', 'Yes Bank current account statements'],
    steps: ['Download your Yes Bank statement from YES Mobile or internet banking', 'Upload the PDF to BankXL', 'Get your Excel in 15 seconds'],
    formats: ['Excel (.xlsx)', 'CSV', 'JSON', 'Tally XML'],
    faqs: [
      { q: 'How do I get my Yes Bank statement?', a: 'Use YES Mobile → Accounts → Statements → Download PDF, or Yes Bank internet banking → Accounts → Account Statement → Download.' },
      { q: 'Does BankXL work with Yes Bank password-protected PDFs?', a: 'Yes — after removing the password. Unlock the PDF first using any free tool, then upload to BankXL.' },
    ],
  },

  federal: {
    slug: 'federal',
    name: 'Federal Bank',
    shortName: 'Federal',
    tagline: 'Convert Federal Bank statement PDF to Excel instantly',
    metaDescription: 'Convert your Federal Bank statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with FedMobile, FedNet and internet banking statements. Free to try.',
    keywords: ['federal bank statement to excel', 'federal bank pdf to excel', 'fedmobile statement excel', 'federal bank statement converter', 'convert federal bank statement'],
    color: '#1a3a6b',
    statementFeatures: ['FedMobile app statements', 'FedNet internet banking statements', 'Federal Bank savings account statements', 'Federal Bank NRI statements'],
    steps: ['Download your Federal Bank statement from FedMobile or FedNet', 'Upload the PDF to BankXL', 'Get your Excel in 15 seconds'],
    formats: ['Excel (.xlsx)', 'CSV', 'JSON', 'Tally XML'],
    faqs: [
      { q: 'How do I get my Federal Bank statement?', a: 'Use FedMobile app → Accounts → Statement → Download, or FedNet → Accounts → Account Statement → Download PDF.' },
      { q: 'Can I use BankXL for Federal Bank NRI statements?', a: 'Yes. Federal Bank NRE and NRO account statements are fully supported.' },
    ],
  },

  'bank-of-india': {
    slug: 'bank-of-india',
    name: 'Bank of India',
    shortName: 'BOI',
    tagline: 'Convert Bank of India statement PDF to Excel instantly',
    metaDescription: 'Convert your Bank of India (BOI) statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with BOI Mobile, StarConnect internet banking and passbook PDFs. Free to try.',
    keywords: ['bank of india statement to excel', 'boi statement pdf to excel', 'convert bank of india statement', 'starconnect statement excel', 'boi passbook to excel'],
    color: '#f78d1e',
    statementFeatures: ['BOI Mobile app statements', 'StarConnect internet banking statements', 'BOI passbook PDFs', 'BOI current & savings account statements', 'Password-protected BOI PDFs (after unlock)'],
    steps: ['Download your BOI statement from StarConnect or BOI Mobile', 'Upload the PDF to BankXL', 'Get your Excel in 15 seconds'],
    formats: ['Excel (.xlsx) with color-coded debits/credits', 'CSV for accounting software', 'JSON for developers', 'Tally XML for direct import'],
    faqs: [
      { q: 'How do I download my BOI statement?', a: 'Log into StarConnect internet banking → Accounts → Statement → select period → Download PDF. Or use the BOI Mobile app → Statement → Email/Download.' },
      { q: 'Does BankXL work with password-protected BOI statements?', a: 'Yes, after removing the password. Open the PDF in Adobe Reader → File → Print → Save as PDF to create an unlocked copy.' },
      { q: 'Is BankXL good for BOI Tally import?', a: 'Yes — export your BOI statement as Tally XML and use Ctrl+I in Tally Prime / ERP 9 to import receipts and payments as vouchers.' },
    ],
  },

  'union-bank': {
    slug: 'union-bank',
    name: 'Union Bank of India',
    shortName: 'Union Bank',
    tagline: 'Convert Union Bank of India statement PDF to Excel instantly',
    metaDescription: 'Convert your Union Bank of India statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with Union Bank internet banking and passbook PDFs. Free to try.',
    keywords: ['union bank statement to excel', 'union bank of india pdf to excel', 'convert union bank statement', 'union bank internet banking statement excel'],
    color: '#c8102e',
    statementFeatures: ['Union Bank Vyom app statements', 'Union Bank internet banking statements', 'Union Bank passbook PDFs', 'Union Bank NRI statements', 'Post-merger e-Andhra & e-Corporation account formats'],
    steps: ['Download your Union Bank statement from internet banking or Vyom app', 'Upload the PDF to BankXL', 'Get your Excel in 15 seconds'],
    formats: ['Excel (.xlsx) with color-coded debits/credits', 'CSV for accounting software', 'JSON for developers', 'Tally XML for direct import'],
    faqs: [
      { q: 'How do I download my Union Bank statement?', a: 'Log into Union Bank internet banking → Accounts → Statement → select period → Download PDF. Or use the Vyom app → Statement → Download.' },
      { q: 'Does BankXL support post-merger Union Bank formats?', a: 'Yes. Statements from ex-Andhra Bank and ex-Corporation Bank accounts (now under Union Bank of India after the 2020 merger) work fine.' },
      { q: 'Can I convert Union Bank statements for Tally import?', a: 'Yes — export as Tally XML and use Ctrl+I in Tally Prime / ERP 9. Receipts and payments land as proper vouchers.' },
    ],
  },

  'indian-bank': {
    slug: 'indian-bank',
    name: 'Indian Bank',
    shortName: 'Indian Bank',
    tagline: 'Convert Indian Bank statement PDF to Excel instantly',
    metaDescription: 'Convert your Indian Bank statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with IndOASIS app, internet banking and passbook PDFs. Free to try.',
    keywords: ['indian bank statement to excel', 'indian bank pdf to excel', 'convert indian bank statement', 'indoasis statement excel', 'indian bank passbook to excel'],
    color: '#0b3b8f',
    statementFeatures: ['IndOASIS mobile app statements', 'Indian Bank internet banking statements', 'Indian Bank passbook PDFs', 'Indian Bank NRI account statements', 'Post-merger ex-Allahabad Bank account formats'],
    steps: ['Download your Indian Bank statement from IndOASIS or internet banking', 'Upload the PDF to BankXL', 'Get your Excel in 15 seconds'],
    formats: ['Excel (.xlsx) with color-coded debits/credits', 'CSV for accounting software', 'JSON for developers', 'Tally XML for direct import'],
    faqs: [
      { q: 'How do I download my Indian Bank statement?', a: 'Use IndOASIS mobile app → Accounts → Statement → Download PDF. Or Indian Bank internet banking → Accounts → e-Statement → select period.' },
      { q: 'Does BankXL work with ex-Allahabad Bank statements?', a: 'Yes. After the 2020 merger, ex-Allahabad Bank accounts are now under Indian Bank — their statement format is fully supported.' },
      { q: 'Can I use this for Indian Bank Tally import?', a: 'Yes — Tally XML export lets you import all transactions as proper vouchers into Tally Prime or ERP 9.' },
    ],
  },

  rbl: {
    slug: 'rbl',
    name: 'RBL Bank',
    shortName: 'RBL',
    tagline: 'Convert RBL Bank statement PDF to Excel instantly',
    metaDescription: 'Convert your RBL Bank statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with RBL MyBank app, internet banking and credit card statements. Free to try.',
    keywords: ['rbl bank statement to excel', 'rbl pdf to excel', 'convert rbl bank statement', 'rbl mybank statement excel', 'rbl credit card statement to excel'],
    color: '#c8102e',
    statementFeatures: ['RBL MyBank app statements', 'RBL Bank internet banking statements', 'RBL credit card statements', 'RBL savings & current account statements', 'RBL business banking statements'],
    steps: ['Download your RBL statement from MyBank app or internet banking', 'Upload the PDF to BankXL', 'Get your Excel in 15 seconds'],
    formats: ['Excel (.xlsx) with color-coded debits/credits', 'CSV for accounting software', 'JSON for developers', 'Tally XML for direct import'],
    faqs: [
      { q: 'How do I download my RBL Bank statement?', a: 'Use the RBL MyBank app → Accounts → e-Statement → Download PDF. Or RBL internet banking → Accounts → Statement → select period → Download.' },
      { q: 'Does BankXL work with RBL credit card statements?', a: 'Yes. RBL credit card PDFs convert cleanly with all transaction details preserved.' },
      { q: 'Can I convert RBL statements for Tally import?', a: 'Yes — Tally XML export lets you import transactions as vouchers directly into Tally Prime or ERP 9.' },
    ],
  },

  'au-sfb': {
    slug: 'au-sfb',
    name: 'AU Small Finance Bank',
    shortName: 'AU SFB',
    tagline: 'Convert AU Small Finance Bank statement PDF to Excel instantly',
    metaDescription: 'Convert your AU Small Finance Bank statement PDF to Excel, CSV or Tally XML in 15 seconds. Works with AU 0101 app, AU Wingman internet banking and account PDFs. Free to try.',
    keywords: ['au bank statement to excel', 'au small finance bank pdf to excel', 'au sfb statement converter', 'au 0101 statement excel', 'convert au bank statement'],
    color: '#8b1c62',
    statementFeatures: ['AU 0101 mobile app statements', 'AU Wingman internet banking statements', 'AU SFB savings & current account statements', 'AU SFB business banking statements', 'AU credit card statements'],
    steps: ['Download your AU SFB statement from AU 0101 or Wingman', 'Upload the PDF to BankXL', 'Get your Excel in 15 seconds'],
    formats: ['Excel (.xlsx) with color-coded debits/credits', 'CSV for accounting software', 'JSON for developers', 'Tally XML for direct import'],
    faqs: [
      { q: 'How do I download my AU SFB statement?', a: 'Use AU 0101 mobile app → Accounts → Statement → Download. Or AU Wingman internet banking → Accounts → Account Statement → select period → Download PDF.' },
      { q: 'Does BankXL work with AU credit card statements?', a: 'Yes. AU Bank credit card PDFs are supported alongside their savings, current and business account statements.' },
      { q: 'Can I convert AU SFB statements for Tally import?', a: 'Yes — export as Tally XML for direct Ctrl+I import into Tally Prime or ERP 9.' },
    ],
  },
}

export const ALL_BANK_SLUGS = Object.keys(BANK_PAGES)

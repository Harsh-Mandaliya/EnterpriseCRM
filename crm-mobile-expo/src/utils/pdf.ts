import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

import type { CompanyBilling, Invoice, Payment } from '@/types';

/* ============================================================
   PDF DOCUMENTS
   ------------------------------------------------------------
   Bills, receipts, statements and reports are rendered from
   HTML: on a phone expo-print writes a PDF file and the share
   sheet lets the user save it (Files / Downloads / Drive) or send
   it (WhatsApp, e-mail). On web the browser print dialog opens,
   where "Save as PDF" is available.
============================================================ */

export interface PdfCompany {
  name: string;
  billing?: CompanyBilling | null;
  primaryColor?: string;
}

/* ---------------- formatting ---------------- */

export function escapeHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export const inr = (n: number) =>
  `₹${(Math.round(n * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const longDate = (iso: string | Date | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '—';

const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n: number): string {
  return n < 20 ? ONES[n] : `${TENS[Math.floor(n / 10)]}${n % 10 ? ` ${ONES[n % 10]}` : ''}`;
}

function threeDigits(n: number): string {
  const h = Math.floor(n / 100);
  const rest = n % 100;
  return [h ? `${ONES[h]} Hundred` : '', rest ? twoDigits(rest) : ''].filter(Boolean).join(' ');
}

/** Indian numbering: 1,23,45,678 → "One Crore Twenty Three Lakh …". */
export function amountInWords(amount: number): string {
  const rupees = Math.floor(Math.abs(amount));
  const paise = Math.round((Math.abs(amount) - rupees) * 100);
  if (rupees === 0 && paise === 0) return 'Zero Rupees Only';
  const crore = Math.floor(rupees / 1e7);
  const lakh = Math.floor((rupees % 1e7) / 1e5);
  const thousand = Math.floor((rupees % 1e5) / 1e3);
  const rest = rupees % 1e3;
  const parts = [
    crore ? `${threeDigits(crore)} Crore` : '',
    lakh ? `${twoDigits(lakh)} Lakh` : '',
    thousand ? `${twoDigits(thousand)} Thousand` : '',
    rest ? threeDigits(rest) : '',
  ].filter(Boolean);
  const words = `${parts.join(' ')} Rupees`;
  return `${words}${paise ? ` and ${twoDigits(paise)} Paise` : ''} Only`;
}

/* ---------------- shared layout ---------------- */

function shell(title: string, accent: string, body: string): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  @page { size: A4; margin: 14mm; }
  * { box-sizing: border-box; }
  body { font-family: -apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #111827; font-size: 12px; margin: 0; }
  .doc { max-width: 780px; margin: 0 auto; }
  .top { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 3px solid ${accent}; padding-bottom: 14px; }
  .brand { font-size: 22px; font-weight: 800; color: ${accent}; }
  .muted { color: #6b7280; }
  .small { font-size: 11px; }
  .doc-title { text-align: right; }
  .doc-title h1 { margin: 0; font-size: 24px; letter-spacing: 2px; color: #111827; }
  .pill { display: inline-block; padding: 3px 10px; border-radius: 99px; font-weight: 700; font-size: 11px; margin-top: 6px; }
  .pill.paid { background: #dcfce7; color: #166534; } .pill.due { background: #fef3c7; color: #92400e; }
  .pill.overdue { background: #fee2e2; color: #991b1b; } .pill.neutral { background: #e5e7eb; color: #374151; }
  .grid2 { display: flex; gap: 16px; margin: 18px 0; }
  .box { flex: 1; border: 1px solid #e5e7eb; border-radius: 8px; padding: 12px; }
  .box h3 { margin: 0 0 6px; font-size: 10px; letter-spacing: 1px; text-transform: uppercase; color: #6b7280; }
  .box .name { font-size: 14px; font-weight: 700; }
  table { width: 100%; border-collapse: collapse; margin-top: 6px; }
  th { background: ${accent}; color: #fff; text-align: left; padding: 8px; font-size: 11px; }
  td { padding: 8px; border-bottom: 1px solid #e5e7eb; vertical-align: top; }
  tr:nth-child(even) td { background: #f9fafb; }
  .r { text-align: right; } .c { text-align: center; }
  .totals { width: 300px; margin-left: auto; margin-top: 12px; }
  .totals td { border: none; padding: 5px 8px; background: none !important; }
  .totals .grand td { font-size: 15px; font-weight: 800; border-top: 2px solid #111827; }
  .words { margin-top: 10px; padding: 10px; background: #f3f4f6; border-radius: 6px; }
  .section { margin-top: 22px; }
  .section h2 { font-size: 13px; margin: 0 0 6px; color: ${accent}; text-transform: uppercase; letter-spacing: 1px; }
  .kpis { display: flex; gap: 10px; flex-wrap: wrap; margin: 14px 0; }
  .kpi { flex: 1; min-width: 140px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 10px; }
  .kpi .v { font-size: 17px; font-weight: 800; } .kpi .l { color: #6b7280; font-size: 10px; text-transform: uppercase; letter-spacing: .5px; }
  .foot { margin-top: 28px; display: flex; justify-content: space-between; align-items: flex-end; }
  .sign { text-align: center; width: 200px; border-top: 1px solid #9ca3af; padding-top: 6px; }
  .note { margin-top: 26px; text-align: center; color: #9ca3af; font-size: 10px; }
  .bar { height: 8px; background: #e5e7eb; border-radius: 4px; overflow: hidden; } .bar i { display: block; height: 8px; background: ${accent}; }
</style></head><body><div class="doc">${body}</div></body></html>`;
}

function companyBlock(company: PdfCompany): string {
  const b = company.billing;
  const lines = [b?.address, b?.phone ? `Phone: ${b.phone}` : null, b?.email ? `E-mail: ${b.email}` : null, b?.gstin ? `GSTIN: ${b.gstin}` : null]
    .filter(Boolean)
    .map(l => `<div class="muted small">${escapeHtml(l)}</div>`)
    .join('');
  return `<div><div class="brand">${escapeHtml(b?.legalName || company.name)}</div>${lines}</div>`;
}

function statusPill(status: string): string {
  const cls = status === 'PAID' ? 'paid' : status === 'OVERDUE' ? 'overdue' : status === 'PENDING' ? 'due' : 'neutral';
  const label = status === 'PENDING' ? 'DUE' : status;
  return `<span class="pill ${cls}">${escapeHtml(label)}</span>`;
}

const footer = (company: PdfCompany) =>
  `<div class="foot"><div class="muted small">${company.billing?.bankDetails ? `<b>Bank details</b><br>${escapeHtml(company.billing.bankDetails).replace(/\n/g, '<br>')}` : ''}</div>
   <div class="sign">For ${escapeHtml(company.billing?.legalName || company.name)}<br><span class="muted small">Authorised signatory</span></div></div>
   <div class="note">Computer-generated document · ${escapeHtml(longDate(new Date()))}</div>`;

/* ---------------- invoice (bill) ---------------- */

export function invoiceHtml(input: { invoice: Invoice; payments: Payment[]; company: PdfCompany }): string {
  const { invoice, payments, company } = input;
  const accent = company.primaryColor ?? '#2563EB';
  // Status PAID = fully paid (same rule as the app and the receivables report).
  const paid = invoice.status === 'PAID' ? invoice.total : Math.min(invoice.total, payments.reduce((s, p) => s + p.amount, 0));
  const balance = Math.max(0, invoice.total - paid);
  const taxRate = invoice.subtotal > 0 ? Math.round((invoice.tax / invoice.subtotal) * 1000) / 10 : 0;
  const c = invoice.customer;

  const rows = invoice.lineItems
    .map(
      (li, i) => `<tr><td class="c">${i + 1}</td><td>${escapeHtml(li.description)}</td><td class="r">${li.quantity}</td>
        <td class="r">${inr(li.unitPrice)}</td><td class="r">${inr(li.quantity * li.unitPrice)}</td></tr>`,
    )
    .join('');

  const paymentRows = payments.length
    ? `<div class="section"><h2>Payments received</h2><table><tr><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount</th></tr>
      ${payments
        .map(p => `<tr><td>${longDate(p.paidAt)}</td><td>${escapeHtml(p.method.replace('_', ' '))}</td><td>${escapeHtml(p.reference ?? '—')}</td><td class="r">${inr(p.amount)}</td></tr>`)
        .join('')}</table></div>`
    : '';

  const body = `
  <div class="top">${companyBlock(company)}
    <div class="doc-title"><h1>TAX INVOICE</h1><div><b>${escapeHtml(invoice.invoiceNumber)}</b></div>
      <div class="muted small">Issued ${longDate(invoice.issueDate ?? invoice.createdAt)}</div>
      <div class="muted small">Due ${longDate(invoice.dueDate)}</div>${statusPill(invoice.status)}</div>
  </div>
  <div class="grid2">
    <div class="box"><h3>Billed to</h3><div class="name">${escapeHtml(c?.name ?? 'Customer')}</div>
      ${c?.address ? `<div>${escapeHtml(c.address)}</div>` : ''}
      ${c?.phone ? `<div class="muted small">Phone: ${escapeHtml(c.phone)}</div>` : ''}
      ${c?.email ? `<div class="muted small">E-mail: ${escapeHtml(c.email)}</div>` : ''}
      ${c?.gstin ? `<div class="muted small">GSTIN: ${escapeHtml(c.gstin)}</div>` : ''}</div>
    <div class="box"><h3>Billed by</h3><div class="name">${escapeHtml(company.billing?.legalName || company.name)}</div>
      ${company.billing?.gstin ? `<div class="muted small">GSTIN: ${escapeHtml(company.billing.gstin)}</div>` : ''}
      <div class="muted small">Amount due: <b>${inr(balance)}</b></div></div>
  </div>
  <table><tr><th class="c" style="width:32px">#</th><th>Item / description</th><th class="r">Qty</th><th class="r">Rate</th><th class="r">Amount</th></tr>${rows}</table>
  <table class="totals">
    <tr><td>Subtotal</td><td class="r">${inr(invoice.subtotal)}</td></tr>
    <tr><td>GST (${taxRate}%)</td><td class="r">${inr(invoice.tax)}</td></tr>
    <tr class="grand"><td>Total</td><td class="r">${inr(invoice.total)}</td></tr>
    <tr><td>Paid</td><td class="r">${inr(paid)}</td></tr>
    <tr><td><b>Balance due</b></td><td class="r"><b>${inr(balance)}</b></td></tr>
  </table>
  <div class="words"><b>Amount in words:</b> ${escapeHtml(amountInWords(invoice.total))}</div>
  ${invoice.notes ? `<div class="section"><h2>Notes</h2><div>${escapeHtml(invoice.notes)}</div></div>` : ''}
  ${paymentRows}
  ${footer(company)}`;
  return shell(`Invoice ${invoice.invoiceNumber}`, accent, body);
}

/* ---------------- payment receipt ---------------- */

export function receiptHtml(input: {
  payment: Payment;
  invoiceNumber: string;
  invoiceTotal: number;
  paidToDate: number;
  customerName: string;
  receivedBy?: string | null;
  company: PdfCompany;
}): string {
  const { payment, company } = input;
  const accent = company.primaryColor ?? '#2563EB';
  const balance = Math.max(0, input.invoiceTotal - input.paidToDate);
  const body = `
  <div class="top">${companyBlock(company)}
    <div class="doc-title"><h1>PAYMENT RECEIPT</h1><div class="muted small">Receipt no. RCPT-${escapeHtml(payment.id.slice(-8).toUpperCase())}</div>
    <div class="muted small">${longDate(payment.paidAt)}</div><span class="pill paid">RECEIVED</span></div>
  </div>
  <div class="grid2">
    <div class="box"><h3>Received from</h3><div class="name">${escapeHtml(input.customerName)}</div></div>
    <div class="box"><h3>Amount received</h3><div class="name" style="font-size:20px">${inr(payment.amount)}</div>
      <div class="muted small">${escapeHtml(amountInWords(payment.amount))}</div></div>
  </div>
  <table>
    <tr><th>Against invoice</th><th>Method</th><th>Reference / UTR</th><th class="r">Amount</th></tr>
    <tr><td>${escapeHtml(input.invoiceNumber)}</td><td>${escapeHtml(payment.method.replace('_', ' '))}</td><td>${escapeHtml(payment.reference ?? '—')}</td><td class="r">${inr(payment.amount)}</td></tr>
  </table>
  <table class="totals">
    <tr><td>Invoice total</td><td class="r">${inr(input.invoiceTotal)}</td></tr>
    <tr><td>Paid to date</td><td class="r">${inr(input.paidToDate)}</td></tr>
    <tr class="grand"><td>Balance</td><td class="r">${inr(balance)}</td></tr>
  </table>
  ${input.receivedBy ? `<div class="muted small" style="margin-top:10px">Recorded by ${escapeHtml(input.receivedBy)}</div>` : ''}
  ${footer(company)}`;
  return shell(`Receipt ${input.invoiceNumber}`, accent, body);
}

/* ---------------- generic report ---------------- */

export interface ReportSection {
  title: string;
  /** Rows of cells; the first row is the header. */
  table?: string[][];
  /** Right-align these column indexes. */
  numeric?: number[];
  text?: string;
}

export function reportHtml(input: {
  title: string;
  subtitle?: string;
  company: PdfCompany;
  kpis?: { label: string; value: string }[];
  sections: ReportSection[];
}): string {
  const accent = input.company.primaryColor ?? '#2563EB';
  const kpis = input.kpis?.length
    ? `<div class="kpis">${input.kpis.map(k => `<div class="kpi"><div class="v">${escapeHtml(k.value)}</div><div class="l">${escapeHtml(k.label)}</div></div>`).join('')}</div>`
    : '';
  const sections = input.sections
    .map(s => {
      const numeric = new Set(s.numeric ?? []);
      const table = s.table?.length
        ? `<table><tr>${s.table[0].map((h, i) => `<th class="${numeric.has(i) ? 'r' : ''}">${escapeHtml(h)}</th>`).join('')}</tr>${s.table
            .slice(1)
            .map(r => `<tr>${r.map((cell, i) => `<td class="${numeric.has(i) ? 'r' : ''}">${escapeHtml(cell)}</td>`).join('')}</tr>`)
            .join('')}</table>`
        : '';
      return `<div class="section"><h2>${escapeHtml(s.title)}</h2>${s.text ? `<div>${escapeHtml(s.text)}</div>` : ''}${table}</div>`;
    })
    .join('');
  const body = `<div class="top">${companyBlock(input.company)}
    <div class="doc-title"><h1 style="font-size:18px">${escapeHtml(input.title.toUpperCase())}</h1>
    ${input.subtitle ? `<div class="muted small">${escapeHtml(input.subtitle)}</div>` : ''}
    <div class="muted small">Generated ${escapeHtml(new Date().toLocaleString('en-IN'))}</div></div></div>
    ${kpis}${sections}<div class="note">Confidential · ${escapeHtml(input.company.name)}</div>`;
  return shell(input.title, accent, body);
}

/* ---------------- output ---------------- */

/**
 * Turns the HTML into a PDF and opens the share sheet (phone) or the
 * print / save-as-PDF dialog (web). Returns where it went.
 */
export async function exportPdf(html: string, fileName: string): Promise<'shared' | 'printed' | 'saved'> {
  if (Platform.OS === 'web') {
    const win = typeof window !== 'undefined' ? window.open('', '_blank') : null;
    if (!win) {
      await Print.printAsync({ html });
      return 'printed';
    }
    win.document.open();
    win.document.write(html.replace('<title>', `<title>${escapeHtml(fileName)} – `));
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 350);
    return 'printed';
  }
  const { uri } = await Print.printToFileAsync({ html });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: fileName, UTI: 'com.adobe.pdf' });
    return 'shared';
  }
  return 'saved';
}

/** Builds a PdfCompany from the branding already in Redux. */
export function pdfCompany(branding: {
  company?: { name: string; billing?: CompanyBilling } | null;
  resolved?: { primaryColor?: string | null; colors?: { primary?: string } } | null;
} | null, fallbackName = 'Company'): PdfCompany {
  return {
    name: branding?.company?.name ?? fallbackName,
    billing: branding?.company?.billing ?? null,
    primaryColor: branding?.resolved?.primaryColor ?? undefined,
  };
}

/* ============================================================
   PDF export — web build.
   Renders the document off-screen and converts it with html2pdf.js
   (html2canvas + jsPDF), then the browser downloads a real
   INV-0004.pdf — no pop-up window and no print dialog, so pop-up
   blockers can't stop it.
============================================================ */

export type PdfResult = 'downloaded' | 'saved' | 'shared';

export function safePdfName(fileName: string): string {
  const base = fileName.replace(/\.pdf$/i, '').replace(/[^\w.\- ]+/g, '-').replace(/\s+/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
  return `${base || 'document'}.pdf`;
}

type Html2Pdf = () => {
  set: (options: Record<string, unknown>) => ReturnType<Html2Pdf>;
  from: (element: HTMLElement) => ReturnType<Html2Pdf>;
  save: () => Promise<void>;
};

/** Pulls the <style> blocks and the <body> content out of a full HTML document. */
export function splitDocument(html: string): { styles: string; body: string } {
  const styles = (html.match(/<style[^>]*>[\s\S]*?<\/style>/gi) ?? []).join('\n');
  const body = /<body[^>]*>([\s\S]*)<\/body>/i.exec(html)?.[1] ?? html;
  return { styles, body };
}

export async function exportPdf(html: string, fileName: string): Promise<PdfResult> {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const mod = require('html2pdf.js') as Html2Pdf | { default: Html2Pdf };
  const html2pdf = typeof mod === 'function' ? mod : mod.default;

  const { styles, body } = splitDocument(html);
  const host = document.createElement('div');
  host.setAttribute('aria-hidden', 'true');
  // A4 width at 96 dpi; off-screen so the app does not jump.
  host.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;background:#ffffff;';
  host.innerHTML = `${styles}${body}`;
  document.body.appendChild(host);
  try {
    const root = (host.querySelector('.crm-doc') as HTMLElement | null) ?? host;
    await html2pdf()
      .set({
        filename: safePdfName(fileName),
        margin: [8, 8, 10, 8],
        image: { type: 'jpeg', quality: 0.97 },
        html2canvas: { scale: 2, backgroundColor: '#ffffff', useCORS: true, logging: false },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', '.box', '.kpi', '.totals', '.foot'] },
      })
      .from(root)
      .save();
    return 'downloaded';
  } finally {
    host.remove();
  }
}

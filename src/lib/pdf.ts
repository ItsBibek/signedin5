import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import type { Proposal, Signature } from '@/types/database';
import { formatCurrency, formatDate, formatDateTime } from '@/lib/proposal';

/**
 * Generates a PDF and triggers an automatic browser download.
 * Uses jsPDF + html2canvas to render the proposal HTML to a PDF file
 * that downloads directly — no print dialog.
 */
export async function downloadProposalPDF(proposal: Proposal, signature?: Signature | null) {
  // Build the HTML content
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-9999px;top:0;width:800px;background:#fff;';
  container.innerHTML = buildProposalHTML(proposal, signature);
  document.body.appendChild(container);

  try {
    const canvas = await html2canvas(container, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
    });

    const pdf = new jsPDF('p', 'px', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const pageCanvas = document.createElement('canvas');
    const ctx = pageCanvas.getContext('2d');
    if (!ctx) throw new Error('Unable to render PDF page');

    const sourcePageHeight = Math.floor((canvas.width * pdfHeight) / pdfWidth);
    const totalPages = Math.max(1, Math.ceil(canvas.height / sourcePageHeight));

    for (let pageIndex = 0; pageIndex < totalPages; pageIndex += 1) {
      const sourceY = pageIndex * sourcePageHeight;
      const sourceHeight = Math.min(sourcePageHeight, canvas.height - sourceY);
      pageCanvas.width = canvas.width;
      pageCanvas.height = sourceHeight;
      ctx.clearRect(0, 0, pageCanvas.width, pageCanvas.height);
      ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);

      const pageImgData = pageCanvas.toDataURL('image/jpeg', 0.95);
      if (pageIndex > 0) pdf.addPage();
      const renderedHeight = (sourceHeight * pdfWidth) / canvas.width;
      pdf.addImage(pageImgData, 'JPEG', 0, 0, pdfWidth, renderedHeight);
    }

    const fileName = `${(proposal.project_title || 'proposal').replace(/[^a-z0-9]/gi, '-').toLowerCase()}-${signature ? 'signed' : 'proposal'}.pdf`;
    pdf.save(fileName);
  } finally {
    document.body.removeChild(container);
  }
}

function buildProposalHTML(proposal: Proposal, signature?: Signature | null): string {
  const accent = proposal.branding?.brand_color || '#0a0a0a';
  const sections = (proposal.sections || []).filter((s) => s.enabled);
  const currency = proposal.currency || 'USD';

  let sectionsHtml = '';
  for (const section of sections) {
    sectionsHtml += renderSection(section, proposal, accent, currency);
  }

  const signatureHtml = signature ? `
    <div style="margin-top:36px;padding:22px;border:1px solid #e5e5e5;border-radius:12px;">
      <div style="font-size:12px;text-transform:uppercase;letter-spacing:0.05em;color:#999;margin-bottom:14px;">Signed Agreement</div>
      ${signature.signature_type === 'drawn'
        ? `<img src="${signature.signature_data}" alt="signature" style="max-height:72px;max-width:280px;margin-bottom:10px;" />`
        : `<div style="font-family:Georgia,serif;font-size:30px;font-style:italic;color:#111;margin-bottom:10px;">${esc(signature.signature_data)}</div>`
      }
      <div style="font-size:14px;color:#666;">${esc(signature.signer_name)}</div>
      <div style="font-size:12px;color:#999;margin-top:4px;">Signed on ${formatDateTime(signature.signed_at)}</div>
    </div>
  ` : '';

  return `
  <div style="font-family:'Inter',-apple-system,sans-serif;color:#18181b;background:#fff;padding:48px 56px;line-height:1.6;font-size:14px;width:688px;">
    <div style="display:flex;justify-content:space-between;align-items:flex-start;padding-bottom:28px;border-bottom:1px solid #f0f0f0;">
      <div style="font-size:18px;font-weight:600;color:#111;">${esc(proposal.branding?.business_name || 'Your Studio')}</div>
      <div style="text-align:right;">
        <div style="font-size:11px;text-transform:uppercase;letter-spacing:0.06em;color:#999;">Proposal</div>
        <div style="margin-top:4px;font-size:13px;color:#999;">${formatDate(proposal.created_at)}</div>
      </div>
    </div>
    ${proposal.expires_at ? `<div style="margin-top:16px;display:inline-block;padding:4px 12px;border-radius:999px;background:#f5f5f5;font-size:12px;color:#666;">Valid until ${formatDate(proposal.expires_at)}</div>` : ''}
    ${sectionsHtml}
    ${signatureHtml}
    <div style="margin-top:28px;padding-top:28px;border-top:1px solid #f0f0f0;font-size:13px;color:#999;">
      <p>This proposal is valid for 30 days.${proposal.branding?.business_name ? ` &copy; ${new Date().getFullYear()} ${esc(proposal.branding.business_name)}.` : ''}</p>
    </div>
  </div>`;
}

function renderSection(section: { type: string; data: Record<string, unknown>; title: string }, proposal: Proposal, accent: string, currency: string): string {
  const d = section.data;
  const titleBar = `<div style="display:flex;align-items:center;gap:10px;margin-bottom:18px;margin-top:28px;"><div style="width:4px;height:16px;border-radius:2px;background:${accent};"></div><h2 style="font-size:18px;font-weight:600;margin:0;">${esc((d.heading as string) || section.title)}</h2></div>`;

  switch (section.type) {
    case 'hero':
      return `
        <div style="margin-top:28px;">
          <h1 style="font-size:30px;font-weight:600;letter-spacing:-0.02em;margin:0;color:#111;">${esc((d.headline as string) || proposal.project_title || 'Untitled Project')}</h1>
          <p style="margin-top:14px;font-size:15px;color:#555;max-width:600px;">${esc((d.subheadline as string) || proposal.project_description || '')}</p>
          <div style="margin-top:22px;font-size:14px;color:#666;">
            Prepared for: <strong style="color:#111;">${esc(proposal.client_name || '—')}</strong>
            ${proposal.client_company ? ` &middot; ${esc(proposal.client_company)}` : ''}
            &middot; ${esc(proposal.client_email || '—')}
          </div>
        </div>`;

    case 'about':
      return `<div>${titleBar}<p style="max-width:600px;color:#555;">${esc(d.body as string)}</p>${renderHighlights(d.highlights as string[], accent)}</div>`;

    case 'project_overview':
      return `<div>${titleBar}<p style="max-width:600px;color:#555;">${esc(d.body as string)}</p>${renderObjectives(d.objectives as string[], accent)}</div>`;

    case 'scope':
    case 'deliverables': {
      const items = (d.items as { title: string; description: string }[]) || [];
      const isDeliverables = section.type === 'deliverables';
      if (isDeliverables) {
        return `<div>${titleBar}<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">${items.map((item) => `
          <div style="border:1px solid #e5e5e5;border-radius:12px;padding:16px;">
            <div style="display:flex;align-items:center;gap:8px;"><span style="color:${accent};font-weight:bold;">✓</span><span style="font-weight:600;color:#111;">${esc(item.title)}</span></div>
            ${item.description ? `<p style="margin-top:6px;font-size:14px;color:#666;">${esc(item.description)}</p>` : ''}
          </div>`).join('')}</div></div>`;
      }
      return `<div>${titleBar}<div>${items.map((item, i) => `
        <div style="display:flex;gap:12px;margin-bottom:14px;">
          <div style="flex-shrink:0;width:26px;height:26px;border-radius:50%;background:${accent};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;">${i + 1}</div>
          <div><div style="font-weight:600;color:#111;">${esc(item.title)}</div>${item.description ? `<div style="margin-top:3px;font-size:14px;color:#666;">${esc(item.description)}</div>` : ''}</div>
        </div>`).join('')}</div></div>`;
    }

    case 'timeline': {
      const milestones = (d.milestones as { title: string; date: string }[]) || [];
      return `<div>${titleBar}
        <div style="display:flex;gap:44px;">
          ${d.startDate ? `<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#999;">Start date</div><div style="margin-top:4px;font-size:20px;font-weight:600;color:${accent};">${formatDate(d.startDate as string)}</div></div>` : ''}
          ${d.endDate ? `<div><div style="font-size:11px;text-transform:uppercase;letter-spacing:0.05em;color:#999;">Estimated completion</div><div style="margin-top:4px;font-size:20px;font-weight:600;color:${accent};">${formatDate(d.endDate as string)}</div></div>` : ''}
        </div>
        ${milestones.length > 0 ? `<div style="margin-top:20px;">${milestones.map((m) => `
          <div style="display:flex;align-items:center;gap:10px;font-size:14px;margin-bottom:8px;">
            <span style="width:8px;height:8px;border-radius:50%;background:${accent};"></span>
            <span style="font-weight:600;color:#111;">${esc(m.title)}</span>
            <span style="color:#ccc;">·</span><span style="color:#666;">${formatDate(m.date)}</span>
          </div>`).join('')}</div>` : ''}
      </div>`;
    }

    case 'pricing': {
      const items = (d.items as { description: string; quantity: number; rate: number; amount: number }[]) || [];
      const subtotal = items.reduce((s, it) => s + it.amount, 0);
      const taxRate = (d.taxRate as number) || 0;
      const tax = +(subtotal * (taxRate / 100)).toFixed(2);
      const total = +(subtotal + tax).toFixed(2);
      return `<div>${titleBar}
        ${items.length > 0 ? `<table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead><tr><th style="text-align:left;padding:10px 14px;background:#fafafa;border-bottom:1px solid #e5e5e5;font-size:11px;text-transform:uppercase;color:#999;">Description</th><th style="text-align:right;padding:10px 14px;background:#fafafa;border-bottom:1px solid #e5e5e5;font-size:11px;color:#999;">Qty</th><th style="text-align:right;padding:10px 14px;background:#fafafa;border-bottom:1px solid #e5e5e5;font-size:11px;color:#999;">Rate</th><th style="text-align:right;padding:10px 14px;background:#fafafa;border-bottom:1px solid #e5e5e5;font-size:11px;color:#999;">Amount</th></tr></thead>
          <tbody>${items.map((it) => `<tr><td style="padding:10px 14px;border-bottom:1px solid #f4f4f4;color:#111;">${esc(it.description)}</td><td style="padding:10px 14px;text-align:right;color:#666;">${it.quantity}</td><td style="padding:10px 14px;text-align:right;color:#666;">${formatCurrency(it.rate, currency)}</td><td style="padding:10px 14px;text-align:right;font-weight:600;color:#111;">${formatCurrency(it.amount, currency)}</td></tr>`).join('')}</tbody>
        </table>` : ''}
        <div style="margin-top:16px;">
          <div style="display:flex;justify-content:space-between;font-size:14px;color:#666;margin-bottom:6px;"><span>Subtotal</span><span>${formatCurrency(subtotal, currency)}</span></div>
          ${tax > 0 ? `<div style="display:flex;justify-content:space-between;font-size:14px;color:#666;margin-bottom:6px;"><span>Tax (${taxRate}%)</span><span>${formatCurrency(tax, currency)}</span></div>` : ''}
          <div style="display:flex;justify-content:space-between;padding-top:8px;border-top:1px solid #e5e5e5;font-size:16px;font-weight:600;color:#111;"><span>Total</span><span style="color:${accent};">${formatCurrency(total, currency)}</span></div>
        </div>
        ${d.notes ? `<p style="margin-top:12px;font-size:14px;color:#666;">${esc(d.notes as string)}</p>` : ''}
      </div>`;
    }

    case 'packages': {
      const packages = (d.packages as { name: string; price: number; description: string; features: string[]; popular?: boolean }[]) || [];
      return `<div>${titleBar}<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">${packages.map((pkg) => `
        <div style="border:2px solid ${pkg.popular ? '#111' : '#e5e5e5'};border-radius:16px;padding:20px;${pkg.popular ? 'position:relative;' : ''}">
          ${pkg.popular ? '<div style="position:absolute;top:-12px;left:50%;transform:translateX(-50%);background:#111;color:#fff;padding:2px 12px;border-radius:999px;font-size:11px;">Most Popular</div>' : ''}
          <div style="font-weight:600;color:#111;">${esc(pkg.name)}</div>
          <div style="margin-top:8px;font-size:24px;font-weight:bold;color:${accent};">${formatCurrency(pkg.price, currency)}</div>
          <div style="margin-top:4px;font-size:13px;color:#999;">${esc(pkg.description)}</div>
          <ul style="margin-top:16px;padding:0;list-style:none;">${pkg.features.map((f) => `<li style="display:flex;align-items:start;gap:8px;font-size:14px;color:#444;margin-bottom:8px;"><span style="color:${accent};">✓</span>${esc(f)}</li>`).join('')}</ul>
        </div>`).join('')}</div></div>`;
    }

    case 'addons': {
      const addons = (d.addons as { name: string; price: number; description: string }[]) || [];
      return `<div>${titleBar}<div>${addons.map((a) => `
        <div style="display:flex;align-items:center;gap:16px;padding:16px;border:1px solid #e5e5e5;border-radius:12px;margin-bottom:12px;">
          <div style="width:24px;height:24px;border:2px solid #ccc;border-radius:6px;flex-shrink:0;"></div>
          <div style="flex:1;">
            <div style="display:flex;justify-content:space-between;"><span style="font-weight:600;color:#111;">${esc(a.name)}</span><span style="font-weight:600;color:${accent};">+${formatCurrency(a.price, currency)}</span></div>
            <p style="margin-top:2px;font-size:13px;color:#999;">${esc(a.description)}</p>
          </div>
        </div>`).join('')}</div></div>`;
    }

    case 'faq': {
      const items = (d.items as { question: string; answer: string }[]) || [];
      return `<div>${titleBar}<div>${items.map((item) => `
        <div style="margin-bottom:16px;">
          <div style="font-weight:600;color:#111;">${esc(item.question)}</div>
          <p style="margin-top:6px;padding-left:0;font-size:14px;color:#666;">${esc(item.answer)}</p>
        </div>`).join('')}</div></div>`;
    }

    case 'testimonials': {
      const items = (d.items as { quote: string; author: string; role: string; rating: number }[]) || [];
      return `<div>${titleBar}<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;">${items.map((t) => `
        <div style="border:1px solid #e5e5e5;border-radius:12px;padding:20px;background:#fafafa;">
          <div style="margin-bottom:8px;color:#fbbf24;">${'★'.repeat(t.rating)}${'☆'.repeat(5 - t.rating)}</div>
          <p style="font-size:14px;color:#444;font-style:italic;">"${esc(t.quote)}"</p>
          <div style="margin-top:12px;font-weight:600;color:#111;">${esc(t.author)}</div>
          <div style="font-size:13px;color:#999;">${esc(t.role)}</div>
        </div>`).join('')}</div></div>`;
    }

    case 'case_studies': {
      const items = (d.items as { project: string; problem: string; result: string }[]) || [];
      return `<div>${titleBar}<div>${items.map((cs) => `
        <div style="border:1px solid #e5e5e5;border-radius:12px;padding:20px;margin-bottom:16px;">
          <div style="font-weight:600;color:#111;margin-bottom:8px;">${esc(cs.project)}</div>
          <div style="font-size:14px;margin-bottom:6px;"><strong style="color:#999;">Problem: </strong><span style="color:#444;">${esc(cs.problem)}</span></div>
          <div style="font-size:14px;"><strong style="color:${accent};">Result: </strong><span style="color:#444;">${esc(cs.result)}</span></div>
        </div>`).join('')}</div></div>`;
    }

    case 'video':
      return `<div>${titleBar}<div style="border:1px dashed #ccc;border-radius:12px;padding:40px;text-align:center;background:#fafafa;"><div style="font-size:14px;color:#999;">Video: ${esc((d.url as string) || 'No video URL set')}</div></div></div>`;

    case 'terms':
      return `<div>${titleBar}
        ${Number(d.depositPercent) > 0 ? `<div style="display:flex;align-items:center;gap:12px;background:#fafafa;padding:12px 16px;border-radius:8px;font-size:14px;color:#444;">
          <div style="width:32px;height:32px;border-radius:50%;background:${accent};color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600;flex-shrink:0;">${d.depositPercent}%</div>
          <div>Deposit of <strong>${d.depositPercent}%</strong> due ${esc((d.depositDue as string) || 'upon signing')}. Balance due ${esc((d.balanceDue as string) || 'upon completion')}.</div>
        </div>` : ''}
        ${d.notes ? `<p style="margin-top:12px;font-size:14px;color:#666;">${esc(d.notes as string)}</p>` : ''}
      </div>`;

    case 'accept':
      return `<div style="margin-top:28px;padding:24px;border:1px solid #e5e5e5;border-radius:16px;text-align:center;">
        <h2 style="font-size:20px;font-weight:600;color:#111;margin:0;">${esc((d.heading as string) || 'Ready to proceed?')}</h2>
        <p style="margin-top:8px;font-size:14px;color:#666;">${esc((d.body as string) || 'By signing this proposal, you agree to the scope, timeline, and terms outlined above.')}</p>
      </div>`;

    case 'custom': {
      const items = Array.isArray(d.items) ? (d.items as string[]) : [];
      return `<div>${titleBar}
        ${(d.body as string) ? `<p style="max-width:600px;color:#555;">${esc(d.body as string)}</p>` : ''}
        ${items.length > 0 ? `<ul style="margin-top:16px;padding:0;list-style:none;">${items.map((item) => `
          <li style="display:flex;align-items:start;gap:8px;font-size:14px;color:#444;margin-bottom:8px;">
            <span style="margin-top:6px;width:6px;height:6px;border-radius:50%;background:${accent};flex-shrink:0;"></span>${esc(item)}
          </li>`).join('')}</ul>` : ''}
      </div>`;
    }

    default:
      return '';
  }
}

function renderHighlights(highlights: string[] | undefined, accent: string): string {
  if (!highlights || highlights.length === 0) return '';
  return `<div style="margin-top:24px;display:flex;flex-wrap:wrap;gap:12px;">${highlights.map((h) => `
    <div style="display:flex;align-items:center;gap:8px;border:1px solid #e5e5e5;border-radius:8px;padding:8px 12px;font-size:14px;color:#444;">
      <span style="color:${accent};">✓</span> ${esc(h)}
    </div>`).join('')}</div>`;
}

function renderObjectives(objectives: string[] | undefined, accent: string): string {
  if (!objectives || objectives.length === 0) return '';
  return `<ul style="margin-top:24px;padding:0;list-style:none;">${objectives.map((o) => `
    <li style="display:flex;align-items:start;gap:8px;font-size:14px;color:#444;margin-bottom:8px;">
      <span style="margin-top:6px;width:6px;height:6px;border-radius:50%;background:${accent};flex-shrink:0;"></span>${esc(o)}
    </li>`).join('')}</ul>`;
}

function esc(s: string | null | undefined): string {
  if (!s) return '';
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

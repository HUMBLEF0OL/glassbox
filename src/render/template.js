/**
 * src/render/template.js — HTML scaffold with inline CSS/JS (Slice 2).
 * SELF-CONTAINED: no external URLs, fonts, CDNs, or fetch calls (AC-11, BR-10).
 *
 * Trace: BR-10, NFR-07, AC-11
 */

/** Inline CSS for the report */
const CSS = `
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:system-ui,sans-serif;font-size:14px;line-height:1.5;background:#f6f8fa;color:#24292f}
a{color:#0969da}
.container{max-width:1100px;margin:0 auto;padding:16px}
h1{font-size:20px;font-weight:600;margin-bottom:4px}
h2{font-size:16px;font-weight:600;margin:20px 0 8px}
.meta{color:#57606a;font-size:12px;margin-bottom:16px}
.badge{display:inline-block;padding:1px 6px;border-radius:10px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.5px}
.badge-user{background:#ddf4ff;color:#0550ae}
.badge-assistant{background:#f6f8fa;color:#24292f;border:1px solid #d0d7de}
.badge-read{background:#fff8c5;color:#7d4e00}
.badge-edit{background:#dafbe1;color:#1a7f37}
.badge-search{background:#faf0fe;color:#8250df}
.badge-semantic{background:#eaf5ff;color:#0969da}
.badge-bash{background:#fff3e0;color:#9e4200}
.badge-mcp{background:#fff0f0;color:#cf222e}
.badge-meta{background:#f0f6ff;color:#0550ae}
.badge-ok{background:#dafbe1;color:#1a7f37}
.badge-error{background:#fff0f0;color:#cf222e}
.badge-unknown{background:#f6f8fa;color:#57606a;border:1px solid #d0d7de}
.badge-system{background:#f6f8fa;color:#57606a}
.badge-verify{background:#fff8c5;color:#9e3f00}
.timeline{border-left:2px solid #d0d7de;padding-left:16px;margin-left:8px}
.entry{position:relative;margin-bottom:10px;padding:8px 10px;background:#fff;border:1px solid #d0d7de;border-radius:6px}
.entry::before{content:'';position:absolute;left:-21px;top:12px;width:8px;height:8px;border-radius:50%;background:#d0d7de;border:2px solid #fff}
.entry.kind-user::before{background:#0969da}
.entry.kind-tool_call::before{background:#8250df}
.entry.kind-tool_result.badge-ok::before{background:#1a7f37}
.entry.kind-tool_result.badge-error::before{background:#cf222e}
.entry-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.entry-title{font-weight:600;font-size:13px}
.entry-ts{color:#57606a;font-size:11px;margin-left:auto}
.entry-summary{margin-top:4px;font-size:12px;color:#57606a;word-break:break-all;white-space:pre-wrap}
.scorecard{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.metric-card{background:#fff;border:1px solid #d0d7de;border-radius:6px;padding:14px}
.metric-card.status-ok{border-left:4px solid #1a7f37}
.metric-card.status-alert{border-left:4px solid #cf222e}
.metric-card.status-unknown{border-left:4px solid #57606a}
.metric-label{font-weight:600;font-size:13px;margin-bottom:4px}
.metric-display{font-size:20px;font-weight:700;margin-bottom:4px}
.metric-explanation{font-size:12px;color:#57606a}
.metric-notes{font-size:11px;color:#9a6700;margin-top:4px;font-style:italic}
.warning{background:#fff8c5;border:1px solid #f5c642;border-radius:6px;padding:8px 12px;margin:12px 0;font-size:12px;color:#7d4e00}
.info-banner{background:#f0f6ff;border:1px solid #b6d4fe;border-radius:6px;padding:8px 12px;margin:12px 0;font-size:12px;color:#0550ae}
`;

/** Minimal inline JS (collapse/expand) */
const JS = `
document.querySelectorAll('.entry').forEach(el=>{
  el.style.cursor='pointer';
  const sum=el.querySelector('.entry-summary');
  if(!sum||sum.textContent.length<50)return;
  const full=sum.textContent;
  const short=full.slice(0,100)+'…';
  sum.textContent=short;
  el.dataset.expanded='0';
  el.addEventListener('click',()=>{
    if(el.dataset.expanded==='0'){sum.textContent=full;el.dataset.expanded='1';}
    else{sum.textContent=short;el.dataset.expanded='0';}
  });
});
`;

/**
 * Escape HTML special characters.
 * @param {string} s
 * @returns {string}
 */
export function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Produce a full, self-contained HTML document.
 * @param {{ title: string, head?: string, body: string }} opts
 * @returns {string}
 */
export function page({ title, head = '', body }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
${head}
<style>${CSS}</style>
</head>
<body>
<div class="container">
${body}
</div>
<script>${JS}</script>
</body>
</html>`;
}

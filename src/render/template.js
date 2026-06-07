/**
 * src/render/template.js — HTML scaffold with inline CSS/JS (Slice 2 / UI redesign).
 * SELF-CONTAINED: no external URLs, fonts, CDNs, or fetch calls (AC-11, BR-10).
 *
 * Trace: BR-10, NFR-07, AC-11
 */

const CSS = `
:root{
  --bg-base:#0d1117;--bg-surface:#161b22;--bg-raised:#21262d;
  --border:#30363d;--text:#e6edf3;--text-muted:#8b949e;--text-dim:#6e7681;
  --green:#3fb950;--red:#f85149;--yellow:#d29922;--blue:#58a6ff;
  --purple:#bc8cff;--orange:#e3b341;
}
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html{scroll-behavior:smooth}
body{font-family:system-ui,-apple-system,sans-serif;font-size:14px;line-height:1.6;background:var(--bg-base);color:var(--text)}
a{color:var(--blue);text-decoration:none}
a:hover{text-decoration:underline}

/* ── Sticky nav ── */
#topnav{position:sticky;top:0;z-index:100;display:flex;align-items:center;gap:16px;padding:0 24px;height:48px;background:rgba(13,17,23,.94);backdrop-filter:blur(8px);border-bottom:1px solid var(--border)}
.nav-brand{font-weight:700;font-size:15px;color:var(--text);letter-spacing:-.3px;flex-shrink:0}
.nav-brand em{color:var(--blue);font-style:normal}
.nav-links{display:flex;gap:4px}
.nav-links a{padding:4px 10px;border-radius:6px;font-size:13px;color:var(--text-muted);transition:background .15s,color .15s}
.nav-links a:hover,.nav-links a.active{background:var(--bg-raised);color:var(--text);text-decoration:none}
.nav-summary{margin-left:auto;font-size:12px;color:var(--text-dim);white-space:nowrap}

/* ── Layout ── */
.container{max-width:1100px;margin:0 auto;padding:32px 24px}
section{margin-bottom:48px}

/* ── Page header ── */
.page-header{margin-bottom:32px}
.page-title{font-size:22px;font-weight:700;color:var(--text);margin-bottom:6px}
.page-file{font-family:ui-monospace,monospace;font-size:13px;color:var(--text-muted)}
.page-meta{font-size:12px;color:var(--text-dim);margin-top:4px}

/* ── Section headings ── */
.section-title{font-size:16px;font-weight:600;color:var(--text);margin:0 0 16px;padding-bottom:10px;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px}
.section-title .icon{opacity:.65}

/* ── Banners ── */
.banner{display:flex;align-items:flex-start;gap:10px;padding:12px 16px;border-radius:8px;font-size:13px;margin-bottom:16px}
.banner-warn{background:rgba(210,153,34,.12);border:1px solid rgba(210,153,34,.3);color:var(--yellow)}
.banner-info{background:rgba(88,166,255,.08);border:1px solid rgba(88,166,255,.2);color:var(--blue)}

/* ── Scorecard ── */
.scorecard{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:16px}
.metric-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:20px 16px;display:flex;flex-direction:column;align-items:center;text-align:center;transition:transform .15s,box-shadow .15s}
.metric-card:hover{transform:translateY(-2px);box-shadow:0 4px 20px rgba(0,0,0,.5)}
.metric-card.status-ok{border-top:3px solid var(--green)}
.metric-card.status-alert{border-top:3px solid var(--red)}
.metric-card.status-unknown{border-top:3px solid var(--text-dim)}

/* ── Progress ring ── */
.ring-wrap{position:relative;width:84px;height:84px;margin-bottom:12px}
.ring-wrap svg{display:block}
.ring-track{fill:none;stroke:var(--bg-raised);stroke-width:6}
.ring-fill{fill:none;stroke-width:6;stroke-linecap:round}
.ring-fill.ok{stroke:var(--green)}
.ring-fill.alert{stroke:var(--red)}
.ring-fill.unknown{stroke:var(--text-dim)}
.ring-text{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:17px;font-weight:700;color:var(--text);font-family:ui-monospace,monospace}
.metric-value{font-size:14px;font-weight:700;color:var(--text);line-height:1.35;margin-bottom:6px;word-break:break-word}
.metric-label{font-size:11px;font-weight:600;color:var(--text-muted);letter-spacing:.5px;text-transform:uppercase;margin-bottom:4px}
.metric-explanation{font-size:11px;color:var(--text-dim);margin-top:4px;line-height:1.4}
.metric-notes{font-size:11px;color:var(--yellow);margin-top:6px;font-style:italic}

/* ── Badges ── */
.badge{display:inline-flex;align-items:center;padding:1px 7px;border-radius:20px;font-size:11px;font-weight:600;letter-spacing:.3px;white-space:nowrap}
.badge-user{background:rgba(88,166,255,.15);color:var(--blue)}
.badge-assistant{background:var(--bg-raised);color:var(--text-muted);border:1px solid var(--border)}
.badge-system{background:var(--bg-raised);color:var(--text-dim)}
.badge-read{background:rgba(210,153,34,.15);color:var(--yellow)}
.badge-edit{background:rgba(63,185,80,.15);color:var(--green)}
.badge-search{background:rgba(188,140,255,.15);color:var(--purple)}
.badge-semantic{background:rgba(88,166,255,.15);color:var(--blue)}
.badge-bash{background:rgba(227,179,65,.15);color:var(--orange)}
.badge-mcp{background:rgba(248,81,73,.15);color:var(--red)}
.badge-meta{background:rgba(88,166,255,.1);color:#79c0ff}
.badge-ok{background:rgba(63,185,80,.15);color:var(--green)}
.badge-error{background:rgba(248,81,73,.15);color:var(--red)}
.badge-unknown{background:var(--bg-raised);color:var(--text-dim);border:1px solid var(--border)}
.badge-verify{background:rgba(210,153,34,.15);color:var(--yellow)}

/* ── Timeline ── */
.timeline{display:flex;flex-direction:column;gap:8px}

/* Turn groups */
.turn-group{border:1px solid var(--border);border-radius:10px;overflow:hidden}
.turn-header{display:flex;align-items:center;gap:10px;padding:10px 14px;background:var(--bg-surface);cursor:pointer;user-select:none;transition:background .15s}
.turn-header:hover{background:var(--bg-raised)}
.turn-arrow{font-size:10px;color:var(--text-dim);transition:transform .2s;flex-shrink:0;width:10px}
.turn-group.collapsed .turn-arrow{transform:rotate(-90deg)}
.turn-group.collapsed .turn-body{display:none}
.turn-label{font-size:11px;font-weight:600;color:var(--text-dim);text-transform:uppercase;letter-spacing:.5px;flex-shrink:0}
.turn-user-msg{font-size:13px;color:var(--text);flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-style:italic;opacity:.85}
.turn-ts{font-size:11px;color:var(--text-dim);flex-shrink:0}
.turn-count{font-size:11px;color:var(--text-dim);background:var(--bg-raised);padding:1px 8px;border-radius:20px;flex-shrink:0}
.turn-body{border-top:1px solid var(--border);display:flex;flex-direction:column}

/* Timeline entries */
.entry{display:flex;align-items:flex-start;gap:10px;padding:8px 14px 8px 28px;background:var(--bg-surface);border-bottom:1px solid var(--border);transition:background .1s;cursor:pointer}
.entry:last-child{border-bottom:none}
.entry:hover{background:var(--bg-raised)}
.timeline>.entry{border:1px solid var(--border);border-radius:8px;padding:8px 14px}
.entry-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;margin-top:6px;background:var(--text-dim)}
.kind-user .entry-dot{background:var(--blue)}
.kind-assistant .entry-dot{background:var(--text-dim)}
.kind-tool_call .entry-dot{background:var(--purple)}
.kind-tool_result.badge-ok .entry-dot{background:var(--green)}
.kind-tool_result.badge-error .entry-dot{background:var(--red)}
.kind-system .entry-dot{background:var(--text-dim)}
.entry-body{flex:1;min-width:0}
.entry-header{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
.entry-title{font-size:13px;font-weight:500;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:500px}
.entry-ts{font-size:11px;color:var(--text-dim);margin-left:auto;flex-shrink:0}
.entry-summary{margin-top:4px;font-size:12px;color:var(--text-muted);font-family:ui-monospace,monospace;white-space:pre-wrap;word-break:break-all}

/* ── Session info ── */
.info-grid{background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:20px;font-size:13px;display:grid;grid-template-columns:auto 1fr;gap:10px 24px;align-items:baseline}
.info-key{color:var(--text-muted);font-weight:600;white-space:nowrap}
.info-val{color:var(--text);font-family:ui-monospace,monospace;word-break:break-all}

/* ── Compare ── */
.compare-session-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
.compare-card{background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;padding:16px}
.compare-card h3{font-size:14px;font-weight:600;margin-bottom:8px;color:var(--text)}
.compare-card .meta{font-size:12px;color:var(--text-dim)}
.cmp-table-wrap{background:var(--bg-surface);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.compare-table{width:100%;border-collapse:collapse}
.compare-table th{text-align:left;padding:10px 14px;font-size:11px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid var(--border);background:var(--bg-raised)}
.compare-table td{padding:10px 14px;font-size:13px;border-bottom:1px solid var(--border);color:var(--text)}
.compare-table tr:last-child td{border-bottom:none}
.compare-table tbody tr:hover td{background:var(--bg-raised)}
.delta-improve{color:var(--green);font-weight:600}
.delta-regress{color:var(--red);font-weight:600}
.delta-neutral{color:var(--text-dim)}
.status-cell-ok{color:var(--green);font-weight:600}
.status-cell-alert{color:var(--red);font-weight:600}
.status-cell-unknown{color:var(--text-dim)}
`;

const JS = `
(function(){
  // Turn group collapse/expand
  document.querySelectorAll('.turn-header').forEach(function(hdr){
    hdr.addEventListener('click',function(){
      hdr.closest('.turn-group').classList.toggle('collapsed');
    });
  });

  // Entry summary expand/collapse
  document.querySelectorAll('.entry').forEach(function(el){
    var sum=el.querySelector('.entry-summary');
    if(!sum||sum.textContent.length<80)return;
    var full=sum.textContent,short=full.slice(0,120)+'…';
    sum.textContent=short;el.dataset.expanded='0';
    el.addEventListener('click',function(){
      if(el.dataset.expanded==='0'){sum.textContent=full;el.dataset.expanded='1';}
      else{sum.textContent=short;el.dataset.expanded='0';}
    });
  });

  // Sticky nav active section highlight
  var navLinks=document.querySelectorAll('.nav-links a[href^="#"]');
  if(navLinks.length&&'IntersectionObserver' in window){
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        if(e.isIntersecting){
          navLinks.forEach(function(a){a.classList.remove('active')});
          var a=document.querySelector('.nav-links a[href="#'+e.target.id+'"]');
          if(a)a.classList.add('active');
        }
      });
    },{threshold:0.15,rootMargin:'-48px 0px 0px 0px'});
    document.querySelectorAll('section[id]').forEach(function(s){io.observe(s)});
  }
})();
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
 * @param {{ title: string, head?: string, body: string, nav?: string }} opts
 * @returns {string}
 */
export function page({ title, head = '', body, nav = '' }) {
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
${nav}
<div class="container">
${body}
</div>
<script>${JS}</script>
</body>
</html>`;
}

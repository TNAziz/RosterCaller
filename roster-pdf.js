// Reads a class photo roster PDF (e.g. NC State's "Faculty Class Photo Roster")
// entirely on this device with pdf.js. Nothing is uploaded.
//
// Layout it expects: a grid of cells, each a photo with a student ID and a name
// printed under it. Names may end in pronouns, "(she/her/hers)", and may carry
// "*" for additional FERPA restrictions. Cells without a photo are still found
// by their student ID.

const PDFJS = './vendor/pdfjs/pdf.min.mjs';
const WORKER = './vendor/pdfjs/pdf.worker.min.mjs';

let lib;
export async function loadPdfjs(base = location.href) {
  if (!lib) {
    lib = await import(new URL(PDFJS, base).href);
    lib.GlobalWorkerOptions.workerSrc = new URL(WORKER, base).href;
  }
  return lib;
}

const ID_RE = /^\*?\s*(\d{6,10})\s*\*?$/;

// Split "Doe, Jane (she/her) *" into its parts.
export function parseName(raw) {
  let s = raw.replace(/\s+/g, ' ').trim();
  const ferpa = s.includes('*');
  s = s.replace(/\*/g, '').trim();
  let pronouns = '';
  const p = s.match(/\s*\(([^()]*\/[^()]*)\)\s*$/);
  if (p) { pronouns = p[1].replace(/\s+/g, ''); s = s.slice(0, p.index).trim(); }
  const m = s.match(/^([^,]+),\s*(.+)$/);
  if (m) s = m[2] + ' ' + m[1];
  return { name: s, pronouns, ferpa };
}

function mul(m, n) {
  return [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3],
    m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];
}

// Image rectangles on a page, in viewport units (top-left origin).
async function pageImages(pdfjs, page, vp) {
  const { fnArray, argsArray } = await page.getOperatorList();
  const O = pdfjs.OPS;
  const paints = new Set([O.paintImageXObject, O.paintInlineImageXObject, O.paintJpegXObject].filter(v => v !== undefined));
  const stack = []; let ctm = [1, 0, 0, 1, 0, 0];
  const rects = [];
  for (let i = 0; i < fnArray.length; i++) {
    const fn = fnArray[i];
    if (fn === O.save) stack.push(ctm);
    else if (fn === O.restore) ctm = stack.pop() || [1, 0, 0, 1, 0, 0];
    else if (fn === O.transform) ctm = mul(ctm, argsArray[i]);
    else if (paints.has(fn)) {
      const pts = [[0, 0], [1, 0], [0, 1], [1, 1]].map(([x, y]) =>
        vp.convertToViewportPoint(ctm[0] * x + ctm[2] * y + ctm[4], ctm[1] * x + ctm[3] * y + ctm[5]));
      const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
      const r = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
      if (r.w > 20 && r.h > 20) rects.push(r);
    }
  }
  return rects;
}

// Text items merged into lines (runs on one baseline with no real gap between them).
async function pageLines(page, vp) {
  const { items } = await page.getTextContent();
  const runs = items.filter(it => it.str && it.str.trim()).map(it => {
    const [x, y] = vp.convertToViewportPoint(it.transform[4], it.transform[5]);
    const size = Math.hypot(it.transform[2], it.transform[3]) || it.height || 10;
    return { str: it.str, x, y, w: it.width * vp.scale, size };
  }).sort((a, b) => a.y - b.y || a.x - b.x);
  const lines = [];
  for (const r of runs) {
    const l = lines.find(l => Math.abs(l.y - r.y) < 2 && r.x - (l.x + l.w) < r.size * 0.6 && r.x - (l.x + l.w) > -r.size);
    if (l) {
      const gap = r.x - (l.x + l.w);
      l.str += (gap > r.size * 0.15 && !/\s$/.test(l.str) && !/^\s/.test(r.str) ? ' ' : '') + r.str;
      l.w = r.x + r.w - l.x;
    } else lines.push({ ...r });
  }
  lines.forEach(l => { l.str = l.str.replace(/\s+/g, ' ').trim(); l.cx = l.x + l.w / 2; });
  return lines;
}

function headerInfo(lines) {
  const info = {};
  for (const l of lines) {
    let m;
    if ((m = l.str.match(/^Class:\s*(.+)$/i))) info.className = m[1].replace(/\s+/g, ' ').trim();
    else if ((m = l.str.match(/^Term:\s*(.+)$/i))) info.term = m[1].trim();
    else if ((m = l.str.match(/Roster Count:\s*(\d+)/i))) info.count = +m[1];
  }
  return info;
}

// Pair photos, IDs and names on one page.
function pageCells(lines, images) {
  const used = new Set();
  const cells = [];
  const below = (x, cx, top, maxDy, span) => lines
    .filter(l => !used.has(l) && l.y > top && l.y - top < maxDy && Math.abs(l.cx - cx) < span)
    .sort((a, b) => a.y - b.y);
  const take = (cell, cand) => {
    for (const l of cand) {
      const id = l.str.match(ID_RE);
      if (id && !cell.sid) { cell.sid = id[1]; cell.ferpa = cell.ferpa || l.str.includes('*'); used.add(l); continue; }
      if (!id && !cell.raw) { cell.raw = l.str; used.add(l); }
      if (cell.raw) break;
    }
  };
  for (const img of images.sort((a, b) => a.y - b.y || a.x - b.x)) {
    const cx = img.x + img.w / 2, bottom = img.y + img.h;
    const cell = { photoRect: img };
    take(cell, below(img.x, cx, bottom, Math.max(40, img.h * 0.45), Math.max(40, img.w * 0.9)));
    if (cell.raw) cells.push(cell);
  }
  // Students printed without a photo: anchor on their ID instead.
  for (const l of lines) {
    if (used.has(l)) continue;
    const id = l.str.match(ID_RE);
    if (!id) continue;
    used.add(l);
    const cell = { sid: id[1], ferpa: l.str.includes('*') };
    take(cell, below(l.x, l.cx, l.y, 30, 70));
    if (cell.raw) cells.push(cell);
  }
  return cells;
}

// Crop a rectangle out of a rendered page into a 3:4 portrait JPEG.
function cropPhoto(canvas, r, scale) {
  let sx = r.x * scale, sy = r.y * scale, sw = r.w * scale, sh = r.h * scale;
  if (sw / sh > 0.75) { const nw = sh * 0.75; sx += (sw - nw) / 2; sw = nw; } else { const nh = sw / 0.75; sy += (sh - nh) * 0.3; sh = nh; }
  const out = document.createElement('canvas');
  out.width = Math.round(Math.min(360, sw)); out.height = Math.round(out.width / 0.75);
  out.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out.toDataURL('image/jpeg', 0.85);
}

/**
 * Read a roster PDF.
 * @param data ArrayBuffer of the PDF
 * @param opts.photos  render pages and crop photos (needs a DOM canvas)
 * @param opts.onProgress (pageNumber, pageCount)
 * @returns {{info: {className?, term?, count?}, students: {sid, name, pronouns, ferpa, photo}[]}}
 */
export async function readRosterPdf(data, { photos = true, onProgress, base } = {}) {
  const pdfjs = await loadPdfjs(base);
  const doc = await pdfjs.getDocument({ data, isEvalSupported: false, enableXfa: false, disableFontFace: !photos }).promise;
  let info = {};
  const students = [];
  try {
    for (let n = 1; n <= doc.numPages; n++) {
      if (onProgress) onProgress(n, doc.numPages);
      const page = await doc.getPage(n);
      const vp = page.getViewport({ scale: 1 });
      const lines = await pageLines(page, vp);
      if (n === 1) info = headerInfo(lines);
      const cells = pageCells(lines, await pageImages(pdfjs, page, vp));
      let canvas, scale;
      if (photos && cells.some(c => c.photoRect)) {
        // Render at about the photos' native resolution, within iOS canvas limits.
        scale = Math.min(3, Math.sqrt(12e6 / (vp.width * vp.height)));
        const v = page.getViewport({ scale });
        canvas = document.createElement('canvas');
        canvas.width = Math.ceil(v.width); canvas.height = Math.ceil(v.height);
        await page.render({ canvasContext: canvas.getContext('2d'), viewport: v }).promise;
      }
      for (const c of cells) {
        const { name, pronouns, ferpa } = parseName(c.raw);
        if (!name) continue;
        students.push({ sid: c.sid || '', name, pronouns, ferpa: ferpa || !!c.ferpa,
          photo: canvas && c.photoRect ? cropPhoto(canvas, c.photoRect, scale) : null });
      }
      if (canvas) { canvas.width = canvas.height = 0; } // free memory on iOS
      page.cleanup();
    }
  } finally {
    await doc.destroy();
  }
  return { info, students };
}

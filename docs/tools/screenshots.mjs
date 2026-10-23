// Takes the README screenshots: drives headless Chrome at iPhone size through
// the real app, importing samples/Sample_Roster.pdf (fictional students).
//
//   1. Serve the repo:   python -m http.server 5173 --bind 127.0.0.1
//   2. Start Chrome:     chrome --headless=new --remote-debugging-port=9222 --user-data-dir=<empty temp dir>
//   3. Run:              node --experimental-websocket docs/tools/screenshots.mjs [appUrl] [outDir]
import { writeFile, mkdir } from 'node:fs/promises';

const APP = process.argv[2] || 'http://127.0.0.1:5173/';
const OUT = process.argv[3] || 'docs/screenshots';
const sleep = ms => new Promise(r => setTimeout(r, ms));

const target = await (await fetch('http://127.0.0.1:9222/json/new?about:blank', { method: 'PUT' })).json();
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => ws.addEventListener('open', r, { once: true }));
let seq = 0;
const pending = new Map();
ws.addEventListener('message', m => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { pending.get(msg.id)(msg); pending.delete(msg.id); }
});
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq;
  pending.set(id, msg => msg.error ? reject(new Error(method + ': ' + msg.error.message)) : resolve(msg.result));
  ws.send(JSON.stringify({ id, method, params }));
});
const js = async (expr) => {
  const r = await send('Runtime.evaluate', { expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true });
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
  return r.result.value;
};
const shot = async (name, settle = 450) => {
  await sleep(settle);
  const { data } = await send('Page.captureScreenshot', { format: 'png' });
  await writeFile(`${OUT}/${name}.png`, Buffer.from(data, 'base64'));
  console.log('saved', name);
};

await mkdir(OUT, { recursive: true });
await send('Page.enable');
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true });
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }, { name: 'prefers-reduced-motion', value: 'no-preference' }] });
await send('Page.navigate', { url: APP });
await sleep(1500);
// Start from an empty app.
await js(`db.close(); await new Promise(r => { const q = indexedDB.deleteDatabase('rostercaller'); q.onsuccess = q.onerror = q.onblocked = r; }); localStorage.clear(); localStorage.setItem('rc.tipDismissed', 'true');`);
await send('Page.reload');
await sleep(1500);
await shot('01-welcome');

// Import the sample PDF through the normal flow; only the file picker is stubbed.
await js(`
  const blob = await fetch('samples/Sample_Roster.pdf').then(r => r.blob());
  const f = new File([blob], 'Sample_Roster.pdf', { type: 'application/pdf' });
  const orig = chooseFiles; window.chooseFiles = async () => { window.chooseFiles = orig; return [f]; };
  importRosterPdf();
  for (let i = 0; i < 100 && !state.pdfImport; i++) await new Promise(r => setTimeout(r, 100));`);
await shot('02-import-review');
await js(`await doImport();`);
await shot('03-import-done');
await js(`closeDialog(true); go('roster');`);
await shot('04-roster');

await js(`closeDialog(true); go('call');`);
await shot('05-call-ready');
await js(`pick();`);
await shot('06-call-picking', 1000);
await sleep(2200);
await shot('07-call-picked', 200);
await js(`await mark('answered');`);
await shot('08-call-marked');

// A few more marks so History has something to show.
await js(`
  for (const t of ['no_answer', 'answered', 'answered', 'absent', 'answered']) {
    state.current = choose(); state.marked = false; await mark(t);
  }
  state.current = null; state.marked = false; renderCall();`);
await js(`go('learn'); setLearnMode('cards'); state.learn.revealed = true; renderLearn();`);
await shot('09-learn-flashcards');
await js(`setLearnMode('mc'); const w = state.learn.choices.find(c => c.id !== state.learn.card.id); await learnChoose(w.id);`);
await shot('10-learn-choice');
await js(`go('history');`);
await shot('11-history');
await js(`exportDialog();`);
await shot('12-export');
await js(`closeDialog(true); settingsDialog();`);
await shot('13-settings');

// Leave the browser profile empty again.
await js(`closeDialog(true); db.close(); await new Promise(r => { const q = indexedDB.deleteDatabase('rostercaller'); q.onsuccess = q.onerror = q.onblocked = r; }); localStorage.clear();`);
ws.close();

// 라이트/다크 테마 스크린샷: dist/index.html 을 file:// 로 열어 시작 화면과 인생 화면(10세)을 두 테마로 찍는다.
//   node build/shot-theme.js [dist/index.html 경로] [브라우저 exe 경로]  → docs/ui-mock/{start,life}-{light,dark}.png
const { spawn } = require('child_process'); const fs = require('fs'); const os = require('os'); const path = require('path');
const CANDIDATES = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'];
const HTML = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist', 'index.html'));
const CHROME = process.argv[3] || CANDIDATES.find((p) => fs.existsSync(p));
const OUT = path.join(__dirname, '..', 'docs', 'ui-mock');
const URL_ = 'file:///' + HTML.split(path.sep).map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
const PORT = 9335;
const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'arkdays-cdp-shot-'));
const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--window-size=1280,900', `--remote-debugging-port=${PORT}`, `--user-data-dir=${udd}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(p) { return (await fetch(`http://127.0.0.1:${PORT}${p}`)).json(); }
(async () => {
  let targets; for (let i = 0; i < 50; i++) { try { targets = await json('/json/list'); break; } catch (e) { await sleep(200); } }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => ws.onopen = r);
  let id = 0; const pend = new Map();
  ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id) { const p = pend.get(d.id); pend.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); } };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; };
  const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, 'base64')); console.log('saved', name); };
  await send('Runtime.enable'); await send('Page.enable');
  await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
  for (const theme of ['light', 'dark']) {
    await send('Page.navigate', { url: URL_ }); await sleep(1200);
    await ev(`(() => { __app.prefs.theme = '${theme}'; __app.actions.save && 0; localStorage.setItem('tr1.prefs', JSON.stringify(__app.prefs)); location.reload(); })()`); await sleep(1500);
    await shot(`start-${theme}.png`);
    await ev('(() => { document.querySelector("#btn-born").click(); })()'); await sleep(500);
    await ev('(() => { const b=[...document.querySelectorAll("#cert button")].find(x=>/시작|살아/.test(x.textContent)); b.click(); })()'); await sleep(500);
    await ev(`(() => { const a=__app, S=a.S; a.actions.toggleAuto(true); S.paused=false; let g=0; while (S.phase==='life' && S.age < 12 && g++ < 20000) { a.sim.tick(0.5); if (S.pending) a.sim.autoChoice(); } S.paused=true; return S.age; })()`); await sleep(600);
    await shot(`life-${theme}.png`);
    await ev('(() => { localStorage.removeItem("tr1.save"); })()');
  }
  ws.close(); ch.kill(); setTimeout(() => { try { fs.rmSync(udd, { recursive: true, force: true }); } catch (e) {} process.exit(0); }, 500);
})().catch((e) => { console.error('FAIL', e); ch.kill(); process.exit(1); });

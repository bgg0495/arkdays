// dist/index.html 을 file:// 로 열어 여러 생을 끝까지(사망 화면까지) 자동으로 돌리는 검증 스크립트.
//   node build/verify-death.js [생 수=3] [dist/index.html 경로] [브라우저 exe 경로]
// 각 생마다: 태어나기 → 삶 시작 → 자동 결정으로 사망까지 tick → 사망 화면 DOM 확인(요약문·사인·장례 한 줄) → 다시 태어나기.
// 종료 코드 0 = 통과, 2 = 콘솔 에러/예외, 1 = 스크립트 실패. (build/verify.js 와 같은 CDP 보일러플레이트)
const { spawn } = require('child_process'); const fs = require('fs'); const os = require('os'); const path = require('path');
const CANDIDATES = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const N = +(process.argv[2] || 3);
const HTML = path.resolve(process.argv[3] || path.join(__dirname, '..', 'dist', 'index.html'));
const CHROME = process.argv[4] || CANDIDATES.find((p) => fs.existsSync(p));
if (!CHROME) { console.error('Chrome/Edge 를 찾지 못했습니다.'); process.exit(1); }
const URL_ = 'file:///' + HTML.split(path.sep).map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
const PORT = 9334;
const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'arkdays-cdp-death-'));
const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${PORT}`, `--user-data-dir=${udd}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(p) { return (await fetch(`http://127.0.0.1:${PORT}${p}`)).json(); }
(async () => {
  let targets; for (let i = 0; i < 50; i++) { try { targets = await json('/json/list'); break; } catch (e) { await sleep(200); } }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.onopen = r);
  let id = 0; const pend = new Map(); const errors = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data);
    if (d.id) { const p = pend.get(d.id); pend.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); }
    else if (d.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
    else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('CONSOLE ' + d.params.args.map((a) => a.value ?? a.description).join(' '));
    else if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errors.push('LOG ' + d.params.entry.text);
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await send('Page.navigate', { url: URL_ }); await sleep(1500);
  const lives = [];
  for (let n = 0; n < N; n++) {
    await ev('(() => { const b=document.querySelector("#btn-born"); if (b) b.click(); else __app.actions.born(); })()'); await sleep(400);
    await ev('(() => { const b=[...document.querySelectorAll("#cert button")].find(x=>/시작|살아/.test(x.textContent)); if (b) b.click(); else __app.actions.startLife(); })()'); await sleep(400);
    const r = await ev(`(() => { const a=__app, S=a.S; a.actions.toggleAuto(true); S.paused=false; let g=0;
      while (S.phase==='life' && g++ < 60000) { a.sim.tick(0.5); if (S.pending) a.sim.autoChoice(); }
      return { name:S.name.full, born:S.born, race:S.race, age:S.age, phase:S.phase, ticks:g, death:S.deathAt }; })()`);
    await sleep(1200);
    const dead = await ev(`(() => { const d=document.querySelector("#dead"); const t=(sel)=>d&&d.querySelector(sel)?d.querySelector(sel).textContent.replace(/\\s+/g," ").trim():null;
      return { screen: __app.screen, lead: t(".lead"), cause: t(".cause"), causeF: d && d.querySelector(".cause + .footnote") ? d.querySelector(".cause + .footnote").textContent.trim() : null, rite: t(".rite"), compare: t(".compare"), saveLeft: !!localStorage.getItem("tr1.save"), summaryCells: d ? d.querySelectorAll(".cell").length : 0 }; })()`);
    // D36: "복사하기"가 화면에 보이는 사망 기록 전체(번호·요약문·사인·비교·장례·요약 셀·돌아보며)를 평문으로 클립보드에 넘기는지.
    // navigator.clipboard.writeText 를 가로채 받은 문자열을 화면 텍스트와 대조한다. 캐치프레이즈·해시태그·'명생게임' 이 없어야 한다.
    const copy = await ev(`(async () => { const d=document.querySelector("#dead"); const norm=(s)=>String(s||"").replace(/\\s+/g," ").trim();
      let got=null; navigator.clipboard.writeText=(t)=>{ got=t; return Promise.resolve(); };
      d.querySelector("#btn-copy").click(); await new Promise((r)=>setTimeout(r,100));
      const text=norm(got); const miss=[];
      const own=(e)=>{ const c=e.cloneNode(true); c.querySelectorAll(".footnote").forEach((x)=>x.remove()); c.querySelectorAll("br").forEach((x)=>x.replaceWith(" ")); return norm(c.textContent); };
      const need=(sel,all)=>{ for (const e of (all?d.querySelectorAll(sel):[d.querySelector(sel)])) { if (!e) { miss.push(sel+"(없음)"); continue; } const t=own(e); if (t && !text.includes(t)) miss.push(sel+": "+t.slice(0,40)); } };
      need(".doc-no"); need(".person-name"); need(".doc-meta"); need(".lead",true); need(".cause"); need(".cause-block .footnote",true); need(".compare li",true); need(".rite"); need(".note"); need(".cell-v",true);
      const forb=["#","너라면","명생게임"].filter((w)=>text.includes(w));
      return { copied: !!got, length: (got||"").length, lines: (got||"").split("\\n").length, missing: miss.filter((m)=>!m.startsWith(".note(")), forbidden: forb, toast: document.querySelector("#toast")?.textContent, hasTextareaPreview: !!d.querySelector(".share-text, #share-text") }; })()`);
    lives.push({ ...r, dead, copy });
    await ev('(() => { const b=document.querySelector("#btn-rebirth"); if (b) b.click(); else __app.actions.rebirth(); })()'); await sleep(600);
  }
  console.log(JSON.stringify({ lives, errors }, null, 1));
  const bad = lives.filter((l) => l.phase !== 'dead' || l.dead.screen !== 'dead' || !l.dead.lead || !l.dead.rite
    || !l.copy || !l.copy.copied || l.copy.missing.length || l.copy.forbidden.length || l.copy.hasTextareaPreview);
  console.log(errors.length || bad.length ? `\n실패: 에러 ${errors.length}건, 사망 화면 미완성 ${bad.length}생` : `\n통과: ${N}생 모두 사망 화면 도달 · 에러 0`);
  ws.close(); ch.kill(); setTimeout(() => { try { fs.rmSync(udd, { recursive: true, force: true }); } catch (e) {} process.exit(errors.length || bad.length ? 2 : 0); }, 500);
})().catch((e) => { console.error('TEST FAIL', e); ch.kill(); process.exit(1); });

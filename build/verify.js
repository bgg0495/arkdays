// dist/index.html 을 진짜 file:// 로 열어 플레이해 보는 검증 스크립트(Chrome/Edge headless + DevTools 프로토콜, 의존성 0).
//   node build/verify.js [dist/index.html 경로] [브라우저 exe 경로]
// 시작 → 태어나기 → 삶을 시작하기 → 10세(자동 결정) → localStorage 저장 → 새로고침 → 이어하기 → 12세 → 변환 불가 구 세이브는 토스트 후 삭제(v1 §14). 콘솔 에러·예외·외부 요청을 모읍니다.
// 종료 코드 0 = 통과, 2 = 콘솔 에러/예외 있음, 1 = 스크립트 실패.
const { spawn } = require('child_process'); const fs = require('fs'); const os = require('os'); const path = require('path');
const CANDIDATES = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'];
const HTML = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist', 'index.html'));
const CHROME = process.argv[3] || CANDIDATES.find((p) => fs.existsSync(p));
if (!CHROME) { console.error('Chrome/Edge 를 찾지 못했습니다. 두 번째 인자로 exe 경로를 주세요.'); process.exit(1); }
const URL_ = 'file:///' + HTML.split(path.sep).map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
const PORT = 9333;
const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'arkdays-cdp-'));
const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', `--remote-debugging-port=${PORT}`, `--user-data-dir=${udd}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(p) { return (await fetch(`http://127.0.0.1:${PORT}${p}`)).json(); }
(async () => {
  let targets; for (let i = 0; i < 50; i++) { try { targets = await json('/json/list'); break; } catch (e) { await sleep(200); } }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((r) => ws.onopen = r);
  let id = 0; const pend = new Map(); const errors = []; const logs = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data);
    if (d.id) { const p = pend.get(d.id); pend.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); }
    else if (d.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
    else if (d.method === 'Runtime.consoleAPICalled') { const t = d.params.args.map((a) => a.value ?? a.description).join(' '); logs.push(d.params.type + ': ' + t); if (d.params.type === 'error') errors.push('CONSOLE ' + t); }
    else if (d.method === 'Log.entryAdded') { logs.push('log/' + d.params.entry.level + ': ' + d.params.entry.text); if (d.params.entry.level === 'error') errors.push('LOG ' + d.params.entry.text + ' ' + (d.params.entry.url || '')); }
    else if (d.method === 'Network.requestWillBeSent') logs.push('REQ ' + d.params.request.url.slice(0, 100));
  };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable'); await send('Network.enable');
  await send('Page.navigate', { url: URL_ }); await sleep(1500);
  const out = {};
  out.location = await ev('location.protocol + " " + document.title');
  out.start = await ev('({screen: __app.screen, h1: document.querySelector("#start h1").textContent, sub: document.querySelector("#start .doc-sub").textContent, btn: !!document.querySelector("#btn-born"), resumeBtn: !!document.querySelector("#btn-resume")})');
  // 1) 태어나기 클릭 → 출생 신고서
  await ev('document.querySelector("#btn-born").click()'); await sleep(300);
  out.cert = await ev('({screen: __app.screen, phase: __app.S.phase, name: __app.S.name.full, born: __app.S.born, race: __app.S.race, certText: document.querySelector("#cert").textContent.replace(/\s+/g," ").slice(0,160)})');
  // 2) 시작 버튼(신고서 화면의 버튼 중 startLife 를 부르는 것) → 생애 화면. 없으면 액션 직접 호출.
  await ev('(() => { const b=[...document.querySelectorAll("#cert button")]; const s=b.find(x=>/태어|시작|살아/.test(x.textContent)); if (s) s.click(); else __app.actions.startLife(); return b.map(x=>x.textContent) })()').then((b) => out.certButtons = b);
  await sleep(300);
  out.life0 = await ev('({screen: __app.screen, phase: __app.S.phase, age: __app.S.age, barTitle: document.querySelector(".bar-title")?.textContent})');
  // 3) 자동 결정 켜고 10세까지 틱(수동 tick 으로 빠르게). 결정은 autoChoice.
  // 10세 전에 죽으면(영아 사망) 저장이 지워져 이어하기를 시험할 수 없으므로 다시 태어나 재시도한다
  for (let tries = 0; tries < 6; tries++) {
    out.toTen = await ev(`(() => { const a=__app, S=a.S; a.actions.toggleAuto(true); S.paused=false; let g=0;
      while (S.phase==='life' && S.age < 10 && g++ < 20000) { a.sim.tick(0.5); if (S.pending) a.sim.autoChoice(); }
      a.actions.save(); return {age:S.age, phase:S.phase, ticks:g, logLines:(S.log||[]).length, pending:!!S.pending, dead:S.deathAt||null}; })()`);
    if (out.toTen.phase === 'life') break;
    await sleep(1200);
    await ev('(() => { const b=document.querySelector("#btn-rebirth"); if (b) b.click(); else __app.actions.rebirth(); })()'); await sleep(300);
    await ev('(() => { const b=[...document.querySelectorAll("#cert button")].find(x=>/시작|살아/.test(x.textContent)); if (b) b.click(); else __app.actions.startLife(); })()'); await sleep(300);
    out.retries = tries + 1;
  }
  await sleep(200);
  out.rendered = await ev('({ageOnBar: document.querySelector(".bar-age")?.textContent, logDom: document.querySelectorAll("#life .log li, #life .log > *").length, lifeTextLen: document.querySelector("#life").textContent.length})');
  // 4) localStorage 저장 확인
  out.storage = await ev('(() => { const s=JSON.parse(localStorage.getItem("tr1.save")||"null"); return {hasSave:!!s, savedAge:s&&s.S.age, savedName:s&&s.S.name.full, prefs:localStorage.getItem("tr1.prefs"), rolls:localStorage.getItem("tr1.rolls"), keys:Object.keys(localStorage)}; })()');
  // 5) 새로고침 → 이어하기 버튼 → 같은 나이·이름
  await send('Page.reload'); await sleep(1500);
  out.afterReload = await ev('({screen: __app.screen, resumeBtn: document.querySelector("#btn-resume")?.textContent.replace(/\s+/g," ")})');
  await ev('document.querySelector("#btn-resume").click()'); await sleep(400);
  out.resumed = await ev('({screen: __app.screen, age: __app.S.age, name: __app.S.name.full, paused: __app.S.paused, toast: document.querySelector("#toast")?.textContent})');
  // 6) 이어서 2년 더 진행 후 저장 갱신 확인
  out.more = await ev(`(() => { const a=__app, S=a.S; S.paused=false; let g=0; while (S.phase==='life' && S.age < 12 && g++ < 20000) { a.sim.tick(0.5); if (S.pending) a.sim.autoChoice(); } a.actions.save(); return {age:S.age, savedAge: JSON.parse(localStorage.getItem('tr1.save')).S.age}; })()`);
  // 7) v1 저장 호환(§14): 변환할 수 없는 구 세이브(st 없음)는 시작 화면에서 이어하기 없이 토스트 후 삭제되어야 한다
  // (살아 있는 sim 이 있으면 beforeunload 가 다시 저장하므로 먼저 떼어 낸다)
  await ev('(() => { __app.actions.exitToStart(); __app.sim = null; localStorage.setItem("tr1.save", JSON.stringify({ S: { phase: "life", v: 1, age: 3, name: { full: "옛 기록" }, cur: "yan", flags: {} }, at: Date.now() })); })()'); await sleep(300);
  await send('Page.reload'); await sleep(1500);
  out.oldSave = await ev('({screen: __app.screen, resumeBtn: !!document.querySelector("#btn-resume"), saveLeft: !!localStorage.getItem("tr1.save"), toast: document.querySelector("#toast")?.textContent})');
  if (out.oldSave.resumeBtn || out.oldSave.saveLeft || !/이전 버전/.test(out.oldSave.toast || '')) errors.push('OLDSAVE 구 세이브 처리 실패 ' + JSON.stringify(out.oldSave));
  out.errors = errors; out.requests = logs.filter((l) => l.startsWith('REQ'));
  out.otherLogs = logs.filter((l) => !l.startsWith('REQ')).slice(0, 20);
  console.log(JSON.stringify(out, null, 1));
  console.log(errors.length ? `
실패: 에러 ${errors.length}건` : `
통과: ${URL_} · 에러 0 · 요청 ${out.requests.length}건(index.html 자체 로드)`);
  ws.close(); ch.kill(); setTimeout(() => { try { fs.rmSync(udd, { recursive: true, force: true }); } catch (e) {} process.exit(errors.length ? 2 : 0); }, 500);
})().catch((e) => { console.error('TEST FAIL', e); ch.kill(); process.exit(1); });

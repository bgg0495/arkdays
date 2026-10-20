// v1(W10) 스크린샷: dist/index.html 을 file:// 로 열어 진로가 자리 잡은 성인(≈35세)의 인생 화면, 결정 모달, 사망 기록을 찍는다.
//   node build/shot-v1.js [dist/index.html 경로] [브라우저 exe 경로]
//   → docs/ui-mock/life-v1.png, life-v1-mobile.png(375px), decision-v1.png, dead-v1.png, dead-v1-mobile.png. 콘솔 에러가 있으면 종료 코드 2.
const { spawn } = require('child_process'); const fs = require('fs'); const os = require('os'); const path = require('path');
const CANDIDATES = ['C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe'];
const HTML = path.resolve(process.argv[2] || path.join(__dirname, '..', 'dist', 'index.html'));
const CHROME = process.argv[3] || CANDIDATES.find((p) => fs.existsSync(p));
const OUT = path.join(__dirname, '..', 'docs', 'ui-mock');
const URL_ = 'file:///' + HTML.split(path.sep).map(encodeURIComponent).join('/').replace(/^([A-Za-z])%3A/, '$1:');
const PORT = 9336;
const udd = fs.mkdtempSync(path.join(os.tmpdir(), 'arkdays-cdp-v1-'));
const ch = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--window-size=1280,900', `--remote-debugging-port=${PORT}`, `--user-data-dir=${udd}`, 'about:blank'], { stdio: 'ignore' });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
async function json(p) { return (await fetch(`http://127.0.0.1:${PORT}${p}`)).json(); }
(async () => {
  let targets; for (let i = 0; i < 50; i++) { try { targets = await json('/json/list'); break; } catch (e) { await sleep(200); } }
  const page = targets.find((t) => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl); await new Promise((r) => ws.onopen = r);
  let id = 0; const pend = new Map(); const errors = [];
  ws.onmessage = (m) => { const d = JSON.parse(m.data);
    if (d.id) { const p = pend.get(d.id); pend.delete(d.id); d.error ? p.rej(new Error(JSON.stringify(d.error))) : p.res(d.result); }
    else if (d.method === 'Runtime.exceptionThrown') errors.push('EXC ' + (d.params.exceptionDetails.exception?.description || d.params.exceptionDetails.text));
    else if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push('CONSOLE ' + d.params.args.map((a) => a.value ?? a.description).join(' '));
    else if (d.method === 'Log.entryAdded' && d.params.entry.level === 'error') errors.push('LOG ' + d.params.entry.text); };
  const send = (method, params = {}) => new Promise((res, rej) => { const i = ++id; pend.set(i, { res, rej }); ws.send(JSON.stringify({ id: i, method, params })); });
  const ev = async (expr) => { const r = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (r.exceptionDetails) throw new Error('eval: ' + (r.exceptionDetails.exception?.description || r.exceptionDetails.text)); return r.result.value; };
  const size = (w, h, mobile) => send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  const shot = async (name, full) => { const r = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: !!full }); fs.writeFileSync(path.join(OUT, name), Buffer.from(r.data, 'base64')); console.log('saved', name); };
  await send('Runtime.enable'); await send('Log.enable'); await send('Page.enable');
  await size(1280, 900, false);
  await send('Page.navigate', { url: URL_ }); await sleep(1200);
  await ev(`(() => { __app.prefs.theme = 'dark'; localStorage.setItem('tr1.prefs', JSON.stringify(__app.prefs)); location.reload(); })()`); await sleep(1500);
  // 진로가 있는 성인까지: 최대 6번 다시 태어나 35세에 진로가 있는 생을 고른다
  let info = null;
  for (let tries = 0; tries < 6; tries++) {
    await ev('(() => { const b=document.querySelector("#btn-born"); if (b) b.click(); else __app.actions.rebirth(); })()'); await sleep(400);
    const cert = await ev('(() => ({ caps: document.querySelector("#cert .caps")?.textContent.replace(/\\s+/g," "), rel: document.querySelector("#cert .rel-line")?.textContent, traits: [...document.querySelectorAll("#cert dt")].map(d=>d.textContent).includes("타고남") }))()');
    console.log('cert', JSON.stringify(cert));
    await shot('cert-v1.png', true);
    await ev('(() => { const b=[...document.querySelectorAll("#cert button")].find(x=>/시작|살아/.test(x.textContent)); b.click(); })()'); await sleep(400);
    info = await ev(`(() => { const a=__app, S=a.S; a.actions.toggleAuto(true); S.paused=false; let g=0; while (S.phase==='life' && S.age < 35 && g++ < 30000) { a.sim.tick(0.5); if (S.pending) a.sim.autoChoice(); } S.paused=true; a.dirty=true; return { age:S.age, phase:S.phase, track:S.track&&S.track.id, name:S.name.full, cur:S.cur, rhodes:!!S.rhodes }; })()`);
    console.log('life', tries, JSON.stringify(info));
    if (info.phase === 'life' && info.track) break;
    if (info.phase === 'dead') { await sleep(1200); await ev('(() => { localStorage.removeItem("tr1.save"); const b=document.querySelector("#btn-rebirth"); if (b) b.click(); })()'); await sleep(500); }
    else await ev('(() => { localStorage.removeItem("tr1.save"); __app.actions.exitToStart(); })()'), await sleep(400);
  }
  await sleep(600);
  const card = await ev('(() => ({ status: document.querySelector("#life .id-status")?.textContent, standing: document.querySelector("#life .standing")?.textContent, caps: document.querySelector("#life .caps")?.textContent.replace(/\\s+/g," "), res: [...document.querySelectorAll("#life .id-kv dt")].map(d=>d.textContent), stats: document.querySelectorAll("#lf-stats .stat").length, rhodes: !document.querySelector("#lf-rhodes").hidden }))()');
  console.log('card', JSON.stringify(card));
  await shot('life-v1.png');
  // 진로 선택 모달(track_choose)·로도스 블록은 매 생에 나오지 않으므로 UI 목업용으로 상태를 꾸며 찍는다(세이브엔 남지 않게 뒤에 되돌린다)
  const mock = await ev(`(() => { const a=__app, S=a.S; a.actions.toggleAuto(false); const list=Object.values(a.data.trackById).filter(t=>t.nation===S.cur && !t.forcedEntry && !t.noClasses).slice(0,3);
    const choices=list.map(t=>({ k:t.id, label:t.name, sub:(t.stages[0].title||t.stages[0].name)+(t.affiliations.length?' · 소속 '+t.affiliations.map(id=>a.data.affById[id]&&a.data.affById[id].name).filter(Boolean).slice(0,2).join('·'):'')+(t.special?' · 이 나라의 길':'') })).concat([{k:'wait',label:'한 해 더 본다'}]);
    a.sim.HOOK.decision({ id:'track_choose', p:{}, view:{ title:'길을 고를 때', body:'올해 들어갈 수 있는 자리가 몇 있습니다. 하나를 고르면 당분간은 그 길입니다.', choices } });
    return { n: choices.length, subs: [...document.querySelectorAll('#modal .choice-sub')].map(x=>x.textContent) }; })()`);
  console.log('track_choose mock', JSON.stringify(mock));
  await sleep(300); await shot('decision-track-v1.png');
  await ev('(() => { document.querySelector("#modal").hidden = true; document.querySelector("#modal").innerHTML = ""; })()');
  const rh = await ev(`(() => { const a=__app, S=a.S; const keep = JSON.stringify({ rhodes:S.rhodes, cur:S.cur, res:S.res, track:S.track });
    S.rhodes = { via:'volunteer', status:'operator', dept:'field', since: Math.max(18, S.age-5) }; S.cur='rhodes'; S.res={ nation:'rhodes', papers:'agreement', since:S.age-5, phase:'settled', itinerantAt: S.born }; S.track=null;
    a.dirty = true; S.flags.__keep = keep; return [...document.querySelectorAll('#lf-rhodes .op-row')].length; })()`);
  await sleep(400);
  const rhDom = await ev('(() => ({ hidden: document.querySelector("#lf-rhodes").hidden, head: document.querySelector("#lf-rhodes .fold-head")?.textContent.replace(/\\s+/g," "), rows: [...document.querySelectorAll("#lf-rhodes .op-row")].map(r=>r.textContent), res: document.querySelector("#life .id-kv")?.textContent.replace(/\\s+/g," ").slice(0,160) }))()');
  console.log('rhodes operator', JSON.stringify(rhDom));
  await ev('window.scrollTo(0, 0)'); await shot('rhodes-operator-v1.png');
  await ev(`(() => { const a=__app, S=a.S; S.rhodes = { via:'treatment', status:'patient', dept:'patient', since: Math.max(18, S.age-2) }; if (!S.ori.on) { S.ori.on=true; S.ori.known=true; S.ori.uL=0.22; S.ori.stage=1; } a.dirty=true; })()`); await sleep(400);
  const cl = await ev('(() => ({ clinic: document.querySelector("#lf-rhodes .clinic")?.textContent.replace(/\\s+/g," ") }))()');
  console.log('rhodes patient', JSON.stringify(cl));
  await shot('rhodes-patient-v1.png');
  await ev(`(() => { const a=__app, S=a.S; const k=JSON.parse(S.flags.__keep); delete S.flags.__keep; Object.assign(S, k); a.dirty=true; })()`); await sleep(300);
  // 결정 모달: 다음 결정까지 수동 진행(자동 결정 끔)
  const dec = await ev(`(() => { const a=__app, S=a.S; a.actions.toggleAuto(false); S.paused=false; let g=0; while (S.phase==='life' && !S.pending && g++ < 30000) a.sim.tick(0.5); a.dirty=true; return S.pending ? { id:S.pending.id, title:S.pending.view.title, n:S.pending.view.choices.length, subs:S.pending.view.choices.map(c=>document.querySelector('#modal') && [...document.querySelectorAll('#modal .choice-sub')].map(x=>x.textContent)) } : null; })()`);
  await sleep(500);
  console.log('decision', JSON.stringify(dec && { id: dec.id, title: dec.title, n: dec.n, subs: dec.subs && dec.subs[0] }));
  const modalOpen = await ev('!document.querySelector("#modal").hidden && __app.S.phase === "life"');
  if (modalOpen) await shot('decision-v1.png');
  await size(375, 812, true); await sleep(400);
  const overflow = await ev('({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })');
  console.log('375px overflow', JSON.stringify(overflow));
  if (modalOpen) await shot('decision-v1-mobile.png');
  await ev('(() => { if (__app.S.pending) __app.actions.autoChooseNow(); })()'); await sleep(300);
  if (await ev('__app.S.phase === "life"')) await shot('life-v1-mobile.png'); else console.log('life-v1-mobile 생략(결정 전 사망)');
  await size(1280, 900, false); await sleep(300);
  // 사망까지
  const dead = await ev(`(() => { const a=__app, S=a.S; a.actions.toggleAuto(true); S.paused=false; let g=0; while (S.phase==='life' && g++ < 60000) { a.sim.tick(0.5); if (S.pending) a.sim.autoChoice(); } return { age:S.age, phase:S.phase, death:S.deathAt&&S.deathAt.label, hist:(S.trackHist||[]).length }; })()`);
  await sleep(1400);
  console.log('dead', JSON.stringify(dead));
  const deadDom = await ev('(() => { const d=document.querySelector("#dead"); return { screen: __app.screen, lead: d.querySelector(".lead")?.textContent, cells: [...d.querySelectorAll(".cell")].map(c=>c.querySelector(".cell-k").textContent+": "+c.querySelector(".cell-v").textContent) }; })()');
  console.log('deadDom', JSON.stringify(deadDom, null, 1));
  await shot('dead-v1.png', true);
  await size(375, 812, true); await sleep(400);
  const overflow2 = await ev('({ sw: document.documentElement.scrollWidth, cw: document.documentElement.clientWidth })');
  console.log('375px overflow(dead)', JSON.stringify(overflow2));
  await shot('dead-v1-mobile.png');
  console.log(errors.length ? '\n에러 ' + errors.length + '건:\n' + errors.join('\n') : '\n콘솔 에러 0');
  ws.close(); ch.kill(); setTimeout(() => { try { fs.rmSync(udd, { recursive: true, force: true }); } catch (e) {} process.exit(errors.length ? 2 : 0); }, 500);
})().catch((e) => { console.error('FAIL', e); ch.kill(); process.exit(1); });

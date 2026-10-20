// 배포 빌드(D29): src/main.js 를 esbuild IIFE 한 덩어리로 묶고 data/*.json 을 window.__DATA__ 로,
// src/ui/style.css 를 <style> 로 인라인해 dist/index.html 한 파일을 만든다. file:// 더블클릭으로 동작(외부 요청 0).
// 제목(D28)은 src/ui/text.js 등을 고치지 않고 아래 REPLACE 표로 빌드 시 치환한다(설계 명세 "W5a 메모" 참조).
//   node build/build.js [--no-minify] [--out dist/index.html]
'use strict';
const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const MINIFY = !args.includes('--no-minify');
const OUT = path.resolve(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'dist/index.html');

const TITLE_KO = '금일방주';
const TITLE_EN = 'Arkdays';

// ── 치환 표 (파일 상대경로 → [찾을 문자열, 바꿀 문자열][]) ───────────────────────────
// 찾을 문자열은 반드시 그 파일에 있어야 한다(없으면 빌드 실패 → 원본이 바뀌었으니 표를 갱신).
const REPLACE = {
  'src/index.html': [
    ['<title>명생게임 — 테라에서 한 생</title>', `<title>${TITLE_KO} ${TITLE_EN} — 테라에서 한 생</title>`],
  ],
  'src/ui/screens/start.js': [
    ['<h1 class="doc-title">명생게임</h1>', `<h1 class="doc-title">${TITLE_KO}<small class="doc-title-en">${TITLE_EN}</small></h1>`],
    ['<p class="doc-sub">테라의 어딘가에서, 누군가로, 한 번. 통계로 한 생을 살아 봅니다.</p>',
     '<p class="doc-sub"><span class="tagline">몇 억 분의 1</span>테라의 어딘가에서, 누군가로, 한 번. 통계로 한 생을 살아 봅니다.</p>'],
  ],
  'src/ui/screens/life.js': [
    ['<span class="bar-title">명생게임</span>', `<span class="bar-title">${TITLE_KO}</span>`],
  ],
  // src/ui/text.js 의 공유 문구('[명생게임] …', '#명생게임')는 D36 으로 삭제됨 → 치환 항목 없음.
};

const DATA_FILES = { nations: 'nations.json', races: 'races.json', jobs: 'jobs.json', causes: 'causes.json', names: 'names.json', stats1950: 'stats1950.json', terra: 'terra_e0.json',
  // v1(W7/W8): 진로·소속·관계·혼인·주거·로도스·캐논 인물. 없으면 엔진이 기본값(합성 생업 진로)으로 돈다 — canon_figures 외에는 경고.
  affiliations: 'affiliations.json', relations: 'relations.json', marriage: 'marriage.json', housing: 'housing.json', rhodes: 'rhodes.json', canon_figures: 'canon_figures.json' };
const OPTIONAL_DATA = new Set(['terra', 'affiliations', 'relations', 'marriage', 'housing', 'rhodes', 'canon_figures']);
const TRACKS_DIR = 'data/tracks';   // 폴더 안 *.json 전부를 배열로(test/sim.js loadData 와 같은 모양: [{_meta, tracks:[…]}, …])

function read(rel) { return fs.readFileSync(path.join(ROOT, rel), 'utf8'); }
function applyReplace(rel, text) {
  const table = REPLACE[rel];
  if (!table) return text;
  for (const [from, to] of table) {
    if (!text.includes(from)) throw new Error(`치환 대상이 없습니다: ${rel} ← ${JSON.stringify(from)}`);
    text = text.split(from).join(to);
  }
  return text;
}
// 인라인 <script>/<style> 안에서 태그를 닫아 버리는 문자열 무력화. JS 문자열·정규식·템플릿 안에서 \/ 는 / 와 같다.
function safeScript(js) { return js.replace(/<\/script/gi, '<\/script').replace(/<!--/g, '<\!--'); }
function safeStyle(css) { return css.replace(/<\/style/gi, '<\/style'); }
function kb(n) { return (n / 1024).toFixed(1) + ' KB'; }

// 치환 플러그인: 번들에 들어가는 소스 파일을 읽을 때 표를 적용한다(src/ 원본은 그대로).
const replacePlugin = {
  name: 'title-replace',
  setup(build) {
    build.onLoad({ filter: /\.js$/ }, (a) => {
      const rel = path.relative(ROOT, a.path).split(path.sep).join('/');
      if (!REPLACE[rel]) return null;
      return { contents: applyReplace(rel, fs.readFileSync(a.path, 'utf8')), loader: 'js' };
    });
  },
};

async function main() {
  const t0 = Date.now();
  // 1) JS 번들
  const result = await esbuild.build({
    entryPoints: [path.join(ROOT, 'src/main.js')],
    bundle: true, format: 'iife', platform: 'browser', target: ['es2020'],
    minify: MINIFY, charset: 'utf8', legalComments: 'none', write: false,
    plugins: [replacePlugin],
    // data-loader.js 의 fetch 경로는 window.__DATA__ 가 있으면 실행되지 않는다. import.meta.url 은 그 경로에서만 쓰인다.
    logOverride: { 'empty-import-meta': 'silent' },
  });
  for (const w of result.warnings) console.warn('esbuild 경고:', w.text);
  const js = result.outputFiles[0].text;
  // 치환이 번들에 실제로 들어갔는지 확인
  for (const rel of Object.keys(REPLACE)) if (rel.endsWith('.js')) for (const [, to] of REPLACE[rel]) {
    const probe = to.replace(/^'|'$/g, '');
    if (!js.includes(probe)) throw new Error(`치환 결과가 번들에 없습니다: ${rel} → ${JSON.stringify(to)}`);
  }
  if (js.includes('명생게임')) console.warn('주의: 번들에 "명생게임" 문자열이 남아 있습니다(치환 표 밖).');

  // 2) 데이터
  const data = {};
  const sizes = {};
  for (const [key, file] of Object.entries(DATA_FILES)) {
    const p = path.join(ROOT, 'data', file);
    if (!fs.existsSync(p)) { if (OPTIONAL_DATA.has(key)) { console.warn(file + ' 없음 → 엔진 기본값으로 동작'); continue; } throw new Error('데이터 파일 없음: ' + file); }
    const txt = fs.readFileSync(p, 'utf8');
    data[key] = JSON.parse(txt);              // 파싱해 JSON 오류를 빌드 시점에 잡는다
    sizes[file] = Buffer.byteLength(txt);
  }
  const tracksDir = path.join(ROOT, TRACKS_DIR);
  const trackFiles = fs.existsSync(tracksDir) ? fs.readdirSync(tracksDir).filter((f) => f.endsWith('.json')).sort() : [];
  if (trackFiles.length) {
    data.tracks = trackFiles.map((f) => { const txt = fs.readFileSync(path.join(tracksDir, f), 'utf8'); sizes['tracks/' + f] = Buffer.byteLength(txt); return JSON.parse(txt); });
  } else console.warn(TRACKS_DIR + '/*.json 없음 → 합성 생업 진로만으로 동작');
  const dataJs = 'window.__DATA__=' + JSON.stringify(data) + ';';

  // 3) CSS
  // 주석 제거(첫 줄 주석에 옛 제목이 있다) + 빈 줄 정리. 규칙 자체는 그대로.
  const css = read('src/ui/style.css').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n{3,}/g, '\n\n').trim();

  // 4) HTML 템플릿 → 한 파일
  let html = applyReplace('src/index.html', read('src/index.html'));
  const linkRe = /^[ \t]*<link rel="stylesheet" href="\.\/ui\/style\.css">\s*$/m;
  const scriptRe = /^[ \t]*<script type="module" src="\.\/main\.js"><\/script>\s*$/m;
  if (!linkRe.test(html) || !scriptRe.test(html)) throw new Error('src/index.html 템플릿 모양이 바뀌었습니다(link/script 태그를 못 찾음)');
  html = html.replace(/<!--[\s\S]*?-->\n?/, '');   // 개발용 주석 제거
  html = html.replace(linkRe, '<style>\n' + safeStyle(css) + '\n</style>');
  html = html.replace(scriptRe,
    '<script>' + safeScript(dataJs) + '</script>\n' +
    '<script>' + safeScript(js) + '</script>');
  const stamp = new Date().toISOString().slice(0, 10);
  html = html.replace('<head>', `<head>\n<!-- ${TITLE_KO} ${TITLE_EN} · 단일 파일 빌드 ${stamp} · 이 파일 하나로 동작합니다(외부 요청 없음). 저장은 브라우저 localStorage(tr1.*). -->`);

  // 5) 외부 참조 검사(빌드 산출물에 src/href/url(http)/@import 가 없어야 한다)
  const bad = [];
  for (const re of [/<script[^>]*\ssrc=/i, /<link[^>]*\shref=/i, /<img[^>]*\ssrc=/i, /@import\b/i, /url\(\s*['"]?https?:/i, /@font-face/i])
    if (re.test(html)) bad.push(String(re));
  if (bad.length) throw new Error('외부 참조가 남았습니다: ' + bad.join(', '));

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, html, 'utf8');
  const total = Buffer.byteLength(html);
  console.log(`${path.relative(ROOT, OUT)}  ${kb(total)} (${total.toLocaleString()} bytes)  ${Date.now() - t0}ms  minify=${MINIFY}`);
  console.log(`  JS 번들 ${kb(Buffer.byteLength(js))} · 데이터 ${kb(Buffer.byteLength(dataJs))} · CSS ${kb(Buffer.byteLength(css))}`);
  for (const [f, n] of Object.entries(sizes)) console.log(`    data/${f} ${kb(n)}`);
}

main().catch((e) => { console.error('빌드 실패:', e.message || e); process.exit(1); });

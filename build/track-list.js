// 진로 목록 문서 생성(W15): node build/track-list.js [--out docs/업데이트_v0.3_진로목록.md]
// data/tracks/*.json 을 읽어 국가별 <details>/<summary> 중첩 목록을 만든다. 국가 순서는 data/nations.json 순 → 로도스 아일랜드 → 국가 횡단(공통 고용주).
// 한 줄 = <b>진로명</b> — 단계 칭호(title 없으면 name)를 ' → ' 로 이은 것, canon:false 면 ' (창작)'. 진로 순서는 파일 안 순서.
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
const args = process.argv.slice(2);
const OUT = path.resolve(ROOT, args.includes('--out') ? args[args.indexOf('--out') + 1] : 'docs/업데이트_v0.3_진로목록.md');
const read = (f) => JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8'));
const nations = read('data/nations.json').nations;
const nameOf = Object.fromEntries(nations.map((n) => [n.id, n.name]));
nameOf.rhodes = '로도스 아일랜드'; nameOf.common = '국가 횡단(공통 고용주)';
const order = nations.map((n) => n.id).concat(['rhodes', 'common']);
const byNation = {};
for (const f of fs.readdirSync(path.join(ROOT, 'data/tracks')).filter((x) => x.endsWith('.json')).sort()) {
  const doc = read('data/tracks/' + f);
  for (const t of doc.tracks || []) { const n = t.nation || (doc._meta && doc._meta.nation); (byNation[n] || (byNation[n] = [])).push(t); }
}
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
let total = 0;
const parts = [];
for (const n of order) {
  const list = byNation[n]; if (!list || !list.length) continue;
  total += list.length;
  const items = list.map((t) => `<li><b>${esc(t.name)}</b> — ${t.stages.map((s) => esc(s.title || s.name)).join(' → ')}${t.canon === false ? ' <i>(창작)</i>' : ''}</li>`).join('\n');
  parts.push(`<details>\n<summary><b>${esc(nameOf[n] || n)}</b> · ${list.length}개</summary>\n\n<ul>\n${items}\n</ul>\n</details>`);
}
const md = `# v0.3 추가 진로 목록 (총 ${total}개)\n\n<details>\n<summary><b>추가된 진로 목록</b> (${nations.length}개국 + 로도스 + 공통, 펼치기)</summary>\n\n${parts.join('\n\n')}\n\n</details>\n`;
fs.writeFileSync(OUT, md, 'utf8');
console.log(path.relative(ROOT, OUT) + ' · 진로 ' + total + '개 · 국가 ' + parts.length);

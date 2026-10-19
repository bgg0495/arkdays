// 시작 화면: 제목·한 줄 설명·출생 비중 바(상위 8개국 + 나머지)·태어나기·이어하기·하단 면책 한 줄(D25).
import { $, el, esc, setHtml } from '../dom.js';
import { nationName, SEX } from '../text.js';

export function mount(app) {
  const root = $('#start');
  const A = app.actions;
  const save = A.readSave();
  const shares = topShares(app.data, 8);
  const past = A.pastLives();

  setHtml(root, `
    <div class="sheet start">
      <header class="doc-head">
        <h1 class="doc-title">명생게임</h1>
        <p class="doc-sub">테라의 어딘가에서, 누군가로, 한 번. 통계로 한 생을 살아 봅니다.</p>
      </header>
      <section class="share-chart">
        <h2 class="h-small"><span class="en">Birth share</span>출생 비중 <span class="muted">(테라력 1080~1100년 출생 집계)</span></h2>
        <div class="share-bar" id="share-bar"></div>
        <ul class="share-legend" id="share-legend"></ul>
      </section>
      <section class="start-actions">
        <button class="btn primary big" id="btn-born">태어나기</button>
        ${save ? `<button class="btn" id="btn-resume">이어하기 <span class="muted">— ${esc(save.S.name.full)}, ${save.S.age}세 · ${esc(nationName(app, save.S.cur))}</span></button>` : ''}
      </section>
      ${past.length ? `<section class="past"><h2 class="h-small"><span class="en">Past lives</span>전생 기록</h2><ul>${past.slice(0, 5).map((p) => `<li><span class="mono">${esc(p.by)}</span> ${esc(p.name)} · ${esc(nationName(app, p.born))} ${esc(SEX(p.sex))} · ${p.age}세 · ${esc(p.cause)}</li>`).join('')}</ul></section>` : ''}
      <footer class="doc-foot">
        <p class="muted">「명일방주」 비공식 팬 창작 · 비영리</p>
      </footer>
    </div>`);

  const bar = $('#share-bar', root);
  const legend = $('#share-legend', root);
  const total = shares.reduce((s, x) => s + x.share, 0);
  const max = Math.max(...shares.map((x) => x.share));
  shares.forEach((x, i) => {
    bar.appendChild(el('span.share-seg', { style: 'flex-basis:' + (x.share / total * 100).toFixed(2) + '%', title: x.name + ' ' + x.share.toFixed(1) + '%', dataset: { i: String(i % 9) } }));
    legend.appendChild(el('li', { dataset: { i: String(i % 9) } }, el('i.swatch'), el('span.share-name', {}, x.name),
      el('span.share-track', {}, el('span.share-fill', { style: 'width:' + (x.share / max * 100).toFixed(1) + '%' })),
      el('span.share-pct', {}, x.share.toFixed(1) + '%')));
  });
  $('#btn-born', root).addEventListener('click', () => A.newLife());
  const r = $('#btn-resume', root);
  if (r) r.addEventListener('click', () => A.resume());
}

/** 최상위 국가 share(하위 포함) 상위 n개 + 나머지 */
export function topShares(data, n) {
  const list = data.topNations.map((t) => {
    const kids = (t.children || []).map((id) => data.nationById[id]);
    return { id: t.id, name: t.name, share: t.share + kids.reduce((s, c) => s + c.share, 0) };
  }).sort((a, b) => b.share - a.share);
  const top = list.slice(0, n);
  const rest = list.slice(n).reduce((s, x) => s + x.share, 0);
  if (rest > 0) top.push({ id: '_rest', name: '나머지 ' + (list.length - n) + '개국', share: rest });
  return top;
}

export function unmount() {}

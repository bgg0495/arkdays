// 사망 기록(RECORD OF DEATH): 번호·이름·생몰 한 줄·요약문·사인 블록(사인+각주+비교+장례)·요약 셀·돌아보며·하단 버튼.
// D36: "복사하기"는 화면에 보이는 텍스트(deathRecordText)를 평문으로 클립보드에 복사한다. 미리보기 textarea 없음.
import { $, esc, setHtml, toast } from '../dom.js';
import { deathNo, deathSummary, deathCompare, deathCells, deathMeta, deathRecordText, reflection } from '../text.js';
import { deathTexts } from '../../../content/death_texts.js';

export function mount(app) {
  const root = $('#dead');
  const sim = app.sim; const S = sim.S; const d = S.deathAt;
  const cells = deathCells(sim);
  const cmp = deathCompare(sim);
  const dt = deathTexts(sim);  // W4c: 사인 각주·장례 관습
  const ref = reflection(sim);
  const text = deathRecordText(sim);
  setHtml(root, `
    <div class="sheet dead">
      <header class="doc-head row">
        <div>
          <span class="en">Record of death</span>
          <div class="doc-kind">사망 기록</div>
        </div>
        <div class="doc-right">
          <span class="doc-no mono">No. ${esc(deathNo(S))}</span>
          <span class="stamp stamp-dead">종결</span>
        </div>
      </header>
      <h1 class="person-name">${esc(S.name.full)}</h1>
      <p class="doc-meta">${esc(deathMeta(sim))}</p>
      <p class="lead">${esc(deathSummary(sim))}</p>
      <section class="sec cause-block">
        <h2 class="h-small"><span class="en">Cause of death</span>사인</h2>
        <p class="cause">${esc(d.label)}</p>
        ${dt.f ? `<div class="footnote">${esc(dt.f)}</div>` : ''}
        <ol class="compare">${cmp.map((c) => `<li>${esc(c.t)}${c.f ? `<div class="footnote">${esc(c.f)}</div>` : ''}</li>`).join('')}</ol>
        <p class="rite">${esc(dt.rite)}</p>
        ${dt.riteF ? `<div class="footnote">${esc(dt.riteF)}</div>` : ''}
        ${dt.note ? `<p class="note">${esc(dt.note)}</p>` : ''}
      </section>
      <section class="sec">
        <h2 class="h-small"><span class="en">Summary</span>요약</h2>
        <div class="cells">${cells.map(([k, v]) => `<div class="cell"><div class="cell-k">${esc(k)}</div><div class="cell-v">${esc(v)}</div></div>`).join('')}</div>
      </section>
      <section class="sec">
        <h2 class="h-small"><span class="en">In retrospect</span>돌아보며</h2>
        <p class="lead">${esc(ref[0])}<br>${esc(ref[1])}</p>
      </section>
      <div class="start-actions">
        <button class="btn primary big" id="btn-rebirth">다시 태어나기</button>
        <button class="btn" id="btn-copy">복사하기</button>
        <button class="btn ghost" id="btn-home">처음으로</button>
      </div>
      <textarea class="copy-src" id="copy-src" readonly tabindex="-1" aria-hidden="true"></textarea>
      <footer class="doc-foot">
        <p>「명일방주」 비공식 팬 창작 · 비영리</p>
      </footer>
    </div>`);
  $('#copy-src', root).value = text;
  $('#btn-copy', root).addEventListener('click', () => copy(text));
  $('#btn-rebirth', root).addEventListener('click', () => app.actions.rebirth());
  $('#btn-home', root).addEventListener('click', () => app.actions.toStart());
}

async function copy(text) {
  try {
    if (navigator.clipboard && window.isSecureContext) { await navigator.clipboard.writeText(text); toast('사망 기록을 복사했습니다.'); return; }
  } catch (e) { /* fallback */ }
  const ta = $('#copy-src');
  if (ta) { ta.value = text; ta.focus(); ta.select(); try { if (document.execCommand('copy')) { toast('사망 기록을 복사했습니다.'); return; } } catch (e) { /* noop */ } }
  toast('복사하지 못했습니다. 화면의 글을 직접 선택해 복사해 주세요.');
}

export function unmount() {}

// 출생 신고서(BIRTH RECORD): 번호·이름·요약 한 문단·항목 그리드(라벨 작게/값 크게 2열)·국가 한 줄 소개·삶을 시작하기.
import { $, esc, setHtml, lmd } from '../dom.js';
import { certNo, birthSummary, SEX, Q_DOTS, homeWord, yearWord, jobName, artsPercentile, POLICY_LABEL } from '../text.js';

export function mount(app) {
  const root = $('#cert');
  const sim = app.sim; const S = sim.S; const n = sim.nation; const race = sim.race;
  const f = S.fam;
  const sub = (t) => ' <span class="rec-sub">' + t + '</span>';
  const parent = (p, who) => p.absent ? who + ' 부재' : who + ' ' + p.age + '세' + (p.job ? ' · ' + esc(jobName(sim, p.job)) : '') + (p.infected ? ' · 감염자' : '');
  // [라벨, 값(HTML), 전폭 여부]
  const rows = [
    ['성별', SEX(S.sex)],
    ['종족', esc(race.name) + (race.lifeMul !== 1 ? sub('수명 배율 ' + race.lifeMul + '×') : '') + (S.eth === 'outsider' ? sub('이 땅의 소수 종족') : S.eth ? sub(esc(S.eth)) : '')],
    ['출생 국가', esc(n.name) + (n.parent ? sub(esc(sim.data.nationById[n.parent].name) + ' 관할') : '')],
    ['출생지', esc(homeWord(S))],
    ['가정 형편', '<span class="dots">' + Q_DOTS(S.q) + '</span>' + sub(S.q + '분위')],
    ['형제', (f.older ? '위로 ' + f.older + '명' : '') + (f.older && f.younger ? ', ' : '') + (f.younger ? '아래로 ' + f.younger + '명' : '') || '없음'],
    ['부모', parent(f.mom, '어머니') + ' · ' + parent(f.dad, '아버지'), true],
    ['감염 여부', (S.ori.on ? '<b class="stamp-text">양성</b> · ' + S.ori.uL.toFixed(2) + ' u/L' : '음성') + sub('출생 검사')],
    ['아츠 적성', '상위 ' + artsPercentile(S) + '%' + sub(esc(n.statOrg) + ' 적성 등급표')],
    ['기대수명', S.e0 + '세' + sub(esc(n.statOrg) + ' 생명표')],
    ['5세 전 사망 확률', S.u5 + '%' + sub(esc(n.statOrg) + ' 집계')],
    ['소득 수준', '가정 백분위 ' + Math.round(S.pct * 100) + '%' + sub('국가 중위소득 ' + lmd(sim.med) + '/년')],
    ['감염자 정책', esc(POLICY_LABEL[sim.policy] || sim.policy)],
  ];
  setHtml(root, `
    <div class="sheet cert">
      <header class="doc-head row">
        <div>
          <span class="en">Birth record</span>
          <div class="doc-kind">출생 신고</div>
        </div>
        <div class="doc-right">
          <span class="doc-no mono">No. ${esc(certNo(S))}</span>
          <span class="stamp">접수</span>
        </div>
      </header>
      <h1 class="person-name">${esc(S.name.full)}</h1>
      <p class="lead">${esc(birthSummary(sim))}</p>
      <div class="pixel-slot" aria-hidden="true"><span>장면 자리</span></div>
      <dl class="rec">
        ${rows.map(([k, v, w]) => `<div class="f${w ? ' w' : ''}"><dt>${esc(k)}</dt><dd>${v}</dd></div>`).join('')}
      </dl>
      <p class="blurb"><b>${esc(n.name)}</b> — ${esc(n.blurb || '소개 문구가 아직 없습니다.')}</p>
      <p class="footnote">${esc(yearWord(S))} ${esc(n.statOrg)} 접수. 기대수명은 광석병·재앙·분쟁을 포함해 셈한 값입니다.</p>
      <div class="start-actions">
        <button class="btn primary big" id="btn-start">삶을 시작하기</button>
        <button class="btn" id="btn-reroll">다른 아이로</button>
        <button class="btn ghost" id="btn-back">처음으로</button>
      </div>
    </div>`);
  $('#btn-start', root).addEventListener('click', () => app.actions.startLife());
  $('#btn-reroll', root).addEventListener('click', () => app.actions.newLife());
  $('#btn-back', root).addEventListener('click', () => app.actions.toStart());
}

export function unmount() {}

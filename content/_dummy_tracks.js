// W7 더미 진로 콘텐츠: 새 태그(track:/aff:/archetype:/newcomer/rel:/rhodes:/papers:/visit:)와 ctx API(ctx.track·aff·res·rel·rhodes, promote/fall/switchTrack/migrate/joinRhodes)를
// 시뮬에서 실제로 밟아 보기 위한 최소 이벤트·결정. 문구는 전부 임시. W9 국가 파일(content/tracks/<nation>.js)이 같은 형태로 교체한다.
// test/sim.js 가 content/index.js 뒤에 등록한다(W11 이 index.js 에 넣을지 결정).
import { rhodesF, orgF } from './_util.js';

export const events = [
  // ── 시라쿠사 패밀리(더미 SIR_FAMIGLIA / 실데이터도 같은 id) ──
  { id: 'dt_sir_errand', a: [14, 30], tags: ['track:SIR_FAMIGLIA:errand'], w: 30, gap: 2,
    run: (s) => ({ t: (s.aff ? s.aff.name : '패밀리') + '의 심부름이 늘었습니다. 봉투를 건네고, 이름은 묻지 않았습니다.', k: 'ev', fx: { standing: 3 } }) },
  { id: 'dt_sir_soldato_night', a: [16, 50], tags: ['track:SIR_FAMIGLIA:soldato'], w: 30, gap: 3,
    run: (s) => ({ t: '밤에 불려 나갔습니다. 돌아와서는 아무 말도 하지 않았습니다.', k: 'bad', fx: { h: -2, standing: 2 } }) },
  { id: 'dt_sir_bellone', a: [14, 70], tags: ['aff:SIR_BELLONE'], w: 15, gap: 5,
    run: (s) => ({ t: '벨로네의 이름으로 가게 문이 열렸습니다. 그 이름이 아니었다면 열리지 않았을 문이었습니다.', k: 'note' }) },
  { id: 'dt_sir_vendetta_rumor', a: [14, 80], tags: ['siracusa', 'track:SIR_FAMIGLIA'], w: 20, gap: 4,
    run: (s) => ({ t: '옆 동네 패밀리의 돈이 바뀌었다는 말이 돌았습니다. 거리가 조용해졌습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'dt_sir_legal_exit', a: [30, 60], tags: ['track:SIR_FAMIGLIA'], w: 10, gap: 6, c: (s) => s.S.track.standing >= 80,
    run: (s) => { s.S.flags.switchOpen = true; return { t: '돈이 합법 사업 하나를 맡겨 보겠다고 했습니다. 길이 하나 더 보였습니다.', k: 'ev' }; } },
  // ── 우르수스 광산(forced A5) ──
  { id: 'dt_urs_mine_bell', a: [6, 80], tags: ['track:URS_MINE'], w: 40, gap: 2,
    run: (s) => ({ t: '종이 울리면 들어가고, 종이 울리면 나왔습니다. 하루가 종 두 번이었습니다.', k: 'bad', fx: { hl: -2, h: -2 }, f: orgF(s, '광구 교대 기록') }) },
  { id: 'dt_urs_mine_dust', a: [6, 80], tags: ['track:URS_MINE', 'infected'], w: 20, gap: 3,
    run: (s) => ({ t: '가루가 폐까지 내려앉았습니다. 기침이 멈추지 않았습니다.', k: 'bad', fx: { hl: -4 } }) },
  // ── 우르수스 병사(A4) ──
  { id: 'dt_urs_soldier_border', a: [16, 50], tags: ['track:URS_SOLDIER'], w: 30, gap: 2,
    run: (s) => ({ t: '국경 초소에서 겨울을 났습니다. 눈이 사람보다 많았습니다.', k: 'ev', fx: { standing: 2 } }) },
  // ── 컬럼비아 회사원(A10) — 공통 직장 이벤트는 archetype:A10 에만 ──
  { id: 'dt_col_office_overtime', a: [18, 65], tags: ['archetype:A10'], w: 30, gap: 2,
    run: (s) => ({ t: '야근이 길었습니다. 고과표에 줄 하나가 더 생겼습니다.', k: 'ev', fx: { hl: -2, standing: 3 } }) },
  { id: 'dt_col_office_boss', a: [18, 65], tags: ['archetype:A10'], w: 20, gap: 3,
    run: (s) => ({ t: '상사가 바뀌었습니다. 새 상사는 숫자만 보았습니다.', k: 'note', fx: { h: -1 } }) },
  // ── 블랙스틸(A6, 순회형): 방문국 태그 ──
  { id: 'dt_col_bsw_deploy', a: [17, 50], tags: ['track:COL_BSW'], w: 30, gap: 2,
    run: (s) => ({ t: (s.res.itinerantAt && s.data.nationById[s.res.itinerantAt] ? s.data.nationById[s.res.itinerantAt].name + ' 파견이 ' : '파견이 ') + '넉 달이었습니다. 돌아오니 계절이 바뀌어 있었습니다.', k: 'ev', fx: { standing: 2 } }) },
  { id: 'dt_visit_siracusa', a: [15, 70], tags: ['visit:siracusa'], w: 25, gap: 3,
    run: (s) => ({ t: '시라쿠사에 머무는 동안 누구도 누구의 이름을 크게 부르지 않았습니다.', k: 'note' }) },
  // ── 이주 신참·관계 등급·로도스 ──
  { id: 'dt_newcomer', a: [10, 80], tags: ['newcomer'], w: 30, gap: 2,
    run: (s) => ({ t: '말이 서툴러 값을 두 번 물었습니다. 두 번째는 더 비쌌습니다.', k: 'bad', fx: { money: -Math.round(s.med * 0.02) } }) },
  { id: 'dt_rel_institutional', a: [10, 80], tags: ['rel:institutional'], w: 25, gap: 3,
    run: (s) => ({ t: '서류에 종족 칸이 있었습니다. 그 칸이 나머지 칸을 정했습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'dt_rel_favored', a: [10, 80], tags: ['rel:favored'], w: 15, gap: 4,
    run: (s) => ({ t: '얼굴만 보고 자리를 내주었습니다. 이유는 묻지 않아도 알았습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'dt_rhodes_field', a: [15, 60], tags: ['rhodes:field'], w: 30, gap: 2,
    run: (s) => ({ t: '작전이 있었습니다. 돌아온 사람 수를 세는 것이 일과의 끝이었습니다.', k: 'ev', fx: { standing: 2 }, f: rhodesF('외근부 작전 일지') }) },
  { id: 'dt_rhodes_patient', a: [5, 90], tags: ['rhodes:patient'], w: 30, gap: 2,
    run: (s) => ({ t: '디스플레이 밴드가 수치를 읽어 주었습니다. 어제보다 조금 낮았습니다.', k: 'warm', fx: { h: 2 }, f: rhodesF('환자 모니터 기록') }) },
  { id: 'dt_rhodes_contact', a: [18, 50], tags: ['columbia', '!rhodes'], w: 3, gap: 10, c: (s) => !!s.S.track && (s.S.cap.learn >= 1 || s.S.cap.skill >= 1),
    run: (s) => { s.S.flags.rhodes_legal = s.S.age; return { t: '로도스 아일랜드와 계약 서류를 주고받았습니다. 상대 쪽 사람이 이름을 적어 갔습니다.', k: 'note' }; } },
  { id: 'dt_papers_illegal', a: [10, 80], tags: ['papers:illegal'], w: 30, gap: 2,
    run: (s) => ({ t: '검문이 있었습니다. 골목으로 돌아갔습니다.', k: 'bad', fx: { h: -2 } }) },
];

export const decisions = {
  // 콘텐츠가 승급·몰락을 강제하는 예시(ctx.promote / ctx.fall)
  dt_sir_betray: {
    tags: ['track:SIR_FAMIGLIA:soldato'], gap: 6, once: false,
    ok: (s) => s.S.age >= 20 && s.rng.chance(0.15),
    build: (s) => ({ title: '제안', body: '다른 패밀리 사람이 찾아왔습니다. 돈의 일정을 알려 주면 두 배를 주겠다고 했습니다.',
      choices: [{ k: 'no', label: '거절한다', auto: 3 }, { k: 'yes', label: '받는다', sub: '배신', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'no') { s.S.track.standing = Math.min(100, s.S.track.standing + 5); return { t: '거절했습니다. 다음 날 그 사람은 보이지 않았습니다.', k: 'note' }; }
      if (s.rng.chance(0.5)) { s.fall('betrayal'); return false; }
      return { t: '돈을 받았습니다. 아직 아무도 모릅니다.', k: 'bad', fx: { money: Math.round(s.S.income * 2) } };
    },
  },
  dt_urs_patrol_hide: {
    tags: ['ursus', 'known', '!rhodes', '!track:URS_MINE'], once: true,
    ok: (s) => s.S.q >= 4 && s.S.money >= s.med * 2,
    build: (s) => ({ title: '서류', body: '판정 기록을 지워 줄 사람이 있습니다. 값은 중위소득의 두 배입니다.',
      choices: [{ k: 'pay', label: '지운다', auto: 2 }, { k: 'no', label: '두는다', auto: 1 }] }),
    apply: (s, k) => { if (k !== 'pay') return '그대로 두었습니다.'; s.S.money -= Math.round(s.med * 2); s.S.flags.oriHidden = true; return { t: '기록이 사라졌습니다. 순찰대는 오지 않았습니다.', k: 'note' }; },
  },
};

export default { events, decisions };

// 화면 공통 라벨·번호·요약 템플릿. 톤은 §9: 담백체, 각주는 세계관 안의 출처(D25).
import { normCdf } from '../engine/rng.js';
import { humanAge } from '../engine/lifetable.js';
import { toLMD } from '../engine/finance.js';
import { FOCUS } from '../engine/sim.js';
import { num, lmd } from './dom.js';
import { eun, iga, eul, wa, ro, euro } from '../engine/text.js';
import { deathTexts } from '../../content/death_texts.js';

export const STAT_LABEL = { hl: '건강', h: '행복', sm: '지식', so: '관계', money: '돈' };
export const POLICY_LABEL = {
  persecute: '박해', quarantine: '격리', euthanasia: '안락사', neglect: '방치', insurance: '보험',
  expel: '추방', ignore: '묵인', treat: '치료',
};
export const CONSCRIPT_LABEL = { none: '없음', draft: '징집', volunteer: '지원', mandatory: '의무 복무' };
export const GRADE_LABEL = { 1: '낮음', 2: '보통', 3: '높음' };
export const EDU_LABEL = ['학교 밖', '초등', '중등', '상급', '대학'];
export const SCHOOL_LABEL = { prim: '초등학교', lsec: '중학교', usec: '상급 학교', uni: '대학', caster: '아츠 수련 과정' };
export const STAGE_LABEL = { 0: '—', 1: '1기', 2: '2기', 3: '3기' };
export const ORI_OUTCOME = {
  none: '별일 없음', camp: '수용소', expel: '추방', quarantine: '격리', euthanasia: '안락사 통지', insurance: '보험 가입',
  treat: '치료', neglect: '방치', hidden: '은폐', ignore: '묵인', fees: '보호비',
};
export const TRAIT_LABEL = { cur: '호기심', act: '활달함', warm: '다정함', grit: '끈기' };

const CODE = {
  yan: 'YAN', lungmen: 'LMN', higashi: 'HGS', ursus: 'URS', sami: 'SAM', kjerag: 'KJR', leithanien: 'LTN', victoria: 'VIC',
  tara: 'TAR', kazimierz: 'KZM', columbia: 'CLB', siracusa: 'SRC', laterano: 'LAT', iberia: 'IBR', aegir: 'AGR', minos: 'MNS',
  sargon: 'SGN', bolivar: 'BLV', rim: 'RIM', kazdel: 'KZD', durin: 'DRN', rhodes: 'RHD',
};
export function nationCode(id) { return CODE[id] || String(id || 'XXX').slice(0, 3).toUpperCase(); }

/** 출생 신고 번호 YAN-1093-000123 */
export function certNo(S) { return nationCode(S.born) + '-' + S.by + '-' + String(S.flags.serial || 0).padStart(6, '0'); }
/** 사망 기록 번호 YAN-1093-000123-D047 */
export function deathNo(S) { return certNo(S) + '-D' + String(S.deathAt ? S.deathAt.age : 0).padStart(3, '0'); }

export const SEX = (s) => (s === 'F' ? '여성' : '남성');
export const SEX_KID = (s) => (s === 'F' ? '여자아이' : '남자아이');
export const Q_DOTS = (q) => '●'.repeat(q) + '○'.repeat(5 - q);
export const Q_WORD = ['', '가장 가난한', '가난한', '중간쯤 되는', '넉넉한', '가장 부유한'];

export function homeWord(S) {
  if (S.home.type === 'nomadic') return '이동도시 ' + (S.home.deck === 'upper' ? '상층부' : '하층부');
  return S.urban ? '도시' : '농촌';
}
export function monthWord(m) { return m <= 2 || m === 12 ? '겨울' : m <= 5 ? '봄' : m <= 8 ? '여름' : '가을'; }
export function yearWord(S) { return '테라력 ' + S.by + '년 ' + monthWord(S.bm); }

export function fxText(fx) {
  if (!fx) return '';
  const parts = [];
  for (const k of ['hl', 'h', 'sm', 'so']) if (fx[k]) parts.push(STAT_LABEL[k] + ' ' + (fx[k] > 0 ? '+' : '−') + Math.abs(Math.round(fx[k] * 10) / 10));
  if (fx.money) parts.push('돈 ' + (fx.money > 0 ? '+' : '−') + num(Math.abs(fx.money)));
  return parts.join(' · ');
}
export function focusLabel(k) { return (FOCUS[k] && FOCUS[k].label) || k || '—'; }
export function focusHint(k) { return FOCUS[k] ? fxText(FOCUS[k].fx) : ''; }

export function artsPercentile(S) { return Math.round((1 - normCdf(S.arts)) * 100); }

/** 출생 신고서 한 문단 */
export function birthSummary(sim) {
  const { S, nation, race } = sim;
  const f = S.fam;
  const s = [];
  s.push(yearWord(S) + ', ' + nation.name + ' ' + homeWord(S) + '의 ' + Q_WORD[S.q] + ' 가정에서 ' + ro(SEX_KID(S.sex)) + ' 태어났습니다.');
  s.push(race.name + '입니다.' + (race.lifeMul !== 1 ? ' 인간 척도보다 ' + race.lifeMul + '배 오래 사는 종족입니다.' : ''));
  if (f.older || f.younger) s.push('위로 ' + (f.older ? f.older + '명' : '없고') + ', 아래로 ' + (f.younger ? f.younger + '명의 형제가 있습니다.' : '형제가 없습니다.'));
  else s.push('형제는 없습니다.');
  if (f.dad.absent) s.push('아버지는 곁에 없습니다.');
  if (f.mom.infected || (f.dad.infected && !f.dad.absent)) s.push((f.mom.infected && f.dad.infected ? '부모 모두' : f.mom.infected ? '어머니는' : '아버지는') + ' 감염자입니다.');
  if (S.ori.on) s.push('태어날 때부터 혈중에 오리지늄 결정이 있었습니다.');
  if (S.eth === 'outsider') s.push('이 땅에서 ' + eun(race.name) + ' 흔치 않은 종족입니다.');
  return s.join(' ');
}

export function jobName(sim, id) { const j = id && sim.data.jobById[id]; return j ? j.name : (id || '—'); }
export function nationName(sim, id) { const n = id && sim.data.nationById[id]; return n ? n.name : (id || '—'); }

export function eduWord(S) {
  if (S.flags.casterRoute) return '아츠 수련 과정 수료';
  return EDU_LABEL[Math.min(4, S.edu || 0)] + (S.edu ? ' 교육' : '');
}

/** 생애 초점 누적(성인 이후 years[].focus 기준) */
export function focusYears(S) {
  const acc = {};
  for (const y of S.years) if (y.a >= 18 && y.focus) acc[y.focus] = (acc[y.focus] || 0) + 1;
  return Object.entries(acc).sort((a, b) => b[1] - a[1]);
}

export function happiestYear(S) {
  let best = null;
  for (const y of S.years) if (!best || y.h > best.h) best = y;
  return best;
}

/** 사망 기록 요약문(템플릿 조립) */
export function deathSummary(sim) {
  const { S, race } = sim;
  const d = S.deathAt;
  const f = S.fam;
  const born = sim.data.nationById[S.born];
  const s = [];
  s.push(born.name + ' ' + homeWord({ home: S.home, urban: S.bornUrban }) + '의 ' + Q_WORD[S.q] + ' 가정에서 ' + race.name + ' ' + ro(SEX_KID(S.sex)) + ' 태어났습니다.');
  if (S.flags.bornInfected) s.push('태어날 때부터 감염자였습니다.');
  if (d.age >= 6) s.push(S.flags.noSchool ? '학교는 다니지 못했습니다.' : S.flags.casterRoute ? '아츠 수련 과정을 마쳤습니다.' : S.edu >= 4 ? '대학까지 다녔습니다.' : S.edu >= 3 ? '상급 학교까지 다녔습니다.' : S.edu >= 2 ? '중학교까지 다녔습니다.' : S.edu >= 1 ? '초등학교까지 다녔습니다.' : '');
  if (S.flags.childLabor != null) s.push(S.flags.childLabor + '세부터 일했습니다.');
  const lastJob = S.job || lastJobOf(S);
  if (lastJob === 'homemaker' || S.flags.homemakerAt != null) {
    const before = S.flags.jobBeforeHome || lastJobOf(S, ['homemaker']);
    if (before) s.push(ro(jobName(sim, before)) + ' 일하다 가사를 맡았습니다.'); else s.push('가사를 맡았습니다.');
    if (lastJob && lastJob !== 'homemaker' && S.flags.backToWork != null) s.push('뒤에 다시 ' + ro(jobName(sim, lastJob)) + ' 일했습니다.');
  } else if (lastJob) s.push(ro(jobName(sim, lastJob)) + (S.retired ? ' 일하다 은퇴했습니다.' : ' 일했습니다.'));
  if (S.served) s.push(S.served + '년을 복무했습니다.');
  if (S.ori.known) s.push('광석병 ' + STAGE_LABEL[S.ori.stage] + ' 감염자로 ' + (S.rhodes ? '로도스 아일랜드의 치료를 받았습니다.' : (ORI_OUTCOME[S.flags.oriOutcome] || '') + ' 처분을 받았습니다.'));
  if (f.partner) {
    const yrs = (f.partner.alive ? d.age : S.log.filter((l) => l.k === 'loss' && l.t.startsWith('배우자')).map((l) => l.a)[0] || d.age) - f.marriedAt;
    s.push(wa(f.partner.name) + ' ' + Math.max(0, yrs) + '년을 함께했습니다.' + (f.widowed ? ' 먼저 떠나보냈습니다.' : ''));
  }
  if (f.kids.length) s.push('아이 ' + f.kids.length + '명을 키웠고' + (S.stats.kidsLost ? ', 그중 ' + S.stats.kidsLost + '명을 먼저 떠나보냈습니다.' : ' 모두 살아 있습니다.'));
  if (S.mig) s.push(ro(nationName(sim, S.mig)) + ' 옮겨 가 살았습니다.');
  s.push(deathTexts(sim).line);  // W4c: 사인별 문장(content/death_texts.js)
  return s.filter(Boolean).join(' ').replace(/\s+/g, ' ');
}
export function lastJobOf(S, skip = []) {
  for (let i = S.years.length - 1; i >= 0; i--) if (S.years[i].job && !skip.includes(S.years[i].job)) return S.years[i].job;
  return null;
}

/** 사인 + 비교 3문장(D19·D25: 기대수명은 테라 위험을 포함한 값, 비교는 세계관 안 표현으로만) */
export function deathCompare(sim) {
  const { S, race, data } = sim;
  const d = S.deathAt;
  const born = data.nationById[S.born];
  const diff = +(d.age - S.e0).toFixed(1);
  const lt = sim.lt;
  const ageIx = Math.min(Math.max(1, d.age), lt.l ? lt.l.length - 1 : 0);   // 0세 사망은 첫돌 생존율로
  const alive = lt.l && lt.l[ageIx] != null ? lt.l[ageIx] : null;
  const org = born.statOrg || '기록소';
  const lost = Math.max(0, +(S.e0Model - S.e0).toFixed(1));
  const out = [];
  out.push({
    t: born.name + '에서 ' + S.by + '년에 태어난 ' + SEX(S.sex) + '의 기대수명은 ' + S.e0 + '세였습니다. ' + (diff >= 0 ? '그보다 ' + diff + '년 더 살았습니다.' : '그보다 ' + Math.abs(diff) + '년 일찍 떠났습니다.'),
    f: '(' + org + ' 생명표, ' + S.by + '년 출생 집단)',
  });
  out.push({
    t: '광석병과 재앙을 셈에서 뺀 로도스 아일랜드 의료부 생존표로는 ' + S.e0Model + '세였습니다. ' + (lost > 0 ? '차이는 ' + lost + '년입니다.' : '빼고 더할 것이 없었습니다.'),
    f: race.lifeMul !== 1 ? '(로도스 아일랜드 의료부 소책자 「종족과 수명」. ' + eun(race.name) + ' 보통 사람의 ' + race.lifeMul + '배를 삽니다)' : '(로도스 아일랜드 의료부 소책자 「광석병이 가져가는 햇수」)',
  });
  if (alive != null) out.push({
    t: '같은 해 같은 곳에서 태어난 ' + SEX(S.sex) + ' 중 약 ' + Math.round(alive * 100) + '%가 ' + (d.age < 1 ? '첫돌을 넘깁니다.' : d.age + '세까지 살아남습니다.'),
    f: '(' + org + ' 생존표)',
  });
  else out.push({ t: '사인에 관한 기록은 남아 있지 않습니다.', f: '(' + org + ' 사망 등기)' });
  return out;
}

/** 돌아보며 2줄 */
export function reflection(sim) {
  const { S } = sim;
  const d = S.deathAt;
  const best = happiestYear(S);
  const fy = focusYears(S);
  const l1 = best ? '가장 행복했던 해는 ' + best.a + '세, 테라력 ' + best.y + '년이었습니다.' + (best.a < 10 ? ' 아직 아무것도 모를 때였습니다.' : '') : '행복했던 해를 셀 만큼 오래 살지 못했습니다.';
  let l2;
  if (fy.length) l2 = '어른이 된 뒤 가장 많은 해를 ' + focusLabel(fy[0][0]) + '에 썼습니다. ' + fy[0][1] + '년입니다.';
  else if (d.age < 18) l2 = '어른이 되기 전이었습니다.';
  else l2 = '시간을 어디에 썼는지는 기록되지 않았습니다.';
  return [l1, l2];
}

/** 사망 기록 한 줄 메타(국가 · 종족 · 성별 · 생몰 · 향년 · 장소) */
export function deathMeta(sim) {
  const { S, race } = sim;
  const d = S.deathAt;
  return nationName(sim, S.born) + ' · ' + race.name + ' · ' + SEX(S.sex) + ' · 테라력 ' + S.by + '–' + d.year + ' · 향년 ' + d.age + '세 · ' + nationName(sim, d.where) + '에서';
}

/** 사망 기록 요약 셀 [[라벨, 값]] — 화면(dead.js)과 복사 텍스트가 같은 목록을 쓴다 */
export function deathCells(sim) {
  const { S } = sim;
  const f = S.fam;
  const best = happiestYear(S);
  const fy = focusYears(S);
  const lived = [...new Set(S.years.map((y) => y.cur).concat([S.born, S.cur]))].map((id) => nationName(sim, id));
  return [
    ['최종 학력', eduWord(S)],
    ['마지막 일', jobName(sim, S.job || lastJobOf(S)) + (S.retired ? ' (은퇴)' : '')],
    ['함께한 사람', f.partner ? f.partner.name + (f.widowed ? ' (먼저 떠남)' : '') : '없음'],
    ['자녀', f.kids.length ? f.kids.length + '명' + (S.stats.kidsLost ? ' (' + S.stats.kidsLost + '명 먼저 떠남)' : '') : '없음'],
    ['가장 행복했던 해', best ? best.a + '세 · 테라력 ' + best.y + '년' : '—'],
    ['살았던 나라', lived.join(' → ')],
    ['남긴 재산', lmd(S.money)],
    ['시간을 쓴 곳', fy.length ? fy.slice(0, 3).map(([k, n]) => focusLabel(k) + ' ' + n + '년').join(' · ') : '—'],
    ['광석병', S.ori.on ? (S.ori.known ? STAGE_LABEL[S.ori.stage] + ' · ' + S.ori.uL.toFixed(2) + ' u/L · ' + (ORI_OUTCOME[S.flags.oriOutcome] || '—') : '감염, 판정 없음') : '없음'],
    ['로도스 아일랜드', S.rhodes ? S.flags.rhodesAt + '세 합류' : '—'],
    ['결정', S.stats.decisions + '회' + (S.stats.auto ? ' (자동 ' + S.stats.auto + '회)' : '')],
    ['재앙 피격', S.stats.catHits ? S.stats.catHits + '회' : '없음'],
  ];
}

/** 복사 텍스트(D36): 사망 기록 화면에 보이는 글을 그대로 줄바꿈 평문으로. 캐치프레이즈·해시태그 없음. */
export function deathRecordText(sim) {
  const { S } = sim;
  const d = S.deathAt;
  const dt = deathTexts(sim);
  const ref = reflection(sim);
  const L = [];
  L.push('사망 기록 No. ' + deathNo(S));
  L.push(S.name.full);
  L.push(deathMeta(sim));
  L.push('');
  L.push(deathSummary(sim));
  L.push('');
  L.push('사인: ' + d.label);
  if (dt.f) L.push(dt.f);
  for (const c of deathCompare(sim)) { L.push(c.t); if (c.f) L.push(c.f); }
  L.push(dt.rite);
  if (dt.riteF) L.push(dt.riteF);
  if (dt.note) L.push(dt.note);
  L.push('');
  L.push('요약');
  for (const [k, v] of deathCells(sim)) L.push(k + ': ' + v);
  L.push('');
  L.push('돌아보며');
  L.push(ref[0]);
  L.push(ref[1]);
  return L.join('\n');
}

/** 국가 통계 카드 행 */
export function nationStatRows(sim, n) {
  const st = n.stats;
  const t = n.terra;
  const rows = [];
  const org = n.statOrg || '기록소';
  rows.push(['기대수명', t ? '여 ' + t.F.e0 + '세 · 남 ' + t.M.e0 + '세' : '여 ' + Math.round(st.leF || st.le) + '세 · 남 ' + Math.round(st.leM || st.le) + '세', '(' + org + ' 생명표. 광석병·재앙·분쟁 포함)']);
  rows.push(['5세 전 사망', (st.u5 * 100 * (t && t.u5k ? t.u5k : 1)).toFixed(1) + '%', '(' + org + ' 집계)']);
  rows.push(['1인당 소득', lmd(toLMD(st.ppp)) + '/년', '(용문폐 환산)']);
  rows.push(['중위소득', lmd(sim.med) + '/년', '(지니 ' + st.gini.toFixed(2) + ')']);
  rows.push(['도시 거주', Math.round(st.urb * 100) + '%', n.nomadic ? '(그중 이동도시 ' + Math.round(n.nomadic * 100) + '%)' : '']);
  rows.push(['합계출산율', (st.tfr ?? 4.5).toFixed(1) + '명', '']);
  rows.push(['감염자 정책', POLICY_LABEL[n.policy] || n.policy, n.policyVariants && n.policyVariants.length ? '(조건부 변형 ' + n.policyVariants.length + '개)' : '']);
  rows.push(['광석병 노출', GRADE_LABEL[n.oriExp] || n.oriExp, '']);
  rows.push(['재앙 빈도', GRADE_LABEL[n.catFreq] || n.catFreq, '']);
  rows.push(['분쟁', GRADE_LABEL[n.conflict] || n.conflict, '']);
  rows.push(['병역', CONSCRIPT_LABEL[n.conscript] || n.conscript, '']);
  return rows;
}

export const MRZ = (S, sim) => {
  const fill = (s, n) => (s + '<'.repeat(n)).slice(0, n);
  const code = nationCode(S.root);
  const cur = nationCode(S.cur);
  const race = String(S.race).toUpperCase().replace(/[^A-Z]/g, '');
  const given = romanish(S.name.given), fam = romanish(S.name.family);
  const l1 = fill('I<' + code + fam + '<<' + given, 44);
  const l2 = fill(String(S.by).slice(-2) + String(S.bm).padStart(2, '0') + '01' + S.sex + cur + '<' + race + '<Q' + S.q + '<A' + String(S.age).padStart(3, '0') + '<' + (S.ori.known ? 'ORI' + S.ori.stage : 'NEG'), 44);
  return [l1, l2];
};
function romanish(s) {
  // 로마자 변환 없이 흉내만: 한글은 자모 초성 코드로, 영문은 그대로
  const out = [];
  for (const ch of String(s || '')) {
    const c = ch.charCodeAt(0);
    if (c >= 0xac00 && c <= 0xd7a3) out.push('GNDRMBSOJCKTPH'[Math.floor((c - 0xac00) / 588) % 14] || 'X');
    else if (/[A-Za-z]/.test(ch)) out.push(ch.toUpperCase());
  }
  return out.join('') || 'X';
}

export const humanAgeOf = (S) => humanAge(S.age, S.lifeMul);
export { eun, iga, eul, wa, ro, euro };

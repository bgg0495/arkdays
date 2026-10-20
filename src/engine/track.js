// 진로 상태 기계(§3·§4·§5). 진입 후보·가중, 승급·몰락 롤, 소속 배정, 소득, 은퇴·전직, exits.fall 값 사전.
// 상태: S.track = { id, stage, since, stageSince, years, standing, aff, flags } | null, S.trackHist = [{id, from, to, stage, how}]
// 모든 함수는 ctx(=sim) 를 첫 인자로 받는다. 콘텐츠용 헬퍼(sim.promote/fall/switchTrack …)는 sim.js 가 이 모듈을 감싼다.
import { clamp } from './rng.js';
import { humanAge } from './lifetable.js';
import { tracksFor } from './data.js';
import { BALANCE as B } from './balance.js';
import { FALL_CAUSE_TO_DEATH, FALL_CAUSE_LABEL, ARCH_ADJ } from './archetypes.js';
import { addCap, fit, mulTies, CAP_LABEL, grade } from './caps.js';
import { relOf, relMul, relGateOk } from './relations.js';
import { evalWhen } from './data.js';
import { ro, eul, iga, eun } from './text.js';

const T = () => B.track;

export function trackOf(sim) { return sim.S.track ? (sim.data.trackById[sim.S.track.id] || null) : null; }
export function affOf(sim) { return sim.S.track && sim.S.track.aff ? (sim.data.affById[sim.S.track.aff] || null) : null; }
export function trackStage(sim) { const t = trackOf(sim); return t ? t.stages[Math.min(sim.S.track.stage, t.stages.length - 1)] : null; }
/** 신원 카드 "진로 · 단계 칭호 · 소속" 문자열 */
export function trackName(sim) {
  const t = trackOf(sim); if (!t) return null;
  const st = trackStage(sim), a = affOf(sim);
  const head = a ? a.name : t.name;
  const tail = st ? (st.title || st.name) : '';
  // W14(QA A10): 칭호가 소속명에 들어 있거나("8대 공작령 · 공작") 소속명이 칭호에 들어 있으면 겹말 — 소속명만. 칭호가 진로명과 같아도 생략
  if (!tail || tail === head || head.includes(tail) || tail.includes(head) || (a && tail === t.name)) return head;
  return head + ' · ' + tail;
}
export function trackTitle(sim) { const st = trackStage(sim); return st ? (st.title || st.name) : null; }

// ── 진입 ─────────────────────────────────────────────────────────────
/** 올해 새 진로를 찾을 수 있는 상태인가 */
export function canSeek(sim) {
  const { S } = sim;
  if (S.phase !== 'life' || S.track || S.school || S.retired || S.serving || S.prison) return false;
  if (S.job === 'homemaker') return false;
  if (S.job && !S.track) return false;                       // 콘텐츠가 직접 준 구 직업(takeJob)
  if (S.ori.stage >= 3 && !S.rhodes) return false;
  if (humanAge(S.age, sim.race.lifeMul) >= 65) return false;
  const minAge = S.flags.noSchool && B.childLaborAge[S.q] ? B.childLaborAge[S.q] : 15;
  return S.age >= minAge;
}
/** W11: 입구 나이가 15세 미만으로 적힌 진로(HIG_NINJA 5~8·VIC_KNIGHT 11~14)는 재학 중에도 그 나이부터 롤한다 */
function childTrackOpen(sim) {
  const { S } = sim;
  if (!T().childTrackSeek || S.phase !== 'life' || S.age >= 15 || S.track || S.prison || S.serving || S.job) return false;
  return tracksFor(sim.data, S.cur).some((t) => t.entry.ages[0] < 15 && S.age >= t.entry.ages[0] && S.age <= t.entry.ages[1] && !t.synthetic && !t.forcedEntry && !t.noClasses && !t.A.flags.childLabor);
}

function zOf(S, key) {
  if (key === 'looks' || key === 'luck') return S.innate ? S.innate[key] : 0;
  return S.cap ? (S.cap[key] ?? 0) : 0;
}

/** gate 하나 평가 → false(불가) | 숫자(가중 배율) */
function gateMul(sim, g) {
  const { S } = sim;
  const w = typeof g.weight === 'number' ? g.weight : null;   // weight 가 있으면 조건이 아니라 가중
  const hit = (ok) => (w == null ? (ok ? 1 : false) : (ok ? w : 1));
  if (g.any) { let best = false; for (const sub of g.any) { const m = gateMul(sim, sub); if (m !== false && (best === false || m > best)) best = m; } return best; }   // W16(D56): 둘 중 하나(무급 인턴 = 돈 또는 계층)
  if (g.cap) {
    // W11: 역량 하한은 부드러운 문턱 — 모자란 만큼(z 단위) 가중을 줄이고 softCapGate 만큼 모자라면 0. 데이터 weight 가 있으면 종전처럼 가중만
    const z = zOf(S, g.cap), lo = g.min ?? -9, hi = g.max ?? 9;
    if (w != null) return hit(z >= lo && z <= hi);
    if (z > hi) return false;
    if (z >= lo) return 1;
    const soft = T().softCapGate ?? 0;
    const f = soft > 0 ? 1 - (lo - z) / soft : 0;
    return f > 0 ? f : false;
  }
  if (g.born) return hit(zOf(S, g.born) >= (g.min ?? -9) && zOf(S, g.born) <= (g.max ?? 9));
  if (g.status) {
    const neg = g.status.startsWith('!'); const k = neg ? g.status.slice(1) : g.status;
    const has = k === 'slave' ? !!S.status.slave : k === 'noble' ? !!S.status.noble : k === 'stigma' ? !!S.status.stigma : k === 'prisoner' ? !!S.prison
      : k === 'orphan' ? !!S.flags.orphan : S.status.stigma === k || !!S.flags[k];   // 그 밖의 신분 키(ninja_clan 등)는 플래그
    return hit(neg ? !has : has);
  }
  if (g.rel) return hit(relGateOk(S.rel, g.rel));
  if (g.race) { const list = Array.isArray(g.race) ? g.race : [g.race]; return hit(list.includes(S.race)); }
  if (g.edu != null) return hit(S.edu + (S.q >= 4 ? 1 : 0) >= g.edu);
  if (g.sex) return hit(S.sex === g.sex);
  if (g.year) { const y = S.by + S.age; return hit(Array.isArray(g.year) ? y >= g.year[0] && y <= g.year[1] : evalWhen('year' + g.year, S)); }   // W11: [y0,y1] 배열형
  if (g.urban != null) { const ok = !!S.urban === !!g.urban; return sim._switching && w == null ? (ok ? 1 : 0.3) : hit(ok); }   // W14(QA A13): 농민류 {urban:false} 는 출생 롤에서 하드, 전직(switch)·이주 뒤에는 가중
  if (g.infected != null) return hit(!!S.ori.on === !!g.infected);
  if (g.known != null) return hit(!!S.ori.known === !!g.known);
  if (g.rhodes != null) return hit(!!S.rhodes === !!g.rhodes);
  if (g.q) return hit(S.q >= g.q[0] && S.q <= g.q[1]);
  if (g.flag) return hit(!!S.flags[g.flag]);
  if (g.region) return hit((S.sub && S.sub.region) === g.region);
  if (g.eth) return hit(S.eth === g.eth);
  if (g.money != null) return hit(S.money >= sim.med * g.money);
  if (g.papers) return hit((Array.isArray(g.papers) ? g.papers : [g.papers]).includes(S.res.papers));
  if (g.newcomer != null) return hit((S.res.phase === 'settling') === !!g.newcomer);
  return 1;
}

/** W12(D51-10): 가중 게이트가 맞았을 때 선택지 sub 에 적을 요인 이름 */
function gateLabel(sim, g) {
  if (g.status) return g.status === 'noble' ? '작위' : g.status === 'slave' ? '신분' : g.status === 'orphan' ? '고아' : g.status === 'prisoner' ? '수감' : '집안 내력';
  if (g.region) { const n = sim.nation.culture && sim.nation.culture.factions && sim.nation.culture.factions[g.region]; return n ? '출신 진영(' + n + ')' : '출신 지역'; }
  if (g.race) return '종족';
  if (g.urban != null) return g.urban ? '도시 출신' : '농촌 출신';
  if (g.flag) return '지난 일';
  if (g.q) return '출신 계층';
  if (g.year) return '시대';
  if (g.edu != null) return '학력';
  if (g.born) return CAP_LABEL[g.born] || '타고남';
  if (g.sex) return g.sex === 'M' ? '남성' : '여성';
  if (g.newcomer != null || g.papers) return '이주민';
  if (g.infected != null) return g.infected ? '감염' : '비감염';
  if (g.cap) return (CAP_LABEL[g.cap] || '역량') + ' 높음';
  if (g.money != null) return '재산';
  if (g.any) return gateLabel(sim, g.any[0]);
  return '조건';
}

// ── W16(D56): 닫힌 문 — 조건 미달 사전(조건 · 길) ────────────────
const CAP_PATH = { learn: '공부 초점·학교', skill: '운동 초점·재직', arts: '아츠 초점', ties: '가족·놀이 초점' };
const fmtLMD = (n) => Math.round(n).toLocaleString('en-US') + ' LMD';
/** 게이트 하나가 지금 미달인가(가중 게이트는 조건이 아니다). cap 은 soft 문턱을 무시하고 min 으로 본다 */
export function gateUnmet(sim, g) {
  if (g.weight != null) return false;
  if (g.any) return g.any.every((x) => gateUnmet(sim, x));
  if (g.cap) { const z = zOf(sim.S, g.cap); return z < (g.min ?? -9) || z > (g.max ?? 9); }
  return gateMul(sim, g) === false;
}
/** 조건 미달 게이트의 힌트: "조건 · 길: …". 신원 카드(꿈 조건)와 track_choose 의 닫힌 문 sub 가 쓴다 */
export function gateHint(sim, g) {
  if (g.any) return g.any.map((x) => gateHint(sim, x)).join(' 또는 ');
  if (g.cap) {
    if (g.cap === 'looks') return '외모 · 수술 결정 말고는 길 없음';
    if (g.cap === 'luck') return '운 · 길 없음';
    return (CAP_LABEL[g.cap] || '역량') + ' ' + grade(g.min ?? -9) + ' 이상 · 길: ' + (CAP_PATH[g.cap] || '초점');
  }
  if (g.born) return g.born === 'looks' ? '외모 · 수술 결정 말고는 길 없음' : '운 · 길 없음';
  if (g.money != null) return '비용 ' + fmtLMD(sim.med * g.money) + ' · 길: 저축';
  if (g.status) { const neg = g.status.startsWith('!'); const k = neg ? g.status.slice(1) : g.status; return (k === 'noble' ? '작위' : k === 'slave' ? '신분' : k === 'orphan' ? '고아' : k === 'prisoner' ? '수감' : '집안 내력') + (neg ? ' 없어야 함' : '') + ' · 길 없음'; }
  if (g.rel) return '종족 관계 · 길 없음';
  if (g.race) return '종족 · 길 없음';
  if (g.edu != null) return '학력 · 길: 진학';
  if (g.sex) return (g.sex === 'M' ? '남성' : '여성') + '만 · 길 없음';
  if (g.q) return '출신 계층 · 길 없음';
  if (g.year) return '시대 · 길: 때를 기다림';
  if (g.urban != null) return (g.urban ? '도시' : '농촌') + ' 거주 · 길: 이사';
  if (g.infected != null) return g.infected ? '감염자만' : '비감염자만';
  if (g.known != null) return g.known ? '감염 판정자만' : '판정 전만';
  if (g.rhodes != null) return '로도스 합류자만';
  if (g.flag) return '지난 일 · 길 없음';
  if (g.region) return '출신 지역 · 길 없음';
  if (g.eth) return '민족 · 길 없음';
  if (g.papers || g.newcomer != null) return '체류 서류 · 길: 정착·귀화';
  return '조건 미달';
}
/** 지금 거주국에서 열릴 수 있는 진로인가(진입 후보 집합과 같은 범위) */
function doorTrack(sim, t) {
  const { S } = sim;
  if (!t || t.forcedEntry || t.synthetic || t.noClasses || t.dept) return false;
  if (!tracksFor(sim.data, S.cur).includes(t)) return false;
  const ages = t.entry.ages;
  return S.age >= ages[0] && S.age <= ages[1] + 50 * (sim.race.lifeMul - 1);
}
/** W16(D56): track_choose 모달의 닫힌 문 — 보인 선택지(shownIds)에 없는 진로 중 조건(min 기준) 미달인 것: 꿈 진로(맨 앞) → 국가 특수 진로 → 계층상 열리는 일반 진로(모자란 조건 1~2개). 최대 B.dream.closedMax.
 *  열린 후보(openIds, soft 문턱 통과)에는 있으나 가중이 낮아 보이지 않은 진로는 narrow('좁은 문') */
export function closedDoors(sim, openIds = [], shownIds = openIds) {
  const { S, data } = sim;
  const max = B.dream.closedMax ?? 2;
  const open = new Set(openIds);
  const out = []; const seen = new Set(shownIds);
  const cw = (t) => (t.entry.classes || {})['q' + S.q] ?? 0;
  let clsClosed = 0;
  const consider = (t, isDream) => {
    if (!t || seen.has(t.id) || out.length >= max || !doorTrack(sim, t)) return;
    const unmet = t.entry.gates.filter((g) => gateUnmet(sim, g));
    const cls = cw(t) > 0;
    if (!unmet.length && cls) return;                        // 왜 닫혔는지 말할 수 없으면 보이지 않는다(올해 롤에서 빠졌을 뿐)
    if (!isDream && unmet.length > 2) return;
    if (!isDream && !cls && (!t.special || t.archetype === 'A5' || clsClosed >= 1)) return;   // 계층으로 닫힌 문은 국가 특수 진로만(생업·노동 A5 제외), 모달당 1개
    if (!isDream && cls && unmet.length < 1) return;
    if (!cls) clsClosed++;
    const hints = unmet.map((g) => gateHint(sim, g));
    if (!cls) hints.unshift('출신 계층 · 길 없음');
    seen.add(t.id);
    out.push({ id: t.id, name: t.name, dream: isDream, narrow: open.has(t.id), hints, n: unmet.length });   // narrow: soft 문턱으로 후보에는 있으나 가중이 낮아 보이지 않은 길
  };
  if (S.dream && S.dream.id && S.flags.dreamDone == null) consider(data.trackById[S.dream.id], true);
  const rest = tracksFor(data, S.cur).filter((t) => doorTrack(sim, t) && !seen.has(t.id))
    .map((t) => ({ t, n: t.entry.gates.filter((g) => gateUnmet(sim, g)).length, w: cw(t) })).filter((x) => x.n <= 2 && (x.w > 0 ? x.n >= 1 : x.t.special && x.t.archetype !== 'A5'))
    .sort((a, b) => (b.w > 0 ? 1 : 0) - (a.w > 0 ? 1 : 0) || (b.t.special ? 1 : 0) - (a.t.special ? 1 : 0) || a.n - b.n || b.w - a.w);   // 조건(역량·돈…) 미달인 문 먼저 — 국가 특수 진로, 그다음 일반 진로(모자란 조건이 적고 계층 가중이 큰 순). 계층으로 닫힌 특수 진로는 마지막에 1개
  for (const x of rest) consider(x.t, false);
  return out;
}

// ── W16(D56): 장래 희망 ───────────────────────────────────────
const DREAM_SKIP_VIA = ['conscript', 'mandatory', 'draft', 'youth_reserve', 'sentenced', 'convict', 'captured', 'diagnosed', 'sold', 'born', 'fallen', 'political', 'family'];
/** 8~11세 꿈 후보: (a) 거주국 진로 중 출신 계층 classes 최상위 (b) 가중 최상위 국가 특수 진로(조건 미달이어도) (c) 부모 직업과 같은 진로 (d) 감염 가정이면 로도스 오퍼레이터(rhodesYear 이후) */
export function dreamCandidates(sim) {
  const { S, data } = sim;
  const q = 'q' + S.q;
  const noWay = (t) => t.entry.gates.some((g) => !g.cap && !g.born && g.money == null && !g.any && !g.year && gateUnmet(sim, g));   // 신분·종족·지역·성별… 자라도 못 넘는 문
  const forcedVia = (t) => t.entry.via && t.entry.via.length && t.entry.via.every((v) => DREAM_SKIP_VIA.includes(v));   // 징집·선고·판정·납치로만 들어가는 길은 꿈이 아니다
  const pool = tracksFor(data, S.cur).filter((t) => !t.forcedEntry && !t.synthetic && !t.noClasses && !t.dept && !t.A.flags.childLabor && t.entry.ages[0] <= 30 && !noWay(t) && !forcedVia(t));
  const cw = (t) => (t.entry.classes || {})[q] ?? 0;
  const maxC = (t) => Math.max(0, ...Object.values(t.entry.classes || {}).map(Number));
  const out = []; const used = new Set();
  const add = (t, kind, sub, auto) => { if (!t || used.has(t.id)) return; used.add(t.id); out.push({ id: t.id, name: t.name, kind, sub, auto }); };
  add(pool.filter((t) => cw(t) > 0).sort((a, b) => cw(b) - cw(a))[0], 'class', '“우리 동네 사람들은 다 그래요” · 출신 계층의 길', 0.3);
  const adm = (t) => t.special && !used.has(t.id) && t.archetype !== 'A5';   // 동경의 길: 생업·노동(A5)은 아이가 꿈꾸지 않는다
  const sp = pool.filter((t) => adm(t) && cw(t) > 0).sort((a, b) => cw(b) - cw(a))[0] || pool.filter(adm).sort((a, b) => maxC(b) - maxC(a))[0];
  add(sp, 'special', '“이야기에 나오는 사람들이에요” · 이 나라의 길', 1.3);
  for (const who of ['dad', 'mom']) {
    const p = S.fam[who]; const job = p && p.job; if (!job) continue;
    const t = pool.filter((x) => (x.job || x.id) === job).sort((a, b) => cw(b) - cw(a))[0];
    if (t) { add(t, 'parent', '“' + (who === 'dad' ? '아버지' : '어머니') + '처럼요” · 부모의 길', 0.7); break; }
  }
  const famInf = (S.fam.dad && S.fam.dad.infected) || (S.fam.mom && S.fam.mom.infected);
  if (sim.year >= (B.dream.rhodesYear ?? 1094) && (S.ori.known || famInf) && data.trackById.RHO_OPERATOR) add(data.trackById.RHO_OPERATOR, 'rhodes', '“아픈 사람도 받아 준다는 배가 있대요” · 외근 오퍼레이터가 되면 이룸', 0.6);
  return out;
}
/** 꿈 진로 진입 시 달성. 생애 1회. 행복 +happyIn, 기록 big */
export function achieveDream(sim, id, text) {
  const { S, data } = sim;
  if (!S.dream || S.dream.id !== id || S.flags.dreamDone != null) return false;
  const t = data.trackById[id];
  S.flags.dreamDone = S.age;
  const h = B.dream.happyIn ?? 8;
  S.st.h = clamp(S.st.h + h, 0, 100);
  sim.log(text || ('어릴 적 꿈대로 ' + iga(t ? t.name : id) + ' 되었습니다.'), 'big', null, { h });
  return true;
}
/** W16-2: 올해 꿈을 접을 확률(인간 척도 나이 h). 원형·계층·가족 보정. 0 이면 아직 이르다 */
export function dreamGiveUpP(sim) {
  const { S, data } = sim;
  const G = B.dream.giveUp || {};
  const t = S.dream && data.trackById[S.dream.id];
  const [start, k] = (t && G.arch && G.arch[t.archetype]) || [G.start ?? 24, 1];
  const h = humanAge(S.age, sim.race.lifeMul);
  let slope = (G.slope ?? 0.025) * k;
  if (S.q <= 2) slope *= G.lowQ ?? 1.3; else if (S.q >= 4) slope *= G.highQ ?? 0.8;
  if (S.fam && (S.fam.marriage || (S.fam.kids && S.fam.kids.length))) slope *= G.family ?? 1.2;
  return clamp((h - start) * slope, 0, G.max ?? 0.35);
}
/** 한국어 나이말: 32 → '서른둘', 40 → '마흔', 19 → '열아홉' */
export function koAge(n) {
  n = Math.max(1, Math.round(n));
  if (n >= 100) return n + '세';
  const tens = ['', '열', '스물', '서른', '마흔', '쉰', '예순', '일흔', '여든', '아흔'];
  const ones = ['', '하나', '둘', '셋', '넷', '다섯', '여섯', '일곱', '여덟', '아홉'];
  if (n < 10) return ones[n] || n + '세';
  return tens[Math.floor(n / 10)] + ones[n % 10];
}
/** 연말: 꿈 진로에 못 들어간 채 나이가 들면 해저드 롤로 접는다(dreamGiveUpP). 꿈 진로가 올해 후보에 열려 있었으면 롤하지 않는다.
 *  접으면 행복 happyGiveUp, flags.dreamGiven = 인간 척도 나이(반올림). 문장은 나이대별 3종 */
export function dreamYear(sim) {
  const { S, data } = sim;
  if (!S.dream || !S.dream.id || S.flags.dreamDone != null || S.flags.dreamGiven) return;
  const tc = S.flags.trackCands;
  if (tc && tc.age === S.age && tc.cands.some((c) => c.id === S.dream.id)) return;
  const p = dreamGiveUpP(sim);
  if (!(p > 0) || !sim.rng.chance(p)) return;
  const t = data.trackById[S.dream.id];
  const ha = Math.round(humanAge(S.age, sim.race.lifeMul));
  S.flags.dreamGiven = ha;
  S.flags.dreamGivenAt = S.age;   // 표시에는 실제 나이, 분포 집계에는 인간 척도를 사용
  const h = B.dream.happyGiveUp ?? -3;
  S.st.h = clamp(S.st.h + h, 0, 100);
  const nm = t ? t.name : '그 길';
  const text = ha < 30 ? iga(nm) + ' 되는 일은 뒤로 미루고, 다른 일을 먼저 하기로 했습니다.'
    : ha < 40 ? iga(nm) + ' 되겠다던 어릴 적 꿈을 접었습니다.'
    : '오래 미뤘던 ' + nm + '의 꿈을 내려놓았습니다.';
  sim.log(text, 'loss', null, { h });
}
/** 신원 카드용: 꿈 진로와 조건 n/m(가중 게이트 제외) */
export function dreamStatus(sim) {
  const { S, data } = sim;
  if (!S.dream || !S.dream.id) return null;
  const t = data.trackById[S.dream.id]; if (!t) return null;
  const gates = t.entry.gates.filter((g) => g.weight == null).map((g) => ({ hint: gateHint(sim, g), ok: !gateUnmet(sim, g) }));
  return { id: t.id, name: t.name, at: S.dream.at, done: S.flags.dreamDone != null, given: !!S.flags.dreamGiven, gates, n: gates.filter((g) => g.ok).length, m: gates.length };
}
const whyOf = (F) => { let best = null; for (const f of F) if (!best || f[1] > best[1]) best = f; return best ? best[0] : null; };

/** 진입 후보와 가중(§5). forced 진로는 제외(강제 전환으로만 들어간다). 각 후보에 why(가중의 최대 요인 한 줄, W12 D51-10) */
export function entryCandidates(sim, opts = {}) {
  const { S, data } = sim;
  const out = [];
  const settling = S.res && S.res.phase === 'settling';
  const child = S.age < 15;
  const laborOk = child && S.flags.noSchool && B.childLaborAge[S.q] && S.age >= B.childLaborAge[S.q];   // 학교 못 간 최하층 아동 노동
  const subRegion = S.sub && S.sub.region;
  for (const t of tracksFor(data, S.cur)) {
    if (t.forcedEntry && !opts.includeForced) continue;
    if (t.noClasses && !opts.includeNoClass && !t.entry.trigger) continue;
    if (opts.exclude && opts.exclude === t.id) continue;
    const ages = t.entry.ages;
    const maxAge = ages[1] + 50 * (sim.race.lifeMul - 1);
    if (S.age < ages[0] || S.age > maxAge) continue;
    if (child && !((laborOk && (t.A.flags.childLabor || t.synthetic)) || (ages[0] < 15 && !t.synthetic && !t.A.flags.childLabor))) continue;   // W11: 입구 나이 < 15 진로는 그 나이부터
    if (settling && !(['A11', 'A5', 'A6'].includes(t.archetype) || t.entry.gates.some((g) => g.newcomer))) continue;
    if (t.dept && !S.rhodes) continue;                       // 로도스 내부 진로는 합류자만
    const classes = t.entry.classes || {};
    const F = [];   // W12(D51-10): 가중 요인 [이름, 배율] — 선택지 sub 의 "왜 이 후보가 떴는지"
    let w = t.noClasses ? 1 : (classes['q' + S.q] ?? 0);
    if (!t.noClasses && w > 0) { const maxC = Math.max(...Object.values(classes).map(Number), 0.0001); F.push(['출신 계층', 0.6 + 0.9 * (w / maxC)]); }
    // W11 (g): COM_* 공통 입구 entry.trigger = { nations?:[…], p?:가중, … } — 거주국이 목록에 있으면 그 가중으로 후보에 든다
    if (t.noClasses && t.entry.trigger && !opts.includeNoClass) { const tg = t.entry.trigger; if (tg.nations && !tg.nations.includes(S.cur) && !tg.nations.includes(S.root)) continue; w = tg.p ?? tg.w ?? 0.05; F.push(['이 나라에 열린 자리', 1.1]); }
    if (!(w > 0)) continue;
    // W11 (b): 하위 지역 거주자에게 상위국 진로는 ×parentNationMul. (a) 소지역 표시 진로는 S.sub.region 이 다르면 ×regionOffMul(데이터에 region 게이트가 있으면 그쪽이 맡는다)
    if (t.nation !== S.cur && t.nation === S.root) w *= T().parentNationMul;
    if (t.region && !data.nationById[t.region] && t.region !== subRegion && !t.entry.gates.some((g) => g.region)) w *= T().regionOffMul;
    let ok = true;
    for (const g of t.entry.gates) { const m = gateMul(sim, g); if (m === false) { ok = false; break; } w *= m; if (m > 1) F.push([gateLabel(sim, g), m]); }
    if (!ok) continue;
    const rel = relOf(data, S.cur, S.race, sim.year, { track: t.id, eth: S.eth });
    { const rm = relMul(rel, data); w *= rm; if (rm > 1) F.push(['종족 우대', rm]); }
    const s0 = t.stages[0];
    const capKey = s0.promo ? s0.promo.cap : t.A.promoCap;
    { const z = zOf(S, capKey), fv = fit(z, T().fitShift); w *= fv; F.push([(CAP_LABEL[capKey] || '역량') + ' ' + grade(z), fv + (z >= 0.5 ? 0.5 : 0)]); }
    if (S.dream && S.dream.id === t.id && S.flags.dreamDone == null) { w *= B.dream.mul ?? 1.5; F.push(['어릴 적 꿈', 9]); }   // W16(D56): 꿈 진로는 가중 ×, 까닭 첫 줄
    const lw = t.A.flags.looksWeight;
    if (lw) { const lm = clamp(1 + (lw - 1) * 0.5 * S.innate.looks, 0.3, 3); w *= lm; if (lm > 1) F.push(['외모', lm]); }
    if (t.special) { w *= T().specialBoost; F.push(['이 나라의 길', 1.0]); }   // 까닭 순위에서는 다른 요인이 없을 때만
    if (settling) w *= T().settlingMul;
    if (S.flags.disgraceAt != null && S.age - S.flags.disgraceAt < 10) w *= T().disgraceMul;
    if (t.A.flags.exam && (S.flags['examFail_' + t.id] || 0) >= t.A.flags.examTries) continue;
    if (w > 0) out.push({ id: t.id, w: +w.toFixed(4), special: t.special, name: t.name, why: whyOf(F) });
  }
  return out;
}

/** 올해 진입 롤(나이당 1회 캐시). 성공하면 {cands} 를 S.flags.trackCands 에 둔다 */
export function rollEntry(sim) {
  const { S, rng } = sim;
  if (S.flags.trackRollAge === S.age) return S.flags.trackCands && S.flags.trackCands.age === S.age ? S.flags.trackCands : null;
  S.flags.trackRollAge = S.age;
  S.flags.trackCands = null;
  if (!canSeek(sim) && !childTrackOpen(sim)) return null;
  const p = S.flags.everWorked ? T().seekPJobless : T().seekP;
  if (!rng.chance(p)) { S.flags.joblessYears = (S.flags.joblessYears || 0) + (S.age >= 15 ? 1 : 0); return null; }
  let cands = entryCandidates(sim);
  // W11: 아동 진입(입구 나이 < 15 진로)은 가중을 제안 확률로 쓴다 — 평범한 아이가 5세에 닌자 가문에 들어가지 않게
  if (S.age < 15 && !canSeek(sim)) cands = cands.filter((c) => rng.chance(Math.min(1, c.w * T().childTrackMul)));
  if (!cands.length) { S.flags.joblessYears = (S.flags.joblessYears || 0) + (S.age >= 15 ? 1 : 0); return null; }
  S.flags.trackCands = { age: S.age, cands };
  return S.flags.trackCands;
}

/** 결정 모달에 보일 후보 2~4개: 가중 상위 + 국가 특수 진로 최소 1개(D26) */
export function choiceSet(sim, cands) {
  const sorted = cands.slice().sort((a, b) => b.w - a.w);
  const pick = sorted.slice(0, 3);
  const special = sorted.find((c) => c.special);
  if (special && !pick.includes(special)) { if (pick.length >= 3) pick.pop(); pick.push(special); }
  return pick.slice(0, 4);
}

/** 소속 배정(weight) */
export function assignAff(sim, t) {
  const { S, rng, data } = sim;
  const list = t.affiliations.map((id) => data.affById[id]).filter(Boolean);
  if (!list.length) return null;
  // W15(D55): 소속 gates[](진로 entry.gates 와 같은 키) — 조건 미달이면 후보에서 빠지고, weight 가 있으면 가중. 희귀 소속(블랙스틸·라인 랩·펭귄·몬스터 사이렌)
  const weighted = list.map((a) => { let w = a.weight; for (const g of a.gates || []) { const m = gateMul(sim, g); if (m === false) { w = 0; break; } w *= m; } return [a.id, w]; }).filter(([, w]) => w > 0);
  const id = rng.wpick(weighted.length ? weighted : list.map((a) => [a.id, a.weight]));
  return id || null;
}

function examRoll(sim, t) {
  const { S, rng } = sim;
  const p = clamp(1 / (1 + Math.exp(-(zOf(S, 'learn') - 0.5))), 0.05, 0.95);
  if (rng.chance(p)) return true;
  S.flags['examFail_' + t.id] = (S.flags['examFail_' + t.id] || 0) + 1;
  sim.log(t.name + ' 시험에 떨어졌습니다.' + (S.flags['examFail_' + t.id] < t.A.flags.examTries ? ' 다시 볼 수 있습니다.' : ' 더는 응시할 수 없습니다.'), 'bad');
  return false;
}

/**
 * 진로 진입. opts: { via, how('enter'|'switch'|'forced'|'rhodes'|'retire'), aff, stage, quiet }
 * A3 는 입구 시험 롤. 실패하면 false.
 */
export function enterTrack(sim, id, opts = {}) {
  const { S, data } = sim;
  const t = data.trackById[id];
  if (!t) return false;
  // 타국 진로로의 전환은 곧 이주(§7): SIR_CLERGY → LAT_FALLEN 류. common·rhodes·거주국(하위 지역 포함) 진로는 제외. opts.noMigrate 면 거주국을 두고 진로만(W11, LAT_FALLEN·AEG_EXPAT)
  if (!opts.noMigrate && t.nation !== 'common' && t.nation !== 'rhodes' && t.nation !== S.cur && t.nation !== S.root && data.nationById[t.nation] && !data.nationById[t.nation].virtual) {
    const dest = data.nationById[t.nation].parent && data.nationById[t.nation].parent !== S.root ? t.nation : t.nation;
    if (S.track) leaveTrack(sim, opts.how || 'switch', { quiet: true });
    if (!sim.migrate(opts.reason || (t.forcedEntry ? 'exile' : 'work'), dest, { keepTrack: true })) return false;
  }
  if (S.track) leaveTrack(sim, opts.how === 'switch' ? 'switch' : (opts.how || 'switch'), { quiet: true });
  if (t.A.flags.exam && opts.how !== 'forced' && opts.how !== 'rhodes' && !opts.skipExam && !examRoll(sim, t)) return false;
  const aff = opts.aff !== undefined ? opts.aff : assignAff(sim, t);
  const a = aff ? data.affById[aff] : null;
  let stage = opts.stage ?? 0;
  if (opts.stage == null && t.entry.startStage) stage = t.entry.startStage['q' + S.q] ?? 0;
  stage = clamp(stage, 0, t.stages.length - 1);
  S.track = { id: t.id, stage, since: S.age, stageSince: S.age, years: 0, standing: clamp((t.standing.start ?? 20) + (a ? a.mods.standingStart : 0), 0, 100), aff: aff || null,
    flags: { via: opts.via || (t.entry.via && t.entry.via[0]) || null } };
  const sc = t.stages[stage].contract;
  if (sc) S.track.flags.contractEnd = S.age + sc; else if (t.contract) S.track.flags.contractEnd = S.age + sim.rng.ri(t.contract[0], t.contract[1]);
  S.job = t.job || t.id; S.jobY = 0; S.school = null; S.retired = false;
  if (t.dept && S.rhodes && S.rhodes !== true) S.rhodes.dept = t.dept;   // W11: RHO_* 진로로 옮기면 부서도 따라간다
  S.flags.everWorked = true; S.flags.joblessYears = 0; S.flags.trackCands = null; S.flags.promoDue = null; S.flags.promoWaits = 0;
  if (S.age < 15 && S.flags.childLabor == null) { S.flags.childLabor = S.age; if (!opts.quiet) sim.log('아직 아이지만 일을 시작했습니다.', 'bad', '(' + (sim.nation.statOrg || '기록소') + ' 노동 대장에는 나이 칸이 없습니다)'); }
  if (!opts.quiet) {
    const where = a ? a.name : t.name;
    const st = t.stages[stage];
    sim.log(ro(where) + ' 들어갔습니다. ' + (st.title || st.name) + (opts.how === 'forced' ? '. 선택은 없었습니다.' : '.'), opts.how === 'forced' ? 'bad' : 'ev');
  }
  achieveDream(sim, t.id);   // W16(D56)
  sim.HOOK.change(S, sim);
  return true;
}

/** 진로 이탈. how: 'retire'|'expel'|'switch'|'injured'|'infected'|'disgrace'|'prison'|'exile'|'death'|'content'|'homemaker'|'discharged'|'migrate'|'term' */
export function leaveTrack(sim, how = 'expel', opts = {}) {
  const { S } = sim;
  const tr = S.track;
  if (!tr) return false;
  const t = trackOf(sim);
  const st = t ? t.stages[Math.min(tr.stage, t.stages.length - 1)] : null;
  S.trackHist.push({ id: tr.id, from: tr.stageSince, to: S.age, stage: st ? st.id : null, how, aff: tr.aff || null });
  S.flags.lastTrack = tr.id; S.flags.lastTrackStage = st ? st.id : null; S.flags.lastTrackLeftAt = S.age; S.flags.lastTrackHow = how;
  S.track = null; S.flags.promoDue = null;
  if (S.job !== 'homemaker') { S.job = null; S.income = 0; }
  S.jobY = 0;
  if (!opts.quiet && how === 'expel') sim.log((t ? eul(t.name) : '일을') + ' 그만두게 되었습니다.', 'loss');
  sim.HOOK.change(S, sim);
  return true;
}

// ── 승급·몰락 ──────────────────────────────────────────────────────────
function requiresOk(sim, req) {
  if (!req) return true;
  const { S } = sim;
  const a = affOf(sim);
  if (req.aff && !(a && a.tags.includes(req.aff))) return false;
  if (req.standing != null && S.track.standing < req.standing) return false;
  if (req.cap && zOf(S, req.cap) < (req.min ?? 0)) return false;
  if (req.edu != null && S.edu < req.edu) return false;
  if (req.flag && !S.flags[req.flag]) return false;
  if (req.year != null) { const y = sim.year; if (Array.isArray(req.year) ? (y < req.year[0] || y > req.year[1]) : y < req.year) return false; }
  if (req.race && !req.race.includes(S.race)) return false;
  if (req.status) { const k = req.status; if (k === 'noble' ? !S.status.noble : k === 'slave' ? !S.status.slave : !S.flags[k]) return false; }
  return true;
}
/** 평민 상한(A4 capStage): track.capStage[q] 또는 신분 */
function stageCap(sim, t) {
  const { S } = sim;
  let cap = t.stages.length - 1;
  if (S.status.noble) return cap;
  if (t.capStage) {
    const c = t.capStage['q' + S.q];
    if (c != null) cap = Math.min(cap, c);
  } else {
    const i = t.stages.findIndex((s) => s.capStage && s.capStage['q' + S.q]);   // W8: 단계에 capStage:{q1:true} = 그 단계가 상한
    if (i >= 0) cap = Math.min(cap, i);
    else if (t.A.flags.capStage && S.q <= 3) cap = Math.min(cap, Math.max(1, t.stages.length - 2));
  }
  return cap;
}

/** W12(D53b): 지금 단계의 승급 확률·기회 확률. eligible 이 false 면 올해는 승급 대상이 아니다 */
export function promoChance(sim) {
  const { S } = sim;
  const t = trackOf(sim); if (!t || !S.track) return null;
  const tr = S.track;
  const st = t.stages[Math.min(tr.stage, t.stages.length - 1)];
  if (!st.promo || tr.stage >= t.stages.length - 1) return { eligible: false, p: 0, opp: 0, succ: 0, next: null };
  const a = affOf(sim);
  const mods = a ? a.mods : { promo: 1 };
  const eligible = S.age - tr.stageSince >= (st.minYears ?? 0) && tr.stage < stageCap(sim, t) && requiresOk(sim, st.promo.requires);
  let p = st.promo.k * (1 + zOf(S, st.promo.cap)) * (0.5 + tr.standing / 100) * mods.promo;
  if (t.A.flags.omenPromo && !S.flags.omen) p *= T().a7PromoMul;
  p = clamp(p, 0, T().promoMax);
  const opp = clamp(p * (T().promoOppMul ?? 1.6), T().promoOppMin ?? 0.15, T().promoOppMax ?? 0.8);
  const succ = p > 0 ? clamp(p / opp, 0.05, 0.95) : 0;
  return { eligible, p, opp, succ, next: t.stages[tr.stage + 1], cap: st.promo.cap };
}

/** 승급(콘텐츠 헬퍼로도 쓰인다). 성공 true */
export function promote(sim, opts = {}) {
  const { S } = sim;
  const t = trackOf(sim); if (!t) return false;
  const tr = S.track;
  if (tr.stage >= t.stages.length - 1) return false;
  if (!opts.force && tr.stage >= stageCap(sim, t)) return false;
  const next = t.stages[tr.stage + 1];
  if (!opts.force && !requiresOk(sim, t.stages[tr.stage].promo && t.stages[tr.stage].promo.requires)) return false;
  if (!opts.force && S.age - tr.stageSince < (t.stages[tr.stage].minYears ?? 0)) return false;   // W14(QA B6): 콘텐츠 promote() 도 minYears 를 지킨다
  S.trackHist.push({ id: tr.id, from: tr.stageSince, to: S.age, stage: t.stages[tr.stage].id, how: 'promo' });
  tr.stage++; tr.stageSince = S.age;
  if (next.contract) tr.flags.contractEnd = S.age + next.contract;
  tr.standing = clamp(tr.standing + T().promoStanding, 0, 100);
  if (!opts.quiet) {
    const a = affOf(sim);
    sim.log((a ? a.name + '에서 ' : '') + (next.title ? iga(next.title) + ' 되었습니다.' : ro(next.name) + ' 올라섰습니다.'), 'big', null, { h: 4, standing: T().promoStanding });   // W12: 지위 ▲ 표시
    sim.eff({ h: 4 });
  }
  return true;
}
export function demote(sim, opts = {}) {
  const { S } = sim;
  const t = trackOf(sim); if (!t) return false;
  const tr = S.track;
  if (tr.stage <= 0) { leaveTrack(sim, 'expel'); return true; }
  S.trackHist.push({ id: tr.id, from: tr.stageSince, to: S.age, stage: t.stages[tr.stage].id, how: 'demote' });
  tr.stage--; tr.stageSince = S.age; tr.standing = clamp(tr.standing - 15, 0, 100);
  if (!opts.quiet) sim.log(ro(t.stages[tr.stage].title || t.stages[tr.stage].name) + ' 내려앉았습니다.', 'loss', null, { h: -5, standing: -15 });
  sim.eff({ h: -5 });
  return true;
}

/** exits.fall 값 사전 적용(§3.5). value: death|prison:jail|prison:camp|exile|demote|expel|injured|infected|disgrace|arena:<ID>|switch:<ID>|{kind,to} */
export function applyExit(sim, value, cause = 'ruin') {
  const { S, rng } = sim;
  const t = trackOf(sim);
  const label = FALL_CAUSE_LABEL[cause] || cause;
  const v = typeof value === 'string' ? value : (value && value.kind ? value.kind + (value.to ? ':' + value.to : '') : 'expel');
  const [kind, arg] = v.split(':');
  const where = affOf(sim) ? affOf(sim).name : (t ? t.name : '');
  switch (kind) {
    case 'death': {
      const cid = arg || (sim.data.fallDeathCause && sim.data.fallDeathCause[cause]) || FALL_CAUSE_TO_DEATH[cause] || cause;
      if (t && t.A.flags.familyDeath && cause === 'vendetta') {
        const f = S.fam;
        if (f.partner && f.partner.alive && rng.chance(T().a1FamilyDeathP)) { f.partner.alive = false; f.widowed = true; }
        for (const k of f.kids) if (k.alive && rng.chance(T().a1FamilyDeathP)) { k.alive = false; S.stats.kidsLost++; }
      }
      leaveTrack(sim, 'death', { quiet: true });
      sim.die(cid, label);
      return 'death';
    }
    case 'prison': {
      const kindP = arg === 'camp' ? 'camp' : 'jail';
      leaveTrack(sim, 'prison', { quiet: true });
      S.prison = kindP; S.prisonLeft = kindP === 'camp' ? rng.ri(...T().campYears) : rng.ri(...T().jailYears);
      mulTies(S, 1 - B.cap.prisonTies);
      S.school = null;
      sim.log(label + '. ' + (kindP === 'camp' ? '수용소로 끌려갔습니다.' : '감옥에 갇혔습니다. ' + S.prisonLeft + '년.'), 'bad');
      return 'prison';
    }
    case 'exile': {
      leaveTrack(sim, 'exile', { quiet: true });
      S.status.stigma = S.status.stigma || 'exile';
      sim.log(label + '. 나라를 떠나야 했습니다.', 'bad');
      sim.migrate(cause === 'purge' || cause === 'impeach' ? 'asylum' : 'exile');
      return 'exile';
    }
    case 'demote': sim.log(label + '.', 'bad'); demote(sim); return 'demote';
    case 'expel': leaveTrack(sim, 'expel', { quiet: true }); sim.log(label + '. ' + (where ? eun(where) + ' 끝났습니다.' : '일자리를 잃었습니다.'), 'loss'); return 'expel';
    case 'injured': leaveTrack(sim, 'injured', { quiet: true }); sim.eff({ hl: -30 }); sim.log(label + '. 크게 다쳤고, 일을 계속할 수 없었습니다.', 'loss'); return 'injured';
    case 'infected': {
      leaveTrack(sim, 'infected', { quiet: true });
      if (!S.ori.on) sim.infect('work');
      sim.log(label + '. 진로가 끝났습니다.', 'loss');
      if (!S.ori.known) sim.diagnose('work');   // W14(QA B8): 감염 판정으로 끝난 진로는 판정이 난 것(known)
      return 'infected';
    }
    case 'disgrace': {
      if (S.track) S.track.standing = 0;
      leaveTrack(sim, 'disgrace', { quiet: true });
      S.flags.disgraceAt = S.age; S.status.stigma = S.status.stigma || 'disgrace';
      sim.log(label + '. 이름에 금이 갔습니다.', 'loss');
      return 'disgrace';
    }
    case 'arena': case 'switch': {
      const to = arg;
      sim.log(label + '.', 'bad');
      if (to && sim.data.trackById[to]) { enterTrack(sim, to, { how: 'forced', via: cause }); return kind; }
      leaveTrack(sim, 'expel'); return 'expel';
    }
    default:
      leaveTrack(sim, 'expel'); return 'expel';
  }
}

/** 몰락(콘텐츠 헬퍼로도). cause 생략 시 단계 causes 가중 롤 */
export function fall(sim, cause) {
  const { S, rng } = sim;
  const t = trackOf(sim); if (!t) return false;
  const st = t.stages[Math.min(S.track.stage, t.stages.length - 1)];
  let c = cause || rng.pick(st.fall.causes.length ? st.fall.causes : t.A.causes);
  if (!c) return false;
  // W14(QA B3·B4): 상태를 보는 사유 치환 — 결정화는 감염자만(아니면 사고), 침식→붕괴체는 붕괴체가 있는 나라만(아니면 아츠 폭주), 숙청은 관료·패밀리·귀족만(아니면 추방)
  const SUB = { crystallize: 'accident', erosion: 'backlash', purge: 'exile' };
  const bad = (x) => (x === 'crystallize' && !S.ori.on) || (x === 'erosion' && !sim.nation.collapsal) || (x === 'purge' && !(['A1', 'A3', 'A4'].includes(t.archetype) || S.status.noble));
  if (bad(c)) { const alt = st.fall.causes.filter((x) => !bad(x)); c = alt.length ? rng.pick(alt) : SUB[c]; }   // 콘텐츠가 명시한 사유도 같은 규칙(선언된 사유 안에서 대체)
  let v = t.exits.fall[c] ?? t.A.exits[c] ?? (sim.data.fallDefaultOutcome && sim.data.fallDefaultOutcome[c]) ?? 'expel';
  S.flags.lastFall = c; S.flags.lastFallAt = S.age; S.flags.lastFallOutcome = typeof v === 'string' ? v.split(':')[0] : 'expel';
  if (typeof v === 'string' && v.startsWith('death') && !t.forced && !rng.chance(T().deathSoften)) v = ['kia', 'raid', 'vendetta', 'accident', 'injury', 'catastrophe', 'beast', 'seaborn'].includes(c) ? 'injured' : 'expel';
  return applyExit(sim, v, c);
}

/** 자발 전직 */
export function switchTrack(sim, id, how = 'switch') {
  const { S } = sim;
  if (!sim.data.trackById[id]) return false;
  const from = trackOf(sim);
  const ok = enterTrack(sim, id, { how, quiet: true });
  if (ok && from) sim.log(eul(from.name) + ' 떠나 ' + ro(sim.data.trackById[id].name) + ' 옮겼습니다.', 'ev');
  return ok;
}

/** 은퇴(진로 쪽). retire.to 가 있으면 생업으로 옮기고, 없으면 진로 종료 + S.retired */
export function retireTrack(sim, opts = {}) {
  const { S } = sim;
  const t = trackOf(sim); if (!t) return false;
  const r = t.exits.retire;
  // W11: 데이터의 retire.to 가 자기 자신(생업 25개)이면 '그 나이에 은퇴'로 본다(매년 같은 진로로 재진입하던 버그)
  if (r && r.to && !opts.full && r.to !== t.id && sim.data.trackById[r.to]) {
    const name = t.name;
    enterTrack(sim, r.to, { how: 'retire', quiet: true });
    sim.log(eul(name) + ' 그만두고 ' + ro(sim.data.trackById[r.to].name) + ' 돌아갔습니다.', 'ev');
    return true;
  }
  leaveTrack(sim, 'retire', { quiet: true });
  const st = sim.nation.stats;
  S.pension = st.ppp > 1500 ? Math.round(S.income * 0.3) : 0;
  S.retired = true;
  if (!opts.quiet) sim.log('은퇴했습니다.' + (S.pension ? ' 적은 연금이 나옵니다.' : ' 연금 같은 것은 없습니다.'), 'ev');
  return true;
}

// ── 연말 처리(§3.3) ─────────────────────────────────────────────────────
export function fallMul(sim, t) {
  const { S } = sim;
  let m = 1;
  if (S.flags.war) m *= (t.A.flags.warFall || t.archetype === 'A6') ? T().warFallMul : 1.5;
  if (sim.nation.conflict >= 3) m *= T().conflict3Mul;
  if (S.flags.quarantined) m *= 1.3;
  return m;
}

export function trackYear(sim) {
  const { S, rng } = sim;
  if (S.phase !== 'life') return;
  // 콘텐츠가 S.job 을 지웠다면(해고 서사) 진로도 끝난 것으로 본다
  if (S.track && S.job == null) { leaveTrack(sim, 'content', { quiet: true }); }
  const t = trackOf(sim);
  if (!t) return;
  const tr = S.track;
  if (S.prison && !t.forced && !(t.stages[tr.stage] && t.stages[tr.stage].forced)) { leaveTrack(sim, 'prison', { quiet: true }); return; }
  tr.years++; S.jobY = tr.years;
  const st = t.stages[Math.min(tr.stage, t.stages.length - 1)];
  const a = affOf(sim);
  const mods = a ? a.mods : { promo: 1, fall: 1, income: 1 };
  const fw = S.focusW || {};

  // 역량 성장(재직)
  const capKey = st.promo ? st.promo.cap : t.A.promoCap;
  if (capKey !== 'looks' && capKey !== 'luck') addCap(S, capKey, T().growCap, t.stages.length * T().growCapMaxPerStage + T().growCapBase);
  // standing: 초점 '일'·'가족/친구'(ties) + 잡음
  let dS = rng.norm(0, T().standingDrift) + (fw.work || 0) * T().standingWork + (fw.family || 0) * 1;
  if (t.A.flags.season) dS += clamp(rng.norm(2 * zOf(S, 'skill'), 4), -12, 12);      // A2 시즌 롤
  if (t.A.flags.fameStanding) dS += clamp(1.5 * S.innate.looks + rng.norm(0, 3), -8, 8); // A12 명성
  tr.standing = clamp(tr.standing + dS, 0, 100);

  // 승급. W12(D53b): 즉시 롤하지 않고 '승급 기회'(opp 확률)를 S.flags.promoDue 에 두면 다음 해 planYear 의 내장 결정 track_promo 가 성공 확률을 보이고 묻는다.
  // 강제 진로·강제 단계(A5 수용소 등)는 결정 없이 종전처럼 롤한다
  {
    const pr = promoChance(sim);
    if (pr && pr.eligible && pr.p > 0) {
      if (t.forced || st.forced) { if (rng.chance(pr.p)) { promote(sim); S.flags.omen = false; } }
      else if (rng.chance(pr.opp)) S.flags.promoDue = { age: S.age, stage: tr.stage, succ: pr.succ, cap: pr.cap };
    }
  }
  if (S.phase !== 'life' || !S.track) return;
  // 몰락
  {
    let p = (st.fall.base ?? t.A.fallBase) * T().fallScale * mods.fall * (1 - T().luckFall * S.innate.luck) * fallMul(sim, t) * (S.flags.tfFall || 1);   // W12(D53a): 진로 초점 몰락 배율
    if (t.A.flags.season && tr.standing < 10) p = Math.max(p, 0.5);
    if (st.fall.causes.length && rng.chance(clamp(p, 0, 0.9))) {
      const c = rng.pick(st.fall.causes);
      fall(sim, c);
      if (S.phase !== 'life' || !S.track) return;
    }
  }
  // A4 복무 기간·A6 계약 만료
  if (t.A.flags.term && tr.stage === 0 && !st.forced && tr.years >= (t.term || 4) && !(t.term === 0)) {
    if (!rng.chance(T().a4TermReenlist)) { const name = t.name; leaveTrack(sim, 'discharged', { quiet: true }); sim.log(t.A.name === '군단·징집' ? '복무 기간이 끝나 ' + eul(name) + ' 떠났습니다.' : eul(name) + ' 마쳤습니다.', 'ev'); return; }
    tr.years = 0;
  }
  if ((t.contract || st.contract) && tr.flags.contractEnd != null && S.age >= tr.flags.contractEnd) tr.flags.contractDue = true;
  // 은퇴(종족 lifeMul 보정) / 건강. 강제 진로·강제 단계는 떠날 수 없다
  const locked = t.forced || st.forced;
  const r = t.exits.retire;
  if (!locked && r && r.age && humanAge(S.age, sim.race.lifeMul) >= r.age) { retireTrack(sim); return; }
  if (!locked && S.st.hl < T().retireHealth && humanAge(S.age, sim.race.lifeMul) >= 45) { retireTrack(sim, { full: true }); return; }
}

/** 감염 판정 직후 진로 반응(§4 A2 arena / A7 자진 사퇴 / A6 계약 해지). oripathy.diagnose 가 부른다 */
export function onDiagnosed(sim) {
  const { S } = sim;
  const t = trackOf(sim); if (!t) return;
  if (t.forcedEntry || /INFECTED/.test(t.id)) return;   // W14: 이미 감염자 전용 진로면 판정 반응 없음
  if (t.A.flags.infectedArena && T().a2InfectedArena) {
    const v = t.exits.fall.infected || (t.exits.arena ? 'arena:' + t.exits.arena : null) || (t.arena ? 'arena:' + t.arena : 'expel');
    applyExit(sim, v, 'infected');
  } else if (t.A.flags.infectedResign) {
    const name = t.name; leaveTrack(sim, 'infected', { quiet: true }); sim.log('감염을 안 뒤 스스로 ' + eul(name) + ' 내려놓았습니다.', 'loss');
  } else if (t.exits.fall.infected && t.archetype === 'A6') {
    applyExit(sim, t.exits.fall.infected, 'infected');
  }
}

/** 소득(§3.3-4). LMD. 생업(job 필드)은 jobs.json lo/hi 백분위를 쓰되 drift 없음 */
export function trackIncomeMul(sim) {
  const { S } = sim;
  const t = trackOf(sim); if (!t) return 0;
  const tr = S.track;
  const a = affOf(sim);
  return (t.income.stage[Math.min(tr.stage, t.income.stage.length - 1)] ?? 1) * (a ? a.mods.income : 1) * (1 + T().skillIncome * zOf(S, 'skill'));
}

/** 전직 후보. W12(D51-10): exits.switch 전부가 아니라 (a) 같은 원형 또는 ARCH_ADJ 인접 원형, (b) S.flags.switchOpen 이 진로 id(또는 배열)면 그 진로만(사건이 연 길) */
export function switchCandidates(sim) {
  const t = trackOf(sim); if (!t) return [];
  const open = sim.S.flags.switchOpen;
  const only = typeof open === 'string' ? [open] : Array.isArray(open) ? open : null;
  sim._switching = true;
  let all;
  try { all = entryCandidates(sim, { exclude: t.id, includeNoClass: !!only }); } finally { sim._switching = false; }
  if (only) return all.filter((c) => only.includes(c.id)).map((c) => ({ ...c, why: '사건이 연 길' }));
  const adj = ARCH_ADJ[t.archetype] || [];
  return all.filter((c) => { if (!t.exits.switch.includes(c.id)) return false; const a = sim.data.trackById[c.id].archetype; return a === t.archetype || adj.includes(a); })
    .map((c) => ({ ...c, why: sim.data.trackById[c.id].archetype === t.archetype ? '같은 길의 다른 자리' : c.why }));
}

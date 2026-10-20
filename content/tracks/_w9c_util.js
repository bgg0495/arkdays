// W9c 공용 도우미(사미·쉐라그·라이타니엔). 국가 파일 셋이 같은 축약을 쓴다.
//   E(...)  이벤트 축약 / TR(...) 단계 전환 서사 / AF(...) 몰락 후일담 / canonOk·canonSeen 캐논 인물 1회성 게이트(D43)
//   marryDecision(...) marry_<type> 덮어쓰기 — 엔진 choices.js 의 연 1회 롤(y_marry)을 그대로 써서 결혼 확률은 바꾸지 않는다
//   homeDecision(...)  home_change 덮어쓰기 — 국가별 문구 표(HOME_TEXT)에 없는 나라는 엔진 문구
import { BALANCE as B } from '../../src/engine/balance.js';
import { marriageP, rollMarriageType, makeProspect, familyOpposes, marry } from '../../src/engine/marriage.js';
import { homeChangeOpen, homeChangeOptions, setHousing } from '../../src/engine/housing.js';
import { wa } from '../_util.js';

/** 진로 단계에 들어온 첫 해인가(진입·승급 다음 planYear) */
export const fresh = (s) => !!s.S.track && s.S.age - s.S.track.stageSince <= 1;
/** 단계에서 보낸 햇수 */
export const stageYears = (s) => (s.S.track ? s.S.age - s.S.track.stageSince : 0);
/** 마지막으로 있었던 진로 id(재직 중이면 현재) */
export const lastTrackId = (s) => (s.S.track ? s.S.track.id : (s.S.trackHist.length ? s.S.trackHist[s.S.trackHist.length - 1].id : null));
/** 작년에 그 진로에서 그 원인들로 몰락했는가(살아 있을 때만 호출된다) */
export const fell = (s, id, causes) => s.S.flags.lastFallAt != null && s.S.age - s.S.flags.lastFallAt <= 1 && lastTrackId(s) === id && causes.includes(s.S.flags.lastFall);
export const affIs = (s, id) => !!s.S.track && s.S.track.aff === id;
export const affName = (s, fallback) => (s.aff ? s.aff.name : fallback);
export const standing = (s) => (s.S.track ? s.S.track.standing : 0);
/** 현재 단계 번호(진로 없으면 -1). 결정 ok 는 모달이 열릴 때 다시 평가되므로 진로가 사라진 뒤에도 안전해야 한다 */
export const trStage = (s) => (s.S.track ? s.S.track.stage : -1);
export const omen = (s) => { s.S.flags.omen = true; };
export const openSwitch = (s) => { s.S.flags.switchOpen = true; };

/** 캐논 인물 게이트: 그 인물의 연도 안, 생애 등장 3명 미만, 같은 인물은 한 번 */
export const canonOk = (s, id) => {
  const f = (s.data.canonFigures || []).find((x) => x.id === id);
  if (!f || !f.years) return false;
  if (s.S.flags['canon_' + id]) return false;
  return s.year >= f.years[0] && s.year <= f.years[1] && (s.S.flags.canonSeen || 0) < 3;
};
export const canonSeen = (s, id) => { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; s.S.flags['canon_' + id] = s.S.age; };

const txt = (t, s) => (typeof t === 'function' ? t(s) : t);
/** fx 안의 함수 값(money: (s) => …)을 숫자로 */
export const fxOf = (fx, s) => { if (!fx) return fx; if (typeof fx === 'function') return fx(s); const o = {}; for (const [k, v] of Object.entries(fx)) o[k] = typeof v === 'function' ? v(s) : v; return o; };
/** 이벤트 축약. run 이 문자열이면 그대로, 객체면 {t,k,fx,f} 중 t·f 는 함수 허용 */
export function E(id, a, tags, w, gap, run, extra = {}) {
  const tg = Array.isArray(tags) ? tags : [tags];
  const r = typeof run === 'function' ? run
    : typeof run === 'string' ? () => ({ t: run, k: 'ev' })
      : (s) => ({ t: txt(run.t, s), k: run.k || 'ev', fx: fxOf(run.fx, s), f: txt(run.f, s) });
  const e = { id, a, tags: tg, w, run: r, ...extra };
  if (gap) e.gap = gap;
  return e;
}
export const T = (track, stage) => 'track:' + track + ':' + stage;
/** 단계 전환 서사: 그 단계 첫 해에 한 번, 큰 가중 */
export const TR = (id, a, track, stage, t, k = 'ev', fx) => ({ id, a, tags: [T(track, stage)], w: 600, c: fresh, run: (s) => ({ t: txt(t, s), k, fx: fxOf(fx, s) }) });
/** 몰락 후일담: 작년에 그 진로에서 원인들 중 하나로 몰락했고 살아 있을 때 한 번 */
export const AF = (id, nation, track, causes, t, k = 'loss', fx) => ({ id, a: [3, 99], tags: [nation], w: 800, c: (s) => fell(s, track, causes), run: (s) => ({ t: txt(t, s), k, fx: fxOf(fx, s) }) });

/** 나이당 1회 캐시 롤(엔진 choices.js 와 같은 키를 써야 같은 롤을 공유한다) */
export function yearly(s, key, fn) {
  const S = s.S; const k = 'y_' + key;
  if (S.flags[k] && S.flags[k].age === S.age) return S.flags[k].v;
  const v = fn(); S.flags[k] = { age: S.age, v }; return v;
}
function marryRoll(s) {
  return yearly(s, 'marry', () => { const p = marriageP(s); if (!(p > 0) || !s.rng.chance(p)) return null; return { type: rollMarriageType(s), prospect: makeProspect(s) }; });
}
const genericMarry = (s, pr, t) => ({
  title: t.name,
  body: wa(pr.name) + ' 혼담이 오갑니다. ' + t.name + (t.dowry ? ' — 지참금 ' + Math.round(s.med * t.dowry).toLocaleString() + ' LMD.' : '.') + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람입니다.' : ''),
  accept: '받아들인다', hold: '보류한다', decline: '거절한다',
  holdT: '혼담을 미루었습니다.', declineT: '혼담을 거절했습니다.', opposeT: '가족이 반대했습니다. 종족이 다르다는 이유였습니다. 혼담은 깨졌습니다.',
});
/** marry_<type> 결정. text(s, prospect, type) → {title, body, fact?, accept, acceptSub?, hold, holdSub?, decline, declineSub?, holdT, declineT, opposeT}. 다른 나라에서는 엔진 문구 */
export function marryDecision(typeId, nation, text) {
  const tx = (s, pr, t) => (s.S.cur === nation ? text(s, pr, t) : genericMarry(s, pr, t));
  return {
    once: false, at: 0.45, tags: [],
    ok: (s) => { const r = marryRoll(s); return !!r && r.type.id === typeId; },
    build: (s, p) => {
      const r = s.S.flags.y_marry && s.S.flags.y_marry.v; if (!r) return null; Object.assign(p, r);
      const x = tx(s, r.prospect, r.type); p.tx = x;
      return { title: x.title, body: x.body, fact: x.fact, choices: [
        { k: 'accept', label: x.accept, sub: x.acceptSub, auto: B.marriage.autoAccept },
        { k: 'hold', label: x.hold, sub: x.holdSub, auto: B.marriage.autoHold },
        { k: 'decline', label: x.decline, sub: x.declineSub, auto: B.marriage.autoDecline }] };
    },
    apply: (s, k, p) => {
      s.S.flags.y_marry = null;
      const x = p.tx || genericMarry(s, p.prospect, p.type);
      if (k === 'hold') return x.holdT;
      if (k === 'decline') return x.declineT;
      if (familyOpposes(s, p.prospect)) return { t: x.opposeT, k: 'bad' };
      return marry(s, p.prospect, p.type) ? false : '혼인은 이루어지지 않았습니다.';
    },
  };
}

/** home_change 문구 표. 국가 id → { title, body(s), sub?: {유형 id: 문구}, no, noT, okT?(s, h) } */
export const HOME_TEXT = {
  sami: {
    title: '거처', body: () => '겨울을 날 곳을 정할 만큼 모았습니다. 천막은 가볍고, 움막은 오래 갑니다.',
    sub: { tent: '옮기기 쉽습니다', winter_hut: '한겨울이 덜 춥습니다' }, no: '지금처럼 산다', noT: '지금처럼 살기로 했습니다. 바람 소리가 익숙했습니다.',
  },
  kjerag: {
    title: '집', body: (s) => (s.S.urban ? '투리쿰에서 집을 가질 만큼 모였습니다. 창에서 산이 보이는 집은 더 비쌉니다.' : '영지 마을에 집을 가질 만큼 모였습니다. 지붕은 눈 무게를 견뎌야 합니다.'),
    sub: { fief_house: '영지 안, 눈 지붕', mountain_hut: '산 가까이, 바람 셉니다' }, no: '그대로 산다', noT: '그대로 살기로 했습니다. 집세는 다음 해에도 같았습니다.',
  },
  leithanien: {
    title: '집', body: (s) => (s.S.urban ? '플레이트 위에 집을 가질 만큼 모였습니다. 창가에 피아노를 둘 자리가 있는지부터 보았습니다.' : '산중 마을에 집을 가질 만큼 모였습니다. 포도밭이 딸린 집은 드뭅니다.'),
    sub: { town_house: '도시 안, 방음은 안 됩니다', village: '산중, 겨울이 깁니다' }, no: '그대로 산다', noT: '그대로 살기로 했습니다. 이웃의 연습 소리는 그대로였습니다.',
  },
};
export function homeDecision() {
  return {
    once: false, gap: B.housing.changeGap, at: 0.7, tags: [],
    ok: (s) => homeChangeOpen(s) && yearly(s, 'home', () => s.rng.chance(0.15)),
    build: (s) => {
      const opts = homeChangeOptions(s).slice(0, 3); if (!opts.length) return null;
      const x = HOME_TEXT[s.S.cur];
      const price = (h) => Math.round(s.med * h.buy).toLocaleString() + ' LMD';
      if (!x) return { title: '집', body: '집을 마련할 만큼 모였습니다.', choices: opts.map((h) => ({ k: h.id, label: h.name, sub: price(h), auto: h.w ?? 1 })).concat([{ k: 'no', label: '그대로 산다', auto: 1 }]) };
      return { title: x.title, body: x.body(s), choices: opts.map((h) => ({ k: h.id, label: h.name, sub: (x.sub && x.sub[h.id] ? x.sub[h.id] + ' · ' : '') + price(h), auto: h.w ?? 1 })).concat([{ k: 'no', label: x.no, auto: 1 }]) };
    },
    apply: (s, k) => {
      const x = HOME_TEXT[s.S.cur];
      if (k === 'no') return x ? x.noT : '그대로 살기로 했습니다.';
      const h = homeChangeOptions(s).find((o) => o.id === k);
      if (!(h && setHousing(s, h, { buy: true }))) return '마련하지 못했습니다.';
      return x && x.okT ? x.okT(s, h) : false;
    },
  };
}

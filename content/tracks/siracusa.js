// W9e 시라쿠사 진로 콘텐츠(v0.3 §11). 진로 14개의 단계별 이벤트·전환 서사·몰락 후일담·결정, 생업 계절 이벤트(카르네발레·와인 수확·일요일 미사),
// 소속 변주(벨로네 vs 군소 패밀리), 캐논 인물 1회성, 이주 신참·비루포 관계·방문국·로도스 접점. 태그는 track:<ID>:<stageId> 기준(W7 메모 §3).
// 공통 직장 이벤트(승진·과로·상사·회식)는 패밀리 기업(SIR_FAMBIZ)·컬럼비아계(SIR_FOREIGN)에만 — archetype:A10. 패밀리 조직원·법조에는 붙이지 않는다.
// 톤: 담백한 "~했습니다"체(D25), 벤데타·연좌·자결은 장면 없이 결과만, 각주는 숫자가 있을 때만(D31), 조사는 text.js 유틸(D30).
// 혼인·주거 결정 덮어쓰기는 columbia.js 의 W9E_OVERRIDES 에 시라쿠사 항목을 더하고, 같은 결정 객체를 다시 등록한다(어느 파일이 뒤에 등록돼도 두 나라가 다 산다).
import { makeName, familyNames } from '../../src/engine/names.js';
import { cul, fest, F, orgF, lifeRoll, medX, poor, rich, eul, iga, eun, wa, ro, ieot } from '../_util.js';
import { W9E_OVERRIDES, marryDecision, homeChangeDecision } from './columbia.js';
import { hoist } from '../_dispatch.js';

// ────────────────────────────────────────────────────────────────────────────
// 도우미
// ────────────────────────────────────────────────────────────────────────────
const tr = (s) => s.S.track;
/** 지금도 그 진로(·단계)에 있는가 — 같은 해 앞선 이벤트로 진로가 끝났을 수 있어 run·ok 앞에서 다시 본다 */
const onT = (s, id, stage) => !!tr(s) && tr(s).id === id && (!stage || (!!s.stage && s.stage.id === stage));
function yr(s, key, p) { const k = 'yr_' + key; const v = s.S.flags[k]; if (v && v.a === s.S.age) return v.ok; const ok = s.rng.chance(p); s.S.flags[k] = { a: s.S.age, ok }; return ok; }
const entered = (s) => !!tr(s) && s.S.age - tr(s).since === 1 && tr(s).stageSince === tr(s).since;
const promoted = (s) => !!tr(s) && tr(s).stage > 0 && s.S.age - tr(s).stageSince === 1 && tr(s).stageSince !== tr(s).since;
const fellFrom = (s, id) => !tr(s) && s.S.flags.lastTrack === id && s.S.flags.lastFallAt != null && s.S.age - s.S.flags.lastFallAt <= 1 && s.S.flags.lastTrackLeftAt === s.S.flags.lastFallAt;
const affName = (s, d) => (s.aff ? s.aff.name : d);
/** 소속 패밀리 이름의 짧은 형("벨로네 패밀리" → "벨로네") */
const famShort = (s) => (s.aff ? s.aff.name.replace(/ 패밀리.*$/, '').replace(/\(.*\)$/, '').trim() : '패밀리');
const major = (s) => !!s.aff && s.aff.tags.includes('major');
const someone = (s, sex) => makeName(s.data, s.rng, { lang: s.nation.nameLang, sex: sex || (s.rng.chance(0.5) ? 'M' : 'F'), race: s.S.race, avoid: familyNames(s.S) }).given;
const pick = (s, arr) => s.rng.pick(arr);
const fmt = (n) => Math.round(n).toLocaleString() + ' LMD';
const visitName = (s) => (s.res && s.res.itinerantAt && s.data.nationById[s.res.itinerantAt] ? s.data.nationById[s.res.itinerantAt].name : '국경 너머');
function canonOk(s, id) { const f = (s.data.canonFigures || []).find((x) => x.id === id); if (!f) return false; const y = s.year; return y >= f.years[0] && y <= f.years[1] && (s.S.flags.canonSeen || 0) < 3; }
function canonSeen(s) { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; }
const ev = (id, track, stage, a, w, gap, run, extra = {}) => ({ id, a, tags: ['track:' + track + ':' + stage], w, gap, run, ...extra, c: (s) => onT(s, track, stage) && (!extra.c || extra.c(s)) });
const transition = (id, track, map) => ({ id, a: [8, 90], tags: ['track:' + track], w: 90, c: (s) => promoted(s) && !!map[s.stage.id], run: (s) => ({ t: map[s.stage.id](s), k: 'ev', fx: { h: 2 } }) });
const entry = (id, track, run) => ({ id, a: [5, 90], tags: ['track:' + track], w: 90, c: entered, run });
const aftermath = (id, track, map) => ({ id, a: [5, 95], tags: [], w: 95, c: (s) => fellFrom(s, track) && !!map[s.S.flags.lastFall], run: (s) => ({ t: map[s.S.flags.lastFall](s), k: 'loss' }) });

// 시라쿠사 혼인·주거 문구를 공유 덮어쓰기 표에 더한다
W9E_OVERRIDES.siracusa = {
  marry_family_approved: {
    build: (s, pr, t) => ({ title: '패밀리 승인 혼인', body: wa(pr.name) + ' 혼담이 오갑니다. 먼저 ' + (s.aff ? s.aff.name : '패밀리') + '의 허락을 받아야 합니다. 허락은 왔고, 조건은 "가족은 가족과"였습니다.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람이라 말이 길어졌습니다.' : ''),
      choices: [{ k: 'accept', label: '받아들인다', auto: 3 }, { k: 'hold', label: '보류한다', sub: '돈이 기다려 주지 않을 수도', auto: 0.8 }, { k: 'decline', label: '거절한다', sub: '패밀리 신뢰 하락', auto: 0.4 }] }),
    text: { accept: (s, pr) => wa(pr.name) + ' 결혼했습니다. 식에는 패밀리 사람이 절반이었고, 선물 봉투에는 전부 같은 색 끈이 묶여 있었습니다.', hold: '보류했습니다. 돈 쪽에서 한 번 더 물어 왔습니다.', decline: (s) => { if (s.S.track) s.S.track.standing = Math.max(0, s.S.track.standing - 10); return '거절했습니다. 패밀리 쪽에서 한동안 말이 없었습니다.'; } },
    oppose: '가족이 반대했습니다. 패밀리도 반대했습니다. 혼담은 깨졌습니다.',
  },
  marry_church: {
    build: (s, pr, t) => ({ title: '교회 혼인', body: wa(pr.name) + ' 교회에서 식을 올리기로 했습니다. 신부님은 두 집안이 어느 패밀리 구역인지 먼저 물었습니다.' + (t.dowry ? ' 식 비용과 헌금은 ' + fmt(s.med * t.dowry) + '.' : ''),
      choices: [{ k: 'accept', label: '식을 올린다', auto: 3 }, { k: 'hold', label: '미룬다', auto: 1 }, { k: 'decline', label: '하지 않는다', auto: 0.6 }] }),
    text: { accept: (s, pr) => wa(pr.name) + ' 교회에서 결혼했습니다. 종이 울렸고, 광장의 늑대들이 한꺼번에 일어나 흩어졌습니다.', hold: '식을 미루었습니다. 신부님은 서두르지 않았습니다.', decline: '하지 않기로 했습니다.' },
  },
  marry_civil: {
    build: (s, pr, t) => ({ title: '시청 혼인', body: wa(pr.name) + ' 뉴 볼시니 시청에서 혼인 신고를 하기로 했습니다. 패밀리 허락이 필요 없는 결혼은 이 도시에서만 됩니다.',
      choices: [{ k: 'accept', label: '신고한다', auto: 3 }, { k: 'hold', label: '미룬다', auto: 1 }, { k: 'decline', label: '하지 않는다', auto: 0.6 }] }),
    text: { accept: (s, pr) => wa(pr.name) + ' 시청에서 혼인 신고를 했습니다. 증인은 창구 직원이었고, 종은 울리지 않았습니다.', hold: '신고를 미루었습니다.', decline: '신고하지 않기로 했습니다.' },
  },
  marry_pack: {
    build: (s, pr, t) => ({ title: '무리 결연', body: wa(pr.name) + ' 황야의 방식으로 짝이 되기로 했습니다. 서류는 없고, 무리 앞에서 한 번 울부짖는 것으로 끝납니다.',
      choices: [{ k: 'accept', label: '짝이 된다', auto: 3 }, { k: 'hold', label: '다음 달까지 본다', auto: 1 }, { k: 'decline', label: '하지 않는다', auto: 0.5 }] }),
    text: { accept: (s, pr) => wa(pr.name) + ' 짝이 되었습니다. 무리가 한 번 울었고, 그것이 전부였습니다.', hold: '다음 달까지 보기로 했습니다.', decline: '하지 않기로 했습니다.' },
  },
  home_change: {
    build: (s, opts) => ({ title: '집', body: '집을 마련할 만큼 모였습니다. 어느 패밀리 구역인지가 값보다 먼저였습니다.',
      choices: opts.map((h) => ({ k: h.id, label: h.name, sub: fmt(s.med * h.buy) + (h.id === 'village' ? ' · 보호비 걷는 사람이 옵니다' : h.id === 'town_house' ? ' · 가게와 한 지붕' : ''), auto: h.w ?? 1 })).concat([{ k: 'no', label: '그대로 산다', auto: 1 }]) }),
    text: { no: '그대로 살기로 했습니다. 집주인은 패밀리 쪽 사람이었고, 집세는 그대로였습니다.', fail: '마련하지 못했습니다. 그 구역은 다른 패밀리 사람에게 먼저 팔렸습니다.', ok: (s, h) => ro(h.name) + ' 옮겼습니다. 이사 다음 날 양복 입은 사람이 와서 인사를 하고 갔습니다.' },
  },
};

// ────────────────────────────────────────────────────────────────────────────
// 이벤트
// ────────────────────────────────────────────────────────────────────────────
export const events = [
  // ══════════════════════════════════════════════════════════════════════════
  // 공통 직장 이벤트 — archetype:A10 에만(패밀리 기업·컬럼비아계 회사원). 패밀리 조직원·법조 금지
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'sir_a10_overtime', a: [18, 64], tags: ['siracusa', 'archetype:A10'], w: 30, gap: 2,
    run: (s) => ({ t: pick(s, ['야근이 길었습니다. 사무실 아래층 가게는 늘 열려 있었고, 그 가게도 같은 패밀리 것이었습니다.', '마감이었습니다. 주말에 나왔고, 경비는 저희보다 먼저 와 있었습니다.', '퇴근길에 상사가 "오늘 수고했어, 가족"이라고 했습니다. 그 말이 어느 뜻인지 생각하며 걸었습니다.']), k: 'ev', fx: { hl: -2, standing: 3 } }) },
  { id: 'sir_a10_boss', a: [18, 64], tags: ['siracusa', 'archetype:A10'], w: 25, gap: 3,
    run: (s) => ({ t: pick(s, ['상사가 바뀌었습니다. 새 상사는 꼬리 끝 색이 저와 달랐고, 그 말을 아무도 하지 않았습니다.', '상사가 회의에서 제 안을 자기 안으로 말했습니다. 그 상사의 상사가 누구인지 알기에 그냥 두었습니다.', '상사가 금요일마다 저녁을 샀습니다. 사는 사람이 정한 자리였고, 거절하는 사람은 없었습니다.']), k: 'note', fx: { h: -1 } }) },
  { id: 'sir_a10_dinner', a: [18, 64], tags: ['siracusa', 'archetype:A10'], w: 25, gap: 2,
    run: (s) => ({ t: pick(s, ['회식이었습니다. ' + wa(cul(s).food) + ' 함께 상사의 농담이 나왔고, 한 사람은 웃지 않았습니다. 다음 주에 그 사람 자리가 비었습니다.', '팀 저녁이었습니다. 식당 주인이 상사에게 먼저 인사했고, 계산서는 오지 않았습니다.']), k: 'ev', fx: { h: 1, cap: { ties: 0.02 } } }) },
  { id: 'sir_a10_review', a: [18, 64], tags: ['siracusa', 'archetype:A10'], w: 30, gap: 2,
    run: (s) => { const good = (tr(s) ? tr(s).standing : 50) >= 50; return { t: good ? '연말 평가가 나왔습니다. 윗줄이었습니다. 봉투와 함께 와인 한 병이 왔습니다.' : '연말 평가가 나왔습니다. 아랫줄이었습니다. 면담에서 "가족이니까 한 번 더"라는 말을 들었습니다.', k: good ? 'ev' : 'bad', fx: good ? { h: 2, money: medX(s, 0.05) } : { h: -2 } }; } },
  { id: 'sir_a10_promo_rumor', a: [20, 64], tags: ['siracusa', 'archetype:A10'], w: 15, gap: 4,
    run: (s) => ({ t: '승진 소문이 돌았습니다. 실적 순이라고 했고, 명단은 성씨 순이었습니다.', k: 'note', fx: { h: -1 } }) },

  // ══════════════════════════════════════════════════════════════════════════
  // SIR_FAMIGLIA 패밀리 조직원(A1, 핵심) — errand / soldato / capo / consigliere / don
  // ══════════════════════════════════════════════════════════════════════════
  entry('sir_fam_entry', 'SIR_FAMIGLIA', (s) => ({ t: pick(s, [ro(affName(s, '패밀리')) + ' 들어간 첫 해였습니다. 꼬리 끝을 그 색으로 염색했고, ' + (s.S.fam.mom.alive ? '어머니는' : '집에서는') + ' 그 색을 보고 아무 말도 하지 않았습니다.', ro(affName(s, '패밀리')) + ' 들어간 첫 해였습니다. 세차장 직원으로 서류를 썼고, 세차는 한 번도 하지 않았습니다.']), k: 'ev' })),
  ev('sir_fam_errand_envelope', 'SIR_FAMIGLIA', 'errand', [14, 30], 35, 1, (s) => ({ t: '봉투를 건넸습니다. 받는 사람은 이름을 묻지 않았고, 저도 묻지 않았습니다.', k: 'ev', fx: { standing: 3, money: medX(s, 0.02) } })),
  ev('sir_fam_errand_wait', 'SIR_FAMIGLIA', 'errand', [14, 30], 30, 2, (s) => ({ t: '차 옆에서 4시간을 기다렸습니다. 기다리는 것도 일이라고 했습니다. 일당은 기다린 시간만큼 나왔습니다.', k: 'note', f: F('시청(패밀리 승인) 소년 고용 지침, 일당 기준 시간당') })),
  ev('sir_fam_errand_signs', 'SIR_FAMIGLIA', 'errand', [14, 30], 25, 2, (s) => ({ t: '수신호를 배웠습니다. 솔다토는 말을 하지 않는다고 했습니다. 손가락 셋이 "기다려", 둘이 "가"였습니다.', k: 'ev', fx: { cap: { skill: 0.03 } } })),
  ev('sir_fam_errand_mother', 'SIR_FAMIGLIA', 'errand', [14, 30], 20, 3, (s) => ({ t: '어머니가 어디서 돈을 받아 오느냐고 물었습니다. 세차장이라고 했습니다. 어머니는 더 묻지 않았습니다.', k: 'note', fx: { h: -1 } }), { c: (s) => s.S.fam.mom.alive }),
  ev('sir_fam_sold_night', 'SIR_FAMIGLIA', 'soldato', [16, 55], 35, 2, (s) => ({ t: '밤에 불려 나갔습니다. 돌아와서는 아무 말도 하지 않았고, 아침에 옷을 태웠습니다.', k: 'bad', fx: { h: -3, standing: 3 } })),
  ev('sir_fam_sold_protection', 'SIR_FAMIGLIA', 'soldato', [16, 55], 30, 2, (s) => ({ t: '구역의 가게 40곳을 돌았습니다. 봉투를 받았고, 봉투가 가벼운 가게 앞에서는 조금 오래 서 있었습니다.', k: 'ev', fx: { money: medX(s, 0.08), standing: 2 }, f: F('시청(패밀리 승인) 지역 보호 분담금 안내, 구역당 40~60곳') })),
  ev('sir_fam_sold_rural_infected', 'SIR_FAMIGLIA', 'soldato', [16, 55], 20, 3, (s) => ({ t: '시골 감염자 집에 "의료보험" 봉투를 받으러 갔습니다. 보험이라는 말을 쓰라고 했습니다. 집 사람은 그 말을 믿지 않았고, 봉투는 주었습니다.', k: 'bad', fx: { h: -2, money: medX(s, 0.05) } })),
  ev('sir_fam_sold_funeral', 'SIR_FAMIGLIA', 'soldato', [16, 55], 25, 3, (s) => ({ t: '동료의 장례였습니다. 돈이 직접 왔고, 유족에게 봉투를 건넸습니다. 봉투는 두꺼웠고, 말은 짧았습니다.', k: 'loss', fx: { h: -2, cap: { ties: 0.02 } } })),
  ev('sir_fam_capo_crew', 'SIR_FAMIGLIA', 'capo', [22, 65], 35, 2, (s) => ({ t: '솔다토 6명을 거느리게 되었습니다. 이름을 전부 외웠고, 그중 2명은 외우지 말았어야 했습니다.', k: 'ev', fx: { standing: 3 }, f: F('시청(패밀리 승인) 가문 표식 등록, 카포 1인당 솔다토 4~8명') })),
  ev('sir_fam_capo_terni', 'SIR_FAMIGLIA', 'capo', [22, 65], 25, 3, (s) => ({ t: '합금 매장지 경계를 놓고 옆 패밀리와 다퉜습니다. 지도에 선을 다시 그었고, 선 위에 있던 가게 하나가 문을 닫았습니다.', k: 'note', fx: { money: medX(s, 0.3) } })),
  ev('sir_fam_capo_supermarket', 'SIR_FAMIGLIA', 'capo', [22, 65], 25, 3, (s) => ({ t: '슈퍼마켓 주인이 납품처를 바꾸겠다고 했습니다. 찾아가서 이야기를 했습니다. 다음 날 납품처는 그대로였습니다.', k: 'bad', fx: { h: -1, standing: 2 } })),
  ev('sir_fam_capo_sunday', 'SIR_FAMIGLIA', 'capo', [22, 65], 20, 3, (s) => ({ t: '일요일에 돈의 집에서 점심을 먹었습니다. ' + wa(cul(s).food) + ' 함께 지난주 일이 식탁에 올랐고, 포크는 멈추지 않았습니다.', k: 'ev', fx: { cap: { ties: 0.03 } } })),
  ev('sir_fam_cons_advice', 'SIR_FAMIGLIA', 'consigliere', [30, 75], 35, 2, (s) => ({ t: '돈이 물었습니다. 대답은 두 가지였고, 둘 다 사람이 죽는 쪽이었습니다. 덜 죽는 쪽을 말했습니다.', k: 'bad', fx: { h: -2, standing: 3 } })),
  ev('sir_fam_cons_lawyer', 'SIR_FAMIGLIA', 'consigliere', [30, 75], 25, 3, (s) => ({ t: '전속 변호사와 하루를 보냈습니다. 합법으로 보이게 하는 데 드는 돈이 합법보다 비쌌습니다.', k: 'note', fx: { money: -medX(s, 0.5) } })),
  ev('sir_fam_cons_grayhall', 'SIR_FAMIGLIA', 'consigliere', [30, 75], 20, 4, (s) => ({ t: '그레이홀 회의에 패밀리 대표로 갔습니다. 12자리 중 9자리가 찼고, 빈 자리 3개는 아무도 보지 않았습니다.', k: 'ev', fx: { standing: 2 }, f: F('그레이홀 코무니 의회 출석 기록, ' + s.year + '년') })),
  ev('sir_fam_cons_business', 'SIR_FAMIGLIA', 'consigliere', [30, 75], 25, 3, (s) => ({ t: '패밀리 기업 장부를 보았습니다. 와인과 자동차와 은행. 셋 다 흑자였고, 셋 다 그 이유를 적지 않았습니다.', k: 'note', fx: { cap: { learn: 0.03 } } })),
  ev('sir_fam_don_table', 'SIR_FAMIGLIA', 'don', [35, 85], 35, 2, (s) => ({ t: '긴 식탁의 끝자리에 앉았습니다. 모두가 저를 보았고, 저는 접시만 보았습니다. 그래야 했습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('sir_fam_don_twelve', 'SIR_FAMIGLIA', 'don', [35, 85], 25, 3, (s) => ({ t: '열두 패밀리의 돈이 모이는 자리였습니다. 열둘이 다 온 적은 없다고 했습니다. 이번에도 그랬습니다.', k: 'note' })),
  ev('sir_fam_don_heir', 'SIR_FAMIGLIA', 'don', [40, 85], 25, 4, (s) => ({ t: '후계 이야기가 나왔습니다. 자식은 하나는 떠났고 하나는 남았습니다. 남은 쪽이 원하는지는 묻지 않았습니다.', k: 'note', fx: { h: -1 } })),
  ev('sir_fam_don_mass', 'SIR_FAMIGLIA', 'don', [35, 85], 20, 3, (s) => ({ t: '일요일 미사에 갔습니다. 맨 앞자리였고, 신부님은 설교 중에 한 번도 이쪽을 보지 않았습니다.', k: 'ev', fx: { h: 1 } })),
  transition('sir_fam_transition', 'SIR_FAMIGLIA', {
    soldato: (s) => '솔다토가 되었습니다. 귀에 패밀리 장식을 달았고, 말 대신 손으로 대답하는 법을 익혔습니다.',
    capo: (s) => '카포가 되었습니다. 돈이 이름을 불러 주었고, 그 뒤로 사람들이 제 이름 앞에 한 박자 쉬었습니다.',
    consigliere: (s) => '콘실리에레가 되었습니다. 돈의 왼쪽 자리였고, 그 자리에 앉았던 앞사람은 어디에도 없었습니다.',
    don: (s) => '돈이 되었습니다. 반지를 받았고, 반지에 입 맞추는 사람들 중 누가 진심인지 세는 일이 시작되었습니다.',
  }),
  aftermath('sir_fam_after', 'SIR_FAMIGLIA', {
    vendetta: (s) => '벤데타였습니다. 살아남았습니다. 패밀리는 남지 않았고, 꼬리 색을 지웠습니다.',
    arrest: (s) => '체포되었습니다. 패밀리 변호사가 왔고, 형량은 변호사의 값만큼 짧아졌습니다.',
    betrayal: (s) => '배신이 드러났습니다. 나라를 떠났고, 떠난 날 밤에 고향 집 불이 꺼졌다는 말을 나중에 들었습니다.',
    purge: (s) => '정리가 있었습니다. 명단에 이름이 있었고, 그 전에 떠났습니다. 다시 돌아갈 구역은 없었습니다.',
    coup: (s) => '아래에서 올라왔습니다. 반지를 내놓았고, 목숨은 그 대가로 남겨 두었습니다.',
  }),
  // 소속 변주: 벨로네(3대) vs 군소 패밀리 — 대우 차이
  { id: 'sir_aff_bellone_door', a: [14, 80], tags: ['aff:SIR_BELLONE'], w: 20, gap: 4,
    run: (s) => ({ t: '벨로네의 이름으로 문이 열렸습니다. 그 이름이 아니었다면 열리지 않았을 문이었고, 문 안쪽 사람은 이름만 보고 자리를 내주었습니다.', k: 'ev', fx: { standing: 2, h: 1 } }) },
  { id: 'sir_aff_bellone_lawyer', a: [16, 80], tags: ['aff:SIR_BELLONE'], w: 15, gap: 5,
    run: (s) => ({ t: '벨로네 전속 변호사가 하루 만에 왔습니다. 옆 감방의 군소 패밀리 사람은 보름을 기다렸습니다.', k: 'note', fx: { standing: 1 } }) },
  { id: 'sir_aff_rossati_art', a: [14, 80], tags: ['aff:SIR_ROSSATI'], w: 20, gap: 4,
    run: (s) => ({ t: '로사티 저택에서 연극 낭독회가 있었습니다. 돈의 가족이 극본을 썼고, 박수를 치지 않은 사람은 없었습니다.', k: 'note', fx: { cap: { arts: 0.02 } } }) },
  { id: 'sir_aff_saluzzo_wine', a: [14, 80], tags: ['aff:SIR_SALUZZO'], w: 20, gap: 4,
    run: (s) => ({ t: '살루초 포도밭에서 수확을 지켰습니다. 와인 통 하나의 값이 솔다토 한 해 몫이었습니다.', k: 'ev', fx: { money: medX(s, 0.05) } }) },
  { id: 'sir_aff_minor_short', a: [14, 80], tags: ['aff:SIR_MINOR'], w: 25, gap: 3,
    run: (s) => ({ t: '군소 패밀리의 봉투는 얇았습니다. 큰 패밀리가 남긴 구역에서 걷었고, 큰 패밀리가 마음을 바꾸면 구역도 바뀌었습니다.', k: 'bad', fx: { money: -medX(s, 0.03), h: -1 } }) },
  { id: 'sir_aff_minor_expendable', a: [16, 80], tags: ['aff:SIR_MINOR'], w: 20, gap: 4,
    run: (s) => ({ t: '큰 패밀리 일에 저희가 먼저 나갔습니다. 돌아온 사람 수를 세는 것은 저희 돈의 일이었고, 큰 패밀리는 세지 않았습니다.', k: 'bad', fx: { h: -2, standing: 2 } }) },
  { id: 'sir_aff_active_car', a: [14, 80], tags: ['aff:SIR_ACTIVE'], w: 20, gap: 4,
    run: (s) => ({ t: '패밀리 소유 공장에서 새 차가 나왔습니다. 첫 차는 돈에게, 둘째 차는 성당에 갔습니다.', k: 'note' }) },
  // 캐논 인물(D43)
  { id: 'sir_canon_lappland', a: [14, 60], tags: ['siracusa'], w: 30, c: (s) => canonOk(s, 'lappland') && !!tr(s) && ['SIR_FAMIGLIA', 'SIR_CLEANER', 'SIR_WILD'].includes(tr(s).id),
    run: (s) => { canonSeen(s); return { t: '흰 머리의 여자가 패밀리 저택 담장에 앉아 웃고 있었습니다. 경비들은 그쪽을 보지 않으려 애썼고, 저도 그렇게 했습니다.', k: 'note', fx: { h: -1 } }; } },
  { id: 'sir_canon_vigil', a: [16, 70], tags: ['siracusa'], w: 30, c: (s) => canonOk(s, 'vigil') && !!tr(s) && ['SIR_PUBLIC', 'SIR_FAMIGLIA', 'SIR_POLICE'].includes(tr(s).id),
    run: (s) => { canonSeen(s); return { t: '새 시장의 취임 연설을 광장 뒤편에서 들었습니다. 연설이 끝나자 늑대들이 한꺼번에 일어나 흩어졌고, 사람들은 그 자리에 조금 더 서 있었습니다.', k: 'note' }; } },
  { id: 'sir_canon_lavinia', a: [18, 70], tags: ['siracusa'], w: 30, c: (s) => canonOk(s, 'lavinia') && !!tr(s) && ['SIR_LEGAL', 'SIR_POLICE', 'SIR_PUBLIC'].includes(tr(s).id),
    run: (s) => { canonSeen(s); return { t: '법정 복도에서 젊은 변호사가 패밀리 사람의 인사를 받았습니다. 고개만 까딱했습니다. 그 사람은 그 뒤로 복도에서 인사를 하지 않았습니다.', k: 'note' }; } },
  { id: 'sir_canon_eirene', a: [16, 65], tags: ['track:SIR_TRUCK'], w: 30, c: (s) => canonOk(s, 'eirene'),
    run: (s) => { canonSeen(s); return { t: '상조회 사무실의 여자가 야간 운행표를 찢어 버리고 새로 썼습니다. 새 표에는 패밀리 쪽 운행이 없었고, 아무도 토를 달지 않았습니다.', k: 'note', fx: { h: 1 } }; } },
  { id: 'sir_canon_texas', a: [14, 60], tags: ['siracusa'], w: 30, c: (s) => canonOk(s, 'texas') && !!tr(s) && ['SIR_FAMIGLIA', 'SIR_CLEANER', 'SIR_WILD', 'SIR_TRUCK'].includes(tr(s).id),
    run: (s) => { canonSeen(s); return { t: '옛 패밀리 성을 가진 여자가 고향에 잠깐 돌아왔다고 했습니다. 아무도 그 성을 입 밖에 내지 않았고, 그 사람은 사흘 뒤에 떠났습니다.', k: 'note' }; } },

  // ══════════════════════════════════════════════════════════════════════════
  // SIR_FAMBIZ 패밀리 기업 회사원(A10 변주 "상사=카포", 핵심) — staff / manager / head / exec
  // ══════════════════════════════════════════════════════════════════════════
  entry('sir_fambiz_entry', 'SIR_FAMBIZ', (s) => ({ t: ro(affName(s, '패밀리 기업')) + ' 출근한 첫 주였습니다. 조직도에는 부장 위에 임원이, 임원 위에는 이름 없는 칸이 하나 있었습니다.', k: 'ev', fx: { h: 2 } })),
  ev('sir_fambiz_staff_desk', 'SIR_FAMBIZ', 'staff', [18, 40], 30, 2, (s) => ({ t: '책상에 앉았습니다. 옆자리는 상사의 조카였고, 그 사실을 아는 데 하루, 받아들이는 데 한 해가 걸렸습니다.', k: 'note' })),
  ev('sir_fambiz_staff_ledger', 'SIR_FAMBIZ', 'staff', [18, 40], 30, 2, (s) => ({ t: '장부 둘을 받았습니다. 하나는 세무서용, 하나는 "가족용". 둘 중 어느 것이 진짜냐고 묻지 않았습니다.', k: 'bad', fx: { h: -1, cap: { learn: 0.03 } } })),
  ev('sir_fambiz_staff_visitor', 'SIR_FAMBIZ', 'staff', [18, 40], 25, 3, (s) => ({ t: '양복 입은 사람들이 사무실을 지나 안쪽 방으로 갔습니다. 다들 모니터를 보았고, 아무도 모니터를 보고 있지 않았습니다.', k: 'note', fx: { h: -1 } })),
  ev('sir_fambiz_staff_wine', 'SIR_FAMBIZ', 'staff', [18, 40], 20, 3, (s) => ({ t: '명절 선물로 와인 한 상자가 왔습니다. 패밀리 포도밭 것이었고, 상자 안에는 다음 해 매출 목표표도 있었습니다.', k: 'ev', fx: { h: 1 } })),
  ev('sir_fambiz_mgr_capo', 'SIR_FAMBIZ', 'manager', [22, 55], 30, 2, (s) => ({ t: '부장이 부르면 가야 했습니다. 부장은 패밀리의 카포였고, 회의실에서 하는 말이 사무실 말과 달랐습니다.', k: 'bad', fx: { h: -2, standing: 3 } })),
  ev('sir_fambiz_mgr_contract', 'SIR_FAMBIZ', 'manager', [22, 55], 30, 2, (s) => ({ t: '납품 계약을 따냈습니다. 경쟁사는 입찰에 나오지 않았습니다. 왜인지는 아무도 말하지 않았습니다.', k: 'ev', fx: { standing: 4, money: medX(s, 0.1) } })),
  ev('sir_fambiz_mgr_bomb', 'SIR_FAMBIZ', 'manager', [22, 55], 20, 4, (s) => ({ t: '회사 창고 하나가 밤에 불탔습니다. 보험사는 왔고, 경찰은 오지 않았습니다. 다음 주 월요일 회의는 그 일을 말하지 않았습니다.', k: 'bad', fx: { h: -3 } })),
  ev('sir_fambiz_mgr_hire', 'SIR_FAMBIZ', 'manager', [22, 55], 25, 3, (s) => ({ t: '신입 채용이었습니다. 이력서 열 장 중 셋에 같은 성씨가 있었고, 그 셋이 뽑혔습니다.', k: 'note' })),
  ev('sir_fambiz_head_don', 'SIR_FAMBIZ', 'head', [28, 65], 30, 2, (s) => ({ t: '돈과 처음 마주 앉았습니다. 돈은 매출을 묻지 않고 가족 안부를 물었습니다. 그것이 매출 질문이었습니다.', k: 'ev', fx: { standing: 3 } })),
  ev('sir_fambiz_head_rival', 'SIR_FAMBIZ', 'head', [28, 65], 25, 3, (s) => ({ t: '경쟁 패밀리 기업과 가격 전쟁이 붙었습니다. 가격은 내려갔고, 양쪽 창고에 경비가 늘었습니다.', k: 'bad', fx: { hl: -1, standing: 2 } })),
  ev('sir_fambiz_head_audit', 'SIR_FAMBIZ', 'head', [28, 65], 20, 4, (s) => ({ t: '세무 조사가 들어왔습니다. 조사관은 3일을 보았고, 4일째 패밀리 변호사와 점심을 먹었고, 5일째 떠났습니다.', k: 'note', f: F('시청(패밀리 승인) 기업 세무 조사 기록, ' + s.year + '년') })),
  ev('sir_fambiz_head_sunday', 'SIR_FAMBIZ', 'head', [28, 65], 20, 3, (s) => ({ t: '일요일 미사 뒤 돈의 집 점심에 초대받았습니다. 부장급은 처음이라고 했습니다. 가족이 되었다는 뜻인지, 가족이 되라는 뜻인지 몰랐습니다.', k: 'ev', fx: { cap: { ties: 0.03 } } })),
  ev('sir_fambiz_exec_trust', 'SIR_FAMBIZ', 'exec', [32, 75], 30, 2, (s) => ({ t: '임원이 되자 돈이 회사 하나를 통째로 맡겼습니다. 신임이라고 했고, 실패하면 무엇인지는 말하지 않았습니다.', k: 'ev', fx: { standing: 3, money: medX(s, 1) } })),
  ev('sir_fambiz_exec_vendetta_news', 'SIR_FAMBIZ', 'exec', [32, 75], 20, 4, (s) => ({ t: '다른 패밀리와 벤데타가 시작됐다는 말이 돌았습니다. 회사 임원도 명단에 든다고 했습니다. 출근길이 달라졌습니다.', k: 'bad', fx: { h: -4 } })),
  ev('sir_fambiz_exec_legal', 'SIR_FAMBIZ', 'exec', [32, 75], 25, 3, (s) => ({ t: '회사를 완전히 합법으로 돌리는 안을 올렸습니다. 돈은 읽었고, 서랍에 넣었습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),
  ev('sir_fambiz_exec_heir', 'SIR_FAMBIZ', 'exec', [32, 75], 20, 4, (s) => ({ t: '돈의 아들이 회사에 들어왔습니다. 직함은 저보다 아래였고, 결정은 저보다 위였습니다.', k: 'note', fx: { h: -1 } })),
  transition('sir_fambiz_transition', 'SIR_FAMBIZ', {
    manager: (s) => '매니저가 되었습니다. 열쇠가 하나 늘었고, 열지 말아야 하는 문도 하나 늘었습니다.',
    head: (s) => '부장이 되었습니다. 돈의 식탁에 자리가 났고, 그 자리는 끝에서 셋째였습니다.',
    exec: (s) => '임원이 되었습니다. 돈이 직접 반지를 내밀었고, 입을 맞추는 데 한 박자가 걸렸습니다.',
  }),
  aftermath('sir_fambiz_after', 'SIR_FAMBIZ', {
    layoff: (s) => '해고되었습니다. 사유는 "구조 조정"이었고, 제 자리에는 성씨가 같은 사람이 앉았습니다.',
    vendetta: (s) => '벤데타가 회사까지 왔습니다. 살아남았고, 회사는 남지 않았습니다.',
    bankrupt: (s) => '회사가 넘어갔습니다. 다른 패밀리 이름이 간판에 걸렸고, 옛 직원은 받지 않았습니다.',
  }),
  { id: 'sir_fambiz_saluzzo', a: [18, 70], tags: ['aff:SIR_FAMBIZ_SALUZZO'], w: 20, gap: 4,
    run: (s) => ({ t: '살루초 비노의 수확철이었습니다. 사무직도 포도밭에 나갔고, 손이 보라색이 된 채 결산을 했습니다.', k: 'ev', fx: { h: 1 } }) },
  { id: 'sir_fambiz_medici', a: [18, 70], tags: ['aff:SIR_FAMBIZ_MEDICI'], w: 20, gap: 4,
    run: (s) => ({ t: '메디치 금융의 대출 심사였습니다. 담보보다 어느 패밀리 구역 사람인지가 먼저였고, 그 칸이 서류에 있었습니다.', k: 'note', fx: { cap: { learn: 0.02 } } }) },
  { id: 'sir_fambiz_stefano', a: [18, 70], tags: ['aff:SIR_FAMBIZ_STEFANO'], w: 20, gap: 4,
    run: (s) => ({ t: '스테파노 외식 체인 점검을 돌았습니다. 전국 식당 절반이 같은 메뉴판을 썼고, 메뉴판 뒷면이 전부 같은 색이었습니다.', k: 'note' }) },

  // ══════════════════════════════════════════════════════════════════════════
  // SIR_TRUCK 트럭 기사(A11 순회형, 핵심) — assistant / driver / committee / chair
  // ══════════════════════════════════════════════════════════════════════════
  entry('sir_truck_entry', 'SIR_TRUCK', (s) => ({ t: '트럭 조수석에 앉은 첫 해였습니다. 기사는 말이 없었고, 라디오는 늘 같은 방송이었습니다.', k: 'ev' })),
  ev('sir_truck_asst_load', 'SIR_TRUCK', 'assistant', [16, 30], 35, 1, (s) => ({ t: '짐을 싸고 풀었습니다. 상자에는 와인이라고 적혀 있었고, 어떤 상자는 와인 무게가 아니었습니다.', k: 'ev', fx: { hl: -1, cap: { skill: 0.03 } } })),
  ev('sir_truck_asst_night', 'SIR_TRUCK', 'assistant', [16, 30], 30, 2, (s) => ({ t: '밤 운행이었습니다. 기사가 졸면 말을 걸고, 기사가 말이 없으면 라디오를 켰습니다.', k: 'note' })),
  ev('sir_truck_asst_license', 'SIR_TRUCK', 'assistant', [16, 30], 25, 2, (s) => ({ t: '면허 시험을 보았습니다. 시험관은 상조회 사람이었고, 합격증에 상조회 도장이 먼저 찍혔습니다.', k: 'ev', fx: { cap: { skill: 0.04 } } })),
  ev('sir_truck_asst_border', 'SIR_TRUCK', 'assistant', [16, 30], 20, 3, (s) => ({ t: '처음 국경을 넘었습니다. 검문소에서 서류를 냈고, 서류는 기사가 챙긴 것이었습니다.', k: 'ev', fx: { h: 1 } })),
  ev('sir_truck_driver_route', 'SIR_TRUCK', 'driver', [18, 60], 35, 2, (s) => ({ t: visitName(s) + '까지 운행이었습니다. 왕복 열흘, 집에는 사흘. 아이가 키를 재 두었다고 했습니다.', k: 'ev', fx: { money: medX(s, 0.1) } })),
  ev('sir_truck_driver_union', 'SIR_TRUCK', 'driver', [18, 60], 30, 2, (s) => ({ t: '상조회 모임이었습니다. 운임표를 정했고, 밤 운행은 하지 않기로 했습니다. 하는 사람은 있었습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  ev('sir_truck_driver_breakdown', 'SIR_TRUCK', 'driver', [18, 60], 25, 3, (s) => ({ t: '고속도로에서 차가 섰습니다. 상조회에 전화했고, 두 시간 뒤 다른 트럭이 왔습니다. 그것이 상조회였습니다.', k: 'warm', fx: { h: 2, money: -medX(s, 0.1) } })),
  ev('sir_truck_driver_offer', 'SIR_TRUCK', 'driver', [18, 60], 20, 3, (s) => ({ t: '휴게소에서 양복 입은 사람이 야간 운행을 제안했습니다. 운임이 세 배라고 했습니다. 명함은 받았고, 전화는 하지 않았습니다.', k: 'note' })),
  ev('sir_truck_comm_camp', 'SIR_TRUCK', 'committee', [26, 65], 30, 2, (s) => ({ t: '상조회 캠프를 돌았습니다. 기사의 아이 하나가 감염 판정을 받아 캠프에 들어왔고, 상조회원 120명이 치료비를 나눠 냈습니다.', k: 'ev', fx: { money: -medX(s, 0.05), standing: 3 }, f: F('트럭상조회 상호부조 기금 집행 기록, ' + s.year + '년') })),
  ev('sir_truck_comm_fee', 'SIR_TRUCK', 'committee', [26, 65], 30, 2, (s) => ({ t: '운임 협상이었습니다. 화주는 패밀리 기업이었고, 협상은 패밀리 쪽 사무실에서 했습니다. 운임은 5% 올랐습니다.', k: 'ev', fx: { standing: 2 }, f: F('트럭상조회 운임표 개정, ' + s.year + '년') })),
  ev('sir_truck_comm_police', 'SIR_TRUCK', 'committee', [26, 65], 20, 4, (s) => ({ t: '뉴 볼시니 경찰이 상조회에 협조를 요청했습니다. 밤 운행 기록을 보여 달라고 했습니다. 보여 줄 기록은 없었습니다.', k: 'note' }), { c: (s) => s.year >= 1100 }),
  ev('sir_truck_comm_funeral', 'SIR_TRUCK', 'committee', [26, 65], 20, 4, (s) => ({ t: '기사 하나가 사고로 죽었습니다. 상조회가 장례를 맡았고, 트럭 쉰 대가 길을 막고 천천히 갔습니다.', k: 'loss', fx: { h: -2 } })),
  ev('sir_truck_chair_table', 'SIR_TRUCK', 'chair', [35, 70], 30, 2, (s) => ({ t: '위원장 자리에 앉았습니다. 패밀리 쪽에서 축하 와인이 왔고, 돌려보냈습니다. 다음 날 더 큰 상자가 왔습니다.', k: 'note', fx: { standing: 3 } })),
  ev('sir_truck_chair_route1101', 'SIR_TRUCK', 'chair', [35, 70], 25, 5, (s) => ({ t: '뉴 볼시니와 17개 이동도시의 교역로가 열렸습니다. 상조회 운행표가 두 배가 되었고, 기사는 두 배가 되지 않았습니다.', k: 'ev', fx: { money: medX(s, 0.3) }, f: F('시청(패밀리 승인) 교역로 개통 공고, 1101년, 17개 이동도시') }), { c: (s) => s.year >= 1101 && s.year <= 1103 }),
  ev('sir_truck_chair_strike', 'SIR_TRUCK', 'chair', [35, 70], 20, 4, (s) => ({ t: '운행 중단을 결정했습니다. 사흘 동안 도시의 와인과 밀가루가 멈췄습니다. 넷째 날 운임표가 바뀌었습니다.', k: 'ev', fx: { standing: 4, h: -1 } })),
  ev('sir_truck_chair_night', 'SIR_TRUCK', 'chair', [35, 70], 20, 3, (s) => ({ t: '야간 운행표를 찢었습니다. 패밀리 쪽에서 사람이 왔고, 사무실에서 한 시간을 이야기했고, 운행표는 그대로 찢어진 채였습니다.', k: 'bad', fx: { h: -2, standing: 3 } })),
  transition('sir_truck_transition', 'SIR_TRUCK', {
    driver: (s) => '기사가 되었습니다. 운전대를 넘겨받았고, 조수석에 다른 아이가 앉았습니다.',
    committee: (s) => '상조회 위원이 되었습니다. 운행은 줄었고, 회의는 늘었습니다.',
    chair: (s) => '위원장이 되었습니다. 사무실 열쇠와 패밀리 쪽 명함 한 묶음을 같이 받았습니다.',
  }),
  aftermath('sir_truck_after', 'SIR_TRUCK', {
    accident: (s) => '고속도로에서 사고가 났습니다. 살아남았고, 다시 운전대를 잡을 수는 없었습니다.',
    vendetta: (s) => '야간 운행이 패밀리 일에 얽혀 있었습니다. 살아남았고, 상조회는 저를 명단에서 뺐습니다.',
    ruin: (s) => '트럭을 압류당했습니다. 할부가 남아 있었고, 운행은 끊겼습니다.',
  }),
  { id: 'sir_tru_night_aff', a: [16, 65], tags: ['aff:SIR_TRU_NIGHT'], w: 30, gap: 2,
    run: (s) => ({ t: '보르자 쪽 야간 운행이었습니다. 운임은 세 배, 서류는 없고, 짐칸은 열어 보지 않았습니다.', k: 'bad', fx: { money: medX(s, 0.2), h: -2 } }) },
  { id: 'sir_tru_union_aff', a: [16, 65], tags: ['aff:SIR_TRU_UNION'], w: 25, gap: 3,
    run: (s) => ({ t: '상조회 회비를 냈습니다. 적지 않았고, 아이가 아플 때 그 돈이 돌아왔습니다.', k: 'warm', fx: { money: -medX(s, 0.03), h: 1 } }) },
  // 방문국(순회형 피드)
  { id: 'sir_truck_visit_leithanien', a: [16, 65], tags: ['track:SIR_TRUCK', 'visit:leithanien'], w: 30, gap: 3,
    run: (s) => ({ t: '라이타니엔 국경 검문소였습니다. 검문관은 서류보다 꼬리 색을 먼저 보았고, 서류는 두 번 읽었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'sir_truck_visit_columbia', a: [16, 65], tags: ['track:SIR_TRUCK', 'visit:columbia'], w: 30, gap: 3,
    run: (s) => ({ t: '컬럼비아 물류 창고에서 짐을 내렸습니다. 모든 것이 빨랐고, 영수증에 세금 줄이 넷이었습니다.', k: 'ev' }) },
  { id: 'sir_truck_visit_laterano', a: [16, 65], tags: ['track:SIR_TRUCK', 'visit:laterano'], w: 30, gap: 3,
    run: (s) => ({ t: '라테라노 성문 앞에서 하루를 기다렸습니다. 성문 안으로는 들어가지 못했고, 짐은 성문 앞에서 넘겼습니다.', k: 'note' }) },

  // ══════════════════════════════════════════════════════════════════════════
  // SIR_LEGAL 법조인(A3, 핵심) — school / attorney / judge / supreme. 공통 직장 이벤트 금지
  // ══════════════════════════════════════════════════════════════════════════
  entry('sir_legal_entry', 'SIR_LEGAL', (s) => ({ t: '법대에 들어간 첫 해였습니다. 입학식에서 교수보다 후원 패밀리 사람이 먼저 축사를 했습니다.', k: 'ev', fx: { h: 1 } })),
  ev('sir_legal_school_code', 'SIR_LEGAL', 'school', [18, 28], 30, 2, (s) => ({ t: '법전을 외웠습니다. 컬럼비아식 조문이었고, 교수는 "여기서는 이렇게 읽는다"를 조문마다 덧붙였습니다.', k: 'ev', fx: { cap: { learn: 0.05 } } })),
  ev('sir_legal_school_patron_dinner', 'SIR_LEGAL', 'school', [18, 28], 25, 3, (s) => ({ t: '후원 패밀리 저녁에 불려 갔습니다. 학비 이야기는 없었고, 졸업 뒤 이야기만 있었습니다.', k: 'note', fx: { standing: 2 } })),
  ev('sir_legal_school_moot', 'SIR_LEGAL', 'school', [18, 28], 25, 3, (s) => ({ t: '모의재판이었습니다. 피고 역을 맡은 학생의 성씨가 심사위원 성씨와 같았고, 무죄가 났습니다.', k: 'note', fx: { cap: { learn: 0.03 } } })),
  ev('sir_legal_school_grayhall_visit', 'SIR_LEGAL', 'school', [18, 28], 20, 4, (s) => ({ t: '그레이홀 연합 법원 견학이었습니다. 법정 12개 중 3개가 비어 있었고, 비어 있는 이유는 설명하지 않았습니다.', k: 'note', f: F('그레이홀 연합 법원 연감, ' + s.year + '년') })),
  ev('sir_legal_att_client', 'SIR_LEGAL', 'attorney', [22, 55], 35, 2, (s) => ({ t: '의뢰인은 늘 같은 성씨였습니다. 사건은 달랐고, 결과는 비슷했습니다.', k: 'ev', fx: { standing: 2, money: medX(s, 0.1) } })),
  ev('sir_legal_att_judge_call', 'SIR_LEGAL', 'attorney', [22, 55], 25, 3, (s) => ({ t: '판결 전날 판사와 저녁을 먹었습니다. 사건 이야기는 하지 않았습니다. 다음 날 판결은 예상대로였습니다.', k: 'bad', fx: { h: -2, standing: 3 } })),
  ev('sir_legal_att_fake_judge', 'SIR_LEGAL', 'attorney', [22, 55], 20, 4, (s) => ({ t: '시골에서 판사 행세를 하는 군소 패밀리 사람 이야기를 들었습니다. 진짜 판사는 그 마을에 가지 않았습니다.', k: 'note' })),
  ev('sir_legal_att_newvolsinii', 'SIR_LEGAL', 'attorney', [22, 55], 25, 4, (s) => ({ t: '뉴 볼시니 법원에서 처음 변론했습니다. 방청석에 패밀리 사람이 없었습니다. 처음이었습니다.', k: 'ev', fx: { h: 2 } }), { c: (s) => s.year >= 1100 }),
  ev('sir_legal_judge_bench', 'SIR_LEGAL', 'judge', [30, 70], 35, 2, (s) => ({ t: '판사석에 앉았습니다. 피고 쪽 변호사가 후원 패밀리 사람이었습니다. 법대로 판결했고, 그날 저녁 전화가 왔습니다.', k: 'bad', fx: { h: -2, standing: 2 } })),
  ev('sir_legal_judge_threat', 'SIR_LEGAL', 'judge', [30, 70], 20, 4, (s) => ({ t: '차 앞 유리에 쪽지가 있었습니다. 이름만 적혀 있었습니다. 제 아이 이름이었습니다.', k: 'bad', fx: { h: -5 } })),
  ev('sir_legal_judge_vacant', 'SIR_LEGAL', 'judge', [30, 70], 25, 3, (s) => ({ t: '옆 법정 판사가 사임했습니다. 이유는 "건강"이었고, 그 사람은 다음 달 다른 나라에 있었습니다.', k: 'note', fx: { h: -1 } })),
  ev('sir_legal_judge_clean', 'SIR_LEGAL', 'judge', [30, 70], 25, 3, (s) => ({ t: '후원 패밀리와 상관없는 사건 하나를 법대로 끝냈습니다. 아무 일도 없었습니다. 그것이 드문 일이었습니다.', k: 'warm', fx: { h: 2 } })),
  ev('sir_legal_sup_robe', 'SIR_LEGAL', 'supreme', [40, 80], 30, 2, (s) => ({ t: '대법관의 법복을 입었습니다. 임명장에 서명한 사람 셋 중 둘이 패밀리 돈이었습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('sir_legal_sup_reform', 'SIR_LEGAL', 'supreme', [40, 80], 25, 3, (s) => ({ t: '뉴 볼시니 신도시관리법 해석을 내렸습니다. 패밀리가 아닌 쪽에 유리했습니다. 다음 날 신문에 났고, 그 다음 날 차를 바꿨습니다.', k: 'ev', fx: { h: -1, standing: 3 } }), { c: (s) => s.year >= 1100 }),
  ev('sir_legal_sup_young', 'SIR_LEGAL', 'supreme', [40, 80], 20, 4, (s) => ({ t: '젊은 판사 하나가 후원 없이 버티고 있었습니다. 도와주었습니다. 도와준 사실을 아무도 모르게 했습니다.', k: 'warm', fx: { h: 2 } })),
  ev('sir_legal_sup_twelve', 'SIR_LEGAL', 'supreme', [40, 80], 20, 4, (s) => ({ t: '열두 패밀리 대표가 법원에 왔습니다. 재판이 아니라 인사였습니다. 열둘 다 오지는 않았습니다.', k: 'note' })),
  transition('sir_legal_transition', 'SIR_LEGAL', {
    attorney: (s) => '변호사가 되었습니다. 첫 의뢰인은 후원 패밀리였고, 수임료는 학비와 같은 봉투에서 나왔습니다.',
    judge: (s) => '판사가 되었습니다. 임명 소식을 신문보다 패밀리 쪽 전화로 먼저 들었습니다.',
    supreme: (s) => '대법관이 되었습니다. 법복과 함께 경호원 둘이 왔습니다.',
  }),
  aftermath('sir_legal_after', 'SIR_LEGAL', {
    assassination: (s) => '차에 폭탄이 있었습니다. 살아남았고, 법복은 다시 입지 못했습니다.',
    betrayal: (s) => '후원 패밀리를 등졌다는 말이 돌았습니다. 사건이 끊겼고, 사무실 임대 계약이 갱신되지 않았습니다.',
    scandal: (s) => '판결 매수 기사가 났습니다. 사실이었고, 모두가 아는 사실이었습니다. 이번에는 제 이름이었습니다.',
  }),
  { id: 'sir_legal_rhodes', a: [24, 65], tags: ['track:SIR_LEGAL', '!rhodes'], w: 8, gap: 8, c: (s) => !!tr(s) && tr(s).stage >= 1,
    run: (s) => { s.S.flags.rhodes_legal = s.S.age; return { t: '로코모티바의 로도스 아일랜드 지부 계약 서류를 검토했습니다. 패밀리와 상관없는 의뢰는 처음이었고, 그쪽 담당이 제 이름을 적어 갔습니다.', k: 'note' }; } },
  { id: 'sir_leg_bellone_aff', a: [18, 80], tags: ['aff:SIR_LEG_BELLONE'], w: 20, gap: 4,
    run: (s) => ({ t: '벨로네 후원이라는 말이 먼저 다녔습니다. 법정에서 상대 변호사가 변론을 짧게 했습니다.', k: 'note', fx: { standing: 2 } }) },
  { id: 'sir_leg_grayhall_aff', a: [18, 80], tags: ['aff:SIR_LEG_GRAYHALL'], w: 20, gap: 4,
    run: (s) => ({ t: '그레이홀 연합 법원 소속이었습니다. 어느 패밀리에도 속하지 않았다는 것은, 어느 패밀리도 막아 주지 않는다는 뜻이었습니다.', k: 'bad', fx: { h: -1 } }) },

  // ══════════════════════════════════════════════════════════════════════════
  // SIR_LIVING 생업(재단사·피자·세차장·와이너리, A11 핵심) — apprentice / clerk / owner / house + 계절·명절·동네
  // ══════════════════════════════════════════════════════════════════════════
  entry('sir_living_entry', 'SIR_LIVING', (s) => ({ t: ro(affName(s, '가게')) + ' 들어간 첫 해였습니다. 가게 문에는 작은 색 리본이 묶여 있었고, 그 색이 어느 패밀리 구역인지 말해 주었습니다.', k: 'ev' })),
  ev('sir_liv_app_needle', 'SIR_LIVING', 'apprentice', [12, 30], 35, 1, (s) => ({ t: '하루 종일 같은 일을 했습니다. 손이 먼저 배웠고, 머리는 나중에 따라왔습니다.', k: 'ev', fx: { cap: { skill: 0.04 } } })),
  ev('sir_liv_app_master', 'SIR_LIVING', 'apprentice', [12, 30], 30, 2, (s) => ({ t: '주인이 손님 앞에서 저를 혼냈습니다. 손님이 가고 나서는 ' + eul(cul(s).food) + ' 나눠 주었습니다.', k: 'note', fx: { h: -1, cap: { ties: 0.02 } } })),
  ev('sir_liv_app_envelope', 'SIR_LIVING', 'apprentice', [12, 30], 25, 2, (s) => ({ t: '매달 같은 날 양복 입은 사람이 왔습니다. 주인은 봉투를 건넸고, 저는 뒷방에 있으라고 했습니다.', k: 'note' })),
  ev('sir_liv_app_sunday', 'SIR_LIVING', 'apprentice', [12, 30], 20, 3, (s) => ({ t: '일요일에는 가게를 닫고 미사에 갔습니다. 주인 가족 뒷줄에 앉았고, 그 자리가 제 자리가 되었습니다.', k: 'warm', fx: { h: 1 } })),
  ev('sir_liv_clerk_regular', 'SIR_LIVING', 'clerk', [15, 45], 35, 2, (s) => ({ t: '단골이 생겼습니다. 이름보다 주문을 먼저 외웠고, 어느 패밀리 사람인지는 셋째로 외웠습니다.', k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } })),
  ev('sir_liv_clerk_closed', 'SIR_LIVING', 'clerk', [15, 45], 25, 3, (s) => ({ t: '옆 가게가 문을 닫았습니다. 봉투를 두 달 거른 집이었습니다. 새 가게는 한 달 뒤에 열었고, 리본 색이 같았습니다.', k: 'bad', fx: { h: -2 } })),
  ev('sir_liv_clerk_delivery', 'SIR_LIVING', 'clerk', [15, 45], 30, 2, (s) => ({ t: '패밀리 저택에 배달을 갔습니다. 뒷문으로 들어가 뒷문으로 나왔고, 팁은 한 달 월급이었습니다.', k: 'ev', fx: { money: medX(s, 0.08) } })),
  ev('sir_liv_clerk_wage', 'SIR_LIVING', 'clerk', [15, 45], 25, 3, (s) => ({ t: '월급이 올랐습니다. 주인은 "가족이니까"라고 했고, 오른 만큼 일도 늘었습니다.', k: 'ev', fx: { money: medX(s, 0.05), hl: -1 } })),
  ev('sir_liv_owner_ribbon', 'SIR_LIVING', 'owner', [22, 70], 35, 2, (s) => ({ t: '가게 문에 리본을 제 손으로 묶었습니다. 색을 고를 수는 없었습니다.', k: 'note', fx: { standing: 2 } })),
  ev('sir_liv_owner_envelope', 'SIR_LIVING', 'owner', [22, 70], 35, 1, (s) => ({ t: '봉투를 제가 건네게 되었습니다. 월 매출의 8%. 양복 입은 사람은 저보다 어렸고, 저보다 먼저 인사를 받았습니다.', k: 'bad', fx: { money: -medX(s, 0.06) }, f: F('시청(패밀리 승인) 지역 보호 분담금 안내, ' + s.year + '년') })),
  ev('sir_liv_owner_supply', 'SIR_LIVING', 'owner', [22, 70], 25, 3, (s) => ({ t: '납품처를 바꾸라는 말이 왔습니다. 패밀리 쪽 공장이었고, 값은 조금 비쌌고, 거절은 적혀 있지 않았습니다.', k: 'bad', fx: { money: -medX(s, 0.04) } })),
  ev('sir_liv_owner_wedding', 'SIR_LIVING', 'owner', [22, 70], 25, 3, (s) => ({ t: '패밀리 혼례 주문이 들어왔습니다. 석 달을 그 일만 했고, 대금은 한 번에 들어왔습니다.', k: 'ev', fx: { money: medX(s, 0.6), hl: -2 } })),
  ev('sir_liv_house_three', 'SIR_LIVING', 'house', [40, 90], 30, 2, (s) => ({ t: '3대째 간판이었습니다. 할아버지 이름, 아버지 이름, 제 이름. 손님들은 그 셋을 하나로 불렀습니다.', k: 'warm', fx: { h: 2, standing: 2 } })),
  ev('sir_liv_house_don', 'SIR_LIVING', 'house', [40, 90], 25, 3, (s) => ({ t: '돈이 직접 가게에 왔습니다. 주문은 작았고, 그날 이후 봉투 걷는 사람이 오지 않았습니다.', k: 'ev', fx: { h: 2, standing: 4 } })),
  ev('sir_liv_house_apprentice', 'SIR_LIVING', 'house', [40, 90], 25, 3, (s) => ({ t: '견습을 받았습니다. 제가 혼났던 자리에서 혼냈고, 손님이 가면 ' + eul(cul(s).food) + ' 나눠 주었습니다.', k: 'warm', fx: { cap: { ties: 0.03 } } })),
  ev('sir_liv_house_vendetta_wind', 'SIR_LIVING', 'house', [40, 90], 20, 4, (s) => ({ t: '구역 패밀리가 바뀔지도 모른다는 말이 돌았습니다. 리본 색을 바꾸는 것은 쉬웠습니다. 바꿔야 할 때를 아는 것이 어려웠습니다.', k: 'bad', fx: { h: -2 } })),
  transition('sir_living_transition', 'SIR_LIVING', {
    clerk: (s) => '점원이 되었습니다. 앞치마에 가게 이름이 들어갔고, 월급 봉투가 처음 생겼습니다.',
    owner: (s) => '가게 주인이 되었습니다. 간판과 열쇠와, 매달 봉투를 건넬 의무가 함께 왔습니다.',
    house: (s) => '3대 명가로 불리게 되었습니다. 간판을 새로 달았고, 옛 간판은 안쪽 벽에 걸었습니다.',
  }),
  aftermath('sir_living_after', 'SIR_LIVING', {
    ruin: (s) => '가게를 닫았습니다. 봉투를 거를 수는 없었고, 월세를 거를 수도 없었습니다. 둘 중 하나가 남았습니다.',
    vendetta: (s) => '구역 패밀리가 벤데타에 들었습니다. 가게 리본 색 때문에 저희도 명단에 있었습니다. 살아남았고, 가게는 남지 않았습니다.',
    arrest: (s) => '뒷방에 둔 상자 때문에 체포되었습니다. 제 것이 아니었고, 그 말은 통하지 않았습니다.',
  }),
  // 계절·명절·동네(A11 체감용, 6개+)
  { id: 'sir_liv_carnevale', a: [10, 90], tags: ['track:SIR_LIVING'], w: 25, gap: 3,
    run: (s) => ({ t: fest(s, 0) + '였습니다. 가게 앞에 가면 쓴 손님 300명이 줄을 섰고, 다음 날 아침 골목 하나에 흰 천이 깔렸습니다. 가게는 평소대로 열었습니다.', k: 'ev', fx: { h: 1, money: medX(s, 0.05) }, f: F('시청(패밀리 승인) 축제 허가서, ' + s.year + '년') }) },
  { id: 'sir_liv_harvest', a: [10, 90], tags: ['track:SIR_LIVING'], w: 25, gap: 2,
    run: (s) => ({ t: '와인 수확철이었습니다. 올해 수확은 지난해의 90%. 동네 전체가 포도밭에 나갔고, 가게는 오후에만 열었습니다. 저녁에는 모두 손이 보라색이었습니다.', k: 'warm', fx: { h: 2 }, f: F('시청(패밀리 승인) 와인 수확 집계, ' + s.year + '년') }) },
  { id: 'sir_liv_sunday_mass', a: [10, 90], tags: ['track:SIR_LIVING'], w: 25, gap: 2,
    run: (s) => ({ t: '일요일 미사였습니다. 앞줄에 패밀리, 뒷줄에 가게 사람들. 신부님은 모두에게 같은 말을 했고, 모두 다르게 들었습니다.', k: 'ev', fx: { h: 1, cap: { ties: 0.02 } } }) },
  { id: 'sir_liv_wolf_mother', a: [10, 90], tags: ['track:SIR_LIVING'], w: 20, gap: 4,
    run: (s) => ({ t: fest(s, 1) + '이었습니다. 늑대 어머니 상 앞에 빵과 ' + eul(cul(s).drink) + ' 놓았고, 아이들은 상 뒤에서 늑대 흉내를 냈습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'sir_liv_siesta_hour', a: [10, 90], tags: ['track:SIR_LIVING'], w: 20, gap: 3,
    run: (s) => ({ t: '한낮에는 동네 전체가 문을 닫았습니다. 세 시에 다시 열었고, 세 시 전에 오는 손님은 외지인이었습니다.', k: 'note' }) },
  { id: 'sir_liv_funeral_street', a: [10, 90], tags: ['track:SIR_LIVING'], w: 20, gap: 4,
    run: (s) => ({ t: '골목에서 장례 행렬이 지나갔습니다. 가게들이 문을 닫았고, 누구의 장례인지는 행렬 앞의 꼬리 색이 말해 주었습니다.', k: 'loss', fx: { h: -1 } }) },
  { id: 'sir_liv_football', a: [10, 90], tags: ['track:SIR_LIVING'], w: 15, gap: 3,
    run: (s) => ({ t: '광장에서 동네 아이들이 공을 찼습니다. 패밀리 구역 경계가 골대였고, 공이 넘어가면 아무도 가져오지 않았습니다.', k: 'note', fx: { h: 1 } }) },
  // 소속 변주: 가게 종류
  { id: 'sir_liv_tailor_aff', a: [12, 90], tags: ['aff:SIR_LIV_TAILOR'], w: 25, gap: 3,
    run: (s) => ({ t: '패밀리 사람의 양복을 지었습니다. 안주머니를 하나 더 달라고 했고, 무엇을 넣을지는 묻지 않았습니다.', k: 'note', fx: { money: medX(s, 0.08), cap: { skill: 0.03 } } }) },
  { id: 'sir_liv_pizza_aff', a: [12, 90], tags: ['aff:SIR_LIV_PIZZA'], w: 25, gap: 3,
    run: (s) => ({ t: '피자 가게 오븐 앞에서 여름을 났습니다. 배달 주문의 절반은 같은 저택이었습니다.', k: 'ev', fx: { hl: -1, money: medX(s, 0.04) } }) },
  { id: 'sir_liv_carwash_aff', a: [12, 90], tags: ['aff:SIR_LIV_CARWASH'], w: 25, gap: 3,
    run: (s) => ({ t: '세차장에 직원이 하나 더 왔습니다. 세차를 하지 않았고, 차가 오면 운전석 사람과 이야기만 했습니다. 월급은 저보다 많았습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'sir_liv_winery_aff', a: [12, 90], tags: ['aff:SIR_LIV_WINERY'], w: 25, gap: 3,
    run: (s) => ({ t: '와이너리 통 사이에서 일했습니다. 통마다 패밀리 문장이 찍혀 있었고, 문장 없는 통은 밤에 나갔습니다.', k: 'note', fx: { money: medX(s, 0.03) } }) },

  // ══════════════════════════════════════════════════════════════════════════
  // 나머지 진로 — 단계마다 2개 + 전환 + 몰락 후일담
  // ══════════════════════════════════════════════════════════════════════════
  // SIR_GANG 거리 갱 — small / leader / absorbed
  ev('sir_gang_small_pocket', 'SIR_GANG', 'small', [10, 30], 30, 2, (s) => ({ t: '시장에서 지갑을 뺐습니다. 세 번 성공하고 한 번 잡혔고, 잡은 사람은 패밀리 사람이라 경찰에 넘기지 않았습니다.', k: 'ev', fx: { money: medX(s, 0.03), standing: 2 } })),
  ev('sir_gang_small_corner', 'SIR_GANG', 'small', [10, 30], 25, 2, (s) => ({ t: '골목 하나가 저희 것이었습니다. 패밀리가 쓰지 않는 골목이었고, 그래서 저희 것이었습니다.', k: 'note' })),
  ev('sir_gang_leader_crew', 'SIR_GANG', 'leader', [14, 35], 30, 2, (s) => ({ t: '아이 다섯을 데리고 다녔습니다. 먹이고, 가르치고, 패밀리 눈에 띄지 않게 했습니다. 셋째가 가장 어려웠습니다.', k: 'ev', fx: { standing: 3 } })),
  ev('sir_gang_leader_offer', 'SIR_GANG', 'leader', [14, 35], 25, 3, (s) => ({ t: '패밀리 쪽 솔다토가 찾아왔습니다. 저희 골목을 패밀리 밑으로 넣자고 했습니다. 대답은 다음에 하라고 했습니다.', k: 'note', fx: { h: -1 } })),
  ev('sir_gang_abs_new', 'SIR_GANG', 'absorbed', [16, 40], 30, 2, (s) => ({ t: '갱이 끝났습니다. 아이들 절반은 패밀리로, 절반은 흩어졌습니다. 저는 어느 쪽인지 아직 정하지 못했습니다.', k: 'note' })),
  ev('sir_gang_abs_old_corner', 'SIR_GANG', 'absorbed', [16, 40], 25, 3, (s) => ({ t: '옛 골목을 지나갔습니다. 다른 아이들이 있었고, 저를 보고 길을 비켰습니다.', k: 'note', fx: { h: -1 } })),
  transition('sir_gang_transition', 'SIR_GANG', {
    leader: (s) => '조장이 되었습니다. 아이들이 형이라고 불렀고, 패밀리 사람들은 이름을 묻기 시작했습니다.',
    absorbed: (s) => '갱이 패밀리 그늘에 들어갔거나 흩어졌습니다. 어느 쪽이든 골목은 더 저희 것이 아니었습니다.',
  }),
  aftermath('sir_gang_after', 'SIR_GANG', {
    arrest: (s) => '체포되었습니다. 변호사는 없었고, 감방 안에 아는 얼굴이 둘 있었습니다.',
    vendetta: (s) => '패밀리 사이 일에 골목이 휩쓸렸습니다. 살아남았고, 아이들은 흩어졌습니다.',
    execution: (s) => '패밀리 클리너가 왔습니다. 저는 그날 그 골목에 없었습니다. 그 뒤로도 가지 않았습니다.',
  }),
  { id: 'sir_gang_chiave_aff', a: [10, 40], tags: ['aff:SIR_GANG_CHIAVE'], w: 25, gap: 3,
    run: (s) => ({ t: '키아베 갱은 열쇠 모양 표식을 썼습니다. 비테의 골목 벽마다 그 표식이 있었고, 패밀리는 지우지 않았습니다. 아직은.', k: 'note' }) },

  // SIR_CLEANER 클리너·사일런서 — soldato / apprentice / cleaner / silencer
  ev('sir_cle_sold_record', 'SIR_CLEANER', 'soldato', [20, 45], 30, 2, (s) => ({ t: '실적이 위로 올라갔다고 했습니다. 어떤 실적인지는 서로 말하지 않았습니다.', k: 'bad', fx: { standing: 3, h: -2 } })),
  ev('sir_cle_sold_watch', 'SIR_CLEANER', 'soldato', [20, 45], 25, 3, (s) => ({ t: '선배 클리너가 저를 한 달 지켜보았다고 했습니다. 지켜보는 것을 몰랐습니다. 그것이 시험이었습니다.', k: 'note' })),
  ev('sir_cle_app_tools', 'SIR_CLEANER', 'apprentice', [22, 45], 30, 2, (s) => ({ t: '도구를 받았습니다. 말 대신 손으로 배웠고, 배운 것은 집에 가져가지 않았습니다.', k: 'ev', fx: { cap: { skill: 0.05 } } })),
  ev('sir_cle_app_first', 'SIR_CLEANER', 'apprentice', [22, 45], 25, 3, (s) => ({ t: '첫 일이 끝났습니다. 선배는 아무 말도 하지 않았고, 그날 밤 ' + eul(cul(s).drink) + ' 한 잔 따라 주었습니다.', k: 'bad', fx: { h: -4, standing: 4 } })),
  ev('sir_cle_cleaner_list', 'SIR_CLEANER', 'cleaner', [25, 60], 30, 2, (s) => ({ t: '이름 하나가 내려왔습니다. 아는 이름이었습니다. 일은 끝났고, 그 이름은 더 부르지 않았습니다.', k: 'bad', fx: { h: -5, standing: 3, money: medX(s, 0.4) } })),
  ev('sir_cle_cleaner_family', 'SIR_CLEANER', 'cleaner', [25, 60], 25, 3, (s) => ({ t: '집에서는 보험 일을 한다고 했습니다. 아이가 학교에서 그렇게 썼다고 했습니다.', k: 'note', fx: { h: -2 } })),
  ev('sir_cle_sil_legend', 'SIR_CLEANER', 'silencer', [30, 70], 30, 2, (s) => ({ t: '이름이 거리에서 돌았습니다. 아무도 얼굴은 몰랐고, 그래야 했습니다.', k: 'note', fx: { standing: 2 } })),
  ev('sir_cle_sil_mentor', 'SIR_CLEANER', 'silencer', [30, 70], 25, 3, (s) => ({ t: '견습 하나를 받았습니다. 한 달을 지켜보았고, 지켜보는 것을 모르는지 보았습니다.', k: 'note' })),
  transition('sir_cleaner_transition', 'SIR_CLEANER', {
    apprentice: (s) => '클리너 견습으로 뽑혔습니다. 패밀리 명단에서 이름이 지워졌고, 다른 명단에 올랐습니다.',
    cleaner: (s) => '클리너가 되었습니다. 돈과 직접 이야기하게 되었고, 그 외 누구와도 이야기하지 않게 되었습니다.',
    silencer: (s) => '사일런서로 불리게 되었습니다. 그 말을 입 밖에 내는 사람은 패밀리 안에도 몇 없었습니다.',
  }),
  aftermath('sir_cleaner_after', 'SIR_CLEANER', {
    vendetta: (s) => '표적이 바뀌었습니다. 이번에는 저였습니다. 살아남았고, 나라 안에는 더 있을 수 없었습니다.',
    betrayal: (s) => '제 이름이 넘어갔습니다. 살아남았고, 살아남은 이유는 아직 모릅니다.',
    arrest: (s) => '체포되었습니다. 증거는 없었고, 형량은 있었습니다. 패밀리 변호사는 오지 않았습니다.',
  }),
  { id: 'sir_cle_freelance_aff', a: [22, 70], tags: ['aff:SIR_CLE_FREELANCE'], w: 25, gap: 3,
    run: (s) => ({ t: '어느 패밀리 것도 아니었습니다. 값은 두 배였고, 막아 줄 사람은 없었습니다.', k: 'bad', fx: { money: medX(s, 0.3), h: -2 } }) },

  // SIR_FOREIGN 컬럼비아계 회사원(A10, 1102~) — staff / section / branch
  ev('sir_for_staff_badge', 'SIR_FOREIGN', 'staff', [18, 40], 30, 2, (s) => ({ t: '컬럼비아계 회사 사원증을 받았습니다. 꼬리 색 칸이 없는 서류는 처음이었습니다.', k: 'ev', fx: { h: 2 } })),
  ev('sir_for_staff_pressure', 'SIR_FOREIGN', 'staff', [18, 40], 25, 3, (s) => ({ t: '회사 앞에 양복 입은 사람들이 서 있었습니다. 들어오지는 않았습니다. 본사는 "현지 문화"라고 했습니다.', k: 'note', fx: { h: -1 } })),
  ev('sir_for_sec_hq', 'SIR_FOREIGN', 'section', [22, 55], 30, 2, (s) => ({ t: '본사 보고였습니다. 트리마운츠 시간에 맞춰 새벽에 전화를 받았고, 본사는 패밀리라는 말을 이해하지 못했습니다.', k: 'ev', fx: { hl: -1, standing: 3 } })),
  ev('sir_for_sec_local', 'SIR_FOREIGN', 'section', [22, 55], 25, 3, (s) => ({ t: '현지 납품 계약이었습니다. 패밀리 기업이 입찰에 들어왔고, 본사 규정은 입찰을 공개로 했습니다. 양쪽 다 불편해했습니다.', k: 'note' })),
  ev('sir_for_branch_forum', 'SIR_FOREIGN', 'branch', [28, 65], 30, 2, (s) => ({ t: '산업협력 포럼에 지사 대표로 갔습니다. 컬럼비아 기업 열 곳과 패밀리 돈 셋이 같은 식탁에 앉았습니다.', k: 'ev', fx: { standing: 3 } })),
  ev('sir_for_branch_quit', 'SIR_FOREIGN', 'branch', [28, 65], 25, 3, (s) => ({ t: '지사 직원 둘이 그만뒀습니다. 패밀리 쪽 압박이라고 했고, 본사 보고서에는 "개인 사유"라고 썼습니다.', k: 'bad', fx: { h: -2 } })),
  transition('sir_foreign_transition', 'SIR_FOREIGN', {
    section: (s) => '과장이 되었습니다. 본사 직급표에 따라서였고, 패밀리 쪽은 그 직급을 뭐라 불러야 할지 몰랐습니다.',
    branch: (s) => '지사 간부가 되었습니다. 본사 발령장과 패밀리 쪽 축하 와인이 같은 날 왔습니다.',
  }),
  aftermath('sir_foreign_after', 'SIR_FOREIGN', {
    layoff: (s) => '지사가 축소되었습니다. 본사는 "시장 상황"이라고 했고, 시장 상황은 패밀리였습니다.',
    vendetta: (s) => '패밀리 압박이 회사가 아니라 저에게 왔습니다. 사직서를 냈고, 본사는 받아 주었습니다.',
  }),
  { id: 'sir_for_security_aff', a: [18, 65], tags: ['aff:SIR_FOR_SECURITY'], w: 25, gap: 3,
    run: (s) => ({ t: '컬럼비아 보안 회사 지사였습니다. 패밀리 솔다토와 같은 거리에서 경비를 섰고, 서로 못 본 척했습니다.', k: 'note' }) },

  // SIR_PUBLIC 공직·장관(A3) — staff / section / minister
  ev('sir_pub_staff_desk', 'SIR_PUBLIC', 'staff', [22, 45], 30, 2, (s) => ({ t: '시청 자리에 앉았습니다. 채용 기준은 없었고, 추천서는 있었습니다. 제 추천서에 적힌 성씨를 모두가 알았습니다.', k: 'note' })),
  ev('sir_pub_staff_permit', 'SIR_PUBLIC', 'staff', [22, 45], 30, 2, (s) => ({ t: '허가 서류에 도장을 찍었습니다. 하루 100장, 그중 몇 장은 찍기 전에 전화가 왔습니다.', k: 'ev', fx: { standing: 2 }, f: F('시청(패밀리 승인) 허가 처리 집계, ' + s.year + '년') })),
  ev('sir_pub_sec_council', 'SIR_PUBLIC', 'section', [28, 60], 30, 2, (s) => ({ t: '협의회 회의였습니다. 안건 3건, 결정은 회의 전에 나 있었고, 회의는 그것을 적는 자리였습니다.', k: 'note', fx: { standing: 2 }, f: F('세티 콜리 협의회 회의록, ' + s.year + '년') })),
  ev('sir_pub_sec_carbomb', 'SIR_PUBLIC', 'section', [28, 60], 20, 4, (s) => ({ t: '옆 부서 과장의 차가 아침에 불탔습니다. 다쳤고, 살았고, 다음 달 사직했습니다.', k: 'bad', fx: { h: -4 } })),
  ev('sir_pub_min_speech', 'SIR_PUBLIC', 'minister', [35, 75], 30, 2, (s) => ({ t: '취임 연설을 했습니다. 광장 뒤편에 늑대들이 앉아 있었고, 연설이 끝나자 일어나 흩어졌습니다.', k: 'ev', fx: { standing: 3 } })),
  ev('sir_pub_min_escort', 'SIR_PUBLIC', 'minister', [35, 75], 25, 3, (s) => ({ t: '경호가 2명에서 4명으로 늘었습니다. 이유는 말해 주지 않았고, 신문은 다음 날 말해 주었습니다.', k: 'bad', fx: { h: -3 }, f: F('뉴 볼시니 시청 경호 배치 기록, ' + s.year + '년') })),
  transition('sir_public_transition', 'SIR_PUBLIC', {
    section: (s) => '과장이 되었습니다. 결재 도장이 하나 늘었고, 전화가 오는 시간이 밤으로 옮겨 갔습니다.',
    minister: (s) => '장관이 되었습니다. 임명장에 서명한 사람이 패밀리 돈이 아닌 것은 뉴 볼시니가 처음이었습니다.',
  }),
  aftermath('sir_public_after', 'SIR_PUBLIC', {
    impeach: (s) => '탄핵되었습니다. 표결은 만장일치였고, 표결 전날 열두 패밀리 중 하나가 마음을 바꿨습니다.',
    assassination: (s) => '차량 폭탄이었습니다. 살아남았고, 공직에는 돌아가지 않았습니다.',
  }),
  { id: 'sir_pub_cityhall_aff', a: [22, 75], tags: ['aff:SIR_PUB_CITYHALL'], w: 25, gap: 3,
    run: (s) => ({ t: '뉴 볼시니 시청은 패밀리 추천서가 없어도 뽑았습니다. 그래서 복도에서 서로 어느 패밀리냐고 묻는 사람이 없었습니다. 어색했습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'sir_pub_settecolli_aff', a: [22, 75], tags: ['aff:SIR_PUB_SETTECOLLI'], w: 20, gap: 4,
    run: (s) => ({ t: '세티 콜리 협의회 자리였습니다. 일곱 언덕의 패밀리가 돌아가며 의장을 맡았고, 올해는 저희 쪽이었습니다.', k: 'note', fx: { standing: 2 } }) },

  // SIR_POLICE 뉴 볼시니 경찰(A4, 1100~) — rookie / officer / sergeant / chief
  ev('sir_pol_rookie_uniform', 'SIR_POLICE', 'rookie', [18, 32], 30, 2, (s) => ({ t: '제복을 입었습니다. 패밀리가 아닌 사람이 제복을 입고 다니는 것을 사람들이 처음 보았습니다. 저도 처음이었습니다.', k: 'ev', fx: { h: 2 } })),
  ev('sir_pol_rookie_norule', 'SIR_POLICE', 'rookie', [18, 32], 25, 2, (s) => ({ t: '채용 기준이 없었습니다. 동기 중에는 솔다토였던 사람도, 피자집 점원이었던 사람도 있었습니다.', k: 'note' })),
  ev('sir_pol_officer_patrol', 'SIR_POLICE', 'officer', [20, 50], 30, 2, (s) => ({ t: '순찰이었습니다. 패밀리 구역 경계에서 솔다토와 마주쳤고, 서로 고개만 까딱했습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('sir_pol_officer_envelope', 'SIR_POLICE', 'officer', [20, 50], 25, 3, (s) => ({ t: '차 유리에 봉투가 끼어 있었습니다. 돈이었습니다. 반장에게 가져갔고, 반장은 서랍에 넣었습니다.', k: 'bad', fx: { h: -2 } })),
  ev('sir_pol_sgt_emergency', 'SIR_POLICE', 'sergeant', [25, 55], 30, 2, (s) => ({ t: '계엄 긴급조치가 내려왔습니다. 하룻밤에 체포 영장 50장. 절반은 패밀리 이름, 절반은 처음 보는 이름이었습니다.', k: 'bad', fx: { hl: -1, standing: 3 }, f: F('뉴 볼시니 경찰국 긴급조치 집행 기록, ' + s.year + '년') })),
  ev('sir_pol_sgt_funeral', 'SIR_POLICE', 'sergeant', [25, 55], 20, 4, (s) => ({ t: '부하 하나가 순직했습니다. 장례에 시장이 왔고, 패밀리 쪽에서는 화환만 왔습니다.', k: 'loss', fx: { h: -3 } })),
  ev('sir_pol_chief_mayor', 'SIR_POLICE', 'chief', [32, 60], 30, 2, (s) => ({ t: '시장과 주례 회의를 했습니다. 시장은 "법"이라는 말을 자주 썼고, 저는 "구역"이라는 말을 자주 썼습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('sir_pol_chief_budget', 'SIR_POLICE', 'chief', [32, 60], 25, 3, (s) => ({ t: '경찰국 예산이 늘었습니다. 늘어난 만큼 패밀리 기업 기부금 항목도 늘었고, 그 항목을 지우지 못했습니다.', k: 'note', fx: { h: -1 } })),
  transition('sir_police_transition', 'SIR_POLICE', {
    officer: (s) => '정식 순경이 되었습니다. 배지 번호가 나왔고, 번호를 적어 가는 사람이 있었습니다.',
    sergeant: (s) => '반장이 되었습니다. 책상 서랍에 든 봉투들을 처리하는 것이 첫 일이었습니다.',
    chief: (s) => '서장이 되었습니다. 임명장은 시장이 주었고, 축하 전화는 패밀리에서 먼저 왔습니다.',
  }),
  aftermath('sir_police_after', 'SIR_POLICE', {
    kia: (s) => '현장에서 다쳤습니다. 경찰국은 치료비를 냈고, 제복은 반납했습니다.',
    betrayal: (s) => '봉투를 받은 기록이 나왔습니다. 제 것이 아니라는 말은 통하지 않았고, 배지를 반납했습니다.',
    vendetta: (s) => '패밀리 사이 일에 끼었습니다. 살아남았고, 경찰국은 저를 보호할 수 없다고 했습니다.',
  }),
  { id: 'sir_pol_emergency_aff', a: [18, 60], tags: ['aff:SIR_POL_EMERGENCY'], w: 25, gap: 3,
    run: (s) => ({ t: '긴급조치반이었습니다. 영장 없이 들어가는 날이 있었고, 들어간 집은 늘 패밀리 쪽이거나, 패밀리가 가리킨 쪽이었습니다.', k: 'bad', fx: { h: -2, standing: 2 } }) },

  // SIR_MEDIC 의사(A9) — student / resident / doctor
  ev('sir_med_student_palermo', 'SIR_MEDIC', 'student', [18, 28], 30, 2, (s) => ({ t: '팔레르모 의학원 해부 실습이었습니다. 교수는 광산 역병 환자의 폐를 보여 주었고, 아무도 점심을 먹지 않았습니다.', k: 'ev', fx: { cap: { learn: 0.05 } } })),
  ev('sir_med_student_debt', 'SIR_MEDIC', 'student', [18, 28], 25, 3, (s) => ({ t: '학비가 올랐습니다. 패밀리 장학금 안내문이 같은 날 왔습니다. 조건은 작은 글씨였습니다.', k: 'note', fx: { money: -medX(s, 0.4) } })),
  ev('sir_med_res_night', 'SIR_MEDIC', 'resident', [23, 35], 30, 2, (s) => ({ t: '당직이었습니다. 새벽에 총상 환자가 왔고, 보호자는 신고하지 말라고 했습니다. 치료했고, 신고하지 않았습니다.', k: 'bad', fx: { hl: -2, h: -2, cap: { skill: 0.04 } } })),
  ev('sir_med_res_mine', 'SIR_MEDIC', 'resident', [23, 35], 25, 3, (s) => ({ t: '팔레르모 광산 역병 지역 파견이었습니다. 환자 300명에 약은 100명분이었습니다. 돌아와서 검사를 받았고, 결과는 음성이었습니다.', k: 'bad', fx: { hl: -3, standing: 4 }, f: F('팔레르모 의학원 광산 역병 역학 보고, ' + s.year + '년') })),
  ev('sir_med_doc_clinic', 'SIR_MEDIC', 'doctor', [27, 75], 30, 2, (s) => ({ t: '진료실 문을 열었습니다. 첫 환자는 동네 사람, 둘째 환자는 양복 입은 사람이었습니다. 둘째가 진료비를 정했습니다.', k: 'ev', fx: { money: medX(s, 0.2) } })),
  ev('sir_med_doc_housecall', 'SIR_MEDIC', 'doctor', [27, 75], 25, 3, (s) => ({ t: '패밀리 저택 왕진이었습니다. 환자는 돈의 어머니였고, 진료비는 묻지 않아도 왔습니다.', k: 'ev', fx: { money: medX(s, 0.3), standing: 2 } })),
  transition('sir_medic_transition', 'SIR_MEDIC', {
    resident: (s) => '수련의가 되었습니다. 흰 가운을 받았고, 가운은 한 달 만에 흰색이 아니었습니다.',
    doctor: (s) => '의사가 되었습니다. 간판을 걸었고, 간판 옆에 작은 색 리본이 묶여 있었습니다. 제가 묶은 것은 아니었습니다.',
  }),
  aftermath('sir_medic_after', 'SIR_MEDIC', {
    infected: (s) => '광산 파견에서 돌아온 뒤 판정이 났습니다. 도시는 묻지 않았고, 환자들은 오지 않았습니다.',
    exile: (s) => '치료한 환자가 잘못된 쪽 사람이었습니다. 나라를 떠나야 했고, 가운은 두고 왔습니다.',
    vendetta: (s) => '환자의 패밀리와 다른 패밀리 사이 일이었습니다. 진료실에 총탄이 박혔고, 살아남았고, 문을 닫았습니다.',
  }),
  { id: 'sir_med_rhodes', a: [25, 70], tags: ['track:SIR_MEDIC', '!rhodes'], w: 8, gap: 8, c: (s) => !!tr(s) && tr(s).stage >= 1,
    run: (s) => { s.S.flags.rhodes_medical_pact = s.S.age; return { t: '팔레르모 역병 지역에서 로도스 아일랜드 의료팀과 일했습니다. 그쪽 의사가 제 처방을 적어 갔고, 연락처도 적어 갔습니다.', k: 'note' }; } },
  { id: 'sir_med_family_aff', a: [23, 75], tags: ['aff:SIR_MED_FAMILY'], w: 25, gap: 3,
    run: (s) => ({ t: '패밀리 전속 의사였습니다. 진료 기록은 쓰지 않았고, 환자 이름은 기억에만 두었습니다.', k: 'note', fx: { money: medX(s, 0.2), h: -1 } }) },

  // SIR_ART 공연·예술(A12) — street / pro / leader / master
  ev('sir_art_street_hat', 'SIR_ART', 'street', [12, 35], 30, 2, (s) => ({ t: '광장에서 공연했습니다. 모자에 동전이 들어왔고, 그중 금화 하나는 패밀리 사람이 넣은 것이었습니다. 그것이 신호였습니다.', k: 'ev', fx: { money: medX(s, 0.03), cap: { arts: 0.04 } } })),
  ev('sir_art_street_rain', 'SIR_ART', 'street', [12, 35], 25, 2, (s) => ({ t: '비가 왔습니다. 광장이 비었고, 악기를 안고 성당 처마 밑에 섰습니다. 신부님이 ' + eul(cul(s).drink) + ' 한 잔 내주었습니다.', k: 'warm', fx: { h: 1 } })),
  ev('sir_art_pro_carnevale', 'SIR_ART', 'pro', [16, 50], 30, 2, (s) => ({ t: fest(s, 0) + ' 무대였습니다. 가면 쓴 관객 1,000명 앞에서 공연했고, 누가 박수를 치는지 보이지 않았습니다.', k: 'ev', fx: { standing: 3, money: medX(s, 0.15) }, f: F('카르네발레 조합 공연 기록, ' + s.year + '년') })),
  ev('sir_art_pro_patron', 'SIR_ART', 'pro', [16, 50], 25, 3, (s) => ({ t: '후원자가 생겼습니다. 패밀리 사람이었고, 공연 전에 한 곡을 정해 주었습니다. 늘 같은 곡이었습니다.', k: 'note', fx: { money: medX(s, 0.1), h: -1 } })),
  ev('sir_art_leader_troupe', 'SIR_ART', 'leader', [24, 65], 30, 2, (s) => ({ t: '악단을 꾸렸습니다. 열둘, 그중 둘은 후원 패밀리가 보낸 사람이었고, 악기는 들지 않았습니다.', k: 'ev', fx: { standing: 3 } })),
  ev('sir_art_leader_script', 'SIR_ART', 'leader', [24, 65], 25, 3, (s) => ({ t: '극본을 썼습니다. 패밀리 이야기였고, 이름은 전부 바꿨고, 모두가 누구인지 알았습니다. 상연은 허락되었습니다.', k: 'ev', fx: { cap: { arts: 0.05 } } })),
  ev('sir_art_master_jury', 'SIR_ART', 'master', [35, 80], 30, 2, (s) => ({ t: '심사위원석에 앉았습니다. 심사 전날 와인 세 병이 왔고, 세 병 다 다른 패밀리 포도밭이었습니다. 마시지 않았습니다.', k: 'note', fx: { standing: 2 } })),
  ev('sir_art_master_film', 'SIR_ART', 'master', [35, 80], 25, 3, (s) => ({ t: '영화 제안이 왔습니다. 제작비는 패밀리 기업에서 나왔고, 결말은 미리 정해져 있었습니다.', k: 'note', fx: { money: medX(s, 0.5) } })),
  transition('sir_art_transition', 'SIR_ART', {
    pro: (s) => '카르네발레 무대에 올라가는 프로가 되었습니다. 출연료가 처음 생겼고, 후원자도 생겼습니다.',
    leader: (s) => '악단 리더가 되었습니다. 이름이 포스터 첫 줄에 올랐고, 그 아래 후원 패밀리 이름이 더 크게 올랐습니다.',
    master: (s) => '거장으로 불리게 되었습니다. 심사위원 자리가 왔고, 그 자리에 앉았던 앞사람의 일은 모두가 알았습니다.',
  }),
  aftermath('sir_art_after', 'SIR_ART', {
    scandal: (s) => '후원 패밀리 이야기를 무대에서 했습니다. 공연은 중단되었고, 극장은 저를 받지 않았습니다.',
    fade: (s) => '무대가 끊겼습니다. 후원자가 다른 사람을 찍었고, 광장으로 돌아갈 나이는 지나 있었습니다.',
  }),
  { id: 'sir_art_carnevale_aff', a: [12, 80], tags: ['aff:SIR_ART_CARNEVALE'], w: 25, gap: 3,
    run: (s) => ({ t: '카르네발레 조합 소속이었습니다. 불꽃놀이 상인, 불 저글러, 가면 장인. 모두 한 해를 11월 한 주를 위해 살았습니다.', k: 'ev', fx: { h: 1 } }) },
  { id: 'sir_art_family_aff', a: [12, 80], tags: ['aff:SIR_ART_FAMILY'], w: 25, gap: 3,
    run: (s) => ({ t: '연예 패밀리 소속이었습니다. 무대는 늘 있었고, 무대 뒤의 일은 묻지 않는 것이 계약이었습니다.', k: 'note', fx: { money: medX(s, 0.1), h: -1 } }) },

  // SIR_CLERGY 라테라노 교회 사제(A8) — novice / priest / parish / mediator
  ev('sir_cle_novice_latin', 'SIR_CLERGY', 'novice', [16, 30], 30, 2, (s) => ({ t: '신학 공부였습니다. 라테라노에서 온 교재와 시라쿠사에서 쓰는 설교가 달랐고, 둘 다 외워야 했습니다.', k: 'ev', fx: { cap: { learn: 0.05 } } })),
  ev('sir_cle_novice_confession', 'SIR_CLERGY', 'novice', [16, 30], 25, 3, (s) => ({ t: '고해소 청소를 했습니다. 안에서 무슨 말이 오가는지는 몰랐고, 나오는 사람들 얼굴은 알았습니다.', k: 'note' })),
  ev('sir_cle_priest_mass', 'SIR_CLERGY', 'priest', [20, 60], 30, 2, (s) => ({ t: '일요일 미사를 집전했습니다. 앞줄에 패밀리, 뒷줄에 동네. 같은 말을 했고, 두 줄이 다르게 들었습니다.', k: 'ev', fx: { standing: 2 } })),
  ev('sir_cle_priest_funeral', 'SIR_CLERGY', 'priest', [20, 60], 25, 3, (s) => ({ t: '장례 미사였습니다. 고인의 이름을 부르지 말라는 부탁이 있었습니다. 부르지 않았고, 모두가 그 이름을 알았습니다.', k: 'loss', fx: { h: -2 } })),
  ev('sir_cle_parish_envelope', 'SIR_CLERGY', 'parish', [28, 70], 30, 2, (s) => ({ t: '헌금 봉투 중 하나가 두꺼웠습니다. 성당 지붕을 고칠 돈이었고, 고치는 사람은 같은 패밀리 쪽이었습니다.', k: 'note', fx: { standing: 2 } })),
  ev('sir_cle_parish_wedding', 'SIR_CLERGY', 'parish', [28, 70], 25, 3, (s) => ({ t: '패밀리 혼례를 집전했습니다. 두 집안 사람들이 통로 양쪽에 앉았고, 통로가 평소보다 넓어 보였습니다.', k: 'ev', fx: { money: medX(s, 0.1) } })),
  ev('sir_cle_med_table', 'SIR_CLERGY', 'mediator', [35, 80], 30, 2, (s) => ({ t: '두 패밀리 사이에 앉았습니다. 사제복이 방패였습니다. 그날은 그랬습니다.', k: 'bad', fx: { h: -3, standing: 4 } })),
  ev('sir_cle_med_bishop', 'SIR_CLERGY', 'mediator', [35, 80], 25, 3, (s) => ({ t: '라테라노에서 편지가 왔습니다. "현지 사정"이라는 말이 두 번 나왔고, 돌아오라는 말은 없었습니다.', k: 'note' })),
  transition('sir_clergy_transition', 'SIR_CLERGY', {
    priest: (s) => '사제 서품을 받았습니다. 첫 미사 앞줄에 패밀리 사람들이 앉아 있었고, 그들이 먼저 축하했습니다.',
    parish: (s) => '교구 신부가 되었습니다. 성당 열쇠와 함께 어느 패밀리 구역인지 적힌 쪽지를 받았습니다.',
    mediator: (s) => '패밀리 사이 중재자로 불리게 되었습니다. 어느 돈도 그 말을 공식으로 쓰지 않았고, 모두가 그 말을 썼습니다.',
  }),
  aftermath('sir_clergy_after', 'SIR_CLERGY', {
    vendetta: (s) => '중재 자리에서 일이 났습니다. 살아남았고, 성당은 문을 닫았습니다.',
    heresy: (s) => '라테라노에서 조사가 왔습니다. 패밀리와 너무 가까웠다고 했습니다. 사제복을 벗었습니다.',
    demotion: (s) => '좌천되었습니다. 산골 성당이었고, 그곳에도 봉투 걷는 사람은 왔습니다.',
  }),
  { id: 'sir_cle_confessor_aff', a: [20, 80], tags: ['aff:SIR_CLE_CONFESSOR'], w: 25, gap: 3,
    run: (s) => ({ t: '패밀리 고해 전담이었습니다. 들은 것은 무덤까지였고, 무덤이 가까워진다는 생각을 가끔 했습니다.', k: 'bad', fx: { h: -2, money: medX(s, 0.1) } }) },

  // SIR_WILD 황야 늑대(A7) — cub / fang / civilized
  ev('sir_wild_cub_hunt', 'SIR_WILD', 'cub', [8, 20], 30, 2, (s) => ({ t: '무리와 함께 달렸습니다. 뒤처지면 아무도 기다리지 않았고, 따라잡으면 아무도 칭찬하지 않았습니다.', k: 'ev', fx: { cap: { skill: 0.05 }, hl: 1 } })),
  ev('sir_wild_cub_winter', 'SIR_WILD', 'cub', [8, 20], 25, 2, (s) => ({ t: '겨울이었습니다. 무리가 몸을 붙여 잤고, 아침에 하나가 일어나지 않았습니다.', k: 'loss', fx: { h: -2 } })),
  ev('sir_wild_fang_first', 'SIR_WILD', 'fang', [13, 40], 30, 2, (s) => ({ t: '송곳니로 불리게 된 뒤 첫 사냥을 이끌었습니다. 무리가 따라왔고, 따라오는 것이 무거웠습니다.', k: 'ev', fx: { standing: 3 } })),
  ev('sir_wild_fang_city_lights', 'SIR_WILD', 'fang', [13, 40], 25, 3, (s) => ({ t: '언덕에서 도시 불빛을 보았습니다. 군주는 저쪽 이야기를 하지 않았고, 저는 묻지 않았습니다.', k: 'note', fx: { h: -1 } })),
  ev('sir_wild_civ_shoes', 'SIR_WILD', 'civilized', [14, 60], 30, 2, (s) => ({ t: '신발을 신었습니다. 한 달이 걸렸고, 두 달째에는 벗으면 발이 시렸습니다.', k: 'ev', fx: { cap: { ties: 0.03 } } })),
  ev('sir_wild_civ_name', 'SIR_WILD', 'civilized', [14, 60], 25, 3, (s) => ({ t: '서류에 이름을 적어야 했습니다. 무리에서는 이름이 없었습니다. 하나를 골랐고, 그 이름에 익숙해지는 데 한 해가 걸렸습니다.', k: 'note' })),
  transition('sir_wild_transition', 'SIR_WILD', {
    fang: (s) => '송곳니가 되었습니다. 군주가 한 번 보았고, 무리가 길을 비켰습니다.',
    civilized: (s) => '무리를 떠나 도시로 보내졌습니다. 군주의 뜻이었고, 돌아올 수 있는지는 말하지 않았습니다.',
  }),
  aftermath('sir_wild_after', 'SIR_WILD', {
    exile: (s) => '무리에서 쫓겨났습니다. 외로운 늑대라고 했습니다. 황야에는 혼자 사는 법이 없어서, 도시로 걸었습니다.',
    kia: (s) => '다른 무리와 싸웠습니다. 살아남았고, 무리는 저를 두고 갔습니다.',
  }),
  { id: 'sir_wild_agnese_aff', a: [8, 50], tags: ['aff:SIR_WILD_AGNESE'], w: 25, gap: 3,
    run: (s) => ({ t: '늑대 군주의 무리였습니다. 군주는 말이 없었고, 군주가 보는 쪽으로 모두가 움직였습니다.', k: 'note', fx: { standing: 1 } }) },
  { id: 'sir_wild_lone_aff', a: [8, 50], tags: ['aff:SIR_WILD_LONE'], w: 25, gap: 3,
    run: (s) => ({ t: '무리가 작았습니다. 큰 무리가 지나가면 숨었고, 큰 무리가 남긴 것을 먹었습니다.', k: 'bad', fx: { hl: -1 } }) },

  // ══════════════════════════════════════════════════════════════════════════
  // 이주 신참·비루포 관계·뉴 볼시니 연동(대사건과 중복 없이 뒷이야기만)
  // ══════════════════════════════════════════════════════════════════════════
  { id: 'sir_newcomer_district', a: [10, 80], tags: ['siracusa', 'newcomer'], w: 40, gap: 2,
    run: (s) => ({ t: pick(s, ['이사 온 첫 해였습니다. 집주인이 어느 패밀리 구역인지 먼저 말해 주었고, 그 말이 집 설명의 전부였습니다.', '동네 가게에서 값을 두 번 물었습니다. 두 번째 대답은 "가족은 안녕하신가"였고, 그것이 값이었습니다.', '첫 달에 양복 입은 사람이 인사를 왔습니다. 봉투 이야기는 하지 않았습니다. 둘째 달에 했습니다.']), k: 'note', fx: { h: -1, money: -medX(s, 0.02) } }) },
  { id: 'sir_newcomer_tail', a: [10, 80], tags: ['siracusa', 'newcomer', 'lupo'], w: 30, gap: 3,
    run: (s) => ({ t: '꼬리 끝에 색이 없다는 것을 모두가 보았습니다. 어느 패밀리도 아니라는 뜻이었고, 어느 패밀리도 막아 주지 않는다는 뜻이었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'sir_rel_subtle_table', a: [10, 85], tags: ['siracusa', 'rel:subtle'], w: 25, gap: 3,
    run: (s) => ({ t: '식당에서 자리를 받았습니다. 창가 자리는 꼬리 있는 손님 차례였고, 저희는 안쪽이었습니다. 음식은 같았습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'sir_rel_subtle_greeting', a: [10, 85], tags: ['siracusa', 'rel:subtle'], w: 25, gap: 3,
    run: (s) => ({ t: '"가족은 안녕하신가"라는 인사를 받았습니다. 대답은 외웠습니다. 그 뒤에 오는 침묵이 한 박자 길다는 것도 외웠습니다.', k: 'note' }) },
  { id: 'sir_rel_subtle_hire', a: [15, 57], tags: ['siracusa', 'rel:subtle'], w: 20, gap: 4,
    run: (s) => ({ t: '일자리 면접이었습니다. 질문은 셋, 첫 질문이 어느 패밀리 구역에 사느냐였습니다. 종족은 묻지 않았고, 묻지 않아도 보였습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'sir_newvolsinii_move', a: [16, 60], tags: ['siracusa'], w: 12, gap: 6, c: (s) => s.year >= 1100 && s.S.urban && !tr(s) && (s.S.flags.joblessYears || 0) >= 1,
    run: (s) => ({ t: '뉴 볼시니로 옮길까 생각했습니다. 패밀리가 없는 도시라고 했습니다. 패밀리가 없으면 누가 지켜 주느냐는 말도 있었습니다.', k: 'note' }) },
];

// ────────────────────────────────────────────────────────────────────────────
// 결정
// ────────────────────────────────────────────────────────────────────────────
export const decisions = {
  // ── 패밀리(A1): 배신·합법화 출구·벤데타 선언·입단 제안 ──
  sir_fam_betray: {
    tags: ['track:SIR_FAMIGLIA:soldato'], once: false, gap: 5,
    ok: (s) => onT(s, 'SIR_FAMIGLIA') && s.S.age >= 18 && yr(s, 'sirbetray', 0.15),
    build: (s) => ({ title: '제안', body: '다른 패밀리 사람이 찾아왔습니다. 돈의 일정을 알려 주면 두 배를 주겠다고 했습니다. 거절하면 그 사람은 내일 없을 것이고, 받으면 모레 제가 없을 수도 있습니다.',
      choices: [{ k: 'no', label: '거절한다', auto: 3 }, { k: 'yes', label: '받는다', sub: '배신', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'no') { s.S.track.standing = Math.min(100, s.S.track.standing + 5); return { t: '거절했습니다. 다음 날 그 사람은 보이지 않았고, 아무도 그 사람 이야기를 하지 않았습니다.', k: 'note' }; }
      if (s.rng.chance(0.5)) { s.fall('betrayal'); return false; }
      return { t: '돈을 받았습니다. 아직 아무도 모릅니다. 밤에 문 쪽을 보는 버릇이 생겼습니다.', k: 'bad', fx: { money: Math.round(s.S.income * 2), h: -3 } };
    },
  },
  sir_fam_legal_exit: {
    tags: ['track:SIR_FAMIGLIA'], once: false, gap: 6,
    ok: (s) => onT(s, 'SIR_FAMIGLIA') && tr(s).stage >= 2 && tr(s).standing >= 80 && yr(s, 'sirlegal', 0.3),
    build: (s) => ({ title: '합법 사업', body: '돈이 패밀리 기업 하나를 맡겨 보겠다고 했습니다. 와인이거나 자동차이거나 은행. 솔다토들과는 멀어지고, 장부와는 가까워집니다.',
      choices: [{ k: 'go', label: '맡는다', sub: '회사원으로', auto: 1.5 }, { k: 'stay', label: '지금 자리에 남는다', auto: 1 }] }),
    apply: (s, k) => { if (k !== 'go') return '지금 자리에 남았습니다. 돈은 고개만 끄덕였습니다.'; s.S.flags.switchOpen = true; return { t: '맡아 보겠다고 했습니다. 다른 길이 하나 열렸습니다.', k: 'ev' }; },
  },
  sir_fam_vendetta_declare: {
    tags: ['track:SIR_FAMIGLIA'], once: false, gap: 8,
    ok: (s) => onT(s, 'SIR_FAMIGLIA') && tr(s).stage >= 3 && yr(s, 'sirvend', 0.12),
    build: (s) => ({ title: '벤데타', body: '옆 패밀리가 저희 사람 하나를 건드렸습니다. 돈이 저를 보았습니다. 선언하면 양쪽 모두가 명단에 오릅니다. 참으면 아래가 흔들립니다.',
      choices: [{ k: 'declare', label: '선언한다', sub: '위험 큼, 결과만 남는다', auto: 1 }, { k: 'talk', label: '중재자를 부른다', sub: '신뢰 하락', auto: 1.5 }] }),
    apply: (s, k) => {
      if (k === 'talk') { s.S.track.standing = Math.max(0, s.S.track.standing - 10); return { t: '신부님을 불렀습니다. 두 패밀리가 한 식탁에 앉았고, 식탁은 비싼 값을 치렀습니다.', k: 'note', fx: { money: -medX(s, 1) } }; }
      const r = s.rng.rnd();
      if (r < 0.3) { s.fall('vendetta'); return false; }
      if (r < 0.6) return { t: '벤데타가 시작되었습니다. 겨울이 끝날 때 옆 패밀리 이름은 없었고, 저희 쪽 자리 몇 개도 비었습니다.', k: 'bad', fx: { h: -5, standing: 15, money: medX(s, 2) } };
      return { t: '벤데타가 시작되었습니다. 끝났을 때 양쪽 다 남았고, 경계선만 조금 움직였습니다.', k: 'bad', fx: { h: -3, standing: 5 } };
    },
  },
  // ── 패밀리 기업(A10 변주): 상사=카포 — 장부 ──
  sir_fambiz_ledger: {
    tags: ['track:SIR_FAMBIZ'], once: false, gap: 5,
    ok: (s) => onT(s, 'SIR_FAMBIZ') && tr(s).stage >= 1 && yr(s, 'sirledger', 0.2),
    build: (s) => ({ title: '장부', body: '부장이 서류 한 장을 내밀었습니다. 숫자가 맞지 않는 장부에 제 서명이 필요하다고 했습니다. 부장은 패밀리의 카포입니다.',
      choices: [{ k: 'sign', label: '서명한다', sub: '가족이 된다', auto: 2 }, { k: 'refuse', label: '서명하지 않는다', sub: '평가·자리 위험', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'sign') { s.S.flags.sirLedger = (s.S.flags.sirLedger || 0) + 1; return { t: '서명했습니다. 부장이 처음으로 제 이름을 불렀습니다. 그날 밤 서명한 숫자를 다시 세어 보았습니다.', k: 'bad', fx: { h: -3, standing: 8, money: medX(s, 0.2) } }; }
      if (s.rng.chance(0.3)) { s.fall('layoff'); return false; }
      return { t: '서명하지 않았습니다. 다른 사람이 했고, 제 연말 평가가 두 칸 내려갔습니다.', k: 'note', fx: { standing: -12, h: 1 } };
    },
  },
  // ── 트럭(A11): 야간 부업 ──
  sir_truck_night_job: {
    tags: ['track:SIR_TRUCK'], once: false, gap: 4,
    ok: (s) => onT(s, 'SIR_TRUCK') && tr(s).stage >= 1 && tr(s).aff !== 'SIR_TRU_NIGHT' && yr(s, 'sirnight', 0.2),
    build: (s) => ({ title: '야간 운행', body: '양복 입은 사람이 야간 운행을 제안했습니다. 운임은 세 배, 짐칸은 열어 보지 않는 조건. 상조회는 야간 운행을 하지 않기로 했습니다.',
      choices: [{ k: 'take', label: '한다', sub: '돈, 연좌 위험', auto: 1 }, { k: 'no', label: '하지 않는다', auto: 1.5 }] }),
    apply: (s, k) => {
      if (k !== 'take') return { t: '하지 않았습니다. 명함은 서랍에 두었습니다.', k: 'note' };
      s.S.track.aff = 'SIR_TRU_NIGHT';
      if (s.rng.chance(0.15)) { s.fall('vendetta'); return false; }
      return { t: '야간 운행을 시작했습니다. 운임은 세 배였고, 상조회 모임에는 가지 않게 되었습니다.', k: 'bad', fx: { money: medX(s, 0.6), h: -2 } };
    },
  },
  // ── 법조(A3): 후원 수락·판결 ──
  sir_legal_patron: {
    tags: ['track:SIR_LEGAL:school'], once: true,
    ok: (s) => onT(s, 'SIR_LEGAL') && yr(s, 'sirpatron', 0.6),
    build: (s) => ({ title: '후원', body: (s.aff ? s.aff.name : '패밀리') + ' 쪽에서 학비를 전부 대겠다고 했습니다. 조건은 적혀 있지 않았고, 모두가 조건을 알았습니다.',
      choices: [{ k: 'accept', label: '받는다', sub: '뒷배가 생긴다', auto: 2.5 }, { k: 'refuse', label: '거절한다', sub: '그레이홀 연합 법원으로, 막아 줄 사람 없음', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'accept') { s.S.money += Math.round(s.med * 1.5); s.S.track.standing = Math.min(100, s.S.track.standing + 10); return { t: '받았습니다. 학비 걱정은 끝났고, 다른 걱정이 시작되었습니다.', k: 'ev' }; }
      s.S.track.aff = 'SIR_LEG_GRAYHALL'; s.S.track.standing = Math.max(0, s.S.track.standing - 5);
      return { t: '거절했습니다. 그레이홀 연합 법원 쪽으로 길을 잡았습니다. 교수 하나가 "오래 못 간다"고 했습니다.', k: 'note', fx: { h: 1 } };
    },
  },
  sir_legal_verdict: {
    tags: ['track:SIR_LEGAL'], once: false, gap: 5,
    ok: (s) => onT(s, 'SIR_LEGAL') && tr(s).stage >= 1 && tr(s).stage <= 2 && yr(s, 'sirverdict', 0.18),
    build: (s) => ({ title: '전화', body: '판결 전날 전화가 왔습니다. 후원 패밀리 쪽이었습니다. 어느 쪽으로 가야 하는지 말하지 않았고, 말하지 않아도 알았습니다.',
      choices: [{ k: 'follow', label: '뜻대로 한다', auto: 2 }, { k: 'law', label: '법대로 한다', sub: '위험', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'follow') return { t: '뜻대로 했습니다. 판결문은 길었고, 결론은 한 줄이었습니다.', k: 'bad', fx: { h: -3, standing: 6 } };
      if (s.rng.chance(0.25)) { s.fall('betrayal'); return false; }
      return { t: '법대로 했습니다. 아무 일도 없었습니다. 한 달 동안 아무 일도 없다는 것이 가장 무거웠습니다.', k: 'note', fx: { h: 1, standing: -5 } };
    },
  },
  // ── 생업(A11): 보호비·위장 고용 ──
  sir_living_protection: {
    tags: ['track:SIR_LIVING'], once: false, gap: 3,
    ok: (s) => onT(s, 'SIR_LIVING') && tr(s).stage >= 2 && yr(s, 'sirprot', 0.25),
    build: (s) => { const inf = s.S.ori.on && s.S.ori.known && !s.S.urban; return { title: inf ? '감염자 의료보험' : '보호 분담금', body: inf ? '양복 입은 사람이 "감염자 의료보험"이라고 했습니다. 보험 증서는 없었고, 금액은 있었습니다. ' + fmt(s.med * 0.4) + '.' : '이달 봉투 금액이 올랐습니다. ' + fmt(s.med * 0.15) + '. 올린 이유는 "구역 사정"이었습니다.',
      choices: [{ k: 'pay', label: '낸다', auto: 3 }, { k: 'refuse', label: '내지 않는다', sub: '가게 위험', auto: 0.7 }] }; },
    apply: (s, k) => {
      const inf = s.S.ori.on && s.S.ori.known && !s.S.urban;
      if (k === 'pay') { s.S.money -= Math.round(s.med * (inf ? 0.4 : 0.15)); return { t: '냈습니다. 영수증은 없었습니다.', k: 'bad', fx: { h: -1 } }; }
      if (s.rng.chance(0.35)) { s.fall('ruin'); return false; }
      return { t: '내지 않았습니다. 다음 주 가게 유리가 깨졌고, 그 다음 주에는 금액이 처음으로 돌아갔습니다.', k: 'bad', fx: { money: -medX(s, 0.1), h: -2 } };
    },
  },
  sir_living_front_job: {
    tags: ['track:SIR_LIVING'], once: true,
    ok: (s) => onT(s, 'SIR_LIVING') && s.S.age >= 16 && s.S.age <= 30 && tr(s).stage <= 1 && s.S.cap.ties >= -0.5 && yr(s, 'sirfront', 0.2),
    build: (s) => ({ title: '세차장 자리', body: '패밀리 쪽 사람이 세차장 자리를 제안했습니다. 세차는 하지 않아도 된다고 했습니다. 월급은 지금의 세 배입니다.',
      choices: [{ k: 'go', label: '간다', sub: '패밀리 조직원', auto: 1 }, { k: 'no', label: '가게에 남는다', auto: 1.5 }] }),
    apply: (s, k) => { if (k !== 'go') return '가게에 남았습니다. 주인이 그날 저녁을 샀습니다.'; return s.enterTrack('SIR_FAMIGLIA', { via: 'front_job', how: 'switch', quiet: true }) ? { t: '세차장 직원이 되었습니다. 서류상으로는. 첫 달 월급은 세 배였고, 세차는 한 번도 하지 않았습니다.', k: 'ev' } : '자리는 열리지 않았습니다.'; },
  },
  // ── 거리 갱(A1): 흡수 ──
  sir_gang_absorb: {
    tags: ['track:SIR_GANG:leader'], once: true,
    ok: (s) => onT(s, 'SIR_GANG') && s.S.age >= 15 && yr(s, 'sirabsorb', 0.4),
    build: (s) => ({ title: '제안', body: '패밀리 솔다토가 다시 왔습니다. 골목을 패밀리 밑으로 넣으면 아이들은 먹고, 저는 솔다토가 됩니다. 거절하면 골목은 그대로이고, 언제까지인지는 모릅니다.',
      choices: [{ k: 'join', label: '패밀리 밑으로 간다', auto: 2 }, { k: 'no', label: '독립을 지킨다', auto: 1 }] }),
    apply: (s, k) => { if (k === 'join') return s.enterTrack('SIR_FAMIGLIA', { via: 'adopted', how: 'switch', stage: 1, quiet: true }) ? { t: '패밀리 밑으로 들어갔습니다. 솔다토가 되었고, 아이들은 심부름꾼이 되었습니다.', k: 'ev' } : '자리는 열리지 않았습니다.'; s.promote({ force: true, quiet: true }); return { t: '거절했습니다. 골목은 저희 것으로 남았고, 밤에 자는 시간이 짧아졌습니다.', k: 'note', fx: { h: -1 } }; },
  },
  // ── 경찰(A4, 1100~): 매수 ──
  sir_police_bribe: {
    tags: ['track:SIR_POLICE'], once: false, gap: 4,
    ok: (s) => onT(s, 'SIR_POLICE') && tr(s).stage >= 1 && yr(s, 'sirbribe', 0.2),
    build: (s) => ({ title: '봉투', body: '차 유리에 봉투가 끼어 있었습니다. 이번에는 이름이 적혀 있었습니다. 제 이름이었습니다. 금액은 ' + fmt(s.med * 0.5) + '.',
      choices: [{ k: 'take', label: '받는다', auto: 1 }, { k: 'report', label: '반장에게 올린다', auto: 1.5 }, { k: 'return', label: '돌려준다', sub: '어디로 돌려줄지는 안다', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'take') { s.S.flags.sirBribed = (s.S.flags.sirBribed || 0) + 1; if (s.rng.chance(0.15 * s.S.flags.sirBribed)) { s.fall('betrayal'); return false; } return { t: '받았습니다. 다음 달에도 왔습니다.', k: 'bad', fx: { money: medX(s, 0.5), h: -2 } }; }
      if (k === 'report') return { t: '반장에게 올렸습니다. 반장은 서랍에 넣었고, 제 근무표가 야간으로 바뀌었습니다.', k: 'note', fx: { standing: 3, h: -1 } };
      return { t: '돌려주었습니다. 받은 사람은 웃었고, 그 뒤로 봉투는 오지 않았습니다. 다른 것이 올까 걱정했습니다.', k: 'note', fx: { h: 1 } };
    },
  },
  // ── 황야(A7): 문명 투입 ──
  sir_wild_civilize: {
    tags: ['track:SIR_WILD:fang'], once: true,
    ok: (s) => onT(s, 'SIR_WILD') && s.S.age >= 14 && yr(s, 'sircivil', 0.3),
    build: (s) => ({ title: '군주의 뜻', body: '군주가 저를 도시로 보내겠다고 했습니다. 무리의 눈이 되라고 했습니다. 황야로 돌아올 수 있는지는 말하지 않았습니다.',
      choices: [{ k: 'go', label: '도시로 간다', auto: 2 }, { k: 'stay', label: '황야에 남는다', auto: 1 }] }),
    apply: (s, k) => { if (k !== 'go') return '황야에 남았습니다. 군주는 다시 묻지 않았습니다.'; s.promote({ force: true, quiet: true }); s.S.urban = true; return { t: '도시로 보내졌습니다. 첫날 신발을 받았고, 둘째 날 서류에 이름을 적어야 했습니다.', k: 'ev', fx: { h: -2 } }; },
  },
  // ── 뉴 볼시니 이주(1100~): 패밀리 그늘 벗어나기 ──
  sir_newvolsinii_leave: {
    tags: ['siracusa'], once: true,
    ok: (s) => s.year >= 1100 && s.S.age >= 18 && s.S.age <= 50 && !!tr(s) && ['SIR_LIVING', 'SIR_TRUCK', 'SIR_GANG'].includes(tr(s).id) && tr(s).standing < 40 && yr(s, 'sirnv', 0.2),
    build: (s) => ({ title: '뉴 볼시니', body: '패밀리가 없는 도시가 생겼다고 했습니다. 시청이 사람을 뽑고, 경찰이 있고, 봉투 걷는 사람이 없다고 했습니다. 가게와 구역을 두고 가야 합니다.',
      choices: [{ k: 'go', label: '간다', sub: '진로를 다시 시작', auto: 1 }, { k: 'stay', label: '남는다', auto: 1.5 }] }),
    apply: (s, k) => { if (k !== 'go') return '남았습니다. 봉투는 다음 달에도 왔습니다.'; s.leaveTrack('switch', { quiet: true }); s.S.urban = true; s.S.flags.joblessYears = 0; return { t: '뉴 볼시니로 옮겼습니다. 첫 달에 아무도 인사를 오지 않았고, 그것이 낯설었습니다.', k: 'ev', fx: { h: 2, money: -medX(s, 0.3) } }; },
  },

  // ── 혼인·주거 덮어쓰기(엔진 id 와 같게. columbia.js 와 같은 결정 객체 — 어느 파일이 뒤에 등록돼도 두 나라 문구가 산다) ──
  marry_family_approved: marryDecision('family_approved'),
  marry_church: marryDecision('church'),
  marry_civil: marryDecision('civil'),
  marry_pack: marryDecision('pack'),
  home_change: homeChangeDecision,
};

// W11: 엔진 id 와 같은 결정은 국가 디스패처로 옮긴다(여러 파일이 같은 id 를 등록해도 거주국별로 분기)
hoist(decisions, { marry_family_approved: ['siracusa'], marry_church: ['siracusa'], marry_civil: ['siracusa'], marry_pack: ['siracusa'], home_change: ['siracusa'] });

export default { events, decisions };

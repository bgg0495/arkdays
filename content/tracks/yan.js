// W9a 염국(yan) 진로 콘텐츠. data/tracks/yan.json 의 14 진로 전부를 덮는다.
// 핵심 5: YAN_FARM·YAN_BUREAU·YAN_ARMY·YAN_OFFICE·YAN_TIANSHI(단계마다 4 + 전환 + 몰락 후일담 + 결정).
// 나머지 9: YAN_RIVER·YAN_MINER·YAN_OUTLAW·YAN_WUXIA·YAN_MESSENGER·YAN_RESCUE·YAN_STUDENT·YAN_SUI·YAN_SHANHAI(단계마다 2 + 전환 + 후일담).
// 그 밖에 생업 계절·동네 이벤트, 소속(aff:) 변주, 캐논 인물 1회성(D43), 신참·관계 등급·방문 이벤트, 혼인·주거·진로 선택 결정 덮어쓰기.
// 담백한 "~했습니다"체. 각주 f 는 본문에 숫자가 있을 때만, 세계관 안의 출처(흠천감 등)로. 조사는 text.js 유틸. 콜백 첫 인자는 ctx(=sim).
// 용문(lungmen)은 염국의 하위 지역이라 'yan' 태그가 같이 붙는다. 염국 본토 전용은 '!lungmen' 을 함께 건다.
import { ENGINE_DECISIONS } from '../../src/engine/choices.js';
import { eul, iga, eun, wa, ro, ieot, rago } from '../../src/engine/text.js';
import { cul, org, fest, F, orgF, given, poor, rich, medX, lifeRoll, once } from '../_util.js';
import { hoist } from '../_dispatch.js';

// ── 도우미 ──────────────────────────────────────────────────────────────
const tk = (id, st) => 'track:' + id + ':' + st;
const YAN = ['yan', '!lungmen'];
const pick = (s, list) => s.rng.pick(list);
const yr = (s, a, b) => s.year >= a && s.year <= (b ?? a);
const affName = (s) => (s.aff ? s.aff.name : s.track ? s.track.name : '일터');
const partner = (s) => (s.S.fam.partner && s.S.fam.partner.alive ? s.S.fam.partner : null);
const kids = (s) => s.S.fam.kids.filter((k) => k.alive);
const known = (s) => s.S.ori.on && s.S.ori.known;
/** 승급 다음 해(승급은 연말에 일어나므로 planYear 기준 stageSince + 1) */
const promoted = (s, id) => { const h = s.S.trackHist[s.S.trackHist.length - 1]; return !!s.S.track && s.S.track.id === id && s.S.track.stage > 0 && !!h && h.how === 'promo' && h.id === id && h.to === s.S.age - 1; };
/** 진입 다음 해(진입은 planYear 의 결정이라 그 해 피드엔 못 들어간다) */
const firstYear = (s, id) => !!s.S.track && s.S.track.id === id && s.S.age - s.S.track.since === 1;
/** 몰락 다음 해. 엔진 fall 로그(S.flags.lastFall) 를 후일담으로 덮는다 */
const fell = (s, id) => s.S.flags.lastFallAt != null && s.S.age - s.S.flags.lastFallAt === 1 && (s.S.flags.lastTrack === id || (!!s.S.track && s.S.track.id === id && s.S.flags.lastFallOutcome === 'demote'));
const fallText = (s, map) => { const c = s.S.flags.lastFall; const t = map[c] || map._; return typeof t === 'function' ? t(s) : t; };
const canonOk = (s, y0, y1) => yr(s, y0, y1) && (s.S.flags.canonSeen || 0) < 3;
const seeCanon = (s) => { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; };
const stdMul = (s) => 0.5 + (s.S.track ? s.S.track.standing : 50) / 100;
const E = (id, tags, a, w, gap, run, extra = {}) => ({ id, tags: Array.isArray(tags) ? tags : [tags], a, w, gap, run, ...extra });
/** 전환 서사: 진로 하나에 단계별 문장 지도. 승급 다음 해에만 */
const TRANS = (id, map) => E(id.toLowerCase() + '_promo', ['track:' + id], [10, 90], 120, 1, (s) => { const t = map[s.stage.id]; return typeof t === 'function' ? t(s) : { t, k: 'ev', fx: { h: 1 } }; }, { c: (s) => promoted(s, id) && !!map[s.stage.id] });
/** 몰락 후일담: 몰락 다음 해, 원인별 한 문장 */
const AFTER = (id, map) => E(id.toLowerCase() + '_after', ['yan'], [10, 95], 150, 2, (s) => ({ t: fallText(s, map), k: 'loss' }), { c: (s) => fell(s, id) });

export const events = [
  // ════════════════════════════════════════════════════════════════════════
  // YAN_FARM 농민 (핵심, A11) — family → tenant → own → chief
  // ════════════════════════════════════════════════════════════════════════
  E('yan_farm_first', ['track:YAN_FARM'], [12, 45], 90, 4, (s) => {
    const v = s.S.track.flags.via;
    const t = v === 'tenant' ? '남의 밭을 빌려 첫 해를 지었습니다. 가을에 가마니 절반이 지주 집으로 갔습니다.'
      : v === 'village' ? '마을에서 밭 한 뙈기를 내주었습니다. 묵은 밭이라 돌부터 골랐습니다.'
      : '집안 밭에 나가기 시작했습니다. 아무도 일을 가르쳐 주지 않았고, 보고 따라 했습니다.';
    return { t, k: 'ev', fx: { cap: { skill: 0.03 } } };
  }, { c: (s) => firstYear(s, 'YAN_FARM') }),
  // family
  E('yan_farm_fam_dawn', [tk('YAN_FARM', 'family')], [12, 45], 35, 2, (s) => ({ t: '농력 첫 달, 해 뜨기 전에 밭에 나갔습니다. 앞서 걷는 어른의 발자국을 밟고 걸었습니다.', k: 'ev', fx: { hl: -1, cap: { skill: 0.02 } } })),
  E('yan_farm_fam_hands', [tk('YAN_FARM', 'family')], [12, 45], 35, 3, (s) => ({ t: s.aff && s.aff.id === 'YAN_FARM_TEA' ? '찻잎 따는 철이었습니다. 손끝이 검게 물들었고, 겨울이 되어서야 빠졌습니다.' : '모내기 철이었습니다. 허리를 펴는 횟수로 하루를 셌습니다.', k: 'ev', fx: { hl: -1 } })),
  E('yan_farm_fam_clerk', [tk('YAN_FARM', 'family')], [12, 45], 30, 3, (s) => { const n = s.rng.ri(3, 12); return { t: '현의 서리가 장부를 들고 왔습니다. 집에 남은 곡식을 되로 쟀고, 장부에는 ' + n + '되라고 적혔습니다. 되가 작아 보였습니다.', k: 'bad', fx: { h: -2, money: -medX(s, 0.03) }, f: orgF(s, '현청 조세 장부', s.year) }; }),
  E('yan_farm_fam_school', [tk('YAN_FARM', 'family')], [12, 20], 30, 3, (s) => ({ t: '마을 서당이 농번기에는 문을 닫았습니다. 글보다 밭이 먼저였습니다.', k: 'note', fx: { cap: { learn: -0.02 } } })),
  // tenant
  E('yan_farm_ten_rent', [tk('YAN_FARM', 'tenant')], [14, 60], 35, 2, (s) => { const n = s.rng.ri(8, 30); return { t: '가을걷이가 끝나고 지주 집에 소작료 ' + n + '가마니를 냈습니다. 가마니 수를 두 번 셌고, 두 번째가 더 적었습니다.', k: 'ev', fx: { money: -medX(s, 0.05) }, f: F('지주 소작 장부, ' + s.year + '년') }; }),
  E('yan_farm_ten_chidao', [tk('YAN_FARM', 'tenant')], [14, 60], 30, 4, (s) => ({ t: '치다오 공사가 마을 앞을 지나갔습니다. 공사장 일당이 소작보다 나아 겨울 두 달을 돌을 날랐습니다.', k: 'ev', fx: { money: medX(s, 0.12), hl: -2 } })),
  E('yan_farm_ten_runaway', [tk('YAN_FARM', 'tenant')], [14, 60], 30, 4, (s) => ({ t: '이웃 소작농이 밤에 사라졌습니다. 그 밭이 제게 왔고, 밀린 소작료도 같이 왔습니다.', k: 'note', fx: { standing: 2, money: -medX(s, 0.04) } })),
  E('yan_farm_ten_water', [tk('YAN_FARM', 'tenant')], [14, 60], 30, 3, (s) => ({ t: '봄 가뭄에 물길 순서를 두고 윗마을과 다퉜습니다. 촌장이 중재했고, 아랫마을이 졌습니다.', k: 'bad', fx: { h: -2 } })),
  // own
  E('yan_farm_own_deed', [tk('YAN_FARM', 'own')], [18, 65], 35, 4, (s) => ({ t: '제 이름이 적힌 밭문서를 받았습니다. 흙은 어제와 같았습니다.', k: 'warm', fx: { h: 3 } })),
  E('yan_farm_own_recruiter', [tk('YAN_FARM', 'own')], [18, 65], 35, 4, (s) => { const n = s.rng.ri(4, 11); return { t: '이동도시 공장 모집인이 마을에 왔습니다. 젊은이 ' + n + '명이 계약서에 서명했고, 그 뒤로 마을이 조용해졌습니다.', k: 'note', fx: { h: -1 }, f: orgF(s, '농촌 노동 이동 집계', s.year) }; }),
  E('yan_farm_own_haggle', [tk('YAN_FARM', 'own')], [18, 65], 35, 2, (s) => { const good = s.rng.chance(0.5); return { t: (s.aff && s.aff.id === 'YAN_FARM_TEA' ? '첫물 차를 ' : '햇곡을 ') + '객잔 상인에게 넘겼습니다. ' + (good ? '값을 한 번 더 불렀고, 상인이 받아들였습니다.' : '값을 한 번 더 불렀고, 상인이 수레를 돌렸습니다.'), k: good ? 'warm' : 'bad', fx: good ? { money: medX(s, 0.1) } : { money: -medX(s, 0.05), h: -1 } }; }),
  E('yan_farm_own_child_city', [tk('YAN_FARM', 'own')], [30, 65], 30, 5, (s) => ({ t: '아이 하나가 이동도시로 가겠다고 했습니다. 말리지 않았고, 떠나는 날 아침 국수를 끓였습니다.', k: 'note', fx: { h: -2 } }), { c: (s) => kids(s).some((k) => s.S.age - k.bornAt >= 15) }),
  // chief
  E('yan_farm_chief_corvee', [tk('YAN_FARM', 'chief')], [30, 80], 35, 2, (s) => { const n = s.rng.ri(4, 15); return { t: '현청에서 부역 ' + n + '명 할당이 내려왔습니다. 누구를 보낼지 이름을 고르는 일이 제 일이 되었습니다.', k: 'ev', fx: { standing: 2, h: -1 }, f: orgF(s, '부역 할당 공문', s.year) }; }),
  E('yan_farm_chief_relocate', [tk('YAN_FARM', 'chief')], [30, 80], 30, 6, (s) => ({ t: '마을을 옮기라는 공문이 왔습니다. 치다오가 지나갈 자리였습니다. 공문에는 보상 액수가 없었습니다.', k: 'bad', fx: { h: -3, standing: -3 } })),
  E('yan_farm_chief_feast', [tk('YAN_FARM', 'chief')], [30, 80], 35, 3, (s) => ({ t: fest(s, 0) + ' 제사 상차림을 제가 정했습니다. ' + cul(s).food + ' 양을 두고 집집이 말이 달랐습니다.', k: 'warm', fx: { h: 2 } })),
  E('yan_farm_chief_inspector', [tk('YAN_FARM', 'chief')], [30, 80], 30, 4, (s) => ({ t: '지방관이 순시를 왔습니다. 마을 입구를 쓸고 ' + eul(cul(s).drink) + ' 냈습니다. 관리는 장부만 보고 돌아갔습니다.', k: 'note', fx: { standing: 1 } })),
  TRANS('YAN_FARM', {
    tenant: '밭을 빌렸습니다. 처음으로 제 이름으로 농사를 짓게 되었고, 처음으로 제 이름으로 빚이 생겼습니다.',
    own: '밭이 제 것이 되었습니다. 지주 집 문턱을 넘지 않아도 되는 가을이 왔습니다.',
    chief: '마을 사람들이 촌장으로 세웠습니다. 현청 서리가 이름을 받아 적었습니다.',
  }),
  AFTER('YAN_FARM', {
    ruin: '밭을 잃고 한 해가 지났습니다. 품을 팔러 남의 밭에 서면 흙냄새는 같았습니다.',
    catastrophe: '재앙이 지나간 자리에서 한 해를 보냈습니다. 밭은 돌밭이 되었고, 마을 절반은 돌아오지 않았습니다.',
    starvation: '흉년을 넘겼습니다. 봄에 풀을 캐 먹던 날을 아무도 입에 올리지 않았습니다.',
    _: '농사를 그만두고 한 해가 지났습니다. 손은 아직 밭을 기억했습니다.',
  }),
  // 소속 변주
  E('yan_aff_farm_tea', ['aff:YAN_FARM_TEA'], [12, 70], 25, 4, (s) => { const amt = medX(s, 0.08); return { t: '강남 차 상인이 올해 찻잎 등급을 매겼습니다. 등급 하나 차이가 ' + amt.toLocaleString() + ' LMD, 한 철 벌이였습니다.', k: 'ev', fx: { money: s.rng.chance(0.5) ? amt : -Math.round(amt / 2) }, f: F('강남 차 상회 등급표, ' + s.year + '년') }; }),
  E('yan_aff_farm_grain', ['aff:YAN_FARM_GRAIN'], [12, 70], 25, 4, (s) => ({ t: '대황성 곡물 창고가 올해 수매가를 붙였습니다. 벽보 앞에 마을 사람이 다 모였고, 아무도 웃지 않았습니다.', k: 'note', fx: { h: -1 } })),
  E('yan_aff_farm_herd', ['aff:YAN_FARM_HERD'], [12, 70], 25, 4, (s) => ({ t: '겨울 풀이 모자라 가축을 몇 마리 팔았습니다. 봄에 되사려면 두 배였습니다.', k: 'bad', fx: { money: -medX(s, 0.05) } })),
  E('yan_aff_farm_wood', ['aff:YAN_FARM_WOOD'], [12, 70], 25, 4, (s) => ({ t: '벌목장에서 나무가 넘어지는 쪽에 사람이 있었습니다. 그날 저녁 마을에 곡소리가 났습니다.', k: 'bad', fx: { h: -3 } })),

  // ════════════════════════════════════════════════════════════════════════
  // YAN_BUREAU 관료 (핵심, A3) — clerk → middle → shilang → shangshu → sangong
  // ════════════════════════════════════════════════════════════════════════
  E('yan_bureau_first', ['track:YAN_BUREAU'], [18, 50], 90, 4, (s) => {
    const v = s.S.track.flags.via;
    const t = v === 'hereditary' ? '집안의 이름으로 관청에 들어갔습니다. 첫날 아무도 제 이름을 묻지 않았습니다.'
      : v === 'recommend' ? '천거장을 들고 관청에 들어갔습니다. 천거한 사람의 이름이 제 이름보다 먼저 불렸습니다.'
      : '시험에 붙어 관청에 들어갔습니다. 합격자 방에서 제 이름을 세 번 찾았습니다.';
    return { t, k: 'ev', fx: { cap: { learn: 0.03 } } };
  }, { c: (s) => firstYear(s, 'YAN_BUREAU') }),
  // clerk
  E('yan_bur_clerk_copy', [tk('YAN_BUREAU', 'clerk')], [18, 60], 35, 2, (s) => { const n = s.rng.ri(20, 40); return { t: '공문을 베꼈습니다. 하루에 ' + n + '장이었고, 한 글자를 틀리면 ' + n + '장을 다시 썼습니다.', k: 'ev', fx: { cap: { learn: 0.02 }, hl: -1 }, f: orgF(s, '관청 문서 등록부', s.year) }; }),
  E('yan_bur_clerk_rite', [tk('YAN_BUREAU', 'clerk')], [18, 60], 30, 3, (s) => ({ t: '의례에서 설 자리를 틀렸습니다. 상관이 아무 말도 하지 않았고, 그래서 더 오래 기억났습니다.', k: 'bad', fx: { h: -2, standing: -2 } })),
  E('yan_bur_clerk_gift', [tk('YAN_BUREAU', 'clerk')], [18, 60], 30, 3, (s) => ({ t: '명절 전에 상관 집에 ' + cul(s).drink + ' 한 통을 보냈습니다. 답은 없었고, 다음 달 당직이 하나 줄었습니다.', k: 'note', fx: { money: -medX(s, 0.05), standing: 2 } })),
  E('yan_bur_clerk_night', [tk('YAN_BUREAU', 'clerk')], [18, 60], 30, 2, (s) => ({ t: '관청 숙직을 섰습니다. 밤에 들어온 급보는 북방 요새의 것이었고, 봉투를 열 권한은 제게 없었습니다.', k: 'note', fx: { hl: -1 } })),
  // middle
  E('yan_bur_mid_case', [tk('YAN_BUREAU', 'middle')], [22, 65], 35, 2, (s) => ({ t: '송사 하나를 맡았습니다. 양쪽 다 아는 사람이 있었고, 판결은 아는 사람이 없는 쪽으로 났습니다.', k: 'ev', fx: { standing: 2, h: -1 } })),
  E('yan_bur_mid_tour', [tk('YAN_BUREAU', 'middle')], [22, 65], 30, 3, (s) => ({ t: '관할 현을 순시했습니다. 마을마다 길을 쓸어 놓았고, 쓸지 않은 마을이 하나 있어 그곳만 기억에 남았습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('yan_bur_mid_censor', [tk('YAN_BUREAU', 'middle')], [22, 65], 30, 4, (s) => ({ t: '숙정원 어사가 붉은 도포를 입고 관청에 왔습니다. 장부를 닷새 동안 보았고, 떠나는 날 아무도 배웅하지 않았습니다.', k: 'bad', fx: { h: -3 } })),
  E('yan_bur_mid_infected', [tk('YAN_BUREAU', 'middle')], [22, 65], 30, 4, (s) => { const n = s.rng.ri(30, 400); return { t: '관할 안 감염자 ' + n + '명의 명부를 호부에 올렸습니다. 이름 옆에 거주 제한 칸이 있었고, 그 칸을 채우는 손이 제 손이었습니다.', k: 'note', fx: { h: -2 }, f: orgF(s, '호부 감염자 명부', s.year) }; }),
  // shilang
  E('yan_bur_sl_court', [tk('YAN_BUREAU', 'shilang')], [28, 70], 35, 2, (s) => ({ t: '조회에 섰습니다. ' + cul(s).rulerTitle + '의 말은 짧았고, 상서들의 해석은 길었습니다.', k: 'ev', fx: { standing: 1 } })),
  E('yan_bur_sl_faction', [tk('YAN_BUREAU', 'shilang')], [28, 70], 30, 3, (s) => { const w = s.rng.chance(0.5); return { t: '부 안에서 편이 갈렸습니다. ' + (w ? '제가 선 쪽이 이겼고, 이긴 쪽 명단에 제 이름이 올랐습니다.' : '제가 선 쪽이 졌고, 진 쪽 명단에도 제 이름이 올랐습니다.'), k: w ? 'warm' : 'bad', fx: w ? { standing: 5 } : { standing: -6, h: -3 } }; }),
  E('yan_bur_sl_project', [tk('YAN_BUREAU', 'shilang')], [28, 70], 30, 3, (s) => ({ t: '치다오 한 구간의 공사비를 결재했습니다. 액수 뒤의 동그라미를 세 번 셌습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),
  E('yan_bur_sl_petition', [tk('YAN_BUREAU', 'shilang')], [28, 70], 30, 4, (s) => ({ t: '지방에서 올라온 상소를 읽었습니다. 흉년 이야기였고, 제 결재 하나로 창고 하나가 열렸습니다.', k: 'warm', fx: { h: 2, standing: 2 } })),
  // shangshu
  E('yan_bur_ss_seal', [tk('YAN_BUREAU', 'shangshu')], [35, 75], 35, 2, (s) => ({ t: '부의 인장을 제 손으로 찍었습니다. 찍기 전에 한 번 더 읽는 버릇이 그때 생겼습니다.', k: 'ev', fx: { standing: 1 } })),
  E('yan_bur_ss_rival', [tk('YAN_BUREAU', 'shangshu')], [35, 75], 30, 3, (s) => ({ t: '다른 부의 상서가 제 부의 예산을 끊으려 했습니다. 조회에서 두 번 말했고, 두 번째에 끊기지 않았습니다.', k: 'ev', fx: { standing: 3, hl: -2 } })),
  E('yan_bur_ss_north', [tk('YAN_BUREAU', 'shangshu')], [35, 75], 30, 4, (s) => { const n = s.rng.ri(3, 20); return { t: '북방 요새선에 보낼 군량 ' + n + '만 석의 장부를 올렸습니다. 숫자 하나가 요새 하나였습니다.', k: 'note', fx: { h: -1 }, f: orgF(s, '병부 군량 장부', s.year) }; }),
  E('yan_bur_ss_banquet', [tk('YAN_BUREAU', 'shangshu')], [35, 75], 30, 4, (s) => ({ t: fest(s, 1) + '에 궁의 연회에 앉았습니다. 자리 순서가 그해의 서열이었고, 제 자리는 작년보다 앞이었습니다.', k: 'warm', fx: { h: 2 } })),
  // sangong
  E('yan_bur_sg_audience', [tk('YAN_BUREAU', 'sangong')], [40, 85], 35, 2, (s) => ({ t: cul(s).rulerTitle + '께서 독대를 명하셨습니다. 방에는 셋이 있었고, 한 사람은 기록만 했습니다.', k: 'ev', fx: { standing: 2 } })),
  E('yan_bur_sg_heir', [tk('YAN_BUREAU', 'sangong')], [40, 85], 30, 4, (s) => ({ t: '후계 이야기가 조정에 돌았습니다. 아무도 제게 묻지 않았고, 아무도 묻지 않는 것이 답이었습니다.', k: 'note', fx: { h: -2 } })),
  E('yan_bur_sg_edict', [tk('YAN_BUREAU', 'sangong')], [40, 85], 30, 3, (s) => ({ t: '조서 초안을 제가 썼습니다. 반포된 조서에는 제 문장이 두 줄 남아 있었습니다.', k: 'warm', fx: { h: 2, cap: { learn: 0.02 } } })),
  E('yan_bur_sg_lungmen', [tk('YAN_BUREAU', 'sangong')], [40, 85], 30, 4, (s) => ({ t: '용문에 보낼 감찰사를 정하는 자리에 앉았습니다. 이름 하나를 올렸고, 그 이름이 용문으로 갔습니다.', k: 'note', fx: { standing: 1 } })),
  TRANS('YAN_BUREAU', {
    middle: '지부 자리를 받았습니다. 관인이 손에 무거웠고, 인수 장부는 더 무거웠습니다.',
    shilang: '시랑이 되었습니다. 조회에 설 자리가 생겼고, 그 자리를 노리는 사람도 생겼습니다.',
    shangshu: '상서가 되었습니다. 부 하나가 제 이름 아래 들어왔습니다.',
    sangong: '삼공의 자리에 올랐습니다. ' + '더 올라갈 자리가 없다는 것이 처음으로 두려웠습니다.',
  }),
  AFTER('YAN_BUREAU', {
    impeach: (s) => '탄핵으로 관직을 잃고 한 해가 지났습니다. ' + (s.S.prison ? '옥의 벽에 날짜를 긁었습니다.' : '옛 동료들은 길에서 눈을 돌렸습니다.'),
    purge: '숙청을 살아 넘기고 한 해가 지났습니다. 이름이 지워진 명부가 있다는 말을 들었습니다.',
    exile: '추방된 뒤 한 해가 지났습니다. 새 땅에서는 아무도 제 관직을 알지 못했고, 그것이 편했습니다.',
    _: '관청을 떠나고 한 해가 지났습니다. 아침에 손이 붓을 찾았습니다.',
  }),
  E('yan_aff_bur_liubu', ['aff:YAN_BUREAU_LIUBU'], [18, 80], 25, 4, (s) => { const hu = s.rng.chance(0.5); return { t: hu ? '호부 일이었습니다. 호적 한 줄이 한 집의 세금이었고, 줄을 긋는 붓이 제 붓이었습니다.' : '형부 일이었습니다. 형량이 적힌 종이를 하루에 수십 장 넘겼고, 저녁에는 손을 오래 씻었습니다.', k: 'note', fx: { h: -1 } }; }),
  E('yan_aff_bur_dalisi', ['aff:YAN_BUREAU_DALISI'], [18, 80], 25, 4, (s) => ({ t: '대리시의 심문실에서 하루를 보냈습니다. 질문은 제가 했고, 답은 기록관이 적었습니다.', k: 'note', fx: { standing: 1, h: -1 } })),
  E('yan_aff_bur_suzheng', ['aff:YAN_BUREAU_SUZHENG'], [18, 80], 25, 4, (s) => ({ t: '붉은 도포를 입고 지방 관청에 들어갔습니다. 문 앞에서 서리들이 인사를 했고, 인사하는 손이 떨렸습니다.', k: 'ev', fx: { standing: 2 } })),
  E('yan_aff_bur_local', ['aff:YAN_BUREAU_LOCAL'], [18, 80], 25, 4, (s) => ({ t: '현청 마당에서 백성의 송사를 들었습니다. 밭 경계 다툼이었고, 지도보다 노인의 기억이 정확했습니다.', k: 'ev', fx: { cap: { ties: 0.02 } } })),

  // ════════════════════════════════════════════════════════════════════════
  // YAN_ARMY 모병 군인 (핵심, A4) — private → sergeant → officer → canzhi → commander
  // ════════════════════════════════════════════════════════════════════════
  E('yan_army_first', ['track:YAN_ARMY'], [16, 40], 90, 4, (s) => {
    const v = s.S.track.flags.via;
    const t = v === 'noble_levy' ? '집안이 내는 병력으로 군영에 들어갔습니다. 다른 병사들은 제 성을 알고 있었습니다.'
      : v === 'border' ? '국경 모병에 응했습니다. 군영은 사막 가장자리에 있었고, 첫날 밤 바람 소리를 짐승 소리로 들었습니다.'
      : '모병소에서 이름을 적었습니다. 출신은 묻지 않았고, 키와 눈만 보았습니다.';
    return { t, k: 'ev', fx: { cap: { skill: 0.03 } } };
  }, { c: (s) => firstYear(s, 'YAN_ARMY') }),
  // private
  E('yan_army_pv_drill', [tk('YAN_ARMY', 'private')], [16, 45], 35, 2, (s) => ({ t: '훈련은 해 뜰 때 시작해 해 질 때 끝났습니다. 창을 든 손에 굳은살이 자리를 잡았습니다.', k: 'ev', fx: { cap: { skill: 0.03 }, hl: -1 } })),
  E('yan_army_pv_wall', [tk('YAN_ARMY', 'private')], [16, 45], 35, 2, (s) => ({ t: '성벽 야간 보초를 섰습니다. 황야 쪽에서 불빛이 보였고, 아침에는 보이지 않았습니다.', k: 'note', fx: { h: -1 } })),
  E('yan_army_pv_pay', [tk('YAN_ARMY', 'private')], [16, 45], 30, 3, (s) => { const n = s.rng.ri(2, 5); return { t: '급료가 ' + n + '달 늦게 나왔습니다. 군영 안 노점은 외상 장부를 길게 썼습니다.', k: 'bad', fx: { money: -medX(s, 0.03), h: -1 }, f: orgF(s, '병부 급료 지급 기록', s.year) }; }),
  E('yan_army_pv_letter', [tk('YAN_ARMY', 'private')], [16, 45], 30, 3, (s) => ({ t: '집에서 편지가 왔습니다. 글을 모르는 동료가 읽어 달라 해서, 제 편지보다 그 편지를 먼저 읽었습니다.', k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } })),
  // sergeant
  E('yan_army_sg_squad', [tk('YAN_ARMY', 'sergeant')], [19, 50], 35, 2, (s) => ({ t: '열 명을 맡았습니다. 이름을 다 외운 날, 한 명이 바뀌었습니다.', k: 'ev', fx: { standing: 2 } })),
  E('yan_army_sg_desert', [tk('YAN_ARMY', 'sergeant')], [19, 50], 30, 3, (s) => ({ t: '부하 하나가 탈영했습니다. 추적조에 제 이름이 올랐고, 잡지 못한 것이 다행인지 오래 생각했습니다.', k: 'bad', fx: { h: -3, standing: -2 } })),
  E('yan_army_sg_patrol', [tk('YAN_ARMY', 'sergeant')], [19, 50], 35, 2, (s) => ({ t: '국경 순찰을 돌았습니다. 상단 하나를 세웠고, 짐 속에서 나온 것은 소금뿐이었습니다.', k: 'note' })),
  E('yan_army_sg_collapsal', [tk('YAN_ARMY', 'sergeant')], [19, 50], 30, 4, (s) => ({ t: '북방에서 붕괴체가 넘어왔다는 전령이 왔습니다. 부대가 사흘을 걸어갔고, 도착했을 때는 끝나 있었습니다.', k: 'bad', fx: { hl: -2, h: -2 } })),
  // officer
  E('yan_army_of_map', [tk('YAN_ARMY', 'officer')], [22, 55], 35, 2, (s) => ({ t: '옥문 성벽 위에서 서쪽 황야를 지도와 맞춰 보았습니다. 지도에 없는 길이 하나 있었습니다.', k: 'ev', fx: { cap: { learn: 0.02 } } })),
  E('yan_army_of_tianshi', [tk('YAN_ARMY', 'officer')], [22, 55], 30, 3, (s) => ({ t: '군사 천사가 부대에 배속되었습니다. 명령 체계가 둘이 되었고, 병사들은 천사 쪽을 먼저 보았습니다.', k: 'note', fx: { h: -1 } })),
  E('yan_army_of_loss', [tk('YAN_ARMY', 'officer')], [22, 55], 30, 3, (s) => { const n = s.rng.ri(2, 9); return { t: '전투가 있었습니다. 부하 ' + n + '명의 이름을 보고서에 썼고, 그 이름을 집에 보내는 편지도 제가 썼습니다.', k: 'bad', fx: { h: -4, standing: 3 }, f: orgF(s, '옥문 관군 전사자 명부', s.year) }; }),
  E('yan_army_of_merchant', [tk('YAN_ARMY', 'officer')], [22, 55], 30, 4, (s) => ({ t: '상단이 통행세 대신 ' + cul(s).drink + ' 상자를 보냈습니다. 돌려보냈고, 다음 상단은 돈으로 보냈습니다.', k: 'note', fx: { standing: 1 } })),
  // canzhi
  E('yan_army_cz_council', [tk('YAN_ARMY', 'canzhi')], [28, 60], 35, 2, (s) => ({ t: '군의에 앉았습니다. 사령관의 말이 끝나면 제가 말할 차례였고, 할 말은 미리 적어 두었습니다.', k: 'ev', fx: { standing: 2 } })),
  E('yan_army_cz_supply', [tk('YAN_ARMY', 'canzhi')], [28, 60], 30, 3, (s) => ({ t: '군량이 늦었습니다. 조정에 급보를 세 번 보냈고, 세 번째 답장에 숫자가 있었습니다.', k: 'bad', fx: { h: -2 }, f: orgF(s, '병부 군량 조달 기록', s.year) })),
  E('yan_army_cz_shanhai', [tk('YAN_ARMY', 'canzhi')], [28, 60], 30, 4, (s) => ({ t: '산해중이 옥문 근처 마을에 나타났다는 보고가 왔습니다. 부대를 보냈고, 돌아온 보고서는 짧았습니다.', k: 'bad', fx: { h: -2 } })),
  E('yan_army_cz_family', [tk('YAN_ARMY', 'canzhi')], [28, 60], 30, 4, (s) => ({ t: partner(s) ? '가족을 옥문으로 불렀습니다. 요새 도시의 겨울은 길었고, 식구가 있으니 조금 짧았습니다.' : '옥문의 겨울을 혼자 났습니다. 막사의 화로가 제 식구였습니다.', k: 'note', fx: { h: partner(s) ? 2 : -1 } })),
  // commander
  E('yan_army_cm_fort', [tk('YAN_ARMY', 'commander')], [35, 70], 35, 2, (s) => ({ t: '요새 하나가 제 이름으로 지켜졌습니다. 밤에 성벽을 혼자 돌았고, 보초들이 모르는 척해 주었습니다.', k: 'ev', fx: { standing: 1 } })),
  E('yan_army_cm_court', [tk('YAN_ARMY', 'commander')], [35, 70], 30, 3, (s) => ({ t: '조정에서 군비를 줄이자는 상소가 올라왔습니다. 반박 상소를 썼고, 쓰는 동안 붕괴체는 기다려 주지 않았습니다.', k: 'bad', fx: { h: -2 } })),
  E('yan_army_cm_title', [tk('YAN_ARMY', 'commander')], [35, 70], 30, 5, (s) => ({ t: '작위 이야기가 나왔습니다. 받으면 조정 사람이 되고, 받지 않으면 군영 사람으로 남는 것이었습니다.', k: 'note', fx: { standing: 2 } })),
  E('yan_army_cm_veterans', [tk('YAN_ARMY', 'commander')], [35, 70], 30, 3, (s) => { const n = s.rng.ri(30, 120); return { t: '퇴역 병사들이 요새 밖에 ' + n + '가구의 마을을 이루었습니다. 그 마을 촌장이 옛 부하였고, 인사는 여전히 군례였습니다.', k: 'warm', fx: { h: 2 }, f: orgF(s, '옥문 외곽 호적', s.year) }; }),
  TRANS('YAN_ARMY', {
    sergeant: '대장(隊長)이 되었습니다. 창 대신 명부를 들었고, 명부가 더 무거웠습니다.',
    officer: '옥문 군관이 되었습니다. 성벽 위에 제 자리가 생겼습니다.',
    canzhi: '참지가 되었습니다. 군의 자리 하나가 제 것이 되었습니다.',
    commander: '수비 사령관이 되었습니다. 요새 하나와 그 안의 사람들이 제 책임이 되었습니다.',
  }),
  AFTER('YAN_ARMY', {
    kia: '전장에서 살아 돌아오고 한 해가 지났습니다. 다친 몸으로는 군영에 남을 수 없었습니다.',
    desert: '군영을 떠나고 한 해가 지났습니다. 이름이 수배 명부에 올랐고, 고향에는 돌아가지 못했습니다.',
    courtmartial: '군법회의를 받고 한 해가 지났습니다. 옥 안에서 들리는 북소리가 조회 북소리와 같았습니다.',
    purge: '군의 숙청을 피해 나라를 떠나고 한 해가 지났습니다. 옛 상관의 이름은 더 이상 입에 올리지 않았습니다.',
    _: '군을 떠나고 한 해가 지났습니다. 새벽이면 몸이 먼저 일어났습니다.',
  }),
  E('yan_aff_army_imperial', ['aff:YAN_ARMY_IMPERIAL'], [16, 70], 25, 4, (s) => ({ t: '금위군 제복을 입고 궁문에 섰습니다. 지나가는 관료들의 눈이 제복에 먼저 닿았습니다.', k: 'ev', fx: { standing: 1 } })),
  E('yan_aff_army_yumen', ['aff:YAN_ARMY_YUMEN'], [16, 70], 25, 4, (s) => ({ t: '옥문의 모래바람이 사흘을 불었습니다. 성벽 위 보초는 바뀌지 않았고, 모래만 바뀌었습니다.', k: 'note', fx: { hl: -1 } })),
  E('yan_aff_army_tianji', ['aff:YAN_ARMY_TIANJI'], [16, 70], 25, 4, (s) => ({ t: '천기각 요새선의 밤이었습니다. 안개 너머에서 무언가 성벽을 두드렸고, 아침에 성벽에 자국이 남아 있었습니다.', k: 'bad', fx: { h: -2 } })),
  E('yan_aff_army_noble', ['aff:YAN_ARMY_NOBLE'], [16, 70], 25, 4, (s) => ({ t: '가문 사병으로 가주의 행차를 따랐습니다. 길을 비키는 사람들이 가주를 보았고, 저는 보이지 않았습니다.', k: 'note' })),

  // ════════════════════════════════════════════════════════════════════════
  // YAN_OFFICE 이동도시 민간 고용 (핵심, A10) — staff → lead → manager
  // ════════════════════════════════════════════════════════════════════════
  E('yan_office_first', ['track:YAN_OFFICE'], [16, 45], 90, 4, (s) => {
    const v = s.S.track.flags.via;
    const t = v === 'contract' ? '모집 계약서에 서명하고 이동도시로 올라왔습니다. 계약서의 글자는 작았고, 기숙사의 창은 더 작았습니다.'
      : v === 'referral' ? '아는 사람의 소개로 자리를 얻었습니다. 첫 달 급료의 일부가 소개비로 나갔습니다.'
      : '이동도시에서 일자리를 얻었습니다. 아침마다 플레이트가 흔들렸고, 한 달이 지나자 흔들림을 잊었습니다.';
    return { t, k: 'ev', fx: v === 'referral' ? { money: -medX(s, 0.05) } : {} };
  }, { c: (s) => firstYear(s, 'YAN_OFFICE') }),
  // staff
  E('yan_off_st_plate', [tk('YAN_OFFICE', 'staff')], [16, 60], 35, 2, (s) => ({ t: '이동도시가 이동하는 날이었습니다. 일터는 쉬지 않았고, 창밖 풍경만 바뀌었습니다.', k: 'note' })),
  E('yan_off_st_dorm', [tk('YAN_OFFICE', 'staff')], [16, 60], 30, 3, (s) => { const n = s.rng.ri(4, 8); return { t: '회사 기숙사 한 방에 ' + n + '명이 잤습니다. 고향이 다 달랐고, 코 고는 소리는 같았습니다.', k: 'ev', fx: { cap: { ties: 0.02 } }, f: orgF(s, '이동도시 노동자 숙사 명부', s.year) }; }),
  E('yan_off_st_remit', [tk('YAN_OFFICE', 'staff')], [16, 60], 35, 2, (s) => { const amt = medX(s, 0.1); return { t: '급료에서 ' + amt.toLocaleString() + ' LMD를 고향에 부쳤습니다. 전달자가 영수증 대신 고향 소식을 한 줄 가져왔습니다.', k: 'warm', fx: { money: -amt, h: 2 }, f: orgF(s, '송금 대장', s.year) }; }),
  E('yan_off_st_check', [tk('YAN_OFFICE', 'staff')], [16, 60], 30, 3, (s) => ({ t: '호부 관리가 회사에 와서 외지 노동자 명부를 맞춰 보았습니다. 제 이름 옆에 고향 현 이름이 적혔습니다.', k: 'note', fx: { h: -1 } })),
  // lead
  E('yan_off_ld_team', [tk('YAN_OFFICE', 'lead')], [20, 62], 35, 2, (s) => ({ t: '팀 하나를 맡았습니다. 신입 셋이 제 고향 말을 썼고, 사투리를 고치라고 말하지 않았습니다.', k: 'ev', fx: { standing: 2 } })),
  E('yan_off_ld_quota', [tk('YAN_OFFICE', 'lead')], [20, 62], 30, 3, (s) => { const n = s.rng.ri(1, 3); return { t: '월 할당이 ' + n + '할 올랐습니다. 숫자를 팀에 전했고, 팀은 저를 보았습니다.', k: 'bad', fx: { h: -2, hl: -1 }, f: F('회사 생산 할당 공고, ' + s.year + '년') }; }),
  E('yan_off_ld_hometown', [tk('YAN_OFFICE', 'lead')], [20, 62], 30, 4, (s) => ({ t: fest(s, 0) + '에 고향에 내려갔습니다. 마을은 작아져 있었고, 부모는 더 작아져 있었습니다.', k: 'note', fx: { h: -1, money: -medX(s, 0.05) } })),
  E('yan_off_ld_accident', [tk('YAN_OFFICE', 'lead')], [20, 62], 30, 4, (s) => ({ t: '작업장에서 사고가 났습니다. 다친 사람은 제 팀이 아니었고, 보고서는 제가 썼습니다.', k: 'bad', fx: { h: -2 } })),
  // manager
  E('yan_off_mg_books', [tk('YAN_OFFICE', 'manager')], [25, 65], 35, 2, (s) => ({ t: '장부를 제 이름으로 닫았습니다. 이익은 적었고, 적은 이익이 제 몫이었습니다.', k: 'ev', fx: { money: medX(s, 0.1) } })),
  E('yan_off_mg_official', [tk('YAN_OFFICE', 'manager')], [25, 65], 30, 3, (s) => ({ t: '관청 허가를 갱신하러 갔습니다. 서류는 넉 장이었고, 봉투는 한 장이었습니다.', k: 'note', fx: { money: -medX(s, 0.08) } })),
  E('yan_off_mg_hire', [tk('YAN_OFFICE', 'manager')], [25, 65], 30, 3, (s) => ({ t: '고향 마을에서 사람을 뽑아 올렸습니다. 모집인이 제가 되었다는 것을 마을 어귀에서 알았습니다.', k: 'note', fx: { standing: 1, h: -1 } })),
  E('yan_off_mg_move', [tk('YAN_OFFICE', 'manager')], [25, 65], 30, 4, (s) => ({ t: '이동도시가 항로를 바꿨습니다. 단골 거래처가 다른 도시에 남았고, 새 거래처는 아직 없었습니다.', k: 'bad', fx: { money: -medX(s, 0.1), h: -2 } })),
  TRANS('YAN_OFFICE', {
    lead: '팀장이 되었습니다. 기숙사 방이 둘이 쓰는 방으로 바뀌었습니다.',
    manager: '점장이 되었습니다. 장부와 열쇠와 밤늦은 걱정이 함께 왔습니다.',
  }),
  AFTER('YAN_OFFICE', {
    layoff: '해고되고 한 해가 지났습니다. 이동도시는 저 없이도 같은 시간에 움직였습니다.',
    bankrupt: '회사가 문을 닫고 한 해가 지났습니다. 밀린 급료는 끝내 오지 않았습니다.',
    _: '일터를 떠나고 한 해가 지났습니다. 아침 종소리에 아직 몸이 반응했습니다.',
  }),
  E('yan_aff_off_xingyou', ['aff:YAN_OFFICE_XINGYOU'], [16, 65], 25, 4, (s) => ({ t: '행유물류 창고에서 상자를 셌습니다. 상자마다 행선지가 적혀 있었고, 제 고향 이름은 없었습니다.', k: 'note' })),
  E('yan_aff_off_chidao', ['aff:YAN_OFFICE_CHIDAO'], [16, 65], 25, 4, (s) => ({ t: '치다오 정비 구간에서 밤을 새웠습니다. 새벽에 첫 수레가 지나갔고, 그 바퀴 소리가 급료였습니다.', k: 'ev', fx: { hl: -2 } })),
  E('yan_aff_off_inn', ['aff:YAN_OFFICE_INN'], [16, 65], 25, 4, (s) => ({ t: '객잔에 표사 일행이 묵었습니다. 밤새 칼을 손질하는 소리가 났고, 아침에 방은 깨끗했습니다.', k: 'note' })),
  E('yan_aff_off_film', ['aff:YAN_OFFICE_FILM'], [16, 65], 25, 4, (s) => ({ t: '옥문 쿵푸 영화 촬영이었습니다. 하루 종일 같은 장면을 찍었고, 제가 한 일은 모래를 뿌리는 것이었습니다.', k: 'warm', fx: { h: 1 } })),
  E('yan_aff_off_herb', ['aff:YAN_OFFICE_HERB'], [16, 65], 25, 4, (s) => ({ t: '약재상에 광석병 환자 가족이 왔습니다. 듣는 약은 없었고, 파는 약은 있었습니다.', k: 'bad', fx: { h: -2 } })),

  // ════════════════════════════════════════════════════════════════════════
  // YAN_TIANSHI 천사 (핵심, A3) — apprentice → tianshi → shouye → shilang → head
  // ════════════════════════════════════════════════════════════════════════
  E('yan_tianshi_first', ['track:YAN_TIANSHI'], [16, 40], 90, 4, (s) => ({ t: s.S.track.flags.via === 'exam' ? '천사부 시험에 붙었습니다. 산꼭대기 관사까지 이틀을 걸어 올라갔습니다.' : '천사의 견습으로 받아들여졌습니다. 스승은 첫해 동안 제 이름을 부르지 않았습니다.', k: 'ev', fx: { cap: { arts: 0.03 } } }), { c: (s) => firstYear(s, 'YAN_TIANSHI') }),
  // apprentice
  E('yan_ts_ap_copy', [tk('YAN_TIANSHI', 'apprentice')], [16, 50], 35, 2, (s) => { const n = s.rng.ri(3, 9); return { t: '술식 도안을 베꼈습니다. 선 하나가 어긋나면 처음부터였고, 처음부터가 ' + n + '번이었습니다.', k: 'ev', fx: { cap: { arts: 0.03 }, hl: -1 }, f: F('천사부 견습 평가 기록, ' + s.year + '년') }; }),
  E('yan_ts_ap_mountain', [tk('YAN_TIANSHI', 'apprentice')], [16, 50], 30, 3, (s) => ({ t: '산 위 관사의 겨울이었습니다. 아래 마을의 불빛이 보였고, 내려가는 길은 눈에 막혀 있었습니다.', k: 'note', fx: { h: -1 } })),
  E('yan_ts_ap_test', [tk('YAN_TIANSHI', 'apprentice')], [16, 50], 30, 3, (s) => { const ok = s.rng.chance(0.5 + s.S.cap.arts * 0.1); return { t: '스승 앞에서 술식을 펼쳤습니다. ' + (ok ? '스승이 고개를 한 번 끄덕였고, 그것이 올해의 전부였습니다.' : '불이 손에서 꺼졌고, 스승은 아무 말 없이 돌아섰습니다.'), k: ok ? 'warm' : 'bad', fx: ok ? { standing: 3, h: 2 } : { h: -3 } }; }),
  E('yan_ts_ap_field', [tk('YAN_TIANSHI', 'apprentice')], [16, 50], 30, 3, (s) => ({ t: '스승을 따라 치다오 공사장에 갔습니다. 스승이 바위를 갈랐고, 저는 도구를 들고 서 있었습니다.', k: 'note', fx: { cap: { arts: 0.02 } } })),
  // tianshi
  E('yan_ts_ti_bridge', [tk('YAN_TIANSHI', 'tianshi')], [26, 65], 35, 2, (s) => ({ t: '다리 하나를 제 술식으로 놓았습니다. 첫 수레가 건너는 것을 끝까지 보았습니다.', k: 'warm', fx: { h: 3, standing: 2 } })),
  E('yan_ts_ti_village', [tk('YAN_TIANSHI', 'tianshi')], [26, 65], 30, 3, (s) => ({ t: '가뭄 든 마을에 파견되었습니다. 물길을 바꿨고, 마을 사람들이 ' + rago(cul(s).address) + ' 불렀습니다. 그 호칭이 낯설었습니다.', k: 'ev', fx: { standing: 2 } })),
  E('yan_ts_ti_report', [tk('YAN_TIANSHI', 'tianshi')], [26, 65], 30, 3, (s) => ({ t: '공부에 올릴 보고서를 썼습니다. 술식 이야기는 두 줄이었고, 비용 이야기는 두 장이었습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),
  E('yan_ts_ti_backlash', [tk('YAN_TIANSHI', 'tianshi')], [26, 65], 30, 4, (s) => ({ t: '술식이 되돌아왔습니다. 손끝이 사흘 동안 감각이 없었고, 그 뒤로는 도안을 한 번 더 보았습니다.', k: 'bad', fx: { hl: -4 } })),
  // shouye
  E('yan_ts_sy_pupils', [tk('YAN_TIANSHI', 'shouye')], [30, 80], 35, 2, (s) => ({ t: '견습 셋을 받았습니다. 첫해 동안 이름을 부르지 않았고, 왜 그랬는지 그제야 알았습니다.', k: 'ev', fx: { standing: 2 } })),
  E('yan_ts_sy_north', [tk('YAN_TIANSHI', 'shouye')], [30, 80], 30, 4, (s) => ({ t: '북방 요새선 연례 파견에 이름이 올랐습니다. 안개 속에서 술식을 펼쳤고, 돌아와서는 한 달 동안 소리를 듣지 못했습니다.', k: 'bad', fx: { hl: -3, standing: 4 } })),
  E('yan_ts_sy_court', [tk('YAN_TIANSHI', 'shouye')], [30, 80], 30, 3, (s) => ({ t: '조정에 불려 갔습니다. 관료들은 술식의 쓰임을 물었고, 값을 더 오래 물었습니다.', k: 'note', fx: { h: -1 } })),
  E('yan_ts_sy_sui', [tk('YAN_TIANSHI', 'shouye')], [30, 80], 30, 5, (s) => ({ t: '사세대에서 사람이 왔습니다. 땅 밑 이야기를 했고, 돌아간 뒤 그 이야기를 아무에게도 하지 않았습니다.', k: 'note', fx: { h: -2 } })),
  // shilang
  E('yan_ts_sl_budget', [tk('YAN_TIANSHI', 'shilang')], [38, 90], 35, 2, (s) => ({ t: '공부 시랑으로 천사부 예산을 지켰습니다. 조회에서 숫자를 읽는 천사는 저 하나였습니다.', k: 'ev', fx: { standing: 2 } })),
  E('yan_ts_sl_two_hats', [tk('YAN_TIANSHI', 'shilang')], [38, 90], 30, 3, (s) => ({ t: '아침에는 관복, 저녁에는 도포였습니다. 둘 다 입은 날은 둘 다 맞지 않았습니다.', k: 'note', fx: { hl: -2 } })),
  E('yan_ts_sl_disaster', [tk('YAN_TIANSHI', 'shilang')], [38, 90], 30, 4, (s) => ({ t: '재앙 뒤 복구 계획을 제가 올렸습니다. 천사 열둘을 보냈고, 열하나가 돌아왔습니다.', k: 'bad', fx: { h: -3, standing: 3 }, f: orgF(s, '천사부 파견 기록', s.year) })),
  E('yan_ts_sl_lungmen', [tk('YAN_TIANSHI', 'shilang')], [38, 90], 30, 5, (s) => ({ t: '용문에서 기술 협력 요청이 왔습니다. 그쪽은 기계로 하는 일을 이쪽은 사람이 했고, 어느 쪽이 빠른지 답하지 않았습니다.', k: 'note' })),
  // head
  E('yan_ts_hd_seal', [tk('YAN_TIANSHI', 'head')], [55, 95], 35, 2, (s) => ({ t: '천사부 인장이 제 손에 있었습니다. 찍는 날보다 찍지 않는 날이 많았습니다.', k: 'ev', fx: { standing: 1 } })),
  E('yan_ts_hd_rhodes', [tk('YAN_TIANSHI', 'head')], [55, 95], 30, 5, (s) => ({ t: '로도스 아일랜드라는 제약회사와의 제휴 문서를 보았습니다. 서명란이 비어 있었고, 비워 둔 채 한 해가 갔습니다.', k: 'note' }), { c: (s) => yr(s, 1100, 1110) }),
  E('yan_ts_hd_old', [tk('YAN_TIANSHI', 'head')], [55, 95], 30, 3, (s) => ({ t: '술식을 펼치는 날이 줄었습니다. 대신 펼치는 사람을 고르는 날이 늘었습니다.', k: 'note', fx: { cap: { arts: -0.02 } } })),
  E('yan_ts_hd_audience', [tk('YAN_TIANSHI', 'head')], [55, 95], 30, 4, (s) => ({ t: cul(s).rulerTitle + '께서 북방 이야기를 물으셨습니다. 안개 이야기를 했고, 방 안이 잠시 추워졌습니다.', k: 'note', fx: { standing: 2 } })),
  TRANS('YAN_TIANSHI', {
    tianshi: '천사가 되었습니다. 스승이 처음으로 이름을 불렀습니다.',
    shouye: '수업천사가 되었습니다. 가르치는 자리에 서니 배운 것이 적어 보였습니다.',
    shilang: '공부 시랑을 겸하게 되었습니다. 도포 위에 관복이 얹혔습니다.',
    head: '천사부의 수장이 되었습니다. 산 위 관사의 가장 높은 방이 제 방이 되었습니다.',
  }),
  AFTER('YAN_TIANSHI', {
    injury: '술식 사고 뒤 한 해가 지났습니다. 손은 붓을 쥐었지만 불은 켜지지 않았습니다.',
    impeach: '천사부에서 쫓겨나고 한 해가 지났습니다. 산 아래 마을에서 저를 ' + '대인이라 부르는 사람은 없었습니다.',
    backlash: '되돌아온 술식을 살아 넘기고 한 해가 지났습니다. 몸의 반이 제 것이 아닌 것 같았습니다.',
    _: '천사부를 떠나고 한 해가 지났습니다. 산 위의 눈이 아직 꿈에 왔습니다.',
  }),
  E('yan_aff_ts_civil', ['aff:YAN_TIANSHI_CIVIL'], [16, 90], 25, 4, (s) => ({ t: '토목 천사의 일이었습니다. 산을 깎는 날은 하루였고, 그 산을 돌아가던 길은 삼백 년이었습니다.', k: 'note' })),
  E('yan_aff_ts_agri', ['aff:YAN_TIANSHI_AGRI'], [16, 90], 25, 4, (s) => ({ t: '농업 천사로 대황성 들판에 섰습니다. 비를 부르지는 못했고, 물길을 바꿨습니다.', k: 'ev', fx: { standing: 1 } })),
  E('yan_aff_ts_mil', ['aff:YAN_TIANSHI_MIL'], [16, 90], 25, 4, (s) => ({ t: '군사 천사로 전열 뒤에 섰습니다. 병사들은 앞을 보았고, 저는 병사들의 등을 보았습니다.', k: 'bad', fx: { h: -2, standing: 2 } })),
  E('yan_aff_ts_thunder', ['aff:YAN_TIANSHI_THUNDER'], [16, 90], 25, 4, (s) => ({ t: '뇌법 유파의 수련이었습니다. 하늘이 맑은 날에도 손끝에서 소리가 났습니다.', k: 'note', fx: { cap: { arts: 0.03 } } })),

  // ════════════════════════════════════════════════════════════════════════
  // 나머지 진로 — 단계마다 2 + 전환 + 후일담
  // ════════════════════════════════════════════════════════════════════════
  // YAN_RIVER 강변 어부·뱃사공 (A11): boat → boatman → owner → porter_boss
  E('yan_river_boat_net', [tk('YAN_RIVER', 'boat')], [12, 50], 35, 2, (s) => ({ t: '가족 배에서 그물을 당겼습니다. 비늘농어가 올라온 날은 저녁상이 달랐습니다.', k: 'ev', fx: { cap: { skill: 0.02 } } })),
  E('yan_river_boat_pirate', [tk('YAN_RIVER', 'boat')], [12, 50], 30, 4, (s) => ({ t: yr(s, 1000, 1085) ? '강 위에서 수적 배를 보았습니다. 아버지가 노를 멈췄고, 그쪽도 멈췄고, 서로 지나갔습니다.' : '옛 수적 씨족이 살던 강굽이를 지났습니다. 빈 배 몇 척이 갈대 속에 썩어 가고 있었습니다.', k: 'note', fx: { h: -1 } })),
  E('yan_river_bm_ferry', [tk('YAN_RIVER', 'boatman')], [15, 60], 35, 2, (s) => { const n = medX(s, 0.003) + 1; return { t: '나루에서 사람을 건넸습니다. 뱃삯은 ' + n + ' LMD로 정해져 있었고, 급한 사람은 더 냈습니다.', k: 'ev', fx: { money: medX(s, 0.03) }, f: orgF(s, '나루 뱃삯 고시', s.year) }; }),
  E('yan_river_bm_water', [tk('YAN_RIVER', 'boatman')], [15, 60], 30, 4, (s) => ({ t: '상류 광산 쪽에서 물이 탁하게 내려왔습니다. 고기가 줄었고, 아무도 이유를 적어 두지 않았습니다.', k: 'bad', fx: { h: -2, money: -medX(s, 0.04) } })),
  E('yan_river_ow_fleet', [tk('YAN_RIVER', 'owner')], [20, 65], 35, 2, (s) => ({ t: '배 셋을 부렸습니다. 사공들 급료를 주고 남은 것이 제 몫이었고, 남는 달과 남지 않는 달이 있었습니다.', k: 'ev', fx: { money: s.rng.chance(0.6) ? medX(s, 0.1) : -medX(s, 0.05) } })),
  E('yan_river_ow_guild', [tk('YAN_RIVER', 'owner')], [20, 65], 30, 4, (s) => ({ t: '뱃사공 조합 모임에 선주로 앉았습니다. 뱃삯을 올리자는 쪽과 올리면 손님이 준다는 쪽이 있었고, 저는 두 쪽 다 알았습니다.', k: 'note', fx: { standing: 2 } })),
  E('yan_river_pb_dock', [tk('YAN_RIVER', 'porter_boss')], [25, 70], 35, 2, (s) => ({ t: '나루 지게꾼들의 일감을 나눴습니다. 힘센 사람에게 무거운 짐, 아픈 사람에게 가벼운 짐, 그래도 품삯은 같게 했습니다.', k: 'ev', fx: { standing: 2 } })),
  E('yan_river_pb_merchant', [tk('YAN_RIVER', 'porter_boss')], [25, 70], 30, 4, (s) => ({ t: '행유물류 사람이 나루를 통째로 계약하자고 왔습니다. 지게꾼들은 반대했고, 계약서의 숫자는 컸습니다.', k: 'note', fx: { h: -1 } })),
  TRANS('YAN_RIVER', {
    boatman: '제 노를 잡았습니다. 아버지의 배는 이제 제 배였습니다.',
    owner: '선주가 되었습니다. 남의 노 젓는 소리로 밥을 먹게 되었습니다.',
    porter_boss: '나루의 지게꾼들이 두목으로 세웠습니다. 짐은 지지 않았고, 짐 지는 사람들을 졌습니다.',
  }),
  AFTER('YAN_RIVER', {
    ruin: '배를 잃고 한 해가 지났습니다. 강은 그대로 흘렀고, 제 자리만 없었습니다.',
    drowning: '물에 빠졌다 살아나고 한 해가 지났습니다. 그 뒤로 배 위에서는 늘 뭍을 보았습니다.',
    raid: '수적에게 당하고 한 해가 지났습니다. 다친 팔로는 노를 저을 수 없었습니다.',
    _: '강을 떠나고 한 해가 지났습니다. 밤에 물소리가 없으면 잠이 오지 않았습니다.',
  }),
  E('yan_aff_river_fish', ['aff:YAN_RIVER_FISH'], [12, 70], 25, 4, (s) => ({ t: '구오의 비늘농어 철이었습니다. 강가에 상인 수레가 줄을 섰고, 값은 아침과 저녁이 달랐습니다.', k: 'ev', fx: { money: medX(s, 0.06) } })),
  E('yan_aff_river_porter', ['aff:YAN_RIVER_PORTER'], [12, 70], 25, 4, (s) => ({ t: '지게에 상단 짐을 졌습니다. 언덕을 올라가는 동안 셈을 했고, 내려올 때는 셈이 틀렸습니다.', k: 'bad', fx: { hl: -2 } })),

  // YAN_MINER 양강 광부 (A5): hand → miner → foreman
  E('yan_miner_hand_cart', [tk('YAN_MINER', 'hand')], [14, 50], 35, 2, (s) => ({ t: '갱 밖에서 수레를 밀었습니다. 갱 안에서 나오는 사람들의 얼굴이 다 같은 색이었습니다.', k: 'ev', fx: { hl: -1 } })),
  E('yan_miner_hand_debt', [tk('YAN_MINER', 'hand')], [14, 50], 30, 4, (s) => { const amt = medX(s, 0.05); return { t: '광산 매점의 외상이 급료를 ' + amt.toLocaleString() + ' LMD 넘었습니다. 장부를 보여 달라고 했고, 장부는 보여 주지 않았습니다.', k: 'bad', fx: { money: -amt, h: -2 }, f: F('광산 매점 외상 장부, ' + s.year + '년') }; }),
  E('yan_miner_mi_vein', [tk('YAN_MINER', 'miner')], [16, 55], 35, 2, (s) => ({ t: '갱 안에서 광맥을 따라 들어갔습니다. 등불 빛에 벽이 반짝였고, 그 반짝임이 병의 색이라는 것을 다들 알았습니다.', k: 'bad', fx: { hl: -2 } })),
  E('yan_miner_mi_collapse', [tk('YAN_MINER', 'miner')], [16, 55], 30, 4, (s) => { const n = s.rng.ri(2, 7); return { t: '옆 갱이 무너졌습니다. ' + n + '명을 꺼내지 못했고, 다음 날 갱은 다시 열렸습니다.', k: 'bad', fx: { h: -4 }, f: orgF(s, '양강 광구 사고 기록', s.year) }; }),
  E('yan_miner_fm_shift', [tk('YAN_MINER', 'foreman')], [22, 60], 35, 2, (s) => ({ t: '교대표를 제가 짰습니다. 갱 깊은 쪽에 누구를 넣을지 정하는 일이었고, 밤에 그 이름들이 떠올랐습니다.', k: 'note', fx: { standing: 2, h: -1 } })),
  E('yan_miner_fm_decline', [tk('YAN_MINER', 'foreman')], [22, 60], 30, 4, (s) => ({ t: yr(s, 1101, 1120) ? '광맥이 줄고 있다는 말이 위에서 내려왔습니다. 작업반을 줄이라고 했고, 줄일 이름을 제가 골랐습니다.' : '광구 관리가 산출량을 물었습니다. 숫자를 조금 올려 적었고, 다음 달 그 숫자가 할당이 되었습니다.', k: 'bad', fx: { h: -2 } })),
  TRANS('YAN_MINER', {
    miner: '갱 안으로 들어가게 되었습니다. 품삯이 올랐고, 기침도 시작되었습니다.',
    foreman: '감독이 되었습니다. 갱 안에 들어가는 날이 줄었고, 들어가는 사람을 보는 날이 늘었습니다.',
  }),
  AFTER('YAN_MINER', {
    mine: '갱 사고에서 살아 나오고 한 해가 지났습니다. 다리 하나로는 갱에 다시 들어갈 수 없었습니다.',
    crystallize: '결정화가 겉으로 드러나고 한 해가 지났습니다. 광산은 더 이상 저를 받지 않았습니다.',
    ruin: '광산이 닫히고 한 해가 지났습니다. 마을도 광산과 함께 닫혔습니다.',
    _: '광산을 떠나고 한 해가 지났습니다. 기침은 떠나지 않았습니다.',
  }),
  E('yan_aff_miner_lj', ['aff:YAN_MINER_LIANGJIANG'], [14, 60], 25, 4, (s) => ({ t: '양강 유역 광산촌의 장날이었습니다. 파는 것은 쌀과 기름, 사는 것은 약이었습니다.', k: 'note' })),

  // YAN_OUTLAW 수적·산적 (A1): child → underling → boss
  E('yan_outlaw_ch_lookout', [tk('YAN_OUTLAW', 'child')], [12, 30], 35, 2, (s) => ({ t: '강굽이 바위 위에서 망을 보았습니다. 관군 배가 보이면 피리를 불었고, 그해 피리는 두 번 울었습니다.', k: 'ev', fx: { cap: { ties: 0.02 } } })),
  E('yan_outlaw_ch_feast', [tk('YAN_OUTLAW', 'child')], [12, 30], 30, 3, (s) => { const n = s.rng.ri(6, 20); return { t: '씨족 배 ' + n + '척이 강가에 모여 잔치를 했습니다. 어른들은 술을 마셨고, 아이들은 노래를 외웠습니다. 노래에는 관군 이야기가 없었습니다.', k: 'warm', fx: { h: 2 }, f: orgF(s, '강제 수적 토벌 보고', s.year) }; }),
  E('yan_outlaw_ul_raid', [tk('YAN_OUTLAW', 'underling')], [15, 45], 35, 2, (s) => ({ t: '상선 하나를 세웠습니다. 짐을 나눴고, 사공은 다치지 않았습니다. 다치지 않게 하는 것이 씨족의 규칙이었습니다.', k: 'ev', fx: { money: medX(s, 0.15), standing: 2 } })),
  E('yan_outlaw_ul_army', [tk('YAN_OUTLAW', 'underling')], [15, 45], 30, 4, (s) => ({ t: yr(s, 1080, 1086) ? '관군이 강을 거슬러 올라왔습니다. 씨족은 흩어졌고, 흩어진 뒤에는 씨족이 아니었습니다.' : '관군 순찰선이 늘었습니다. 밤에만 움직였고, 밤이 짧은 철에는 굶었습니다.', k: 'bad', fx: { h: -3 } })),
  E('yan_outlaw_bs_rule', [tk('YAN_OUTLAW', 'boss')], [22, 60], 35, 2, (s) => ({ t: '씨족을 이끌었습니다. 누구를 세우고 누구를 보낼지 정했고, 보내는 날은 술을 마시지 않았습니다.', k: 'ev', fx: { standing: 2 } })),
  E('yan_outlaw_bs_deal', [tk('YAN_OUTLAW', 'boss')], [22, 60], 30, 4, (s) => ({ t: '현의 관리가 사람을 보냈습니다. 세금을 내면 눈을 감아 주겠다는 말이었고, 세금은 강 위의 모든 배 값이었습니다.', k: 'note', fx: { h: -2 } })),
  TRANS('YAN_OUTLAW', {
    underling: '망보는 자리에서 노 젓는 자리로 옮겼습니다. 씨족의 배에 제 자리가 생겼습니다.',
    boss: '씨족의 두목이 되었습니다. 강 한 굽이가 제 이름으로 불렸습니다.',
  }),
  AFTER('YAN_OUTLAW', {
    vendetta: '씨족 사이의 피바람에서 살아남고 한 해가 지났습니다. 강은 더 이상 제 것이 아니었습니다.',
    arrest: '체포되고 한 해가 지났습니다. 옥의 창으로는 강이 보이지 않았습니다.',
    purge: '관군의 토벌에서 살아 나오고 한 해가 지났습니다. 씨족은 없어졌고, 씨족의 노래만 남았습니다.',
    _: '강을 떠나고 한 해가 지났습니다. 뭍에서는 걸음이 느렸습니다.',
  }),
  E('yan_aff_outlaw_hill', ['aff:YAN_OUTLAW_HILL'], [12, 60], 25, 4, (s) => ({ t: '산채에 겨울이 왔습니다. 고갯길에 상단이 끊겼고, 끊긴 동안 산채는 서로를 먹지 않으려 애썼습니다.', k: 'bad', fx: { hl: -2 } })),

  // YAN_WUXIA 강호 무술·표국 (A6, 순회): disciple → wulin → escort → master
  E('yan_wuxia_ds_stance', [tk('YAN_WUXIA', 'disciple')], [8, 35], 35, 2, (s) => ({ t: '하나의 자세를 한 해 동안 잡았습니다. 사부는 고치지 않았고, 고쳐지는 것을 기다렸습니다.', k: 'ev', fx: { cap: { skill: 0.04 } } })),
  E('yan_wuxia_ds_chores', [tk('YAN_WUXIA', 'disciple')], [8, 35], 30, 3, (s) => ({ t: '문파의 물을 길었습니다. 무예보다 물통이 먼저였고, 물통이 무예였다는 것은 나중에 알았습니다.', k: 'note', fx: { hl: 1 } })),
  E('yan_wuxia_wl_duel', [tk('YAN_WUXIA', 'wulin')], [14, 50], 35, 2, (s) => { const w = s.rng.chance(0.5 + s.S.cap.skill * 0.1); return { t: '강호의 결투장에 섰습니다. ' + (w ? '이겼고, 이긴 뒤 상대의 이름을 외웠습니다.' : '졌고, 진 뒤 제 이름이 강호에 돌았습니다.'), k: w ? 'warm' : 'bad', fx: w ? { standing: 4, h: 2 } : { standing: -3, hl: -4 } }; }),
  E('yan_wuxia_wl_road', [tk('YAN_WUXIA', 'wulin')], [14, 50], 30, 3, (s) => ({ t: '강호를 떠돌았습니다. 객잔마다 다른 소문이 있었고, 제 소문도 그중 하나였습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('yan_wuxia_es_caravan', [tk('YAN_WUXIA', 'escort')], [18, 58], 35, 2, (s) => { const n = s.rng.ri(3, 14); return { t: '표국 깃발을 들고 수레 ' + n + '대의 상단을 호위했습니다. 고갯길에서 산적이 깃발을 보고 물러났습니다. 깃발이 칼보다 먼저였습니다.', k: 'ev', fx: { money: medX(s, 0.1), standing: 2 }, f: F('표국 호송 장부, ' + s.year + '년') }; }),
  E('yan_wuxia_es_loss', [tk('YAN_WUXIA', 'escort')], [18, 58], 30, 4, (s) => ({ t: '표물 하나를 잃었습니다. 표국은 값을 물어 주었고, 그 값이 제 급료에서 나갔습니다.', k: 'bad', fx: { money: -medX(s, 0.2), standing: -3 } })),
  E('yan_wuxia_ms_school', [tk('YAN_WUXIA', 'master')], [30, 75], 35, 2, (s) => ({ t: '무술학교를 열었습니다. 아이들이 하나의 자세를 한 해 동안 잡았고, 저는 고치지 않았습니다.', k: 'warm', fx: { h: 2, money: medX(s, 0.08) } })),
  E('yan_wuxia_ms_film', [tk('YAN_WUXIA', 'master')], [30, 75], 30, 5, (s) => ({ t: '옥문 영화 촬영팀이 지도를 부탁했습니다. 진짜 자세는 화면에서 느려 보였고, 느리게 보이는 자세를 다시 만들었습니다.', k: 'note', fx: { money: medX(s, 0.1) } })),
  TRANS('YAN_WUXIA', {
    wulin: '사부가 문을 열어 주었습니다. 문파의 이름을 등에 지고 강호로 나갔습니다.',
    escort: '표국의 표사가 되었습니다. 제 칼에 값이 붙었습니다.',
    master: '사범이 되었습니다. 가르치는 자리에서 사부의 침묵을 이해했습니다.',
  }),
  AFTER('YAN_WUXIA', {
    kia: '호위 중 크게 다치고 한 해가 지났습니다. 칼은 벽에 걸렸고, 내리지 않았습니다.',
    injury: '부상 뒤 한 해가 지났습니다. 자세는 기억했고, 몸이 따르지 않았습니다.',
    exile: '강호를 떠나 나라 밖으로 나가고 한 해가 지났습니다. 문파의 이름은 더 이상 말하지 않았습니다.',
    _: '강호를 떠나고 한 해가 지났습니다. 아침에 몸이 자세를 잡으려 했습니다.',
  }),
  E('yan_aff_wuxia_trad', ['aff:YAN_WUXIA_TRAD'], [8, 75], 25, 4, (s) => ({ t: '문파의 연례 시연이었습니다. 다른 문파 사람들이 보러 왔고, 보는 눈이 칼보다 날카로웠습니다.', k: 'note', fx: { standing: 1 } })),
  E('yan_aff_wuxia_xingyou', ['aff:YAN_WUXIA_XINGYOU'], [8, 75], 25, 4, (s) => ({ t: '행유표국 장부에 제 이름으로 표물 한 건이 올랐습니다. 값은 좋았고, 길은 멀었습니다.', k: 'ev', fx: { money: medX(s, 0.08) } })),
  E('yan_aff_wuxia_border', ['aff:YAN_WUXIA_BORDER'], [8, 75], 25, 4, (s) => ({ t: '국경 보안회사의 계약이었습니다. 지키는 것은 사람이 아니라 창고였고, 창고는 인사를 하지 않았습니다.', k: 'note', fx: { h: -1 } })),

  // YAN_MESSENGER 마을 전달자 (A11, 순회): village → regional → route
  E('yan_msg_vl_run', [tk('YAN_MESSENGER', 'village')], [12, 45], 35, 2, (s) => ({ t: '옆 마을까지 소식을 날랐습니다. 고갯길을 반나절에 넘었고, 돌아올 때는 답장을 외워서 왔습니다.', k: 'ev', fx: { hl: 1, cap: { skill: 0.02 } } })),
  E('yan_msg_vl_storm', [tk('YAN_MESSENGER', 'village')], [12, 45], 30, 3, (s) => ({ t: '재앙 경보를 마을에 전했습니다. 마을이 하루 먼저 움직였고, 하루가 집 몇 채였습니다.', k: 'warm', fx: { standing: 3 } })),
  E('yan_msg_rg_test', [tk('YAN_MESSENGER', 'regional')], [15, 50], 35, 2, (s) => ({ t: '지역 전달자 시험 기간이었습니다. 보낸 적 없는 길로 보냈고, 길은 지도와 달랐습니다.', k: 'ev', fx: { cap: { learn: 0.02 } } })),
  E('yan_msg_rg_dust', [tk('YAN_MESSENGER', 'regional')], [15, 50], 30, 4, (s) => ({ t: '재앙이 지나간 길을 통과했습니다. 잔류 가루가 발목까지 쌓여 있었고, 서두르는 것 말고는 방법이 없었습니다.', k: 'bad', fx: { hl: -2 } })),
  E('yan_msg_rt_survey', [tk('YAN_MESSENGER', 'route')], [20, 60], 35, 2, (s) => ({ t: '새 교역로를 그렸습니다. 지도에 없던 마을 둘이 지도에 들어갔습니다.', k: 'warm', fx: { standing: 3, money: medX(s, 0.1) } })),
  E('yan_msg_rt_caravan', [tk('YAN_MESSENGER', 'route')], [20, 60], 30, 4, (s) => ({ t: '첫 상단이 제가 그린 길로 지나갔습니다. 길 끝 마을에서 ' + eul(cul(s).drink) + ' 냈고, 그 값은 받지 않았습니다.', k: 'warm', fx: { h: 3 } })),
  TRANS('YAN_MESSENGER', {
    regional: '지역 전달자가 되었습니다. 마을 하나 대신 고을 하나가 제 길이 되었습니다.',
    route: '교역로를 여는 사람이 되었습니다. 길을 걷는 대신 길을 만들게 되었습니다.',
  }),
  AFTER('YAN_MESSENGER', {
    ruin: '길이 끊기고 한 해가 지났습니다. 전할 소식은 있었고, 전할 길이 없었습니다.',
    infected: '감염을 안 뒤 한 해가 지났습니다. 마을 사이를 오가는 일은 더 이상 허락되지 않았습니다.',
    catastrophe: '재앙에서 살아 나오고 한 해가 지났습니다. 다리로는 더 이상 고개를 넘지 못했습니다.',
    _: '전달자 일을 그만두고 한 해가 지났습니다. 발이 아직 고갯길을 기억했습니다.',
  }),
  E('yan_aff_msg_caravan', ['aff:YAN_MSG_CARAVAN'], [12, 60], 25, 4, (s) => ({ t: '새북 상단의 전령으로 사막 가장자리를 달렸습니다. 모래가 길을 지웠고, 별이 길을 다시 그렸습니다.', k: 'note', fx: { cap: { skill: 0.02 } } })),

  // YAN_RESCUE 춘건 구조대 (A4): trainee → member → leader → exchange
  E('yan_rescue_tr_drill', [tk('YAN_RESCUE', 'trainee')], [18, 35], 35, 2, (s) => ({ t: '방호복을 입고 뛰는 훈련이었습니다. 벗으면 몸무게가 반으로 느껴졌습니다.', k: 'ev', fx: { cap: { skill: 0.03 }, hl: -1 } })),
  E('yan_rescue_tr_lecture', [tk('YAN_RESCUE', 'trainee')], [18, 35], 30, 3, (s) => ({ t: '광석병 강의를 들었습니다. 감염 경로를 외웠고, 외운 것 중 하나가 "구조 중"이었습니다.', k: 'note', fx: { cap: { learn: 0.02 }, h: -1 } })),
  E('yan_rescue_mb_site', [tk('YAN_RESCUE', 'member')], [20, 50], 35, 2, (s) => { const n = s.rng.ri(3, 14); return { t: '재앙 현장에 들어갔습니다. ' + n + '명을 들것에 실었고, 들것 수를 세는 것이 하루의 끝이었습니다.', k: 'ev', fx: { standing: 3, hl: -2 }, f: orgF(s, '춘건 구조 기록', s.year) }; }),
  E('yan_rescue_mb_tent', [tk('YAN_RESCUE', 'member')], [20, 50], 30, 3, (s) => ({ t: '북방 텐트 근무였습니다. 한 달 동안 같은 얼굴 넷과 지냈고, 돌아와서 그 넷이 그리웠습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('yan_rescue_ld_order', [tk('YAN_RESCUE', 'leader')], [25, 50], 35, 2, (s) => ({ t: '조를 이끌고 현장에 들어갔습니다. 누구를 먼저 들여보낼지 정하는 것이 조장의 일이었습니다.', k: 'ev', fx: { standing: 2, h: -1 } })),
  E('yan_rescue_ld_infected', [tk('YAN_RESCUE', 'leader')], [25, 50], 30, 4, (s) => ({ t: '조원 하나의 판정이 나왔습니다. 호부에 올렸고, 올린 손이 제 손이었습니다.', k: 'bad', fx: { h: -4 } })),
  E('yan_rescue_ex_ship', [tk('YAN_RESCUE', 'exchange')], [25, 55], 35, 2, (s) => ({ t: '로도스 아일랜드의 배에서 지냈습니다. 그쪽 의료진은 감염자를 환자라고 불렀고, 그 말이 귀에 오래 남았습니다.', k: 'note', fx: { cap: { learn: 0.03 } } })),
  E('yan_rescue_ex_report', [tk('YAN_RESCUE', 'exchange')], [25, 55], 30, 3, (s) => ({ t: '교환 보고서를 흠천감에 올렸습니다. 치료 이야기를 적었고, 적은 대로 읽힐지는 알 수 없었습니다.', k: 'note', fx: { standing: 2 } })),
  TRANS('YAN_RESCUE', {
    member: '구조대원이 되었습니다. 방호복에 제 이름이 적혔습니다.',
    leader: '조장이 되었습니다. 들어가는 순서를 정하는 사람이 되었습니다.',
    exchange: '로도스 교환 파견에 뽑혔습니다. 떠나기 전날 붕대를 하나하나 다시 접었습니다.',
  }),
  AFTER('YAN_RESCUE', {
    infected: '판정을 받고 한 해가 지났습니다. 구조하던 사람에서 구조 대상이 되는 데 종이 한 장이면 되었습니다.',
    injury: '현장에서 다치고 한 해가 지났습니다. 방호복은 반납했고, 흉터는 반납하지 못했습니다.',
    catastrophe: '재앙 현장에서 살아 나오고 한 해가 지났습니다. 조원 중 돌아오지 못한 이름을 매일 셌습니다.',
    _: '구조대를 떠나고 한 해가 지났습니다. 사이렌 소리에 아직 몸이 움직였습니다.',
  }),
  E('yan_aff_rescue_tianji', ['aff:YAN_RESCUE_TIANJI'], [18, 55], 25, 4, (s) => ({ t: '천극 관측망의 당직이었습니다. 하늘의 숫자를 적었고, 숫자가 튀면 마을 하나가 움직였습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),

  // YAN_STUDENT 학궁 수재 (A3 입구): local → academy → candidate
  E('yan_student_lc_lamp', [tk('YAN_STUDENT', 'local')], [8, 22], 35, 2, (s) => ({ t: '등잔 기름이 아까워 달빛에 글을 읽었습니다. 눈이 나빠졌고, 글은 늘었습니다.', k: 'ev', fx: { cap: { learn: 0.04 }, hl: -1 } })),
  E('yan_student_lc_sponsor', [tk('YAN_STUDENT', 'local')], [8, 22], 30, 4, (s) => ({ t: '마을 유지가 학비를 대 주겠다고 했습니다. 조건은 없다고 했고, 없다는 조건이 가장 무거웠습니다.', k: 'note', fx: { money: medX(s, 0.1), h: -1 } })),
  E('yan_student_ac_hall', [tk('YAN_STUDENT', 'academy')], [12, 26], 35, 2, (s) => { const n = s.rng.ri(20, 50) * 100; return { t: '학궁 강당에 시골 학생 ' + n.toLocaleString() + '명이 앉았습니다. 저도 그중 하나였고, 하나라는 것이 처음으로 작게 느껴졌습니다.', k: 'note', fx: { cap: { learn: 0.03 } }, f: F('학궁 입학 명부, ' + s.year + '년') }; }),
  E('yan_student_ac_cheat', [tk('YAN_STUDENT', 'academy')], [12, 26], 30, 4, (s) => ({ t: '시험 문제가 미리 돈다는 소문이 있었습니다. 사지 않았고, 산 사람들의 이름이 이듬해 체포 명부에 올랐습니다.', k: 'bad', fx: { h: -2 } })),
  E('yan_student_cd_exam', [tk('YAN_STUDENT', 'candidate')], [16, 30], 35, 2, (s) => ({ t: '시험장에 앉았습니다. 사흘 동안 같은 방이었고, 방을 나올 때 계절이 바뀌어 있었습니다.', k: 'ev', fx: { hl: -2, cap: { learn: 0.02 } } })),
  E('yan_student_cd_wait', [tk('YAN_STUDENT', 'candidate')], [16, 30], 30, 3, (s) => ({ t: '방이 붙는 날 아침, 이름을 찾았습니다. 없었고, 다음 해 같은 자리에서 다시 찾기로 했습니다.', k: 'bad', fx: { h: -3 } })),
  TRANS('YAN_STUDENT', {
    academy: '학궁에 들어갔습니다. 마을 사람들이 어귀까지 나와 배웅했습니다.',
    candidate: '응시생이 되었습니다. 책상 위에 붓과 등잔과 날짜만 남았습니다.',
  }),
  AFTER('YAN_STUDENT', {
    exile: '시험 부정에 연루되어 나라를 떠나고 한 해가 지났습니다. 책은 가져오지 못했습니다.',
    arrest: '시험 부정 조사로 갇히고 한 해가 지났습니다. 사지 않았다는 말은 기록에 남지 않았습니다.',
    ruin: '학비가 끊기고 한 해가 지났습니다. 고향에서는 글 읽는 사람을 일손으로 세지 않았습니다.',
    _: '학궁을 떠나고 한 해가 지났습니다. 책상은 팔았고 등잔은 남겼습니다.',
  }),
  E('yan_aff_student_baizhao', ['aff:YAN_STUDENT_BAIZHAO'], [8, 30], 25, 4, (s) => ({ t: '백조학궁의 도서관에 처음 들어갔습니다. 서가 끝이 보이지 않았고, 끝까지 가 보지 않기로 했습니다.', k: 'warm', fx: { cap: { learn: 0.03 } } })),
  E('yan_aff_student_jipu', ['aff:YAN_STUDENT_JIPU'], [8, 30], 25, 4, (s) => ({ t: '지푸 학원의 시험 부정 소문이 다시 돌았습니다. 학원 문 앞에 대리시 사람이 서 있었습니다.', k: 'bad', fx: { h: -2 } })),
  E('yan_aff_student_mangshan', ['aff:YAN_STUDENT_MANGSHAN'], [8, 30], 25, 4, (s) => ({ t: '망산 민간 학교의 선생은 한 분이었습니다. 책은 세 권이었고, 세 권을 다 외웠습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),

  // YAN_SUI 사세대 지촉인 (A8): junior → regulator → senior → overseer
  E('yan_sui_jr_archive', [tk('YAN_SUI', 'junior')], [18, 40], 35, 2, (s) => ({ t: '괴이실 서고에서 옛 기록을 정리했습니다. 읽지 말라는 문서가 있었고, 읽지 않았습니다.', k: 'ev', fx: { cap: { learn: 0.03 } } })),
  E('yan_sui_jr_oath', [tk('YAN_SUI', 'junior')], [18, 40], 30, 4, (s) => ({ t: '서약을 했습니다. 땅 밑의 이야기를 밖에 내지 않겠다는 것이었고, 그 뒤로 가족과 할 말이 줄었습니다.', k: 'note', fx: { h: -2, cap: { ties: -0.02 } } })),
  E('yan_sui_rg_watch', [tk('YAN_SUI', 'regulator')], [22, 55], 35, 2, (s) => ({ t: '지촉인으로 백조 아래를 순시했습니다. 벽이 따뜻한 곳이 있었고, 그 자리를 지도에 표시했습니다.', k: 'note', fx: { standing: 2 } })),
  E('yan_sui_rg_erosion', [tk('YAN_SUI', 'regulator')], [22, 55], 30, 4, (s) => ({ t: '순시 뒤 며칠 동안 꿈이 제 것이 아니었습니다. 보고서에는 "이상 없음"이라고 썼습니다.', k: 'bad', fx: { hl: -3, h: -2 } })),
  E('yan_sui_sr_shard', [tk('YAN_SUI', 'senior')], [30, 65], 35, 2, (s) => ({ t: '파편 하나의 움직임을 추적했습니다. 어느 마을의 그림 속에 있었고, 그림은 그대로 두었습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),
  E('yan_sui_sr_court', [tk('YAN_SUI', 'senior')], [30, 65], 30, 4, (s) => ({ t: '예부에 올릴 보고서를 썼습니다. 사실은 두 줄, 그 두 줄을 읽을 수 있는 사람은 다섯이었습니다.', k: 'note', fx: { standing: 1 } })),
  E('yan_sui_ov_decide', [tk('YAN_SUI', 'overseer')], [38, 75], 35, 2, (s) => ({ t: '감독관으로 봉인 하나를 열지 말지 정했습니다. 열지 않았고, 열지 않은 것이 옳았는지는 아무도 모릅니다.', k: 'ev', fx: { standing: 2, h: -1 } })),
  E('yan_sui_ov_1102', [tk('YAN_SUI', 'overseer')], [38, 75], 40, 5, (s) => ({ t: '백조의 땅이 흔들렸습니다. 사세대의 모든 지촉인이 지하로 내려갔고, 올라온 사람은 수를 세지 않았습니다.', k: 'bad', fx: { hl: -4, h: -4 } }), { c: (s) => yr(s, 1102, 1103) }),
  TRANS('YAN_SUI', {
    regulator: '지촉인이 되었습니다. 땅 밑을 지키는 사람의 이름을 받았습니다.',
    senior: '선임 지촉인이 되었습니다. 읽지 말라던 문서를 읽을 수 있게 되었습니다.',
    overseer: '감독관이 되었습니다. 봉인의 열쇠가 제 손에 왔습니다.',
  }),
  AFTER('YAN_SUI', {
    injury: '지하에서 다치고 한 해가 지났습니다. 땅 밑의 소리가 아직 귀에 남았습니다.',
    demotion: '좌천되고 한 해가 지났습니다. 서고의 가장 바깥 자리에서 다시 시작했습니다.',
    erosion: '침식을 겪고 한 해가 지났습니다. 꿈이 완전히 제 것으로 돌아오지는 않았습니다.',
    _: '사세대를 떠나고 한 해가 지났습니다. 서약은 떠나지 않았습니다.',
  }),
  E('yan_aff_sui_library', ['aff:YAN_SUI_LIBRARY'], [18, 75], 25, 4, (s) => ({ t: '백조 도서관의 지하 서가였습니다. 책보다 자물쇠가 많았고, 열쇠는 제게 하나였습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),

  // YAN_SHANHAI 산해중 신도 (A8): believer → cadre → leader
  E('yan_shanhai_bl_gather', [tk('YAN_SHANHAI', 'believer')], [14, 60], 35, 2, (s) => ({ t: '밤에 모여 땅 밑의 것을 불렀습니다. 대답은 없었고, 없는 대답이 믿음이었습니다.', k: 'note', fx: { cap: { ties: 0.02 }, h: 1 } })),
  E('yan_shanhai_bl_hide', [tk('YAN_SHANHAI', 'believer')], [14, 60], 30, 3, (s) => { const n = s.rng.ri(2, 9); return { t: '관군이 마을을 뒤졌습니다. 모임 자리는 치웠고, 사람은 치우지 못해 ' + n + '명이 끌려갔습니다.', k: 'bad', fx: { h: -3 }, f: orgF(s, '형부 체포 기록', s.year) }; }),
  E('yan_shanhai_cd_preach', [tk('YAN_SHANHAI', 'cadre')], [18, 65], 35, 2, (s) => ({ t: '옆 마을에 가서 말을 전했습니다. 흉년 든 마을이었고, 듣는 사람이 많았습니다.', k: 'ev', fx: { standing: 3 } })),
  E('yan_shanhai_cd_yumen', [tk('YAN_SHANHAI', 'cadre')], [18, 65], 40, 5, (s) => ({ t: '옥문으로 가자는 말이 위에서 내려왔습니다. 갔고, 성문 앞에서 많은 사람이 돌아오지 못했습니다.', k: 'bad', fx: { hl: -5, h: -4 } }), { c: (s) => yr(s, 1082) || yr(s, 1102) }),
  E('yan_shanhai_ld_lead', [tk('YAN_SHANHAI', 'leader')], [25, 75], 35, 2, (s) => ({ t: '교단을 이끌었습니다. 믿는 사람의 수를 세지 않았고, 관군이 대신 세었습니다.', k: 'note', fx: { standing: 2, h: -1 } })),
  E('yan_shanhai_ld_offer', [tk('YAN_SHANHAI', 'leader')], [25, 75], 30, 4, (s) => ({ t: '흉년 든 마을 하나가 통째로 들어오겠다고 했습니다. 받았고, 그 마을의 이름이 관군 지도에 표시되었습니다.', k: 'bad', fx: { standing: 3, h: -2 } })),
  TRANS('YAN_SHANHAI', {
    cadre: '간부가 되었습니다. 말을 듣는 자리에서 말을 하는 자리로 옮겼습니다.',
    leader: '교주가 되었습니다. 땅 밑의 것을 대신 말하는 사람이 되었습니다.',
  }),
  AFTER('YAN_SHANHAI', {
    arrest: '체포되고 한 해가 지났습니다. 옥 안에서도 밤이면 땅 밑을 생각했습니다.',
    heresy: '교단에서 쫓겨나고 한 해가 지났습니다. 밖의 사람들에게도 안의 사람들에게도 속하지 않았습니다.',
    purge: '토벌에서 살아 나오고 한 해가 지났습니다. 함께 모이던 사람들의 수를 더 이상 세지 않았습니다.',
    _: '교단을 떠나고 한 해가 지났습니다. 밤에 모이던 시간이 되면 잠이 깼습니다.',
  }),

  // ════════════════════════════════════════════════════════════════════════
  // 생업(A11) 계절·명절·동네 — YAN_FARM·YAN_RIVER·YAN_MESSENGER
  // ════════════════════════════════════════════════════════════════════════
  E('yan_season_newyear', ['arch:A11', ...YAN], [12, 90], 30, 3, (s) => ({ t: fest(s, 0) + '에 문에 붉은 종이를 붙였습니다. 글씨는 마을에서 글 아는 사람이 썼고, 값은 ' + cul(s).food + ' 한 그릇이었습니다.', k: 'warm', fx: { h: 2 } })),
  E('yan_season_moon', ['arch:A11', ...YAN], [12, 90], 30, 3, (s) => ({ t: fest(s, 1) + ' 밤이었습니다. 강변에 등을 띄웠고, 등 하나가 멀리 가는 것을 끝까지 보았습니다.', k: 'warm', fx: { h: 2 } })),
  E('yan_season_flood', ['arch:A11', ...YAN], [12, 90], 25, 4, (s) => { const n = s.rng.ri(20, 90); return { t: '우기에 강이 넘쳤습니다. 아랫마을 밭 ' + n + '마지기가 잠겼고, 윗마을이 쌀을 나눴습니다. 다음 해에는 반대였습니다.', k: 'bad', fx: { money: -medX(s, 0.05), cap: { ties: 0.02 } }, f: orgF(s, '수해 집계', s.year) }; }),
  E('yan_season_winter', ['arch:A11', ...YAN], [12, 90], 25, 4, (s) => ({ t: '겨울에 강이 얼었습니다. 뱃길이 닫혔고, 마을은 ' + eul(cul(s).drink) + ' 끓이며 얼음이 풀리기를 기다렸습니다.', k: 'note', fx: { h: 1 } })),
  E('yan_season_market', ['arch:A11', ...YAN], [12, 90], 30, 2, (s) => { const n = medX(s, 0.004) + 1; return { t: '장날이었습니다. 소금 한 되가 ' + n + ' LMD였고, 소문은 공짜였습니다. 북방 이야기가 반, 이동도시 이야기가 반이었습니다.', k: 'note' }; }),
  E('yan_season_teapick', ['arch:A11', ...YAN], [12, 90], 25, 3, (s) => ({ t: '찻잎 따는 철에 품앗이를 했습니다. 남의 밭에서 하루, 제 밭에서 하루. 저녁에는 같은 ' + eul(cul(s).drink) + ' 마셨습니다.', k: 'warm', fx: { cap: { ties: 0.02 } } })),
  E('yan_season_well', ['arch:A11', ...YAN], [12, 90], 25, 5, (s) => { const n = s.rng.ri(18, 45); return { t: '마을 우물을 다시 팠습니다. ' + n + '집이 하루씩 품을 냈고, 물이 나온 날 촌장이 첫 두레박을 떠서 땅에 부었습니다.', k: 'warm', fx: { h: 2 }, f: orgF(s, '마을 공역 기록', s.year) }; }),
  E('yan_season_tomb', ['arch:A11', ...YAN], [12, 90], 25, 4, (s) => ({ t: '조상 묘에 풀을 베러 갔습니다. 비석의 이름 중 모르는 이름이 늘었고, 아는 이름도 늘었습니다.', k: 'note', fx: { h: -1 } })),
  E('yan_season_rumor_north', ['arch:A11', ...YAN], [12, 90], 25, 4, (s) => ({ t: '북방에서 돌아온 군인이 마을에 들렀습니다. 안개 이야기를 했고, 아이들이 그날 밤 잠을 못 잤습니다.', k: 'note' })),

  // ════════════════════════════════════════════════════════════════════════
  // 캐논 인물 1회성 (D43)
  // ════════════════════════════════════════════════════════════════════════
  E('yan_canon_zuo_le', ['track:YAN_ARMY', 'aff:YAN_ARMY_YUMEN'], [16, 60], 40, 99, (s) => { seeCanon(s); return { t: '옥문 성벽 위에서 젊은 군관 하나가 서쪽 황야를 오래 내다보고 있었습니다. 좌락이라는 이름이었고, 병사들은 그 이름을 소리 내어 부르지 않았습니다.', k: 'note', fx: { h: 1 } }; }, { c: (s) => canonOk(s, 1095, 1106) }),
  E('yan_canon_yu_cheng', ['track:YAN_BUREAU'], [18, 70], 40, 99, (s) => { seeCanon(s); return { t: '순시 나온 어사가 관청 마당에 선 채로 장부 한 권을 끝까지 넘겼습니다. 유청이라는 이름을 나중에 들었습니다. 그날 관청에서 가장 조용한 사람이었습니다.', k: 'note', fx: { h: -1 } }; }, { c: (s) => canonOk(s, 1094, 1106) }),
  E('yan_canon_chongyue', ['track:YAN_RIVER'], [12, 70], 40, 99, (s) => { seeCanon(s); return { t: '강가 찻집에 늙은 무인이 앉아 있었습니다. 지나가던 아이의 국수 값을 대신 치렀고, 이름을 묻자 총웨라고만 했습니다.', k: 'warm', fx: { h: 2 } }; }, { c: (s) => canonOk(s, 1080, 1104) }),
  E('yan_canon_chongyue_wuxia', ['track:YAN_WUXIA'], [8, 70], 40, 99, (s) => { seeCanon(s); return { t: '결투장 구석에서 늙은 무인이 한 수를 보여 주었습니다. 한 번뿐이었고, 총웨라는 이름은 떠난 뒤에 들었습니다.', k: 'warm', fx: { cap: { skill: 0.03 } } }; }, { c: (s) => canonOk(s, 1080, 1104) }),
  E('yan_canon_mulberry', ['track:YAN_RESCUE'], [18, 55], 40, 99, (s) => { seeCanon(s); return { t: '교환 파견 1기로 뽑힌 대원이 떠나기 전날 텐트 앞에서 붕대를 하나하나 다시 접고 있었습니다. 멀베리라는 대원이었고, 인사는 짧았습니다.', k: 'note', fx: { h: 1 } }; }, { c: (s) => canonOk(s, 1098, 1105) }),

  // ════════════════════════════════════════════════════════════════════════
  // 신참·관계 등급·방문
  // ════════════════════════════════════════════════════════════════════════
  E('yan_newcomer_hubu', ['newcomer', ...YAN], [10, 80], 40, 2, (s) => ({ t: '호부에 거주 신고를 했습니다. 서리는 출신국을 두 번 물었고, 두 번째에는 다른 칸에 적었습니다.', k: 'note', fx: { h: -1 } })),
  E('yan_newcomer_tea', ['newcomer', ...YAN], [10, 80], 35, 3, (s) => ({ t: '이웃이 ' + eul(cul(s).drink) + ' 냈습니다. 말은 반도 알아듣지 못했고, 잔이 비면 채워졌습니다.', k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } })),
  E('yan_newcomer_dialect', ['newcomer', ...YAN], [10, 80], 35, 3, (s) => ({ t: '시장에서 값을 물었습니다. 발음 때문에 외지 사람인 것이 들통났고, 값이 조금 올랐습니다.', k: 'bad', fx: { money: -medX(s, 0.02) } })),
  E('yan_rel_cultural', ['rel:cultural', ...YAN], [10, 80], 30, 3, (s) => ({ t: '마을 잔치에 자리는 있었습니다. 상의 끝자리였고, 그 자리가 ' + s.race.name + ' 자리라는 것을 아무도 말하지 않았습니다.', k: 'note', fx: { h: -2 } })),
  E('yan_rel_institutional', ['rel:institutional', ...YAN], [10, 80], 30, 3, (s) => ({ t: '관청 서류의 종족 칸에 ' + eul(s.race.name) + ' 적었습니다. 서리가 그 칸을 보고 다른 창구를 가리켰습니다.', k: 'bad', fx: { h: -2 } })),
  E('yan_rel_favored', ['rel:favored', ...YAN], [10, 80], 25, 4, (s) => ({ t: '관청 줄에서 서리가 먼저 불렀습니다. 이유는 묻지 않아도 알았고, 뒤에 선 사람들도 알았습니다.', k: 'note', fx: { h: 1 } })),
  E('yan_visit_inn', ['visit:yan'], [12, 80], 30, 3, (s) => ({ t: '염국의 객잔에 묵었습니다. 방값에 ' + iga(cul(s).drink) + ' 들어 있었고, 아침에는 ' + cul(s).food + ' 냄새가 났습니다.', k: 'note', fx: { h: 1 } })),
  E('yan_visit_checkpoint', ['visit:yan'], [12, 80], 30, 3, (s) => ({ t: '염국 관문에서 통행증을 보였습니다. 서리가 도장을 세 개 찍었고, 세 번째 도장은 처음 보는 것이었습니다.', k: 'note' })),
  E('yan_visit_chidao', ['visit:yan'], [12, 80], 25, 4, (s) => ({ t: '치다오를 따라 염국을 지났습니다. 길가 마을이 비어 있었고, 빈 마을 앞에 이동도시 모집 벽보가 붙어 있었습니다.', k: 'note', fx: { h: -1 } })),
];

// ════════════════════════════════════════════════════════════════════════
// 결정
// ════════════════════════════════════════════════════════════════════════
const stageIs = (s, id, ...st) => !!s.S.track && s.S.track.id === id && st.includes(s.stage.id);
const yanOnly = (s) => s.S.cur === 'yan';
const lgmOnly = (s) => s.S.cur === 'lungmen';

export const decisions = {
  // ── 농민: 이동도시 공장 모집 계약 ──
  yan_farm_factory: {
    tags: ['track:YAN_FARM', ...YAN], once: false, gap: 6,
    ok: (s) => stageIs(s, 'YAN_FARM', 'tenant', 'own') && s.S.age <= 40 && s.rng.chance(0.25),
    build: (s) => ({ title: '모집인', body: '이동도시 공장 모집인이 마을에 왔습니다. 계약서에는 기숙사와 급료가 적혀 있었고, 돌아오는 날은 적혀 있지 않았습니다.',
      choices: [{ k: 'stay', label: '남는다', sub: '밭과 마을', auto: 2 }, { k: 'sign', label: '서명한다', sub: '이동도시 민간 고용', auto: 1 }] }),
    apply: (s, k) => { if (k === 'stay') return { t: '서명하지 않았습니다. 모집인은 다음 마을로 갔습니다.', k: 'note' }; return s.switchTrack('YAN_OFFICE', 'switch') ? false : { t: '계약은 이루어지지 않았습니다.', k: 'note' }; },
  },
  // ── 촌장: 마을 감염자 신고 ──
  yan_chief_report: {
    tags: [tk('YAN_FARM', 'chief'), ...YAN], once: false, gap: 5,
    ok: (s) => stageIs(s, 'YAN_FARM', 'chief') && s.rng.chance(0.3),
    build: (s) => ({ title: '신고', body: '마을에 감염자가 나왔습니다. 호부에 올리면 그 집은 마을을 떠나야 하고, 올리지 않으면 촌장이 책임집니다.',
      choices: [{ k: 'report', label: '호부에 올린다', sub: '마을 평판 ↑, 한 집이 떠남', auto: 1.5 }, { k: 'hide', label: '올리지 않는다', sub: '발각되면 촌장 자리를 잃음', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'report') return { t: '호부에 올렸습니다. 그 집은 보름 뒤 떠났고, 떠나는 수레를 아무도 배웅하지 않았습니다.', k: 'bad', fx: { standing: 3, h: -3 } };
      if (s.rng.chance(0.35)) { s.fall('ruin'); return false; }
      return { t: '올리지 않았습니다. 그 집 아이는 올해도 마을 서당에 다녔습니다.', k: 'warm', fx: { h: 2, standing: -2 } };
    },
  },
  // ── 관료: 뇌물 ──
  yan_bureau_bribe: {
    tags: ['track:YAN_BUREAU', ...YAN], once: false, gap: 5,
    ok: (s) => stageIs(s, 'YAN_BUREAU', 'clerk', 'middle') && s.rng.chance(0.3),
    build: (s) => { const amt = medX(s, 1.5); return { title: '봉투', body: '상인이 봉투를 두고 갔습니다. 안에는 ' + amt.toLocaleString() + ' LMD, 바라는 것은 허가 서류의 날짜 하나였습니다.',
      fact: orgF(s, '숙정원 적발 사례집', s.year),
      choices: [{ k: 'refuse', label: '돌려보낸다', sub: '평판 ↑', auto: 2 }, { k: 'take', label: '받는다', sub: '발각되면 탄핵', auto: 1 }] }; },
    apply: (s, k) => {
      if (k === 'refuse') return { t: '봉투를 돌려보냈습니다. 상인은 다른 방을 두드렸고, 그 방 문은 열렸습니다.', k: 'note', fx: { standing: 3 } };
      s.S.money += medX(s, 1.5); s.S.flags.yanBribed = (s.S.flags.yanBribed || 0) + 1;
      if (s.rng.chance(0.15 + 0.1 * s.S.flags.yanBribed)) { s.fall('impeach'); return false; }
      return { t: '봉투를 받았습니다. 날짜 하나를 고쳤고, 아무도 묻지 않았습니다.', k: 'bad', fx: { h: -2 } };
    },
  },
  // ── 관료: 상관 편들기 vs 숙정원 고발 ──
  yan_bureau_side: {
    tags: ['track:YAN_BUREAU', ...YAN], once: false, gap: 6,
    ok: (s) => stageIs(s, 'YAN_BUREAU', 'middle', 'shilang') && s.rng.chance(0.25),
    build: (s) => ({ title: '장부', body: '상관의 장부에서 맞지 않는 숫자를 찾았습니다. 숙정원에 알리면 상관이 끝나고, 덮으면 제가 상관의 사람이 됩니다.',
      choices: [{ k: 'cover', label: '덮는다', sub: '승급 가까워짐, 같이 무너질 수 있음', auto: 1.2 }, { k: 'report', label: '숙정원에 알린다', sub: '평판 ↑, 적이 생김', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'report') { s.S.flags.yanWhistle = s.S.age; return { t: '숙정원에 알렸습니다. 상관은 보름 뒤 사라졌고, 상관의 사람들은 남았습니다.', k: 'note', fx: { standing: 4, h: -2 } }; }
      s.S.flags.yanCovered = (s.S.flags.yanCovered || 0) + 1;
      if (s.rng.chance(0.4)) { s.promote({ quiet: false }); return { t: '덮었습니다. 상관이 기억했습니다.', k: 'note' }; }
      if (s.rng.chance(0.2)) { s.fall('purge'); return false; }
      return { t: '덮었습니다. 상관은 아무 말도 하지 않았고, 그것이 약속이었습니다.', k: 'note', fx: { standing: 2 } };
    },
  },
  // ── 과거 재응시 ──
  yan_exam_retry: {
    tags: [...YAN], once: false, gap: 2,
    ok: (s) => !s.S.track && !s.S.school && !s.S.prison && s.S.age >= 18 && s.S.age <= 40 && (s.S.flags.examFail_YAN_BUREAU || 0) >= 1 && (s.S.flags.examFail_YAN_BUREAU || 0) < 3 && s.rng.chance(0.6),
    build: (s) => ({ title: '다시 시험장으로', body: '관료 시험에 ' + s.S.flags.examFail_YAN_BUREAU + '번 떨어졌습니다. 올해도 방이 붙습니다.', fact: orgF(s, '관료 선발 응시 기록', s.year),
      choices: [{ k: 'retry', label: '다시 본다', sub: '한 해를 더 공부에 씀', auto: 1.5 }, { k: 'quit', label: '그만둔다', sub: '다른 길을 찾음', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'quit') { s.S.flags.examFail_YAN_BUREAU = 99; return { t: '책을 덮었습니다. 등잔은 팔지 않았습니다.', k: 'note', fx: { h: -2 } }; }
      s.eff({ cap: { learn: 0.05 } });
      return s.enterTrack('YAN_BUREAU', { via: 'exam', how: 'enter' }) ? false : { t: '올해도 방에 이름이 없었습니다.', k: 'bad', fx: { h: -3 } };
    },
  },
  // ── 군인: 마을 소각 명령 ──
  yan_army_village_order: {
    tags: ['track:YAN_ARMY', ...YAN], once: false, gap: 6,
    ok: (s) => stageIs(s, 'YAN_ARMY', 'officer', 'canzhi') && s.rng.chance(0.2),
    build: (s) => ({ title: '명령', body: '산해중이 숨은 마을을 비우라는 명령이 내려왔습니다. 마을에는 산해중이 아닌 사람이 더 많았습니다.',
      choices: [{ k: 'obey', label: '명령대로 한다', sub: '군공 ↑', auto: 1.5 }, { k: 'delay', label: '하루를 끈다', sub: '사람들이 빠져나갈 시간, 군법회의 가능', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'obey') return { t: '명령대로 했습니다. 보고서는 한 장이었고, 그 한 장을 오래 들고 있었습니다.', k: 'bad', fx: { standing: 5, h: -5 } };
      if (s.rng.chance(0.3)) { s.fall('courtmartial'); return false; }
      return { t: '하루를 끌었습니다. 다음 날 마을은 비어 있었고, 보고서에는 "저항 없음"이라고 썼습니다.', k: 'note', fx: { h: 1, standing: -2 } };
    },
  },
  // ── 군인: 전시 탈영 ──
  yan_army_desert: {
    tags: [tk('YAN_ARMY', 'private'), 'war', ...YAN], once: true,
    ok: (s) => stageIs(s, 'YAN_ARMY', 'private') && !!s.S.flags.war && s.rng.chance(0.3),
    build: (s) => ({ title: '밤', body: '전선이 무너지고 있습니다. 같은 막사의 둘이 오늘 밤 떠난다고 했습니다.',
      choices: [{ k: 'stay', label: '남는다', auto: 2 }, { k: 'go', label: '같이 떠난다', sub: '탈영', auto: 1 }] }),
    apply: (s, k) => { if (k === 'stay') return { t: '남았습니다. 아침에 둘의 자리가 비어 있었고, 저녁에는 셋의 자리가 비어 있었습니다.', k: 'note', fx: { h: -2 } }; s.fall('desert'); return false; },
  },
  // ── 천사: 북방 파견 자원 ──
  yan_tianshi_north: {
    tags: ['track:YAN_TIANSHI', ...YAN], once: false, gap: 5,
    ok: (s) => stageIs(s, 'YAN_TIANSHI', 'tianshi', 'shouye') && s.rng.chance(0.3),
    build: (s) => ({ title: '북방', body: '천기각 연례 파견 명단을 짭니다. 이름을 올리면 한 해를 안개 속에서 보냅니다.',
      choices: [{ k: 'go', label: '이름을 올린다', sub: '평판 ↑, 부상 위험', auto: 1 }, { k: 'no', label: '올리지 않는다', auto: 1.2 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '올리지 않았습니다. 명단은 저 없이도 채워졌습니다.', k: 'note', fx: { standing: -1 } };
      if (s.rng.chance(0.2)) { s.fall('injury'); return false; }
      return { t: '북방에서 한 해를 보냈습니다. 돌아왔을 때 산 아래 마을이 낯설었습니다.', k: 'ev', fx: { standing: 6, hl: -3, cap: { arts: 0.04 } } };
    },
  },
  // ── 강변: 수적 입단 ──
  yan_river_join_pirates: {
    tags: ['track:YAN_RIVER', ...YAN], once: true,
    ok: (s) => stageIs(s, 'YAN_RIVER', 'boat', 'boatman') && s.S.age <= 30 && yr(s, 1000, 1095) && s.rng.chance(0.3),
    build: (s) => ({ title: '강굽이', body: '옛 수적 씨족의 잔당이 배에 올랐습니다. 노 젓는 솜씨를 보았다고 했고, 강 위에 아직 자리가 있다고 했습니다.',
      choices: [{ k: 'no', label: '거절한다', auto: 1.5 }, { k: 'yes', label: '따라간다', sub: '수적·산적', auto: 1 }] }),
    apply: (s, k) => { if (k === 'no') return { t: '거절했습니다. 그 사람은 다음 나루에서 내렸습니다.', k: 'note' }; return s.switchTrack('YAN_OUTLAW', 'switch') ? false : { t: '배가 떠났고, 저는 남았습니다.', k: 'note' }; },
  },
  // ── 산해중 포교 ──
  yan_shanhai_recruit: {
    tags: [...YAN], once: true,
    ok: (s) => s.S.age >= 14 && s.S.age <= 40 && poor(s) && !s.S.prison && !s.S.school && (!s.S.track || ['YAN_FARM', 'YAN_RIVER'].includes(s.S.track.id)) && s.rng.chance(0.08),
    build: (s) => ({ title: '밤의 모임', body: '옆집 사람이 밤 모임에 같이 가자고 했습니다. 땅 밑의 것이 흉년을 끝내 준다고 했습니다.',
      choices: [{ k: 'no', label: '가지 않는다', auto: 2 }, { k: 'go', label: '따라간다', sub: '산해중 신도', auto: 1 }] }),
    apply: (s, k) => { if (k === 'no') return { t: '가지 않았습니다. 옆집은 그 뒤로 밤마다 비어 있었습니다.', k: 'note' }; return (s.S.track ? s.switchTrack('YAN_SHANHAI', 'switch') : s.enterTrack('YAN_SHANHAI', { via: 'preach' })) ? false : { t: '모임은 그날 열리지 않았습니다.', k: 'note' }; },
  },
  // ── 무림: 결투 신청 ──
  yan_wuxia_challenge: {
    tags: [tk('YAN_WUXIA', 'wulin'), ...YAN], once: false, gap: 4,
    ok: (s) => stageIs(s, 'YAN_WUXIA', 'wulin') && s.rng.chance(0.3),
    build: (s) => ({ title: '도전장', body: '이름난 무인에게서 도전장이 왔습니다. 이기면 강호에 이름이 서고, 지면 몸이 상합니다.',
      choices: [{ k: 'accept', label: '받는다', auto: 1.2 }, { k: 'decline', label: '사양한다', sub: '평판 ↓', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'decline') return { t: '사양했습니다. 강호에서는 사양도 소문이 되었습니다.', k: 'note', fx: { standing: -3 } };
      const w = s.rng.chance(0.35 + s.S.cap.skill * 0.12);
      if (w) { s.promote(); return { t: '이겼습니다. 다음 날 아침 객잔 벽에 제 이름이 적혀 있었습니다.', k: 'warm', fx: { standing: 6, h: 3 } }; }
      if (s.rng.chance(0.3)) { s.fall('injury'); return false; }
      return { t: '졌습니다. 상대가 칼을 거두었고, 그것이 강호의 예였습니다.', k: 'bad', fx: { hl: -6, standing: -2 } };
    },
  },
  // ── 민간 고용: 계약 만료 귀향 ──
  yan_office_go_home: {
    tags: [tk('YAN_OFFICE', 'staff'), ...YAN], once: false, gap: 5,
    ok: (s) => stageIs(s, 'YAN_OFFICE', 'staff') && s.S.age - s.S.track.since >= 3 && s.rng.chance(0.3),
    build: (s) => ({ title: '계약 만료', body: '계약 기간이 끝났습니다. 회사는 갱신을 제안했고, 고향에서는 밭이 비어 있다는 편지가 왔습니다.',
      choices: [{ k: 'renew', label: '갱신한다', auto: 1.5 }, { k: 'home', label: '고향으로 돌아간다', sub: '농민', auto: 1 }] }),
    apply: (s, k) => { if (k === 'renew') return { t: '갱신했습니다. 기숙사 창의 풍경이 한 해 더 바뀌기로 했습니다.', k: 'note' }; return s.switchTrack('YAN_FARM', 'switch') ? false : { t: '돌아갈 밭이 이미 남의 것이었습니다.', k: 'bad' }; },
  },

  // ── 혼인 유형 덮어쓰기(염국 전용 문구, 다른 나라는 엔진 문구로 위임) ──
  marry_arranged: marryOverride('arranged', (s, t, pr) => ({ title: t.name, body: '중매쟁이가 ' + wa(pr.name) + '의 사주를 들고 왔습니다. 양가 어른이 먼저 만났고, 당사자는 나중에 만났습니다. 지참금 ' + Math.round(s.med * t.dowry).toLocaleString() + ' LMD.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람입니다.' : ''),
    choices: [{ k: 'accept', label: '받아들인다', sub: '양가가 정한 날에 혼례', auto: 2.2 }, { k: 'hold', label: '보류한다', sub: '한 해 더 본다', auto: 0.8 }, { k: 'decline', label: '거절한다', sub: '집안의 뜻을 거스름', auto: 0.5 }] })),
  marry_clan: marryOverride('clan', (s, t, pr) => ({ title: t.name, body: '가문끼리 혼약이 오갔습니다. ' + wa(pr.name) + '의 혼인은 두 집안의 일이었고, 지참금 ' + Math.round(s.med * t.dowry).toLocaleString() + ' LMD는 그 일의 값이었습니다.',
    choices: [{ k: 'accept', label: '받아들인다', sub: '가문의 결속', auto: 2.5 }, { k: 'hold', label: '보류한다', auto: 0.6 }, { k: 'decline', label: '거절한다', sub: '가문과 틀어짐', auto: 0.3 }] })),
  marry_village: marryOverride('village', (s, t, pr) => ({ title: t.name, body: wa(pr.name) + '의 혼담이 마을에 돌았습니다. 촌장이 날을 잡고, 집집이 ' + cul(s).food + ' 한 그릇씩 냈습니다.',
    choices: [{ k: 'accept', label: '받아들인다', sub: '마을 혼례', auto: 2 }, { k: 'hold', label: '보류한다', auto: 1 }, { k: 'decline', label: '거절한다', auto: 0.7 }] })),

  // ── 주거 덮어쓰기(염국 전용 문구) ──
  // 같은 id 를 용문 파일에서도 등록하면 뒤에 등록한 쪽만 남으므로, 염국·용문 둘 다 여기서 분기한다(lungmen.js 는 등록하지 않음).
  home_change: {
    ...ENGINE_DECISIONS.home_change,
    build: (s) => { const v = ENGINE_DECISIONS.home_change.build(s); if (!v) return v;
      if (yanOnly(s)) { v.title = '집'; v.body = s.S.urban ? '플레이트 한 칸을 살 만큼 모였습니다. 이동도시의 집은 땅이 아니라 자리를 사는 것이었습니다.' : '마을에 집을 지을 만큼 모였습니다. 터를 보러 촌장이 같이 갔습니다.'; }
      else if (lgmOnly(s)) { v.title = '집'; v.body = '아파트 한 칸을 살 만큼 모였습니다. 용문에서 집은 층수로 불렸고, 층수가 곧 값이었습니다.'; }
      else return v;
      for (const c of v.choices) if (c.k === 'no') c.label = '그대로 산다'; return v; },
  },
  // ── 진로 선택 덮어쓰기(염국 본토·용문 문구) ──
  track_choose: {
    ...ENGINE_DECISIONS.track_choose,
    build: (s) => { const v = ENGINE_DECISIONS.track_choose.build(s); if (!v) return v;
      if (yanOnly(s)) { v.title = '길'; v.body = s.S.urban ? '이동도시에 자리가 몇 있습니다. 고르면 당분간은 그 길입니다.' : '마을에서 갈 수 있는 길이 몇 있습니다. 고르면 당분간은 그 길입니다.'; }
      else if (lgmOnly(s)) { v.title = '길'; v.body = (s.S.home.deck === 'under' ? '빈민가에서 올라갈 수 있는 자리가 몇 있습니다.' : '구인 광고판에 자리가 몇 있습니다.') + ' 고르면 당분간은 그 길입니다.'; }
      else return v;
      for (const c of v.choices) if (c.k === 'wait') { c.label = '한 해 더 본다'; c.sub = '소득 없음'; } return v; },
  },
  // ── 격리 구역 내 혼인(여러 나라가 같은 유형 id 를 쓴다 — 염국·용문만 전용 문구) ──
  marry_infected_only: marryOverride('infected_only', (s, t, pr) => ({ title: t.name, body: (lgmOnly(s) ? '빈민가 안에서 ' : '격리 구역 안에서 ') + wa(pr.name) + '의 혼담이 오갔습니다. 둘 다 감염자였고, 그래서 혼담이 가능했습니다.',
    choices: [{ k: 'accept', label: '받아들인다', sub: '같은 구역, 같은 병', auto: 2 }, { k: 'hold', label: '보류한다', auto: 0.8 }, { k: 'decline', label: '거절한다', auto: 0.6 }] }), ['yan', 'lungmen']),
};

/** marry_<type> 덮어쓰기: 염국에서 그 유형일 때만 전용 문구, 아니면 엔진 공통 문구. ok/apply 는 엔진 것을 그대로 */
/** nations: 전용 문구를 쓸 거주국 목록. 그 밖의 나라에서는 엔진 공통 문구 */
export function marryOverride(typeId, buildMine, nations = ['yan']) {
  const base = ENGINE_DECISIONS.marry;
  return {
    ...base, id: 'marry_' + typeId,
    ok: (s) => { const ok = base.ok(s); return ok && s.S.flags.y_marry && s.S.flags.y_marry.v && s.S.flags.y_marry.v.type.id === typeId; },
    build: (s, p) => { const r = s.S.flags.y_marry && s.S.flags.y_marry.v; if (!r) return null; if (!nations.includes(s.S.cur)) return base.build(s, p); Object.assign(p, r); return buildMine(s, r.type, r.prospect); },
  };
}

// W11: 엔진 id 와 같은 결정은 국가 디스패처로 옮긴다(여러 파일이 같은 id 를 등록해도 거주국별로 분기)
hoist(decisions, { marry_arranged: ['yan'], marry_clan: ['yan'], marry_village: ['yan'], marry_infected_only: ['yan', 'lungmen'], home_change: ['yan', 'lungmen'], track_choose: ['yan', 'lungmen'] });

export default { events, decisions };

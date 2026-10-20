// W9a 용문(lungmen) 진로 콘텐츠. data/tracks/lungmen.json 의 11 진로 전부를 덮는다.
// 핵심 5: LGM_SLUM·LGM_CORP·LGM_SHOP·LGM_MESSENGER·LGM_LGD(단계마다 4 + 전환 + 몰락 후일담 + 결정).
// 나머지 6: LGM_TRIAD·LGM_SECURITY·LGM_BUTLER·LGM_FIRE·LGM_DETECTIVE·LGM_STUDENT(단계마다 2 + 전환 + 후일담).
// 그 밖에 이동도시 플레이트·야시장·빈민가 생활 이벤트, 소속(aff:) 변주, 캐논 인물 1회성(D43), 신참·관계 등급·방문 이벤트,
// 1096~97년 사변 전후·빈민가(nomadic_under)·격리구역(home:quarantine)·염국 하위 지역(nation:yan) 이벤트, 혼인 결정 덮어쓰기.
// home_change·track_choose·marry_infected_only 는 염국 파일(yan.js)이 두 나라 몫을 한 번에 등록한다(같은 id 중복 등록 방지).
// 담백한 "~했습니다"체. 각주 f 는 본문에 숫자가 있을 때만, 세계관 안의 출처(근위국 호적과 등)로. 조사는 text.js 유틸. 콜백 첫 인자는 ctx(=sim).
import { eul, iga, eun, wa, ro, ieot, rago } from '../../src/engine/text.js';
import { cul, org, fest, F, orgF, given, poor, rich, medX, lifeRoll, once } from '../_util.js';
import { marryOverride } from './yan.js';
import { hoist } from '../_dispatch.js';

// ── 도우미 ──────────────────────────────────────────────────────────────
const tk = (id, st) => 'track:' + id + ':' + st;
const pick = (s, list) => s.rng.pick(list);
const yr = (s, a, b) => s.year >= a && s.year <= (b ?? a);
const partner = (s) => (s.S.fam.partner && s.S.fam.partner.alive ? s.S.fam.partner : null);
const kids = (s) => s.S.fam.kids.filter((k) => k.alive);
const under = (s) => s.S.home.deck === 'under';
const promoted = (s, id) => { const h = s.S.trackHist[s.S.trackHist.length - 1]; return !!s.S.track && s.S.track.id === id && s.S.track.stage > 0 && !!h && h.how === 'promo' && h.id === id && h.to === s.S.age - 1; };
const firstYear = (s, id) => !!s.S.track && s.S.track.id === id && s.S.age - s.S.track.since === 1;
const fell = (s, id) => s.S.flags.lastFallAt != null && s.S.age - s.S.flags.lastFallAt === 1 && (s.S.flags.lastTrack === id || (!!s.S.track && s.S.track.id === id && s.S.flags.lastFallOutcome === 'demote'));
const fallText = (s, map) => { const c = s.S.flags.lastFall; const t = map[c] || map._; return typeof t === 'function' ? t(s) : t; };
const canonOk = (s, y0, y1) => yr(s, y0, y1) && (s.S.flags.canonSeen || 0) < 3;
const seeCanon = (s) => { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; };
const E = (id, tags, a, w, gap, run, extra = {}) => ({ id, tags: Array.isArray(tags) ? tags : [tags], a, w, gap, run, ...extra });
const TRANS = (id, map) => E(id.toLowerCase() + '_promo', ['track:' + id], [10, 90], 120, 1, (s) => { const t = map[s.stage.id]; return typeof t === 'function' ? t(s) : { t, k: 'ev', fx: { h: 1 } }; }, { c: (s) => promoted(s, id) && !!map[s.stage.id] });
const AFTER = (id, map) => E(id.toLowerCase() + '_after', ['lungmen'], [10, 95], 150, 2, (s) => ({ t: fallText(s, map), k: 'loss' }), { c: (s) => fell(s, id) });
const stageIs = (s, id, ...st) => !!s.S.track && s.S.track.id === id && st.includes(s.stage.id);
const LGM = ['lungmen'];
/** 생활 이벤트가 붙는 생업형 진로(빈민가 노점·점원·사용인) */
const LIVING = ['LGM_SLUM', 'LGM_SHOP', 'LGM_BUTLER'];
const living = (s) => !!s.S.track && LIVING.includes(s.S.track.id);

export const events = [
  // ════════════════════════════════════════════════════════════════════════
  // LGM_SLUM 빈민가 노점 (핵심, A1) — helper → stall → greytail → heir
  // ════════════════════════════════════════════════════════════════════════
  E('lgm_slum_first', ['track:LGM_SLUM'], [10, 45], 90, 4, (s) => {
    const v = s.S.track.flags.via;
    const t = v === 'ratking' ? '래트킹의 사람이 자리를 하나 내주었습니다. 자릿세는 없다고 했고, 없다는 말이 가장 비쌌습니다.'
      : v === 'fallen' ? '위에서 내려온 처지였습니다. 빈민가 노점 뒤에 앉아 첫 손님을 기다렸고, 손님은 제 옷을 먼저 보았습니다.'
      : '빈민가 노점 옆에 앉아 생선을 손질했습니다. 비린내는 사흘 만에 익숙해졌고, 시선은 익숙해지지 않았습니다.';
    return { t, k: 'ev', fx: { cap: { ties: 0.03 } } };
  }, { c: (s) => firstYear(s, 'LGM_SLUM') }),
  // helper
  E('lgm_slum_hp_fish', [tk('LGM_SLUM', 'helper')], [10, 45], 35, 2, (s) => { const n = s.rng.ri(10, 40); return { t: '새벽에 생선 ' + n + '마리를 받아 와 노점에 늘어놓았습니다. 팔리지 않은 것은 저녁이 되었습니다.', k: 'ev', fx: { cap: { skill: 0.02 } }, f: orgF(s, '야시장 노점 등록 대장', s.year) }; }),
  E('lgm_slum_hp_patrol', [tk('LGM_SLUM', 'helper')], [10, 45], 35, 2, (s) => ({ t: '근위국 순찰이 골목에 들어왔습니다. 노점을 치우는 데 숫자를 셋 셀 시간이 있었고, 둘에 치웠습니다.', k: 'note', fx: { h: -1 } })),
  E('lgm_slum_hp_rain', [tk('LGM_SLUM', 'helper')], [10, 45], 30, 3, (s) => ({ t: '위층 플레이트에서 물이 새어 내렸습니다. 빈민가의 비는 하늘이 아니라 천장에서 왔습니다.', k: 'bad', fx: { hl: -1, h: -1 } })),
  E('lgm_slum_hp_kid', [tk('LGM_SLUM', 'helper')], [10, 45], 30, 3, (s) => ({ t: '옆 노점 아이가 글자를 물었습니다. 아는 것을 가르쳐 주었고, 모르는 것은 같이 몰랐습니다.', k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } })),
  // stall
  E('lgm_slum_st_rent', [tk('LGM_SLUM', 'stall')], [14, 60], 35, 2, (s) => { const amt = medX(s, 0.05); return { t: '자릿세 ' + amt.toLocaleString() + ' LMD를 걷으러 사람이 왔습니다. 누구 사람인지는 묻지 않는 것이 빈민가의 법이었습니다.', k: 'bad', fx: { money: -amt }, f: F('빈민가 골목 장부, ' + s.year + '년') }; }),
  E('lgm_slum_st_front', [tk('LGM_SLUM', 'stall')], [14, 60], 30, 3, (s) => ({ t: '노점 뒤로 다른 물건이 오갔습니다. 장부는 둘이었고, 근위국에 보이는 것은 하나였습니다.', k: 'note', fx: { money: medX(s, 0.08), h: -1 } })),
  E('lgm_slum_st_night', [tk('LGM_SLUM', 'stall')], [14, 60], 35, 2, (s) => ({ t: '야시장 불이 켜지면 빈민가가 깨어났습니다. 위층 사람들도 내려왔고, 값은 위층 사람들에게만 달랐습니다.', k: 'warm', fx: { money: medX(s, 0.05), h: 1 } })),
  E('lgm_slum_st_infected', [tk('LGM_SLUM', 'stall')], [14, 60], 30, 3, (s) => ({ t: '단골 하나의 손목에 결정이 보였습니다. 아무 말도 하지 않았고, 다음 날도 같은 값에 팔았습니다.', k: 'note', fx: { h: -1 } })),
  // greytail
  E('lgm_slum_gt_territory', [tk('LGM_SLUM', 'greytail')], [20, 65], 35, 2, (s) => ({ t: '골목 셋이 제 구역이 되었습니다. 자릿세는 받되 가격은 올리지 않는 것이 래트킹의 규칙이었습니다.', k: 'ev', fx: { standing: 2, money: medX(s, 0.1) } })),
  E('lgm_slum_gt_triad', [tk('LGM_SLUM', 'greytail')], [20, 65], 30, 3, (s) => ({ t: '삼합회 사람이 구역 경계를 두고 찾아왔습니다. 차를 마셨고, 경계는 그대로였습니다.', k: 'note', fx: { h: -1, standing: 1 } })),
  E('lgm_slum_gt_lgd', [tk('LGM_SLUM', 'greytail')], [20, 65], 30, 3, (s) => ({ t: '근위국 경감이 비공식으로 찾아왔습니다. 서로 이름을 알았고, 서로 모르는 척했습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('lgm_slum_gt_orphans', [tk('LGM_SLUM', 'greytail')], [20, 65], 30, 4, (s) => ({ t: '구역 안 고아들의 끼니를 제 돈으로 댔습니다. 래트킹이 알았고, 아무 말도 하지 않았습니다.', k: 'warm', fx: { money: -medX(s, 0.08), standing: 3, h: 2 } })),
  // heir
  E('lgm_slum_hr_council', [tk('LGM_SLUM', 'heir')], [28, 75], 35, 2, (s) => ({ t: '래트킹 곁에 앉았습니다. 빈민가의 모든 다툼이 그 자리로 왔고, 반은 제가 들었습니다.', k: 'ev', fx: { standing: 2 } })),
  E('lgm_slum_hr_wei', [tk('LGM_SLUM', 'heir')], [28, 75], 30, 4, (s) => ({ t: '총경 쪽 사람과 자리를 가졌습니다. 빈민가를 두고 서로 필요한 것이 있었고, 그것을 말로 하지 않았습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  E('lgm_slum_hr_redevelop', [tk('LGM_SLUM', 'heir')], [28, 75], 30, 4, (s) => ({ t: '재개발 도면이 책상에 올라왔습니다. 골목 하나가 지워져 있었고, 그 골목에는 사람이 살았습니다.', k: 'bad', fx: { h: -2 } }), { c: (s) => yr(s, 1097, 1130) }),
  E('lgm_slum_hr_rhodes', [tk('LGM_SLUM', 'heir')], [28, 75], 30, 5, (s) => ({ t: '로도스 아일랜드 용문 사무소 사람이 왔습니다. 감염자를 치료하겠다고 했고, 빈민가는 치료라는 말을 오래 못 들은 곳이었습니다.', k: 'note', fx: { h: 1 } }), { c: (s) => yr(s, 1097, 1130) }),
  TRANS('LGM_SLUM', {
    stall: '제 노점을 가졌습니다. 자리 하나가 빈민가에서는 재산이었습니다.',
    greytail: '그레이테일이 되었습니다. 골목의 아이들이 제 이름을 알았습니다.',
    heir: '래트킹이 후계로 지목했습니다. 빈민가 전체가 그날 밤 조용히 그 소식을 알았습니다.',
  }),
  AFTER('LGM_SLUM', {
    arrest: '체포되고 한 해가 지났습니다. 감방에서 빈민가 소식은 벽을 타고 왔습니다.',
    purge: '숙청에서 살아 나오고 한 해가 지났습니다. 골목은 반이 비었고, 빈 자리에 새 사람이 왔습니다.',
    vendetta: '구역 다툼에서 살아남고 한 해가 지났습니다. 다친 몸으로는 노점 앞에 설 수 없었습니다.',
    _: '빈민가 노점을 접고 한 해가 지났습니다. 비린내는 옷에서 빠졌고, 골목은 기억에서 빠지지 않았습니다.',
  }),
  E('lgm_aff_slum_ratking', ['aff:LGM_SLUM_RATKING'], [10, 75], 25, 4, (s) => ({ t: '래트킹의 사람이 골목을 돌며 끼니를 나눴습니다. 받는 사람은 이름을 적지 않았고, 주는 사람도 적지 않았습니다.', k: 'warm', fx: { h: 2 } })),
  E('lgm_aff_slum_triadfront', ['aff:LGM_SLUM_TRIADFRONT'], [10, 75], 25, 4, (s) => ({ t: '점포 뒷방에서 삼합회 사람들이 모였습니다. 앞에서는 국수를 팔았고, 국수 값은 묻지 않는 값이었습니다.', k: 'note', fx: { h: -1, money: medX(s, 0.04) } })),
  E('lgm_aff_slum_candy', ['aff:LGM_SLUM_CANDY'], [10, 75], 25, 4, (s) => ({ t: '사탕가게에 아이들이 몰렸습니다. 돈이 없는 아이에게는 깨진 사탕을 주었고, 깨진 사탕이 늘 모자랐습니다.', k: 'warm', fx: { h: 2 } })),

  // ════════════════════════════════════════════════════════════════════════
  // LGM_CORP 대기업 사원 (핵심, A10) — staff → assistant → manager → exec
  // ════════════════════════════════════════════════════════════════════════
  E('lgm_corp_first', ['track:LGM_CORP'], [20, 40], 90, 4, (s) => ({ t: s.S.track.flags.via === 'graduate' ? '졸업장을 들고 입사했습니다. 사원증 사진은 긴장한 얼굴이었고, 그 얼굴로 몇 해를 다녔습니다.' : '경력 채용으로 들어갔습니다. 첫날 자리에 명패가 없었고, 명패는 한 달 뒤에 왔습니다.', k: 'ev', fx: { cap: { learn: 0.02 } } }), { c: (s) => firstYear(s, 'LGM_CORP') }),
  // staff
  E('lgm_corp_st_commute', [tk('LGM_CORP', 'staff')], [20, 60], 35, 2, (s) => ({ t: '아침 출근길에 플레이트 연결부가 흔들렸습니다. 모두가 손잡이를 잡았고, 아무도 고개를 들지 않았습니다.', k: 'note' })),
  E('lgm_corp_st_report', [tk('LGM_CORP', 'staff')], [20, 60], 35, 2, (s) => ({ t: '보고서를 썼습니다. 대리가 고쳤고, 부장이 다시 고쳤고, 임원은 제목만 읽었습니다.', k: 'ev', fx: { cap: { learn: 0.02 } } })),
  E('lgm_corp_st_rent', [tk('LGM_CORP', 'staff')], [20, 60], 30, 3, (s) => { const n = s.rng.ri(1, 3); return { t: '고층 임대 아파트 집세가 ' + n + '할 올랐습니다. 월급도 올랐고, 집세가 더 올랐습니다.', k: 'bad', fx: { money: -medX(s, 0.08), h: -1 }, f: orgF(s, '주거 임대료 통계', s.year) }; }),
  E('lgm_corp_st_canteen', [tk('LGM_CORP', 'staff')], [20, 60], 30, 3, (s) => ({ t: '점심에 동기들과 ' + eul(cul(s).food) + ' 먹었습니다. 이야기는 상사 이야기였고, 상사도 어디선가 같은 이야기를 하고 있을 것이었습니다.', k: 'warm', fx: { cap: { ties: 0.02 } } })),
  // assistant
  E('lgm_corp_as_junior', [tk('LGM_CORP', 'assistant')], [23, 62], 35, 2, (s) => ({ t: '신입 하나를 맡았습니다. 제가 들었던 말을 그대로 했고, 하면서 그 말이 틀렸다는 것을 알았습니다.', k: 'ev', fx: { standing: 2 } })),
  E('lgm_corp_as_client', [tk('LGM_CORP', 'assistant')], [23, 62], 30, 3, (s) => ({ t: '염국 본토 거래처를 만났습니다. 그쪽은 ' + eul(cul(s).drink) + ' 낯설어했고, 이쪽은 그쪽의 인사말을 낯설어했습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('lgm_corp_as_deadline', [tk('LGM_CORP', 'assistant')], [23, 62], 30, 3, (s) => ({ t: '마감 주간이었습니다. 사무실에서 사흘을 잤고, 집에 가니 식물이 죽어 있었습니다.', k: 'bad', fx: { hl: -2, h: -2 } })),
  E('lgm_corp_as_bonus', [tk('LGM_CORP', 'assistant')], [23, 62], 30, 3, (s) => { const good = s.rng.chance(0.5); return { t: '연말 상여가 나왔습니다. ' + (good ? '숫자가 생각보다 컸고, 그날 저녁 ' + eul(cul(s).food) + ' 두 그릇 시켰습니다.' : '숫자가 생각보다 작았고, 작은 숫자를 들고 야시장을 오래 걸었습니다.'), k: good ? 'warm' : 'bad', fx: good ? { money: medX(s, 0.3), h: 2 } : { h: -2 } }; }),
  // manager
  E('lgm_corp_mg_restructure', [tk('LGM_CORP', 'manager')], [30, 65], 35, 2, (s) => { const n = s.rng.ri(20, 200); return { t: '구조조정 명단 ' + n + '명이 내려왔습니다. 제 이름은 없었고, 제 부서 사람 이름은 있었습니다.', k: 'bad', fx: { h: -3, standing: 1 }, f: F('사내 인사 공고, ' + s.year + '년') }; }),
  E('lgm_corp_mg_golf', [tk('LGM_CORP', 'manager')], [30, 65], 30, 3, (s) => ({ t: '임원과의 자리에 불려 갔습니다. 일 이야기는 없었고, 없는 것이 일이었습니다.', k: 'note', fx: { cap: { ties: 0.02 }, money: -medX(s, 0.05) } })),
  E('lgm_corp_mg_lgd', [tk('LGM_CORP', 'manager')], [30, 65], 30, 4, (s) => ({ t: '근위국에서 회사 장부를 보러 왔습니다. 제 부서 것은 깨끗했고, 깨끗한 것이 오히려 눈에 띄었습니다.', k: 'note', fx: { h: -1 } })),
  E('lgm_corp_mg_kids', [tk('LGM_CORP', 'manager')], [30, 65], 30, 4, (s) => ({ t: '아이의 학교 행사에 처음 갔습니다. 아이가 저를 소개했고, 소개말이 "회사 다니는 사람"이었습니다.', k: 'note', fx: { h: -1 } }), { c: (s) => kids(s).length > 0 }),
  // exec
  E('lgm_corp_ex_board', [tk('LGM_CORP', 'exec')], [38, 70], 35, 2, (s) => ({ t: '이사회에 앉았습니다. 발언은 두 번이었고, 두 번 다 숫자였습니다.', k: 'ev', fx: { standing: 1 } })),
  E('lgm_corp_ex_wei', [tk('LGM_CORP', 'exec')], [38, 70], 30, 4, (s) => ({ t: '총경 주재 경제 간담회에 회사 대표로 갔습니다. 총경은 한 번 웃었고, 그 한 번이 그날의 기사였습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  E('lgm_corp_ex_columbia', [tk('LGM_CORP', 'exec')], [38, 70], 30, 4, (s) => ({ t: '컬럼비아 투자자가 왔습니다. 용문폐로 계산했고, 그쪽은 달러로 다시 계산했고, 둘의 숫자가 달랐습니다.', k: 'note' })),
  E('lgm_corp_ex_health', [tk('LGM_CORP', 'exec')], [38, 70], 30, 3, (s) => ({ t: '건강검진 결과가 왔습니다. 비서가 봉투를 열지 않고 건넸고, 저도 한동안 열지 않았습니다.', k: 'bad', fx: { hl: -2, h: -1 } })),
  TRANS('LGM_CORP', {
    assistant: '대리가 되었습니다. 명함의 글자가 하나 바뀌었고, 하는 일은 둘 늘었습니다.',
    manager: '부장이 되었습니다. 창가 자리가 생겼고, 창밖을 볼 시간은 없어졌습니다.',
    exec: '임원이 되었습니다. 방 하나와 비서 하나와 결재판 하나가 왔습니다.',
  }),
  AFTER('LGM_CORP', {
    layoff: '구조조정으로 나오고 한 해가 지났습니다. 사원증은 반납했고, 아침 알람은 아직 같은 시각에 울렸습니다.',
    overwork: '쓰러진 뒤 살아나고 한 해가 지났습니다. 회사는 꽃을 보냈고, 자리는 보내지 않았습니다.',
    bankrupt: '회사가 무너지고 한 해가 지났습니다. 밀린 월급은 소송 중이었고, 소송은 길었습니다.',
    _: '회사를 떠나고 한 해가 지났습니다. 점심시간이 되면 아직 배가 고팠습니다.',
  }),
  E('lgm_aff_corp_pharma', ['aff:LGM_CORP_PHARMA'], [20, 70], 25, 4, (s) => ({ t: '제약회사 연구동에서 광석병 억제제 이야기가 나왔습니다. 회의에서는 효과보다 값을 오래 말했습니다.', k: 'note', fx: { h: -1 } })),
  E('lgm_aff_corp_swire', ['aff:LGM_CORP_SWIRE'], [20, 70], 25, 4, (s) => ({ t: '스와이어 그룹 본사 로비였습니다. 가문 사람이 지나갔고, 모두가 일어섰고, 그 사람은 아무도 보지 않았습니다.', k: 'note', fx: { standing: 1 } })),
  E('lgm_aff_corp_mountaindash', ['aff:LGM_CORP_MOUNTAINDASH'], [20, 70], 25, 4, (s) => ({ t: '마운틴대쉬 본사에서 물류 배차표를 보았습니다. 용문 배달의 절반이 그 표 한 장이었습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),

  // ════════════════════════════════════════════════════════════════════════
  // LGM_SHOP 상업단지 점원 (핵심, A10) — clerk → manager → head
  // ════════════════════════════════════════════════════════════════════════
  E('lgm_shop_first', ['track:LGM_SHOP'], [15, 45], 90, 4, (s) => ({ t: s.S.track.flags.via === 'family' ? '집안 가게에 서기 시작했습니다. 손님은 제 얼굴을 어릴 때부터 알았고, 그래서 값을 깎으려 했습니다.' : '상업단지 가게에 점원으로 들어갔습니다. 유니폼은 한 치수 컸고, 한 해가 지나니 맞았습니다.', k: 'ev' }), { c: (s) => firstYear(s, 'LGM_SHOP') }),
  // clerk
  E('lgm_shop_cl_open', [tk('LGM_SHOP', 'clerk')], [15, 60], 35, 2, (s) => ({ t: '셔터를 올리는 것이 하루의 시작이었습니다. 셔터 소리가 상업단지 전체에서 같은 시각에 났습니다.', k: 'ev' })),
  E('lgm_shop_cl_customer', [tk('LGM_SHOP', 'clerk')], [15, 60], 35, 2, (s) => ({ t: '손님이 물건을 던지고 갔습니다. 주워서 제자리에 놓았고, 매니저는 보지 못한 척했습니다.', k: 'bad', fx: { h: -2 } })),
  E('lgm_shop_cl_milktea', [tk('LGM_SHOP', 'clerk')], [15, 60], 30, 3, (s) => ({ t: '쉬는 시간에 옆 가게 점원과 ' + eul(cul(s).drink) + ' 나눠 마셨습니다. 서로의 매니저 이야기를 했고, 이야기는 늘 같았습니다.', k: 'warm', fx: { cap: { ties: 0.02 }, h: 1 } })),
  E('lgm_shop_cl_festival', [tk('LGM_SHOP', 'clerk')], [15, 60], 30, 3, (s) => { const amt = medX(s, 0.1); return { t: fest(s, 0) + ' 대목이었습니다. 보름 동안 쉬는 날이 없었고, 보름 뒤 ' + amt.toLocaleString() + ' LMD 봉투 하나가 더 나왔습니다.', k: 'ev', fx: { money: amt, hl: -2 }, f: F('상업단지 급여 명세, ' + s.year + '년') }; }),
  // manager
  E('lgm_shop_mg_shift', [tk('LGM_SHOP', 'manager')], [20, 62], 35, 2, (s) => ({ t: '근무표를 제가 짰습니다. 야간을 누가 설지 정하는 일이었고, 밤에 그 이름들을 생각했습니다.', k: 'ev', fx: { standing: 2 } })),
  E('lgm_shop_mg_theft', [tk('LGM_SHOP', 'manager')], [20, 62], 30, 3, (s) => ({ t: '재고가 비었습니다. 경비는 화면을 돌려 보았고, 화면 속 사람은 제 점원이었습니다.', k: 'bad', fx: { h: -3 } })),
  E('lgm_shop_mg_landlord', [tk('LGM_SHOP', 'manager')], [20, 62], 30, 3, (s) => { const n = s.rng.ri(1, 3); return { t: '상업단지 임대료가 ' + n + '할 올랐습니다. 본사에 보고했고, 본사는 매출을 올리라고 했습니다.', k: 'bad', fx: { h: -2 }, f: F('상업단지 임대 고시, ' + s.year + '년') }; }),
  E('lgm_shop_mg_lgd', [tk('LGM_SHOP', 'manager')], [20, 62], 30, 4, (s) => ({ t: '근위국이 가게 앞 거리를 봉쇄했습니다. 손님은 끊겼고, 봉쇄 이유는 뉴스에 나오지 않았습니다.', k: 'note', fx: { money: -medX(s, 0.05) } })),
  // head
  E('lgm_shop_hd_branches', [tk('LGM_SHOP', 'head')], [28, 65], 35, 2, (s) => ({ t: '지점 셋의 매출표를 한 장에 놓고 보았습니다. 잘되는 지점과 안 되는 지점이 같은 거리에 있었습니다.', k: 'ev', fx: { money: medX(s, 0.1) } })),
  E('lgm_shop_hd_union', [tk('LGM_SHOP', 'head')], [28, 65], 30, 4, (s) => ({ t: '점원들이 모여서 왔습니다. 쉬는 날 이야기였고, 본사와 점원 사이에 제가 서 있었습니다.', k: 'note', fx: { h: -2, standing: 1 } })),
  E('lgm_shop_hd_plaza', [tk('LGM_SHOP', 'head')], [28, 65], 30, 4, (s) => ({ t: '상업단지 상인회 회장을 맡았습니다. 하는 일은 임대인과 싸우는 일이었고, 싸움은 늘 졌습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  E('lgm_shop_hd_own', [tk('LGM_SHOP', 'head')], [28, 65], 30, 5, (s) => ({ t: '제 가게를 낼까 생각했습니다. 권리금을 알아보았고, 알아본 숫자를 적어 서랍에 넣었습니다.', k: 'note' })),
  TRANS('LGM_SHOP', {
    manager: '매니저가 되었습니다. 열쇠와 근무표와 손님의 불평이 제 것이 되었습니다.',
    head: '총점장이 되었습니다. 셔터를 올리는 대신 올리는 사람을 보게 되었습니다.',
  }),
  AFTER('LGM_SHOP', {
    layoff: '해고되고 한 해가 지났습니다. 그 가게 앞을 지날 때는 길을 건넜습니다.',
    bankrupt: '가게가 문을 닫고 한 해가 지났습니다. 셔터에 붙은 임대 종이가 한 해 내내 그대로였습니다.',
    overwork: '쓰러진 뒤 살아나고 한 해가 지났습니다. 셔터 소리에 아직 몸이 움찔했습니다.',
    _: '가게를 그만두고 한 해가 지났습니다. 유니폼은 돌려주었습니다.',
  }),
  E('lgm_aff_shop_siausan', ['aff:LGM_SHOP_SIAUSAN'], [15, 65], 25, 4, (s) => ({ t: '조능산 상업단지의 세일 기간이었습니다. 통로가 사람으로 막혔고, 사람 사이로 상품이 지나갔습니다.', k: 'ev', fx: { hl: -1, money: medX(s, 0.04) } })),
  E('lgm_aff_shop_plaza', ['aff:LGM_SHOP_PLAZA'], [15, 65], 25, 4, (s) => ({ t: '파시 플라자에 관광객이 몰렸습니다. 염국 본토 말, 컬럼비아 말, 알아듣지 못하는 말. 값은 다 같았습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('lgm_aff_shop_hotpot', ['aff:LGM_SHOP_HOTPOT'], [15, 65], 25, 4, (s) => ({ t: '훠궈집 저녁이었습니다. 국물 냄새가 옷에 뱄고, 집에 가는 길에 사람들이 돌아보았습니다.', k: 'warm', fx: { h: 1 } })),

  // ════════════════════════════════════════════════════════════════════════
  // LGM_MESSENGER 메신저·물류 (핵심, A10, 순회) — messenger → escort → lead → owner
  // ════════════════════════════════════════════════════════════════════════
  E('lgm_msg_first', ['track:LGM_MESSENGER'], [16, 45], 90, 4, (s) => {
    const v = s.S.track.flags.via;
    const t = v === 'startup' ? '창업 붐에 올라탄 작은 배달 회사에 들어갔습니다. 사장은 저보다 어렸고, 사무실은 사장 집이었습니다.'
      : v === 'emperor' ? '면접에서 질문은 하나도 받지 않았습니다. 커피 취향만 물었고, 다음 날 출근하라고 했습니다.'
      : '배달 회사에 들어갔습니다. 첫 주에 오토바이를 한 번 넘어뜨렸고, 회사는 그것을 교육비로 쳤습니다.';
    return { t, k: 'ev', fx: { cap: { skill: 0.02 } } };
  }, { c: (s) => firstYear(s, 'LGM_MESSENGER') }),
  // messenger
  E('lgm_msg_ms_route', [tk('LGM_MESSENGER', 'messenger')], [16, 55], 35, 2, (s) => { const n = s.rng.ri(20, 45); return { t: '하루에 ' + n + '곳을 돌았습니다. 플레이트 이음새마다 속도를 줄였고, 줄이지 않는 날은 다쳤습니다.', k: 'ev', fx: { cap: { skill: 0.02 }, hl: -1 }, f: F('배달 회사 배차 기록, ' + s.year + '년') }; }),
  E('lgm_msg_ms_tip', [tk('LGM_MESSENGER', 'messenger')], [16, 55], 30, 3, (s) => ({ t: '고층 아파트 손님이 팁을 주었습니다. 빈민가 손님은 ' + eul(cul(s).drink) + ' 주었습니다. 어느 쪽이 더 남는지 계산하지 않았습니다.', k: 'warm', fx: { h: 2, money: medX(s, 0.02) } })),
  E('lgm_msg_ms_rain', [tk('LGM_MESSENGER', 'messenger')], [16, 55], 30, 3, (s) => ({ t: '재앙 경보가 내린 날도 배달은 있었습니다. 경보 수당이 붙었고, 수당보다 바람이 셌습니다.', k: 'bad', fx: { hl: -2, money: medX(s, 0.05) } })),
  E('lgm_msg_ms_package', [tk('LGM_MESSENGER', 'messenger')], [16, 55], 30, 3, (s) => ({ t: '내용물을 묻지 않는 소포가 있었습니다. 묻지 않았고, 받는 사람도 이름을 말하지 않았습니다.', k: 'note', fx: { h: -1 } })),
  // escort
  E('lgm_msg_es_guard', [tk('LGM_MESSENGER', 'escort')], [19, 58], 35, 2, (s) => ({ t: '호위 배달이었습니다. 짐보다 사람을 지켰고, 사람은 끝까지 짐이 무엇인지 말하지 않았습니다.', k: 'ev', fx: { standing: 2, money: medX(s, 0.08) } })),
  E('lgm_msg_es_info', [tk('LGM_MESSENGER', 'escort')], [19, 58], 30, 3, (s) => ({ t: '배달하면서 들은 것을 회사에 보고했습니다. 회사는 그것을 정보라고 불렀고, 정보에도 값이 있었습니다.', k: 'note', fx: { cap: { ties: 0.02 }, money: medX(s, 0.04) } })),
  E('lgm_msg_es_abroad', [tk('LGM_MESSENGER', 'escort')], [19, 58], 30, 3, (s) => { const at = s.res.itinerantAt && s.data.nationById[s.res.itinerantAt]; return { t: (at ? at.name + ' 파견이었습니다. ' : '국외 파견이었습니다. ') + '돌아오니 용문의 야시장 불빛이 다른 색으로 보였습니다.', k: 'note', fx: { cap: { learn: 0.02 } } }; }),
  E('lgm_msg_es_ambush', [tk('LGM_MESSENGER', 'escort')], [19, 58], 30, 4, (s) => ({ t: '배달 중 습격이 있었습니다. 짐은 지켰고, 동료 하나가 병원에 갔습니다.', k: 'bad', fx: { hl: -3, standing: 3 } })),
  // lead
  E('lgm_msg_ld_team', [tk('LGM_MESSENGER', 'lead')], [24, 62], 35, 2, (s) => ({ t: '배차를 제가 짰습니다. 위험한 길에 누구를 보낼지 정했고, 정한 뒤에는 무전기를 놓지 못했습니다.', k: 'ev', fx: { standing: 2, h: -1 } })),
  E('lgm_msg_ld_contract', [tk('LGM_MESSENGER', 'lead')], [24, 62], 30, 3, (s) => ({ t: '큰 거래처 하나를 따 왔습니다. 계약서의 숫자는 컸고, 조건은 더 컸습니다.', k: 'warm', fx: { money: medX(s, 0.15), standing: 3 } })),
  E('lgm_msg_ld_rival', [tk('LGM_MESSENGER', 'lead')], [24, 62], 30, 4, (s) => ({ t: '경쟁사가 제 팀원 둘을 데려갔습니다. 급료 차이였고, 그 차이를 저는 줄 수 없었습니다.', k: 'bad', fx: { h: -2, standing: -2 } })),
  E('lgm_msg_ld_1096', [tk('LGM_MESSENGER', 'lead')], [24, 62], 40, 5, (s) => ({ t: '사변 중에 배달 회사들이 구호 물자를 날랐습니다. 근위국 봉쇄선을 몇 번 넘었고, 넘을 때마다 다른 이름을 댔습니다.', k: 'ev', fx: { standing: 4, hl: -2 } }), { c: (s) => yr(s, 1096, 1097) }),
  // owner
  E('lgm_msg_ow_books', [tk('LGM_MESSENGER', 'owner')], [28, 70], 35, 2, (s) => ({ t: '회사 장부를 닫았습니다. 오토바이 열 대, 사람 열둘, 남은 돈은 한 달치였습니다.', k: 'ev', fx: { money: medX(s, 0.1) }, f: F('용문 상공 등기 연례 신고, ' + s.year + '년') })),
  E('lgm_msg_ow_penguin', [tk('LGM_MESSENGER', 'owner')], [28, 70], 30, 4, (s) => ({ t: '펭귄 로지스틱스에서 협력 제안이 왔습니다. 그쪽 조건은 좋았고, 그쪽 배달원들은 질문이 없었습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }), { c: (s) => yr(s, 1093, 1130) }),
  E('lgm_msg_ow_succession', [tk('LGM_MESSENGER', 'owner')], [28, 70], 30, 5, (s) => ({ t: kids(s).length ? '아이에게 회사를 물려줄까 생각했습니다. 아이는 오토바이보다 책을 좋아했습니다.' : '회사를 누구에게 넘길지 생각했습니다. 팀장 하나가 눈에 들어왔고, 눈에 들어온 것을 말하지 않았습니다.', k: 'note' })),
  E('lgm_msg_ow_license', [tk('LGM_MESSENGER', 'owner')], [28, 70], 30, 3, (s) => ({ t: '근위국 운송 허가를 갱신했습니다. 서류는 다섯 장, 기다린 날은 열흘이었습니다.', k: 'note', fx: { money: -medX(s, 0.05) } })),
  TRANS('LGM_MESSENGER', {
    escort: '호위·정보 업무로 옮겼습니다. 오토바이에 짐 대신 사람이 탔습니다.',
    lead: '팀장이 되었습니다. 무전기 소리가 꿈까지 따라왔습니다.',
    owner: '회사 대표가 되었습니다. 간판에 제 이름이 올라갔고, 빚도 제 이름으로 올라갔습니다.',
  }),
  AFTER('LGM_MESSENGER', {
    bankrupt: '회사가 망하고 한 해가 지났습니다. 오토바이는 압류되었고, 길은 아직 몸이 기억했습니다.',
    kia: '습격에서 살아 돌아오고 한 해가 지났습니다. 다친 다리로는 더 이상 배달을 할 수 없었습니다.',
    layoff: '해고되고 한 해가 지났습니다. 거리에서 옛 동료의 오토바이 소리를 먼저 알아들었습니다.',
    _: '배달 일을 그만두고 한 해가 지났습니다. 주소를 보면 아직 길이 떠올랐습니다.',
  }),
  E('lgm_aff_msg_penguin', ['aff:LGM_MSG_PENGUIN'], [16, 70], 25, 4, (s) => ({ t: '펭귄 로지스틱스의 배달은 묻지 않는 것이 규칙이었습니다. 짐이 무엇인지, 받는 사람이 누구인지, 왜 밤인지.', k: 'note', fx: { standing: 1 } })),
  E('lgm_aff_msg_mountaindash', ['aff:LGM_MSG_MOUNTAINDASH'], [16, 70], 25, 4, (s) => ({ t: '마운틴대쉬의 배차 단말기가 다음 목적지를 찍었습니다. 사람이 정하는 것은 길뿐이었고, 길도 곧 단말기가 정했습니다.', k: 'note', fx: { cap: { skill: 0.02 } } })),
  E('lgm_aff_msg_startup', ['aff:LGM_MSG_STARTUP'], [16, 70], 25, 4, (s) => ({ t: '회사가 이번 달 급료를 다음 달에 주겠다고 했습니다. 다음 달이 두 번 왔습니다.', k: 'bad', fx: { money: -medX(s, 0.05), h: -2 } })),

  // ════════════════════════════════════════════════════════════════════════
  // LGM_LGD 근위국 경찰 (핵심, A4) — officer → inspector → superintendent → chief
  // ════════════════════════════════════════════════════════════════════════
  E('lgm_lgd_first', ['track:LGM_LGD'], [18, 40], 90, 4, (s) => ({ t: s.S.track.flags.via === 'referral' ? '추천장을 들고 근위국에 들어갔습니다. 추천인의 이름이 제 이름보다 먼저 불렸습니다.' : '근위국 시험에 붙었습니다. 제복을 처음 입은 날 거리의 눈이 달라졌고, 그 눈이 편하지 않았습니다.', k: 'ev', fx: { cap: { skill: 0.02 } } }), { c: (s) => firstYear(s, 'LGM_LGD') }),
  // officer
  E('lgm_lgd_of_patrol', [tk('LGM_LGD', 'officer')], [18, 50], 35, 2, (s) => ({ t: '야간 순찰이었습니다. 빈민가 입구에서 걸음이 느려졌고, 선배가 "거기까지"라고 했습니다.', k: 'ev', fx: { cap: { skill: 0.02 } } })),
  E('lgm_lgd_of_motto', [tk('LGM_LGD', 'officer')], [18, 50], 30, 3, (s) => ({ t: '"복종·근면·인내"가 벽에 걸려 있었습니다. 셋 중 어느 것이 먼저인지 아무도 가르쳐 주지 않았습니다.', k: 'note' })),
  E('lgm_lgd_of_raid', [tk('LGM_LGD', 'officer')], [18, 50], 30, 3, (s) => { const n = s.rng.ri(5, 30); return { t: '빈민가 단속에 투입되었습니다. 노점 ' + n + '개를 엎었고, 엎은 노점 주인의 얼굴을 다음 날 야시장에서 보았습니다.', k: 'bad', fx: { h: -3, standing: 2 }, f: F('용문 근위국 단속 일지, ' + s.year + '년') }; }),
  E('lgm_lgd_of_infected', [tk('LGM_LGD', 'officer')], [18, 50], 30, 3, (s) => ({ t: '감염자를 연행했습니다. 수갑 대신 장갑을 꼈고, 장갑을 벗을 때 손이 떨렸습니다.', k: 'bad', fx: { h: -2 } })),
  // inspector
  E('lgm_lgd_in_case', [tk('LGM_LGD', 'inspector')], [22, 55], 35, 2, (s) => ({ t: '사건 하나를 맡았습니다. 삼합회 쪽으로 이어졌고, 이어진 곳에서 위에서 전화가 왔습니다.', k: 'note', fx: { standing: 2, h: -1 } })),
  E('lgm_lgd_in_squad', [tk('LGM_LGD', 'inspector')], [22, 55], 35, 2, (s) => { const n = s.rng.ri(5, 9); return { t: '부하 ' + n + '명을 맡았습니다. 야근을 나눴고, 나누는 사람이 가장 많이 남았습니다.', k: 'ev', fx: { hl: -2, standing: 2 }, f: F('용문 근위국 인사 명부, ' + s.year + '년') }; }),
  E('lgm_lgd_in_press', [tk('LGM_LGD', 'inspector')], [22, 55], 30, 4, (s) => ({ t: '기자가 단속 영상을 들고 왔습니다. 제 얼굴이 있었고, 홍보실이 하루 만에 처리했습니다.', k: 'bad', fx: { h: -2 } })),
  E('lgm_lgd_in_wei', [tk('LGM_LGD', 'inspector')], [22, 55], 30, 4, (s) => ({ t: '총경의 차가 지나갔습니다. 경례를 했고, 차창은 열리지 않았습니다.', k: 'note', fx: { standing: 1 } })),
  // superintendent
  E('lgm_lgd_sp_budget', [tk('LGM_LGD', 'superintendent')], [30, 60], 35, 2, (s) => { const amt = medX(s, 6); return { t: '구역 예산을 짰습니다. 순찰차 한 대 값 ' + amt.toLocaleString() + ' LMD가 빈민가 급식 한 해 값이었고, 둘 다 넣지 못했습니다.', k: 'ev', fx: { standing: 2 }, f: F('용문 근위국 예산서, ' + s.year + '년') }; }),
  E('lgm_lgd_sp_term', [tk('LGM_LGD', 'superintendent')], [30, 60], 30, 4, (s) => ({ t: '특별심문대 지휘를 2년 맡았습니다. 임기가 끝나는 날 명단에서 제 이름이 조용히 빠졌습니다.', k: 'note', fx: { standing: 3, hl: -2 }, f: F('용문근위국 특별심문대 지휘관 명부, ' + s.year + '년') })),
  E('lgm_lgd_sp_yan', [tk('LGM_LGD', 'superintendent')], [30, 60], 30, 4, (s) => ({ t: '염국 감찰사가 근위국을 찾았습니다. 보고서는 제가 읽었고, 감찰사는 보고서보다 제 얼굴을 오래 보았습니다.', k: 'note', fx: { h: -2 } })),
  E('lgm_lgd_sp_shadow', [tk('LGM_LGD', 'superintendent')], [30, 60], 30, 5, (s) => ({ t: '명부에 없는 부대가 있다는 것을 알게 되었습니다. 알게 된 것을 보고서에 쓰지 않았습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  // chief
  E('lgm_lgd_ch_office', [tk('LGM_LGD', 'chief')], [38, 65], 35, 2, (s) => ({ t: '근위국장실에 앉았습니다. 창밖으로 빈민가가 보였고, 창은 열리지 않는 창이었습니다.', k: 'ev', fx: { standing: 1 } })),
  E('lgm_lgd_ch_council', [tk('LGM_LGD', 'chief')], [38, 65], 30, 3, (s) => ({ t: '총경과 단둘이 회의했습니다. 회의록은 없었고, 없는 회의록이 가장 중요한 회의록이었습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  E('lgm_lgd_ch_rhodes', [tk('LGM_LGD', 'chief')], [38, 65], 30, 5, (s) => ({ t: '로도스 아일랜드 용문 사무소와의 협약 서류에 서명했습니다. 감염자 치료 이야기였고, 서명한 손이 단속 명령도 내린 손이었습니다.', k: 'note', fx: { h: -1 } }), { c: (s) => yr(s, 1097, 1130) }),
  E('lgm_lgd_ch_retire', [tk('LGM_LGD', 'chief')], [38, 65], 30, 4, (s) => ({ t: '후임 이야기가 나왔습니다. 저보다 젊은 총경 셋의 이름이 올랐고, 셋 다 제가 뽑은 사람이었습니다.', k: 'note', fx: { h: 1 } })),
  TRANS('LGM_LGD', {
    inspector: '경감이 되었습니다. 순찰차 뒷자리에서 앞자리로 옮겼습니다.',
    superintendent: '총경이 되었습니다. 구역 하나가 제 이름으로 보고되었습니다.',
    chief: '근위국장이 되었습니다. 용문의 밤이 제 책임이 되었습니다.',
  }),
  AFTER('LGM_LGD', {
    kia: '현장에서 크게 다치고 한 해가 지났습니다. 제복은 반납했고, 몸에 남은 것은 반납하지 못했습니다.',
    infected: '판정을 받고 한 해가 지났습니다. 단속하던 사람에서 단속 대상이 되는 데 서류 한 장이면 되었습니다.',
    courtmartial: '징계로 옷을 벗고 한 해가 지났습니다. 거리에서 옛 부하가 경례를 하려다 손을 내렸습니다.',
    desert: '근위국을 버리고 떠난 지 한 해가 지났습니다. 국경 너머에서 용문 뉴스를 보지 않으려 했습니다.',
    _: '근위국을 떠나고 한 해가 지났습니다. 사이렌 소리에 아직 몸이 돌아섰습니다.',
  }),
  E('lgm_aff_lgd_general', ['aff:LGM_LGD_GENERAL'], [18, 65], 25, 4, (s) => ({ t: '일반 경찰의 하루였습니다. 분실 신고, 소음 신고, 그리고 신고되지 않은 것들.', k: 'note' })),
  E('lgm_aff_lgd_special', ['aff:LGM_LGD_SPECIAL'], [18, 65], 25, 4, (s) => ({ t: '특별심문대 작전이었습니다. 새벽에 들어갔고, 아침 뉴스에는 나오지 않았습니다.', k: 'ev', fx: { standing: 2, hl: -1 } })),
  E('lgm_aff_lgd_shadow', ['aff:LGM_LGD_SHADOW'], [18, 65], 25, 4, (s) => ({ t: '명부에 없는 사람에게서 연락이 왔습니다. 만난 장소도 명부에 없었고, 들은 것도 기록에 없었습니다.', k: 'note', fx: { h: -1, cap: { ties: 0.02 } } })),

  // ════════════════════════════════════════════════════════════════════════
  // 나머지 진로 — 단계마다 2 + 전환 + 후일담
  // ════════════════════════════════════════════════════════════════════════
  // LGM_TRIAD 삼합회·시칠리안 잔당 (A1): underling → cadre → front
  E('lgm_triad_ul_collect', [tk('LGM_TRIAD', 'underling')], [14, 45], 35, 2, (s) => ({ t: '보호비를 걷으러 다녔습니다. 가게 주인들은 봉투를 미리 준비해 두었고, 준비해 두지 않은 집은 하나였습니다.', k: 'bad', fx: { money: medX(s, 0.08), h: -2 } })),
  E('lgm_triad_ul_lgd', [tk('LGM_TRIAD', 'underling')], [14, 45], 30, 3, (s) => ({ t: '근위국 단속에 걸릴 뻔했습니다. 골목 하나 차이였고, 그 골목을 아는 것이 밥값이었습니다.', k: 'bad', fx: { h: -2, cap: { skill: 0.02 } } })),
  E('lgm_triad_cd_meeting', [tk('LGM_TRIAD', 'cadre')], [18, 55], 35, 2, (s) => ({ t: '간부 회의에 앉았습니다. 찻집 뒷방이었고, 차는 아무도 마시지 않았습니다.', k: 'note', fx: { standing: 2 } })),
  E('lgm_triad_cd_rival', [tk('LGM_TRIAD', 'cadre')], [18, 55], 30, 4, (s) => ({ t: '다른 조직과 부딪혔습니다. 밤에 세 명을 데리고 나갔고, 셋 다 데리고 돌아왔습니다.', k: 'bad', fx: { standing: 4, hl: -3 } })),
  E('lgm_triad_fr_taxi', [tk('LGM_TRIAD', 'front')], [25, 65], 35, 2, (s) => ({ t: '택시 회사 사장 명함을 가졌습니다. 택시는 진짜였고, 장부는 둘이었습니다.', k: 'ev', fx: { money: medX(s, 0.15) } })),
  E('lgm_triad_fr_audit', [tk('LGM_TRIAD', 'front')], [25, 65], 30, 4, (s) => ({ t: '세무 조사가 나왔습니다. 보여 준 장부는 깨끗했고, 깨끗하게 만드는 데 든 돈은 장부에 없었습니다.', k: 'note', fx: { money: -medX(s, 0.1), h: -1 } })),
  TRANS('LGM_TRIAD', {
    cadre: '간부가 되었습니다. 걷는 사람에서 걷게 하는 사람이 되었습니다.',
    front: '위장 사업체의 사장이 되었습니다. 명함에 적힌 직함은 사장, 적히지 않은 직함이 진짜였습니다.',
  }),
  AFTER('LGM_TRIAD', {
    purge: '숙청에서 살아 나오고 한 해가 지났습니다. 조직은 없어졌고, 조직을 아는 사람들은 남았습니다.',
    vendetta: '보복에서 살아남고 한 해가 지났습니다. 다친 몸으로는 조직에 쓸모가 없었고, 쓸모없는 사람은 조용히 잊혔습니다.',
    arrest: '체포되고 한 해가 지났습니다. 감방에서 조직 소식은 들어오지 않았고, 그것이 조직의 답이었습니다.',
    _: '조직을 떠나고 한 해가 지났습니다. 골목을 지날 때 아직 뒤를 보았습니다.',
  }),
  E('lgm_aff_triad_capone', ['aff:LGM_TRIAD_CAPONE'], [14, 65], 25, 4, (s) => ({ t: '카포네 잔당의 모임이었습니다. 시라쿠사 말이 반, 용문 말이 반, 둘 다 못 알아듣는 사람이 하나.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('lgm_aff_triad_gambino', ['aff:LGM_TRIAD_GAMBINO'], [14, 65], 25, 4, (s) => ({ t: '감비노 쪽 사람들은 옛 시라쿠사 방식을 고집했습니다. 용문에서는 그 방식이 느렸고, 느린 쪽이 먼저 사라졌습니다.', k: 'bad', fx: { h: -1 } })),

  // LGM_SECURITY 회사 경비원 (A10): guard → senior → chief
  E('lgm_sec_gd_lobby', [tk('LGM_SECURITY', 'guard')], [16, 60], 35, 2, (s) => ({ t: '로비에 서 있었습니다. 12시간 동안 들어오는 사람을 보았고, 나가는 사람은 저를 보지 않았습니다.', k: 'ev', fx: { hl: -1 }, f: F('경비 용역 근무 기록, ' + s.year + '년') })),
  E('lgm_sec_gd_harass', [tk('LGM_SECURITY', 'guard')], [16, 60], 30, 3, (s) => ({ t: '입주사 직원이 경비실에 물건을 던졌습니다. 주웠고, 보고서는 쓰지 않았습니다. 써도 읽는 사람이 없었습니다.', k: 'bad', fx: { h: -3 } })),
  E('lgm_sec_sn_cctv', [tk('LGM_SECURITY', 'senior')], [19, 62], 35, 2, (s) => ({ t: '화면 열여섯 개를 보았습니다. 열여섯 개 다 조용한 밤이 가장 긴 밤이었습니다.', k: 'note' })),
  E('lgm_sec_sn_detective', [tk('LGM_SECURITY', 'senior')], [19, 62], 30, 4, (s) => ({ t: '탐정사무소 사람이 경비실에 와서 화면 하나를 보여 달라고 했습니다. 보여 주었고, 그 사람은 제 이름을 적어 갔습니다.', k: 'note', fx: { cap: { ties: 0.03 } } })),
  E('lgm_sec_ch_roster', [tk('LGM_SECURITY', 'chief')], [24, 65], 35, 2, (s) => ({ t: '경비 반장으로 근무표를 짰습니다. 야간 수당을 누가 받을지가 근무표의 전부였습니다.', k: 'ev', fx: { standing: 2 } })),
  E('lgm_sec_ch_contract', [tk('LGM_SECURITY', 'chief')], [24, 65], 30, 4, (s) => ({ t: '경비 용역 계약이 다른 회사로 넘어갔습니다. 사람은 그대로, 유니폼만 바뀌었고, 급료는 조금 줄었습니다.', k: 'bad', fx: { money: -medX(s, 0.05), h: -2 } })),
  TRANS('LGM_SECURITY', {
    senior: '선임 경비가 되었습니다. 로비 대신 화면 앞에 앉게 되었습니다.',
    chief: '경비 반장이 되었습니다. 근무표와 반원 아홉이 제 것이 되었습니다.',
  }),
  AFTER('LGM_SECURITY', {
    layoff: '경비 일에서 잘리고 한 해가 지났습니다. 그 건물 로비를 지날 때 다른 사람이 서 있었습니다.',
    injury: '근무 중 다치고 한 해가 지났습니다. 열두 시간을 서 있는 일은 더 할 수 없었습니다.',
    _: '경비 일을 그만두고 한 해가 지났습니다. 밤에 깨어 있는 버릇은 남았습니다.',
  }),
  E('lgm_aff_sec_mall', ['aff:LGM_SEC_MALL'], [16, 65], 25, 4, (s) => ({ t: '쇼핑몰 경비였습니다. 잃어버린 아이를 셋 찾았고, 잃어버린 지갑은 하나도 못 찾았습니다.', k: 'note', fx: { h: 1 } })),

  // LGM_BUTLER 재벌가 사용인 (A11): servant → assistant → butler
  E('lgm_butler_sv_silver', [tk('LGM_BUTLER', 'servant')], [14, 50], 35, 2, (s) => { const n = s.rng.ri(40, 120); return { t: '은식기 ' + n + '점을 닦았습니다. 손자국 하나에 다시 닦았고, 다시 닦는 것이 하루였습니다.', k: 'ev', fx: { cap: { skill: 0.02 } }, f: F('저택 집기 목록, ' + s.year + '년') }; }),
  E('lgm_butler_sv_overheard', [tk('LGM_BUTLER', 'servant')], [14, 50], 30, 3, (s) => ({ t: '저택에서 들은 이야기가 다음 날 신문에 났습니다. 저는 아니었고, 그래도 모두가 사용인들을 보았습니다.', k: 'bad', fx: { h: -2 } })),
  E('lgm_butler_as_guests', [tk('LGM_BUTLER', 'assistant')], [18, 58], 35, 2, (s) => ({ t: '연회 손님 명단을 받았습니다. 총경 쪽 사람, 근위국장, 그리고 이름 없이 "손님"이라고만 적힌 한 사람.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('lgm_butler_as_young', [tk('LGM_BUTLER', 'assistant')], [18, 58], 30, 4, (s) => ({ t: '가문의 젊은 사람이 몰래 나가는 것을 보았습니다. 보지 않은 것으로 했고, 그 사람은 돌아올 때 ' + eul(cul(s).drink) + ' 하나 더 사 왔습니다.', k: 'warm', fx: { h: 2 } })),
  E('lgm_butler_bt_keys', [tk('LGM_BUTLER', 'butler')], [25, 70], 35, 2, (s) => ({ t: '저택 열쇠 전부가 제 손에 있었습니다. 열지 말아야 할 방을 아는 것이 집사의 일이었습니다.', k: 'ev', fx: { standing: 2 } })),
  E('lgm_butler_bt_will', [tk('LGM_BUTLER', 'butler')], [25, 70], 30, 5, (s) => ({ t: '가주의 변호사가 왔습니다. 서류에 사용인 몫이 한 줄 있었고, 그 줄을 읽지 않았습니다.', k: 'note', fx: { h: -1 } })),
  TRANS('LGM_BUTLER', {
    assistant: '집사 보조가 되었습니다. 식기 대신 명단을 들게 되었습니다.',
    butler: '집사가 되었습니다. 가문 사람들이 처음으로 제 성을 불렀습니다.',
  }),
  AFTER('LGM_BUTLER', {
    layoff: '저택에서 나오고 한 해가 지났습니다. 추천서는 받았고, 추천서를 쓴 사람은 저를 보지 않았습니다.',
    scandal: '스캔들로 쫓겨나고 한 해가 지났습니다. 다른 저택은 제 이름을 들으면 문을 열지 않았습니다.',
    _: '사용인 일을 그만두고 한 해가 지났습니다. 식탁의 포크 위치가 아직 눈에 들어왔습니다.',
  }),
  E('lgm_aff_butler_fides', ['aff:LGM_BUTLER_FIDES'], [14, 70], 25, 4, (s) => ({ t: '피데스 가문의 저택이었습니다. 옛 규칙이 많았고, 규칙을 아는 것이 급료였습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),
  E('lgm_aff_butler_swire', ['aff:LGM_BUTLER_SWIRE'], [14, 70], 25, 4, (s) => ({ t: '스와이어 가문의 저택이었습니다. 손님이 많았고, 손님마다 다른 ' + eul(cul(s).drink) + ' 냈습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),

  // LGM_FIRE 소방관 (A4): firefighter → chief → head
  E('lgm_fire_ff_call', [tk('LGM_FIRE', 'firefighter')], [18, 50], 35, 2, (s) => { const n = s.rng.ri(18, 45); return { t: '출동 벨이 울렸습니다. 고층 아파트 화재였고, 계단 ' + n + '층을 장비를 메고 올랐습니다.', k: 'ev', fx: { hl: -2, cap: { skill: 0.03 } }, f: F('용문 소방서 출동 기록, ' + s.year + '년') }; }),
  E('lgm_fire_ff_slum', [tk('LGM_FIRE', 'firefighter')], [18, 50], 30, 3, (s) => ({ t: '빈민가 화재였습니다. 소방차가 골목에 들어가지 못했고, 호스를 끌고 뛰었습니다.', k: 'bad', fx: { hl: -3, standing: 3 } })),
  E('lgm_fire_ch_order', [tk('LGM_FIRE', 'chief')], [22, 55], 35, 2, (s) => ({ t: '진입 명령을 제가 내렸습니다. 누구를 먼저 들여보낼지, 그 순서가 반장의 일이었습니다.', k: 'ev', fx: { standing: 2, h: -1 } })),
  E('lgm_fire_ch_loss', [tk('LGM_FIRE', 'chief')], [22, 55], 30, 4, (s) => ({ t: '대원 하나가 돌아오지 않았습니다. 장례식에서 제복을 입었고, 제복이 무거웠습니다.', k: 'bad', fx: { h: -5 } })),
  E('lgm_fire_hd_budget', [tk('LGM_FIRE', 'head')], [30, 60], 35, 2, (s) => ({ t: '서장으로 예산을 받았습니다. 사다리차 한 대가 빠졌고, 빠진 자리를 사람으로 채웠습니다.', k: 'note', fx: { standing: 1, h: -1 } })),
  E('lgm_fire_hd_medal', [tk('LGM_FIRE', 'head')], [30, 60], 30, 4, (s) => ({ t: '총경 명의의 표창을 받았습니다. 받는 자리에서 돌아오지 못한 대원들 이름을 속으로 셌습니다.', k: 'note', fx: { standing: 2 } })),
  TRANS('LGM_FIRE', {
    chief: '반장이 되었습니다. 먼저 들어가는 사람에서 먼저 들여보내는 사람이 되었습니다.',
    head: '서장이 되었습니다. 출동 벨이 울리면 몸은 아직 차고로 갔습니다.',
  }),
  AFTER('LGM_FIRE', {
    injury: '화재 현장에서 다치고 한 해가 지났습니다. 장비는 반납했고, 계단은 아직 세며 올랐습니다.',
    kia: '무너진 건물에서 살아 나오고 한 해가 지났습니다. 다친 몸으로는 더 이상 출동할 수 없었습니다.',
    infected: '현장 노출로 판정을 받고 한 해가 지났습니다. 구하던 사람에서 격리 대상이 되는 데 검사 한 번이면 되었습니다.',
    _: '소방서를 떠나고 한 해가 지났습니다. 사이렌 소리에 아직 숫자를 셌습니다.',
  }),

  // LGM_DETECTIVE 탐정사무소 (A6): errand → investigator → partner
  E('lgm_det_er_coffee', [tk('LGM_DETECTIVE', 'errand')], [16, 45], 35, 2, (s) => ({ t: '사무소 커피를 끓이고 서류를 날랐습니다. 사장은 담배 연기 너머로 한 번도 "잘했다"고 하지 않았습니다.', k: 'ev', fx: { cap: { ties: 0.02 } } })),
  E('lgm_det_er_tail', [tk('LGM_DETECTIVE', 'errand')], [16, 45], 30, 3, (s) => ({ t: '사람 하나를 따라가는 일을 처음 맡았습니다. 놓쳤고, 사장은 어디서 놓쳤는지만 물었습니다.', k: 'bad', fx: { h: -2, cap: { skill: 0.02 } } })),
  E('lgm_det_in_case', [tk('LGM_DETECTIVE', 'investigator')], [18, 60], 35, 2, (s) => ({ t: '의뢰 하나를 제 이름으로 맡았습니다. 실종이었고, 찾았고, 찾은 사람은 찾아지길 원치 않았습니다.', k: 'note', fx: { standing: 2, h: -1 } })),
  E('lgm_det_in_lgd', [tk('LGM_DETECTIVE', 'investigator')], [18, 60], 30, 4, (s) => ({ t: '근위국이 사무소에 왔습니다. 사건 하나를 덮으라는 말이었고, 사장은 차를 내고 아무 대답도 하지 않았습니다.', k: 'note', fx: { h: -1 } })),
  E('lgm_det_pt_sign', [tk('LGM_DETECTIVE', 'partner')], [25, 70], 35, 2, (s) => ({ t: '사무소 간판에 제 이름이 추가되었습니다. 사장은 "이제 못 떠난다"고 했고, 농담이 아니었습니다.', k: 'ev', fx: { standing: 2, h: 1 } })),
  E('lgm_det_pt_old', [tk('LGM_DETECTIVE', 'partner')], [25, 70], 30, 4, (s) => ({ t: '사장이 의뢰를 하나 거절했습니다. 이유는 말하지 않았고, 나중에 그 의뢰인의 이름이 뉴스에 나왔습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),
  TRANS('LGM_DETECTIVE', {
    investigator: '조사원이 되었습니다. 커피 대신 의뢰를 받게 되었습니다.',
    partner: '파트너가 되었습니다. 사무소의 반이 제 것이 되었고, 떠날 길은 없어졌습니다.',
  }),
  AFTER('LGM_DETECTIVE', {
    kia: '조사 중 크게 다치고 한 해가 지났습니다. 사무소는 그대로였고, 제 책상도 그대로였습니다.',
    ruin: '사무소 형편이 나빠져 한 해가 지났습니다. 의뢰는 줄었고, 사장의 담배는 늘었습니다.',
    _: '사무소를 떠나고 한 해가 지났습니다. 떠날 수 없다던 말이 틀린 것은 아니었습니다.',
  }),
  E('lgm_aff_det_lee', ['aff:LGM_DET_LEE'], [16, 70], 25, 4, (s) => ({ t: '리 탐정사무소의 문 앞에는 늘 누군가 앉아 있었습니다. 의뢰인인지 사장인지 멀리서는 구분이 안 됐습니다.', k: 'note' })),

  // LGM_STUDENT 대학생 (A9 입구): freshman → parttime → graduate → abroad
  E('lgm_stu_fr_lecture', [tk('LGM_STUDENT', 'freshman')], [17, 24], 35, 2, (s) => { const n = s.rng.ri(20, 40) * 10; return { t: '첫 강의였습니다. 강의실에 ' + n + '명이 있었고, 교수는 뒷줄을 보지 않았습니다.', k: 'ev', fx: { cap: { learn: 0.03 } }, f: F('대학 수강 명부, ' + s.year + '년') }; }),
  E('lgm_stu_fr_club', [tk('LGM_STUDENT', 'freshman')], [17, 24], 30, 3, (s) => ({ t: '동아리에 들었습니다. 선배가 ' + eul(cul(s).drink) + ' 샀고, 다음 주에는 제가 샀습니다.', k: 'warm', fx: { cap: { ties: 0.03 }, money: -medX(s, 0.02) } })),
  E('lgm_stu_pt_job', [tk('LGM_STUDENT', 'parttime')], [18, 26], 35, 2, (s) => ({ t: '야시장 노점에서 밤에 일했습니다. 아침 강의는 졸았고, 졸면서도 등록금 숫자는 또렷했습니다.', k: 'ev', fx: { money: medX(s, 0.1), hl: -2 } })),
  E('lgm_stu_pt_tutor', [tk('LGM_STUDENT', 'parttime')], [18, 26], 30, 3, (s) => ({ t: '고층 아파트 아이의 과외를 했습니다. 아이는 똑똑했고, 아이 부모는 제 출신 구역을 물었습니다.', k: 'note', fx: { money: medX(s, 0.08), h: -1 } })),
  E('lgm_stu_gr_thesis', [tk('LGM_STUDENT', 'graduate')], [20, 28], 35, 2, (s) => ({ t: '졸업 논문을 냈습니다. 지도교수는 제목을 바꾸라고 했고, 바꾼 제목이 더 길었습니다.', k: 'ev', fx: { cap: { learn: 0.03 } } })),
  E('lgm_stu_gr_jobfair', [tk('LGM_STUDENT', 'graduate')], [20, 28], 30, 3, (s) => ({ t: '취업 박람회에 갔습니다. 대기업 부스 줄은 길었고, 근위국 부스 줄은 더 길었습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),
  E('lgm_stu_ab_victoria', [tk('LGM_STUDENT', 'abroad')], [20, 30], 35, 2, (s) => ({ t: '유학지의 겨울이었습니다. 용문의 겨울과 달랐고, 용문 뉴스는 반나절 늦게 왔습니다.', k: 'note', fx: { cap: { learn: 0.03 }, h: -1 } })),
  E('lgm_stu_ab_letter', [tk('LGM_STUDENT', 'abroad')], [20, 30], 30, 3, (s) => ({ t: '집에서 편지가 왔습니다. 돌아오면 근위국에 자리가 있다는 말이었고, 그 말을 두 번 읽었습니다.', k: 'note', fx: { h: 1 } })),
  TRANS('LGM_STUDENT', {
    parttime: '파트타임을 시작했습니다. 등록금 고지서가 학생증보다 먼저 왔습니다.',
    graduate: '졸업반이 되었습니다. 강의보다 이력서를 더 많이 썼습니다.',
    abroad: '해외 유학이 정해졌습니다. 공항에서 ' + '가족이 ' + '사진을 찍었고, 사진 속에서 다들 웃고 있었습니다.',
  }),
  AFTER('LGM_STUDENT', {
    ruin: '학비가 끊겨 학교를 떠나고 한 해가 지났습니다. 학생증은 서랍에 넣어 두었습니다.',
    infected: '판정을 받고 학교를 떠난 지 한 해가 지났습니다. 동기들은 졸업했고, 졸업식 사진에 제 자리는 없었습니다.',
    _: '학교를 떠나고 한 해가 지났습니다. 교재는 팔았고 노트는 남겼습니다.',
  }),
  E('lgm_aff_stu_union', ['aff:LGM_STU_UNION'], [17, 30], 25, 4, (s) => ({ t: '용문연합대학 도서관은 밤에도 열려 있었습니다. 밤에 남은 사람들의 얼굴이 다 비슷했습니다.', k: 'note', fx: { cap: { learn: 0.02 } } })),
  E('lgm_aff_stu_tech', ['aff:LGM_STU_TECH'], [17, 30], 25, 4, (s) => ({ t: '과기대 실험실에서 밤을 새웠습니다. 오리지늄 시료를 다뤘고, 다룬 뒤 손을 세 번 씻었습니다.', k: 'note', fx: { cap: { learn: 0.03 }, h: -1 } })),
  E('lgm_aff_stu_exchange', ['aff:LGM_STU_EXCHANGE'], [17, 30], 25, 4, (s) => ({ t: '극동 교환 학기였습니다. 인사하는 법이 달랐고, 한 학기 뒤 몸이 먼저 그쪽 인사를 했습니다.', k: 'note', fx: { cap: { ties: 0.02 } } })),

  // ════════════════════════════════════════════════════════════════════════
  // 생활 — 이동도시 플레이트·야시장·빈민가 (빈민가 노점·점원·사용인)
  // ════════════════════════════════════════════════════════════════════════
  E('lgm_life_newyear', LGM, [10, 90], 30, 3, (s) => ({ t: fest(s, 0) + ' 전날 밤 야시장이 새벽까지 열렸습니다. 폭죽 소리가 플레이트 사이에서 울렸고, 근위국은 그날만 눈을 감았습니다.', k: 'warm', fx: { h: 2 } }), { c: living }),
  E('lgm_life_midautumn', LGM, [10, 90], 30, 3, (s) => ({ t: fest(s, 1) + '에 등을 들고 거리로 나갔습니다. 고층에서 내려다본 등불과 빈민가에서 올려다본 등불이 같은 등불이었습니다.', k: 'warm', fx: { h: 2 } }), { c: living }),
  E('lgm_life_plate_move', LGM, [10, 90], 30, 3, (s) => { const n = s.rng.ri(1, 3); return { t: '이동도시가 항로를 바꿨습니다. 창밖 지평선이 하루 사이에 달라졌고, 야시장 생선 값이 ' + n + '할 올랐습니다.', k: 'note', fx: { money: -medX(s, 0.02) }, f: orgF(s, '물가 월보', s.year) }; }, { c: living }),
  E('lgm_life_nightmarket', LGM, [10, 90], 30, 2, (s) => { const n = medX(s, 0.004) + 2; return { t: '야시장에서 ' + n + ' LMD짜리 ' + eul(cul(s).food) + ' 먹었습니다. 옆자리는 근위국 경관이었고, 그 옆자리는 삼합회 사람이었고, 국물 맛은 같았습니다.', k: 'warm', fx: { h: 1 } }; }, { c: living }),
  E('lgm_life_typhoon', LGM, [10, 90], 25, 4, (s) => { const n = s.rng.ri(6, 30); return { t: '재앙 경보로 이동도시가 ' + n + '시간 멈췄습니다. 플레이트가 고정되는 소리가 밤새 났고, 아침에 바람이 지나갔습니다.', k: 'note', fx: { h: -1 }, f: orgF(s, '재앙 경보 기록', s.year) }; }, { c: living }),
  E('lgm_life_slum_water', ['lungmen', 'nomadic_under'], [10, 90], 30, 3, (s) => ({ t: '빈민가 급수가 끊겼습니다. 위층에서 호스를 내려 준 집이 있었고, 그 집 이름을 골목이 기억했습니다.', k: 'bad', fx: { hl: -1, cap: { ties: 0.02 } } })),
  E('lgm_life_slum_raid', ['lungmen', 'nomadic_under'], [10, 90], 30, 3, (s) => { const n = s.rng.ri(3, 12); return { t: '근위국 단속이 골목을 쓸고 갔습니다. 노점 ' + n + '개가 사라졌고, 다음 주에 ' + (n + 1) + '개가 생겼습니다.', k: 'note', fx: { h: -1 }, f: F('용문 근위국 치안 백서 빈민가 편, ' + s.year + '년') }; }),
  E('lgm_life_upper_view', ['lungmen', 'nomadic_upper'], [10, 90], 25, 4, (s) => ({ t: '고층 창에서 빈민가를 내려다보았습니다. 불빛은 아래가 더 많았고, 그 이유는 생각하지 않기로 했습니다.', k: 'note' })),
  E('lgm_life_quarantine', ['lungmen', 'home:quarantine'], [10, 90], 35, 2, (s) => ({ t: '격리구역의 하루였습니다. 배급 줄, 검사 줄, 그리고 줄이 없는 벽.', k: 'bad', fx: { h: -2 } })),
  E('lgm_life_quarantine_wall', ['lungmen', 'home:quarantine'], [10, 90], 30, 3, (s) => ({ t: '격리구역 벽 너머로 누군가 ' + eul(cul(s).food) + ' 넘겨 주었습니다. 이름은 묻지 않았고, 그릇은 돌려주지 못했습니다.', k: 'warm', fx: { h: 2 } })),

  // ════════════════════════════════════════════════════════════════════════
  // 1096~97 사변 전후 · 염국 하위 지역
  // ════════════════════════════════════════════════════════════════════════
  E('lgm_1096_refugees', LGM, [10, 90], 60, 9, (s) => { const n = s.rng.ri(8, 30) * 100; return { t: '체르노보그에서 온 난민 ' + n.toLocaleString() + '명이 성문 밖에 모였습니다. 안으로 들어온 사람은 빈민가로 갔고, 못 들어온 사람은 숫자로만 남았습니다.', k: 'bad', fx: { h: -2 }, f: F('용문 근위국 치안 백서, 1096년 12월') }; }, { c: (s) => yr(s, 1096) }),
  E('lgm_1097_slum_after', ['lungmen', 'nomadic_under'], [10, 90], 70, 9, (s) => ({ t: '봉쇄가 풀렸습니다. 골목의 반이 비어 있었고, 빈 집 문에 분필로 표시가 되어 있었습니다. 표시의 뜻은 아무도 설명하지 않았습니다.', k: 'bad', fx: { h: -3 } }), { c: (s) => yr(s, 1097) }),
  E('lgm_1097_upper_after', ['lungmen', 'nomadic_upper'], [10, 90], 60, 9, (s) => ({ t: '사변이 끝났다고 뉴스가 말했습니다. 고층 아파트 집세가 올랐고, 빈민가 쪽 창에는 블라인드를 쳤습니다.', k: 'note', fx: { money: -medX(s, 0.03) } }), { c: (s) => yr(s, 1097) }),
  E('lgm_1098_nian_adult', LGM, [18, 90], 60, 9, (s) => ({ t: fest(s, 0) + ' 밤에 도시가 흔들렸습니다. 근위국과 시민이 같은 거리에서 무언가와 싸웠고, 아침에는 아무도 그것을 제대로 설명하지 못했습니다.', k: 'big', fx: { h: -2 } }), { c: (s) => yr(s, 1098) }),
  E('lgm_1097_redevelop', LGM, [10, 90], 40, 9, (s) => ({ t: '빈민가 재개발 공고가 붙었습니다. ' + (under(s) ? '제 골목이 도면에 없었습니다.' : '뉴스는 통합이라고 불렀고, 빈민가 사람들은 다른 말로 불렀습니다.'), k: 'note', fx: { h: under(s) ? -3 : -1 } }), { c: (s) => yr(s, 1098, 1101) }),
  E('lgm_region_inspector', ['lungmen', 'nation:yan'], [15, 90], 25, 5, (s) => ({ t: '염국 본토에서 감찰사가 왔습니다. 거리에 붉은 도포가 보였고, 그 주 동안 근위국 순찰이 두 배였습니다.', k: 'note' })),
  E('lgm_region_currency', ['lungmen', 'nation:yan'], [15, 90], 25, 5, (s) => ({ t: '염국 본토 친척이 왔습니다. 용문폐와 본토 돈을 바꾸며 환전소 앞에서 한참 셈을 했고, 셈이 끝나자 ' + eul(cul(s).food) + ' 사 주었습니다.', k: 'warm', fx: { h: 1 } })),
  E('lgm_region_1102', ['lungmen', 'nation:yan'], [15, 90], 50, 9, (s) => ({ t: '백조에서 큰 혼란이 있었다는 소식이 왔습니다. 본토 송금이 며칠 끊겼고, 용문 거리는 평소보다 조용했습니다.', k: 'note', fx: { h: -1 } }), { c: (s) => yr(s, 1102) }),

  // ════════════════════════════════════════════════════════════════════════
  // 캐논 인물 1회성 (D43)
  // ════════════════════════════════════════════════════════════════════════
  E('lgm_canon_chen', ['track:LGM_LGD'], [18, 60], 40, 99, (s) => { seeCanon(s); return { t: '검은 제복의 경감이 순찰 보고를 받다 말고 창밖 빈민가 쪽을 한참 바라보았습니다. 첸 경감이라고 했고, 보고는 끝까지 듣지 않았습니다.', k: 'note', fx: { h: 1 } }; }, { c: (s) => canonOk(s, 1094, 1097) }),
  E('lgm_canon_wei', ['track:LGM_LGD'], [18, 65], 40, 99, (s) => { seeCanon(s); return { t: '총경의 차가 지나갈 때 거리의 간판 불빛이 잠깐 꺼졌다 켜지는 것 같았습니다. 웨이 옌우 총경을 그날 처음 보았고, 차창 너머였습니다.', k: 'note' }; }, { c: (s) => canonOk(s, 1085, 1106) }),
  E('lgm_canon_wei_corp', ['track:LGM_CORP'], [20, 70], 40, 99, (s) => { seeCanon(s); return { t: '경제 간담회 단상에 총경이 앉아 있었습니다. 웨이 옌우라는 이름을 모두가 알았고, 아무도 먼저 부르지 않았습니다.', k: 'note' }; }, { c: (s) => canonOk(s, 1085, 1106) }),
  E('lgm_canon_lin', ['track:LGM_SLUM'], [10, 70], 40, 99, (s) => { seeCanon(s); return { t: '노점 사이를 걷던 젊은 여자가 생선 값을 묻지도 않고 지폐 한 장을 놓고 갔습니다. 아무도 거스름돈을 내밀지 않았고, 린 가문 사람이라는 말을 나중에 들었습니다.', k: 'note', fx: { money: medX(s, 0.03) } }; }, { c: (s) => canonOk(s, 1095, 1106) }),
  E('lgm_canon_emperor', ['track:LGM_MESSENGER'], [16, 60], 40, 99, (s) => { seeCanon(s); return { t: '펭귄 로지스틱스 사장이 지나가다 배달원들에게 한마디 했습니다. 엠퍼러라고 불리는 그 사람은 커피 이야기만 하고 갔습니다.', k: 'warm', fx: { h: 1 } }; }, { c: (s) => canonOk(s, 1093, 1106) }),
  E('lgm_canon_texas', ['track:LGM_MESSENGER'], [16, 60], 40, 99, (s) => { seeCanon(s); return { t: '오토바이에 기댄 배달원이 짐을 건네고는 이름도 말하지 않은 채 다음 골목으로 사라졌습니다. 텍사스라는 이름을 동료가 알려 주었습니다.', k: 'note' }; }, { c: (s) => canonOk(s, 1093, 1106) }),
  E('lgm_canon_lee', ['track:LGM_SECURITY'], [16, 70], 40, 99, (s) => { seeCanon(s); return { t: '탐정사무소 문 앞에 앉은 늙은 사장이 담배 연기 사이로 의뢰인 얼굴을 한 번 훑고 "안 받겠다"고 했습니다. 리 사장이었고, 그날 의뢰인은 저였습니다.', k: 'note', fx: { h: -1 } }; }, { c: (s) => canonOk(s, 1090, 1106) && !!s.S.track && s.S.track.id === 'LGM_SECURITY' }),
  E('lgm_canon_lee_office', ['track:LGM_DETECTIVE'], [16, 70], 40, 99, (s) => { seeCanon(s); return { t: '사장이 의뢰인 하나를 문 앞에서 돌려보냈습니다. 담배 연기 너머로 "안 받겠다" 한마디였고, 리 사장의 그 말을 그 뒤로 여러 번 들었습니다.', k: 'note' }; }, { c: (s) => canonOk(s, 1090, 1106) }),

  // ════════════════════════════════════════════════════════════════════════
  // 신참·관계 등급·방문
  // ════════════════════════════════════════════════════════════════════════
  E('lgm_newcomer_papers', ['newcomer', 'lungmen'], [10, 80], 40, 2, (s) => ({ t: '근위국 호적과에 거주 신고를 했습니다. 창구 직원은 출신을 묻고 구역을 정해 주었고, 구역 이름이 곧 제 처지였습니다.', k: 'note', fx: { h: -1 } })),
  E('lgm_newcomer_rent', ['newcomer', 'lungmen'], [10, 80], 35, 3, (s) => { const amt = medX(s, 0.1); return { t: '방을 구했습니다. 외지인 보증금은 ' + amt.toLocaleString() + ' LMD로 두 배였고, 두 배를 내고도 창이 없었습니다.', k: 'bad', fx: { money: -amt }, f: orgF(s, '외지인 거주 등록 안내', s.year) }; }),
  E('lgm_newcomer_noodle', ['newcomer', 'lungmen'], [10, 80], 35, 3, (s) => ({ t: '야시장에서 ' + eul(cul(s).food) + ' 시켰습니다. 주인이 ' + cul(s).greet + ' 하고 물었고, 그 말의 뜻을 한참 뒤에 알았습니다.', k: 'warm', fx: { h: 2 } })),
  E('lgm_rel_cultural', ['rel:cultural', 'lungmen'], [10, 80], 30, 3, (s) => ({ t: '면접에서 출신 종족을 물었습니다. ' + rago(s.race.name) + ' 답했고, 면접관은 서류에 무언가를 적었습니다.', k: 'note', fx: { h: -2 } })),
  E('lgm_rel_institutional', ['rel:institutional', 'lungmen'], [10, 80], 30, 3, (s) => ({ t: '근위국 검문에서 신분증을 두 번 보았습니다. 종족 칸을 본 뒤 얼굴을 보았고, 얼굴을 본 뒤 가방을 열었습니다.', k: 'bad', fx: { h: -2 } })),
  E('lgm_rel_favored', ['rel:favored', 'lungmen'], [10, 80], 25, 4, (s) => ({ t: '면접장에서 종족 이야기가 나왔습니다. 좋은 쪽으로였고, 좋은 쪽이라는 것이 편하지만은 않았습니다.', k: 'note', fx: { h: 1 } })),
  E('lgm_visit_market', ['visit:lungmen'], [12, 80], 30, 3, (s) => ({ t: '용문에 머무는 동안 야시장에 갔습니다. 값은 외지인 값이었고, 음식은 외지인 음식이 아니었습니다.', k: 'note', fx: { h: 1 } })),
  E('lgm_visit_lgd', ['visit:lungmen'], [12, 80], 30, 3, (s) => ({ t: '용문 검문소에서 근위국 경관이 서류를 보았습니다. 질문은 셋, 도장은 하나였습니다.', k: 'note' })),
  E('lgm_visit_plate', ['visit:lungmen'], [12, 80], 25, 4, (s) => ({ t: '용문 고층 거리에서 아래를 내려다보았습니다. 빈민가가 있다고 들었는데, 위에서는 보이지 않았습니다.', k: 'note', fx: { h: -1 } })),
];

// ════════════════════════════════════════════════════════════════════════
// 결정
// ════════════════════════════════════════════════════════════════════════
export const decisions = {
  // ── 근위국: 1096~97 빈민가 숙청 참여 ──
  lgm_lgd_purge: {
    tags: ['track:LGM_LGD', 'lungmen'], once: true,
    ok: (s) => !!s.S.track && s.S.track.id === 'LGM_LGD' && yr(s, 1096, 1097),
    build: (s) => ({ title: '명령', body: '빈민가 소탕 명령이 내려왔습니다. 염국 사절의 압박이라는 말이 돌았고, 명령서에는 그 말이 없었습니다.',
      fact: F('용문 근위국 치안 백서, 1096년 12월'),
      choices: [{ k: 'obey', label: '명령대로 간다', sub: '군공 ↑', auto: 1.5 }, { k: 'refuse', label: '빠진다', sub: '징계 가능', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'refuse') { if (s.rng.chance(0.3)) { s.fall('courtmartial'); return false; } return { t: '아프다고 했습니다. 그날 밤 빈민가 쪽 하늘이 붉었고, 제 이름은 명단에 없었습니다.', k: 'note', fx: { standing: -4, h: -2 } }; }
      s.S.flags.lgmPurge = s.year;
      return { t: '빈민가에 들어갔습니다. 돌아와서 제복을 벗었고, 그 뒤로 야시장에 가지 않았습니다.', k: 'bad', fx: { standing: 6, h: -6, hl: -2 } };
    },
  },
  // ── 근위국: 삼합회 봉투 ──
  lgm_lgd_bribe: {
    tags: ['track:LGM_LGD', 'lungmen'], once: false, gap: 5,
    ok: (s) => stageIs(s, 'LGM_LGD', 'officer', 'inspector') && s.rng.chance(0.3),
    build: (s) => { const amt = medX(s, 1); return { title: '봉투', body: '순찰 경로에 있는 찻집 주인이 봉투를 건넸습니다. ' + amt.toLocaleString() + ' LMD, 바라는 것은 매주 같은 시각에 다른 골목을 도는 것뿐이었습니다.',
      choices: [{ k: 'refuse', label: '돌려준다', auto: 2 }, { k: 'take', label: '받는다', sub: '발각되면 징계', auto: 1 }] }; },
    apply: (s, k) => {
      if (k === 'refuse') return { t: '돌려주었습니다. 찻집은 다음 주에 다른 경관에게 봉투를 건넸습니다.', k: 'note', fx: { standing: 2 } };
      s.S.money += medX(s, 1); s.S.flags.lgmBribed = (s.S.flags.lgmBribed || 0) + 1;
      if (s.rng.chance(0.15 + 0.1 * s.S.flags.lgmBribed)) { s.fall('courtmartial'); return false; }
      return { t: '받았습니다. 순찰 경로가 한 골목 바뀌었고, 아무도 묻지 않았습니다.', k: 'bad', fx: { h: -2 } };
    },
  },
  // ── 근위국: 특별심문대 선발 ──
  lgm_lgd_special: {
    tags: [tk('LGM_LGD', 'inspector'), 'lungmen'], once: true,
    ok: (s) => stageIs(s, 'LGM_LGD', 'inspector') && s.S.track.aff !== 'LGM_LGD_SPECIAL' && s.S.track.standing >= 40 && s.rng.chance(0.4),
    build: (s) => ({ title: '선발', body: '특별심문대 선발 통지가 왔습니다. 승진은 빠르고, 돌아오지 않는 사람도 빠릅니다.',
      choices: [{ k: 'go', label: '지원한다', sub: '특별심문대', auto: 1.2 }, { k: 'stay', label: '남는다', sub: '일반 경찰', auto: 1 }] }),
    apply: (s, k) => { if (k === 'stay') return { t: '지원하지 않았습니다. 지원한 동기가 반년 뒤 뉴스에 이름으로만 나왔습니다.', k: 'note' }; s.S.track.aff = 'LGM_LGD_SPECIAL'; return { t: '특별심문대에 들어갔습니다. 제복 색이 바뀌었고, 거리의 눈도 바뀌었습니다.', k: 'ev', fx: { standing: 5 } }; },
  },
  // ── 빈민가: 절도 ──
  lgm_slum_steal: {
    tags: ['track:LGM_SLUM', 'lungmen'], once: false, gap: 4,
    ok: (s) => stageIs(s, 'LGM_SLUM', 'helper', 'stall') && poor(s) && s.rng.chance(0.3),
    build: (s) => ({ title: '창고', body: '상업단지 창고 문이 밤에 열려 있다는 말이 돌았습니다. 하루치 벌이가 그 안에 있고, 근위국 순찰은 자정에 돕니다.',
      choices: [{ k: 'no', label: '가지 않는다', auto: 1.5 }, { k: 'go', label: '간다', sub: '체포 위험', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '가지 않았습니다. 간 사람 둘 중 하나는 돌아왔고, 하나는 근위국에 있었습니다.', k: 'note' };
      if (s.rng.chance(0.3)) { s.fall('arrest'); return false; }
      return { t: '다녀왔습니다. 한 달치 벌이였고, 한 달 동안 골목에서 발소리에 깼습니다.', k: 'bad', fx: { money: medX(s, 0.4), h: -3 } };
    },
  },
  // ── 빈민가: 래트킹의 사람 ──
  lgm_slum_ratking: {
    tags: [tk('LGM_SLUM', 'stall'), 'lungmen'], once: true,
    ok: (s) => stageIs(s, 'LGM_SLUM', 'stall') && s.S.track.aff !== 'LGM_SLUM_RATKING' && s.rng.chance(0.4),
    build: (s) => ({ title: '제안', body: '래트킹의 사람이 노점에 앉아 ' + eul(cul(s).drink) + ' 시켰습니다. 자치에 들어오면 자릿세는 없고, 대신 골목의 일에 손을 보태야 합니다.',
      choices: [{ k: 'yes', label: '들어간다', sub: '래트킹 자치', auto: 1.5 }, { k: 'no', label: '지금대로 한다', auto: 1 }] }),
    apply: (s, k) => { if (k === 'no') return { t: '지금대로 하겠다고 했습니다. 그 사람은 ' + eul(cul(s).drink) + ' 다 마시고 값을 두 배로 두고 갔습니다.', k: 'note', fx: { money: medX(s, 0.01) } }; s.S.track.aff = 'LGM_SLUM_RATKING'; return { t: '자치에 들어갔습니다. 다음 날부터 자릿세를 걷으러 오는 사람이 없었습니다.', k: 'ev', fx: { standing: 5 } }; },
  },
  // ── 삼합회 가입 제안 ──
  lgm_triad_offer: {
    tags: ['lungmen'], once: true,
    ok: (s) => s.S.age >= 14 && s.S.age <= 30 && poor(s) && !s.S.prison && !!s.S.track && ['LGM_SLUM', 'LGM_SECURITY', 'LGM_SHOP'].includes(s.S.track.id) && s.rng.chance(0.12),
    build: (s) => ({ title: '찻집', body: '찻집 뒷방에서 사람이 불렀습니다. 지금 버는 것의 세 배를 말했고, 하는 일은 말하지 않았습니다.',
      choices: [{ k: 'no', label: '거절한다', auto: 2 }, { k: 'yes', label: '받아들인다', sub: '삼합회', auto: 1 }] }),
    apply: (s, k) => { if (k === 'no') return { t: '거절했습니다. 그 사람은 웃으며 찻값을 냈고, 다시 부르지 않았습니다.', k: 'note' }; return s.switchTrack('LGM_TRIAD', 'switch') ? false : { t: '뒷방 문은 열리지 않았습니다.', k: 'note' }; },
  },
  // ── 대기업: 구조조정 명단 ──
  lgm_corp_layoff_list: {
    tags: [tk('LGM_CORP', 'manager'), 'lungmen'], once: false, gap: 5,
    ok: (s) => stageIs(s, 'LGM_CORP', 'manager') && s.rng.chance(0.3),
    build: (s) => ({ title: '명단', body: '부서에서 둘을 내보내라는 지시가 내려왔습니다. 명단은 부장이 씁니다.',
      choices: [{ k: 'write', label: '명단을 쓴다', sub: '사내 평가 ↑', auto: 1.5 }, { k: 'refuse', label: '쓰지 않는다', sub: '제 이름이 오를 수 있음', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'write') return { t: '둘의 이름을 썼습니다. 둘 다 저보다 오래 다닌 사람이었고, 송별회에는 가지 않았습니다.', k: 'bad', fx: { standing: 4, h: -4 } };
      if (s.rng.chance(0.35)) { s.fall('layoff'); return false; }
      return { t: '쓰지 않았습니다. 임원실에서 한 시간 동안 서 있었고, 명단은 다른 부장이 썼습니다.', k: 'note', fx: { standing: -3, h: 1 } };
    },
  },
  // ── 메신저: 위험 배송 ──
  lgm_msg_danger: {
    tags: ['track:LGM_MESSENGER', 'lungmen'], once: false, gap: 4,
    ok: (s) => stageIs(s, 'LGM_MESSENGER', 'messenger', 'escort') && s.rng.chance(0.3),
    build: (s) => ({ title: '배송', body: '내용물을 묻지 않는 배송이 들어왔습니다. 수당은 한 달치, 목적지는 빈민가 깊은 곳, 시간은 자정입니다.',
      choices: [{ k: 'go', label: '간다', sub: '한 달치 수당', auto: 1.2 }, { k: 'no', label: '거절한다', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '거절했습니다. 다른 동료가 갔고, 다음 날 출근했습니다.', k: 'note', fx: { standing: -1 } };
      if (s.rng.chance(0.15)) { s.fall('kia'); return false; }
      return { t: '다녀왔습니다. 받는 사람은 이름을 말하지 않았고, 수당은 제때 들어왔습니다.', k: 'ev', fx: { money: medX(s, 0.3), standing: 3, h: -1 } };
    },
  },
  // ── 점원: 가게 인수 ──
  lgm_shop_takeover: {
    tags: [tk('LGM_SHOP', 'head'), 'lungmen'], once: true,
    ok: (s) => stageIs(s, 'LGM_SHOP', 'head') && s.S.money >= s.med * 2 && s.rng.chance(0.4),
    build: (s) => ({ title: '권리금', body: '단지 안 가게 하나가 권리금 ' + medX(s, 2).toLocaleString() + ' LMD에 나왔습니다. 제 이름으로 가게를 낼 수 있습니다.',
      choices: [{ k: 'buy', label: '인수한다', sub: '모은 돈의 대부분', auto: 1 }, { k: 'no', label: '그만둔다', auto: 1.2 }] }),
    apply: (s, k) => { if (k === 'no') return { t: '그만두었습니다. 그 가게는 다른 사람이 샀고, 반년 뒤 또 나왔습니다.', k: 'note' }; s.S.money -= medX(s, 2); s.S.flags.lgmOwnShop = s.S.age; return { t: '가게를 인수했습니다. 셔터에 제 이름이 적혔고, 셔터 소리가 전과 다르게 들렸습니다.', k: 'warm', fx: { h: 4, standing: 5 } }; },
  },
  // ── 대학생: 빅토리아 유학 ──
  lgm_student_abroad: {
    tags: [tk('LGM_STUDENT', 'graduate'), 'lungmen'], once: true,
    ok: (s) => stageIs(s, 'LGM_STUDENT', 'graduate') && s.S.cap.learn >= 0.8 && s.rng.chance(0.5),
    build: (s) => ({ title: '유학', body: '빅토리아 대학에서 입학 허가가 왔습니다. 돌아오면 근위국이나 대기업이 기다린다고 했고, 기다린다는 말은 약속이 아니었습니다.',
      choices: [{ k: 'go', label: '간다', sub: '해외 유학', auto: 1.2 }, { k: 'stay', label: '남는다', auto: 1 }] }),
    apply: (s, k) => { if (k === 'stay') return { t: '남았습니다. 허가서는 서랍에 넣었고, 가끔 꺼내 보았습니다.', k: 'note' }; s.promote({ force: true, quiet: true }); return { t: '빅토리아로 떠났습니다. 공항에서 가족이 사진을 찍었고, 사진 속에서 다들 웃고 있었습니다.', k: 'ev', fx: { h: 2, cap: { learn: 0.05 } } }; },
  },
  // ── 탐정: 덮으라는 사건 ──
  lgm_det_cover: {
    tags: [tk('LGM_DETECTIVE', 'investigator'), 'lungmen'], once: false, gap: 5,
    ok: (s) => stageIs(s, 'LGM_DETECTIVE', 'investigator') && s.rng.chance(0.3),
    build: (s) => ({ title: '전화', body: '근위국에서 전화가 왔습니다. 지금 맡은 사건을 덮으라는 말이었고, 의뢰인은 이미 돈을 냈습니다.',
      choices: [{ k: 'cover', label: '덮는다', sub: '의뢰인에게 돈을 돌려줌', auto: 1 }, { k: 'continue', label: '계속한다', sub: '근위국과 틀어짐', auto: 1.2 }] }),
    apply: (s, k) => {
      if (k === 'cover') return { t: '덮었습니다. 의뢰인에게 돈을 돌려주었고, 사장은 아무 말도 하지 않았습니다.', k: 'bad', fx: { money: -medX(s, 0.2), h: -3 } };
      if (s.rng.chance(0.2)) { s.fall('ruin'); return false; }
      return { t: '계속했습니다. 사건은 끝났고, 그 뒤로 근위국 쪽 의뢰는 오지 않았습니다.', k: 'note', fx: { standing: 4 } };
    },
  },
  // ── 사용인: 가문의 비밀 ──
  lgm_butler_secret: {
    tags: ['track:LGM_BUTLER', 'lungmen'], once: true,
    ok: (s) => stageIs(s, 'LGM_BUTLER', 'assistant', 'butler') && s.rng.chance(0.4),
    build: (s) => ({ title: '서류', body: '가문의 서재에서 보지 말아야 할 서류를 보았습니다. 기자 하나가 그 서류 값으로 ' + medX(s, 3).toLocaleString() + ' LMD를 말했습니다.',
      choices: [{ k: 'silent', label: '입을 닫는다', auto: 2 }, { k: 'sell', label: '판다', sub: '스캔들 위험', auto: 0.8 }] }),
    apply: (s, k) => {
      if (k === 'silent') return { t: '입을 닫았습니다. 가문은 몰랐고, 모르는 것이 급료에 들어 있었습니다.', k: 'note', fx: { standing: 3 } };
      s.S.money += medX(s, 3);
      if (s.rng.chance(0.5)) { s.fall('scandal'); return false; }
      return { t: '팔았습니다. 기사는 났고, 출처는 나지 않았습니다.', k: 'bad', fx: { h: -3 } };
    },
  },
  // ── 소방관: 진입 ──
  lgm_fire_enter: {
    tags: [tk('LGM_FIRE', 'firefighter'), 'lungmen'], once: false, gap: 4,
    ok: (s) => stageIs(s, 'LGM_FIRE', 'firefighter') && s.rng.chance(0.35),
    build: (s) => ({ title: '진입', body: '무너지기 직전의 건물 안에 사람이 남았다는 신고입니다. 반장은 진입을 명령하지 않았고, 금지하지도 않았습니다.',
      choices: [{ k: 'go', label: '들어간다', sub: '군공 ↑, 부상 위험', auto: 1.2 }, { k: 'wait', label: '기다린다', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'wait') return { t: '기다렸습니다. 건물은 무너졌고, 안에 사람은 없었습니다. 없었다는 것을 아침에 알았습니다.', k: 'note', fx: { h: -2 } };
      if (s.rng.chance(0.2)) { s.fall('injury'); return false; }
      return { t: '들어갔습니다. 둘을 업고 나왔고, 나온 뒤 건물이 내려앉았습니다.', k: 'warm', fx: { standing: 6, hl: -3, h: 3 } };
    },
  },

  // ── 혼인 유형 덮어쓰기(용문 전용 문구, 다른 나라는 엔진 문구) ──
  marry_civil: marryOverride('civil', (s, t, pr) => ({ title: t.name, body: wa(pr.name) + ' 혼인 등기 이야기를 했습니다. 근위국 호적과 창구에서 서류 두 장이면 되고, 식은 하지 않아도 됩니다.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람입니다.' : ''),
    choices: [{ k: 'accept', label: '등기한다', sub: '서류 두 장', auto: 2 }, { k: 'hold', label: '보류한다', auto: 1 }, { k: 'decline', label: '거절한다', auto: 0.7 }] }), ['lungmen']),
  marry_tea_ceremony: marryOverride('tea_ceremony', (s, t, pr) => ({ title: t.name, body: wa(pr.name) + '의 혼담이 양가에 올랐습니다. 어른들께 ' + eul(cul(s).drink) + ' 올리는 차례 혼례이고, 지참금 ' + Math.round(s.med * t.dowry).toLocaleString() + ' LMD가 오갑니다.',
    choices: [{ k: 'accept', label: '받아들인다', sub: '차례 혼례', auto: 2 }, { k: 'hold', label: '보류한다', auto: 0.9 }, { k: 'decline', label: '거절한다', auto: 0.6 }] }), ['lungmen']),
  marry_money: marryOverride('money', (s, t, pr) => ({ title: t.name, body: wa(pr.name) + '의 집안에서 혼담이 왔습니다. 지참금 ' + Math.round(s.med * t.dowry).toLocaleString() + ' LMD. 돈이 먼저 오가고 사람은 나중에 만나는 혼인이었습니다.',
    choices: [{ k: 'accept', label: '받아들인다', sub: '지참금 혼인', auto: 1.8 }, { k: 'hold', label: '보류한다', auto: 1 }, { k: 'decline', label: '거절한다', auto: 0.8 }] }), ['lungmen']),
};

// W11: 엔진 id 와 같은 결정은 국가 디스패처로 옮긴다(여러 파일이 같은 id 를 등록해도 거주국별로 분기)
hoist(decisions, { marry_civil: ['lungmen'], marry_tea_ceremony: ['lungmen'], marry_money: ['lungmen'] });

export default { events, decisions };

// W9f 에기르 진로 콘텐츠(국가 전용, D40). 계약: docs/설계_명세_v1.md §11 + "W7 메모 — 스키마 고정".
// 핵심 진로 4: AEG_CONSUL(집정관 트랙, 배정)·AEG_LEGION(군단)·AEG_HUNTER(어비설 헌터, 1080~1095 지원 이벤트)·AEG_EXPAT(지상 이주, 전환 전용).
// 나머지: AEG_RESEARCH·AEG_ADMIN·AEG_FARM·AEG_ARTIST. 표기: 시테러·심해교회·에기르.
// 지상행은 AEG_EXPAT 진입 뒤 ctx.migrate('work', 목적지, {keepTrack:true}) — 진로를 먼저 넣고 이주해야 enterTrack 이 되돌려 보내지 않는다.
// 거주 기준 태그 'nation:aegir', 출생 기준 'aegir'(지상 이주 뒤에도 붙는다).
import { F, cul, fest, medX, eul, iga, eun, wa, ro } from '../_util.js';
import { ENGINE_DECISIONS } from '../../src/engine/choices.js';
import { marriageP, rollMarriageType, makeProspect, marry, familyOpposes } from '../../src/engine/marriage.js';
import { homeChangeOptions, setHousing } from '../../src/engine/housing.js';

const NAT = 'aegir';
const N = 'nation:' + NAT;
const T = (id, st) => 'track:' + id + (st ? ':' + st : '');
const E = (id, a, tags, w, gap, run, x) => ({ id, a, tags, w, gap, run, ...(x || {}) });
const stId = (s) => (s.stage ? s.stage.id : null);
const here = (s) => s.S.cur === NAT;
const curName = (s) => s.nation.name;

function trans(id, track, a, texts) {
  return { id, a, tags: [T(track)], w: 90, gap: 1,
    c: (s) => !!s.S.track && s.S.track.stage > 0 && s.S.age - s.S.track.stageSince <= 1 && texts[stId(s)] != null && !s.S.flags['tr_' + id + '_' + stId(s)],
    run: (s) => { const k = stId(s); s.S.flags['tr_' + id + '_' + k] = s.S.age; const t = texts[k] || '배정이 바뀌었습니다.'; return typeof t === 'function' ? t(s) : { t, k: 'ev', fx: { h: 1 } }; } };
}
function after(id, track, a, texts, tag = 'aegir') {
  return { id, a, tags: [tag], w: 100,
    c: (s) => !s.S.track && s.S.flags.lastTrack === track && s.S.age - s.S.flags.lastTrackLeftAt <= 2 && !['retire', 'switch', 'death', 'rhodes', 'homemaker'].includes(s.S.flags.lastTrackHow),
    run: (s) => { const f = s.S.flags; const c = f.lastFallAt === f.lastTrackLeftAt ? f.lastFall : null; const t = (c && texts[c]) || texts[f.lastTrackHow] || texts._; return { t: typeof t === 'function' ? t(s) : t, k: 'loss' }; } };
}
function canon(id, years, tags, a, text, extraC) {
  return { id, a, tags, w: 30,
    c: (s) => s.year >= years[0] && s.year <= years[1] && (s.S.flags.canonSeen || 0) < 3 && (!extraC || extraC(s)),
    run: (s) => { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; return { t: typeof text === 'function' ? text(s) : text, k: 'note' }; } };
}
function marryRoll(s) {
  const S = s.S; const k = 'y_marry';
  if (S.flags[k] && S.flags[k].age === S.age) return S.flags[k].v;
  const p = marriageP(s);
  const v = p > 0 && s.rng.chance(p) ? { type: rollMarriageType(s), prospect: makeProspect(s) } : null;
  S.flags[k] = { age: S.age, v };
  return v;
}
/** 지상행: 진로를 먼저 넣고 이주(keepTrack). 목적지별 소속 */
const EXPAT_AFF = { iberia: 'AEG_EXP_913', higashi: 'AEG_EXP_HIGASHI', columbia: 'AEG_EXP_TECH', yan: 'AEG_EXP_TECH' };
function goSurface(s, dest) {
  if (!s.data.nationById[dest]) return false;
  if (!s.enterTrack('AEG_EXPAT', { how: 'switch', via: 'surface', aff: EXPAT_AFF[dest] || 'AEG_EXP_TECH', quiet: true })) return false;
  return s.migrate('work', dest, { keepTrack: true, quiet: true });
}

export const events = [
  // ══════════ AEG_CONSUL 집정관 트랙 (핵심) ══════════
  E('aeg_con_aide_notice', [20, 40], [T('AEG_CONSUL', 'aide')], 30, 2, () => ({ t: '보좌로 배정 통지서를 읽는 일을 맡았습니다. 하루에 통지서 40장, 이의 제기는 0건이었습니다.', k: 'ev', f: F('발전계획소 배정 통지 대장') })),
  E('aeg_con_aide_arena', [20, 40], [T('AEG_CONSUL', 'aide')], 25, 3, () => ({ t: '투지장에 집정관의 글을 올렸습니다. 첨삭은 밤새 달렸고 아침에 집정관은 한 줄만 고쳤습니다.', k: 'note', fx: { cap: { learn: 0.05 } } })),
  E('aeg_con_aide_robot', [20, 40], [T('AEG_CONSUL', 'aide')], 25, 3, () => ({ t: '조력자 로봇이 서류를 날랐습니다. 사람이 할 일은 서류를 읽는 것뿐이었고, 그것이 가장 오래 걸렸습니다.', k: 'note' })),
  E('aeg_con_aide_senate', [20, 40], [T('AEG_CONSUL', 'aide')], 25, 3, () => ({ t: '원로원 회의에 배석했습니다. 발언은 없었고 물잔을 채우는 일이 있었습니다.', k: 'ev', fx: { standing: 1 } })),
  E('aeg_con_tech_assign', [24, 60], [T('AEG_CONSUL', 'technocrat')], 30, 2, () => ({ t: '기술관료로 구역 하나의 배정을 맡았습니다. 아이들의 적성표 80장이 책상에 쌓였고, 그 종이 한 장이 한 사람의 길이었습니다.', k: 'ev', fx: { standing: 1 }, f: F('발전계획소 적성표') })),
  E('aeg_con_tech_pressure', [24, 60], [T('AEG_CONSUL', 'technocrat')], 25, 3, () => ({ t: '도시 외벽 압력 보고서. 기준치 대비 1.02, 지난해와 같았고 그것이 좋은 보고였습니다.', k: 'note', f: F('집정관 기록원 외벽 압력 보고') })),
  E('aeg_con_tech_seaborn', [24, 60], [T('AEG_CONSUL', 'technocrat')], 25, 3, () => ({ t: '해조 농장에서 "해충" 보고가 올라왔습니다. 군단에 넘겼고, 군단은 다른 이름으로 불렀습니다.', k: 'bad', fx: { h: -1 } })),
  E('aeg_con_tech_debate', [24, 60], [T('AEG_CONSUL', 'technocrat')], 25, 3, () => ({ t: '투지장에서 배정 제도에 관한 토론이 붙었습니다. 기술관료의 글은 가장 길었고 가장 적게 읽혔습니다.', k: 'note' })),
  E('aeg_con_con_hall', [30, 80], [T('AEG_CONSUL', 'consul')], 30, 2, () => ({ t: '집정관으로 배정 결과를 홀에서 읽었습니다. 아무도 이의를 제기하지 않았습니다. 그것이 매년 조금씩 무거워졌습니다.', k: 'ev', fx: { standing: 1 } })),
  E('aeg_con_con_church', [30, 80], [T('AEG_CONSUL', 'consul')], 20, 4, () => ({ t: '동료 집정관 하나가 심해교회 신도라는 보고가 있었습니다. 보고서는 봉인되었고 그 집정관은 다음 회의에도 나왔습니다.', k: 'bad', fx: { h: -2 } })),
  E('aeg_con_con_surface', [30, 80], [T('AEG_CONSUL', 'consul')], 25, 3, () => ({ t: '지상과의 접촉 안건. 찬성도 반대도 "원시적"이라는 말을 썼습니다.', k: 'note' })),
  E('aeg_con_con_city', [30, 80], [T('AEG_CONSUL', 'consul')], 25, 3, () => ({ t: '도시 하나의 한 해 예산 3건에 서명했습니다. 물과 빛, 그리고 벽.', k: 'ev', f: F('집정관 기록원 예산 결재') })),
  E('aeg_con_sen_seat', [40, 120], [T('AEG_CONSUL', 'senate')], 30, 2, () => ({ t: '원로원 자리. 발언은 짧았고 침묵은 길었습니다. 둘 다 기록되었습니다.', k: 'ev' })),
  E('aeg_con_sen_young', [40, 120], [T('AEG_CONSUL', 'senate')], 25, 3, () => ({ t: '젊은 집정관이 자문을 청했습니다. 답보다 질문을 더 많이 주었습니다.', k: 'note', fx: { standing: 1 } })),
  E('aeg_con_sen_deep', [40, 120], [T('AEG_CONSUL', 'senate')], 20, 4, () => ({ t: '수도 상층부에 관한 보고가 원로원에 올라왔습니다. 결론은 다음 회의로 넘어갔고, 다음 회의는 열리지 않았습니다.', k: 'bad', fx: { h: -2 } })),
  E('aeg_con_sen_light', [40, 120], [T('AEG_CONSUL', 'senate')], 25, 3, (s) => ({ t: fest(s, 0) + '. 원로원이 도시의 빛을 하루 낮췄습니다. 깊은 곳에서 올라오는 빛이 그날은 보였습니다.', k: 'warm', fx: { h: 1 } })),
  trans('aeg_con_trans', 'AEG_CONSUL', [21, 120], {
    technocrat: '기술관료로 배정되었습니다. 구역 하나의 적성표가 책상으로 왔습니다.',
    consul: (s) => ({ t: '집정관이 되었습니다. 홀에서 배정 결과를 읽는 쪽이 되었습니다.', k: 'big', fx: { h: 3 } }),
    senate: (s) => ({ t: '원로원에 들었습니다. 자리는 돌이었고 차가웠습니다.', k: 'big', fx: { h: 2 } }),
  }),
  after('aeg_con_after', 'AEG_CONSUL', [21, 120], {
    impeach: '사임 통지가 기록원에 접수되었습니다. 배정은 다른 사람이 읽었습니다.',
    heresy: '교단 연루 심문이 있었습니다. 살아남았고 직함은 남지 않았습니다.',
    _: '집정관 트랙을 떠났습니다. 배정 통지서를 받는 쪽으로 돌아갔습니다.',
  }),
  E('aeg_con_aff_legion', [20, 120], ['aff:AEG_CON_LEGION'], 25, 3, () => ({ t: '군단 집정관실. 보고서의 반은 순찰 기록, 반은 사라진 인원 명단이었습니다.', k: 'note', fx: { h: -1 } })),
  E('aeg_con_aff_tech', [20, 120], ['aff:AEG_CON_TECH'], 25, 3, () => ({ t: '기술 집정관실. 벽의 압력계가 사람보다 먼저 보고했습니다.', k: 'note' })),
  E('aeg_con_aff_social', [20, 120], ['aff:AEG_CON_SOCIAL'], 25, 3, () => ({ t: '사회행정감독연구소. 시민의 하루를 숫자로 적는 곳이었고, 숫자는 늘 평온했습니다.', k: 'note' })),
  canon('aeg_canon_clementia', [1090, 1107], [T('AEG_CONSUL', 'aide')], [20, 40], '집정관이 배정 결과를 읽어 내려가는 동안 홀 안의 아무도 이의를 제기하지 않았습니다. 뒤에 그 집정관의 이름을 지상 접촉 안건에서 다시 보았습니다.'),

  // ══════════ AEG_LEGION 군단 (핵심) ══════════
  E('aeg_leg_sol_drill', [16, 30], [T('AEG_LEGION', 'soldier')], 30, 2, () => ({ t: '병사 훈련. 물속에서 숨을 참는 시간이 4분을 넘었습니다.', k: 'ev', fx: { cap: { skill: 0.05 } }, f: F('군단 훈련 일지') })),
  E('aeg_leg_sol_wall', [16, 30], [T('AEG_LEGION', 'soldier')], 30, 2, () => ({ t: '외벽 초소. 바깥은 어두웠고 어두운 것이 움직였습니다. 보고했고, 보고는 접수되었습니다.', k: 'note', fx: { h: -1 } })),
  E('aeg_leg_sol_mate', [16, 30], [T('AEG_LEGION', 'soldier')], 25, 3, () => ({ t: '같이 배정된 동기가 순찰에서 돌아오지 않았습니다. 명단에서 이름이 "재배정"으로 바뀌었습니다.', k: 'loss', fx: { h: -3 } })),
  E('aeg_leg_sol_hunter', [16, 30], [T('AEG_LEGION', 'soldier')], 25, 3, (s) => ({ t: s.year <= 1095 ? '흰 머리의 헌터들이 막사를 지나갔습니다. 병사들은 말을 멈췼고 헌터들은 쳐다보지 않았습니다.' : '옛 헌터 막사가 비어 있었습니다. 문은 잠겨 있지 않았고 아무도 들어가지 않았습니다.', k: 'note' })),
  E('aeg_leg_nco_squad', [19, 45], [T('AEG_LEGION', 'nco')], 30, 2, () => ({ t: '하사관으로 분대를 맡았습니다. 분대원 8명의 숨 참는 시간을 외웠습니다.', k: 'ev', fx: { standing: 1 }, f: F('군단 편성표') })),
  E('aeg_leg_nco_farm', [19, 45], [T('AEG_LEGION', 'nco')], 25, 3, () => ({ t: '해조 농장 "해충" 출동. 농장 사람들은 그것을 해충이라 불렀고 분대는 다른 이름으로 불렀습니다.', k: 'bad', fx: { hl: -1 } })),
  E('aeg_leg_nco_report', [19, 45], [T('AEG_LEGION', 'nco')], 25, 3, () => ({ t: '순찰 보고서. 본 것을 적었고, 본 것이 무엇인지는 적지 않았습니다.', k: 'note' })),
  E('aeg_leg_nco_light', [19, 45], [T('AEG_LEGION', 'nco')], 25, 3, (s) => ({ t: fest(s, 1) + '. 군단이 하루 쉬었고 초소는 쉬지 않았습니다.', k: 'ev' })),
  E('aeg_leg_off_patrol', [24, 60], [T('AEG_LEGION', 'officer')], 30, 2, () => ({ t: '장교로 순찰 노선을 정했습니다. 지도에서 비워 둔 구역이 3곳으로 늘었습니다.', k: 'ev', fx: { standing: 1 }, f: F('군단 순찰 지도') })),
  E('aeg_leg_off_supervise', [24, 60], [T('AEG_LEGION', 'officer')], 20, 4, (s) => ({ t: s.year <= 1095 ? '헌터 감독 임무. 폭주 시 사살 권한이 서류에 적혀 있었고, 그 줄을 세 번 읽었습니다.' : '옛 헌터 감독 규정이 폐기 서류로 올라왔습니다. 서명하는 데 오래 걸렸습니다.', k: 'bad', fx: { h: -2 } })),
  E('aeg_leg_off_consul', [24, 60], [T('AEG_LEGION', 'officer')], 25, 3, () => ({ t: '군단 집정관에게 보고했습니다. 숫자는 받았고 질문은 없었습니다.', k: 'note' })),
  E('aeg_leg_off_loss', [24, 60], [T('AEG_LEGION', 'officer')], 15, 5, () => ({ t: '분대 하나가 돌아오지 않았습니다. 명단을 집정관 기록원에 올리는 것이 장교의 일이었습니다.', k: 'loss', fx: { h: -3 } })),
  E('aeg_leg_cmd_map', [35, 100], [T('AEG_LEGION', 'commander')], 30, 2, () => ({ t: '군단 사령관으로 방어선을 그렸습니다. 선은 지난해보다 안쪽이었습니다.', k: 'ev' })),
  E('aeg_leg_cmd_senate', [35, 100], [T('AEG_LEGION', 'commander')], 25, 3, () => ({ t: '원로원에 보고했습니다. 보고는 짧았고 질문은 길었습니다.', k: 'note', fx: { standing: 1 } })),
  E('aeg_leg_cmd_surface', [35, 100], [T('AEG_LEGION', 'commander')], 20, 4, () => ({ t: '지상 쪽 방송 안건에 군단 의견을 냈습니다. "경고는 보내되 문은 열지 말 것."', k: 'note' })),
  E('aeg_leg_cmd_old', [35, 100], [T('AEG_LEGION', 'commander')], 25, 3, () => ({ t: '젊은 장교들 앞에서 옛 전투 이야기를 했습니다. 이름을 몇 개 불렀고, 살아 있는 사람은 없었습니다.', k: 'note', fx: { h: -1 } })),
  trans('aeg_leg_trans', 'AEG_LEGION', [17, 100], {
    nco: '하사관이 되었습니다. 분대 하나가 손에 들어왔습니다.',
    officer: (s) => ({ t: '장교로 배정되었습니다. 순찰 노선을 그리는 쪽이 되었습니다.', k: 'big', fx: { h: 3 } }),
    commander: (s) => ({ t: '군단 사령관이 되었습니다. 원로원이 이름을 불렀습니다.', k: 'big', fx: { h: 3 } }),
  }),
  after('aeg_leg_after', 'AEG_LEGION', [17, 100], {
    seaborn: '깊은 곳에서 온 것과 마주쳤습니다. 살아 돌아왔고 복무는 끝났습니다.',
    kia: '교전에서 크게 다쳤습니다. 군단은 재배정 통지를 보냈습니다.',
    backlash: '감독 임무 중 일이 있었습니다. 살아남았고 보고서는 봉인되었습니다.',
    discharged: '복무를 마쳤습니다. 발전계획소에서 새 배정 통지가 왔습니다.',
    _: '군단을 떠났습니다. 외벽 쪽을 보는 버릇은 남았습니다.',
  }),
  E('aeg_leg_aff_legion', [16, 100], ['aff:AEG_LEG_LEGION'], 25, 3, () => ({ t: '에기르 군단 본대. 대열이 길었고 바깥은 그보다 넓었습니다.', k: 'note' })),
  E('aeg_leg_aff_patrol', [16, 100], ['aff:AEG_LEG_PATROL'], 25, 3, () => ({ t: '해양 순찰대. 도시 밖을 도는 일이었고 도시 밖은 늘 같은 어둠이었습니다.', k: 'note', fx: { hl: -1 } })),
  E('aeg_leg_aff_supervisor', [16, 100], ['aff:AEG_LEG_SUPERVISOR'], 25, 3, (s) => ({ t: s.year <= 1095 ? '헌터 감독관. 흰 머리들 뒤에 서서 손을 총에 두는 일이었습니다.' : '옛 헌터 감독관 보직. 감독할 사람은 없었고 서류만 남았습니다.', k: 'bad', fx: { h: -1 } })),
  canon('aeg_canon_gladiia', [1085, 1095], [T('AEG_LEGION')], [16, 50], '흰 머리의 중대장이 출항 전 갑판에서 헌터들 이름을 한 명씩 불렀습니다. 군단 병사들은 멀리서 들었습니다.'),

  // ══════════ AEG_HUNTER 어비설 헌터 (핵심, 1080~1095) ══════════
  E('aeg_hun_app_change', [16, 45], [T('AEG_HUNTER', 'applied')], 40, 1, () => ({ t: '개조가 진행되었습니다. 머리카락이 희어졌고 눈이 붉어졌습니다. 거울을 보는 데 며칠 걸렸습니다.', k: 'bad', fx: { hl: -3, cap: { skill: 0.3 } } })),
  E('aeg_hun_app_strength', [16, 45], [T('AEG_HUNTER', 'applied')], 30, 2, () => ({ t: '힘이 달라졌습니다. 문손잡이 하나를 부러뜨렸고, 그 뒤로 손에 힘을 빼는 법을 배웠습니다.', k: 'ev', fx: { cap: { skill: 0.1 } } })),
  E('aeg_hun_app_noarts', [16, 45], [T('AEG_HUNTER', 'applied')], 25, 3, () => ({ t: '아츠가 되지 않았습니다. 대신 쇠로 된 무기를 받았고 그것이 몸에 맞았습니다.', k: 'note' })),
  E('aeg_hun_app_watch', [16, 45], [T('AEG_HUNTER', 'applied')], 25, 3, () => ({ t: '군단 감독관이 뒤에 서 있었습니다. 손은 총에 있었고, 그것이 규정이었습니다.', k: 'note', fx: { h: -1 } })),
  E('aeg_hun_hun_sortie', [17, 50], [T('AEG_HUNTER', 'hunter')], 30, 2, () => ({ t: '출격 12명, 귀환 11명. 돌아온 사람 수를 세는 것이 임무의 끝이었습니다.', k: 'ev', fx: { standing: 2, hl: -1 }, f: F('헌터 중대 출격 기록') })),
  E('aeg_hun_hun_blood', [17, 50], [T('AEG_HUNTER', 'hunter')], 25, 3, () => ({ t: '피가 끓는 것을 느꼈습니다. 가라앉히는 데 밤이 다 갔습니다.', k: 'bad', fx: { h: -2 } })),
  E('aeg_hun_hun_company', [17, 50], [T('AEG_HUNTER', 'hunter')], 25, 3, () => ({ t: '중대 식사. 흰 머리 서른이 한 식탁에 앉으면 말이 적었습니다.', k: 'warm', fx: { h: 1 } })),
  E('aeg_hun_hun_city', [17, 50], [T('AEG_HUNTER', 'hunter')], 25, 3, () => ({ t: '도시에 들어갔습니다. 사람들이 길을 비켰고, 그것이 존경인지 두려움인지 묻지 않았습니다.', k: 'note' })),
  E('aeg_hun_cap_names', [22, 55], [T('AEG_HUNTER', 'captain')], 30, 2, () => ({ t: '중대장으로 출항 전 이름을 불렀습니다. 돌아와서 다시 불렀고, 두 번째가 짧았습니다.', k: 'bad', fx: { standing: 2, h: -2 } })),
  E('aeg_hun_cap_order', [22, 55], [T('AEG_HUNTER', 'captain')], 25, 3, () => ({ t: '군단 명령과 중대 판단이 어긋났습니다. 중대 판단을 택했고 보고서에는 명령대로 적었습니다.', k: 'note', fx: { standing: 1 } })),
  E('aeg_hun_cap_lost', [22, 55], [T('AEG_HUNTER', 'captain')], 20, 4, () => ({ t: '중대원 하나가 의식을 잃고 비늘이 돋았습니다. 감독관이 규정대로 했습니다. 중대장은 보고서에 서명했습니다.', k: 'loss', fx: { h: -4 } })),
  E('aeg_hun_cap_deep', [22, 55], [T('AEG_HUNTER', 'captain')], 25, 3, () => ({ t: '더 깊은 곳으로 내려갔습니다. 빛이 없는 곳에서 눈이 붉게 빛났고, 그것이 유일한 빛이었습니다.', k: 'ev', fx: { standing: 1 } })),
  E('aeg_hun_ins_class', [25, 70], [T('AEG_HUNTER', 'instructor')], 30, 2, () => ({ t: '교관으로 새 지원자들 앞에 섰습니다. 거울 보는 법부터 가르쳤습니다.', k: 'ev' })),
  E('aeg_hun_ins_rule', [25, 70], [T('AEG_HUNTER', 'instructor')], 25, 3, () => ({ t: '감독 규정을 지원자들에게 읽어 주었습니다. 사살 조항에서 아무도 질문하지 않았습니다.', k: 'bad', fx: { h: -2 } })),
  E('aeg_hun_ins_old', [25, 70], [T('AEG_HUNTER', 'instructor')], 25, 3, () => ({ t: '옛 중대원 이름을 지원자 한 명에게 붙여 불렀습니다. 바로 고쳤습니다.', k: 'note', fx: { h: -1 } })),
  E('aeg_hun_ins_senate', [25, 70], [T('AEG_HUNTER', 'instructor')], 20, 4, () => ({ t: '원로원이 헌터 제도에 관해 물었습니다. 답은 짧았고 원로들은 더 묻지 않았습니다.', k: 'note' })),
  trans('aeg_hun_trans', 'AEG_HUNTER', [16, 70], {
    hunter: (s) => ({ t: '중대에 배치되었습니다. 중대원들은 머리색이 같았고 그것으로 인사가 끝났습니다.', k: 'big', fx: { h: 2 } }),
    captain: (s) => ({ t: '중대장이 되었습니다. 이름을 부르는 쪽이 되었습니다.', k: 'big', fx: { h: 2 } }),
    instructor: '교관으로 물러났습니다. 출격 명단에서 이름이 빠졌습니다.',
  }),
  // 1095 전멸(캐논) — 살아남은 헌터는 그 해에 절반이 사라진다
  E('aeg_hun_1095', [16, 70], [T('AEG_HUNTER')], 300, 0, (s) => {
    if (s.rng.chance(0.5)) { s.die('seaborn', '시테러 토벌전 전사'); return null; }
    s.S.flags.hunter1095 = s.S.age;
    return { t: '그 해의 토벌전. 두 분대가 돌아오지 않았습니다. 돌아온 사람들은 이름을 부르지 않았습니다.', k: 'loss', fx: { h: -8, hl: -5, standing: 5 } };
  }, { c: (s) => s.year === 1095 && !s.S.flags.hunter1095 }),
  E('aeg_hun_1100_end', [16, 75], [T('AEG_HUNTER')], 300, 0, (s) => {
    s.leaveTrack('discharged', { quiet: true });
    return { t: '헌터 제도가 끝났습니다. 흰 머리와 붉은 눈은 남았고, 발전계획소에서 새 배정 통지가 왔습니다.', k: 'loss', fx: { h: -3 } };
  }, { c: (s) => s.year >= 1100 }),
  E('aeg_hun_aff_2', [16, 70], ['aff:AEG_HUN_2'], 25, 3, () => ({ t: '2중대. 중대장은 이름을 전부 외웠고 매번 다시 불렀습니다.', k: 'note' })),
  E('aeg_hun_aff_3', [16, 70], ['aff:AEG_HUN_3'], 25, 3, () => ({ t: '3중대. 가장 깊이 내려가는 중대였고 가장 적게 말했습니다.', k: 'note' })),
  E('aeg_hun_aff_infected', [16, 70], ['aff:AEG_HUN_INFECTED'], 25, 3, () => ({ t: '감염 헌터. 피 속에 두 가지가 있었고 둘 다 조용한 날이 드물었습니다.', k: 'bad', fx: { hl: -1 } })),
  canon('aeg_canon_skadi', [1088, 1095], [T('AEG_HUNTER')], [16, 50], '붉은 눈의 헌터가 보급품을 받고도 아무 말 없이 바다 쪽으로 돌아섰습니다. 같은 중대 사람도 이름을 부르지 않았습니다.'),

  // ══════════ AEG_EXPAT 지상 이주민 (핵심, 전환 전용) ══════════
  E('aeg_exp_mig_air', [16, 60], [T('AEG_EXPAT', 'migrate')], 40, 1, () => ({ t: '지상 첫해. 공기가 말랐습니다. 피부에 물을 바르는 것이 아침 첫 일이 되었습니다.', k: 'bad', fx: { hl: -2 } })),
  E('aeg_exp_mig_look', [16, 60], [T('AEG_EXPAT', 'migrate')], 30, 2, (s) => ({ t: curName(s) + ' 사람들이 쳐다보았습니다. 피부와 걸음을 보았고 묻지는 않았습니다.', k: 'note', fx: { h: -1 } })),
  E('aeg_exp_mig_water', [16, 60], [T('AEG_EXPAT', 'migrate')], 30, 2, () => ({ t: '물값이 봉급의 48%였습니다. 지상 사람들은 그것을 이해하지 못했습니다.', k: 'bad', fx: { money: -1 }, f: F('체류 기록 가계 조사') })),
  E('aeg_exp_mig_primitive', [16, 60], [T('AEG_EXPAT', 'migrate')], 25, 3, () => ({ t: '지상의 기계를 보았습니다. 원시적이라는 말이 먼저 떠올랐고, 그 말을 입 밖에 내지 않는 법을 배웠습니다.', k: 'note' })),
  E('aeg_exp_tech_fix', [18, 70], [T('AEG_EXPAT', 'technician')], 30, 2, (s) => ({ t: curName(s) + '의 수리 공장. 에기르 기술자가 고치면 기계가 더 오래 갔고, 값은 같았습니다.', k: 'ev', fx: { standing: 1 } })),
  E('aeg_exp_tech_river', [18, 70], [T('AEG_EXPAT', 'technician')], 25, 3, () => ({ t: '강 환경 조사를 맡았습니다. 물속에 들어가는 일은 에기르 기술자 몫이었고 그것이 편했습니다.', k: 'warm', fx: { hl: 1 } })),
  E('aeg_exp_tech_paper', [18, 70], [T('AEG_EXPAT', 'technician')], 25, 3, () => ({ t: '체류 서류에 "에기르"라고 적혔습니다. 그 칸이 다른 칸보다 오래 심사되었습니다.', k: 'note', fx: { h: -1 } })),
  E('aeg_exp_tech_home', [18, 70], [T('AEG_EXPAT', 'technician')], 25, 3, () => ({ t: '고향 소식은 오지 않았습니다. 바다 쪽을 보는 일이 줄었습니다.', k: 'note' })),
  E('aeg_exp_set_neighbor', [22, 90], [T('AEG_EXPAT', 'settled')], 30, 2, () => ({ t: '이웃이 피부를 더 보지 않았습니다. 정착이라는 말을 그때 처음 썼습니다.', k: 'warm', fx: { h: 2 } })),
  E('aeg_exp_set_rain', [22, 90], [T('AEG_EXPAT', 'settled')], 25, 3, () => ({ t: '비 오는 날이 가장 좋았습니다. 지상 사람들은 그날 우산을 들고 투덜댔습니다.', k: 'warm', fx: { hl: 1 } })),
  E('aeg_exp_set_kids', [22, 90], [T('AEG_EXPAT', 'settled')], 25, 3, () => ({ t: '아이들이 지상 말을 먼저 썼습니다. 에기르 말은 집 안에서만 남았습니다.', k: 'note' }), { c: (s) => s.S.fam.kids.some((k) => k.alive) }),
  E('aeg_exp_set_news', [22, 90], [T('AEG_EXPAT', 'settled')], 20, 4, (s) => ({ t: s.year >= 1100 ? '에기르에서 지상으로 방송이 왔다는 소식을 들었습니다. 몇십 년 만의 소식이었고, 내용은 경고였습니다.' : '에기르 소식은 없었습니다. 있어도 지상까지 오지 않았습니다.', k: 'note' })),
  trans('aeg_exp_trans', 'AEG_EXPAT', [16, 90], {
    technician: '현지 기술자로 자리를 잡았습니다. 체류 서류에 직업란이 채워졌습니다.',
    settled: (s) => ({ t: '정착했습니다. 바다 밑 도시는 이제 이야기 속 장소였습니다.', k: 'big', fx: { h: 3 } }),
  }),
  after('aeg_exp_after', 'AEG_EXPAT', [16, 90], {
    exile: '추방 명령이 왔습니다. 에기르로는 돌아갈 수 없었고, 다른 지상으로 갔습니다.',
    arrest: '체포되었다 풀려났습니다. 혈통이 이유였고 서류에는 다른 이유가 적혔습니다.',
    deport: '서류 없이 지내다 발각되었습니다. 어디로 보낼지 그들도 몰랐습니다.',
    _: '기술자 일을 그만두었습니다. 피부에 물을 바르는 아침은 그대로였습니다.',
  }),
  E('aeg_exp_aff_913', [16, 90], ['aff:AEG_EXP_913'], 25, 3, () => ({ t: '섬사람. 913년에 온 사람들의 후손이라고 서류에 적혔습니다. 그 서류가 보호가 아니라 표식이었습니다.', k: 'bad', fx: { h: -1 } })),
  E('aeg_exp_aff_higashi', [16, 90], ['aff:AEG_EXP_HIGASHI'], 25, 3, () => ({ t: '극동의 상어인. 가문에 편입된 에기르들이 있었고, 그들은 바다를 다른 이름으로 불렀습니다.', k: 'note' })),
  E('aeg_exp_aff_tech', [16, 90], ['aff:AEG_EXP_TECH'], 25, 3, () => ({ t: '기술자 계약. 수리하고 받는 돈의 반은 물값, 반은 체류 서류 갱신비였습니다.', k: 'note' })),

  // ══════════ AEG_RESEARCH 연구소 연구원 ══════════
  E('aeg_res_ass_sample', [18, 35], [T('AEG_RESEARCH', 'assistant')], 30, 2, () => ({ t: '조수로 표본을 분류했습니다. 선사 유물과 어제 올라온 것이 같은 서랍에 들어갔습니다.', k: 'ev', fx: { cap: { learn: 0.05 } } })),
  E('aeg_res_ass_night', [18, 35], [T('AEG_RESEARCH', 'assistant')], 25, 3, () => ({ t: '밤 연구실. 조력자 로봇이 불을 꺼 주지 않았습니다. 사람이 끄라고 되어 있었습니다.', k: 'note' })),
  E('aeg_res_res_paper', [22, 60], [T('AEG_RESEARCH', 'researcher')], 30, 2, () => ({ t: '연구 결과를 투지장에 올렸습니다. 첨삭 30건, 반박 2, 동의 1.', k: 'ev', fx: { standing: 1 }, f: F('투지장 열람 기록') })),
  E('aeg_res_res_seal', [22, 60], [T('AEG_RESEARCH', 'researcher')], 25, 3, () => ({ t: '연구 하나가 봉인되었습니다. 이유는 적히지 않았고 연구자는 다른 과제를 받았습니다.', k: 'bad', fx: { h: -1 } })),
  E('aeg_res_sr_team', [28, 70], [T('AEG_RESEARCH', 'senior')], 30, 2, () => ({ t: '수석 연구원으로 조수 넷을 받았습니다. 넷 중 하나가 밤에 혼자 표본실에 있었습니다. 보고하지 않았습니다.', k: 'note', fx: { h: -1 } })),
  E('aeg_res_sr_channel', [28, 70], [T('AEG_RESEARCH', 'senior')], 25, 3, () => ({ t: '지상 접촉 채널 계획에 자문했습니다. 찬성 쪽에 섰고 그것이 기록에 남았습니다.', k: 'ev', fx: { standing: 1 } })),
  E('aeg_res_dir_sign', [35, 110], [T('AEG_RESEARCH', 'director')], 30, 2, () => ({ t: '소장 서명이 적힌 공문이 연구소 벽에 붙었습니다. 아래 줄은 아무도 읽지 않았습니다.', k: 'ev' })),
  E('aeg_res_dir_war', [35, 110], [T('AEG_RESEARCH', 'director')], 25, 3, () => ({ t: '총전쟁설계 회의. 지도 위에 둥지가 몇 개 더 찍혔습니다.', k: 'bad', fx: { h: -2 } })),
  trans('aeg_res_trans', 'AEG_RESEARCH', [19, 110], {
    researcher: '연구원 자격을 받았습니다. 자기 이름으로 표본 서랍 하나를 받았습니다.',
    senior: '수석 연구원이 되었습니다. 조수들이 질문을 가져왔습니다.',
    director: (s) => ({ t: '소장이 되었습니다. 벽에 붙는 공문에 서명하는 쪽이 되었습니다.', k: 'big', fx: { h: 3 } }),
  }),
  after('aeg_res_after', 'AEG_RESEARCH', [19, 110], {
    accident: '연구실 사고가 있었습니다. 몸이 예전처럼 움직이지 않았습니다.',
    heresy: '교단 연루 심문을 받았습니다. 살아남았고 연구는 봉인되었습니다.',
    _: '연구소를 나왔습니다. 표본 냄새가 옷에 남았습니다.',
  }),
  E('aeg_res_aff_prehistory', [18, 110], ['aff:AEG_RES_PREHISTORY'], 25, 3, () => ({ t: '선사 연구소. 바다 밑에서 나온 것이 바다보다 오래되었다는 결론이 매년 나왔습니다.', k: 'note' })),
  E('aeg_res_aff_social', [18, 110], ['aff:AEG_RES_SOCIAL'], 25, 3, () => ({ t: '사회행정감독연구소. 사람의 하루를 숫자로 적는 곳. 자기 하루도 적혔습니다.', k: 'note' })),
  E('aeg_res_aff_miliarium', [18, 110], ['aff:AEG_RES_MILIARIUM'], 25, 3, () => ({ t: '밀리아리움 채널 계획. 지상에 가장 가까운 도시에서 지상에 보낼 말을 골랐습니다.', k: 'note', fx: { standing: 1 } })),
  canon('aeg_canon_abitus', [1085, 1101], [T('AEG_RESEARCH', 'assistant')], [18, 35], '총전쟁설계사의 서명이 적힌 공문이 연구소 벽에 붙었습니다. 조수들은 서명만 보았고 그 아래 줄은 아무도 읽지 않았습니다.'),

  // ══════════ AEG_ADMIN 데이터·시설 관리 ══════════
  E('aeg_adm_staff_data', [18, 40], [T('AEG_ADMIN', 'staff')], 30, 2, () => ({ t: '데이터 입력. 시민 한 사람의 하루가 줄 하나였고, 하루에 400줄이었습니다.', k: 'ev', f: F('데이터 관리국 일일 처리량') })),
  E('aeg_adm_staff_valve', [18, 40], [T('AEG_ADMIN', 'staff')], 25, 3, () => ({ t: '시설 점검. 밸브 하나가 느슨했고 조이는 데 하루가 갔습니다.', k: 'note' })),
  E('aeg_adm_man_team', [22, 60], [T('AEG_ADMIN', 'manager')], 30, 2, () => ({ t: '관리자로 직원 10명을 맡았습니다. 그중 하나가 밤 당번을 늘 자청했습니다. 묻지 않았습니다.', k: 'note', f: F('시설 관리국 당번표') })),
  E('aeg_adm_man_report', [22, 60], [T('AEG_ADMIN', 'manager')], 25, 3, () => ({ t: '구역 보고서. 숫자는 평온했고 평온한 숫자가 집정관실로 올라갔습니다.', k: 'ev', fx: { standing: 1 } })),
  E('aeg_adm_chief_zone', [30, 70], [T('AEG_ADMIN', 'chief')], 30, 2, () => ({ t: '구역 책임자. 구역의 물과 빛이 책상 위 숫자였고, 숫자가 틀리면 사람이 왔습니다.', k: 'ev' })),
  E('aeg_adm_chief_church', [30, 70], [T('AEG_ADMIN', 'chief')], 20, 4, () => ({ t: '직원 하나가 교단 신도로 밝혀졌습니다. 그 직원이 관리하던 시설 목록을 다시 점검했습니다. 밤새.', k: 'bad', fx: { h: -2, hl: -1 } })),
  trans('aeg_adm_trans', 'AEG_ADMIN', [19, 70], {
    manager: '관리자가 되었습니다. 직원 명단이 책상에 올라왔습니다.',
    chief: '구역 책임자가 되었습니다. 구역 지도가 벽에 걸렸습니다.',
  }),
  after('aeg_adm_after', 'AEG_ADMIN', [19, 70], {
    heresy: '교단 연루 심문이 있었습니다. 살아남았고 재배정 통지가 왔습니다.',
    _: '관리 일을 떠났습니다. 밸브 조이는 손놀림은 남았습니다.',
  }),
  E('aeg_adm_aff_data', [18, 70], ['aff:AEG_ADM_DATA'], 25, 3, () => ({ t: '데이터 관리. 시민의 숫자를 지키는 일이었고 자기 숫자도 그 안에 있었습니다.', k: 'note' })),
  E('aeg_adm_aff_facility', [18, 70], ['aff:AEG_ADM_FACILITY'], 25, 3, () => ({ t: '시설 관리. 벽 너머는 바다였고 벽은 숫자로 관리되었습니다.', k: 'note' })),
  E('aeg_adm_aff_arena', [18, 70], ['aff:AEG_ADM_ARENA'], 25, 3, () => ({ t: '투지장 운영. 올라온 글을 분류하고 첨삭을 세는 일. 자기 글은 올리지 않았습니다.', k: 'note' })),

  // ══════════ AEG_FARM 해조 농장·다이버 (생업) ══════════
  E('aeg_far_app_dive', [14, 30], [T('AEG_FARM', 'apprentice')], 30, 2, () => ({ t: '견습 다이버. 처음 내려간 깊이는 선배의 반이었습니다.', k: 'ev', fx: { cap: { skill: 0.05 } } })),
  E('aeg_far_app_kelp', [14, 30], [T('AEG_FARM', 'apprentice')], 25, 3, () => ({ t: '해조를 묶는 법을 배웠습니다. 풀리면 하루치가 떠내려갔습니다.', k: 'note' })),
  E('aeg_far_div_pest', [16, 60], [T('AEG_FARM', 'diver')], 30, 2, () => ({ t: '"해충"이 농장에 붙었습니다. 떼어 냈고, 그것이 무엇인지는 농장에서 말하지 않았습니다.', k: 'bad', fx: { hl: -1 } })),
  E('aeg_far_div_harvest', [16, 60], [T('AEG_FARM', 'diver')], 25, 3, () => ({ t: '수확 200kg. 발광 어류가 그물에 섞여 올라왔고 밤에 농장이 밝았습니다.', k: 'warm', fx: { h: 1, money: 1 }, f: F('해조 농장 할당 대장') })),
  E('aeg_far_chief_quota', [25, 70], [T('AEG_FARM', 'chief')], 30, 2, () => ({ t: '농장 책임자로 할당량 12톤을 받았습니다. 숫자는 집정관실에서 왔고 바다는 숫자를 몰랐습니다.', k: 'ev', fx: { standing: 1 }, f: F('해조 농장 할당 대장') })),
  E('aeg_far_chief_legion', [25, 70], [T('AEG_FARM', 'chief')], 25, 3, () => ({ t: '군단에 "해충" 출동을 청했습니다. 군단은 그것을 다른 이름으로 적었습니다.', k: 'note', fx: { h: -1 } })),
  trans('aeg_far_trans', 'AEG_FARM', [15, 70], {
    diver: '정식 다이버가 되었습니다. 자기 깊이가 생겼습니다.',
    chief: '농장 책임자가 되었습니다. 할당량 통지가 이름으로 왔습니다.',
  }),
  after('aeg_far_after', 'AEG_FARM', [15, 70], {
    drowning: '잠수 사고가 있었습니다. 끌려 나왔고 다시 내려가지 않았습니다.',
    seaborn: '농장에 온 것과 마주쳤습니다. 살아남았고 농장은 폐쇄되었습니다.',
    ruin: '농장이 할당을 채우지 못해 폐쇄되었습니다. 재배정 통지가 왔습니다.',
    _: '농장을 떠났습니다. 손의 해조 냄새는 오래 남았습니다.',
  }),
  E('aeg_far_aff_farm', [14, 70], ['aff:AEG_FAR_FARM'], 25, 3, () => ({ t: '해조 농장. 줄마다 해조, 줄 끝마다 사람 하나.', k: 'note' })),
  E('aeg_far_aff_gallery', [14, 70], ['aff:AEG_FAR_GALLERY'], 25, 3, () => ({ t: '갤러리 다이버. 도시 유리 밖을 닦는 일이었고 안에서 사람들이 구경했습니다.', k: 'note' })),

  // ══════════ AEG_ARTIST 밴드·창작자 ══════════
  E('aeg_art_deb_post', [14, 35], [T('AEG_ARTIST', 'debater')], 30, 2, () => ({ t: '투지장에 첫 글을 올렸습니다. 첨삭 12, 그중 4가 같은 사람이었습니다.', k: 'ev', fx: { cap: { arts: 0.05 } }, f: F('투지장 열람 기록') })),
  E('aeg_art_deb_rival', [14, 35], [T('AEG_ARTIST', 'debater')], 25, 3, () => ({ t: '토론 상대가 집정관의 보좌였습니다. 졌고, 그 글은 가장 많이 읽혔습니다.', k: 'note', fx: { standing: 2 } })),
  E('aeg_art_band_stage', [16, 60], [T('AEG_ARTIST', 'band')], 30, 2, () => ({ t: '밴드 공연. 도시 빛을 낮춘 홀에 400명, 소리가 벽을 쳤습니다.', k: 'warm', fx: { h: 2, standing: 1 }, f: F('공연장 입장 기록') })),
  E('aeg_art_band_song', [16, 60], [T('AEG_ARTIST', 'band')], 25, 3, () => ({ t: '지상 노래를 하나 배웠습니다. 가사는 몰랐고 곡은 외웠습니다.', k: 'note' })),
  E('aeg_art_tour_surface', [18, 65], [T('AEG_ARTIST', 'tour')], 30, 2, () => ({ t: '지상 순회. 공연은 좋았고 공기는 말랐습니다. 무대 뒤에 물통이 늘 있었습니다.', k: 'ev', fx: { hl: -1, h: 2 } })),
  E('aeg_art_tour_back', [18, 65], [T('AEG_ARTIST', 'tour')], 25, 3, () => ({ t: '순회를 마치고 돌아왔습니다. 지상 이야기를 묻는 사람이 많았고 믿는 사람은 적었습니다.', k: 'note' })),
  trans('aeg_art_trans', 'AEG_ARTIST', [15, 65], {
    band: '밴드에 들었습니다. 이름이 포스터에 작게 실렸습니다.',
    tour: (s) => ({ t: '지상 순회 허가가 났습니다. 물통과 악기를 함께 챘습니다.', k: 'big', fx: { h: 3 } }),
  }),
  after('aeg_art_after', 'AEG_ARTIST', [15, 65], {
    fade: '글도 노래도 더는 읽히지 않았습니다. 재배정 통지가 왔습니다.',
    exile: '지상에서 돌아올 수 없게 되었습니다. 악기는 가지고 있었습니다.',
    _: '무대를 내려왔습니다. 손가락은 아직 곡을 기억했습니다.',
  }),
  E('aeg_art_aff_alive', [14, 65], ['aff:AEG_ART_ALIVE'], 25, 3, () => ({ t: '밴드 이름은 해가 질 때까지 살아 있자는 뜻이었습니다. 바다 밑에는 해가 없었고, 그래서 지은 이름이었습니다.', k: 'note' })),
  E('aeg_art_aff_philo', [14, 65], ['aff:AEG_ART_PHILO'], 25, 3, () => ({ t: '철학 글. 집정관 회의가 장려했고 읽는 사람은 투지장 안에만 있었습니다.', k: 'note' })),
  E('aeg_art_aff_arena', [14, 65], ['aff:AEG_ART_ARENA'], 25, 3, () => ({ t: '투지장. 글이 올라가면 첨삭이 달렸고 첨삭에 다시 첨삭이 달렸습니다.', k: 'note' })),

  // ══════════ 생업·배정·동네 (A11: AEG_FARM·AEG_EXPAT) + 수분 의존 ══════════
  E('aeg_live_assignday', [14, 90], [N, 'arch:A11'], 25, 3, () => ({ t: '배정일. 발전계획소 통지 300건이 구역에 붙었고 사람들은 자기 이름보다 이웃 이름을 먼저 찾았습니다.', k: 'note', f: F('발전계획소 배정 통지') })),
  E('aeg_live_lightday', [14, 90], [N, 'arch:A11'], 25, 3, (s) => ({ t: fest(s, 0) + '. 도시 빛을 낮추고 깊은 곳의 빛을 보는 날이었습니다.', k: 'warm', fx: { h: 2 } })),
  E('aeg_live_tide', [14, 90], [N, 'arch:A11'], 20, 4, (s) => ({ t: fest(s, 1) + '. 조류가 바뀌는 날 농장 줄을 다시 묶었습니다.', k: 'ev' })),
  E('aeg_live_robot', [14, 90], [N, 'arch:A11'], 20, 4, () => ({ t: '조력자 로봇이 고장 났습니다. 사람이 그 일을 했고, 하루가 길었습니다.', k: 'note', fx: { hl: -1 } })),
  E('aeg_live_food', [14, 90], [N, 'arch:A11'], 20, 4, (s) => ({ t: '저녁은 ' + cul(s).food + '. 발광 어류는 접시에서도 빛났습니다.', k: 'warm' })),
  E('aeg_live_pressure', [14, 90], [N, 'arch:A11'], 15, 5, () => ({ t: '외벽 압력 경보가 한 번 울렸다 꺼졌습니다. 아무도 하던 일을 멈추지 않았습니다.', k: 'note' })),
  E('aeg_dry_surface', [10, 100], ['race:aegir', 'migrant', '!' + N], 30, 3, () => ({ t: '마른 공기. 피부가 갈라졌고 물을 바르는 데 아침이 다 갔습니다.', k: 'bad', fx: { hl: -2 } })),
  E('aeg_dry_heat', [10, 100], ['race:aegir', 'migrant', '!' + N], 15, 5, (s) => { if (s.rng.chance(0.08)) { s.die('dehydration', '탈수'); return null; } return { t: '더운 계절. 물을 구하지 못한 하루가 있었고, 그 하루가 길었습니다.', k: 'bad', fx: { hl: -5 } }; }),
  E('aeg_news_1100', [10, 120], ['aegir'], 60, 0, (s) => ({ t: here(s) ? '지상으로 방송이 나갔습니다. 몇십 년 만의 첫 말이었고 내용은 경고였습니다.' : '에기르에서 지상으로 방송이 왔다고 들었습니다. 고향의 목소리였고 내용은 경고였습니다.', k: 'note', fx: { h: here(s) ? 1 : 2 } }), { c: (s) => s.year >= 1100 && s.year <= 1101 }),

  // ══════════ 이주 신참(newcomer, 에기르에 온 비에기르) ══════════
  E('aeg_new_wet', [10, 90], [N, 'newcomer'], 50, 3, () => ({ t: '에기르에 와서 처음 배운 것은 습도였습니다. 옷이 마르지 않았고 아무도 그것을 불편하다고 하지 않았습니다.', k: 'note' })),
  E('aeg_new_assign', [14, 90], [N, 'newcomer'], 40, 4, () => ({ t: '발전계획소에서 통지가 왔습니다. 외부인에게도 배정은 있었고, 거부란은 없었습니다.', k: 'note' })),
];

export const decisions = {
  // 어비설 헌터 지원(1080~1095, 전 진로)
  aeg_hunter_apply: {
    tags: [N, '!' + T('AEG_HUNTER'), '!' + T('AEG_EXPAT')], once: true,
    ok: (s) => s.year >= 1080 && s.year <= 1095 && s.S.age >= 16 && s.S.age <= 40 && s.S.cap.skill >= 0.2 && s.rng.chance(0.5),
    build: () => ({ title: '지원', body: '어비설 헌터 지원 공고가 구역에 붙었습니다. 이전 신분과 직업은 묻지 않습니다. 개조를 받고, 돌아오지 못할 수 있습니다.',
      choices: [{ k: 'no', label: '지원하지 않는다', auto: 2 }, { k: 'yes', label: '지원한다', sub: '개조·전 진로 포기', auto: 0.6 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '지원하지 않았습니다. 공고는 다음 달에도 붙어 있었습니다.', k: 'note' };
      if (s.S.cap.skill < 0.5 && s.rng.chance(0.5)) return { t: '지원했고 떨어졌습니다. 신체 검사에서였습니다. 배정은 그대로였습니다.', k: 'bad', fx: { h: -2 } };
      const aff = s.S.ori.on ? 'AEG_HUN_INFECTED' : s.rng.chance(0.5) ? 'AEG_HUN_2' : 'AEG_HUN_3';
      if (!s.enterTrack('AEG_HUNTER', { how: 'switch', via: 'volunteer', aff, quiet: true })) return '지원은 받아들여지지 않았습니다.';
      return { t: '지원했고 받아들여졌습니다. 개조실 문이 닫혔고, 열렸을 때 거울 속 머리는 희었습니다.', k: 'big', fx: { h: -2 } };
    },
  },
  // 지상행
  aeg_surface: {
    tags: [N, '!' + T('AEG_EXPAT'), '!' + T('AEG_HUNTER')], once: true,
    ok: (s) => s.S.age >= 16 && s.S.age <= 50 && s.rng.chance(0.12),
    build: (s) => {
      const dests = ['iberia', 'columbia', 'yan', 'higashi'].filter((d) => s.data.nationById[d]);
      return { title: '지상', body: '지상행 허가가 날 수 있습니다. 공기는 마르고, 거기 사람들은 에기르를 반기지 않습니다. 돌아오는 길은 보장되지 않습니다.',
        choices: dests.map((d) => ({ k: d, label: ro(s.data.nationById[d].name) + ' 간다', sub: d === 'iberia' ? '섬사람의 길' : d === 'higashi' ? '상어인' : '기술자 계약', auto: d === 'iberia' ? 0.2 : 0.3 })).concat([{ k: 'stay', label: '바다에 남는다', auto: 2.5 }]) };
    },
    apply: (s, k) => {
      if (k === 'stay') return { t: '남았습니다. 허가서는 서랍에 들어갔습니다.', k: 'note' };
      if (!goSurface(s, k)) return '허가는 나지 않았습니다.';
      return { t: ro(s.nation.name) + ' 올라갔습니다. 첫 숨이 말랐고, 물통을 꼭 쥐었습니다.', k: 'big', fx: { h: -1, hl: -2 } };
    },
  },
  // 발전계획소 재배정 신청
  aeg_reassign: {
    tags: [N, '!' + T('AEG_HUNTER'), '!' + T('AEG_EXPAT')], once: true,
    ok: (s) => !!s.S.track && s.S.age >= 20 && s.S.age - s.S.track.since >= 3 && s.S.track.standing < 40 && s.rng.chance(0.4),
    build: () => ({ title: '재배정', body: '발전계획소에 재배정을 신청할 수 있습니다. 신청은 기록에 남고, 결과는 신청자가 정하지 않습니다.',
      choices: [{ k: 'apply', label: '신청한다', auto: 1 }, { k: 'no', label: '지금 배정에 남는다', auto: 1.5 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '신청하지 않았습니다. 배정은 그대로였습니다.', k: 'note' };
      if (s.rng.chance(0.4)) return { t: '신청은 반려되었습니다. 이유는 "적성 일치"였습니다.', k: 'bad', fx: { h: -2, standing: -3 } };
      s.S.flags.switchOpen = true;
      return { t: '재배정 심사가 열렸습니다. 다른 자리의 통지가 올 수 있습니다.', k: 'ev', fx: { h: 1 } };
    },
  },
  // 심해교회 침투 목격
  aeg_deep_witness: {
    tags: [N], once: true,
    ok: (s) => !!s.S.track && s.S.age >= 18 && s.rng.chance(0.25),
    build: () => ({ title: '목격', body: '같은 구역 사람이 밤에 바다 쪽 격벽 앞에서 노래하는 것을 보았습니다. 그 노래는 투지장에 없는 노래였습니다.',
      choices: [{ k: 'report', label: '보고한다', auto: 1 }, { k: 'silent', label: '못 본 것으로 한다', auto: 1 }, { k: 'listen', label: '노래를 끝까지 듣는다', auto: 0.3 }] }),
    apply: (s, k) => {
      if (k === 'report') return { t: '보고했습니다. 그 사람은 재배정되었고 어디로 갔는지는 통지에 없었습니다.', k: 'bad', fx: { standing: 3, h: -2 } };
      if (k === 'silent') return { t: '못 본 것으로 했습니다. 그 사람은 다음 날 아침 인사를 했습니다.', k: 'note' };
      return { t: '끝까지 들었습니다. 다음 날 그 사람이 조개껍데기 하나를 건넸습니다. 받았습니다.', k: 'note', fx: { h: 1 } };
    },
  },
  // 혼인 덮어쓰기: 배정 결혼은 선택지 자체가 다르다
  marry_assigned: {
    once: false, at: 0.45,
    ok: (s) => { const r = marryRoll(s); return !!(r && r.type && r.type.id === 'assigned'); },
    build: (s, p) => {
      const r = marryRoll(s); if (!r) return null; Object.assign(p, r);
      if (!here(s)) return ENGINE_DECISIONS.marry.build(s, p);
      return { title: r.type.name, body: '발전계획소 배정 통지가 왔습니다. 배우자란에 ' + r.prospect.name + '. 적성 일치율 옆에 거부란은 없고, 재배정 신청란만 있습니다.',
        choices: [{ k: 'accept', label: '배정을 받는다', auto: 2.5 }, { k: 'hold', label: '재배정을 신청한다', sub: '기록에 남는다', auto: 0.5 }, { k: 'decline', label: '통지를 돌려보낸다', sub: '기록에 남는다', auto: 0.2 }] };
    },
    apply: (s, k, p) => {
      if (!here(s)) return ENGINE_DECISIONS.marry.apply(s, k, p);
      s.S.flags.y_marry = null;
      if (!p || !p.prospect || !p.type) return '통지는 없던 일이 되었습니다.';
      if (k === 'hold') return { t: '재배정을 신청했습니다. 기록원 장부에 한 줄이 남았고 다음 통지는 늦게 왔습니다.', k: 'note', fx: { standing: -2 } };
      if (k === 'decline') return { t: '통지를 돌려보냈습니다. 기록원 장부에 한 줄이 남았습니다. 그 줄은 지워지지 않습니다.', k: 'bad', fx: { standing: -4, h: 1 } };
      if (!marry(s, p.prospect, p.type, { quiet: true })) return '배정은 이루어지지 않았습니다.';
      return { t: wa(p.prospect.name) + ' 같은 주거 구획에 배정되었습니다. 첫 저녁은 서로의 배정 통지서를 읽으며 보냈습니다.', k: 'warm', fx: { h: 3 } };
    },
  },
  marry_cohort: {
    once: false, at: 0.45,
    ok: (s) => { const r = marryRoll(s); return !!(r && r.type && r.type.id === 'cohort'); },
    build: (s, p) => {
      const r = marryRoll(s); if (!r) return null; Object.assign(p, r);
      if (!here(s)) return ENGINE_DECISIONS.marry.build(s, p);
      return { title: r.type.name, body: wa(r.prospect.name) + ' 동기 집단 결연. 같은 해 같은 양육실에서 자란 사람입니다. 발전계획소는 결연을 승인만 합니다.',
        choices: [{ k: 'accept', label: '결연한다', auto: 2 }, { k: 'hold', label: '한 해 미룬다', auto: 0.6 }, { k: 'decline', label: '하지 않는다', auto: 0.4 }] };
    },
    apply: (s, k, p) => {
      if (!here(s)) return ENGINE_DECISIONS.marry.apply(s, k, p);
      s.S.flags.y_marry = null;
      if (!p || !p.prospect || !p.type) return '결연은 없던 일이 되었습니다.';
      if (k === 'hold') return '한 해 미루었습니다.';
      if (k === 'decline') return '결연하지 않았습니다. 동기 집단 모임은 그대로 나갔습니다.';
      if (!marry(s, p.prospect, p.type, { quiet: true })) return '결연은 이루어지지 않았습니다.';
      return { t: wa(p.prospect.name) + ' 결연했습니다. 양육실 시절 사진이 하나 있었고, 둘 다 거기 있었습니다.', k: 'warm', fx: { h: 4 } };
    },
  },
  home_change: {
    once: false, gap: 5, at: 0.7,
    ok: ENGINE_DECISIONS.home_change.ok,
    build: (s) => {
      if (!here(s)) return ENGINE_DECISIONS.home_change.build(s);
      const opts = homeChangeOptions(s).slice(0, 3); if (!opts.length) return null;
      return { title: '주거 구획', body: '주거 구획 변경 신청이 열렸습니다. 발전계획소가 배정하고, 신청자는 희망만 적습니다.',
        choices: opts.map((h) => ({ k: h.id, label: h.name, sub: Math.round(s.med * h.buy).toLocaleString() + ' LMD', auto: h.w ?? 1 })).concat([{ k: 'no', label: '지금 구획에 남는다', auto: 1 }]) };
    },
    apply: (s, k) => {
      if (!here(s)) return ENGINE_DECISIONS.home_change.apply(s, k);
      if (k === 'no') return '지금 구획에 남았습니다.';
      const h = homeChangeOptions(s).find((x) => x.id === k);
      if (!h || !setHousing(s, h, { buy: true, quiet: true })) return '배정은 바뀌지 않았습니다.';
      return { t: ro(h.name) + ' 배정이 바뀌었습니다. 통지서 한 장, 열쇠 하나.', k: 'warm', fx: { h: 2 } };
    },
  },
};

export default { events, decisions };

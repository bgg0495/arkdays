// W9b 우르수스 진로 콘텐츠. 계약: docs/설계_명세_v1.md §11 + "W7 메모 — 스키마 고정".
// 핵심 진로 5: URS_SOLDIER(군단) · URS_MINE(광산 수용소, forced) · URS_FARM(농민) · URS_WORKER(공장) · URS_UNIV(학생회).
// 나머지 10 진로는 단계마다 2개 + 전환 + 몰락 후일담. 생업(arch:A11) 계절·축일 이벤트, 소속(aff:) 변주, 캐논 인물 1회성(D43),
// 이주·신참·관계(rel:institutional = 살카즈)·visit:ursus, 국가 전용 결정(탈영·밀고·학생회·수용소 거래·탈출·marry_*·home_change).
// 톤: D25(메타·현실 참조 없음), D31(각주는 숫자 있을 때만), 담백한 "~했습니다"체. 무거운 주제는 결과만.
import { F, orgF, medX, eul, iga, eun, ro, wa, lifeRoll } from '../_util.js';
import { ENGINE_DECISIONS } from '../../src/engine/choices.js';
import { homeChangeOptions, setHousing } from '../../src/engine/housing.js';
import { marry as engineMarry } from '../../src/engine/marriage.js';
import { hoist } from '../_dispatch.js';

const N = 'ursus';
const here = (s) => s.S.cur === N;
const fl = (s) => s.S.flags;
const standing = (s) => (s.S.track ? s.S.track.standing : 0);
const affName = (s, d) => (s.aff ? s.aff.name : d);
const affIs = (s, id) => !!(s.S.track && s.S.track.aff === id);
const pick = (s, arr) => s.rng.pick(arr);
const inTrack = (s, id) => !!(s.S.track && s.S.track.id === id);
/** 나이당 1회 확률 롤(결정 ok 는 큐에 넣을 때와 열 때 두 번 불리므로 같은 해에는 같은 답) */
const yr = (s, key, p) => { const k = 'w9b_y_' + key; const v = s.S.flags[k]; if (v && v.age === s.S.age) return v.v; const r = s.rng.chance(p); s.S.flags[k] = { age: s.S.age, v: r }; return r; };

/** 승급 직후 1회(단계 전환 서사용) */
const justPromoted = (s, id) => { const tr = s.S.track; if (!tr || tr.id !== id || tr.stage < 1 || s.S.age - tr.stageSince > 1) return false; return !s.S.flags['w9b_pr_' + id + '_' + tr.stage]; };
const markPromo = (s) => { s.S.flags['w9b_pr_' + s.S.track.id + '_' + s.S.track.stage] = s.S.age; };
/** 몰락 직후 1회(후일담용). 진로를 떠났거나(lastTrack) 강등으로 남아 있거나(demote) */
const fell = (s, id) => { const f = s.S.flags; if (f.lastFallAt == null || s.S.age - f.lastFallAt > 1 || f['w9b_aft_' + f.lastFallAt]) return false; const tr = s.S.track; if (tr && tr.id === id) return f.lastFallOutcome === 'demote'; return f.lastTrack === id && f.lastTrackLeftAt === f.lastFallAt; };
const markFall = (s) => { s.S.flags['w9b_aft_' + s.S.flags.lastFallAt] = true; };
/** 캐논 인물 게이트(D43): 연도·생애 3명 상한·1회 */
const canonOk = (s, id, y0, y1) => s.year >= y0 && s.year <= y1 && (s.S.flags.canonSeen || 0) < 3 && !s.S.flags['canon_' + id];
const seeCanon = (s, id) => { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; s.S.flags['canon_' + id] = s.year; };

/** 단계 이벤트 축약: st(id, 진로, 단계, 나이, w, gap, 본문|함수, 종류, fx, 각주함수) */
function st(id, track, stage, a, w, gap, body, k = 'note', fx = null, f = null, extra = {}) {
  // 단계 태그가 이미 자리를 고르므로 나이 상한은 넉넉히(은퇴 전환·늦은 진입을 받는다)
  return { id, a: [a[0], Math.max(a[1], 80)], tags: ['track:' + track + ':' + stage], w, gap, ...extra,
    run: (s) => { const t = typeof body === 'function' ? body(s) : body; const r = t && typeof t === 'object' ? { k, ...t } : { t, k }; if (fx) r.fx = typeof fx === 'function' ? fx(s) : fx; if (f) r.f = f(s); return r; } };   // W12: body 가 {t,f} 객체를 돌려주던 2건([object Object]) 흡수
}
/** 단계 전환 서사: 진로 하나에 하나, 현 단계 id 로 본문을 고른다 */
function promoEv(id, track, a, byStage) {
  return { id, a, tags: ['track:' + track], w: 220, gap: 1, c: (s) => justPromoted(s, track) && !!byStage[s.stage.id],
    run: (s) => { markPromo(s); return { t: byStage[s.stage.id], k: 'ev' }; } };
}
/** 몰락 후일담: 원인별 본문. 진로를 떠난 뒤(또는 강등 뒤) 한 번 */
function fallEv(id, track, byCause) {
  return { id, a: [6, 95], tags: [N], w: 240, gap: 1, c: (s) => fell(s, track) && !!byCause[s.S.flags.lastFall],
    run: (s) => { markFall(s); const c = s.S.flags.lastFall; return { t: byCause[c], k: ['death', 'expel', 'exile', 'prison'].includes(s.S.flags.lastFallOutcome) ? 'loss' : 'bad' }; } };
}

export const events = [
  // ════════════════════════════════════════════════════════════════════════
  // 1. URS_SOLDIER 병사 (핵심) — private · nco · captain
  // ════════════════════════════════════════════════════════════════════════
  st('urs_sol_pv_winter', 'URS_SOLDIER', 'private', [17, 40], 32, 2, (s) => pick(s, ['국경 초소에서 첫겨울을 났습니다. 눈이 사람보다 많았고, 교대는 두 시간마다였습니다.', '보초 중에 총열이 손에 붙었습니다. 장갑을 벗은 것이 잘못이었습니다. 손가락은 다 남았습니다.']), 'ev', { hl: -2, standing: 2 }),
  st('urs_sol_pv_drill', 'URS_SOLDIER', 'private', [17, 40], 30, 2, (s) => affName(s, '군단') + ' 훈련장에서 하루 종일 같은 동작을 했습니다. 중사는 저녁에야 이름을 외웠습니다. 제 이름은 아니었습니다.', 'note', { cap: { skill: 0.03 } }),
  st('urs_sol_pv_hunt', 'URS_SOLDIER', 'private', [17, 40], 28, 3, '감염자 색출 작전에 배정되었습니다. 마을 하나를 돌았고, 끌려 나온 사람의 수는 세지 않았습니다. 그날 밤 흑빵이 넘어가지 않았습니다.', 'bad', { h: -3, standing: 2 }),
  st('urs_sol_pv_bar', 'URS_SOLDIER', 'private', [17, 40], 26, 3, (s) => pick(s, ['외출 날 술집에서 다른 중대와 주먹이 오갔습니다. 다음 날 양쪽 다 영창에 들어갔고, 사흘 뒤 양쪽 다 나왔습니다.', '급료가 나왔습니다. 반은 어머니에게 보냈고, 반은 외출 하루에 없어졌습니다.']), 'note', (s) => ({ money: medX(s, 0.05), h: 1 })),
  st('urs_sol_nco_squad', 'URS_SOLDIER', 'nco', [20, 45], 32, 2, (s) => pick(s, ['제 분대가 생겼습니다. 열둘이었고 봄에는 열이었습니다. 둘은 전사가 아니라 동상이었습니다.', '신병 하나가 밤에 울었습니다. 못 들은 것으로 했습니다. 제가 그 자리에서 울었을 때도 누군가 못 들은 것으로 해 주었습니다.']), 'ev', { standing: 3, cap: { ties: 0.03 } }),
  st('urs_sol_nco_border', 'URS_SOLDIER', 'nco', [20, 45], 30, 3, (s) => s.rng.chance(0.4) ? { t: '카시미어 국경에서 서로 총을 겨눈 채 사흘을 보냈습니다. 넷째 날 양쪽이 동시에 내렸습니다. 명령은 아니었습니다.', f: F('군단 사령부 국경 근무 일지') } : { t: '사미 국경 숲에서 순찰을 돌았습니다. 숲 안쪽에서 누군가 보고 있었습니다. 나오지는 않았습니다.' }, 'note', { hl: -1, standing: 2 }),
  st('urs_sol_nco_order', 'URS_SOLDIER', 'nco', [20, 45], 28, 3, '위에서 내려온 명령이 아래로 내려갈 때 제 입을 거쳤습니다. 명령은 그대로 전했고, 목소리만 제 것이었습니다.', 'note', { h: -2, standing: 2 }),
  st('urs_sol_nco_ceiling', 'URS_SOLDIER', 'nco', [22, 45], 24, 4, (s) => s.S.status.noble ? '장교 추천서가 올라갔습니다. 집안 이름이 먼저 읽혔고, 제 복무 기록은 나중이었습니다.' : '장교 추천서를 올렸습니다. 돌아온 서류에는 출신 칸에 줄이 그어져 있었습니다. 중사 계급장은 그대로였습니다.', 'note', (s) => s.S.status.noble ? { standing: 3 } : { h: -2 }),
  st('urs_sol_cp_company', 'URS_SOLDIER', 'captain', [24, 50], 32, 2, (s) => pick(s, ['중대를 받았습니다. 백이십 명의 이름을 외우는 데 한 계절이 걸렸고, 그 이름이 줄어드는 데는 한 주가 걸렸습니다.', '제 서명으로 사람이 움직였습니다. 서명을 하기 전에 한 번 더 읽는 버릇이 생겼습니다.']), 'ev', { standing: 3 }),
  st('urs_sol_cp_officer', 'URS_SOLDIER', 'captain', [24, 50], 28, 3, '귀족 출신 소위가 전입해 왔습니다. 저보다 열 살 어렸고, 두 해 뒤 저보다 위에 있었습니다.', 'note', { h: -2 }),
  st('urs_sol_cp_rebel', 'URS_SOLDIER', 'captain', [24, 55], 24, 4, (s) => ({ t: s.year >= 1101 ? '극북 쪽으로 올라가는 부대에 제 중대 이름이 없었습니다. 그날은 안도했고, 다음 날에는 그 안도가 부끄러웠습니다.' : '진압 출동이 있었습니다. 상대는 총 대신 삽을 들고 있었습니다. 보고서에는 "질서 회복"이라고 적었습니다.' }), 'bad', { h: -3, standing: 2 }),
  st('urs_sol_cp_pension', 'URS_SOLDIER', 'captain', [30, 55], 22, 4, '퇴역 연금 산정표가 왔습니다. 복무 연수에 곱하는 숫자가 작았습니다. 그래도 공장보다는 나았습니다.', 'note', (s) => ({ money: medX(s, 0.1) }), (s) => orgF(s, '퇴역 연금 산정표')),
  promoEv('urs_sol_promo', 'URS_SOLDIER', [17, 55], {
    nco: '중사 계급장을 받았습니다. 바느질은 제가 했고, 축하는 아무도 하지 않았습니다. 그날부터 저를 보고 서는 사람이 생겼습니다.',
    captain: '대위 임관이 났습니다. 평민 출신으로는 끝까지 온 것이라고 중사가 말했습니다. 끝이라는 말이 오래 남았습니다.',
  }),
  fallEv('urs_sol_fall', 'URS_SOLDIER', {
    kia: '전투에서 쓰러졌습니다. 들것에 실려 후방으로 왔고, 군복은 거기서 벗었습니다. 몸은 전과 같지 않았습니다.',
    desert: '부대를 떠났습니다. 사흘 뒤 역에서 잡혔고, 서류에는 탈영이라고 적혔습니다. 그 뒤로 간 곳은 북쪽이었습니다.',
    courtmartial: '군사 재판이 열렸습니다. 변호는 짧았고 판결은 더 짧았습니다. 수감되었습니다.',
  }),

  // ════════════════════════════════════════════════════════════════════════
  // 2. URS_MINE 광산 수용소 (핵심 · forced A5) — bell · miner · driver
  // ════════════════════════════════════════════════════════════════════════
  st('urs_mine_bell_bell', 'URS_MINE', 'bell', [6, 80], 36, 2, (s) => pick(s, ['종을 쳤습니다. 교대가 끝나는 종을 정확히 치지 않으면 갱 안의 사람이 나오지 못합니다. 손이 떨려도 시간은 지켰습니다.', '새벽 네 시에 일어나 물탱크를 보고 종 줄을 잡았습니다. 하루가 종 두 번과 그 사이였습니다.']), 'bad', { hl: -2, h: -1 }),
  st('urs_mine_bell_moss', 'URS_MINE', 'bell', [6, 80], 28, 3, '약이라고 받은 것은 마른 이끼였습니다. 어른들이 씹어 보라고 했습니다. 씹었습니다. 기침은 그대로였습니다.', 'bad', { hl: -2 }),
  st('urs_mine_bell_adult', 'URS_MINE', 'bell', [6, 80], 26, 3, (s) => pick(s, ['어느 광부가 제 몫의 빵을 반으로 잘라 주었습니다. 이름은 묻지 않았고, 다음 교대에 그 사람은 없었습니다.', '부모가 식량과 약을 더 달라고 모여 서명을 했습니다. 서명한 사람들은 다음 날 보이지 않았습니다. 그 뒤 저를 챙긴 것은 다른 광부였습니다.']), 'loss', { h: -3, cap: { ties: 0.03 } }),
  st('urs_mine_bell_chip', 'URS_MINE', 'bell', [6, 80], 24, 4, '목 뒤에 작은 것을 심었습니다. 광구 울타리를 넘으면 터진다고 했습니다. 울타리 쪽을 보지 않는 버릇이 생겼습니다.', 'bad', { h: -3 }),
  st('urs_mine_miner_shaft', 'URS_MINE', 'miner', [12, 80], 36, 2, (s) => pick(s, ['갱도에 들어가 종이 울릴 때까지 캤습니다. 가루가 폐에 내려앉는 것이 느껴졌습니다. 느껴지지 않는 날이 더 무서웠습니다.', '교대 종이 늦게 울렸습니다. 셋이 나오지 못했습니다. 종치기 아이는 그날 저녁 밥을 받지 못했습니다.']), 'bad', { hl: -3, h: -1 }),
  st('urs_mine_miner_quota', 'URS_MINE', 'miner', [12, 80], 28, 3, (s) => ({ t: '하루 할당이 ' + s.rng.ri(12, 20) + '수레로 올랐습니다. 채우지 못한 반은 저녁 배급이 반이었습니다.', f: orgF(s, '광구 작업반 할당 기록') }), 'bad', { hl: -2, standing: 1 }),
  st('urs_mine_miner_guard', 'URS_MINE', 'miner', [12, 80], 26, 3, (s) => pick(s, ['경비병이 심심하다고 했습니다. 그날 밤 막사에서 한 사람이 돌아오지 않았습니다. 다음 날 아무도 그 이름을 부르지 않았습니다.', '순찰대가 떠날 때까지 일했습니다. 순찰대는 늦게 떠났습니다.']), 'loss', { h: -3 }),
  st('urs_mine_miner_death', 'URS_MINE', 'miner', [12, 80], 24, 3, '옆자리 광부가 결정화로 갔습니다. 몸이 굳은 자리에서 캐낸 것까지 수레에 실렸습니다. 수레는 세었고, 사람은 세지 않았습니다.', 'loss', { h: -4, hl: -1 }),
  st('urs_mine_drv_truck', 'URS_MINE', 'driver', [16, 80], 34, 2, (s) => pick(s, ['수레 대신 화물차 운전대를 잡았습니다. 광구 안에서만 움직이는 차였고, 울타리 앞에서는 저절로 발이 멈췄습니다.', '감독 완장을 받았습니다. 할당을 적는 쪽이 되었습니다. 적는 손이 캐는 손보다 가벼운 것은 아니었습니다.']), 'note', (s) => ({ money: medX(s, 0.03), standing: 2 })),
  st('urs_mine_drv_between', 'URS_MINE', 'driver', [16, 80], 28, 3, '경비병과 광부 사이에 섰습니다. 양쪽 다 저를 자기편으로 보지 않았습니다. 그 자리에서 오래 버틴 사람은 없었습니다.', 'bad', { h: -2 }),
  st('urs_mine_drv_exhaust', 'URS_MINE', 'driver', [16, 80], 24, 4, '광맥이 얕아진다는 말이 돌았습니다. 고갈된 광구에서 사람이 어떻게 되는지는 모두가 알았습니다. 아무도 말하지 않았습니다.', 'bad', { h: -3 }),
  st('urs_mine_drv_dam', 'URS_MINE', 'driver', [16, 80], 18, 5, (s) => affIs(s, 'URS_MINE_VOLGRAD') ? '댐 벽에서 물이 새는 것을 보고 감독관에게 보고했습니다. 감독관은 할당을 먼저 말했습니다.' : '극북에서 광부들이 봉기했다는 말이 수레꾼 입을 타고 왔습니다. 그날 밤 막사가 조용했습니다.', 'note', { h: -1 }),
  promoEv('urs_mine_promo', 'URS_MINE', [6, 80], {
    miner: '종 줄에서 손을 떼고 곡괭이를 받았습니다. 키가 자랐다는 뜻이었습니다. 종은 다른 아이가 쳤습니다.',
    driver: '갱도에서 나와 운전석에 앉았습니다. 가루가 덜 들어오는 자리였습니다. 그 자리를 보는 눈들이 등에 느껴졌습니다.',
  }),
  fallEv('urs_mine_fall', 'URS_MINE', { camp: '다른 광구로 이송되었습니다. 이름이 바뀐 것은 없었고, 종 소리만 조금 달랐습니다.' }),
  // 소속 변주
  { id: 'urs_mine_aff_farnorth', a: [6, 80], tags: ['aff:URS_MINE_FARNORTH'], w: 22, gap: 3,
    run: (s) => ({ t: s.year >= 1101 ? '극북 광구에 연구원 복장이 늘었습니다. 불려 간 사람들은 다른 막사로 갔고, 돌아온 사람은 말을 더듬었습니다.' : '극북 광구의 밤은 길었습니다. 오로라가 떴고, 아무도 올려다보지 않았습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'urs_mine_aff_chorna', a: [6, 80], tags: ['aff:URS_MINE_CHORNA'], w: 22, gap: 3,
    run: (s) => ({ t: '초르나 교도소 광구에는 감염자보다 정치범이 많았습니다. 교수였다는 사람이 곡괭이 잡는 법을 배웠습니다. 저보다 서툴렀습니다.', k: 'note', fx: { cap: { learn: 0.03 } } }) },
  { id: 'urs_mine_aff_ural', a: [6, 80], tags: ['aff:URS_MINE_URAL'], w: 18, gap: 4,
    run: (s) => ({ t: '우랄 광구에 황녀 사진이 걸린 막사가 있었습니다. 누가 걸었는지 몰랐고, 떼는 사람도 없었습니다.', k: 'note' }) },
  // 캐논 인물(D43): 베토치키
  { id: 'urs_canon_vetochki', a: [6, 80], tags: ['track:URS_MINE'], w: 60, c: (s) => canonOk(s, 'vetochki', 1097, 1106),
    run: (s) => { seeCanon(s, 'vetochki'); return { t: '베토치키라는 아이가 종을 치던 광구에서 왔다고 했습니다. 어느 광부가 그 이름을 작게 말했고, 더 묻는 사람은 없었습니다.', k: 'note' }; } },

  // ════════════════════════════════════════════════════════════════════════
  // 3. URS_FARM 농민 (핵심 · A11) — serf · own · chief
  // ════════════════════════════════════════════════════════════════════════
  st('urs_farm_serf_rent', 'URS_FARM', 'serf', [12, 60], 32, 2, (s) => pick(s, ['수확의 절반이 지주 창고로 갔습니다. 나머지 절반에서 종자를 뺐습니다. 뺀 뒤가 겨울 몫이었습니다.', '지주 집 관리인이 장부를 들고 왔습니다. 장부 숫자는 늘 관리인 쪽이 맞았습니다.']), 'note', (s) => ({ money: -medX(s, 0.03) })),
  st('urs_farm_serf_oat', 'URS_FARM', 'serf', [12, 60], 30, 2, (s) => affIs(s, 'URS_FARM_NORTH') ? '이끼귀리가 서리 전에 익지 않았습니다. 익지 않은 것을 베어 말렸습니다. 말린 것은 소가 먼저 먹었습니다.' : '초원에 봄이 왔습니다. 땅이 풀리는 날 온 마을이 밭에 나갔습니다. 그날은 밥을 두 번 먹었습니다.', 'note', (s) => affIs(s, 'URS_FARM_NORTH') ? { hl: -1, h: -1 } : { h: 1 }),
  st('urs_farm_serf_tied', 'URS_FARM', 'serf', [14, 60], 26, 3, '옆 마을 소작이 떠나려다 끌려왔습니다. 땅에 묶인 사람은 땅과 함께 팔린다는 말을 그날 처음 들었습니다.', 'bad', { h: -2 }),
  st('urs_farm_serf_patrol', 'URS_FARM', 'serf', [12, 60], 24, 3, '순찰대 차가 마을에 들어왔습니다. 한 집 문이 열렸고, 닫힐 때는 사람이 하나 줄어 있었습니다. 밭일은 그대로 했습니다.', 'bad', { h: -2 }),
  st('urs_farm_own_land', 'URS_FARM', 'own', [18, 65], 32, 2, (s) => pick(s, ['제 이름으로 된 밭이 생겼습니다. 좁았고 돌이 많았습니다. 돌을 고르는 데 두 해가 갔습니다.', '수확이 끝나고 지주 몫을 떼지 않았습니다. 그 느낌이 낯설어 창고 문을 두 번 확인했습니다.']), 'warm', (s) => ({ money: medX(s, 0.06), h: 2 })),
  st('urs_farm_own_tax', 'URS_FARM', 'own', [18, 65], 28, 3, (s) => ({ t: '세리가 왔습니다. 곡물세가 ' + s.rng.ri(15, 30) + '수레였습니다. 작년보다 셋 많았습니다.', f: orgF(s, '곡물세 징수 대장') }), 'note', (s) => ({ money: -medX(s, 0.08) })),
  st('urs_farm_own_horse', 'URS_FARM', 'own', [18, 65], 26, 3, (s) => pick(s, ['말 한 마리를 들였습니다. 이름을 붙였고, 아이들이 먼저 불렀습니다.', '씨감자를 바꿨습니다. 옆 마을 것이 서리에 강하다고 했습니다. 반은 맞았습니다.']), 'note', { h: 1, cap: { skill: 0.03 } }),
  st('urs_farm_own_army', 'URS_FARM', 'own', [18, 65], 22, 4, '군단 징발대가 왔습니다. 말과 곡물을 가져가고 종이를 한 장 남겼습니다. 종이로는 겨울을 넘길 수 없었습니다.', 'bad', (s) => ({ money: -medX(s, 0.1), h: -2 })),
  st('urs_farm_chief_meeting', 'URS_FARM', 'chief', [30, 75], 32, 2, (s) => pick(s, ['마을 회의를 열었습니다. 다리 수리와 종자 분배를 정했습니다. 결정은 늘 제가 했고, 책임도 그랬습니다.', '세리와 마을 사이에 섰습니다. 세리는 숫자를 말했고 마을은 제 얼굴을 봤습니다.']), 'note', { standing: 3 }),
  st('urs_farm_chief_patrol', 'URS_FARM', 'chief', [30, 75], 26, 3, '순찰대가 마을 명단을 요구했습니다. 명단을 썼습니다. 이름 하나를 빼고 썼고, 그 이름은 그날 밤 마을을 떠났습니다.', 'bad', { h: -3, standing: 2 }),
  st('urs_farm_chief_famine', 'URS_FARM', 'chief', [30, 75], 24, 4, (s) => affIs(s, 'URS_FARM_NORTH') ? '북부 기근이 다시 왔습니다. 창고를 열어 나눴습니다. 봄까지 가지 못한 집이 둘 있었습니다.' : '가뭄이 들었습니다. 우물 순서를 정하는 것이 촌장의 일이었습니다. 순서에 불만 없는 집은 없었습니다.', 'loss', { h: -3 }),
  st('urs_farm_chief_forum', 'URS_FARM', 'chief', [30, 75], 20, 5, (s) => s.year >= 1102 ? '시민 포럼이라는 곳에서 농촌 대표를 묻는 편지가 왔습니다. 마을에서는 제 이름을 적었습니다.' : '지주가 바뀌었습니다. 새 지주는 수도에 살았고, 얼굴은 한 번도 보지 못했습니다.', 'note', { standing: 2 }),
  promoEv('urs_farm_promo', 'URS_FARM', [12, 75], {
    own: '지주에게 밭값을 다 갚았습니다. 서류에 제 이름이 적히는 것을 보았습니다. 글자를 몰랐지만 제 이름은 알았습니다.',
    chief: '마을이 저를 촌장으로 세웠습니다. 세리가 처음 찾아오는 집이 되었다는 뜻이었습니다.',
  }),
  fallEv('urs_farm_fall', 'URS_FARM', {
    starvation: '겨울이 길었습니다. 창고가 비었고, 몸이 먼저 비었습니다. 봄에 마을을 떠나 도시로 갔습니다.',
    ruin: '빚이 밭을 가져갔습니다. 다시 지주 밭을 매는 소작으로 돌아갔습니다. 손은 같은 일을 했습니다.',
    raid: '마을이 습격당했습니다. 창고가 타고 사람이 다쳤습니다. 저도 그중 하나였습니다.',
  }),

  // ════════════════════════════════════════════════════════════════════════
  // 4. URS_WORKER 공장 노동 (핵심 · A11) — worker · skilled · manager
  // ════════════════════════════════════════════════════════════════════════
  st('urs_work_wk_shift', 'URS_WORKER', 'worker', [14, 60], 32, 2, (s) => pick(s, ['공장 교대는 열두 시간이었습니다. 기계 소리가 귓속에 남아 집에서도 들렸습니다.', '컨베이어 앞에 섰습니다. 같은 동작을 하루 ' + s.rng.ri(3000, 6000) + '번 했다고 반장이 말했습니다. 세어 본 적은 없었습니다.']), 'note', { hl: -2 }, (s) => (s.rng.chance(0.5) ? orgF(s, '공장 노동 시간 등록') : null)),
  st('urs_work_wk_dorm', 'URS_WORKER', 'worker', [14, 60], 28, 3, '공장 기숙사는 여덟 명이 한 방이었습니다. 코 고는 소리에 순서가 있었습니다. 제 순서는 셋째였다고 합니다.', 'note', { h: -1, cap: { ties: 0.02 } }),
  st('urs_work_wk_pay', 'URS_WORKER', 'worker', [14, 60], 26, 3, (s) => pick(s, ['급료가 두 주 늦었습니다. 공장 앞 가게는 외상을 끊었습니다.', '급료 봉투가 얇았습니다. 공제 항목이 하나 늘어 있었고, 이름은 "기숙사 난방"이었습니다.']), 'bad', (s) => ({ money: -medX(s, 0.04), h: -1 })),
  st('urs_work_wk_sixteen', 'URS_WORKER', 'worker', [14, 60], 22, 4, (s) => affIs(s, 'URS_WORK_KATORGA') ? '열여섯이라고 부르는 건달들이 공장 문 앞에서 돈을 걷었습니다. 안 내는 사람은 다음 날 교대에 못 섰습니다.' : '퇴근길에 건달들이 길을 막았습니다. 봉투에서 얼마를 꺼내 주었습니다. 다음 날도 같은 자리에 있었습니다.', 'bad', (s) => ({ money: -medX(s, 0.03), h: -2 })),
  st('urs_work_sk_machine', 'URS_WORKER', 'skilled', [18, 65], 32, 2, (s) => pick(s, ['기계가 멈추면 저를 불렀습니다. 고치는 데 반나절, 설명하는 데 한나절이었습니다.', '새 기계가 들어왔습니다. 설명서가 외국 글자였습니다. 그림만 보고 돌렸고, 돌아갔습니다.']), 'note', { standing: 2, cap: { skill: 0.03 } }),
  st('urs_work_sk_apprentice', 'URS_WORKER', 'skilled', [18, 65], 28, 3, '신입에게 손을 가르쳤습니다. 제가 배울 때 맞은 자리에서 저는 때리지 않았습니다. 그 아이가 더 빨리 배웠습니다.', 'warm', { h: 2, cap: { ties: 0.03 } }),
  st('urs_work_sk_accident', 'URS_WORKER', 'skilled', [18, 65], 24, 3, '옆 라인에서 손이 들어갔습니다. 기계는 삼십 분 섰고, 사람은 돌아오지 않았습니다. 그 자리에 다음 날 다른 사람이 섰습니다.', 'loss', { h: -3 }),
  st('urs_work_sk_march', 'URS_WORKER', 'skilled', [18, 65], 20, 4, (s) => s.year >= 1101 && affIs(s, 'URS_WORK_KATORGA') ? '카토르가 공장이 문을 닫는다는 말이 돌았습니다. 노동자들이 거리로 나갔습니다. 저도 뒷줄에 섰습니다. 뒷줄도 사진에 찍혔습니다.' : '공장이 생산량을 줄였습니다. 교대가 둘에서 하나로 줄었고, 사람도 그만큼 줄었습니다.', 'bad', { h: -2 }),
  st('urs_work_mg_floor', 'URS_WORKER', 'manager', [25, 65], 32, 2, (s) => pick(s, ['작업장 전체가 제 책임이 되었습니다. 생산량 표가 벽에 걸렸고, 그 표가 저를 보았습니다.', '해고 명단을 제가 썼습니다. 이름 하나를 쓰고 지우고 다시 쓰는 데 밤이 갔습니다.']), 'note', { standing: 3, h: -1 }),
  st('urs_work_mg_owner', 'URS_WORKER', 'manager', [25, 65], 26, 3, (s) => affIs(s, 'URS_WORK_PERRO') ? '공장 주인이 왔습니다. 새 귀족이라고 했습니다. 생산 실적이 작위가 된다는 말을 그때 들었습니다.' : '공장 주인이 생산량을 올리라고 했습니다. 사람은 늘려 주지 않았습니다. 교대 시간을 늘렸습니다.', 'note', { standing: 2 }),
  st('urs_work_mg_inspection', 'URS_WORKER', 'manager', [25, 65], 24, 4, (s) => ({ t: '내무성 감독관이 다녀갔습니다. 장부 ' + s.rng.ri(3, 7) + '권을 보고 한 권을 가져갔습니다. 가져간 권에 무엇이 있었는지 아직 모릅니다.', f: orgF(s, '공장 감독 기록') }), 'bad', { h: -2 }),
  st('urs_work_mg_platform', 'URS_WORKER', 'manager', [25, 65], 22, 4, (s) => affIs(s, 'URS_WORK_ROSTOV') ? '채굴 플랫폼이 이동했습니다. 작업장 전체가 사흘 동안 흔들렸고, 생산은 멈추지 않았습니다.' : '사무직 자리가 하나 났습니다. 손에 기름이 없는 일이었습니다. 제 손은 아직 기름이 있었습니다.', 'note', { hl: -1 }),
  promoEv('urs_work_promo', 'URS_WORKER', [14, 65], {
    skilled: '숙련공 급료표로 올랐습니다. 기계 하나가 제 것이 되었습니다. 제 것이라는 뜻은 고장도 제 것이라는 뜻이었습니다.',
    manager: '작업장 관리자로 올랐습니다. 작업복 대신 셔츠를 입었습니다. 작업장 사람들이 저를 부르는 말이 바뀌었습니다.',
  }),
  fallEv('urs_work_fall', 'URS_WORKER', {
    layoff: '공장이 사람을 줄였습니다. 명단에 제 이름이 있었습니다. 공장 문 앞에서 한참 서 있다가 걸었습니다.',
    accident: '기계에 다쳤습니다. 공장은 치료비 일부를 냈고, 자리는 비워 두지 않았습니다.',
    raid: '공장 앞 행진에 진압이 들어왔습니다. 맞고 쓰러졌고, 깨어난 곳은 공장이 아니었습니다.',
  }),

  // ════════════════════════════════════════════════════════════════════════
  // 5. URS_UNIV 대학생·학생 조직 (핵심 · A9) — peterheim · university · faction · chair
  // ════════════════════════════════════════════════════════════════════════
  st('urs_univ_ph_class', 'URS_UNIV', 'peterheim', [14, 22], 32, 2, (s) => pick(s, ['피터하임 교실에는 평민과 귀족 자녀가 같이 앉았습니다. 같이 앉았고, 같이 앉은 것은 아니었습니다.', '물리 선생이 제 답안에 동그라미를 두 번 쳤습니다. 집에 가서 그 종이를 벽에 붙였습니다.']), 'note', { cap: { learn: 0.04 } }),
  st('urs_univ_ph_fight', 'URS_UNIV', 'peterheim', [14, 22], 26, 3, '복도에서 귀족 자녀와 평민 학생이 붙었습니다. 교무실에 불려 간 쪽은 한쪽이었습니다.', 'bad', { h: -2 }),
  st('urs_univ_ph_night', 'URS_UNIV', 'peterheim', [14, 22], 26, 3, (s) => affIs(s, 'URS_UNIV_SYMPOSIUM') ? '선배들이 밤에 모여 신문을 만들었습니다. 저는 종이를 접었습니다. 접은 종이에 무엇이 적혔는지는 다음 날 읽었습니다.' : '학교 뒷문으로 전단이 들어왔습니다. 읽은 사람은 많았고, 가진 사람은 없었습니다.', 'note', { cap: { ties: 0.03 } }),
  st('urs_univ_ph_chernobog', 'URS_UNIV', 'peterheim', [14, 22], 20, 5, (s) => s.year >= 1096 && s.year <= 1098 ? '체르노보그에서 온 전학생이 있었습니다. 그 아이는 창가에 앉지 않았습니다. 이유는 묻지 않았습니다.' : '월반 시험이 있었습니다. 한 학년 위 교실에 앉았고, 책상이 작게 느껴졌습니다.', 'note', { cap: { learn: 0.03 } }),
  st('urs_univ_un_lecture', 'URS_UNIV', 'university', [17, 26], 32, 2, (s) => pick(s, ['대학 강의실은 추웠습니다. 교수는 외투를 입고 강의했고, 학생들은 외투를 입고 들었습니다.', '도서관에서 금서 목록을 보았습니다. 목록이 책보다 길었습니다.']), 'note', { cap: { learn: 0.04 } }),
  st('urs_univ_un_faction', 'URS_UNIV', 'university', [17, 26], 30, 2, '학생회 세 분파가 각각 저를 불렀습니다. 신문을 만드는 쪽, 거리로 나가는 쪽, 아무 데도 안 가는 쪽. 셋 다 커피를 사 주었습니다.', 'note', { cap: { ties: 0.03 } }),
  st('urs_univ_un_watch', 'URS_UNIV', 'university', [17, 26], 26, 3, '강의실 뒷자리에 늘 같은 사람이 앉았습니다. 학생은 아니었습니다. 필기를 하지 않았고, 이름은 적었습니다.', 'bad', { h: -2 }),
  st('urs_univ_un_draft', 'URS_UNIV', 'university', [17, 26], 22, 4, (s) => s.year === 1101 || s.year === 1102 ? '제1군단이 학생들을 징집했다는 소식이 왔습니다. 통지서가 아니라 트럭이 먼저 왔다고 했습니다. 그날 저녁 학생들이 거리에 섰습니다.' : '귀족 자녀 하나가 시험을 보지 않고 학점을 받았습니다. 교수는 창밖을 보았습니다.', 'bad', { h: -2 }),
  st('urs_univ_fa_press', 'URS_UNIV', 'faction', [18, 28], 32, 2, (s) => affIs(s, 'URS_UNIV_SYMPOSIUM') ? '심포지엄 신문 교정을 봤습니다. 지운 문장이 실은 문장보다 많았습니다. 지운 문장이 더 좋았습니다.' : affIs(s, 'URS_UNIV_VANGUARD') ? '뱅가드가 밤 집회를 열었습니다. 횃불 대신 손전등이었고, 구호는 작았습니다.' : '자치단 회의에서 아무도 결론을 내지 않았습니다. 그것이 자치단의 방식이었습니다.', 'note', { standing: 3, cap: { ties: 0.03 } }),
  st('urs_univ_fa_arrest', 'URS_UNIV', 'faction', [18, 28], 28, 3, '동급생 하나가 밤에 끌려갔습니다. 극북 이야기를 했다는 이유였습니다. 다음 주 집회는 더 조용했고, 사람은 더 많았습니다.', 'loss', { h: -3 }),
  st('urs_univ_fa_split', 'URS_UNIV', 'faction', [18, 28], 24, 3, '평민 학생과 귀족 학생이 창고 열쇠를 두고 갈라섰습니다. 열쇠는 작았고 금은 길었습니다.', 'bad', { h: -2 }),
  st('urs_univ_fa_rhodes', 'URS_UNIV', 'faction', [18, 28], 18, 5, (s) => { if (s.year >= 1102 && s.rng.chance(0.5)) { s.S.flags.rhodes_legal = s.S.age; return '로도스 아일랜드 지부 사람이 강연을 왔습니다. 끝나고 명함을 받았습니다. 명함을 책 사이에 끼웠습니다.'; } return '졸업한 선배가 교수 자리를 받았습니다. 집회에서 본 얼굴이었고, 강단에서는 모르는 얼굴이었습니다.'; }, 'note', { standing: 1 }),
  st('urs_univ_ch_podium', 'URS_UNIV', 'chair', [19, 30], 32, 2, (s) => pick(s, ['의장으로 연단에 섰습니다. 앞줄은 학생이었고 뒷줄은 학생이 아니었습니다. 양쪽을 보며 말했습니다.', '학교 측과 협상을 했습니다. 요구는 다섯이었고 받아낸 것은 하나였습니다. 하나였습니다.']), 'ev', { standing: 3 }),
  st('urs_univ_ch_police', 'URS_UNIV', 'chair', [19, 30], 28, 3, '내무성 사람이 찾아왔습니다. 차를 마시자고 했고, 차는 마시지 않았습니다. 이름을 몇 개 물었습니다. 대답은 하지 않았습니다.', 'bad', { h: -3 }),
  st('urs_univ_ch_blame', 'URS_UNIV', 'chair', [19, 30], 24, 3, '집회에서 사람이 다쳤습니다. 책임은 의장에게 있었습니다. 사임 요구서가 책상에 올라왔습니다. 서명은 아는 이름들이었습니다.', 'loss', { h: -3, standing: -3 }),
  st('urs_univ_ch_winter', 'URS_UNIV', 'chair', [19, 30], 20, 4, (s) => s.year === 1101 ? '겨울 무도회 날 학생 행진이 있었습니다. 최루탄이 터졌고 명단이 돌았습니다. 명단 첫 줄이 제 이름이었습니다.' : '학생회 예산이 끊겼습니다. 신문은 손으로 썼습니다. 손으로 쓴 것이 더 많이 읽혔습니다.', 'bad', { h: -2 }),
  promoEv('urs_univ_promo', 'URS_UNIV', [14, 30], {
    university: '대학 입학 통지가 왔습니다. 피터하임 교복을 벗었습니다. 체르노보그 억양은 벗지 못했습니다.',
    faction: '학생회 분파에 이름을 올렸습니다. 명단에 오른다는 것이 어떤 뜻인지는 나중에 알았습니다.',
    chair: '학생회 의장으로 뽑혔습니다. 축하하는 손과 걱정하는 손이 같은 수였습니다.',
  }),
  fallEv('urs_univ_fall', 'URS_UNIV', {
    arrest: '밤에 문이 열렸습니다. 학생회 명단이 책상 위에 있었고, 그것으로 충분했습니다. 북쪽으로 갔습니다.',
    kia: '집회에서 밀렸습니다. 쓰러졌고, 병원에서 깼습니다. 학교는 돌아갈 곳이 아니게 되었습니다.',
    ruin: '학비가 끊겼습니다. 집안 사정이었다고 쓰면 됩니다. 책을 팔고 학교를 나왔습니다.',
  }),
  { id: 'urs_univ_aff_vanguard', a: [17, 30], tags: ['aff:URS_UNIV_VANGUARD'], w: 20, gap: 3,
    run: (s) => ({ t: '뱅가드가 교도소 담 밖에서 밤을 샜습니다. 안에서 누가 나오지는 않았습니다. 밖에서 누가 들어가지도 않았습니다. 그날은.', k: 'bad', fx: { h: -2, standing: 2 } }) },
  { id: 'urs_univ_aff_autonomy', a: [17, 30], tags: ['aff:URS_UNIV_AUTONOMY'], w: 20, gap: 3,
    run: (s) => ({ t: '자치단 사람 몇이 조용히 떠났습니다. 떠나는 것도 자치라고 남은 사람들이 말했습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'urs_canon_rosa', a: [15, 30], tags: ['track:URS_UNIV'], w: 60, c: (s) => canonOk(s, 'rosa', 1096, 1101),
    run: (s) => { seeCanon(s, 'rosa'); return { t: '집회 맨 뒤에 귀족 가문 딸이 팔짱을 끼고 서 있었습니다. 로사라고 누가 말했습니다. 말을 거는 사람은 없었습니다.', k: 'note' }; } },

  // ════════════════════════════════════════════════════════════════════════
  // 6. 나머지 진로 — 단계마다 2개 + 전환 + 후일담
  // ════════════════════════════════════════════════════════════════════════
  // ── URS_UNDER 지하조직 (A1) ──
  st('urs_under_new_errand', 'URS_UNDER', 'new', [14, 40], 32, 2, (s) => affIs(s, 'URS_UNDER_REUNION') ? '리유니온 사람이 처음 준 일은 빵을 나르는 것이었습니다. 받는 사람들은 팔에 붕대를 감고 있었습니다.' : '처음 받은 일은 전단을 붙이는 것이었습니다. 붙이는 것보다 떼는 사람을 피하는 것이 일이었습니다.', 'note', { standing: 2 }),
  st('urs_under_new_name', 'URS_UNDER', 'new', [14, 40], 28, 3, '조직에서 새 이름을 받았습니다. 옛 이름은 서류에만 남았고, 서류는 그들이 가지고 있었습니다.', 'note', { h: -1, cap: { ties: 0.03 } }),
  st('urs_under_act_night', 'URS_UNDER', 'action', [16, 50], 32, 2, (s) => pick(s, ['밤에 불려 나갔습니다. 돌아와서 손을 오래 씻었습니다. 물은 차가웠습니다.', '순찰대 차 한 대가 그날 밤 돌아가지 못했습니다. 신문에는 나지 않았습니다.']), 'bad', { h: -3, standing: 3 }),
  st('urs_under_act_pogrom', 'URS_UNDER', 'action', [16, 50], 26, 3, (s) => affIs(s, 'URS_UNDER_16') ? '열여섯 중 하나가 신 귀족의 돈을 받았습니다. 무기가 좋아졌고, 일이 더러워졌습니다.' : '국경 감염자 마을에 겨울 식량을 날랐습니다. 마을은 봄까지 있었고, 여름에는 없었습니다.', 'loss', { h: -2 }),
  st('urs_under_lead_decision', 'URS_UNDER', 'leadership', [22, 60], 32, 2, (s) => pick(s, ['지도부 회의에서 다음 행동을 정했습니다. 손을 든 수와 돌아올 수는 다를 것을 모두 알았습니다.', '밀고자가 있다는 말이 나왔습니다. 이름이 셋 거론되었고, 하나는 제 이름이었습니다.']), 'bad', { h: -3, standing: 3 }),
  st('urs_under_lead_exile', 'URS_UNDER', 'leadership', [22, 60], 24, 4, (s) => { if (s.rng.chance(0.3)) s.S.flags.w9b_rebel = s.S.age; return affIs(s, 'URS_UNDER_FARNORTH') ? '극북 봉기에 사람을 보냈습니다. 보낸 사람 수를 적은 종이를 태웠습니다.' : '국경 너머로 사람을 보내는 길을 열었습니다. 한 번에 다섯씩. 다섯째 사람은 늘 뒤를 돌아봤습니다.'; }, 'note', { standing: 2 }),
  promoEv('urs_under_promo', 'URS_UNDER', [14, 60], { action: '행동대에 들어갔습니다. 손에 쥐는 것이 전단에서 다른 것으로 바뀌었습니다.', leadership: '지도부 자리에 앉았습니다. 앉은 자리에서 보이는 것은 사람의 수였습니다. 줄어드는 수.' }),
  fallEv('urs_under_fall', 'URS_UNDER', { arrest: '새벽에 문이 부서졌습니다. 조직 이름은 끝까지 말하지 않았습니다. 북쪽 광구로 보내졌습니다.', kia: '작전 중 총을 맞았습니다. 동료가 끌어냈습니다. 조직은 저를 더 쓰지 않았습니다.', betrayal: '내부에서 제 이름이 팔렸습니다. 그 밤 국경을 넘었습니다. 뒤는 보지 않았습니다.' }),
  { id: 'urs_under_aff_reunion', a: [14, 60], tags: ['aff:URS_UNDER_REUNION'], w: 22, gap: 3,
    run: (s) => ({ t: s.year >= 1096 && s.year <= 1097 ? '체르노보그에서 온 사람들이 조직 분위기를 바꿨습니다. 말이 줄고 무기가 늘었습니다.' : '리유니온 집회에서 팔을 보여 주는 의식이 있었습니다. 보여 줄 것이 있는 사람과 없는 사람이 다르게 앉았습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'urs_under_aff_unbound', a: [14, 60], tags: ['aff:URS_UNDER_UNBOUND'], w: 22, gap: 3,
    run: (s) => ({ t: '언바운드 사람들은 처형된 교수의 책을 돌려 읽었습니다. 책에는 밑줄이 세 사람 것이었습니다.', k: 'note', fx: { cap: { learn: 0.03 } } }) },

  // ── URS_PATROL 감염자 순찰대 (A4) ──
  st('urs_pat_mem_bonus', 'URS_PATROL', 'member', [16, 45], 32, 2, (s) => ({ t: '이달 포획 ' + s.rng.ri(3, 11) + '건. 건당 보너스가 급료 봉투에 따로 들어 있었습니다. 봉투가 두꺼운 날 집에 늦게 갔습니다.', f: orgF(s, '순찰대 포획 수당 지급표') }), 'bad', (s) => ({ money: medX(s, 0.08), h: -2 })),
  st('urs_pat_mem_old', 'URS_PATROL', 'member', [16, 45], 26, 3, '마을 노인이 스스로 나왔습니다. 자수라고 했습니다. 조장이 차에 태우지 않았습니다. 그 뒤는 보지 않았습니다.', 'loss', { h: -4 }),
  st('urs_pat_sq_container', 'URS_PATROL', 'squad', [19, 50], 32, 2, '컨테이너 하나에 몇 명을 넣는지 정하는 것이 조장의 일이었습니다. 숫자를 정했습니다. 숫자였습니다.', 'bad', { h: -4, standing: 3 }),
  st('urs_pat_sq_miner', 'URS_PATROL', 'squad', [19, 50], 26, 3, '광구에서 광부 하나가 대원에게 달려들었습니다. 대원은 돌아왔고, 광부는 아니었습니다. 보고서는 한 줄이었습니다.', 'bad', { h: -2 }),
  st('urs_pat_drv_road', 'URS_PATROL', 'driver', [22, 55], 32, 2, (s) => pick(s, ['운전석에서는 뒤를 볼 수 없었습니다. 그것이 운전사 자리의 좋은 점이었습니다.', '툰드라 길에서 차가 섰습니다. 뒤칸은 조용했습니다. 세 시간 뒤 다시 달렸고, 뒤칸은 더 조용했습니다.']), 'bad', { h: -3 }),
  st('urs_pat_drv_home', 'URS_PATROL', 'driver', [22, 55], 24, 4, '아이가 아버지 직업을 학교에 써 갔습니다. 운전사라고. 틀린 말은 아니었습니다.', 'note', { h: -1 }),
  promoEv('urs_pat_promo', 'URS_PATROL', [16, 55], { squad: '조장이 되었습니다. 차에 태울 사람을 고르는 쪽이 되었습니다.', driver: '운전사로 빠졌습니다. 보너스는 줄었고 잠은 조금 늘었습니다.' }),
  fallEv('urs_pat_fall', 'URS_PATROL', { kia: '광구에서 광부들에게 둘러싸였습니다. 동료가 끌어내 살았습니다. 순찰대는 다친 사람을 다시 쓰지 않았습니다.', infected: '검진에서 양성이 나왔습니다. 어제까지 태우던 차의 뒤칸에 앉았습니다.', desert: '어느 밤 차를 몰고 그냥 달렸습니다. 국경에서 차를 버리고 걸었습니다.' }),

  // ── URS_CRAFT 소상인·장인 (A11) ──
  st('urs_craft_ap_master', 'URS_CRAFT', 'apprentice', [14, 35], 32, 2, (s) => affIs(s, 'URS_CRAFT_COBBLER') ? '구두 수선 스승은 말이 없었습니다. 바늘이 틀리면 손등을 쳤고, 맞으면 아무 말도 없었습니다. 아무 말도 없는 날이 늘었습니다.' : affIs(s, 'URS_CRAFT_THEATER') ? '극장 뒤에서 무대 장치를 배웠습니다. 막이 오르면 어둠 속에서 밧줄을 당겼습니다.' : '술집 뒤에서 잔을 닦았습니다. 손님 이야기를 듣지 않는 것이 첫 번째 일이었습니다.', 'note', { cap: { skill: 0.04 } }),
  st('urs_craft_ap_cold', 'URS_CRAFT', 'apprentice', [14, 35], 26, 3, '가게 난로는 손님 쪽만 따뜻했습니다. 견습 자리는 문 옆이었습니다.', 'note', { hl: -1 }),
  st('urs_craft_own_shop', 'URS_CRAFT', 'own', [18, 65], 32, 2, (s) => pick(s, ['제 가게 간판을 달았습니다. 글자가 조금 기울었습니다. 그대로 두었습니다.', '단골이 생겼습니다. 단골은 외상도 같이 가져왔습니다.']), 'warm', (s) => ({ money: medX(s, 0.05), h: 2 })),
  st('urs_craft_own_energy', 'URS_CRAFT', 'own', [18, 65], 26, 3, (s) => s.year >= 1101 ? '전기가 끊겼습니다. 가게를 낮에만 열었습니다. 낮에만 오는 손님은 반이었습니다.' : '관청 허가증을 다시 받았습니다. 도장 하나에 돈이 붙었고, 도장은 셋이었습니다.', 'bad', (s) => ({ money: -medX(s, 0.06) })),
  st('urs_craft_forum_seat', 'URS_CRAFT', 'forum', [30, 75], 32, 2, (s) => pick(s, ['시민 포럼 회의에 앉았습니다. 구두 수선공 옆에 전 교사가 앉았습니다. 둘 다 의자가 낯설었습니다.', '포럼에서 난방 문제를 말했습니다. 적은 사람은 있었고 답한 사람은 없었습니다.']), 'ev', { standing: 3 }),
  st('urs_craft_forum_doubt', 'URS_CRAFT', 'forum', [30, 75], 24, 4, '포럼이 들러리라는 말을 가게 손님이 했습니다. 틀린 말이 아니어서 대답하지 않았습니다. 다음 회의에는 갔습니다.', 'note', { h: -1 }),
  promoEv('urs_craft_promo', 'URS_CRAFT', [14, 75], { own: '스승이 가게 열쇠를 주었습니다. 스승은 뒷방으로 들어갔고, 앞은 제 것이 되었습니다.', forum: '시민 포럼 평의원으로 이름이 올랐습니다. 손님들이 가게에서 부르는 말이 바뀌었습니다.' }),
  fallEv('urs_craft_fall', 'URS_CRAFT', { ruin: '가게 문을 닫았습니다. 간판은 뗐고 기울어진 자국은 벽에 남았습니다.', arrest: '가게에서 전단이 나왔습니다. 손님이 두고 간 것이었습니다. 그것으로 충분했고, 수감되었습니다.' }),
  { id: 'urs_craft_aff_theater', a: [14, 75], tags: ['aff:URS_CRAFT_THEATER'], w: 20, gap: 3,
    run: (s) => ({ t: '극장에 검열관이 왔습니다. 대본 석 장이 빠졌고, 공연은 올라갔습니다. 빠진 석 장을 아는 관객이 박수를 쳤습니다.', k: 'note', fx: { h: 1 } }) },

  // ── URS_CARAVAN 캐러밴 상인 (A11 · 순회) ──
  st('urs_car_po_load', 'URS_CARAVAN', 'porter', [14, 40], 32, 2, (s) => pick(s, ['짐을 지고 사흘을 걸었습니다. 눈 위에서 자는 법을 배웠습니다. 발을 가슴에 붙이는 것.', '첫 월급은 소금 한 봉지와 돈 조금이었습니다. 소금을 더 좋아했습니다.']), 'note', { hl: -1, cap: { skill: 0.03 } }),
  st('urs_car_po_border', 'URS_CARAVAN', 'porter', [14, 40], 26, 3, (s) => affIs(s, 'URS_CAR_SAMI') ? '사미 숲 경계에서 상단이 멈췄습니다. 숲 사람들이 나와 물건을 보았고, 사람은 보지 않았습니다.' : '검문소에서 짐을 다 풀었습니다. 다시 싸는 데 한나절이었습니다. 빠진 것은 없었고, 있었다고 해도 말할 수 없었습니다.', 'note', { h: -1 }),
  st('urs_car_tr_deal', 'URS_CARAVAN', 'trader', [18, 60], 32, 2, (s) => pick(s, ['제 몫의 짐을 처음 팔았습니다. 값을 두 번 올렸고 한 번 내렸습니다. 남았습니다.', '쉐라그 은화와 카시미어 지폐와 우르수스 체르보네츠가 한 주머니에 있었습니다. 셈이 제 일이었습니다.']), 'warm', (s) => ({ money: medX(s, 0.1) })),
  st('urs_car_tr_raid', 'URS_CARAVAN', 'trader', [18, 60], 26, 3, '국경 길에서 마차 하나를 잃었습니다. 사람은 잃지 않았습니다. 그 길은 다음부터 돌아갔습니다.', 'bad', (s) => ({ money: -medX(s, 0.12), h: -2 })),
  st('urs_car_ma_route', 'URS_CARAVAN', 'master', [28, 65], 32, 2, (s) => pick(s, ['상단의 길을 제가 정했습니다. 어느 해는 남쪽, 어느 해는 숲. 틀린 해에는 사람이 줄었습니다.', '마차 열두 대가 제 이름으로 움직였습니다. 이름이 길을 열기도, 막기도 했습니다.']), 'ev', { standing: 3 }),
  st('urs_car_ma_customs', 'URS_CARAVAN', 'master', [28, 65], 24, 4, (s) => ({ t: '관세가 ' + s.rng.ri(8, 20) + '할로 올랐습니다. 장부를 두 권 썼습니다. 한 권은 관청용이었습니다.', f: orgF(s, '관세 고시') }), 'note', (s) => ({ money: -medX(s, 0.08) })),
  promoEv('urs_car_promo', 'URS_CARAVAN', [14, 65], { trader: '짐을 지는 대신 짐을 샀습니다. 등은 가벼워졌고 머리는 무거워졌습니다.', master: '대상 주인이 되었습니다. 상단 이름을 바꿀 수 있었지만 바꾸지 않았습니다.' }),
  fallEv('urs_car_fall', 'URS_CARAVAN', { raid: '습격을 받았습니다. 마차를 다 잃고 몸을 다쳤습니다. 길에 다시 서지 못했습니다.', freezing: '눈보라에 사흘 갇혔습니다. 발가락 둘을 두고 나왔습니다. 상단은 저를 두고 갔습니다.', ruin: '물건값이 떨어졌습니다. 마차를 팔아 빚을 갚았고, 남은 것은 길에 대한 기억이었습니다.' }),

  // ── URS_GUARD 근위군·경찰 (A4) ──
  st('urs_guard_con_beat', 'URS_GUARD', 'constable', [18, 45], 32, 2, (s) => affIs(s, 'URS_GUARD_ROYAL') ? '궁전 회랑에 서 있었습니다. 지나가는 사람들은 저를 보지 않았고, 저는 그들을 다 보았습니다.' : '수도 거리 순찰을 돌았습니다. 건달들은 제 걸음 소리를 알았고, 저도 그들을 알았습니다. 서로 모르는 척했습니다.', 'note', { standing: 2 }),
  st('urs_guard_con_family', 'URS_GUARD', 'constable', [18, 45], 26, 3, '집안에서 군에 못 넣어 경찰에 넣었다는 말을 삼촌이 했습니다. 삼촌은 군인이었습니다.', 'note', { h: -1 }),
  st('urs_guard_lt_order', 'URS_GUARD', 'lieutenant', [22, 55], 32, 2, (s) => s.year === 1101 ? '광산 내부고발자를 조용히 처리하라는 명령이 왔습니다. 조용히 되지 않았습니다. 학생 하나가 죽었고, 명령서는 사라졌습니다.' : '귀족 집 사건을 맡았습니다. 수사는 하루 만에 끝났습니다. 끝내라는 전화가 먼저 왔습니다.', 'bad', { h: -3, standing: 2 }),
  st('urs_guard_lt_ball', 'URS_GUARD', 'lieutenant', [22, 55], 26, 3, (s) => s.year === 1101 ? '겨울 무도회 날 학생 행진을 막았습니다. 최루탄 지시가 내려왔고, 제 중대가 던졌습니다.' : '겨울 무도회 경비를 맡았습니다. 안쪽에서 음악이 흘렀고 밖은 영하였습니다.', 'note', { h: -2 }),
  st('urs_guard_chief_desk', 'URS_GUARD', 'chief', [35, 65], 32, 2, (s) => pick(s, ['국장실 책상에 앉았습니다. 결재 서류에 이름을 썼고, 쓴 이름이 사람을 움직였습니다.', '원수 쪽과 황제 쪽이 각각 저녁을 청했습니다. 둘 다 갔습니다. 둘 다 안 간 것과 같았습니다.']), 'ev', { standing: 3 }),
  st('urs_guard_chief_purge', 'URS_GUARD', 'chief', [35, 65], 24, 4, '내무성에서 명단이 왔습니다. 제 부하 이름이 둘 있었습니다. 지우지 못했습니다.', 'bad', { h: -3 }),
  promoEv('urs_guard_promo', 'URS_GUARD', [18, 65], { lieutenant: '중위 계급장을 받았습니다. 집안에서 처음으로 저를 자랑했습니다.', chief: '국장 자리에 올랐습니다. 축하 전보가 셋 왔고, 셋 다 부탁이 붙어 있었습니다.' }),
  fallEv('urs_guard_fall', 'URS_GUARD', { kia: '진압 중 쓰러졌습니다. 돌이었는지 총이었는지 보고서마다 달랐습니다. 복직은 없었습니다.', scandal: '진압 가담이 신문에 났습니다. 이름이 났고, 제복은 벗었습니다.', purge: '숙청 명단에 올랐습니다. 제복을 벗기고 북쪽 광구로 보냈습니다.' }),

  // ── URS_OFFICER 장교 (A4) ──
  st('urs_off_lt_platoon', 'URS_OFFICER', 'lieutenant', [18, 32], 32, 2, (s) => pick(s, ['소대를 받았습니다. 중사가 저보다 스무 살 많았고, 명령은 제가 했습니다. 중사가 고쳐 주었습니다.', '사관학교 동기 모임이 있었습니다. 집안 이름 순서로 앉았습니다. 제 자리는 중간쯤이었습니다.']), 'note', { standing: 2 }),
  st('urs_off_lt_order', 'URS_OFFICER', 'lieutenant', [18, 32], 26, 3, '감염자 마을 봉쇄 명령을 받았습니다. 소대를 세웠습니다. 마을에서 나온 사람은 없었습니다. 그것이 명령이었습니다.', 'bad', { h: -3, standing: 2 }),
  st('urs_off_cp_war', 'URS_OFFICER', 'captain', [22, 40], 32, 2, (s) => affIs(s, 'URS_OFF_MARSHAL') ? '원수 파벌 저녁 자리에 불려 갔습니다. 술잔을 들 때 누구를 보는지 다들 보았습니다.' : '군단 봉토 순시를 따라갔습니다. 봉토 마을에서 장군은 황제보다 가까운 사람이었습니다.', 'note', { standing: 2 }),
  st('urs_off_cp_experiment', 'URS_OFFICER', 'captain', [22, 40], 24, 4, '연구소 호송 임무였습니다. 트럭 뒤칸에 사람이 있었고, 서류에는 자재라고 적혀 있었습니다. 서류대로 서명했습니다.', 'bad', { h: -3 }),
  st('urs_off_mj_staff', 'URS_OFFICER', 'major', [28, 48], 32, 2, (s) => pick(s, ['참모 회의에 앉았습니다. 지도 위 숫자가 사람이라는 것을 모두 알았고, 아무도 그렇게 말하지 않았습니다.', '소령 봉급으로 수도에 집을 얻었습니다. 아내가 처음으로 손님을 초대했습니다.']), 'ev', { standing: 2 }),
  st('urs_off_mj_bastard', 'URS_OFFICER', 'major', [28, 48], 24, 4, '동료 장교 하나가 사생아라는 말이 돌았습니다. 다음 날 그 사람은 부대에 없었습니다. 어디로 갔는지는 둘로 갈렸습니다.', 'note', { h: -1 }),
  st('urs_off_col_regiment', 'URS_OFFICER', 'colonel', [34, 56], 32, 2, (s) => pick(s, ['연대를 받았습니다. 연대 깃발에 제 이름이 수놓였습니다. 깃발은 연대 것이었고, 저는 잠시 든 사람이었습니다.', '옛 부하가 탄원서를 들고 왔습니다. 광산으로 보내진 사람의 아내였습니다. 서명했습니다. 되지는 않았습니다.']), 'note', { standing: 2, h: -1 }),
  st('urs_off_col_farnorth', 'URS_OFFICER', 'colonel', [34, 56], 24, 4, (s) => s.year === 1101 ? '극북 진압에 연대를 보내라는 명령이 왔습니다. 보냈습니다. 돌아온 보고서를 끝까지 읽지 않았습니다.' : '군단 사령부 보직 다툼이 있었습니다. 제 이름이 두 쪽 서류에 다 있었습니다.', 'bad', { h: -3 }),
  st('urs_off_gen_court', 'URS_OFFICER', 'general', [42, 65], 32, 2, (s) => pick(s, ['국무회의에 배석했습니다. 원수가 황제보다 먼저 말했습니다. 모두 그것을 보았습니다.', '장군 봉토에서 세금이 올라왔습니다. 봉토 농민 이름은 하나도 몰랐습니다.']), 'note', { standing: 2 }),
  st('urs_off_gen_choice', 'URS_OFFICER', 'general', [42, 65], 24, 4, '원수 쪽에서 편지가 왔습니다. 답장을 하지 않는 것도 답장이었습니다. 두 쪽 다 그렇게 읽었습니다.', 'bad', { h: -2 }),
  st('urs_off_mar_throne', 'URS_OFFICER', 'marshal', [48, 75], 32, 2, (s) => pick(s, ['원수 지휘봉을 받았습니다. 군단 하나가 제 봉토였습니다. 황제가 축하했고, 눈은 웃지 않았습니다.', '다른 원수들과 한 방에 앉았습니다. 황제 이야기는 아무도 하지 않았고, 모두 그 이야기를 했습니다.']), 'ev', { standing: 3 }),
  st('urs_off_mar_dissolve', 'URS_OFFICER', 'marshal', [48, 75], 22, 5, (s) => s.year >= 1102 ? '국무회의가 해산되었습니다. 원수들 사이 침묵이 길었습니다. 그 침묵에 제 몫이 있었습니다.' : '제 이름을 딴 거리가 생겼습니다. 그 거리를 걸어 본 적은 없습니다.', 'note', { h: -1 }),
  promoEv('urs_off_promo', 'URS_OFFICER', [18, 75], {
    captain: '대위 계급장을 달았습니다. 소대가 중대가 되었고, 모르는 이름이 백 개 늘었습니다.',
    major: '소령으로 올랐습니다. 전선에서 참모부로 자리가 옮겨졌습니다. 지도가 사람보다 가까워졌습니다.',
    colonel: '대령이 되었습니다. 집안 어른이 처음으로 제 어깨를 쳤습니다.',
    general: '장군이 되었습니다. 봉토가 따라왔고, 적도 따라왔습니다.',
    marshal: '원수 지휘봉을 받았습니다. 황제의 손에서였습니다. 손이 차가웠습니다.',
  }),
  fallEv('urs_off_fall', 'URS_OFFICER', { kia: '전선에서 쓰러졌습니다. 후송되었고, 군복은 다시 입지 못했습니다.', purge: '숙청이 왔습니다. 계급장이 떨어지고 신분이 떨어졌습니다. 그다음은 북쪽 광구였습니다.', courtmartial: '군사 재판에서 사형이 나왔고, 집행 전 감형되었습니다. 제복 없이 밖으로 나왔습니다.' }),
  { id: 'urs_off_aff_legion', a: [18, 75], tags: ['aff:URS_OFF_LEGION'], w: 20, gap: 4,
    run: (s) => ({ t: '군단 봉토 농민들이 장군 앞에 모자를 벗었습니다. 황제 사진은 그 마을 어디에도 없었습니다.', k: 'note' }) },

  // ── URS_RESEARCH 연구원 (A9) ──
  st('urs_res_as_lab', 'URS_RESEARCH', 'assistant', [22, 40], 32, 2, (s) => affIs(s, 'URS_RES_SARCOPHAGUS') ? '석관 연구소 지하에서 기록을 옮겨 적었습니다. 윗층 사람들 얼굴은 한 번도 보지 못했습니다.' : '조교 책상은 창문이 없는 쪽이었습니다. 데이터 정리가 일이었고, 데이터가 무엇인지는 묻지 않았습니다.', 'note', { cap: { learn: 0.04 } }),
  st('urs_res_as_sign', 'URS_RESEARCH', 'assistant', [22, 40], 26, 3, '비밀 유지 서약서에 서명했습니다. 서약서는 가져갈 수 없었고, 내용은 외워야 했습니다.', 'note', { h: -1 }),
  st('urs_res_rs_paper', 'URS_RESEARCH', 'researcher', [26, 55], 32, 2, (s) => pick(s, ['논문이 통과되었습니다. 제 이름은 셋째였습니다. 첫째는 소장이었습니다.', '실험 결과가 예상과 달랐습니다. 보고서는 예상대로 썼습니다. 다음 달 예산이 나왔습니다.']), 'note', { standing: 2, cap: { learn: 0.03 } }),
  st('urs_res_rs_subjects', 'URS_RESEARCH', 'researcher', [26, 55], 24, 4, (s) => affIs(s, 'URS_RES_ZELGRAD') ? '젤그라드로 감염자들이 왔습니다. "녹색 도시" 일자리 광고를 보고 온 사람들이었습니다. 일자리는 없었습니다.' : affIs(s, 'URS_RES_OKA') ? '오카 표본이 들어왔습니다. 표본을 다루고 나온 동료가 그날 밤 혼자 웃었습니다.' : '피실험자 명단을 받았습니다. 이름이 아니라 번호였습니다. 번호로 부르는 것이 편했습니다. 그것이 무서웠습니다.', 'bad', { h: -3 }),
  st('urs_res_dir_budget', 'URS_RESEARCH', 'director', [35, 65], 32, 2, (s) => pick(s, ['소장실에서 예산 회의를 했습니다. 군에서 온 사람이 결정했고, 저는 서명했습니다.', '연구소 전체가 제 이름 아래 있었습니다. 지하층은 아직 들어가지 않았습니다.']), 'ev', { standing: 3 }),
  st('urs_res_dir_purge', 'URS_RESEARCH', 'director', [35, 65], 24, 4, '옆 연구소 상층부가 하룻밤에 없어졌습니다. 배신자가 있었다고 했습니다. 다음 날 제 책상에 새 서약서가 있었습니다.', 'bad', { h: -3 }),
  promoEv('urs_res_promo', 'URS_RESEARCH', [22, 65], { researcher: '연구원 신분증을 받았습니다. 지하 2층까지 열렸습니다.', director: '소장이 되었습니다. 모든 층이 열렸고, 열리지 않았으면 싶은 층도 있었습니다.' }),
  fallEv('urs_res_fall', 'URS_RESEARCH', { purge: '연구소에 내무성이 들어왔습니다. 제 이름이 명단에 있었고, 북쪽으로 보내졌습니다.', accident: '실험실에서 사고가 났습니다. 몸이 상했고 연구소는 저를 지웠습니다.', disappear: '어느 아침부터 연구소에 들어갈 수 없었습니다. 신분증이 열리지 않았고, 묻는 사람도 없었습니다. 살아 나온 것이 다였습니다.' }),

  // ── URS_TEACHER 교사 (A11) ──
  st('urs_tea_col_class', 'URS_TEACHER', 'college', [20, 28], 32, 2, '우신스키 교육대 강의실에서 교수법을 배웠습니다. 매를 어떻게 드는지는 가르치지 않았고, 모두 알았습니다.', 'note', { cap: { learn: 0.04 } }),
  st('urs_tea_col_practice', 'URS_TEACHER', 'college', [20, 28], 26, 3, '실습 학교에서 첫 수업을 했습니다. 아이 하나가 질문을 했고, 답을 몰랐습니다. 다음 날 답을 가져갔습니다.', 'warm', { h: 2 }),
  st('urs_tea_tea_room', 'URS_TEACHER', 'teacher', [22, 60], 32, 2, (s) => affIs(s, 'URS_TEA_PETERHEIM') ? '피터하임 교실에서 귀족 자녀와 평민 아이를 같은 줄에 앉혔습니다. 다음 날 학부모 편지가 왔습니다.' : '교실 난로에 넣을 석탄을 제 돈으로 샀습니다. 그 겨울 아이들이 외투를 벗고 글을 썼습니다.', 'note', (s) => ({ money: -medX(s, 0.02), h: 1 })),
  st('urs_tea_tea_list', 'URS_TEACHER', 'teacher', [22, 60], 26, 3, '내무성 사람이 학생 명단을 보여 달라고 했습니다. 보여 주었습니다. 다음 주 두 자리가 비었습니다.', 'bad', { h: -3 }),
  st('urs_tea_pr_desk', 'URS_TEACHER', 'principal', [35, 65], 32, 2, (s) => pick(s, ['교장실에서 예산을 짰습니다. 석탄과 책 사이에서 석탄을 골랐습니다.', '교사 하나가 수업에서 극북 이야기를 했습니다. 불렀고, 조용히 하라고 했습니다. 지키는 쪽이었습니다.']), 'note', { standing: 2 }),
  st('urs_tea_pr_parents', 'URS_TEACHER', 'principal', [35, 65], 24, 4, '학부모 중 귀족이 자녀 성적을 말했습니다. 성적은 바뀌지 않았습니다. 교장 자리는 흔들렸고, 남았습니다.', 'note', { standing: 1, h: -1 }),
  st('urs_tea_forum_seat', 'URS_TEACHER', 'forum', [40, 75], 32, 2, '시민 포럼에 전 교사 자격으로 앉았습니다. 교육 예산을 말했고, 적는 사람은 많았습니다.', 'ev', { standing: 3 }),
  st('urs_tea_forum_student', 'URS_TEACHER', 'forum', [40, 75], 24, 4, '포럼 방청석에 옛 제자가 있었습니다. 수용소에서 살아 나왔다고 했습니다. 그날 발언은 짧았습니다.', 'loss', { h: -2 }),
  promoEv('urs_tea_promo', 'URS_TEACHER', [20, 75], { teacher: '정식 교사 임명장을 받았습니다. 교실 하나가 제 것이 되었습니다.', principal: '교장이 되었습니다. 교실 대신 서류가 제 것이 되었습니다.', forum: '시민 포럼 평의원이 되었습니다. 교장이었을 때보다 말이 멀리 갔습니다.' }),
  fallEv('urs_tea_fall', 'URS_TEACHER', { arrest: '제자 하나가 끌려가며 제 이름을 말했습니다. 교사도 함께 갔습니다. 북쪽으로.', layoff: '학교가 교사를 줄였습니다. 마지막 수업 날 아이들이 조용했습니다.' }),

  // ── URS_ARTIST 극작가·시인 (A12) ──
  st('urs_art_tr_stage', 'URS_ARTIST', 'troupe', [16, 35], 32, 2, (s) => pick(s, ['극단에서 대사 없는 역을 받았습니다. 무대에 서 있는 것이 일이었습니다. 다리가 떨렸습니다.', '동인지에 시 한 편이 실렸습니다. 쪽수는 끝에서 둘째였고, 그래도 실렸습니다.']), 'note', { cap: { arts: 0.04 } }),
  st('urs_art_tr_censor', 'URS_ARTIST', 'troupe', [16, 35], 26, 3, '공연 전날 검열관이 왔습니다. 대사 넷이 빠졌습니다. 빠진 자리에서 배우가 숨을 쉬었고, 관객이 알아들었습니다.', 'note', { h: -1 }),
  st('urs_art_wr_premiere', 'URS_ARTIST', 'writer', [22, 55], 32, 2, (s) => pick(s, ['제 희곡이 올라갔습니다. 막이 내리고 박수가 있었습니다. 박수 소리를 세는 버릇이 그날 생겼습니다.', '시집이 나왔습니다. 초판 부수는 적었고, 손으로 베껴 돌아다닌 부수는 몰랐습니다.']), 'warm', (s) => ({ money: medX(s, 0.1), h: 3, standing: 3 })),
  st('urs_art_wr_warning', 'URS_ARTIST', 'writer', [22, 55], 26, 3, '내무성에서 편지가 왔습니다. 작품 제목 하나와 "주의"라는 말. 그 작품을 다시 올리지 않았습니다. 다시 썼습니다.', 'bad', { h: -2 }),
  st('urs_art_cel_salon', 'URS_ARTIST', 'celebrity', [30, 70], 32, 2, (s) => pick(s, ['귀족 살롱에 불려 갔습니다. 시를 읊었고, 박수를 받았고, 식사는 따로 했습니다.', '제 이름이 신문 문화면에 났습니다. 어머니가 신문을 세 부 샀습니다.']), 'ev', { standing: 2, h: 1 }),
  st('urs_art_cel_exile', 'URS_ARTIST', 'celebrity', [30, 70], 24, 4, '옛 동료 극작가가 국경 밖으로 보내졌다는 소식이 왔습니다. 작품은 남았고, 올릴 극장은 없었습니다.', 'loss', { h: -2 }),
  promoEv('urs_art_promo', 'URS_ARTIST', [16, 70], { writer: '극단 간판에 작가로 이름이 올랐습니다. 배우일 때보다 무대가 멀어졌고 더 무서워졌습니다.', celebrity: '명사라는 말이 붙었습니다. 초대장이 늘었고, 편지 봉투에 관청 도장이 찍힌 것도 늘었습니다.' }),
  fallEv('urs_art_fall', 'URS_ARTIST', { exile: '추방 명령이 왔습니다. 짐은 가방 하나였고, 원고는 머릿속에 넣었습니다.', fade: '극장이 제 작품을 더 올리지 않았습니다. 관객은 다른 이름을 외웠습니다.', arrest: '시 한 편이 문제였습니다. 어느 시인지는 끝까지 말해 주지 않았습니다. 북쪽으로 갔습니다.' }),
  { id: 'urs_art_aff_poets', a: [16, 70], tags: ['aff:URS_ART_POETS'], w: 20, gap: 3,
    run: (s) => ({ t: '시 동인 모임은 매주 다른 집에서 열렸습니다. 같은 집에서 두 번 열면 다음 주 그 집 창문이 깨졌습니다.', k: 'note', fx: { cap: { arts: 0.02 } } }) },

  // ── URS_NOBLE 신 귀족 (A10) ──
  st('urs_nob_dv_patent', 'URS_NOBLE', 'dvoryanin', [25, 55], 32, 2, (s) => pick(s, ['귀족 증서를 액자에 넣었습니다. 공장 실적으로 산 종이였습니다. 구 귀족들은 그 액자를 보고 웃었습니다.', '드보랴닌 무도회 초대장이 왔습니다. 복장 규정이 세 장이었습니다.']), 'note', { standing: 2 }),
  st('urs_nob_dv_old', 'URS_NOBLE', 'dvoryanin', [25, 55], 26, 3, '구 귀족 가문 사람이 제 성씨 발음을 두 번 고쳤습니다. 둘 다 틀렸습니다. 고쳐 주지 않았습니다.', 'note', { h: -1 }),
  st('urs_nob_ba_estate', 'URS_NOBLE', 'baron', [30, 60], 32, 2, (s) => affIs(s, 'URS_NOB_BORIS') ? '보리스 그룹 이사회에 남작 자격으로 앉았습니다. 공장 셋이 제 서명으로 돌아갔습니다.' : '남작령 저택을 샀습니다. 전 주인은 광산으로 갔다고 했습니다. 가구는 그대로였습니다.', 'ev', (s) => ({ money: -medX(s, 0.3), standing: 3 })),
  st('urs_nob_ba_firewood', 'URS_NOBLE', 'baron', [30, 60], 24, 4, (s) => s.year >= 1101 ? '난방이 끊겼습니다. 가보 의자를 땔감으로 넣었습니다. 아내가 울었고, 방은 따뜻해졌습니다.' : '극장 하나를 사들였습니다. 공연은 보지 않았고, 극장 이름은 바꿨습니다.', 'note', { h: -1 }),
  st('urs_nob_du_seat', 'URS_NOBLE', 'duma', [35, 65], 32, 2, (s) => pick(s, ['하원 말단 의석에 앉았습니다. 발언 순서는 끝에서 셋째였고, 끝까지 가지 않았습니다.', '법안에 찬성표를 던졌습니다. 내용은 읽었고, 표는 정해져 있었습니다.']), 'note', { standing: 2 }),
  st('urs_nob_du_students', 'URS_NOBLE', 'duma', [35, 65], 24, 4, (s) => s.year === 1101 ? '카토르가 구에 학생들이 갇혔다는 보고가 올라왔습니다. 하원은 다음 안건으로 넘어갔습니다. 저도 넘어갔습니다.' : '의원 사무실에 청원서가 쌓였습니다. 비서가 분류했고, 저는 윗장만 읽었습니다.', 'bad', { h: -2 }),
  st('urs_nob_mg_court', 'URS_NOBLE', 'magistrate', [40, 70], 32, 2, (s) => pick(s, ['치안판사 법복을 입었습니다. 첫 판결은 빵 도둑이었습니다. 법대로 했습니다. 법은 무거웠습니다.', '건달들을 고용해 거리를 "정리"했다는 보고를 받았습니다. 제 이름으로 된 지시였습니다. 제 글씨는 아니었습니다.']), 'bad', { h: -2, standing: 2 }),
  st('urs_nob_mg_statue', 'URS_NOBLE', 'magistrate', [40, 70], 24, 4, '광장 동상 제막식에 섰습니다. 군중이 많았고, 환호는 적었습니다. 동상은 컸습니다.', 'note', { standing: 1 }),
  st('urs_nob_min_cabinet', 'URS_NOBLE', 'minister', [45, 75], 32, 2, (s) => pick(s, ['장관 집무실에서 황제의 서명을 받았습니다. 서명하는 손은 느렸고, 눈은 저를 보지 않았습니다.', '국무회의 좌석표에 제 이름이 앞줄로 왔습니다. 뒷줄 사람들이 저를 다르게 불렀습니다.']), 'ev', { standing: 3 }),
  st('urs_nob_min_energy', 'URS_NOBLE', 'minister', [45, 75], 24, 4, (s) => s.year >= 1101 ? '전력 위기 대책을 발표했습니다. 발표문은 세 장이었고, 전기는 돌아오지 않았습니다.' : '예산안 숫자 하나를 고쳤습니다. 고친 숫자만큼 어느 광구의 배급이 바뀌었을 것입니다. 확인하지 않았습니다.', 'bad', { h: -2 }),
  promoEv('urs_nob_promo', 'URS_NOBLE', [25, 75], { baron: '남작 작위가 내려왔습니다. 증서 종이가 전보다 두꺼웠습니다.', duma: '하원 의석을 받았습니다. 공장주에서 의원으로 명함이 바뀌었습니다.', magistrate: '치안판사로 임명되었습니다. 사람을 가두는 서명이 제 손에 들어왔습니다.', minister: '장관 임명장을 받았습니다. 황제 집무실에서였습니다. 뒤를 돌아보니 원수가 서 있었습니다.' }),
  fallEv('urs_nob_fall', 'URS_NOBLE', { purge: '숙청 명단에 제 이름이 올랐습니다. 작위가 거둬지고, 저택이 거둬지고, 마지막에 저를 거둬 북쪽으로 보냈습니다.', assassination: '마차에 폭탄이 터졌습니다. 살았습니다. 다리 하나는 전과 같지 않았고, 자리는 다른 사람이 앉았습니다.', bankrupt: '공장이 넘어갔습니다. 빚이 작위보다 컸습니다. 한 계단 내려앉았습니다.' }),
  { id: 'urs_nob_aff_council', a: [25, 75], tags: ['aff:URS_NOB_COUNCIL'], w: 20, gap: 4,
    run: (s) => ({ t: '국무회의 복도에서 원수 하나가 제 이름을 불렀습니다. 성이 아니라 이름을. 그것이 무슨 뜻인지 하루 종일 생각했습니다.', k: 'note', fx: { h: -1 } }) },

  // ════════════════════════════════════════════════════════════════════════
  // 7. 생업(A11) 계절·축일·동네 — 혹한·곡물 배급·교회 축일
  // ════════════════════════════════════════════════════════════════════════
  { id: 'urs_live_frost', a: [10, 80], tags: [N, 'arch:A11'], w: 26, gap: 2, c: here,
    run: (s) => ({ t: pick(s, ['혹한이 왔습니다. 창문 안쪽에 얼음이 꼈고, 아침마다 숨으로 녹여 밖을 봤습니다.', '영하 사십 도 아래로 떨어진 날 공장과 학교가 쉬었습니다. 집 안에서는 아무것도 쉬지 않았습니다.']), k: 'note', fx: { hl: -1 } }) },
  { id: 'urs_live_ration', a: [10, 80], tags: [N, 'arch:A11'], w: 24, gap: 3, c: here,
    run: (s) => ({ t: s.year >= 1101 ? '곡물 배급표가 다시 나왔습니다. 줄은 새벽부터였고, 줄 끝에서는 배급이 끝났습니다.' : '곡물 가격이 겨울마다 올랐습니다. 흑빵이 작아졌고, 봉투는 그대로였습니다.', k: 'bad', fx: { money: -medX(s, 0.03), h: -1 } }) },
  { id: 'urs_live_snow_dive', a: [6, 60], tags: [N, 'arch:A11'], w: 20, gap: 4, c: here,
    run: (s) => ({ t: '목욕탕에서 나와 눈더미에 뛰어들었습니다. 동네 사람들이 하는 대로 했습니다. 소리를 지른 쪽은 저 혼자였습니다.', k: 'warm', fx: { h: 2, hl: 1 } }) },
  { id: 'urs_live_ball', a: [14, 80], tags: [N, 'arch:A11'], w: 22, gap: 3, c: here,
    run: (s) => ({ t: pick(s, ['겨울 무도회 밤 광장에 불이 켜졌습니다. 안에는 들어가지 못했고, 밖에서 음악은 들렸습니다. 뜨거운 차를 손에 들고 서 있었습니다.', '겨울 무도회 날 공장이 반나절 쉬었습니다. 반나절 동안 아이들과 썰매를 탔습니다.']), k: 'warm', fx: { h: 2 } }) },
  { id: 'urs_live_tsar_day', a: [6, 80], tags: [N, 'arch:A11'], w: 20, gap: 3, c: here,
    run: (s) => ({ t: pick(s, ['황제 탄신일에 거리에 깃발이 걸렸습니다. 깃발을 거는 것은 의무였고, 보는 것은 아니었습니다.', '황제 탄신일 기념으로 빵이 하나씩 나왔습니다. 아이들은 그날을 빵 날이라고 불렀습니다.']), k: 'note', fx: { h: 1 } }) },
  { id: 'urs_live_icon_night', a: [6, 80], tags: [N, 'arch:A11'], w: 22, gap: 3, c: here,
    run: (s) => ({ t: pick(s, ['성상의 밤에 교회 종이 한밤에 울렸습니다. 온 동네가 촛불을 들고 교회를 세 바퀴 돌았습니다. 발은 얼었고 손은 따뜻했습니다.', '성상의 밤 식탁에 열두 가지 음식을 놓는 집이 있었습니다. 저희 집은 일곱이었습니다. 어머니는 열둘이라고 했습니다.']), k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } }) },
  { id: 'urs_live_thaw', a: [6, 80], tags: [N, 'arch:A11'], w: 20, gap: 3, c: here,
    run: (s) => ({ t: pick(s, ['해빙 축일에 밀가루 반죽을 둥글게 부쳐 먹었습니다. 해를 닮게 만든다고 했습니다. 제 것은 달을 닮았습니다.', '해빙 축일에 짚 인형을 태웠습니다. 겨울을 태운다고 했습니다. 다음 주에 눈이 또 왔습니다.']), k: 'warm', fx: { h: 2 } }) },
  { id: 'urs_live_mud', a: [6, 80], tags: [N, 'arch:A11'], w: 18, gap: 3, c: here,
    run: (s) => ({ t: '진흙 철이 왔습니다. 길이 사라졌고, 마을과 마을 사이가 한 달 동안 끊겼습니다. 끊긴 동안 소식도 없었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'urs_live_bathhouse', a: [10, 80], tags: [N, 'arch:A11'], w: 18, gap: 4, c: here,
    run: (s) => ({ t: '동네 목욕탕에서 토요일마다 같은 사람들을 만났습니다. 옷을 벗으면 계급이 안 보인다고 했습니다. 보였습니다.', k: 'note', fx: { h: 1, cap: { ties: 0.02 } } }) },
  { id: 'urs_live_stove', a: [6, 80], tags: [N, 'arch:A11'], w: 18, gap: 4, c: (s) => here(s) && !s.S.urban,
    run: (s) => ({ t: '통나무집 벽난로 위가 잠자리였습니다. 가장 따뜻한 자리는 할머니 것이었고, 할머니가 없는 겨울부터 제 것이었습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'urs_live_queue', a: [14, 80], tags: [N, 'arch:A11'], w: 18, gap: 4, c: (s) => here(s) && s.S.urban,
    run: (s) => ({ t: '이동도시 공동 주택 복도에 줄이 생겼습니다. 수도가 하나였습니다. 줄에서 이웃 이름을 다 외웠습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }) },

  // ════════════════════════════════════════════════════════════════════════
  // 8. 이주·신참·관계·방문
  // ════════════════════════════════════════════════════════════════════════
  { id: 'urs_newcomer_papers', a: [10, 80], tags: [N, 'newcomer'], w: 30, gap: 2, c: here,
    run: (s) => ({ t: pick(s, ['내무성 창구에서 거주 등록을 했습니다. 종족 칸과 출신 칸을 세 번 확인했습니다. 도장은 네 번째에 찍혔습니다.', '이웃이 어디서 왔느냐고 물었습니다. 대답했고, 이웃은 더 묻지 않았습니다. 다음 날부터 인사가 짧아졌습니다.']), k: 'note', fx: { h: -1 } }) },
  { id: 'urs_newcomer_cold', a: [10, 80], tags: [N, 'newcomer'], w: 26, gap: 3, c: here,
    run: (s) => ({ t: '첫겨울에 외투 값을 몰랐습니다. 가게 주인이 부른 값을 다 냈습니다. 두 번째 겨울에는 반값인 것을 알았습니다.', k: 'bad', fx: { money: -medX(s, 0.05) } }) },
  { id: 'urs_newcomer_language', a: [10, 80], tags: [N, 'newcomer'], w: 22, gap: 3, c: here,
    run: (s) => ({ t: '말의 억양이 다르다고 아이들이 따라 했습니다. 따라 하는 것을 따라 했습니다. 억양이 조금 옮았습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }) },
  { id: 'urs_rel_inst_counter', a: [10, 80], tags: [N, 'rel:institutional'], w: 28, gap: 3, c: here,
    run: (s) => ({ t: pick(s, ['서류 종족 칸에 살카즈라고 적힌 뒤로 창구가 바뀌었습니다. 바뀐 창구는 늘 닫혀 있었습니다.', '병원에서 접수증을 받지 못했습니다. 종족 칸을 본 뒤였습니다. 다른 병원도 같았습니다.']), k: 'bad', fx: { h: -2 } }) },
  { id: 'urs_rel_inst_work', a: [14, 70], tags: [N, 'rel:institutional'], w: 24, gap: 3, c: here,
    run: (s) => ({ t: '같은 일에 급료가 달랐습니다. 장부에 종족 칸이 있었고, 그 칸이 금액 칸을 정했습니다.', k: 'bad', fx: { money: -medX(s, 0.04) } }) },
  { id: 'urs_rel_inst_lab', a: [14, 70], tags: [N, 'rel:institutional', '!track:URS_MINE'], w: 12, gap: 6, c: (s) => here(s) && s.S.race === 'sarkaz',
    run: (s) => ({ t: '연구소 사람이 찾아와 검사를 받으면 돈을 준다고 했습니다. 이웃 하나가 갔고, 돌아왔고, 말을 하지 않았습니다. 가지 않았습니다.', k: 'bad', fx: { h: -3 } }) },
  { id: 'urs_visit_station', a: [14, 80], tags: ['visit:ursus'], w: 28, gap: 3,
    run: (s) => ({ t: '우르수스 국경역에서 서류를 세 번 보였습니다. 세 번째 사람은 종족 칸만 보았습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'urs_visit_patrol', a: [14, 80], tags: ['visit:ursus'], w: 24, gap: 3,
    run: (s) => ({ t: '우르수스 거리에서 순찰대 차가 지나갔습니다. 거리 사람들이 걸음을 바꾸지 않은 채 다른 쪽을 봤습니다. 따라 했습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'urs_visit_market', a: [14, 80], tags: ['visit:ursus'], w: 22, gap: 3,
    run: (s) => ({ t: '우르수스 시장에서 흑빵과 훈제 고기를 샀습니다. 값은 쌌고, 파는 사람 눈은 비쌌습니다.', k: 'note', fx: { money: -medX(s, 0.01) } }) },
  // 망명 트리거: 몰락 생존·반란 가담 뒤
  { id: 'urs_asylum_trigger', a: [15, 65], tags: [N, '!track:URS_MINE', '!prison:camp'], w: 40, gap: 3,
    c: (s) => here(s) && !s.S.flags.noMove && ((['purge', 'arrest', 'betrayal', 'desert'].includes(s.S.flags.lastFall) && s.S.age - s.S.flags.lastFallAt <= 3) || (s.S.flags.w9b_rebel != null && s.S.age - s.S.flags.w9b_rebel <= 3)) && s.rng.chance(0.45),
    run: (s) => { if (s.migrate('asylum')) return { t: '이름이 명단에 있다는 말을 들었습니다. 그 밤 국경을 넘었습니다. 가방 하나, 뒤는 보지 않았습니다.', k: 'big', fx: { h: -3, money: -medX(s, 0.2) } }; return { t: '국경을 넘으려 했습니다. 길이 막혀 있었습니다. 돌아와 숨을 죽였습니다.', k: 'bad', fx: { h: -2 } }; } },
  { id: 'urs_asylum_rumor', a: [15, 65], tags: [N, '!track:URS_MINE'], w: 14, gap: 5, c: (s) => here(s) && s.S.flags.w9b_rebel != null,
    run: (s) => ({ t: '함께 섰던 사람 하나가 국경 밖으로 갔다는 소식이 왔습니다. 편지는 없었고, 소식만 있었습니다.', k: 'note', fx: { h: -1 } }) },
  // 공통: 수용소 거주자(forced) 로도스 구조 접점
  { id: 'urs_mine_rhodes_rescue', a: [8, 70], tags: ['track:URS_MINE'], w: 6, gap: 6, c: (s) => s.year >= 1098 && s.S.ori.on,
    run: (s) => { s.S.flags.rhodes_rescue = s.S.age; return { t: '광구에 외부 의료진이 다녀갔습니다. 하얀 완장이었고, 명단을 적어 갔습니다. 제 이름도 적혔습니다.', k: 'note', fx: { h: 1 } }; } },
];

// ── 각주(D31): 숫자가 든 이벤트에만, 세계관 안 출처. 전체의 10~20% ──
const FOOT = {
  urs_sol_pv_winter: () => F('군단 사령부 초소 근무 일지'),
  urs_sol_nco_squad: (s) => orgF(s, '군단 병력 현황표'),
  urs_sol_cp_company: () => F('군단 사령부 중대 편성표'),
  urs_mine_bell_bell: (s) => orgF(s, '광구 교대 기록'),
  urs_mine_miner_shaft: (s) => orgF(s, '광구 사고 집계'),
  urs_farm_serf_rent: (s) => orgF(s, '소작 장부 사본'),
  urs_farm_chief_famine: (s) => orgF(s, '북부 기근 피해 집계'),
  urs_work_wk_dorm: (s) => orgF(s, '공장 기숙사 배정표'),
  urs_work_sk_accident: (s) => orgF(s, '공장 사고 보고'),
  urs_univ_un_faction: () => F('학생회 분파 명부'),
  urs_univ_ch_podium: () => F('학생회 협상 기록'),
  urs_craft_own_energy: (s) => orgF(s, '영업 허가 대장'),
  urs_car_ma_route: (s) => orgF(s, '상단 등록 대장'),
  urs_guard_chief_purge: (s) => orgF(s, '인사 명단'),
  urs_res_rs_paper: () => F('연구소 논문 등록'),
  urs_tea_tea_list: (s) => orgF(s, '학생 명단 열람 기록'),
  urs_art_tr_censor: (s) => orgF(s, '검열 기록'),
  urs_nob_du_seat: () => F('하원 발언 순서표'),
  urs_live_frost: (s) => orgF(s, '기상 기록'),
  urs_newcomer_papers: (s) => orgF(s, '거주 등록 대장'),
  urs_work_wk_pay: (s) => orgF(s, '급료 지급 대장'),
  urs_off_lt_platoon: () => F('군단 사령부 소대 편성표'),
  urs_univ_ph_class: () => F('피터하임 중학교 성적표'),
};
for (const e of events) if (FOOT[e.id]) { const run = e.run; e.run = (s) => { const r = run(s); if (r && typeof r === 'object' && !r.f) r.f = FOOT[e.id](s); return r; }; }

// ══════════════════════════════════════════════════════════════════════════
// 결정
// ══════════════════════════════════════════════════════════════════════════
/** 혼인 결정 덮어쓰기: 우르수스 거주자에게만 문구를 바꾸고, 그 외 국가는 엔진 임시 문구로 되돌린다(같은 유형 id 가 다른 나라에도 있다) */
function marryOverride(typeId, bodyFn, acceptFn) {
  const base = ENGINE_DECISIONS.marry;
  return {
    once: false, at: 0.45,
    ok: (s) => { const b = base.ok(s); return b && s.S.flags.y_marry && s.S.flags.y_marry.v && s.S.flags.y_marry.v.type.id === typeId; },
    build: (s, p) => { const r = s.S.flags.y_marry && s.S.flags.y_marry.v; if (!r) return null; if (!here(s)) return base.build(s, p); Object.assign(p, r);
      return { title: r.type.name, body: bodyFn(s, r.prospect, r.type), choices: [{ k: 'accept', label: '받아들인다', auto: 1.4 }, { k: 'hold', label: '보류한다', auto: 0.4 }, { k: 'decline', label: '거절한다', auto: 0.4 }] }; },
    apply: (s, k, p) => { if (!here(s)) return base.apply(s, k, p); s.S.flags.y_marry = null;
      if (k === 'hold') return '혼담을 한 해 미루었습니다.'; if (k === 'decline') return '혼담을 돌려보냈습니다.';
      if (p.prospect && p.prospect.race !== s.S.race && s.rng.chance(0.4)) return { t: '양가가 종족을 두고 말이 길어졌습니다. 혼담은 봄을 넘기지 못했습니다.', k: 'bad', fx: { h: -2 } };
      return acceptFn(s, p.prospect, p.type); },
  };
}
const doMarry = (s, prospect, type, text) => (engineMarry(s, prospect, type) ? { t: text, k: 'warm', fx: { h: 3 } } : '혼인은 이루어지지 않았습니다.');

export const decisions = {
  // ── 병사: 탈영 ──
  urs_sol_desert: {
    tags: ['track:URS_SOLDIER'], once: false, gap: 5, at: 0.5,
    ok: (s) => inTrack(s, 'URS_SOLDIER') && s.S.age >= 18 && (s.S.flags.war || yr(s, 'sol_desert', 0.12)),
    build: (s) => ({ title: '밤 열차', body: '내일 부대가 북쪽으로 올라갑니다. 오늘 밤 역에서 남쪽 열차가 떠납니다. 동기 하나가 같이 가자고 했습니다.',
      choices: [{ k: 'stay', label: '남는다', auto: 3 }, { k: 'go', label: '열차를 탄다', sub: '잡히면 수용소', auto: 0.6 }] }),
    apply: (s, k) => {
      if (k === 'stay') { s.S.track.standing = Math.min(100, s.S.track.standing + 3); return { t: '남았습니다. 동기는 열차를 탔고, 그 뒤 이름은 명단에서만 보았습니다.', k: 'note', fx: { h: -2 } }; }
      if (s.rng.chance(0.55)) { s.fall('desert'); return false; }
      s.leaveTrack('exile', { quiet: true });
      if (s.migrate('flee')) return { t: '열차를 탔습니다. 국경에서 내렸고, 군복은 강에 버렸습니다.', k: 'big', fx: { h: -3 } };
      return { t: '열차를 탔습니다. 끝 역에서 내려 이름을 바꾸고 살았습니다.', k: 'bad', fx: { h: -3 } };
    },
  },
  // ── 학생: 밀고 ──
  urs_univ_inform: {
    tags: ['track:URS_UNIV'], once: false, gap: 4, at: 0.5,
    ok: (s) => inTrack(s, 'URS_UNIV') && s.S.age >= 16 && yr(s, 'univ_inform', 0.2),
    build: (s) => ({ title: '차 한 잔', body: '내무성 사람이 찻집으로 불렀습니다. 학생회 모임에서 누가 무슨 말을 했는지 적어 주면 학비를 돌봐 주겠다고 했습니다.',
      choices: [{ k: 'no', label: '적지 않는다', auto: 2.5 }, { k: 'yes', label: '적어 준다', sub: '학비', auto: 0.8 }] }),
    apply: (s, k) => {
      if (k === 'yes') { s.S.flags.w9b_informer = s.S.age; return { t: '이름 셋을 적었습니다. 학비 통지서에 영이 하나 줄었습니다. 그 뒤 모임에서 제 옆자리가 비기 시작했습니다.', k: 'bad', fx: { money: medX(s, 0.3), h: -4, standing: -5 } }; }
      if (s.rng.chance(0.15)) { s.fall('arrest'); return false; }
      return { t: '찻잔을 비우지 않고 나왔습니다. 그 뒤로 학비 고지서는 제때 왔습니다. 전부 냈습니다.', k: 'note', fx: { h: 1, standing: 3 } };
    },
  },
  // ── 학생: 학생회 가입(분파 선택 → faction 단계) ──
  urs_univ_join: {
    tags: ['track:URS_UNIV:university'], once: true, at: 0.4,
    ok: (s) => inTrack(s, 'URS_UNIV') && s.S.track.stage === 1 && s.S.age - s.S.track.stageSince >= 1,
    build: (s) => ({ title: '학생회', body: '세 분파가 각각 자리를 내 주겠다고 했습니다. 어느 쪽이든 명단에 이름이 오릅니다.',
      choices: [{ k: 'URS_UNIV_SYMPOSIUM', label: '심포지엄', sub: '신문', auto: 1.2 }, { k: 'URS_UNIV_VANGUARD', label: '뱅가드', sub: '거리', auto: 0.8 }, { k: 'URS_UNIV_AUTONOMY', label: '자치단', sub: '토론', auto: 1 }, { k: 'no', label: '어디에도', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '어디에도 이름을 올리지 않았습니다. 세 분파 모두 다음 주에도 커피를 샀습니다.', k: 'note' };
      s.S.track.aff = k; s.S.track.standing = Math.min(100, s.S.track.standing + 5);
      if (s.promote({ force: true, quiet: true })) return { t: (s.data.affById[k] ? s.data.affById[k].name : '학생회') + ' 명단에 이름을 썼습니다. 손이 조금 떨렸고, 글씨는 또렷했습니다.', k: 'ev', fx: { h: 2 } };
      return { t: '이름을 올렸습니다. 자리는 다음 해에 났습니다.', k: 'note' };
    },
  },
  // ── 수용소: 거래 ──
  urs_mine_trade: {
    tags: ['track:URS_MINE'], once: false, gap: 3, at: 0.5,
    ok: (s) => inTrack(s, 'URS_MINE') && s.S.age >= 10 && yr(s, 'mine_trade', 0.3),
    build: (s) => ({ title: '막사 뒤', body: '경비병 하나가 담배와 약을 바꾸자고 했습니다. 약은 진짜일 수도, 이끼일 수도 있습니다. 담배는 사흘치 빵과 같습니다.',
      choices: [{ k: 'no', label: '빵을 지킨다', auto: 1.5 }, { k: 'yes', label: '바꾼다', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '빵을 지켰습니다. 기침은 그대로였습니다.', k: 'note' };
      if (s.rng.chance(0.4)) return { t: '진짜 약이었습니다. 한 주 동안 숨이 편했습니다. 한 주였습니다.', k: 'warm', fx: { hl: 3, h: 1 } };
      return { t: '이끼였습니다. 경비병은 웃었고, 사흘 동안 배가 비었습니다.', k: 'bad', fx: { hl: -2, h: -2 } };
    },
  },
  // ── 수용소: 탈출 시도(성공률 낮음) ──
  urs_mine_escape: {
    tags: ['track:URS_MINE'], once: false, gap: 4, at: 0.6,
    ok: (s) => inTrack(s, 'URS_MINE') && s.S.age >= 12 && yr(s, 'mine_escape', 0.25),
    build: (s) => ({ title: '울타리', body: '얼어붙은 강 위로 나가는 길을 아는 사람이 있다고 했습니다. 목 뒤의 것이 울타리를 넘으면 터진다는 말도 있었습니다. 둘 다 확인한 사람은 없습니다.',
      choices: [{ k: 'stay', label: '남는다', auto: 3 }, { k: 'go', label: '강으로 간다', sub: '성공은 드물다', auto: 0.5 }] }),
    apply: (s, k) => {
      if (k === 'stay') return { t: '남았습니다. 강으로 간 사람들 소식은 종소리 사이에 끼어 왔습니다. 좋은 소식은 없었습니다.', k: 'note', fx: { h: -1 } };
      const r = s.rng.rnd();
      if (r < 0.15) { s.S.flags.fall_camp_survive = s.S.age; s.S.flags.w9b_rebel = s.S.age; s.S.prison = null; s.S.prisonLeft = 0; s.leaveTrack('exile', { quiet: true });
        if (s.migrate('flee')) return { t: '얼음 위를 밤새 걸었습니다. 목 뒤의 것은 터지지 않았습니다. 새벽에 국경 숲이었습니다.', k: 'big', fx: { hl: -5, h: 2 } };
        return { t: '얼음 위를 밤새 걸었습니다. 목 뒤의 것은 터지지 않았습니다. 이름 없는 마을에 숨었습니다.', k: 'big', fx: { hl: -5, h: 2 } }; }
      if (r < 0.6) { s.die('execution', '탈출 실패'); return false; }
      return { t: '울타리 앞에서 잡혔습니다. 매는 길었고, 배급은 반으로 줄었습니다. 목 뒤의 것은 그대로였습니다.', k: 'bad', fx: { hl: -8, h: -4, standing: -10 } };
    },
  },
  // ── 순찰대: 자수한 노인 ──
  urs_pat_old_man: {
    tags: ['track:URS_PATROL'], once: false, gap: 5, at: 0.5,
    ok: (s) => inTrack(s, 'URS_PATROL') && yr(s, 'pat_old', 0.2),
    build: (s) => ({ title: '자수', body: '마을 노인이 스스로 걸어 나와 차에 타겠다고 했습니다. 포획 보너스는 한 건입니다. 조장은 보고 있지 않습니다.',
      choices: [{ k: 'take', label: '태운다', sub: '보너스', auto: 1.2 }, { k: 'let', label: '돌려보낸다', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'take') return { t: '태웠습니다. 노인은 뒤칸에서 아무 말도 하지 않았습니다. 보너스는 그달 봉투에 들어 있었습니다.', k: 'bad', fx: { money: medX(s, 0.06), h: -4, standing: 2 } };
      if (s.rng.chance(0.2)) return { t: '돌려보냈습니다. 누군가 보았습니다. 다음 달 제 이름이 보너스 표에서 빠졌고, 조장 눈이 달라졌습니다.', k: 'bad', fx: { h: -1, standing: -6 } };
      return { t: '돌려보냈습니다. 노인은 뒤를 보지 않고 걸어갔습니다. 보고서에는 그 마을에 아무도 없었다고 적었습니다.', k: 'note', fx: { h: 2, standing: -2 } };
    },
  },
  // ── 장교: 편 가르기 ──
  urs_off_side: {
    tags: ['track:URS_OFFICER'], once: false, gap: 6, at: 0.5,
    ok: (s) => inTrack(s, 'URS_OFFICER') && s.S.track.stage >= 2 && yr(s, 'off_side', 0.18),
    build: (s) => ({ title: '두 통의 편지', body: '원수 쪽과 황궁 쪽에서 같은 주에 편지가 왔습니다. 둘 다 저녁을 청했고, 둘 다 같은 날이었습니다.',
      choices: [{ k: 'marshal', label: '원수 쪽', auto: 1 }, { k: 'tsar', label: '황궁 쪽', auto: 1 }, { k: 'none', label: '둘 다 거른다', auto: 0.8 }] }),
    apply: (s, k) => {
      if (k === 'none') return { t: '둘 다 몸이 좋지 않다고 썼습니다. 둘 다 믿지 않았습니다. 그래도 그해는 지나갔습니다.', k: 'note', fx: { standing: -2 } };
      if (k === 'marshal') { s.S.track.aff = 'URS_OFF_MARSHAL'; if (s.rng.chance(0.3)) { if (s.promote({ quiet: true })) return { t: '원수 쪽 저녁에 갔습니다. 다음 달 승진 명령서에 원수 서명이 있었습니다.', k: 'ev', fx: { h: 2 } }; } if (s.rng.chance(0.15)) { s.fall('purge'); return false; } return { t: '원수 쪽 저녁에 갔습니다. 술은 좋았고, 돌아오는 길에 뒤를 돌아보는 버릇이 생겼습니다.', k: 'note', fx: { standing: 3 } }; }
      s.S.track.aff = 'URS_OFF_LEGION'; if (s.rng.chance(0.15)) { s.fall('courtmartial'); return false; }
      return { t: '황궁 쪽 저녁에 갔습니다. 황제는 말이 적었고, 다음 달 원수 쪽 초대장이 끊겼습니다.', k: 'note', fx: { standing: 2, h: -1 } };
    },
  },
  // ── 지하조직: 극북 봉기 가담 ──
  urs_under_rebel: {
    tags: ['track:URS_UNDER'], once: true, at: 0.5,
    ok: (s) => inTrack(s, 'URS_UNDER') && s.year >= 1100 && s.year <= 1101 && s.S.age >= 16,
    build: (s) => ({ title: '북쪽에서 온 사람', body: '극북 광구에서 사람이 내려왔습니다. 봉기가 준비되고 있고, 손이 모자란다고 했습니다. "우르수스가 우리를 버렸다"는 전단을 두고 갔습니다.',
      choices: [{ k: 'go', label: '올라간다', sub: '돌아오지 못할 수 있다', auto: 0.8 }, { k: 'stay', label: '남아서 돕는다', auto: 1.5 }] }),
    apply: (s, k) => {
      s.S.flags.w9b_rebel = s.S.age;
      if (k === 'stay') return { t: '남아서 식량과 전단을 올려 보냈습니다. 올라간 사람 수를 적은 종이는 태웠습니다.', k: 'note', fx: { standing: 3 } };
      const r = s.rng.rnd();
      if (r < 0.3) { s.die('far_north_1101', '극북 반란'); return false; }
      if (r < 0.55) { s.fall('arrest'); return false; }
      s.S.flags.bigevent_survive = s.S.age;
      return { t: '극북에 섰습니다. 제4군단이 왔고, 얼음 위로 흩어졌습니다. 살아 내려왔고, 내려온 사람은 적었습니다.', k: 'big', fx: { hl: -6, h: -4, standing: 8 } };
    },
  },
  // ── 공장: 행진 ──
  urs_work_march: {
    tags: ['track:URS_WORKER'], once: false, gap: 5, at: 0.5,
    ok: (s) => inTrack(s, 'URS_WORKER') && s.S.age >= 16 && yr(s, 'work_march', s.year >= 1101 ? 0.25 : 0.06),
    build: (s) => ({ title: '공장 앞', body: '급료가 석 달 밀렸습니다. 노동자들이 내일 아침 공장 앞에서 거리로 나간다고 했습니다. 앞줄에 설 사람을 찾고 있습니다.',
      choices: [{ k: 'front', label: '앞줄에 선다', auto: 0.6 }, { k: 'back', label: '뒷줄에 선다', auto: 1.5 }, { k: 'home', label: '집에 있는다', auto: 1.2 }] }),
    apply: (s, k) => {
      if (k === 'home') return { t: '집에 있었습니다. 창밖으로 소리가 지나갔습니다. 다음 날 공장에서 아무도 그 이야기를 하지 않았습니다.', k: 'note', fx: { h: -1 } };
      if (k === 'back') return { t: '뒷줄에 섰습니다. 앞줄에 최루탄이 떨어졌습니다. 뒷줄은 뛰었습니다. 밀린 급료는 한 달치만 나왔습니다.', k: 'bad', fx: { money: medX(s, 0.08), h: -2 } };
      if (s.rng.chance(0.35)) { s.fall('raid'); return false; }
      return { t: '앞줄에 섰습니다. 사진에 찍혔습니다. 급료는 다 나왔고, 제 이름은 어딘가에 적혔습니다.', k: 'ev', fx: { money: medX(s, 0.2), standing: 5, h: 1 } };
    },
  },
  // ── 농민: 떠날 것인가 ──
  urs_farm_leave: {
    tags: ['track:URS_FARM:serf'], once: true, at: 0.5,
    ok: (s) => inTrack(s, 'URS_FARM') && s.S.age >= 16 && s.S.age <= 35 && yr(s, 'farm_leave', 0.25),
    build: (s) => ({ title: '도시로 간 사촌', body: '도시 공장에 간 사촌이 편지를 보냈습니다. 급료가 밭의 두 배라고 했습니다. 소작은 땅을 떠날 수 없습니다. 법이 그렇습니다.',
      choices: [{ k: 'stay', label: '땅에 남는다', auto: 2 }, { k: 'go', label: '밤에 떠난다', sub: '잡히면 돌아온다', auto: 0.8 }] }),
    apply: (s, k) => {
      if (k === 'stay') return { t: '남았습니다. 사촌 편지는 그 뒤로 오지 않았습니다.', k: 'note' };
      if (s.rng.chance(0.4)) return { t: '역에서 잡혀 돌아왔습니다. 지주가 벌금을 매겼고, 벌금은 다음 해 수확에서 나갔습니다.', k: 'bad', fx: { money: -medX(s, 0.15), h: -3 } };
      if (s.enterTrack('URS_WORKER', { how: 'switch', via: 'flee', skipExam: true })) return { t: '밤에 떠났습니다. 도시 공장이 이름을 묻지 않고 받아 주었습니다. 밭은 다시 보지 않았습니다.', k: 'big', fx: { h: 2 } };
      return { t: '떠났지만 공장 문은 열리지 않았습니다. 돌아왔습니다.', k: 'bad', fx: { h: -2 } };
    },
  },
  // ── 장인: 신분 구매 ──
  urs_craft_buy_title: {
    tags: ['track:URS_CRAFT'], once: true, at: 0.6,
    ok: (s) => inTrack(s, 'URS_CRAFT') && s.S.age >= 28 && s.S.age <= 45 && s.S.money >= s.med * 6 && s.S.cap.ties >= 0,
    build: (s) => ({ title: '증서', body: '귀족 증서를 파는 사람이 있습니다. 값은 중위소득의 여섯 배. 공장 하나를 산 것과 같은 효력이 있다고 했습니다.',
      choices: [{ k: 'buy', label: '산다', auto: 0.8 }, { k: 'no', label: '가게를 지킨다', auto: 1.5 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '가게를 지켰습니다. 증서 파는 사람은 다른 가게로 갔습니다.', k: 'note' };
      s.S.money -= Math.round(s.med * 6);
      if (s.enterTrack('URS_NOBLE', { how: 'switch', via: 'purchase', skipExam: true })) return { t: '증서를 샀습니다. 드보랴닌이라는 글자가 제 이름 앞에 붙었습니다. 구 귀족들은 그 글자를 읽을 때 웃었습니다.', k: 'big', fx: { h: 2 } };
      return { t: '돈은 냈고 증서는 오지 않았습니다. 파는 사람도 오지 않았습니다.', k: 'bad', fx: { h: -3 } };
    },
  },
  // ── 혼인 유형 덮어쓰기 ──
  marry_church: marryOverride('church',
    (s, pr) => wa(pr.name) + ' 혼담이 오갔습니다. 교회에서 촛불 넷을 켜고 서는 혼인입니다. 지참금은 중위소득의 삼 할, 신랑 쪽이 냅니다.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람입니다.' : ''),
    (s, pr, t) => doMarry(s, pr, t, '교회에서 촛불을 들고 세 바퀴 돌았습니다. 종이 울렸고, 밖은 영하였고, 손은 따뜻했습니다.')),
  marry_noble: marryOverride('noble',
    (s, pr) => '집안끼리 혼약이 오갔습니다. 상대는 ' + pr.name + '. 가문 문장 둘을 나란히 새긴 반지가 먼저 왔습니다. 지참금은 중위소득의 세 배입니다.',
    (s, pr, t) => doMarry(s, pr, t, '두 가문 이름이 한 초대장에 찍혔습니다. 식은 길었고, 신랑 신부가 말할 차례는 짧았습니다.')),
  marry_garrison: marryOverride('garrison',
    (s, pr) => '주둔지 교회에서 ' + wa(pr.name) + ' 혼인을 올릴 수 있습니다. 지참금은 없고, 부대장 허가서가 지참금 대신입니다.',
    (s, pr, t) => doMarry(s, pr, t, '주둔지 교회에서 식을 올렸습니다. 하객은 군복이었고, 축포는 진짜 포였습니다.')),
  marry_infected_only: marryOverride('infected_only',
    (s, pr) => '수용소 안에서 ' + wa(pr.name) + ' 짝을 지을 수 있습니다. 사제도 서류도 없습니다. 막사 한 칸이 둘의 것이 됩니다.',
    (s, pr, t) => doMarry(s, pr, t, '막사 한 칸을 같이 쓰게 되었습니다. 종이 두 번 울리는 사이, 돌아갈 곳이 생겼습니다.')),
  // ── 주거 결정 덮어쓰기 ──
  home_change: {
    once: false, gap: 5, at: 0.7,
    ok: (s) => ENGINE_DECISIONS.home_change.ok(s),
    build: (s, p) => { if (!here(s)) return ENGINE_DECISIONS.home_change.build(s, p); const opts = homeChangeOptions(s).slice(0, 3); if (!opts.length) return null;
      const NAME = { village_izba: '농촌 통나무집. 벽난로 위가 잠자리입니다.', estate: '귀족 저택. 전 주인은 북쪽으로 갔다고 합니다.' };
      return { title: '집', body: '모은 돈으로 집을 살 수 있는 해입니다. 우르수스에서 제 이름으로 된 벽은 드문 것입니다.',
        choices: opts.map((h) => ({ k: h.id, label: h.name, sub: (NAME[h.id] ? NAME[h.id] + ' ' : '') + Math.round(s.med * h.buy).toLocaleString() + ' LMD', auto: h.w ?? 1 })).concat([{ k: 'no', label: '그대로 산다', auto: 1 }]) }; },
    apply: (s, k, p) => { if (!here(s)) return ENGINE_DECISIONS.home_change.apply(s, k, p); if (k === 'no') return '그대로 살기로 했습니다.';
      const h = homeChangeOptions(s).find((x) => x.id === k); if (!h || !setHousing(s, h, { buy: true, quiet: true })) return '마련하지 못했습니다.';
      return { t: k === 'village_izba' ? '통나무집 열쇠를 받았습니다. 첫 밤에 벽난로를 지폈고, 연기가 제 집 굴뚝으로 나갔습니다.' : k === 'estate' ? '저택 문서에 서명했습니다. 방이 열넷이었고, 쓰는 방은 셋이었습니다.' : eul(h.name) + ' 마련했습니다. 문에 제 이름을 걸었습니다.', k: 'warm', fx: { h: 3 } }; },
  },
};

// W11: 엔진 id 와 같은 결정은 국가 디스패처로 옮긴다(여러 파일이 같은 id 를 등록해도 거주국별로 분기)
hoist(decisions, { marry_church: ['ursus'], marry_noble: ['ursus'], marry_garrison: ['ursus'], marry_infected_only: ['ursus'], home_change: ['ursus'] });

export default { events, decisions };

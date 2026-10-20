// W9c 사미 진로 콘텐츠. 진로 id·단계 id 는 data/tracks/sami.json. 태그는 track:<ID>:<stageId>.
// 핵심 5: SAM_SHAMAN(눈의 사제 견습) · SAM_HUNTER · SAM_TRIBE(생업) · SAM_GUIDE(남부 안내인) · SAM_WARRIOR. 나머지: OUTCAST · SAR · TRADER · RESORT.
// A7(샤먼·사냥꾼·전사·추방자) 승급은 징조(S.flags.omen)로만 제 배율이 된다 — omen() 을 세우는 이벤트가 각 진로에 있다.
import { orgF, F, fest, cul, medX, lifeRoll, once, eul, iga, eun, wa, ro, rago } from '../_util.js';
import { E, T, TR, AF, fresh, stageYears, fell, affIs, affName, standing, trStage, omen, openSwitch, canonOk, canonSeen, marryDecision, homeDecision } from './_w9c_util.js';

const N = 'sami';
const SHA = 'SAM_SHAMAN', HUN = 'SAM_HUNTER', TRI = 'SAM_TRIBE', GUI = 'SAM_GUIDE', WAR = 'SAM_WARRIOR';
const OUT = 'SAM_OUTCAST', SAR = 'SAM_SAR', TRD = 'SAM_TRADER', RES = 'SAM_RESORT';
const south = (s) => !!s.S.track && [GUI, RES, TRD].includes(s.S.track.id);
const visitName = (s) => { const id = s.res && s.res.itinerantAt; const n = id && s.data.nationById[id]; return n ? n.name : null; };

export const events = [
  // ═══════════════════════════════════════ SAM_SHAMAN 샤먼 → 눈의 사제 (핵심, A7) ═══════════════════════════════════════
  // ── apprentice 샤먼 견습생 ──
  E('sam_sha_app_bark', [8, 40], T(SHA, 'apprentice'), 30, 2, { t: '나무껍질을 불에 쬐어 갈라지는 금을 읽는 법을 배웠습니다. 스승은 같은 금을 보고 다른 말을 했습니다.', fx: { cap: { arts: 0.03 } } }),
  E('sam_sha_app_rune', [8, 40], T(SHA, 'apprentice'), 30, 2, { t: '천막 둘레에 룬을 새겼습니다. 손이 얼어 선이 흔들렸고, 스승이 그 자리만 다시 새겼습니다.', fx: { hl: -1, cap: { arts: 0.02 } } }),
  E('sam_sha_app_night', [8, 40], T(SHA, 'apprentice'), 25, 3, { t: '밤에는 숲에 머물지 않는다는 말을 처음으로 어겼습니다. 스승 곁에서였고, 숲은 아무 말도 하지 않았습니다.', k: 'note', fx: { h: 1 } }),
  E('sam_sha_app_beast', [8, 40], T(SHA, 'apprentice'), 25, 3, { t: '스승이 오염된 사슴을 재웠습니다. 눈을 감지 말라고 해서 감지 않았습니다.', k: 'bad', fx: { h: -2 } }),
  E('sam_sha_app_tree', [8, 40], ['aff:SAM_SHA_TREE'], 25, 4, { t: '성스러운 나무 곁에서 잤습니다. 나무에 들인 아이라고 사람들은 불렀고, 그 말에는 거리가 있었습니다.', k: 'note', fx: { standing: 2 } }),
  E('sam_sha_app_disciple', [8, 40], ['aff:SAM_SHA_DISCIPLE'], 20, 4, { t: '스승의 이름으로 다른 부족 천막에 들어갔습니다. 스승이 없었다면 열리지 않았을 입구였습니다.', k: 'note', fx: { standing: 2 } }),
  // ── shaman 샤먼 ──
  E('sam_sha_sha_move', [14, 80], T(SHA, 'shaman'), 30, 2, { t: '이주할 날을 정했습니다. 껍질의 금이 그렇게 갈라졌고, 부족은 그날 아침 천막을 걷었습니다.', fx: { standing: 3 } }),
  E('sam_sha_sha_funeral', [14, 80], T(SHA, 'shaman'), 25, 3, { t: '장례에서 시신을 먼저 살폈습니다. 깨끗했습니다. 배를 띄웠습니다.', k: 'note', fx: { standing: 2, h: -1 } }),
  E('sam_sha_sha_fever', [14, 80], T(SHA, 'shaman'), 25, 2, { t: '열병 난 아이에게 약초를 달여 먹였습니다. 사흘째 열이 내렸고, 아이 어머니는 이름을 부르지 않고 "샤먼"이라고만 불렀습니다.', k: 'warm', fx: { standing: 3, h: 2 } }),
  E('sam_sha_sha_ward', [14, 80], T(SHA, 'shaman'), 25, 3, { t: '결계 룬 하나가 지워져 있었습니다. 누가 지웠는지는 묻지 않고 새로 새겼습니다.', k: 'bad', fx: { hl: -1 } }),
  E('sam_sha_sha_caravan', [14, 80], T(SHA, 'shaman'), 15, 4, { t: '우르수스 캐러밴 사람이 점을 봐 달라고 했습니다. 껍질을 쬐어 주었고, 그는 결과를 종이에 적어 갔습니다.', k: 'note', fx: { money: (s) => medX(s, 0.05) } }),
  // ── candidate 사제 후보 ──
  E('sam_sha_can_council', [20, 85], T(SHA, 'candidate'), 30, 2, { t: '사제 평의회에 앉았습니다. 말은 한마디도 하지 않았고, 그것이 후보의 자리였습니다.', fx: { standing: 2 }, f: (s) => orgF(s, '평의회 편, 사제 9인 참석') }),
  E('sam_sha_can_voice', [20, 85], T(SHA, 'candidate'), 25, 3, { t: '빙원 경계에서 밤을 샜습니다. 무언가가 이름을 불렀습니다. 대답하지 않았습니다.', k: 'bad', fx: { hl: -3, h: -2 } }),
  E('sam_sha_can_sick', [20, 85], T(SHA, 'candidate'), 25, 3, { t: '늙은 사제의 천막을 지켰습니다. 사제는 깨어 있을 때보다 잠들어 있을 때 더 많은 말을 했습니다.', k: 'note', fx: { cap: { arts: 0.03 } } }),
  E('sam_sha_can_south', [20, 85], T(SHA, 'candidate'), 20, 4, { t: '남하를 두고 평의회가 갈렸습니다. 계속 남쪽으로만 가면 사미는 끝난다는 말이 나왔고, 아무도 반박하지 못했습니다.', k: 'note', fx: { h: -1 } }),
  // ── priest 눈의 사제 ──
  E('sam_sha_pri_ask', [25, 90], T(SHA, 'priest'), 30, 2, { t: '부족이 사미의 뜻을 물었습니다. 껍질을 쬐고, 눈을 감고, 대답했습니다. 그 대답으로 부족이 움직였습니다.', fx: { standing: 3 } }),
  E('sam_sha_pri_ice', [25, 90], T(SHA, 'priest'), 30, 2, { t: '빙원 경계에 결계를 쳤습니다. 돌아와서 이틀을 잤고, 깨어나서도 한동안 자기 이름이 떠오르지 않았습니다.', k: 'bad', fx: { hl: -4, h: -2 } }),
  E('sam_sha_pri_ursus', [25, 90], T(SHA, 'priest'), 15, 5, { t: '우르수스 대위가 천막에 들어와 차를 마시고 갔습니다. 예의 바른 사람이었습니다. 그날 밤 결계를 한 겹 더 쳤습니다.', k: 'note', fx: { h: -1 } }),
  E('sam_sha_pri_name', [25, 90], T(SHA, 'priest'), 20, 4, { t: '후보 하나를 지명했습니다. 지명받은 사람은 기뻐하지 않았습니다. 그것이 맞는 얼굴이었습니다.', k: 'note', fx: { standing: 2 } }),
  E('sam_sha_pri_1095', [8, 90], 'track:' + SHA, 200, 0, { t: '사제들이 같은 것을 보았습니다. 끝이 온다고 말했고, 남쪽 나라들은 그 말을 웃음거리로 실었습니다. 천막 안에서는 아무도 웃지 않았습니다.', k: 'big', fx: { h: -2 }, f: (s) => orgF(s, '예언 편', 1095) }, { c: (s) => s.year === 1095 }),
  // 징조(omen) — A7 승급 롤을 제 배율로
  E('sam_sha_omen_antler', [8, 90], 'track:' + SHA, 25, 3, (s) => { omen(s); return { t: '각성 의식에서 사슴 뿔이 북쪽을 가리킨 채 멈췄습니다. 장로들이 당신 쪽을 보았습니다.', k: 'warm', fx: { standing: 3 } }; }, { c: (s) => !s.S.flags.omen }),
  E('sam_sha_omen_fire', [8, 90], 'track:' + SHA, 25, 3, (s) => { omen(s); return { t: '한겨울 제단제의 불이 파랗게 탔습니다. 그 불 앞에 서 있던 사람이 당신이었습니다.', k: 'warm', fx: { standing: 3 } }; }, { c: (s) => !s.S.flags.omen }),
  E('sam_sha_omen_dream', [8, 90], 'track:' + SHA, 20, 3, (s) => { omen(s); return { t: '꿈에서 산이 말을 걸었습니다. 깨어서 껍질을 쬐니 같은 금이 갈라졌습니다.', k: 'note', fx: { cap: { arts: 0.05 } } }; }, { c: (s) => !s.S.flags.omen }),
  // 전환
  TR('sam_sha_tr_shaman', [10, 80], SHA, 'shaman', '견습이 끝났습니다. 스승이 자기 룬 칼을 건넸고, 그날부터 당신의 껍질 점을 믿는 사람이 생겼습니다.'),
  TR('sam_sha_tr_candidate', [16, 85], SHA, 'candidate', '평의회가 이름을 불렀습니다. 사제 후보였습니다. 축하하는 사람은 없었고, 걱정하는 사람은 많았습니다.'),
  TR('sam_sha_tr_priest', [20, 90], SHA, 'priest', '눈의 사제가 되었습니다. 부족의 큰일은 이제 전부 당신을 거쳐 사미의 뜻에 닿습니다. 빙원은 그 대가를 천천히 받아 갑니다.', 'big', { h: 2, standing: 10 }),
  // 몰락 후일담
  AF('sam_sha_af_erosion', N, SHA, ['erosion'], '침식에서 돌아왔습니다. 돌아온 사람이 전부는 아니었습니다. 껍질을 쬐어도 금이 읽히지 않았고, 사제직은 거기서 끝났습니다.', 'loss', { hl: -5 }),
  AF('sam_sha_af_exile', N, SHA, ['exile'], '점괘를 거역했다는 말이 돌았고, 부족은 떠나라고 했습니다. 룬 칼은 두고 나왔습니다.'),
  AF('sam_sha_af_infected', N, SHA, ['infected'], '감염이 드러났습니다. 누가 말하기 전에 스스로 룬 칼을 내려놓았습니다. 부족은 막지 않았고, 붙잡지도 않았습니다.', 'loss', { h: -4 }),

  // ═══════════════════════════════════════ SAM_HUNTER 사냥꾼 (핵심, A7) ═══════════════════════════════════════
  E('sam_hun_fol_track', [10, 40], T(HUN, 'follow'), 30, 2, { t: '눈 위 발자국을 읽는 법을 배웠습니다. 사슴과 늑대와 사람을 구분하기까지 겨울 하나가 걸렸습니다.', fx: { cap: { skill: 0.03 } } }),
  E('sam_hun_fol_trap', [10, 40], T(HUN, 'follow'), 30, 2, { t: '첫 덫을 놓았습니다. 사흘 뒤 비어 있었고, 노련한 사냥꾼은 덫이 아니라 자리가 틀렸다고 했습니다.', k: 'note' }),
  E('sam_hun_fol_cold', [10, 40], T(HUN, 'follow'), 25, 3, { t: '사냥꾼을 따라 이틀을 걸었습니다. 발가락 하나가 하얗게 변했고, 돌아와 한 달을 쉬었습니다.', k: 'bad', fx: { hl: -3 } }),
  E('sam_hun_fol_taint', [10, 40], T(HUN, 'follow'), 20, 3, { t: '검게 변한 늑대를 보았습니다. 사냥꾼은 활을 내리고 물러섰습니다. 그런 것은 쏘는 게 아니라고 했습니다.', k: 'note', fx: { h: -1 } }),
  E('sam_hun_hun_winter', [13, 70], T(HUN, 'hunter'), 30, 2, { t: '겨울 사냥이 잘되었습니다. 고기를 천막마다 나눴고, 남은 것은 얼려 두었습니다.', k: 'warm', fx: { standing: 3, h: 2 }, f: (s) => orgF(s, '사냥 편, 사슴 6마리') }),
  E('sam_hun_hun_fight', [13, 70], T(HUN, 'hunter'), 25, 3, { t: '곰과 마주쳤습니다. 창이 먼저 닿았지만 발톱도 닿았습니다. 흉터가 남았습니다.', k: 'bad', fx: { hl: -4, cap: { skill: 0.04 } } }),
  E('sam_hun_hun_gunshot', [13, 70], T(HUN, 'hunter'), 20, 3, { t: '국경 쪽에서 총소리가 났습니다. 사냥감이 전부 남쪽으로 달아났고, 그해 겨울은 길었습니다.', k: 'bad', fx: { h: -2 } }),
  E('sam_hun_hun_share', [13, 70], T(HUN, 'hunter'), 20, 3, { t: '사제 천막에 첫 사냥감의 뿔을 올렸습니다. 사제는 고개만 끄덕였습니다.', k: 'note', fx: { standing: 2 } }),
  E('sam_hun_vet_pupil', [20, 80], T(HUN, 'veteran'), 30, 2, { t: '아이 하나가 뒤를 따라다니기 시작했습니다. 덫 놓는 자리를 가르쳐 주고, 틀린 자리도 가르쳐 주었습니다.', k: 'warm', fx: { standing: 2, h: 1 } }),
  E('sam_hun_vet_demon', [20, 80], T(HUN, 'veteran'), 25, 3, { t: '발자국이 눈 속으로 사라지는 자리를 찾았습니다. 짐승 것이 아니었습니다. 부족에 알렸고, 그쪽 숲은 그해 비워졌습니다.', k: 'bad', fx: { standing: 3, h: -2 } }),
  E('sam_hun_vet_body', [20, 80], T(HUN, 'veteran'), 25, 2, { t: '무릎이 먼저 늙었습니다. 활은 아직 당겨졌습니다.', k: 'note', fx: { hl: -1 } }),
  E('sam_hun_vet_expedition', [20, 70], T(HUN, 'veteran'), 15, 5, (s) => { openSwitch(s); return { t: '남쪽 탐사대가 길을 아는 사람을 찾는다고 했습니다. 달러로 준다고 했습니다. 달러가 무엇인지는 늪지 사람이 설명해 주었습니다.', k: 'note' }; }),
  E('sam_hun_cyclops', [10, 80], ['aff:SAM_HUNT_CYCLOPS'], 20, 4, { t: '외눈 거인의 핏줄이라는 말을 들으며 자랐습니다. 사냥 전날 밤 껍질을 쬐는 버릇은 거기서 왔습니다.', k: 'note', fx: { cap: { arts: 0.02 } } }),
  E('sam_hun_forest_aff', [10, 80], ['aff:SAM_HUNT_FOREST'], 15, 4, { t: '숲지인 사냥꾼들은 늦여름에 모여 활시위를 바꿉니다. 시위를 바꾸며 겨울 이야기를 했습니다.', k: 'note', fx: { h: 1 } }),
  E('sam_hun_omen_first', [10, 80], 'track:' + HUN, 20, 3, (s) => { omen(s); return { t: '쏜 화살이 사슴을 지나 나무에 박혔는데, 사슴이 달아나지 않았습니다. 늙은 사냥꾼이 그 자리에 표식을 남겼습니다.', k: 'note', fx: { standing: 2 } }; }, { c: (s) => !s.S.flags.omen }),
  TR('sam_hun_tr_hunter', [12, 60], HUN, 'hunter', '혼자 사냥을 나갔습니다. 돌아와 고기를 내려놓자 아무도 어디서 잡았는지 묻지 않았습니다. 사냥꾼이 된 것입니다.'),
  TR('sam_hun_tr_veteran', [20, 80], HUN, 'veteran', '명사냥꾼이라고 불리기 시작했습니다. 이름보다 그 말이 먼저 천막에 닿았습니다.', 'ev', { standing: 5 }),
  AF('sam_hun_af_beast', N, HUN, ['beast'], '야수에게 당했습니다. 살아는 났고, 활은 다시 당길 수 없게 되었습니다.', 'loss', { hl: -3 }),
  AF('sam_hun_af_freezing', N, HUN, ['freezing'], '눈보라에 갇혔다가 나흘 만에 발견되었습니다. 발가락 셋을 잃었고, 사냥은 거기까지였습니다.', 'loss', { hl: -4 }),
  AF('sam_hun_af_erosion', N, HUN, ['erosion'], '빙원 가까이에서 무언가에 닿았습니다. 돌아온 뒤로 눈 위 발자국이 읽히지 않았습니다.', 'loss', { hl: -3, h: -2 }),

  // ═══════════════════════════════════════ SAM_TRIBE 일반 부족민 (핵심, A11 생업) ═══════════════════════════════════════
  E('sam_tri_chi_moss', [10, 20], T(TRI, 'child'), 30, 2, { t: '이끼를 긁어 모으는 일을 맡았습니다. 자루 하나에 하루가 들었습니다.', fx: { cap: { skill: 0.02 } } }),
  E('sam_tri_chi_reindeer', [10, 20], T(TRI, 'child'), 30, 2, { t: '순록 젖 짜는 법을 배웠습니다. 첫날은 발에 차였고, 둘째 날은 반 통을 채웠습니다.', k: 'warm', fx: { h: 1 } }),
  E('sam_tri_chi_warning', [10, 20], T(TRI, 'child'), 25, 3, { t: '경고문 여덟 가지를 외웠습니다. 밤에 숲에 머물지 말 것, 나무를 건드리지 말 것. 왜냐고 묻자 장로는 대답 대신 하나를 더 외우게 했습니다.', k: 'note', f: (s) => orgF(s, '경고문 8조') }),
  E('sam_tri_chi_abandon', [10, 20], T(TRI, 'child'), 10, 6, { t: '식량이 모자란 겨울이었습니다. 옆 천막의 갓난아이가 봄에 없었습니다. 아무도 그 이야기를 하지 않았습니다.', k: 'bad', fx: { h: -3 } }),
  E('sam_tri_adu_tent', [14, 70], T(TRI, 'adult'), 30, 2, { t: '천막을 걷고 사흘을 걸어 새 자리에 쳤습니다. 샤먼이 정한 날이었고, 날씨는 그 말대로였습니다.', fx: { hl: -1 }, f: (s) => orgF(s, '이주 편, 올해 2회') }),
  E('sam_tri_adu_candle', [14, 70], T(TRI, 'adult'), 25, 3, { t: '사슴 기름으로 양초를 부었습니다. 긴 밤을 나려면 천막마다 스무 자루는 있어야 했습니다.', k: 'note', fx: { money: (s) => medX(s, 0.03) }, f: (s) => orgF(s, '물자 편') }),
  E('sam_tri_adu_hunger', [14, 70], T(TRI, 'adult'), 20, 3, { t: '늦봄까지 고기가 떨어졌습니다. 이끼 빵으로 버텼고, 아이들 먼저 먹였습니다.', k: 'bad', fx: { hl: -3, h: -2 }, f: (s) => orgF(s, '물자 편, 천막당 말린 고기 20근 기준') }),
  E('sam_tri_adu_ursus', [14, 70], T(TRI, 'adult'), 15, 4, { t: '우르수스 캐러밴이 지나갔습니다. 소금을 받고 가죽을 주었습니다. 그들은 셈을 종이에 적었고, 우리는 머리에 적었습니다.', k: 'note', fx: { money: (s) => medX(s, 0.04) } }),
  E('sam_tri_eld_story', [45, 95], T(TRI, 'elder'), 30, 2, { t: '아이들에게 경고문 여덟 가지를 외우게 했습니다. 왜냐고 묻는 아이가 꼭 하나는 있었습니다.', k: 'warm', fx: { h: 2 } }),
  E('sam_tri_eld_council', [45, 95], T(TRI, 'elder'), 25, 3, { t: '장로회에 앉았습니다. 사제가 말하기 전까지는 아무도 말하지 않는 자리였습니다.', k: 'note', fx: { standing: 2 } }),
  E('sam_tri_eld_cold', [45, 95], T(TRI, 'elder'), 25, 3, { t: '겨울이 뼈에 먼저 왔습니다. 천막 가장 안쪽 자리를 내주는 사람이 있었습니다.', k: 'note', fx: { hl: -2, h: 1 } }),
  E('sam_tri_eld_boat', [45, 95], T(TRI, 'elder'), 15, 4, { t: '같이 늙은 사람의 배를 띄웠습니다. 샤먼이 시신을 살피는 동안 눈을 돌리지 않았습니다.', k: 'loss', fx: { h: -3 } }),
  // 계절·명절·동네(생업 체감)
  E('sam_tri_season_polar', [10, 95], 'track:' + TRI, 25, 2, { t: '해가 뜨지 않는 달이 왔습니다. 양초를 아끼느라 일찍 자고, 늦게 일어났습니다.', k: 'note', fx: { h: -1 } }),
  E('sam_tri_season_sun', [10, 95], 'track:' + TRI, 25, 2, { t: '해가 돌아온 날 천막마다 사람이 나와 서 있었습니다. 아무도 말을 하지 않았고, 그게 축제였습니다.', k: 'warm', fx: { h: 2 } }),
  E('sam_tri_fest_awaken', [10, 95], 'track:' + TRI, 25, 3, (s) => ({ t: iga(fest(s, 0)) + ' 있었습니다. 올해 열 살이 된 아이들이 뿔을 받았습니다. 받은 아이는 하루 종일 그것을 놓지 않았습니다.', k: 'warm', fx: { h: 2 } })),
  E('sam_tri_fest_midwinter', [10, 95], 'track:' + TRI, 25, 3, (s) => ({ t: fest(s, 1) + ' 날 사슴 고기를 제단에 올리고 남은 것을 나눴습니다. ' + eul(cul(s).drink) + ' 데워 마셨습니다.', k: 'warm', fx: { h: 2, hl: 1 } })),
  E('sam_tri_season_reindeer', [10, 95], 'track:' + TRI, 20, 3, { t: '순록 떼가 새끼를 쳤습니다. 봄에 센 수보다 가을에 센 수가 적었지만, 작년보다는 많았습니다.', k: 'note', fx: { money: (s) => medX(s, 0.03) }, f: (s) => orgF(s, '가축 편, 천막당 순록 12마리') }),
  E('sam_tri_season_snowfest', [10, 95], 'track:' + TRI, 20, 3, { t: '첫눈에 아이들이 눈을 굴려 탑을 쌓았습니다. 어른들은 그 옆에 진짜 움막을 쌓았습니다.', k: 'warm', fx: { h: 1 } }),
  E('sam_tri_neighbor_south', [10, 95], 'track:' + TRI, 12, 5, { t: '남쪽에서 돌아온 이웃이 통조림을 꺼냈습니다. 따는 법을 아는 사람이 천막에 하나뿐이었습니다.', k: 'note', fx: { h: 1 } }),
  E('sam_tri_aff_mountain', [10, 95], ['aff:SAM_TRIBE_MOUNTAIN'], 15, 4, { t: '산지 부족은 외지인이 오면 활부터 겨눕니다. 그해에도 한 명이 돌아갔고, 한 명은 돌아가지 못했습니다.', k: 'note', fx: { h: -1 } }),
  E('sam_tri_aff_forest', [10, 95], ['aff:SAM_TRIBE_FOREST'], 15, 4, { t: '숲지 부족은 길 잃은 외지인을 하루 재워 보냅니다. 그 사람은 다음 해 소금을 들고 다시 왔습니다.', k: 'note', fx: { h: 1 } }),
  E('sam_tri_aff_marsh', [10, 95], ['aff:SAM_TRIBE_MARSH'], 15, 4, { t: '늪지에는 달러가 돕니다. 가죽 값을 종이돈으로 받았고, 종이돈은 추위에 아무 쓸모가 없었습니다.', k: 'note', fx: { money: (s) => medX(s, 0.05) } }),
  TR('sam_tri_tr_adult', [13, 60], TRI, 'adult', '천막 한 자리를 받았습니다. 자기 몫의 양초와 자기 몫의 불침번이 생겼습니다.'),
  TR('sam_tri_tr_elder', [40, 95], TRI, 'elder', '연장자라고 불리기 시작했습니다. 불 가까운 자리를 내주었고, 대신 겨울 셈을 맡겼습니다.'),
  AF('sam_tri_af_ruin', N, TRI, ['ruin'], '순록을 절반 잃었습니다. 늑대였는지 추위였는지는 봄이 와도 알 수 없었습니다.', 'loss', { h: -2 }),
  AF('sam_tri_af_freeze', N, TRI, ['freezing', 'starvation'], '그 겨울을 간신히 넘겼습니다. 천막에서 두 사람이 봄을 보지 못했습니다.', 'loss', { hl: -4, h: -3 }),
  AF('sam_tri_af_erosion', N, TRI, ['erosion'], '숲 한쪽이 검게 썩어 들어왔습니다. 부족은 천막을 걷었고, 그 숲 이름은 다시 부르지 않았습니다.', 'loss', { h: -3 }),

  // ═══════════════════════════════════════ SAM_GUIDE 남부 안내인·연락책 (핵심, A6 순회) ═══════════════════════════════════════
  E('sam_gui_por_load', [14, 50], T(GUI, 'porter'), 30, 2, { t: '탐사대 짐을 졌습니다. 상자마다 깨지기 쉬운 것이라고 적혀 있었고, 하나도 깨지지 않았습니다.', fx: { hl: -1, standing: 2 }, f: (s) => F('탐사대 짐꾼 고용 조건, 1인 30킬로그램') }),
  E('sam_gui_por_dollar', [14, 50], T(GUI, 'porter'), 25, 3, { t: '처음으로 달러를 받았습니다. 종이였습니다. 차파트 가게에서 그것이 통조림 다섯 개로 바뀌었습니다.', k: 'note', fx: { money: (s) => medX(s, 0.08) }, f: (s) => F('차파트 교역소 환전 창구 시세표') }),
  E('sam_gui_por_sick', [14, 50], T(GUI, 'porter'), 20, 3, { t: '탐사대원 하나가 열에 쓰러졌습니다. 약초를 달였고, 대원은 그것을 기기에 기록했습니다.', k: 'note', fx: { standing: 2 } }),
  E('sam_gui_por_rule', [14, 50], T(GUI, 'porter'), 20, 3, { t: '외지인이 나무를 건드리려 했습니다. 손을 쳐냈습니다. 그는 화를 냈고, 다음 날 사과했습니다.', k: 'note', fx: { h: -1 } }),
  E('sam_gui_gui_route', [17, 60], T(GUI, 'guide'), 30, 2, { t: '길을 정했습니다. 지도에 없는 길이었고, 탐사대는 지도를 접고 뒤를 따랐습니다.', fx: { standing: 3, cap: { ties: 0.02 } } }),
  E('sam_gui_gui_storm', [17, 60], T(GUI, 'guide'), 25, 3, { t: '눈보라에 일행을 눈 속에 묻고 하룻밤을 버텼습니다. 아침에 세어 보니 수가 맞았습니다.', k: 'bad', fx: { hl: -3, standing: 4 } }),
  E('sam_gui_gui_instrument', [17, 60], T(GUI, 'guide'), 20, 3, { t: '탐사대가 빙원 쪽으로 기기를 세웠습니다. 바늘이 돌아갔습니다. 가지 말라고 했고, 그들은 하루 더 가고 돌아왔습니다.', k: 'note', fx: { h: -1 } }),
  E('sam_gui_gui_pharma', [17, 60], T(GUI, 'guide'), 20, 4, { t: '제약회사 사람이 약초 이름을 적어 갔습니다. 어느 나무 밑에서 나는지는 적지 못하게 했습니다.', k: 'note', fx: { money: (s) => medX(s, 0.1) }, f: (s) => F('컬럼비아 제약사 약초 매입 단가표, 근당 3달러') }),
  E('sam_gui_lia_phone', [20, 65], T(GUI, 'liaison'), 30, 2, { t: '교역소 전화로 북쪽 소식을 남쪽에, 남쪽 물건을 북쪽에 이었습니다. 양쪽 다 당신 이름을 알았고, 얼굴은 한쪽만 알았습니다.', fx: { standing: 3 } }),
  E('sam_gui_lia_contract', [20, 65], T(GUI, 'liaison'), 25, 3, { t: '계약서에 이름을 적었습니다. 글자는 교역소 사람이 썼고, 당신은 룬으로 서명했습니다.', k: 'note', fx: { money: (s) => medX(s, 0.15) }, f: (s) => F('차파트 교역소 연락책 계약서, 연 2회 갱신') }),
  E('sam_gui_lia_accident', [20, 65], T(GUI, 'liaison'), 20, 4, { t: '탐사대 사고 소식이 먼저 당신에게 왔습니다. 부족에 전해야 할지 사흘을 생각하고, 전했습니다.', k: 'bad', fx: { h: -2 } }),
  E('sam_gui_lia_rhine', [20, 65], ['aff:SAM_GUI_RHINE'], 20, 5, (s) => { s.S.flags.rhodes_medical_pact = s.S.age; return { t: '라인 랩 전초에 의료 지원 팀이 들렀습니다. 그중 한 사람의 명함에 로도스 아일랜드라고 적혀 있었습니다. 명함은 가지고 있었습니다.', k: 'note' }; }),
  E('sam_gui_aff_chapat', [14, 65], ['aff:SAM_GUI_CHAPAT'], 15, 4, { t: '차파트 교역소 뒤뜰에서 밤을 보냈습니다. 전기 불빛 아래서 자는 것은 끝까지 익숙해지지 않았습니다.', k: 'note' }),
  E('sam_gui_aff_expedition', [14, 65], ['aff:SAM_GUI_EXPEDITION'], 15, 4, { t: '탐사대가 사미 말을 배우려 했습니다. 경고문 여덟 가지부터 가르쳤습니다.', k: 'note', fx: { h: 1 } }),
  E('sam_gui_visit_columbia', [14, 65], ['track:' + GUI, 'visit:columbia'], 30, 3, { t: '컬럼비아 쪽 사무실에 들렀습니다. 서류에 종족 칸이 있었고, 사미 칸은 없었습니다.', k: 'note', fx: { h: -1 } }),
  E('sam_gui_visit_columbia2', [14, 65], ['track:' + GUI, 'visit:columbia'], 25, 3, { t: '컬럼비아 도시의 밤은 밝았습니다. 별이 하나도 보이지 않았고, 길은 잃지 않았습니다.', k: 'note' }),
  E('sam_gui_visit_ursus', [14, 65], ['track:' + GUI, 'visit:ursus'], 25, 3, { t: '우르수스 국경 마을에 머물렀습니다. 사미 사람이라고 하자 값이 두 번 바뀌었습니다.', k: 'note', fx: { money: (s) => -medX(s, 0.02) } }),
  TR('sam_gui_tr_guide', [16, 60], GUI, 'guide', '짐 대신 지도를 맡게 되었습니다. 탐사대장이 어디로 갈지 당신에게 먼저 물었습니다.'),
  TR('sam_gui_tr_liaison', [19, 65], GUI, 'liaison', '연락책이 되었습니다. 북쪽과 남쪽 양쪽에서 당신을 통해 말이 오갔고, 어느 쪽도 당신을 자기 쪽이라고 하지 않았습니다.', 'ev', { standing: 5 }),
  AF('sam_gui_af_freezing', N, GUI, ['freezing'], '빙원 길에서 돌아오지 못할 뻔했습니다. 탐사대가 썰매에 실어 왔고, 그 뒤로 추위가 몸에 남았습니다.', 'loss', { hl: -4 }),
  AF('sam_gui_af_accident', N, GUI, ['accident'], '탐사대 사고에 휘말렸습니다. 기기가 터졌고, 다친 사람 중에 당신도 있었습니다.', 'loss', { hl: -3 }),
  AF('sam_gui_af_contract', N, GUI, ['contract_end'], '계약이 끝났고, 다음 계약은 오지 않았습니다. 교역소 사람은 미안하다고 했고, 미안함은 종이돈이 되지 않았습니다.', 'loss', { h: -2 }),

  // ═══════════════════════════════════════ SAM_WARRIOR 북부 전사 (핵심, A7) ═══════════════════════════════════════
  E('sam_war_app_spear', [12, 40], T(WAR, 'apprentice'), 30, 2, { t: '창을 받았습니다. 자기 키보다 길었고, 겨울이 끝날 때쯤 키가 창을 따라잡았습니다.', fx: { cap: { skill: 0.04 } } }),
  E('sam_war_app_quiet', [12, 40], T(WAR, 'apprentice'), 25, 3, { t: '싸울 때 소리를 내지 말라고 배웠습니다. 소리가 빙원 것들을 부른다고 했습니다.', k: 'note' }),
  E('sam_war_app_outsider', [12, 40], T(WAR, 'apprentice'), 20, 3, { t: '외지인이 산지에 들어왔습니다. 전사들이 활을 겨눴고, 외지인은 돌아갔습니다. 당신은 뒤에 서 있었습니다.', k: 'note', fx: { h: -1 } }),
  E('sam_war_app_blood', [12, 40], T(WAR, 'apprentice'), 20, 3, { t: '첫 상처를 받았습니다. 전사장이 그 상처에 재를 발라 주었고, 흉터는 뿔 모양으로 남았습니다.', k: 'bad', fx: { hl: -2, standing: 3 } }),
  E('sam_war_war_line', [15, 60], T(WAR, 'warrior'), 30, 2, { t: '빙원 경계에 섰습니다. 안개 너머에서 무언가가 오래 서 있었고, 아침까지 오지 않았습니다.', k: 'bad', fx: { hl: -2, standing: 3 }, f: (s) => orgF(s, '빙원 편, 경계 교대 3일') }),
  E('sam_war_war_border', [15, 60], T(WAR, 'warrior'), 25, 3, { t: '우르수스 순찰대와 눈 위에서 마주 섰습니다. 양쪽 다 쏘지 않았습니다. 그해에는.', k: 'note', fx: { h: -1 } }),
  E('sam_war_war_body', [15, 60], T(WAR, 'warrior'), 20, 3, { t: '동료의 시신을 캐러밴에 실어 보냈습니다. 강까지 간다고 했습니다. 거기서 무엇이 되는지는 묻지 않았습니다.', k: 'loss', fx: { h: -3 } }),
  E('sam_war_war_raid', [15, 60], T(WAR, 'warrior'), 20, 4, { t: '마을 하나가 하룻밤에 비었습니다. 전사들이 갔을 때는 발자국만 남아 있었습니다. 누구 발자국인지는 말하지 않기로 했습니다.', k: 'bad', fx: { h: -3, standing: 2 } }),
  E('sam_war_chi_order', [25, 70], T(WAR, 'chief'), 30, 2, { t: '전사들을 빙원에 세웠습니다. 누구를 앞에 세울지 정하는 것이 전사장의 일이었습니다.', fx: { standing: 3, h: -1 }, f: (s) => orgF(s, '빙원 편, 창 40자루') }),
  E('sam_war_chi_priest', [25, 70], T(WAR, 'chief'), 25, 3, { t: '사제와 마주 앉았습니다. 사제는 빙원 결계를, 당신은 창의 수를 말했습니다. 둘 다 부족했습니다.', k: 'note' }),
  E('sam_war_chi_young', [25, 70], T(WAR, 'chief'), 25, 3, { t: '견습 전사의 창을 고쳐 잡아 주었습니다. 자기가 받았던 말을 그대로 했습니다. 소리를 내지 말 것.', k: 'warm', fx: { h: 1 } }),
  E('sam_war_chi_eroded', [25, 70], T(WAR, 'chief'), 20, 4, { t: '침식된 전사 하나가 빙원으로 걸어갔습니다. 막지 않았습니다. 그것이 전사의 끝이라고 모두가 알고 있었습니다.', k: 'loss', fx: { h: -4 } }),
  E('sam_war_aff_wounded', [12, 70], ['aff:SAM_WAR_WOUNDED'], 20, 4, { t: '나무 상처 부족의 전선은 빙원과 맞닿아 있습니다. 교대는 사흘마다였고, 돌아온 사람은 사흘 동안 말을 하지 않았습니다.', k: 'bad', fx: { hl: -2 } }),
  E('sam_war_aff_border', [12, 70], ['aff:SAM_WAR_BORDER'], 20, 4, { t: '국경 전선에서는 총소리를 듣는 날이 많았습니다. 쏘는 쪽은 늘 저쪽이었고, 맞는 쪽은 늘 눈이었습니다.', k: 'note' }),
  E('sam_war_omen_horn', [12, 70], 'track:' + WAR, 20, 3, (s) => { omen(s); return { t: '빙원에서 뿔피리 소리가 났습니다. 부족에 뿔피리는 없었습니다. 전사장이 당신의 창에 표식을 새겼습니다.', k: 'note', fx: { standing: 3 } }; }, { c: (s) => !s.S.flags.omen }),
  TR('sam_war_tr_warrior', [14, 55], WAR, 'warrior', '전사가 되었습니다. 창에 자기 룬을 새겼고, 빙원 교대 명단에 이름이 올랐습니다.'),
  TR('sam_war_tr_chief', [22, 70], WAR, 'chief', '전사장이 되었습니다. 앞에 설 사람을 고르는 일이 당신 몫이 되었고, 그 일은 밤에 잠을 가져갔습니다.', 'ev', { standing: 5, h: -1 }),
  AF('sam_war_af_kia', N, WAR, ['kia'], '교전에서 크게 다쳤습니다. 창은 다른 사람이 들게 되었습니다.', 'loss', { hl: -3 }),
  AF('sam_war_af_erosion', N, WAR, ['erosion'], '빙원 것이 몸에 닿았습니다. 전사장은 창을 거두게 했고, 당신은 빙원으로 걸어가지 않는 쪽을 골랐습니다.', 'loss', { hl: -4, h: -3 }),
  AF('sam_war_af_freezing', N, WAR, ['freezing'], '경계에서 얼어붙은 채 발견되었습니다. 살아났고, 손가락 둘은 살아나지 못했습니다.', 'loss', { hl: -4 }),

  // ═══════════════════════════════════════ SAM_OUTCAST 추방자·국경 방랑 (A7 순회) ═══════════════════════════════════════
  E('sam_out_wan_fire', [8, 60], T(OUT, 'wander'), 30, 2, { t: '불 피울 자리를 찾아 하루를 걸었습니다. 천막 없는 밤은 불이 천막이었습니다.', k: 'bad', fx: { hl: -2 } }),
  E('sam_out_wan_tree', [8, 60], T(OUT, 'wander'), 25, 3, { t: '성스러운 나무 아래 잤습니다. 부족이면 못 할 일이었습니다. 나무는 아무것도 하지 않았습니다.', k: 'note', fx: { cap: { arts: 0.02 } } }),
  E('sam_out_bor_trade', [10, 65], T(OUT, 'border'), 30, 2, { t: '국경 마을에서 가죽을 소금으로 바꿨습니다. 이름을 묻는 사람은 없었고, 그게 편했습니다.', k: 'note', fx: { money: (s) => medX(s, 0.03) }, f: (s) => F('국경 마을 교환 시세, 가죽 1장에 소금 2되') }),
  E('sam_out_bor_patrol', [10, 65], T(OUT, 'border'), 25, 3, { t: '우르수스 순찰대가 서류를 요구했습니다. 서류는 없었습니다. 눈 속으로 돌아갔습니다.', k: 'bad', fx: { h: -2 } }),
  E('sam_out_rea_tent', [10, 70], T(OUT, 'readopt'), 30, 2, (s) => { openSwitch(s); return { t: '어느 부족 천막이 하룻밤을 내주었습니다. 다음 날도 내주었습니다. 셋째 날 샤먼이 껍질을 쬐었습니다.', k: 'warm', fx: { h: 3 } }; }),
  E('sam_out_rea_name', [10, 70], T(OUT, 'readopt'), 25, 3, { t: '새 이름으로 불렸습니다. 옛 이름을 아는 사람은 그 천막에 없었습니다.', k: 'note', fx: { standing: 3 } }),
  E('sam_out_aff_wanted', [8, 70], ['aff:SAM_OUT_WANTED'], 20, 4, { t: '국경 초소에 당신 얼굴이 붙어 있었습니다. 그림은 닮지 않았습니다. 그래도 돌아서 갔습니다.', k: 'bad', fx: { h: -2 } }),
  E('sam_out_aff_border', [8, 70], ['aff:SAM_OUT_BORDER'], 15, 4, { t: '국경은 눈 위에 그어진 선이 아니라 총소리가 나는 쪽이었습니다. 그 반대쪽으로 걸었습니다.', k: 'note' }),
  E('sam_out_visit_ursus', [8, 70], ['track:' + OUT, 'visit:ursus'], 25, 3, { t: '우르수스 쪽 마을 뒤편에서 겨울을 났습니다. 마을 사람들은 보고도 못 본 척했고, 그것이 호의였습니다.', k: 'note' }),
  E('sam_out_omen', [8, 70], 'track:' + OUT, 20, 3, (s) => { omen(s); return { t: '길 잃은 밤, 사슴 한 마리가 앞서 걸었습니다. 따라가니 천막 불빛이 있었습니다.', k: 'warm', fx: { h: 2 } }; }, { c: (s) => !s.S.flags.omen }),
  TR('sam_out_tr_border', [10, 65], OUT, 'border', '숲을 벗어나 국경 쪽으로 내려왔습니다. 거기서는 사미 사람도 우르수스 사람도 아니었습니다.'),
  TR('sam_out_tr_readopt', [10, 70], OUT, 'readopt', '한 부족이 자리를 내주었습니다. 입양이라고 했습니다. 샤먼이 정한 날, 뿔을 받았습니다.', 'warm', { h: 4, standing: 10 }),
  AF('sam_out_af_freeze', N, OUT, ['freezing'], '눈 속에서 발견되었습니다. 발견한 사람이 누구였는지는 깨어난 뒤에도 몰랐습니다.', 'loss', { hl: -4 }),
  AF('sam_out_af_arrest', N, OUT, ['arrest'], '우르수스 순찰대에 붙잡혔습니다. 서류에 "마녀"라고 적혔습니다.', 'loss', { h: -3 }),
  AF('sam_out_af_erosion', N, OUT, ['erosion'], '빙원 가까이에서 무언가에 닿았습니다. 돌아온 뒤로는 혼자 걷는 것이 무서워졌습니다.', 'loss', { hl: -3, h: -2 }),

  // ═══════════════════════════════════════ SAM_SAR 수색구조대 (A4) ═══════════════════════════════════════
  E('sam_sar_mem_search', [16, 50], T(SAR, 'member'), 30, 2, { t: '눈보라 뒤 수색에 나갔습니다. 사흘째 찾았고, 살아 있었습니다.', k: 'warm', fx: { standing: 4, hl: -1 }, f: (s) => orgF(s, '수색 편, 올해 출동 11회') }),
  E('sam_sar_mem_lost', [16, 50], T(SAR, 'member'), 25, 3, { t: '수색에 나갔습니다. 찾지 못했습니다. 봄에 찾았습니다.', k: 'loss', fx: { h: -3 } }),
  E('sam_sar_sen_lead', [19, 55], T(SAR, 'senior'), 30, 2, { t: '수색 줄을 당신이 짰습니다. 앞을 누가 서고 뒤를 누가 서는지, 그것으로 돌아오는 수가 달라졌습니다.', fx: { standing: 3 } }),
  E('sam_sar_sen_doctor', [19, 55], T(SAR, 'senior'), 20, 4, (s) => { s.S.flags.rhodes_rescue = s.S.age; return { t: '남쪽 의료 팀과 처음 손을 잡았습니다. 구조한 사람을 그들 기기에 넘겼고, 기기는 사람을 살렸습니다.', k: 'note', fx: { standing: 2 } }; }),
  E('sam_sar_lea_family', [25, 60], T(SAR, 'leader'), 30, 2, { t: '대원 하나가 아버지가 실종된 자리에 자원했습니다. 받았습니다. 그 아이 형도 전에 여기 있었습니다.', k: 'note', fx: { h: -1 } }),
  E('sam_sar_lea_count', [25, 60], T(SAR, 'leader'), 25, 3, { t: '올해 나간 횟수와 돌아온 수를 룬으로 새겼습니다. 둘이 같은 해는 드물었습니다.', k: 'note', fx: { standing: 2 }, f: (s) => orgF(s, '수색 편') }),
  E('sam_sar_sen_named', [22, 55], T(SAR, 'senior'), 60, 0, (s) => { if (!s.promote({ force: true, quiet: true })) return { t: '대장 자리가 비었습니다. 부족은 당신을 보았고, 그해에는 다른 사람을 세웠습니다.', k: 'note' }; return { t: '대장이 실종되었습니다. 봄에 찾았습니다. 부족이 당신을 대장으로 세웠고, 세우는 자리에서 아무도 축하하지 않았습니다.', k: 'big', fx: { standing: 8, h: -2 } }; }, { c: (s) => stageYears(s) >= 6 && standing(s) >= 55 }),
  E('sam_sar_aff_marsh', [16, 60], ['aff:SAM_SAR_MARSH'], 15, 4, { t: '늪지 부족 구조대는 썰매 개 대신 사람이 끕니다. 개는 늪에 빠지고, 사람은 빠지면 서로 끌어냅니다.', k: 'note' }),
  TR('sam_sar_tr_senior', [18, 55], SAR, 'senior', '선임이 되었습니다. 수색 전날 밤 잠이 안 오는 쪽이 되었습니다.'),
  TR('sam_sar_tr_leader', [24, 60], SAR, 'leader', '대장이 되었습니다. 나갈지 말지를 정하는 사람이 되었고, 어느 쪽을 정해도 누군가는 원망했습니다.', 'ev', { standing: 5 }),
  AF('sam_sar_af_freezing', N, SAR, ['freezing', 'disappear'], '수색 중에 길을 잃었습니다. 다른 대원들이 당신을 수색했습니다. 찾았습니다.', 'loss', { hl: -5 }),
  AF('sam_sar_af_injury', N, SAR, ['injury'], '절벽에서 떨어진 사람을 끌어올리다 같이 떨어졌습니다. 둘 다 살았고, 당신 다리는 전처럼 돌아오지 않았습니다.', 'loss', { hl: -3 }),

  // ═══════════════════════════════════════ SAM_TRADER 시장 교역 (A11) ═══════════════════════════════════════
  E('sam_trd_hel_count', [12, 50], T(TRD, 'helper'), 30, 2, { t: '가죽을 세고, 소금을 세고, 둘의 셈을 맞추는 법을 배웠습니다. 우르수스 사람 셈은 늘 자기 쪽이 유리했습니다.', fx: { cap: { skill: 0.03 } } }),
  E('sam_trd_hel_candle', [12, 50], T(TRD, 'helper'), 25, 3, { t: '사미 양초를 캐러밴에 넘겼습니다. 저쪽은 그것을 멀리 가져가 비싸게 판다고 했습니다. 얼마나 비싼지는 말하지 않았습니다.', k: 'note', fx: { money: (s) => medX(s, 0.04) } }),
  E('sam_trd_exc_flask', [15, 60], T(TRD, 'exchange'), 30, 2, { t: '플라곤 시장에서 하루 종일 바꿨습니다. 가죽이 소금이 되고 소금이 쇠가 되고 쇠가 다시 가죽이 되었습니다.', fx: { money: (s) => medX(s, 0.06), standing: 2 }, f: (s) => F('플라곤 시장 교환 관례, 한 달에 1회 개장') }),
  E('sam_trd_exc_cheat', [15, 60], T(TRD, 'exchange'), 20, 3, { t: '소금 자루 밑이 모래였습니다. 캐러밴은 이미 떠났습니다. 다음 해 그 캐러밴과는 아무도 바꾸지 않았습니다.', k: 'bad', fx: { money: (s) => -medX(s, 0.08), h: -2 } }),
  E('sam_trd_bro_route', [18, 65], T(TRD, 'broker'), 30, 2, { t: '캐러밴과 부족 사이에 섰습니다. 양쪽이 당신 말을 믿었고, 양쪽이 당신을 의심했습니다.', fx: { standing: 3, money: (s) => medX(s, 0.1) }, f: (s) => F('우르수스 캐러밴 중개 수수료, 거래액의 5%') }),
  E('sam_trd_bro_lure', [18, 65], T(TRD, 'broker'), 20, 4, { t: '우르수스 쪽에서 남쪽 도시에 자리가 있다고 했습니다. 좋은 말이었고, 좋은 말이라서 거절했습니다.', k: 'note' }),
  E('sam_trd_aff_ursus', [12, 65], ['aff:SAM_TRD_URSUS'], 15, 4, { t: '캐러밴 시장은 국경 마을 공터에 섭니다. 한 달에 한 번, 양쪽 다 무기를 천막에 두고 나옵니다.', k: 'note' }),
  E('sam_trd_aff_candle', [12, 65], ['aff:SAM_TRD_CANDLE'], 15, 4, { t: '양초 교환은 겨울이 오기 전이 제일 바쁩니다. 손에 기름 냄새가 봄까지 갔습니다.', k: 'note', fx: { money: (s) => medX(s, 0.03) } }),
  TR('sam_trd_tr_exchange', [14, 60], TRD, 'exchange', '자기 자리를 펼쳤습니다. 가죽 다섯 장과 양초 한 상자가 전부였고, 저녁에는 소금 두 자루가 되어 있었습니다.'),
  TR('sam_trd_tr_broker', [17, 65], TRD, 'broker', '중개인이 되었습니다. 물건 대신 말을 바꾸는 자리였고, 말은 물건보다 무거웠습니다.', 'ev', { standing: 4 }),
  AF('sam_trd_af_ruin', N, TRD, ['ruin'], '한 해 교역이 통째로 날아갔습니다. 캐러밴이 오지 않았고, 쌓아 둔 가죽은 봄에 썩었습니다.', 'loss', { h: -2 }),
  AF('sam_trd_af_raid', N, TRD, ['raid'], '시장이 습격당했습니다. 누가 쏘았는지 양쪽이 서로를 가리켰습니다. 다쳤고, 살았습니다.', 'loss', { hl: -3 }),
  AF('sam_trd_af_exile', N, TRD, ['exile'], '우르수스 물건을 너무 많이 들였다는 말이 돌았고, 부족은 천막을 거두라고 했습니다.', 'loss', { h: -3 }),

  // ═══════════════════════════════════════ SAM_RESORT 남부 리조트 노동 (A10) ═══════════════════════════════════════
  E('sam_res_han_snow', [16, 50], T(RES, 'hand'), 30, 2, { t: '호텔 앞 눈을 치웠습니다. 손님들은 눈을 보러 왔고, 눈이 길에 있는 것은 싫어했습니다.', fx: { hl: -1, money: (s) => medX(s, 0.02) } }),
  E('sam_res_han_uniform', [16, 50], T(RES, 'hand'), 25, 3, { t: '제복을 받았습니다. 뿔 자리가 없어 모자를 잘라 썼습니다.', k: 'note' }),
  E('sam_res_sta_guest', [18, 55], T(RES, 'staff'), 30, 2, { t: '손님이 사미 말로 인사해 달라고 했습니다. 해 주었습니다. 손님은 그것을 녹음했고, 팁을 주었습니다.', k: 'note', fx: { money: (s) => medX(s, 0.03), h: -1 } }),
  E('sam_res_sta_spring', [18, 55], T(RES, 'staff'), 25, 3, { t: '온천 물을 재는 일을 맡았습니다. 숫자를 적는 법을 배웠고, 룬보다 빨랐습니다.', fx: { cap: { learn: 0.03 } }, f: (s) => F('차파트 온천 수온 일지, 42도') }),
  E('sam_res_man_season', [22, 60], T(RES, 'manager'), 30, 2, { t: '겨울 손님이 줄었습니다. 본사에서 숫자를 물었고, 숫자가 적힌 종이를 보냈습니다.', k: 'note', fx: { standing: -1 }, f: (s) => F('차파트 호텔 겨울 분기 보고서, 객실 가동률') }),
  E('sam_res_man_locals', [22, 60], T(RES, 'manager'), 25, 3, { t: '부족 사람 셋을 채용했습니다. 본사는 반대하지 않았고, 환영하지도 않았습니다.', k: 'warm', fx: { standing: 2, h: 2 } }),
  E('sam_res_aff_chapat', [16, 60], ['aff:SAM_RES_CHAPAT'], 15, 4, { t: '차파트 호텔 로비에는 사미 룬이 장식으로 걸려 있습니다. 뜻은 "밤에 숲에 머물지 말 것"입니다. 손님 중에 읽는 사람은 없었습니다.', k: 'note' }),
  E('sam_res_aff_spring', [16, 60], ['aff:SAM_RES_SPRING'], 15, 4, { t: '온천 김 너머로 빙원 쪽 하늘이 보였습니다. 손님들은 예쁘다고 했습니다.', k: 'note' }),
  TR('sam_res_tr_staff', [17, 55], RES, 'staff', '호텔 직원이 되었습니다. 이름표에 이름이 남쪽 글자로 적혔습니다.'),
  TR('sam_res_tr_manager', [21, 60], RES, 'manager', '매니저가 되었습니다. 본사 사람들은 당신을 "현지 책임자"라고 불렀습니다.', 'ev', { standing: 4 }),
  AF('sam_res_af_layoff', N, RES, ['layoff', 'bankrupt'], '호텔이 사람을 줄였습니다. 제복을 반납했고, 모자는 가져가라고 했습니다.', 'loss', { h: -2 }),
  E('sam_a10_office', [16, 60], [N, 'archetype:A10'], 15, 3, { t: '본사에서 평가표가 왔습니다. 칸마다 숫자를 적어야 했고, 숫자는 늘 남쪽 기준이었습니다.', k: 'note', fx: { standing: 1 } }),

  // ═══════════════════════════════════════ 캐논 인물(1회성, D43) ═══════════════════════════════════════
  E('sam_canon_santalla', [8, 90], [N], 40, 0, (s) => { canonSeen(s, 'santalla'); return { t: '사제직을 내려놓은 샤먼이 국경 눈밭을 혼자 걸어가는 것을 멀리서 보았습니다. 아무도 이름을 부르지 않았고, 아무도 뒤를 쫓지 않았습니다.', k: 'note', fx: { h: -1 } }; }, { c: (s) => canonOk(s, 'santalla') && !!s.S.track && [SHA, OUT, WAR, HUN].includes(s.S.track.id) }),
  E('sam_canon_typhon', [10, 90], [N], 40, 0, (s) => { canonSeen(s, 'typhon'); return { t: '외눈 거인에게 자랐다는 사냥꾼이 숲 어귀에서 길을 가르쳐 주고는 돌아보지 않았습니다. 가르쳐 준 길은 맞았습니다.', k: 'note', fx: { h: 1 } }; }, { c: (s) => canonOk(s, 'typhon') && !!s.S.track && [HUN, GUI, TRI].includes(s.S.track.id) }),

  // ═══════════════════════════════════════ 이주·신참·관계·방문 ═══════════════════════════════════════
  E('sam_newcomer_word', [10, 80], [N, 'newcomer'], 30, 2, { t: '사미 말은 글자가 없어 귀로만 배워야 했습니다. 첫해에는 경고문 여덟 가지만 알아들었습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }),
  E('sam_newcomer_cold', [10, 80], [N, 'newcomer'], 30, 2, { t: '첫 겨울을 천막에서 났습니다. 옆 천막 사람이 말없이 양초 두 자루를 두고 갔습니다.', k: 'warm', fx: { hl: -2, h: 2 } }),
  E('sam_newcomer_tree', [10, 80], [N, 'newcomer'], 20, 3, { t: '모르고 나무에 손을 댔습니다. 부족 사람들이 한꺼번에 조용해졌습니다. 사과하는 법을 그날 배웠습니다.', k: 'bad', fx: { h: -2, standing: -2 } }),
  E('sam_rel_neutral_outsider', [10, 80], [N, 'migrant', 'rel:neutral'], 20, 4, { t: '외지인이라고 불렸습니다. 나쁜 뜻은 아니었습니다. 그냥 그 말이 당신 이름 앞에 늘 붙었습니다.', k: 'note' }),
  E('sam_rel_subtle', [10, 80], [N, 'rel:subtle'], 20, 4, { t: '천막 자리는 늘 바깥쪽이었습니다. 누가 정한 것은 아니었습니다.', k: 'note', fx: { h: -1 } }),
  E('sam_rel_sarkaz', [10, 80], [N, 'race:sarkaz'], 15, 5, { t: '뿔 때문에 묻는 사람이 없었습니다. 숲에는 뿔 달린 것이 많았습니다.', k: 'warm', fx: { h: 1 } }),
  E('sam_visit_1', [10, 80], ['visit:sami'], 30, 3, { t: '사미에 머무는 동안 돈을 쓸 곳이 없었습니다. 소금이 돈이었고, 소금은 가져오지 않았습니다.', k: 'note', fx: { money: (s) => -medX(s, 0.02) } }),
  E('sam_visit_2', [10, 80], ['visit:sami'], 25, 3, { t: '사미 숲에서 밤에 나가려다 붙잡혔습니다. 붙잡은 사람은 화내지 않고 천막 안쪽을 가리켰습니다.', k: 'note', f: (s) => F('사미 경고문 8조, 제1조') }),
  E('sam_visit_3', [10, 80], ['visit:sami'], 20, 4, { t: '사미 북쪽 하늘이 밤새 흔들렸습니다. 현지 사람들은 그쪽을 보지 않았습니다.', k: 'note', fx: { h: -1 } }),
  // 남부 컬럼비아 접점(진로 무관)
  E('sam_south_contact', [14, 70], [N, 'rural'], 10, 6, { t: '늪지 교역소에서 컬럼비아 사람이 일자리를 말했습니다. 짐을 지고 길을 아는 사람이면 된다고 했습니다.', k: 'note' }, { c: (s) => !s.S.track || s.S.track.id === TRI }),
  E('sam_infected_normal', [10, 80], [N, 'infected', 'known'], 20, 4, { t: '감염을 아는 사람이 늘었지만 천막 자리는 그대로였습니다. 사제만 그 말을 듣고 오래 침묵했습니다.', k: 'note', fx: { h: 1 } }, { c: (s) => !s.S.track || s.S.track.id !== SHA }),
];

export const decisions = {
  // ── 샤먼: 징조 해석 ──
  sam_sha_read_omen: {
    tags: ['track:' + SHA], gap: 6, once: false,
    ok: (s) => s.S.age >= 14 && trStage(s) >= 1 && s.rng.chance(0.2),
    build: () => ({ title: '껍질의 금', body: '껍질이 남쪽을 가리켰습니다. 부족이 남하하면 겨울을 넘기고, 남하하면 조상의 자리를 잃습니다. 금은 둘 중 하나만 말합니다.',
      choices: [{ k: 'tell', label: '그대로 전한다', sub: '남하 · 신망 +', auto: 2 }, { k: 'reread', label: '다시 쬔다', sub: '다른 금을 찾습니다', auto: 1 }, { k: 'hide', label: '말하지 않는다', sub: '거역 · 추방 위험', auto: 0.5 }] }),
    apply: (s, k) => {
      if (k === 'tell') { omen(s); return { t: '그대로 전했습니다. 부족은 천막을 걷었고, 그 겨울 아무도 얼지 않았습니다.', k: 'ev', fx: { standing: 8 } }; }
      if (k === 'reread') return { t: '다시 쬐었습니다. 금은 같았습니다. 하루 늦게 전했고, 하루만큼 신망이 줄었습니다.', k: 'note', fx: { standing: -2 } };
      if (s.rng.chance(0.3)) { s.fall('exile'); return false; }
      return { t: '말하지 않았습니다. 겨울은 넘겼고, 넘긴 것이 운이었다는 것은 당신만 압니다.', k: 'bad', fx: { h: -3, standing: -5 } };
    },
  },
  // ── 샤먼: 침식 위험 수련 ──
  sam_sha_ice_training: {
    tags: ['track:' + SHA], gap: 5, once: false,
    ok: (s) => s.S.age >= 12 && trStage(s) <= 2 && s.rng.chance(0.25),
    build: () => ({ title: '빙원 가까이', body: '스승이 빙원 경계에서 사흘을 보내 보라고 했습니다. 거기서 들리는 것을 듣고도 돌아오면 아츠가 깊어집니다. 돌아오지 못한 견습생도 있었습니다.',
      choices: [{ k: 'go', label: '간다', sub: '아츠 ++ · 침식 위험', auto: 1 }, { k: 'no', label: '아직은 아니다', sub: '안전', auto: 1.2 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '아직은 아니라고 했습니다. 스승은 고개를 끄덕였고, 다음 해 같은 말을 했습니다.', k: 'note' };
      const r = s.rng.rnd();
      if (r < 0.12) { s.fall('erosion'); return false; }
      if (r < 0.4) { omen(s); return { t: '사흘을 듣고 돌아왔습니다. 돌아온 뒤 껍질의 금이 전보다 또렷하게 읽혔습니다.', k: 'warm', fx: { cap: { arts: 0.3 }, hl: -6, standing: 5 } }; }
      return { t: '사흘을 듣고 돌아왔습니다. 한 달 동안 밤에 잠을 못 잤고, 그 뒤로는 잤습니다.', k: 'bad', fx: { cap: { arts: 0.15 }, hl: -8, h: -3 } };
    },
  },
  // ── 사제: 남하 신탁 ──
  sam_sha_south_oracle: {
    tags: [T(SHA, 'priest')], once: true,
    ok: (s) => s.rng.chance(0.3),
    build: () => ({ title: '남하', body: '빙원이 넓어졌습니다. 평의회는 당신의 말을 기다립니다. 남쪽으로 가면 이번 겨울을 살고, 남쪽으로만 가면 사미는 언젠가 없습니다.',
      choices: [{ k: 'south', label: '남하를 명한다', sub: '부족 생존 · 조상의 땅을 잃음', auto: 1.2 }, { k: 'stay', label: '머문다', sub: '결계에 기댐 · 침식 위험', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'south') return { t: '남하를 명했습니다. 늙은 장로 둘이 남겠다고 했고, 봄에 그 둘의 배를 띄우러 올라갔습니다.', k: 'big', fx: { standing: 5, h: -3 } };
      if (s.rng.chance(0.25)) { s.fall('erosion'); return false; }
      return { t: '머물기로 했습니다. 결계를 세 겹 쳤고, 겨울이 지나갔습니다. 이번에는.', k: 'big', fx: { hl: -6, standing: 8 } };
    },
  },
  // ── 사냥꾼: 오염 야수 ──
  sam_hun_tainted_beast: {
    tags: ['track:' + HUN], gap: 5, once: false,
    ok: (s) => s.S.age >= 13 && trStage(s) >= 1 && s.rng.chance(0.2),
    build: () => ({ title: '검은 사슴', body: '사슴 한 마리가 검게 변한 채 천막 가까이 왔습니다. 샤먼은 이틀 거리에 있습니다. 쏘면 그 자리에서 끝나고, 안 쏘면 그것이 어디로 갈지 모릅니다.',
      choices: [{ k: 'shoot', label: '쏜다', sub: '기량 + · 닿을 위험', auto: 1 }, { k: 'call', label: '샤먼을 부른다', sub: '이틀 · 신망 +', auto: 1.2 }] }),
    apply: (s, k) => {
      if (k === 'call') return { t: '샤먼을 불렀습니다. 이틀 동안 사슴은 천막 둘레를 돌았고, 셋째 날 잠들었습니다.', k: 'note', fx: { standing: 3 } };
      if (s.rng.chance(0.15)) return { t: '쏘았습니다. 쓰러진 사슴에서 검은 것이 손에 묻었습니다. 손은 한 달 동안 감각이 없었습니다.', k: 'bad', fx: { hl: -10, cap: { skill: 0.05 } } };
      return { t: '쏘았습니다. 한 발이었습니다. 사제에게 알렸고, 사제는 활을 잠깐 보았습니다.', k: 'ev', fx: { cap: { skill: 0.08 }, standing: 2 } };
    },
  },
  // ── 부족민: 이주 날 ──
  sam_tri_move_day: {
    tags: ['track:' + TRI], gap: 6, once: false,
    ok: (s) => s.S.age >= 14 && s.rng.chance(0.2),
    build: () => ({ title: '이주', body: '샤먼이 이주 날을 정했습니다. 사흘 뒤입니다. 순록 새끼가 아직 걷지 못합니다.',
      choices: [{ k: 'go', label: '정한 날 떠난다', sub: '새끼 몇을 잃음', auto: 1.5 }, { k: 'wait', label: '열흘 미룬다', sub: '평판 − · 날씨 운', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'go') return { t: '정한 날 떠났습니다. 새끼 셋이 길에 남았습니다. 새 자리는 샤먼 말대로 바람이 적었습니다.', k: 'ev', fx: { money: -medX(s, 0.03), standing: 1 } };
      if (s.rng.chance(0.4)) return { t: '열흘을 미뤘습니다. 그 사이 눈보라가 왔고, 천막 하나가 무너졌습니다.', k: 'bad', fx: { hl: -3, standing: -4 } };
      return { t: '열흘을 미뤘습니다. 날씨는 버텼고, 새끼들은 걸었습니다. 샤먼은 아무 말도 하지 않았습니다.', k: 'note', fx: { standing: -2 } };
    },
  },
  // ── 부족민: 남쪽 물건 ──
  sam_tri_south_goods: {
    tags: [T(TRI, 'adult')], once: true,
    ok: (s) => s.S.age >= 16 && s.rng.chance(0.3),
    build: () => ({ title: '통조림', body: '늪지에서 온 사람이 가죽 열 장에 통조림 한 상자를 바꾸자고 했습니다. 겨울 하나를 버티는 양입니다. 가죽 열 장은 천막 하나 값입니다.',
      choices: [{ k: 'trade', label: '바꾼다', sub: '겨울 수월 · 가죽 −', auto: 1 }, { k: 'no', label: '바꾸지 않는다', auto: 1 }] }),
    apply: (s, k) => (k === 'trade' ? { t: '바꿨습니다. 그 겨울은 수월했고, 다음 해 봄 천막 가죽이 모자랐습니다.', k: 'note', fx: { hl: 3, money: -medX(s, 0.06) } } : { t: '바꾸지 않았습니다. 가죽은 천막이 되었고, 겨울은 평소만큼 길었습니다.', k: 'note' }),
  },
  // ── 안내인: 빙원 탐사 계약 ──
  sam_gui_ice_contract: {
    tags: ['track:' + GUI], gap: 5, once: false,
    ok: (s) => s.S.age >= 16 && s.rng.chance(0.25),
    build: (s) => ({ title: '빙원행', body: '탐사대가 빙원 끝까지 가겠다고 했습니다. 값은 평소 계약의 다섯 배입니다. 거기까지 간 안내인 중 돌아온 사람은 절반입니다.', fact: F('차파트 교역소 안내 계약 대장, 빙원 노선 보수 5배'),
      choices: [{ k: 'go', label: '간다', sub: '돈 ++ · 생존 위험', auto: 0.8 }, { k: 'no', label: '거절한다', sub: '평판 −', auto: 1.2 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '거절했습니다. 탐사대는 다른 안내인을 구했고, 그 사람은 봄에 돌아오지 않았습니다.', k: 'note', fx: { standing: -2, h: -1 } };
      const r = s.rng.rnd();
      if (r < 0.1) { s.fall('freezing'); return false; }
      if (r < 0.3) { s.S.flags.rhodes_operation = s.S.age; return { t: '빙원 끝까지 갔습니다. 거기서 무엇을 보았는지 탐사대는 말하지 말라고 했고, 말하지 않았습니다. 돌아온 뒤 몸이 전 같지 않았습니다.', k: 'bad', fx: { money: medX(s, 0.8), hl: -8, standing: 6 } }; }
      return { t: '빙원 끝까지 갔다 왔습니다. 돈은 받았고, 그 돈으로 천막 셋을 세웠습니다.', k: 'ev', fx: { money: medX(s, 0.8), standing: 6, hl: -3 } };
    },
  },
  // ── 안내인: 약초 채집 계약 ──
  sam_gui_herb_contract: {
    tags: ['track:' + GUI], once: true,
    ok: (s) => s.S.age >= 16 && s.rng.chance(0.3),
    build: () => ({ title: '약초', body: '제약회사가 약초 채집 계약을 내밀었습니다. 자라는 곳이 성스러운 나무 둘레입니다. 나무를 건드리지 않고도 캘 수 있다고 그들은 말했습니다.',
      choices: [{ k: 'sign', label: '계약한다', sub: '돈 + · 금기 위험', auto: 1 }, { k: 'no', label: '거절한다', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'no') return { t: '거절했습니다. 그들은 다른 사람을 구했고, 그 사람이 누구인지는 부족이 알게 되었습니다.', k: 'note' };
      if (s.rng.chance(0.35)) return { t: '계약했습니다. 두 해째 채집꾼 하나가 나무를 건드렸고, 부족이 당신 이름을 불렀습니다. 계약은 끊었습니다.', k: 'bad', fx: { money: medX(s, 0.2), standing: -10, h: -3 } };
      return { t: '계약했습니다. 나무는 건드리지 않았고, 약초는 상자로 남쪽에 갔습니다.', k: 'ev', fx: { money: medX(s, 0.4), standing: 2 } };
    },
  },
  // ── 전사: 외지인 ──
  sam_war_outsider_order: {
    tags: ['track:' + WAR], gap: 6, once: false,
    ok: (s) => s.S.age >= 14 && s.rng.chance(0.2),
    build: () => ({ title: '외지인', body: '외지인 셋이 산지 경계를 넘었습니다. 전사장은 활을 겨누라고 했습니다. 그들은 길을 잃은 얼굴이었습니다.',
      choices: [{ k: 'aim', label: '명령대로 겨눈다', sub: '신망 +', auto: 1.3 }, { k: 'guide', label: '길을 가리켜 보낸다', sub: '신망 − · 사람을 살림', auto: 1 }] }),
    apply: (s, k) => (k === 'aim' ? { t: '겨눴습니다. 그들은 돌아갔습니다. 돌아가는 길에 무엇이 있었는지는 모릅니다.', k: 'note', fx: { standing: 3, h: -1 } } : { t: '길을 가리켰습니다. 전사장은 그날 밤 당신을 부르지 않았고, 다음 날도 부르지 않았습니다.', k: 'note', fx: { standing: -4, h: 2 } }),
  },
  // ── 전사: 침식된 동료 ──
  sam_war_eroded_comrade: {
    tags: ['track:' + WAR], once: true,
    ok: (s) => trStage(s) >= 1 && s.rng.chance(0.3),
    build: () => ({ title: '빙원으로', body: '같이 창을 들던 사람이 침식되었습니다. 그는 빙원으로 걸어가겠다고 했습니다. 전사들은 그렇게 끝냅니다.',
      choices: [{ k: 'walk', label: '경계까지 같이 간다', sub: '침식 위험 조금', auto: 1 }, { k: 'stop', label: '막는다', sub: '관습을 어김', auto: 0.7 }, { k: 'stay', label: '천막에서 기다린다', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'walk') { if (s.rng.chance(0.1)) { s.fall('erosion'); return false; } return { t: '경계까지 같이 갔습니다. 그는 돌아보지 않았고, 당신은 돌아왔습니다.', k: 'loss', fx: { h: -4, standing: 3 } }; }
      if (k === 'stop') return { t: '막았습니다. 그는 천막에서 한 달을 더 살았고, 그 한 달은 아무에게도 좋지 않았습니다.', k: 'loss', fx: { h: -5, standing: -3 } };
      return { t: '천막에서 기다렸습니다. 창 하나가 돌아오지 않았습니다.', k: 'loss', fx: { h: -3 } };
    },
  },
  // ── 혼인(국가 전용 문구) ──
  marry_shaman_blessed: marryDecision('shaman_blessed', N, (s, pr, t) => ({
    title: '샤먼이 정한 날', body: '샤먼이 껍질을 쬐어 날을 골랐습니다. ' + wa(pr.name) + ' 그날 뿔을 맞댑니다.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + '에서 온 사람입니다.' : '') + (t.dowry ? ' 신랑 쪽은 순록 몇 마리를 냅니다.' : ''),
    accept: '그날 맞이한다', acceptSub: '샤먼의 날', hold: '다음 껍질을 기다린다', holdSub: '한 해', decline: '거절한다',
    holdT: '다음 껍질을 기다리기로 했습니다. 샤먼은 서두르지 않았습니다.', declineT: '거절했습니다. 껍질은 다른 날을 말하지 않았습니다.', opposeT: '가족이 반대했습니다. 뿔 모양이 다르다는 이유였습니다. 샤먼은 날을 거두었습니다.',
  })),
  marry_tribe_exchange: marryDecision('tribe_exchange', N, (s, pr, t) => ({
    title: '부족 간 혼인', body: '다른 부족에서 혼담이 왔습니다. ' + eun(pr.name) + ' 그쪽 천막 사람입니다. 맞이하면 두 부족이 한 겨울을 같이 납니다.' + (t.dowry ? ' 가죽과 순록이 오갑니다.' : ''),
    accept: '맞이한다', acceptSub: '두 부족이 가까워짐', hold: '겨울을 보고 정한다', decline: '거절한다',
    holdT: '겨울을 보고 정하기로 했습니다. 그쪽 부족은 봄에 다시 사람을 보냈습니다.', declineT: '거절했습니다. 두 부족은 그해 겨울을 따로 났습니다.', opposeT: '장로들이 반대했습니다. 그쪽 부족과는 오래된 일이 있다고 했습니다.',
  })),
  marry_adoption: marryDecision('adoption', N, (s, pr) => ({
    title: '결연', body: eul(pr.name) + ' 천막에 들이는 결연입니다. 핏줄이 아니라 나무 앞에서 맺는 자리이고, 부족은 그것을 혼인과 같이 셉니다.',
    accept: '나무 앞에 선다', acceptSub: '결연', hold: '미룬다', decline: '하지 않는다',
    holdT: '미루었습니다. 나무는 기다립니다.', declineT: '하지 않기로 했습니다.', opposeT: '장로가 반대했습니다. 나무 앞에 서는 것은 부족이 정하는 일이라고 했습니다.',
  })),
  home_change: homeDecision(),
};

export default { events, decisions };

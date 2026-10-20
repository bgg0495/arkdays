// W9b 극동 진로 콘텐츠. 계약: docs/설계_명세_v1.md §11 + "W7 메모 — 스키마 고정".
// 남조/북조는 S.sub.region('north' | 그 외) 로 가른다(nations.json policyVariants). 북조 = 격리 + 수치 문화(가족이 숨김), 남조 = 보험·기업형(D13 창작 정책).
// 핵심 진로 5: HIG_NORTH_ARMY(북조 무가) · HIG_RURAL(북조 광산촌) · HIG_OFFICE(남조 회사원, A10) · HIG_YAKUZA(야쿠자; W15: 킨세키가이는 소속 0.6) · HIG_ENT(아이돌·연예).
// 나머지 8 진로는 단계마다 2개 + 전환 + 몰락 후일담. 생업(arch:A11) 설날·마츠리·온천, 소속(aff:) 변주(8대 가문·킨세키가이), 캐논 인물 1회성(D43),
// 감염자 정책 분기(남조 보험 청구 · 북조 은폐), 신참·관계(rel:cultural = 오니)·visit:higashi, 국가 전용 결정(막부 충성·야근·밀고·계약·탈주·marry_*·home_change).
import { F, orgF, medX, eul, iga, eun, ro, wa, lifeRoll } from '../_util.js';
import { ENGINE_DECISIONS } from '../../src/engine/choices.js';
import { homeChangeOptions, setHousing } from '../../src/engine/housing.js';
import { marry as engineMarry } from '../../src/engine/marriage.js';
import { hoist } from '../_dispatch.js';

const N = 'higashi';
const here = (s) => s.S.cur === N;
const north = (s) => !!(s.S.sub && s.S.sub.region === 'north');
const south = (s) => !north(s);
const affIs = (s, id) => !!(s.S.track && s.S.track.aff === id);
const affName = (s, d) => (s.aff ? s.aff.name : d);
const pick = (s, arr) => s.rng.pick(arr);
const oni = (s) => s.S.race === 'oni';
const inTrack = (s, id) => !!(s.S.track && s.S.track.id === id);
/** 나이당 1회 확률 롤(결정 ok 는 큐에 넣을 때와 열 때 두 번 불리므로 같은 해에는 같은 답) */
const yr = (s, key, p) => { const k = 'w9b_y_' + key; const v = s.S.flags[k]; if (v && v.age === s.S.age) return v.v; const r = s.rng.chance(p); s.S.flags[k] = { age: s.S.age, v: r }; return r; };

const justPromoted = (s, id) => { const tr = s.S.track; if (!tr || tr.id !== id || tr.stage < 1 || s.S.age - tr.stageSince > 1) return false; return !s.S.flags['w9b_pr_' + id + '_' + tr.stage]; };
const markPromo = (s) => { s.S.flags['w9b_pr_' + s.S.track.id + '_' + s.S.track.stage] = s.S.age; };
const fell = (s, id) => { const f = s.S.flags; if (f.lastFallAt == null || s.S.age - f.lastFallAt > 1 || f['w9b_aft_' + f.lastFallAt]) return false; const tr = s.S.track; if (tr && tr.id === id) return f.lastFallOutcome === 'demote'; return f.lastTrack === id && f.lastTrackLeftAt === f.lastFallAt; };
const markFall = (s) => { s.S.flags['w9b_aft_' + s.S.flags.lastFallAt] = true; };
const canonOk = (s, id, y0, y1) => s.year >= y0 && s.year <= y1 && (s.S.flags.canonSeen || 0) < 3 && !s.S.flags['canon_' + id];
const seeCanon = (s, id) => { s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; s.S.flags['canon_' + id] = s.year; };

function st(id, track, stage, a, w, gap, body, k = 'note', fx = null, f = null, extra = {}) {
  // 단계 태그가 이미 자리를 고르므로 나이 상한은 넉넉히(은퇴 전환·늦은 진입을 받는다)
  return { id, a: [a[0], Math.max(a[1], 80)], tags: ['track:' + track + ':' + stage], w, gap, ...extra,
    run: (s) => { const b = typeof body === 'function' ? body(s) : body; const r = b && typeof b === 'object' ? { ...b, k } : { t: b, k }; if (fx) r.fx = typeof fx === 'function' ? fx(s) : fx; if (f) r.f = f(s); return r; } };   // W14(QA A5): {t, f} 객체 body 도 받는다
}
function promoEv(id, track, a, byStage) {
  return { id, a, tags: ['track:' + track], w: 220, gap: 1, c: (s) => justPromoted(s, track) && !!byStage[s.stage.id],
    run: (s) => { markPromo(s); return { t: byStage[s.stage.id], k: 'ev' }; } };
}
function fallEv(id, track, byCause) {
  return { id, a: [5, 95], tags: [N], w: 240, gap: 1, c: (s) => fell(s, track) && !!byCause[s.S.flags.lastFall],
    run: (s) => { markFall(s); const c = s.S.flags.lastFall; return { t: byCause[c], k: ['death', 'expel', 'exile', 'prison'].includes(s.S.flags.lastFallOutcome) ? 'loss' : 'bad' }; } };
}

export const events = [
  // ════════════════════════════════════════════════════════════════════════
  // 1. HIG_NORTH_ARMY 북조 무가·군 (핵심) — entry · platoon · general · exile
  // ════════════════════════════════════════════════════════════════════════
  st('hig_na_en_dojo', 'HIG_NORTH_ARMY', 'entry', [15, 30], 32, 2, (s) => pick(s, ['가문 도장에서 새벽마다 목검을 들었습니다. 사범은 제 자세보다 제 출신을 먼저 보았습니다.', '쿠사리카와 성 아래 병영에 들어갔습니다. 침구는 얇았고 규율은 두꺼웠습니다.']), 'note', { cap: { skill: 0.04 } }),
  st('hig_na_en_bastard', 'HIG_NORTH_ARMY', 'entry', [15, 30], 26, 3, (s) => s.S.fam.dad.absent || !s.S.fam.dad.alive ? '서자라는 말이 등 뒤에서 들렸습니다. 앞에서 하는 사람은 없었고, 그것이 더 길게 남았습니다.' : '가문 어른이 제 검을 보고 고개만 끄덕였습니다. 그날 저녁 밥상에 생선이 한 마리 더 올랐습니다.', 'note', (s) => ({ h: s.S.fam.dad.absent ? -2 : 1 })),
  st('hig_na_en_oath', 'HIG_NORTH_ARMY', 'entry', [15, 30], 28, 3, '막부에 충성을 맹세하는 자리에 섰습니다. 글귀는 외웠고, 뜻은 나중에 알았습니다.', 'ev', { standing: 3 }),
  st('hig_na_en_tundra', 'HIG_NORTH_ARMY', 'entry', [15, 30], 24, 4, '북방 툰드라 기지로 첫 배치를 받았습니다. 데몬이 나온다는 곳이었습니다. 겨울 동안 본 것은 눈뿐이었고, 그것이 다행이었습니다.', 'note', { hl: -1, standing: 2 }),
  st('hig_na_pl_men', 'HIG_NORTH_ARMY', 'platoon', [19, 45], 32, 2, (s) => pick(s, ['소대를 받았습니다. 서른 명. 반은 농민의 아들이었고, 제 명령에 고개를 숙였습니다. 숙이는 각도가 다 달랐습니다.', '소대원 하나가 집에 편지를 못 쓴다고 했습니다. 대신 써 주었습니다. 그 뒤로 소대원 넷이 더 왔습니다.']), 'note', { standing: 2, cap: { ties: 0.03 } }),
  st('hig_na_pl_south', 'HIG_NORTH_ARMY', 'platoon', [19, 45], 28, 3, '휴전선 경계에 섰습니다. 맞은편 남조 병사도 서 있었습니다. 같은 말을 쓰는 사람에게 총을 겨누고 하루를 보냈습니다.', 'bad', { h: -2 }),
  st('hig_na_pl_trap', 'HIG_NORTH_ARMY', 'platoon', [19, 45], 26, 3, '상관이 제 공을 자기 이름으로 올렸습니다. 보고서에 제 이름은 없었습니다. 소대원들은 알았고, 그것으로 됐다고 했습니다. 되지 않았습니다.', 'bad', { h: -2 }),
  st('hig_na_pl_house', 'HIG_NORTH_ARMY', 'platoon', [19, 45], 22, 4, (s) => affIs(s, 'HIG_NA_BLOODPEAK') ? '혈봉 전선 기념비 앞에서 열병식이 있었습니다. 비석 이름 중에 소대원 아버지 이름이 있었습니다.' : '8대 가문 중 한 집안 자제가 옆 소대장으로 왔습니다. 소대원들이 그쪽 줄에 더 빨리 섰습니다.', 'note', { h: -1 }),
  st('hig_na_gen_castle', 'HIG_NORTH_ARMY', 'general', [30, 60], 32, 2, (s) => pick(s, ['쿠사리카와 성 회의에 앉았습니다. 쇼군은 끝에 앉았고, 말은 가문 어른들이 했습니다.', '장군 깃발이 세워졌습니다. 깃발 아래 서는 병사 수가 제 무게였습니다.']), 'ev', { standing: 3 }),
  st('hig_na_gen_border', 'HIG_NORTH_ARMY', 'general', [30, 60], 26, 3, '남조와 작은 충돌이 있었습니다. 휴전은 깨지지 않았고, 깨질 뻔했다는 보고서만 두껍게 올라갔습니다.', 'note', { h: -1, standing: 2 }),
  st('hig_na_gen_rival', 'HIG_NORTH_ARMY', 'general', [30, 60], 26, 3, '다른 가문 장군이 제 보급선을 끊었습니다. 적이 아니라 아군이었습니다. 보고하지 않았습니다. 보고할 곳이 그 가문이었습니다.', 'bad', { h: -2 }),
  st('hig_na_gen_cyber', 'HIG_NORTH_ARMY', 'general', [30, 60], 20, 5, (s) => s.year >= 1088 && s.year <= 1090 ? '쿠사리카와 성 통신망이 멈췄습니다. 적의 침입이라고 했습니다. 사흘 동안 전령이 말을 탔습니다.' : '닌자 가문이 가신 계약을 들고 왔습니다. 값은 비쌌고, 거절한 장군은 밤에 잠을 설쳤습니다.', 'note', { standing: 1 }),
  st('hig_na_ex_road', 'HIG_NORTH_ARMY', 'exile', [25, 70], 32, 2, (s) => pick(s, ['추방 길에 올랐습니다. 성문이 뒤에서 닫혔고, 돌아보지 않았습니다. 돌아보는 것도 금지였습니다.', '옛 소대원 하나가 길에서 알아보고 고개를 숙였습니다. 숙이지 말라고 했습니다. 숙였습니다.']), 'loss', { h: -2 }),
  st('hig_na_ex_south', 'HIG_NORTH_ARMY', 'exile', [25, 70], 26, 3, '남조 땅을 밟았습니다. 북조 억양에 사람들이 한 번씩 돌아봤습니다. 검은 짐 속에 있었습니다.', 'note', { h: -1 }),
  st('hig_na_ex_shrine', 'HIG_NORTH_ARMY', 'exile', [25, 70], 24, 3, '산사에서 하룻밤을 청했습니다. 승려가 이름을 묻지 않았습니다. 그것이 그해 받은 가장 큰 호의였습니다.', 'warm', { h: 2 }),
  st('hig_na_ex_letter', 'HIG_NORTH_ARMY', 'exile', [25, 70], 20, 4, '가문에서 편지가 왔습니다. 이름을 족보에서 지웠다는 통지였습니다. 글씨는 어머니 것이었습니다.', 'loss', { h: -4 }),
  promoEv('hig_na_promo', 'HIG_NORTH_ARMY', [15, 70], {
    platoon: '소대장 임명을 받았습니다. 가문 어른이 검 한 자루를 내렸습니다. 날은 세워져 있지 않았습니다. 세우는 것은 제 일이라고 했습니다.',
    general: '장군 깃발을 받았습니다. 쇼군 앞에 엎드렸고, 일어설 때 무릎이 제 것이 아니었습니다.',
    exile: '함정이었습니다. 적군이 아니라 같은 성 안에서 짠 것이었습니다. 추방령이 내려졌고, 가문은 제 이름을 부르지 않았습니다.',
  }),
  fallEv('hig_na_fall', 'HIG_NORTH_ARMY', {
    kia: '전장에서 쓰러졌습니다. 들려 나왔고, 검은 다른 사람이 들었습니다.',
    betrayal: '제 이름으로 된 밀서가 나왔습니다. 제 글씨가 아니었지만 제 도장이었습니다. 국경 밖으로 나갔습니다.',
    purge: '가문 숙청이 있었습니다. 윗사람이 떨어지면 아랫사람도 떨어졌습니다. 성을 떠나 남쪽으로 갔습니다.',
  }),
  { id: 'hig_na_aff_kusarikawa', a: [15, 70], tags: ['aff:HIG_NA_KUSARIKAWA'], w: 22, gap: 3,
    run: (s) => ({ t: pick(s, ['코우곤 가문 행렬이 성 앞을 지났습니다. 막부군이 길 양쪽에 섰습니다. 저도 그 벽의 한 장이었습니다.', '쿠로고·호아시·니시고리 가문 사람들이 쇼군 앞에서 자리 순서를 두고 다퉜습니다. 막부군은 그 다툼을 못 들은 것으로 했습니다.']), k: 'note', fx: { standing: 1 } }) },
  { id: 'hig_na_aff_bloodpeak', a: [15, 70], tags: ['aff:HIG_NA_BLOODPEAK'], w: 22, gap: 3,
    run: (s) => ({ t: '혈봉 전선은 우르수스 쪽 바람이 먼저 왔습니다. 참호에서 겨울을 났고, 상대편 참호에서도 기침 소리가 들렸습니다.', k: 'bad', fx: { hl: -2, standing: 2 } }) },
  { id: 'hig_canon_akafuyu', a: [15, 60], tags: ['track:HIG_NORTH_ARMY'], w: 60, c: (s) => canonOk(s, 'akafuyu', 1094, 1105),
    run: (s) => { seeCanon(s, 'akafuyu'); return { t: '아카후유라는 가신이 상관 앞에서 칼을 내려놓고 물러났다는 말이 병영에 돌았습니다. 멀리서 그 뒷모습만 보았습니다.', k: 'note' }; } },

  // ════════════════════════════════════════════════════════════════════════
  // 2. HIG_RURAL 광산촌 주민 (핵심 · 북조 A11) — family · hunter · chief
  // ════════════════════════════════════════════════════════════════════════
  st('hig_ru_fa_field', 'HIG_RURAL', 'family', [12, 40], 32, 2, (s) => affIs(s, 'HIG_RURAL_MINE') ? '광산촌에서 아버지가 갱에 들어가면 저는 선광장에서 돌을 골랐습니다. 손톱 밑이 늘 검었습니다.' : '노화마을 밭에서 온 가족이 일했습니다. 말이 적은 집이었고, 밭에서는 더 적었습니다.', 'note', { cap: { skill: 0.03 }, hl: -1 }),
  st('hig_ru_fa_landlord', 'HIG_RURAL', 'family', [12, 40], 28, 3, '무가 저택 관리인이 공납을 걷어 갔습니다. 쌀 열 섬 중 넷. 관리인은 섬 수를 세고 사람은 세지 않았습니다.', 'bad', (s) => ({ money: -medX(s, 0.03) })),
  st('hig_ru_fa_winter', 'HIG_RURAL', 'family', [12, 40], 26, 3, '북조 겨울은 눈이 지붕까지 왔습니다. 아침마다 눈을 치우는 것이 첫 일이었고, 치운 자리에 다시 쌓였습니다.', 'note', { hl: -1, h: -1 }),
  st('hig_ru_fa_leave', 'HIG_RURAL', 'family', [12, 40], 22, 4, '옆집 형이 남조 공장으로 갔습니다. 설에 돌아와 양복을 입고 있었습니다. 다음 설에는 오지 않았습니다.', 'note', { h: -1 }),
  st('hig_ru_hu_hunt', 'HIG_RURAL', 'hunter', [16, 60], 32, 2, (s) => pick(s, ['산에서 사흘을 보냈습니다. 돌아올 때 등에 진 것이 겨울 반을 먹였습니다.', '사냥한 가죽을 쿠사리카와 장에 내다 팔았습니다. 값을 부르는 것은 상인이었고, 받는 것은 제 쪽이었습니다.']), 'note', (s) => ({ money: medX(s, 0.06), hl: -1 })),
  st('hig_ru_hu_beast', 'HIG_RURAL', 'hunter', [16, 60], 26, 3, '산에서 큰 짐승 발자국을 보았습니다. 그날은 돌아왔습니다. 돌아오지 않은 사냥꾼 이야기를 아는 사람이 마을에 셋 있었습니다.', 'bad', { h: -2 }),
  st('hig_ru_hu_trade', 'HIG_RURAL', 'hunter', [16, 60], 26, 3, (s) => affIs(s, 'HIG_RURAL_MINE') ? '광산에서 나온 돌을 성 상인에게 넘겼습니다. 돌 안에 무엇이 있는지 상인은 알았고, 저는 값만 알았습니다.' : '마을 물건을 모아 성 아래 장에 가져갔습니다. 길이 멀어 하루를 잤습니다. 자는 값이 이문의 반이었습니다.', 'note', (s) => ({ money: medX(s, 0.05) })),
  st('hig_ru_hu_catastrophe', 'HIG_RURAL', 'hunter', [16, 60], 22, 4, '재앙 경보가 산 너머에서 울렸습니다. 마을이 이틀 동안 신사 뒤 동굴에 있었습니다. 돌아오니 밭 반이 돌밭이었습니다.', 'bad', { h: -3, money: -1 }),
  st('hig_ru_ch_meeting', 'HIG_RURAL', 'chief', [30, 75], 32, 2, (s) => pick(s, ['마을 회의를 열었습니다. 신사 수리와 공납 순서를 정했습니다. 손을 든 수보다 침묵이 많았고, 침묵이 뜻이었습니다.', '무가 저택에 마을 대표로 올라갔습니다. 현관 아래에서 두 시간을 기다렸고, 말은 삼 분이었습니다.']), 'note', { standing: 3 }),
  st('hig_ru_ch_mine', 'HIG_RURAL', 'chief', [30, 75], 26, 3, (s) => affIs(s, 'HIG_RURAL_MINE') ? '갱이 무너졌습니다. 둘이 나오지 못했습니다. 명단을 쓰는 것이 촌장의 일이었습니다. 두 줄이었습니다.' : '마을 젊은이가 넷 남았습니다. 남조로 간 아이들 이름을 설날 참배 때 불러 보았습니다. 대답은 산에서 돌아왔습니다.', 'loss', { h: -3 }),
  st('hig_ru_ch_hide', 'HIG_RURAL', 'chief', [30, 75], 24, 3, '마을에 감염자가 있다는 말이 들어왔습니다. 촌장은 모르는 것으로 했습니다. 마을도 그렇게 했습니다. 그것이 북조 마을의 방식이었습니다.', 'bad', { h: -2 }),
  st('hig_ru_ch_shrine', 'HIG_RURAL', 'chief', [30, 75], 22, 4, '마을 신사 축제 날 제가 첫 잔을 올렸습니다. 아버지가 올리던 자리였습니다. 손이 아버지 손과 같은 모양이었습니다.', 'warm', { h: 2 }),
  promoEv('hig_ru_promo', 'HIG_RURAL', [12, 75], {
    hunter: '제 활과 제 길이 생겼습니다. 산이 저를 알아보기 시작했다고 노인이 말했습니다.',
    chief: '마을이 저를 촌장으로 세웠습니다. 무가 저택에서 부르는 이름이 하나 더 생겼다는 뜻이었습니다.',
  }),
  fallEv('hig_ru_fall', 'HIG_RURAL', {
    ruin: '빚이 밭을 가져갔습니다. 마을을 떠나 성 아래 거리로 갔습니다.',
    catastrophe: '재앙이 마을을 지났습니다. 살았고, 집은 남지 않았습니다. 몸도 전과 같지 않았습니다.',
    beast: '산에서 짐승을 만났습니다. 살아 내려왔습니다. 다리는 산을 더 오르지 못했습니다.',
  }),

  // ════════════════════════════════════════════════════════════════════════
  // 3. HIG_OFFICE 남조 회사원 (핵심 · A10) — staff · kakari · kacho · bucho · exec
  // ════════════════════════════════════════════════════════════════════════
  st('hig_off_st_morning', 'HIG_OFFICE', 'staff', [18, 35], 32, 2, (s) => pick(s, ['아침 조회에서 사훈을 외웠습니다. 넷째 줄에서 늘 반 박자 늦었습니다.', '명함을 받았습니다. 회사 이름이 제 이름보다 컸습니다. 그렇게 찍혀 있었습니다.']), 'note', { standing: 2 }),
  st('hig_off_st_train', 'HIG_OFFICE', 'staff', [18, 35], 28, 2, '출근 열차에서 한 시간을 서서 갔습니다. 미츠쿠에 사람 절반이 같은 열차에 있는 것 같았습니다.', 'note', { hl: -1 }),
  st('hig_off_st_mentor', 'HIG_OFFICE', 'staff', [18, 35], 26, 3, (s) => affIs(s, 'HIG_OFF_KINSEKI') ? '선배가 킨세키 그룹 계열사 이름을 다 외우라고 했습니다. 열아홉이었습니다. 외웠고, 그중 셋은 간판이 없었습니다.' : '선배가 서류 접는 법을 가르쳤습니다. 세 번 접고 네 번 확인. 확인이 일의 반이었습니다.', 'note', { cap: { learn: 0.03 } }),
  st('hig_off_st_bubble', 'HIG_OFFICE', 'staff', [18, 35], 22, 4, (s) => s.year <= 1109 ? '회사가 새 사옥을 올렸습니다. 거품이라는 말이 신문에 났고, 사옥은 올라갔습니다.' : '구조 조정 공문이 붙었습니다. 사원 자리는 적혀 있지 않았습니다. 그것이 더 무서웠습니다.', 'note', { h: -1 }),
  st('hig_off_ka_desk', 'HIG_OFFICE', 'kakari', [22, 45], 32, 2, (s) => pick(s, ['계장 책상은 창가에서 한 줄 안쪽이었습니다. 부하 넷의 서류가 제 책상을 거쳐 갔습니다.', '회식에서 부장 잔이 비지 않게 하는 것이 계장의 일이었습니다. 잔을 세었고, 제 잔은 세지 않았습니다.']), 'note', { standing: 2, hl: -1 }),
  st('hig_off_ka_overtime', 'HIG_OFFICE', 'kakari', [22, 45], 28, 2, (s) => ({ t: '이달 야근 ' + s.rng.ri(40, 90) + '시간. 회사는 자발이라고 적었고, 저도 그렇게 적었습니다.', f: orgF(s, '남조 기업 노동 시간 신고') }), 'bad', { hl: -2 }),
  st('hig_off_ka_transfer', 'HIG_OFFICE', 'kakari', [22, 45], 24, 3, (s) => affIs(s, 'HIG_OFF_MITSUKUE') ? '미츠쿠에 상사 용문 지점으로 발령 이야기가 나왔습니다. 가족 이야기는 나오지 않았습니다.' : '부서가 바뀌었습니다. 책상 위 물건은 상자 하나였습니다. 상자를 들고 복도를 걸었습니다.', 'note', { h: -1 }),
  st('hig_off_ka_oni', 'HIG_OFFICE', 'kakari', [22, 45], 20, 4, (s) => oni(s) ? '거래처 사람이 제 뿔을 보고 말을 바꿨습니다. 계약은 됐습니다. 계장이 아니라 과장 이름으로.' : '부하 하나가 오니였습니다. 거래처가 다른 사람을 보내 달라고 했습니다. 다른 사람을 보냈습니다. 그날 저녁은 혼자 마셨습니다.', 'bad', { h: -2 }),
  st('hig_off_kc_section', 'HIG_OFFICE', 'kacho', [28, 55], 32, 2, (s) => pick(s, ['과장 도장이 생겼습니다. 도장 하나에 사람 열둘이 걸려 있었습니다.', '부하가 사표를 냈습니다. 이유는 쓰지 않았고, 저는 알았습니다. 제 책상을 거쳐 간 야근표였습니다.']), 'note', { standing: 2, h: -1 }),
  st('hig_off_kc_golf', 'HIG_OFFICE', 'kacho', [28, 55], 26, 3, '주말에 거래처와 접대 자리에 갔습니다. 아이 운동회 날이었습니다. 사진으로 봤습니다.', 'bad', { h: -2, standing: 2 }),
  st('hig_off_kc_insurance', 'HIG_OFFICE', 'kacho', [28, 55], 24, 4, '부하 하나가 감염 판정을 받았습니다. 회사 단체 보험이 처리했습니다. 처리라는 말 뒤에 그 사람 자리가 비었습니다.', 'bad', { h: -2 }),
  st('hig_off_kc_yakuza', 'HIG_OFFICE', 'kacho', [28, 55], 20, 4, (s) => affIs(s, 'HIG_OFF_KINSEKI') ? '그룹 회장 쪽 사람이 회의에 앉았습니다. 양복은 같았고 앉는 자세가 달랐습니다. 회의는 짧았습니다.' : '거래처 하나가 킨세키 쪽이라는 말을 들었습니다. 계약서는 보통 계약서였습니다. 서명했습니다.', 'note', { h: -1 }),
  st('hig_off_bu_floor', 'HIG_OFFICE', 'bucho', [35, 60], 32, 2, (s) => pick(s, ['부장실에 들어갔습니다. 문이 있는 방이었습니다. 문을 닫는 날이 늘었습니다.', '부서 예산을 짰습니다. 사람 하나를 지우면 숫자가 맞았습니다. 지웠습니다.']), 'note', { standing: 3, h: -1 }),
  st('hig_off_bu_hospital', 'HIG_OFFICE', 'bucho', [35, 60], 26, 3, '건강 검진에서 재검 통지가 왔습니다. 재검을 미뤘습니다. 분기 결산이 먼저였습니다.', 'bad', { hl: -3 }),
  st('hig_off_bu_politics', 'HIG_OFFICE', 'bucho', [35, 60], 24, 4, '국회의원 후원 모임에 회사 대표로 갔습니다. 봉투를 들고 갔고, 봉투 없이 돌아왔습니다. 영수증은 없었습니다.', 'note', { standing: 2 }),
  st('hig_off_bu_son', 'HIG_OFFICE', 'bucho', [35, 60], 20, 4, '아이가 아버지 회사 이름은 알고 아버지 얼굴은 아침에 못 본다고 작문에 썼습니다. 선생이 상을 주었습니다.', 'loss', { h: -3 }),
  st('hig_off_ex_board', 'HIG_OFFICE', 'exec', [42, 65], 32, 2, (s) => pick(s, ['임원 회의실에 앉았습니다. 창이 넷이었고, 미츠쿠에가 다 보였습니다. 보는 사람은 없었습니다.', '임원 차가 나왔습니다. 운전사가 있었습니다. 열차 한 시간이 차 한 시간이 되었습니다.']), 'ev', { standing: 3 }),
  st('hig_off_ex_layoff', 'HIG_OFFICE', 'exec', [42, 65], 26, 3, '정리 해고 명단에 서명했습니다. 이름을 다 읽었습니다. 읽는 것이 제가 할 수 있는 전부였습니다.', 'bad', { h: -3 }),
  st('hig_off_ex_tv', 'HIG_OFFICE', 'exec', [42, 65], 22, 4, (s) => affIs(s, 'HIG_OFF_KINSEKI') ? '킨세키 채널 생방송에 회사 대표로 나갔습니다. 질문은 미리 받았고, 답도 미리 받았습니다.' : '신문 경제면에 제 이름이 났습니다. 어머니가 신문을 다섯 부 샀습니다.', 'note', { standing: 1 }),
  st('hig_off_ex_bubble', 'HIG_OFFICE', 'exec', [42, 65], 20, 4, (s) => s.year >= 1109 ? '주가가 반으로 꺾였습니다. 임원 회의가 밤까지 갔습니다. 결론은 "지켜본다"였습니다.' : '그룹 계열사 하나를 인수했습니다. 서명하는 손이 떨리지 않았습니다. 그것이 떨렸습니다.', 'note', { h: -1 }),
  promoEv('hig_off_promo', 'HIG_OFFICE', [18, 65], {
    kakari: '계장 명함이 나왔습니다. 글자 하나가 바뀌었고, 퇴근 시간이 한 시간 바뀌었습니다.',
    kacho: '과장이 되었습니다. 책상이 창가로 갔습니다. 창은 열리지 않았습니다.',
    bucho: '부장 임명을 받았습니다. 문이 있는 방을 받았습니다. 아내가 처음으로 회사에 꽃을 보냈습니다.',
    exec: '임원으로 올랐습니다. 사원 때 외운 사훈 넷째 줄 뜻을 그날 알았습니다. 몰랐을 때가 나았습니다.',
  }),
  fallEv('hig_off_fall', 'HIG_OFFICE', {
    layoff: '구조 조정 명단에 제 이름이 있었습니다. 상자 하나를 들고 열차를 탔습니다. 낮 열차는 비어 있었습니다.',
    overwork: '회의 중에 쓰러졌습니다. 병원에서 깼고, 회사는 "요양"이라고 적었습니다. 돌아갈 자리는 없었습니다.',
    infected: '검진 결과가 회사로 먼저 갔습니다. 단체 보험이 처리했고, 처리 뒤에 제 자리가 비었습니다.',
  }),
  { id: 'hig_off_aff_elec', a: [18, 65], tags: ['aff:HIG_OFF_ELEC'], w: 20, gap: 3,
    run: (s) => ({ t: '전자 부품 수출 물량이 늘었습니다. 염국 쪽 선적이었습니다. 공장 라인은 삼 교대가 되었고, 사무실도 따라갔습니다.', k: 'note', fx: { hl: -1, standing: 1 } }) },
  { id: 'hig_off_aff_kinseki', a: [18, 65], tags: ['aff:HIG_OFF_KINSEKI'], w: 20, gap: 3,
    run: (s) => ({ t: '킨세키 그룹 사보에 회장 사진이 실렸습니다. 회장 옆에 선 사람의 손등에 문신 자락이 보였습니다. 사보는 그대로 배포되었습니다.', k: 'note' }) },

  // ════════════════════════════════════════════════════════════════════════
  // 4. HIG_YAKUZA 킨세키가이 (핵심 · A1) — low · cadre · wakagashira · vice · kaicho
  // ════════════════════════════════════════════════════════════════════════
  st('hig_yak_lo_errand', 'HIG_YAKUZA', 'low', [15, 35], 32, 2, (s) => pick(s, ['사무소 바닥을 닦았습니다. 형님들 신발을 돌려 놓는 것이 첫 일이었습니다. 방향이 틀리면 맞았습니다.', '봉투를 들고 상점가를 돌았습니다. 상점 주인들은 봉투를 보고 저를 보지 않았습니다.']), 'note', { standing: 2 }),
  st('hig_yak_lo_tattoo', 'HIG_YAKUZA', 'low', [15, 35], 26, 3, '등에 첫 바늘이 들어갔습니다. 그림은 형님이 정했습니다. 완성까지 몇 년이라고 했습니다. 몇 년 뒤가 있다는 뜻이었습니다.', 'note', { h: -1, standing: 2 }),
  st('hig_yak_lo_oni', 'HIG_YAKUZA', 'low', [15, 35], 24, 3, (s) => oni(s) ? '오니라는 이유로 앞에 세웠습니다. 상대가 뿔을 보고 물러섰습니다. 형님은 웃었고, 저는 웃지 않았습니다.' : '같은 말단 중에 오니가 있었습니다. 밤일에 늘 그 애가 앞이었습니다. 돌아올 때는 뒤였습니다.', 'bad', { h: -2 }),
  st('hig_yak_lo_redevelop', 'HIG_YAKUZA', 'low', [15, 35], 22, 4, '카지마치 "재개발" 현장에 섰습니다. 집을 비우라는 종이를 붙였습니다. 종이는 회사 이름이었고, 붙이는 손은 저였습니다.', 'bad', { h: -2, standing: 2 }),
  st('hig_yak_ca_men', 'HIG_YAKUZA', 'cadre', [20, 50], 32, 2, (s) => pick(s, ['제 밑에 말단이 셋 생겼습니다. 신발 방향을 가르쳤습니다. 때리지는 않았습니다. 그래도 맞은 것처럼 섰습니다.', '간부 회의에 처음 앉았습니다. 말은 하지 않았습니다. 앉은 자리 순서가 말이었습니다.']), 'note', { standing: 3 }),
  st('hig_yak_ca_ghost', 'HIG_YAKUZA', 'cadre', [20, 50], 26, 3, '빈집에 괴담을 만들어 붙였습니다. 아오오니가 나온다고. 집값이 떨어졌고, 사는 쪽은 회사였습니다.', 'bad', { h: -1, standing: 2 }),
  st('hig_yak_ca_police', 'HIG_YAKUZA', 'cadre', [20, 50], 26, 3, '형사 하나가 사무소에 차를 마시러 왔습니다. 차는 마셨고 서류는 안 가져갔습니다. 다음 달 봉투가 하나 더 나갔습니다.', 'note', { money: -1 }),
  st('hig_yak_ca_mask', 'HIG_YAKUZA', 'cadre', [20, 50], 20, 4, (s) => affIs(s, 'HIG_YAK_KYOKAKU') ? '협객이라는 말을 쓰는 형님을 따라 나왔습니다. 돈은 줄었고 잠은 늘었습니다. 등 뒤는 더 추웠습니다.' : '한냐 가면 계승식을 멀리서 보았습니다. 가면을 쓴 사람이 누구인지 모두 알았고 아무도 말하지 않았습니다.', 'note', { standing: 1 }),
  st('hig_yak_wa_territory', 'HIG_YAKUZA', 'wakagashira', [26, 60], 32, 2, (s) => pick(s, ['구역 하나가 제 책임이 되었습니다. 상점가 서른 집. 서른 집 주인 얼굴을 다 알았고, 그들도 제 얼굴을 알았습니다.', '다른 조직과 경계를 다시 그렸습니다. 지도 위 선 하나에 사람 둘이 들어갔습니다.']), 'bad', { standing: 3, h: -1 }),
  st('hig_yak_wa_tv', 'HIG_YAKUZA', 'wakagashira', [26, 60], 26, 3, (s) => affIs(s, 'HIG_YAK_GROUP') ? '킨세키 채널에서 "실종자를 찾습니다" 방송이 나갔습니다. 현상금이 붙었고, 찾는 쪽은 저희였습니다.' : '텔레비전이 사무소 앞을 찍어 갔습니다. 방송에는 제 뒷모습이 나왔습니다. ' + (s.S.fam.mom.alive ? '어머니가' : '옛 이웃이') + ' 알아보았습니다.', 'note', { h: -1 }),
  st('hig_yak_wa_duel', 'HIG_YAKUZA', 'wakagashira', [26, 60], 24, 3, '옆 조직 부두목과 결투 이야기가 나왔습니다. 결투는 없었고, 그 사람은 다음 달 없었습니다.', 'bad', { h: -2 }),
  st('hig_yak_wa_legal', 'HIG_YAKUZA', 'wakagashira', [26, 60], 22, 4, '대장간 하나가 부품 공장이 되었습니다. 공장 등기에 제 이름이 올랐습니다. 합법이라는 글자가 처음 붙은 종이였습니다.', 'note', (s) => ({ money: medX(s, 0.2), standing: 2 })),
  st('hig_yak_vi_group', 'HIG_YAKUZA', 'vice', [32, 65], 32, 2, (s) => pick(s, ['부회장실 창으로 킨세키 그룹 사옥이 보였습니다. 같은 회장의 두 건물이었습니다.', '국회의원 하나가 저녁을 청했습니다. 의원이 먼저 고개를 숙였습니다. 익숙해지는 것이 무서웠습니다.']), 'ev', { standing: 3 }),
  st('hig_yak_vi_broadcast', 'HIG_YAKUZA', 'vice', [32, 65], 26, 3, '생방송에서 제 이름이 나왔습니다. 폭로였습니다. 방송국은 그룹 것이 아니었습니다. 그날 밤 전화가 서른 통 왔습니다.', 'bad', { h: -3, standing: -3 }),
  st('hig_yak_vi_koretou', 'HIG_YAKUZA', 'vice', [32, 65], 22, 4, '형사 하나가 저희 쪽 사람을 끝까지 쫓았습니다. 그 형사는 해고되었습니다. 저희가 한 일은 아니었습니다. 저희 쪽 의원이 한 일이었습니다.', 'note', { h: -1 }),
  st('hig_yak_vi_succession', 'HIG_YAKUZA', 'vice', [32, 65], 22, 4, '회장이 늙었습니다. 후계 이야기가 돌았고, 제 이름이 두 번째였습니다. 첫 번째 이름이 누군지 다들 알았습니다.', 'note', { standing: 2, h: -1 }),
  st('hig_yak_ka_seat', 'HIG_YAKUZA', 'kaicho', [40, 75], 32, 2, (s) => pick(s, ['회장 자리에 앉았습니다. 자리는 낮았고 방은 넓었습니다. 사람들이 바닥에 앉았습니다.', '그룹 회장과 조직 회장이 같은 사람이라는 것을 신문이 썼습니다. 신문사는 다음 달 광고가 끊겼습니다.']), 'ev', { standing: 3 }),
  st('hig_yak_ka_diet', 'HIG_YAKUZA', 'kaicho', [40, 75], 26, 3, '후원하는 의원이 셋이 되었습니다. 셋 다 저를 "회장님"이라고 불렀습니다. 어느 쪽 회장인지는 묻지 않았습니다.', 'note', { standing: 2 }),
  st('hig_yak_ka_guard', 'HIG_YAKUZA', 'kaicho', [40, 75], 24, 3, '경호원이 넷 붙었습니다. 넷 중 하나는 제가 신발 방향을 가르친 아이였습니다. 그 아이가 제 등 뒤에 섰습니다.', 'note', { h: 1 }),
  st('hig_yak_ka_shot', 'HIG_YAKUZA', 'kaicho', [40, 75], 20, 4, '차에 총알이 하나 박혔습니다. 사람은 다치지 않았습니다. 다음 날 차를 바꿨고 길도 바꿨습니다.', 'bad', { h: -3 }),
  promoEv('hig_yak_promo', 'HIG_YAKUZA', [15, 75], {
    cadre: '잔을 받았습니다. 형님과 아우의 잔. 등의 그림이 반쯤 완성된 해였습니다.',
    wakagashira: '부두목 자리에 앉았습니다. 사무소 앞 상점가가 조용해졌습니다. 조용한 것이 제 이름이었습니다.',
    vice: '부회장이 되었습니다. 명함에 조직 이름 대신 회사 이름이 찍혔습니다. 같은 이름이었습니다.',
    kaicho: '회장 잔을 받았습니다. 받는 손이 떨리면 안 된다고 했습니다. 떨리지 않았습니다. 그것이 더 무서웠습니다.',
  }),
  fallEv('hig_yak_fall', 'HIG_YAKUZA', {
    vendetta: '골목에서 칼이 들어왔습니다. 살았습니다. 조직은 병원비를 냈고, 자리는 비워 두지 않았습니다.',
    arrest: '특별 심문대가 사무소를 쳤습니다. 수감되었습니다. 변호사는 회사가 보냈고, 형량은 그대로였습니다.',
    betrayal: '제 이름이 상대 조직에 팔렸습니다. 그 밤 배를 탔습니다. 용문 쪽이었습니다.',
  }),
  { id: 'hig_yak_aff_kinsekikai', a: [15, 75], tags: ['aff:HIG_YAK_KINSEKIKAI'], w: 22, gap: 3,
    run: (s) => ({ t: pick(s, ['킨세키가이 신년회에 전 조직원이 모였습니다. 상 위 생선 수와 사람 수가 같았습니다. 누가 세었습니다.', '회장이 상점가 노인에게 고개를 숙였습니다. 노인은 받지 않았습니다. 다음 날 그 집 셔터에 낙서는 없었습니다. 회장이 그렇게 했습니다.']), k: 'note', fx: { standing: 1 } }) },
  { id: 'hig_yak_aff_shiranui', a: [15, 75], tags: ['aff:HIG_YAK_SHIRANUI'], w: 22, gap: 3,
    run: (s) => ({ t: pick(s, ['시라누이구미는 작았습니다. 사무소 하나, 간판 없음, 회장은 직접 전화를 받았습니다.', '큰 조직과 구역 경계를 두고 다퉜습니다. 경계는 골목 하나였고, 그 골목이 한 달 동안 비어 있었습니다.']), k: 'note', fx: { standing: 1 } }) },
  { id: 'hig_yak_aff_harbor', a: [15, 75], tags: ['aff:HIG_YAK_HARBOR'], w: 22, gap: 3,
    run: (s) => ({ t: pick(s, ['항만 연합회 일은 부두에서 시작해 부두에서 끝났습니다. 컨테이너 번호를 외웠고, 안은 묻지 않았습니다.', '하역 인부들의 임금을 걷어 반을 돌려주었습니다. 나머지 반이 연합회였습니다.']), k: 'note', fx: { money: medX(s, 0.04) } }) },
  { id: 'hig_yak_aff_group', a: [15, 75], tags: ['aff:HIG_YAK_GROUP'], w: 22, gap: 3,
    run: (s) => ({ t: '킨세키 그룹 사원증을 받았습니다. 사무소 출입증과 같은 지갑에 넣었습니다. 어느 쪽을 꺼내는지는 문이 정했습니다.', k: 'note', fx: { money: medX(s, 0.05) } }) },

  // ════════════════════════════════════════════════════════════════════════
  // 5. HIG_ENT 아이돌·연예 (핵심 · A12) — trainee · contract · broadcast · indie
  // ════════════════════════════════════════════════════════════════════════
  st('hig_ent_tr_lesson', 'HIG_ENT', 'trainee', [12, 24], 32, 2, (s) => pick(s, ['하루 여섯 시간 춤을 췄습니다. 거울이 벽 세 면이었고, 세 면이 다 저를 보았습니다.', '보컬 선생이 제 목소리를 두 번 멈췄습니다. 세 번째에 멈추지 않았습니다. 그날 밤 잠을 못 잤습니다. 좋아서였습니다.']), 'note', { cap: { arts: 0.04 }, hl: -1 }),
  st('hig_ent_tr_weight', 'HIG_ENT', 'trainee', [12, 24], 28, 2, '체중계 숫자가 벽에 붙었습니다. 이름 옆에. 저녁은 녹차였습니다.', 'bad', { hl: -2, h: -1 }),
  st('hig_ent_tr_debut', 'HIG_ENT', 'trainee', [12, 24], 26, 3, '같은 방 연습생이 먼저 데뷔했습니다. 축하했습니다. 침대 하나가 비었고, 다음 주에 다른 아이가 왔습니다.', 'note', { h: -2 }),
  st('hig_ent_tr_parents', 'HIG_ENT', 'trainee', [12, 24], 22, 4, '부모가 계약서를 들고 왔습니다. 글자가 작았고, 기간이 길었습니다. 부모가 서명했습니다. 저는 아직 서명할 나이가 아니었습니다.', 'note', { h: -1 }),
  st('hig_ent_co_handshake', 'HIG_ENT', 'contract', [14, 30], 32, 2, (s) => ({ t: '악수회 ' + s.rng.ri(300, 900) + '명. 손이 저렸고, 웃는 얼굴은 저리지 않았습니다.', f: F('소속사 행사 집계') }), 'note', { hl: -1, standing: 2 }),
  st('hig_ent_co_rule', 'HIG_ENT', 'contract', [14, 30], 28, 2, '연애 금지 조항을 다시 읽었습니다. 체중 조항 아래였습니다. 둘 다 지켰습니다. 지키는 것이 일이었습니다.', 'bad', { h: -2 }),
  st('hig_ent_co_single', 'HIG_ENT', 'contract', [14, 30], 26, 3, (s) => s.rng.chance(0.3) ? { t: '곡 하나가 방송 순위에 올랐습니다. 한 달 동안 거리에서 제 얼굴이 저보다 먼저 다녔습니다.', k: 'warm' } : '신곡이 나왔습니다. 순위에는 오르지 않았습니다. 소속사는 다음 곡 이야기를 했습니다.', 'note', (s) => ({ money: medX(s, 0.15), h: 1 })),
  st('hig_ent_co_online', 'HIG_ENT', 'contract', [14, 30], 22, 4, (s) => oni(s) ? '인터넷에 제 뿔 이야기가 올라왔습니다. 소속사는 "신경 쓰지 말라"고 했고, 다음 앨범 사진에서 뿔이 가려졌습니다.' : '인터넷에 제 옛 사진이 올라왔습니다. 소속사가 삭제 요청을 냈습니다. 요청은 받아들여졌고, 사진은 남았습니다.', 'bad', { h: -3 }),
  st('hig_ent_br_show', 'HIG_ENT', 'broadcast', [16, 35], 32, 2, (s) => pick(s, ['고정 방송이 생겼습니다. 매주 같은 시간 제 얼굴이 집집마다 들어갔습니다. 저희 집에도.', '토크 방송에서 웃기는 역을 맡았습니다. 웃겼습니다. 대기실에서는 웃지 않았습니다.']), 'ev', (s) => ({ money: medX(s, 0.3), standing: 3 })),
  st('hig_ent_br_ghost', 'HIG_ENT', 'broadcast', [16, 35], 26, 3, (s) => affIs(s, 'HIG_ENT_KINSEKI') ? '킨세키 채널 괴담 특집에 나갔습니다. 빈집 앞에서 무서운 척을 했습니다. 빈집 주인이 왜 비웠는지는 대본에 없었습니다.' : '카지마치 옹호 글을 올렸습니다. 한 시간 뒤 소속사 전화가 왔고, 두 시간 뒤 글은 없었습니다.', 'bad', { h: -2 }),
  st('hig_ent_br_fan', 'HIG_ENT', 'broadcast', [16, 35], 24, 3, '팬 하나가 집 앞에 서 있었습니다. 매일. 소속사가 경호를 붙였습니다. 비용은 제 정산서에서 나갔습니다.', 'bad', (s) => ({ h: -2, money: -medX(s, 0.05) })),
  st('hig_ent_br_sick', 'HIG_ENT', 'broadcast', [16, 35], 22, 4, '방송 중에 쓰러졌습니다. 병원 하루, 방송 복귀 이틀째. 사과문은 제 이름으로 나갔습니다.', 'bad', { hl: -3 }),
  st('hig_ent_in_free', 'HIG_ENT', 'indie', [20, 45], 32, 2, (s) => pick(s, ['소속사 없이 첫 공연을 했습니다. 객석 ' + s.rng.ri(40, 200) + '명. 전부 제 손으로 표를 팔았습니다.', '제 이름으로 음반을 냈습니다. 체중 조항도 연애 조항도 없는 종이에 서명했습니다. 제 서명이었습니다.']), 'warm', (s) => ({ money: medX(s, 0.1), h: 3 })),
  st('hig_ent_in_live', 'HIG_ENT', 'indie', [20, 45], 26, 3, '생방송에서 소속사 이야기를 다 했습니다. 방송은 끝까지 나갔습니다. 다음 날 소속사가 사라졌습니다. 저는 남았습니다.', 'ev', { standing: 3, h: 2 }),
  st('hig_ent_in_old', 'HIG_ENT', 'indie', [20, 45], 24, 3, '옛 소속사 후배가 찾아왔습니다. 계약서를 들고. 글자가 작은 것은 똑같았습니다. 읽어 주었습니다.', 'note', { cap: { ties: 0.03 } }),
  st('hig_ent_in_small', 'HIG_ENT', 'indie', [20, 45], 22, 4, '작은 공연장이 문을 닫았습니다. 공연할 곳이 하나 줄었습니다. 노래는 그대로였습니다.', 'note', { h: -1 }),
  promoEv('hig_ent_promo', 'HIG_ENT', [12, 45], {
    contract: '전속 계약서에 서명했습니다. 데뷔 날짜가 적혀 있었고, 그 아래 조항이 열두 장이었습니다.',
    broadcast: '첫 고정 방송이 잡혔습니다. 어머니가 텔레비전을 새로 샀습니다.',
    indie: '계약이 끝났습니다. 끝낸 것은 제 쪽이었습니다. 소속사 건물을 나올 때 뒤에서 아무도 부르지 않았습니다.',
  }),
  fallEv('hig_ent_fall', 'HIG_ENT', {
    scandal: '사진 한 장이 돌았습니다. 소속사는 사과문을 냈고, 사과문 다음 줄이 계약 해지였습니다.',
    fade: '방송이 끊겼습니다. 다음 곡도. 소속사 명함에서 제 이름이 빠진 것을 나중에 알았습니다.',
    overwork: '무대에서 쓰러졌습니다. 다시 서지 못했습니다. 병원에서 본 방송에 다른 얼굴이 제 자리에 있었습니다.',
  }),
  { id: 'hig_ent_aff_agency', a: [12, 45], tags: ['aff:HIG_ENT_AGENCY'], w: 20, gap: 3,
    run: (s) => ({ t: '에이전시 사장이 바뀌었습니다. 새 사장은 숫자만 보았습니다. 제 숫자는 중간이었습니다.', k: 'note', fx: { h: -1 } }) },

  // ════════════════════════════════════════════════════════════════════════
  // 6. 나머지 진로 — 단계마다 2개 + 전환 + 후일담
  // ════════════════════════════════════════════════════════════════════════
  // ── HIG_FACTORY 공장 노동 (A11) ──
  st('hig_fac_wk_line', 'HIG_FACTORY', 'worker', [15, 60], 32, 2, (s) => affIs(s, 'HIG_FACT_KOKAWA') ? '고카와 화학 공장 라인에 섰습니다. 냄새가 옷에 배었고, 옷을 갈아입어도 배어 있었습니다.' : '킨세키 부품 공장에서 작은 결정 부품을 끼웠습니다. 하루 몇천 개. 손끝이 숫자를 외웠습니다.', 'note', { hl: -2 }),
  st('hig_fac_wk_water', 'HIG_FACTORY', 'worker', [15, 60], 26, 3, (s) => affIs(s, 'HIG_FACT_KOKAWA') ? '공장 아래 마을 우물에서 이상한 맛이 났습니다. 회사는 조사한다고 했습니다. 조사는 길었습니다.' : '공장 식당 쌀밥과 생선이 공짜였습니다. 공짜가 급료에서 어떻게 빠지는지는 나중에 알았습니다.', 'bad', { hl: -1, h: -1 }),
  st('hig_fac_fo_shift', 'HIG_FACTORY', 'foreman', [20, 60], 32, 2, (s) => pick(s, ['반장이 되어 교대표를 짰습니다. 사람 열둘의 밤과 낮이 제 손에 있었습니다.', '새 기계 설명을 반원들에게 했습니다. 설명서는 남조 글이었고, 반원 반은 북조에서 왔습니다.']), 'note', { standing: 2 }),
  st('hig_fac_fo_accident', 'HIG_FACTORY', 'foreman', [20, 60], 26, 3, '라인에서 사고가 났습니다. 반원 하나가 손을 잃었습니다. 보고서에 제 이름이 책임자로 올랐습니다. 회사 이름은 없었습니다.', 'loss', { h: -3 }),
  st('hig_fac_mg_office', 'HIG_FACTORY', 'manager', [30, 65], 32, 2, (s) => pick(s, ['공장장실에 앉았습니다. 창으로 라인이 다 보였습니다. 라인에서도 제 창이 보였습니다.', '본사에서 생산량 목표가 내려왔습니다. 작년보다 둘 더. 사람은 하나 덜.']), 'note', { standing: 3 }),
  st('hig_fac_mg_relief', 'HIG_FACTORY', 'manager', [30, 65], 26, 3, (s) => affIs(s, 'HIG_FACT_KOKAWA') ? '마을 사람들이 공장 앞에 왔습니다. 물 때문이었습니다. 가문이 구호를 거부했다는 말을 전하는 것이 공장장의 일이었습니다.' : '그룹 쪽 사람이 공장을 둘러봤습니다. 라인은 보지 않고 장부를 봤습니다. 장부는 깨끗했습니다. 그렇게 만들었습니다.', 'bad', { h: -2 }),
  promoEv('hig_fac_promo', 'HIG_FACTORY', [15, 65], { foreman: '반장 완장을 받았습니다. 라인에서 한 걸음 물러섰고, 소리는 그대로 들렸습니다.', manager: '공장장이 되었습니다. 작업복을 벗고 셔츠를 입었습니다. 냄새는 셔츠에도 배었습니다.' }),
  fallEv('hig_fac_fall', 'HIG_FACTORY', { accident: '기계에 다쳤습니다. 회사는 보상금을 냈고, 자리는 비워 두지 않았습니다.', infected: '검진에서 양성이 나왔습니다. 공장은 그날로 출입증을 거뒀습니다.', layoff: '라인이 하나 멈췄습니다. 멈춘 라인 사람들 명단에 제 이름이 있었습니다.' }),

  // ── HIG_STREET 포장마차·상점가 (A11) ──
  st('hig_str_cl_counter', 'HIG_STREET', 'clerk', [14, 40], 32, 2, (s) => affIs(s, 'HIG_STREET_RINGONES') ? '링고네스 백화점 매장에 섰습니다. 인사 각도를 배웠습니다. 서른 도. 하루 삼백 번.' : affIs(s, 'HIG_STREET_ODEN') ? '오뎅 포장마차에서 국물을 봤습니다. 손님들은 오뎅보다 이야기를 더 샀습니다. 주인은 그 이야기를 팔았습니다.' : '니타 상점가 가게에서 점원으로 섰습니다. 상점가 사람들 얼굴을 한 달에 다 외웠습니다.', 'note', { cap: { skill: 0.03 } }),
  st('hig_str_cl_yakuza', 'HIG_STREET', 'clerk', [14, 40], 26, 3, '달마다 봉투를 들고 오는 사람이 있었습니다. 주인이 봉투를 건넸습니다. 봉투 안은 묻지 않았습니다.', 'bad', { h: -1 }),
  st('hig_str_ow_shop', 'HIG_STREET', 'owner', [20, 65], 32, 2, (s) => pick(s, ['제 가게 포렴을 걸었습니다. 글자는 상점가 노인이 써 주었습니다. 노인은 값을 받지 않았습니다.', '단골이 생겼습니다. 단골은 외상도 같이 가져왔습니다. 장부에 이름 대신 별명을 썼습니다.']), 'warm', (s) => ({ money: medX(s, 0.05), h: 2 })),
  st('hig_str_ow_redevelop', 'HIG_STREET', 'owner', [20, 65], 26, 3, '상점가에 재개발 종이가 붙었습니다. 종이에 회사 이름이 있었고, 그 회사 이름을 아는 사람은 다 조용했습니다.', 'bad', { h: -2 }),
  st('hig_str_ch_meeting', 'HIG_STREET', 'chair', [35, 75], 32, 2, (s) => pick(s, ['상점가 회장으로 회의를 열었습니다. 여름 불꽃놀이 축제 노점 자리를 정했습니다. 자리 하나에 말이 열이었습니다.', '시청에 상점가 대표로 갔습니다. 담당자가 바뀌어 있었습니다. 처음부터 다시 설명했습니다.']), 'note', { standing: 3 }),
  st('hig_str_ch_oden', 'HIG_STREET', 'chair', [35, 75], 24, 4, '오뎅 포장마차 주인이 상점가 소식을 다 알았습니다. 회장인 저보다 먼저. 그 사람에게 물으러 가는 것이 회장 일이었습니다.', 'note', { cap: { ties: 0.03 } }),
  promoEv('hig_str_promo', 'HIG_STREET', [14, 75], { owner: '주인이 가게 열쇠를 주었습니다. 포렴에 제 이름이 올라갔습니다.', chair: '상점가 회장으로 뽑혔습니다. 가게보다 상점가를 먼저 생각하는 자리라고 했습니다. 가게는 집안 사람이 봤습니다.' }),
  fallEv('hig_str_fall', 'HIG_STREET', { ruin: '손님이 끊겼습니다. 재개발 공사 가림막이 가게 앞을 막은 뒤였습니다. 포렴을 내렸습니다.', bankrupt: '빚이 가게를 가져갔습니다. 마지막 날 단골 셋이 왔고, 외상은 받지 않았습니다.' }),
  { id: 'hig_str_aff_nita', a: [14, 75], tags: ['aff:HIG_STREET_NITA'], w: 20, gap: 3,
    run: (s) => ({ t: '니타 거리 여름 축제에 상점가 전체가 등을 걸었습니다. 등 하나에 가게 하나. 꺼진 등이 둘 있었습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'hig_canon_kirara', a: [14, 60], tags: ['track:HIG_STREET'], w: 50, c: (s) => canonOk(s, 'kirara', 1097, 1104) && south(s),
    run: (s) => { seeCanon(s, 'kirara'); return { t: '교복 입은 여학생이 상점가 벤치에서 밤늦도록 집에 가지 않았습니다. 키라라라고 누가 불렀습니다. 가게 문을 닫으며 녹차 한 잔을 두고 왔습니다.', k: 'note' }; } },

  // ── HIG_RONIN 유랑 전사 (A6 · 순회 higashi/yan/lungmen) ──
  st('hig_ron_wa_road', 'HIG_RONIN', 'wander', [15, 40], 32, 2, (s) => pick(s, ['길에서 잤습니다. 검을 베고. 아침 이슬이 칼집에 맺혔습니다.', '마을에서 하루 품을 팔았습니다. 검 쓰는 일이 아니라 장작 패는 일이었습니다. 돈은 같았습니다.']), 'note', { hl: -1, cap: { skill: 0.03 } }),
  st('hig_ron_wa_sea', 'HIG_RONIN', 'wander', [15, 40], 26, 3, (s) => s.res.itinerantAt && s.res.itinerantAt !== N ? '배를 타고 바다를 건넜습니다. 내린 땅에서는 제 억양이 먼저 눈에 띄었습니다. 검은 나중이었습니다.' : '해안을 따라 걸었습니다. 심해교회 포교꾼이 말을 걸었습니다. 걸음을 멈추지 않았습니다.', 'note', { h: -1 }),
  st('hig_ron_me_contract', 'HIG_RONIN', 'merc', [18, 55], 32, 2, (s) => pick(s, ['상단 호위 계약을 맡았습니다. 석 달. 계약서는 한 장이었고 지킨 것은 양쪽 다였습니다.', '용병 일로 번 돈으로 검을 손봤습니다. 날이 세워졌고, 세울 일은 없기를 바랐습니다.']), 'note', (s) => ({ money: medX(s, 0.12), standing: 2 })),
  st('hig_ron_me_fight', 'HIG_RONIN', 'merc', [18, 55], 26, 3, '계약 중에 칼을 뽑았습니다. 상대도 떠돌이였습니다. 끝나고 서로 이름을 묻지 않았습니다.', 'bad', { h: -2, hl: -2, standing: 2 }),
  st('hig_ron_na_fame', 'HIG_RONIN', 'name', [25, 60], 32, 2, (s) => pick(s, ['제 이름이 저보다 먼저 마을에 닿아 있었습니다. 밥값을 받지 않는 집이 생겼습니다.', '젊은 떠돌이 하나가 제자가 되겠다고 따라왔습니다. 사흘 뒤 보내려 했고, 사흘 뒤에도 있었습니다.']), 'warm', { standing: 2, cap: { ties: 0.03 } }),
  st('hig_ron_na_rhodes', 'HIG_RONIN', 'name', [25, 60], 20, 5, (s) => { if (s.rng.chance(0.4)) { s.S.flags.rhodes_operation = s.S.age; return '분쟁지에서 하얀 완장을 두른 사람들과 같은 편에 섰습니다. 끝나고 명함을 받았습니다. 로도스 아일랜드.'; } return '옛 계약주가 다시 찾았습니다. 값은 올랐고, 일은 같았습니다.'; }, 'note', { standing: 1 }),
  promoEv('hig_ron_promo', 'HIG_RONIN', [15, 60], { merc: '첫 용병 계약서에 이름을 썼습니다. 떠돌이에서 고용된 떠돌이가 되었습니다.', name: '이름난 떠돌이라고 사람들이 불렀습니다. 이름이 났다는 것은 찾는 사람도 늘었다는 뜻이었습니다.' }),
  fallEv('hig_ron_fall', 'HIG_RONIN', { kia: '계약 중에 베였습니다. 살았고, 검을 다시 들지 못했습니다.', freezing: '산길에서 눈에 갇혔습니다. 사흘 뒤 나왔고, 발가락 둘은 두고 나왔습니다. 길은 끝났습니다.', contract_end: '계약이 끊겼습니다. 다음 계약은 없었습니다. 검을 전당포에 맡기고 상점가로 갔습니다.' }),

  // ── HIG_TEMPLE 산사·신사 (A8) ──
  st('hig_tem_no_dawn', 'HIG_TEMPLE', 'novice', [6, 30], 32, 2, (s) => affIs(s, 'HIG_TEMPLE_TAISHA') ? '타이샤에서 새벽 청소를 했습니다. 신과 불을 함께 모시는 곳이었고, 마당은 두 배였습니다.' : affIs(s, 'HIG_TEMPLE_KIZUNA') ? '키즈나 신사 돌계단을 쓸었습니다. 백스물여덟 개. 매일 세었고 매일 같았습니다.' : '산사에서 새벽 세 시에 일어나 염불을 외웠습니다. 틀리면 처음부터였습니다. 처음부터가 하루에 다섯 번이었습니다.', 'note', { cap: { learn: 0.03 } }),
  st('hig_tem_no_orphan', 'HIG_TEMPLE', 'novice', [6, 30], 26, 3, (s) => s.S.q >= 4 ? '집에서 저를 신사에 맡긴 이유를 아무도 말하지 않았습니다. 서자라는 말은 다른 수행승이 알려 주었습니다.' : '부모 얼굴을 모릅니다. 산사 문 앞에 있었다고 주지가 말했습니다. 그 말을 들은 날 염불이 두 번 틀렸습니다.', 'note', { h: -2 }),
  st('hig_tem_mo_alms', 'HIG_TEMPLE', 'monk', [16, 60], 32, 2, (s) => pick(s, ['탁발을 나갔습니다. 마을 사람들이 밥을 주고 고민도 함께 주었습니다. 고민이 더 무거웠습니다.', '산사가 도시 합류를 거부했습니다. 재앙 경보가 오면 하루 안에 해체하고 사흘 안에 다시 세웠습니다. 그 일을 배웠습니다.']), 'note', { standing: 2 }),
  st('hig_tem_mo_shaving', 'HIG_TEMPLE', 'monk', [16, 60], 24, 3, (s) => affIs(s, 'HIG_TEMPLE_TAISHA') ? '다이묘 쪽에서 신관 보고가 거짓이라고 따졌습니다. 신관과 다이묘 사이에 서는 것은 젊은 신관 일이었습니다.' : '머리를 밀었습니다. 정식 승려의 머리였습니다. 거울이 없어 손으로 확인했습니다.', 'note', { h: 1 }),
  st('hig_tem_ab_decide', 'HIG_TEMPLE', 'abbot', [35, 85], 32, 2, (s) => pick(s, ['주지로서 수행승 하나를 내려보냈습니다. 정식 승려가 되지 못했습니다. 그 아이 등이 산문을 나가는 것을 끝까지 보았습니다.', '산사 재건 위치를 정했습니다. 재앙 길목이 바뀌었습니다. 틀리면 산사가 없어지는 결정이었습니다.']), 'note', { standing: 3 }),
  st('hig_tem_ab_city', 'HIG_TEMPLE', 'abbot', [35, 85], 24, 4, '남조 도시에서 산사를 관광지로 만들자는 사람이 왔습니다. 녹차를 대접하고 돌려보냈습니다. 세 번째였습니다.', 'note', { h: 1 }),
  promoEv('hig_tem_promo', 'HIG_TEMPLE', [6, 85], { monk: '정식 승려가 되었습니다. 법명을 받았고, 옛 이름은 산문 밖에 두었습니다.', abbot: '주지 자리를 받았습니다. 전 주지가 산을 내려가며 돌아보지 않았습니다. 그렇게 하는 것이라고 배웠습니다.' }),
  fallEv('hig_tem_fall', 'HIG_TEMPLE', { demotion: '정식 승려 심사에 들지 못했습니다. 주지 허락을 받아 산을 내려왔습니다. 머리는 다시 자랐습니다.', heresy: '교단이 제 가르침을 문제 삼았습니다. 법명이 거두어졌고, 산문이 닫혔습니다.', exile: '산사가 저를 다른 산으로 보냈습니다. 돌아올 날은 적혀 있지 않았습니다.' }),
  { id: 'hig_canon_saga', a: [6, 60], tags: ['track:HIG_TEMPLE'], w: 60, c: (s) => canonOk(s, 'saga', 1095, 1106),
    run: (s) => { seeCanon(s, 'saga'); return { t: '탁발 나온 수행승이 밥을 두 그릇 더 받고도 염불 한 줄을 틀리지 않았습니다. 사가라는 이름을 다른 승려가 말했습니다. 그 뒤로 보지 못했습니다.', k: 'note' }; } },

  // ── HIG_STUDENT 남조 학생 (A9) ──
  st('hig_stu_hs_exam', 'HIG_STUDENT', 'highschool', [15, 19], 32, 2, (s) => pick(s, ['모의시험 등수가 복도에 붙었습니다. 제 이름을 찾는 데 시간이 걸렸습니다. 아래쪽이어서가 아니라 글자가 작아서였습니다.', '학원 끝나고 열차에서 졸았습니다. 미츠쿠에 열차는 그 시간에 학생들로 찼습니다. 모두 졸았습니다.']), 'note', { cap: { learn: 0.04 }, hl: -1 }),
  st('hig_stu_hs_club', 'HIG_STUDENT', 'highschool', [15, 19], 26, 3, (s) => oni(s) ? '동아리에 들어가려 했습니다. 정원이 찼다고 했습니다. 다음 날 다른 애는 들어갔습니다. 뿔 이야기는 아무도 하지 않았습니다.' : '여름 불꽃놀이 축제에 친구들과 갔습니다. 교복 입고. 다음 날 선생이 불렀습니다. 축제가 아니라 교복이 문제였습니다.', 'note', (s) => ({ h: oni(s) ? -2 : 1 })),
  st('hig_stu_un_lecture', 'HIG_STUDENT', 'university', [18, 24], 32, 2, (s) => pick(s, ['대학 강의실 뒷자리에 앉았습니다. 교수는 앞줄만 보았고, 앞줄은 비어 있었습니다.', '동아리 술자리에서 선배가 취업 이야기를 했습니다. 회사 이름이 열 개 나왔고 다 아는 이름이었습니다.']), 'note', { cap: { learn: 0.03 } }),
  st('hig_stu_un_exchange', 'HIG_STUDENT', 'university', [18, 24], 24, 4, (s) => affIs(s, 'HIG_STU_EXCHANGE') ? '용문 교환 학기를 갔습니다. 말은 통했고 억양은 통하지 않았습니다. 돌아올 때 억양이 조금 옮았습니다.' : '교환 학생 모집 공고를 봤습니다. 성적은 됐고 돈은 안 됐습니다. 공고를 사진으로 찍어 두었습니다.', 'note', { cap: { learn: 0.02 } }),
  st('hig_stu_pt_bar', 'HIG_STUDENT', 'parttime', [18, 26], 32, 2, (s) => affIs(s, 'HIG_STU_BAR') ? '바에서 밤 아르바이트를 했습니다. 손님 이야기를 듣는 것이 반, 잊는 것이 반이었습니다.' : '편의점 밤 교대를 섰습니다. 새벽 세 시에 오는 손님들 얼굴을 다 외웠습니다.', 'note', (s) => ({ money: medX(s, 0.08), hl: -1 })),
  st('hig_stu_pt_sick', 'HIG_STUDENT', 'parttime', [18, 26], 24, 3, (s) => s.S.ori.on ? '아르바이트 중에 손목이 아팠습니다. 검은 자국이 소매 아래 있었습니다. 소매를 내렸습니다.' : '아르바이트 동료가 갑자기 그만두었습니다. 사장은 "몸이 안 좋아서"라고 했고, 그 말이 무슨 뜻인지 모두 알았습니다.', 'bad', { h: -2 }),
  st('hig_stu_gr_suit', 'HIG_STUDENT', 'graduate', [20, 28], 32, 2, (s) => pick(s, ['취업 설명회에 검은 양복을 입고 갔습니다. 설명회장 전체가 검은 양복이었습니다.', '면접에서 지원 동기를 물었습니다. 외운 것을 말했습니다. 면접관도 외운 것을 들었습니다.']), 'note', { standing: 1 }),
  st('hig_stu_gr_abroad', 'HIG_STUDENT', 'graduate', [20, 28], 22, 4, (s) => { if (s.rng.chance(0.3)) { s.S.flags.w9b_studyAbroadWish = s.S.age; return '염국 유학 합격증이 왔습니다. 집에서는 회사 합격증을 먼저 물었습니다.'; } return '합격 전화를 받았습니다. 전화를 끊고 어머니에게 먼저 걸었습니다. 어머니는 울었고, 저는 아직이었습니다.'; }, 'warm', { h: 2 }),
  promoEv('hig_stu_promo', 'HIG_STUDENT', [15, 28], { university: '대학 합격 통지가 왔습니다. 집 현관에 붙였습니다. 아버지가 그 앞을 세 번 지나갔습니다.', parttime: '학비 때문에 아르바이트를 시작했습니다. 수업과 일 사이에 잠을 끼워 넣었습니다.', graduate: '졸업장을 받았습니다. 다음 주 월요일 출근 날짜가 적힌 종이도 같이 받았습니다.' }),
  fallEv('hig_stu_fall', 'HIG_STUDENT', { ruin: '학비가 끊겼습니다. 집안 사정이었습니다. 자퇴서에 서명하는 손이 제 것이었습니다.', infected: '검은 자국이 커졌습니다. 가족이 알기 전에 집을 나왔습니다. 가방 하나였습니다.' }),

  // ── HIG_POLICE 미츠쿠에 경찰 (A4) ──
  st('hig_pol_pa_beat', 'HIG_POLICE', 'patrol', [18, 40], 32, 2, (s) => pick(s, ['미츠쿠에 거리 순찰을 돌았습니다. 상점가 사람들이 고개를 숙였고, 사무소 앞 사람들은 숙이지 않았습니다.', '야근 신고를 받고 출동했습니다. 가해자는 회사였고, 피해자는 과장이었고, 서류는 사고였습니다.']), 'note', { standing: 2 }),
  st('hig_pol_pa_envelope', 'HIG_POLICE', 'patrol', [18, 40], 26, 3, '선배가 봉투를 받는 것을 봤습니다. 선배는 제가 본 것을 봤습니다. 둘 다 말하지 않았습니다.', 'bad', { h: -2 }),
  st('hig_pol_de_case', 'HIG_POLICE', 'detective', [22, 50], 32, 2, (s) => pick(s, ['첫 사건을 맡았습니다. 실종이었습니다. 끝까지 쫓았고, 끝에 회사 이름이 있었습니다. 사건은 종결되었습니다.', '형사 수첩에 이름 열둘을 썼습니다. 셋은 지우라는 전화가 왔습니다. 지우지 않았고, 수첩을 바꿨습니다.']), 'note', { standing: 2, h: -1 }),
  st('hig_pol_de_pressure', 'HIG_POLICE', 'detective', [22, 50], 26, 3, '국회의원 비서가 서장실에 다녀갔습니다. 다음 날 제 사건이 다른 반으로 넘어갔습니다.', 'bad', { h: -2 }),
  st('hig_pol_ve_young', 'HIG_POLICE', 'veteran', [30, 58], 32, 2, (s) => pick(s, ['후배 형사가 봉투를 들고 물었습니다. 받지 말라고 했습니다. 받지 않으면 어떻게 되는지도 말해 주었습니다.', '서른 년 가까이 같은 거리를 돌았습니다. 거리가 저를 알았고, 거리 뒤 사무소도 저를 알았습니다.']), 'note', { standing: 2, cap: { ties: 0.03 } }),
  st('hig_pol_ve_fired', 'HIG_POLICE', 'veteran', [30, 58], 24, 4, '야쿠자 간부 하나를 끝까지 쫓다가 징계가 내려왔습니다. 쫓은 것이 아니라 "절차"가 문제라고 했습니다.', 'bad', { h: -3, standing: 2 }),
  st('hig_pol_ca_street', 'HIG_POLICE', 'candidate', [35, 65], 32, 2, (s) => pick(s, ['국회 출마 벽보에 제 얼굴이 붙었습니다. 형사 수첩 대신 명함을 들고 거리에 섰습니다. 같은 거리였습니다.', '선거 연설에서 사무소 이름을 말했습니다. 청중이 조용해졌습니다. 조용한 것이 대답이었습니다.']), 'ev', { standing: 3 }),
  st('hig_pol_ca_threat', 'HIG_POLICE', 'candidate', [35, 65], 24, 3, '선거 사무실 창문이 깨졌습니다. 경찰이 왔습니다. 옛 후배였고, 조사는 짧았습니다.', 'bad', { h: -3 }),
  promoEv('hig_pol_promo', 'HIG_POLICE', [18, 65], { detective: '형사가 되었습니다. 제복을 벗고 양복을 입었습니다. 거리 사람들이 더 멀리서 알아봤습니다.', veteran: '베테랑이라고 불리기 시작했습니다. 쫓지 못한 사건 수첩이 서랍 셋을 채운 해였습니다.', candidate: '경찰을 그만두고 출마했습니다. 수첩에 적고 지우지 못한 이름들이 공약이 되었습니다.' }),
  fallEv('hig_pol_fall', 'HIG_POLICE', { kia: '현장에서 쓰러졌습니다. 살았고, 현장에는 다시 서지 못했습니다.', courtmartial: '징계 위원회가 열렸습니다. 해고였습니다. 절차는 다 지켰다고 했습니다.', scandal: '봉투 사진이 신문에 났습니다. 제 봉투가 아니었지만 제 손이었습니다. 배지를 반납했습니다.' }),

  // ── HIG_POLITICS 남조 정치·공경 (A3) ──
  st('hig_poli_se_desk', 'HIG_POLITICS', 'secretary', [22, 45], 32, 2, (s) => affIs(s, 'HIG_POLI_KUGE') ? '공경 가문 서기로 들어갔습니다. 문서 서식이 천 년 전 것이었습니다. 그대로 썼습니다.' : '의원 비서로 들어갔습니다. 의원이 아는 것보다 비서가 아는 것이 많았습니다. 그것이 비서 일이었습니다.', 'note', { cap: { learn: 0.03 } }),
  st('hig_poli_se_envelope', 'HIG_POLITICS', 'secretary', [22, 45], 26, 3, '후원금 봉투를 받아 금고에 넣었습니다. 봉투에 적힌 이름 중 하나는 상점가에서 걷는 이름과 같았습니다.', 'bad', { h: -2 }),
  st('hig_poli_ca_speech', 'HIG_POLITICS', 'candidate', [26, 50], 32, 2, (s) => pick(s, ['첫 연설을 했습니다. 역 앞. 멈춘 사람은 열둘이었고 끝까지 들은 사람은 둘이었습니다.', '선거 벽보에 제 얼굴이 붙었습니다. 다음 날 반이 찢겨 있었습니다. 다음다음 날 다시 붙였습니다.']), 'note', { standing: 2 }),
  st('hig_poli_ca_backer', 'HIG_POLITICS', 'candidate', [26, 50], 26, 3, '후원 제안이 왔습니다. 조건은 하나였습니다. 어느 조직 이름을 연설에서 빼는 것. 뺐습니다. 뺀 자리가 연설에서 가장 길었습니다.', 'bad', { h: -2, standing: 2 }),
  st('hig_poli_di_seat', 'HIG_POLITICS', 'diet', [30, 70], 32, 2, (s) => pick(s, ['국회 의석에 앉았습니다. 첫 표결에서 손을 들었습니다. 드는 쪽은 미리 정해져 있었습니다.', '지역구 사무소에 민원이 쌓였습니다. 비서가 분류했고, 저는 윗장만 읽었습니다. 제가 비서였을 때 그 윗장을 골랐습니다.']), 'note', { standing: 2 }),
  st('hig_poli_di_yakuza', 'HIG_POLITICS', 'diet', [30, 70], 26, 3, '회장이라는 사람과 저녁을 먹었습니다. 그룹 회장인지 조직 회장인지 묻지 않았습니다. 같은 사람이었습니다.', 'bad', { h: -2 }),
  st('hig_poli_mi_cabinet', 'HIG_POLITICS', 'minister', [40, 75], 32, 2, (s) => pick(s, ['각료 회의에 앉았습니다. 도노는 오지 않았고, 도노 자리는 비워 두었습니다.', '북조와 비밀 접촉 보고를 받았습니다. 서류에 서명하지 않고 읽기만 했습니다. 읽은 것도 기록에 남았습니다.']), 'ev', { standing: 3 }),
  st('hig_poli_mi_bubble', 'HIG_POLITICS', 'minister', [40, 75], 24, 4, (s) => s.year >= 1109 ? '주가 폭락 대책 회의가 밤까지 갔습니다. 대책은 "지켜본다"였고, 발표문은 세 장이었습니다.' : '첫 선거 혼란 이후 선거법 개정안이 올라왔습니다. 개정안을 쓴 사람이 저였고, 반대한 사람도 저를 알았습니다.', 'note', { h: -1 }),
  promoEv('hig_poli_promo', 'HIG_POLITICS', [22, 75], { candidate: '공천을 받았습니다. 비서 자리에서 일어나 연단 쪽으로 걸었습니다. 세 걸음이었습니다.', diet: '당선되었습니다. 비서가 생겼습니다. 제가 하던 일을 그 사람이 했습니다.', minister: '각료 임명장을 받았습니다. 공경 가문 어른이 처음으로 제 이름을 성까지 불렀습니다.' }),
  fallEv('hig_poli_fall', 'HIG_POLITICS', { impeach: '불신임안이 통과되었습니다. 의석에서 일어났습니다. 박수는 없었고, 사진은 많았습니다.', assassination: '연설 중에 총소리가 났습니다. 살았습니다. 다시 연단에 서지는 못했습니다.', scandal: '후원금 장부가 신문에 났습니다. 제 글씨였습니다. 사직서도 제 글씨였습니다.' }),
  { id: 'hig_poli_aff_kuge', a: [22, 75], tags: ['aff:HIG_POLI_KUGE'], w: 20, gap: 3,
    run: (s) => ({ t: pick(s, ['미츠모토 가문 행사에 공경 자격으로 섰습니다. 자리 순서가 가문 순서였습니다. 쿠시마츠·카노우·카네시로 다음이 저였습니다.', '공경 회의에서 천 년 전 선례가 인용되었습니다. 선례가 결론이었습니다.']), k: 'note', fx: { standing: 1 } }) },

  // ── HIG_NINJA 세습 닌자 (A6 세습) ──
  st('hig_nin_ch_train', 'HIG_NINJA', 'child', [5, 14], 32, 2, (s) => pick(s, ['다섯 살에 훈련이 시작되었습니다. 다른 아이들이 학교에 갈 때 저는 벽을 탔습니다. 벽이 학교였습니다.', '아버지가 아버지가 아니라 사범이었습니다. 집에서는 아버지였습니다. 두 사람이었습니다.']), 'note', { cap: { skill: 0.05 }, hl: -1 }),
  st('hig_nin_ch_lord', 'HIG_NINJA', 'child', [5, 14], 26, 3, '가문이 모시는 주군 집 아이와 같이 놀았습니다. 놀이가 끝나면 저는 뒤로 물러섰습니다. 그렇게 배웠습니다.', 'note', { h: -1 }),
  st('hig_nin_ni_mission', 'HIG_NINJA', 'ninja', [13, 40], 32, 2, (s) => pick(s, ['첫 임무를 받았습니다. 밤이었고, 돌아왔습니다. 돌아온 것이 보고의 전부였습니다.', '낮에는 회사원이었습니다. 밤의 일은 회사 서류에 없었습니다.']), 'note', { standing: 2, h: -1 }),
  st('hig_nin_ni_cyber', 'HIG_NINJA', 'ninja', [13, 40], 24, 4, (s) => s.year >= 1088 ? '가문이 통신망 일을 받았습니다. 벽을 타는 대신 자판을 쳤습니다. 들키지 않는 것은 같았습니다.' : '다른 가문 닌자와 마주쳤습니다. 서로 못 본 것으로 했습니다. 그것도 규칙이었습니다.', 'note', { cap: { learn: 0.03 } }),
  st('hig_nin_ca_family', 'HIG_NINJA', 'cadre', [25, 55], 32, 2, (s) => pick(s, ['가족 회의에 앉았습니다. 전대 당주가 죽은 뒤 방침이 갈렸습니다. 칼을 쓰는 쪽과 회사를 하는 쪽.', '아랫 닌자 셋을 맡았습니다. 셋 다 제 조카뻘이었습니다. 가문은 그렇게 생겼습니다.']), 'note', { standing: 3 }),
  st('hig_nin_ca_biz', 'HIG_NINJA', 'cadre', [25, 55], 24, 3, (s) => affIs(s, 'HIG_NINJA_BIZ') ? '당주 사업체 명함이 나왔습니다. 경비 회사였습니다. 밤일은 경비라고 적었습니다.' : '주군 가문에서 계약 갱신 이야기가 왔습니다. 값은 올랐고, 요구도 올랐습니다.', 'note', (s) => ({ money: medX(s, 0.1) })),
  st('hig_nin_he_seat', 'HIG_NINJA', 'head', [35, 70], 32, 2, (s) => pick(s, ['당주 자리에 앉았습니다. 가문 전체가 제 결정으로 움직였습니다. 결정 하나에 가족 하나가 걸렸습니다.', '계약 해제 요청이 들어왔습니다. 가문 닌자 하나가 더는 못 하겠다고 했습니다. 해제했습니다. 탈주로 두지 않았습니다.']), 'ev', { standing: 3, h: -1 }),
  st('hig_nin_he_lord', 'HIG_NINJA', 'head', [35, 70], 24, 4, '주군 가문 당주가 바뀌었습니다. 새 당주는 닌자를 쓰지 않겠다고 했습니다. 가문은 회사가 되었습니다. 간판을 바꿨습니다.', 'note', { standing: 1 }),
  promoEv('hig_nin_promo', 'HIG_NINJA', [5, 70], { ninja: '첫 임무를 마쳤습니다. 닌자라는 이름을 받았습니다. 받은 날 밤은 잠이 오지 않았습니다.', cadre: '가문 간부가 되었습니다. 임무를 받는 쪽에서 주는 쪽이 되었습니다.', head: '당주 자리를 이었습니다. 전대 당주의 방침과 제 방침이 달랐습니다. 가족 회의가 길었습니다.' }),
  fallEv('hig_nin_fall', 'HIG_NINJA', { kia: '임무에서 베였습니다. 살아 돌아왔고, 가문은 저를 뒤로 물렸습니다.', desert: '임무를 거부했습니다. 탈주 닌자가 되었습니다. 가문은 쫓았고, 저는 바다를 건넜습니다.', contract_end: '주군이 계약을 해제했습니다. 가문 전체가 일이 없어졌고, 저도 그중 하나였습니다.' }),
  { id: 'hig_nin_aff_clan', a: [5, 70], tags: ['aff:HIG_NINJA_CLAN'], w: 22, gap: 3,
    run: (s) => ({ t: '가문 제사 날 전 닌자가 모였습니다. 얼굴 없는 사람이 셋 있었습니다. 임무 중이었고, 상에는 자리가 있었습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }) },

  // ════════════════════════════════════════════════════════════════════════
  // 7. 생업(A11) 계절·명절·동네 — 설날 참배·마츠리·온천
  // ════════════════════════════════════════════════════════════════════════
  { id: 'hig_live_newyear', a: [6, 85], tags: [N, 'arch:A11'], w: 26, gap: 2, c: here,
    run: (s) => ({ t: pick(s, ['설날 참배에 온 가족이 갔습니다. 신사 앞 줄이 길었고, 소원은 짧았습니다.', '설날 참배 뒤 떡국을 먹었습니다. 한 그릇 더 먹는 것이 그날의 예의였습니다.']), k: 'warm', fx: { h: 2 } }) },
  { id: 'hig_live_fireworks', a: [6, 85], tags: [N, 'arch:A11'], w: 24, gap: 2, c: here,
    run: (s) => ({ t: pick(s, ['여름 불꽃놀이 축제 밤 강둑에 앉았습니다. 불꽃 하나에 마을 전체가 같은 소리를 냈습니다.', '여름 불꽃놀이 축제 노점에서 솜사탕을 샀습니다. 값은 평소 두 배였고, 그날은 그래도 됐습니다.']), k: 'warm', fx: { h: 2, money: -1 } }) },
  { id: 'hig_live_matsuri', a: [6, 85], tags: [N, 'arch:A11'], w: 22, gap: 3, c: here,
    run: (s) => ({ t: pick(s, ['마을 신사 마츠리에서 가마를 멨습니다. 어깨가 다음 날까지 아팠습니다. 내년에도 멜 것입니다.', '마츠리 밤 춤 대열에 섰습니다. 동작은 틀렸고, 아무도 보지 않았습니다. 그것이 마츠리였습니다.']), k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } }) },
  { id: 'hig_live_onsen', a: [10, 85], tags: [N, 'arch:A11'], w: 22, gap: 3, c: here,
    run: (s) => ({ t: pick(s, ['온천에 갔습니다. 하루. 물속에서 아무 생각이 없었고, 그것이 오랜만이었습니다.', '동네 목욕탕 대신 온천을 갔습니다. 노인들이 계급 이야기를 하지 않는 유일한 곳이었습니다.']), k: 'warm', fx: { hl: 2, h: 2 } }) },
  { id: 'hig_live_snow_north', a: [6, 85], tags: [N, 'arch:A11'], w: 20, gap: 3, c: (s) => here(s) && north(s),
    run: (s) => ({ t: '북조 눈이 지붕까지 왔습니다. 이웃과 길을 뚫었습니다. 뚫은 길로 이웃이 먼저 지나갔습니다. 그 집에 노인이 있었습니다.', k: 'note', fx: { cap: { ties: 0.02 }, hl: -1 } }) },
  { id: 'hig_live_typhoon', a: [6, 85], tags: [N, 'arch:A11'], w: 20, gap: 3, c: here,
    run: (s) => ({ t: '태풍이 왔습니다. 하루 집에 있었고, 다음 날 지붕 기와 셋을 주웠습니다. 옆집 것이었습니다. 돌려주었습니다.', k: 'note', fx: { money: -1 } }) },
  { id: 'hig_live_bon', a: [6, 85], tags: [N, 'arch:A11'], w: 20, gap: 3, c: here,
    run: (s) => ({ t: '조상 맞이 등을 문 앞에 걸었습니다. 돌아오는 분들이 길을 잃지 않게. 그날 밤 생선을 한 토막 더 구웠습니다.', k: 'warm', fx: { h: 1 } }) },
  { id: 'hig_live_cherry', a: [6, 85], tags: [N, 'arch:A11'], w: 20, gap: 3, c: here,
    run: (s) => ({ t: '벚꽃 아래 자리를 폈습니다. 자리는 새벽에 맡아 둔 것이었습니다. 꽃은 사흘이었고, 사진은 남았습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'hig_live_oden', a: [10, 85], tags: [N, 'arch:A11'], w: 18, gap: 4, c: (s) => here(s) && s.S.urban,
    run: (s) => ({ t: '퇴근길 포장마차에서 오뎅 한 꼬치를 먹었습니다. 주인이 동네 소식을 국물처럼 부어 주었습니다.', k: 'note', fx: { h: 1, cap: { ties: 0.02 } } }) },

  // ════════════════════════════════════════════════════════════════════════
  // 8. 감염자 정책 분기(D13) — 남조 보험 · 북조 은폐
  // ════════════════════════════════════════════════════════════════════════
  { id: 'hig_ins_premium', a: [15, 80], tags: [N, 'known'], w: 30, gap: 3, c: (s) => here(s) && south(s) && s.S.flags.oriPremium != null,
    run: (s) => ({ t: pick(s, ['보험사에서 특약 갱신 안내가 왔습니다. 보험료가 올랐고, 안내문은 정중했습니다.', '보험 창구에서 번호표를 뽑았습니다. 감염자 특약 창구는 따로 있었고, 줄은 거기만 길었습니다.']), k: 'bad', fx: { h: -1, money: -medX(s, 0.03) } }) },
  { id: 'hig_ins_company', a: [18, 65], tags: [N, 'known', 'archetype:A10'], w: 28, gap: 4, c: (s) => here(s) && south(s),
    run: (s) => ({ t: '회사가 단체 보험으로 처리했습니다. 복지라고 했습니다. 복지 뒤에 인사 기록 칸 하나가 바뀌었습니다.', k: 'bad', fx: { h: -2, standing: -3 } }) },
  { id: 'hig_ins_lapse', a: [15, 80], tags: [N, 'known'], w: 20, gap: 4, c: (s) => here(s) && south(s) && (s.S.flags.premiumMissed || 0) > 0,
    run: (s) => ({ t: '보험료를 내지 못한 달이 있었습니다. 약 배송이 끊겼고, 끊긴 달에 자국이 하나 늘었습니다.', k: 'bad', fx: { hl: -2 } }) },
  { id: 'hig_north_family_hide', a: [10, 80], tags: [N, 'known'], w: 30, gap: 3, c: (s) => here(s) && north(s),
    run: (s) => ({ t: pick(s, ['가족이 감염을 숨겼습니다. 이웃도 알았고, 이웃도 숨겼습니다. 북조의 예의였습니다.', '검진 통지가 오면 ' + (s.S.fam.mom.alive ? '어머니가' : '집에서') + ' 먼저 태웠습니다. 재는 아침에 치웠습니다.', '설날 참배에서 가문 자리 맨 끝에 섰습니다. 아무도 말하지 않았고, 자리는 정해져 있었습니다.']), k: 'bad', fx: { h: -2, cap: { ties: -0.02 } } }) },
  { id: 'hig_north_quarantine', a: [10, 80], tags: [N, 'known'], w: 24, gap: 3, c: (s) => here(s) && north(s) && s.S.flags.quarantined,
    run: (s) => ({ t: pick(s, ['격리 구역 담 안에서 눈을 치웠습니다. 담 밖에서도 치우는 소리가 났습니다. 같은 눈이었습니다.', '격리 구역에 가족이 왔습니다. 담 너머로 도시락을 넘겼습니다. 얼굴은 보이지 않았고, 손만 보였습니다.']), k: 'bad', fx: { h: -2 } }) },
  { id: 'hig_north_doctor', a: [10, 80], tags: [N, 'known'], w: 14, gap: 5, c: (s) => here(s) && north(s),
    run: (s) => { if (s.rng.chance(0.3)) s.S.flags.rhodes_medical_pact = s.S.age; return { t: '산 너머 의사가 밤에 왔습니다. 외국 약을 두고 갔고, 이름은 묻지 말라고 했습니다. ' + (s.S.fam.mom.alive ? '어머니가' : '집에서') + ' 생선을 싸 주었습니다.', k: 'note', fx: { hl: 1 } }; } },
  { id: 'hig_oni_rage', a: [12, 70], tags: [N, 'race:oni'], w: 12, gap: 6, c: here,
    run: (s) => ({ t: '화가 치밀어 손이 먼저 나갈 뻔했습니다. 멈췄습니다. 멈춘 것을 본 사람은 "역시 오니"라고 했습니다. 멈췄는데도.', k: 'bad', fx: { h: -3 } }) },

  // ════════════════════════════════════════════════════════════════════════
  // 9. 신참·관계(오니 cultural)·방문
  // ════════════════════════════════════════════════════════════════════════
  { id: 'hig_newcomer_bow', a: [10, 80], tags: [N, 'newcomer'], w: 30, gap: 2, c: here,
    run: (s) => ({ t: pick(s, ['인사 각도를 틀렸습니다. 아무도 고쳐 주지 않았고, 다음 날 모두 저와 다른 각도로 인사했습니다.', '동네 쓰레기 배출 요일표를 받았습니다. 일곱 가지였습니다. 틀린 날 봉투가 집 앞에 돌아와 있었습니다.']), k: 'note', fx: { h: -1 } }) },
  { id: 'hig_newcomer_papers', a: [10, 80], tags: [N, 'newcomer'], w: 24, gap: 3, c: here,
    run: (s) => ({ t: '호적대장소 창구에서 서류를 세 번 돌려받았습니다. 도장 자리가 틀렸다고 했습니다. 네 번째에 받아 주었습니다.', k: 'bad', fx: { h: -1 } }) },
  { id: 'hig_rel_cul_job', a: [15, 58], tags: [N, 'rel:cultural'], w: 28, gap: 3, c: here,
    run: (s) => ({ t: pick(s, ['면접에서 뿔을 보고 질문이 바뀌었습니다. "성격은 어떤 편입니까." 대답했고, 합격 통지는 오지 않았습니다.', '거래처가 다른 담당자를 보내 달라고 했습니다. 이유는 쓰지 않았습니다. 쓰지 않아도 알았습니다.']), k: 'bad', fx: { h: -2 } }) },
  { id: 'hig_rel_cul_online', a: [12, 60], tags: [N, 'rel:cultural'], w: 22, gap: 4, c: here,
    run: (s) => ({ t: '인터넷 게시판에 제 종족 이야기가 올라왔습니다. "분수를 알라"는 말이 있었습니다. 화면을 닫았습니다. 말은 남았습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'hig_rel_cul_temple', a: [12, 80], tags: [N, 'rel:cultural'], w: 16, gap: 5, c: (s) => here(s) && oni(s),
    run: (s) => ({ t: '절에서 법명을 받았습니다. 성 없이 이름만. 오니는 그렇게 한다고 했습니다. 이름이 가벼워졌습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'hig_visit_train', a: [14, 80], tags: ['visit:higashi'], w: 28, gap: 3,
    run: (s) => ({ t: '극동 열차에서 아무도 말을 하지 않았습니다. 전화도 울리지 않았습니다. 제 가방 소리가 가장 컸습니다.', k: 'note' }) },
  { id: 'hig_visit_bow', a: [14, 80], tags: ['visit:higashi'], w: 24, gap: 3,
    run: (s) => ({ t: '극동 가게에서 거스름돈을 두 손으로 받았습니다. 점원이 허리를 숙였고, 저도 숙였습니다. 각도는 달랐습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'hig_visit_north', a: [14, 80], tags: ['visit:higashi'], w: 20, gap: 4,
    run: (s) => ({ t: '극동 북쪽 성곽 도시에서 검을 찬 사람을 보았습니다. 거리 사람들이 길을 비켰습니다. 비키는 것이 당연한 거리였습니다.', k: 'note' }) },
];

// ── 각주(D31): 숫자가 든 이벤트에만, 세계관 안 출처. 전체의 10~20% ──
const FOOT = {
  hig_na_pl_men: () => F('막부군 소대 편성표'),
  hig_ru_fa_landlord: (s) => orgF(s, '북조 공납 대장'),
  hig_ru_ch_mine: (s) => orgF(s, '광산 사고 집계'),
  hig_off_st_train: () => F('남조 철도 승객 통계'),
  hig_off_st_mentor: () => F('회사 조직도'),
  hig_off_kc_section: () => F('사내 인사 기록'),
  hig_yak_wa_territory: () => F('상점가 상인회 명부'),
  hig_yak_ka_diet: () => F('국회 후원 등록'),
  hig_ent_tr_lesson: () => F('소속사 연습 일지'),
  hig_ent_in_free: () => F('공연장 입장 집계'),
  hig_fac_wk_line: () => F('공장 생산 일지'),
  hig_fac_fo_shift: () => F('공장 교대표'),
  hig_str_cl_counter: () => F('상점가 상인회 기록'),
  hig_ron_me_contract: () => F('상단 호위 계약서'),
  hig_tem_no_dawn: () => F('산사 일과표'),
  hig_pol_de_case: () => F('미츠쿠에 경찰 사건 기록'),
  hig_poli_ca_speech: () => F('선거 운동 일지'),
  hig_nin_ch_train: () => F('가문 기록'),
  hig_newcomer_bow: (s) => orgF(s, '거주 등록 안내'),
  hig_newcomer_papers: (s) => orgF(s, '거주 등록 대장'),
  hig_tem_ab_city: () => F('산사 방문 기록'),
  hig_fac_mg_office: () => F('본사 생산 목표 공문'),
  hig_yak_ka_guard: () => F('경호 배치표'),
};
for (const e of events) if (FOOT[e.id]) { const run = e.run; e.run = (s) => { const r = run(s); if (r && typeof r === 'object' && !r.f) r.f = FOOT[e.id](s); return r; }; }

// ══════════════════════════════════════════════════════════════════════════
// 결정
// ══════════════════════════════════════════════════════════════════════════
function marryOverride(typeId, regionOk, bodyFn, acceptText) {
  const base = ENGINE_DECISIONS.marry;
  return {
    once: false, at: 0.45,
    ok: (s) => { const b = base.ok(s); if (!b) return false; const v = s.S.flags.y_marry && s.S.flags.y_marry.v; if (!v || v.type.id !== typeId) return false; return !here(s) || regionOk(s); },
    build: (s, p) => { const r = s.S.flags.y_marry && s.S.flags.y_marry.v; if (!r) return null; if (!here(s)) return base.build(s, p); Object.assign(p, r);
      return { title: r.type.name, body: bodyFn(s, r.prospect, r.type), choices: [{ k: 'accept', label: '받아들인다', auto: 1.4 }, { k: 'hold', label: '보류한다', auto: 0.4 }, { k: 'decline', label: '거절한다', auto: 0.4 }] }; },
    apply: (s, k, p) => { if (!here(s)) return base.apply(s, k, p); s.S.flags.y_marry = null;
      if (k === 'hold') return '혼담을 한 해 미루었습니다.'; if (k === 'decline') return '혼담을 돌려보냈습니다.';
      if (p.prospect && p.prospect.race !== s.S.race && s.rng.chance(0.4)) return { t: '양가가 종족을 두고 말이 길어졌습니다. 혼담은 봄을 넘기지 못했습니다.', k: 'bad', fx: { h: -2 } };
      return engineMarry(s, p.prospect, p.type) ? { t: acceptText, k: 'warm', fx: { h: 3 } } : '혼인은 이루어지지 않았습니다.'; },
  };
}
const any = () => true;

export const decisions = {
  // ── 북조 무가: 충성 시험 ──
  hig_na_loyalty: {
    tags: ['track:HIG_NORTH_ARMY'], once: false, gap: 5, at: 0.5,
    ok: (s) => inTrack(s, 'HIG_NORTH_ARMY') && s.S.age >= 17 && s.S.track.stage <= 2 && yr(s, 'na_loyalty', 0.18),
    build: (s) => ({ title: '막부의 명', body: '상관이 명령을 내렸습니다. 마을 하나를 비우라는 것이었습니다. 이유는 쓰여 있지 않았고, 서명은 가문 어른 것이었습니다.',
      choices: [{ k: 'obey', label: '명을 따른다', auto: 2 }, { k: 'delay', label: '하루 미룬다', sub: '사정을 알아본다', auto: 1 }, { k: 'refuse', label: '칼을 내려놓는다', sub: '추방을 각오', auto: 0.4 }] }),
    apply: (s, k) => {
      if (k === 'obey') return { t: '명을 따랐습니다. 마을은 비었고, 보고서는 짧았습니다. 그날 밤 검을 닦는 데 오래 걸렸습니다.', k: 'bad', fx: { standing: 5, h: -4 } };
      if (k === 'delay') { if (s.rng.chance(0.3)) { s.fall('betrayal'); return false; } return { t: '하루 미뤘습니다. 다음 날 명령이 바뀌어 있었습니다. 바뀐 이유는 묻지 않았고, 상관은 제 얼굴을 오래 보았습니다.', k: 'note', fx: { h: 1, standing: -2 } }; }
      if (s.rng.chance(0.6)) { s.fall('purge'); return false; }
      return { t: '칼을 내려놓고 물러났습니다. 상관은 아무 말도 하지 않았습니다. 그 뒤로 보직이 바뀌었고, 소대는 다른 사람이 받았습니다.', k: 'bad', fx: { h: 2, standing: -8 } };
    },
  },
  // ── 남조 회사원: 야근 ──
  hig_off_overtime: {
    tags: ['track:HIG_OFFICE'], once: false, gap: 3, at: 0.5,
    ok: (s) => inTrack(s, 'HIG_OFFICE') && s.S.track.stage <= 3 && yr(s, 'off_overtime', 0.3),
    build: (s) => ({ title: '막차', body: '분기 마감입니다. 부장은 아직 자리에 있고, 아무도 먼저 일어나지 않습니다. 막차는 삼십 분 뒤입니다.',
      choices: [{ k: 'stay', label: '남는다', sub: '택시비는 제 돈', auto: 2 }, { k: 'go', label: '막차를 탄다', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'go') return { t: '막차를 탔습니다. 다음 날 아침 부장이 제 책상 앞에 잠시 서 있다가 갔습니다. 말은 없었습니다.', k: 'note', fx: { hl: 1, standing: -3 } };
      if (s.rng.chance(0.1)) { s.fall('overwork'); return false; }
      return { t: '남았습니다. 새벽 두 시 택시에서 잠들었습니다. 고과표에 줄 하나가 생겼습니다.', k: 'bad', fx: { hl: -3, standing: 4, money: -medX(s, 0.02) } };
    },
  },
  // ── 킨세키가이: 밀고 ──
  hig_yak_inform: {
    tags: ['track:HIG_YAKUZA'], once: false, gap: 5, at: 0.5,
    ok: (s) => inTrack(s, 'HIG_YAKUZA') && s.S.age >= 18 && yr(s, 'yak_inform', 0.08),
    build: (s) => ({ title: '형사의 명함', body: '형사 하나가 따로 불렀습니다. 간부 한 사람의 일정을 알려 주면 제 이름은 어느 서류에서도 빼 주겠다고 했습니다.',
      choices: [{ k: 'no', label: '명함을 버린다', auto: 2.5 }, { k: 'yes', label: '일정을 넘긴다', sub: '들키면 끝', auto: 0.6 }] }),
    apply: (s, k) => {
      if (k === 'no') { if (s.rng.chance(0.12)) { s.fall('arrest'); return false; } return { t: '명함을 버렸습니다. 다음 달 형사는 다른 말단을 불렀습니다.', k: 'note', fx: { standing: 3 } }; }
      if (s.rng.chance(0.5)) { s.fall('betrayal'); return false; }
      return { t: '일정을 넘겼습니다. 간부는 잡히지 않았고, 형사는 제 이름을 어디선가 지웠습니다. 지웠다고 했습니다.', k: 'bad', fx: { h: -4, money: medX(s, 0.1) } };
    },
  },
  // ── 아이돌: 계약 조항 ──
  hig_ent_contract: {
    tags: ['track:HIG_ENT'], once: false, gap: 4, at: 0.5,
    ok: (s) => inTrack(s, 'HIG_ENT') && s.S.track.stage >= 1 && s.S.track.stage <= 2 && yr(s, 'ent_contract', 0.3),
    build: (s) => ({ title: '갱신', body: '계약 갱신서가 왔습니다. 체중과 연애 조항이 그대로였고, 기간이 두 해 늘었습니다. 서명하지 않으면 다음 곡은 없습니다.',
      choices: [{ k: 'sign', label: '서명한다', auto: 2 }, { k: 'negotiate', label: '조항을 지우자고 한다', auto: 0.8 }, { k: 'refuse', label: '서명하지 않는다', auto: 0.4 }] }),
    apply: (s, k) => {
      if (k === 'sign') return { t: '서명했습니다. 다음 곡이 나왔고, 저녁은 녹차였습니다.', k: 'note', fx: { standing: 3, hl: -1 } };
      if (k === 'negotiate') { if (s.rng.chance(0.4)) return { t: '조항 하나가 지워졌습니다. 체중 조항이었습니다. 연애 조항은 남았습니다. 반이었습니다.', k: 'warm', fx: { h: 3 } }; return { t: '소속사는 웃으며 서류를 그대로 두었습니다. 다음 곡 일정이 한 계절 밀렸습니다.', k: 'bad', fx: { h: -2, standing: -3 } }; }
      if (s.rng.chance(0.5)) { s.fall('fade'); return false; }
      if (s.promote({ force: true, quiet: true })) return { t: '서명하지 않았습니다. 소속사를 나왔습니다. 제 이름으로 첫 공연 포스터를 손으로 붙였습니다.', k: 'big', fx: { h: 3 } };
      return { t: '서명하지 않았습니다. 다음 곡은 없었고, 연습실 열쇠는 그대로 가지고 있었습니다.', k: 'bad', fx: { h: -2 } };
    },
  },
  // ── 닌자: 임무 거부 ──
  hig_nin_refuse: {
    tags: ['track:HIG_NINJA'], once: false, gap: 5, at: 0.5,
    ok: (s) => inTrack(s, 'HIG_NINJA') && s.S.age >= 15 && s.S.track.stage >= 1 && s.S.track.stage <= 2 && yr(s, 'nin_refuse', 0.15),
    build: (s) => ({ title: '밤의 명령', body: '임무가 내려왔습니다. 사람을 베는 일이었습니다. 거절하면 탈주 닌자. 받으면 돌아오지 못할 수도 있습니다.',
      choices: [{ k: 'go', label: '받는다', auto: 2 }, { k: 'refuse', label: '거절한다', sub: '누케닌', auto: 0.5 }] }),
    apply: (s, k) => {
      if (k === 'go') { if (s.rng.chance(0.15)) { s.fall('kia'); return false; } return { t: '받았습니다. 돌아왔습니다. 돌아온 것이 보고의 전부였고, 그날 밤은 길었습니다.', k: 'bad', fx: { h: -4, standing: 4 } }; }
      if (s.rng.chance(0.7)) { s.fall('desert'); return false; }
      return { t: '거절했습니다. 당주가 오래 말이 없었습니다. 임무는 다른 사람이 받았고, 저는 뒤로 물러났습니다. 탈주로 두지는 않았습니다.', k: 'note', fx: { h: 1, standing: -6 } };
    },
  },
  // ── 남조 학생: 감염 가출 ──
  hig_stu_runaway: {
    tags: ['track:HIG_STUDENT', 'known'], once: true, at: 0.5,
    ok: (s) => inTrack(s, 'HIG_STUDENT') && here(s) && south(s),
    build: (s) => ({ title: '소매 아래', body: '검은 자국이 소매 아래까지 왔습니다. 가족은 아직 모릅니다. 보험사 통지가 집으로 오기 전에 결정해야 합니다.',
      choices: [{ k: 'tell', label: '가족에게 말한다', auto: 1.2 }, { k: 'leave', label: '집을 나온다', sub: '가방 하나', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'tell') return { t: '가족에게 말했습니다. 어머니는 보험 서류를 꺼냈고, 아버지는 창밖을 봤습니다. 집에는 남았습니다.', k: 'bad', fx: { h: -2, cap: { ties: 0.02 } } };
      s.leaveTrack('content', { quiet: true });
      if (s.enterTrack('HIG_STREET', { how: 'switch', via: 'runaway', skipExam: true })) return { t: '집을 나왔습니다. 가방 하나였습니다. 상점가 뒷방에서 점원 자리를 얻었습니다. 이름은 다르게 말했습니다.', k: 'big', fx: { h: -3 } };
      return { t: '집을 나왔습니다. 가방 하나였습니다. 어디로 갈지는 다음 날 정했습니다.', k: 'big', fx: { h: -3 } };
    },
  },
  // ── 남조: 보험 청구 ──
  hig_ins_claim: {
    tags: [N, 'known'], once: false, gap: 4, at: 0.5,
    ok: (s) => here(s) && south(s) && s.S.flags.oriPremium != null && s.S.age >= 16 && yr(s, 'ins_claim', 0.4),
    build: (s) => ({ title: '청구서', body: '보험 특약 청구서를 쓸 때입니다. 청구하면 약값이 나오고, 청구 기록은 회사와 호적대장소에 함께 갑니다.',
      choices: [{ k: 'claim', label: '청구한다', auto: 1.5 }, { k: 'skip', label: '제 돈으로 산다', sub: '기록은 남지 않는다', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'skip') return { t: '제 돈으로 약을 샀습니다. 영수증은 찢었습니다. 기록은 없었고 돈도 없었습니다.', k: 'bad', fx: { money: -medX(s, 0.15), h: -1 } };
      if (s.S.track && s.rng.chance(0.2)) { s.fall('infected'); return false; }
      return { t: '청구했습니다. 약값이 들어왔고, 두 주 뒤 회사 인사과에서 면담을 청했습니다. 면담은 정중했습니다.', k: 'note', fx: { money: medX(s, 0.12), hl: 1, standing: -3 } };
    },
  },
  // ── 북조: 숨기는가, 신고하는가 ──
  hig_north_hide: {
    tags: [N, 'known'], once: true, at: 0.5,
    ok: (s) => here(s) && north(s) && !s.S.flags.quarantined,
    build: (s) => ({ title: '집안의 일', body: '가족이 모였습니다. 신고하면 격리 구역입니다. 숨기면 온 집이 함께 숨깁니다. 북조에서는 대개 후자입니다.',
      choices: [{ k: 'hide', label: '숨긴다', auto: 2.5 }, { k: 'report', label: '신고한다', auto: 0.6 }] }),
    apply: (s, k) => {
      if (k === 'report') { s.S.flags.quarantined = true; s.S.flags.noMove = true; return { t: '신고했습니다. 격리 구역 통지가 왔습니다. 가족은 배웅을 나오지 않았습니다. 그것이 예의라고 했습니다.', k: 'bad', fx: { h: -4 } }; }
      s.S.flags.oriHidden = true;
      return { t: '온 집이 숨겼습니다. 통지가 오면 태웠고, 이웃은 묻지 않았습니다. 설날 참배 자리만 조금 뒤로 갔습니다.', k: 'bad', fx: { h: -2, cap: { ties: -0.02 } } };
    },
  },
  // ── 광산촌: 겨울 사냥 ──
  hig_ru_winter_hunt: {
    tags: ['track:HIG_RURAL'], once: false, gap: 4, at: 0.5,
    ok: (s) => inTrack(s, 'HIG_RURAL') && s.S.age >= 15 && yr(s, 'ru_hunt', 0.25),
    build: (s) => ({ title: '큰 발자국', body: '겨울 산에 큰 짐승 발자국이 났습니다. 가죽은 한 해 공납값입니다. 돌아오지 않은 사냥꾼 이야기는 마을이 다 압니다.',
      choices: [{ k: 'go', label: '산에 든다', auto: 1 }, { k: 'stay', label: '올해는 두고 본다', auto: 1.5 }] }),
    apply: (s, k) => {
      if (k === 'stay') return { t: '두고 봤습니다. 봄에 다른 마을 사냥꾼이 그 가죽을 성 장에 냈다는 말을 들었습니다.', k: 'note', fx: { h: -1 } };
      if (s.rng.chance(0.2)) { s.fall('beast'); return false; }
      return { t: '사흘 뒤 내려왔습니다. 가죽 하나. 공납이 끝났고, 마을 노인이 처음으로 제 이름을 불렀습니다.', k: 'warm', fx: { money: medX(s, 0.3), standing: 5, hl: -2 } };
    },
  },
  // ── 경찰: 의원 압력 ──
  hig_pol_pressure: {
    tags: ['track:HIG_POLICE'], once: false, gap: 5, at: 0.5,
    ok: (s) => inTrack(s, 'HIG_POLICE') && s.S.track.stage >= 1 && s.S.track.stage <= 2 && yr(s, 'pol_pressure', 0.2),
    build: (s) => ({ title: '서장실 전화', body: '쫓던 사건에 의원 비서가 끼었습니다. 서장이 불렀습니다. 사건을 다른 반으로 넘기면 아무 일 없습니다.',
      choices: [{ k: 'hand', label: '넘긴다', auto: 2 }, { k: 'keep', label: '수첩을 바꾼다', sub: '계속 쫓는다', auto: 0.7 }] }),
    apply: (s, k) => {
      if (k === 'hand') return { t: '넘겼습니다. 다른 반은 한 달 뒤 종결했습니다. 수첩에서 그 쪽을 찢지는 않았습니다.', k: 'bad', fx: { h: -3, standing: 2 } };
      if (s.rng.chance(0.3)) { s.fall('courtmartial'); return false; }
      return { t: '수첩을 바꾸고 계속 쫓았습니다. 사건은 종결되지 않았고, 저도 그 자리에 남았습니다. 그해는.', k: 'ev', fx: { h: 2, standing: -4 } };
    },
  },
  // ── 혼인 유형 덮어쓰기(남조/북조 region 조건) ──
  marry_miai: marryOverride('miai', any,
    (s, pr) => wa(pr.name) + ' 맞선 자리가 잡혔습니다. 양가 어른이 먼저 만났고, 사진이 먼저 오갔습니다. 지참금은 중위소득의 절반입니다.' + (pr.home ? ' 상대는 ' + s.data.nationById[pr.home].name + ' 사람입니다.' : ''),
    '맞선 세 번째 만남에서 혼인을 정했습니다. 식은 신사에서 올렸고, 사진사가 가장 많이 말했습니다.'),
  marry_love: marryOverride('love', south,
    (s, pr) => wa(pr.name) + ' 사귄 지 두 해가 되었습니다. 둘이 먼저 정하고 양가에 알리는 혼인입니다. 지참금은 없습니다.',
    '둘이 정하고 양가에 알렸습니다. 집에서는 맞선이 아니라서 한 번 울었고, 식에서 또 한 번 울었습니다.'),
  marry_house: marryOverride('house', north,
    (s, pr) => '가문끼리 혼약이 오갔습니다. 상대는 ' + pr.name + '. 두 가문 검술 유파가 먼저였고, 사람은 나중이었습니다. 지참금은 중위소득의 두 배입니다.',
    '무가 혼약을 올렸습니다. 두 가문 문장이 한 병풍에 걸렸습니다. 신랑 신부는 식이 끝나고 처음으로 서로 말했습니다.'),
  marry_infected_only: marryOverride('infected_only', any,
    (s, pr) => wa(pr.name) + ' 조용히 짝을 지을 수 있습니다. 양가 다 아는 사람만 부릅니다. 호적대장소에는 나중에, 혹은 가지 않습니다.',
    '아는 사람만 모여 식을 올렸습니다. 사진은 찍지 않았습니다. 둘은 서로의 소매 아래를 알았습니다.'),
  // ── 주거 결정 덮어쓰기 ──
  home_change: {
    once: false, gap: 5, at: 0.7,
    ok: (s) => ENGINE_DECISIONS.home_change.ok(s),
    build: (s, p) => { if (!here(s)) return ENGINE_DECISIONS.home_change.build(s, p); const opts = homeChangeOptions(s).slice(0, 3); if (!opts.length) return null;
      const SUB = { house_own: '남조 단독주택. 대출이 삼십 년입니다.', village: '광산촌 집. 눈 치울 지붕이 제 것이 됩니다.', samurai_house: '무가 저택. 문 위에 가문 문장을 걸 수 있습니다.' };
      return { title: '집', body: north(s) ? '집을 마련할 수 있는 해입니다. 북조에서 제 집은 가문 안에서의 자리이기도 합니다.' : '집을 마련할 수 있는 해입니다. 남조에서 집은 대출 기간으로 말합니다.',
        choices: opts.map((h) => ({ k: h.id, label: h.name, sub: (SUB[h.id] ? SUB[h.id] + ' ' : '') + Math.round(s.med * h.buy).toLocaleString() + ' LMD', auto: h.w ?? 1 })).concat([{ k: 'no', label: '그대로 산다', auto: 1 }]) }; },
    apply: (s, k, p) => { if (!here(s)) return ENGINE_DECISIONS.home_change.apply(s, k, p); if (k === 'no') return '그대로 살기로 했습니다.';
      const h = homeChangeOptions(s).find((x) => x.id === k); if (!h || !setHousing(s, h, { buy: true, quiet: true })) return '마련하지 못했습니다.';
      const T = { house_own: '단독주택 열쇠를 받았습니다. 현관에 이름표를 걸었습니다. 대출 서류는 서랍 깊이 넣었습니다.', village: '광산촌 집을 제 이름으로 샀습니다. 첫눈 온 날 지붕에 올라가 눈을 치웠습니다. 제 지붕이었습니다.', samurai_house: '무가 저택 문 위에 가문 문장을 걸었습니다. 마을 사람들이 그 앞에서 걸음을 늦췄습니다.' };
      return { t: T[k] || eul(h.name) + ' 마련했습니다. 문에 이름표를 걸었습니다.', k: 'warm', fx: { h: 3 } }; },
  },
};

// W11: 엔진 id 와 같은 결정은 국가 디스패처로 옮긴다(여러 파일이 같은 id 를 등록해도 거주국별로 분기)
hoist(decisions, { marry_miai: ['higashi'], marry_love: ['higashi'], marry_house: ['higashi'], marry_infected_only: ['higashi'], home_change: ['higashi'] });

export default { events, decisions };

// W9d 카시미어 진로 콘텐츠(v0.3): data/tracks/kazimierz.json 의 15진로 전용 이벤트·결정. 텍스트 공유 0(D40).
// 핵심 5: KAZ_KNIGHT(경쟁 기사, 이 파일의 중심) · KAZ_CAMPAIGN · KAZ_LABOR · KAZ_FARM · KAZ_AU. 나머지 10은 단계마다 2개 + 전환 + 몰락 후일담.
// 태그는 track:<ID>[:<stage>] 필수(§11.1). 공통 직장 이벤트는 쓰지 않는다(A10 풀은 엔진 태그 archetype:A10 몫).
// 톤: 담백한 "~했습니다"체(D25), 각주는 숫자가 있을 때만 세계관 안 출처(D31), 조사는 유틸(D30), 캐논 인물은 1회성·연도 게이트(D43).
// 모든 콜백은 ctx(=sim) 첫 인자. 소유 외 파일은 읽기만 한다.
import { eul, iga, eun, wa, ro, ieot, rago } from '../../src/engine/text.js';
import { cul, F, orgF, given, poor, rich, lifeRoll, once, medX, momHere, dadHere } from '../_util.js';
import { ENGINE_DECISIONS } from '../../src/engine/choices.js';
import { hoist } from '../_dispatch.js';

const K = 'nation:kazimierz';
const T = (id, st) => 'track:' + id + (st ? ':' + st : '');
const inStage = (s) => (s.S.track ? s.S.age - s.S.track.stageSince : 99);
/** 단계 전환 서사: 그 단계에 들어온 지 1년 안, 생애 1회 */
const fresh = (s) => inStage(s) <= 1;   // 전환 서사는 gap/rep 없이 1회(엔진이 ev_ 플래그로 재선택 안 함)
const standing = (s) => (s.S.track ? s.S.track.standing : 0);
const affIs = (s, id) => !!s.S.track && s.S.track.aff === id;
const affName = (s, dflt) => (s.aff ? s.aff.name : dflt);
const via = (s) => (s.S.track && s.S.track.flags ? s.S.track.flags.via : null);
/** 진로를 어떤 식으로 떠난 직후인가(2년 안) */
const left = (s, id, how, within = 2) => s.S.flags.lastTrack === id && (!how || s.S.flags.lastTrackHow === how) && s.S.age - (s.S.flags.lastTrackLeftAt ?? -99) <= within;
/** 같은 진로 안에서 강등된 직후 */
const demoted = (s, id) => !!s.S.track && s.S.track.id === id && s.S.flags.lastFallOutcome === 'demote' && s.S.age - (s.S.flags.lastFallAt ?? -99) <= 1;
const cameFrom = (s, id) => { const h = s.S.trackHist; return h.length > 0 && h[h.length - 1].id === id; };
const canonOk = (s, id, y0, y1) => s.year >= y0 && s.year <= y1 && (s.S.flags.canonSeen || 0) < 3 && !s.S.flags['seen_' + id];
const seeCanon = (s, id) => { s.S.flags['seen_' + id] = s.S.age; s.S.flags.canonSeen = (s.S.flags.canonSeen || 0) + 1; };
const majorYear = (s) => (s.year - 1025) % 3 === 0;      // 1025년 1회 → 1094년 23회, 1097년 24회
const majorNo = (s) => (s.year - 1025) / 3 + 1;
const pct = (s, k) => -Math.round(s.S.money * k);
const skillTop = (s) => s.S.cap.skill >= 1.4;
const looksHigh = (s) => s.S.innate.looks > 1.5;
const kuranta = (s) => s.S.race === 'kuranta';
const known = (s) => s.S.ori.on && s.S.ori.known;
const nat = (s, id) => (s.data.nationById[id] ? s.data.nationById[id].name : id);
const ex = (s) => ({ r: s.rng.rnd() });

export const events = [
  // ════════════════════════════════════════════════════════════════════
  // KAZ_KNIGHT 경쟁 기사 — 연습생 → 정예 → MVP → Top 100 기사단 → 대기사
  // ════════════════════════════════════════════════════════════════════
  // ── registered 연습생 ──
  { id: 'kz_kn_reg_first_lance', a: [10, 26], tags: [T('KAZ_KNIGHT', 'registered')], w: 60, gap: 3,
    run: (s) => ({ t: via(s) === 'family_training' ? '집안 훈련장에서 쓰던 창을 기사단 규격 창으로 바꿨습니다. 무게는 비슷했고, 값은 달랐습니다.' : via(s) === 'underground_points' ? '지하 투기장 포인트 장부를 등록관 앞에 내밀었습니다. 등록관은 장부를 두 번 넘겨 보고 도장을 찍었습니다.' : '카봐렐리엘키 등록소에 이름을 올렸습니다. 등록비는 석 달치 급료였고, 창은 빌린 것이었습니다.', k: 'ev', fx: via(s) === 'family_training' ? { money: -medX(s, 0.3) } : { money: -medX(s, 0.25), h: 2 } }) },
  { id: 'kz_kn_reg_gloomfinger', a: [10, 26], tags: [T('KAZ_KNIGHT', 'registered')], w: 45, gap: 2, rep: true,
    run: (s) => { const good = s.rng.chance(0.5 + s.S.cap.skill * 0.15);
      return { t: good ? '훈련 상대는 사육된 글룸핀서였습니다. 첫 주에 두 번 떨어졌고, 넷째 주에는 한 번도 떨어지지 않았습니다.' : '훈련 상대는 사육된 글룸핀서였습니다. 짐승은 규칙을 몰랐고, 저는 규칙만 알았습니다. 갈비뼈에 금이 갔습니다.', k: good ? 'ev' : 'bad', fx: good ? { cap: { skill: 0.03 }, standing: 2 } : { hl: -5, h: -2 } }; } },
  { id: 'kz_kn_reg_drone', a: [10, 26], tags: [T('KAZ_KNIGHT', 'registered')], w: 40, gap: 3,
    run: (s) => ({ t: '스폰서 드론이 훈련장 위를 돌았습니다. 카메라는 잘 뛰는 연습생만 따라갔습니다. ' + (looksHigh(s) ? '저는 뛰지 않을 때도 잡혔습니다.' : skillTop(s) ? '저는 세 바퀴 내내 잡혔습니다.' : '저는 한 번 잡혔습니다.'), k: 'note', fx: (looksHigh(s) || skillTop(s)) ? { standing: 3 } : { standing: 1 } }) },
  { id: 'kz_kn_reg_debut', a: [12, 26], tags: [T('KAZ_KNIGHT', 'registered')], w: 55, gap: 2, c: (s) => inStage(s) >= 1,
    run: (s) => { const win = s.rng.chance(0.4 + s.S.cap.skill * 0.2 + (affIs(s, 'KAZ_KNI_GRAND8') ? 0.1 : 0) - (affIs(s, 'KAZ_KNI_INDEP') ? 0.1 : 0));
      return { t: win ? '연습생 공식전에서 이겼습니다. 다음 날 아침 명부의 제 줄에 포인트가 처음 적혔습니다.' : '연습생 공식전에서 졌습니다. 상대는 장비가 저보다 한 세대 앞이었습니다. 심판은 장비를 보지 않습니다.', k: win ? 'warm' : 'bad', fx: win ? { standing: 6, h: 3 } : { standing: -3, h: -3 } }; } },
  { id: 'kz_kn_reg_debt', a: [12, 26], tags: [T('KAZ_KNIGHT', 'registered')], w: 30, gap: 4, c: (s) => !affIs(s, 'KAZ_KNI_GRAND8'),
    run: (s) => ({ t: '장비 할부 청구서가 왔습니다. 갑옷 한 벌이 ' + Math.round(s.med * 1.5).toLocaleString() + ' LMD. 포인트는 돈으로 바뀌지 않았고, 청구서는 포인트로 바뀌지 않았습니다.', k: 'bad', fx: { money: -medX(s, 0.3) }, f: F('감정회 등록 기사 장비 규격표') }) },
  { id: 'kz_kn_reg_photo_offer', a: [14, 26], tags: [T('KAZ_KNIGHT', 'registered'), 'looks:high'], w: 70,
    run: (s) => { s.S.flags.knPhotoOffer = s.S.age; return { t: '잡지사 사람이 훈련장까지 찾아왔습니다. 경기 성적은 묻지 않고 얼굴을 먼저 보았습니다. 화보 이야기였습니다.', k: 'note', fx: { h: 1 } }; } },
  // ── elite 정예 ──
  { id: 'kz_kn_elite_trn', a: [13, 32], tags: [T('KAZ_KNIGHT', 'elite')], w: 300, c: (s) => fresh(s, 'KAZ_KNIGHT_elite'),
    run: (s) => ({ t: '정예 명단에 올랐습니다. 연습생 숙소에서 정예 숙소로 짐을 옮겼습니다. 복도 하나 차이였고, 식단은 세 가지가 늘었습니다. ' + (affIs(s, 'KAZ_KNI_INDEP') ? '독립 기사라 숙소는 없었습니다. 명단만 올랐습니다.' : '단장이 처음으로 이름을 불러 주었습니다.'), k: 'big', fx: { h: 3 } }) },
  { id: 'kz_kn_elite_season', a: [13, 34], tags: [T('KAZ_KNIGHT', 'elite')], w: 50, gap: 1, rep: true,
    run: (s) => { const up = standing(s) >= 45; const rank = up ? s.rng.ri(40, 120) : s.rng.ri(150, 600);
      return { t: '시즌이 끝났습니다. 순위 ' + rank + '위. ' + (up ? s.rng.pick(['중계에 이름이 두 번 나왔습니다.', '기사단이 승격 구간에 들었습니다.', '스폰서 쪽에서 다음 시즌 얘기를 먼저 꺼냈습니다.']) : s.rng.pick(['해설자가 제 이름을 틀렸습니다.', '기사단이 강등 구간이었습니다. 단장은 셋을 팔았습니다.', '다음 시즌 등록비는 제가 내야 했습니다.'])), k: up ? 'warm' : 'bad', fx: up ? { h: 2, money: medX(s, 0.3) } : { h: -2 }, f: F('감정회 연간 순위표, ' + s.year + '년') }; } },
  { id: 'kz_kn_elite_sponsor_seen', a: [13, 32], tags: [T('KAZ_KNIGHT', 'elite')], w: 60, c: (s) => !affIs(s, 'KAZ_KNI_SPONSOR') && !s.S.flags.knSponsorAsked && standing(s) >= 35,
    run: (s) => { s.S.flags.knSponsorOffer = s.S.age; return { t: '경기 뒤 대기실에 명함이 놓여 있었습니다. ' + s.rng.pick(['식품 회사', '건자재 회사', '방어구 회사', '미디어 그룹']) + '였습니다. 뒷면에 숫자가 적혀 있었습니다.', k: 'note' }; } },
  { id: 'kz_kn_elite_epithet', a: [13, 34], tags: [T('KAZ_KNIGHT', 'elite'), 'cap:skill:top'], w: 80,
    run: (s) => { const e = s.rng.pick(['질풍', '은빛 창', '늦은 밤', '남부']); s.S.flags.knEpithet = e;
      return { t: '중계 해설이 제 이름 앞에 말을 하나 붙였습니다. "' + e + '의 기사". 다음 경기부터 관중이 제 이름 대신 그 말을 불렀습니다.', k: 'big', fx: { standing: 8, h: 4 } }; } },
  { id: 'kz_kn_elite_injury', a: [13, 34], tags: [T('KAZ_KNIGHT', 'elite')], w: 35, gap: 3,
    run: (s) => { const bad = s.rng.chance(0.3);
      return { t: bad ? '경기에서 어깨가 빠졌습니다. 한 시즌을 쉬었습니다. 스폰서는 치료비 대신 광고 노출 시간을 계산했습니다.' : '경기에서 손가락이 부러졌습니다. 다음 주에 뛰었습니다. 그것이 계약이었습니다.', k: 'bad', fx: bad ? { hl: -8, h: -3, standing: -5 } : { hl: -3 } }; } },
  { id: 'kz_kn_elite_ad', a: [13, 34], tags: [T('KAZ_KNIGHT', 'elite'), 'looks:high'], w: 40, gap: 3, c: (s) => affIs(s, 'KAZ_KNI_SPONSOR') || !!s.S.flags.knPhoto,
    run: (s) => ({ t: '광고를 찍었습니다. ' + s.rng.pick(['호밀빵이었습니다. 열두 조각을 베어 무는 시늉을 했습니다.', '보드카였습니다. 마시지 않는데도 잔을 들었습니다.', '재앙 예보 단말기였습니다. 대사는 한 줄이었고 촬영은 하루였습니다.']) + ' 출연료는 한 시즌 상금만 했습니다.', k: 'ev', fx: { money: medX(s, 0.5), standing: 2 } }) },
  // ── mvp ──
  { id: 'kz_kn_mvp_trn', a: [15, 34], tags: [T('KAZ_KNIGHT', 'mvp')], w: 300, c: (s) => fresh(s, 'KAZ_KNIGHT_mvp'),
    run: (s) => ({ t: '시즌 MVP로 호명되었습니다. ' + (s.S.flags.knEpithet ? '"' + s.S.flags.knEpithet + '의 기사"가 공식 칭호가 되었습니다.' : '무대 위에서 투구를 벗었습니다. 조명이 생각보다 뜨거웠습니다.') + ' 다음 날 거리 화면에 제 얼굴이 걸렸고, 그 아래에 스폰서 상표가 걸렸습니다.', k: 'big', fx: { h: 5, money: medX(s, 1) } }) },
  { id: 'kz_kn_mvp_tabloid', a: [15, 34], tags: [T('KAZ_KNIGHT', 'mvp')], w: 40, gap: 3,
    run: (s) => ({ t: '타블로이드에 제 이야기가 실렸습니다. ' + s.rng.pick(['절반은 사실이 아니었고, 나머지 절반은 제가 말한 적 없는 사실이었습니다.', '함께 찍힌 사람은 사촌이었습니다. 신문은 그렇게 쓰지 않았습니다.', '기사단 매니저가 "반응이 좋다"고 했습니다. 무엇에 대한 반응인지는 말하지 않았습니다.']), k: 'note', fx: { h: -2, standing: 2 } }) },
  { id: 'kz_kn_mvp_fans', a: [15, 34], tags: [T('KAZ_KNIGHT', 'mvp')], w: 35, gap: 2,
    run: (s) => ({ t: '경기장 밖에서 아이들이 사인을 받으러 기다렸습니다. ' + (poor(s) ? '어릴 때 제가 서 있던 자리였습니다.' : '스폰서 카드에만 사인하라는 지침이 있었습니다.') + ' 한 아이는 창 대신 빗자루를 들고 있었습니다.', k: 'warm', fx: { h: 3 } }) },
  { id: 'kz_kn_mvp_bet_seen', a: [15, 34], tags: [T('KAZ_KNIGHT', 'mvp')], w: 40, c: (s) => !s.S.flags.knBetAsked,
    run: (s) => { s.S.flags.knBetOffer = s.S.age; return { t: '경기 전날 모르는 사람이 숙소 앞에서 기다렸습니다. 배당표를 들고 있었습니다. 제 경기의 배당이었습니다.', k: 'note' }; } },
  { id: 'kz_kn_mvp_gear', a: [15, 34], tags: [T('KAZ_KNIGHT', 'mvp')], w: 35, gap: 3,
    run: (s) => ({ t: '방어구 회사가 새 갑옷을 보내왔습니다. 가볍고, 광고 상표가 다섯 군데였습니다. ' + (affIs(s, 'KAZ_KNI_INDEP') ? '독립 기사에게는 처음 있는 일이었습니다.' : '단장은 상표 위치부터 확인했습니다.'), k: 'ev', fx: { standing: 3, cap: { skill: 0.02 } } }) },
  // ── top100 기사단 ──
  { id: 'kz_kn_top_trn', a: [17, 36], tags: [T('KAZ_KNIGHT', 'top100')], w: 300, c: (s) => fresh(s, 'KAZ_KNIGHT_top100'),
    run: (s) => ({ t: (affIs(s, 'KAZ_KNI_GRAND8') ? '8대 대기사단 정식 명부에 이름이 올랐습니다.' : '기사단이 Top 100에 들었고, 제 이름이 그 명부의 기사단 칸에 적혔습니다.') + ' 챔피언 홀 복도에 제 투구가 걸렸습니다. 옆에 걸린 투구의 주인은 지난 시즌에 은퇴했습니다.', k: 'big', fx: { h: 4, money: medX(s, 2) } }) },
  { id: 'kz_kn_top_promotion', a: [17, 36], tags: [T('KAZ_KNIGHT', 'top100')], w: 45, gap: 2, rep: true,
    run: (s) => { const up = standing(s) >= 50;
      return { t: up ? '기사단이 상위 리그로 올라갔습니다. 홈 경기장이 바뀌었고, 관중석이 세 배가 되었습니다.' : '기사단이 강등 심사에 올랐습니다. 이사회는 선수 명단보다 스폰서 명단을 먼저 보았습니다.', k: up ? 'warm' : 'bad', fx: up ? { h: 3, standing: 4 } : { h: -3, standing: -4 } }; } },
  { id: 'kz_kn_top_transfer', a: [17, 36], tags: [T('KAZ_KNIGHT', 'top100')], w: 35, gap: 4,
    run: (s) => ({ t: '다른 기사단이 포인트 이전을 제안했습니다. 제 포인트를 사겠다는 뜻이었습니다. ' + (s.rng.chance(0.5) ? '단장이 먼저 값을 불렀습니다. 저는 그 자리에 없었습니다.' : '거절했습니다. 다음 시즌 선발 명단에서 제 이름이 한 칸 내려갔습니다.'), k: 'note', fx: { h: -1, money: medX(s, 0.5) } }) },
  { id: 'kz_kn_top_hall', a: [17, 36], tags: [T('KAZ_KNIGHT', 'top100')], w: 30, gap: 3,
    run: (s) => ({ t: '챔피언 홀 안내원이 제 투구 앞에서 관람객에게 설명하는 것을 들었습니다. 승률과 스폰서 이름이었습니다. 제 이름은 맨 끝에 나왔습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'kz_kn_top_logos', a: [17, 36], tags: [T('KAZ_KNIGHT', 'top100')], w: 30, gap: 3,
    run: (s) => ({ t: '갑옷의 상표가 ' + s.rng.ri(7, 12) + '개가 되었습니다. 가슴판에는 자리가 없어 등판으로 넘어갔습니다. 등을 보이지 말라는 것이 기사의 첫 가르침이었습니다.', k: 'note', fx: { money: medX(s, 1) }, f: F('감정회 기사 장비 광고 표기 규정') }) },
  // ── grand 대기사 ──
  { id: 'kz_kn_grand_trn', a: [20, 40], tags: [T('KAZ_KNIGHT', 'grand')], w: 300, c: (s) => fresh(s, 'KAZ_KNIGHT_grand'),
    run: (s) => ({ t: '대기사 서임식이 열렸습니다. 감정회 대기사장이 창끝으로 어깨를 두 번 두드렸습니다. 중계 카메라가 여덟 대였고, 가족석은 두 자리였습니다.', k: 'big', fx: { h: 6, money: medX(s, 5) } }) },
  { id: 'kz_kn_grand_final', a: [20, 40], tags: [T('KAZ_KNIGHT', 'grand')], w: 60, c: (s) => majorYear(s) && s.S.flags.knFinalYear !== s.year,
    run: (s) => { s.S.flags.knFinalYear = s.year; const win = s.rng.chance(0.25 + s.S.cap.skill * 0.1);
      return { t: majorNo(s) + '회 메이저 결승에 섰습니다. ' + (win ? '이겼습니다. 온 도시가 다섯 달 동안 제 이름을 불렀고, 저는 그동안 한 번도 혼자 걷지 못했습니다.' : '졌습니다. 상대는 작년과 같은 사람이었습니다. 준우승 상금이 지난 10년 상금을 합친 것보다 많았습니다.'), k: 'big', fx: win ? { h: 8, standing: 15, money: medX(s, 10) } : { h: -3, money: medX(s, 4) }, f: F('감정회 메이저 ' + majorNo(s) + '회 공식 기록') }; } },
  { id: 'kz_kn_grand_dinner', a: [20, 40], tags: [T('KAZ_KNIGHT', 'grand')], w: 35, gap: 3,
    run: (s) => ({ t: '상업연합회 만찬에 초대받았습니다. 이사들은 경기 이야기를 하지 않았습니다. 다음 메이저의 중계권 이야기를 했고, 저는 그 자리의 장식이었습니다.', k: 'note', fx: { cap: { ties: 0.04 }, h: -1 } }) },
  { id: 'kz_kn_grand_junior', a: [20, 40], tags: [T('KAZ_KNIGHT', 'grand')], w: 35, gap: 3,
    run: (s) => ({ t: '연습생 하나가 훈련장 구석에서 제 경기를 따라 하고 있었습니다. 열 살 때의 저와 창 잡는 손이 같았습니다. 틀린 손이었습니다. 고쳐 주었습니다.', k: 'warm', fx: { h: 3 } }) },
  { id: 'kz_kn_grand_pressure', a: [28, 40], tags: [T('KAZ_KNIGHT', 'grand')], w: 35, gap: 2,
    run: (s) => ({ t: '매니저가 은퇴 시점 이야기를 꺼냈습니다. "지금 그만두면 전설, 두 시즌 뒤에 그만두면 기록." 스폰서 쪽 문장이었습니다.', k: 'note', fx: { h: -2 } }) },
  // ── KAZ_KNIGHT 몰락 후일담 ──
  { id: 'kz_kn_fall_injured', a: [10, 45], tags: [K], w: 300, c: (s) => left(s, 'KAZ_KNIGHT', 'injured'),
    run: (s) => ({ t: '경기장에서 들것에 실려 나온 것이 마지막 경기였습니다. 감정회 명부에는 "무기한 전력 외"라고 적혔습니다. 기사단은 위로금과 함께 숙소 비우는 날짜를 알려 주었습니다.', k: 'loss', fx: { h: -5, money: medX(s, 0.5) } }) },
  { id: 'kz_kn_fall_disgrace', a: [10, 45], tags: [K], w: 300, c: (s) => left(s, 'KAZ_KNIGHT', 'disgrace'),
    run: (s) => ({ t: (s.S.flags.knFixed ? '승부조작 조사 결과가 공고되었습니다.' : '타블로이드 기사 하나가 기사단 이사회 안건이 되었습니다.') + ' 영구 제명. 챔피언 홀의 투구는 그날 밤에 내려졌고, 상표는 다음 날 떼어졌습니다.', k: 'loss', fx: { h: -8 } }) },
  { id: 'kz_kn_fall_demoted', a: [10, 40], tags: [T('KAZ_KNIGHT')], w: 250, gap: 3, c: (s) => demoted(s, 'KAZ_KNIGHT'),
    run: (s) => ({ t: '예선에서 탈락했습니다. 포인트가 깎였고, 명부의 칸이 한 줄 아래로 옮겨졌습니다. 숙소도 한 층 아래였습니다.', k: 'loss', fx: { h: -3 } }) },
  // ── 은퇴 후: 클럽 스태프 전환 서사(exits.retire.to = KAZ_STAFF) ──
  { id: 'kz_kn_retire_trn', a: [30, 50], tags: [T('KAZ_STAFF')], w: 300, c: (s) => cameFrom(s, 'KAZ_KNIGHT') && inStage(s) <= 1,
    run: (s) => { s.S.flags.knRetired = s.S.age; return { t: '은퇴 경기를 치렀습니다. 관중은 마지막 바퀴에 일어섰습니다. 다음 주 월요일, 같은 훈련장에 호루라기를 들고 나갔습니다. 연습생들은 제가 누구였는지 절반만 알았습니다.', k: 'big', fx: { h: 2 } }; } },

  // ════════════════════════════════════════════════════════════════════
  // KAZ_INFECTED 감염자 기사 — 혈투 투기장 → 승자 본선 → 칭호 (KAZ_KNIGHT 감염 시 arena 강제 전환)
  // ════════════════════════════════════════════════════════════════════
  { id: 'kz_inf_arena_trn', a: [10, 45], tags: [T('KAZ_INFECTED', 'bloodsport')], w: 400, c: (s) => cameFrom(s, 'KAZ_KNIGHT'),
    run: (s) => ({ t: s.year >= 1094 ? '판정서가 기사단에 먼저 갔습니다. 다음 날 명부의 제 줄이 감염자 참가 제도 명부로 옮겨졌습니다. 같은 창, 다른 경기장. 관중석에는 철망이 있었습니다.' : '판정서가 기사단에 먼저 갔습니다. 공식 명부에서 이름이 지워졌고, 지하 투기장 사람이 숙소 앞에서 기다리고 있었습니다. 창은 가져가도 된다고 했습니다.', k: 'loss', fx: { h: -8 } }) },
  { id: 'kz_inf_blood_fight', a: [12, 45], tags: [T('KAZ_INFECTED', 'bloodsport')], w: 55, gap: 1, rep: true,
    run: (s) => { const win = s.rng.chance(0.5 + s.S.cap.skill * 0.12);
      return { t: win ? '투기장에서 이겼습니다. 상대는 ' + s.rng.pick(['짐승이었습니다.', '얼굴을 가린 사람이었습니다. 저도 가렸습니다.', '같은 구역에 사는 사람이었습니다. 다음 날 복도에서 마주쳤습니다.']) + ' 상금은 바깥 기사의 열에 하나였습니다.' : '투기장에서 졌습니다. 살아서 나온 것으로 급료가 나왔습니다. 치료비가 급료보다 많았습니다.', k: win ? 'ev' : 'bad', fx: win ? { money: medX(s, 0.25), standing: 4 } : { hl: -7, h: -3, money: -medX(s, 0.1) } }; } },
  { id: 'kz_inf_blood_rules', a: [12, 45], tags: [T('KAZ_INFECTED', 'bloodsport')], w: 35, gap: 3,
    run: (s) => ({ t: '경기 전에 규칙을 읽어 주었습니다. 세 줄이었습니다. 바깥 경기 규정은 마흔 줄이었습니다. 없어진 서른일곱 줄이 전부 저를 지키던 줄이었습니다.', k: 'note', fx: { h: -2 }, f: F('감정회 감염자 참가 제도 시행 규칙') }) },
  { id: 'kz_inf_winner_trn', a: [14, 45], tags: [T('KAZ_INFECTED', 'winner')], w: 300, c: (s) => fresh(s, 'KAZ_INFECTED_winner'),
    run: (s) => ({ t: '승자 명단에 올라 본선 무대에 섰습니다. 관중석 한쪽에서만 환호가 났고, 다른 쪽은 조용했습니다. 중계는 제 이름 앞에 "감염자 기사"를 붙였습니다.', k: 'big', fx: { h: 3, money: medX(s, 0.8) } }) },
  { id: 'kz_inf_winner_money', a: [14, 45], tags: [T('KAZ_INFECTED', 'winner')], w: 45, gap: 2,
    run: (s) => ({ t: '상금을 받았습니다. ' + (affIs(s, 'KAZ_INF_PINUS') ? '기사단 규칙대로 절반은 구역 사람들의 신분 서류에 들어갔습니다.' : '절반은 치료비였고, 나머지 절반은 다음 경기 장비였습니다.') + ' 남은 것은 없었습니다.', k: 'ev', fx: { money: medX(s, 0.4), hl: 2 } }) },
  { id: 'kz_inf_winner_show', a: [14, 45], tags: [T('KAZ_INFECTED', 'winner')], w: 40, gap: 2,
    run: (s) => ({ t: '경기장이 봉쇄된 고층 건물로 바뀌었습니다. 함정과 짐승이 있었고, 카메라가 층마다 있었습니다. 연출이라고 했습니다. 피는 연출이 아니었습니다.', k: 'bad', fx: { hl: -4, standing: 3 } }) },
  { id: 'kz_inf_title_trn', a: [16, 45], tags: [T('KAZ_INFECTED', 'title')], w: 300, c: (s) => fresh(s, 'KAZ_INFECTED_title'),
    run: (s) => ({ t: '칭호를 받았습니다. 감염자 기사로서는 몇 안 되는 일이었습니다. 서임식은 없었고, 등기 서류 한 장이 왔습니다. 그 서류로 구역 밖에 방을 얻을 수 있었습니다.', k: 'big', fx: { h: 5, money: medX(s, 2) } }) },
  { id: 'kz_inf_title_main', a: [16, 45], tags: [T('KAZ_INFECTED', 'title')], w: 45, gap: 2,
    run: (s) => ({ t: '본선에서 바깥 기사와 붙었습니다. ' + (s.rng.chance(0.4) ? '이겼습니다. 상대 스폰서가 재경기를 요구했고, 거부되었습니다.' : '졌습니다. 관중 한 명이 철망 너머로 물병을 건네주었습니다.'), k: 'ev', fx: { standing: 3, h: 1 } }) },
  { id: 'kz_inf_title_legal', a: [16, 45], tags: [T('KAZ_INFECTED', 'title')], w: 35, gap: 3,
    run: (s) => ({ t: '상금으로 가족의 신분 서류를 샀습니다. 서류 값은 한 시즌 상금이었습니다. 바깥에서는 공짜인 종이였습니다.', k: 'warm', fx: { money: -medX(s, 1), h: 4 } }) },
  { id: 'kz_inf_fall', a: [10, 50], tags: [K], w: 300, c: (s) => left(s, 'KAZ_INFECTED', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'expel' ? '예선 명단에서 빠졌습니다. 투기장 쪽에서 더는 부르지 않았고, 구역에서는 치료비 독촉이 먼저 왔습니다.' : '투기장을 떠났습니다. 창은 두고 왔습니다. 가져가 봐야 구역 안에서는 팔 곳이 없었습니다.', k: 'loss', fx: { h: -4 } }) },

  // ════════════════════════════════════════════════════════════════════
  // KAZ_CAMPAIGN 출정 기사 — 견습 → 출정 기사 → 4급 → 2급·실버랜스 지휘관
  // ════════════════════════════════════════════════════════════════════
  { id: 'kz_cam_sq_oath', a: [12, 24], tags: [T('KAZ_CAMPAIGN', 'squire')], w: 55, gap: 4,
    run: (s) => ({ t: (s.S.status.noble ? '가문의 창을 받았습니다. 할아버지가 쓰던 것이었고, 날은 새것이었습니다.' : '가문 없는 견습은 기사단 창고의 창을 받았습니다. 자루에 전 주인의 이름이 긁혀 있었습니다.') + ' 서약은 짧았습니다. 이동도시 안으로 창을 들이지 않는다.', k: 'ev', fx: { standing: 3 } }) },
  { id: 'kz_cam_sq_march', a: [12, 24], tags: [T('KAZ_CAMPAIGN', 'squire')], w: 45, gap: 2, rep: true,
    run: (s) => ({ t: '강행군 훈련이었습니다. ' + s.rng.ri(40, 90) + 'km를 이틀에 걸었습니다. 발에서 피가 났고, 기사는 견습의 발을 보지 않습니다.', k: 'bad', fx: { hl: -3, cap: { skill: 0.03 } }, f: F('출정 기사단 견습 교범') }) },
  { id: 'kz_cam_sq_city', a: [12, 24], tags: [T('KAZ_CAMPAIGN', 'squire')], w: 35, gap: 3,
    run: (s) => ({ t: '이동도시 성문 앞까지 갔다가 돌아왔습니다. 출정 기사는 원칙상 안으로 들어가지 않습니다. 안에서는 경기 기사들의 중계 소리가 성벽을 넘어왔습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'kz_cam_sq_master', a: [12, 24], tags: [T('KAZ_CAMPAIGN', 'squire')], w: 40, gap: 3,
    run: (s) => ({ t: '모시는 기사가 ' + s.rng.pick(['말없이 창 잡는 손을 고쳐 주었습니다.', '제 갑옷 끈을 세 번 다시 묶게 했습니다.', '국경 마을 촌장과 저녁을 먹으며 저를 식탁 끝에 앉혔습니다.']) + ' 그것이 그해 받은 가르침의 전부였고, 충분했습니다.', k: 'warm', fx: { cap: { skill: 0.02 }, h: 2 } }) },
  { id: 'kz_cam_camp_trn', a: [16, 30], tags: [T('KAZ_CAMPAIGN', 'campaign')], w: 300, c: (s) => fresh(s, 'KAZ_CAMPAIGN_campaign'),
    run: (s) => ({ t: '출정 기사로 서임되었습니다. 감정회 등기에 숫자 없는 칸으로 올랐습니다. 첫 배치는 ' + (affIs(s, 'KAZ_CAM_SILVERLANCE') ? '실버랜스 페가수스 기사단 국경 초소였습니다.' : '남부 국경 순찰로였습니다.'), k: 'big', fx: { h: 4 } }) },
  { id: 'kz_cam_camp_border', a: [16, 45], tags: [T('KAZ_CAMPAIGN', 'campaign')], w: 50, gap: 2, rep: true,
    run: (s) => { const clash = s.rng.chance(0.3);
      return { t: clash ? '국경에서 교전이 있었습니다. ' + s.rng.pick(['라이타니엔 쪽 순찰대였습니다. 서로 이름을 묻지 않았습니다.', '우르수스 쪽 척후였습니다. 눈 위에 발자국만 남았습니다.', '국적 없는 무리였습니다. 창은 그런 것을 가리지 않습니다.']) : '국경 초소에서 겨울을 났습니다. 눈이 사람보다 많았고, 편지는 봄에 한 번 왔습니다.', k: clash ? 'bad' : 'note', fx: clash ? { hl: -4, standing: 5 } : { h: -1, standing: 2 } }; } },
  { id: 'kz_cam_camp_tax', a: [16, 45], tags: [T('KAZ_CAMPAIGN', 'campaign')], w: 35, gap: 3, c: (s) => !s.S.flags.camTaxAsked,
    run: (s) => { s.S.flags.camTaxOffer = s.S.age; return { t: '국경 마을을 지나며 보호세 장부를 받았습니다. 기사단 몫과 기사 몫이 따로 적혀 있었습니다. 촌장은 두 칸을 다 채우고 저를 보았습니다.', k: 'note' }; } },
  { id: 'kz_cam_camp_village', a: [16, 45], tags: [T('KAZ_CAMPAIGN', 'campaign')], w: 35, gap: 3,
    run: (s) => ({ t: '국경 마을에서 재앙 대피를 도왔습니다. 마을 사람들은 기사에게 인사했고, 기사단 깃발에는 인사하지 않았습니다. 그 차이를 그날 배웠습니다.', k: 'warm', fx: { h: 2, standing: 3 } }) },
  { id: 'kz_cam_fourth_trn', a: [20, 45], tags: [T('KAZ_CAMPAIGN', 'fourth')], w: 300, c: (s) => fresh(s, 'KAZ_CAMPAIGN_fourth'),
    run: (s) => ({ t: '감정회 4급 기사로 등기되었습니다. 중간 등급이라고 했습니다. 아래로 둘, 위로 둘. 급여 통지서의 숫자가 두 배가 되었고, 순찰 구역도 두 배가 되었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'kz_cam_fourth_squad', a: [20, 50], tags: [T('KAZ_CAMPAIGN', 'fourth')], w: 45, gap: 2,
    run: (s) => ({ t: '견습 둘을 받았습니다. ' + s.rng.pick(['하나는 가문 출신이었고 하나는 아니었습니다. 창은 같은 창고에서 나왔습니다.', '둘 다 메이저 중계를 보고 자란 아이들이었습니다. 출정 기사에게는 중계가 없다고 먼저 말해 주었습니다.', '한 아이는 첫 강행군에서 울었습니다. 저는 보지 않았습니다. 그것이 제가 배운 방식이었습니다.']), k: 'ev', fx: { cap: { ties: 0.03 }, standing: 2 } }) },
  { id: 'kz_cam_fourth_truce', a: [20, 50], tags: [T('KAZ_CAMPAIGN', 'fourth')], w: 30, gap: 4,
    run: (s) => ({ t: '겨울 휴전 기간에 국경 반대편 초소와 술을 나눴습니다. 서로의 언어로 건배를 했고, 봄이 오자 다시 서로를 겨눴습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'kz_cam_fourth_missing', a: [20, 50], tags: [T('KAZ_CAMPAIGN', 'fourth')], w: 30, gap: 4,
    run: (s) => ({ t: '같은 기사단 기사 하나가 순찰에서 돌아오지 않았습니다. 타블로이드가 하루 실었다가 다음 날 기사를 내렸습니다. 기사단은 그 이름을 명부에서 옮기지 않았습니다.', k: 'bad', fx: { h: -3 } }) },
  { id: 'kz_cam_second_trn', a: [26, 55], tags: [T('KAZ_CAMPAIGN', 'second')], w: 300, c: (s) => fresh(s, 'KAZ_CAMPAIGN_second'),
    run: (s) => ({ t: affIs(s, 'KAZ_CAM_SILVERLANCE') ? '실버랜스 페가수스 기사단 지휘관이 되었습니다. 깃발을 받았고, 깃발은 저보다 오래된 것이었습니다.' : '2급 기사로 등기되었습니다. 2급은 은퇴한 노병의 등급입니다. 더 올라갈 칸이 없었고, 그것이 상이었습니다.', k: 'big', fx: { h: 4 } }) },
  { id: 'kz_cam_second_command', a: [26, 60], tags: [T('KAZ_CAMPAIGN', 'second')], w: 45, gap: 2,
    run: (s) => ({ t: '출정 명령서에 제 서명이 들어갔습니다. ' + s.rng.pick(['돌아온 사람 수를 세는 것이 지휘관의 일이었습니다.', '명령서 한 장에 기사 서른의 겨울이 걸려 있었습니다.', '서명 뒤에 감정회 도장이 찍혔습니다. 도장이 제 서명보다 컸습니다.']), k: 'ev', fx: { standing: 3, h: -1 } }) },
  { id: 'kz_cam_second_council', a: [26, 60], tags: [T('KAZ_CAMPAIGN', 'second')], w: 30, gap: 4,
    run: (s) => ({ t: '국민원 청문회에 불려 갔습니다. 국경 예산 이야기였습니다. 의원들은 메이저 중계권 금액을 알았고, 국경 초소 수는 몰랐습니다.', k: 'note', fx: { h: -2 } }) },
  { id: 'kz_cam_second_old', a: [30, 60], tags: [T('KAZ_CAMPAIGN', 'second')], w: 30, gap: 4,
    run: (s) => ({ t: '옛 견습이 4급 기사로 찾아왔습니다. 창 잡는 손이 제가 고쳐 준 그대로였습니다. 그날 저녁은 제가 샀습니다.', k: 'warm', fx: { h: 4 } }) },
  { id: 'kz_cam_fall', a: [12, 60], tags: [K], w: 300, c: (s) => left(s, 'KAZ_CAMPAIGN', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'injured' ? '국경에서 다쳐 실려 왔습니다. 감정회 등기에 "부상 퇴역"이 찍혔습니다. 창은 기사단 창고로 돌아갔고, 흉터는 돌아가지 않았습니다.' : s.S.flags.lastTrackHow === 'exile' ? '순찰에서 돌아오지 않은 것으로 처리되었습니다. 실제로는 국경 반대편에 있었습니다. 어느 쪽 기록이 맞는지는 저만 압니다.' : '기사단을 떠났습니다. 등기의 제 칸은 비워지지 않고 줄이 그어졌습니다.', k: 'loss', fx: { h: -5 } }) },

  // ════════════════════════════════════════════════════════════════════
  // KAZ_LABOR 상업 도시 저임금 노동 — 일용 → 공장 → 반장
  // ════════════════════════════════════════════════════════════════════
  { id: 'kz_lab_day_market', a: [14, 50], tags: [T('KAZ_LABOR', 'daylabor')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: '새벽 인력 시장에 섰습니다. ' + s.rng.pick(['경기장 관중석 청소였습니다. 떨어진 스폰서 전단이 한 자루였습니다.', '플레이트 접합부 녹 제거였습니다. 안전띠는 둘에 하나였습니다.', '아무도 부르지 않았습니다. 점심은 걸렀습니다.']), k: s.rng.chance(0.3) ? 'bad' : 'note', fx: { money: medX(s, 0.03), hl: -1 } }) },
  { id: 'kz_lab_day_major', a: [14, 50], tags: [T('KAZ_LABOR', 'daylabor')], w: 50, c: (s) => majorYear(s) && s.S.flags.labMajor !== s.year,
    run: (s) => { s.S.flags.labMajor = s.year; return { t: '메이저 기간이었습니다. 일거리가 세 배였습니다. 관중석 아래에서 다섯 달을 일했고, 경기는 한 번도 보지 못했습니다. 소리로만 알았습니다.', k: 'ev', fx: { money: medX(s, 0.3), hl: -2 } }; } },
  { id: 'kz_lab_day_points', a: [14, 30], tags: [T('KAZ_LABOR', 'daylabor')], w: 40, c: (s) => s.S.cap.skill >= 0.3 && !s.S.flags.labPitAsked,
    run: (s) => { s.S.flags.labPitOffer = s.S.age; return { t: '같이 일하던 사람이 지하 투기장 이야기를 했습니다. 포인트를 모으면 등록소가 받아 준다고 했습니다. 그 사람 손등에 흉터가 셋이었습니다.', k: 'note' }; } },
  { id: 'kz_lab_day_rent', a: [14, 50], tags: [T('KAZ_LABOR', 'daylabor')], w: 35, gap: 3,
    run: (s) => ({ t: '플레이트 임대료가 올랐습니다. 집주인은 메이저 때문이라고 했습니다. 메이저가 끝나도 내려가지 않았습니다.', k: 'bad', fx: { money: -medX(s, 0.1), h: -2 } }) },
  { id: 'kz_lab_fac_trn', a: [16, 55], tags: [T('KAZ_LABOR', 'factory')], w: 300, c: (s) => fresh(s, 'KAZ_LABOR_factory'),
    run: (s) => ({ t: (affIs(s, 'KAZ_LAB_ZBONEK') ? '즈보넉 공장' : '공장') + ' 정규 명부에 올랐습니다. 날품 대신 주급이 되었습니다. 교대표에 제 이름이 인쇄되어 나온 것이 처음이었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'kz_lab_fac_line', a: [16, 60], tags: [T('KAZ_LABOR', 'factory')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['갑옷 부품 라인이었습니다. 메이저가 다가오면 기사 갑옷, 끝나면 장난감 갑옷을 찍었습니다.', '교대가 열두 시간이었습니다. 라인 끝에 중계 화면이 있었고, 소리는 꺼져 있었습니다.', '옆 라인 사람이 손가락을 잃었습니다. 다음 날 그 자리에 새 사람이 서 있었습니다.']), k: 'note', fx: { hl: -2 } }) },
  { id: 'kz_lab_fac_zbonek', a: [16, 60], tags: [T('KAZ_LABOR', 'factory'), 'aff:KAZ_LAB_ZBONEK'], w: 35, gap: 3,
    run: (s) => ({ t: '즈보넉은 라이타니엔 국경 도시입니다. 공장 굴뚝 너머로 국경 초소가 보였고, 초소 너머는 다른 나라였습니다. 임금은 그쪽이 더 높다고들 했습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'kz_lab_fac_oldknight', a: [16, 60], tags: [T('KAZ_LABOR', 'factory')], w: 30, gap: 4,
    run: (s) => ({ t: '같은 라인에 은퇴한 경기 기사가 있었습니다. 열여섯 강까지 갔다고 했습니다. 손은 저보다 느렸고, 상표 박힌 갑옷 부품을 아무 말 없이 조립했습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'kz_lab_fore_trn', a: [20, 60], tags: [T('KAZ_LABOR', 'foreman')], w: 300, c: (s) => fresh(s, 'KAZ_LABOR_foreman'),
    run: (s) => ({ t: '반장이 되었습니다. 교대표를 제가 짰습니다. 처음 짠 교대표에서 제 이름을 맨 힘든 칸에 넣었습니다. 두 번째부터는 그러지 않았습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'kz_lab_fore_quota', a: [20, 60], tags: [T('KAZ_LABOR', 'foreman')], w: 45, gap: 2,
    run: (s) => ({ t: '메이저 전 납품 할당이 내려왔습니다. 라인 사람들에게 말했고, 사람들은 저를 보았습니다. 할당을 내린 사람은 보지 못했습니다.', k: 'bad', fx: { h: -3, standing: 2 } }) },
  { id: 'kz_lab_fore_accident', a: [20, 60], tags: [T('KAZ_LABOR', 'foreman')], w: 35, gap: 3,
    run: (s) => ({ t: '라인에서 사고가 났습니다. 보고서에 제 서명이 들어갔습니다. 사고 원인 칸에 "작업자 부주의"가 인쇄되어 있었습니다. 지울 수 없는 칸이었습니다.', k: 'bad', fx: { h: -4 } }) },
  { id: 'kz_lab_fore_kid', a: [20, 60], tags: [T('KAZ_LABOR', 'foreman')], w: 30, gap: 3,
    run: (s) => ({ t: '라인의 어린 노동자가 메이저 중계를 보고 싶다고 했습니다. 결승 날 그 라인의 소리를 켰습니다. 그날 할당은 못 채웠고, 아무도 말하지 않았습니다.', k: 'warm', fx: { h: 3, standing: -1 } }) },
  { id: 'kz_lab_fall', a: [14, 65], tags: [K], w: 300, c: (s) => left(s, 'KAZ_LABOR', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'injured' ? '공장 사고였습니다. 회사는 치료비 대신 합의서를 보냈습니다. 합의서에는 라인에 돌아올 수 없다는 조항이 있었습니다.' : s.S.flags.lastTrackHow === 'infected' ? '건강 검진에서 결정이 나왔습니다. 공장은 그날로 출입증을 회수했습니다. 지하 거주구 주소가 적힌 안내문이 함께 왔습니다.' : '감원 명단에 올랐습니다. 메이저가 끝난 다음 달이었습니다. 늘 그 달이었습니다.', k: 'loss', fx: { h: -5 } }) },

  // ════════════════════════════════════════════════════════════════════
  // KAZ_FARM 남부 농민 — 소작 → 자영 → 마을 자치
  // ════════════════════════════════════════════════════════════════════
  { id: 'kz_farm_ten_rent', a: [12, 50], tags: [T('KAZ_FARM', 'tenant')], w: 50, gap: 1, rep: true,
    run: (s) => { const good = s.rng.chance(0.5);
      return { t: good ? '수확이 괜찮았습니다. 소작료를 내고 남은 호밀로 겨울을 났습니다.' : '수확이 나빴습니다. 소작료는 같았습니다. 지주 쪽 서기는 숫자만 보고 하늘은 보지 않았습니다.', k: good ? 'warm' : 'bad', fx: good ? { h: 2, money: medX(s, 0.1) } : { h: -3, money: -medX(s, 0.1) } }; } },
  { id: 'kz_farm_ten_gale', a: [12, 50], tags: [T('KAZ_FARM', 'tenant')], w: 35, gap: 3,
    run: (s) => ({ t: '게일 산업 사람들이 밭을 재고 갔습니다. 측량이라고 했습니다. 지주도 무엇을 재는지 몰랐습니다.', k: 'note', fx: { h: -2 } }) },
  { id: 'kz_farm_ten_broadcast', a: [12, 50], tags: [T('KAZ_FARM', 'tenant')], w: 35, c: (s) => majorYear(s) && s.S.flags.farmMajor !== s.year,
    run: (s) => { s.S.flags.farmMajor = s.year; return { t: '메이저 결승 날 마을 회관에 중계 단말기가 켜졌습니다. 온 마을이 모였습니다. 결승이 끝나자 단말기는 다음 메이저까지 창고로 들어갔습니다.', k: 'warm', fx: { h: 3 } }; } },
  { id: 'kz_farm_ten_register', a: [12, 22], tags: [T('KAZ_FARM', 'tenant')], w: 30, c: (s) => s.S.cap.skill >= 0.5,
    run: (s) => ({ t: '옆 마을 아이가 카봐렐리엘키 등록소까지 걸어갔다고 했습니다. 사흘 길이었습니다. 돌아왔다는 말은 듣지 못했습니다. 돌아올 이유가 없었거나, 돌아올 수 없었거나.', k: 'note', fx: { h: -1 } }) },
  { id: 'kz_farm_own_trn', a: [18, 60], tags: [T('KAZ_FARM', 'own')], w: 300, c: (s) => fresh(s, 'KAZ_FARM_own'),
    run: (s) => ({ t: '밭 문서에 제 이름이 올랐습니다. ' + (affIs(s, 'KAZ_FARM_BORDER') ? '국경 마을이라 등기소가 멀었습니다. 문서를 받으러 이틀을 걸었습니다.' : '등기소 직원은 문서보다 게일 산업 지도를 먼저 펼쳤습니다. 제 밭은 지도 가장자리에 있었습니다.'), k: 'big', fx: { h: 4 } }) },
  { id: 'kz_farm_own_harvest', a: [18, 65], tags: [T('KAZ_FARM', 'own')], w: 45, gap: 1, rep: true,
    run: (s) => { const good = s.rng.chance(0.55);
      return { t: good ? '제 밭에서 제 호밀을 거뒀습니다. 피에로기 속에 넣을 것이 넉넉했습니다.' : '우박이 왔습니다. 제 밭이라 제 손해였습니다. 지주가 없다는 것은 그런 뜻이기도 했습니다.', k: good ? 'warm' : 'bad', fx: good ? { h: 3, money: medX(s, 0.15) } : { h: -3, money: -medX(s, 0.15) } }; } },
  { id: 'kz_farm_own_offer', a: [18, 65], tags: [T('KAZ_FARM', 'own')], w: 40, c: (s) => !s.S.flags.farmSellAsked,
    run: (s) => { s.S.flags.farmSellOffer = s.S.age; return { t: '게일 산업에서 사람이 왔습니다. 밭값을 불렀습니다. 시세의 두 배였고, 거절하면 내년에 절반이 된다고 했습니다.', k: 'note' }; } },
  { id: 'kz_farm_own_border', a: [18, 65], tags: [T('KAZ_FARM', 'own'), 'aff:KAZ_FARM_BORDER'], w: 35, gap: 3,
    run: (s) => ({ t: '국경 너머에서 총소리가 났습니다. 출정 기사단은 사흘 뒤에 왔습니다. 그동안 마을은 스스로를 지켰고, 그것이 늘 그랬던 방식이었습니다.', k: 'bad', fx: { h: -3, hl: -1 } }) },
  { id: 'kz_farm_vil_trn', a: [25, 70], tags: [T('KAZ_FARM', 'village')], w: 300, c: (s) => fresh(s, 'KAZ_FARM_village'),
    run: (s) => ({ t: '마을 회의에서 촌장으로 뽑혔습니다. 할 일은 둘이었습니다. 게일 산업과 이야기하는 것, 그리고 게일 산업과 이야기하지 않는 것.', k: 'big', fx: { h: 3 } }) },
  { id: 'kz_farm_vil_sale', a: [25, 70], tags: [T('KAZ_FARM', 'village')], w: 40, gap: 4,
    run: (s) => ({ t: '마을 땅을 주민들에게 나눠 팔았습니다. 회사가 통째로 사기 전에. 밭은 못 지켰지만 집터는 지켰습니다. 서류가 ' + s.rng.ri(40, 90) + '장이었습니다.', k: 'ev', fx: { standing: 5, h: 2 }, f: orgF(s, '남부 농지 등기 변경 기록, ' + s.year + '년') }) },
  { id: 'kz_farm_vil_knight', a: [25, 70], tags: [T('KAZ_FARM', 'village')], w: 35, gap: 3,
    run: (s) => ({ t: '출정 기사단이 보호세를 걷으러 왔습니다. 장부를 보여 주었습니다. 기사는 장부를 보고, 저는 기사를 보았습니다. 서로 할 말이 없었습니다.', k: 'note', fx: { money: -medX(s, 0.1) } }) },
  { id: 'kz_farm_vil_festival', a: [25, 70], tags: [T('KAZ_FARM', 'village')], w: 35, gap: 2,
    run: (s) => ({ t: '수확 뒤 마을 잔치를 열었습니다. 보드카 한 통, 피에로기 세 솥. 젊은 사람은 절반이 도시로 떠났고, 남은 절반이 두 배로 먹었습니다.', k: 'warm', fx: { h: 4 } }) },
  { id: 'kz_farm_fall', a: [12, 70], tags: [K], w: 300, c: (s) => (left(s, 'KAZ_FARM', null) && s.S.flags.lastTrackHow !== 'retire' || demoted(s, 'KAZ_FARM')),
    run: (s) => ({ t: s.S.flags.lastFall === 'ruin' ? '밭을 잃었습니다. 등기소 문서의 소유자 칸이 회사 이름으로 바뀌었습니다. 같은 밭에서 이제 품삯을 받고 일했습니다.' : '마을이 습격을 받았습니다. 돌아왔을 때 밭은 그대로였고, 집은 그대로가 아니었습니다.', k: 'loss', fx: { h: -5 } }) },

  // ════════════════════════════════════════════════════════════════════
  // KAZ_AU 아머레스 유니온 — 다크스틸 → 라주라이트 → 플래티넘 (모집 결정으로만 진입)
  // ════════════════════════════════════════════════════════════════════
  { id: 'kz_au_dark_trn', a: [16, 45], tags: [T('KAZ_AU', 'darksteel')], w: 400, c: (s) => inStage(s) <= 1,
    run: (s) => ({ t: '첫 임무를 받았습니다. 이름 하나, 장소 하나, 날짜 하나. 왜는 없었습니다. 왜를 묻지 않는 것이 첫 임무였습니다.', k: 'bad', fx: { h: -3 } }) },
  { id: 'kz_au_dark_job', a: [16, 50], tags: [T('KAZ_AU', 'darksteel')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['숨은 규칙을 어긴 기사였습니다. 경기장 밖 골목에서 일이 끝났습니다. 다음 날 중계는 "부상"이라고 했습니다.', '구역 밖으로 나온 감염자였습니다. 일은 짧았고, 밤은 길었습니다.', '임무가 취소되었습니다. 그 기사가 스폰서를 바꿨다고 했습니다. 규칙은 그런 것이었습니다.']), k: 'bad', fx: { money: medX(s, 0.4), h: -3 } }) },
  { id: 'kz_au_dark_face', a: [16, 50], tags: [T('KAZ_AU', 'darksteel')], w: 30, gap: 3,
    run: (s) => ({ t: '같은 조 사람의 얼굴을 1년 만에 처음 보았습니다. 가면을 벗은 자리에서 서로 모르는 척했고, 그것이 예의였습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'kz_au_laz_trn', a: [20, 50], tags: [T('KAZ_AU', 'lazurite')], w: 300, c: (s) => fresh(s, 'KAZ_AU_lazurite'),
    run: (s) => ({ t: '라주라이트가 되었습니다. 다크스틸 셋이 제 아래에 왔습니다. 명령은 위에서 내려왔고, 저는 중간에서 그것을 세 조각으로 나누는 사람이 되었습니다.', k: 'big', fx: { h: 1 } }) },
  { id: 'kz_au_laz_order', a: [20, 55], tags: [T('KAZ_AU', 'lazurite')], w: 45, gap: 2,
    run: (s) => ({ t: '상업연합회 쪽에서 명단이 내려왔습니다. ' + s.rng.pick(['이름 셋. 하나는 아는 이름이었습니다.', '이름 하나. 대기사였습니다. 명단에 등급은 없었습니다.', '이름 둘. 하나는 지워져 있었습니다. 지운 사람이 누군지는 묻지 않았습니다.']), k: 'bad', fx: { h: -3, standing: 3 } }) },
  { id: 'kz_au_laz_shampoo', a: [20, 55], tags: [T('KAZ_AU', 'lazurite'), 'aff:KAZ_AU_SHAMPOO'], w: 35, gap: 3,
    run: (s) => ({ t: '회사 이름이 바뀌었습니다. 샴푸 회사였습니다. 명함이 새로 나왔고, 하는 일은 그대로였습니다. 샴푸는 한 번도 보지 못했습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'kz_au_plat_trn', a: [26, 55], tags: [T('KAZ_AU', 'platinum')], w: 300, c: (s) => fresh(s, 'KAZ_AU_platinum'),
    run: (s) => ({ t: '플래티넘이 되었습니다. 전임자가 어떻게 되었는지는 듣지 못했습니다. 듣지 못한 것이 답이었습니다.', k: 'big', fx: { h: -2, money: medX(s, 2) } }) },
  { id: 'kz_au_plat_council', a: [26, 60], tags: [T('KAZ_AU', 'platinum')], w: 40, gap: 2,
    run: (s) => ({ t: '상업연합회 이사와 직접 만났습니다. 이사는 제 얼굴을 보지 않았고, 저는 이사의 얼굴을 외웠습니다. 둘 다 그 자리에 어울리는 태도였습니다.', k: 'note', fx: { cap: { ties: 0.03 } } }) },
  { id: 'kz_au_plat_doubt', a: [26, 60], tags: [T('KAZ_AU', 'platinum')], w: 35, gap: 3,
    run: (s) => ({ t: '명단의 이름 하나를 지우고 싶었습니다. 지우지 않았습니다. 지운 전임자가 어떻게 되었는지를 그 순간 알 것 같았습니다.', k: 'bad', fx: { h: -4 } }) },
  { id: 'kz_au_fall', a: [16, 65], tags: [K], w: 300, c: (s) => left(s, 'KAZ_AU', null),
    run: (s) => ({ t: '유니온을 떠났습니다. 떠난 사람은 없다고들 하지만, 저는 떠났습니다. 가면은 두고 왔고, 이름은 바꿨습니다.', k: 'loss', fx: { h: -5 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 나머지 진로(단계마다 2개 + 전환 1 + 몰락 후일담 1)
  // ════════════════════════════════════════════════════════════════════
  // ── KAZ_SLAVE 노예 → 해방 → 감정회 기사 ──
  // 진입: 원형 A5 기본값이 forced 라 엔진 진입 롤에서 빠진다(KAZ_GHETTO 도 같다). 아래 두 이벤트가 콘텐츠 쪽 입구.
  { id: 'kz_sla_enter', a: [3, 8], tags: [K, 'q1', '!track:KAZ_SLAVE', '!rhodes'], w: 300, c: (s) => !s.S.track && !s.S.status.slave && !s.S.flags.slaveRolled && !!s.data.trackById.KAZ_SLAVE,
    run: (s) => { s.S.flags.slaveRolled = true; if (!s.rng.chance(0.3)) return { t: '옆집 아이의 어깨에 자국이 찍혔습니다. 팔려 간다고 했습니다. 어머니가 제 어깨를 오래 문질렀습니다.', k: 'note', fx: { h: -1 } };
      s.S.status.slave = true; if (!s.enterTrack('KAZ_SLAVE', { how: 'forced', via: s.rng.chance(0.5) ? 'born' : 'sold', quiet: true })) return null;
      return { t: '어깨에 자국이 찍혔습니다. ' + (s.S.track.flags.via === 'born' ? '집안이 대대로 그 자국이었습니다.' : '빚 대신이었습니다. 부모의 빚이었고, 어깨는 제 것이었습니다.') + ' 등기소 장부에 이름 대신 번호가 올랐습니다.', k: 'loss', fx: { h: -6 } }; } },
  { id: 'kz_ghe_enter', a: [10, 60], tags: [K, 'urban', '!track:KAZ_GHETTO', '!track:KAZ_INFECTED', '!rhodes', '!prison:camp', '!prison:jail'], w: 200, c: (s) => !s.S.track && !s.S.flags.ghettoRolled && !!s.data.trackById.KAZ_GHETTO && (known(s) || (s.S.q === 1 && s.S.age >= 12 && (s.S.flags.joblessYears || 0) >= 1)),
    run: (s) => { s.S.flags.ghettoRolled = true; if (!known(s) && !s.rng.chance(0.5)) return null;
      if (!s.enterTrack('KAZ_GHETTO', { how: 'forced', via: known(s) ? 'fallen' : 'born', quiet: true })) return null;
      return { t: known(s) ? '판정서가 나온 뒤 플레이트 위층 거주 허가가 취소되었습니다. 지하 거주구 주소가 적힌 안내문이 왔습니다. 안내문은 친절했고, 계단은 길었습니다.' : '위층 방세를 더는 낼 수 없었습니다. 지하 거주구로 내려갔습니다. 계단 끝에서 검문이 있었고, 들어가는 쪽은 묻지 않았습니다.', k: 'loss', fx: { h: -5 } }; } },
  { id: 'kz_sla_mark', a: [5, 60], tags: [T('KAZ_SLAVE', 'slave')], w: 50, gap: 2, rep: true,
    run: (s) => ({ t: s.rng.pick(['어깨의 자국을 등기소 직원이 읽었습니다. 이름보다 먼저 읽히는 것이었습니다.', '주인집 손님이 왔습니다. 손님은 저를 보지 않았고, 그것이 집의 규칙이었습니다.', '시장에서 값이 매겨졌습니다. 작년보다 조금 올랐다고 했습니다. 기뻐해야 할지 몰랐습니다.']), k: 'bad', fx: { h: -2 } }) },
  { id: 'kz_sla_work', a: [5, 60], tags: [T('KAZ_SLAVE', 'slave')], w: 45, gap: 2,
    run: (s) => ({ t: (affIs(s, 'KAZ_SLA_ASK') ? '감정회 쪽 사람이 저를 오래 보았습니다. 싸움을 시켜 보았고, 아무 말 없이 돌아갔습니다.' : '주인집 마구간과 부엌을 오갔습니다. 하루는 종이 아홉 번 울렸습니다.'), k: 'note', fx: affIs(s, 'KAZ_SLA_ASK') ? { cap: { skill: 0.03 } } : { hl: -1 } }) },
  { id: 'kz_sla_freed_trn', a: [10, 60], tags: [T('KAZ_SLAVE', 'freed')], w: 400, c: (s) => fresh(s, 'KAZ_SLAVE_freed'),
    run: (s) => ({ t: '해방 문서를 받았습니다. 자국은 그대로였습니다. 문서는 주머니에 있었고, 자국은 어깨에 있었습니다. 사람들은 주머니를 보지 않았습니다.', k: 'big', fx: { h: 5 } }) },
  { id: 'kz_sla_freed_job', a: [10, 60], tags: [T('KAZ_SLAVE', 'freed')], w: 45, gap: 2,
    run: (s) => ({ t: '일자리를 찾았습니다. 옷을 벗을 필요가 없는 일만 골랐습니다. 그런 일은 품삯이 낮았습니다.', k: 'note', fx: { money: medX(s, 0.05), h: -1 } }) },
  { id: 'kz_sla_freed_ask', a: [14, 45], tags: [T('KAZ_SLAVE', 'freed'), 'aff:KAZ_SLA_ASK'], w: 40, gap: 3,
    run: (s) => ({ t: '감정회에서 훈련 자리를 주었습니다. 새벽에 창, 저녁에 글. 둘 다 처음이었고, 둘 다 어깨가 아팠습니다.', k: 'ev', fx: { cap: { skill: 0.04, learn: 0.02 } } }) },
  { id: 'kz_sla_ask_trn', a: [18, 60], tags: [T('KAZ_SLAVE', 'ask')], w: 400, c: (s) => fresh(s, 'KAZ_SLAVE_ask'),
    run: (s) => ({ t: '감정회 4급 기사로 등기되었습니다. 어깨에 자국이 있는 기사는 드물었습니다. 등기 서류의 비고란은 비어 있었습니다. 비워 둔 사람에게 고마웠습니다.', k: 'big', fx: { h: 6 } }) },
  { id: 'kz_sla_ask_corridor', a: [18, 65], tags: [T('KAZ_SLAVE', 'ask')], w: 45, gap: 2,
    run: (s) => ({ t: '감정회 복도를 소리 없이 걷는 법은 주인집에서 배운 것이었습니다. 그 걸음이 이제 급료가 되었습니다.', k: 'note', fx: { standing: 2 } }) },
  { id: 'kz_sla_ask_old', a: [18, 65], tags: [T('KAZ_SLAVE', 'ask')], w: 35, gap: 4,
    run: (s) => ({ t: '옛 주인집 앞을 경호 임무로 지나갔습니다. 집은 그대로였고, 저는 그대로가 아니었습니다. 문은 열리지 않았습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'kz_sla_fall', a: [5, 65], tags: [K], w: 300, c: (s) => left(s, 'KAZ_SLAVE', null),
    run: (s) => ({ t: '어깨의 자국이 아직 남아 있는 채로 거리로 나왔습니다. 등기소는 제 줄을 어디에 둘지 몰라 했습니다.', k: 'loss', fx: { h: -4 } }) },
  // ── KAZ_GHETTO 지하 거주구 → 일용 → 0구역 이송 통지 ──
  { id: 'kz_ghe_res_dark', a: [10, 70], tags: [T('KAZ_GHETTO', 'resident')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['지하 거주구의 낮은 전등 밝기로 정해졌습니다. 전기가 끊기면 밤이었습니다.', '위층 플레이트의 경기 소리가 천장을 타고 내려왔습니다. 누가 이겼는지는 발 구르는 소리로 알았습니다.', '구역 입구 검문이 늘었습니다. 나가는 사람보다 들어오는 사람을 더 세었습니다.']), k: 'note', fx: { h: -2 } }) },
  { id: 'kz_ghe_res_split', a: [10, 70], tags: [T('KAZ_GHETTO', 'resident')], w: 40, c: (s) => s.year >= 1094,
    run: (s) => ({ t: s.year === 1094 ? '플레이트가 갈라지면서 지하 거주구가 하늘 아래 드러났습니다. 위에서 내려다보는 얼굴들을 처음 보았습니다. 그 얼굴들도 저희를 처음 보았습니다.' : '갈라진 플레이트 틈으로 하늘이 보이는 자리가 생겼습니다. 그 자리에 사람이 몰렸고, 위에서는 철망을 쳤습니다.', k: 'bad', fx: { h: -2 } }) },
  { id: 'kz_ghe_day_trn', a: [12, 70], tags: [T('KAZ_GHETTO', 'daylabor')], w: 300, c: (s) => fresh(s, 'KAZ_GHETTO_daylabor'),
    run: (s) => ({ t: '구역 밖 일거리를 받았습니다. 아침에 올라가고 저녁에 내려왔습니다. 올라갈 때 검문, 내려올 때 검문. 품삯은 위층 사람의 절반이었습니다.', k: 'ev', fx: { money: medX(s, 0.05) } }) },
  { id: 'kz_ghe_day_work', a: [12, 70], tags: [T('KAZ_GHETTO', 'daylabor')], w: 45, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['경기장 하수관 청소였습니다. 위층은 축제였고, 아래층은 하수였습니다.', '플레이트 접합부 용접 보조였습니다. 불꽃이 얼굴에 튀었고, 장갑은 없었습니다.', '오그니스코 빈민가 철거 작업이었습니다. 제 구역과 닮은 곳을 제 손으로 허물었습니다.']), k: 'note', fx: { money: medX(s, 0.04), hl: -2 } }) },
  { id: 'kz_ghe_day_ognisko', a: [12, 70], tags: [T('KAZ_GHETTO', 'daylabor'), 'aff:KAZ_GHE_OGNISKO'], w: 35, gap: 3,
    run: (s) => ({ t: '오그니스코는 장인의 도시였습니다. 빈민가에서도 쇠 두드리는 소리가 났습니다. 그 소리를 따라가 보조 일을 얻었습니다. 손이 조금 늘었습니다.', k: 'ev', fx: { cap: { skill: 0.03 } } }) },
  { id: 'kz_ghe_day_zero', a: [12, 80], tags: [T('KAZ_GHETTO', 'daylabor'), 'known'], w: 60, gap: 2, c: (s) => s.year >= 1094 && inStage(s) >= 2 && s.rng.chance(0.3),
    run: (s) => { if (!s.promote({ force: true, quiet: true })) return null; return { t: '구역 관리소가 감염자 명부를 다시 만들었습니다. 1094년 뒤로 매년 그랬습니다. 이번 명부에는 제 이름 옆에 번호가 하나 더 붙었습니다. 0으로 시작하는 번호였습니다.', k: 'bad', fx: { h: -3 } }; } },
  { id: 'kz_ghe_notice_trn', a: [12, 80], tags: [T('KAZ_GHETTO', 'notice')], w: 500, c: (s) => fresh(s, 'KAZ_GHETTO_notice'),
    run: (s) => ({ t: '0구역 이송 통지서가 왔습니다. 감염자 수용 플랫폼이라고 적혀 있었습니다. 간 사람은 많았고, 돌아온 사람 이야기는 들은 적이 없었습니다.', k: 'loss', fx: { h: -8 } }) },
  { id: 'kz_ghe_notice_wait', a: [12, 80], tags: [T('KAZ_GHETTO', 'notice')], w: 50, gap: 1, rep: true,
    run: (s) => ({ t: s.rng.pick(['이송 날짜가 미뤄졌습니다. 이유는 없었습니다. 미뤄진 것이 좋은 일인지 몰랐습니다.', '0구역행 차량이 구역 입구에 섰습니다. 이름을 불렀고, 제 이름은 아니었습니다. 그날은.', '통지서를 다시 읽었습니다. 글자가 바뀌지는 않았습니다.']), k: 'bad', fx: { h: -3 } }) },
  { id: 'kz_ghe_notice_rumor', a: [12, 80], tags: [T('KAZ_GHETTO', 'notice')], w: 30, gap: 2,
    run: (s) => ({ t: '0구역에서 편지가 왔다는 사람이 있었습니다. 편지는 보지 못했습니다. 편지가 있었다는 말만 구역을 돌았습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'kz_ghe_fall', a: [10, 80], tags: [K], w: 300, c: (s) => left(s, 'KAZ_GHETTO', null),
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'prison' ? '검문에서 붙잡혔습니다. 구역 밖에 있었다는 것이 죄목이었습니다.' : '구역 명부에서 이름이 빠졌습니다. 어디로 갔다는 기록은 없었습니다.', k: 'loss', fx: { h: -4 } }) },
  // ── KAZ_STAFF 기사 클럽 스태프: 인스트럭터 → 코치 → 매니저 ──
  { id: 'kz_sta_ins_whistle', a: [25, 60], tags: [T('KAZ_STAFF', 'instructor')], w: 45, gap: 2,
    run: (s) => ({ t: '연습생 스무 명에게 창 잡는 법을 가르쳤습니다. 열아홉은 스폰서 카메라를 보고 있었습니다. 한 명이 창을 보고 있었습니다. 그 아이 이름을 적어 두었습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }) },
  { id: 'kz_sta_ins_gear', a: [25, 60], tags: [T('KAZ_STAFF', 'instructor')], w: 40, gap: 3,
    run: (s) => ({ t: '방어구 회사에서 새 실험 갑옷이 왔습니다. 연습생에게 입히라고 했습니다. 제가 먼저 입어 보았습니다. 사흘 동안 등이 아팠고, 연습생에게는 입히지 않았습니다.', k: 'ev', fx: { hl: -2, standing: 2 } }) },
  { id: 'kz_sta_coach_trn', a: [28, 60], tags: [T('KAZ_STAFF', 'coach')], w: 300, c: (s) => fresh(s, 'KAZ_STAFF_coach'),
    run: (s) => ({ t: '코치가 되었습니다. 경기 날 벤치 맨 끝자리가 제 자리였습니다. ' + (s.S.flags.knRetired ? '현역 때 섰던 경기장이었습니다. 벤치에서 보는 경기장은 더 넓었습니다.' : '선수들은 저보다 어렸고, 스폰서는 저보다 젊은 코치를 원했습니다.'), k: 'big', fx: { h: 3 } }) },
  { id: 'kz_sta_coach_bench', a: [28, 60], tags: [T('KAZ_STAFF', 'coach')], w: 45, gap: 2,
    run: (s) => ({ t: '제가 키운 선수가 ' + (s.rng.chance(0.5) ? '정예에 올랐습니다. 명부의 코치 칸에 제 이름이 작게 적혔습니다.' : '예선에서 떨어졌습니다. 이사회는 선수 대신 코치를 보았습니다.'), k: s.rng.chance(0.5) ? 'warm' : 'bad', fx: { standing: 2 } }) },
  { id: 'kz_sta_coach_relegate', a: [28, 60], tags: [T('KAZ_STAFF', 'coach'), 'aff:KAZ_STA_BLADEHELMET'], w: 35, gap: 3,
    run: (s) => ({ t: '블레이드헬멧이 강등 심사에 올랐습니다. 클럽은 선수 넷과 코치 하나를 내보내기로 했습니다. 코치는 저 하나가 아니었습니다. 이번에는.', k: 'bad', fx: { h: -3 } }) },
  { id: 'kz_sta_man_trn', a: [32, 65], tags: [T('KAZ_STAFF', 'manager')], w: 300, c: (s) => fresh(s, 'KAZ_STAFF_manager'),
    run: (s) => ({ t: '매니저가 되었습니다. 창은 더 이상 만지지 않았습니다. 계약서와 스폰서 명함을 만졌습니다. 둘 다 창보다 무거웠습니다.', k: 'big', fx: { h: 2 } }) },
  { id: 'kz_sta_man_deal', a: [32, 65], tags: [T('KAZ_STAFF', 'manager')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['스폰서와 재계약 협상을 했습니다. 선수 이름은 한 번도 나오지 않았습니다.', '포인트 이전으로 선수 하나를 팔았습니다. 그 선수에게는 다음 날 말했습니다.', '이사회에 시즌 보고를 했습니다. 승률 한 줄, 광고 노출 열 줄.']), k: 'note', fx: { money: medX(s, 0.3), h: -1 } }) },
  { id: 'kz_sta_man_old', a: [32, 65], tags: [T('KAZ_STAFF', 'manager')], w: 30, gap: 4,
    run: (s) => ({ t: '은퇴 선수의 선술집에 갔습니다. 벽에 그 선수의 옛 갑옷이 걸려 있었고, 상표는 다 떼어져 있었습니다. 술값은 제가 냈습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'kz_sta_fall', a: [25, 65], tags: [K], w: 300, c: (s) => left(s, 'KAZ_STAFF', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'disgrace' ? '클럽 추문에 이름이 묶였습니다. 제가 한 일은 아니었지만, 제가 서명한 서류였습니다.' : '클럽이 문을 닫았습니다. 스폰서가 떠난 다음 주였습니다. 선수들은 다른 클럽으로 팔렸고, 스태프는 팔리지 않았습니다.', k: 'loss', fx: { h: -4 } }) },
  // ── KAZ_OFFICE 회사원: 사원 → 중간 간부 → 대변인·임원 ──
  { id: 'kz_off_staff_desk', a: [18, 60], tags: [T('KAZ_OFFICE', 'staff')], w: 45, gap: 2,
    run: (s) => ({ t: affIs(s, 'KAZ_OFF_GALE') ? '게일 산업 남부 농지 매입 서류를 정리했습니다. 마을 이름이 번호로 바뀌는 것을 제 손으로 했습니다.' : affIs(s, 'KAZ_OFF_SWORMA') ? '스워마 식품 메이저 납품 물량표를 만들었습니다. 피에로기 숫자가 관중 숫자보다 컸습니다.' : '회사 서류를 정리했습니다. 회사의 반은 스폰서 계약서였고, 반은 그 계약서의 사본이었습니다.', k: 'note', fx: { cap: { learn: 0.02 } } }) },
  { id: 'kz_off_staff_major', a: [18, 60], tags: [T('KAZ_OFFICE', 'staff')], w: 40, c: (s) => majorYear(s) && s.S.flags.offMajor !== s.year,
    run: (s) => { s.S.flags.offMajor = s.year; return { t: '메이저 결승 날 회사가 일찍 끝났습니다. 사장이 스폰서 좌석 표를 간부에게만 나눠 주었습니다. 사원들은 회의실 단말기로 보았습니다.', k: 'ev', fx: { h: 2 } }; } },
  { id: 'kz_off_mid_trn', a: [22, 60], tags: [T('KAZ_OFFICE', 'middle')], w: 300, c: (s) => fresh(s, 'KAZ_OFFICE_middle'),
    run: (s) => ({ t: '중간 간부가 되었습니다. 책상이 창가로 옮겨졌습니다. 창밖은 경기장이었고, 경기장은 회사의 가장 큰 광고판이었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'kz_off_mid_sponsor', a: [22, 60], tags: [T('KAZ_OFFICE', 'middle')], w: 45, gap: 2,
    run: (s) => ({ t: '기사단 스폰서 계약 실무를 맡았습니다. 기사 이름보다 갑옷의 상표 위치가 더 긴 조항이었습니다.', k: 'note', fx: { money: medX(s, 0.2), cap: { ties: 0.02 } } }) },
  { id: 'kz_off_mid_mieszko', a: [22, 60], tags: [T('KAZ_OFFICE', 'middle'), 'aff:KAZ_OFF_MIESZKO'], w: 35, gap: 3,
    run: (s) => ({ t: '미에슈코 그룹 본사 회의였습니다. 회의실 벽에 역대 후원 기사의 사진이 걸려 있었습니다. 절반은 이름을 몰랐습니다. 그룹도 모르는 눈치였습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'kz_off_exec_trn', a: [28, 65], tags: [T('KAZ_OFFICE', 'exec')], w: 300, c: (s) => fresh(s, 'KAZ_OFFICE_exec'),
    run: (s) => ({ t: '임원이 되었습니다. 상업연합회 총회에 회사 대표로 앉았습니다. 뒷줄이었고, 뒷줄도 총회였습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'kz_off_exec_speak', a: [28, 65], tags: [T('KAZ_OFFICE', 'exec')], w: 45, gap: 2,
    run: (s) => ({ t: '회사 대변인으로 기자 앞에 섰습니다. ' + s.rng.pick(['질문은 기사 부상에 관한 것이었고, 답은 광고 일정에 관한 것이었습니다.', '준비한 문장을 읽었습니다. 제가 쓴 문장은 하나도 없었습니다.', '중계 화면에 제 얼굴이 3초 나왔습니다. 어머니가 전화를 했습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'kz_off_exec_politics', a: [28, 65], tags: [T('KAZ_OFFICE', 'exec')], w: 30, gap: 4,
    run: (s) => ({ t: '국민원 의원 후원 만찬에 회사 몫으로 갔습니다. 접시 값이 사원 월급이었습니다. 접시를 비우지 못했습니다.', k: 'note', fx: { cap: { ties: 0.03 }, h: -1 } }) },
  { id: 'kz_off_fall', a: [18, 65], tags: [K], w: 300, c: (s) => left(s, 'KAZ_OFFICE', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'disgrace' ? '회사 비리가 터졌고, 서류의 서명은 제 것이었습니다. 회사는 남았고 저는 남지 않았습니다.' : '회사가 스폰서 계약을 잃었습니다. 다음 분기에 부서가 없어졌습니다. 책상은 경기장 쪽 창가 그대로였고, 사람만 비었습니다.', k: 'loss', fx: { h: -5 } }) },
  // ── KAZ_MEDIA 해설·언론: 기자 → 해설자 → 대변인 ──
  { id: 'kz_med_rep_beat', a: [18, 60], tags: [T('KAZ_MEDIA', 'reporter')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['경기장 기자석에 앉았습니다. 맨 뒷줄이었고, 기사가 쓰러지는 것은 뒷줄에서도 보였습니다.', '기사단 스캔들 제보를 받았습니다. 편집장은 스폰서 이름을 보고 기사를 접었습니다.', '연습생 인터뷰를 썼습니다. 데스크에서 제목이 바뀌었습니다. 제목에 스폰서 상표가 들어갔습니다.']), k: 'note', fx: { cap: { learn: 0.02 } } }) },
  { id: 'kz_med_rep_paper', a: [18, 60], tags: [T('KAZ_MEDIA', 'reporter'), 'aff:KAZ_MED_PAPER'], w: 35, gap: 3,
    run: (s) => ({ t: '로즈 페이퍼 유니온의 기사 하나가 스폰서 광고와 같은 면에 실렸습니다. 기사는 그 스폰서의 선수 부상이었습니다. 다음 호에 정정 기사가 나갔습니다. 부상이 아니라 휴식이었다고.', k: 'bad', fx: { h: -2 } }) },
  { id: 'kz_med_com_trn', a: [22, 60], tags: [T('KAZ_MEDIA', 'commentator')], w: 300, c: (s) => fresh(s, 'KAZ_MEDIA_commentator'),
    run: (s) => ({ t: '해설석에 앉았습니다. 마이크는 켜져 있었고, 대본은 스폰서 쪽에서 왔습니다. 첫 문장은 "오늘 경기는 ○○가 함께합니다"였습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'kz_med_com_live', a: [22, 65], tags: [T('KAZ_MEDIA', 'commentator')], w: 45, gap: 2, rep: true,
    run: (s) => ({ t: s.rng.pick(['메이저 중계를 여섯 시간 했습니다. 물 두 잔, 광고 서른 개.', '기사 하나가 경기장에서 죽었습니다. 중계는 멈추지 않았고, 저는 광고로 넘겼습니다.', '"오늘의 명언"이 신문에 실렸습니다. 제가 한 말인지 기억나지 않았습니다.']), k: 'note', fx: { standing: 2, h: s.rng.chance(0.5) ? 1 : -2 } }) },
  { id: 'kz_med_com_mic', a: [22, 65], tags: [T('KAZ_MEDIA', 'commentator')], w: 35, gap: 3,
    run: (s) => ({ t: '마이크를 끄고 옆 해설자와 진짜 승자가 누군지 이야기했습니다. 마이크가 꺼져 있다는 것을 둘 다 두 번 확인했습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'kz_med_spk_trn', a: [28, 65], tags: [T('KAZ_MEDIA', 'spokesman')], w: 300, c: (s) => fresh(s, 'KAZ_MEDIA_spokesman'),
    run: (s) => ({ t: '대변인이 되었습니다. 이제 질문을 받는 쪽이었습니다. 답은 전부 미리 있었고, 제 일은 그중 하나를 고르는 것이었습니다.', k: 'big', fx: { h: 2 } }) },
  { id: 'kz_med_spk_press', a: [28, 65], tags: [T('KAZ_MEDIA', 'spokesman')], w: 45, gap: 2,
    run: (s) => ({ t: '기자회견을 열었습니다. ' + s.rng.pick(['경기장 사고 질문에 "조사 중"을 열한 번 말했습니다.', '제가 기자였을 때 던지던 질문이 나왔습니다. 그때 제가 듣던 답을 했습니다.', '가족이 수도에 정착 허가를 받았습니다. 그 결승 해설의 대가였다고는 아무도 말하지 않았습니다.']), k: 'note', fx: { standing: 2, h: -1 } }) },
  { id: 'kz_med_spk_film', a: [28, 65], tags: [T('KAZ_MEDIA', 'spokesman'), 'aff:KAZ_MED_FILM'], w: 30, gap: 4,
    run: (s) => ({ t: '기사 영화 시사회에 갔습니다. 영화 속 기사는 스폰서 없이 이겼습니다. 상영관 입구에는 스폰서 부스가 넷이었습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'kz_med_fall', a: [18, 65], tags: [K], w: 300, c: (s) => left(s, 'KAZ_MEDIA', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'disgrace' ? '방송에서 한 말 한마디가 스폰서 광고 시간에 들어갔습니다. 다음 날 해설석에 다른 사람이 앉아 있었습니다.' : '제 목소리를 찾는 곳이 없어졌습니다. 새 해설자는 더 젊었고, 더 길게 웃었습니다.', k: 'loss', fx: { h: -4 } }) },
  // ── KAZ_CRAFT 장인 길드: 견습 → 장인 → 명장 (은퇴 기사의 선술집 변주 포함) ──
  { id: 'kz_cra_app_forge', a: [14, 45], tags: [T('KAZ_CRAFT', 'apprentice')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['길드 공방에서 창끝을 갈았습니다. 경기용은 날이 없고, 출정용은 날이 있었습니다. 둘 다 같은 숫돌이었습니다.', '스승이 제 작업을 녹여 다시 만들게 했습니다. 세 번째에야 아무 말이 없었습니다.', '길드 도장이 찍힌 갑옷 조각을 처음 납품했습니다. 상표 자리는 비워 두라고 했습니다.']), k: 'note', fx: { cap: { skill: 0.03 } } }) },
  { id: 'kz_cra_app_guild', a: [14, 45], tags: [T('KAZ_CRAFT', 'apprentice'), 'aff:KAZ_CRA_GUILD'], w: 35, gap: 3,
    run: (s) => ({ t: '장인 길드 총회에 견습 자격으로 뒷줄에 섰습니다. 안건은 기계 공장과의 경쟁이었습니다. 결론은 없었고, 보드카는 있었습니다.', k: 'note', fx: { cap: { ties: 0.02 } } }) },
  { id: 'kz_cra_mas_trn', a: [18, 60], tags: [T('KAZ_CRAFT', 'master')], w: 300, c: (s) => fresh(s, 'KAZ_CRAFT_master'),
    run: (s) => ({ t: s.S.flags.knTavern ? '선술집 문을 열었습니다. 벽에 옛 갑옷을 걸었고, 상표는 전부 떼어 냈습니다. 첫 손님은 옛 기사단 동료였습니다.' : '장인 인장을 받았습니다. 제 이름 첫 글자가 쇠에 찍혔습니다. 그 뒤로 제가 만든 것에는 전부 그 글자가 남았습니다.', k: 'big', fx: { h: 4 } }) },
  { id: 'kz_cra_mas_work', a: [18, 65], tags: [T('KAZ_CRAFT', 'master')], w: 45, gap: 2,
    run: (s) => ({ t: s.S.flags.knTavern ? s.rng.pick(['손님들이 제 옛 경기를 이야기했습니다. 저보다 잘 기억했습니다.', '메이저 날 가게가 찼습니다. 중계 단말기 앞에 앉은 연습생들이 외상을 달았습니다.', '옛 스폰서가 가게에 간판 광고를 제안했습니다. 거절했습니다. 벽에 상표가 없는 것이 이 가게의 간판이었습니다.']) : s.rng.pick(['기사단 주문이 들어왔습니다. 갑옷 열 벌, 납기는 메이저 전.', '관광객이 기념품 창을 샀습니다. 날은 없고 길드 도장은 있었습니다.', '기계 공장이 같은 모양을 절반 값에 찍어 냈습니다. 제 것은 더 오래 갔고, 그것을 아는 사람은 줄었습니다.']), k: 'note', fx: { money: medX(s, 0.2) } }) },
  { id: 'kz_cra_gm_trn', a: [28, 70], tags: [T('KAZ_CRAFT', 'grandmaster')], w: 300, c: (s) => fresh(s, 'KAZ_CRAFT_grandmaster'),
    run: (s) => ({ t: '길드가 명장 칭호를 주었습니다. 챔피언 홀에 제가 만든 창이 전시되었습니다. 창 아래 이름표에 기사 이름이 먼저, 제 이름이 다음이었습니다. 순서는 그래도 되었습니다.', k: 'big', fx: { h: 5 } }) },
  { id: 'kz_cra_gm_pupil', a: [28, 75], tags: [T('KAZ_CRAFT', 'grandmaster')], w: 40, gap: 3,
    run: (s) => ({ t: '견습이 ' + s.rng.ri(3, 9) + '명이 되었습니다. 절반은 길드에 남고 절반은 기계 공장으로 갔습니다. 공장 쪽이 급료가 좋았고, 길드 쪽이 인장이 있었습니다.', k: 'note', fx: { cap: { ties: 0.03 } }, f: F('카시미어 장인 길드 견습 등록부') }) },
  { id: 'kz_cra_gm_grand', a: [28, 75], tags: [T('KAZ_CRAFT', 'grandmaster')], w: 30, gap: 4,
    run: (s) => ({ t: '대기사 하나가 직접 창을 맞추러 왔습니다. 손 모양을 재고, 창 길이를 정하고, 값은 묻지 않았습니다. 그 창이 결승에 나왔습니다.', k: 'warm', fx: { h: 4, standing: 4 } }) },
  { id: 'kz_cra_fall', a: [14, 75], tags: [K], w: 300, c: (s) => left(s, 'KAZ_CRAFT', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.knTavern ? '선술집 문을 닫았습니다. 외상 장부가 매출 장부보다 두꺼웠습니다. 벽의 갑옷은 가져왔습니다.' : '공방 문을 닫았습니다. 기계 공장의 갑옷 값이 제 재료비보다 쌌습니다. 인장은 가져왔습니다. 찍을 데가 없었습니다.', k: 'loss', fx: { h: -4 } }) },
  // ── KAZ_MSG 재앙 메신저(순회형): 수습 → 메신저 → 예보관 ──
  { id: 'kz_msg_app_road', a: [16, 40], tags: [T('KAZ_MSG', 'apprentice')], w: 45, gap: 2,
    run: (s) => ({ t: '스승을 따라 남부 평원을 걸었습니다. 하늘 읽는 법을 배웠고, 그보다 걷는 법을 더 배웠습니다. 예보보다 발이 먼저 닳았습니다.', k: 'note', fx: { cap: { arts: 0.03 }, hl: -1 } }) },
  { id: 'kz_msg_app_corp', a: [16, 40], tags: [T('KAZ_MSG', 'apprentice'), 'aff:KAZ_MSG_CORP'], w: 35, gap: 3,
    run: (s) => ({ t: '월간 예보지 교정을 맡았습니다. 예보 옆에 기술 기업 광고가 있었습니다. 광고 글자가 예보 글자보다 컸습니다.', k: 'note', fx: { cap: { learn: 0.02 } } }) },
  { id: 'kz_msg_msg_trn', a: [19, 50], tags: [T('KAZ_MSG', 'messenger')], w: 300, c: (s) => fresh(s, 'KAZ_MSG_messenger'),
    run: (s) => ({ t: '전달자 취임 서약을 낭독했습니다. 재앙 정보 전달자 협회 배지가 왔고, 기업 로고가 박힌 단말기가 함께 왔습니다. 배지는 가슴에, 단말기는 손에.', k: 'big', fx: { h: 3 } }) },
  { id: 'kz_msg_msg_route', a: [19, 55], tags: [T('KAZ_MSG', 'messenger')], w: 45, gap: 1, rep: true,
    run: (s) => { const at = s.res && s.res.itinerantAt; const good = s.rng.chance(0.7);
      return { t: (at && at !== K ? nat(s, at) + ' 쪽 경로였습니다. ' : '국경 경로였습니다. ') + (good ? '예보가 맞았습니다. 마을이 하루 먼저 비었고, 재앙은 빈 마을을 지나갔습니다.' : '예보가 반나절 늦었습니다. 마을은 비었지만 창고는 비지 못했습니다.'), k: good ? 'ev' : 'bad', fx: good ? { standing: 3 } : { standing: -3, h: -3 } }; } },
  { id: 'kz_msg_msg_major', a: [19, 55], tags: [T('KAZ_MSG', 'messenger')], w: 35, c: (s) => majorYear(s) && s.S.flags.msgMajor !== s.year,
    run: (s) => { s.S.flags.msgMajor = s.year; return { t: '메이저 기간 수도 상공 예보를 맡았습니다. 경기 일정이 예보에 맞춰 바뀌었습니다. 하늘이 경기장을 봐주었고, 사람들은 하늘을 봐주지 않았습니다.', k: 'note', fx: { money: medX(s, 0.3) } }; } },
  { id: 'kz_msg_fore_trn', a: [27, 60], tags: [T('KAZ_MSG', 'forecaster')], w: 300, c: (s) => fresh(s, 'KAZ_MSG_forecaster'),
    run: (s) => ({ t: '기업 제휴 예보관이 되었습니다. 월간 예보지 첫 장에 제 서명이 실렸습니다. 서명 아래에 기업 로고가, 로고 아래에 예보가.', k: 'big', fx: { h: 2, money: medX(s, 0.5) } }) },
  { id: 'kz_msg_fore_desk', a: [27, 65], tags: [T('KAZ_MSG', 'forecaster')], w: 40, gap: 2,
    run: (s) => ({ t: s.rng.pick(['수습 셋을 길에 내보냈습니다. 저는 책상에 남았습니다. 책상에서는 하늘이 창문 크기였습니다.', '기업 쪽에서 예보 일자를 하루 당겨 달라고 했습니다. 신제품 발표회 때문이었습니다. 하늘은 발표회를 몰랐습니다.', '월간 예보 구독자가 ' + s.rng.ri(2, 9) + '만이 되었습니다. 그중 몇이 예보를 읽고 몇이 광고를 읽는지는 몰랐습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'kz_msg_fall', a: [16, 65], tags: [K], w: 300, c: (s) => left(s, 'KAZ_MSG', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'infected' ? '경로에서 결정이 몸에 들어왔습니다. 협회는 배지를 회수했고, 기업은 단말기를 회수했습니다.' : '길에서 돌아오지 못할 뻔했습니다. 돌아왔지만 다시 나가지는 못했습니다.', k: 'loss', fx: { h: -4 } }) },
  // ── KAZ_ASK 감정회 기사: 하급 → 4급 → 비밀공작 → 대기사장 경호 ──
  { id: 'kz_ask_jr_desk', a: [18, 50], tags: [T('KAZ_ASK', 'junior')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['감정회 등기 창구에 앉았습니다. 기사 등급을 찍는 도장이 제 손에 있었고, 제 등급은 가장 아래였습니다.', '경기 규정 위반 조사 보조를 했습니다. 제3조와 제7조. 조문은 외웠고, 적용은 위에서 했습니다.', '대기사장 집무실 복도를 지켰습니다. 하루 아홉 시간, 문은 한 번 열렸습니다.']), k: 'note', fx: { cap: { learn: 0.02 } } }) },
  { id: 'kz_ask_jr_council', a: [18, 50], tags: [T('KAZ_ASK', 'junior')], w: 35, gap: 3,
    run: (s) => ({ t: '상업연합회 공문이 감정회로 왔습니다. 법률상 감정회가 정부입니다. 공문은 명령문이었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'kz_ask_4_trn', a: [22, 55], tags: [T('KAZ_ASK', 'fourth')], w: 300, c: (s) => fresh(s, 'KAZ_ASK_fourth'),
    run: (s) => ({ t: '4급 기사로 등기되었습니다. 제 이름 옆에 숫자가 붙었습니다. 그 숫자로 들어갈 수 있는 문이 셋 늘었고, 들어갈 수 없는 문이 더 많다는 것을 알게 되었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'kz_ask_4_case', a: [22, 55], tags: [T('KAZ_ASK', 'fourth')], w: 45, gap: 2,
    run: (s) => ({ t: '기사 제명 심의에 앉았습니다. ' + s.rng.pick(['승부조작이었습니다. 스폰서 쪽 변호인이 셋이었고, 기사 쪽은 기사뿐이었습니다.', '경기장 사망 사고였습니다. 결론은 "규정 안"이었습니다. 규정이 너무 넓었습니다.', '감염 은폐였습니다. 기사는 울지 않았고, 저는 도장을 찍었습니다.']), k: 'bad', fx: { h: -3, standing: 3 } }) },
  { id: 'kz_ask_cov_trn', a: [28, 60], tags: [T('KAZ_ASK', 'covert')], w: 300, c: (s) => fresh(s, 'KAZ_ASK_covert'),
    run: (s) => ({ t: '비밀공작 부서로 옮겨졌습니다. 등기에서 제 이름이 사라졌습니다. 급료는 다른 이름으로 들어왔습니다.', k: 'big', fx: { h: -1, money: medX(s, 0.5) } }) },
  { id: 'kz_ask_cov_job', a: [28, 60], tags: [T('KAZ_ASK', 'covert')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['유니온 쪽 사람을 미행했습니다. 그쪽도 저를 미행했습니다. 같은 골목에서 서로 모르는 척했습니다.', '이사 하나의 장부를 밤에 읽었습니다. 아침에는 읽지 않은 사람이 되어야 했습니다.', '대기사장의 지시는 세 줄이었고 보고서는 서른 장이었습니다. 세 줄만 읽힐 것을 알고 썼습니다.']), k: 'note', fx: { cap: { ties: 0.02 }, h: -2 } }) },
  { id: 'kz_ask_guard_trn', a: [32, 65], tags: [T('KAZ_ASK', 'guard')], w: 300, c: (s) => fresh(s, 'KAZ_ASK_guard'),
    run: (s) => ({ t: '대기사장 경호 기사가 되었습니다. 대기사장 뒤에 서는 것이 일이었습니다. 중계 화면에 제 어깨가 자주 나왔습니다. 얼굴은 나오지 않는 것이 일이었습니다.', k: 'big', fx: { h: 3 } }) },
  { id: 'kz_ask_guard_day', a: [32, 65], tags: [T('KAZ_ASK', 'guard')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['메이저 개막식에서 대기사장 뒤에 섰습니다. 창은 의전용이었고, 날은 진짜였습니다.', '상업연합회 만찬장 문 앞에 섰습니다. 안에서 나라가 정해졌고, 밖에서 제가 문을 지켰습니다.', '대기사장이 제 이름을 불렀습니다. 처음이었습니다. 물을 달라는 말이었습니다.']), k: 'note', fx: { standing: 2 } }) },
  { id: 'kz_ask_fall', a: [18, 65], tags: [K], w: 300, c: (s) => left(s, 'KAZ_ASK', null) && s.S.flags.lastTrackHow !== 'retire',
    run: (s) => ({ t: s.S.flags.lastTrackHow === 'exile' ? '감정회 내부 숙청이었습니다. 제 이름이 명단에 있었습니다. 국경을 넘는 길은 제가 가장 잘 알았습니다.' : '감정회에서 나왔습니다. 등기의 제 숫자는 지워졌고, 알고 있는 것은 지워지지 않았습니다. 그것이 위험한 재산이었습니다.', k: 'loss', fx: { h: -5 } }) },
  // ── KAZ_KGCC 상업연합회 임원: 이사 비서 → 이사 → 의장 ──
  { id: 'kz_kgcc_sec_file', a: [25, 60], tags: [T('KAZ_KGCC', 'secretary')], w: 45, gap: 2,
    run: (s) => ({ t: s.rng.pick(['이사의 일정표를 짰습니다. 기사단 회의 한 시간, 스폰서 회의 다섯 시간.', '이사의 서명을 대신 넣었습니다. 메이저 중계권 계약서였습니다. 제 손이 떨린 것은 금액 때문이 아니었습니다.', '이사가 저를 "우리 집안 사람"이라고 소개했습니다. 집안은 다른 집안이었습니다. 정정하지 않았습니다.']), k: 'note', fx: { cap: { ties: 0.03 } } }) },
  { id: 'kz_kgcc_sec_assembly', a: [25, 60], tags: [T('KAZ_KGCC', 'secretary'), 'aff:KAZ_KGCC_ASSEMBLY'], w: 35, gap: 3,
    run: (s) => ({ t: '국민원 회기에 이사 대신 방청석에 앉았습니다. 법안은 열둘이었고, 열하나가 통과되었습니다. 열두 번째는 감염자 구역 예산이었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'kz_kgcc_dir_trn', a: [29, 65], tags: [T('KAZ_KGCC', 'director')], w: 300, c: (s) => fresh(s, 'KAZ_KGCC_director'),
    run: (s) => ({ t: '상업연합회 이사가 되었습니다. 이사회 탁자에 제 이름판이 놓였습니다. 이름판 뒤에 회사 이름판이, 그 뒤에 더 큰 회사 이름판이.', k: 'big', fx: { h: 3, money: medX(s, 3) } }) },
  { id: 'kz_kgcc_dir_vote', a: [29, 70], tags: [T('KAZ_KGCC', 'director')], w: 45, gap: 2,
    run: (s) => ({ t: '이사회 표결이 있었습니다. ' + s.rng.pick(['남부 농지 매입이었습니다. 찬성했습니다. 마을 이름은 안건에 없었습니다.', '감염자 참가 제도 예산이었습니다. 투기장 수익이 예산의 세 배였습니다.', '메이저 중계권 분배였습니다. 표는 회사 크기 순으로 갈렸습니다.']), k: 'note', fx: { money: medX(s, 1), h: -1 } }) },
  { id: 'kz_kgcc_dir_threat', a: [29, 70], tags: [T('KAZ_KGCC', 'director')], w: 30, gap: 4,
    run: (s) => ({ t: '이사 하나가 차에서 내리지 못했습니다. 다음 이사회는 경호가 두 배였고, 안건은 그대로였습니다.', k: 'bad', fx: { h: -3 } }) },
  { id: 'kz_kgcc_chair_trn', a: [35, 75], tags: [T('KAZ_KGCC', 'chair')], w: 300, c: (s) => fresh(s, 'KAZ_KGCC_chair'),
    run: (s) => ({ t: '의장이 되었습니다. 감정회 대기사장이 축하 전문을 보냈습니다. 법률상 그쪽이 정부였고, 전문은 그쪽이 먼저 보냈습니다.', k: 'big', fx: { h: 3, money: medX(s, 5) } }) },
  { id: 'kz_kgcc_chair_major', a: [35, 80], tags: [T('KAZ_KGCC', 'chair')], w: 45, c: (s) => majorYear(s) && s.S.flags.kgccMajor !== s.year,
    run: (s) => { s.S.flags.kgccMajor = s.year; return { t: majorNo(s) + '회 메이저 개막을 선언했습니다. 대기사장 옆자리였습니다. 중계 화면에는 제가 먼저 잡혔습니다.', k: 'ev', fx: { standing: 3 }, f: F('감정회 메이저 ' + majorNo(s) + '회 공식 기록') }; } },
  { id: 'kz_kgcc_chair_night', a: [35, 80], tags: [T('KAZ_KGCC', 'chair')], w: 30, gap: 4,
    run: (s) => ({ t: '밤에 경호 없이 창가에 섰습니다. 경기장 불빛이 꺼지는 것을 보았습니다. 그 불을 켜고 끄는 사람이 저였고, 저도 그것이 가끔 낯설었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'kz_kgcc_fall', a: [25, 80], tags: [K], w: 300, c: (s) => (left(s, 'KAZ_KGCC', null) && s.S.flags.lastTrackHow !== 'retire' || demoted(s, 'KAZ_KGCC')),
    run: (s) => ({ t: s.S.flags.lastFall === 'bankrupt' ? '회사가 무너졌습니다. 이사회 탁자의 제 이름판이 한 칸 아래로 옮겨졌습니다. 이름판은 그대로였고, 자리만 달랐습니다.' : '추문이 이사회 안건이 되었습니다. 표결은 만장일치였습니다. 저는 그 표결에 없었습니다.', k: 'loss', fx: { h: -5 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 생업·동네·계절(평범한 삶): 메이저 중계 보는 동네, 장인 길드, 명절, 겨울
  // ════════════════════════════════════════════════════════════════════
  { id: 'kz_life_major_street', a: [15, 90], tags: [K, '!track:KAZ_KNIGHT', '!track:KAZ_INFECTED'], w: 40, c: (s) => majorYear(s) && s.S.flags.lifeMajor !== s.year,
    run: (s) => { s.S.flags.lifeMajor = s.year; const bet = s.rng.chance(poor(s) ? 0.4 : 0.2);
      return { t: majorNo(s) + '회 메이저가 열렸습니다. ' + (bet ? '돈을 걸었고, 잃었습니다. 동네 전체가 같은 기사에게 걸었고, 같이 잃었습니다.' : s.rng.pick(['거리마다 중계 화면이 걸렸고, 일터는 결승 날 일찍 끝났습니다.', '입장권 값이 한 달치였습니다. 술집에서 봤습니다.', '아이가 좋아하는 기사의 이름을 외웠습니다. 다음 메이저 때 그 기사는 없었습니다.'])), k: bet ? 'bad' : 'warm', fx: bet ? { h: -2, money: pct(s, 0.05) } : { h: 3 }, f: F('감정회 메이저 ' + majorNo(s) + '회 공식 기록') }; } },
  { id: 'kz_life_memorial', a: [15, 90], tags: [K], w: 25, gap: 5,
    run: (s) => s.rng.chance(0.22) ? ({ t: '기사 추모제. 챔피언 홀 벽에 올해 ' + s.rng.ri(3, 15) + '명의 이름이 새로 새겨졌습니다. 그중 ' + s.rng.ri(1, 3) + '명은 투기장 사람이었고, 작은 글씨였습니다.', k: 'note', fx: { h: -1 }, f: F('감정회 연감 추모제 편, ' + s.year + '년') }) : ((s) => ({ t: '기사 추모제에 갔습니다. 챔피언 홀 벽에 그해 죽은 기사의 이름이 새로 새겨졌습니다. ' + (s.rng.chance(0.5) ? '아는 이름이 하나 있었습니다.' : '모르는 이름이었고, 그래서 더 오래 보았습니다.'), k: 'note', fx: { h: -1 } }))(s) },
  { id: 'kz_life_pierogi', a: [10, 90], tags: [K], w: 30, gap: 3,
    run: (s) => s.rng.chance(0.22) ? ({ t: '피에로기 속 고기 값이 ' + s.rng.ri(10, 30) + '% 올랐습니다. 양배추로 채웠습니다. 아이는 몰랐고, 저는 알았습니다.', k: 'note', fx: { h: 1 }, f: F('상업 도시 시장 물가표, ' + s.year + '년') }) : ((s) => ({ t: (momHere(s) || s.S.fam.married ? '집에서 ' : '혼자 ') + cul(s).food + ' 중 피에로기를 빚었습니다. ' + s.rng.pick(['속은 양배추였습니다. 고기는 메이저 때나 넣었습니다.', '빚은 것의 절반은 이웃에게 갔습니다. 이웃 것의 절반이 돌아왔습니다.', '모양이 기사 투구를 닮았다고 아이가 말했습니다. 그렇게 보였습니다.']), k: 'warm', fx: { h: 2 } }))(s) },
  { id: 'kz_life_winter', a: [10, 90], tags: [K], w: 30, gap: 3,
    run: (s) => s.rng.chance(0.22) ? ({ t: '겨울 난방비가 작년보다 ' + s.rng.ri(10, 40) + '% 올랐습니다. 플레이트 관리소 공고였습니다. 공고 옆에 메이저 중계권 광고가 붙어 있었습니다.', k: 'bad', fx: { h: -1, money: -medX(s, 0.03) }, f: F('플레이트 관리소 난방 요금 고시, ' + s.year + '년') }) : ((s) => ({ t: '겨울이 길었습니다. ' + s.rng.pick(['플레이트 난방이 끊긴 밤에 ' + cul(s).drink + ' 한 잔으로 버텼습니다.', '눈이 경기장 지붕에 쌓였습니다. 치우는 사람은 동네에서 뽑았습니다.', '남부에서 호밀 값이 올랐다는 소식이 왔습니다. 빵은 작아졌고 값은 그대로였습니다.']), k: 'note', fx: { h: -1, hl: -1 } }))(s) },
  { id: 'kz_life_guild_fair', a: [10, 90], tags: [K], w: 25, gap: 4,
    run: (s) => s.rng.chance(0.22) ? ({ t: '장인 길드 장터에서 냄비를 ' + s.rng.ri(30, 90) + ' LMD에 샀습니다. 기계 공장 것은 그 절반이었습니다. 길드 것은 손잡이가 안 빠졌습니다.', k: 'warm', fx: { h: 2, money: -medX(s, 0.03) }, f: F('카시미어 장인 길드 장터 가격표') }) : ((s) => ({ t: '장인 길드 장터가 섰습니다. 창과 갑옷 옆에 냄비와 문고리가 있었습니다. 같은 손이 만든 것이었습니다. 냄비를 샀습니다.', k: 'warm', fx: { h: 2, money: -medX(s, 0.03) } }))(s) },
  { id: 'kz_life_knight_neighbor', a: [10, 90], tags: [K, 'urban'], w: 25, gap: 4,
    run: (s) => ({ t: '옆집 아이가 기사단 연습생이 되었습니다. 동네가 축하했고, 1년 뒤 그 아이는 돌아왔습니다. 동네는 그것도 축하했습니다. 돌아온 것을.', k: 'note', fx: { h: 1 } }) },
  { id: 'kz_life_vodka', a: [18, 90], tags: [K], w: 25, gap: 3,
    run: (s) => ({ t: '술집에서 ' + cul(s).drink + ' 잔을 기울였습니다. ' + s.rng.pick(['옆자리 노인이 열한 번째 메이저 이야기를 했습니다. 아무도 끊지 않았습니다.', '텔레비전 화면에서 기사가 쓰러졌고, 술집이 조용해졌다가 다시 시끄러워졌습니다.', '주인이 옛 기사였습니다. 손이 느렸고, 잔은 정확했습니다.']), k: 'note', fx: { h: 1 } }) },
  { id: 'kz_life_greet', a: [10, 90], tags: [K], w: 20, gap: 5,
    run: (s) => ({ t: '동네 사람들은 인사 대신 "' + cul(s).greet + '"라고 했습니다. 경기가 없는 날에도. 이기지 않아도 되는 날에도.', k: 'note', fx: { h: 1 } }) },

  // ════════════════════════════════════════════════════════════════════
  // 소속 변주(aff:), 관계(rel:subtle — 기사 진로의 비쿠란타), 이주 신참, 방문(visit:)
  // ════════════════════════════════════════════════════════════════════
  { id: 'kz_aff_grand8', a: [10, 40], tags: ['aff:KAZ_KNI_GRAND8'], w: 35, gap: 3,
    run: (s) => ({ t: '8대 대기사단 소속이라는 것만으로 예선이 면제되었습니다. 포인트 이전 서류에 제 서명은 없었습니다. 단장 서명이면 되었습니다.', k: 'note', fx: { standing: 3 } }) },
  { id: 'kz_aff_sponsor_only', a: [10, 40], tags: ['aff:KAZ_KNI_SPONSOR'], w: 35, gap: 3,
    run: (s) => ({ t: '스폰서 전속 기사였습니다. 경기 일정보다 촬영 일정이 먼저 왔습니다. 지면 촬영이 줄었고, 이기면 촬영이 늘었습니다. 훈련 시간은 둘 다 줄었습니다.', k: 'note', fx: { money: medX(s, 0.3), cap: { skill: -0.01 } } }) },
  { id: 'kz_aff_indep', a: [10, 40], tags: ['aff:KAZ_KNI_INDEP'], w: 35, gap: 3,
    run: (s) => ({ t: '독립 기사는 예선 맨 앞 조에 배정되었습니다. 새벽 경기였고, 관중은 청소부였습니다. 그래도 포인트는 같은 포인트였습니다.', k: 'note', fx: { h: -1, standing: 1 } }) },
  { id: 'kz_aff_pinus', a: [12, 45], tags: ['aff:KAZ_INF_PINUS'], w: 40, gap: 3,
    run: (s) => ({ t: '피누스 실베스트리스는 전원이 감염자인 기사단이었습니다. 상금은 영지 사람들의 신분 서류에 들어갔습니다. 저는 그 규칙에 서명했고, 그 서명이 자랑이었습니다.' + (s.year === 1097 ? ' 그해 메이저에서 자격이 박탈되었습니다. 이유는 공고되지 않았습니다.' : ''), k: s.year === 1097 ? 'bad' : 'warm', fx: s.year === 1097 ? { h: -4 } : { h: 2 } }) },
  { id: 'kz_aff_silverlance', a: [12, 55], tags: ['aff:KAZ_CAM_SILVERLANCE'], w: 35, gap: 3,
    run: (s) => ({ t: '실버랜스 페가수스 기사단의 깃발 아래 섰습니다. 깃발은 2백 년 된 것이었고, 깃대는 작년에 바꾼 것이었습니다.', k: 'note', fx: { standing: 2 } }) },
  { id: 'kz_rel_subtle_knight', a: [10, 40], tags: [T('KAZ_KNIGHT'), 'rel:subtle'], w: 35, gap: 3, c: (s) => !kuranta(s),
    run: (s) => ({ t: '해설자가 제 종족을 먼저 말하고 이름을 나중에 말했습니다. 쿠란타 기사에게는 이름만 말했습니다. 틀린 말은 아니었고, 그래서 더 그랬습니다.', k: 'note', fx: { h: -2 } }) },
  { id: 'kz_rel_subtle_horns', a: [10, 40], tags: [T('KAZ_KNIGHT'), 'rel:subtle'], w: 30, gap: 4, c: (s) => !kuranta(s),
    run: (s) => ({ t: '같은 기사단의 카프리니 연습생이 뿔을 깎고 쿠란타 행세를 했습니다. 아무도 묻지 않았고, 아무도 몰랐던 것은 아니었습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'kz_newcomer_register', a: [10, 60], tags: [K, 'newcomer'], w: 35, gap: 2,
    run: (s) => ({ t: '등기소에서 거주 등록을 했습니다. 서류의 종족 칸 옆에 "경기 참가 자격" 칸이 있었습니다. 저는 그 칸을 비워 두었고, 직원은 그 칸부터 보았습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'kz_newcomer_major', a: [10, 60], tags: [K, 'newcomer'], w: 30, gap: 3,
    run: (s) => ({ t: '온 동네가 메이저 이야기를 했습니다. 저는 기사 이름을 하나도 몰랐습니다. 이름 셋을 외우자 동네가 말을 걸기 시작했습니다.', k: 'warm', fx: { h: 2, cap: { ties: 0.02 } } }) },
  { id: 'kz_newcomer_rent', a: [15, 60], tags: [K, 'newcomer', 'urban'], w: 30, gap: 3,
    run: (s) => ({ t: '플레이트 임대 계약을 했습니다. 외국인 보증금이 두 배였습니다. 집주인은 미안해하지 않았고, 저는 두 배를 냈습니다.', k: 'bad', fx: { money: -medX(s, 0.2) } }) },
  { id: 'kz_visit_arena', a: [15, 70], tags: ['visit:kazimierz'], w: 30, gap: 3,
    run: (s) => ({ t: '카시미어에 머무는 동안 경기장 옆을 지났습니다. 입장권은 못 샀고, 함성은 공짜였습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'kz_visit_sponsor', a: [15, 70], tags: ['visit:kazimierz'], w: 25, gap: 3,
    run: (s) => ({ t: '카시미어 상업 도시에서는 건물마다 상표가 있었습니다. 상표가 없는 벽을 찾다가 지하 거주구 입구를 보았습니다.', k: 'note', fx: { h: -1 } }) },
  { id: 'kz_visit_border', a: [15, 70], tags: ['visit:kazimierz'], w: 25, gap: 3,
    run: (s) => ({ t: '카시미어 국경 마을에서 출정 기사단 순찰을 보았습니다. 중계 화면 속 기사와 같은 갑옷이었고, 상표는 없었습니다.', k: 'note' }) },

  // ════════════════════════════════════════════════════════════════════
  // 캐논 인물(1회성, 연도 게이트, 생애 3명 상한, 거리감)
  // ════════════════════════════════════════════════════════════════════
  { id: 'kz_canon_nearl', a: [10, 40], tags: [T('KAZ_KNIGHT')], w: 60, c: (s) => canonOk(s, 'nearl', 1094, 1099),
    run: (s) => { seeCanon(s, 'nearl'); return { t: '경기장 밖 골목에서 투구를 벗은 기사가 아이들에게 사인 대신 물을 나눠 주고 있었습니다. 22회 우승자였습니다. 저는 멀리서 보았고, 다가가지 않았습니다.', k: 'note', fx: { h: 2 } }; } },
  { id: 'kz_canon_flametail', a: [12, 50], tags: [K], w: 60, c: (s) => canonOk(s, 'flametail', 1097, 1103) && !!s.S.track && ['KAZ_INFECTED', 'KAZ_LABOR', 'KAZ_KNIGHT'].includes(s.S.track.id),
    run: (s) => { seeCanon(s, 'flametail'); return { t: '감염자 투기장 출신 기사가 본선 무대에 서자 관중석 한쪽에서만 환호가 터졌습니다. ' + (s.S.track.id === 'KAZ_INFECTED' ? '같은 구역 출신이었습니다. 그날 구역에서는 모두가 자기 일처럼 말했습니다.' : '저는 그 한쪽에 있지 않았습니다. 손뼉은 쳤습니다.'), k: 'note', fx: { h: 2 } }; } },
  { id: 'kz_canon_mob', a: [18, 65], tags: [K], w: 60, c: (s) => canonOk(s, 'mob', 1094, 1106) && !!s.S.track && ['KAZ_MEDIA', 'KAZ_KGCC'].includes(s.S.track.id),
    run: (s) => { seeCanon(s, 'mob'); return { t: '해설석의 남자가 마이크를 끈 뒤에야 진짜 승자가 누군지 중얼거렸습니다. 지방 빈민가 출신이라고 들었습니다. 그 한마디를 들은 사람은 저 하나였습니다.', k: 'note', fx: { h: 1 } }; } },
  { id: 'kz_canon_mlynar', a: [18, 65], tags: [K], w: 60, c: (s) => canonOk(s, 'mlynar', 1092, 1105) && !!s.S.track && ['KAZ_OFFICE', 'KAZ_CAMPAIGN'].includes(s.S.track.id),
    run: (s) => { seeCanon(s, 'mlynar'); return { t: '회사 서류 더미 뒤의 중년 남자가 옛 출정 기사단 얘기가 나오자 펜을 멈췄다가 다시 썼습니다. 건자재 회사 사람이라고 했습니다. 더는 묻지 않았습니다.', k: 'note', fx: { h: 1 } }; } },
  { id: 'kz_canon_gravel', a: [14, 60], tags: [K], w: 60, c: (s) => canonOk(s, 'gravel', 1094, 1103) && !!s.S.track && ['KAZ_ASK', 'KAZ_SLAVE'].includes(s.S.track.id),
    run: (s) => { seeCanon(s, 'gravel'); return { t: '어깨에 지워지지 않는 자국이 있는 여자가 감정회 복도를 소리 없이 지나갔습니다. 4급 기사라고 했습니다. 저는 벽에 붙어 길을 비켰습니다.', k: 'note', fx: { h: 1 } }; } },
];

// ════════════════════════════════════════════════════════════════════
// 결정(15): 기사 6 · 출정 1 · 노동 1 · 농민 1 · 유니온 1 · 감염자 기사 1 · 혼인 3 (home_change 는 victoria.js 가 세 나라 공용으로 등록)
// ════════════════════════════════════════════════════════════════════
const marryWrap = (typeId, bodyOf, labels) => ({
  tags: [], once: false, at: 0.45,
  ok: (s) => ENGINE_DECISIONS.marry.ok(s) && !!(s.S.flags.y_marry && s.S.flags.y_marry.v && s.S.flags.y_marry.v.type.id === typeId),
  build: (s, p) => { const v = ENGINE_DECISIONS.marry.build(s, p); if (!v || s.S.cur !== K) return v;
    const pr = p.prospect, t = p.type;
    return { ...v, body: bodyOf(s, pr, t), choices: v.choices.map((c, i) => ({ ...c, label: labels[i] || c.label })) }; },
  apply: (s, k, p) => ENGINE_DECISIONS.marry.apply(s, k, p),
});

export const decisions = {
  kz_kn_photo: {
    tags: [T('KAZ_KNIGHT')], once: true, at: 0.5,
    ok: (s) => !!s.S.flags.knPhotoOffer && s.S.age - s.S.flags.knPhotoOffer <= 1,
    build: (s) => ({ title: '화보 촬영', body: '잡지사가 화보를 찍자고 합니다. 갑옷 대신 정장, 창 대신 미소. 출연료는 한 시즌 상금이고, 기사단 동료들은 그런 기사를 "광고 기사"라고 부릅니다.',
      choices: [{ k: 'yes', label: '찍는다', sub: '돈 +, 외모 길 열림, 기량 −', auto: 1.2 }, { k: 'no', label: '창만 든다', sub: '평판 +', auto: 1 }] }),
    apply: (s, k) => { if (k !== 'yes') { s.eff({ standing: 3 }); return { t: '거절했습니다. 잡지사는 다른 연습생을 찍었고, 그 연습생은 다음 시즌에 경기보다 광고에 더 나왔습니다.', k: 'note' }; }
      s.S.flags.knPhoto = s.S.age; return { t: '화보를 찍었습니다. 가판대에 제 얼굴이 걸렸고, 훈련장에서는 그 주 내내 그 얼굴로 불렸습니다.', k: 'ev', fx: { money: medX(s, 1), h: 2, cap: { skill: -0.02 } } }; },
  },
  kz_kn_sponsor: {
    tags: [T('KAZ_KNIGHT')], once: true, at: 0.5,
    ok: (s) => !!s.S.flags.knSponsorOffer && s.S.age - s.S.flags.knSponsorOffer <= 1 && !affIs(s, 'KAZ_KNI_SPONSOR'),
    build: (s) => { s.S.flags.knSponsorAsked = true;
      return { title: '스폰서 계약', body: '명함 뒷면의 숫자는 ' + Math.round(s.med * 3).toLocaleString() + ' LMD였습니다. 계약금입니다. 대신 갑옷에 상표가 붙고, 촬영 일정이 생기고, "회사가 원하는 경기"라는 말이 계약서 어딘가에 있습니다.', fact: F('감정회 스폰서 계약 표준 약관'),
        choices: [{ k: 'yes', label: '계약한다', sub: '소득 +, 몰락 위험 +, 전속 소속', auto: 1.5 }, { k: 'no', label: '거절한다', sub: '지금처럼', auto: 1 }] }; },
    apply: (s, k) => { if (k !== 'yes') { s.eff({ standing: 2 }); return { t: '명함을 돌려주었습니다. 그 회사는 같은 기사단의 다른 기사와 계약했습니다. 그 기사의 갑옷이 다음 시즌에 눈에 띄게 가벼워졌습니다.', k: 'note' }; }
      if (s.S.track && s.data.affById.KAZ_KNI_SPONSOR) s.S.track.aff = 'KAZ_KNI_SPONSOR'; s.S.flags.knSponsor = s.S.age;
      return { t: '서명했습니다. 계약금이 들어왔고, 다음 날 갑옷에 상표가 세 개 붙었습니다. 상표 위치는 회사가 정했습니다.', k: 'big', fx: { money: medX(s, 3), h: 2 } }; },
  },
  kz_kn_matchfix: {
    tags: [T('KAZ_KNIGHT')], once: false, gap: 5, at: 0.5,
    ok: (s) => (affIs(s, 'KAZ_KNI_SPONSOR') || !!s.S.flags.knSponsor) && (s.S.track ? s.S.track.stage : -1) >= 1 && s.rng.chance(0.2),
    build: (s) => ({ title: '정해진 결과', body: '스폰서 쪽 사람이 다음 경기의 결과를 미리 말해 주었습니다. 그 결과대로 져 달라는 뜻이었습니다. 봉투는 두꺼웠고, 거절한 기사가 어떻게 되었는지는 들은 적이 없었습니다. 들은 적이 없다는 것이 답이었습니다.',
      choices: [{ k: 'obey', label: '그 결과대로 진다', sub: '돈 +, 제명 위험', auto: 1 }, { k: 'refuse', label: '이기러 나간다', sub: '스폰서 잃을 위험', auto: 1.2 }] }),
    apply: (s, k) => {
      if (k === 'obey') { s.S.flags.knFixed = (s.S.flags.knFixed || 0) + 1;
        if (s.rng.chance(0.25)) { s.fall('scandal'); return false; }
        return { t: '그 결과대로 졌습니다. 봉투는 두꺼웠고, 잠은 얕았습니다. 아무도 몰랐습니다. 아직은.', k: 'bad', fx: { money: medX(s, 1.5), h: -5 } }; }
      const win = s.rng.chance(0.5 + s.S.cap.skill * 0.15);
      if (win && s.rng.chance(0.6)) { if (s.S.track) s.S.track.aff = s.rng.chance(0.5) ? 'KAZ_KNI_64' : 'KAZ_KNI_INDEP'; s.S.flags.knSponsor = null; return { t: '이겼습니다. 다음 시즌 갑옷에서 상표가 사라졌습니다. 상표가 있던 자리가 다른 자리보다 밝았습니다.', k: 'ev', fx: { h: 3, standing: 4, money: -medX(s, 0.5) } }; }
      return { t: win ? '이겼습니다. 스폰서는 아무 말이 없었습니다. 아무 말이 없는 것이 더 무서웠습니다.' : '이기러 나갔고, 졌습니다. 결과는 그들이 말한 대로였고, 봉투는 없었습니다.', k: win ? 'ev' : 'bad', fx: win ? { h: 2 } : { h: -3 } }; },
  },
  kz_kn_major: {
    tags: [T('KAZ_KNIGHT')], once: false, gap: 2, at: 0.4,
    ok: (s) => majorYear(s) && (s.S.track ? s.S.track.stage : -1) >= 2 && (s.S.track ? s.S.track.stage : -1) <= 3 && s.S.flags.knMajorAsked !== s.year,
    build: (s) => { s.S.flags.knMajorAsked = s.year;
      return { title: majorNo(s) + '회 메이저', body: '메이저 출전 명단 제출일입니다. 나가면 상금과 중계와 부상이 있고, 안 나가면 다음은 3년 뒤입니다. ' + (standing(s) < 40 ? '포인트가 간당간당합니다. 예선부터입니다.' : '포인트는 충분합니다.'), fact: F('감정회 메이저 ' + majorNo(s) + '회 출전 규정'),
        choices: [{ k: 'go', label: '출전한다', sub: '상금·명성 / 부상·탈락', auto: 2 }, { k: 'skip', label: '이번은 건너뛴다', sub: '안전, 포인트 −', auto: 0.6 }] }; },
    apply: (s, k) => {
      if (k !== 'go') { s.eff({ standing: -5 }); return { t: '명단에서 빠졌습니다. 다섯 달 동안 온 도시가 경기 이야기를 했고, 저는 훈련장에 있었습니다.', k: 'note', fx: { h: -2 } }; }
      const r = s.rng.rnd() - s.S.cap.skill * 0.1;
      if (r < 0.03) { s.die('major_arena', '메이저 경기장'); return false; }
      if (r < 0.2) { if (s.rng.chance(0.5)) { s.fall('injury'); return false; } return { t: majorNo(s) + '회 메이저에 나갔습니다. 다쳤고, 스폰서는 계약을 갱신하지 않았습니다.', k: 'bad', fx: { hl: -8, h: -4, standing: -5 } }; }
      if (r < 0.6) return { t: majorNo(s) + '회 메이저에 나갔습니다. 예선을 통과했고, 본선 첫 경기에서 졌습니다. 이름이 중계에 한 번 나왔습니다.', k: 'ev', fx: { h: 2, standing: 4, money: medX(s, 0.5) }, f: F('감정회 메이저 ' + majorNo(s) + '회 공식 기록') };
      if (s.S.track.stage < 3 && s.rng.chance(0.5)) { s.promote({}); }
      return { t: majorNo(s) + '회 메이저에 나갔습니다. 16강까지 갔습니다. 거리 화면에 제 얼굴이 사흘 걸렸고, 스폰서 둘이 전화를 했습니다.', k: 'big', fx: { h: 6, standing: 12, money: medX(s, 2) }, f: F('감정회 메이저 ' + majorNo(s) + '회 공식 기록') }; },
  },
  kz_kn_bet: {
    tags: [T('KAZ_KNIGHT')], once: true, at: 0.5,
    ok: (s) => !!s.S.flags.knBetOffer && s.S.age - s.S.flags.knBetOffer <= 1,
    build: (s) => { s.S.flags.knBetAsked = true;
      return { title: '배당표', body: '숙소 앞 사람은 도박사였습니다. 제 경기에 제가 걸 수 있다고 했습니다. 지는 쪽에. 배당은 여섯 배였고, 감정회 규정 제7조는 판정 간섭을 금합니다. 제7조에 "자기 경기에 거는 것"이라는 말은 없습니다.',
        choices: [{ k: 'bet', label: '건다', sub: '돈 ×6 / 제명 위험', auto: 0.7 }, { k: 'no', label: '문을 닫는다', auto: 1.3 }] }; },
    apply: (s, k) => { if (k !== 'bet') return { t: '문을 닫았습니다. 다음 날 그 사람은 다른 숙소 앞에 서 있었습니다.', k: 'note' };
      if (s.rng.chance(0.3)) { s.fall('scandal'); return false; }
      return { t: '걸었고, 졌고, 받았습니다. 여섯 배였습니다. 그 돈으로 산 것은 전부 상표가 없는 것이었습니다.', k: 'bad', fx: { money: medX(s, 2), h: -4 } }; },
  },
  kz_kn_retire_path: {
    tags: [T('KAZ_STAFF')], once: true, at: 0.5,
    ok: (s) => cameFrom(s, 'KAZ_KNIGHT') && inStage(s) <= 1,
    build: (s) => ({ title: '창을 내려놓고', body: '은퇴 기사에게 열린 길은 몇 갈래입니다. 클럽에 남아 연습생을 가르치거나, 선술집을 열거나, 경호 자리를 받거나, 해설석에 앉거나. 어느 쪽이든 창은 벽에 걸립니다.',
      choices: [{ k: 'coach', label: '클럽에 남는다', sub: '코치의 길', auto: 2 }, { k: 'tavern', label: '선술집을 연다', sub: '장인 길드 등록 · 가게', auto: 1.2 }, { k: 'guard', label: '감정회 경호', sub: '감정회 기사', auto: 0.8 }, { k: 'media', label: '해설석', sub: '해설·언론', auto: 0.8 }] }),
    apply: (s, k) => {
      if (k === 'coach') return { t: '클럽에 남았습니다. 호루라기가 창보다 가벼웠고, 가볍다는 것이 처음에는 낯설었습니다.', k: 'note' };
      if (k === 'tavern') { s.S.flags.knTavern = true; if (s.enterTrack('KAZ_CRAFT', { how: 'switch', via: 'tavern', stage: 1, quiet: true })) return { t: '선술집을 열었습니다. 장인 길드에 가게를 등록했습니다. 벽에 옛 갑옷을 걸었고, 상표는 전부 떼어 냈습니다.', k: 'big', fx: { money: -medX(s, 1), h: 3 } }; return '가게 자리를 구하지 못했습니다.'; }
      if (k === 'guard') { if (s.enterTrack('KAZ_ASK', { how: 'switch', via: 'retired_knight', skipExam: true, quiet: true })) return { t: '감정회 경호 자리를 받았습니다. 창은 의전용이 되었고, 날은 그대로였습니다.', k: 'ev' }; return '감정회 자리는 열리지 않았습니다.'; }
      if (s.enterTrack('KAZ_MEDIA', { how: 'switch', via: 'retired_knight', stage: 1, quiet: true })) return { t: '해설석에 앉았습니다. 제가 뛰던 경기장이 화면 안에 들어갔습니다. 화면 안에서는 모든 것이 작았습니다.', k: 'ev' };
      return '해설석은 열리지 않았습니다.'; },
  },
  kz_cam_tax: {
    tags: [T('KAZ_CAMPAIGN')], once: true, at: 0.5,
    ok: (s) => !!s.S.flags.camTaxOffer && s.S.age - s.S.flags.camTaxOffer <= 1,
    build: (s) => { s.S.flags.camTaxAsked = true;
      return { title: '보호세 장부', body: '촌장이 내민 장부에는 기사단 몫과 기사 몫이 따로 있었습니다. 기사 몫은 관행이고, 관행은 규정에 없습니다. 촌장은 그 칸을 이미 채워 두었습니다.',
        choices: [{ k: 'take', label: '받는다', sub: '돈 +, 마을 평판 −', auto: 1 }, { k: 'refuse', label: '기사 몫 칸을 지운다', sub: '군공 +', auto: 1.2 }] }; },
    apply: (s, k) => { if (k === 'take') return { t: '받았습니다. 촌장은 고개를 숙였고, 그 고개가 오래 기억에 남았습니다.', k: 'bad', fx: { money: medX(s, 0.5), h: -3 } };
      return { t: '기사 몫 칸을 지웠습니다. 촌장은 처음에 믿지 않았습니다. 다음 해 그 마을에서 기사단 깃발에도 인사를 했습니다.', k: 'warm', fx: { standing: 5, h: 3 } }; },
  },
  kz_lab_pit: {
    tags: [T('KAZ_LABOR')], once: true, at: 0.5,
    ok: (s) => !!s.S.flags.labPitOffer && s.S.age - s.S.flags.labPitOffer <= 1 && s.S.age <= 24,
    build: (s) => { s.S.flags.labPitAsked = true;
      return { title: '지하 투기장', body: '지하 투기장에서 포인트를 모으면 카봐렐리엘키 등록소가 받아 준다고 합니다. 규칙은 적고, 창은 빌려주고, 다친 사람은 자기가 알아서 합니다. 손등에 흉터가 셋인 사람이 그렇게 말했습니다.',
        choices: [{ k: 'go', label: '포인트를 모은다', sub: '기사 등록의 길 / 부상', auto: s.S.cap.skill >= 0.5 ? 1.3 : 0.7 }, { k: 'no', label: '라인에 남는다', auto: 1 }] }; },
    apply: (s, k) => { if (k !== 'go') return { t: '라인에 남았습니다. 그 사람은 두 달 뒤 보이지 않았습니다. 등록했는지 다쳤는지는 몰랐습니다.', k: 'note' };
      const r = s.rng.rnd() - s.S.cap.skill * 0.15;
      if (r < 0.15) return { t: '지하 투기장에서 크게 다쳤습니다. 포인트는 모이지 않았고, 흉터는 모였습니다.', k: 'bad', fx: { hl: -12, h: -4 } };
      if (r < 0.5 && s.enterTrack('KAZ_KNIGHT', { how: 'switch', via: 'underground_points', quiet: true })) return { t: '포인트를 채웠습니다. 등록소 직원이 장부를 두 번 넘겨 보고 도장을 찍었습니다. 연습생이 되었습니다. 창은 아직 빌린 것이었습니다.', k: 'big', fx: { h: 5 } };
      return { t: '1년을 싸웠습니다. 포인트가 모자랐습니다. 라인으로 돌아갔고, 손은 조금 빨라져 있었습니다.', k: 'note', fx: { cap: { skill: 0.05 }, hl: -4 } }; },
  },
  kz_farm_sell: {
    tags: [T('KAZ_FARM')], once: true, at: 0.5,
    ok: (s) => !!s.S.flags.farmSellOffer && s.S.age - s.S.flags.farmSellOffer <= 1,
    build: (s) => { s.S.flags.farmSellAsked = true;
      return { title: '밭값', body: '게일 산업이 밭값으로 ' + Math.round(s.med * 4).toLocaleString() + ' LMD를 불렀습니다. 시세의 두 배입니다. 거절하면 내년에는 절반이고, 그다음 해에는 측량만 남는다고 했습니다.', fact: orgF(s, '남부 농지 매입 공고, ' + s.year + '년'),
        choices: [{ k: 'sell', label: '판다', sub: '돈 +, 농사 끝', auto: 1 }, { k: 'keep', label: '팔지 않는다', sub: '몰락 위험 +', auto: 1.2 }] }; },
    apply: (s, k) => { if (k === 'sell') { s.eff({ money: medX(s, 4) }); s.leaveTrack('switch', { quiet: true }); return { t: '팔았습니다. 돈은 들어왔고, 밭은 번호가 되었습니다. 다음 봄에 그 밭에 무엇이 심겼는지 보러 가지 않았습니다.', k: 'loss', fx: { h: -4 } }; }
      s.S.flags.farmHeld = s.S.age; return { t: '팔지 않았습니다. 다음 해 회사 사람이 다시 왔고, 값은 정말로 절반이었습니다. 밭은 그대로였습니다.', k: 'ev', fx: { standing: 4, h: 1 } }; },
  },
  kz_au_recruit: {
    tags: [K, 'urban', '!track:KAZ_AU', '!rhodes', '!slave'], once: true, at: 0.6,
    ok: (s) => s.S.age >= 16 && s.S.age <= 35 && s.S.cap.skill >= 0.5 && s.S.cap.ties >= -0.8 && (!s.S.track || standing(s) < 40 || s.S.flags.lastTrackHow === 'disgrace') && s.rng.chance(0.15),
    build: (s) => ({ title: '이름 없는 제안', body: '얼굴을 가린 사람이 찾아왔습니다. 기사단도 회사도 아니라고 했습니다. 하는 일은 "규칙을 어긴 기사를 처리하는 것", 급료는 기사단 정예의 두 배, 그만두는 사람은 없다고 했습니다. 없다는 말의 뜻을 설명해 주지는 않았습니다.',
      choices: [{ k: 'join', label: '받아들인다', sub: '소득 큼, 되돌릴 수 없음', auto: 0.5 }, { k: 'no', label: '모르는 척한다', auto: 1.5 }] }),
    apply: (s, k) => { if (k !== 'join') return { t: '모르는 척했습니다. 그 사람은 두 번 다시 오지 않았고, 그것이 다행인지 오래 생각했습니다.', k: 'note' };
      if (s.enterTrack('KAZ_AU', { how: 'switch', via: 'recruited', quiet: true })) return { t: '받아들였습니다. 가면을 받았습니다. 가면 안쪽에 전 주인의 이름은 없었습니다. 처음부터 없었거나, 지워졌거나.', k: 'big', fx: { h: -3 } };
      return '그 사람은 다시 오지 않았습니다.'; },
  },
  kz_inf_papers: {
    tags: [T('KAZ_INFECTED')], once: false, gap: 4, at: 0.5,
    ok: (s) => (s.S.track ? s.S.track.stage : -1) >= 1 && s.S.money >= s.med * 1.5,
    build: (s) => ({ title: '상금의 쓸모', body: '모은 상금이 ' + Math.round(s.S.money).toLocaleString() + ' LMD입니다. 감염자 기사의 상금은 바깥 기사의 열에 하나지만, 쓸 데는 정해져 있습니다. 치료비, 가족의 신분 서류, 다음 경기 장비.',
      choices: [{ k: 'cure', label: '치료비', sub: '건강 +', auto: 1.2 }, { k: 'papers', label: '가족 신분 서류', sub: '행복 +, 연줄 +', auto: 1 }, { k: 'gear', label: '장비', sub: '기량 +, 순위 +', auto: 1 }] }),
    apply: (s, k) => { const c = medX(s, 1.2);
      if (k === 'cure') return { t: '치료비로 썼습니다. 결정의 진행이 조금 늦어졌다고 의사가 말했습니다. 조금이 얼마인지는 말하지 않았습니다.', k: 'ev', fx: { money: -c, hl: 6 } };
      if (k === 'papers') return { t: '가족의 신분 서류를 샀습니다. 바깥에서는 공짜인 종이였습니다. 어머니가 처음으로 구역 밖 시장에 갔습니다.', k: 'warm', fx: { money: -c, h: 6, cap: { ties: 0.04 } } };
      return { t: '장비를 샀습니다. 상표 없는 갑옷이었습니다. 상표 없는 것이 더 비쌌습니다.', k: 'ev', fx: { money: -c, cap: { skill: 0.05 }, standing: 5 } }; },
  },
  marry_civil: marryWrap('civil', (s, pr, t) => wa(pr.name) + ' 시청 혼인 신고를 이야기했습니다. 서류 두 장, 증인 둘, 도장 하나. ' + (pr.home ? '상대는 ' + nat(s, pr.home) + ' 사람입니다. 시청 직원이 서류를 한 장 더 꺼냈습니다.' : '시청 복도에는 메이저 포스터가 붙어 있었고, 신고 창구는 그 아래였습니다.'), ['신고한다', '미룬다', '하지 않는다']),
  marry_sponsor: marryWrap('sponsor', (s, pr, t) => '스폰서가 혼담을 가져왔습니다. ' + wa(pr.name) + ' 결혼하면 광고가 하나 더 붙고, 지참금 ' + Math.round(s.med * t.dowry).toLocaleString() + ' LMD는 회사가 냅니다. 결혼식 중계권도 회사 것입니다.', ['받아들인다', '보류한다', '거절한다']),
  marry_village: marryWrap('village', (s, pr, t) => '남부 마을 혼례입니다. ' + wa(pr.name) + ' 마을 회관에서 식을 올리고, 지참금 대신 밭 한 뙈기를 이야기합니다. 보드카 한 통은 양가가 반씩 냅니다.', ['식을 올린다', '한 해 미룬다', '거절한다']),
};

// W11: 엔진 id 와 같은 결정은 국가 디스패처로 옮긴다(여러 파일이 같은 id 를 등록해도 거주국별로 분기)
hoist(decisions, { marry_civil: ['kazimierz'], marry_sponsor: ['kazimierz'], marry_village: ['kazimierz'] });

export default { events, decisions };

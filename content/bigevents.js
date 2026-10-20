// W4c 캐논 대사건(D12: 연도+나이+국가 게이트) + 1102년 이후 연장 대사건(canon:false, 캐논 공백 구간) + 대사건 결정 3개.
// 캐논 사건마다 "겪음"(nation 게이트, 접미 _live)과 "소문으로 들음"(타국, 접미 _heard) 두 변형.
// W4a 가 0~18세 판을 쓴 사건(용문 1096, 런디니움 1094·1098, 힐록 1098, 쉐라그 1101)은 여기서 a:[19,999] 로만 쓴다.
// 그 밖의 사건은 a:[3,999] 로 두고 문장 안에서 나이를 가른다. 더미 chernobog 와는 id 가 다르므로 등록 시 더미 big 을 뺀다.
// 사망은 die(id, label) 로, 사건 전용 사인 id 는 death_texts.js EXTRA_CAUSES 에 문장이 있다.
// 톤(D25): 담백체, 각주는 세계관 안의 출처만. 봉기·학살·자살은 장면 없이 결과만.
import { infect } from '../src/engine/oripathy.js';
import { humanAge } from '../src/engine/lifetable.js';
import { cul, org, F, orgF, lifeRoll, medX, poor, rich, nomadic, jobName, factionOrg } from './_util.js';
import { eul, iga, eun, wa, ro } from '../src/engine/text.js';

const kid = (s) => s.S.age < 15;
const hAge = (s) => humanAge(s.S.age, s.race.lifeMul);
const not = (nation) => (s) => s.S.root !== nation && s.S.cur !== nation;
/** 소문 변형: 타국이고, 그해 소식을 접할 확률 40%(유년기 기록이 해외 소식으로 넘치지 않게) */
const heard = (nation) => (s) => not(nation)(s) && s.rng.chance(0.4);
const isJob = (s, ...ids) => ids.includes(s.S.job);
const pct = (s, k) => -Math.round(s.S.money * k);
/** 전시 플래그 켜기(엔진 conflictYear·death·statYear 가 읽는다). war_end 이벤트가 warUntil 연도에 끈다 */
function startWar(s, years) { s.S.flags.war = true; s.S.flags.warUntil = Math.max(s.S.flags.warUntil || 0, s.year + years); }

// ────────────────────────────────────────────────────────────────────────────
// 캐논 대사건
// ────────────────────────────────────────────────────────────────────────────
export const big = [
  // 1. 카즈델 내전 1090~1094
  { id: 'kazdel_war_1090_live', nation: 'kazdel', year: 1090, month: 3, a: [3, 999],
    run: (s) => { startWar(s, 4);
      return { t: kid(s) ? '내전이 시작되었습니다. 어른들은 어느 쪽인지 말하지 않았고, 아이들은 포성으로 방향을 배웠습니다.' : '군사위원회와 바벨 사이에 내전이 시작되었습니다. ' + (isJob(s, 'mercenary', 'warcrow', 'boilerman') ? '계약서가 두 종류로 왔습니다. 한쪽을 골랐습니다.' : '일터는 닫혔고, 식량은 두 배가 되었습니다.'), k: 'big', fx: { h: -5, hl: -2, money: pct(s, 0.15) }, f: F('용병 등록부 전시 기록, 1090년') }; } },
  { id: 'kazdel_war_1090_heard', year: 1090, month: 6, a: [10, 999], c: heard('kazdel'),
    run: (s) => ({ t: '카즈델에서 내전이 났다는 소식이 왔습니다. ' + (s.S.race === 'sarkaz' ? '이 땅의 살카즈를 보는 눈이 하루 만에 달라졌습니다.' : '살카즈끼리의 일이라고 신문은 썼습니다.'), k: 'note', fx: s.S.race === 'sarkaz' ? { h: -2, cap: { ties: -0.03 } } : { cap: { learn: 0.01 } }, f: orgF(s, '해외 소식 게시, 1090년') }) },

  // 2. 더블린 창설 1091
  { id: 'dublinn_1091_live', nation: 'tara', year: 1091, month: 5, a: [3, 999],
    run: (s) => { if (!kid(s) && !s.S.urban && s.rng.chance(0.4)) s.S.flags.dublinnContact = true;
      return { t: kid(s) ? '밤에 어른들이 모여 텐게어로 이야기했습니다. "더블린"이라는 말이 자주 나왔고, 아이들은 자야 했습니다.' : s.S.flags.dublinnContact ? '더블린이라는 조직이 생겼습니다. 어느 저녁, 아는 얼굴이 전단을 두고 갔습니다.' : '더블린이라는 조직이 생겼다고 했습니다. 빅토리아 총독부는 "불법 결사"라고 공고했습니다.', k: 'big', fx: { cap: { ties: 0.01, learn: 0.01 } }, f: F('빅토리아 총독부 공고 제17호, 1091년') }; } },
  { id: 'dublinn_1091_heard', year: 1091, month: 8, a: [10, 999], c: heard('tara'),
    run: (s) => ({ t: '타라에서 분리주의 조직이 결성되었다는 기사가 났습니다. ' + (s.S.root === 'victoria' ? '공작들은 아직 서로 싸우느라 바빴습니다.' : '먼 섬의 일이었습니다.'), k: 'note', fx: { cap: { learn: 0.01 } }, f: orgF(s, '해외 소식 게시, 1091년') }) },

  // 3. 카시미어 수도 엔진 테러·대분리 1094
  { id: 'kazimierz_1094_live', nation: 'kazimierz', year: 1094, month: 8, a: [3, 999],
    run: (s) => { const inCap = nomadic(s) && s.S.urban && lifeRoll(s, 'capital', 0.4); const r = s.rng.rnd();
      if (inCap && r < 0.01) { s.die('kazimierz_1094', '수도 엔진 테러'); return; }
      if (inCap && r < 0.12) return { t: '23회 메이저 중에 수도 엔진이 폭발했습니다. 플레이트가 갈라지며 거리가 둘로 나뉘었고, 다쳤습니다.', k: 'big', fx: { hl: -8, h: -5, money: pct(s, 0.25) }, f: F('감정회 23회 메이저 사고 보고서, 1094년') };
      if (inCap) return { t: '23회 메이저 중에 수도 엔진이 폭발했습니다. 플레이트가 갈라졌고, 반대편에 있던 이웃은 그날로 다른 도시 사람이 되었습니다.', k: 'big', fx: { h: -4, money: pct(s, 0.1) }, f: F('감정회 23회 메이저 사고 보고서, 1094년') };
      return { t: '수도에서 엔진 테러가 났다는 속보가 메이저 중계를 끊었습니다. 그해부터 감염자도 경기에 나올 수 있게 되었습니다.', k: 'big', fx: { h: -2, cap: { learn: 0.01 } }, f: F('감정회 23회 메이저 사고 보고서, 1094년') }; } },
  { id: 'kazimierz_1094_heard', year: 1094, month: 9, a: [10, 999], c: heard('kazimierz'),
    run: (s) => ({ t: '카시미어 수도가 둘로 갈라졌다는 소식이 왔습니다. 메이저 중계를 보던 사람들은 그 장면을 생중계로 보았습니다.', k: 'note', fx: { h: -1 } }) },

  // 4. 테레시아 암살·바벨 붕괴 1094
  { id: 'teresia_1094_live', nation: 'kazdel', year: 1094, month: 10, a: [3, 999],
    run: (s) => ({ t: '테레시아가 죽었습니다. 바벨은 흩어졌고, 섭정왕이 왕좌 옆에 섰습니다. ' + (kid(s) ? '어른들이 우는 것을 처음 보았습니다.' : '거리에서 이름을 부르는 사람은 없었습니다. 부르면 끌려갔습니다.'), k: 'big', fx: { h: -6, cap: { ties: -0.01 } }, f: F('용병 등록부 전시 기록, 1094년 가을') }) },
  { id: 'teresia_1094_heard', year: 1094, month: 11, a: [10, 999], c: heard('kazdel'),
    run: (s) => ({ t: s.S.race === 'sarkaz' ? '카즈델의 여왕이 죽었다는 소식이 왔습니다. 집에서는 아무도 말하지 않았고, 밖에서는 아무도 묻지 않았습니다.' : '카즈델에서 왕이 바뀌었다는 짧은 기사가 났습니다. 살카즈 군대가 빅토리아로 간다는 말이 더 길었습니다.', k: 'note', fx: s.S.race === 'sarkaz' ? { h: -3 } : {}, f: orgF(s, '해외 소식 게시, 1094년') }) },

  // 5. 런디니움 점령 시작 1094 (성인판)
  { id: 'londinium_1094_live', nation: 'victoria', year: 1094, a: [19, 999], c: (s) => s.S.cur === 'victoria' && s.S.urban && lifeRoll(s, 'londinium', 0.3),
    run: (s) => { s.S.flags.londinium = true;
      return { t: '런디니움에 살았습니다. 공작들이 서로를 쓰러뜨린 자리에 살카즈 군대가 들어왔고, 성문이 닫혔습니다. 배급표가 월급을 대신했습니다.', k: 'big', fx: { h: -5, hl: -2, money: pct(s, 0.2) } }; } },
  { id: 'londinium_1094_heard', homeOk: true, year: 1094, month: 12, a: [10, 999], c: (s) => !(s.S.cur === 'victoria' && s.S.flags.londinium) && (s.S.root === 'victoria' || s.rng.chance(0.4)),
    run: (s) => ({ t: s.S.root === 'victoria' ? '런디니움이 살카즈 군대에 넘어갔습니다. 공작령마다 깃발이 달랐고, 수도 쪽 길은 끊겼습니다.' : '빅토리아 수도가 살카즈 군대에 점령되었다는 소식이 왔습니다. 그 나라 물건값이 올랐습니다.', k: s.S.root === 'victoria' ? 'big' : 'note', fx: s.S.root === 'victoria' ? { h: -3, money: pct(s, 0.05) } : { money: pct(s, 0.02) }, f: orgF(s, '해외 소식 게시, 1094년') }) },

  // 6. 체르노보그 봉기·재앙 1096.12 (전 연령, 더미 대체)
  { id: 'chernobog_1096_live', nation: 'ursus', year: 1096, month: 12, a: [3, 999],
    run: (s) => { const res = lifeRoll(s, 'chernobogRes', 0.06); const evac = s.S.flags['evac_1096'] === 'go'; const r = s.rng.rnd();
      if (res && !evac && r < 0.33) { s.die('chernobog_1096', '체르노보그 재앙'); return; }
      if (res && !evac && r < 0.66) { if (!s.S.ori.on) infect(s, 'chernobog'); else s.S.ori.uL = +(s.S.ori.uL + 0.1).toFixed(3); return { t: '체르노보그에 살았습니다. 봉기와 재앙이 같은 날 왔습니다. 도시의 셋 중 하나가 죽었고, 잔류 오리지늄 속에서 사흘을 걸어 나왔습니다.', k: 'big', fx: { hl: -10, h: -8, money: pct(s, 0.7) } }; }
      if (res && !evac) return { t: '체르노보그에 살았습니다. 봉기와 재앙이 같은 날 왔습니다. 살아남았고, 집은 남지 않았습니다.', k: 'big', fx: { hl: -5, h: -8, money: pct(s, 0.6) } };
      if (res && evac) return { t: '경보 전에 체르노보그를 떠났습니다. 떠난 다음 주에 도시가 없어졌습니다. 가져온 것은 가방 두 개였습니다.', k: 'big', fx: { h: -5, money: pct(s, 0.4) } };
      if (r < 0.4) return { t: '체르노보그가 재앙에 삼켜졌습니다. 그 도시에 있던 친척 하나가 연락이 끊겼고, 봄이 와도 끊긴 채였습니다.', k: 'big', fx: { h: -5, money: pct(s, 0.05) } };
      return { t: '체르노보그가 재앙에 삼켜졌습니다. 라디오는 봉기 이야기를 먼저 했고, 재앙 이야기를 나중에 했습니다.', k: 'big', fx: { h: -3 } }; } },
  { id: 'chernobog_1096_heard', year: 1096, month: 12, a: [10, 999], c: heard('ursus'),
    run: (s) => ({ t: s.S.root === 'yan' ? '체르노보그가 재앙에 삼켜졌고, 그 도시가 용문 쪽으로 흘러온다는 속보가 났습니다.' : '우르수스의 도시 하나가 재앙에 통째로 사라졌다는 소식이 왔습니다. 감염자 봉기가 먼저였다는 말도 있었습니다.', k: 'note', fx: { h: -1 }, f: orgF(s, '해외 소식 게시, 1096년 12월') }) },

  // 7. 용문 사변 1096.12 (성인판)
  { id: 'lungmen_1096_live', nation: 'lungmen', year: 1096, month: 12, a: [19, 999],
    run: (s) => { const r = s.rng.rnd();
      if (poor(s) && r < 0.03) { s.die('lungmen_1096', '용문 사변'); return; }
      if (poor(s) && r < 0.12) { if (!s.S.ori.on) infect(s, 'lungmen'); return { t: '사변이 빈민가를 덮쳤습니다. 집이 불탔고, 연기 속에서 며칠을 보냈습니다.', k: 'big', fx: { hl: -6, h: -6, money: pct(s, 0.4) } }; }
      if (poor(s)) return { t: '사변이 났습니다. 근위국이 구역을 봉쇄했고, 일터는 한 달 닫혔습니다.', k: 'big', fx: { h: -5, money: pct(s, 0.2) } };
      if (isJob(s, 'lgd_officer', 'police')) return { t: '사변이 났습니다. 근위국 전원이 소집되었고, 한 달 동안 집에 들어가지 못했습니다. 동료 ' + s.rng.ri(1, 5) + '명이 돌아오지 않았습니다.', k: 'big', fx: { hl: -4, h: -5, cap: { ties: 0.01 } }, f: F('용문 근위국 치안 백서, 1096년 12월') };
      return { t: '사변이 났습니다. 상층부에서는 창밖 연기와 단말기 속보로 알았습니다. 집세는 오르지 않았고, 그것이 이상했습니다.', k: 'big', fx: { h: -3 } }; } },
  { id: 'lungmen_1096_heard', year: 1097, month: 1, a: [10, 999], c: heard('lungmen'),
    run: (s) => ({ t: '용문에서 감염자 봉기가 있었다는 소식이 왔습니다. 로도스 아일랜드라는 제약회사 이름이 처음으로 신문에 났습니다.', k: 'note', fx: { cap: { learn: 0.01 } }, f: orgF(s, '해외 소식 게시, 1097년 1월') }) },

  // 8. 카시미어 24회 메이저 1097
  { id: 'kazimierz_major_1097_live', nation: 'kazimierz', year: 1097, month: 8, a: [3, 999],
    run: (s) => { if (isJob(s, 'knight', 'arena_knight', 'knight_trainee')) { const r = s.rng.rnd(); if (r < 0.03) { s.die('major_arena', '경기장 사망'); return; } if (r < 0.3) return { t: '24회 메이저에 나갔습니다. 다쳤고, 스폰서는 계약을 갱신하지 않았습니다.', k: 'big', fx: { hl: -8, h: -4, money: pct(s, 0.1) }, f: F('감정회 24회 메이저 기록, 1097년') }; return { t: '24회 메이저에 나갔습니다. 살아남았고, 이름이 중계에 한 번 나왔습니다.', k: 'big', fx: { h: 5, money: medX(s, 0.5), cap: { ties: 0.02 } }, f: F('감정회 24회 메이저 기록, 1097년') }; }
      const bet = !kid(s) && s.rng.chance(0.3);
      return { t: '24회 메이저가 열렸습니다. ' + (kid(s) ? '학교가 결승 날 쉬었습니다.' : bet ? '돈을 걸었고, 잃었습니다.' : '온 도시가 다섯 달 동안 경기 이야기만 했습니다.') + ' 우승자는 작년과 같은 사람이었습니다.', k: 'ev', fx: bet ? { h: -2, money: pct(s, 0.05) } : { h: 3, cap: { ties: 0.01 } }, f: F('감정회 24회 메이저 기록, 1097년') }; } },
  { id: 'kazimierz_major_1097_heard', year: 1097, month: 9, a: [10, 999], c: heard('kazimierz'),
    run: (s) => ({ t: '카시미어 메이저 결승 중계를 보았습니다. ' + (rich(s) ? '응접실 단말기로였습니다.' : '가게 앞에 모여서였습니다.'), k: 'note', fx: { h: 1 }, f: orgF(s, '해외 중계 시청 집계, 1097년') }) },

  // 9. 월루몽드 봉기 1097 가을
  { id: 'wolumonde_1097_live', nation: 'leithanien', year: 1097, month: 10, a: [3, 999],
    run: (s) => { const there = !s.S.urban && lifeRoll(s, 'wolumonde', 0.15); const rebel = s.S.flags.rebel === 1097; const r = s.rng.rnd();
      if (rebel && r < 0.2) { s.die('wolumonde_1097', '월루몽드 봉기'); return; }
      if (rebel) return { t: '월루몽드에서 봉기에 섰습니다. 마을은 그해 가을 폐쇄되었고, 살아남은 사람들은 이름을 바꿔 흩어졌습니다.', k: 'big', fx: { hl: -5, h: -5, money: pct(s, 0.5), cap: { ties: -0.03 } }, f: F('궁정 기록국 월루몽드 폐쇄 공고, 1097년') };
      if (there) return { t: '월루몽드 근처에 살았습니다. 봉기가 있었고, 마을이 폐쇄되었습니다. 그쪽 길로는 더 가지 않게 되었습니다.', k: 'big', fx: { h: -3, cap: { ties: -0.01 } }, f: F('궁정 기록국 월루몽드 폐쇄 공고, 1097년') };
      return { t: '월루몽드라는 변경 마을이 지도에서 지워졌다고 했습니다. 신문은 "감염자 소요"라고만 썼습니다.', k: 'note', fx: { h: -1 } }; } },
  { id: 'wolumonde_1097_heard', year: 1097, month: 11, a: [10, 999], c: heard('leithanien'),
    run: (s) => ({ t: '라이타니엔 변경에서 감염자 봉기가 있었다는 짧은 기사가 났습니다. 마을 이름은 적혀 있지 않았습니다.', k: 'note', fx: { cap: { learn: 0.01 } }, f: orgF(s, '해외 소식 게시, 1097년') }) },

  // 10. 쉐라그 설산 사변 1097.12
  { id: 'kjerag_1097_live', nation: 'kjerag', year: 1097, month: 12, a: [3, 999],
    run: (s) => ({ t: '설산에서 사변이 있었습니다. 대장로가 죽었고, 새 성녀가 섰고, 삼족 가주들이 "개방"을 선언했습니다. ' + (kid(s) ? '어른들은 산이 달라질 거라고 했습니다.' : isJob(s, 'karlan_trader') ? '카란 무역상의 장부가 두 배로 두꺼워졌습니다.' : '산 아래 물건이 산 위로 올라오기 시작했습니다.'), k: 'big', fx: isJob(s, 'karlan_trader') ? { money: medX(s, 0.4), h: 2 } : { h: 1, cap: { learn: 0.02 } }, f: F('삼족 공의회 등기소 개방 선언문, 1097년 12월') }) },
  { id: 'kjerag_1097_heard', year: 1098, month: 2, a: [10, 999], c: heard('kjerag'),
    run: (s) => ({ t: '쉐라그가 국경을 열었다는 소식이 왔습니다. 치즈 값이 조금 내렸습니다.', k: 'note', fx: { h: 1 } }) },

  // 11. 타라 힐록 참사 1098.1 (성인판)
  { id: 'hillock_1098_live', nation: 'tara', year: 1098, month: 1, a: [19, 999],
    run: (s) => { const rebel = s.S.flags.rebel === 1097; const r = s.rng.rnd();
      if (rebel && r < 0.3) { s.die('hillock_1098', '힐록 참사'); return; }
      if (rebel) return { t: '힐록에 있었습니다. 봉기는 하루를 가지 못했고, 돌아온 사람은 절반이었습니다. 이름을 바꾸고 다른 마을로 갔습니다.', k: 'big', fx: { hl: -6, h: -6, money: pct(s, 0.3), cap: { ties: -0.02 } }, f: F('성당 호적부 힐록 교구 기록, 1098년 1월') };
      return { t: '힐록에서 참사가 있었습니다. 1월 2일이었습니다. 마을마다 밤에 불이 켜졌고, 빅토리아 총독부는 "진압"이라고 공고했습니다.', k: 'big', fx: { h: -4, cap: { ties: 0.01 } }, f: F('성당 호적부 힐록 교구 기록, 1098년 1월') }; } },
  { id: 'hillock_1098_heard', year: 1098, month: 2, a: [10, 999], c: heard('tara'),
    run: (s) => ({ t: s.S.root === 'victoria' ? '타라에서 봉기가 진압되었다는 공고가 붙었습니다. 사망자 수는 적혀 있지 않았습니다.' : '빅토리아 변경에서 학살이 있었다는 소문이 돌았습니다. 신문은 싣지 않았습니다.', k: 'note', fx: { h: -1 }, f: orgF(s, '해외 소식 게시, 1098년') }) },

  // 12. 런디니움 전투 1098.10 (성인판)
  { id: 'londinium_1098_live', nation: 'victoria', year: 1098, month: 10, a: [19, 999], c: (s) => !!s.S.flags.londinium && !s.S.flags.londiniumEscaped,
    run: (s) => { const r = s.rng.rnd();
      if (r < 0.03) { s.die('londinium_1098', '런디니움 전투'); return; }
      if (r < 0.2) return { t: '런디니움 전투가 있었습니다. 성벽 안에서 다쳤습니다. 열흘 뒤 살카즈 군대가 물러갔고, 봉쇄 4년이 끝났습니다.', k: 'big', fx: { hl: -8, h: 2, money: pct(s, 0.2) }, f: F('공작령 등기소 런디니움 봉쇄 해제 공고, 1098년') };
      return { t: '런디니움 전투가 있었습니다. 지하에서 여드레를 보냈습니다. 나왔을 때 성문이 열려 있었고, 봉쇄 4년이 끝났습니다.', k: 'big', fx: { h: 5, hl: -2 }, f: F('공작령 등기소 런디니움 봉쇄 해제 공고, 1098년') }; } },
  { id: 'londinium_1098_heard', homeOk: true, year: 1098, month: 11, a: [10, 999], c: (s) => !s.S.flags.londinium && (['victoria', 'kazdel'].includes(s.S.root) || s.rng.chance(0.4)),
    run: (s) => ({ t: s.S.root === 'victoria' ? '런디니움이 돌아왔습니다. 의회가 다시 열렸고, 새 의장이 섰습니다. 살카즈를 보는 눈은 돌아오지 않았습니다.' : s.S.root === 'kazdel' ? '런디니움에서 군대가 철수했습니다. 섭정왕도, 네츠살렘도 돌아오지 않았습니다. 카즈델에 과도 정부가 섰습니다.' : '빅토리아가 수도를 되찾았다는 소식이 왔습니다. 로도스 아일랜드가 중재했다고 했습니다.', k: ['victoria', 'kazdel'].includes(s.S.root) ? 'big' : 'note', fx: s.S.root === 'victoria' ? { h: 3 } : s.S.root === 'kazdel' ? { h: -2, cap: { ties: 0.01 } } : {}, f: orgF(s, '해외 소식 게시, 1098년') }) },

  // 13. 타라 독립 선언 1098 가을
  { id: 'tara_indep_1098_live', nation: 'tara', year: 1098, month: 11, a: [3, 999],
    run: (s) => ({ t: '타라가 독립을 선언했습니다. 마을에 깃발이 올라갔고, ' + (kid(s) ? '학교가 문을 닫았습니다.' : '다음 주에 빅토리아 군이 왔습니다. 깃발은 내려갔다 다시 올라갔습니다.') + ' 사윈 밤에는 사라진 이름이 많았습니다.', k: 'big', fx: { h: 2, hl: -1, cap: { ties: 0.02 } }, f: F('더블린 포고문, 1098년 가을') }) },
  { id: 'tara_indep_1098_heard', year: 1098, month: 12, a: [10, 999], c: heard('tara'),
    run: (s) => ({ t: s.S.root === 'victoria' ? '타라가 독립을 선언했습니다. 의회는 승인하지 않았고, 군대는 보냈습니다.' : '빅토리아의 섬 하나가 독립을 선언했다는 소식이 왔습니다.', k: 'note', fx: s.S.root === 'victoria' ? { h: -1 } : { cap: { learn: 0.01 } }, f: orgF(s, '해외 소식 게시, 1098년') }) },

  // 14. 라테라노 만국 정상회담 1099.3
  { id: 'laterano_summit_1099_live', nation: 'laterano', year: 1099, month: 3, a: [3, 999],
    run: (s) => ({ t: '만국 정상회담이 열렸습니다. 계시의 탑 종이 천 년 만에 울렸습니다. ' + (s.S.race === 'sankta' ? '모두가 같은 것을 느꼈고, 말은 필요 없었습니다.' : '산크타 이웃들은 무릎을 꿇었고, 저는 서 있었습니다.'), k: 'big', fx: s.S.race === 'sankta' ? { h: 4, cap: { ties: 0.02 } } : { h: 1, cap: { ties: -0.01 } }, f: F('공증소 공고, 1099년 종 타종 기록') }) },
  { id: 'laterano_summit_1099_heard', year: 1099, month: 4, a: [10, 999], c: heard('laterano'),
    run: (s) => ({ t: '라테라노에서 만국 정상회담이 열렸습니다. ' + (s.S.root === 'victoria' ? '빅토리아는 가지 않았습니다.' : cul(s).ruler + ' 쪽 사람이 갔다고 했습니다.') + ' 종소리를 단말기로 들었습니다.', k: 'note', fx: { cap: { learn: 0.01 } }, f: orgF(s, '해외 소식 게시, 1099년') }) },

  // 15. 볼시니 소요 1099 → 뉴 볼시니 1100
  { id: 'volsinii_1099_live', nation: 'siracusa', year: 1099, month: 10, a: [3, 999],
    run: (s) => { const there = s.S.urban && lifeRoll(s, 'volsinii', 0.25); const r = s.rng.rnd();
      if (there && !kid(s) && r < 0.02) { s.die('vendetta', '벤데타'); return; }
      if (there) return { t: '볼시니에 살았습니다. 패밀리 사이에 소요가 났고, 사흘 동안 총성이 그치지 않았습니다. ' + (isJob(s, 'famiglia', 'cleaner') ? '어느 쪽에 섰는지가 그 뒤 평생을 정했습니다.' : '가게 문을 닫고 집에 있었습니다.'), k: 'big', fx: { h: -5, hl: -2, money: pct(s, 0.15) }, f: F('시청(패밀리 승인) 소요 기록, 1099년 가을') };
      return { t: '볼시니에서 패밀리 소요가 있었다고 했습니다. 어느 가문이 사라졌는지는 ' + cul(s).elder + '들이 먼저 알았습니다.', k: 'note', fx: { h: -1 }, f: F('시청(패밀리 승인) 공고, 1099년') }; } },
  { id: 'volsinii_1099_heard', year: 1099, month: 11, a: [10, 999], c: heard('siracusa'),
    run: (s) => ({ t: '시라쿠사 볼시니에서 패밀리 간 소요가 있었다는 소식이 왔습니다. 와인 값은 그대로였습니다.', k: 'note' }) },
  { id: 'newvolsinii_1100_live', nation: 'siracusa', year: 1100, month: 6, a: [3, 999],
    run: (s) => ({ t: '뉴 볼시니에 신도시관리법과 경찰국이 생겼습니다. ' + (isJob(s, 'famiglia', 'cleaner') ? '일거리가 줄었고, 법이라는 것이 생겼습니다.' : '패밀리가 아닌 사람이 제복을 입고 다녔습니다. 처음 보는 광경이었습니다.') + ' 11월에는 카르네발레가 돌아왔습니다.', k: 'big', fx: isJob(s, 'famiglia', 'cleaner') ? { money: pct(s, 0.1), h: -2 } : { h: 2, cap: { ties: 0.01 } }, f: F('시청(패밀리 승인) 신도시관리법 공고, 1100년') }) },
  { id: 'newvolsinii_1100_heard', year: 1100, month: 12, a: [10, 999], c: heard('siracusa'),
    run: (s) => ({ t: '시라쿠사에 경찰이 생겼다는 기사가 났습니다. 기사 옆에 카르네발레 사진이 실렸습니다.', k: 'note', fx: { h: 1 } }) },

  // 16. 라테라노 사변 1101.8~9
  { id: 'laterano_1101_live', nation: 'laterano', year: 1101, month: 8, a: [3, 999],
    run: (s) => { const r = s.rng.rnd();
      if (!kid(s) && r < 0.02) { s.die('laterano_1101', '라테라노 사변'); return; }
      if (!kid(s) && r < 0.15 && s.S.race !== 'sankta') { s.migrate('laterano_1101'); if (s.S.phase !== 'life') return; return { t: '사변이 있었습니다. 석 달 동안 도시가 멈췄고, 비산크타들이 먼저 떠났습니다. 함께 떠났습니다.', k: 'big', fx: { h: -5, money: pct(s, 0.3), cap: { ties: -0.03 } }, f: F('공증소 사변 기록, 1101년') }; }
      return { t: '사변이 있었습니다. 석 달 동안 도시가 멈췄습니다. ' + (s.S.race === 'sankta' ? '이웃 몇이 스스로 떠났고, 공증소는 그 수를 적지 않았습니다.' : '떠나는 사람이 많았고, 남은 사람은 집세가 내렸습니다.') + ' 회복에는 석 달이 걸렸습니다.', k: 'big', fx: { h: -6, cap: { ties: -0.02 } }, f: F('공증소 사변 기록, 1101년') }; } },
  { id: 'laterano_1101_heard', year: 1101, month: 10, a: [10, 999], c: heard('laterano'),
    run: (s) => ({ t: '라테라노에서 사변이 있었다는 소식이 왔습니다. ' + (s.S.race === 'sankta' ? '먼 곳에서도 무언가가 끊긴 느낌이 사흘 갔습니다.' : '산크타 이민자가 이 땅에도 조금 늘었습니다.'), k: 'note', fx: s.S.race === 'sankta' ? { h: -3 } : {}, f: orgF(s, '해외 소식 게시, 1101년') }) },

  // 17. 우르수스 전력 위기·극북 반란 1101
  { id: 'ursus_1101_live', nation: 'ursus', year: 1101, month: 10, a: [3, 999],
    run: (s) => { const rebel = s.S.flags.rebel === 1101; const r = s.rng.rnd();
      if (rebel && r < 0.25) { s.die('far_north_1101', '극북 반란'); return; }
      if (rebel) return { t: '극북 광산 봉기에 섰습니다. 제4군단이 왔고, 라디오는 "우르수스가 우리를 버렸다"고 했습니다. 살아남아 남쪽으로 내려왔습니다.', k: 'big', fx: { hl: -6, h: -4, money: pct(s, 0.5), cap: { ties: -0.02 } }, f: F('제국 내무성 극북 진압 기록, 1101년') };
      if (s.S.urban) return { t: '전력 위기가 왔습니다. 콜로살 광맥이 줄었고, 도시는 밤마다 꺼졌습니다. 계엄이 선포되었고, ' + (kid(s) ? '학교에서 학생들이 징집되어 갔습니다.' : '학생들이 거리로 나왔다가 트럭에 실려 갔습니다.'), k: 'big', fx: { h: -4, hl: -2, money: pct(s, 0.1) }, f: F('제국 내무성 계엄 공고, 1101년') };
      return { t: '극북에서 광부들이 봉기했다는 소식이 왔습니다. 제4군단이 올라갔고, 내려온 소식은 없었습니다. 겨울 난방은 반으로 줄었습니다.', k: 'big', fx: { h: -3, hl: -2 }, f: F('제국 내무성 공식 발표, 1101년') }; } },
  { id: 'ursus_1101_heard', year: 1101, month: 11, a: [10, 999], c: heard('ursus'),
    run: (s) => ({ t: '우르수스에 전력 위기와 극북 반란이 있었다는 소식이 왔습니다. ' + (['kazimierz', 'sami', 'yan'].includes(s.S.root) ? '국경 쪽에 군대가 늘었습니다.' : '먼 북쪽의 일이었습니다.'), k: 'note', fx: ['kazimierz', 'sami', 'yan'].includes(s.S.root) ? { h: -1 } : {}, f: orgF(s, '해외 소식 게시, 1101년') }) },

  // 18. 쉐라그 첫 재앙 1101.12 (성인판)
  { id: 'kjerag_1101_live', nation: 'kjerag', year: 1101, month: 12, a: [19, 999],
    run: (s) => { const evac = s.S.flags['evac_1101'] === 'go'; const r = s.rng.rnd();
      if (!evac && r < 0.02) { s.die('kjerag_1101', '쉐라그 첫 재앙'); return; }
      if (!evac && r < 0.1) { if (!s.S.ori.on) infect(s, 'kjerag'); return { t: '쉐라그에 첫 재앙이 왔습니다. 눈사태와 함께였습니다. 집을 잃었고, 설산의 공기가 달라졌습니다.', k: 'big', fx: { hl: -6, h: -6, money: pct(s, 0.4) } }; }
      if (evac) return { t: '관측소 경보를 믿고 산을 내려갔습니다. 다음 날 재앙이 왔습니다. 한 번도 온 적 없던 것이었습니다. 집은 남았고, 창은 깨졌습니다.', k: 'big', fx: { h: -3, money: pct(s, 0.15) } };
      return { t: '쉐라그에 첫 재앙이 왔습니다. 한 번도 온 적이 없다던 땅이었습니다. 산신의 사제는 사흘 동안 말이 없었고, 그달 말 빅토리아 군이 국경을 넘었다 돌아갔습니다.', k: 'big', fx: { h: -4 } }; } },
  { id: 'kjerag_1101_heard', year: 1102, month: 1, a: [10, 999], c: heard('kjerag'),
    run: (s) => ({ t: '재앙이 한 번도 오지 않던 쉐라그에 재앙이 왔다는 소식이 왔습니다. ' + (s.S.root === 'victoria' ? '공작 하나가 군대를 보냈다가 거두었습니다.' : '재앙 정보 전달자 협회는 "예측 범위 밖"이라고 했습니다.'), k: 'note', fx: { h: -1 }, f: orgF(s, '해외 소식 게시, 1102년') }) },

  // 19. 볼리바르 대행진·도솔레스 소요 1101.5
  { id: 'bolivar_1101_live', nation: 'bolivar', year: 1101, month: 5, a: [3, 999],
    run: (s) => { const r = s.rng.rnd(); const dos = s.S.urban && lifeRoll(s, 'dossoles', 0.2);
      if (dos && !kid(s) && r < 0.02) { s.die('dossoles_1101', '도솔레스 소요'); return; }
      if (dos) return { t: '도솔레스에 살았습니다. 소요가 났고, 시장이 물러났고, 인공 바다 옆에서 사흘 동안 총성이 났습니다. 컬럼비아 군이 북쪽에서 내려왔습니다.', k: 'big', fx: { h: -5, hl: -2, money: pct(s, 0.2) }, f: F(factionOrg(s) + ' 도솔레스 소요 기록, 1101년') };
      if (!kid(s) && r < 0.4) return { t: '대행진에 나갔습니다. 세 정부 어느 쪽도 아닌 깃발 아래였습니다. 걷는 동안은 모두 같은 나라 사람이었습니다.', k: 'big', fx: { h: 3, hl: -1, cap: { ties: 0.03 } }, f: F(factionOrg(s) + ' 집회 기록, 1101년 5월') };
      return { t: '대행진이 있었습니다. ' + (kid(s) ? '학교가 쉬었고, 어른들이 걸어갔습니다.' : '집에 있었습니다. 세 정부가 처음으로 같은 공고를 냈습니다.') + ' 북쪽에서는 컬럼비아 군이 내려왔습니다.', k: 'big', fx: { h: 1, cap: { ties: 0.01 } }, f: F(factionOrg(s) + ' 집회 기록, 1101년 5월') }; } },
  { id: 'bolivar_1101_heard', year: 1101, month: 6, a: [10, 999], c: heard('bolivar'),
    run: (s) => ({ t: s.S.root === 'columbia' ? '볼리바르 북부에 군대가 들어갔습니다. 신문은 "질서 회복"이라고 썼고, 블랙 플로우 쪽은 지지 않았습니다.' : '볼리바르에서 대행진과 소요가 있었다는 소식이 왔습니다. 커피 값이 올랐습니다.', k: 'note', fx: { money: pct(s, 0.01) }, f: orgF(s, '해외 소식 게시, 1101년') }) },

  // 20. 염국 경우 광맥 수축 1102.10
  { id: 'yan_1102_live', nation: 'yan', year: 1102, month: 10, a: [3, 999], c: (s) => s.S.cur !== 'lungmen',
    run: (s) => { const miner = isJob(s, 'miner', 'ori_miner');
      if (miner) { if (s.S.track) s.leaveTrack('expel', { quiet: true }); else { s.S.job = null; s.S.income = 0; } return { t: '경우 광맥이 수축했습니다. 갱도가 닫혔고, 광부는 하루아침에 일이 없어졌습니다. 흠천감은 "백조 대혼란"이라고 불렀습니다.', k: 'big', fx: { h: -5, money: pct(s, 0.2) } }; }
      return { t: '경우 광맥이 줄었다는 소식이 왔습니다. 오리지늄 값이 올랐고, ' + (kid(s) ? '학교 난방이 줄었습니다.' : '아츠 유닛 값이 따라 올랐습니다.') + ' 흠천감은 "백조 대혼란"이라고 불렀습니다.', k: 'big', fx: { money: pct(s, 0.05), h: -1 }, f: F('흠천감 고시, 1102년 10월') }; } },
  { id: 'yan_1102_heard', year: 1102, month: 12, a: [10, 999], c: heard('yan'),
    run: (s) => ({ t: '염국의 큰 광맥이 줄고 있다는 소식이 왔습니다. 로도스 아일랜드가 염국 천사부와 손잡았다는 기사가 뒤를 이었습니다.', k: 'note', fx: { cap: { learn: 0.01 } }, f: orgF(s, '해외 소식 게시, 1102년') }) },

  // ────────────────────────────────────────────────────────────────────────
  // 1102년 이후 연장 대사건(canon:false). 국가별 구조적 긴장을 늘인 것. 생애 1회 롤로 모든 생에 다 오지는 않는다.
  // ────────────────────────────────────────────────────────────────────────
  { id: 'yan_vein_1106', canon: false, year: 1106, month: 4, a: [3, 999], c: (s) => lifeRoll(s, 'cr_yanvein', 0.75),
    run: (s) => { if (s.S.root !== 'yan') return { t: '염국 광맥 쇠퇴가 다른 광맥으로 번졌다는 소식이 왔습니다. 오리지늄 값이 다시 올랐습니다.', k: 'note', fx: { money: pct(s, 0.02) } };
      if (isJob(s, 'miner', 'ori_miner', 'caravan_guard')) { if (s.S.track) s.leaveTrack('expel', { quiet: true }); else { s.S.job = null; s.S.income = 0; } return { t: '광맥 쇠퇴가 서쪽 갱도까지 번졌습니다. 일이 없어졌습니다. 호부는 "재배치"라고 했고, 재배치는 없었습니다.', k: 'big', fx: { h: -5, money: pct(s, 0.15) } }; }
      return { t: '광맥 쇠퇴가 번졌습니다. 물가가 올랐고, 흠천감은 역법을 고쳐 흉년을 길년으로 바꿨습니다.', k: 'big', fx: { money: pct(s, 0.08), h: -2 } }; } },
  { id: 'lungmen_reform_1105', canon: false, nation: 'lungmen', year: 1105, month: 1, a: [3, 999], c: (s) => lifeRoll(s, 'cr_lmreform', 0.7),
    run: (s) => { const q = s.S.flags.quarantined; s.S.flags.quarantined = false; s.S.flags.noMove = false;
      return { t: '근위국이 감염자 격리구역을 공식 폐지했습니다. ' + (q ? '이동 제한이 풀렸습니다. 나가 보니 거리가 그대로였고, 보는 눈도 그대로였습니다.' : '빈민가 쪽 벽이 하나 헐렸습니다. 집세는 올랐습니다.'), k: 'big', fx: q ? { h: 5, cap: { ties: 0.02 } } : { money: pct(s, 0.03) }, f: F('용문 근위국 공고, 1105년 춘절') }; } },
  { id: 'bolivar_war_1104', canon: false, nation: 'bolivar', year: 1104, month: 11, a: [3, 999], c: (s) => lifeRoll(s, 'cr_bolwar', 0.8),
    run: (s) => { startWar(s, 3); const evac = s.S.flags['evac_1104'] === 'go';
      return { t: '세 정부가 동시에 총동원령을 냈습니다. 내전이 전면전이 되었습니다. ' + (evac ? '산으로 피난했습니다. 집은 어느 쪽 군대가 썼는지 모릅니다.' : '마을은 석 달에 한 번 깃발이 바뀌었습니다.'), k: 'big', fx: evac ? { h: -4, money: pct(s, 0.3) } : { h: -5, hl: -3, money: pct(s, 0.15) }, f: F('등기소(가까운 정부 쪽) 동원령, 1104년') }; } },
  { id: 'rim_collapse_1107', canon: false, nation: 'rim', year: 1107, month: 4, a: [3, 999], c: (s) => lifeRoll(s, 'cr_rimcol', 0.7),
    run: (s) => { if (isJob(s, 'miner', 'ori_miner', 'pitsinker', 'platform_builder') && s.rng.chance(0.06)) { s.die('mine_accident', '광산 사고'); return; }
      return { t: '타르간길스 대갱도가 무너졌습니다. 사이렌이 이틀 울렸습니다. 광업연합은 "일정 변경 없음"을 방송했고, 보상 항목표는 전부 해당 없음이었습니다.', k: 'big', fx: { h: -4, money: isJob(s, 'miner', 'ori_miner', 'pitsinker', 'platform_builder') ? pct(s, 0.1) : 0, cap: { ties: -0.01 } }, f: F('광업연합 인사부 사고 보고, 1107년') }; } },
  { id: 'victoria_tara_1108', canon: false, nation: 'victoria', year: 1108, month: 5, a: [3, 999], c: (s) => lifeRoll(s, 'cr_victara', 0.65),
    run: (s) => { startWar(s, 2);
      return { t: s.S.cur === 'tara' ? '빅토리아가 다시 군대를 보냈습니다. 독립 10년이었습니다. 감자밭에 참호가 파였습니다.' : '의회가 타라 재점령을 결의했습니다. 징집 통지서가 공작령마다 돌았고, 살카즈 용병이 다시 거리에 보였습니다.', k: 'big', fx: { h: -4, money: pct(s, 0.1) }, f: F(s.S.cur === 'tara' ? '성당 호적부 전시 기록, 1108년' : '공작 평의회 결의, 1108년') }; } },
  { id: 'higashi_bubble_1109', canon: false, nation: 'higashi', year: 1109, month: 9, a: [3, 999], c: (s) => lifeRoll(s, 'cr_bubble', 0.75),
    run: (s) => { const fired = isJob(s, 'clerk', 'insurance_agent', 'banker', 'merchant', 'idol') && s.rng.chance(0.35);
      if (fired) { if (s.S.track) s.leaveTrack('expel', { quiet: true }); else { s.S.job = null; s.S.income = 0; } }
      if (s.S.flags.oriPremium) s.S.flags.oriPremium = +Math.min(0.5, s.S.flags.oriPremium * 1.3).toFixed(2);
      return { t: '남조의 거품이 꺼졌습니다. ' + (fired ? '회사가 문을 닫았습니다. 퇴직금은 없었고, 사과는 있었습니다.' : s.S.sub.region === 'north' ? '북조는 거품이 없었으므로 꺼질 것도 없었습니다. 대신 남조에서 친척이 돌아왔습니다.' : '월급은 그대로였고 집값은 반이 되었습니다.') + ' 보험료는 올랐습니다.', k: 'big', fx: fired ? { h: -6, money: pct(s, 0.2) } : { h: -2, money: pct(s, 0.1) }, f: F('호적대장소 경제 통계 연보, 1109년') }; } },
  { id: 'leithanien_reform_1110', canon: false, nation: 'leithanien', year: 1110, month: 9, a: [3, 999], c: (s) => lifeRoll(s, 'cr_leireform', 0.6),
    run: (s) => { const eased = s.rng.chance(0.5); if (eased && s.S.flags.euthTrack) { s.S.flags.euthTrack = false; s.S.flags.euthNotice = null; }
      return { t: eased ? '보건령 제3조가 개정되었습니다. 3기 통지가 "자발적 신청"으로 바뀌었습니다. ' + (s.S.ori.known ? '서류 한 장이 생사를 바꿨습니다.' : '여황 축제에서 아무도 그 이야기를 하지 않았습니다.') : '보건령 제3조가 개정되었습니다. 통지 기준이 3기에서 "진행이 확인된 2기"로 내려갔습니다.', k: 'big', fx: eased ? { h: s.S.ori.known ? 6 : 1 } : { h: s.S.ori.known ? -6 : -1 }, f: F('궁정 기록국 보건령 개정 공고, 1110년') }; } },
  { id: 'columbia_crash_1111', canon: false, nation: 'columbia', year: 1111, month: 9, a: [3, 999], c: (s) => lifeRoll(s, 'cr_crash', 0.7),
    run: (s) => { if (s.S.flags.oriPremium) s.S.flags.oriPremium = +Math.min(0.5, s.S.flags.oriPremium * 1.4).toFixed(2);
      return { t: '보험협회 지급 준비금이 바닥났습니다. 보험료는 올랐고 보장은 줄었습니다. ' + (s.S.flags.oriPremium ? '감염자 특약 청구서가 두 배가 되었습니다.' : '대통령은 "일시적 조정"이라고 했습니다.'), k: 'big', fx: { money: pct(s, 0.15), h: -3 }, f: F('보험협회 긴급 공고, 1111년') }; } },
  { id: 'kazdel_peace_end_1112', canon: false, nation: 'kazdel', year: 1112, month: 6, a: [3, 999], c: (s) => lifeRoll(s, 'cr_kazdel2', 0.6),
    run: (s) => { startWar(s, 2); if (!kid(s) && s.rng.chance(0.03)) { s.die('kazdel_war2', '카즈델 내전 재발'); return; }
      return { t: '억지력 평화가 끝났습니다. 초병기 하나가 침묵했고, 군벌들이 다시 움직였습니다. 카즈델에서 평화는 휴전의 다른 이름이었습니다.', k: 'big', fx: { h: -5, hl: -2, money: pct(s, 0.2) } }; } },
  { id: 'iberia_silence_1115', canon: false, nation: 'iberia', year: 1115, month: 11, a: [3, 999], c: (s) => lifeRoll(s, 'cr_silence2', 0.5),
    run: (s) => { const coast = !s.S.urban; const evac = s.S.flags['evac_1115'] === 'go'; const r = s.rng.rnd();
      if (coast && !evac && !kid(s) && r < 0.05) { s.die('iberia_silence2', '두 번째 고요함'); return; }
      if (coast && !evac && r < 0.15) { s.migrate('silence2'); if (s.S.phase !== 'life') return; return { t: '등대가 한꺼번에 꺼졌습니다. 재판소는 "두 번째 고요함"이라는 말을 금지했습니다. 해안을 떠나 국경을 넘었습니다.', k: 'big', fx: { h: -6, money: pct(s, 0.4) } }; }
      return { t: '등대가 한꺼번에 꺼졌습니다. 재판소는 "두 번째 고요함"이라는 말을 금지했고, 해안은 봉쇄되었습니다. ' + (evac ? '내륙으로 먼저 옮겨 두었습니다.' : coast ? '바다 소리가 달라졌습니다.' : '내륙에서는 소금 값이 올랐습니다.'), k: 'big', fx: coast ? { h: -5, hl: -2, money: pct(s, 0.2) } : { h: -2, money: pct(s, 0.05) }, f: F('재판소 해안 봉쇄령, 1115년') }; } },
  { id: 'sami_ursus_1116', canon: false, nation: 'sami', year: 1116, month: 1, a: [3, 999], c: (s) => lifeRoll(s, 'cr_samiursus', 0.6),
    run: (s) => { if (!kid(s) && s.rng.chance(0.02)) { s.die('war', '전쟁'); return; }
      return { t: '우르수스 군이 숲 경계를 넘었습니다. 장로들은 "숲이 알아서 한다"고 했고, 숲은 알아서 했습니다. 돌아간 군대는 절반이었고, 마을도 둘이 비었습니다.', k: 'big', fx: { h: -4, hl: -2 } }; } },
  { id: 'ursus_succession_1118', canon: false, nation: 'ursus', year: 1118, month: 2, a: [3, 999], c: (s) => lifeRoll(s, 'cr_succession', 0.6),
    run: (s) => { const camp = s.S.ori.known && !s.S.prison && !s.S.rhodes && s.rng.chance(0.2);
      if (camp) { if (s.S.track) s.leaveTrack('prison', { quiet: true }); s.S.prison = 'camp'; s.S.prisonLeft = s.rng.ri(2, 6); s.S.job = null; return { t: '황제가 죽었습니다. 계승을 둘러싸고 계엄이 선포되었고, 감염자 재분류가 시작되었습니다. 이송 명령서가 왔습니다.', k: 'bad', fx: { h: -8 } }; }
      return { t: '황제가 죽었습니다. 계승을 둘러싸고 군단들이 수도로 모였고, 계엄이 선포되었습니다. ' + (s.S.urban ? '거리에서 초상화가 내려졌다 다시 걸렸습니다. 얼굴이 달랐습니다.' : '세금 고지서의 도장만 바뀌었습니다.'), k: 'big', fx: { h: -3, money: pct(s, 0.08) }, f: F('제국 내무성 계엄 공고, 1118년') }; } },
];

// ────────────────────────────────────────────────────────────────────────────
// 전시 종료 이벤트(startWar 가 켠 플래그를 끈다) — 피드 이벤트지만 가중을 크게 둬 그 해에 반드시 뜬다
// ────────────────────────────────────────────────────────────────────────────
export const events = [
  { id: 'war_end', a: [0, 999], w: 9999, rep: true, c: (s) => !!s.S.flags.war && s.S.flags.warUntil != null && s.year >= s.S.flags.warUntil,
    run: (s) => { s.S.flags.war = false; s.S.flags.warUntil = null;
      return { t: '전쟁이 끝났습니다. 끝났다는 공고가 붙었고, 공고를 믿는 데는 한 해가 더 걸렸습니다.', k: 'big', fx: { h: 3 }, f: orgF(s, '종전 공고, ' + s.year + '년') }; } },
  { id: 'war_year', a: [6, 999], w: 60, rep: true, gap: 1, tags: ['war'],
    run: (s) => ({ t: s.rng.pick(['전시였습니다. 배급표가 돈을 대신했고, 밤에는 불을 켜지 않았습니다.', s.conscript !== 'none' ? '전시였습니다. 이웃 하나가 징집되어 갔고, 하나는 돌아오지 않았습니다.' : '전시였습니다. 이웃 하나가 자원해 갔고, 하나는 돌아오지 않았습니다.', '전시였습니다. 포성이 가까운 날은 지하에서 잤습니다.', '전시였습니다. 소금과 기름이 먼저 사라졌고, 그다음은 젊은 얼굴들이었습니다.']), k: 'bad', fx: { hl: -2, h: -2, money: pct(s, 0.05) }, f: orgF(s, '전시 배급 대장') }) },
];

// ────────────────────────────────────────────────────────────────────────────
// 대사건 결정: 피난/잔류, 봉기 가담/도주, 점령지 탈출
// ────────────────────────────────────────────────────────────────────────────
const EVAC_YEARS = {
  1096: { nation: 'ursus', body: '체르노보그 쪽 하늘이 이상합니다. 재앙 정보 전달자는 경로를 두 번 고쳤고, 봉기 소문은 세 번 돌았습니다.', res: (s) => lifeRoll(s, 'chernobogRes', 0.06), f: '재앙 정보 전달자 협회 경보, 1096년 12월' },
  1101: { nation: 'kjerag', body: '산 위 관측소가 처음 보는 경보를 냈습니다. 재앙은 이 땅에 온 적이 없습니다. 가주 어르신은 "산이 지켜 준다"고 했습니다.', res: () => true, f: '라인 랩 관측소 경보, 1101년 12월' },
  1104: { nation: 'bolivar', body: '세 정부가 동시에 동원령을 냈습니다. 마을은 어느 쪽 길목에도 있습니다.', res: () => true, f: '세 정부 동원령 공고, 1104년' },
  1115: { nation: 'iberia', body: '등대 둘이 같은 밤에 꺼졌습니다. 재판소는 아무 공고도 내지 않았습니다. 할머니들이 "고요함"이라는 말을 꺼냈습니다.', res: (s) => !s.S.urban, f: '재판소 해안 통행 기록, 1115년' },
};

export const decisions = {
  big_evac: {
    once: false, at: 0.8,
    ok: (s) => { const e = EVAC_YEARS[s.year]; return !!e && s.S.age >= 15 && (s.S.cur === e.nation || s.S.root === e.nation) && e.res(s) && s.S.flags['evac_' + s.year] == null; },
    build: (s) => { const e = EVAC_YEARS[s.year];
      return { title: '피난', body: e.body, fact: F(e.f), choices: [
        { k: 'go', label: '피난한다', sub: '재산 −, 사망·감염 위험 −', auto: 1.5 },
        { k: 'stay', label: '남는다', sub: '집을 지킵니다', auto: 1 }] }; },
    apply: (s, k) => { s.S.flags['evac_' + s.year] = k;
      if (k === 'go') { if (s.rng.chance(0.03)) { s.die('evac_fail', '피난 중 사고'); return false; } return { t: '짐을 쌌습니다. 가져갈 수 있는 것은 두 손에 드는 만큼이었습니다.', k: 'ev', fx: { money: pct(s, 0.15), h: -2 } }; }
      return { t: '남기로 했습니다. 창에 판자를 대고 물을 받아 두었습니다.', k: 'note', fx: { h: -1 } }; },
  },
  big_uprising: {
    once: false, at: 0.45,
    ok: (s) => s.S.age >= 16 && !s.S.serving && !s.S.prison && s.S.flags.rebelAsked !== s.year && (
      (s.year === 1097 && s.S.cur === 'leithanien' && !s.S.urban && lifeRoll(s, 'wolumonde', 0.15)) ||
      (s.year === 1097 && s.S.cur === 'tara') ||
      (s.year === 1101 && s.S.root === 'ursus' && (!s.S.urban || isJob(s, 'miner', 'ori_miner')))),
    build: (s) => { s.S.flags.rebelAsked = s.year;
      const body = s.year === 1101 ? '극북 광산에서 봉기가 준비되고 있습니다. "우르수스가 우리를 버렸다"는 전단이 돌았습니다. 아는 얼굴이 함께 가자고 했습니다.'
        : s.S.cur === 'tara' ? '더블린이 겨울에 거사를 준비한다고 합니다. 힐록으로 모이라는 말이 밤에 돌았습니다.'
        : '월루몽드에서 감염자들이 일어서려 합니다. 궁정은 모른 척했고, 마을은 알고 있었습니다.';
      const f = s.year === 1101 ? '제국 내무성 불온 전단 수거 목록, 1101년' : s.S.cur === 'tara' ? '더블린 소집 통지(압수본), 1097년' : '궁정 기록국 변경 치안 보고, 1097년';
      return { title: '봉기', body, fact: F(f), choices: [
        { k: 'join', label: '가담한다', sub: '사망 위험 큼, 관계 +', auto: s.S.ori.known ? 1.5 : 0.6 },
        { k: 'flee', label: '떠난다', sub: '재산 −, 안전', auto: 1.2 },
        { k: 'hide', label: '숨죽인다', sub: '변화 없음', auto: 1.5 }] }; },
    apply: (s, k) => {
      if (k === 'join') { s.S.flags.rebel = s.year; return { t: '함께 가기로 했습니다. 이름은 적지 않았습니다.', k: 'ev', fx: { h: 2, cap: { ties: 0.03 } }, f: F('기록된 바 없음') }; }
      if (k === 'flee') { s.S.flags.rebel = null; return { t: '그 전에 마을을 떠났습니다. 짐은 하룻밤에 쌌습니다.', k: 'ev', fx: { money: pct(s, 0.2), cap: { ties: -0.02 } }, f: orgF(s, '전출 등기') }; }
      return { t: '문을 닫고 있었습니다. 밤에 지나가는 발소리를 세었습니다.', k: 'note', fx: { h: -2 } }; },
  },
  big_escape: {
    once: false, at: 0.5,
    ok: (s) => s.year >= 1095 && s.year <= 1097 && !!s.S.flags.londinium && !s.S.flags.londiniumEscaped && s.S.age >= 15 && s.S.flags.escapeAsked !== s.year,
    build: (s) => { s.S.flags.escapeAsked = s.year;
      return { title: '런디니움 탈출', body: '봉쇄 ' + (s.year - 1094) + '년째입니다. 하수도로 성 밖까지 안내한다는 사람이 있습니다. 값은 가진 것의 절반이고, 돌아온 사람은 없습니다. 성공해서인지 실패해서인지는 모릅니다.', fact: F('공작령 등기소 런디니움 봉쇄 기록'), choices: [
        { k: 'go', label: '시도한다', sub: '재산 −, 사망 위험', auto: s.S.money > s.med ? 1.2 : 0.6 },
        { k: 'stay', label: '남는다', sub: '배급표로 버팁니다', auto: 1.5 }] }; },
    apply: (s, k) => {
      if (k !== 'go') return { t: '남기로 했습니다. 배급표를 다시 세었습니다.', k: 'note', fx: { h: -1 } };
      const r = s.rng.rnd();
      if (r < 0.15) { s.die('londinium_escape', '런디니움 탈출 실패'); return false; }
      if (r < 0.45) return { t: '하수도 입구에서 붙잡혔습니다. 돈은 돌아오지 않았고, 살카즈 경비병은 이름만 적고 돌려보냈습니다.', k: 'bad', fx: { money: pct(s, 0.5), h: -4 } };
      s.S.flags.londiniumEscaped = true; s.S.urban = false;
      return { t: '성 밖으로 나왔습니다. 공작령 시골 마을에 자리를 잡았고, 런디니움 이야기는 하지 않았습니다.', k: 'big', fx: { money: pct(s, 0.5), h: 4 } }; },
  },
};

export default { big, events, decisions };

// W4b 국가 특수 직업 서사(D26)와 국가 결정: 이벤트 약 55개 · 결정 6개(캐스터 계약, 용병 계약 연장, 패밀리 승급, 기사 스폰서, 감염자 투기장, 이주).
// 카시미어 기사 / 이베리아 재판관 / 시라쿠사 패밀리 / 컬럼비아 연구원·용병 / 라이타니엔 음악가·캐스터 / 볼리바르·카즈델·사르곤 용병 /
// 라테라노 공증인·총기 장인 / 림 빌리턴 광부 / 사미 눈의 사제 / 염국 관료 / 용문 근위국 / 극동 회사원·무사 가문, 그 밖 국가 1~2개씩.
// 담백한 "~했습니다"체(D25). 각주는 세계관 안의 출처만. 콜백은 전부 ctx 첫 인자(D23). 공용 파일은 읽기만 한다.
import { takeJob, jobEligible } from '../src/engine/finance.js';
import { eul, iga, eun, wa, ro, ieot } from '../src/engine/text.js';
import { cul, org, fest, F, orgF, rhodesF, given, poor, rich, nomadic, under, artsTop, lifeRoll, once, medX } from './_util.js';
import { yr, hum, adult, working, jobIs, partner, kids, pol, someone, fmtLMD } from './adult_work.js';

const Y = (s, a, b) => s.year >= a && s.year <= (b ?? a);
const north = (s) => s.S.sub && s.S.sub.region === 'north';
const known = (s) => s.S.ori.on && s.S.ori.known;

export const events = [
  // ══ 카시미어: 스포츠 기사 ══════════════════════════════════════════════
  { id: 'kaz_trainee_debut', a: [18, 24], tags: ['kazimierz'], w: 70, c: (s) => jobIs(s, 'knight_trainee') && s.S.jobY >= 2,
    run: (s) => {
      const pass = s.rng.chance(0.4 + (s.S.st.hl - 70) / 150 + (s.S.flags.knightTrial ? 0.15 : 0) + (rich(s) ? 0.1 : 0));
      if (pass) { takeJob(s, 'knight', true); return { t: '데뷔전을 치렀습니다. 이겼습니다. 다음 날 아침 기사단 명부에 "경기 기사"로 이름이 옮겨졌고, 스폰서 둘이 전화를 했습니다.', k: 'big', fx: { h: 6, so: 2 }, f: F('감정회 기사 등록 명부, ' + s.year + '년') }; }
      takeJob(s, s.S.urban ? 'shopkeeper' : 'farmer', true);
      return { t: '데뷔전에서 졌습니다. 연습생 계약은 갱신되지 않았습니다. 장비는 반납했고, 흉터는 반납하지 못했습니다.', k: 'bad', fx: { h: -6 }, f: F('감정회 연습생 계약 종료 통지') };
    } },
  { id: 'kaz_knight_rank', a: [19, 45], tags: ['kazimierz'], w: 45, gap: 2, rep: true, c: (s) => jobIs(s, 'knight'),
    run: (s) => { const up = s.rng.chance(0.5); const rank = s.rng.ri(up ? 20 : 60, up ? 90 : 400);
      return { t: '올해 순위 ' + rank + '위. ' + (up ? s.rng.pick(['중계에 이름이 두 번 불렸습니다.', '광고 제안이 하나 더 왔습니다.', '기사단이 승격 구간에 들어갔습니다.']) : s.rng.pick(['스폰서가 "다음 시즌을 보자"고 했습니다. 좋은 뜻이 아니었습니다.', '기사단이 강등권이었습니다. 단장은 선수 셋을 팔았습니다.', '중계 해설자가 제 이름을 틀렸습니다.'])),
        k: up ? 'warm' : 'bad', fx: up ? { h: 3, money: medX(s, 0.3) } : { h: -3 }, f: F('감정회 연간 순위표 ' + s.year) }; } },
  { id: 'kaz_knight_ad', a: [19, 45], tags: ['kazimierz'], w: 30, gap: 4, c: (s) => jobIs(s, 'knight') && s.S.flags.sponsor && s.S.flags.sponsor !== 'none',
    run: (s) => ({ t: '광고를 찍었습니다. ' + s.rng.pick(['보드카였습니다. 마시지 않는데도.', '피에로기 냉동식품이었습니다. 촬영장에서 열두 접시를 먹는 시늉을 했습니다.', '재앙 예보 단말기였습니다. 대사는 "믿을 수 있는 하늘"이었습니다.']) + ' 출연료는 한 시즌 상금만 했습니다.', k: 'ev', fx: { money: medX(s, 0.5), h: 1, so: -1 },
      f: F('감정회 광고 출연 신고') }) },
  { id: 'kaz_knight_injury', a: [19, 45], tags: ['kazimierz'], w: 35, gap: 3, c: (s) => jobIs(s, 'knight', 'arena_knight'),
    run: (s) => { const bad = s.rng.chance(0.3);
      if (bad && s.rng.chance(0.5)) { takeJob(s, 'shopkeeper', true); s.S.flags.knightRetiredInjury = s.S.age; return { t: '경기에서 크게 다쳤습니다. 팔 하나가 전처럼 움직이지 않았습니다. 기사단은 계약을 해지했고, 선술집 자리를 소개해 주었습니다.', k: 'loss', fx: { hl: -12, h: -6 }, f: F('감정회 부상 퇴역 기사 명단') }; }
      return { t: bad ? '경기에서 다쳤습니다. 한 시즌을 쉬었습니다. 스폰서는 치료비 대신 광고 노출을 계산했습니다.' : '경기에서 다쳤습니다. 다음 주에 뛰었습니다. 그게 계약이었습니다.', k: 'bad', fx: bad ? { hl: -8, h: -3, money: -medX(s, 0.2) } : { hl: -3 },
        f: F('감정회 경기 부상 기록') }; } },
  { id: 'kaz_matchfix', a: [19, 45], tags: ['kazimierz'], w: 30, c: (s) => jobIs(s, 'knight') && s.S.flags.sponsor === 'big' && lifeRoll(s, 'fix', 0.5),
    run: (s) => { const obey = s.rng.chance(0.5);
      if (obey) { s.S.flags.matchFixed = true; return { t: '스폰서가 특정 경기의 결과를 미리 알려 주었습니다. 그 결과대로 졌습니다. 봉투는 두꺼웠고, 잠은 얕았습니다.', k: 'bad', fx: { money: medX(s, 1), h: -5 }, f: F('감정회 공정 경기 위원회 조사 대상 아님') }; }
      s.S.pct = Math.max(0.05, s.S.pct - 0.08);
      return { t: '스폰서가 특정 경기의 결과를 미리 알려 주었습니다. 그 결과대로 뛰지 않았고, 이겼습니다. 다음 시즌 스폰서 로고가 갑옷에서 사라졌습니다.', k: 'ev', fx: { h: 3, so: -2 }, f: F('감정회 스폰서 계약 해지 신고') }; } },
  { id: 'kaz_commentator', a: [22, 64], tags: ['kazimierz'], w: 35, gap: 3, c: (s) => jobIs(s, 'commentator'),
    run: (s) => ({ t: s.rng.pick(['메이저 중계석에 앉았습니다. 여섯 시간 동안 물 두 잔을 마셨습니다.', '기사 하나가 경기장에서 죽었습니다. 중계는 멈추지 않았고, 저는 광고로 넘겼습니다.', '"오늘의 명언"이 신문에 실렸습니다. 제가 한 말인지 기억나지 않았습니다.']), k: 'note', fx: { so: 1, h: s.rng.chance(0.5) ? 1 : -2 },
      f: F('감정회 중계권 계약 부록') }) },
  { id: 'kaz_arena_fight', a: [19, 45], tags: ['kazimierz'], w: 50, gap: 1, rep: true, c: (s) => jobIs(s, 'arena_knight'),
    run: (s) => { const win = s.rng.chance(0.55);
      return { t: win ? '지하 투기장에서 이겼습니다. 상대는 ' + s.rng.pick(['같은 구역 사람이었습니다.', '사육된 짐승이었습니다.', '얼굴을 가린 사람이었습니다. 저도 가렸습니다.']) + ' 상금은 바깥 기사의 열에 하나였습니다.' : '지하 투기장에서 졌습니다. 살아서 나온 것으로 급료가 나왔습니다.',
        k: win ? 'ev' : 'bad', fx: win ? { money: medX(s, 0.25), h: 1 } : { hl: -8, h: -3 }, f: F('감정회 감염자 참가 제도 시행 규칙') }; } },
  { id: 'kaz_major_adult', a: [19, 64], tags: ['kazimierz'], w: 25, c: (s) => (s.year - 1025) % 3 === 0 && !jobIs(s, 'knight', 'arena_knight') && s.S.flags.majorSeen !== s.year,
    run: (s) => { s.S.flags.majorSeen = s.year;
      return { t: '메이저가 열렸습니다. ' + s.rng.pick(['거리마다 중계 화면이 걸렸고, 일터는 결승전 날 일찍 끝났습니다.', '입장권 값이 한 달치였습니다. 술집에서 봤습니다.', '아이가 좋아하는 기사의 이름을 외웠습니다. 다음 메이저 때 그 기사는 없었습니다.']), k: 'warm', fx: { h: 2, so: 1 },
        f: F('감정회 메이저 ' + ((s.year - 1025) / 3 + 1) + '회 공식 기록') }; } },

  // ══ 이베리아: 재판소 ════════════════════════════════════════════════════
  { id: 'ib_inquisitor_patrol', a: [19, 60], tags: ['iberia'], w: 45, gap: 2, rep: true, c: (s) => jobIs(s, 'inquisitor'),
    run: (s) => ({ t: s.rng.pick(['해안 순찰이었습니다. 바위 틈에서 비늘이 있는 것을 찾았습니다. 보고서에는 "처리"라고만 적었습니다.', '마을 하나를 돌며 문마다 문답을 했습니다. 한 집이 대답을 하지 못했습니다.', '밤 순찰에서 바다 쪽을 오래 보고 있는 사람을 데려왔습니다. 그는 그저 보고 있었다고 했습니다.']), k: 'note', fx: { h: -2, so: -1 },
      f: F('재판소 순찰 일지 ' + s.year + '년') }) },
  { id: 'ib_inquisitor_interrogate', a: [20, 60], tags: ['iberia'], w: 35, gap: 4, c: (s) => jobIs(s, 'inquisitor'),
    run: (s) => ({ t: '심문을 맡았습니다. ' + s.rng.pick(['상대는 이웃이었습니다. 질문지는 재판소 양식이었고, 답은 제가 적었습니다.', '에기르 혈통을 숨긴 집이었습니다. 아이가 셋이었습니다. 보고서는 두 장이었습니다.', '심문 끝에 상대가 울었습니다. 재판소 양식에는 그것을 적는 칸이 없었습니다.']), k: 'bad', fx: { h: -4 },
      f: F('재판소 심문 조서 양식 제4호') }) },
  { id: 'ib_coast_blockade', a: [19, 64], tags: ['iberia'], w: 40, gap: 4, c: (s) => jobIs(s, 'inquisitor') || (s.S.urban === false && lifeRoll(s, 'ibcoast', 0.6)),
    run: (s) => ({ t: jobIs(s, 'inquisitor') ? '해안 봉쇄를 집행했습니다. 배를 묶고 그물을 걷었습니다. 어부들은 재판관의 얼굴을 외웠고, 저는 그들의 얼굴을 외우지 않으려 했습니다.' : '해안 봉쇄령이 내렸습니다. 재판관들이 배를 묶었습니다. 한 달 동안 마을은 염장 생선만 먹었습니다.', k: 'bad', fx: jobIs(s, 'inquisitor') ? { h: -3, so: -2 } : { money: -medX(s, 0.15), h: -2 },
      f: F('재판소 해안 봉쇄령 ' + s.rng.ri(10, 99) + '호') }) },
  { id: 'ib_lighthouse', a: [19, 64], tags: ['iberia'], w: 45, gap: 3, c: (s) => jobIs(s, 'lighthouse_keeper'),
    run: (s) => ({ t: s.rng.pick(['등대를 밤새 지켰습니다. 바다에서 불빛이 하나 돌아왔습니다. 배가 아니었습니다.', '등유가 늦게 왔습니다. 사흘 동안 등대가 꺼졌고, 재판관이 조사하러 왔습니다.', '등대 일지에 "이상 없음"을 ' + s.rng.ri(200, 360) + '번 적었습니다. 이상이 없는 날이 그 수만큼은 아니었습니다.']), k: 'note', fx: { h: -2, so: -2 },
      f: F('재판소 등대 운영 일지') }) },
  { id: 'ib_penal', a: [18, 50], tags: ['iberia'], w: 50, gap: 2, rep: true, c: (s) => jobIs(s, 'penal_battalion'),
    run: (s) => ({ t: s.rng.pick(['형벌 대대 소속으로 해안 참호를 팠습니다. 급료는 없고 밥은 있었습니다.', '대대에서 둘이 사라졌습니다. 바다 쪽으로 갔다고도 하고, 재판소가 데려갔다고도 했습니다.', '밤에 파도 소리와 다른 소리가 났습니다. 대대장은 총을 쏘지 말라고 했습니다.']), k: 'bad', fx: { hl: -3, h: -3 },
      f: F('재판소 형벌 대대 점호 기록') }) },

  // ══ 시라쿠사: 패밀리 ════════════════════════════════════════════════════
  { id: 'sir_famiglia_errand', a: [19, 64], tags: ['siracusa'], w: 40, gap: 2, rep: true, c: (s) => jobIs(s, 'famiglia') && !s.S.flags.famigliaCapo,
    run: (s) => ({ t: s.rng.pick(['봉투를 전하는 일이었습니다. 봉투는 점점 두꺼워졌고 받는 사람은 점점 높아졌습니다.', '가게들을 돌며 "안부"를 물었습니다. 안부는 봉투로 돌아왔습니다.', cul(s).rulerTitle + '의 저녁 식사 자리 뒤에 서 있었습니다. 세 시간 동안 아무도 제 이름을 부르지 않았습니다.']), k: 'note', fx: { money: medX(s, 0.08), so: 1 },
      f: F('시청(패밀리 승인) 고용 기록') }) },
  { id: 'sir_famiglia_capo', a: [24, 64], tags: ['siracusa'], w: 40, gap: 3, c: (s) => jobIs(s, 'famiglia') && !!s.S.flags.famigliaCapo,
    run: (s) => ({ t: s.rng.pick(['아래 사람 넷을 받았습니다. 그중 하나는 제가 봉투를 전하던 시절의 저와 닮았습니다.', '구역 하나를 맡았습니다. 상인들이 ' + cul(s).address + ' 하고 불렀습니다.', '다른 패밀리와의 자리에 나갔습니다. 와인은 좋았고 아무도 마시지 않았습니다.']), k: 'ev', fx: { money: medX(s, 0.3), h: 1, so: -1 },
      f: F('시청(패밀리 승인) 구역 관리자 명부') }) },
  { id: 'sir_vendetta', a: [19, 64], tags: ['siracusa'], w: 35, gap: 5, c: (s) => jobIs(s, 'famiglia', 'cleaner', 'truck_driver') || !!s.S.flags.loneWolf,
    run: (s) => { const hit = s.rng.chance(s.S.flags.loneWolf ? 0.5 : 0.3);
      return { t: '벤데타가 선언되었습니다. ' + (hit ? s.rng.pick(['저와 관계없는 일이었고, 제 차가 불탔습니다.', '같은 패밀리 사람 둘이 돌아오지 않았습니다. 장례는 한 번에 치렀습니다.', '집 앞에 늑대 꼬리 하나가 놓여 있었습니다. 뜻은 모두가 알았습니다.']) : '제 이름은 명단에 없었습니다. 한 달 동안 집에 일찍 들어갔습니다.'),
        k: 'bad', fx: hit ? { hl: -5, h: -5, money: -medX(s, 0.2) } : { h: -2 }, f: F('시청(패밀리 승인) 공고란 벤데타 선언문') }; } },
  { id: 'sir_cleaner', a: [19, 60], tags: ['siracusa'], w: 45, gap: 2, rep: true, c: (s) => jobIs(s, 'cleaner'),
    run: (s) => ({ t: s.rng.pick(['뒷처리를 맡았습니다. 무엇의 뒷처리인지는 묻지 않는 것이 일이었습니다.', '새벽에 호출이 왔습니다. 장갑과 통을 챙겼습니다. 돌아와서 손을 세 번 씻었습니다.', '일한 집의 아이가 다음 날 학교에서 제 아이와 같은 반이었습니다.']), k: 'bad', fx: { money: medX(s, 0.15), h: -3 },
      f: F('기록된 바 없음') }) },
  { id: 'sir_truck', a: [19, 64], tags: ['siracusa'], w: 35, gap: 3, c: (s) => jobIs(s, 'truck_driver'),
    run: (s) => ({ t: s.rng.pick(['트럭상조회 회비를 냈습니다. 회비를 내면 길이 열리고, 안 내면 타이어가 열렸습니다.', '화물칸에 실린 것을 세지 않았습니다. 세지 않는 것이 상조회 규칙이었습니다.', '밤길에서 검문을 받았습니다. 경찰이 아니었습니다. 그래도 세웠습니다.']), k: 'note', fx: { money: s.rng.chance(0.5) ? medX(s, 0.08) : -medX(s, 0.05), h: -1 },
      f: F('트럭상조회 회원 명부') }) },
  { id: 'sir_carnevale_adult', a: [19, 64], tags: ['siracusa'], w: 20, gap: 5,
    run: (s) => ({ t: '카르니발레. 가면을 쓰고 거리에 나갔습니다. ' + s.rng.pick(['가면 뒤에서 누군가 제 이름을 불렀습니다. 돌아보지 않았습니다.', '아침에 광장에 누운 사람이 셋이었습니다. 가면은 그대로였습니다.', '춤을 췄습니다. 그날만은 아무도 패밀리를 묻지 않았습니다.']), k: 'note', fx: { h: 2, so: 1 },
      f: F('시청(패밀리 승인) 축제 허가') }) },

  // ══ 컬럼비아: 연구원·용병·개척민 ═══════════════════════════════════════
  { id: 'col_lab_badge', a: [22, 64], tags: ['columbia'], w: 50, c: (s) => jobIs(s, 'rhine_lab') && !s.S.flags.labBadge,
    run: (s) => { const color = s.rng.pick(['흰색', '푸른색', '회색', '검은색']); s.S.flags.labBadge = color;
      return { t: '연구소 출입증을 받았습니다. ' + color + ' 띠였습니다. 띠 색으로 갈 수 있는 층이 정해졌고, 갈 수 없는 층이 더 많았습니다.', k: 'note', fx: { sm: 2, h: 1 }, f: F('연구소 출입 등급 규정') }; } },
  { id: 'col_lab_accident', a: [22, 64], tags: ['columbia'], w: 35, gap: 3, c: (s) => jobIs(s, 'rhine_lab'),
    run: (s) => { const bad = s.rng.chance(0.35);
      return { t: bad ? '실험실에서 사고가 났습니다. ' + s.rng.pick(['배양조가 깨졌습니다. 보름 동안 격리 관찰을 받았습니다.', '옆 섹션에서 폭발이 있었습니다. 그 섹션은 이름이 바뀌었습니다.', '자가 실험을 하던 선임이 쓰러졌습니다. 그 선임의 책상은 다음 날 비었습니다.']) : '실험 보고서를 썼습니다. 결과는 "유의미"였고 저자란에 제 이름은 넷째였습니다.',
        k: bad ? 'bad' : 'note', fx: bad ? { hl: -6, h: -3 } : { sm: 2 }, f: F('연구소 안전 위원회 사고 보고 ' + s.rng.ri(100, 999)) }; } },
  { id: 'col_lab_contract', a: [22, 64], tags: ['columbia'], w: 25, gap: 5, c: (s) => jobIs(s, 'rhine_lab'),
    run: (s) => ({ t: s.rng.pick(['국방부 과제가 내려왔습니다. 과제명은 번호였고 질문은 금지였습니다.', '비밀 유지 서약서를 갱신했습니다. 작년보다 두 장 늘었습니다.', '연구소 기념일에 창립자의 이름이 세 번 불렸습니다. 그 사람은 없었습니다.']), k: 'note', fx: { money: medX(s, 0.2), h: -1 },
      f: F('연구소 과제 계약서 부록') }) },
  { id: 'col_blacksteel_train', a: [18, 40], tags: ['columbia'], w: 70, c: (s) => jobIs(s, 'blacksteel') && s.S.jobY <= 2 && !s.S.flags.bsTrained,
    run: (s) => { s.S.flags.bsTrained = true;
      const pass = s.rng.chance(0.3 + (s.S.st.hl - 70) / 100);
      if (!pass) { takeJob(s, s.S.urban ? 'construction' : 'pioneer', true); return { t: '민간 군사기업 훈련소에서 탈락했습니다. 2년 과정 중 ' + s.rng.ri(3, 20) + '개월째였습니다. 열에 일곱이 탈락한다고 했고, 저는 일곱 쪽이었습니다.', k: 'bad', fx: { h: -5, hl: -2 }, f: F('민간 군사기업 훈련소 수료 통계') }; }
      return { t: '민간 군사기업 훈련소를 마쳤습니다. 수료증과 함께 첫 파견지 봉투가 왔습니다. 봉투는 열어 보기 전에 서명해야 했습니다.', k: 'big', fx: { h: 4, hl: 2 }, f: F('민간 군사기업 훈련소 수료 대장') }; } },
  { id: 'col_blacksteel_deploy', a: [19, 50], tags: ['columbia'], w: 40, gap: 2, rep: true, c: (s) => jobIs(s, 'blacksteel') && !!s.S.flags.bsTrained,
    run: (s) => ({ t: '파견을 나갔습니다. ' + s.rng.pick(['볼리바르였습니다. 세 정부 중 어느 쪽인지는 계약서에 있었습니다.', '사미 국경이었습니다. 눈 말고는 아무것도 없었고, 그래서 무서웠습니다.', '국내 기업 경비였습니다. 지루했고, 지루한 쪽이 급료가 좋았습니다.']), k: 'note', fx: { money: medX(s, 0.3), hl: -2, h: -1 },
      f: F('민간 군사기업 파견 명령서') }) },
  { id: 'col_pioneer', a: [19, 64], tags: ['columbia'], w: 45, gap: 3, c: (s) => jobIs(s, 'pioneer'),
    run: (s) => { const good = s.rng.chance(0.5);
      return { t: good ? '개척지에서 첫 수확을 했습니다. 땅문서는 아직 "임차"였습니다.' : s.rng.pick(['개척지 마을에 보안관이 없었습니다. 있다가 없어진 것이었습니다.', '재앙 경보가 늦게 왔습니다. 개척지는 예보 구역 바깥이었습니다.', '동쪽 마을 사람들이 떠났습니다. 빈집에 들어가 못 쓰는 것을 챙겼습니다.']),
        k: good ? 'warm' : 'bad', fx: good ? { money: medX(s, 0.15), h: 3 } : { h: -3, hl: -2 }, f: F('보험협회 개척지 등급 공고') }; } },
  { id: 'col_insurance_agent', a: [20, 64], w: 35, gap: 3, c: (s) => jobIs(s, 'insurance_agent'),
    run: (s) => ({ t: s.rng.pick(['감염자 특약을 ' + s.rng.ri(3, 15) + '건 팔았습니다. 수당은 좋았고 고객 얼굴은 기억하지 않기로 했습니다.', '보상 거절 통지를 전달하는 일이 돌아왔습니다. 약관 제' + s.rng.ri(7, 40) + '조를 외웠습니다.', '실적표 맨 위에 이름이 올랐습니다. 축하 선물은 더 두꺼운 할당량이었습니다.']), k: 'note', fx: { money: medX(s, 0.15), h: -1 },
      f: F(org(s) + ' 설계사 실적 집계') }) },
  { id: 'col_election', a: [19, 64], tags: ['columbia'], w: 15, gap: 5,
    run: (s) => ({ t: '선거가 있었습니다. ' + s.rng.pick(['투표했습니다. 결과는 투표 전에 신문이 알고 있었습니다.', '후보 넷 중 셋이 같은 회사 출신이었습니다.', '투표장 앞에서 보험 가입 권유를 받았습니다.']), k: 'note', fx: { sm: 1 },
      f: F('보험협회 선거 참관 보고') }) },

  // ══ 라이타니엔: 음악가·캐스터·헌병 ═════════════════════════════════════
  { id: 'lei_court_concert', a: [19, 64], tags: ['leithanien'], w: 45, gap: 3, c: (s) => jobIs(s, 'musician', 'arts_knight', 'caster'),
    run: (s) => { const ok = s.rng.chance(0.6);
      return { t: ok ? '궁정 연주회에 섰습니다. ' + s.rng.pick(['선제후가 두 번 고개를 끄덕였습니다. 그것이 평가였습니다.', '연주 중에 아츠가 울렸습니다. 샹들리에가 흔들렸고, 아무도 놀라지 않았습니다.', '쌍둥이 여황 중 한 분이 자리에 있었다고 했습니다. 어느 분인지는 아무도 말하지 않았습니다.']) : '궁정 연주회 명단에서 빠졌습니다. 이유는 "음색"이었고, 음색은 아츠 적성의 다른 말이었습니다.',
        k: ok ? 'warm' : 'bad', fx: ok ? { h: 4, so: 2, money: medX(s, 0.3) } : { h: -4 }, f: F('궁정 기록국 연주회 출연자 명부') }; } },
  { id: 'lei_school_dispute', a: [19, 64], tags: ['leithanien'], w: 30, gap: 4, c: (s) => jobIs(s, 'musician', 'caster', 'arts_knight', 'teacher', 'scholar'),
    run: (s) => ({ t: '학파 논쟁에 휘말렸습니다. ' + s.rng.pick(['구파는 제 화성이 틀렸다고 했고, 신파는 제가 구파라고 했습니다.', '논문 한 편이 두 학파 신문에 각각 다른 이유로 실렸습니다.', '스승이 속한 학파가 궁정에서 밀렸습니다. 제 이름도 같이 밀렸습니다.']), k: 'note', fx: { sm: 2, so: -1, h: -1 },
      f: F('궁정 기록국 학파 등록 대장') }) },
  { id: 'lei_wine_contest', a: [19, 64], tags: ['leithanien'], w: 20, gap: 5,
    run: (s) => ({ t: '적포도주 선수권이 열렸습니다. ' + s.rng.pick(['심사위원 하나가 다섯 잔째에 쓰러졌습니다. 전통이라고 했습니다.', '이웃 포도원이 우승했습니다. 한 달 동안 그 집 앞이 막혔습니다.', '한 잔 마셨습니다. 값은 한 끼였습니다.']), k: 'warm', fx: { h: 2, so: 1 },
      f: F('궁정 기록국 선수권 결과 공고') }) },
  { id: 'lei_gendarme', a: [19, 60], tags: ['leithanien'], w: 40, gap: 3, c: (s) => jobIs(s, 'gendarme'),
    run: (s) => ({ t: s.rng.pick(['격리구역 이송 호위를 맡았습니다. 이송자는 악기 가방을 들고 있었습니다. 가방은 통과시켰습니다.', '위치킹 잔당이라는 벽보를 떼는 일이었습니다. 떼면 다음 날 다시 붙었습니다.', '결함품이라고 불리는 사람을 구금했습니다. 죄목은 아츠 적성이 낮은 것이 아니라 "소란"이었습니다.']), k: 'bad', fx: { h: -3, so: -1, money: medX(s, 0.05) },
      f: F('궁정 기록국 헌병 근무 일지') }) },
  { id: 'lei_defective_adult', a: [19, 64], tags: ['leithanien'], w: 30, gap: 4, c: (s) => !!s.S.flags.defective,
    run: (s) => ({ t: s.rng.pick(['이력서의 아츠 적성란이 늘 먼저 읽혔습니다.', '"결함품"이라는 말을 뒤에서 들었습니다. 앞에서 듣는 날도 있었습니다.', '음악회 입장이 막혔습니다. 규정은 없었고 안내원의 눈이 규정이었습니다.']), k: 'bad', fx: { so: -2, h: -2 },
      f: F('궁정 기록국 아츠 적성 등급 공시') }) },

  // ══ 용병: 볼리바르·카즈델·사르곤·컬럼비아 ═══════════════════════════════
  { id: 'merc_front', a: [18, 55], w: 50, gap: 1, rep: true, c: (s) => jobIs(s, 'mercenary', 'warcrow', 'soldier', 'legionary', 'defence_militia', 'duke_retainer'),
    run: (s) => { const bad = s.rng.chance(0.3);
      const where = { bolivar: s.rng.pick(['세 정부 중 하나의 전선', '도솔레스 외곽', '플랜테이션 경비']), kazdel: s.rng.pick(['런디니움 원정 보급로', '폐허 순찰', '다른 용병단과의 경계선']), sargon: s.rng.pick(['아미르 간 국경', '오아시스 호위', '정글 전초']), columbia: '파견지', ursus: s.rng.pick(['극북 반란 진압', '수용소 외곽 경계', '카시미어 국경']), victoria: '공작령 경계', tara: '방위선' }[s.S.root] || '전선';
      return { t: ro(where) + ' 나갔습니다. ' + (bad ? s.rng.pick(['동료 하나를 묻고 왔습니다. 이름표는 챙겼습니다.', '파편에 맞았습니다. 의무병은 "뛸 수 있다"고 적었습니다.', '마을 하나가 비는 것을 보았습니다. 명령은 "통과"였습니다.']) : s.rng.pick(['아무 일도 없었습니다. 그것이 가장 좋은 날이었습니다.', '급료가 제때 나왔습니다. 드문 일이었습니다.', '포로를 데려왔습니다. 포로는 우리와 같은 말을 썼습니다.'])),
        k: bad ? 'bad' : 'note', fx: bad ? { hl: -6, h: -4 } : { money: medX(s, 0.1), hl: -1 }, f: F({ kazdel: '용병 등록부 출전 기록', bolivar: '등기소(가까운 정부 쪽) 복무 기록', sargon: '아미르 친위대 명부' }[s.S.root] || org(s) + ' 복무 기록') }; } },
  { id: 'merc_pay', a: [18, 55], w: 30, gap: 3, c: (s) => jobIs(s, 'mercenary', 'warcrow', 'blacksteel'),
    run: (s) => { const good = s.rng.chance(0.5);
      return { t: good ? '계약금이 들어왔습니다. ' + fmtLMD(s.med * 0.6) + '. ' + (s.S.root === 'kazdel' ? '오리아이언 파편으로 받았습니다. 시장에서 빵으로 바꿨습니다.' : '절반은 집으로 보냈습니다.') : '고용주가 계약금을 떼먹었습니다. ' + (s.S.root === 'kazdel' ? '용병단장이 흉터의 상점에 이름을 올렸습니다. 그쪽이 재판소였습니다.' : '소송은 없었습니다. 용병에게 법원은 없었습니다.'),
        k: good ? 'warm' : 'bad', fx: good ? { money: medX(s, 0.6), h: 2 } : { h: -4 }, f: F(s.S.root === 'kazdel' ? '용병 등록부 계약란' : '용병 계약서 사본') }; } },
  { id: 'merc_home', a: [20, 60], w: 40, c: (s) => s.S.flags.vetHome != null && s.S.age - s.S.flags.vetHome <= 2 && !s.S.flags.vetHomeTold,
    run: (s) => { s.S.flags.vetHomeTold = true;
      return { t: '전선에서 돌아온 뒤의 날들이었습니다. ' + s.rng.pick(['큰 소리에 몸이 먼저 움직였습니다. 시장에서 두 번 그랬습니다.', '밤에 잠들지 못해 ' + eul(cul(s).drink) + ' 배웠습니다.', '사람들이 "어디 있었느냐"고 물었습니다. 짧게 답하는 법을 익혔습니다.']), k: 'note', fx: { h: -2, so: 1 },
        f: F('기록된 바 없음') }; } },
  { id: 'kazdel_scar_shop', a: [19, 64], tags: ['kazdel'], w: 30, gap: 4,
    run: (s) => ({ t: s.rng.pick(['흉터의 상점에 들렀습니다. 용병 알선 게시판에 제 이름이 적힌 값은 작년보다 조금 올라 있었습니다.', '사우인 밤에 용병단이 모였습니다. 올해 돌아오지 못한 이름을 하나씩 불렀습니다. ' + s.rng.ri(3, 14) + '개였습니다.', '공장이 다시 돌기 시작했습니다. 전직 용병 직업훈련 공고가 붙었습니다. 글을 읽을 수 있는 사람이 먼저 갔습니다.']), k: 'note', fx: { so: 1, h: -1 },
      f: F('용병 등록부 부록') }) },
  { id: 'bol_three_gov', a: [19, 64], tags: ['bolivar'], w: 25, gap: 4,
    run: (s) => ({ t: s.rng.pick(['세 정부가 각각 세금 고지서를 보냈습니다. 가까운 쪽에 냈습니다.', '독립기념일이 세 번 있었습니다. 세 번 다 쉬었습니다.', '마을의 깃발이 바뀌었습니다. 다음 해에 다시 바뀌었습니다.', '남부에서 사냥개 소문이 올라왔습니다. 밤길을 끊었습니다.']), k: 'note', fx: { h: -1 },
      f: F('등기소(가까운 정부 쪽) 공고') }) },
  { id: 'bol_plantation', a: [19, 64], tags: ['bolivar'], w: 40, gap: 3, c: (s) => jobIs(s, 'plantation'),
    run: (s) => ({ t: s.rng.pick(['커피 수확철이었습니다. 하루 ' + s.rng.ri(12, 16) + '시간, 임금은 커피 두 잔 값이었습니다.', '농장주가 바뀌었습니다. 새 주인은 컬럼비아 회사였고, 감독은 그대로였습니다.', '농장 경비로 용병이 왔습니다. 저보다 열 배를 받는다고 했습니다.']), k: 'bad', fx: { hl: -3, h: -2, money: medX(s, 0.03) },
      f: F('등기소(가까운 정부 쪽) 농장 노동 등록') }) },
  { id: 'sar_court', a: [19, 64], tags: ['sargon'], w: 35, gap: 3, c: (s) => jobIs(s, 'royal_messenger', 'civil_servant', 'shaman'),
    run: (s) => ({ t: jobIs(s, 'shaman') ? s.rng.pick(['마을 아이의 정글 열병을 다스렸습니다. 사례는 대추야자 한 자루였습니다.', '아미르의 사신이 주술을 보러 왔습니다. 보여 주지 않았습니다. 다음 날 세금이 올랐습니다.']) : s.rng.pick(['아미르가 바뀌었습니다. 궁정 서기국의 절반이 같이 바뀌었습니다. 저는 남은 절반이었습니다.', '왕실 전달 임무로 사막을 건넜습니다. 편지보다 물이 무거웠습니다.', '궁정 음모 소문이 돌았습니다. 소문에 이름이 오른 사람은 다음 달 궁정에 없었습니다.']), k: 'note', fx: { h: -1, money: medX(s, 0.08) },
      f: F('파디샤 궁정 서기국 ' + s.year + '년 명부') }) },
  { id: 'sar_slave', a: [19, 64], tags: ['sargon'], w: 50, gap: 2, rep: true, c: (s) => jobIs(s, 'slave'),
    run: (s) => ({ t: s.rng.pick(['주인이 바뀌었습니다. 시장에서였습니다.', '하루 일은 해가 정했습니다. 밥은 주인이 정했습니다.', '같이 일하던 사람이 도망쳤습니다. 사흘 뒤 돌아왔고, 그 뒤로 걷지 못했습니다.']), k: 'bad', fx: { hl: -3, h: -3 },
      f: F('파디샤 궁정 서기국 아미르령 재산 대장') }) },

  // ══ 라테라노: 공증인·총기 장인·총기사 ═════════════════════════════════
  { id: 'lat_notary_seal', a: [22, 64], tags: ['laterano'], w: 45, gap: 3, c: (s) => jobIs(s, 'notary'),
    run: (s) => ({ t: s.rng.pick(['오늘 공증 ' + s.rng.ri(8, 30) + '건. 혼인 둘, 유언 하나, 총기 양도 나머지.', '감염 판정을 받은 산크타의 출국 서류를 공증했습니다. 그는 웃었고, 저는 도장을 찍었습니다.', '리베리 신청인의 서류를 공증했습니다. 양식에 "비산크타" 칸이 있었습니다. 칸은 제가 만들지 않았습니다.']), k: 'note', fx: { money: medX(s, 0.1), h: -1 },
      f: F('공증소 일일 공증 대장') }) },
  { id: 'lat_notary_abroad', a: [22, 64], tags: ['laterano'], w: 25, gap: 5, c: (s) => jobIs(s, 'notary'),
    run: (s) => ({ t: '해외 산크타 지원 업무로 ' + s.rng.pick(['시라쿠사', '컬럼비아', '빅토리아', '라이타니엔']) + '에 다녀왔습니다. 성문 밖으로 나간 사람들의 서류는 두꺼웠고 글씨는 작았습니다.', k: 'note', fx: { so: 1, h: -1 },
      f: F('공증소 재외 산크타 지원 출장 보고') }) },
  { id: 'lat_gunsmith', a: [19, 64], tags: ['laterano'], w: 45, gap: 3, c: (s) => jobIs(s, 'gunsmith'),
    run: (s) => { const good = s.rng.chance(0.6);
      return { t: good ? '총 한 자루를 완성했습니다. ' + s.rng.pick(['주문자는 열두 살 아이의 부모였습니다. 수호총이었습니다.', '수출용이었습니다. 어느 전선으로 가는지는 공증 서류에 없었습니다.', '공방 이름이 새겨진 첫 자루였습니다. 제 이름은 안쪽에 작게.']) : '공방에서 사고가 있었습니다. 탄약 보관실이었습니다. 다친 사람은 없었고 디저트 가게 유리창이 깨졌습니다.',
        k: good ? 'warm' : 'bad', fx: good ? { money: medX(s, 0.2), h: 2 } : { hl: -3, money: -medX(s, 0.1) }, f: F('공증소 총기 제조 등록 ' + s.year + '년분') }; } },
  { id: 'lat_gun_knight', a: [19, 60], tags: ['laterano'], w: 40, gap: 3, c: (s) => jobIs(s, 'gun_knight'),
    run: (s) => ({ t: s.rng.pick(['순례자 무리의 경호를 맡았습니다. 총은 한 번도 꺼내지 않았습니다. 그것이 좋은 날이었습니다.', '동족을 향해 총을 겨눠야 하는 명령이 왔습니다. 겨눴고, 쏘지 않았습니다. 그날 밤 공감이 조용했습니다.', '타락한 산크타의 소문이 돌았습니다. 소문 속 이름을 알았습니다.']), k: 'note', fx: { h: -2, so: 1 },
      f: F('공증소 총기사 근무 기록') }) },
  { id: 'lat_dessert', a: [19, 64], tags: ['laterano'], w: 20, gap: 5,
    run: (s) => ({ t: s.rng.pick(['자동 아이스크림 판매기가 동네에 들어왔습니다. 탄약도 팔았습니다.', '계시의 날 종이 울렸습니다. 거리의 모두가 같은 쪽을 보았습니다.', '디저트 가게 줄이 총기 공방 줄보다 길었습니다. 라테라노에서는 흔한 일입니다.']), k: 'warm', fx: { h: 2 },
      f: F('공증소 상업 등록 대장') }) },

  // ══ 림 빌리턴: 광부 ══════════════════════════════════════════════════════
  { id: 'rim_miner_shift', a: [19, 64], tags: ['rim'], w: 45, gap: 2, rep: true, c: (s) => jobIs(s, 'ori_miner', 'miner', 'platform_builder'),
    run: (s) => ({ t: s.rng.pick(['갱도 교대가 끝나면 "갱도에서 보자"고 인사했습니다. 못 보는 날도 있었습니다.', '광업연합이 마스크를 바꿨습니다. 더 싼 것으로.', '임금 명세에 "위험 수당"이 생겼습니다. 위험은 전과 같았습니다.', '수박 케이크 축제에 갱도 셋이 쉬었습니다. 생산 목표는 쉬지 않았습니다.']), k: 'note', fx: { hl: -2, money: medX(s, 0.05) },
      f: F('광업연합 인사부 교대 기록') }) },
  { id: 'rim_mine_collapse', a: [19, 64], tags: ['rim'], w: 30, gap: 4, c: (s) => jobIs(s, 'ori_miner', 'miner', 'platform_builder') || lifeRoll(s, 'rimcol', 0.5),
    run: (s) => { const inside = jobIs(s, 'ori_miner', 'miner');
      return { t: '갱도가 무너졌습니다. ' + (inside ? s.rng.pick(['옆 갱도였습니다. 그쪽 교대조 ' + s.rng.ri(4, 20) + '명 중 돌아온 사람은 절반이었습니다.', '제 갱도였습니다. 이틀 뒤에 꺼냈습니다. 손전등이 먼저 꺼졌고 그다음 목소리들이.']) : '광산 안전 주간 둘째 날이었습니다. 사이렌이 마을까지 왔습니다.'),
        k: 'bad', fx: inside ? { hl: -8, h: -5 } : { h: -3 }, f: F('광업연합 인사부 사고 집계 ' + s.year + '년') }; } },
  { id: 'rim_infected_miner', a: [19, 64], tags: ['rim', 'known'], w: 40, gap: 4, c: (s) => jobIs(s, 'ori_miner', 'miner') || s.S.flags.laidOff != null,
    run: (s) => ({ t: s.rng.pick(['감염 판정 뒤에도 갱도에 들어갔습니다. 광업연합은 감염자를 "소모 한도 내"로 분류했습니다.', '감염자 교대조로 옮겨졌습니다. 더 깊은 갱도, 같은 임금.', '광업연합 의무실에서 수치를 적었습니다. 의무실 뒤에 로도스 아일랜드 공고가 붙어 있었습니다.']), k: 'bad', fx: { h: -2, hl: -2 },
      f: F('광업연합 인사부 감염자 배치 규정') }) },

  // ══ 사미: 눈의 사제·부족 전사 ═════════════════════════════════════════
  { id: 'sami_priest_divine', a: [19, 64], tags: ['sami'], w: 45, gap: 2, rep: true, c: (s) => jobIs(s, 'snowpriest'),
    run: (s) => { const right = s.rng.chance(0.7);
      return { t: '룬을 던져 점을 쳤습니다. ' + (right ? s.rng.pick(['한파가 온다고 읽었고, 부족은 사흘 먼저 움직였습니다. 아무도 얼지 않았습니다.', '사냥 방향을 짚었습니다. 사슴이 있었습니다.', '아이의 병이 낫는다고 읽었습니다. 나았습니다. 어느 쪽이 먼저였는지는 모릅니다.']) : '읽은 대로 되지 않았습니다. 장로회는 룬을 탓하지 않았고, 저를 탓하지도 않았습니다. 그래서 더 무거웠습니다.'),
        k: right ? 'warm' : 'bad', fx: right ? { so: 3, h: 2 } : { h: -4, so: -2 }, f: F('사제단 룬 기록 ' + s.year + '년분') }; } },
  { id: 'sami_priest_evacuate', a: [19, 64], tags: ['sami'], w: 35, gap: 4, c: (s) => jobIs(s, 'snowpriest'),
    run: (s) => ({ t: '붕괴 패러다임의 징조를 읽고 부족을 옮겼습니다. ' + s.rng.pick(['옮긴 자리에서 경고문을 찾았습니다. 암호였고, 풀지 않았습니다. 푸는 쪽이 위험합니다.', '옮기는 길에 하나가 뒤를 돌아봤습니다. 그 사람은 그 뒤로 말이 없었습니다.', '장로회가 사제의 말을 따랐습니다. 다음 해에도 따를지는 다음 해의 룬에 달렸습니다.']), k: 'note', fx: { h: -2, so: 2, sm: 1 },
      f: F('사제단 룬 기록 이주 항목') }) },
  { id: 'sami_ice_field', a: [19, 60], tags: ['sami'], w: 40, gap: 3, c: (s) => jobIs(s, 'snowpriest', 'tribal_warrior', 'hunter'),
    run: (s) => { const bad = s.rng.chance(0.3);
      return { t: bad ? '빙원 경계에서 붕괴체를 만났습니다. 부족 전사 둘이 돌아오지 않았습니다. 사제는 그 자리를 룬으로 막았습니다.' : s.rng.pick(['우르수스 국경 순찰대와 마주쳤습니다. 서로 총을 내리지 않은 채 각자 돌아갔습니다.', '컬럼비아 교역소 사람들이 약초 채집 계약을 들고 왔습니다. 장로회는 반을 받아들였습니다.', '오로라가 사흘 동안 하늘을 덮었습니다. 오래 본 사람은 다음 날 말을 더듬었습니다.']),
        k: bad ? 'bad' : 'note', fx: bad ? { h: -5, hl: -3 } : { sm: 1, h: -1 }, f: F('사제단 룬 기록 경계 항목') }; } },

  // ══ 염국: 관료·천사부·표국 ═══════════════════════════════════════════
  { id: 'yan_promotion_exam', a: [22, 55], tags: ['yan', '!lungmen'], w: 45, gap: 3, c: (s) => jobIs(s, 'civil_servant', 'tianshi_official'),
    run: (s) => { const pass = s.rng.chance(0.35 + (s.S.st.sm - 60) / 200);
      if (pass) s.S.pct = Math.min(0.95, s.S.pct + 0.05);
      return { t: '관료 승진 시험을 보았습니다. ' + (pass ? '방(榜)에 이름이 올랐습니다. 품계가 하나 올랐고 상관의 "대인" 호칭이 하루 늦게 붙었습니다.' : '방(榜)에 이름이 없었습니다. 동기 하나가 붙었고, 그 동기의 집에서 ' + eul(cul(s).food) + ' 먹었습니다. 맛은 기억나지 않습니다.'),
        k: pass ? 'warm' : 'bad', fx: pass ? { h: 4, sm: 1 } : { h: -3 }, f: F('이부 고과 시험 방문(榜文) ' + s.year + '년') }; } },
  { id: 'yan_tianshi_trip', a: [22, 60], tags: ['yan'], w: 40, gap: 3, c: (s) => jobIs(s, 'tianshi_official'),
    run: (s) => { const bad = s.rng.chance(0.3);
      return { t: '천사부 출장을 나갔습니다. ' + (bad ? s.rng.pick(['북방 천기각이었습니다. 돌아온 뒤 한동안 꿈에 소리가 났습니다.', '쉐이의 파편이 머문 마을이었습니다. 보고서에 쓸 수 없는 것을 보았습니다.']) : s.rng.pick(['수리 공사 감독이었습니다. 도면은 맞았고 인부는 모자랐습니다.', '지방 관리가 뇌물을 내밀었습니다. 받지 않았고, 보고서는 짧게 썼습니다.', '요괴 민원이었습니다. 요괴는 없었고 민원인은 있었습니다.'])),
        k: bad ? 'bad' : 'note', fx: bad ? { h: -4, hl: -2 } : { money: medX(s, 0.1), sm: 1 }, f: F('천사부 출장 복명서') }; } },
  { id: 'yan_caravan_guard', a: [19, 60], tags: ['yan'], w: 40, gap: 3, c: (s) => jobIs(s, 'caravan_guard'),
    run: (s) => { const bad = s.rng.chance(0.3);
      return { t: bad ? '표국 호송길에서 산적을 만났습니다. 표물은 지켰고 동료 하나는 지키지 못했습니다.' : s.rng.pick(['표국 호송을 마쳤습니다. 표기(鏢旗)가 무사히 돌아왔고, 표두가 술을 샀습니다.', '호송길에 객잔에서 쉬었습니다. 객잔 주인이 "표국 사람은 외상 없음"이라고 써 붙였습니다. 우리 때문이었습니다.']),
        k: bad ? 'bad' : 'note', fx: bad ? { hl: -5, h: -4 } : { money: medX(s, 0.12), so: 1 }, f: F('표국 호송 기록') }; } },
  { id: 'yan_vein_decline', a: [19, 64], tags: ['yan', '!lungmen'], w: 40, c: (s) => Y(s, 1101, 1103) && !s.S.flags.veinDecline,
    run: (s) => { s.S.flags.veinDecline = true;
      const miner = jobIs(s, 'ori_miner', 'miner');
      if (miner && s.rng.chance(0.5)) { s.S.job = null; s.S.income = 0; s.S.flags.laidOff = s.S.age; return { t: '광맥이 줄고 있다는 공문이 내려왔습니다. 광산이 교대를 반으로 줄였고, 제 교대가 없어진 쪽이었습니다. 림 빌리턴으로 떠나는 사람이 늘었습니다.', k: 'bad', fx: { h: -5 }, f: F('공부(工部) 광맥 현황 공문, ' + s.year + '년') }; }
      return { t: '광맥이 줄고 있다는 소문이 돌았습니다. 림 빌리턴 광석이 들어왔고 값이 올랐습니다. 흠천감은 아무것도 공표하지 않았습니다.', k: 'note', fx: { money: -medX(s, 0.05) }, f: F('공부(工部) 광맥 현황 공문, ' + s.year + '년') }; } },

  // ══ 용문: 근위국·배달 ═════════════════════════════════════════════════
  { id: 'lm_lgd_patrol', a: [19, 60], tags: ['lungmen'], w: 45, gap: 2, rep: true, c: (s) => jobIs(s, 'lgd_officer'),
    run: (s) => ({ t: s.rng.pick(['빈민가 순찰이었습니다. 아이들이 근위국 제복을 보고 흩어졌다가 돌아왔습니다. 사탕을 들고 다니기 시작했습니다.', '감염자 격리구역 경계 근무였습니다. 담장 안쪽 사람들과 눈을 마주치지 않는 법을 배웠습니다.', '총경이 바뀌었습니다. 임기 2년. 근무 수칙은 그대로였습니다.', '밀크티 가게 주인이 공짜로 한 잔을 내밀었습니다. 받지 않았습니다. 다음 날 반값으로 샀습니다.']), k: 'note', fx: { h: -1, so: 1, money: medX(s, 0.05) },
      f: F('근위국 순찰 일지 ' + s.year + '년') }) },
  { id: 'lm_lgd_raid', a: [20, 55], tags: ['lungmen'], w: 30, gap: 4, c: (s) => jobIs(s, 'lgd_officer'),
    run: (s) => { const bad = s.rng.chance(0.35);
      return { t: '삼합회 소탕 작전에 투입되었습니다. ' + (bad ? '부상자가 났습니다. 저였습니다.' : '체포 ' + s.rng.ri(3, 20) + '명. 다음 달 같은 자리에 같은 간판이 걸렸습니다.'), k: bad ? 'bad' : 'note', fx: bad ? { hl: -7, h: -3 } : { h: 1, money: medX(s, 0.1) },
        f: F('근위국 작전 보고 ' + s.rng.ri(100, 999) + '호') }; } },
  { id: 'lm_courier', a: [19, 60], tags: ['lungmen'], w: 40, gap: 3, c: (s) => jobIs(s, 'penguin_courier'),
    run: (s) => ({ t: s.rng.pick(['하루 배달 ' + s.rng.ri(30, 80) + '건. 상층에서 지하층까지, 승강기가 멈추면 계단으로.', '배달 상자에 든 것을 묻지 않는 것이 회사 방침이었습니다. 물어볼 뻔한 날이 두 번 있었습니다.', '회사 간판이 바뀌었습니다. 유니폼은 그대로였고 배달 건수만 늘었습니다.']), k: 'note', fx: { hl: -2, money: medX(s, 0.08) },
      f: F('근위국 호적과 물류업 종사자 등록') }) },

  // ══ 극동: 남조 회사원 · 북조 무사 가문 ═════════════════════════════════
  { id: 'hig_company', a: [19, 60], tags: ['higashi'], w: 45, gap: 3, c: (s) => !north(s) && jobIs(s, 'clerk', 'shopkeeper', 'insurance_agent', 'engineer', 'banker'),
    run: (s) => ({ t: s.rng.pick(['회사 조회에서 사훈을 외웠습니다. 넷째 줄은 아직 뜻을 모릅니다.', '야근 ' + s.rng.ri(40, 90) + '시간. 회사는 "자발적"이라고 적었고 저도 그렇게 적었습니다.', '거품이라는 말이 신문에 났습니다. 회사는 새 사옥을 올렸습니다.', '회식에서 상사의 잔이 비지 않게 했습니다. 그것이 업무 평가의 일부였습니다.']), k: 'note', fx: { hl: -2, h: -1, money: medX(s, 0.05) },
      f: F('호적대장소 남조 기업 고용 등록') }) },
  { id: 'hig_company_insurance', a: [20, 60], tags: ['higashi', 'known'], w: 40, gap: 4, c: (s) => !north(s) && working(s),
    run: (s) => ({ t: '회사가 감염자 특약 보험을 "복지"로 들어 주었습니다. 보험료는 급료에서 먼저 빠졌습니다. 복지였습니다.', k: 'note', fx: { h: -1 },
      f: F('호적대장소 기업 단체 보험 등록') }) },
  { id: 'hig_dojo_family', a: [19, 64], tags: ['higashi'], w: 45, gap: 3, c: (s) => north(s) && (!!s.S.flags.dojo || jobIs(s, 'shinobi', 'soldier')),
    run: (s) => ({ t: s.rng.pick(['가문 도장에서 아랫사람을 가르쳤습니다. 제가 맞던 자리에서 제가 섰습니다.', '가문 어른이 혼담을 가져왔습니다. 상대 가문의 검술 유파가 먼저였고 사람은 나중이었습니다.', '북조 막부에서 가문에 부역을 요구했습니다. 가문은 저를 보냈습니다.', '가문의 이름이 걸린 결투가 있었습니다. 제 차례는 아니었습니다. 아직은.']), k: 'note', fx: { hl: 1, h: -1, so: 1 },
      f: F('호적대장소 북조 무사 가문 등록') }) },
  { id: 'hig_shinobi', a: [19, 60], tags: ['higashi'], w: 40, gap: 3, c: (s) => jobIs(s, 'shinobi'),
    run: (s) => ({ t: s.rng.pick(['낮에는 회사원이었습니다. 밤의 일은 회사에 적지 않았습니다.', '가문에서 임무가 내려왔습니다. 거절하면 탈주 닌자. 받으면 돌아오지 못할 수도. 받았습니다.', '의뢰인이 보수를 두 배로 올렸습니다. 두 배로 위험한 일이었습니다.']), k: 'note', fx: { money: medX(s, 0.2), h: -2, hl: -2 },
      f: F('기록된 바 없음') }) },
  { id: 'hig_north_silence', a: [19, 64], tags: ['higashi', 'known'], w: 40, gap: 4, c: (s) => north(s),
    run: (s) => ({ t: s.rng.pick(['가족이 감염을 숨겼습니다. 이웃도 알았고, 이웃도 숨겼습니다. 북조의 예절이었습니다.', '명절 참배에서 가문 자리 맨 끝에 섰습니다. 아무도 말하지 않았고, 그 자리는 정해져 있었습니다.', '검진 통지가 오면 어머니가 먼저 태웠습니다.']), k: 'bad', fx: { so: -2, h: -2 },
      f: F('호적대장소 북조 격리 등록(미기재)') }) },
  { id: 'hig_idol', a: [18, 32], tags: ['higashi'], w: 45, gap: 2, rep: true, c: (s) => jobIs(s, 'idol'),
    run: (s) => { const hit = s.rng.chance(0.3);
      return { t: hit ? '곡 하나가 방송에 올랐습니다. 한 달 동안 거리에서 제 얼굴이 저보다 먼저 다녔습니다.' : s.rng.pick(['악수회 ' + s.rng.ri(300, 900) + '명. 손이 저렸고 웃는 얼굴은 저리지 않았습니다.', '소속사가 체중과 연애를 계약서에 적었습니다. 서명했습니다.', '동기 하나가 그만두었습니다. 발표문은 "학업"이었습니다.']),
        k: hit ? 'warm' : 'note', fx: hit ? { money: medX(s, 0.8), h: 4, so: 2 } : { h: -2, hl: -1 }, f: F('호적대장소 연예 기획사 등록') }; } },

  // ══ 그 밖 국가 1~2개씩 ═══════════════════════════════════════════════════
  { id: 'urs_legion', a: [18, 55], tags: ['ursus'], w: 40, gap: 3, c: (s) => jobIs(s, 'legionary'),
    run: (s) => ({ t: s.rng.pick(['군단 배식은 흑빵과 뜨거운 차였습니다. 황제 탄신일에는 고기가 한 점 올랐습니다.', '극북 반란 진압에 차출되었습니다. 돌아온 사람은 많았고 말을 하는 사람은 적었습니다.', '장교가 바뀌었습니다. 새 장교는 비밀경찰과 아는 사이라고 했습니다. 다들 조용해졌습니다.']), k: 'note', fx: { hl: -2, h: -2, money: medX(s, 0.08) },
      f: F('제국 내무성 군단 복무 기록') }) },
  { id: 'urs_camp_guard', a: [19, 60], tags: ['ursus'], w: 45, gap: 2, rep: true, c: (s) => jobIs(s, 'camp_guard'),
    run: (s) => ({ t: s.rng.pick(['수용소 외곽 초소에 섰습니다. 안쪽에서 갱도로 가는 줄을 매일 셌습니다. 돌아오는 줄은 세지 않았습니다.', '이송자 명단에 아는 이름이 있었습니다. 모르는 척했습니다. 그것이 이 일의 자격이었습니다.', '경비들 사이에 기침이 돌았습니다. 의무실은 수용자용이 아니라 경비용이 따로 있었고, 둘 다 약이 없었습니다.']), k: 'bad', fx: { h: -4, hl: -2, money: medX(s, 0.06) },
      f: F('제국 내무성 수용소 경비 근무 일지') }) },
  { id: 'urs_secret_police', a: [19, 64], tags: ['ursus'], w: 25, gap: 5,
    run: (s) => ({ t: s.rng.pick(['이웃이 새벽에 끌려갔습니다. 수용소가 아니라 다른 곳이라고 했습니다. 그 뒤로 그 집 이야기는 아무도 하지 않았습니다.', '학생들이 거리에 나왔다는 소문이 돌았습니다. 소문은 하루 만에 사라졌고 학생들도 그랬습니다.', '겨울 무도회 초대장이 왔습니다. 가지 않는 것이 더 눈에 띈다고 해서 갔습니다.']), k: 'note', fx: { h: -2 },
      f: F('제국 내무성 치안 월보') }) },
  { id: 'vic_factory_adult', a: [19, 64], tags: ['victoria', '!tara'], w: 40, gap: 3, c: (s) => jobIs(s, 'factory_worker'),
    run: (s) => ({ t: s.rng.pick(['공장 반장이 되었습니다. 반장은 기침을 셀 권한이 있었고 멈출 권한은 없었습니다.', '스모그 경보로 공장이 하루 쉬었습니다. 임금도 하루 쉬었습니다.', '공작령 연대에서 공장 노동자를 차출했습니다. 명단은 반장이 짰습니다. 제 이름은 없었습니다. 이번에는.']), k: 'note', fx: { hl: -2, h: -1 },
      f: F('공작령 등기소 공장 노동 등록') }) },
  { id: 'vic_steam_knight', a: [19, 55], tags: ['victoria', '!tara'], w: 40, gap: 3, c: (s) => jobIs(s, 'steam_knight', 'duke_retainer'),
    run: (s) => ({ t: s.rng.pick(['공작의 명으로 이웃 공작령 국경에 섰습니다. 저쪽 기사와 같은 학교를 나왔습니다.', '증기 갑주 정비에 한 달치 급료가 들어갔습니다. 갑주는 공작 것이었고 수리비는 제 것이었습니다.', '공작이 바뀌었습니다. 충성 서약을 다시 했습니다. 문구는 같았고 이름만 달랐습니다.']), k: 'note', fx: { money: s.rng.chance(0.5) ? medX(s, 0.15) : -medX(s, 0.1), h: -1 },
      f: F('공작령 등기소 기사 명부') }) },
  { id: 'tara_adult', a: [19, 64], tags: ['tara'], w: 35, gap: 3, c: (s) => jobIs(s, 'nomad_courier', 'defence_militia', 'farmer'),
    run: (s) => ({ t: jobIs(s, 'nomad_courier') ? s.rng.pick(['편지를 들고 유목민의 길을 걸었습니다. 장례 하나를 주관하고 돌아왔습니다. 유목민의 일입니다.', '빅토리아 순찰대가 편지 가방을 뒤졌습니다. 편지는 돌려받았고 사흘은 돌려받지 못했습니다.']) : jobIs(s, 'defence_militia') ? s.rng.pick(['방위군 훈련이 있었습니다. 총은 셋에 하나였습니다.', '빅토리아 쪽 마을과 충돌이 있었습니다. 다친 사람은 양쪽 다 있었습니다.']) : s.rng.pick(['감자 농사였습니다. 수확의 절반이 빅토리아로 갔습니다. 나머지 절반으로 겨울을 났습니다.', '환화 의식에 마을이 모였습니다. 불 앞에서 누군가 독립 이야기를 했고, 아무도 말리지 않았습니다.']), k: 'note', fx: { h: -1, so: 1 },
      f: F('성당 호적부 ' + s.year + '년 기재') }) },
  { id: 'min_temple', a: [19, 64], tags: ['minos'], w: 40, gap: 3, c: (s) => jobIs(s, 'temple_priest', 'athlete', 'ferryman'),
    run: (s) => ({ t: jobIs(s, 'temple_priest') ? s.rng.pick(['신전에서 감염자 치료 등록을 받았습니다. 사제는 될 수 없지만 치료는 받을 수 있는 땅입니다.', '제1신전 재건에 시민 다섯에 하나가 나왔습니다. 저는 돌을 날랐습니다. 사제도 예외가 아니었습니다.']) : jobIs(s, 'athlete') ? s.rng.pick(['힘노이의 지혜에 출전했습니다. ' + s.rng.ri(2, 9) + '위. 올리브 관은 1위 몫이었습니다.', '사르곤 국경 소식에 경기가 하루 미뤄졌습니다.']) : s.rng.pick(['사과 수확철이었습니다. 나룻배 배정을 두고 마을 둘이 다퉜습니다. 저는 노를 저었습니다.', '도시가 양지로 자리를 옮겼습니다. 덜 익은 과일을 익히기 위해서였습니다. 뱃길도 바뀌었습니다.']), k: 'note', fx: { so: 1, h: 1 },
      f: F('신전 서기관 ' + s.year + '년 기록') }) },
  { id: 'kje_adult', a: [19, 64], tags: ['kjerag'], w: 40, gap: 3, c: (s) => jobIs(s, 'karlan_trader', 'mountain_guide', 'railway'),
    run: (s) => ({ t: jobIs(s, 'karlan_trader') ? s.rng.pick(['카란 무역상 자격으로 산 아래 상회에 갔습니다. 컬럼비아 투자자가 치즈 값을 세 번 물었습니다.', '세 가문 중 한 가문이 무역 허가를 바꿨습니다. 장부를 다시 썼습니다.']) : jobIs(s, 'mountain_guide') ? s.rng.pick(['외국 손님을 설산에 안내했습니다. 손님은 산신 이야기를 듣고 싶어 했고, 산은 눈사태 이야기를 했습니다.', '눈사태가 길을 덮었습니다. 손님 둘을 사흘 만에 내려보냈습니다.']) : s.rng.pick(['국영철도 첫 겨울 운행이었습니다. 선로 위 눈을 치우는 것이 반, 기차가 반이었습니다.', '호화 열차가 들어왔습니다. 승객들은 창밖을 보고 저는 바퀴를 봤습니다.']), k: 'note', fx: { money: medX(s, 0.08), hl: -1 },
      f: F('삼족 공의회 등기소 ' + s.year + '년 기재') }) },
  { id: 'aeg_adult', a: [19, 64], tags: ['aegir'], w: 40, gap: 3, c: (s) => jobIs(s, 'abyssal_hunter', 'marine_biologist', 'consul_assigned'),
    run: (s) => { const bad = jobIs(s, 'abyssal_hunter') && s.rng.chance(0.35);
      return { t: jobIs(s, 'abyssal_hunter') ? (bad ? '더 깊은 곳에서 올라온 것과 싸웠습니다. 동료 하나가 돌아오지 않았습니다. 기록원은 "동화"라고 적었습니다.' : '심해 순찰이었습니다. 아무것도 올라오지 않았습니다. 조류 역전제가 그날이었습니다.') : jobIs(s, 'marine_biologist') ? '표본을 채집했습니다. 표본이 움직였습니다. 보고서는 세 번 고쳐 썼습니다.' : '집정관 배정 직무가 바뀌었습니다. 적성 수치가 바뀌었다고 했습니다. 저는 바뀌지 않았습니다.',
        k: bad ? 'bad' : 'note', fx: bad ? { hl: -6, h: -5 } : { sm: 1 }, f: F('집정관 기록원 직무 기록') }; } },
  { id: 'dur_adult', a: [19, 64], tags: ['durin'], w: 40, gap: 3, c: (s) => jobIs(s, 'geologist', 'dome_architect', 'brewer'),
    run: (s) => ({ t: jobIs(s, 'brewer') ? s.rng.pick(['벌꿀주 새 통을 열었습니다. 주민 투표로 이름을 정했습니다. 투표 결과는 "작년 것과 같음".', '지상에서 주문이 왔습니다. 가격은 지상 값으로 받았습니다.']) : s.rng.pick(['천장 점검이었습니다. 균열 하나를 찾았고 도시 확장 축제가 한 달 미뤄졌습니다.', '지상 탐사대에 자원했습니다. 작별 단장식을 치르고 올라갔다가 한 달 만에 돌아왔습니다. 하늘은 너무 컸습니다.']), k: 'note', fx: { h: 1, sm: 1 },
      f: F('돔 공동체 기록소 ' + s.year + '년 기재') }) },
];

// ────────────────────────────────────────────────────────────────────────────
// 결정
// ────────────────────────────────────────────────────────────────────────────
export const decisions = {
  /** 캐스터 계약 */
  adult_caster_contract: {
    gap: 8,
    ok: (s) => working(s) && (jobIs(s, 'caster', 'arts_knight') || (!!s.S.flags.casterRoute && artsTop(s))) && s.S.age >= 20 && s.S.age <= 45 && yr(s, 'caster', 0.3),
    build: (s) => {
      const who = { leithanien: '선제후 궁정', yan: '천사부', columbia: '기업 연구소', kazimierz: '기사단', ursus: '제1군단', victoria: '공작령', siracusa: '패밀리', laterano: '공증소 경비대', sargon: '아미르 친위대', bolivar: '세 정부 중 하나', kazdel: '용병단', higashi: '막부' }[s.S.root] || s.nation.name + ' 정부';
      return { title: '캐스터 계약', body: iga(who) + ' 아츠 계약을 제안했습니다. ' + s.rng.pick(['급료는 지금의 갑절, 기한은 5년, 용도는 묻지 않는 조건이었습니다.', '계약서에 "아츠 사용 상한"은 없었고 "결정 밀도 책임 면제" 조항은 있었습니다.', '유닛은 지급, 부작용은 본인 부담이었습니다.']),
        fact: F(org(s) + ' 아츠 종사자 계약 표준 양식'), choices: [
          { k: 'sign', label: '계약한다', sub: '돈 +, 소득 백분위 +, 건강 −(아츠 과용)', auto: 1.5 },
          { k: 'no', label: '거절한다', sub: '변화 없음', auto: 1 }] };
    },
    apply: (s, k) => {
      if (k !== 'sign') return { t: '거절했습니다. 제안자는 "다음에"라고 했고, 다음은 오지 않았습니다.', k: 'note', f: F('기록된 바 없음') };
      if (!jobIs(s, 'caster', 'arts_knight')) { const id = jobEligible(s, s.data.jobById.arts_knight) ? 'arts_knight' : 'caster'; takeJob(s, id, true); }
      s.S.pct = Math.min(0.95, s.S.pct + 0.1); s.S.flags.casterContract = s.S.age;
      if (s.S.ori.on) s.S.ori.uL = +(s.S.ori.uL + 0.02).toFixed(3);
      return { t: '계약했습니다. 첫 임무는 ' + ieot(s.rng.pick(['재앙 잔해 정리', '국경 경계', '실험 보조', '궁정 호위'])) + '고, 손끝이 한 달 동안 식지 않았습니다.', k: 'big', fx: { money: medX(s, 1), hl: -4, h: 2 }, f: F(org(s) + ' 아츠 종사자 계약 등록, ' + s.year + '년') };
    },
  },
  /** 용병 계약 연장 */
  adult_merc_contract: {
    gap: 5,
    ok: (s) => jobIs(s, 'mercenary', 'warcrow', 'blacksteel') && s.S.jobY >= 3 && s.S.age <= 50,
    build: (s) => ({ title: '계약 만료', body: '용병 계약이 끝났습니다. ' + s.rng.pick(['단장이 연장 서류를 내밀었습니다. 조건은 같고 전선만 달랐습니다.', '고용주는 연장을 원했습니다. 몸은 원하지 않았습니다.', '같이 들어온 사람 중 남은 것은 ' + s.rng.ri(2, 6) + '명이었습니다.']),
      fact: F(s.S.root === 'kazdel' ? '용병 등록부 계약 갱신란' : '용병 계약서 갱신 조항'), choices: [
        { k: 'renew', label: '연장한다', sub: '돈 +, 다칠 수 있습니다', auto: 1.5 },
        { k: 'home', label: '귀향한다', sub: '일자리를 다시 찾아야 합니다. 관계 +', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'renew') { s.S.flags.mercTerms = (s.S.flags.mercTerms || 0) + 1; const hurt = s.rng.chance(0.25);
        return { t: '연장했습니다. ' + (hurt ? '첫 달에 다쳤습니다. 계약금은 치료비로 갔습니다.' : '계약금이 들어왔습니다.'), k: hurt ? 'bad' : 'ev', fx: hurt ? { money: medX(s, 0.3), hl: -8, h: -3 } : { money: medX(s, 0.8), h: 1 }, f: F('용병 계약 갱신 ' + s.year + '년') }; }
      s.S.job = null; s.S.income = 0; s.S.flags.vetHome = s.S.age;
      return { t: '귀향했습니다. ' + (partner(s) ? iga(partner(s).name) + ' 문 앞에 서 있었습니다.' : '집은 기억보다 작았습니다.'), k: 'warm', fx: { so: 3, h: 2 }, f: F('용병 계약 종료 확인서') };
    },
  },
  /** 패밀리 승급 제안 */
  adult_famiglia_promo: {
    tags: ['siracusa'], gap: 6,
    ok: (s) => jobIs(s, 'famiglia') && s.S.jobY >= 4 && !s.S.flags.famigliaCapo,
    build: (s) => ({ title: '승급', body: iga(cul(s).rulerTitle) + ' 저녁에 불렀습니다. 구역 하나를 맡으라고 했습니다. 거절하는 사람은 드물고, 거절한 사람은 더 드뭅니다.', fact: F('시청(패밀리 승인) 구역 관리자 등록 규정'),
      choices: [
        { k: 'yes', label: '받는다', sub: '소득 백분위 +, 벤데타 위험 +', auto: 2 },
        { k: 'no', label: '사양한다', sub: '관계 −', auto: 0.7 },
        { k: 'leave', label: '패밀리를 떠난다', sub: '외로운 늑대. 위험합니다', auto: 0.4 }] }),
    apply: (s, k) => {
      if (k === 'yes') { s.S.flags.famigliaCapo = s.S.age; s.S.pct = Math.min(0.95, s.S.pct + 0.15); return { t: '받았습니다. 다음 날부터 가게 주인들이 ' + cul(s).address + ' 하고 불렀습니다.', k: 'big', fx: { money: medX(s, 0.5), h: 2 }, f: F('시청(패밀리 승인) 구역 관리자 명부, ' + s.year + '년') }; }
      if (k === 'leave') { s.S.job = null; s.S.income = 0; s.S.flags.loneWolf = s.S.age; const hurt = s.rng.chance(0.3);
        return { t: '패밀리를 떠났습니다. ' + (hurt ? '한 달 뒤 골목에서 둘이 기다리고 있었습니다. 살았고, 한동안 걷지 못했습니다.' : '아무도 막지 않았습니다. 아무도 인사하지도 않았습니다.'), k: 'bad', fx: hurt ? { hl: -10, h: -5, so: -4 } : { so: -4, h: 1 }, f: F('기록된 바 없음') }; }
      return { t: '사양했습니다. ' + eun(cul(s).rulerTitle) + ' 잔을 내려놓았습니다. 그 뒤로 봉투 심부름이 줄었습니다.', k: 'note', fx: { so: -2, money: -medX(s, 0.1) }, f: F('기록된 바 없음') };
    },
  },
  /** 기사 스폰서 계약 */
  adult_knight_sponsor: {
    tags: ['kazimierz'], gap: 5,
    ok: (s) => jobIs(s, 'knight') && !s.S.flags.sponsor && yr(s, 'sponsor', 0.6),
    build: (s) => ({ title: '스폰서', body: '스폰서 둘이 명함을 내밀었습니다. 하나는 ' + s.rng.pick(['보드카 회사', '재앙 예보 단말기 회사', '냉동 피에로기 회사', '대기업 공장']) + ', 하나는 동네 ' + cul(s).drink + ' 가게였습니다. 독립 기사로 남을 수도 있다고, 아무도 권하지 않는 말투로 심판이 말했습니다.',
      fact: F('감정회 스폰서 등록 규정'), choices: [
        { k: 'big', label: '대형 스폰서', sub: '돈 ++, 순위 +, 말을 들어야 합니다', auto: 2 },
        { k: 'small', label: '동네 가게', sub: '돈 +, 자유', auto: 1 },
        { k: 'none', label: '독립 기사', sub: '행복 +, 매우 불리합니다', auto: 0.5 }] }),
    apply: (s, k) => {
      s.S.flags.sponsor = k;
      if (k === 'big') { s.S.pct = Math.min(0.97, s.S.pct + 0.1); return { t: '대형 스폰서와 계약했습니다. 갑옷에 로고가 셋 붙었고, 계약서에는 "경기 운영 협조" 조항이 있었습니다.', k: 'big', fx: { money: medX(s, 2), h: 2 }, f: F('감정회 스폰서 등록, ' + s.year + '년') }; }
      if (k === 'small') return { t: '동네 가게와 계약했습니다. 갑옷에 손으로 그린 간판이 붙었습니다. 경기 날 가게는 문을 닫고 다 같이 왔습니다.', k: 'warm', fx: { money: medX(s, 0.5), so: 3 }, f: F('감정회 스폰서 등록, ' + s.year + '년') };
      return { t: '독립 기사로 남았습니다. 대진표에서 늘 가장 센 상대와 먼저 붙었습니다. 우연이라고 감정회는 말했습니다.', k: 'note', fx: { h: 3, money: -medX(s, 0.2) }, f: F('감정회 독립 기사 명부') };
    },
  },
  /** 카시미어 감염자 투기장 */
  adult_arena: {
    tags: ['kazimierz', 'known'], gap: 10,
    ok: (s) => adult(s) && !s.S.rhodes && !jobIs(s, 'arena_knight') && s.S.age >= 19 && s.S.age <= 40 && s.S.st.hl >= 45 && yr(s, 'arena', 0.5),
    build: (s) => ({ title: '감염자 참가 제도', body: '지하 거주구 벽에 공고가 붙었습니다. 감염자 기사 투기장. 이기면 본선, 본선에서 이기면 신분 합법화. 지면 그 자리에서 끝. ' + (s.S.job ? '지금 일은 ' + s.job.name + '입니다.' : '지금은 일이 없습니다.'),
      fact: F('감정회 감염자 참가 제도 시행 규칙 1094년'), choices: [
        { k: 'fight', label: '참가한다', sub: '돈 +, 매우 위험합니다', auto: s.S.job ? 0.6 : 1.5 },
        { k: 'no', label: '지하 거주구에 남는다', sub: '변화 없음', auto: 1 }] }),
    apply: (s, k) => {
      if (k !== 'fight') return { t: '공고 앞을 지나쳤습니다. 지하 거주구의 하루는 그대로였습니다.', k: 'note', f: F('기록된 바 없음') };
      takeJob(s, 'arena_knight', true); s.S.flags.arena = s.S.age;
      return { t: '투기장 기사로 등록했습니다. 등록 번호는 이름보다 길었습니다.', k: 'big', fx: { h: 2, so: -1 }, f: F('감정회 감염자 기사 등록 명부, ' + s.year + '년') };
    },
  },
  /** 이주 */
  adult_migrate: {
    gap: 10,
    ok: (s) => adult(s) && s.S.age >= 20 && s.S.age <= 45 && !s.S.mig && !s.S.flags.quarantined && !s.S.flags.noMove && lifeRoll(s, 'mig', 0.3) && yr(s, 'mig', 0.25),
    build: (s) => {
      const why = s.S.ori.known ? '감염자로 이 나라에서 사는 것이 어떤지 알 만큼 알았습니다.' : poor(s) ? '여기서 벌 수 있는 것은 다 벌어 보았습니다.' : (s.nation.conflict >= 3 ? '전쟁이 가까웠습니다.' : s.nation.catFreq >= 3 ? '재앙이 해마다 왔습니다.' : '다른 땅 이야기를 들을 기회가 있었습니다.');
      return { title: '떠날까', body: why + ' ' + s.rng.pick(['아는 사람이 먼저 가서 편지를 보냈습니다.', '이동도시 하나가 다음 달 국경을 넘는다고 했습니다.', '상단이 사람을 모집했습니다.']) + (partner(s) || kids(s).length ? ' 가족이 있습니다.' : ''),
        fact: orgF(s, '출국 신고 요건'), choices: [
          { k: 'go', label: '떠난다', sub: '다른 나라에서 다시 시작. 일자리 잃을 수 있음', auto: 1 },
          { k: 'stay', label: '남는다', sub: '변화 없음', auto: 1.5 }] };
    },
    apply: (s, k) => {
      if (k !== 'go') return { t: '남기로 했습니다. 편지에는 "다음에"라고 썼습니다.', k: 'note', f: F('기록된 바 없음') };
      const from = s.nation.name;
      if (!s.migrate('voluntary')) return { t: '떠나려 했지만 길이 막혔습니다.', k: 'note', f: orgF(s, '출국 신고 반려') };
      return { t: eul(from) + ' 떠났습니다. 짐은 ' + s.rng.ri(1, 3) + '개, 아는 사람은 ' + s.rng.ri(0, 2) + '명이었습니다.', k: 'big', fx: { h: 1, so: -3, money: -medX(s, 0.3) }, f: F(from + ' 출국 신고, ' + s.year + '년') };
    },
  },
};

export default { events, decisions };

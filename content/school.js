// W4a 국가 태그 유년·학창기 콘텐츠(0~18세): 이벤트 약 35개 · 결정 5개 · 대사건 4개(연도+나이 게이트, D12).
// 각 국가의 상징 직업·명절·호칭·음식이 문장에 묻어나게(D26). 각주는 세계관 안의 출처만(D25).
// 보고서 B절 "게임 이벤트/결정 후보"·"종교/관습"에서 씨앗을 가져왔다. 콜백은 전부 ctx 첫 인자(D23).
import { infect } from '../src/engine/oripathy.js';
import { takeJob } from '../src/engine/finance.js';
import {
  cul, org, fest, F, orgF, rhodesF, given, momName, dadName, dadHere, momHere, poor, rich, nomadic, upper, under, learn100, factionOrg,
  artsTop, artsLow, once, medX, eul, iga, eun, wa, ro,
} from './_util.js';

const Y = (s, a, b) => s.year >= a && s.year <= (b ?? a);

export const events = [
  // ── 우르수스 ──
  { id: 'ursus_neighbor_camp', a: [6, 18], tags: ['ursus'], w: 45, gap: 4,
    run: (s) => ({ t: s.rng.pick(['옆집 사람이 새벽에 끌려갔습니다. 수용소로 갔다고 했습니다. 그 집 문은 봄까지 열리지 않았습니다.', '학교에서 한 아이가 사라졌습니다. 선생님은 출석부에서 이름을 지웠고, 아무도 묻지 않았습니다.', '순찰대가 거리에서 소매를 걷어 올리게 했습니다. ' + (momHere(s) ? '어머니는' : dadHere(s) ? '아버지는' : '어른들은') + ' 제 팔을 먼저 내밀었습니다.']), k: 'bad', fx: { h: -3, cap: { ties: -0.01 } },
      f: orgF(s, '감염자 이송 월보') }) },
  { id: 'ursus_winter_ball', a: [7, 17], tags: ['ursus'], w: 35, gap: 4,
    run: (s) => ({ t: rich(s) ? '겨울 무도회에 따라갔습니다. 어른들은 ' + cul(s).rulerTitle + '의 건강을 위해 건배했고, 아이들은 ' + eul(cul(s).food) + ' 몰래 먹었습니다.' : '귀족들의 겨울 무도회를 창밖에서 보았습니다. 눈 속에서 ' + s.rng.ri(1, 3) + '시간을 서 있었습니다.', k: rich(s) ? 'warm' : 'note', fx: rich(s) ? { h: 2, cap: { ties: 0.02 } } : { h: 1, hl: -1 },
      f: F('제국 내무성 사교 행사 허가 목록') }) },
  { id: 'ursus_portrait', a: [4, 12], tags: ['ursus'], w: 35,
    run: (s) => ({ t: '거실에 ' + cul(s).ruler + '의 초상이 걸려 있었습니다. ' + eun(dadHere(s) ? '아버지' : momHere(s) ? '어머니' : '집안 어른') + ' 매일 아침 그 앞에서 모자를 벗었습니다.', k: 'note', fx: { cap: { learn: 0.01 } },
      f: F('제국 내무성 공인 초상화 판매 목록') }) },
  { id: 'ursus_chernobog_after', a: [3, 18], tags: ['ursus'], w: 40, c: (s) => Y(s, 1097, 1098) && !s.S.flags.chernobogAfter,
    run: (s) => { s.S.flags.chernobogAfter = true;
      return { t: '체르노보그에서 온 피난민 아이들이 학교에 들어왔습니다. 말이 없었고, 경보 소리에 먼저 일어섰습니다.', k: 'note', fx: { h: -1, cap: { ties: 0.01 } },
        f: F('제국 내무성 이재민 재배치 공고, 1097년') }; } },
  { id: 'ursus_student_paper', a: [14, 18], tags: ['ursus', 'school'], w: 35,
    run: (s) => ({ t: '학교에 손으로 쓴 신문이 돌았습니다. 읽은 아이들은 다음 날 아무것도 읽지 않은 얼굴을 했습니다.', k: 'note', fx: { h: -1, cap: { learn: 0.02 } },
      f: F('제국 내무성 불온 간행물 목록 부록') }) },

  // ── 염국 ──
  { id: 'yan_hubu', a: [0, 2], tags: ['yan', '!lungmen'], w: 45,
    run: (s) => ({ t: '호부 호적에 이름이 올랐습니다. 서기는 붓으로 획을 하나 잘못 썼고, 고치는 데 반년이 걸렸습니다.', k: 'note', f: F('호부 호적 등기 ' + s.year + '년분, 흠천감 교차 확인') }) },
  { id: 'yan_academy_exam', a: [12, 16], tags: ['yan', '!lungmen', 'school'], w: 40,
    run: (s) => {
      const pass = s.rng.chance(0.2 + (learn100(s) - 60) / 200 + (s.S.q - 3) * 0.05);
      return { t: pass ? '학궁 예비 시험에 붙었습니다. 마을에서 ' + eul(cul(s).food) + ' 돌렸습니다.' : '학궁 예비 시험을 보았습니다. 방(榜)에 이름이 없었습니다. ' + (momHere(s) ? '어머니는' : dadHere(s) ? '아버지는' : '집에서는') + ' "다음 해"라고만 했습니다.', k: pass ? 'warm' : 'bad', fx: pass ? { h: 4, cap: { learn: 0.02 } } : { h: -3 },
        f: F('예부 학정사 시험 공고') };
    } },
  { id: 'yan_tianshi', a: [5, 14], tags: ['yan'], w: 35,
    run: (s) => ({ t: '천사부 술사 행렬이 지나갔습니다. 어른들은 길을 비켰고, 아이들은 소매 속 아츠 유닛을 보려고 목을 뺐습니다.', k: 'ev', fx: { h: 1, cap: { learn: 0.01 } },
      f: F('공부 천사부 순행 일정표') }) },
  { id: 'yan_moon_feast', a: [4, 16], tags: ['yan', '!lungmen'], w: 35, gap: 4,
    run: (s) => ({ t: s.rng.pick(['추석 연회 날이었습니다. 달 아래서 ' + cul(s).elder + '들이 ' + eul(cul(s).drink) + ' 마시며 ' + cul(s).ruler + '의 치세를 이야기했습니다. 아이들은 월병을 세었습니다.', '춘절 전날 집 안 먼지를 다 털었습니다. 붉은 종이에 글자를 썼고, 획이 틀려 한 장을 버렸습니다.', '옥문 망봉제 소식이 북쪽에서 왔습니다. 사흘 동안 북을 열일곱 번 친다고 했습니다. 마을에서는 작은 북 하나로 흉내를 냈습니다.']), k: 'warm', fx: { h: 2, cap: { ties: 0.02 } },
      f: F('흠천감 역법 고시, 추석 연회 일자') }) },

  // ── 용문 ──
  { id: 'lungmen_slum', a: [4, 16], tags: ['lungmen'], w: 45, gap: 4, c: (s) => poor(s),
    run: (s) => ({ t: s.rng.pick(['빈민가 골목에서 자랐습니다. 근위국 순찰차가 오면 아이들이 먼저 알았습니다.', '옆 건물에 감염자 가족이 살았습니다. 집세는 같았고, 물은 따로 받았습니다.', '펭귄 배달 회사 직원이 상자를 떨어뜨렸습니다. 골목 아이들이 하루 동안 부자였습니다.']), k: 'note', fx: { hl: -1, cap: { ties: 0.01 } },
      f: F('용문 근위국 치안 백서 빈민가 편') }) },
  { id: 'lungmen_upper', a: [5, 16], tags: ['lungmen'], w: 40, gap: 4, c: (s) => rich(s),
    run: (s) => ({ t: s.rng.pick(['상층부 학교에 다녔습니다. 교실 창으로 빈민가 지붕이 보였고, 아무도 그쪽을 보지 않았습니다.', (dadHere(s) ? '아버지가' : momHere(s) ? '어머니가' : '집안 어른이') + ' ' + wa(cul(s).rulerTitle) + ' 같은 연회에 다녀왔습니다. 명함 한 장을 액자에 넣었습니다.', '주말마다 딤섬 집에 갔습니다. 종업원이 이름을 기억했습니다.']), k: 'ev', fx: { cap: { ties: 0.01, learn: 0.01 } },
      f: F('용문 근위국 호적과 거주 구역 등급') }) },
  { id: 'lungmen_1096', a: [0, 18], tags: ['lungmen'], w: 60, c: (s) => Y(s, 1097) && !s.S.flags.lungmen1097,
    run: (s) => { s.S.flags.lungmen1097 = true;
      return { t: '사변 다음 해였습니다. 학교는 석 달 늦게 열렸고, 빈민가 쪽 길은 아직 막혀 있었습니다. 반에서 ' + s.rng.ri(1, 4) + '명이 돌아오지 않았습니다.', k: 'bad', fx: { h: -3, cap: { ties: -0.02 } },
        f: F('용문 근위국 치안 백서, 1097년판') }; } },
  { id: 'lungmen_nian', a: [3, 17], tags: ['lungmen'], w: 45, c: (s) => Y(s, 1098) && !s.S.flags.nian1098,
    run: (s) => { s.S.flags.nian1098 = true;
      return { t: '춘절에 거리에서 큰 소동이 났습니다. 근위국 경관과 시민이 함께 무언가를 쫓았습니다. 어른들은 "니엔"이라고 했고, 폭죽은 평소보다 많았습니다.', k: 'ev', fx: { h: 3 },
        f: F('용문 근위국 춘절 치안 보고, 1098년') }; } },

  // ── 빅토리아 ──
  { id: 'vic_factory_child', a: [8, 14], tags: ['victoria', '!tara'], w: 45, gap: 3, c: (s) => poor(s) || s.S.flags.childLabor != null,
    run: (s) => ({ t: s.rng.pick(['공장에서 실 감는 일을 했습니다. 하루 ' + s.rng.ri(10, 14) + '시간. 기계는 아이 키에 맞춰져 있었습니다.', '공장 굴뚝 아래 동네에서 자랐습니다. 눈이 내리면 회색이었습니다.', '옆자리 아이가 기계에 손가락을 잃었습니다. 그날 공장은 멈추지 않았습니다.']), k: 'bad', fx: { hl: -3, h: -2, money: medX(s, 0.02) },
      f: F('공작령 등기소 공장 노동 대장, 연소자 칸 공란') }) },
  { id: 'vic_smog', a: [3, 15], tags: ['victoria', '!tara', 'urban'], w: 35, gap: 4,
    run: (s) => ({ t: '스모그가 심한 해였습니다. 기침이 겨울 내내 이어졌습니다. 홍차에 꿀을 타 마셨습니다.', k: 'bad', fx: { hl: -3 },
      f: F('공작령 등기소 대기 질 공고') }) },
  { id: 'vic_duke_parade', a: [5, 15], tags: ['victoria', '!tara'], w: 35,
    run: (s) => ({ t: '공작의 증기 기사단이 행진했습니다. 증기 갑주 소리에 창문이 떨렸습니다. 어른들은 어느 공작인지로 다퉜습니다.', k: 'ev', fx: { h: 1, cap: { learn: 0.01 } },
      f: F('공작 평의회 행진 허가서') }) },
  { id: 'vic_gaul_watch', a: [8, 17], tags: ['gaul', 'nation:victoria'], w: 40, gap: 4,
    run: (s) => ({ t: '이름 때문에 교사가 출신을 물었습니다. 가울계라고 하자 서류에 표시를 하나 했습니다.', k: 'bad', fx: { h: -1, cap: { ties: -0.02 } },
      f: F('공작령 등기소 복고주의 감시 명부 부록') }) },

  // ── 타라 ──
  { id: 'tara_tengair', a: [6, 13], tags: ['tara', 'school'], w: 45,
    run: (s) => ({ t: '집에서는 텐게어, 학교에서는 빅토리아어를 썼습니다. 교실에서 텐게어가 나오면 손바닥을 맞았습니다.', k: 'bad', fx: { h: -2, cap: { learn: 0.01 } },
      f: F('성당 호적부 교구 학교 규율') }) },
  { id: 'tara_potato', a: [3, 15], tags: ['tara'], w: 40, gap: 4,
    run: (s) => ({ t: s.rng.pick(['감자 수확이 나빴습니다. ' + cul(s).food + '에서 양고기가 빠졌습니다.', '사윈 밤에 문 앞에 불을 켰습니다. 할머니는 죽은 사람들이 돌아오는 밤이라고 했습니다.', '유목민 전령이 마을을 지나갔습니다. 편지 한 통에 감자 한 바구니였습니다.']), k: 'ev', fx: { h: s.rng.chance(0.5) ? 1 : -1, cap: { ties: 0.01 } },
      f: F('성당 호적부 교구 작황 기록') }) },
  { id: 'tara_1098', a: [4, 18], tags: ['tara'], w: 60, c: (s) => Y(s, 1098) && !s.S.flags.tara1098,
    run: (s) => { s.S.flags.tara1098 = true;
      return { t: '타라가 독립을 선언했습니다. 마을에 깃발이 올라갔고, 그다음 주에 빅토리아 군이 왔습니다. 학교는 문을 닫았습니다.', k: 'big', fx: { h: -2, cap: { ties: 0.01 } },
        f: F('더블린 포고문, 1098년') }; } },

  // ── 카시미어 ──
  { id: 'kaz_major_broadcast', a: [5, 18], tags: ['kazimierz'], w: 45, gap: 4,
    run: (s) => ({ t: s.rng.pick(['메이저 중계를 온 가족이 보았습니다. 기사가 쓰러질 때 ' + iga(cul(s).elder) + ' ' + cul(s).drink + ' 잔을 놓쳤습니다.', '친구들과 기사 카드를 모았습니다. 스폰서 상표가 큰 카드가 비쌌습니다.', '학교 운동장에서 기사 놀이를 했습니다. 늘 누군가 광고 역할을 맡아야 했습니다.']), k: 'warm', fx: { h: 3, cap: { ties: 0.01 } },
      f: F('감정회 메이저 중계 시청 가구 집계') }) },
  { id: 'kaz_knight_memorial', a: [6, 16], tags: ['kazimierz'], w: 30, gap: 5,
    run: (s) => ({ t: '기사 추모제에 갔습니다. 챔피언 홀 벽에 적힌 이름 중 절반은 스폰서 이름이었습니다.', k: 'note', fx: { cap: { learn: 0.01 } },
      f: F('감정회 연감 추모제 편') }) },

  // ── 라이타니엔 ──
  { id: 'lei_arts_test', a: [10, 10], tags: ['leithanien'], w: 60,
    run: (s) => {
      if (artsLow(s)) { s.S.flags.defective = true; return { t: '열 살 아츠 적성 검사를 받았습니다. 결과지에 "결함"이라는 글자가 찍혀 나왔습니다. 그날부터 몇 아이들이 그렇게 불렀습니다.', k: 'bad', fx: { h: -4, cap: { ties: -0.04 } }, f: F('궁정 기록국 아츠 적성 검사 결과 통지서') }; }
      if (artsTop(s)) return { t: '열 살 아츠 적성 검사를 받았습니다. 상위 등급. 군 아츠 시설에서 편지가 왔습니다.', k: 'big', fx: { h: 2, cap: { learn: 0.02 } }, f: F('궁정 기록국 아츠 적성 검사 결과 통지서') };
      return { t: '열 살 아츠 적성 검사를 받았습니다. 보통 등급. 집에 오는 길에 ' + (momHere(s) ? '어머니가' : dadHere(s) ? '아버지가' : '어른이') + ' ' + eul(cul(s).food.split('와')[0]) + ' 사 주었습니다.', k: 'ev', fx: { h: 1 }, f: F('궁정 기록국 아츠 적성 검사 결과 통지서') };
    } },
  { id: 'lei_music', a: [5, 14], tags: ['leithanien'], w: 45, gap: 4,
    run: (s) => ({ t: s.rng.pick(['음악 수업이 매일 있었습니다. 악기를 못 사는 아이는 노래를 맡았습니다.', '학교 합주단이 여황 축제에서 연주했습니다. 뒷줄이었습니다.', '귈데네스게사츠 연주를 처음 들었습니다. 어른들은 일어섰고, 몇은 울었습니다.']), k: 'warm', fx: { h: 2, cap: { learn: 0.02 } },
      f: F('궁정 기록국 음악 교육령') }) },
  { id: 'lei_defective_life', a: [11, 18], tags: ['leithanien'], w: 40, gap: 3, c: (s) => !!s.S.flags.defective,
    run: (s) => ({ t: s.rng.pick(['결함품이라는 말이 따라다녔습니다. 합주단에서는 악보를 넘기는 일을 맡았습니다.', '진로 상담에서 교사는 "손으로 하는 일"만 말했습니다.']), k: 'bad', fx: { h: -2, cap: { ties: -0.02 } },
      f: F('궁정 기록국 아츠 적성 등급별 직업 안내') }) },

  // ── 컬럼비아 ──
  { id: 'col_insurance_notice', a: [0, 4], tags: ['columbia'], w: 40,
    run: (s) => ({ t: '보험협회에서 출생 축하 편지가 왔습니다. 두 번째 장은 아동 특약 안내, 세 번째 장은 광석병 면책 조항이었습니다.', k: 'note', fx: rich(s) ? {} : { money: -medX(s, 0.03) },
      f: F('보험협회 신생아 가입 안내서 ' + s.year + '년판') }) },
  { id: 'col_frontier_town', a: [4, 15], tags: ['columbia', 'rural'], w: 40, gap: 4,
    run: (s) => ({ t: s.rng.pick(['개척지 마을이었습니다. 보안관은 하나, 술집은 셋이었습니다.', '민간 군사기업 차량이 마을을 지나갔습니다. 아이들이 손을 흔들었고, 그들은 흔들지 않았습니다.', '학교 교과서가 ' + s.rng.ri(2, 5) + '년 늦게 왔습니다. 광고가 더 많았습니다.']), k: 'ev', fx: { cap: { ties: 0.01 } },
      f: F('보험협회 개척지 위험 등급표') }) },
  { id: 'col_lab_tour', a: [9, 16], tags: ['columbia', 'urban'], w: 35,
    run: (s) => ({ t: '학교에서 연구소 견학을 갔습니다. 흰 가운을 입은 연구원이 "미래"라는 말을 열한 번 했습니다. 기념품은 볼펜이었습니다.', k: 'ev', fx: { cap: { learn: 0.03 } },
      f: F('보험협회 교육 후원 프로그램 명단') }) },

  // ── 시라쿠사 ──
  { id: 'sir_carnevale', a: [5, 18], tags: ['siracusa'], w: 40, gap: 5,
    run: (s) => ({ t: '카르네발레였습니다. 가면을 쓴 어른들이 거리를 채웠습니다. 다음 날 아침 골목 하나에 흰 천이 깔려 있었고, 아무도 그 길로 가지 않았습니다.', k: 'ev', fx: { h: 2, cap: { ties: 0.01 } },
      f: F('시청(패밀리 승인) 축제 허가서') }) },
  { id: 'sir_tail_dye', a: [6, 14], tags: ['siracusa', 'lupo'], w: 40,
    run: (s) => ({ t: '꼬리 끝을 가문 색으로 염색했습니다. 어느 패밀리 구역에 사는지 한눈에 알게 되는 색이었습니다.', k: 'note', fx: { cap: { ties: 0.02 } },
      f: F('시청(패밀리 승인) 가문 표식 등록') }) },
  { id: 'sir_protection', a: [8, 17], tags: ['siracusa', 'rural'], w: 40, gap: 4,
    run: (s) => ({ t: '매달 같은 날 양복 입은 남자가 집에 왔습니다. ' + (momHere(s) ? '어머니는' : dadHere(s) ? '아버지는' : '집에서는') + ' 봉투를 건넸고, 남자는 제 머리를 쓰다듬었습니다.', k: 'bad', fx: { money: -medX(s, 0.05), h: -1 },
      f: F('시청(패밀리 승인) 지역 보호 분담금 안내') }) },

  // ── 라테라노 ──
  { id: 'lat_bells_1099', a: [3, 18], tags: ['laterano'], w: 60, c: (s) => Y(s, 1099) && !s.S.flags.bells1099,
    run: (s) => { s.S.flags.bells1099 = true;
      return { t: '계시의 탑 종이 울렸습니다. 천 년 동안 침묵했던 종이라고 했습니다. 어른들은 무릎을 꿇었고, 리베리 이웃은 창문을 닫았습니다.', k: 'big', fx: { h: 2, cap: { learn: 0.01 } },
        f: F('공증소 공고, 1099년 종 타종 기록') }; } },
  { id: 'lat_liberi_kid', a: [6, 15], tags: ['laterano', 'liberi'], w: 45, gap: 4,
    run: (s) => ({ t: '산크타 아이들은 서로 말없이 통했습니다. 그 사이에서 리베리는 늘 한 박자 늦었습니다.', k: 'bad', fx: { h: -1, cap: { ties: -0.03 } },
      f: F('공증소 거주 등록, 비산크타 항목') }) },
  { id: 'lat_cactus', a: [4, 14], tags: ['laterano'], w: 30, gap: 5,
    run: (s) => ({ t: '세기 축전 준비로 거리마다 선인장 타르트를 팔았습니다. 맛은 호불호가 갈렸고, 저는 후자였습니다.', k: 'warm', fx: { h: 2 },
      f: F('공증소 축전 노점 허가 목록') }) },

  // ── 림 빌리턴 ──
  { id: 'rim_mine_town', a: [3, 14], tags: ['rim'], w: 45, gap: 4,
    run: (s) => ({ t: s.rng.pick(['광산 사이렌으로 시간을 알았습니다. 아침 사이렌, 점심 사이렌, 사고 사이렌.', '갱도 입구에서 광부들과 공동 식사를 했습니다. 수박 케이크가 나오는 날은 월급날이었습니다.', '재앙이 또 왔습니다. 광업연합은 "일정 변경 없음"이라고 방송했습니다.']), k: 'note', fx: { hl: -1, cap: { ties: 0.01 } },
      f: F('광업연합 인사부 마을 공지') }) },
  { id: 'rim_mine_accident', a: [5, 17], tags: ['rim'], w: 35, gap: 5,
    run: (s) => ({ t: '광산이 무너졌습니다. 사이렌이 하루 종일 울렸습니다. 학교 반에서 ' + s.rng.ri(1, 3) + '명이 검은 옷을 입고 왔습니다.', k: 'loss', fx: { h: -3, cap: { ties: -0.01 } },
      f: F('광업연합 인사부 사고 보고, 보상 항목 별지') }) },

  // ── 사미 ──
  { id: 'sami_runes', a: [4, 12], tags: ['sami'], w: 45, gap: 4,
    run: (s) => ({ t: s.rng.pick(['장로가 나무껍질에 룬을 새겨 점을 쳤습니다. "올겨울은 길다"였습니다. 매년 같은 답이었습니다.', '밤에 숲에 들어가지 말라는 경고문을 외웠습니다. 여덟 조항이었고, 다 외우기 전에는 밖에 나갈 수 없었습니다.', '오로라가 뜬 밤 어른들이 아이들의 눈을 가렸습니다. 이유는 어른이 되어서도 듣지 못했습니다.']), k: 'note', fx: { cap: { learn: 0.02 } },
      f: F('사제단 룬 기록, 겨울 점복 편') }) },
  { id: 'sami_priest_apprentice', a: [8, 14], tags: ['sami'], w: 45, c: (s) => s.S.arts >= 0.3 && !s.S.flags.snowApprentice,
    run: (s) => { s.S.flags.snowApprentice = true;
      return { t: '눈의 사제가 저를 지목했습니다. 그날부터 제단 옆에서 룬을 배웠습니다. ' + (momHere(s) ? '어머니는' : dadHere(s) ? '아버지는' : '집에서는') + ' 기뻐했고, 밤에는 울었습니다.', k: 'big', fx: { cap: { learn: 0.03, ties: 0.01 } },
        f: F('사제단 룬 기록, 견습 지명') }; } },
  { id: 'sami_cold', a: [2, 16], tags: ['sami'], w: 40, gap: 4,
    run: (s) => ({ t: '한파가 왔습니다. 순록 세 마리가 죽었고, 이웃 아이 하나가 손가락 두 개를 잃었습니다.', k: 'bad', fx: { hl: -3, h: -2 },
      f: F('사제단 룬 기록, 한파 희생 집계') }) },

  // ── 카즈델 ──
  { id: 'kazdel_merc_father', a: [2, 14], tags: ['kazdel'], w: 35, gap: 4, c: (s) => dadHere(s),
    run: (s) => ({ t: s.rng.pick(['아버지가 용병 계약으로 떠났습니다. 돌아올 날은 계약서에 적혀 있지 않았습니다.', '아버지가 돌아왔습니다. 흉터가 하나 늘었고, 돈은 조금 늘었습니다.', '아버지가 가르쳐 준 것은 칼 잡는 법과 뿔 손질하는 법이었습니다.']), k: 'ev', fx: { h: -1, money: medX(s, 0.05), cap: { ties: 0.01 } },
      f: F('용병 등록부 계약 갱신 기록') }) },
  { id: 'kazdel_civil_war', a: [0, 18], tags: ['kazdel'], w: 50, c: (s) => Y(s, 1090, 1094) && !s.S.flags.kazdelWar,
    run: (s) => { s.S.flags.kazdelWar = true;
      return { t: '내전이 이어졌습니다. 학교 대신 폐허에서 쓸 만한 것을 찾는 일을 배웠습니다. 글자는 포고문에서 배웠습니다.', k: 'bad', fx: { hl: -2, h: -3, cap: { learn: -0.02 } },
        f: F('용병 등록부 전시 기록, 1090~1094년') }; } },
  { id: 'kazdel_sauin', a: [4, 17], tags: ['kazdel'], w: 35, gap: 5,
    run: (s) => ({ t: '사우인 밤이었습니다. 검은 행렬이 지나갔고, 아이들은 유령 옷을 입고 사탕을 받았습니다. 살카즈가 웃는 날은 일 년에 하루였습니다.', k: 'warm', fx: { h: 3, cap: { ties: 0.02 } },
      f: F('용병 등록부, 사우인 휴전 관례') }) },

  // ── 이베리아 ──
  { id: 'ib_coast_curfew', a: [5, 16], tags: ['iberia'], w: 45, gap: 4,
    run: (s) => ({ t: s.rng.pick(['해가 지면 해안으로 가는 길이 막혔습니다. 바다는 소리로만 알았습니다.', '등대가 꺼진 밤이 있었습니다. 다음 날 아침 재판소 사람들이 등대 관리인을 데려갔습니다.', '파도에 밀려온 것은 만지지 않는 법을 배웠습니다. 모양이 무엇이든.']), k: 'note', fx: { h: -1, cap: { learn: 0.01 } },
      f: F('재판소 해안 통행 금지령') }) },
  { id: 'ib_inquisitor_patrol', a: [6, 16], tags: ['iberia'], w: 40, gap: 4,
    run: (s) => ({ t: '재판소 집행관이 마을을 돌았습니다. 집마다 들어가 물에 손을 담가 보게 했습니다. 손이 물을 싫어하면 안 되는 것이라고 했습니다.', k: 'bad', fx: { h: -2 },
      f: F('재판소 순찰 기록, 해안 교구') }) },

  // ── 볼리바르 ──
  { id: 'bol_three_flags', a: [5, 14], tags: ['bolivar'], w: 45, gap: 4,
    run: (s) => ({ t: s.rng.pick(['학교 교과서가 세 종류였습니다. 올해는 어느 정부 것으로 배울지 교장이 정했습니다.', '독립기념일이 세 번 있었습니다. 세 번 다 쉬는 해는 좋은 해였습니다.', '집에서는 세 나라 말을 섞어 썼습니다. 글은 어느 것도 제대로 쓰지 못했습니다.']), k: 'note', fx: { cap: { learn: 0.01, ties: 0.01 } },
      f: F(factionOrg(s) + ' 학제 공고') }) },
  { id: 'bol_recruiter', a: [14, 17], tags: ['bolivar'], w: 35, gap: 3,
    run: (s) => ({ t: '용병 모집관이 학교 앞에 차를 세웠습니다. 급여표가 교사 월급의 세 배였습니다. 반에서 ' + s.rng.ri(1, 4) + '명이 따라갔습니다.', k: 'note', fx: { h: -1, cap: { learn: 0.01 } },
      f: F(factionOrg(s) + ' 모집 허가증') }) },

  // ── 극동 ──
  { id: 'hig_north_house', a: [4, 15], tags: ['higashi'], w: 45, gap: 4, c: (s) => s.S.sub.region === 'north',
    run: (s) => ({ t: s.rng.pick(['가문 도장에서 새벽 수련이 있었습니다. 늦으면 ' + iga(cul(s).elder) + ' 말없이 문을 닫았습니다.', '북조 집안은 병을 말하지 않았습니다. 기침이 길어진 친척은 어느 날 "시골로 갔다"고 했습니다.', '설날 참배에 가문 전체가 줄을 섰습니다. 순서가 서열이었습니다.']), k: 'note', fx: { h: -1, cap: { learn: 0.01 } },
      f: F('호적대장소 북조 가문 등록') }) },
  { id: 'hig_south_company', a: [4, 15], tags: ['higashi'], w: 45, gap: 4, c: (s) => s.S.sub.region !== 'north',
    run: (s) => ({ t: s.rng.pick([(dadHere(s) ? '아버지는' : momHere(s) ? '어머니는' : '옆집 어른은') + ' 회사원이었습니다. 밤 ' + s.rng.ri(10, 12) + '시에 돌아왔고, 일요일에 잤습니다.', '학교에서 보험 회사 견학을 갔습니다. 어린이용 보험증을 하나씩 받았습니다.', '여름 불꽃놀이 축제에 유카타를 입고 갔습니다. 아이돌 공연이 불꽃보다 길었습니다.']), k: 'ev', fx: { h: 1, cap: { ties: 0.01 } },
      f: F('호적대장소 남조 기업 등록') }) },
  { id: 'hig_oni_kid', a: [6, 16], tags: ['higashi', 'oni'], w: 40, gap: 4,
    run: (s) => ({ t: '오니라서 법명만 있고 성이 없었습니다. 출석을 부를 때 선생님이 매번 한 박자 멈췄습니다.', k: 'bad', fx: { h: -1, cap: { ties: -0.02 } },
      f: F('호적대장소 성씨 등록 예외 조항') }) },

  // ── 사르곤 ──
  { id: 'sar_market', a: [5, 15], tags: ['sargon'], w: 45, gap: 4,
    run: (s) => ({ t: s.rng.pick(['오아시스 장날이었습니다. 대추야자와 향신료 사이로 쇠사슬에 묶인 사람들이 지나갔습니다. 어른들은 값을 물었습니다.', '아미르가 바뀌었습니다. 세금 고지서의 도장만 달라졌습니다.', '마비소티아 제전 소식이 정글 쪽에서 왔습니다. 대족장 후보가 셋이라고 했습니다.']), k: 'note', fx: { h: -1, cap: { learn: 0.01 } },
      f: F('파디샤 궁정 서기국 아미르령 보고') }) },
  { id: 'sar_heat', a: [2, 14], tags: ['sargon'], w: 35, gap: 5,
    run: (s) => ({ t: '열풍이 불었습니다. 사흘 동안 집 밖에 나가지 못했고, 물은 셈해서 마셨습니다.', k: 'bad', fx: { hl: -3 },
      f: F('파디샤 궁정 서기국 기상 기록') }) },

  // ── 미노스 ──
  { id: 'min_games', a: [5, 17], tags: ['minos'], w: 45, gap: 4,
    run: (s) => ({ t: s.rng.pick(['힘노이의 지혜 경기가 열렸습니다. 도시마다 응원이 달랐고, 올리브 가지가 우승자 머리에 올라갔습니다.', '신전 사제가 서사시를 낭송했습니다. 열두 영웅의 이름을 다 외우는 데 한 해가 걸렸습니다.', '사르곤 국경 쪽에서 연기가 올랐습니다. 어른들은 아무 말 없이 양젖 치즈를 더 만들었습니다.']), k: 'ev', fx: { h: 1, cap: { learn: 0.02 } },
      f: F('신전 서기관 연중 행사 기록') }) },

  // ── 쉐라그 ──
  { id: 'kje_mountain', a: [4, 16], tags: ['kjerag'], w: 45, gap: 4,
    run: (s) => ({ t: s.rng.pick(['설산 사냥 의식에 처음 따라갔습니다. 눈 속에서 ' + s.rng.ri(5, 10) + '시간을 걸었고, 치즈 퐁듀가 그렇게 맛있는 줄 몰랐습니다.', '카란 광장 축제에 삼족 가주들이 나왔습니다. 어른들은 누가 누구 뒤에 섰는지로 한 달을 이야기했습니다.', '산신의 사제가 마을을 축복했습니다. 재앙은 한 번도 온 적이 없는 땅이라고 했습니다.']), k: 'warm', fx: { h: 2, cap: { ties: 0.01 } },
      f: F('삼족 공의회 등기소 행사 기록') }) },
  { id: 'kje_railway', a: [4, 18], tags: ['kjerag'], w: 40, c: (s) => Y(s, 1097, 1098) && !s.S.flags.kjeRail,
    run: (s) => { s.S.flags.kjeRail = true;
      return { t: '산 아래로 철도가 놓였습니다. 처음 온 기차를 보러 마을이 다 나갔습니다. ' + eun(cul(s).elder) + ' "산이 가벼워졌다"고 했습니다.', k: 'ev', fx: { cap: { learn: 0.02 } },
        f: F('삼족 공의회 등기소 철도 개통 공고, 1097년') }; } },

  // ── 에기르 ──
  { id: 'aeg_deep_light', a: [3, 15], tags: ['aegir'], w: 45, gap: 4,
    run: (s) => ({ t: s.rng.pick(['심해 빛의 날이었습니다. 도시의 발광 생물이 한꺼번에 밝아졌고, 집정관이 짧은 연설을 했습니다.', '학교에서 육지 이야기를 배웠습니다. 건조하고, 재앙이 오고, 사람들이 우리를 반기지 않는 곳이라고 했습니다.', '더 깊은 곳에서 무언가 올라왔다는 경보가 있었습니다. 어비설 헌터가 내려갔고, 수가 줄어서 돌아왔습니다.']), k: 'note', fx: { cap: { learn: 0.02 } },
      f: F('집정관 기록원 교육 교재') }) },

  // ── 두린 ──
  { id: 'dur_brew', a: [5, 17], tags: ['durin'], w: 45, gap: 4,
    run: (s) => ({ t: s.rng.pick(['도시 확장 축제였습니다. 새 터널 개통에 벌꿀주가 통째로 나왔습니다. 아이들은 버섯 빵을 받았습니다.', '옆 돔 도시가 비워졌습니다. 떠나기 전 주민들이 도시를 닦고 칠했습니다. 가장 좋은 모습으로 끝을 맞이해야 한다고 했습니다.', '주민 투표가 있었습니다. 안건은 리조트 철거였습니다. 어른들은 재미없어졌다고 했습니다.']), k: 'warm', fx: { h: 2, cap: { ties: 0.01 } },
      f: F('돔 공동체 기록소 투표 결과 공고') }) },

  // ── 공통이지만 국가 상징 직업 부모(D26) ──
  { id: 'parent_special_job', a: [5, 13], w: 35,
    c: (s) => { const j = s.S.fam.dad.job && s.data.jobById[s.S.fam.dad.job]; const m = s.S.fam.mom.job && s.data.jobById[s.S.fam.mom.job]; return (dadHere(s) && j && j.special) || (m && m.special); },
    run: (s) => {
      const d = dadHere(s) && s.S.fam.dad.job && s.data.jobById[s.S.fam.dad.job];
      const j = d && d.special ? d : s.data.jobById[s.S.fam.mom.job];
      const who = d && d.special ? '아버지' : momHere(s) ? '어머니' : '부모';
      return { t: who + '의 직업은 ' + j.name + '였습니다. 학교에서 부모 직업을 적는 날, 반에서 저 혼자였습니다.', k: 'note', fx: { cap: { ties: 0.01, learn: 0.01 } }, f: orgF(s, '직업 분류표, ' + j.name + ' 항목') };
    } },
];

// ────────────────────────────────────────────────────────────────────────────
// 국가 결정
// ────────────────────────────────────────────────────────────────────────────
export const decisions = {
  kazimierz_trial: {
    tags: ['kazimierz'],
    ok: (s) => s.S.age >= 10 && s.S.age <= 12 && s.rng.chance(0.5),
    build: (s) => ({ title: '기사단 유소년 선발', body: '기사단 유소년 선발전 공고가 학교에 붙었습니다. 스폰서 로고가 공고보다 컸습니다.', fact: F('감정회 유소년 선발 규정'),
      choices: [{ k: 'try', label: '응시한다', sub: '붙으면 15세에 기사 연습생 우선', auto: 1.5 }, { k: 'skip', label: '지나친다', sub: '변화 없음', auto: 1 }] }),
    apply: (s, k) => {
      if (k !== 'try') return { t: '공고 앞을 지나쳤습니다.', k: 'note' };
      const pass = s.rng.chance(0.3 + (s.S.st.hl - 70) / 100 + (rich(s) ? 0.15 : 0));
      if (pass) { s.S.flags.knightTrial = true; return { t: '선발전을 통과했습니다. 스폰서 하나가 명함을 주었습니다.', k: 'big', fx: { h: 4, hl: 1 } }; }
      return { t: '선발전에서 떨어졌습니다. 독립 지원자는 원래 불리하다고 심판이 말했습니다.', k: 'bad', fx: { h: -3 } };
    },
  },
  laterano_gun12: {
    tags: ['laterano'],
    ok: (s) => s.S.age === 12,
    build: (s) => {
      const sankta = s.S.race === 'sankta';
      return { title: '열두 살, 수호총', body: sankta ? '열두 살이 되어 수호총 수여식에 섰습니다. 공증인이 이름을 불렀습니다.' : '같은 반 산크타 아이들이 수호총을 받는 날이었습니다. 리베리와 그 밖의 아이들은 뒷줄에 앉았습니다.', fact: F('공증소 수호총 수여 규정 제12조'),
        choices: sankta ? [{ k: 'take', label: '받는다', sub: '관계 +, 총기 면허의 길', auto: 3 }, { k: 'refuse', label: '사양한다', sub: '매우 드문 일입니다', auto: 0.2 }]
          : [{ k: 'watch', label: '지켜본다', sub: '행복 −', auto: 2 }, { k: 'leave', label: '자리를 뜬다', sub: '관계 −', auto: 1 }] };
    },
    apply: (s, k) => {
      if (k === 'take') { s.S.flags.guardianGun = true; return { t: '수호총을 받았습니다. 총은 생각보다 무거웠고, 어른들은 그렇게 느끼는 게 맞다고 했습니다.', k: 'big', fx: { h: 2, cap: { ties: 0.03 } }, f: F('공증소 수호총 수여 대장, ' + s.year + '년') }; }
      if (k === 'refuse') return { t: '사양했습니다. 공증인이 펜을 멈췼습니다. 그날 저녁 집에 손님이 셋 왔습니다.', k: 'bad', fx: { cap: { ties: -0.04 } }, f: F('공증소 수여 대장 비고란') };
      if (k === 'watch') return { t: '끝까지 지켜보았습니다. 박수를 쳤습니다.', k: 'note', fx: { h: -2 } };
      return { t: '중간에 자리를 떴습니다. 아무도 부르지 않았습니다.', k: 'note', fx: { cap: { ties: -0.02 } }, f: F('기록된 바 없음') };
    },
  },
  siracusa_errand: {
    tags: ['siracusa'],
    ok: (s) => s.S.age >= 10 && s.S.age <= 14 && s.rng.chance(0.5),
    build: (s) => ({ title: '심부름', body: '동네 ' + iga(cul(s).elder) + ' 봉투 하나를 건너편 가게에 전해 달라고 했습니다. 열어 보지 말라고는 하지 않았습니다. 그럴 필요가 없다는 뜻이었습니다.', fact: F('시청(패밀리 승인) 소년 고용 지침'),
      choices: [{ k: 'do', label: '전한다', sub: '돈 +, 패밀리의 눈에 들어감', auto: 1.5 }, { k: 'refuse', label: '거절한다', sub: '관계 −', auto: 1 }] }),
    apply: (s, k) => {
      if (k === 'do') { s.S.flags.famigliaEye = true; return { t: '봉투를 전했습니다. 가게 주인은 ' + cul(s).food.split('와')[0] + ' 한 접시를 내주었고, 돌아오는 길에 동전이 주머니에 들어 있었습니다.', k: 'ev', fx: { money: medX(s, 0.02), cap: { ties: 0.02 } }, f: F('시청(패밀리 승인) 소년 고용 지침') }; }
      return { t: '거절했습니다. ' + eun(cul(s).elder) + ' 웃었고, 그 뒤로 인사를 받지 않았습니다.', k: 'note', fx: { h: 1, cap: { ties: -0.02 } }, f: F('기록된 바 없음') };
    },
  },
  columbia_fair: {
    tags: ['columbia', 'school'],
    ok: (s) => s.S.age >= 12 && s.S.age <= 15 && s.rng.chance(0.5),
    build: (s) => ({ kind: 'small', title: '과학 경진대회', body: '학교 과학 경진대회 공고가 났습니다. 후원사는 연구소였고, 우승자는 인턴 자격을 받습니다.', fact: F('보험협회 교육 후원 프로그램 명단'), def: 'enter',
      choices: [{ k: 'enter', label: '출품한다', sub: '지식 +, 운이 좋으면 인턴', auto: 1.5 }, { k: 'skip', label: '안 한다', sub: '변화 없음', auto: 1 }] }),
    apply: (s, k) => {
      if (k !== 'enter') return { t: '공고를 지나쳤습니다.', k: 'note' };
      const win = s.rng.chance(0.15 + (learn100(s) - 60) / 200);
      if (win) { s.S.flags.labIntern = true; return { t: '경진대회에서 상을 받았습니다. 연구소 명함과 함께 비밀 유지 서약서가 왔습니다.', k: 'big', fx: { h: 3, cap: { learn: 0.04 } }, f: F('연구소 청소년 인턴 선발 통지') }; }
      return { t: '출품했습니다. 상은 받지 못했고, 참가 기념 볼펜을 받았습니다.', k: 'ev', fx: { cap: { learn: 0.02 } }, f: F('보험협회 교육 후원 프로그램 참가자 명단') };
    },
  },
  rim_pitsinker: {
    tags: ['rim'],
    ok: (s) => s.S.age >= 8 && s.S.age <= 12 && poor(s) && !s.S.job && s.rng.chance(0.6),
    build: (s) => ({ title: '피트싱커', body: '광업연합 사람이 집에 왔습니다. 아이 몸집이 좁은 갱도에 맞는다고 했습니다. 급여표를 식탁에 올려 두고 갔습니다.', fact: F('광업연합 인사부 연소자 갱도 작업 규정'),
      choices: [{ k: 'go', label: '간다', sub: '돈 +, 건강 −, 감염 위험 매우 높음', auto: 1 }, { k: 'refuse', label: '거절한다', sub: '돈 −', auto: 1.2 }] }),
    apply: (s, k) => {
      if (k === 'go') { takeJob(s, 'pitsinker', true); s.S.flags.childLabor = s.S.age; s.S.school = null; return { t: '피트싱커가 되었습니다. 첫날 갱도 안에서 어른이 "숨을 참으면 더 오래 산다"고 했습니다.', k: 'bad', fx: { hl: -3, money: medX(s, 0.05) } }; }
      return { t: '거절했습니다. 급여표는 식탁 위에 한 달 더 놓여 있었습니다.', k: 'note', fx: { money: -medX(s, 0.05) } };
    },
  },
};

// ────────────────────────────────────────────────────────────────────────────
// 대사건(연도+나이 게이트, 0~18세). 성인기 세션이 a:[19,…] 로 같은 사건을 따로 쓴다
// ────────────────────────────────────────────────────────────────────────────
export const big = [
  { id: 'lungmen_1096_kid', nation: 'lungmen', year: 1096, month: 12, a: [0, 18],
    run: (s) => {
      const r = s.rng.rnd();
      if (poor(s) && r < 0.03) { s.die('war', '용문 사변'); return; }
      if (poor(s) && r < 0.12) { if (!s.S.ori.on) infect(s, 'lungmen'); return { t: '사변이 빈민가를 덮쳤습니다. 집이 불탔고, 연기 속에서 며칠을 보냈습니다.', k: 'big', fx: { hl: -6, h: -6 } }; }
      if (poor(s)) return { t: '사변이 났습니다. 근위국이 구역을 봉쇄했고, 가족은 사흘 동안 지하에 있었습니다.', k: 'big', fx: { h: -5, money: -Math.round(s.S.money * 0.2) } };
      return { t: '사변이 났습니다. 상층부에서는 창밖 연기와 단말기 속보로 알았습니다. 학교가 두 달 쉬었습니다.', k: 'big', fx: { h: -3 } };
    } },
  { id: 'londinium_1094_kid', nation: 'victoria', year: 1094, a: [0, 18], c: (s) => s.S.cur === 'victoria' && s.S.urban && s.rng.chance(0.3),
    run: (s) => { s.S.flags.londinium = true;
      return { t: '런디니움에 살았습니다. 성문이 봉쇄되었고, 살카즈 군대가 거리를 지켰습니다. 배급표가 교과서를 대신했습니다.', k: 'big', fx: { h: -5, hl: -2, money: -Math.round(s.S.money * 0.15) } }; } },
  { id: 'londinium_1098_kid', nation: 'victoria', year: 1098, a: [0, 18], c: (s) => !!s.S.flags.londinium,
    run: (s) => ({ t: '봉쇄가 풀렸습니다. 4년이었습니다. 성문이 열린 날 ' + (momHere(s) ? '어머니는' : dadHere(s) ? '아버지는' : '집에서는') + ' ' + eul(cul(s).food) + ' 만들었고, 재료는 절반이 없었습니다.', k: 'big', fx: { h: 4 }, f: F('공작령 등기소 런디니움 봉쇄 해제 공고, 1098년') }) },
  { id: 'hillock_1098_kid', nation: 'tara', year: 1098, month: 1, a: [0, 18],
    run: (s) => {
      const r = s.rng.rnd();
      if (r < 0.1) return { t: '힐록에서 봉기가 있었습니다. 아버지 또래 남자들이 밤에 나갔고, 절반이 돌아오지 않았습니다.', k: 'big', fx: { h: -5, cap: { ties: -0.02 } }, f: F('성당 호적부 힐록 교구 기록, 1098년 1월') };
      return { t: '힐록에서 봉기가 있었다고 했습니다. 마을마다 밤에 불이 켜졌습니다.', k: 'big', fx: { h: -2, cap: { ties: 0.01 } }, f: F('성당 호적부 힐록 교구 기록, 1098년 1월') };
    } },
  { id: 'kjerag_1101_kid', nation: 'kjerag', year: 1101, month: 12, a: [0, 18],
    run: (s) => {
      const r = s.rng.rnd();
      if (r < 0.02) { s.die('catastrophe', '쉐라그 첫 재앙'); return; }
      if (r < 0.1) { if (!s.S.ori.on) infect(s, 'kjerag'); return { t: '쉐라그에 첫 재앙이 왔습니다. 눈사태와 함께였습니다. 집을 잃었고, 설산의 공기가 달라졌습니다.', k: 'big', fx: { hl: -6, h: -6, money: -Math.round(s.S.money * 0.4) } }; }
      return { t: '쉐라그에 첫 재앙이 왔습니다. 한 번도 온 적이 없다던 땅이었습니다. 산신의 사제는 사흘 동안 말이 없었습니다.', k: 'big', fx: { h: -4 } };
    } },
];

export default { events, decisions, big };

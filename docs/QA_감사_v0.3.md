# QA 감사 v0.3 — 사용자 피드백(D51)과 같은 종류의 결함 전수 조사

- **감사 기준 시각**: 2026-10-20 17:48~18:09 (KST). 대상은 커밋 `6c48866`(v0.3.0 + D50) 위의 **워킹트리**(W12 수정 패스가 D51·D53을 고치는 중인 상태, 56 파일 수정). 소스·데이터·콘텐츠는 읽기만 했다.
- **도구**: `node test/audit.js 200 3000`(동적: 21개국 × 200생 + 자연 출생 3,000생 = 7,200생, 예외 0, 385초) · `node test/lint-content.js`(정적: 이벤트 4,541·결정 293·대사건 59 + `data/*.json` 교차 검사). 원 출력 JSON은 스크래치에 두었고, 보고서의 수치는 전부 그 두 실행에서 나왔다.
- **표기**: 건수 = 7,200생에서 검출된 횟수(문장 1줄 = 1건). "원인"은 이벤트/결정 id 와 `파일:줄`. **W12 처리 중**으로 표시한 항목은 D51 이 이미 지목해 W12 세션이 손대고 있는 것(워킹트리에 `W12(D51-n)` 주석이 있음)이고, 이 보고서는 그 **밖의 같은 종류**를 찾는 것이 목적이다.

## 0. 한눈에

| 심각도 | 기준 | 항목 수 | 대표 |
|---|---|---|---|
| **A. 바로 보임** | 한 생에 거의 늘 나오거나, 나오면 바로 이상한 것 | 14 | 출생국 태그 누수(7,177건), 정주 가정에 이동도시 문장(2,833), `sub` 없는 결정(172종), `[object Object]`·`undefined` 노출, 격리구역 소문이 묵인 국가에(830), 신원 카드 "8대 공작령 · 공작"(5,957) |
| **B. 가끔** | 특정 조건(이주·사별·노년·특정 진로)에서 나오는 것 | 20 | 죽은 부모 재등장(1,405), 비감염자 결정화 사망(42), 사인·몰락 사유 불일치, minYears 무시 승급(141), 빚 복리 폭주(273생) |
| **C. 드묾·정보** | 수십 생에 한 번 또는 플레이어가 느끼기 어려운 것 | 9 | 캐논 인물 중복, 소속 변주 없는 소속 254개, 각주만 있고 숫자 없는 문장(엔진이 걸러 안 보임) |

**원인 묶음 상위 5** (§5 상세): ① `tagsOf` 가 **출생국**을 태그에 넣어 국가 태그 이벤트 641개가 이주 뒤에도 평생 따라옴 → ② 구 공통 콘텐츠의 **환경 전제**(이동도시·정책·부모 생존·로도스 비거주)가 태그·가드 없이 새어 나옴 → ③ **이주가 `S.home.type`을 안 바꿔** 정주 국가에 이동도시 문장 → ④ **사인·몰락 매핑이 상태를 안 봄**(비감염 결정화, A10 숙청→처형, A7 침식→붕괴체, 광산 사고·전쟁 무태그, 빚 6% 복리) → ⑤ **지역·환경 전용 진로가 가중만으로 열림**(12 진로 728회) + **결정 `sub`/단일 선택지/반복 문구**.

---

## 1. A. 바로 보임

| # | 증상 | 건수 (원인 수) | 원인 위치 | 제안 수정(한 줄) | W12 |
|---|---|---|---|---|---|
| A1 | **이주하면 출신국 이벤트가 평생 따라온다.** 컬럼비아에 사는 라이타니엔 출생자에게 "여황 축제", 사미에 사는 우르수스 출생자 아이에게 "옆집이 수용소로 끌려갔다", 염국 출생자가 타국에서 "호부에 거주 신고(염국 신참 이벤트)". 쌍 상위: 라이타니엔→컬럼비아 540, 라이타니엔→빅토리아 468, 염국→컬럼비아 405, 우르수스→사미 350, 우르수스→쉐라그 306 | 7,177 (223 이벤트; 파일별 leithanien.js 1,356·school.js 1,183·yan.js 868·durin.js 786·kazdel.js 724·kjerag.js 609) | `src/engine/content.js:55` — `tagsOf` 가 `S.born` 을 태그 집합에 넣음. 국가 태그 이벤트 654개 중 641개가 `track:`/`aff:` 없는 "생활·계절" 이벤트라 그대로 열린다 | 태그 집합에서 `S.born` 을 빼고 `born:<id>` 를 따로 넣는다. 출신을 의도한 이벤트(디아스포라·향수 류, `c` 에서 `S.cur` 를 보는 것 제외 약 10개)만 `born:` 으로 재태깅 | — |
| A2 | **정주 가정인데 이동도시 문장.** "겨울 난방비… 플레이트 관리소 공고"(카시미어 정주 821), 염국 사무직 진로가 전부 이동도시 전제(yan_off_st_plate 274·yan_off_mg_move 184·yan_office_first 119), 용문 농촌 거주자에게 "도시가 새 좌표로"(lgm_life_plate_move 106·lgm_life_typhoon 93), "림 빌리턴의 재앙은 … 플레이트 분리 시간" | 2,833 (55 이벤트; 카시미어 974·염국 890·용문 348·림 148·카즈델 140·컬럼비아 131) | `content/tracks/kazimierz.js:461`(태그 `[K]` 만), `yan.js:193·201·214`(YAN_OFFICE 단계 이벤트), `lungmen.js:360~364`, `kazdel.js:376`, `columbia.js:255`, `common.js:68·76`(COM_MESSENGER), `ursus.js:349` | 생활·계절 이벤트에 `nomadic` 태그(또는 `c: nomadic(s)`), 진로가 도시를 전제하면(YAN_OFFICE·COM_MESSENGER) `enterTrack` 때 주거를 이동도시로 바꾸거나 문장에서 "플레이트"를 빼기 | D51-2 는 구 공통 콘텐츠만 — **국가 팩 55개는 미처리** |
| A3 | **nomadic 0 국가(사미·에기르·두린·쉐라그)에서 이동도시 문장.** "플레이트 임대료가 올랐습니다. 지하층인데도"(사미 거주자) | 143 (12; 사미 79·에기르 34·두린 16·쉐라그 14) | `src/engine/migration.js` `migrateTo` 가 `S.home.type/deck` 을 바꾸지 않아 이동도시 출생자가 이주 뒤에도 `nomadic` 으로 남음 → `money_rent_plate`(adult_money.js:77)·`money_nomad_move`(:80)·`elder_nomad_leaves`(elder.js:200)의 `c: nomadic(s)` 가 참. COM_MESSENGER 본문(common.js:68·76)은 이동도시 전제 | `migrateTo` 에서 목적지 `nation.nomadic`·`urban` 으로 `home` 을 다시 롤하고 `initHousing` 호출(주거 `forced` 가 `nomadic` 키 없는 유형이면 type 을 못 바꿈) | D51-2 와 같은 증상, 다른 원인 |
| A4 | **묵인·방치 국가에서 격리구역·수용소.** "이웃이 격리구역으로 갔다는 소문"이 시라쿠사(301)·카즈델(227)·사미(72)·쉐라그(42)에서; 우르수스 출생 아이가 사미에서 "옆집이 수용소로"(A1 경로 92) | 1,010 (9) | `content/adult_infected.js:18` `ori_rumor_adult` — `c: oriExp>=2 && !known`, 정책을 안 봄. 용문 283 은 1098 이후 정책 `ignore` 전환 뒤 소문(경계) | `c` 에 `['quarantine','euthanasia','persecute'].includes(s.policy)` 추가, 또는 문장 3개를 정책별로 나눔 | D51-2 묶음(처리 중인 nomadic 태그와 같은 파일군) |
| A5 | **`[object Object]`** 가 기록에 그대로 찍힘(극동 사무직 야근 이벤트) | 67 (2) | `content/tracks/higashi.js:115` `hig_off_ka_overtime` 가 `body` 로 `{t, f}` 객체를 돌려주는데 도우미 `st()`(:31~34)는 문자열만 받아 `{ t: 객체 }` 로 감쌈. `:192` `hig_ent_co_handshake` 도 같음 | `st()` 에서 `typeof t === 'object'` 면 `{ ...t, k }` 로 펼치기 | — |
| A6 | **`undefined였습니다.`** 로 시작하는 문장 | 25 (1) | `content/tracks/victoria.js:454` `vi_life_harvest` 가 `cul(s).festivals[1]` 을 쓰는데 A1 누수로 빅토리아 출생자가 명절 1개뿐인 나라(카즈델)에 살면 `undefined` | 명절을 리터럴 '공작령 수확제'로 쓰거나 `fest(s, 1)` 사용 | A1 고치면 사라지지만 리터럴로도 고칠 것 |
| A7 | **조사 오류** "소운는 자장가를 …" | 810 (1) + 17 | `content/childhood.js:31` `night_cry` — `momName(s) + '는 자장가를'` 하드코딩(check-text 가 이름 뒤 `+ '는` 패턴을 못 잡는 형태: 삼항식 안) | `eun(momName(s)) + ' 자장가를'`. `check-text.js` 의 하드코딩 패턴에 `? '는 ` 형태 추가 | D30 범위인데 남은 것 |
| A8 | **선택지가 1개뿐인 결정.** 수용소·추방·처형 뒤 "판정 이후 / 받아들이기" 하나, 전시·유년학교 징집 "입대" 하나 | 208 (2) | `content/childhood.js:400` `oridiag`(175), `:420` `draft18`(33) | 선택지가 1개면 결정 대신 기록 한 줄로 흘리거나(`build` 가 `null` 반환 + `run`), 둘째 선택지("항의한다/숨어서 간다") 추가 | — |
| A9 | **`sub` 없는 선택지(D53c).** 계약 만료·귀향·이민·귀화·유학·주거(값만)·혼인 60여 종(받아들인다/보류/거절)·국가 결정(dur_brew_taste 633, urs_work_march 612, aeg_deep_witness 462, hig_ru_winter_hunt 438 …) | 43,828 (172 결정) | 엔진 `src/engine/choices.js:105·134·141·147·153·171·179`, `content/tracks/columbia.js:558` `marryDecision` + 각국 `W9E_OVERRIDES`·`marryDecision` 류, 국가 결정 다수 | 선택지마다 효과 한 줄(돈·역량·지위·위험)을 `sub` 에. 엔진 내장 7개는 한 곳(choices.js)에서, 혼인은 `marryDecision` 공통 틀에서 유형별 `dowry`·`req` 로 자동 생성 | D53c **처리 중**(track_promo 는 `sub` 있음) — 나머지 172 종 |
| A10 | **신원 카드 "소속 · 칭호"가 겹말.** "8대 공작령 · 공작"(579), "숲 사냥꾼 · 사냥꾼"(443), "치과의사 구역 · 치과의사"(410), "가내 노예 · 노예"(330), "귀족 사병 · 병"(311); 칭호에 `·` 가 든 것 "지푸 학원 · 백조학궁·지푸 학원", 상황 이름이 소속인 것 "오디션 줄 · 거리 연주자", "볼리바르 삼파 고용 · 독립" | 5,957 + 1,438 (62 + 22 조합) | `src/engine/track.js:20` `trackName` 은 `aff.name + ' · ' + stage.title` 을 그대로 붙임. 데이터 쪽: 단계 `title` 이 진로명과 같거나(`백조학궁·지푸 학원`) 소속명이 상황 묘사(`오디션 줄`, `볼리바르 삼파 고용`, `국외 이주`) | `trackName` 에서 칭호가 소속명에 포함되면 소속명만; 데이터 검증(`validate-tracks`)에 "단계 title 에 `·` 금지·진로명과 동일 금지" 추가; 소속 이름 22개 손질 | D51-9(이중 소속 나열)와 **같은 화면, 다른 원인** |
| A11 | **같은 문장이 한 생에 4번 이상.** "호부에서 세금 고지가 왔습니다…"(2,643생 = 37%), 물가(1,358), 플레이트 임대료(1,007), 격리구역 소문(1,003), 노년 겨울(878)·이웃(866), 두린 선술집(476) | 39,985 (1,666 이벤트; 4회 15,941생·5회 8,100·6회+ 15,944) | `content/adult_money.js:36·39·14`, `elder.js:150·195·166·174`, `adult_infected.js:18`, `tracks/durin.js:152·156` … `gap 3~6 + rep` 에 변주 2~3개 | 변주 적은 반복 이벤트는 `gap` 을 8 이상으로 올리거나 생애 2회 상한(`S.flags['ev_<id>_n']`), 또는 `chooseFeed` 에 "같은 문장 2회 이상이면 ×0.1" 규칙 | — |
| A12 | **연속 2년 같은 문장.** 승급 기회 결정의 "이번에는 나서지 않았습니다"(865)·"시험에 떨어졌습니다", 진로 선택의 "한 해를 더 기다렸습니다"(521) | 2,226 (128) | `src/engine/choices.js` `track_promo` apply 문구(W12 신설), `content/tracks/yan.js:660` `track_choose` 덮어쓰기 apply, `elder.js:143` 치매 연간 | 승급 기회에 `gap: 2` 또는 같은 단계 재도전 문구 변주; 대기 선택 문구 3종 롤 | D53b 처리 중(신설분) |
| A13 | **지역·환경 전용 진로가 다른 지역 출생자에게 후보로.** 남조 출생에 "북조 무가·군"(119), 염국 농촌 출생이 볼리바르에서 "진정한 볼리바르인"(89), 북조 출생에 "남조 학생"(26), 힐록 밖 출생에 "힐록 주민"(25); 도시 출생에 농민(VIC_RURAL 117·AEG_FARM 109·YAN_FARM 84 … 749) | 728 + 749 (12 + 14 진로) | `data/tracks/higashi.json`(HIG_NORTH_ARMY·RURAL·OFFICE·POLITICS·STUDENT: `region` 가중만), `bolivar.json`(BOL_TRUE·CITYHALL·FACTORY·COALITION·CASINO·SINGAS), `tara.json`(TAR_HILLOCK gates `[]`), 농민류 `{urban:false, weight:2}`; 엔진 `regionOffMul 0.25` 는 가중 | W12 가 시라쿠사 황야에 넣은 `{region}` 하드 게이트를 위 12 진로에 같이; `*_FARM/_RURAL` 은 `{urban:false}` 를 하드로(도시 출생은 전직·이주 경로만) | D51-10 **처리 중**(황야·switch 만) — 나머지 12 진로 |
| A14 | **빚이 복리로 폭주.** 중위소득 9,595 LMD 인 염국에서 −1,498,905 LMD, 273생(3.8%)이 −20×중위 아래 | 273 (22개국) | `src/engine/finance.js:215` `if (S.money < 0) net -= -S.money * 0.06` — 상한·파산 없음 | 빚 상한(−3×중위)에서 `expel`/`disgrace`/채무 노역 분기, 또는 이자 대상 원금 상한 | — |

## 2. B. 가끔

| # | 증상 | 건수 (원인 수) | 원인 위치 | 제안 수정 | W12 |
|---|---|---|---|---|---|
| B1 | **죽은 부모가 다시 나온다.** "그림을 벽에 붙였습니다. 어머니가 떼지 않았습니다"(159), "아버지가 앞날을 물었습니다"(93), "판정서를 … 아버지가 먼저 읽었고"(23), 노년 "어머니" 신앙·호칭 이벤트(276·80) | 967 + 438 (38 + 27) | `content/childhood.js:159·223·115·41·313`, `elder.js:166·86·94`, `school.js:35`, `tracks/sargon.js:161·179`, `higashi.js:96·125`, `rim.js:132`, `siracusa.js:301`, `ursus.js:339`, `sami.js:26` — `momHere/dadHere` 없이 '어머니/아버지' 리터럴 | 리터럴 대신 `momHere(s) ? '어머니' : …` 가드(childhood 는 도우미가 이미 있음). 감사 스크립트의 `deadMom/deadDad` 는 "떠난·기억·유품…" 회상 문장은 제외하므로 남은 건 대부분 현재형 | — |
| B2 | **자녀 없는데 자녀 문장.** "아이들이 상을 차렸습니다"(결혼 10년, 142), "텃밭과 자녀를 셈에 넣었습니다"(은퇴 27), "텃밭과 자녀의 송금이 전부"(65), 유언 결정의 자녀 문구(87) | 약 320 (실제 5; 나머지는 "손주 또래·귀족 자녀·고아들" 오탐) | `content/adult_family.js:57`, `elder.js:225·80·265·215` | `kids(s).length` 로 변주 가르기 | — |
| B3 | **비감염자가 "광석병 결정화"로 죽는다.** 광부·용병 몰락 사유 `crystallize` 가 감염 여부와 무관하게 `oripathy` 사망으로 | 42 | `src/engine/archetypes.js` `FALL_CAUSE_TO_DEATH.crystallize = 'oripathy'`; `data/tracks/common.json:430·438·446·549`(COM_MERC·COM_CC 등 `causes` 에 crystallize), `columbia.json:661~688`, A5 기본 causes | `fall()` 에서 `crystallize` 는 `S.ori.on` 일 때만 뽑고, 비감염이면 `accident` 로 치환(또는 사망 전 `infect`) | — |
| B4 | **A7(부족·사제) 침식 → "붕괴체 정신오염"** 이 붕괴체 없는 나라(타라 13세·18세)에서 | 2 | `archetypes.js` `erosion → 'collapsal'` 전역 매핑; `data/tracks/tara.json` TAR_NOMAD(A7) | 침식 사망 사인을 국가 `collapsal` 이 false 면 `arts_backlash` 나 `accident` 로 | — |
| B5 | **사인이 신분·진로와 안 맞음(나머지).** A10 신 귀족의 `purge` → "처형"(30; URS_NOBLE 등), 광산 사고가 비광부·5세 아동에게(19), 평시 conflict 1 국가에서 "전쟁"(15), 암살(12), 아츠 폭주가 아츠 낮은 비수련자에게(6), 정주 가정 "이동도시 사고"(3), 경기장 사망 비A2(3) | 164 (10 사인) | `data/causes.json:34` mine_accident `tags: []`(엔진 ×0.2 만), `:40` war `tags: []`, `nomadic_accident` ×0.1, `arts_backlash` 무태그; `URS_NOBLE` 가 A10 인데 causes purge·assassination(`ursus.json`) | `causes.json` 에 `mine_accident: ['pos:A5','job:miner…','miner_family']`, `war: ['conflict2','conflict3','war']`, `nomadic_accident: ['nomadic']`, `arts_backlash: ['cap:arts:high','cap:arts:top','pos:A7','pos:A12']` 류 태그 게이트(W12 가 암살에 한 `pos:` 방식); URS_NOBLE 원형을 A3 로 | D51-6 **처리 중**(암살만) — 같은 방식으로 6개 사인 더 |
| B6 | **minYears 를 무시한 승급.** 관료 시랑 5년<8, 중급 5년<6; 라이타니엔 헌병·음악가; 컬럼비아 라인 랩; 림 광부 | 141 (20 단계) | `src/engine/track.js` `promote()` 가 `minYears` 를 보지 않음(연말 `trackYear` 만 검사). 콘텐츠 `s.promote()` 33곳 중 `force` 없이 호출하는 곳(`yan.js:553·627`, `leithanien.js:301·325`, `columbia.js:645`, `ursus.js:519`)도 우회됨. LEI_QUAR(54)는 병 진행용 `force` 라 의도 | `promote()` 에 `!opts.force && age - stageSince < minYears → false` | — |
| B7 | **몰락 사유가 원형과 안 맞음(데이터).** 천사(A3)가 "부상", 메신저·물류(A10)가 "전사", 신 귀족(A10)이 "숙청", 생업(A11)이 벤데타·전사 류 | 89 (18 진로: URS_NOBLE 17·MIN_BORDER 16·IBE_INQ 11·MIN_TRADE 6·SIR_LIVING 5·BOL_PLANT 5·URS_UNIV·LAT_NOTARY·IBE_LIGHT 4 …) | 각 `data/tracks/<nation>.json` 단계 `fall.causes` | 원형 기본 causes 밖의 사유는 `validate-tracks` 경고로 올리고 데이터 손질(원형을 바꾸거나 사유를 바꾸기) | — |
| B8 | **몰락 사유 `infected` 가 선언에 없음·진단 없이 감염자 취급.** "건강 검진에서 결정이 나왔습니다 … 감염자 노동법 사업장"인데 `S.ori.known=false`(12) | 7 + 12 | `src/engine/track.js:380~384` `applyExit('infected')` 가 `infect()` 만 하고 `diagnose()` 를 안 함; KAZ_INFECTED·VIC_INFECTED·HIG_RURAL·HIG_TEMPLE 의 `infected` 사유가 `fall.causes`/`exits.fall` 에 없음 | `applyExit('infected')` 에서 `infect` 뒤 `diagnose(sim, 'work')` | — |
| B9 | **진로 없는데 직장 문장.** 컬럼비아 신참 "첫 월급의 셋 중 하나가 집세로"(118, 무직), 빅토리아 펍 "외상 장부"(228, 조건 없음), 극동 거품 대사건 `fired` | 약 400 (실제 4~5; 엔진 "해고" 로그·몰락 후일담은 오탐) | `content/tracks/columbia.js:296`(`newcomer` 만), `victoria.js:448`, `bigevents.js:219`, `victoria.js:517` | `c: !!s.S.track` 또는 문장 변주 | — |
| B10 | **로도스 본함 거주 중 거주국 생활 이벤트.** "동네 상회에 돈을 넣어 두었습니다"(141), 노년 지혜·호칭(117), A1 누수로 온 라이타니엔 무도회(26)·컬럼비아 보험(21) | 417 (32) | `content/adult_money.js:71`, `elder.js:174·86` 등 구 공통 이벤트에 `!rhodes` 없음; 국가 팩은 A1 | 구 공통 생활 이벤트에 `tags: ['!rhodes']`(또는 `c: s.S.cur !== 'rhodes'`), 로도스 생활은 `tracks/rhodes.js` 가 맡음 | — |
| B11 | **미혼에 "아내".** 우르수스 귀족 "아내가 울었고", 장교 "아내가 손님을 초대", 연대 이벤트 | 33 (4) + 20 오탐("쫓아내는") | `content/tracks/ursus.js:314·257·259`, `higashi.js:237` | `partner(s) ? '아내' : '동료'` 가드 | — |
| B12 | **60세+ 에 첫 월급·면접·신입.** 다시 일터로(60~62세 8), 컬럼비아 신참 첫 월급(3), 시라쿠사 비루포 고용(4) | 19 (6) | `adult_family.js:234`(`hum<62`), `columbia.js:296`, `siracusa.js:520`, `higashi.js:365` | 나이 상한 55 또는 문구 변주 | — |
| B13 | **살카즈 놀림이 관계 `neutral` 국가(쉐라그·사미)에서.** "뿔 때문에 가게에서 쫓겨났습니다" | 7 | `content/childhood.js:145` `teased_sarkaz` 태그 `['sarkaz','!kazdel']` 만 | `c: s.S.rel !== 'neutral' && s.S.rel !== 'favored'` (바로 위 `teased_outsider` 가 W12 에서 한 방식) | D51-3 묶음(outsider 는 처리됨, sarkaz 변형은 남음) |
| B14 | **바다 없는 나라의 "어부" 부모.** 우르수스·라이타니엔·타라·사미·림 등에서 "어부로 살지는 말라" | 33 | `data/jobs.json` `fisher`·`dock_worker` 에 `only` 없음 → `birth.js parentJob` 이 어디서나 뽑음 | `only: [해안국 목록]` 또는 `nations.json` 에 `coast` 플래그 + `parentJob` 필터 | — |
| B15 | **conscript none 인 타라에서 징집.** 전시 이웃 징집(30), 런디니움 방위군 징집 통지(3+6), 1108 대사건 | 48 | `content/bigevents.js:254` `war_year`, `tracks/victoria.js:81·383`, VIC_CONSCRIPT 가 상위국 진로로 타라에 열림(×0.2) | 타라는 1098 독립 전까지 빅토리아 징집이 미치는 게 캐논에 가까움 → `nations.json tara.conscript` 를 `draft`+`until 1098` 로 하거나 그대로 두고 문구만 "빅토리아 징집" | 판단 필요 |
| B16 | **같은 결정이 한 생에 3회+.** 승급 기회 ×8(gap 없음, 3,715생), 진로 선택 대기 ×4(1,582), 다시 일터로(107), 개척지 대출(52), 극동 겨울 사냥(38) | 7,074 (91) | `choices.js` `track_promo`(W12 신설, `once:false`, gap 없음), `track_choose` 대기 루프, `adult_family.js:234`(gap 3), `columbia.js:681` | 승급 기회에 `gap 2`·단계당 상한, 콘텐츠 반복 결정 gap 5+ | D53b 처리 중(승급 기회) |
| B17 | **역량 등급 변화 로그가 1년 늦게.** 관계(ties) 등급이 바뀐 해에 기록 없음 | 548 (ties 만) | `src/engine/sim.js` `endYear` 순서: `capGradeLog` 가 `familyYear/resYear`(이주·투옥의 `mulTies`) **앞**에 있어 그 해 변화는 다음 해에 기록 | `capGradeLog` 를 `rhodesYear` 뒤(스냅샷 직전)로 | D51-1 처리 중(로그 자체는 신설됨) |
| B18 | **진로 전직 후보가 원형 비인접(데이터).** `exits.switch` 93쌍: A4→A10 6, A12→A10 5, A9→A4 5, A4→A3 5, A11→A9 4 …; 두린 지상행→볼리바르 거리예술가(타국), 타락 산크타→시라쿠사 사제(의도) | 93 (정적) | `data/tracks/*.json` `exits.switch` | W12 가 `switchCandidates` 를 인접 원형으로 걸렀으므로 런타임 노출은 0(동적 감사 `switchNonAdjacent` 0건). 데이터는 `validate-tracks` 경고로만 | D51-10 처리됨(런타임) |
| B19 | **각주 없는 숫자 문장(D31 역방향).** "소금 한 되가 39 LMD", "1면은 공작, 2면도 공작", 승급 기회 "성공 확률 63%" | 7,864 (84) | `tracks/kazimierz.js:465`, `yan.js:473`, `victoria.js:458`, `lungmen.js:363`, `common.js:72`, `choices.js` track_promo | D31 은 "숫자가 있을 때만 각주"라 숫자에 각주가 **없는** 건 위반이 아님. 통계처럼 보이는 숫자(LMD·%·명)만 각주 붙이기 | 정보 |
| B20 | **엔진 재앙이 catFreq 1 국가(쉐라그·미노스·에기르·라테라노·시라쿠사)에서도.** 재앙 뒤처리 227건, 사망 32건 | 273 | `balance.js catBase[1] = 0.004` × 정주 1.5 → 연 0.6% | D51-2 "쉐라그는 재앙 거의 없음"을 따르려면 catFreq 1 을 0.001 이하로, 또는 쉐라그·라테라노에 `catFreq 0` 추가 | D51-2 판단 필요 |

## 3. C. 드묾·정보

| # | 내용 | 건수 | 위치 | 메모 |
|---|---|---|---|---|
| C1 | 캐논 인물 이름이 두 이벤트에(생당 3명 상한 초과는 **0**) | 24 | 대부분 `시즈`·`소라` 가 자녀·배우자 **이름**으로 생성된 것(이름 조합) | `canonSeen` 상한은 지켜짐. 이름 풀에서 캐논 인물명 제외 권장 |
| C2 | 반복 가능(gap) 이벤트에 캐논 인물 | 5 | `yan.js:486` 멀베리, `lungmen.js:387~391` 웨이 옌우·엠퍼러·텍사스 | 전부 `canonOk` 게이트 있음. D43 "1회성만"을 글자대로 지키려면 `gap` 제거 |
| C3 | 단계 역행 | 7 | COM_CC 재진입(`retire.to` 자기 참조 + `com_entry_*`) | 강등 아님, 재진입 |
| C4 | 소속 756개 중 콘텐츠가 한 번도 참조하지 않는 소속 | 254 | `data/affiliations.json`(YAN_RIVER_BOAT, LGM_FIRE_DEPT, HIG_RURAL_MINE …) | 결함 아님, 변주 공백 |
| C5 | 혼인 유형 핸들러 없음(엔진 기본 문구) / 콘텐츠가 참조하지 않는 주거 유형 | 5 / 79 | `kazdel: team·babel·barter`, `durin: vote·tavern`; housing 79 | 공백 |
| C6 | 각주가 있지만 숫자가 없어 엔진이 버리는 문장 | 696,137 (444 이벤트) | 구 공통 콘텐츠 거의 전부(`money_price_rise` 29,994 …) | 화면에는 안 보임. `f:` 를 지우면 코드만 가벼워짐 |
| C7 | `fx` 에 구 `sm/so` 키(1점 = 0.01z 로만 흡수, 로그·`sub` 에 표시 안 됨) | 170 이벤트 | childhood 39·school 48·elder 30·adult_family 23·bigevents 18·adult_infected 4·adult_money 3·death_texts 1 | D51-1 "증감이 안 보임"의 잔여. `fx.cap: {learn: +0.03}` 로 바꾸면 W12 표시 경로를 탐 |
| C8 | `S.job = null` 직접 대입(진로는 다음 연말 `how:'content'` 로 끝나고 이탈 서사·`trackHist` 없음) | 7 | `adult_infected.js:39` inf_fired, `childhood.js:420` draft18, `adult_family.js:234` adult_backtowork, `bigevents.js:193·203·219·241` | `s.leaveTrack('expel'|'infected'|'content')` 로 |
| C9 | 조사 검사 오탐 | — | "니콜라이"(=니콜라+이), "대장로"(=대장+로) | 어휘에 짧은 이름이 겹침. check-text 도 같은 한계 |

**정적 린트에서 0건**: 존재하지 않는 진로·단계·소속·국가·종족·정책·주거·혼인 id 태그(L2), `track:` 태그가 파일 나라와 다른 것(L3), 금지어·"연줄"·"카르니발레"·하드코딩 조사(L5), 연도 고유명 게이트 없음(L7), `st.sm/st.so` 직접 참조·`eth==='outsider'`·`S.rhodes=true`(L4 중 삭제 필드 — W12 가 끝낸 상태), 차별 문장 vs `relations.json` 쌍 불일치(D5). **성공 확률 표기 vs 실제**(12개 결정, n≥63)는 전부 ±3%p 안.

---

## 4. 검출기 메모(오탐·한계)

- 동적 감사는 정규식 기반이라 **문맥 오탐**이 있다. 보고서의 건수는 검출 수이고, 표의 "실제" 표기는 예시를 읽어 확인한 것. 오탐으로 확인해 뺀 것: `kje_rel_sarkaz/sam_rel_sarkaz`("뿔 때문에 묻는 사람이 없었습니다" — 차별 없음을 말하는 문장), `elder_wisdom`("손주 또래"), `kje_infected_nolabel`("쫓**아내**는"), `world_news`(먼 나라 이동도시 기사), `kje_no_shelter`(대피소가 없다는 문장), 몰락 후일담 `*_after`(진로 없음이 전제), 엔진 "해고" 로그.
- `catFreq1`·`policyNoCamp` 에서 엔진 자체 로그(재앙 롤·수용소 이송)는 데이터대로 동작한 것이라 B20 에만 묶었다.
- `titleAhead`(현재 단계보다 높은 칭호가 문장에)는 "전달자가 되었습니다"처럼 진로명 자체가 칭호인 경우(COM_MESSENGER 1,278)가 대부분이라 표에서 뺐다. 실제 의심은 `hig_yak_promo`(회장 11)·`min_tra_trans`(대상인 13) 정도.
- 결정 성공 확률 비교는 "결과 로그 kind 가 bad/loss 면 실패"로 본 근사치다.

## 5. 원인 묶음별 일괄 수정

1. **출생국 태그 누수(A1·A6·B10 일부·A4 일부)** — `content.js tagsOf` 의 `S.born` 을 `born:<id>` 로 분리(1줄) + 출신을 의도한 이벤트만 `born:` 재태깅. 영향 641 이벤트·7,177건. 고치면 "타국에서 고향 명절·고향 신참 이벤트" 전부 사라짐. 검증: `node test/audit.js` 의 `bornTagLeak` 0.
2. **구 공통 콘텐츠 환경 전제(A2 일부·A4·A7·B1·B2·B9·B10·B11·C6·C7·C8)** — `childhood/school/adult_*/elder/bigevents` 6 파일에 한 번의 "가드 패스": (a) 이동도시 문장 23개에 `nomadic` 태그 또는 `c: nomadic(s)`, (b) 정책 문장(`ori_rumor_adult` 등)에 `s.policy` 게이트, (c) '어머니/아버지/아내' 리터럴 → `momHere/dadHere/partner` 가드(약 65 이벤트), (d) 생활 이벤트에 `'!rhodes'`, (e) `fx.sm/so` 170개 → `fx.cap`, (f) `S.job = null` 7곳 → `leaveTrack`. 정적 린트 L1·L4 가 목록을 준다.
3. **이주 시 주거·환경 리셋(A3)** — `migration.js migrateTo` 끝에 목적지 `nomadic/urban` 으로 `S.home`·`S.urban` 재롤 + `initHousing`. `housing.json` 의 `forced` 유형에 `nomadic:false` 명시. 검증: `nomadic0` 0.
4. **사인·몰락 매핑에 상태 게이트(B3·B4·B5·B8·A14)** — `fall()`: `crystallize` 는 감염자만; `FALL_CAUSE_TO_DEATH.erosion` 은 `nation.collapsal` 조건부; `causes.json` 에 `mine_accident/war/nomadic_accident/arts_backlash` 태그(W12 `pos:` 방식); `applyExit('infected')` 에 `diagnose`; `finance.js` 빚 상한. 검증: `deathMismatch`·`moneyNegative` 0.
5. **지역·환경 전용 진로 하드 게이트(A13·D1)** — `data/tracks` 12 진로에 `{region: …}`(weight 없음), `COL_ORPHAN {status:'orphan'}`, `LGM_SLUM/SAM_TRIBE` 에 `urban`/`q` 게이트, `*_FARM` 의 `{urban:false}` 를 하드로. W12 의 `ruralRegions.wild` 와 같은 패턴. 검증: `candRegionOff`·`candRuralNameUrban` 0.
6. **결정 품질(A8·A9·A12·B16)** — 엔진 내장 7 결정과 `marryDecision` 공통 틀에 `sub` 생성기, 단일 선택지면 기록으로 전환, 승급 기회 gap/문구 변주. 검증: `noSub`·`singleChoice` 0.
7. **신원 카드 표기(A10)** — `trackName` 중복 제거 + `validate-tracks` 에 title 규칙 + 소속명 22개 손질.
8. **진로 헬퍼 규칙(B6)** — `promote()` minYears 검사.
9. **반복 문구(A11)** — `chooseFeed` 에 "같은 문장 2회 이상 ×0.1" 또는 변주 적은 반복 이벤트 60개 gap 상향. 검증: `repeat4` 의 상위 원인이 사라지는지.

## 6. 회귀 검사로 쓰는 법

```bash
node test/audit.js                 # 21개국 × 200 + 자연 3,000 생(약 6~7분). 심각 항목(NaN/undefined/[object/id 노출/빈 문장/sub NaN/단일 선택지/nomadic0/conscriptNone/seaborn·collapsal false/수치 범위/단계 역행) 1건 이상이면 exit 1
node test/audit.js 50 500          # 빠른 확인(약 1분)
node test/audit.js 200 3000 --nations kjerag,sami --seed qa2 --out out.json   # 국가 한정·시드·JSON 덤프
node test/lint-content.js          # 정적 린트 L1~L7 + 데이터 교차 검사 D1~D6 (수 초). --json path
```

- `audit.js` 출력은 항목마다 "건수 / 원인 수 → 상위 12 원인 `[파일:줄]` → 예시 3개 → 보조 집계(국가·쌍·k)" 순이고, 끝에 항목별 요약표와 통과/실패가 찍힌다. 수정 뒤에는 **해당 항목의 건수가 0 또는 오탐 잔여만 남는지**를 본다(이 보고서 §4 의 오탐 목록은 그대로 남는다).
- 새 종류의 결함을 추가하려면 `audit.js` 의 `NATION_RULES`(국가 데이터 모순)·`TEXT_RULES`(문장 패턴)·`analyzeLife()`(상태 교차) 중 한 곳에 규칙을 더하고, 심각 판정은 `SEVERE` 배열에 키를 넣는다. `lint-content.js` 는 `ENV_WORDS`(고유어 사전 80여 개)와 `checkTag()` 가 확장점.
- 시드가 같으면 결과가 같다(`--seed qa` 기본). W12 가 콘텐츠를 바꾸면 피드 추첨이 달라져 건수가 흔들리므로 **항목이 0 이 되는지**로 보고, 수치 비교는 같은 커밋 안에서만.

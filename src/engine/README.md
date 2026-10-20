# src/engine — 시뮬레이션 코어 (W2 → W7 v1 개편)

UI 없는 순수 ES 모듈. 브라우저(`<script type="module">` 또는 build 인라인)와 Node 양쪽에서 그대로 import 된다. fetch·fs·DOM 접근 없음.

v0.3(W7)에서 "직업 id + 소득 drift"를 **국가 전용 진로 상태 기계**로 바꾸고, 역량·타고남·신분, 이주 상태 기계, 혼인·주거 데이터, 종족 관계 매트릭스, 로도스 루트를 엔진에 넣었다. 설계는 `docs/설계_명세_v1.md`(§2~§10·§13·§14), 콘텐츠·UI 계약은 그 문서 끝 **"W7 메모 — 스키마 고정"**.

## 모듈 관계

```
data.js        prepareData(raw) ─ data/*.json 정규화 + v1: tracks(폴더 glob 결과)·affiliations·relations·marriage·housing·rhodes·canon_figures.
               진로가 없는 국가엔 생업 진로 GEN_<NATION>_LIVING/_FARM 을 합성. 로도스 본함용 가상 국가 'rhodes'(share 0) 추가. tracksFor(data, nation)
archetypes.js  ARCHETYPES A1~A12 기본값(promo cap·fall base·causes·exits·retireAge·oriMul·flags), FALL_CAUSE_TO_DEATH(§11.4)
rng.js         makeRng(seed) ─ mulberry32 + chance/pick/wpick/norm/poisson, invNorm/normCdf/odds
lifetable.js   lifeTable(stats, sex, lifeMul) ─ q[0..maxAge], e0
names.js       makeName() ─ names.json 규칙
caps.js        역량·타고남(§6): rollCaps, grade(z), fit, addCap, capYear(초점·학교·쇠퇴), applyLegacyFx(구 sm/so), looks_change, capProfile
relations.js   관계 매트릭스(§9): relOf(data, nation, race, year, {track, eth}), refreshRel, relMul/relIncomeMul/relCrimeMul, raceWeightsFor(exclude 제외)
track.js       진로 상태 기계(§3·§4·§5): canSeek, entryCandidates, rollEntry, choiceSet, enterTrack, leaveTrack, promote, demote, fall, applyExit,
               switchTrack, retireTrack, trackYear(연말), onDiagnosed, trackIncomeMul, trackName
migration.js   이주 상태 기계(§7): migrateTo(reason, to), destCandidates, papersFor, resYear(settling/settled/naturalized, 불법 발각, 순회형 itinerantAt), naturalize, returnHome, fleeCheck, migrationSummary
marriage.js    혼인(§8.1): marriageTypes, rollMarriageType, makeProspect, familyOpposes(§9), marry(dowry·poly), marriageP
housing.js     주거(§8.2): housingTypes, housingCandidates, forcedHousing, setHousing, initHousing, housingYear, homeChangeOpen
rhodes.js      로도스(§10): rhodesTrigger(9 via), rhodesClosed, placeRhodes(statusRules), joinRhodes, rhodesYear, operatorProfile, clinical, rhodesCard
choices.js     엔진 내장 결정: track_choose, track_switch, contract_end, looks_change, migrate_work, migrate_study, naturalize, return_home,
               marry_<type>, marry_second, home_change, rhodes_offer. installEngineDecisions(registry, data) — 콘텐츠가 같은 id 를 등록하면 그쪽 우선
save.js        migrateSave(S, data)(§14 v0.2→v1), healStats(S)
birth.js       newLife(data, rng, opts) → S  (… + cap/innate/status/res/rel 초기화, 관계 exclude 종족 제외)
content.js     createRegistry(), tagsOf(S, visit?), chooseFeed(sim, used, visit?), scheduledDecisions, dueBigEvents(방문국 대사건 포함)
sim.js         createSim({data, seed, hooks, content}) ─ 조립점. planYear / tick / fire / endYear, ctx getter·헬퍼
  ├ oripathy.js     감염·진행·진단·정책 분기·수용소(forced 진로 전환)·감옥 형기
  ├ catastrophe.js  재앙(피해 → 피난·구조 플래그)·분쟁(관계 등급 배율)·시테러·붕괴체
  ├ finance.js      소득(진로가 정함, drift 없음)·가계·보험료·보호비·배우자 소득. takeJob/retire/becomeHomemaker 는 구 콘텐츠 호환
  ├ death.js        사망확률·사인 가중·die()
  └ balance.js      밸런스 상수 한곳. v1 상수는 `track / cap / mig / marriage / housing / rel / rhodes` 블록(§13)
```

의존 방향은 위에서 아래로만(순환 import 는 함수 안에서만 쓰므로 안전). `sim.js` 가 유일한 조립 지점이고, 하위 모듈은 전부 `sim` 객체(ctx)를 인자로 받는다.

## ctx(= sim 객체)

콘텐츠 콜백과 하위 모듈이 받는 유일한 컨텍스트.

| 멤버 | 설명 |
|---|---|
| `S` | 상태 객체(아래). 저장은 이것만 JSON 직렬화 |
| `data`, `rng`, `content`, `HOOK` | 정규화 데이터, 시드 RNG, 콘텐츠 레지스트리, 훅 |
| `nation`, `race`, `job`, `policy`, `lt`, `year`, `med` | getter. `job` 은 jobs.json 항목 또는 **진로 기반 가짜 job**(id·name·oriMul·special·track·stage — 구 콘텐츠 호환). `policy` 는 진로의 `oriPolicyOverride` 우선 |
| `track`, `stage`, `aff`, `res`, `rel`, `rhodes` | **v1 getter**. 현재 진로 데이터(정규화된 JSON)·단계·소속·거주 상태·관계 등급·로도스 상태(없으면 null) |
| `log(text, kind, f?, fx?)` | 기록 한 줄 추가 → `HOOK.log` |
| `eff({hl, h, money, cap:{skill…}, standing, sm, so})` | 스탯 변화. `sm/so` 는 구 호환(1점 = 0.01z 로 learn/ties), `cap` 은 z 증감, `standing` 은 소속 지위 ± |
| `die(causeId, label?)`, `infect(how)` | 사망·감염 |
| `migrate(reason, to?, opts?)` | **이주 상태 기계**(§7). reason = work·study·marriage·flee·asylum·exile·contract·caravan·rhodes·return·deport(구 expel·insurance_default·voluntary 도 받음) |
| `promote(opts)`, `fall(cause?)`, `applyExit(value, cause)`, `switchTrack(id)`, `enterTrack(id, opts)`, `leaveTrack(how)`, `retireTrack(opts)` | **진로 헬퍼**. 콘텐츠가 승급·몰락·전직을 강제할 때 |
| `joinRhodes(via, opts)`, `setHousing(typeId, opts)` | 로도스 합류·주거 전환 |
| `newLife(opts)`, `start()`, `load(S)`, `heal()` | 출생 → 시작, 세이브 로드(`migrateSave` 포함, 실패 시 null), NaN 복구 |
| `tick(dtSec)`, `choose(k, text?)`, `autoChoice()`, `setFocus(k)`, `focusOptions()`, `runYear()` | 유지. **W12(D53a)**: `focusOptions(sim)` 은 진로가 있으면(성인·노년 단계) 진로 전용 초점 키 `tf:<원형|진로 id>:<id>` 를 뒤에 붙인다(`focus.js`) |
| `promoChance(sim)`(track.js export) | **W12(D53b)** `{eligible, p, opp, succ, next, cap}` — 올해 승급 대상 여부, 승급 확률 p, 기회가 뜰 확률 opp, 기회에서의 성공 확률 succ |

## 선택지 `sub`·기록 fx 표기 규약 (W12, D53c)

- **W14(QA A9)**: `sim.openDecision` 이 `build()` 결과의 `sub` 없는 선택지를 `fillSubs()` 로 채운다 — 순서는 `content/_subs.js` 표(결정 id → `{k: sub}`, apply 효과에서 생성·손질) → 혼인 결정(`marry_*`)은 유형 지참금·관계 → label 낱말 규칙(`fallbackSub`). 콘텐츠가 직접 쓴 `sub` 가 항상 우선. 승급 기회 `track_promo` 는 `gap 2`·같은 단계 최대 `balance.track.promoPerStage`(기본 3)회, 실패·대기 문구 3종 순환(`promoStyle` 로 데이터가 문구 원형을 고를 수 있다). 진로 선택 대기 문구 3종 순환.

- 모든 결정(엔진 내장·콘텐츠)의 선택지 `sub` 는 **그 선택이 바꾸는 것**을 적는다: 막대는 `건강 +/−`·`행복 +/−`, 돈은 `돈 +/−`, 역량·지위는 숫자 없이 방향만(`기량 ▲`·`관계 ▼`·`지위 ▲`), 성공 확률은 `성공 확률 n%`(`content/_util.js` 의 `pctText(p)` 로 — NaN 이면 `—`). 표시명은 `CAP_LABEL`(기량·학식·아츠·**관계**(D52, 내부 키 `ties`)·외모·운).
- 결정 결과·이벤트 결과의 `fx` 는 `sim.logResult` 가 `sim.log(t, k, f, fx)` 로 넘기므로 기록 줄에 `fxText(fx)`(건강·행복·돈·역량 ▲▼·지위 ▲▼)가 붙는다. 역량 등급이 바뀐 해에는 엔진이 `"기량이 보통에서 높음으로 올랐습니다."` 한 줄을 더 남긴다(`capGradeLog`). 신원 카드 역량 칸에는 지난 연말 스냅샷 대비 ▲▼(`capProfile(S).caps[].delta`).
- 승급은 **승급 기회 결정** `track_promo`(D53b): `trackYear` 가 `promoChance()` 의 `opp` 로 `S.flags.promoDue = {age, stage, succ, cap}` 를 두면 다음 해 planYear 가 연다. 선택지 `go`(성공 `succ` 롤 → `promote()`, 실패 시 지위 −`balance.track.promoFailStanding`) / `wait`. 자동 결정은 `succ ≥ promoAutoGo(0.4)` 면 나선다. 제목·본문·실패 문구는 원형별(`choices.js PROMO_*`). 국가 콘텐츠가 같은 id 를 `hoist()` 하면 그쪽이 우선(디스패처). 강제 진로·강제 단계(A5)는 결정 없이 종전처럼 롤한다.
- 진로 전용 초점(D53a): `focus.js ARCH_FOCUS`(원형 기본) 또는 진로 JSON `focus:[{id,name,fx:{cap,standing,hl,h,money},fall}]`. 연말 1단계에서 연중 비율만큼 `cap` z·`standing`·`money`(중위소득 배율)·막대를 적용하고 `fall` 은 그 해 몰락 확률 배율(`S.flags.tfFall`). 비율 ≥ 0.5 이고 지난해와 다른 초점이면 기록 한 줄.
- 진로 후보(`track_choose`·`track_switch`)의 `sub` 에는 `까닭: <가중 최대 요인>`(출신 계층·역량 등급·작위·출신 지역·종족·도시/농촌 출신·이 나라의 길·사건이 연 길…)이 붙는다(`entryCandidates()[].why`).
- 전직 후보(`switchCandidates`, D51-10): `exits.switch` ∩ (같은 원형 또는 `archetypes.js ARCH_ADJ` 인접 원형). `S.flags.switchOpen` 에 진로 id(또는 배열)를 두면 그 진로만("사건이 연 길").
- 외모 변경 `looks_change`(D51-5): 생애 1회(`S.flags.looksAsked`), 인간 척도 18~45세, 외모 z < −1 이거나 A2/A12 진로일 때만. 신원 카드 외모 특성 줄은 |looks| > `balance.cap.looksTrait`(1.2) 또는 A2/A12 진로일 때만(`capProfile(S, arch)`).

## 상태 객체 S (v1 §2 추가·치환분)

| 필드 | 설명 |
|---|---|
| `st.hl`, `st.h` | 건강·행복 막대. **`st.sm`·`st.so` 삭제**(저장 호환: 로드 시 learn/ties 로 변환) |
| `cap` | `{skill, learn, arts, ties}` 역량 z(−3~+3). 표시는 `grade(z)` 6등급(W16: 아주 낮음/낮음/보통/높음/뛰어남/탁월, `balance.cap.grades`) + 등급 안 진행 점 `gradeDots(z)` 0~3 |
| `dream` | W16(D56) 장래 희망 `{id, at}` 또는 null(`dream_choose`, 8~11세 1회). '모르겠다'는 `flags.dreamNone`. 달성 `flags.dreamDone`(나이), 접음 `flags.dreamGiven`(인간 척도 나이; 매년 해저드 롤 `dreamGiveUpP`, `balance.dream.giveUp`). 진입 후보 가중 ×`balance.dream.mul`, `track_choose` 의 닫힌 문(`closedDoors`)·신원 카드 조건 n/m(`dreamStatus`)·사망 요약 문장 |
| `innate` | `{looks, luck, trait}` 타고남. (명세의 `born` — 기존 `S.born` 이 출생 국가라 이름을 바꿨다) |
| `status` | `{noble: 'noble'|null, slave: bool, stigma: 'infected'|'exile'|'disgrace'|…}` |
| `track` | `{id, stage, since, stageSince, years, standing(0~100), aff, flags{via, contractEnd, contractDue…}}` 또는 null |
| `trackHist` | `[{id, from, to, stage, how, aff}]`. how = promo·demote·retire·expel·switch·death·prison·exile·infected·injured·disgrace·migrate·rhodes·content·homemaker·discharged·released·forced |
| `res` | `{nation, papers: native|legal|refugee|illegal|contract|agreement, since, phase: settling|settled|naturalized, itinerantAt}` |
| `rel` | 현재 거주국×종족 관계 등급 캐시 |
| `home` | `{type: nomadic|settled(구, 광석병·콘텐츠가 읽음), deck, housing: <유형 id>, since, owned, forced}` |
| `fam.marriage` | `{type, at, name, aff?, poly}` 또는 null. `fam.partners[]` 는 둘째 배우자 |
| `rhodes` | `{via, status: operator|contractor|patient, dept, since}` 또는 `false`. 콘텐츠가 `true` 로 두면 다음 planYear/endYear 에 정규화 |
| `job`, `income`, `pct` | 유지. `job` 은 진로가 정한다(진로의 `job` 필드 또는 진로 id) |
| `years[]` | 스냅샷에 `cap{…}`·`track`·`stage`·`standing` 추가(`sm/so` 삭제) |
| `v` | 세이브 버전 2 |

## 한 해의 흐름

```
planYear   normalizeRhodes → 대사건(거주국+방문국) + 결정 앞 2개(엔진 내장 결정이 앞, 우선순위: rhodes_offer > track_choose > contract_end > …) + 피드 2~3개(순회형이면 20% 는 방문국 태그)
tick       (유지)
endYear    1 초점 효과(hl/h) → 2 학교·복무 → trackYear(승급·몰락·standing·역량 성장·복무 기간·계약·은퇴) → 3 돈(진로 소득) → 4 테라 위험(감염·수용소·감옥·재앙·분쟁·시테러/붕괴체)
           → 5 capYear(초점·학교·쇠퇴)·statYear(ties 연동) → 6 familyYear(부모·사별·자녀·타국 배우자 이주)·housingYear(forced)·resYear(정착·불법·귀화·순회)·rhodesYear(환자→직원)
           → 7 스냅샷 → 8 사망 → 9 age++, planYear, HOOK.year
```

진로 **진입**은 연말이 아니라 planYear 의 내장 결정 `track_choose`(ok 에서 seekP 롤 → 후보 ≥2면 모달, 1이면 즉시 진입)가 한다. 혼인도 `marry_<type>` 결정이 롤·제안·수락을 맡는다.

## 데이터

`prepareData(raw)` 입력에 v1 키가 추가됐다(없으면 전부 기본값·빈 배열로 동작):

| raw 키 | 모양 |
|---|---|
| `tracks` | `data/tracks/*.json` 파일 객체의 **배열** `[{_meta, tracks:[…]}, …]`, 또는 `{파일명: 객체}`, 또는 파일 하나, 또는 진로 배열. 브라우저 빌드는 `window.__DATA__.tracks` 에 같은 모양으로 넣는다 |
| `affiliations` | `{affiliations:[…]}` |
| `relations` | `{grades, default, relMul?, sarkaz_default, pairs}` |
| `marriage`, `housing` | W8 모양 `{_meta, _common?, nations:{id:{types}}}` 또는 더미 모양 `{_default, <id>:{types}}` |
| `rhodes` | W8 모양(`entries[].pYear+trigger`, `ports.weights`, `closed[].when`, `statusRules.rules`, `diagnosis.templates`, `operatorStats`) 또는 더미 모양(`entries[].p`, `ports[]`, `closed[]`) |
| `canon_figures` | `{figures:[…]}` |

Node 에서는 `test/sim.js` 의 `loadData()` 가 `data/tracks/*.json` 을 glob 하고, 없으면 `data/_dummy/tracks.json` 으로, 나머지는 파일별로 `data/` 우선·`_dummy` 대체한다(`DATA=dummy` 면 전부 더미).

진로 JSON 정규화 결과(`data.trackById[id]`): §3.1 필드 + `A`(원형 기본값), `special`(canon && A10/A11 외), `forcedEntry`(자발 진입 불가), `noClasses`(switch·이벤트·로도스 배치로만), `job`(= income.job), 단계별 `forced/contract/oriMul/capStage`, `exits.fall` 에 원형 기본값과 `_meta.fallDefaultOutcome` 이 채워진다. `nation:"common"` 진로는 모든 국가에서 열린다.

## 태그 (tagsOf)

기존: 국가 id·상위 국가·`nation:<id>`·종족 id·`race:<id>`·`M/F`·`female/male`·`urban/rural`·`q1~q5`·`nomadic/settled`·`nomadic_under/upper`·`policy:<p>`·`ori1~3`·`cat1~3`·`conflict1~3`·`infected`·`known`·`ori_stage1~3`·`job:<id>`·`serving`·`prison:<k>`·`rhodes`·`retired`·`school`·`married`·`war`·`threat:<key>`·`trait:<key>`·`born_infected`·`miner_family`·`child_labor`·`working_child`·`parent:<job>`·`camp`·소수민족 플래그.

**v1 추가**: `track:<ID>` · `track:<ID>:<stageId>` · `aff:<ID>` · `archetype:A10`(공통 직장 이벤트 전용) · `arch:<A>` · `itinerant` · `newcomer`(정착 중) · `papers:<k>` · `naturalized` · `migrant` · `rel:<grade>` · `rhodes:<dept>` · `rhodes_<status>` · `noble` · `slave` · `stigma:<k>` · `home:<housing id>` · `homeowner` · `marriage:<type>` · `cap:<k>:<low|mid|high|top>` · `looks:high|low` · `visit:<nation>`(순회형 피드에서만, 국가 태그도 방문국으로 바뀐다).

**W12 추가**: `standing:high`(소속 지위 ≥ 60) · `pos:<A원형>`·`pos:noble`·`pos:high` — 사인 `causes.json` 의 "패밀리·관료·작위·지위 높음 중 하나" 같은 OR 게이트용(같은 접두 OR, D21). **구 `outsider` 태그·`S.eth='outsider'` 는 폐기**(D51-3): 종족 차별 표현은 `rel:<grade>` 로만.

**W14 변경(QA A1·B5)**: (1) **출생국은 태그 집합에 들어가지 않는다.** 국가 맨 태그(`ursus`)·`nation:<id>` 는 **거주국·상위국**만 뜻하고, 출신을 보려면 `born:<id>`(예: 라테라노 추방 공민 `['born:laterano', 'migrant']`). 이주한 사람에게 고향 명절·고향 신참 이벤트가 평생 따라오던 누수의 원인이었다. (2) **종족 맨 태그는 국가 id 와 같은 종족(`ursus`·`durin`·`aegir`)에는 붙지 않는다** — 그 종족은 `race:ursus` 처럼 접두로만. (3) 사인 게이트용 `pos:` 그룹 추가: `pos:mine`(광부·피트싱커 직업 / MINE·MINER·PIT 진로) · `pos:caster`(아츠 역량 high/top 또는 캐스터 경로) · `pos:war`(분쟁 2등급 이상·전시·복무) · `pos:prison` · `pos:infected`. `causes.json` 의 `mine_accident/arts_backlash/war/execution/nomadic_accident` 가 이 태그로 사인을 신분·상태에 묶는다.

## 테스트

```bash
node test/validate-tracks.js        # 진로·소속·혼인·주거·관계·로도스 데이터 검증(§3.1 규칙). --dummy 로 더미
node test/sim.js 1000               # 기본 (data/ 우선). 끝에 [v1] 집계: 진로 분포·계층별 유입 ±10%p, 이탈·몰락 사유, 로도스 합류율(전체/감염자), 이주 경험률, W16 장래 희망(설정·달성·접음)·닫힌 문/모달·등급 변화 기록/생·사유, 결혼 유형, 관계 등급별 소득, 주거
DATA=dummy node test/sim.js 1000    # 더미 데이터만(시라쿠사·우르수스·컬럼비아 진로 + 나머지 국가는 합성 생업)
NO_DUMMY_TRACKS=1 node test/sim.js  # content/_dummy_tracks.js 를 빼고
node test/calibrate.js 600          # 시뮬 기대수명 캐시 재생성(엔진·데이터 밸런스를 바꿨으면 다시)
node test/sim-nations.js 150        # W11: 국가마다 150명씩 강제 출생 — 유입 0 자발 진로·발화 0 결정·캐논 인물 상한·계층 유입 이탈을 국가별 같은 표본으로
node test/sim-w9a.js … sim-w9h.js   # 콘텐츠 세션별 하네스(국가 팩은 content/index.js 가 등록하므로 다시 use 하지 않는다)
```

완료 기준: 예외 0건, 수명 ±5(시뮬 e0 기준, n≥100), 감염률 등급 단조. §13 목표(로도스 1~3%·감염자 중 8~15%, 이주 10~20%)는 `balance.js` 의 `rhodes.pScale`·`rhodes.referralP`·`rhodes.treatmentScale`·`mig.*` 로 맞춘다(W11 에서 구 콘텐츠의 `S.rhodes = true` 직접 합류 경로는 전부 지웠다 — 합류는 엔진 `rhodes_offer` 만).

## W11 통합에서 바뀐 규칙(콘텐츠가 알아야 할 것)

- **같은 id 결정 디스패처** `content/_dispatch.js`: `marry_<type>`·`marry_second`·`home_change`·`track_choose` 처럼 엔진 내장 id 를 국가 파일이 덮어쓸 때는 `hoist(decisions, { id: ['거주국'…] })` 로 맡긴다. 거주국(`S.cur`)에 핸들러가 있으면 그쪽, 없으면 엔진 기본. 하위 지역(용문·타라)은 상위국으로 자동 위임하지 않으므로 목록에 적는다. `createRegistry` 는 같은 id 를 두 번 받으면 `console.warn` 하고 `R.dupes` 에 남긴다.
- **덮어쓴 내장 결정은 엔진 PRIORITY 자리를 지킨다**(`installEngineDecisions`). `planYear` 는 내장 결정을 먼저, 나머지 콘텐츠 결정은 섞어서 앞 2개를 큐에 넣는다(등록 순서가 우선순위가 아니다).
- **`fire`·`openDecision` 이 태그를 다시 검사한다.** 같은 해 앞선 이벤트로 진로가 끝났으면 `track:` 태그 이벤트·결정은 열리지 않는다. 순회형 피드는 큐 항목의 `visit` 으로 방문국 태그를 다시 만든다. 그래도 이벤트 `c` 는 `chooseFeed` 와 `fire` 에서 두 번 평가되므로 **순수 함수**여야 한다(플래그를 세우면 두 번째 평가에서 떨어진다). 결정 `tags` 는 전부 AND — "두 단계 중 하나"는 `track:<ID>` + `ok` 에서 단계 검사.
- **진로 `region`**: 하위 국가 id 면 그 나라에서만 열리고, 소지역 표시(`north`·`singas`·`hillock`…)면 모든 거주자에게 열리되 `S.sub.region` 이 다르면 ×`balance.track.regionOffMul`(데이터에 `{region, weight}` 게이트가 있으면 그쪽만). `S.sub.region` 은 출생 시 `balance.regions` 표로 롤한다(극동 north/south, 사르곤 acahualla/other, 볼리바르 4진영, 타라 hillock/other). 하위 지역 거주자 후보의 상위국 진로는 ×`parentNationMul`(0.2).
- **연도 게이트** `year: [y0, y1]` 배열형이 동작한다. A5 원형은 데이터에 `forced` 가 없으면 자발 진입 가능. `entry.ages[0] < 15` 인 진로(HIG_NINJA·VIC_KNIGHT)는 재학 중에도 그 나이부터 가중을 제안 확률(×`childTrackMul`)로 써 롤한다. `entry.trigger = { nations?, p? }` 가 있는 classes 없는 진로(COM_*)는 거주국이 목록에 있으면 가중 p 로 후보에 든다.
- `enterTrack(id, { noMigrate: true })` 는 타국 진로라도 거주국을 두고 진로만 바꾼다. RHO_* 진로로 옮기면 `S.rhodes.dept` 가 진로의 부서로 바뀐다. 진입 직후 `sim.requeueFeed()` 가 남은 해에 피드 하나를 더 뽑는다(첫 해 진로 이벤트).
- 출생 연도 하한은 `balance.birthYearMin[국가]`(카즈델·에기르 1070), 그 외 `BIRTH_YEARS[0]`. 관계 등급 `S.rel` 은 매년 다시 계산한다. 볼리바르 징집은 이미 A4 진로에 있으면 그것을 복무로 친다. A11 단계 소득 배율 0 은 소득 0(NaN 아님). 혼인 `infected_only` 는 `req.infected:true` 로 판정한다.

## 가사 전담·배우자 소득 (D35, W6) / 각주 규칙 (D31) / 광산촌·아동 노동

이전과 같다. 구 `adult_work.js`·`adult_nations.js` 는 W11 에서 폐기했고(`takeJob` 호환 경로는 엔진에 남아 있으나 콘텐츠가 쓰지 않는다), 공용 도우미는 `content/_adult_util.js` 로 옮겼다. 차이: `becomeHomemaker` 는 진로를 떠나고(`how:'homemaker'`), 아동 노동은 A11(및 합성 생업)·A5 진로 진입으로 표현된다(`S.flags.childLabor`).

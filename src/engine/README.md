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
| `tick(dtSec)`, `choose(k, text?)`, `autoChoice()`, `setFocus(k)`, `focusOptions()`, `runYear()` | 유지 |

## 상태 객체 S (v1 §2 추가·치환분)

| 필드 | 설명 |
|---|---|
| `st.hl`, `st.h` | 건강·행복 막대. **`st.sm`·`st.so` 삭제**(저장 호환: 로드 시 learn/ties 로 변환) |
| `cap` | `{skill, learn, arts, ties}` 역량 z(−3~+3). 표시는 `grade(z)` 4등급(낮음/보통/높음/뛰어남) |
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

## 테스트

```bash
node test/validate-tracks.js        # 진로·소속·혼인·주거·관계·로도스 데이터 검증(§3.1 규칙). --dummy 로 더미
node test/sim.js 1000               # 기본 (data/ 우선). 끝에 [v1] 집계: 진로 분포·계층별 유입 ±10%p, 이탈·몰락 사유, 로도스 합류율(전체/감염자), 이주 경험률·사유, 결혼 유형, 관계 등급별 소득, 주거
DATA=dummy node test/sim.js 1000    # 더미 데이터만(시라쿠사·우르수스·컬럼비아 진로 + 나머지 국가는 합성 생업)
NO_DUMMY_TRACKS=1 node test/sim.js  # content/_dummy_tracks.js 를 빼고
node test/calibrate.js 600          # 시뮬 기대수명 캐시 재생성(엔진·데이터 밸런스를 바꿨으면 다시)
```

완료 기준: 예외 0건, 수명 ±5(시뮬 e0 기준, n≥100), 감염률 등급 단조. §13 목표(로도스 1~3%·감염자 중 8~15%, 이주 10~20%)는 `balance.js` 의 `rhodes.pScale`·`mig.*` 로 맞춘다 — 단, 구 콘텐츠(`adult_infected.js` 등)가 직접 `S.rhodes = true` 로 합류시키는 경로가 남아 있어 W11 정리 전까지는 로도스 합류율이 목표보다 높게 나온다.

## 가사 전담·배우자 소득 (D35, W6) / 각주 규칙 (D31) / 광산촌·아동 노동

이전과 같다. 차이: `becomeHomemaker` 는 진로를 떠나고(`how:'homemaker'`), 아동 노동은 A11(및 합성 생업)·A5 진로 진입으로 표현된다(`S.flags.childLabor`).

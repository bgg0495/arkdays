# src/engine — 시뮬레이션 코어 (W2)

UI 없는 순수 ES 모듈. 브라우저(`<script type="module">` 또는 build 인라인)와 Node 양쪽에서 그대로 import 된다. fetch·fs·DOM 접근 없음.

## 모듈 관계

```
data.js       prepareData(raw) ─ W1 의 data/*.json 을 정규화(단위 통일, 상속, 정책 변형 평가)
rng.js        makeRng(seed) ─ mulberry32 + chance/pick/wpick/norm/poisson, invNorm/normCdf/odds
lifetable.js  lifeTable(stats, sex, lifeMul) ─ q[0..maxAge], e0 (Gompertz-Makeham 이분법, 종족 lifeMul 연령축 늘림)
names.js      makeName() ─ names.json 규칙(gf/fg/pat/mono, 부칭, 여성형 성, 귀족 접두, 이중 성)
birth.js      newLife(data, rng, opts) → S  (국가 → 하위 지역 → 성별 → 종족 → q → 거주 → 이름 → 부모·형제 → 출생 감염 → 아츠 → 스탯)
content.js    createRegistry() ─ 이벤트/결정/대사건 스키마 검증, tagsOf(S), chooseFeed, scheduledDecisions, dueBigEvents
sim.js        createSim({data, seed, hooks, content}) ─ planYear / tick / fire / endYear, 초점, 결정 pending, 스탯 수렴, 가족
  ├ oripathy.js     감염·진행·진단·정책 분기·수용소          (§5.1)
  ├ catastrophe.js  재앙·분쟁·시테러·붕괴체                   (§5.2, §5.4)
  ├ finance.js      소득(지니→로그정규)·취업·은퇴·보험료·보호비 (§5.5)
  ├ death.js        사망확률·사인 가중·die()                 (원작 §9 구조)
  └ balance.js      밸런스 상수 한곳(명세 초안값은 주석)
```

의존 방향은 위에서 아래로만. `sim.js` 가 유일한 조립 지점이고, 하위 모듈은 전부 `sim` 객체(ctx)를 인자로 받는다.

## ctx(= sim 객체)

콘텐츠 콜백과 하위 모듈이 받는 유일한 컨텍스트. 원작의 전역 `S` 대신 이것을 쓴다.

| 멤버 | 설명 |
|---|---|
| `S` | 상태 객체(§4). 저장은 이것만 JSON 직렬화하면 된다 |
| `data`, `rng`, `content`, `HOOK` | 정규화 데이터, 시드 RNG, 콘텐츠 레지스트리, 훅 |
| `nation`, `race`, `job`, `policy`, `lt`, `year`, `med` | getter. 현재 국가·종족·직업·해석된 감염자 정책·생명표·연도·중위소득(LMD) |
| `log(text, kind, f?, fx?)` | 기록 한 줄 추가 → `HOOK.log` |
| `eff({hl,h,sm,so,money})` | 스탯 변화 적용(0~100 clamp) → `HOOK.change` |
| `die(causeId, label?)` | 사망 처리. causeId 가 causes.json 에 있으면 그 label 사용 |
| `migrate(reason)` | 타국 이주(추방·보험 미납). 박해·추방·안락사 국가는 피함 |
| `newLife(opts)`, `start()` | 출생 → 인생 시작(`phase: 'birth' → 'life'`, 첫 planYear) |
| `tick(dtSec)` | 실시간 초 단위 진행. 결정이 열리면 그 시점에서 멈춤 |
| `choose(k, text?)`, `autoChoice()` | pending 결정 처리 |
| `setFocus(k)`, `focusOptions()` | 올해의 초점 |
| `runYear()` | 테스트용: autoChoice 로 결정을 넘기며 한 해 끝까지 |

## HOOK 인터페이스

`createSim({ hooks })` 로 넘긴다. 없는 항목은 no-op.

| 훅 | 호출 시점 | 인자 |
|---|---|---|
| `log(entry, sim)` | 기록이 추가될 때 | `{a:나이, y:연도, t:문구, k:종류, f?:각주, fx?:효과}` |
| `change(S, sim)` | 스탯·돈·상태가 바뀐 뒤(렌더 힌트) | |
| `decision(pending, sim)` | 결정 모달을 열어야 할 때. `S.pending = {id, p, view}` | `view = {title, body, fact?, choices:[{k,label,sub?,auto?}], input?}` |
| `death(S, sim)` | 사망 직후 (`S.deathAt` 채워짐) | |
| `year(S, sim)` | 연말 정산 후 다음 해 큐를 짠 뒤(저장 타이밍) | |

UI(W3)는 `tick` 을 rAF 에서 부르고, `decision` 훅에서 모달을 열어 `choose()` 를 호출하면 된다. `S.paused`/`S.speed`/`S.yearSec` 는 엔진이 읽기만 한다.

## 한 해의 흐름

```
planYear   큐 = 대사건(연도+나이 게이트) + 결정 앞 2개(at 0.3/0.6) + 피드 이벤트 2~3개(at 0.08~0.94)
tick       t += dt·speed/yearSec, at ≤ t 인 큐 항목 fire. 결정이 열리면 return (시간 정지)
endYear    1 초점 효과(시간 비율 focusW) → 2 학교·취업·복무 → 3 돈 → 4 테라 위험(광석병·수용소·재앙·분쟁·시테러/붕괴체)
           → 5 스탯 수렴(hl/so/h 목표값) → 6 가족(부모·배우자·자녀) → 7 years 스냅샷 → 8 사망 판정 → 9 age++, planYear, HOOK.year
```

## 콘텐츠 스키마(§3.5, ctx 인자 방식)

```js
// 이벤트
{ id, a:[min,max], tags?:['yan','infected','!rhodes'], c?:(ctx)=>bool, w?:number|(ctx)=>number, gap?:년, rep?:bool,
  run:(ctx)=>string | {t, k:'ev'|'bad'|'big'|'warm'|'loss'|'note', f?:각주, fx?:{hl,h,sm,so,money}} }
// 결정 — 매년 planYear 가 ok() 를 평가해 스케줄. once(기본 true), gap, at(0~1) 지원
{ id, tags?, ok?:(ctx,p)=>bool, build:(ctx,p)=>{title, body, fact?, choices:[{k,label,sub?,auto?}], input?}|null,
  apply:(ctx,k,p,text)=>string|{t,k,f,fx}|false }
// 대사건
{ id, nation?, year, month?, a?:[min,max], once?, tags?, c?, run:(ctx)=>… }
```

태그는 `tagsOf(sim)` 이 만드는 집합과 대조한다: 국가 id·상위 국가·`nation:<id>`·종족 id·`race:<id>`·`M/F`·`female/male`·`urban/rural`·`q1~q5`·`nomadic/settled`·`nomadic_under/upper`·`policy:<p>`·`ori1~3`·`cat1~3`·`conflict1~3`·`infected`·`known`·`ori_stage1~3`·`job:<id>`·`serving`·`prison:<k>`·`rhodes`·`retired`·`school`·`married`·`war`·`threat:<key>`·`trait:<key>`·소수민족 플래그(`outsider`, `gaul`…). 이벤트 태그는 전부 AND, `!` 는 부정. 사인 태그는 같은 접두(threat:, nation:)끼리 OR.

레지스트리: `createRegistry().use({events, decisions, big})`. 더미 콘텐츠는 `content/dummy.js`.

## 데이터

`prepareData(raw)` 는 W1 의 `data/*.json` 형식을 기준으로 한다(`data/_dummy/*.json` 은 같은 형식의 최소 더미). Node 에서는 `test/sim.js` 의 `loadData()` 가 파일별로 `data/` 우선, 없으면 `_dummy` 로 대체한다. 브라우저 빌드(W5)는 JSON 을 인라인해서 같은 `prepareData` 에 넘기면 된다.

엔진 내부 단위: `u5/im/urb/gini` 0~1, 직업 `lo/hi` 0~1, 소득·돈은 **LMD**(PPP$ × 10) 정수.

## 시뮬 기대수명 캐시 (D19)

출생 신고서의 "기대수명"은 1950 모델 생명표 e0 가 아니라 **테라 위험까지 돌린 시뮬 기대수명**이다. `node test/calibrate.js` 가 국가·성별마다 수백 명을 돌려 `k = 평균 사망 나이 / 생명표 e0` 를 `data/terra_e0.json` 에 쓰고, `prepareData()` 가 `nation.terra` 로 읽어 `birth.js` 가 `S.e0 = 생명표 e0 × k` 로 쓴다(종족 lifeMul 이 섞여도 비율이라 그대로 적용). `S.e0Model` 에 모델값을 따로 두므로 "테라가 아니었다면 N세" 비교 문구가 가능하다. `yearSec` 은 D22 대로 국가 인간 척도 시뮬 e0 로 계산한다. **`balance.js` 나 데이터를 바꾸면 calibrate 를 다시 돌린다.** 캐시가 없으면 k=1(모델값)로 동작한다.

## 가사 전담·배우자 소득 (D35, W6)

- 배우자가 생기면 `initPartner()` 가 `partner.pct`(소득 백분위)·`partner.works`(여성 배우자는 `nation.homemakerP` 확률로 가사 전담)를 정하고, `financeYear` 가 `partner.inc` 를 매년 계산해 **가계 소득 `hh = S.income + partner.inc`** 로 생활비·저축을 센다(`S.flags.hhInc`, `S.flags.hhPct`).
- 본인이 가사를 맡으면 `S.job = 'homemaker'`(jobs.json 의 가사 전담, sector none), 소득 0, `jobYear` 는 새 직업을 주지 않는다. 콘텐츠 결정 `adult_homemaker`(결혼 1~3년차·첫 아이) / `adult_backtowork`(사별·이혼·배우자 실직) 가 켜고 끈다. 플래그 `homemakerAt / homemakerYears / jobBeforeHome / backToWork / partnerLostJob`.
- `jobEligible` 은 `sector: 'none'` 직업을 제안하지 않는다.

## 각주 규칙 (D31, W6)

`sim.log()` 와 `openDecision()` 이 `keepFootnote(text, f)` 로 거른다: **문장에 숫자가 있을 때만** 각주를 남기고, "기록된 바 없음"·관할·추정 류는 항상 버린다. 콘텐츠는 각주를 계속 써도 되고, 실제 표시 비율은 `node test/check-text.js` 가 센다(목표 10~20%).

## 광산촌·아동 노동 (우르수스류 장면용)

- 부모 직업 `oriMul ≥ 3`(광부 등)이면 부모 유병률 ×2 → 출생 감염이 흔하다. 양쪽 감염이면 신생아 결정 밀도가 높게 시작하고, 출생 감염아는 5세 미만 사망 승수 ×2.5 (`balance.js`).
- 학교에 못 간 q1 은 9세, q2 는 12세부터 edu 0 직업을 잡는다(임금 ×0.5). `S.flags.childLabor = 시작 나이`.
- 2기 진단은 나이를 가리지 않으므로 박해 국가의 감염아는 어려서 수용소(`camp`)에 갈 수 있다.
- 콘텐츠 태그: `born_infected`, `miner_family`, `child_labor`, `working_child`, `camp`, `parent:<job id>`.

## 테스트

```bash
node test/check-text.js 300      # 조사 오류·D25 금지 문구·각주 비율(W6)
node test/sim.js 1000            # 기본 (data/ 우선, data/terra_e0.json 있으면 시뮬 e0 기준 검증)
DATA=dummy node test/sim.js 1000 # 더미 데이터만
TERRA=0 node test/sim.js 1000    # 테라 위험 끄고 생명표 보정만 확인
node test/calibrate.js 600       # 시뮬 기대수명 캐시 재생성(약 1분)
```

출력: 국가별 n·e0·평균수명·Δ·장수종족 평균·감염률·출생 감염·진단·5세 전 사망·로도스·이주·평균 자산, 감염 경로, 사인 분포, 국가별 상위 사인·정책 분기 결과, 검증 줄(예외 0 / Δ ±5 / oriExp 등급별 감염률 단조). 완료 기준 미달이면 exit code 1.

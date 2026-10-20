# data/ — 게임 데이터 테이블

작성 2026-10-19 (W1 데이터 세션). 스키마 원본은 `docs/설계_명세.md` §3, 결정은 `docs/결정사항.md`. 검증은 `node test/validate-data.js`.

모든 파일은 `_meta` 객체로 시작한다. `_meta.note`에 그 파일의 추정 범위를 적어 두었다.

## 추정값 표시 원칙

캐논(공식 설정)에 숫자가 있는 항목은 거의 없다(보고서 A-5: "국가별 종족 비율과 종족 수명 수치는 어디에도 없다"). 그래서:

- **`estimated: true`** — 공개 통계에 없어 직접 추정한 통계값(`stats1950.json`의 셀 단위, `custom` 국가 전체).
- **`canon: false`** — 캐논에 없는 설정을 지어낸 것(극동 남북 정책 D13, 카즈델·두린 통계).
- **`_meta.estimatedFields`** — 파일 안에서 통째로 추정인 필드 목록(`nations.json`).
- `note` 필드는 어디서 어떻게 추정했는지의 메모.
- 설계 명세에 숫자가 명시된 값(살카즈 lifeMul 2.5, 오리지늄 광부 oriMul 8 등)은 `note`에 "§3.x 명시값"으로 적어 구분했다. 그 외 숫자는 전부 추정이다.

## nations.json — 국가·지역 21곳

`nations[]` 각 항목:

| 필드 | 타입 | 설명 |
|---|---|---|
| `id` | string | `yan`, `lungmen`, … |
| `name` | string | 한국 정식 표기(D7) |
| `parent` | string? | 하위 지역의 상위 국가(용문→`yan`, 타라→`victoria`) |
| `share` | number | 출생 비중 %. 합 99.8 (D9 확정표. 로도스 0.05는 출생지가 아니라 제외) |
| `model` | string[] | 1950 통계를 빌릴 ISO3. 여러 개면 엔진이 `stats1950.countries[iso].pop`으로 인구 가중 평균. 빈 배열이면 `custom` 키 |
| `custom` | string? | `stats1950.custom`의 키(`KAZDEL`, `DURIN`) |
| `statMul` | object | `{le, u5, ppp, gini, urb}` 배율. 모델 통계에 곱한다 |
| `policy` | enum | 감염자 정책 `persecute/quarantine/euthanasia/neglect/insurance/expel/ignore/treat` |
| `policyVariants` | array? | `{when, policy, note}`. enum 하나로 못 적는 분할 정책. `when`은 엔진이 해석할 조건 문자열(`year>=1098`, `region=='north'`, `urban==false`, `amir=='mining'`) |
| `oriExp`, `catFreq`, `conflict` | 1~3 | 광석병 노출 / 재앙 빈도 / 분쟁 수준 |
| `nomadic` | 0~1 | 도시 거주자 중 이동도시 비율 |
| `seaborn`, `collapsal` | bool | 시테러 / 붕괴체 노출 |
| `conscript` | enum | `none/draft/volunteer/mandatory` (+ `conscriptNote`) |
| `conscriptSex` | enum | `M`(기본, 남성만 징집) / `all`(볼리바르). `draft18` 결정과 엔진 `mandatory` 처리가 본다(D33, W6) |
| `homemakerP` | 0~1 | 기혼 여성이 결혼·첫 아이 때 가사 전담을 택할 기본 확률(남성은 ×0.1). 배우자 생성 시 배우자의 취업 여부에도 같은 값(D35, W6) |
| `races` | object | 종족 가중치(합 ≈ 100). 키는 `races.json`의 id. rare 종족은 0.5 이하 |
| `jobs` | string[] | 이 국가에서 추가로 제안되는 특수 직업 id(`jobs.json`) |
| `threats` | string[] | 고유 위협 태그. 이벤트 풀 키이자 `causes.json`의 `threat:` 태그 대상 |
| `nameLang` | string | `names.json`의 `langs` 키 |
| `canon` | bool | 정책 등이 캐논인지 |
| `blurb` | string | 출생 신고서 한 줄 소개(담백체). D25: 메타·추정 표시 금지(검증기가 막음) |
| `statOrg` | string | 세계관 안의 행정·기록 기관명(염국 "흠천감", 우르수스 "제국 내무성", 컬럼비아 "보험협회" …). 출생 신고서·각주 `(statOrg 집계)` 에 치환(W4a, D25) |
| `culture` | object | `{festivals[1~2], greet(인사말), address(일반 호칭), elder(어른 호칭), food(대표 음식), ruler(통치자), rulerTitle(통치자 호칭), drink}`. 콘텐츠가 명절·호칭·음식 문장에 치환(D26). 하위 지역(용문·타라)도 자기 값을 가진다 |

`ethnicFlags`: 가울 유민(`gaul`, 빅토리아 6%, 이름은 `fr` 풀), 타라 유목민(`nomad`), 이방인(`outsider`, 엔진 자동 판정).

**추정 범위**: `statMul`·등급·`nomadic`·`races` 가중치 전부. 등급은 보고서 C절의 상·중·하를 1~3으로 옮긴 것. `statMul`은 "라테라노는 작고 부유하다", "사미는 가난하고 춥다" 식의 정성 서술을 배율로 바꾼 것이므로 플레이테스트 후 조정 대상.

## stats1950.json — 현실 1950년 기준 통계

`countries[ISO3]` 24개국 + `custom.{KAZDEL, DURIN}`. 각 지표는 `{value, source, estimated?, originalYear?, note?}` 셀.

| 키 | 단위 | 주 출처 |
|---|---|---|
| `pop` | 명 | UN WPP 2024 |
| `le`, `leM`, `leF` | 년(출생 시 기대수명, 전체/남/여) | UN WPP 2024 |
| `u5` | 5세 미만 사망 확률(0~1) | UN WPP 2024 |
| `imr` | 영아 사망 확률(0~1) | UN IGME/Gapminder 장기 시계열. 일부 `originalYear`(1950 대신 가장 가까운 연도) |
| `ppp` | 1인당 GDP, 2011 국제달러 | Maddison Project Database 2023 |
| `gini` | 0~1 | **전부 추정**(1950 가구조사 지니는 거의 없음) |
| `urb` | 도시 인구 % | UN World Urbanization Prospects 2018 |
| `tfr` | 합계출산율 | UN WPP 2024 |

전부 Our World in Data grapher CSV 경유로 2026-10-19에 받았다.

**추정 셀**: 홍콩(HKG)의 `u5, imr, ppp, urb, tfr`(OWID에 1950 행 없음), 중국·러시아·이란·사우디 `imr`(U5MR×0.70 근사), 독일 `imr`(서독 등록치), 전 국가 `gini`. 카즈델·두린은 명세 §3.1 주석(카즈델 le 0.8배·ppp 0.3배, 두린 le 1.1배·안전)에 맞춰 통째로 추정.

주의: `statMul.le`는 `custom` 국가에도 적용된다. 카즈델의 `custom.le=46`은 세계 평균 기준치이고 `statMul.le=0.8`을 곱해 약 37이 된다(살카즈 `lifeMul 2.5`는 그 뒤에 종족 배율로 다시 곱힘).

## races.json — 종족 26종 (기본 24 + rare 2)

| 필드 | 설명 |
|---|---|
| `id`, `name`, `group` | `ancients/elders/teekaz/other` |
| `rare` | true면 극희귀(용·드라코). 국가 가중치 0.5 이하 |
| `lifeMul` | 수명 배율(D11). 기본 1.0 |
| `oriVuln` | `{infect, progress}` 감염 확률·진행 속도 배율 |
| `artsApt` | 아츠 적성 평균 보정(z) |
| `stigma` | 공통 차별 강도 0~3 |
| `traits` | `_meta.traitKeys`에 정의된 플래그 |
| `home` | 중심 국가 id. (W12: 구 `eth:'outsider'` 자동 부여는 폐기 — 차별은 relations.json 등급만) |

명세 §3.2 명시값: 살카즈 2.5/2.0·1.5/+0.7/3, 엘프 3.0/진행 10배/−0.5, 두린 1.3, 에기르 1.5/0.5/2, 용·드라코 2.0, 카프리니 +0.5, 오니·리프로바 stigma 1. 나머지는 추정(사브라 1.2, 아슬란·오니·페트람 1.1 등 소폭).

## jobs.json — 직업 95종 (공통 37 + 특수 58)

| 필드 | 설명 |
|---|---|
| `sector` | `agr/ind/ser/none` |
| `edu` | 요구 교육 0~5 |
| `lo`, `hi` | 소득 백분위 범위 |
| `urban` | −1 농촌 / 0 무관 / 1 도시 |
| `only` | 국가 id 배열. 없으면 전 국가 |
| `oriMul` | 광석병 연간 감염 확률 배율(§5.1) |
| `risk` | `{causeId: 배율}` — `causes.json`의 `w`에 곱함 |
| `age` | `[min, max]` 취업 연령. 기본 [16, 65] |
| `req` | `artsTop10`, `infected`, `race:<id>`, `sex:<m|f>` |
| `special` | true면 공통 풀에서 제외, 국가 `jobs`나 조건으로만 제안 |

명시값: 오리지늄 광부 8, 재앙 정보 전달자 5, 피트싱커 12. 나머지 `oriMul`·`risk`·소득 범위는 추정.

## causes.json — 사인 33종 (현실 11 + 테라 22)

| 필드 | 설명 |
|---|---|
| `kind` | `real` / `terra` |
| `label` | 사망 기록 표시 명사구 |
| `w` | 7밴드 `["<1","<5","<15","<30","<50","<70","70+"]` 기본 가중(상대값) |
| `tags` | `nation:<id>`, `threat:<key>`, `trait:<key>`, `infected`, `female`, **`pos:<A원형|noble|high>`**(W12: 패밀리·관료 진로 / 작위 / 소속 지위 60+ — `assassination` 은 이 그룹 중 하나 필수). 같은 접두끼리 OR, 접두 그룹끼리 AND(D21). 비어 있으면 공통 |
| `fact` | 비교 문장용 메모 |
| `footnote` | 무거운 주제 처리 지침 |

엔진 규칙(§3.4): 최종 가중 = `w[band] × Π(국가 threats 일치) × job.risk[id] × 감염 상태 × 종족 traits`. `oripathy`(uL ≥ 0.80)와 `catastrophe`(§5.2 사망 2%)는 롤 결과로 직접 확정되는 경우가 있으며 `w`는 그 외 간접 사망용.

**추정 범위**: 가중치 전부. 현실 계열은 1950년 사망 원인 구성(감염병·호흡기 상위, 심혈관·암은 노년)을 단순화. 테라 계열은 보고서 A-9를 옮겼고 숫자는 창작.

## names.json — 이름 풀 22개 언어권

`langs[key]`: `{label, o, sep, m[20], f[20], s[20], raceRule?, pat?, femSurname?, noble?, doubleSurname?}`

- `o`: `gf` 이름 성 / `fg` 성 이름 / `pat` 이름 부칭 성 / `mono` 이름만
- 염국 `zh`: 한자 독음, `sep:""`(좌락식). 용문 `yue`: 광둥어 로마자 표기.
- 극동 `ja`: `raceRule.oni = "mono"`(오니는 성 없음).
- 우르수스 `ru`: `pat` 표에서 아버지 이름 → 부칭. `femSurname`으로 여성형 성(−프→−바, −인→−이나, −스키→−스카야).
- 카시미어 `pl`: `femSurname`(−스키→−스카).
- 라이타니엔 `de`: `noble`(상류 분위 12%에 "폰 ").
- 이베리아 `es_pt`·볼리바르 `es_latam`: `doubleSurname` 확률로 성 둘.
- `fr`은 국가가 아니라 `eth:'gaul'` 전용.
- `_meta.nationLang`: 국가 id → 언어 키 대조표(검증기가 nations.json과 비교).

실제 캐릭터 이름은 넣지 않았다. 검증기에 금지어 목록이 있다(보고서 A-8 근거 사례 등). 언어 매핑 자체가 관찰 기반 추정이다.

---

# v0.3 진로·소속 데이터 (W8, 2026-10-20)

스키마 원본은 `docs/설계_명세_v1.md` §3·§8·§9·§10·§11.3, 콘텐츠 원천은 `docs/진로_카탈로그_v0.md`(사용자 승인). 결정은 D39~D49. 아래 파일의 **수치는 전부 창작**이다(카탈로그·캐논에 숫자가 없다). 창작 범위 표시: 진로·단계·소속·유형의 `canon: false`, 관계·혼인·주거의 `canon: 'partial'`(정황 근거), 각 파일 `_meta.note`.

## tracks/<nation>.json — 진로 276개 (21개국 257 + rhodes 9 + common 10)

파일당 `{ _meta: { nation, source, canon, classScale, note }, tracks: [...] }`. 국가 id 와 파일명이 같다. `rhodes.json`(로도스 내부, §10 입구로만 진입)·`common.json`(국가 횡단 고용주, switch·이벤트로만 진입).

| 필드 | 설명 |
|---|---|
| `id`, `nation`, `region` | 카탈로그 id 그대로. `region` 은 하위 지역 태그(극동 `north/south`, 사르곤 `acahualla`, 볼리바르 `singas/coalition/liberated/dossoles`, 타라 `hillock`, **시라쿠사 `wild`**(W12: 농촌 출생 3% 롤, `balance.ruralRegions`)). 엔진 `S.sub.region` 과 gate `{region}` 이 맞춰 쓴다. gate `{region}` 에 `weight` 가 없으면 **하드 게이트**(SIR_WILD·SAR_TRIBE 는 출생 환경 전용, W12 D51-10) |
| `focus` | **W12(D53a)** 선택. `[{id, name, fx:{cap:{skill…}, standing, hl, h, money(중위소득 배율)}, fall?(그 해 몰락 확률 배율)}]` 2~3개. 없으면 원형 기본(`src/engine/focus.js ARCH_FOCUS`). 키는 `tf:<진로 id>:<id>` 로 저장된다 |
| `archetype` | §4 원형 A1~A12 (엔진 기본값 묶음) |
| `canon` | false 면 진로 자체가 창작(SAM_RESORT·KJE_GUIDE·IBE_FARM·DUR_BREW) |
| `itinerant`, `route` | §7.4 순회형. `route` 가 null 이면 `nation.mig`(로도스는 `rhodes.json.ports`) |
| `entry.ages` | 진입 가능 나이 |
| `entry.classes` | `{q1..q5: 가중}`. **카탈로그 "계층별 유입" 비율(0~1) × `_meta.classScale`**. 계층 안의 상대 비율은 카탈로그 그대로. 국가 안에서 계층별 합 = classScale ≤ 1, 진로 안에서 계층 합 ≤ 1(둘 다 만족시키려는 스케일. 엔진은 상대 가중만 쓴다). 비어 있으면 전환·이벤트 전용(`note` 에 명시) 또는 `forced` |
| `entry.gates` | 전부 통과해야 후보. 키: `cap`+`min`(등급 경계 −0.8/0.5/1.4), `born`(`looks`)+`min`, `status`(`!slave`, `noble`, `slave`, `orphan`, `ninja_clan`, `prisoner` — `weight` 가 있으면 조건이 아니라 가중), `rel`(`<=cultural` 등 §9 등급 상한), `race`+`weight`(가중) 또는 `race`+`only:true`(제한), `infected`(true/false), `year:[y0,y1]`(테라력 입구 열림 구간), `region`, `urban`(+`weight`), `sex`(+`weight`), `eth`(`nomad`/`gaul` + `weight`; 구 `outsider` 폐기), `papers`(배열, `native` 아님 = 이주민 + `weight`) |
| `entry.via` | 입구 서사 변주 id(콘텐츠용 문자열) |
| `forced` | 강제 전환 전용 진로(`{infected:true, policy:[...]}`): 진입 롤 후보에서 빼고 감염 판정·정책으로만 들어간다(URS_MINE·LEI_QUAR·VIC_INFECTED·KAZ_INFECTED·COL_INSURANCE·LAT_FALLEN·RIM_INFECTED). 카탈로그 유입 비율에서 이들 몫을 빼고 재정규화했다(`_meta.note`) |
| `stages[]` | `{id, name, title, minYears, promo:{cap,k,requires?}|null, fall:{base, causes[]}, canon?:false, forced?, oriMul?, capStage?, contract?}`. 마지막 단계는 `promo:null`. `k` 0.01~0.25, `base` 0.01~0.08(§13). `requires.aff` 는 affiliations tag, `requires.year` 는 테라력, `requires.race` 종족. `capStage:{q1:true}` 는 그 분위의 승급 상한(A4 평민 상한). `oriMul` 은 그 단계의 감염 배율(A5). `contract` 는 계약 단위 연수(A6) |
| `income.stage[]` | 단계별 중위소득 배율(길이 = stages). `income.job` 은 `jobs.json` id(소득 범위·risk 참조, A11 필수) |
| `standing` | 소속 지위 지표 `{name, start}` |
| `affiliations[]` | `affiliations.json` id. 진입 시 weight 로 하나 배정 |
| `exits.retire` | `{age, to}` 또는 null(은퇴 없음: 강제·종신 진로) |
| `exits.fall` | 단계 `fall.causes` 의 모든 원인 → §3.5 사전 값: `death` / `death:<causeId>`(사인 직접 지정) / `prison:jail` / `prison:camp` / `exile` / `demote` / `expel` / `injured` / `infected` / `disgrace` / `arena:<trackId>`. `death` 의 사인은 `tracks/common.json._meta.fallDeathCause[원인]`(§11.4 매핑, 전 파일 공통) |
| `exits.switch[]` | 자발 전직 후보(타국 common·rhodes 진로 포함 가능) |
| `oriPolicyOverride` | 감염 처우를 바꾸는 진로만(`kaz_arena` = 카시미어 기사 → 혈투 리그) |
| `canonFigures[]` | `canon_figures.json` id |
| `note` | 창작 범위·특이점 |

몰락 원인 어휘(단계 `fall.causes`)와 기본 결과·사인 매핑은 `tracks/common.json._meta.fallDefaultOutcome` / `fallDeathCause` 에 있다(원형 기본: A1 vendetta·arrest·betrayal, A2 injury·scandal·elimination, A3 impeach·purge·exile, A4 kia·desert·courtmartial, A5 accident·execution·crystallize, A6 kia·contract_end, A7 erosion·exile, A8 heresy·demotion·poison, A9 accident·disappear, A10 layoff·bankrupt, A11 ruin, A12 scandal·fade. 국가색으로 raid·freezing·seaborn·poison·overwork·assassination·starvation·mine·drowning·beast·hound·experiment·camp·euthanasia 등을 덧붙임).

## affiliations.json — 소속 756개

`{ id, track, name, canon, weight, mods:{promo, fall, income, standingStart}, tags[], events }`. 진로 안에서 `weight` 합 1. `mods` 배율은 0.7~1.3 으로 클램프(±30%). `tags` ∈ `major | minor | elite`(단계 `requires.aff` 가 읽음). `events` = 콘텐츠 태그 `aff:<id>` 와 짝(`<TRACK>:<slug>`).

## canon_figures.json — 캐논 인물 78명

`{ id, name(KR 정식), nation, years:[y0,y1], tracks[], stage?, line }`. D43: 1회성 이벤트만, `years` 게이트, 생애당 ≤ 3, `line` 에 이름 없음(검증기가 막음). 표기 불확실한 인물은 뺐다.

## relations.json — 국가×종족 관계 (§9, D49)

`grades`(6등급 순서) / `default` / `relMul` / `sarkaz_default:{grade, by:{nation: grade, victoria_since}}` / `pairs[]:{nation, race('!x'=x 외 전부), grade, canon:true|'partial', since?, scope?('track:ID'), note(근거 필수)}` / `ethPairs[]`(종족 대신 `eth` 플래그: 가울·타라 유목민. 엔진이 안 읽으면 콘텐츠 태그용). 캐논 근거 없는 쌍은 넣지 않는다.

## marriage.json — 혼인 제도 (§8.1)

최상위 키 = 국가 id(+`_meta`). `types[]:{id, name, w, age:[a,b], dowry(중위소득 배율), poly?, polyReq?:{income}, req?:{track[]|urban|infected|status|eth|migrant(타국 출생)|region}, since?/until?, region?, canon, events?, note?}`. 국가당 일반 유형 2~4 + 감염자 전용(`req.infected`) 1(격리·박해 정책 국가). `_meta.forcedRule` 참고.

## housing.json — 주거 형태 (§8.2)

최상위 키 = 국가 id + `_default`(전 국가 공통 강제: quarantine·camp·jail·ship_cabin·barracks·refugee_tent). `types[]:{id, name, w, cost(연간 주거비 배율), own?:true+price(중위소득 배율), req?, forced?:{oriPolicy[]+known | prison | res | track[]+stageMin/stageMax | archetype[]+stageMax | papers}, region?, since?, canon}`. 국가당 일반 유형 2~5 + 강제 유형.

## rhodes.json — 로도스 루트 (§10)

`entries[]`(9 via, 평탄한 트리거 키: `p` 연간 확률, `ages`, `cap`, `flag`, `capMin`, `policies`, `money`, `archetypes`, `stageMin`, `tracks`, `papers`, `nation`, `bornBefore`, `years`; 서사 꼬리표 `line`·`tag`, 배치 `status`) / `decision` / `depts`(id 배열) + `deptInfo` / `statusRules`(§10.2 위에서부터 첫 일치) / `ports`(기항지 id 배열) + `portWeights` / `closed[]`(§10.4 평탄 키) + `rumorOnly` / `diagnosis.templates` 6종(캐논 프로필 톤, 단계·uL 구간) / `operatorStats`(캐논 6종 등급 공식, D42).

## nations.json 추가 필드 (§7.3, D26) — 값 변경 없음, 추가만

`refugeeIn`(난민 수용) · `naturalize`(open/hard/never) · `illegalRisk`(0~1, 불법 체류 발각 가중) · `expelsInfected`(라테라노만 true) · `mig`(이주 목적지 가중, 합 1 — W1 에 없던 필드) · `specialTracks`(국가 특수 진로 id: canon:true && 원형≠A10/A11 && 유입 있음 && 강제 아님. D26 노출용). 전부 창작.

## races.json 추가 필드

`skillApt`(기량 적성 z 보정, −0.3~+0.3, 창작). `causes.json` 에는 진로 몰락 사인 6종 추가(missing·assassination·freezing·poison·overwork·seaborn_change, 전부 terra·창작 가중).

## 검증

```bash
node test/validate-data.js
```

W8 추가 검사: tracks 파일 전수(국가당 1 + rhodes + common) / 진로 276±5 / id 유일·nation·archetype·stages 2~6·promo.k·fall.base·exits.fall 사전·사인 매핑·income 길이·income.job·affiliations 역참조·retire/switch/arena 참조·gates 키·canonFigures 참조·진로 안 classes 합 ≤ 1·국가 안 계층별 합 ≤ 1·국가당 8개 이상·A11 존재 / affiliations weight 합·mods 범위·tags enum·requires.aff 존재 / canon_figures 40~80·years·tracks·line 에 이름 금지 / relations 등급 enum·canon·note·D49 필수 쌍·20~40쌍 / marriage·housing 21개국 전수·유형 수·req/forced 참조·w 합 / rhodes 9 via·ports 8~12·템플릿 6·캐논 6등급 / nations 추가 필드·mig 합·specialTracks / races.skillApt. W7 의 `test/validate-tracks.js`(엔진 쪽 해석)도 같이 통과한다.

## test/validate-data.js (W1)

검사 항목: JSON 파싱 / 필수 필드·enum·범위 / share 합 100±0.5 / 참조 무결성(nations.races→races, nations.jobs→jobs(+only 일치), jobs.risk→causes, causes.tags→nations·threats·traits, races.home→nations, nameLang→names.langs, model→stats1950) / stats 셀의 source·estimated 일관성 / 실제 캐릭터 이름 금지어.

```bash
node test/validate-data.js
```

종료 코드 0이면 통과. 경고는 통과를 막지 않는다.

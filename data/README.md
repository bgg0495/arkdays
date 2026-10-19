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
| `home` | 중심 국가 id. 여기 없는 국가에서 태어나면 `eth:'outsider'` |

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
| `tags` | `nation:<id>`, `threat:<key>`, `trait:<key>`, `infected`, `female`. 비어 있으면 공통 |
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

## test/validate-data.js

검사 항목: JSON 파싱 / 필수 필드·enum·범위 / share 합 100±0.5 / 참조 무결성(nations.races→races, nations.jobs→jobs(+only 일치), jobs.risk→causes, causes.tags→nations·threats·traits, races.home→nations, nameLang→names.langs, model→stats1950) / stats 셀의 source·estimated 일관성 / 실제 캐릭터 이름 금지어.

```bash
node test/validate-data.js
```

종료 코드 0이면 통과. 경고는 통과를 막지 않는다.

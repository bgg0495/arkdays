# 빌드·배포 (금일방주 / Arkdays)

배포물은 `dist/index.html` **한 파일**입니다(D29). JS 모듈 전부, `data/*.json`, `src/ui/style.css` 가 안에 인라인되어 있어
서버 없이 더블클릭(`file://`)으로 열려 플레이되고, 외부 요청(스크립트·CSS·폰트·fetch)이 0건입니다.
런타임 라이브러리는 없고, 빌드에만 esbuild(개발 의존성)를 씁니다.

## 빌드

```bash
npm install
npm run build
```

- `npm run build` → `node build/build.js` → `dist/index.html` (minify). 끝에 파일 크기를 출력합니다.
- `npm run build:dev` → minify 없이(디버깅용, 약 2배 크기).
- `npm run verify` → `dist/index.html` 을 **진짜 `file://`** 로 Chrome/Edge headless 에서 열어
  시작 → 태어나기 → 삶을 시작하기 → 10세(자동 결정) → localStorage 저장 → 새로고침 → 이어하기 → 12세 까지 돌리고
  콘솔 에러·예외·네트워크 요청을 모아 보고합니다. 의존성 없음(DevTools 프로토콜 직접 사용). 종료 코드 0 = 통과.
- 개발 중엔 그대로 `python -m http.server 8765` → `http://localhost:8765/src/` (빌드 불필요).

`build/build.js` 가 하는 일:
1. `src/main.js` 를 esbuild 로 IIFE 한 덩어리로 번들(`content/`·`src/engine`·`src/ui` 전부 포함).
2. `data/{nations,races,jobs,causes,names,stats1950}.json` + `terra_e0.json` 을 `window.__DATA__ = {...}` 로 번들 **앞에** 인라인
   → `src/data-loader.js` 가 fetch 를 건너뜁니다(키 이름 = 파일명, `terra` = `terra_e0.json`).
3. `src/ui/style.css` 를 `<style>` 로 인라인(주석 제거).
4. **제목 치환(D28)**: `src/ui/*` 원본은 손대지 않고 빌드 때 `REPLACE` 표로 "명생게임" → "금일방주", 영문 부제 "Arkdays",
   시작 화면 카피에 "몇 억 분의 1." 추가. 치환 대상이 원본에서 사라지면 빌드가 실패하므로 그때 표를 갱신하면 됩니다
   (대상 목록은 `docs/설계_명세.md` "W5a 메모").
5. 산출물에 `<script src>`·`<link href>`·`@import`·`@font-face`·`url(http…)` 가 남아 있으면 빌드 실패.

`content/index.js` 에 등록된 팩만 들어갑니다. 콘텐츠·데이터·밸런스를 바꾸면 다시 `npm run build` (밸런스를 바꿨으면 먼저 `node test/calibrate.js` 로 `terra_e0.json` 재생성).

## 크기 (2026-10-19 빌드, 콘텐츠 W4a 까지)

| 항목 | 크기 |
|---|---|
| `dist/index.html` 전체 | **279.9 KB** (286,653 bytes) |
| JS 번들(minify) | 156.2 KB |
| 데이터(`__DATA__`) | 105.2 KB |
| CSS | 17.6 KB |

gzip 하면 대략 1/4 이하. W4b·W4c 콘텐츠가 들어가면 JS 가 더 커집니다.

## 배포

- **HTML 1개**: `dist/index.html` 을 그대로 올리거나 보냅니다. 받는 쪽은 더블클릭으로 엽니다(Chrome·Edge·Firefox·Safari).
  저장은 브라우저 localStorage(`tr1.*`)에 남으므로 같은 브라우저·같은 파일 경로에서 이어하기가 됩니다
  (파일을 다른 폴더로 옮기면 Chrome 은 `file://` 전체를 한 origin 으로 보므로 저장이 유지되고, Firefox 는 경로별로 나뉠 수 있습니다).
- **zip**: `index.html` 하나를 zip 으로 묶어 올려도 됩니다(커뮤니티 첨부 용량 제한용). 파일명은 `index.html` 유지.
- **itch.io (HTML5)**: zip 에 `index.html` 이 **루트**에 있어야 합니다. 업로드 후 "This file will be played in the browser" 체크,
  Viewport 는 가로 900 이상·세로 700 이상 권장(1280×800 이면 3컬럼). 모바일 체크 켜도 됩니다(375px 1컬럼 대응).
- **GitHub Pages / 정적 호스팅**: `dist/` 폴더(또는 파일 하나)를 그대로. 서버 설정 불필요.
- 면책 문구(비공식·비영리 팬 창작)는 시작 화면·사망 기록에 들어 있습니다. 공식 일러스트·음원은 넣지 않습니다.

## 참고

- `dist/` 는 산출물이므로 저장소에 넣지 않아도 됩니다(언제든 재빌드). `node_modules/` 도 마찬가지.
- 빌드 산출물을 http 로 확인하려면 `npm run serve:dist` → `http://127.0.0.1:8787/`.
- `.claude/launch.json` 의 `dist` 설정이 같은 서버를 띄웁니다(Claude Code 미리보기용).

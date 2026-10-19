// 데이터 로더. 두 경로:
//   1) 배포 빌드(W5): window.__DATA__ 에 data/*.json(+terra_e0.json)을 인라인 → 그것을 우선 쓴다(file:// 에서도 동작).
//   2) 개발: index.html 기준 ../data/*.json 을 fetch. 프로젝트 루트에서 정적 서버를 띄운다
//      (예: python -m http.server 8000 → http://localhost:8000/src/). content/dummy.js 가 ../src/engine 을 import 하므로
//      src/ 만 서빙하면 안 된다.
import { prepareData } from './engine/data.js';

const FILES = ['nations', 'races', 'jobs', 'causes', 'names', 'stats1950'];

export async function loadRaw() {
  if (typeof window !== 'undefined' && window.__DATA__) return window.__DATA__;
  const base = new URL('../data/', import.meta.url);
  const raw = {};
  await Promise.all(FILES.map(async (f) => {
    const r = await fetch(new URL(f + '.json', base));
    if (!r.ok) throw new Error(f + '.json 을 읽지 못했습니다 (' + r.status + ')');
    raw[f] = await r.json();
  }));
  try {
    const r = await fetch(new URL('terra_e0.json', base));
    if (r.ok) raw.terra = await r.json();
  } catch (e) { /* 캐시 없으면 k=1 로 동작 */ }
  return raw;
}

export async function loadData() {
  return prepareData(await loadRaw());
}

// 데이터 로더. 두 경로:
//   1) 배포 빌드(W5): window.__DATA__ 에 data/*.json(+terra_e0.json, v1: tracks/*.json·affiliations·relations·marriage·housing·rhodes·canon_figures)을
//      인라인 → 그것을 우선 쓴다(file:// 에서도 동작).
//   2) 개발: index.html 기준 ../data/*.json 을 fetch. 프로젝트 루트에서 정적 서버를 띄운다
//      (예: python -m http.server 8000 → http://localhost:8000/src/). content/dummy.js 가 ../src/engine 을 import 하므로
//      src/ 만 서빙하면 안 된다. v1 파일은 없으면 건너뛴다(엔진 기본값). 진로 폴더는 glob 이 안 되므로 nations.json 의 국가 id + common·rhodes 로 시도한다.
import { prepareData } from './engine/data.js';

const FILES = ['nations', 'races', 'jobs', 'causes', 'names', 'stats1950'];
const OPTIONAL = ['terra_e0', 'affiliations', 'relations', 'marriage', 'housing', 'rhodes', 'canon_figures'];

async function fetchJson(url, required) {
  try {
    const r = await fetch(url);
    if (!r.ok) { if (required) throw new Error(url.pathname.split('/').pop() + ' 을 읽지 못했습니다 (' + r.status + ')'); return null; }
    return await r.json();
  } catch (e) { if (required) throw e; return null; }
}

export async function loadRaw() {
  if (typeof window !== 'undefined' && window.__DATA__) return window.__DATA__;
  const base = new URL('../data/', import.meta.url);
  const raw = {};
  await Promise.all(FILES.map(async (f) => { raw[f] = await fetchJson(new URL(f + '.json', base), true); }));
  await Promise.all(OPTIONAL.map(async (f) => {
    const v = await fetchJson(new URL(f + '.json', base), false);
    if (v) raw[f === 'terra_e0' ? 'terra' : f] = v;
  }));
  const nations = raw.nations && (Array.isArray(raw.nations) ? raw.nations : raw.nations.nations) || [];
  const ids = [...new Set(nations.map((n) => n.id).concat(['common', 'rhodes']))];
  const tracks = (await Promise.all(ids.map((id) => fetchJson(new URL('tracks/' + id + '.json', base), false)))).filter(Boolean);
  if (tracks.length) raw.tracks = tracks;
  return raw;
}

export async function loadData() {
  return prepareData(await loadRaw());
}

// 시뮬 기대수명 캐시 생성(D19): node test/calibrate.js [N=400] [seed=cal]
// 국가·성별마다 N명을 강제 출생시켜 돌리고, 평균 사망 나이 / 평균 생명표 e0 = k 를 구한다.
// 결과 data/terra_e0.json → prepareData() 가 nation.terra 로 읽고 birth.js 가 S.e0 = 생명표 e0 × k 로 쓴다.
// 종족 lifeMul 이 섞여 있어도 비율(k)이라 그대로 적용된다. balance.js 를 바꾸면 다시 돌린다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { prepareData } from '../src/engine/data.js';
import { lifeTable } from '../src/engine/lifetable.js';
import { createRegistry } from '../src/engine/content.js';
import { createSim } from '../src/engine/sim.js';
import content from '../content/index.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const N = parseInt(process.argv[2] || '600', 10);
const SEED = process.argv[3] || 'cal';

function loadRaw() {
  const raw = {};
  for (const f of ['nations', 'races', 'jobs', 'causes', 'names', 'stats1950']) {
    const real = path.join(ROOT, 'data', f + '.json');
    const file = fs.existsSync(real) ? real : path.join(ROOT, 'data', '_dummy', f + '.json');
    raw[f] = JSON.parse(fs.readFileSync(file, 'utf8'));
  }
  return raw;
}

function main() {
  const data = prepareData(loadRaw());          // terra 캐시 없이(k=1) 돌려야 순수 손실이 나온다
  const registry = content.install(createRegistry());
  const out = { _meta: { note: '시뮬 기대수명 캐시(D19). k = 평균 사망 나이 / 평균 생명표 e0, e0 = 인간 척도 시뮬 기대수명(년), u5k = 5세 전 사망 비율 배율. test/calibrate.js 가 생성. balance.js·data 를 바꾸면 다시 생성', builtAt: new Date().toISOString().slice(0, 10), N, seed: SEED }, nations: {} };
  const t0 = Date.now();
  for (const n of data.nations) {
    const rec = {};
    let u5Sim = 0, u5Tab = 0, cnt = 0;
    for (const sex of ['M', 'F']) {
      let ageSum = 0, e0Sum = 0, hAge = 0, hE0 = 0, hN = 0;
      for (let i = 0; i < N; i++) {
        const sim = createSim({ data, seed: SEED + ':' + n.id + ':' + sex + ':' + i, content: registry, auto: true });
        const S = sim.newLife({ nation: n.id, sex });
        sim.start();
        let guard = 0;
        while (S.phase === 'life' && guard++ < 600) sim.runYear();
        ageSum += S.deathAt.age; e0Sum += S.e0Model;
        if (S.lifeMul === 1) { hAge += S.deathAt.age; hE0 += S.e0Model; hN++; }
        cnt++; if (S.deathAt.age < 5) u5Sim++;
        u5Tab += 1 - lifeTable(n.stats, sex, S.lifeMul).l[5];
      }
      const k = ageSum / e0Sum;
      const humanE0 = lifeTable(n.stats, sex, 1).e0 * (hN >= 50 ? hAge / hE0 : k);   // 인간 척도 표본이 적으면 전체 비율 사용
      rec[sex] = { k: +k.toFixed(4), e0: +humanE0.toFixed(1), model: +lifeTable(n.stats, sex, 1).e0.toFixed(1) };
    }
    rec.u5k = +Math.max(0.8, Math.min(2.5, (u5Sim / cnt) / Math.max(1e-6, u5Tab / cnt))).toFixed(3);   // 표본 잡음 완화
    out.nations[n.id] = rec;
    console.log(n.id.padEnd(12) + ' M ' + rec.M.model + '→' + rec.M.e0 + '  F ' + rec.F.model + '→' + rec.F.e0 + '  u5k ' + rec.u5k);
  }
  const file = path.join(ROOT, 'data', 'terra_e0.json');
  fs.writeFileSync(file, JSON.stringify(out, null, 1), 'utf8');
  console.log('→ ' + path.relative(ROOT, file) + ' (' + (Date.now() - t0) + 'ms)');
}

main();

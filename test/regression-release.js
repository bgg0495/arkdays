// v0.3.4 인수 점검: 저장 호환·꿈 판정·이주 뒤 예약 사건·비활성 선택지.
import assert from 'node:assert/strict';
import { loadData } from './sim.js';
import { createSim } from '../src/engine/sim.js';
import { createRegistry } from '../src/engine/content.js';
import { dreamYear, dreamGiveUpP, trackOf } from '../src/engine/track.js';
import { deathSummary } from '../src/ui/text.js';
import content from '../content/index.js';

const { data } = loadData();
const registry = content.install(createRegistry());
function life() {
  const sim = createSim({ data, content: registry, seed: 'release-regression', auto: true });
  sim.newLife({ nation: 'columbia' });
  sim.S.phase = 'life'; sim.S.age = 30;
  return sim;
}

const mappings = [
  ['COL_BSW', 'COL_PMC', 'COL_PMC_BLACKSTEEL', 2, 'elite'],
  ['COL_RHINE', 'COL_RESEARCH', 'COL_RES_RHINE', 1, 'researcher'],
  ['COM_PENGUIN', 'LGM_MESSENGER', 'LGM_MSG_PENGUIN', 1, 'staff'],
  ['COM_PENGUIN_IDOL', 'LGM_ART', 'COM_SIREN', 2, 'record'],
  ['COM_BLACKSTEEL', 'COL_PMC', 'COL_PMC_BLACKSTEEL', 3, 'cadre'],
  ['COM_BLACKSTEEL_EXCHANGE', 'COL_PMC', 'COL_PMC_BLACKSTEEL', 1, 'dispatched'],
];
for (const [oldId, newId, aff, stage, oldStage] of mappings) {
  const sim = life(), S = sim.S;
  S.track = { id: oldId, stage, since: 20, stageSince: 25, years: 10, standing: 40, aff: 'old-aff', flags: {} };
  S.trackHist = [{ id: oldId, stage: oldStage, from: 20, to: 25, how: 'promo' }];
  S.job = oldId;
  S.flags.trackCands = { age: 30, cands: [{ id: oldId, w: 1 }] };
  S.flags.trackRollAge = 30;
  S.pending = { id: 'track_switch', view: { choices: [{ k: oldId, label: '옛 진로' }, { k: 'stay', label: '남는다' }] } };
  assert.ok(sim.load(structuredClone(S)), oldId);
  assert.equal(trackOf(sim).id, newId);
  assert.equal(sim.S.track.aff, aff);
  assert.equal(sim.S.track.standing, 40);
  assert.equal(sim.S.trackHist[0].id, newId);
  assert.ok(trackOf(sim).stages.some((s) => s.id === sim.S.trackHist[0].stage));
  assert.equal(sim.S.pending.view.choices[0].k, newId);
  assert.equal(sim.S.flags.trackCands, null);
  if (oldId === 'COM_BLACKSTEEL_EXCHANGE') assert.equal(sim.S.flags.bsx.at, 20);
  const migrated = structuredClone(sim.S);
  assert.deepEqual(sim.load(structuredClone(migrated)), migrated, '반복 로드 시 경력 유지');
  sim.S.pending = null;
  sim.runYear(); // 변환된 진로로 소득·승급·연말 처리가 실제 실행되는지
}
console.log('PASS: 삭제된 진로 6종의 저장·소속·경력·열린 결정 변환 및 1년 진행');
{
  const sim = life();
  sim.S.pending = { id: 'com_entry_penguin', view: { choices: [{ k: 'yes', label: '지원' }] } };
  assert.ok(sim.load(structuredClone(sim.S)));
  assert.equal(sim.S.pending, null);
}
console.log('PASS: 삭제된 결정이 열린 옛 저장도 이어하기 가능');

for (const [status, dept, track] of [
  ['patient', 'patient', 'RHO_PATIENT'],
  ['contractor', 'field', 'RHO_CONTRACTOR'],
  ['operator', 'medical', 'RHO_MEDICAL'],
  ['operator', 'field', 'RHO_OPERATOR'],
]) {
  const sim = life();
  sim.S.dream = { id: 'RHO_OPERATOR', at: 8 };
  sim.joinRhodes('treatment', { place: { status, dept, track }, quiet: true });
  assert.equal(sim.S.flags.dreamDone != null, track === 'RHO_OPERATOR', track);
  if (track !== 'RHO_OPERATOR') {
    sim.enterTrack('RHO_OPERATOR', { how: 'rhodes', quiet: true });
    assert.equal(sim.S.flags.dreamDone, 30);
  }
}
console.log('PASS: 환자·계약자·의료부 합류와 외근 오퍼레이터 꿈 달성 구분');

{
  const sim = life(), S = sim.S;
  S.race = 'sarkaz'; S.age = 65; S.dream = { id: 'COL_RESEARCH', at: 8 };
  sim.rng.chance = () => true;
  dreamYear(sim);
  assert.equal(S.flags.dreamGiven, 35);
  assert.equal(S.flags.dreamGivenAt, 65);
  S.deathAt = { age: 70, cause: 'old' };
  assert.ok(deathSummary(sim).includes('예순다섯에 연구원의 꿈을 접었습니다.'));
  delete S.flags.dreamGivenAt; // v0.3.4 기존 저장의 환산 나이 복원
  assert.ok(deathSummary(sim).includes('예순다섯에 연구원의 꿈을 접었습니다.'));
  S.race = 'liberi'; S.age = 24; S.dream.id = 'COL_PMC';
  assert.equal(dreamGiveUpP(sim), 0);
  S.age = 35;
  assert.ok(dreamGiveUpP(sim) > 0 && dreamGiveUpP(sim) < 1);
  const ordinary = dreamGiveUpP(sim);
  S.race = 'sarkaz';
  assert.ok(dreamGiveUpP(sim) < ordinary, '장수 종족의 포기는 늦어진다');
}
console.log('PASS: 장수 종족의 꿈 포기 확률과 실제 나이 요약');

{
  const sim = life(), S = sim.S;
  S.cur = S.root = 'kjerag'; S.res.itinerantAt = null;
  sim.fire({ type: 'big', id: 'victoria_tara_1108' });
  assert.equal(S.flags.big_victoria_tara_1108, undefined);
  S.res.itinerantAt = 'victoria';
  sim.fire({ type: 'big', id: 'victoria_tara_1108', visit: 'victoria' });
  assert.equal(S.flags.big_victoria_tara_1108, S.age, '실제 방문국의 사건은 유지');
}
console.log('PASS: 이주 후 이전 국가 사건 차단 및 실제 방문국 사건 허용');

{
  const sim = life(), S = sim.S;
  S.pending = { id: 'track_choose', p: {}, view: { choices: [
    { k: 'wait', label: '기다림', auto: 1 },
    { k: 'closed:COL_RESEARCH', label: '연구원', auto: 0, disabled: true },
  ] } };
  const pending = S.pending;
  assert.equal(sim.choose('closed:COL_RESEARCH'), false);
  assert.equal(S.pending, pending);
  assert.equal(S.done.track_choose, undefined);
  sim.autoChoice();
  assert.equal(S.pending, null);
  assert.equal(S.track, null);
}
console.log('PASS: 닫힌 문 선택 시 다른 선택지를 대신 실행하지 않음');

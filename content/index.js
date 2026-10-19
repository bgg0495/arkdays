// 콘텐츠 조립점. 레지스트리에 넣을 팩을 한 곳에서 모은다. 순서가 결정 큐 우선순위다(planYear 가 한 해 앞 2개만 큐에 넣는다).
//   childhood.js      공통 0~18세 이벤트·결정 (W4a)
//   school.js         국가 태그 0~18세 이벤트·결정·대사건 (W4a)
//   adult_work.js     성인 일터 이벤트·결정 (W4b)  ← adult_firstjob 등 필수 결정이 앞쪽
//   adult_family.js   가족 이벤트·결정 (W4b)
//   adult_money.js    돈·생활 (W4b)
//   adult_infected.js 감염 생활 (W4b)
//   adult_nations.js  국가 특수 직업 서사 (W4b)
//   elder.js          노년 이벤트·결정 (W4c)  ← elder_retire 가 더미 retire65 를 대체
//   bigevents.js      캐논 대사건 + 1102년 이후 연장 대사건 + 전시 이벤트 (W4c)  ← chernobog_1096_live 가 더미 big 을 대체
// dummy.js(W2)는 전부 대체되어 더 이상 등록하지 않는다. 사망 텍스트(death_texts.js)는 UI 가 직접 import 한다.
import childhood from './childhood.js';
import school from './school.js';
import adultWork from './adult_work.js';
import adultFamily from './adult_family.js';
import adultMoney from './adult_money.js';
import adultInfected from './adult_infected.js';
import adultNations from './adult_nations.js';
import elder from './elder.js';
import bigevents from './bigevents.js';

export const packs = [childhood, school, adultWork, adultFamily, adultMoney, adultInfected, adultNations, elder, bigevents];

/** createRegistry().use(...) 에 차례로 넣는다 */
export function install(registry) {
  for (const p of packs) registry.use(p);
  return registry;
}

export default { install, packs };

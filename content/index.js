// 콘텐츠 조립점. 레지스트리에 넣을 팩을 한 곳에서 모은다. 순서가 결정 큐 우선순위다(planYear 가 한 해 앞 2개만 큐에 넣는다;
// 엔진 내장 결정 id(track_choose·marry_*·home_change·rhodes_offer…)는 콘텐츠가 덮어써도 installEngineDecisions 가 앞자리를 지킨다).
//   childhood.js      공통 0~18세 이벤트·결정 (W4a)
//   school.js         국가 태그 0~18세 이벤트·결정·대사건 (W4a)
//   tracks/<nation>.js 국가 전용 진로 콘텐츠 21개국 (W9a~h) — 진로·소속·이주·관계·혼인·주거·캐논 인물
//   tracks/rhodes.js  로도스 아일랜드(신분×부서·RHO_* 진로·rhodes_offer 덮어쓰기) (W9h)
//   tracks/common.js  공통 고용주 COM_*(펭귄·전달자·블랙스틸·용병 시장…) + 입구 트리거 (W9h)
//   _dispatch.js      국가별 결정 디스패처(marry_<type>·marry_second·home_change·track_choose 를 거주국으로 분기) (W11)
//   adult_family.js   가족 이벤트·결정 (W4b)
//   adult_money.js    돈·생활 (W4b)
//   adult_infected.js 감염 생활 (W4b) — 로도스 직접 합류 경로는 W11 에서 제거(엔진 rhodes_offer 만)
//   elder.js          노년 이벤트·결정 (W4c)
//   bigevents.js      캐논 대사건 + 1102년 이후 연장 대사건 + 전시 이벤트 (W4c)
// 폐기(W11): adult_work.js·adult_nations.js(국가 진로 콘텐츠가 대체). dummy.js·_dummy_tracks.js 는 테스트 전용(test/sim.js 가 선택 등록).
// 사망 텍스트(death_texts.js)는 UI 가 직접 import 한다.
import childhood from './childhood.js';
import school from './school.js';
import yan from './tracks/yan.js';
import lungmen from './tracks/lungmen.js';
import higashi from './tracks/higashi.js';
import ursus from './tracks/ursus.js';
import sami from './tracks/sami.js';
import kjerag from './tracks/kjerag.js';
import leithanien from './tracks/leithanien.js';
import victoria from './tracks/victoria.js';
import tara from './tracks/tara.js';
import kazimierz from './tracks/kazimierz.js';
import columbia from './tracks/columbia.js';
import siracusa from './tracks/siracusa.js';
import laterano from './tracks/laterano.js';
import iberia from './tracks/iberia.js';
import aegir from './tracks/aegir.js';
import minos from './tracks/minos.js';
import sargon from './tracks/sargon.js';
import bolivar from './tracks/bolivar.js';
import rim from './tracks/rim.js';
import kazdel from './tracks/kazdel.js';
import durin from './tracks/durin.js';
import rhodes from './tracks/rhodes.js';
import common from './tracks/common.js';
import { dispatchPack } from './_dispatch.js';
import adultFamily from './adult_family.js';
import adultMoney from './adult_money.js';
import adultInfected from './adult_infected.js';
import elder from './elder.js';
import bigevents from './bigevents.js';

export const nationPacks = { yan, lungmen, higashi, ursus, sami, kjerag, leithanien, victoria, tara, kazimierz, columbia, siracusa, laterano, iberia, aegir, minos, sargon, bolivar, rim, kazdel, durin };
export const packs = [childhood, school, ...Object.values(nationPacks), rhodes, common, dispatchPack(), adultFamily, adultMoney, adultInfected, elder, bigevents];

/** createRegistry().use(...) 에 차례로 넣는다 */
export function install(registry) {
  for (const p of packs) registry.use(p);
  return registry;
}

export default { install, packs, nationPacks };

// W2 더미 콘텐츠: 이벤트 10개 · 결정 5개 · 대사건 1개. 문구는 전부 임시(W4가 교체).
// 콜백은 전부 ctx(sim)를 첫 인자로 받는다 — src/engine/content.js 상단 스키마 참조.
import { infect } from '../src/engine/oripathy.js';
import { retire } from '../src/engine/finance.js';

export const events = [
  { id: 'kidsick', a: [0, 4], w: 40, rep: true,
    c: (s) => s.rng.chance(Math.min(0.6, 0.06 + s.nation.stats.u5 / 400) * [1.4, 1.2, 1, 0.8, 0.6][s.S.q - 1]),
    run: (s) => ({ t: '열병을 앓았습니다. 며칠을 울었고, 어머니는 더 오래 울었습니다.', k: 'bad', fx: { hl: -4 }, f: '(로도스 아일랜드 의료부 연보, 1098)' }) },
  { id: 'firststep', a: [1, 2], w: 10,
    run: (s) => ({ t: '첫걸음을 뗐습니다.', k: 'warm', fx: { h: 2 } }) },
  { id: 'school_friend', a: [6, 14], tags: ['school'], w: 20, rep: true,
    run: (s) => ({ t: '학교에서 친구를 사귀었습니다.', k: 'warm', fx: { so: 3, h: 2 } }) },
  { id: 'ori_rumor', a: [8, 90], w: 8, gap: 4, c: (s) => s.nation.oriExp >= 2,
    run: (s) => ({ t: '이웃이 어느 날 사라졌습니다. 격리구역으로 갔다는 소문이었습니다.', k: 'note', fx: { h: -2 }, f: '(' + s.nation.name + ' 치안 통계, 미공개)' }) },
  { id: 'forecaster_wrong', a: [5, 95], w: 6, gap: 3, c: (s) => s.nation.catFreq >= 2,
    run: (s) => { s.S.flags.badForecast = true; return { t: '재앙 정보 전달자가 경로를 잘못 읽었다는 말이 돌았습니다.', k: 'note', fx: { h: -1 }, f: '(재앙 정보 전달자 협회, "오차는 있을 수 있음")' }; } },
  { id: 'nomad_move', a: [0, 95], tags: ['nomadic'], w: 10, gap: 5,
    run: (s) => ({ t: '이동도시가 새 좌표로 떠났습니다. 창밖 풍경만 바뀌었습니다.', k: 'note', fx: { h: 1 } }) },
  { id: 'overwork', a: [18, 64], w: 12, gap: 2, c: (s) => !!s.S.job,
    run: (s) => ({ t: '올해는 쉬는 날이 거의 없었습니다.', k: 'bad', fx: { hl: -3, money: Math.round(s.S.income * 0.05) } }) },
  { id: 'sarkaz_slur', a: [6, 95], tags: ['sarkaz'], w: 15, rep: true,
    run: (s) => ({ t: '뿔 때문에 가게에서 쫓겨났습니다. 이유는 묻지 않았습니다.', k: 'bad', fx: { so: -3, h: -3 }, f: '(출처: 본 시뮬레이션이 지어냄)' }) },
  { id: 'rhodes_poster', a: [12, 70], tags: ['known', '!rhodes'], w: 10, gap: 3,
    run: (s) => { if (s.rng.chance(0.3)) { s.S.rhodes = true; s.S.ori.treated = true; s.S.flags.rhodesAt = s.S.age; return { t: '로도스 아일랜드 모집 공고를 보고 연락했습니다. 합류했습니다.', k: 'warm' }; }
      return { t: '로도스 아일랜드 모집 공고를 봤습니다. 연락하지는 않았습니다.', k: 'note' }; } },
  { id: 'harvest_good', a: [16, 70], tags: ['rural'], w: 10, gap: 2, c: (s) => !!s.S.job,
    run: (s) => ({ t: '수확이 좋았습니다.', k: 'warm', fx: { money: Math.round(s.med * 0.1), h: 2 } }) },
  { id: 'arts_spark', a: [6, 14], w: 20, c: (s) => s.S.arts >= 1.28 && !s.S.flags.artsNoticed,
    run: (s) => { s.S.flags.artsNoticed = true; return { t: '손끝에서 오리지늄 가루가 빛났습니다. 어른들이 한참 쳐다봤습니다.', k: 'big', f: '(아츠 적성 상위 10%)' }; } },
];

export const decisions = {
  temper: {
    ok: (s) => s.S.age === 2,
    build: (s) => ({ title: '두 살', body: '아이는 어떤 기질을 보였습니까.', choices: [
      { k: 'cur', label: '호기심', sub: '지식 +' }, { k: 'act', label: '활달함', sub: '건강 +' },
      { k: 'warm', label: '다정함', sub: '관계 +' }, { k: 'grit', label: '끈기', sub: '행복 +' }] }),
    apply: (s, k) => { s.S.trait = k; const fx = { cur: { sm: 3 }, act: { hl: 3 }, warm: { so: 3 }, grit: { h: 3 } }[k]; return { t: '기질이 자리 잡았습니다.', fx }; },
  },
  school15: {
    ok: (s) => s.S.age === 15 && s.S.school === 'lsec',
    build: (s) => {
      const ch = [{ k: 'usec', label: '진학', sub: '18세까지 학교' }, { k: 'work', label: '취업', sub: '바로 일하기' }];
      if (s.S.q >= 3 || s.S.money > s.med * 3) ch.push({ k: 'uni', label: '대학까지', sub: '22세까지, 돈이 듭니다' });
      if (s.S.arts >= 1.28) ch.push({ k: 'caster', label: '아츠 수련', sub: '20세까지, 캐스터 루트', auto: 2 });
      return { title: '열다섯', body: '학교를 계속 다닐지 정해야 합니다.', fact: '(' + s.nation.name + ' 교육 통계, 임시)', choices: ch };
    },
    apply: (s, k) => {
      const S = s.S;
      if (k === 'usec') { S.school = 'usec'; S.eduEnd = 18; return '상급 학교에 진학했습니다.'; }
      if (k === 'uni') { S.school = 'usec'; S.eduEnd = 18; S.flags.uniPlanned = true; S.money -= Math.round(s.med * 0.5); return '대학까지 가기로 했습니다.'; }
      if (k === 'caster') { S.school = 'caster'; S.eduEnd = 20; return '아츠 수련 과정에 들어갔습니다.'; }
      S.school = null; S.eduEnd = 15; return '학교를 그만두고 일을 찾기로 했습니다.';
    },
  },
  draft18: {
    ok: (s) => s.S.age === 18 && s.nation.conscript === 'draft' && !s.S.served && !s.S.serving && !s.S.prison && !(s.S.ori.known && s.S.ori.stage >= 2),
    build: (s) => ({ title: '징집 통지', body: '복무 통지서가 왔습니다.' + (s.S.flags.war ? ' 전시입니다. 거부할 수 없습니다.' : ''), fact: '(' + s.nation.name + ' 병무 조례, 임시)',
      choices: s.S.flags.war ? [{ k: 'serve', label: '입대' }] : [
        { k: 'serve', label: '입대', sub: '3년', auto: 3 }, { k: 'dodge', label: '기피', sub: '들키면 투옥' }, { k: 'pay', label: '면제 비용', sub: '돈이 듭니다', auto: 0.5 }] }),
    apply: (s, k) => {
      const S = s.S;
      if (k === 'serve') { S.serving = 3; S.job = null; S.school = null; return '입대했습니다.'; }
      if (k === 'pay') { S.money -= Math.round(s.med * 1.5); return '면제 비용을 냈습니다.'; }
      S.flags.dodger = true;
      if (s.rng.chance(0.3)) { S.prison = 'jail'; S.prisonLeft = 1; S.money -= Math.round(s.med * 0.5); return { t: '기피하다 붙잡혀 1년을 복역했습니다.', k: 'bad' }; }
      return '통지서를 모른 척했습니다.';
    },
  },
  oridiag: {
    ok: (s) => !!s.S.flags.oriDiagPending,
    build: (s) => {
      const o = s.S.flags.oriOutcome;
      const ch = [{ k: 'accept', label: '받아들이기', sub: '현 상태 유지' }];
      if (o !== 'camp' && o !== 'expel') ch.push({ k: 'hide', label: '숨기기', sub: '들키면 더 나쁩니다' });
      if (!s.S.rhodes) ch.push({ k: 'rhodes', label: '로도스 찾기', sub: '소문으로만 들은 제약회사', auto: 1.5 });
      return { title: '판정 이후', body: '정책: ' + s.S.flags.oriPolicy + ' / 결과: ' + o + '. 어떻게 하시겠습니까.', fact: '(임시 문구)', choices: ch };
    },
    apply: (s, k) => {
      const S = s.S; S.flags.oriDiagPending = false;
      if (k === 'hide') { S.flags.oriHidden = true; S.flags.quarantined = false; S.flags.noMove = false; return '기록을 숨기고 평소처럼 살기로 했습니다.'; }
      if (k === 'rhodes') { if (s.rng.chance(0.4)) { S.rhodes = true; S.ori.treated = true; S.flags.rhodesAt = S.age; return { t: '로도스 아일랜드와 닿았습니다. 치료를 받습니다.', k: 'warm' }; } return '연락이 닿지 않았습니다.'; }
      return '받아들였습니다.';
    },
  },
  retire65: {
    ok: (s) => !!s.S.job && !s.S.retired && s.S.age >= Math.round(15 + 50 * s.race.lifeMul),
    build: (s) => ({ title: '은퇴', body: '몸이 예전 같지 않습니다.', choices: [{ k: 'retire', label: '은퇴', auto: 2 }, { k: 'keep', label: '계속 일하기', sub: '건강 −' }] }),
    apply: (s, k) => { if (k === 'retire') { retire(s); return false; } s.S.flags.workLate = true; return '조금 더 일하기로 했습니다.'; },
  },
};

export const big = [
  { id: 'chernobog', nation: 'ursus', year: 1096, month: 12, a: [0, 300],
    run: (s) => {
      const r = s.rng.rnd();
      if (r < 0.015) { s.die('catastrophe', '체르노보그 재앙'); return; }
      if (r < 0.065) { if (!s.S.ori.on) infect(s, 'chernobog'); else s.S.ori.uL = +(s.S.ori.uL + 0.1).toFixed(3); return { t: '체르노보그가 재앙에 삼켜졌습니다. 잔류 오리지늄이 바람을 타고 왔습니다.', k: 'big', f: '(테라력 1096년 12월)' }; }
      if (r < 0.45) return { t: '체르노보그가 재앙에 삼켜졌다는 소식이 왔습니다. 친척 하나가 연락이 끊겼습니다.', k: 'big', fx: { h: -5, money: -Math.round(s.S.money * 0.1) }, f: '(테라력 1096년 12월)' };
      return { t: '체르노보그가 재앙에 삼켜졌다는 소식이 왔습니다. 먼 곳의 일이었습니다.', k: 'big', f: '(테라력 1096년 12월)' };
    } },
];

export default { events, decisions, big };

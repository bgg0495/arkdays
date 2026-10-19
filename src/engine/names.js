// 이름 생성: names.json 의 언어 풀 { o, sep, m, f, s, raceRule?, pat?, femSurname?, noble?, doubleSurname? } 규칙을 따른다.
// o = gf(이름 성) / fg(성 이름) / pat(이름 부칭 성) / mono(이름만). 풀이 없으면 _default → 아무 풀.

export function poolFor(data, lang) {
  const n = data.names || {};
  return n[lang] || n._default || Object.values(n).find((p) => p && Array.isArray(p.m)) || { m: ['이름'], f: ['이름'], s: ['성'], o: 'gf', sep: ' ' };
}

/** 가족 안에서 이미 쓰인 이름(given) 집합: 본인·부모·배우자·자녀. 새 이름을 뽑을 때 avoid 로 넘긴다 */
export function familyNames(S) {
  const set = new Set();
  if (!S) return set;
  if (S.name && S.name.given) set.add(S.name.given);
  const f = S.fam || {};
  for (const p of [f.mom, f.dad, f.partner]) if (p && p.name) set.add(p.name);
  for (const k of f.kids || []) if (k && k.name) set.add(k.name);
  for (const s of f.sibs || []) if (s && s.name) set.add(s.name);
  return set;
}

/**
 * makeName(data, rng, { lang, sex, race?, q?, father?, avoid? })  → { given, family, full, lang }
 * father: 아버지 이름(given) — 부칭(pat) 조합에 사용
 * avoid: 피할 이름(given) 집합(가족 내 중복 방지). 풀이 다 겹치면 마지막 추첨값을 그대로 쓴다
 */
export function makeName(data, rng, { lang, sex, race, q = 3, father, avoid } = {}) {
  const pool = poolFor(data, lang);
  const o = (pool.raceRule && race && pool.raceRule[race]) || pool.o || 'gf';
  const sep = pool.sep ?? ' ';
  const givens = sex === 'F' ? (pool.f || pool.m) : (pool.m || pool.f);
  let given = rng.pick(givens);
  if (avoid && avoid.size) {
    for (let i = 0; i < 12 && avoid.has(given); i++) given = rng.pick(givens);
  }
  let family = rng.pick(pool.s || ['성']);
  const shortGiven = [...given].length <= 1;   // 염국·용문식 외자 이름은 성을 붙여 부른다("거" → "임거")
  if (sex === 'F' && Array.isArray(pool.femSurname)) {
    for (const [end, repl] of pool.femSurname) if (family.endsWith(end)) { family = family.slice(0, -end.length) + repl; break; }
  }
  if (pool.noble && q >= 5 && rng.chance(pool.noble.p ?? 0)) family = (pool.noble.prefix || '') + family;
  if (pool.doubleSurname && rng.chance(pool.doubleSurname.p ?? 0)) family = family + ' ' + rng.pick(pool.s);
  let full;
  if (o === 'mono') full = given;
  else if (o === 'fg') full = family + sep + given;
  else if (o === 'pat' && Array.isArray(pool.pat) && pool.pat.length) {
    const e = pool.pat.find((p) => p.base === father) || rng.pick(pool.pat);
    full = given + sep + (sex === 'F' ? e.f : e.m) + sep + family;
  } else full = given + sep + family;
  if (shortGiven && o !== 'mono') given = o === 'fg' ? family + sep + given : given + sep + family;
  return { given, family, full, lang: lang || null };
}

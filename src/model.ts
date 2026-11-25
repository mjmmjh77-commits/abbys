export const LEGACY_KEY = 'abyss-fishing-v1';
export const KEY = 'abyss-fishing-v2';
import { species, seas, catchWeights, type Layer } from './catalog.ts';
export { species, seas, type Layer } from './catalog.ts';
export const ranks = ['일반', '고급', '희귀', '특급', '영웅', '전설', '신화', '고대', '초월', '심연'];
export const colors = [
  '#a7cec6',
  '#72d7ad',
  '#69bce8',
  '#7894ff',
  '#bc9aea',
  '#f5cf77',
  '#ff9b67',
  '#ff6f91',
  '#ec7bf1',
  '#f8e5a2',
];
export interface Save {
  version: 2;
  layer: Layer;
  line: boolean[];
  reel: boolean[];
  unlocked: boolean[];
  survey: number[];
  deepCaught: number[];
  maxCm: number[];
  tradable: number[];
  misses: number;
  bossMisses: number[];
  guided: boolean;
  gold: number;
  rod: number;
  boat: number;
  sea: number;
  counts: number[];
  shiny: number[];
  caught: number[];
  bosses: boolean[];
  claimed: boolean[];
  netReady: number;
  sound: boolean;
  captainLevel: number;
  captainXp: number;
  questDay: string;
  questFish: number;
  questRare: number;
  questNew: number;
  questKinds: number[];
  questClaimed: boolean[];
  runClears: number;
  bestRun: number;
  fishLevel: number[];
  fishSpent: number[];
  fishFailures: number[];
  fishBought: number[];
  marketDay: string;
  marketBought: number[];
  rodFish: number;
}
export const fresh = (): Save => ({
  version: 2,
  layer: 'shallow',
  line: seas.map(() => false),
  reel: seas.map(() => false),
  unlocked: seas.map((_, i) => i === 0),
  survey: seas.map(() => 0),
  deepCaught: seas.map(() => 0),
  maxCm: species.map(() => 0),
  tradable: species.map(() => 0),
  misses: 0,
  bossMisses: seas.map(() => 0),
  guided: false,
  gold: 100,
  rod: 0,
  boat: 0,
  sea: 0,
  counts: Array(species.length).fill(0),
  shiny: Array(species.length).fill(0),
  caught: Array(seas.length).fill(0),
  bosses: Array(seas.length).fill(false),
  claimed: Array(seas.length).fill(false),
  netReady: 0,
  sound: false,
  captainLevel: 1,
  captainXp: 0,
  questDay: '',
  questFish: 0,
  questRare: 0,
  questNew: 0,
  questKinds: [],
  questClaimed: Array(3).fill(false),
  runClears: 0,
  bestRun: 0,
  fishLevel: Array(species.length).fill(0),
  fishSpent: Array(species.length).fill(0),
  fishFailures: Array(species.length).fill(0),
  fishBought: Array(species.length).fill(0),
  marketDay: '',
  marketBought: Array(species.length).fill(0),
  rodFish: -1,
});
/** Validate a complete snapshot before replacing any existing save. Older optional fields use defaults. */
export function parseSave(text: string | null): Save {
  const base = fresh();
  if (text === null) return base;
  const x = JSON.parse(text);
  const invalid = () => {
    throw Error('저장 기록의 형식 또는 값이 올바르지 않습니다.');
  };
  if (!x || ![1, 2].includes(x.version)) return invalid();
  const legacy = x.version === 1;
  const extra = [
    'line',
    'reel',
    'unlocked',
    'survey',
    'deepCaught',
    'maxCm',
    'tradable',
    'misses',
    'bossMisses',
    'guided',
    'layer',
  ];
  for (const [key, initial] of Object.entries(base)) {
    if (key === 'version' || (legacy && extra.includes(key))) continue;
    const value = x[key];
    if (
      value === undefined &&
      legacy &&
      !['gold', 'rod', 'boat', 'sea', 'counts', 'shiny', 'caught', 'bosses', 'claimed'].includes(key)
    )
      continue;
    let valid = false;
    const natural = (n: unknown) => Number.isSafeInteger(n) && Number(n) >= 0;
    if (Array.isArray(initial)) {
      valid =
        Array.isArray(value) &&
        (key === 'questKinds' || value.length === initial.length) &&
        value.every((v: unknown) =>
          typeof initial[0] === 'boolean' ? typeof v === 'boolean' : natural(v),
        );
    } else if (key === 'layer') valid = value === 'shallow' || value === 'deep';
    else if (key === 'rodFish') valid = Number.isInteger(value) && value >= -1 && value < species.length;
    else valid = typeof initial === 'number' ? natural(value) : typeof value === typeof initial;
    if (!valid) return invalid();
    Object.assign(base, { [key]: value });
  }
  if (
    base.rod > 4 ||
    base.boat > 4 ||
    !seas[base.sea] ||
    base.captainLevel < 1 ||
    base.fishLevel.some((n) => n > 11) ||
    base.questKinds.some((n) => !species[n]) ||
    base.fishSpent.some((n, i) => n > base.counts[i] + base.fishBought[i]) ||
    base.shiny.some((n, i) => n > base.counts[i]) ||
    (base.rodFish >= 0 && (!fishCards(base, base.rodFish) || !base.fishLevel[base.rodFish]))
  )
    return invalid();
  if (legacy) {
    base.unlocked = seas.map(
      (_, i) => i === 0 || i === base.sea || !!base.bosses[i] || !!base.bosses[i - 1],
    );
    if (x.captainXp === undefined && x.captainLevel === undefined) {
      const xp =
        base.counts.reduce(
          (sum, n, id) =>
            sum + n * (10 + species[id].rank * 9 + species[id].sea * 4) + base.shiny[id] * 35,
          0,
        ) + base.bosses.reduce((sum, won, i) => sum + (won ? 180 + i * 80 : 0), 0);
      grantCaptainXp(base, xp);
    }
    base.line = [...base.bosses];
    base.tradable = species.map((f) => fishCopies(base, f.id));
  } else if (
    !base.unlocked[0] ||
    !base.unlocked[base.sea] ||
    (base.layer === 'deep' && !base.line[base.sea]) ||
    base.deepCaught.some((n, i) => n > base.survey[i] || (n > 0 && !base.line[i])) ||
    base.tradable.some((n, i) => n > fishCards(base, i))
  )
    return invalid();
  return base;
}
type StoragePort = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;
export function storeSave(storage: StoragePort, state: Save) {
  const encoded = JSON.stringify(state);
  parseSave(encoded);
  const previous = storage.getItem(KEY);
  storage.setItem(KEY, encoded);
  try {
    if (storage.getItem(KEY) !== encoded) throw Error();
  } catch {
    if (previous === null) storage.removeItem(KEY);
    else storage.setItem(KEY, previous);
    throw Error('새 저장을 확인하지 못했습니다.');
  }
}
export function loadSave(storage: StoragePort) {
  const current = storage.getItem(KEY);
  if (current !== null) return parseSave(current);
  const state = parseSave(storage.getItem(LEGACY_KEY));
  storeSave(storage, state);
  return state;
}
export const xpForNextLevel = (level: number) => 100 + Math.max(0, level - 1) * 40;
export function grantCaptainXp(s: Save, amount: number): number {
  let levels = 0;
  s.captainXp += Math.max(0, Math.floor(amount));
  while (s.captainXp >= xpForNextLevel(s.captainLevel)) {
    s.captainXp -= xpForNextLevel(s.captainLevel);
    s.captainLevel++;
    levels++;
  }
  return levels;
}
export function syncDailyQuests(s: Save, day = new Date().toLocaleDateString('sv-SE')) {
  if (s.questDay === day) return false;
  s.questDay = day;
  s.questFish = 0;
  s.questRare = 0;
  s.questNew = 0;
  s.questKinds = [];
  s.questClaimed = Array(3).fill(false);
  return true;
}
export const prices = [250, 700, 1600, 3200];
export const boatPrices = [280, 780, 1700, 3400];
export const upgradePrice = (s: Save, kind: 'rod' | 'boat') =>
  (kind === 'rod' ? prices : boatPrices)[s[kind]];
export const netCooldown = (s: Save) => [18, 15, 12, 9, 7][s.boat];
export const netCount = (s: Save) =>
  Math.min(2 + s.boat, Math.max(1, Math.floor((seas[s.sea].floor * 0.3 * netCooldown(s)) / 15)));
export function netHaul(s: Save, rng = Math.random) {
  const count = netCount(s);
  const ids = Array.from({ length: count }, () => pickFish(s.sea, s.layer, rng, true));
  const gain = ids.reduce((sum, id) => sum + settleCatch(s, id, false, 'net', rng).gain, 0);
  return { ids, gain };
}
export const fishCards = (s: Save, id: number) =>
  Math.max(0, (s.counts[id] ?? 0) + (s.fishBought[id] ?? 0) - (s.fishSpent[id] ?? 0));
export const fishCopies = (s: Save, id: number) => Math.max(0, fishCards(s, id) - 1);
export const fishEnhanceChance = (
  level: number,
  failures: number,
  materials: number[] = [],
  targetId = -1,
) =>
  Math.min(
    0.97,
    [0.92, 0.84, 0.76, 0.68, 0.6, 0.52, 0.44, 0.36, 0.28, 0.2, 0.12][Math.min(10, Math.max(0, level))] +
      Math.min(0.6, Math.max(0, failures) * 0.12) +
      materials.reduce(
        (sum, materialId) =>
          sum + 0.1 + species[materialId].rank * 0.025 + (materialId === targetId ? 0.05 : 0),
        0,
      ),
  );
export function enhanceFish(s: Save, id: number, materials: number[], rng = Math.random) {
  if (
    id < 0 ||
    id >= species.length ||
    fishCards(s, id) < 1 ||
    s.fishLevel[id] >= 11 ||
    materials.length < 1 ||
    materials.length > 3
  )
    return null;
  const used = new Map<number, number>();
  for (const materialId of materials) {
    if (materialId < 0 || materialId >= species.length) return null;
    used.set(materialId, (used.get(materialId) ?? 0) + 1);
  }
  for (const [materialId, count] of used) if (fishCopies(s, materialId) < count) return null;
  const previousLevel = s.fishLevel[id],
    chance = fishEnhanceChance(previousLevel, s.fishFailures[id], materials, id);
  for (const [materialId, count] of used) {
    s.fishSpent[materialId] += count;
    s.tradable[materialId] = Math.min(s.tradable[materialId], fishCards(s, materialId));
  }
  const success = rng() < chance;
  let detached = false;
  if (success) {
    s.fishLevel[id] = previousLevel + 1;
    s.fishFailures[id] = 0;
  } else {
    s.fishLevel[id] = Math.max(0, previousLevel - 1);
    s.fishFailures[id]++;
    if (s.rodFish === id && s.fishLevel[id] === 0) {
      s.rodFish = -1;
      detached = true;
    }
  }
  return {
    success,
    chance,
    previousLevel,
    level: s.fishLevel[id],
    levelDropped: s.fishLevel[id] < previousLevel,
    copies: fishCopies(s, id),
    materials: materials.length,
    detached,
  };
}
const marketHash = (value: string) => {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) hash = Math.imul(hash ^ value.charCodeAt(i), 16777619);
  return hash >>> 0;
};
export const marketDayKey = (now = Date.now()) => new Date(now).toLocaleDateString('sv-SE');
export function marketQuote(id: number, now = Date.now()) {
  const fish = species[id];
  if (!fish) return { price: 0, change: 0, base: 0 };
  const day = marketDayKey(now),
    tick = Math.floor(now / 60_000) % 1440,
    seed = marketHash(`${day}:${id}`) / 0xffffffff,
    base = Math.round((fish.value + 45) * (1 + fish.rank * 0.42 + fish.sea * 0.05));
  const wave = (minute: number) =>
    0.16 * Math.sin(minute * 0.22 + id * 1.71) +
    0.09 * Math.sin(minute * 0.074 + id * 2.37) +
    (seed - 0.5) * 0.12;
  const price = Math.max(1, Math.round(base * (1 + wave(tick)))),
    previous = Math.max(1, Math.round(base * (1 + wave((tick + 1439) % 1440))));
  return { price, change: Math.round(((price - previous) / previous) * 1000) / 10, base };
}
export function marketDailyStock(id: number, now = Date.now()) {
  return 3 + (marketHash(`${marketDayKey(now)}:${id}:supply`) % 6);
}
export function marketRemaining(s: Save, id: number, now = Date.now()) {
  return Math.max(
    0,
    marketDailyStock(id, now) - (s.marketDay === marketDayKey(now) ? (s.marketBought[id] ?? 0) : 0),
  );
}
export function syncMarket(s: Save, day = marketDayKey()) {
  if (s.marketDay === day) return false;
  s.marketDay = day;
  s.marketBought = Array(species.length).fill(0);
  return true;
}
export function buyFish(s: Save, id: number, quantity = 1, now = Date.now()) {
  if (id < 0 || id >= species.length || !Number.isInteger(quantity) || quantity < 1 || quantity > 3)
    return null;
  syncMarket(s, marketDayKey(now));
  const remaining = marketRemaining(s, id, now),
    unitPrice = marketQuote(id, now).price,
    cost = unitPrice * quantity;
  if (remaining < quantity || s.gold < cost) return null;
  s.gold -= cost;
  s.fishBought[id] += quantity;
  s.tradable[id] += quantity;
  s.marketBought[id] += quantity;
  return { quantity, unitPrice, cost, remaining: remaining - quantity };
}
export function sellFish(s: Save, id: number, quantity = 1, now = Date.now()) {
  if (
    id < 0 ||
    id >= species.length ||
    !Number.isInteger(quantity) ||
    quantity < 1 ||
    Math.min(s.tradable[id], fishCopies(s, id)) < quantity
  )
    return null;
  const unitPrice = Math.max(1, Math.round(marketQuote(id, now).price * 0.72));
  s.fishSpent[id] += quantity;
  s.tradable[id] -= quantity;
  s.gold += unitPrice * quantity;
  return { quantity, unitPrice, gain: unitPrice * quantity };
}
export function upgrade(s: Save, kind: 'rod' | 'boat'): boolean {
  if (s[kind] >= 4 || s.gold < upgradePrice(s, kind)) return false;
  s.gold -= upgradePrice(s, kind);
  s[kind]++;
  return true;
}
export function canTravel(s: Save, to: number) {
  return s.unlocked[to] === true;
}
export function buyGear(s: Save, kind: 'line' | 'reel') {
  const sea = seas[s.sea],
    price = kind === 'line' ? sea.lineCost : sea.reelCost;
  if (s[kind][s.sea] || s.gold < price) return false;
  s.gold -= price;
  s[kind][s.sea] = true;
  return true;
}
export const holdGrace = (s: Save) => s.reel.filter(Boolean).length * 0.1;
export const reelGrace = (s: Save) => Math.min(0.8, s.reel.filter(Boolean).length * 0.2);
export function canFish(s: Save, layer: Layer, depth: number) {
  const sea = seas[s.sea];
  return layer === 'deep'
    ? s.line[s.sea] && depth >= sea.boundary && depth <= sea.end
    : depth >= sea.start && depth <= sea.boundary;
}
export const bossReady = (s: Save) =>
  s.bosses[s.sea] || (s.survey[s.sea] >= seas[s.sea].target && s.deepCaught[s.sea] > 0);
export function salePrice(id: number, cm: number, shiny = false) {
  const f = species[id],
    ratio = Math.max(0, Math.min(1, (cm - f.minCm) / (f.maxCm - f.minCm)));
  return Math.max(seas[f.sea].floor, Math.round(f.value * (0.8 + 0.5 * ratio))) * (shiny ? 4 : 1);
}
export function settleCatch(
  s: Save,
  id: number,
  shiny: boolean,
  source: 'manual' | 'net' | 'expedition',
  rng = Math.random,
) {
  const f = species[id],
    sea = seas[f.sea];
  if (
    source !== 'expedition' &&
    (s.sea !== f.sea || !sea[s.layer].includes(id) || (s.layer === 'deep' && !s.line[s.sea]))
  )
    throw Error('현재 수심의 어종이 아닙니다.');
  const cm = f.minCm + Math.round(rng() * (f.maxCm - f.minCm));
  const gain =
    source === 'net'
      ? Math.max(1, Math.floor((sea.floor * 0.3 * netCooldown(s)) / (15 * (2 + s.boat))))
      : salePrice(id, cm, shiny);
  syncDailyQuests(s);
  const isNew = s.counts[id] === 0;
  s.counts[id]++;
  s.caught[f.sea]++;
  s.gold += gain;
  s.questFish++;
  s.maxCm[id] = Math.max(s.maxCm[id], cm);
  if (shiny) s.shiny[id]++;
  if (f.rank >= 2) s.questRare++;
  if (isNew) s.questNew++;
  if (!s.questKinds.includes(id)) s.questKinds.push(id);
  if (source === 'manual') {
    s.survey[f.sea]++;
    if (s.layer === 'deep') s.deepCaught[f.sea]++;
    s.misses = 0;
  }
  return { gain, cm };
}
export function defeatBoss(s: Save) {
  if (!bossReady(s)) return 0;
  const first = !s.bosses[s.sea];
  s.bosses[s.sea] = true;
  s.bossMisses[s.sea] = 0;
  if (s.sea + 1 < seas.length) s.unlocked[s.sea + 1] = true;
  const gain = first ? seas[s.sea].reward : 0;
  s.gold += gain;
  return gain;
}
export function claimResearch(s: Save): number {
  const i = s.sea;
  if (s.claimed[i] || species.filter((f) => f.sea === i && s.counts[f.id] > 0).length < 5) return 0;
  s.claimed[i] = true;
  const amount = 150 * (i + 1);
  s.gold += amount;
  return amount;
}
export function pickFish(sea: number, layer: Layer = 'shallow', rng = Math.random, commonOnly = false) {
  const pool = seas[sea][layer].filter((id) => !commonOnly || species[id].rank < 2);
  const weights = pool.map((id) => catchWeights[species[id].rank]);
  let roll = rng() * weights.reduce((a, b) => a + b, 0);
  for (const [i, w] of weights.entries()) {
    roll -= w;
    if (roll < 0) return pool[i];
  }
  return pool[pool.length - 1];
}
export function fishingRules(rank: number, sea: number, rod: number) {
  return {
    rounds: rank >= 9 ? 3 : rank >= 4 ? 2 : 1,
    zone: Math.max(
      0.12,
      Math.min(0.58, 0.39 + rod * 0.023 - rank * 0.024 + (sea === 0 ? 0.025 : 0) - sea * 0.004),
    ),
    speed: 0.7 + rank * 0.12 + sea * 0.05 + (sea === 1 ? 0.12 : 0),
    holdSeconds: 1.05 + rank * 0.17 + sea * 0.08,
    mode: (round: number) => seas[sea].modes[round % seas[sea].modes.length],
  };
}
export function comboBonus(value: number, combo: number) {
  return Math.round(value * Math.min(0.5, Math.max(0, combo - 1) * 0.05));
}

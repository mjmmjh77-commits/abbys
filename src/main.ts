import Phaser from 'phaser';
import './style.css';
import './fidelity.css';
import { Ocean } from './scene';
import { fishArt, gearArt } from './art';
import { SeaAudio, bossArt } from './effects';
import {
  KEY,
  LEGACY_KEY,
  loadSave,
  storeSave,
  fresh,
  parseSave,
  buyGear,
  bossReady,
  bossProgress,
  CORAL_CAST,
  coralTrailVisible,
  type CoralCast,
  type CastPoint,
  type Layer,
  TRAIL_REQUIRED_CATCHES,
  canFollowTrail,
  completeTrail,
  holdGrace,
  reelGrace,
  netCount,
  species,
  seas,
  ranks,
  colors,
  upgradePrice,
  fishingRules,
  comboBonus,
  upgrade,
  settleCatch,
  canTravel,
  netCooldown,
  defeatBoss,
  claimResearch,
  netHaul,
  grantCaptainXp,
  xpForNextLevel,
  syncDailyQuests,
  fishCards,
  fishCopies,
  fishEnhanceChance,
  enhanceFish,
  marketQuote,
  marketRemaining,
  marketDailyStock,
  marketDayKey,
  syncMarket,
  buyFish,
  sellFish,
  type Save,
} from './model';
let state: Save,
  storageBlocked = false;
try {
  state = loadSave(localStorage);
} catch {
  storageBlocked = true;
  try {
    state = parseSave(localStorage.getItem(KEY) ?? localStorage.getItem(LEGACY_KEY));
  } catch {
    state = fresh();
  }
}
const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const fmt = (n: number) => n.toLocaleString('ko-KR');
document.querySelector('#app')!.innerHTML = `<main class="shell">
<header class="topbar"><div class="brand"><div class="brand-mark">♆</div><div><strong>ABYSS</strong><small>THE DEEP SEA JOURNAL</small></div></div><button class="nav-btn active" id="home">항해 일지</button><button class="nav-btn expedition-nav" id="expedition">⚓ 심해 원정</button><button class="nav-btn forge-nav" id="fish-forge">🐟 어종 강화</button><button class="nav-btn market-nav" id="market">◈ 어시장</button><button class="nav-btn" id="book">물고기 도감 ↗</button><button class="nav-btn" id="ranking">선장 랭킹</button><button class="nav-btn" id="help">플레이 안내</button><div class="wallet"><span class="coin">◈</span><div><small>보유 골드</small><span id="gold"></span></div></div><button class="icon-btn" id="sound" aria-label="효과음 켜기">소리 OFF</button></header>
<section class="intro"><div><div class="eyebrow">A LITTLE BOAT. AN ENDLESS OCEAN.</div><h1>깊은 바다, 작은 모험 <span>낚시 일지</span></h1><p>느긋하게 낚고, 더 깊이 탐험하세요. 바다에는 아직 만나지 못한 이야기가 있습니다.</p></div><div class="weather">☀ 맑음 <span>잔잔한 파도</span><span id="save-status">● 자동 저장</span></div></section>
<div class="layout"><section><div class="ocean-card"><div class="ocean-head"><span class="live">LIVE EXPEDITION</span><span id="sea-code"></span><b id="sea-depth"></b></div><div class="viewport"><div id="game" aria-label="물고기를 클릭해 낚시하는 바다"></div><div class="sea-badge"><small id="sea-en"></small><span id="sea-name"></span></div><div class="depth-scale"><span>0 m ─</span><span>──</span><span>100 m ─</span><span>──</span><span>200 m ─</span></div><div class="scene-hint">물고기를 클릭하거나 아래 버튼으로 낚시를 시작하세요</div><div id="minigame" hidden></div></div><div class="depth-tools"><button id="goal"></button><div><button id="shallow">얕은 층</button><button id="deep">깊은 층</button></div></div><div class="below-ocean"><button class="cast-btn" id="cast">⌁ 낚싯줄 던지기</button><button class="net-btn" id="net">▦ 그물 내리기 <span id="net-label"></span></button><p>클릭 / 터치로 낚시 · SPACE로 시작<br>그물은 시간이 지나면 다시 사용할 수 있어요</p></div></div><div class="stats"><div class="stat"><i>⌁</i><div><small>누적 포획</small><strong id="total"></strong><em>마리</em></div></div><div class="stat"><i>▤</i><div><small>발견한 어종</small><strong id="discovered"></strong><em>/ ${species.length}종</em></div></div><div class="stat"><i>✧</i><div><small>희귀 변종</small><strong id="shiny-count"></strong><em>마리</em></div></div></div></section>
<aside class="sidebar"><section class="panel"><div class="panel-title">해역 탐사 <small>EXPEDITION</small></div><h2 class="mission-name" id="mission"></h2><p id="perk"></p><div class="bar-label"><span>보스 조우까지</span><span id="boss-progress"></span></div><div class="bar"><div id="boss-bar"></div></div><button class="boss-btn" id="boss"></button><button class="boss-btn" id="boss-help" hidden>연습 도움으로 도전</button><div class="research"><span id="research-text"></span><button id="research">보상 받기</button></div></section>
<section class="panel"><div class="panel-title">장비 공방 <small>WORKSHOP</small></div><div class="depth-shop"><button class="upgrade" id="line"></button><button class="upgrade" id="reel"></button></div><div class="gear-section"><div class="gear"><div class="gear-icon">⌁</div><div><strong id="rod-name"></strong><small id="rod-effect"></small></div></div><button class="upgrade" id="rod-up"><span>낚싯대 강화 ↑</span><span id="rod-price"></span></button></div><div class="gear-section"><div class="gear"><div class="gear-icon">⚓</div><div><strong id="boat-name"></strong><small id="boat-effect"></small></div></div><button class="upgrade" id="boat-up"><span>어선 강화 ↑</span><span id="boat-price"></span></button></div><div class="gear-section rod-fish-section"><div class="gear"><div class="gear-icon" id="rod-fish-icon">🐟</div><div><strong id="rod-fish-name">결합된 미페 없음</strong><small id="rod-fish-effect">강화한 물고기를 낚싯대에 장착하세요.</small></div></div><button class="upgrade" id="open-forge"><span>미페 강화 · 낚싯대 결합</span><span>열기 ↗</span></button></div></section>
<section class="panel"><div class="panel-title">다음 바다로 <small>NAVIGATION</small></div><p id="nav-description"></p><div class="sea-nav"><button id="prev">← 이전 해역</button><button id="next">다음 해역 →</button></div><p class="next-note" id="next-note"></p></section></aside></div>
<section class="journal"><span class="journal-label">RECENT DISCOVERIES</span><div class="catch-list" id="recent"></div><button id="open-log">전체 도감 보기 ↗</button></section><footer class="footer"><span>ABYSS / VOL. 01 — THE OCEAN IS CALLING</span><span>Phaser 4 · 브라우저에 진행 상황 자동 저장</span></footer></main><div id="toast" role="status"></div><dialog id="modal"><div class="modal-head"><div><h2 id="modal-title"></h2><p id="modal-desc"></p></div><button class="close" id="close-modal" aria-label="닫기">✕</button></div><div class="modal-body" id="modal-body"></div></dialog>`;
document.querySelector('.ocean-card')!.insertAdjacentHTML('afterend', `
  <section id="trail-panel" aria-labelledby="trail-title">
    <canvas id="trail-art" width="80" height="48" aria-hidden="true"></canvas>
    <div class="trail-copy"><small>해역 관찰 표본</small><strong id="trail-title"></strong>
      <p id="trail-clue"></p><span id="trail-progress"></span></div>
    <button id="trail-cast" type="button">흔적 따라 낚기</button>
  </section>`);
document.querySelector('.below-ocean')!.insertAdjacentHTML('beforebegin', `
  <div id="cast-chart" hidden>
    <div class="cast-points" role="group" aria-label="미끼를 던질 곳">
      <button id="aim-shoal" type="button">얕은 여울</button>
      <button id="aim-kelp" type="button">깊은 해초밭</button>
      <button id="aim-trail" type="button" hidden>말린 꼬리의 흔적</button>
    </div>
    <output id="cast-readout" aria-live="off"></output>
  </div>`);
$('cast').insertAdjacentHTML('beforebegin', '<button class="cast-btn" id="cast-aim" type="button" hidden>겨눈 곳에 던지기</button>');
$('net').insertAdjacentHTML('beforebegin', '<button id="bait-cancel" type="button" hidden>미끼 회수</button>');
const castHelp = document.querySelector<HTMLElement>('.below-ocean p')!;
const sceneHint = document.querySelector<HTMLElement>('.scene-hint')!;
const quickDepth = $('shallow').parentElement!;
quickDepth.setAttribute('role', 'group');
quickDepth.insertAdjacentHTML('afterbegin', '<span id="quick-depth-label" hidden>바로 낚기 수심</span>');
const missionPanel = document.querySelector('.sidebar .panel')!;
missionPanel.classList.add('exploration-panel');
document.querySelector('.stats')!.after(missionPanel);
missionPanel.insertAdjacentHTML(
  'afterend',
  '<section class="progression-panel" id="progression"><div class="captain-row"><div class="captain-badge">선장<br><strong id="captain-level">1</strong></div><div class="captain-main"><div class="captain-title"><strong>항해자 성장</strong><span id="xp-label"></span></div><div class="bar xp-bar"><div id="xp-fill"></div></div><small id="captain-next"></small></div><div class="streak-mark">✦<small>꾸준한<br>항해</small></div></div><div class="quest-heading"><strong>오늘의 의뢰</strong><span>매일 자정 갱신 · 보상 골드</span></div><div id="quest-list"></div></section>',
);
document.querySelector('.gear-icon')!.id = 'rod-icon';
document.querySelectorAll('.gear-icon')[1].id = 'boat-icon';
document
  .querySelector('.viewport')!
  .insertAdjacentHTML(
    'beforeend',
    '<div id="voyage" hidden><div class="eyebrow">EXPEDITION</div><strong id="voyage-name"></strong><span id="voyage-depth"></span><p id="voyage-note"></p></div>',
  );
document
  .querySelector('.sidebar .panel:last-child')!
  .insertAdjacentHTML('beforeend', '<div class="map-list" id="map-list"></div>');
const ocean = new Ocean();
ocean.layer = state.layer;
ocean.sea = state.sea;
new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'game',
  width: 960,
  height: 600,
  backgroundColor: '#10384f',
  pixelArt: true,
  antialias: false,
  scene: ocean,
  scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
  audio: { noAudio: true },
});
let busy = false,
  forgeAnimating = false,
  marketTimer: ReturnType<typeof setInterval> | null = null,
  toastTimer: ReturnType<typeof setTimeout>,
  frame = 0,
  activeCleanup: (() => void) | null = null;
let recent: number[] = [];
let currentAim: CoralCast | null = null;
let lastBaitAim: CastPoint | null = null;
let pendingBait: CoralCast | null = null;
const coralFishing = () => state.sea === 0 && !expeditionRun;
const habitatNames: Record<CoralCast['habitat'], string> = {
  shoal: '얕은 여울', edge: '해초밭 가장자리', kelp: '해초밭 안쪽', trail: '말린 꼬리의 흔적',
};
const pointNames = ['shoal', 'kelp', 'trail'] as const;
const game = $('game');
const seaAudio = new SeaAudio();
let combo = 0,
  lastCatch = 0;
type ExpeditionRun = {
  returnSea: number;
  sea: number;
  node: number;
  hull: number;
  haul: number;
  catches: number;
  relics: string[];
  usedRescue: boolean;
};
let expeditionRun: ExpeditionRun | null = null;
const relics = [
  { id: 'steady', name: '안정 릴', icon: '⌁', desc: '낚시 라운드가 줄고 포획 구역이 넓어집니다.' },
  {
    id: 'deepPurse',
    name: '진주 저금통',
    icon: '◈',
    desc: '원정 중 잡은 물고기의 골드가 35% 증가합니다.',
  },
  { id: 'rescue', name: '비상 부표', icon: '◉', desc: '첫 실패를 한 번 막고 선체를 지켜줍니다.' },
  { id: 'sonar', name: '심해 소나', icon: '⌖', desc: '위험 해류에서 더 높은 등급의 물고기를 찾습니다.' },
  {
    id: 'chart',
    name: '보스 항로도',
    icon: '▤',
    desc: '보스의 약점을 찾아 필요한 명중 횟수가 1회 줄어듭니다.',
  },
  {
    id: 'lucky',
    name: '달빛 미끼',
    icon: '✧',
    desc: '원정 낚시마다 황금 변종을 만날 확률이 높아집니다.',
  },
  { id: 'salvage', name: '보물 상자', icon: '▣', desc: '유물이 모두 모였습니다. 전리품 점수 +300.' },
];
function sound(hz = 440) {
  seaAudio.enabled = state.sound;
  seaAudio.tone(hz);
}
function toast(msg: string) {
  clearTimeout(toastTimer);
  $('toast').textContent = msg;
  $('toast').classList.add('show');
  toastTimer = setTimeout(() => $('toast').classList.remove('show'), 3600);
}
function save() {
  try {
    if (storageBlocked) {
      $('save-status').textContent = '저장 읽기 실패 · 원본 보존 중 · 안내에서 가져오기';
      return;
    }
    storeSave(localStorage, state);
    $('save-status').textContent = '● 자동 저장';
  } catch {
    $('save-status').textContent = '저장 실패 · 플레이 안내에서 기록 내보내기';
  }
}
function awardXp(amount: number) {
  const levels = grantCaptainXp(state, amount);
  const bonus = levels ? levels * (80 + state.captainLevel * 20) : 0;
  state.gold += bonus;
  return { levels, bonus };
}
function questSnapshot() {
  const allFound = state.counts.every((n) => n > 0);
  return {
    progress: [state.questFish, state.questRare, allFound ? state.questKinds.length : state.questNew],
    target: [5, 2, allFound ? 3 : 2],
    reward: [160, 240, 200],
    description: [
      '물고기 5마리 포획',
      '희귀 등급 이상 2마리 포획',
      allFound ? '오늘 서로 다른 어종 3종 포획' : '새 어종 2종 발견',
    ],
  };
}
function claimQuest(i: number) {
  if (busy || expeditionRun) return;
  const q = questSnapshot();
  if (state.questClaimed[i] || q.progress[i] < q.target[i]) return;
  state.questClaimed[i] = true;
  state.gold += q.reward[i];
  const level = awardXp(35 + i * 10);
  save();
  refresh();
  toast(
    `의뢰 완료! +${q.reward[i]} G · +${35 + i * 10} XP${level.levels ? ` · 선장 Lv.${state.captainLevel} 달성! +${level.bonus} G` : ''}`,
  );
  sound(760);
}
function refreshTrail() {
  const panel = $('trail-panel');
  panel.hidden = !!expeditionRun;
  if (expeditionRun) return;
  const sea = seas[state.sea], fish = species[sea.trailId];
  const complete = state.trailCompleted[state.sea], ready = state.sea === 0 ? coralTrailVisible(state) : canFollowTrail(state);
  panel.dataset.state = complete ? 'complete' : ready ? 'ready' : state.line[state.sea] ? 'search' : 'locked';
  const portrait = $<HTMLCanvasElement>('trail-art'), ctx = portrait.getContext('2d')!;
  ctx.clearRect(0, 0, portrait.width, portrait.height);
  ctx.drawImage(fishArt(fish.shape, fish.hue), 0, 0);
  $('trail-title').textContent = complete ? fish.name + ' · 관찰 완료' : sea.name + '의 흔적';
  $('trail-clue').textContent = sea.trailClue;
  $('trail-progress').textContent = complete
    ? `도감에 기록 · 해역 표본 ${state.trailCompleted.filter(Boolean).length}/${seas.length}`
    : !state.line[state.sea] ? `낚싯줄 ${fmt(sea.end)} m 강화 후 조사 가능`
    : state.sea === 0 && ready ? '해초가 흔들린 곳을 겨누세요 · 말린 꼬리의 흔적 발견!'
    : state.sea !== 0 && state.layer !== 'deep' ? '깊은 층을 선택해 흔적을 조사하세요.'
    : `깊은 층 수동 포획 ${Math.min(TRAIL_REQUIRED_CATCHES, state.deepCaught[state.sea])}/${TRAIL_REQUIRED_CATCHES} · ${ready ? '흔적 발견!' : '어종을 조사하는 중'}`;
  const button = $<HTMLButtonElement>('trail-cast');
  button.disabled = busy || !ready;
  button.textContent = complete ? '관찰 완료' : '흔적 따라 낚기';
}
function showAim(plan: CoralCast) {
  currentAim = plan;
  const readout = pendingBait ?? plan;
  $('cast-readout').textContent = pendingBait
    ? `입질 기다리는 중 · ${habitatNames[readout.habitat]}`
    : `${readout.range} m 줄 · 예상 착수 ${Math.round(readout.distance)} m · ${habitatNames[readout.habitat]}${readout.clipped ? ' (줄 끝)' : ''}`;
  for (const name of pointNames) {
    const point = CORAL_CAST[name];
    $('aim-' + name).setAttribute('aria-pressed', String(plan.aim.x === point.x && plan.aim.y === point.y));
  }
}
function refreshCast() {
  const coral = coralFishing();
  const trace = coral && coralTrailVisible(state);
  document.querySelector<HTMLElement>('.depth-scale')!.hidden = coral;
  document.querySelector('.ocean-head .live')!.textContent = coral ? '미끼를 던지는 바다' : 'LIVE EXPEDITION';
  $('quick-depth-label').hidden = !coral;
  quickDepth.setAttribute('aria-label', coral ? '바로 낚기 수심' : '탐사할 수심');
  $('cast-chart').hidden = !coral;
  $('cast-aim').hidden = !coral;
  $('bait-cancel').hidden = !pendingBait;
  $('net').hidden = !!pendingBait;
  $('aim-trail').hidden = !trace;
  for (const name of pointNames) $<HTMLButtonElement>('aim-' + name).disabled = busy;
  $<HTMLButtonElement>('cast-aim').disabled = busy || !ocean.bg;
  $('cast').textContent = coral ? '바로 낚기' : '⌁ 낚싯줄 던지기';
  castHelp.textContent = coral ? '← → 포인트 선택 · Enter 던지기 · Space 바로 낚기' : '클릭 / 터치로 낚시 · SPACE로 시작';
  game.tabIndex = coral ? 0 : -1;
  game.setAttribute('aria-label', coral ? '햇살 산호해 낚시 지도. 방향키로 포인트 선택, Enter로 던지기' : '물고기를 클릭해 낚시하는 바다');
  ocean.setCoralState(coral, state.line[0], trace);
  if (coral && currentAim) showAim(currentAim);
  sceneHint.textContent = pendingBait ? '미끼를 보고 물고기가 다가옵니다…'
    : trace ? '해초 사이로 말린 꼬리가 보입니다. 흔적에 미끼를 던져 보세요.'
    : coral ? '바다를 겨눠 미끼 던지기 · 물고기를 누르면 바로 낚기'
    : '물고기를 클릭하거나 아래 버튼으로 낚시를 시작하세요';
}
function refresh() {
  refreshTrail();
  const questReset = syncDailyQuests(state);
  if (questReset) save();
  const runSea = expeditionRun?.sea ?? state.sea,
    sea = seas[runSea],
    n = expeditionRun ? expeditionRun.node : bossProgress(state),
    surveyUnit = runSea === 0 ? '조사점' : '마리';
  $('gold').textContent = fmt(state.gold);
  $('total').textContent = fmt(state.counts.reduce((a, b) => a + b, 0));
  $('discovered').textContent = String(state.counts.filter((n) => n > 0).length);
  $('shiny-count').textContent = String(state.shiny.reduce((a, b) => a + b, 0));
  $('captain-level').textContent = String(state.captainLevel);
  const nextXp = xpForNextLevel(state.captainLevel);
  $('xp-label').textContent = `${fmt(state.captainXp)} / ${fmt(nextXp)} XP`;
  $('xp-fill').style.width = `${Math.min(100, (state.captainXp / nextXp) * 100)}%`;
  $('captain-next').textContent =
    `다음 선장 레벨까지 ${fmt(nextXp - state.captainXp)} XP · 포획할수록 성장`;
  const q = questSnapshot(),
    quests = [
      ['물살을 탄 하루', q.progress[0], q.target[0], q.reward[0], q.description[0]],
      ['희귀 생물 연구', q.progress[1], q.target[1], q.reward[1], q.description[1]],
      ['오늘의 어종 수집', q.progress[2], q.target[2], q.reward[2], q.description[2]],
    ];
  $('quest-list').innerHTML = quests
    .map(([name, progress, target, reward, desc], i) => {
      const done = Number(progress) >= Number(target),
        claimed = state.questClaimed[i];
      return `<div class="quest-row ${claimed ? 'claimed' : ''}"><div class="quest-icon">${claimed ? '✓' : done ? '✦' : '○'}</div><div class="quest-copy"><strong>${name}</strong><small>${desc} · ${Math.min(Number(progress), Number(target))}/${target}</small><div class="quest-meter"><i style="width:${Math.min(100, (Number(progress) / Number(target)) * 100)}%"></i></div></div><button data-quest="${i}" ${!done || claimed || busy ? 'disabled' : ''}>${claimed ? '완료' : done ? `+${reward} G` : `${reward} G`}</button></div>`;
    })
    .join('');
  $('quest-list')
    .querySelectorAll<HTMLButtonElement>('[data-quest]')
    .forEach((b) => (b.onclick = () => claimQuest(Number(b.dataset.quest))));
  $('sea-code').textContent = `AREA 0${runSea + 1} / ${String(seas.length).padStart(2, '0')}`;
  const shallow = expeditionRun || state.layer === 'shallow',
    top = shallow ? sea.start : sea.boundary,
    bottom = shallow ? sea.boundary : sea.end;
  $('sea-depth').textContent =
    coralFishing() ? `개방 수심 · 0 — ${state.line[0] ? sea.end : sea.boundary} m`
    : (shallow ? '얕은 층' : '깊은 층') + ' · ' + fmt(top) + ' — ' + fmt(bottom) + ' m';
  document.querySelector('.depth-scale')!.innerHTML = (
    top +
    ' m ─|──|' +
    (top + bottom) / 2 +
    ' m ─|──|' +
    bottom +
    ' m ─'
  )
    .split('|')
    .map((t) => '<span>' + t + '</span>')
    .join('');
  $('sea-en').textContent = sea.en;
  $('sea-name').textContent = sea.name;
  $('mission').textContent = expeditionRun ? `0${runSea + 1}. 원정 중` : `0${runSea + 1}. ${sea.name}`;
  $('perk').textContent = sea.perk;
  $('boss-progress').textContent = expeditionRun
    ? `${Math.min(n, 2)} / 2`
    : `${Math.min(n, sea.target)} / ${sea.target} ${surveyUnit}`;
  $('boss-bar').style.width =
    `${expeditionRun ? Math.min(100, n * 50) : Math.min(100, (n * 100) / sea.target)}%`;
  $('boss').textContent = expeditionRun
    ? n < 2
      ? `원정 경로 ${2 - n}개 더 진행하면 보스전`
      : '원정 보스와 결전'
    : !bossReady(state)
      ? `보스 준비 · ${Math.min(n, sea.target)}/${sea.target} ${surveyUnit} · 깊은 층 ${Math.min(1, state.deepCaught[state.sea])}/1마리`
      : state.bosses[state.sea]
        ? 'BOSS · 재도전하기 ↗'
        : 'BOSS · ' + sea.boss + ' 도전 ↗';
  ($('boss') as HTMLButtonElement).disabled = busy || !!expeditionRun || !bossReady(state);
  $('boss-help').hidden = !!expeditionRun || state.bossMisses[state.sea] < 3 || !bossReady(state);
  $<HTMLButtonElement>('boss-help').disabled = busy;
  const found = species.filter((f) => f.sea === state.sea && state.counts[f.id] > 0).length;
  $('research-text').textContent = `어종 연구 ${Math.min(found, 5)} / 5`;
  $('research').textContent = state.claimed[state.sea] ? '수령 완료' : `+${150 * (state.sea + 1)} G`;
  ($('research') as HTMLButtonElement).disabled =
    busy || !!expeditionRun || found < 5 || state.claimed[state.sea];
  for (const k of ['rod', 'boat'] as const) {
    $(k + '-name').textContent =
      (k === 'rod'
        ? ['나무', '카본', '은빛', '심연', '고대']
        : ['작은', '튼튼한', '탐사', '심해', '레비아탄'])[state[k]] +
      (k === 'rod' ? ' 낚싯대' : ' 어선') +
      ` · Lv.${state[k] + 1}`;
    $(k + '-price').textContent = state[k] === 4 ? 'MAX' : fmt(upgradePrice(state, k)) + ' G';
    ($(k + '-up') as HTMLButtonElement).disabled =
      busy || !!expeditionRun || state[k] === 4 || state.gold < upgradePrice(state, k);
  }
  $('rod-effect').textContent = `추적 폭 +${(state.rod * 2.3).toFixed(1)}%p`;
  $('boat-effect').textContent = `그물 ${netCount(state)}마리 · 쿨다운 ${netCooldown(state)}초`;
  const linked = state.rodFish >= 0 ? species[state.rodFish] : null,
    linkedLevel = linked ? state.fishLevel[linked.id] : 0;
  $('rod-fish-name').textContent = linked ? `${linked.name} 미페 · +${linkedLevel}` : '결합된 미페 없음';
  $('rod-fish-effect').textContent = linked
    ? `포획 구역 +${(linkedLevel * 1.2).toFixed(1)}% · 타이밍 +${linkedLevel * 2.5}% · 골드 +${linkedLevel * 4}% · 라운드 -${Math.min(2, Math.floor(linkedLevel / 4))}`
    : '미페를 결합하면 낚시 능력과 포획 골드가 올라갑니다.';
  $('rod-fish-icon').replaceChildren(
    ...(linked ? [fishArt(linked.shape, linked.hue)] : [document.createTextNode('🐟')]),
  );
  $('rod-fish-icon').classList.toggle('has-fish', !!linked);
  $('nav-description').textContent =
    state.sea === seas.length - 1
      ? '가장 깊은 바다에 도착했습니다. 모든 어종과 희귀 변종을 발견해 보세요.'
      : seas[state.sea + 1].note;
  ($('prev') as HTMLButtonElement).disabled = busy || !!expeditionRun || state.sea === 0;
  ($('next') as HTMLButtonElement).disabled =
    busy || !!expeditionRun || !canTravel(state, state.sea + 1);
  $('next-note').textContent =
    state.sea === seas.length - 1
      ? '마지막 해역 · 탐사는 계속됩니다'
      : canTravel(state, state.sea + 1)
        ? '✓ 출항 준비 완료'
        : '깊은 층 1마리를 포함한 조사 완료 후 보스 격파';
  ($('cast') as HTMLButtonElement).disabled = busy || !!expeditionRun;
  ($('net') as HTMLButtonElement).disabled = busy || !!expeditionRun || Date.now() < state.netReady;
  ocean.locked = busy || !!expeditionRun;
  refreshCast();
  ocean.setBoss(!expeditionRun && bossReady(state), state.bosses[state.sea]);
  ocean.setEquipment(state.rod, state.boat);
  $('boss').classList.toggle('cleared', !expeditionRun && state.bosses[state.sea]);
  $('expedition').textContent = expeditionRun
    ? `원정 ${expeditionRun.sea + 1}/${seas.length}`
    : '⚓ 심해 원정';
  $('sound').textContent = state.sound ? '소리 ON' : '소리 OFF';
  $('sound').setAttribute('aria-label', state.sound ? '효과음 끄기' : '효과음 켜기');
  $('rod-icon').replaceChildren(gearArt('rod', state.rod));
  $('boat-icon').replaceChildren(gearArt('net', state.boat));
  $('map-list').innerHTML = seas
    .map(
      (area, i) =>
        '<button data-map="' +
        i +
        '" class="' +
        (i === state.sea ? 'current' : '') +
        '" ' +
        (busy || !canTravel(state, i) ? 'disabled' : '') +
        '><span>0' +
        (i + 1) +
        '</span>' +
        area.name +
        '<small>' +
        (i === state.sea ? '탐사 중' : canTravel(state, i) ? '이동 →' : '잠김') +
        '</small></button>',
    )
    .join('');
  $('map-list')
    .querySelectorAll<HTMLButtonElement>('[data-map]')
    .forEach((b) => (b.onclick = () => void travel(Number(b.dataset.map))));
  const area = seas[state.sea],
    deep = state.layer === 'deep',
    locked = busy || !!expeditionRun;
  let goal: string;
  if (coralFishing() && coralTrailVisible(state)) {
    goal = '말린 꼬리의 흔적 조사';
  } else if (state.bosses[state.sea]) {
    goal =
      state.sea === seas.length - 1
        ? '마지막 보스 격파 · 심해 원정 도전'
        : seas[state.sea + 1].name + '로 출항';
  } else if (!state.line[state.sea]) {
    goal =
      state.gold < area.lineCost
        ? `낚싯줄 강화까지 ${area.lineCost - state.gold} G`
        : (state.sea === 0 ? '200 m 낚싯줄 구매 · 120 G' : '장비 공방에서 낚싯줄 강화');
  } else if (!state.deepCaught[state.sea]) {
    goal = state.sea === 0 ? '해초밭 안쪽에서 1마리 낚기' : deep ? '깊은 층에서 첫 물고기 낚기' : '깊은 층 선택 후 첫 물고기 낚기';
  } else {
    goal = n >= area.target ? `${area.boss}에게 도전` : state.sea === 0
      ? `보스까지 ${area.target - n} 조사점` : `보스까지 수동 낚시 ${area.target - n}마리`;
  }
  $('goal').textContent = expeditionRun ? '원정 항로 진행 중' : '다음 목표 · ' + goal;
  for (const layer of ['shallow', 'deep'] as const) {
    const button = $<HTMLButtonElement>(layer),
      isDeep = layer === 'deep';
    button.textContent =
      (isDeep ? '깊은 층' : '얕은 층') +
      ' · ' +
      (isDeep ? area.boundary + '–' + area.end : area.start + '–' + area.boundary) +
      ' m';
    button.disabled = locked || (isDeep && !state.line[state.sea]);
    button.setAttribute('aria-pressed', String(state.layer === layer));
    button.title = coralFishing() ? '바로 낚기에 사용할 수심' : '이 수심으로 이동';
  }
  const reach = state.line[state.sea] ? area.end : area.boundary;
  $('line').textContent = state.line[state.sea]
    ? `낚싯줄 · ${reach} m 도달`
    : `낚싯줄 ${reach} → ${area.end} m · 깊은 층 개방 · ${area.lineCost} G`;
  const grace = reelGrace(state);
  $('reel').textContent = state.reel[state.sea]
    ? `릴 강화 완료 · 장력 +${grace.toFixed(1)}초 · 홀드 이탈 +${holdGrace(state).toFixed(1)}초`
    : `선택 릴 · 위험 허용 ${grace.toFixed(1)} → ${Math.min(0.8, grace + 0.2).toFixed(1)}초 · 홀드 이탈 ${holdGrace(state).toFixed(1)} → ${(holdGrace(state) + 0.1).toFixed(1)}초 · ${area.reelCost} G`;
  for (const k of ['line', 'reel'] as const) {
    $<HTMLButtonElement>(k).disabled =
      locked || state[k][state.sea] || state.gold < (k === 'line' ? area.lineCost : area.reelCost);
  }
  $('expedition').title = '마지막 해역 보스 격파 후 출항';
  const ids = recent.length
    ? recent
    : [...species]
        .reverse()
        .filter((f) => state.counts[f.id] > 0)
        .slice(0, 4)
        .map((f) => f.id);
  $('recent').innerHTML = '';
  if (!ids.length)
    $('recent').innerHTML =
      '<span class="catch-item">첫 번째 발견을 기다리고 있어요. 낚싯줄을 던져보세요.</span>';
  ids.slice(0, 4).forEach((id) => {
    const f = species[id],
      el = document.createElement('div');
    el.className = 'catch-item';
    el.append(fishArt(f.shape, f.hue));
    const text = document.createElement('span');
    text.innerHTML = `${f.name}<small>${ranks[f.rank]} · ${state.counts[id]}마리 포획</small>`;
    el.append(text);
    $('recent').append(el);
  });
}
function setBusy(value: boolean) {
  busy = value;
  refresh();
}
function resetFight() {
  cancelAnimationFrame(frame);
  activeCleanup?.();
  activeCleanup = null;
  $('minigame').hidden = true;
  $('minigame').className = '';
  $('minigame').innerHTML = '';
  setBusy(false);
}
const pause = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
function fightShell(title: string, label: string, instruction: string) {
  $('minigame').hidden = false;
  $('minigame').innerHTML =
    `<div class="fight-card"><div class="eyebrow">${label}</div><h2>${title}</h2><p>${instruction}</p><div id="fight-content"></div><div class="fight-bottom"><span id="fight-status"></span><button id="escape">그만두기</button></div></div>`;
}
let fightToken = 0;
$('goal').onclick = () => {
  if (busy || expeditionRun) return;
  if (!state.bosses[state.sea] && !state.line[state.sea] && state.gold >= seas[state.sea].lineCost) {
    $('line').scrollIntoView({ block: 'center' });
    $('line').focus();
    return;
  }
  if (coralFishing() && coralTrailVisible(state)) {
    $('aim-trail').click();
    $('cast-aim').focus();
    return;
  }
  if (state.bosses[state.sea]) {
    (state.sea === seas.length - 1
      ? $('expedition')
      : canTravel(state, state.sea + 1)
        ? $('next')
        : $('boss')
    ).click();
    return;
  }
  if (coralFishing() && state.line[0] && !state.deepCaught[0]) {
    $('aim-kelp').click();
    $('cast-aim').focus();
    return;
  }
  if (state.line[state.sea] && !state.deepCaught[state.sea] && state.layer === 'shallow') {
    $('deep').click();
    return;
  }
  if (coralFishing() && !bossReady(state)) ocean.castAim();
  else (bossReady(state) ? $('boss') : $('cast')).click();
};
for (const layer of ['shallow', 'deep'] as const)
  $(layer).onclick = () => {
    if (busy || expeditionRun || state.layer === layer || (layer === 'deep' && !state.line[state.sea]))
      return;
    state.layer = layer;
    ocean.layer = layer;
    if (coralFishing()) ocean.aimAt(layer === 'deep' ? CORAL_CAST.kelp : CORAL_CAST.shoal);
    else ocean.setSea(state.sea);
    save();
    refresh();
  };
for (const kind of ['line', 'reel'] as const)
  $(kind).onclick = () => {
    if (busy || expeditionRun || !buyGear(state, kind)) return;
    save();
    refresh();
    if (kind === 'line' && coralFishing()) {
      ocean.aimAt(lastBaitAim ?? CORAL_CAST.kelp);
      const bounds = game.getBoundingClientRect();
      if (bounds.bottom < 80 || bounds.top >= innerHeight) {
        const motion = matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';
        game.scrollIntoView({ block: 'start', behavior: motion });
      }
    }
    sound(700);
    toast(
      kind === 'line'
        ? (coralFishing() ? '200 m 줄을 감았습니다. 이제 해초밭 안쪽까지 닿아요.' : '줄 강화 완료! 깊은 층 버튼을 눌러 내려가세요.')
        : '릴 강화 완료! 홀드와 장력에 여유가 생겼어요.',
    );
  };
function retry(reason: string, action: () => void, practice?: () => void) {
  fightShell('다시 도전할까요?', '낚시 일지', reason);
  setBusy(true);
  $('fight-content').innerHTML =
    '<button class="cast-btn" id="retry">즉시 재도전</button>' +
    (practice ? '<button class="upgrade" id="practice">연습 도움 켜고 도전</button>' : '');
  const retryToken = ++fightToken;
  const choose = (next?: () => void) => {
    if (fightToken !== retryToken) return;
    fightToken++;
    resetFight();
    next?.();
  };
  $('retry').onclick = () => choose(action);
  if (practice) $('practice').onclick = () => choose(practice);
  $('escape').onclick = () => choose();
}
async function beginFish(
  id: number,
  shiny = false,
  x = 550,
  y = 330,
  runSea = expeditionRun?.sea ?? state.sea,
  encounter: { trail?: boolean; layer?: Layer; fromBait?: boolean } = {},
) {
  if (busy || $('modal').hasAttribute('open')) return;
  const { trail, layer, fromBait } = encounter;
  if (trail && !(coralFishing() ? coralTrailVisible(state) : canFollowTrail(state))) return;
  const layerChanged = layer !== undefined && state.layer !== layer;
  if (layer) state.layer = ocean.layer = layer;
  const token = ++fightToken;
  setBusy(true);
  if (!fromBait) ocean.hook(x, y);
  const f = species[id],
    rules = fishingRules(f.rank, runSea, state.rod),
    assisted = !expeditionRun && state.misses >= 3,
    steady = assisted || !!expeditionRun?.relics.includes('steady'),
    linkedLevel = state.rodFish >= 0 ? state.fishLevel[state.rodFish] : 0,
    rounds = Math.max(1, rules.rounds - (steady ? 1 : 0) - Math.min(2, Math.floor(linkedLevel / 4)));
  const first = !state.guided;
  state.guided = true;
  if (assisted) state.misses = 0;
  if (first || assisted || layerChanged) save();
  if (shiny || f.rank >= 5) sound(980);
  fightShell(
    (shiny ? '✧ 황금 변종 · ' : f.rank >= 5 ? '★ 희귀 입질 · ' : '') + f.name,
    `${trail ? '표본 추적 · ' : ''}${ranks[f.rank]} · ${rounds} 라운드`,
    first ? '물고기를 따라 포획 게이지를 채우세요.' : assisted ? '연속 실패 도움 적용' : '',
  );
  $('escape').onclick = () => {
    fightToken++;
    resetFight();
    toast('낚시를 중단했어요. 언제든 다시 시도하세요.');
    if (expeditionRun) queueRunBoard(250);
  };
  for (let r = 0; r < rounds; r++) {
    if (token !== fightToken) return;
    $('fight-content').textContent = '';
    $('fight-status').textContent = `입질 · 라운드 ${r + 1} / ${rounds}`;
    await pause(r === 0 ? 450 : 220);
    if (token !== fightToken) return;
    const mode = rules.mode(r);
    const ok =
      mode === 'track'
        ? await tracking(f.rank, token, runSea, steady, linkedLevel)
        : mode === 'timing'
          ? await timing(token, f.rank, runSea, steady, linkedLevel)
          : mode === 'hold'
            ? await holdPosition(token, f.rank, runSea, steady, linkedLevel)
            : mode === 'rhythm'
              ? await rhythm(token, f.rank, runSea, linkedLevel + (assisted ? 8 : 0))
              : await tension(token, f.rank, runSea, linkedLevel + (assisted ? 10 : 0));
    if (token !== fightToken) return;
    if (!ok) {
      combo = 0;
      resetFight();
      sound(120);
      if (expeditionRun) {
        const active = expeditionRun;
        if (active.relics.includes('rescue') && !active.usedRescue) {
          active.usedRescue = true;
          active.relics = active.relics.filter((x) => x !== 'rescue');
          toast('비상 부표가 배를 구했어요. 다음 경로를 고르세요.');
        } else {
          active.hull--;
          active.node++;
          toast(
            active.hull > 0
              ? '물고기가 달아났어요. 선체 한 칸 손상 · 항해는 계속됩니다.'
              : '선체가 버티지 못했어요. 항구로 귀환합니다.',
          );
        }
        save();
        if (active.hull <= 0) endExpedition(false);
        else queueRunBoard(500);
      } else {
        state.misses++;
        save();
        retry(
          (
            {
              track: '물고기가 추적 구역을 벗어났어요.',
              timing: '물살이 잦아드는 타이밍을 놓쳤어요.',
              hold: '발광 표식을 충분히 유지하지 못했어요.',
              rhythm: '박자에 맞는 입력이 부족했어요.',
              tension: '안전 장력을 유지하지 못했어요.',
            } as Record<string, string>
          )[mode],
          () => void beginFish(id, shiny, x, y, runSea, encounter),
        );
      }
      return;
    }
  }
  if (token !== fightToken) return;
  combo = Date.now() - lastCatch < 45000 ? combo + 1 : 1;
  lastCatch = Date.now();
  const wasReady = bossReady(state);
  const { gain: baseGain, cm, surveyGain } = settleCatch(state, id, shiny, expeditionRun ? 'expedition' : 'manual'),
    bonus = comboBonus(baseGain, combo),
    inRun = !!expeditionRun && expeditionRun.sea === runSea,
    runBonus = inRun && expeditionRun!.relics.includes('deepPurse') ? Math.round(baseGain * 0.35) : 0,
    fishBonus = state.rodFish >= 0 ? Math.round(baseGain * linkedLevel * 0.04) : 0,
    gain = baseGain + bonus + runBonus + fishBonus;
  const specimenRecorded = trail && !inRun && completeTrail(state, id);
  state.gold += bonus + runBonus + fishBonus;
  const xp = 10 + f.rank * 9 + f.sea * 4 + (shiny ? 35 : 0),
    level = awardXp(xp);
  if (inRun) {
    expeditionRun!.haul += gain;
    expeditionRun!.catches++;
    expeditionRun!.node++;
  }
  recent = [id, ...recent.filter((i) => i !== id)].slice(0, 4);
  save();
  resetFight();
  setBusy(true);
  const animate = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  ocean.reel(id, shiny, x, y, animate);
  if (animate) ocean.popup(gain, combo);
  toast(
    `${specimenRecorded ? '관찰 표본 기록! · ' : ''}${shiny ? '✧ 황금 변종! ' : ''}${f.name} ${cm} cm · 자동 판매 ${baseGain} G${!inRun && f.sea === 0 ? ` · +${surveyGain} 조사점` : ''}${gain > baseGain ? ` · 추가 ${gain - baseGain} G` : ''}${fishBonus ? ` (미페 +${fishBonus})` : ``} · +${xp} XP${level.levels ? ` · 선장 Lv.${state.captainLevel}! +${level.bonus} G` : ''}${inRun ? ' · 원정 항로 진척' : ''}${!inRun && !wasReady && bossReady(state) ? ' · 보스 도전 해금!' : ''}`,
  );
  if (animate && (shiny || f.rank >= 5)) ocean.sparkle();
  sound(shiny || f.rank >= 5 ? 990 : 740);
  refresh();
  if (animate) await pause(900);
  if (token !== fightToken) return;
  setBusy(false);
  if (inRun) queueRunBoard(250);
}
function tracking(
  rank: number,
  token: number,
  sea = state.sea,
  steady = false,
  linkLevel = 0,
): Promise<boolean> {
  return new Promise((resolve) => {
    const rules = fishingRules(rank, sea, state.rod),
      zone = Math.min(0.72, rules.zone + (steady ? 0.07 : 0) + linkLevel * 0.012);
    let center = 0.5,
      fish = 0.5,
      progress = 0.23,
      elapsed = 0,
      previous = performance.now(),
      keys = new Set<string>(),
      done = false;
    $('fight-content').innerHTML =
      `<div class="track" id="track" tabindex="0" role="slider" aria-label="마우스 또는 방향키로 포획 구역 이동" aria-valuemin="0" aria-valuemax="100" aria-valuenow="50"><div class="target-zone" id="zone"></div><div class="fish-dot" id="fish-dot"></div></div><div class="progress-track"><div id="catch-progress"></div></div><p>마우스 / 터치 / ← → 로 연두색 구역 이동<br>금빛 물고기를 구역 안에 유지하세요</p>`;
    const track = $('track');
    const move = (e: PointerEvent) => {
      const b = track.getBoundingClientRect();
      center = Math.max(zone / 2, Math.min(1 - zone / 2, (e.clientX - b.left) / b.width));
    };
    const down = (e: KeyboardEvent) => {
      if (['ArrowLeft', 'ArrowRight'].includes(e.key)) {
        keys.add(e.key);
        e.preventDefault();
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.key);
    const finish = (result: boolean) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      track.removeEventListener('pointermove', move);
      track.removeEventListener('pointerdown', move);
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
      activeCleanup = null;
      resolve(result);
    };
    track.addEventListener('pointermove', move);
    track.addEventListener('pointerdown', move);
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    activeCleanup = () => finish(false);
    const tick = (now: number) => {
      if (done) return;
      if (token !== fightToken) {
        finish(false);
        return;
      }
      const dt = Math.min(0.25, (now - previous) / 1000);
      previous = now;
      elapsed += dt;
      if (keys.has('ArrowLeft')) center -= dt * 0.75;
      if (keys.has('ArrowRight')) center += dt * 0.75;
      center = Math.max(zone / 2, Math.min(1 - zone / 2, center));
      fish = 0.5 + Math.sin(elapsed * rules.speed) * 0.28 + Math.sin(elapsed * 1.7) * 0.08;
      const inside = Math.abs(fish - center) < zone / 2;
      progress = Math.max(0, Math.min(1, progress + dt * (inside ? 0.105 : -0.075)));
      $('zone').style.left = `${(center - zone / 2) * 100}%`;
      $('zone').style.width = `${zone * 100}%`;
      $('fish-dot').style.left = `${fish * 100}%`;
      $('catch-progress').style.width = `${progress * 100}%`;
      track.setAttribute('aria-valuenow', String(Math.round(center * 100)));
      $('fight-status').textContent =
        `${inside ? '좋아요! 안정적으로 끌어올리는 중' : '물고기를 따라가세요'} · ${Math.round(progress * 100)}%`;
      if (progress >= 1 || elapsed > 20 || progress === 0) {
        finish(progress >= 1);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  });
}
function timing(
  token: number,
  rank = 0,
  sea = state.sea,
  steady = false,
  linkLevel = 0,
): Promise<boolean> {
  return new Promise((resolve) => {
    let pos = 0.5,
      start = performance.now(),
      done = false,
      hits = 0,
      lastWindow = -1;
    const waveSpeed = 650 * (sea === 1 ? 0.8 : sea === 3 ? 0.88 : 1),
      width = Math.min(
        0.72,
        0.36 - rank * 0.027 + state.rod * 0.01 + (steady ? 0.08 : 0) + linkLevel * 0.025,
      ),
      low = 0.5 - width / 2,
      high = 0.5 + width / 2;
    $('fight-content').innerHTML =
      '<div class="track"><div class="target-zone" style="left:33%;width:34%"></div><div class="fish-dot" id="timing-dot"></div></div><button class="cast-btn" id="timing-hit">지금 끌어올리기! · SPACE</button><p>금빛 표시가 연두색 구역에 들어왔을 때 누르세요.</p>';
    const cleanup = (result: boolean) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', key);
      activeCleanup = null;
      resolve(result);
    };
    const hit = () => {
      if (done) return;
      if (pos < low || pos > high) {
        cleanup(false);
        return;
      }
      const windowIndex = Math.round((performance.now() - start) / waveSpeed / Math.PI);
      if (windowIndex === lastWindow) return;
      lastWindow = windowIndex;
      hits++;
      sound(440 + hits * 80);
      if (hits >= (sea === 1 ? 5 : 2)) cleanup(true);
    };
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        hit();
      }
    };
    activeCleanup = () => cleanup(false);
    const target = $('fight-content').querySelector<HTMLElement>('.target-zone')!;
    target.style.left = low * 100 + '%';
    target.style.width = width * 100 + '%';
    $('timing-hit').onclick = hit;
    window.addEventListener('keydown', key);
    const tick = (now: number) => {
      if (done) return;
      if (token !== fightToken) {
        cleanup(false);
        return;
      }
      pos = 0.5 + Math.sin((now - start) / waveSpeed) * 0.45;
      $('timing-dot').style.left = `${pos * 100}%`;
      $('fight-status').textContent = '물살이 잦아들 때 누르기 · ' + hits + '/' + (sea === 1 ? 5 : 2);
      if (now - start > 15000) {
        cleanup(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  });
}
function holdPosition(
  token: number,
  rank: number,
  sea = state.sea,
  steady = false,
  linkLevel = 0,
): Promise<boolean> {
  return new Promise((resolve) => {
    const required = Math.max(
      0.5,
      (sea === 2 ? 1.2 : 0) +
        fishingRules(rank, sea, state.rod).holdSeconds -
        (steady ? 0.2 : 0) -
        linkLevel * 0.06 -
        reelGrace(state) * 0.35,
    );
    let outside = 0,
      held = 0,
      completed = 0,
      inside = false,
      elapsed = 0,
      previous = performance.now(),
      done = false;
    $('fight-content').innerHTML =
      '<div class="hold-arena" id="hold-arena"><button id="hold-target" aria-label="이 위치에서 머무르기">유지</button></div><div class="progress-track"><div id="hold-progress"></div></div><p>빛나는 원 위에 마우스를 올리고 유지하세요.<br>터치는 길게 누르기 · 키보드는 Tab으로 원 선택</p>';
    const target = $('hold-target'),
      positions = [
        [18, 22],
        [67, 53],
        [40, 16],
      ],
      place = () => {
        inside = false;
        outside = 0;
        held = 0;
        target.style.left = positions[completed][0] + '%';
        target.style.top = positions[completed][1] + '%';
        target.textContent = '유지';
      };
    place();
    target.onpointerenter = () => {
      inside = true;
    };
    target.onpointerleave = () => {
      inside = false;
    };
    target.onpointerdown = (e) => {
      e.preventDefault();
      inside = true;
    };
    target.onpointerup = (e) => {
      if (e.pointerType === 'touch') inside = false;
    };
    target.onfocus = () => (inside = true);
    target.onblur = () => (inside = false);
    const finish = (result: boolean) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      activeCleanup = null;
      resolve(result);
    };
    activeCleanup = () => finish(false);
    const tick = (now: number) => {
      if (done) return;
      if (token !== fightToken) {
        finish(false);
        return;
      }
      const dt = Math.min(0.25, (now - previous) / 1000);
      previous = now;
      elapsed += dt;
      outside = inside ? 0 : outside + dt;
      held = Math.max(0, held + dt * (inside ? 1 : outside <= holdGrace(state) ? 0 : -0.7));
      $('hold-progress').style.width = Math.min(100, (held / required) * 100) + '%';
      target.classList.toggle('holding', inside);
      $('fight-status').textContent =
        '빛의 흔적 ' + completed + '/3 · ' + (inside ? '그대로 유지하세요' : '원 위로 이동하세요');
      if (held >= required) {
        completed++;
        sound(620 + completed * 80);
        if (completed === 3) {
          finish(true);
          return;
        }
        place();
      }
      if (elapsed > 24) {
        finish(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  });
}
function rhythm(token: number, rank: number, sea = state.sea, linkLevel = 0): Promise<boolean> {
  return new Promise((resolve) => {
    let done = false,
      pos = 0.5,
      hits = 0,
      misses = 0,
      start = performance.now();
    const targetHits = rank >= 8 ? 4 : 3,
      width = Math.max(0.105, 0.3 - rank * 0.016 + linkLevel * 0.008),
      waveSpeed = Math.max(300, 620 - rank * 27 - sea * 12),
      deadline = Math.max(5200, 9000 - rank * 350);
    $('fight-content').innerHTML =
      `<div class="track rhythm-track"><div class="target-zone" id="rhythm-zone"></div><div class="fish-dot" id="rhythm-dot"></div></div><div class="rhythm-score" id="rhythm-score"></div><button class="cast-btn" id="rhythm-hit">박자에 맞춰 끌어올리기 · SPACE</button><p>금빛 물고기가 가운데 빛나는 구역을 지날 때 누르세요.<br>두 번 놓치면 물고기가 도망갑니다.</p>`;
    const zone = $('rhythm-zone'),
      dot = $('rhythm-dot'),
      score = $('rhythm-score'),
      hitButton = $('rhythm-hit');
    zone.style.left = `${(0.5 - width / 2) * 100}%`;
    zone.style.width = `${width * 100}%`;
    const finish = (result: boolean) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', key);
      activeCleanup = null;
      resolve(result);
    };
    const hit = () => {
      if (done) return;
      if (Math.abs(pos - 0.5) <= width / 2) {
        hits++;
        sound(650 + hits * 70);
        if (hits >= targetHits) {
          finish(true);
          return;
        }
      } else {
        misses++;
        sound(170);
        if (misses >= 2) {
          finish(false);
          return;
        }
      }
      score.textContent = `명중 ${hits}/${targetHits} · 빗나감 ${misses}/2`;
    };
    const key = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        hit();
      }
    };
    activeCleanup = () => finish(false);
    hitButton.onclick = hit;
    window.addEventListener('keydown', key);
    score.textContent = `명중 ${hits}/${targetHits} · 빗나감 ${misses}/2`;
    const tick = (now: number) => {
      if (token !== fightToken) {
        finish(false);
        return;
      }
      const elapsed = now - start;
      pos = 0.5 + Math.sin(elapsed / waveSpeed) * 0.46;
      dot.style.left = `${pos * 100}%`;
      if (elapsed > deadline) {
        finish(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  });
}

function tension(token: number, rank: number, sea = state.sea, linkLevel = 0): Promise<boolean> {
  return new Promise((resolve) => {
    let danger = 0,
      done = false,
      tension = 0.36,
      progress = 0.2,
      pressed = false,
      elapsed = 0,
      previous = performance.now();
    const low = Math.min(0.46, 0.3 + rank * 0.006),
      high = Math.max(0.57, 0.77 - rank * 0.009 + linkLevel * 0.005);
    $('fight-content').innerHTML =
      `<div class="tension-gauge"><div class="tension-safe" id="tension-safe"></div><div class="tension-meter" id="tension-meter"></div></div><div class="progress-track"><div id="tension-progress"></div></div><button class="cast-btn" id="tension-reel">누르고 감기 · 떼서 풀기</button><p>장력 표시를 초록 안전 구간에 유지하세요.<br>SPACE 또는 버튼을 누르면 감고, 떼면 장력이 풀립니다.</p>`;
    const safe = $('tension-safe'),
      meter = $('tension-meter'),
      progressEl = $('tension-progress'),
      button = $('tension-reel');
    safe.style.left = `${low * 100}%`;
    safe.style.width = `${(high - low) * 100}%`;
    const finish = (result: boolean) => {
      if (done) return;
      done = true;
      cancelAnimationFrame(frame);
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      activeCleanup = null;
      resolve(result);
    };
    const keyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        pressed = true;
      }
    };
    const keyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') pressed = false;
    };
    activeCleanup = () => finish(false);
    button.onpointerdown = (e) => {
      e.preventDefault();
      pressed = true;
    };
    button.onpointerup = () => {
      pressed = false;
    };
    button.onpointerleave = () => {
      pressed = false;
    };
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
    const tick = (now: number) => {
      if (token !== fightToken) {
        finish(false);
        return;
      }
      const dt = Math.min(0.25, (now - previous) / 1000);
      previous = now;
      elapsed += dt;
      const vent = sea === 3 ? elapsed % 4 : 0;
      const surge = sea === 3 && vent > 3 ? 0.34 : Math.sin(elapsed * (1.5 + rank * 0.07) + sea) * 0.11;
      tension = Math.max(0, Math.min(1, tension + dt * ((pressed ? 0.34 : -0.29) + surge)));
      const safeNow = tension >= low && tension <= high;
      danger = safeNow ? 0 : danger + dt;
      progress = Math.max(
        0,
        Math.min(1, progress + dt * (safeNow ? 0.14 : danger <= reelGrace(state) ? 0 : -0.12)),
      );
      meter.style.left = `${tension * 100}%`;
      meter.classList.toggle('danger', !safeNow);
      progressEl.style.width = `${progress * 100}%`;
      button.classList.toggle('is-pressed', pressed);
      $('fight-status').textContent =
        `${sea === 3 && vent > 2 ? (vent > 3 ? '분출! 줄을 푸세요 · ' : '분출 예고 · ') : ''}장력 ${Math.round(tension * 100)}% · ${safeNow ? '안전 구간 유지 중' : '초록 구간에 맞추세요'} · ${Math.round(progress * 100)}%`;
      if (progress >= 1) {
        finish(true);
        return;
      }
      if (progress === 0 || elapsed > Math.max(12, 17 - rank * 0.35)) {
        finish(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  });
}
async function beginBoss(expedition = false, practice = false) {
  const bossSea = expedition && expeditionRun ? expeditionRun.sea : state.sea;
  if (busy || (!expedition && !bossReady(state))) return;
  const token = ++fightToken;
  setBusy(true);
  sound(85);
  fightShell(
    seas[bossSea].boss,
    'BOSS ENCOUNTER',
    `다가오는 원이 목표 원과 겹치면 공격! 파란 원은 표시된 시간 동안 누르세요.${!expedition && state.bosses[state.sea] ? ' 재도전은 보상을 다시 지급하지 않습니다.' : ''}`,
  );
  $('minigame').classList.add('boss-battle', 'boss-intro');
  const reveal = bossArt(bossSea);
  reveal.className = 'boss-reveal';
  $('fight-content').append(reveal);
  $('fight-status').textContent = '거대한 그림자가 다가옵니다…';
  seaAudio.enabled = state.sound;
  seaAudio.roar(bossSea);
  $('escape').onclick = () => {
    fightToken++;
    resetFight();
    if (expedition) queueRunBoard(250);
  };
  await pause(1600);
  if (token !== fightToken) return;
  $('minigame').classList.remove('boss-intro');
  if (!expedition) {
    const opening = seas[bossSea].modes[0];
    $('fight-status').textContent = '보스의 첫 움직임을 따라가세요';
    const level = practice ? 6 : 0;
    const landed =
      opening === 'track'
        ? await tracking(0, token, bossSea, practice, level)
        : opening === 'hold'
          ? await holdPosition(token, 0, bossSea, practice, level)
          : opening === 'timing'
            ? await timing(token, 0, bossSea, practice, level)
            : await tension(token, 0, bossSea, level);
    if (token !== fightToken) return;
    if (!landed) {
      state.bossMisses[bossSea]++;
      save();
      resetFight();
      retry(
        '보스의 첫 움직임을 놓쳤어요.',
        () => void beginBoss(),
        state.bossMisses[bossSea] >= 3 ? () => void beginBoss(false, true) : undefined,
      );
      return;
    }
  }
  let hits = 0,
    misses = 0,
    round = 0,
    started = false,
    holdStart = 0,
    holding = false,
    last = performance.now();
  const needed = Math.max(4, 5 + bossSea - (expeditionRun?.relics.includes('chart') ? 1 : 0));
  $('fight-content').innerHTML =
    `<div class="boss-hp" id="boss-hp"></div><div class="boss-arena" id="boss-arena"><button class="ring-button" id="ring">준비</button></div><div class="progress-track"><div id="boss-time"></div></div>`;
  const art = bossArt(bossSea);
  art.className = 'boss-art';
  $('boss-arena').prepend(art);
  const ring = $('ring');
  const isHoldRound = () => (bossSea === 4 ? round % 2 === 0 : round % 3 === 0);
  const isDecoyRound = () => bossSea === 2 && round % 4 === 0;
  const setup = () => {
    round++;
    started = false;
    last = performance.now();
    holding = false;
    holdStart = 0;
    ring.textContent = isDecoyRound()
      ? '가짜 불빛 · 기다리기'
      : isHoldRound()
        ? '길게 누르기'
        : '원 안에서 클릭';
    ring.style.borderColor = isDecoyRound() ? '#8992ad' : isHoldRound() ? '#7dd4de' : '#e8c979';
    ring.style.left =
      (bossSea === 1 || bossSea === 3
        ? [10, 40, 70][Math.floor(Math.random() * 3)]
        : round % 2
          ? 12
          : 64) + '%';
  };
  setup();
  const hp = () => {
    $('boss-hp').innerHTML = Array.from(
      { length: needed },
      (_, i) => `<span class="${i < hits ? 'empty' : ''}"></span>`,
    ).join('');
  };
  hp();
  const finish = (won: boolean) => {
    fightToken++;
    resetFight();
    if (won) {
      if (expedition) {
        finishRunBoss(bossSea);
        return;
      }
      const gain = defeatBoss(state),
        level = awardXp(gain ? 180 + bossSea * 80 : 0);
      ocean.popup(gain);
      ocean.celebrate();
      save();
      sound(880);
      toast(
        gain
          ? `${seas[bossSea].boss} 격파! +${fmt(gain)} G · +${180 + bossSea * 80} XP${level.levels ? ` · 선장 Lv.${state.captainLevel}! +${level.bonus} G` : ''}`
          : '재도전 성공! · 바다의 수호자를 다시 만났습니다.',
      );
      refresh();
    } else if (expedition && expeditionRun) {
      expeditionRun.hull--;
      toast(
        expeditionRun.hull > 0
          ? '보스에게 밀렸어요. 선체 한 칸 손상 · 경로에서 재도전할 수 있습니다.'
          : '선체가 버티지 못했어요. 항구로 귀환합니다.',
      );
      save();
      if (expeditionRun.hull <= 0) endExpedition(false);
      else queueRunBoard(500);
    } else {
      state.bossMisses[bossSea]++;
      save();
      retry(
        '보스의 공격 신호를 네 번 놓쳤어요.',
        () => void beginBoss(),
        state.bossMisses[bossSea] >= 3 ? () => void beginBoss(false, true) : undefined,
      );
    }
  };
  const score = (ok: boolean) => {
    if (ok) {
      hits++;
      sound(500 + hits * 60);
      art.animate(
        [
          { filter: 'brightness(3)', transform: 'translateX(-5px)' },
          { filter: 'brightness(1)', transform: 'translateX(0)' },
        ],
        { duration: 250 },
      );
    } else {
      misses++;
      sound(130);
    }
    hp();
    if (hits >= needed) {
      finish(true);
      return;
    }
    if (misses >= 4) {
      finish(false);
      return;
    }
    setup();
  };
  const attack = () => {
    if (!started || holding || token !== fightToken) return;
    if (isDecoyRound()) {
      score(false);
    } else if (isHoldRound()) {
      holding = true;
      holdStart = performance.now();
    } else {
      const age = (performance.now() - last) / 1000,
        low = practice ? 0.35 : bossSea === 3 ? 1.05 : 0.85,
        high = practice ? 2.2 : bossSea === 3 ? 1.52 : bossSea === 4 ? 1.5 : 1.65;
      score(age >= low && age <= high);
    }
  };
  ring.onpointerdown = (e) => {
    e.preventDefault();
    ring.setPointerCapture(e.pointerId);
    attack();
  };
  ring.onkeydown = (e) => {
    if (['Space', 'Enter'].includes(e.code)) {
      e.preventDefault();
      if (!e.repeat) attack();
    }
  };
  const release = () => {
    if (isHoldRound() && holding) {
      holding = false;
      score(performance.now() - holdStart >= (practice ? 400 : 650));
    }
  };
  ring.onpointerup = release;
  ring.onkeyup = (e) => {
    if (['Space', 'Enter'].includes(e.code)) {
      e.preventDefault();
      release();
    }
  };
  ring.focus();
  ring.onpointercancel = () => {
    holding = false;
    holdStart = 0;
  };
  const tick = (now: number) => {
    if (token !== fightToken) return;
    const elapsed = (now - last) / 1000;
    started = true;
    const isHold = isHoldRound(),
      isDecoy = isDecoyRound(),
      timeLimit = bossSea === 3 ? 2.15 : 2.6;
    if (isHold) {
      ring.style.setProperty('--ring-inset', '-4px');
      $('boss-time').style.width = `${holding ? Math.min(100, ((now - holdStart) / 650) * 100) : 0}%`;
      if (holding && now - holdStart >= (practice ? 400 : 650)) {
        score(true);
      }
    } else {
      const inset = Math.max(-28, Math.min(9, -28 + elapsed * 24));
      ring.style.setProperty('--ring-inset', inset + 'px');
      $('boss-time').style.width = `${Math.max(0, 100 - (elapsed / timeLimit) * 100)}%`;
      const low = practice ? 0.35 : bossSea === 3 ? 1.05 : 0.85,
        high = practice ? 2.2 : bossSea === 3 ? 1.52 : bossSea === 4 ? 1.5 : 1.65;
      ring.style.background = isDecoy
        ? '#2b303d'
        : elapsed >= low && elapsed <= high
          ? '#50765b'
          : '#173946c9';
    }
    if (token !== fightToken) return;
    $('fight-status').textContent =
      `공격 ${hits}/${needed} · 실수 ${misses}/4 · ${isDecoy ? '가짜 불빛은 피하세요' : isHold ? (practice ? '파란 원 0.4초 누르기' : '파란 원 0.65초 누르기') : '원이 초록색이 되면 클릭'}`;
    if (token !== fightToken) return;
    if (elapsed > (isHold ? 4 : timeLimit)) {
      if (isDecoy) setup();
      else score(false);
      if (token !== fightToken) return;
    }
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}
ocean.onFishHover = (id, shiny) => {
  if (busy) return;
  if (id === null) {
    sceneHint.textContent = coralFishing() ? (coralTrailVisible(state)
      ? '해초 사이의 말린 꼬리를 겨눠 보세요.' : '바다를 겨눠 미끼 던지기 · 물고기를 누르면 바로 낚기')
      : '물고기 위에 마우스를 올려 어종과 난이도 확인';
    return;
  }
  const f = species[id],
    rounds = fishingRules(f.rank, f.sea, state.rod).rounds;
  sceneHint.textContent = `${shiny ? '✧ 황금 · ' : ''}${f.name} · ${ranks[f.rank]} · 기본 ${rounds}라운드 · 클릭해서 낚기`;
};
ocean.onFish = (id, shiny, x, y, layer) => {
  if (!expeditionRun) void beginFish(id, shiny, x, y, state.sea, { layer });
};
ocean.onAim = showAim;
ocean.onCast = (plan) => {
  if (!coralFishing() || busy || modal.open || !ocean.bg) return;
  const token = ++fightToken;
  pendingBait = plan;
  setBusy(true);
  ocean.playBait(plan, (id, shiny, x, y) => {
    if (token !== fightToken || !pendingBait) return;
    lastBaitAim = plan.aim;
    pendingBait = null;
    busy = false;
    void beginFish(id, shiny, x, y, 0, { layer: plan.layer, trail: plan.habitat === 'trail', fromBait: true });
  });
};
function retrieveBait() {
  if (!pendingBait) return;
  fightToken++;
  pendingBait = null;
  ocean.cancelBait();
  setBusy(false);
  toast('미끼를 회수했습니다.');
}
$('bait-cancel').onclick = retrieveBait;
$('cast-aim').onclick = () => { if (!busy && coralFishing()) ocean.castAim(); };
for (const name of pointNames) {
  $('aim-' + name).onclick = () => {
    if (!coralFishing() || busy || (name === 'trail' && !coralTrailVisible(state))) return;
    ocean.aimAt(CORAL_CAST[name]);
    game.focus({ preventScroll: true });
  };
}
$('cast').onclick = () => {
  if (busy || expeditionRun) return;
  const swimmers = coralFishing() ? ocean.swimmers.filter(f => f.layer === state.layer) : ocean.swimmers;
  const f = swimmers[Math.floor(Math.random() * swimmers.length)];
  if (f) void beginFish(f.id, f.shiny, f.sprite.x, f.sprite.y);
};
$('trail-cast').onclick = () => {
  if (busy || expeditionRun) return;
  if (coralFishing()) {
    if (!coralTrailVisible(state)) return;
    ocean.aimAt(CORAL_CAST.trail);
    ocean.castAim();
  } else if (canFollowTrail(state)) void beginFish(seas[state.sea].trailId, false, 550, 330, state.sea, { trail: true });
};
$('net').onclick = () => {
  if (busy || expeditionRun || Date.now() < state.netReady) return;
  setBusy(true);
  state.netReady = Date.now() + netCooldown(state) * 1000;
  const { ids, gain } = netHaul(state),
    xp = ids.length;
  grantCaptainXp(state, xp);
  recent = [...new Set([...ids, ...recent])].slice(0, 4);
  save();
  ocean.net(ids);
  ocean.popup(gain);
  sound(300);
  setTimeout(() => {
    setBusy(false);
    toast(`그물 회수! ${ids.length}마리 · +${gain} G · +${xp} XP`);
  }, 2500);
};
$('boss').onclick = () => void beginBoss();
$('boss-help').onclick = () => {
  if (state.bossMisses[state.sea] >= 3) void beginBoss(false, true);
};
for (const kind of ['rod', 'boat'] as const)
  $(kind + '-up').onclick = () => {
    if (busy || expeditionRun || !upgrade(state, kind)) return;
    save();
    refresh();
    sound(700);
    ocean.celebrate();
    $(kind + '-up').classList.remove('upgrade-flash');
    void $(kind + '-up').offsetWidth;
    $(kind + '-up').classList.add('upgrade-flash');
    toast(
      kind === 'rod'
        ? `낚싯대 Lv.${state.rod + 1}! 포획 구역이 넓어지고 더 깊은 바다를 탐사할 수 있어요.`
        : `어선 Lv.${state.boat + 1}! 그물 ${netCount(state)}마리 · 재사용 ${netCooldown(state)}초`,
    );
  };
async function travel(to: number) {
  if (busy || expeditionRun || !canTravel(state, to) || to === state.sea) return;
  setBusy(true);
  combo = 0;
  $('voyage').hidden = false;
  $('voyage').classList.remove('arriving');
  $('voyage-name').textContent = seas[to].name;
  $('voyage-depth').textContent = seas[to].depth;
  $('voyage-note').textContent = seas[to].note;
  await pause(500);
  state.sea = to;
  state.misses = 0;
  state.layer = 'shallow';
  ocean.layer = state.layer;
  ocean.setSea(to);
  save();
  refresh();
  $('voyage').classList.add('arriving');
  await pause(1200);
  $('voyage').hidden = true;
  setBusy(false);
  toast(seas[to].name + '에 도착했습니다.');
  sound(320);
}
$('prev').onclick = () => travel(state.sea - 1);
$('next').onclick = () => travel(state.sea + 1);
$('research').onclick = () => {
  if (busy || expeditionRun) return;
  const gain = claimResearch(state);
  if (gain) {
    save();
    refresh();
    toast(`어종 연구 완료! +${gain} G`);
  }
};
$('sound').onclick = () => {
  state.sound = !state.sound;
  save();
  refresh();
  sound();
};
const modal = $<HTMLDialogElement>('modal');
$('close-modal').onclick = () => {
  if (!forgeAnimating) modal.close();
};
$('fish-forge').onclick = () => openFishForge();
$('open-forge').onclick = () => openFishForge();
$('market').onclick = () => openMarket();
modal.addEventListener('cancel', (e) => {
  if (forgeAnimating) e.preventDefault();
});
modal.addEventListener('close', () => {
  if (marketTimer) {
    clearInterval(marketTimer);
    marketTimer = null;
  }
});
modal.addEventListener('click', (e) => {
  if (e.target === modal && !forgeAnimating) {
    const r = modal.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom)
      modal.close();
  }
});
function openModal(title: string, desc: string) {
  if (busy || modal.open) return false;
  $('modal-title').textContent = title;
  $('modal-desc').textContent = desc;
  $('modal-body').innerHTML = '';
  modal.showModal();
  return true;
}
function openFishForge() {
  if (
    !openModal(
      '미페 강화실 · 낚싯대 결합',
      '다른 미페를 희생해 강화하세요. 실패하면 단계가 1 내려가지만 실패 보정이 쌓여 재도전 확률은 올라갑니다.',
    )
  )
    return;
  let filter = -1,
    targetId = -1,
    selected: number[] = [];
  const closeButton = $<HTMLButtonElement>('close-modal');
  const draw = () => {
    const body = $('modal-body'),
      scrollTop = body.scrollTop,
      owned = species.filter((f) => fishCards(state, f.id) > 0 && (filter < 0 || f.sea === filter));
    if (targetId >= 0 && !owned.some((f) => f.id === targetId)) {
      targetId = -1;
      selected = [];
    }
    const materialsTotal = species.reduce((n, f) => n + fishCopies(state, f.id), 0),
      target = targetId >= 0 ? species[targetId] : null;
    $('modal-body').innerHTML =
      `<div class="forge-summary"><div><b>보유 미페</b><strong>${species.filter((f) => fishCards(state, f.id) > 0).length} <small>/ ${species.length}종</small></strong></div><div><b>희생 가능한 카드</b><strong>${materialsTotal} <small>장</small></strong></div><div><b>낚싯대 결합</b><strong>${state.rodFish >= 0 ? species[state.rodFish].name : '비어 있음'}</strong></div></div><div class="tabs forge-tabs"><button data-sea="-1" class="${filter === -1 ? 'selected' : ''}">보유 어종</button>${seas.map((sea, i) => `<button data-sea="${i}" class="${filter === i ? 'selected' : ''}">${sea.name}</button>`).join('')}</div><h3 class="forge-section-title">강화할 미페 <small>카드 선택</small></h3><div class="forge-grid" id="forge-grid"></div>${owned.length ? '' : '<div class="forge-empty">이 해역에서 물고기를 먼저 잡으면 미페가 생겨요.</div>'}${target ? `<section class="forge-workbench"><div class="forge-target"><div class="forge-target-art" id="forge-target-art"></div><div><small>강화 대상</small><strong>${target.name} <i>+${state.fishLevel[targetId]}</i></strong><span>현재 ${Math.round(fishEnhanceChance(state.fishLevel[targetId], state.fishFailures[targetId], selected, targetId) * 100)}% · 재료 ${selected.length}/3장</span></div></div><div class="forge-slots" id="forge-slots"></div><h3 class="forge-section-title">희생할 재료 카드 <small>누르면 재료로 선택 · 기본 카드 1장은 보존</small></h3><div class="forge-material-grid" id="forge-material-grid"></div><button class="forge-attempt" id="forge-attempt" ${selected.length === 0 || state.fishLevel[targetId] >= 11 ? 'disabled' : ''}>${state.fishLevel[targetId] >= 11 ? '최대 강화 +11' : selected.length === 0 ? '재료 카드를 골라주세요' : `강화 시도 · ${Math.round(fishEnhanceChance(state.fishLevel[targetId], state.fishFailures[targetId], selected, targetId) * 100)}%`}</button></section>` : '<p class="forge-prompt">위에서 강화할 물고기 카드를 먼저 고르세요.</p>'}<p class="forge-rules">실패하면 선택한 재료가 모두 소모되고 강화 단계가 1 하락해요. +1 실패는 BASE로 복구 · 실패 보정 +12%는 유지됩니다.</p>`;
    owned.forEach((f) => {
      const level = state.fishLevel[f.id],
        card = document.createElement('article');
      card.className = `forge-card rarity-${f.rank}${targetId === f.id ? ' target-selected' : ''}`;
      const portrait = document.createElement('div');
      portrait.className = 'forge-portrait';
      portrait.append(fishArt(f.shape, f.hue, state.shiny[f.id] > 0));
      const rank = document.createElement('span');
      rank.className = 'forge-rank';
      rank.textContent = ranks[f.rank];
      portrait.append(rank);
      const badge = document.createElement('b');
      badge.className = 'forge-level';
      badge.textContent = level ? `+${level}` : 'BASE';
      portrait.append(badge);
      card.append(portrait);
      const info = document.createElement('div');
      info.className = 'forge-info';
      info.innerHTML = `<strong>${f.name}</strong><small>${seas[f.sea].name} · 보유 ${fishCards(state, f.id)}장</small><div class="forge-stars">${Array.from({ length: 11 }, (_, i) => `<i class="${i < level ? 'lit' : ''}">★</i>`).join('')}</div>`;
      card.append(info);
      const choose = document.createElement('button');
      choose.className = 'forge-target-select';
      choose.textContent = targetId === f.id ? '강화 대상 선택됨' : '강화 대상으로 선택';
      choose.onclick = () => {
        targetId = f.id;
        selected = [];
        draw();
        document.querySelector('.forge-workbench')?.scrollIntoView({ block: 'nearest' });
      };
      card.append(choose);
      if (level > 0) {
        const equip = document.createElement('button');
        equip.className = 'forge-target-select';
        equip.textContent = state.rodFish === f.id ? '결합 해제' : '낚싯대에 결합';
        equip.onclick = () => {
          if (forgeAnimating || state.fishLevel[f.id] === 0 || !fishCards(state, f.id)) return;
          state.rodFish = state.rodFish === f.id ? -1 : f.id;
          save();
          refresh();
          draw();
        };
        card.append(equip);
      }
      $('forge-grid').append(card);
    });
    if (target) {
      $('forge-target-art').append(fishArt(target.shape, target.hue, state.shiny[targetId] > 0));
      $('forge-slots').innerHTML = Array.from({ length: 3 }, (_, i) => {
        const mat = selected[i];
        return mat === undefined
          ? '<div class="forge-slot empty"><span>＋</span><small>재료 슬롯</small></div>'
          : `<button class="forge-slot filled" data-remove-slot="${i}"><span>${species[mat].name}</span><small>${ranks[species[mat].rank]} · 제거 ×</small></button>`;
      }).join('');
      $('forge-slots')
        .querySelectorAll<HTMLButtonElement>('[data-remove-slot]')
        .forEach(
          (b) =>
            (b.onclick = () => {
              selected.splice(Number(b.dataset.removeSlot), 1);
              draw();
            }),
        );
      species
        .filter((f) => fishCopies(state, f.id) > 0)
        .forEach((f) => {
          const picked = selected.filter((id) => id === f.id).length,
            available = fishCopies(state, f.id),
            button = document.createElement('button');
          button.className = 'forge-material' + (picked ? ' material-picked' : '');
          button.disabled = picked >= available || selected.length >= 3;
          button.innerHTML = `<span class="material-grade" style="color:${colors[f.rank]}">${ranks[f.rank]}</span><strong>${f.name}</strong><small>남은 카드 ${available - picked} / ${available}</small>${picked ? `<b>선택 ×${picked}</b>` : ''}`;
          button.onclick = () => {
            if (picked < available && selected.length < 3) {
              selected.push(f.id);
              draw();
            }
          };
          $('forge-material-grid').append(button);
        });
      $('forge-attempt').onclick = async () => {
        if (forgeAnimating || selected.length === 0 || state.fishLevel[targetId] >= 11) return;
        forgeAnimating = true;
        const materials = [...selected],
          chance = fishEnhanceChance(
            state.fishLevel[targetId],
            state.fishFailures[targetId],
            materials,
            targetId,
          ),
          overlay = document.createElement('div');
        overlay.className = 'forge-reveal charging';
        overlay.innerHTML = `<div class="reveal-rays">✦ ✧ ✦ ✧ ✦</div><div class="reveal-heading">카드를 바치는 중</div><div class="reveal-material-names">${materials.map((id) => species[id].name).join(' · ')}</div><div class="reveal-target" id="reveal-target"></div><div class="reveal-charge"><i></i></div><div class="reveal-caption">강화 확률 ${Math.round(chance * 100)}% · 결과를 확인하는 중…</div>`;
        overlay.setAttribute('aria-live', 'assertive');
        $('modal-body').append(overlay);
        $('reveal-target').append(fishArt(target.shape, target.hue, state.shiny[targetId] > 0));
        closeButton.disabled = true;
        sound(245);
        await pause(1850);
        const result = enhanceFish(state, targetId, materials);
        forgeAnimating = false;
        closeButton.disabled = false;
        if (!result) {
          overlay.remove();
          toast('재료 카드가 변경되어 강화를 취소했어요.');
          draw();
          return;
        }
        save();
        refresh();
        selected = [];
        draw();
        const reveal = document.createElement('div');
        reveal.className = 'forge-reveal ' + (result.success ? 'reveal-success' : 'reveal-failure');
        reveal.innerHTML = `<div class="reveal-rays">${result.success ? '✦ ✧ ★ ✧ ✦' : '✧ · ✧'}</div><div class="reveal-heading">${result.success ? '강화 성공!' : '강화 실패'}</div><div class="reveal-target" id="reveal-final"></div><div class="reveal-result-level">${target.name} ${result.success ? `+${result.level}` : result.levelDropped ? `+${result.previousLevel} → +${result.level}` : `BASE 유지`}</div><div class="reveal-caption">${result.success ? '미페가 한 단계 강해졌어요.' : `${result.detached ? 'BASE까지 하락해 낚싯대 결합이 해제됐어요.' : result.levelDropped ? '강화 단계 하락 · ' : ''}재료 ${result.materials}장 소모 · 다음 확률 ${Math.round(fishEnhanceChance(result.level, state.fishFailures[targetId], [], targetId) * 100)}%`}</div><button class="reveal-continue">계속</button>`;
        reveal.setAttribute('aria-live', 'assertive');
        $('modal-body').append(reveal);
        $('reveal-final').append(fishArt(target.shape, target.hue, state.shiny[targetId] > 0));
        reveal.querySelector<HTMLButtonElement>('.reveal-continue')!.onclick = () => reveal.remove();
        sound(result.success ? 960 : 130);
      };
    }
    $('modal-body')
      .querySelectorAll<HTMLButtonElement>('[data-sea]')
      .forEach(
        (b) =>
          (b.onclick = () => {
            filter = Number(b.dataset.sea);
            selected = [];
            draw();
          }),
      );
    body.scrollTop = scrollTop;
  };
  draw();
}
function openMarket() {
  if (
    !openModal(
      '대양 어시장 · LIVE EXCHANGE',
      '물고기 시세는 매분 움직입니다. 사고팔아 컬렉션과 강화 재료를 모으세요. 매물 수량은 매일 갱신됩니다.',
    )
  )
    return;
  if (syncMarket(state)) save();
  let filter = -1,
    rankFilter = -1,
    sort = 'change',
    query = '';
  const draw = () => {
    const body = $('modal-body'),
      scrollTop = body.scrollTop,
      activeId = (document.activeElement as HTMLElement | null)?.id,
      activeInput = document.activeElement instanceof HTMLInputElement ? document.activeElement : null,
      caret = activeInput?.selectionStart ?? 0,
      now = Date.now(),
      day = marketDayKey(now),
      resetAt = new Date();
    resetAt.setHours(24, 0, 0, 0);
    const resetMins = Math.max(0, Math.ceil((resetAt.getTime() - now) / 60000));
    let listed = species.filter(
      (f) =>
        (filter < 0 || f.sea === filter) &&
        (rankFilter < 0 || f.rank === rankFilter) &&
        f.name.includes(query.trim()),
    );
    listed.sort((a, b) => {
      const qa = marketQuote(a.id, now),
        qb = marketQuote(b.id, now);
      if (sort === 'cheap') return qa.price - qb.price;
      if (sort === 'expensive') return qb.price - qa.price;
      if (sort === 'rarity') return b.rank - a.rank || qb.price - qa.price;
      return Math.abs(qb.change) - Math.abs(qa.change);
    });
    const movers = [...species]
      .map((f) => ({ f, q: marketQuote(f.id, now) }))
      .sort((a, b) => b.q.change - a.q.change)
      .slice(0, 3);
    body.innerHTML = `<div class="market-ticker"><div class="market-brand"><span>◈</span><div><strong>PELAGIC EXCHANGE</strong><small>LIVE FISH MARKET · 1 MIN TICK</small></div></div><div class="market-cash"><small>주문 가능 골드</small><strong>${fmt(state.gold)} G</strong></div><div class="market-reset"><small>일일 재고 초기화</small><strong>${Math.floor(resetMins / 60)}시간 ${resetMins % 60}분</strong></div></div><div class="market-leaders"><div class="leaders-title"><span>오늘의 급등 어종</span><small>분 단위 시세 변동</small></div>${movers.map(({ f, q }, i) => `<div class="leader"><span class="leader-rank">0${i + 1}</span><strong>${f.name}</strong><small>${seas[f.sea].name}</small><b class="${q.change >= 0 ? 'up' : 'down'}">${q.change >= 0 ? '▲' : '▼'} ${Math.abs(q.change).toFixed(1)}%</b><em>${fmt(q.price)} G</em></div>`).join('')}</div><div class="market-tools"><label class="market-search">⌕ <input id="market-search" placeholder="물고기 이름 검색" value="${query.replaceAll('"', '&quot;')}"></label><select id="market-rank"><option value="-1">전체 등급</option>${ranks.map((r, i) => `<option value="${i}" ${i === rankFilter ? 'selected' : ''}>${r}</option>`).join('')}</select><select id="market-sort"><option value="change" ${sort === 'change' ? 'selected' : ''}>변동률 순</option><option value="cheap" ${sort === 'cheap' ? 'selected' : ''}>낮은 가격 순</option><option value="expensive" ${sort === 'expensive' ? 'selected' : ''}>높은 가격 순</option><option value="rarity" ${sort === 'rarity' ? 'selected' : ''}>희귀도 순</option></select></div><div class="tabs market-sea-tabs"><button data-sea="-1" class="${filter === -1 ? 'selected' : ''}">전체 시장</button>${seas.map((sea, i) => `<button data-sea="${i}" class="${filter === i ? 'selected' : ''}">${sea.name}</button>`).join('')}</div><div class="market-count">${listed.length}종 매물 <small>매입 가격은 현재가 · 매도가는 현재가의 72%</small></div><div class="market-grid" id="market-grid"></div>${listed.length ? '' : '<div class="forge-empty">검색 조건에 맞는 매물이 없습니다.</div>'}<p class="market-footnote">가격은 시장 지수에 따라 매분 변동합니다. 매입 카드는 포획·의뢰·보스 진행을 올리지 않으며, 중복 카드만 매도할 수 있습니다.</p>`;
    listed.forEach((f) => {
      const id = f.id,
        quote = marketQuote(id, now),
        remaining = marketRemaining(state, id, now),
        owned = fishCards(state, id),
        copies = Math.min(state.tradable[id], fishCopies(state, id)),
        sellPrice = Math.max(1, Math.round(quote.price * 0.72)),
        card = document.createElement('article');
      card.className = `market-card rarity-${f.rank}`;
      const art = document.createElement('div');
      art.className = 'market-art';
      art.append(fishArt(f.shape, f.hue, state.shiny[id] > 0));
      const grade = document.createElement('span');
      grade.className = 'market-grade';
      grade.style.color = colors[f.rank];
      grade.textContent = ranks[f.rank];
      art.append(grade);
      const delta = document.createElement('b');
      delta.className = 'market-delta ' + (quote.change >= 0 ? 'up' : 'down');
      delta.textContent = `${quote.change >= 0 ? '▲' : '▼'} ${Math.abs(quote.change).toFixed(1)}%`;
      art.append(delta);
      card.append(art);
      const info = document.createElement('div');
      info.className = 'market-info';
      info.innerHTML = `<strong>${f.name}</strong><small>${seas[f.sea].name} · 보유 카드 ${owned}</small><div class="market-price"><span>${fmt(quote.price)} <i>G</i></span><small>기준가 ${fmt(quote.base)} G</small></div><div class="market-stock"><span>오늘 남은 매물</span><b>${remaining} / ${marketDailyStock(id, now)}</b></div><div class="market-stock-meter"><i style="width:${(remaining / marketDailyStock(id, now)) * 100}%"></i></div>`;
      card.append(info);
      const actions = document.createElement('div');
      actions.className = 'market-actions';
      for (const qty of [1, 3]) {
        const button = document.createElement('button');
        button.className = 'market-buy';
        button.disabled = remaining < qty || state.gold < quote.price * qty;
        button.textContent = `매입 ×${qty} · ${fmt(quote.price * qty)} G`;
        button.onclick = () => {
          const checkedAt = Date.now();
          if (marketQuote(id, checkedAt).price !== quote.price) {
            draw();
            toast('시세가 바뀌었어요. 새 가격을 확인해 주세요.');
            return;
          }
          const result = buyFish(state, id, qty, checkedAt);
          if (!result) {
            toast('골드가 부족하거나 오늘 매물이 소진됐어요.');
            draw();
            return;
          }
          save();
          refresh();
          draw();
          sound(650);
          toast(`${f.name} 미페 ${qty}장 매입 · -${fmt(result.cost)} G`);
        };
        actions.append(button);
      }
      if (copies > 0) {
        const sell = document.createElement('button');
        sell.className = 'market-sell';
        sell.textContent = `중복 1장 매도 · +${fmt(sellPrice)} G`;
        sell.onclick = () => {
          const checkedAt = Date.now();
          if (marketQuote(id, checkedAt).price !== quote.price) {
            draw();
            toast('시세가 바뀌었어요. 매도가를 다시 확인해 주세요.');
            return;
          }
          const result = sellFish(state, id, 1, checkedAt);
          if (!result) return;
          save();
          refresh();
          draw();
          sound(390);
          toast(`${f.name} 미페 1장 매도 · +${fmt(result.gain)} G`);
        };
        actions.append(sell);
      } else {
        const note = document.createElement('small');
        note.className = 'market-sell-note';
        note.textContent = '기본 카드 보호 · 중복 보유 시 매도 가능';
        actions.append(note);
      }
      card.append(actions);
      $('market-grid').append(card);
    });
    const search = $<HTMLInputElement>('market-search');
    search.oninput = () => {
      const pos = search.selectionStart ?? search.value.length;
      query = search.value;
      draw();
      const next = $<HTMLInputElement>('market-search');
      next.focus();
      next.setSelectionRange(pos, pos);
    };
    $<HTMLSelectElement>('market-rank').onchange = (e) => {
      rankFilter = Number((e.target as HTMLSelectElement).value);
      draw();
    };
    $<HTMLSelectElement>('market-sort').onchange = (e) => {
      sort = (e.target as HTMLSelectElement).value;
      draw();
    };
    body.querySelectorAll<HTMLButtonElement>('[data-sea]').forEach(
      (b) =>
        (b.onclick = () => {
          filter = Number(b.dataset.sea);
          draw();
        }),
    );
    body.scrollTop = scrollTop;
    if (activeId) {
      const focused = document.getElementById(activeId);
      focused?.focus();
      if (focused instanceof HTMLInputElement) focused.setSelectionRange(caret, caret);
    }
  };
  draw();
  if (marketTimer) clearInterval(marketTimer);
  marketTimer = setInterval(() => {
    if (modal.open) draw();
    else if (marketTimer) {
      clearInterval(marketTimer);
      marketTimer = null;
    }
  }, 15000);
}
function showExpedition() {
  if (!state.bosses[seas.length - 1] && !state.runClears) {
    toast('마지막 해역 보스를 격파하면 원정이 열립니다.');
    return;
  }
  if (expeditionRun) {
    showRunBoard();
    return;
  }
  if (
    !openModal(
      '심해 원정',
      '모든 해역을 잇는 한 번의 항해. 길을 고르고, 그 판의 장비 조합을 만들어 최종 보스를 만나세요.',
    )
  )
    return;
  $('modal-body').innerHTML =
    `<div class="run-intro"><div class="run-route-preview">${seas.map((sea) => sea.name).join(' <span>→</span> ')}</div><p>해역마다 경로를 두 번 선택합니다. 실패해도 도감과 일반 골드는 그대로 남아요. 원정 완주 기록 <b>${state.runClears}</b>회 · 최고 전리품 <b>${fmt(state.bestRun)}</b></p><h3>출항 장비 선택</h3><div class="loadout-grid"><button data-loadout="steady"><span>⌁</span><strong>안정 릴</strong><small>첫 원정에 추천<br>낚시 라운드 감소 · 포획 구역 증가</small></button><button data-loadout="deepPurse"><span>◈</span><strong>진주 저금통</strong><small>포획 골드 +35%<br>보물 욕심을 채우는 항해</small></button><button data-loadout="sonar"><span>⌖</span><strong>심해 소나</strong><small>위험 해류에서<br>더 높은 등급의 어종 발견</small></button></div><p class="run-note">원정 중 잡은 물고기와 도감 기록은 영구 저장됩니다. 보스 결전 뒤에는 유물을 골라 다음 바다로 갑니다.</p></div>`;
  $('modal-body')
    .querySelectorAll<HTMLButtonElement>('[data-loadout]')
    .forEach((b) => (b.onclick = () => startExpedition(b.dataset.loadout!)));
}
function startExpedition(loadout: string) {
  expeditionRun = {
    returnSea: state.sea,
    sea: 0,
    node: 0,
    hull: 3,
    haul: 0,
    catches: 0,
    relics: [loadout],
    usedRescue: false,
  };
  combo = 0;
  ocean.setSea(0);
  modal.close();
  refresh();
  toast('출항! 경로를 골라 첫 바다를 탐험하세요.');
  showRunBoard();
}
function runRelicNames() {
  return (
    expeditionRun?.relics.map((id) => relics.find((r) => r.id === id)?.name ?? id).join(' · ') ?? ''
  );
}
function queueRunBoard(delay: number) {
  const run = expeditionRun,
    token = fightToken;
  setTimeout(() => {
    if (run && run === expeditionRun && token === fightToken && !busy && !modal.open) showRunBoard();
  }, delay);
}
function showRunBoard() {
  const r = expeditionRun;
  if (!r) return;
  const sea = seas[r.sea];
  if (
    !openModal(
      `원정 ${String(r.sea + 1).padStart(2, '0')} / ${String(seas.length).padStart(2, '0')} · ${sea.name}`,
      '항로 선택 · 같은 바다도 고른 길에 따라 보상과 위험이 달라집니다.',
    )
  )
    return;
  const stops = Math.min(r.node, 2);
  $('modal-body').innerHTML =
    `<div class="run-status"><div><small>선체</small><strong>${'◆'.repeat(r.hull)}${'◇'.repeat(3 - r.hull)}</strong></div><div><small>전리품 점수</small><strong>${fmt(r.haul)}</strong></div><div><small>원정 포획</small><strong>${r.catches}마리</strong></div></div><div class="run-progress"><div class="run-stages">${seas.map((s, i) => `<span class="${i < r.sea ? 'passed' : i === r.sea ? 'current' : ''}">${i < r.sea ? '✓' : '0' + (i + 1)}<small>${s.name}</small></span>`).join('')}</div><div class="run-track"><i style="width:${(r.sea / seas.length) * 100}%"></i></div></div><div class="run-relics"><b>이번 원정 유물</b>${r.relics
      .map((id) => {
        const item = relics.find((x) => x.id === id)!;
        return `<span title="${item.desc}">${item.icon} ${item.name}</span>`;
      })
      .join(
        '',
      )}</div>${r.node < 2 ? `<h3 class="route-title">${r.node === 0 ? '첫 번째' : '두 번째'} 경로를 선택하세요 <small>${stops} / 2</small></h3><div class="route-grid"><button data-route="calm"><span>〰</span><strong>산호 군락</strong><small>잔잔한 물살 · 일반/고급 어종<br>쉬운 낚시와 안정적인 항해</small><b>위험 낮음</b></button><button data-route="surge"><span>⚡</span><strong>급류 사냥터</strong><small>희귀/영웅 어종 도전<br>실패하면 선체를 잃을 수 있음</small><b>보상 높음</b></button><button data-route="wreck"><span>▦</span><strong>난파선 탐색</strong><small>낚시 대신 유물 하나 선택<br>원정 빌드를 강화</small><b>유물 획득</b></button>${r.hull < 3 ? '<button data-route="buoy"><span>◉</span><strong>수리 부표</strong><small>선체 한 칸 수리<br>보상 없이 안전하게 진행</small><b>선체 회복</b></button>' : ''}</div>` : `<div class="run-boss-gate"><div class="boss-glyph">✹</div><h3>${sea.boss}가 길을 막아섭니다</h3><p>두 경로를 모두 통과했습니다. 보스를 격파하면 선체를 수리하고 다음 해역으로 진입합니다.</p><button id="run-boss">해역 보스와 결전</button></div>`}<div class="run-footer"><span>귀환하면 전리품 점수 보너스는 받지 않지만, 포획·도감·골드는 보존됩니다.</span><button id="run-retreat">항구로 귀환</button></div>`;
  $('modal-body')
    .querySelectorAll<HTMLButtonElement>('[data-route]')
    .forEach((b) => (b.onclick = () => enterRunRoute(b.dataset.route!)));
  $('run-boss')?.addEventListener('click', () => {
    modal.close();
    void beginBoss(true);
  });
  $('run-retreat').onclick = () => endExpedition(false);
}
function enterRunRoute(route: string) {
  const r = expeditionRun;
  if (!r) return;
  modal.close();
  if (route === 'wreck') {
    showRelicDraft('난파선에서 유물을 발견했어요', () => advanceRunNode());
    return;
  }
  if (route === 'buoy') {
    if (r.hull < 3) r.hull++;
    else r.haul += 150;
    advanceRunNode();
    return;
  }
  const rank =
    route === 'calm'
      ? Math.floor(Math.random() * 3)
      : r.relics.includes('sonar')
        ? 5 + Math.floor(Math.random() * 5)
        : 3 + Math.floor(Math.random() * 7);
  const id = seas[r.sea].fish[rank][0],
    shiny = r.relics.includes('lucky') && Math.random() < 0.08;
  void beginFish(id, shiny, 540, 335, r.sea);
}
function advanceRunNode() {
  const r = expeditionRun;
  if (!r) return;
  r.node++;
  save();
  showRunBoard();
}
function showRelicDraft(title: string, done: () => void) {
  if (!openModal(title, '세 가지 중 하나를 고르세요. 유물은 이번 원정 동안 계속 효과를 냅니다.')) return;
  const choices = [...relics]
    .filter((x) => x.id === 'salvage' || !expeditionRun?.relics.includes(x.id))
    .sort(() => Math.random() - 0.5)
    .slice(0, 3);
  $('modal-body').innerHTML =
    `<div class="relic-grid">${choices.map((x) => `<button data-relic="${x.id}"><span>${x.icon}</span><strong>${x.name}</strong><small>${x.desc}</small></button>`).join('')}</div>`;
  $('modal-body')
    .querySelectorAll<HTMLButtonElement>('[data-relic]')
    .forEach(
      (b) =>
        (b.onclick = () => {
          const r = expeditionRun;
          if (!r) return;
          if (b.dataset.relic === 'salvage') r.haul += 300;
          else r.relics.push(b.dataset.relic!);
          modal.close();
          done();
        }),
    );
}
function endExpedition(cleared: boolean) {
  const r = expeditionRun;
  if (!r) return;
  const finalScore = r.haul,
    returnSea = r.returnSea;
  expeditionRun = null;
  ocean.setSea(returnSea);
  save();
  refresh();
  if (cleared) {
    openModal(
      '원정 완주 · 심해의 끝',
      '모든 해역의 보스를 모두 격파했습니다. 항해 기록은 영구 보관됩니다.',
    );
    $('modal-body').innerHTML =
      `<div class="run-result"><div>✦</div><h3>ABYSSAL VOYAGER</h3><p>전리품 점수 <b>${fmt(finalScore)}</b></p><p>누적 원정 완주 <b>${state.runClears}</b>회 · 최고 기록 <b>${fmt(state.bestRun)}</b></p><button id="run-again">다시 출항</button></div>`;
    $('run-again').onclick = () => {
      modal.close();
      showExpedition();
    };
  } else {
    modal.close();
    toast(`항구로 돌아왔어요 · 이번 전리품 점수 ${fmt(finalScore)} · 도감과 포획 기록은 남았습니다.`);
  }
}
function finishRunBoss(bossSea: number) {
  const r = expeditionRun;
  if (!r) return;
  const reward = 350 + bossSea * 240 + Math.round(r.haul * 0.08);
  state.gold += reward;
  const level = awardXp(180 + bossSea * 80);
  r.haul += reward;
  r.sea = bossSea + 1;
  r.node = 0;
  r.hull = Math.min(3, r.hull + 1);
  if (bossSea === seas.length - 1) {
    state.runClears++;
    state.bestRun = Math.max(state.bestRun, r.haul);
    const clearBonus = 1800;
    state.gold += clearBonus;
    const finalScore = r.haul;
    r.haul += clearBonus;
    state.bestRun = Math.max(state.bestRun, r.haul);
    save();
    sound(940);
    toast(`심해 원정 완주! 보스 보상 +${reward + clearBonus} G · 선장 XP 획득`);
    endExpedition(true);
    return;
  }
  ocean.setSea(r.sea);
  save();
  refresh();
  toast(`${seas[bossSea].boss} 격파! +${reward} G · 다음 해역으로`);
  showRelicDraft('보스의 보물 · 다음 해역 유물 선택', () => {
    if (expeditionRun) showRunBoard();
  });
}
function openBook() {
  if (
    !openModal(
      '바다 생물 도감',
      species.length + '종의 물고기와 황금 변종 · 직접 포획하거나 어시장에서 매입한 카드가 기록됩니다.',
    )
  )
    return;
  let filter = -1;
  const draw = () => {
    $('modal-body').innerHTML =
      `<div class="tabs"><button data-sea="-1" class="${filter === -1 ? 'selected' : ''}">전체 해역</button>${seas.map((s, i) => `<button data-sea="${i}" class="${filter === i ? 'selected' : ''}">${s.name}</button>`).join('')}</div><div class="book-grid" id="book-grid"></div>`;
    species
      .filter((f) => filter < 0 || f.sea === filter)
      .forEach((f) => {
        const seen = state.counts[f.id] > 0 || state.fishBought[f.id] > 0,
          card = document.createElement('div');
        card.className = 'fish-card' + (seen ? '' : ' locked');
        card.append(fishArt(f.shape, f.hue));
        const detail = document.createElement('div');
        detail.innerHTML = `<strong>${seen ? f.name : '???'}</strong><small style="color:${colors[f.rank]}">${ranks[f.rank]} · ${seas[f.sea].name}</small><small>${seen ? `${state.counts[f.id] ? '직접 포획' : '시장 입수'} · 최대 ${state.maxCm[f.id] ? state.maxCm[f.id] + ' cm' : '기록 없음'} · 포획 ${state.counts[f.id]}마리 · 구매 ${state.fishBought[f.id]}장 · ${f.value} G${state.shiny[f.id] ? ` · ✧ ${state.shiny[f.id]}` : ''}` : '아직 발견하지 못했어요'}</small>${seen ? `<small>${f.description}</small>` : ''}`;
        if (seen) {
          const info = document.createElement('small');
          info.textContent =
            '미니게임 ' + fishingRules(f.rank, f.sea, state.rod).rounds + '회 · 변종 보상 ×4';
          detail.append(info);
          if (state.shiny[f.id]) {
            const variant = fishArt(f.shape, f.hue, true);
            variant.title = '발견한 황금 변종';
            variant.style.width = '64px';
            variant.style.height = '40px';
            detail.append(variant);
          }
        }
        if (state.trailCompleted[f.sea] && f.id === seas[f.sea].trailId) {
          const stamp = document.createElement('small');
          stamp.textContent = '✓ 해역 관찰 표본';
          detail.append(stamp);
        }
        card.append(detail);
        $('book-grid').append(card);
      });
    $('modal-body')
      .querySelectorAll<HTMLButtonElement>('[data-sea]')
      .forEach(
        (b) =>
          (b.onclick = () => {
            filter = Number(b.dataset.sea);
            draw();
          }),
      );
  };
  draw();
}
$('expedition').onclick = showExpedition;
$('book').onclick = openBook;
$('open-log').onclick = openBook;
$('home').onclick = () => window.scrollTo({ top: 0, behavior: 'smooth' });
function openHelp() {
  if (
    !openModal(
      '작은 어부를 위한 안내',
      '천천히 탐험해도 괜찮아요. 진행 상황은 이 브라우저에 자동으로 기록됩니다.',
    )
  )
    return;
  $('modal-body').innerHTML =
    `<div class="help-content"><h3>01 / 낚싯줄 던지기</h3>햇살 산호해에서는 바다를 겨누면 점선과 예상 착수점이 보입니다. 물 위를 클릭해 미끼를 던지세요. 터치로 겨눈 뒤에는 ‘겨눈 곳에 던지기’를 누르세요. 방향키로 포인트를 고르고 Enter로 던질 수도 있어요. 보이는 물고기를 누르거나 ‘바로 낚기’ 또는 Space로 곧장 낚시할 수 있습니다. 표시된 조작으로 1~3라운드를 마치면 물고기의 크기와 판매금이 표시됩니다.<h3>02 / 더 깊은 바다로</h3>산호해의 200 m 줄은 깊은 해초밭 안쪽까지 닿습니다. 안쪽에서 세 마리를 직접 낚으면 해초 사이에 표본의 흔적이 나타납니다. 산호해 수동 낚시는 기본 라운드마다 1조사점씩 얻습니다. 다른 해역에서는 장비 공방에서 낚싯줄을 강화한 뒤 깊은 층을 선택하세요. 깊은 층 한 마리를 포함해 해역 조사를 마치고 보스를 이기면 다음 해역으로 출항할 수 있습니다. <h3>03 / 보스의 타이밍</h3>노란 원이 초록색으로 바뀌면 클릭하세요. 파란 원은 표시된 시간 동안 누르세요. 네 번 실수하면 전투가 끝나지만 바로 재도전할 수 있습니다. 첫 처치 보상은 한 번만 지급됩니다.<h3>04 / 발견의 즐거움</h3>그물은 재사용 시간이 있는 스킬입니다. 장비 강화로 포획 수와 사용 빈도가 증가합니다. 각 해역의 서로 다른 어종 5종을 모으면 연구 보상을 받을 수 있습니다. 일반·고급·희귀·특급·영웅·전설·신화·고대·초월·심연 10등급을 수집하세요. 2.5% 확률의 황금 변종은 4배의 골드를 줍니다. 미페 카드는 희생 재료로 최대 +11까지 강화할 수 있습니다.<h3>05 / 내 기록 보관하기</h3>기록은 브라우저마다 따로 저장됩니다. 다른 브라우저로 옮기거나 백업할 때 아래 내보내기를 사용하세요. 가져오기는 현재 기록을 바꾸므로 기존 기록도 먼저 보관해 주세요.</div><div class="settings-actions">${__HAS_SOURCE_ZIP__ ? '<a href="/ABYSS-PC.zip" download>PC 프로젝트 ZIP 다운로드</a>' : ''}<button id="export">기록 내보내기 ↓</button><button id="import">기록 가져오기 ↑</button><input id="save-file" type="file" accept="application/json,.json"></div>`;
  $('export').onclick = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'abyss-save.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('저장 기록을 내보냈습니다.');
  };
  $('import').onclick = () => $('save-file').click();
  $<HTMLInputElement>('save-file').onchange = async (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    (e.target as HTMLInputElement).value = '';
    if (!f) return;
    let candidate: Save;
    try {
      candidate = parseSave(await f.text());
    } catch {
      toast('올바른 ABYSS 저장 파일이 아닙니다.');
      return;
    }
    try {
      if (!confirm('가져온 기록으로 현재 진행 상황을 바꿀까요?')) return;
      storeSave(localStorage, candidate);
      state = candidate;
      storageBlocked = false;
      recent = [];
      lastBaitAim = null;
      combo = 0;
      expeditionRun = null;
      ocean.layer = state.layer;
      ocean.setSea(state.sea);
      refresh();
      modal.close();
      toast('기록을 가져왔습니다.');
    } catch {
      toast('가져온 기록을 저장하지 못했습니다. 기존 기록을 유지합니다.');
    }
  };
}
$('help').onclick = openHelp;
window.addEventListener('keydown', (e) => {
  if (modal.open || e.repeat || e.altKey || e.ctrlKey || e.metaKey) return;
  if (e.key === 'Escape' && pendingBait) {
    e.preventDefault();
    retrieveBait();
    return;
  }
  const target = e.target as HTMLElement;
  const chartKeys = target === document.body || game.contains(target) || !!target.closest('#cast-chart, #cast-aim');
  if (coralFishing() && !busy && chartKeys) {
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault();
      const points = pointNames.filter(name => name !== 'trail' || coralTrailVisible(state));
      const index = points.findIndex(name => $('aim-' + name).getAttribute('aria-pressed') === 'true');
      const next = index < 0 ? (e.key === 'ArrowRight' ? 0 : points.length - 1)
        : (index + (e.key === 'ArrowRight' ? 1 : -1) + points.length) % points.length;
      $('aim-' + points[next]).click();
      return;
    }
    if (e.key === 'Enter' && !target.closest('.cast-points')) {
      e.preventDefault();
      ocean.castAim();
      return;
    }
  }
  if (
    e.code === 'Space' &&
    !e.repeat &&
    !busy &&
    !modal.open &&
    !['BUTTON', 'INPUT'].includes((e.target as HTMLElement).tagName)
  ) {
    e.preventDefault();
    $('cast').click();
  }
});
document.addEventListener('visibilitychange', () => {
  if (document.hidden && pendingBait) retrieveBait();
  else if (document.hidden && busy && !$('minigame').hidden) {
    fightToken++;
    resetFight();
    toast('잠시 자리를 비워 낚시를 중단했어요. 다시 도전할 수 있습니다.');
  }
});
setInterval(() => {
  const remaining = Math.max(0, Math.ceil((state.netReady - Date.now()) / 1000));
  $('net-label').textContent = remaining ? `${remaining}s` : '준비 완료';
  ($('net') as HTMLButtonElement).disabled = busy || !!expeditionRun || remaining > 0;
}, 200);
document.querySelector('.ocean-head')!.after(document.querySelector('.depth-tools')!);
document.querySelector('.topbar')!.after($('save-status'));
$('save-status').classList.add('save-indicator');
ocean.onReady = refresh;
refresh();
if (storageBlocked) {
  $('save-status').textContent = '저장 읽기 실패 · 기존 원본 보존 중 · 플레이 안내에서 가져오기';
  $('save-status').classList.add('save-warning');
}
$('ranking').onclick = async () => {
  if (
    !openModal(
      '선장 랭킹',
      '보스 승리 해역 수, 직접 낚은 마릿수 순으로 정렬합니다. 같은 브라우저의 최고 기록을 보관합니다.',
    )
  )
    return;
  const target = document.createElement('div');
  $('modal-body').append(target);
  try {
    const { showLeaderboard } = await import('./ranking');
    await showLeaderboard(target, state);
  } catch {
    target.textContent = '랭킹을 불러오지 못했습니다. 다시 열어 주세요.';
  }
};

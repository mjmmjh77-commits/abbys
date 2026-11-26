export type Layer = 'shallow' | 'deep';
const coralDepth = { boundary: 100, end: 200 } as const;
const currentDepth = { boundary: 600, end: 1000 } as const;
type FishEntry = [
  id: number,
  name: string,
  shape: number,
  minCm: number,
  maxCm: number,
  description: string,
];
interface Habitat {
  id: string;
  name: string;
  en: string;
  note: string;
  boss: string;
  perk: string;
  color: number;
  start: number;
  boundary: number;
  end: number;
  target: number;
  lineCost: number;
  reelCost: number;
  reward: number;
  floor: number;
  modes: string[];
  shallow: number[];
  deep: number[];
  trailId: number;
  trailClue: string;
  fish: FishEntry[];
}
const habitats: Habitat[] = [
  {
    id: 'coral',
    trailId: 6,
    trailClue: '해초를 감은 작은 꼬리 끝이 물살에도 풀리지 않습니다.',
    name: '햇살 산호해',
    en: 'CORAL COAST',
    note: '파도 아래, 첫 번째 모험',
    boss: '산호의 수호자',
    perk: '잔잔한 해류 · 넓은 포획 구역',
    color: 0x74cabc,
    start: 0,
    ...coralDepth,
    target: 6,
    lineCost: 120,
    reelCost: 100,
    reward: 40,
    floor: 20,
    modes: ['track', 'timing', 'hold'],
    shallow: [0, 2, 3, 4, 1],
    deep: [1, 5, 6, 7, 8, 9],
    fish: [
      [0, '흰동가리', 0, 6, 22, '말미잘 촉수 사이에서 짧게 방향을 바꿉니다.'],
      [1, '청줄돔', 1, 12, 37, '가느다란 청색 줄무늬가 물결처럼 이어집니다.'],
      [2, '노랑나비고기', 6, 8, 23, '산호 틈의 작은 먹이를 긴 주둥이로 찾습니다.'],
      [3, '산호망둑', 0, 3, 12, '모래에 몸을 붙였다가 짧게 튀어 오릅니다.'],
      [4, '은빛정어리', 1, 10, 28, '한 마리가 돌면 무리 전체가 은빛으로 반짝입니다.'],
      [5, '파랑쥐치', 6, 11, 34, '가슴지느러미를 저어 산호 벽을 훑습니다.'],
      [6, '분홍해마', 7, 5, 18, '꼬리를 해초에 감고 물살을 견딥니다.'],
      [7, '유리복어', 8, 7, 26, '둥근 몸을 부풀려 그림자를 키웁니다.'],
      [8, '붉은쏠배감펭', 9, 15, 38, '긴 등지느러미를 펴고 바위 사이를 지킵니다.'],
      [9, '황금엔젤', 6, 13, 36, '부채꼴 지느러미의 가장자리가 금빛입니다.'],
    ],
  },
  {
    id: 'current',
    trailId: 16,
    trailClue: '가느다란 은빛 띠가 물살을 거슬러 수직으로 섭니다.',
    name: '푸른 해류',
    en: 'BLUE CURRENT',
    note: '빛이 닿는 마지막 바다',
    boss: '폭풍의 가오리',
    perk: '물살이 잦아들 때 타이밍 입력',
    color: 0x60aad1,
    start: 200,
    ...currentDepth,
    target: 14,
    lineCost: 260,
    reelCost: 200,
    reward: 100,
    floor: 30,
    modes: ['timing', 'track', 'rhythm'],
    shallow: [10, 12, 13, 14, 11],
    deep: [11, 15, 16, 17, 18, 19, 10],
    fish: [
      [10, '청새치', 1, 90, 310, '긴 주둥이로 먹잇감 무리를 가릅니다.'],
      [11, '날치', 1, 16, 48, '넓은 가슴지느러미로 수면을 스칩니다.'],
      [12, '푸른고등어', 1, 19, 55, '푸른 등무늬가 빠른 해류에 섞입니다.'],
      [13, '보라문어', 2, 32, 140, '바위 색에 맞춰 보라색 농도를 바꿉니다.'],
      [14, '태평양참치', 1, 60, 240, '따뜻한 해류 가장자리에서 빠르게 회전합니다.'],
      [15, '만타가오리', 4, 150, 550, '넓은 날개를 천천히 저어 상승합니다.'],
      [16, '은빛갈치', 5, 50, 180, '긴 은빛 몸을 세워 위쪽 먹이를 노립니다.'],
      [17, '톱상어', 9, 100, 380, '톱날 모양 주둥이로 모래를 뒤집니다.'],
      [18, '푸른해파리', 10, 8, 40, '푸른 갓을 접었다 펴며 떠갑니다.'],
      [19, '달빛개복치', 8, 90, 280, '달빛 같은 옆구리를 물살에 맡깁니다.'],
    ],
  },
  {
    id: 'twilight',
    trailId: 28,
    trailClue: '어둠 속 여덟 팔을 따라 별처럼 작은 점들이 켜집니다.',
    name: '황혼의 심해',
    en: 'TWILIGHT ZONE',
    note: '어둠 속 작은 불빛을 따라서',
    boss: '심연의 아귀왕',
    perk: '발광 표식 추적 · 빛나는 위치 유지',
    color: 0x8e93dc,
    start: 1000,
    boundary: 2000,
    end: 3000,
    target: 20,
    lineCost: 520,
    reelCost: 400,
    reward: 160,
    floor: 42,
    modes: ['hold', 'rhythm', 'timing'],
    shallow: [20, 22, 23, 24, 21],
    deep: [21, 25, 26, 27, 28, 29],
    fish: [
      [20, '초롱아귀', 3, 9, 39, '이마 끝의 불빛만 어둠 속에 남습니다.'],
      [21, '랜턴피시', 1, 4, 28, '배 쪽의 작은 발광점이 줄지어 빛납니다.'],
      [22, '유령오징어', 2, 15, 90, '반투명한 팔 사이로 푸른 빛이 샙니다.'],
      [23, '보라장어', 5, 40, 130, '바위 틈으로 긴 몸을 접어 숨습니다.'],
      [24, '투명새우', 11, 3, 12, '투명한 껍질 너머로 작은 심장이 보입니다.'],
      [25, '심해도끼고기', 6, 4, 18, '납작한 은빛 몸에 아래를 향한 발광기가 있습니다.'],
      [26, '빗해파리', 10, 6, 36, '빗살처럼 늘어선 섬모가 물을 밀어냅니다.'],
      [27, '붉은대게', 12, 25, 130, '붉은 다리 끝으로 해저를 더듬습니다.'],
      [28, '별빛문어', 2, 22, 110, '팔을 펼칠 때 작은 별무늬가 드러납니다.'],
      [29, '은하실러캔스', 9, 65, 190, '두꺼운 비늘 위로 은하수 같은 반점이 번집니다.'],
    ],
  },
  {
    id: 'vents',
    trailId: 38,
    trailClue: '분출이 멎자 바위 뒤로 턱 아래의 붉은 불빛이 흔들립니다.',
    name: '검은 열수구',
    en: 'BLACK VENTS',
    note: '바다의 끝에서 피어나는 생명',
    boss: '화산갑각 거수',
    perk: '분출 신호를 읽고 장력 조절',
    color: 0xd68b91,
    start: 3000,
    boundary: 4500,
    end: 6000,
    target: 30,
    lineCost: 950,
    reelCost: 750,
    reward: 250,
    floor: 55,
    modes: ['tension', 'rhythm', 'track'],
    shallow: [30, 32, 33, 34, 31],
    deep: [31, 35, 36, 37, 38, 39],
    fish: [
      [30, '열수새우', 11, 3, 13, '열수 기둥 가장자리의 바위를 떼 지어 덮습니다.'],
      [31, '황산장어', 5, 27, 100, '따뜻한 물과 찬물이 만나는 틈을 돕니다.'],
      [32, '붉은갑각어', 6, 12, 38, '단단한 붉은 비늘이 바위처럼 겹칩니다.'],
      [33, '검은꼼치', 0, 8, 34, '검은 진흙에 배를 대고 기다립니다.'],
      [34, '유리해삼', 5, 8, 31, '유리 같은 외피로 해저의 부스러기를 모읍니다.'],
      [35, '용비늘고기', 9, 23, 86, '지붕처럼 겹친 비늘이 등줄기를 덮습니다.'],
      [36, '화산가오리', 4, 48, 175, '분출이 잦아들 때 검은 바닥을 스칩니다.'],
      [37, '심연투구게', 12, 21, 58, '투구 모양 등껍질 아래로 작은 발들이 움직입니다.'],
      [38, '홍옥아귀', 3, 11, 47, '턱 아래 붉은 불빛을 느리게 흔듭니다.'],
      [39, '불꽃리본장어', 5, 44, 150, '가느다란 몸이 분출 가장자리에서 주황빛으로 휩니다.'],
    ],
  },
  {
    id: 'hadal',
    trailId: 48,
    trailClue: '해구 비탈에서 두 쌍의 두툼한 지느러미가 번갈아 움직입니다.',
    name: '마리아나 해구',
    en: 'THE HADAL',
    note: '아무도 닿지 않은 깊이',
    boss: '고대의 레비아탄',
    perk: '전설의 서식지 · 최종 해역',
    color: 0x9e9ce3,
    start: 6000,
    boundary: 8500,
    end: 11000,
    target: 36,
    lineCost: 1500,
    reelCost: 1200,
    reward: 500,
    floor: 75,
    modes: ['tension', 'hold', 'rhythm'],
    shallow: [40, 42, 43, 44, 41],
    deep: [41, 45, 46, 47, 48, 49],
    fish: [
      [40, '해구꼼치', 0, 10, 28, '말랑한 몸으로 해구의 비탈을 오릅니다.'],
      [41, '유령해파리', 10, 20, 105, '긴 촉수가 하얀 그림자처럼 늦게 따라옵니다.'],
      [42, '백색문어', 2, 15, 67, '빛이 닿으면 희고 둥근 머리가 먼저 보입니다.'],
      [43, '검은용고기', 9, 18, 55, '검은 몸 사이로 날카로운 이빨이 드러납니다.'],
      [44, '심연송곳니', 3, 8, 24, '아래턱의 송곳니가 위쪽 홈에 포개집니다.'],
      [45, '거대등각류', 12, 16, 49, '겹겹의 등판을 접고 바닥을 걷습니다.'],
      [46, '은빛리본어', 5, 48, 160, '은빛 띠 같은 몸이 큰 파동을 그립니다.'],
      [47, '별무리빗해파리', 10, 4, 28, '빗살 무늬가 별자리처럼 번갈아 빛납니다.'],
      [48, '고대실러캔스', 9, 70, 205, '튼튼한 짝지느러미를 번갈아 움직입니다.'],
      [49, '왕관심해어', 6, 13, 58, '머리 위 발광점들이 작은 왕관을 이룹니다.'],
    ],
  },
];
export const seas = habitats.map((area) => ({
  ...area,
  depth: `${area.start.toLocaleString('en-US')} — ${area.end.toLocaleString('en-US')} m`,
}));
export const species = habitats.flatMap((area, sea) =>
  area.fish.map(([id, name, shape, minCm, maxCm, description], rank) => ({
    id,
    name,
    sea,
    rank,
    shape,
    minCm,
    maxCm,
    description,
    value: Math.ceil(area.floor / 0.8) + rank * 5,
    hue: (sea * 54 + rank * 39 + 25) % 360,
  })),
);
export const catchWeights = [32, 23, 17, 11, 7, 4, 2.5, 1.5, 1, 0.5];
export const goldenChance = 0.025;

// Positions in the ocean scene's 960 × 600 coordinate space.
export const CORAL_CAST = {
  depth: coralDepth,
  waterline: 148,
  origin: { x: 516, y: 76 },
  pixelsPerMeter: 3.2,
  shoal: { x: 360, y: 280 },
  shoalRadius: { x: 150, y: 85 },
  kelp: { x: 790, y: 450 },
  kelpRadius: { x: 135, y: 125 },
  trail: { x: 833, y: 477 },
  trailRadius: 34,
} as const;
const coral = seas[0];
export const coralBaitPools = {
  shoal: coral.shallow,
  edge: coral.shallow.filter((id) => species[id].rank < 2),
  kelp: coral.deep.filter((id) => !coral.shallow.includes(id) && id !== coral.trailId),
  trail: [coral.trailId],
};
export const seahorseBiteChance = 0.04;
export const CURRENT_CAST = {
  origin: CORAL_CAST.origin,
  waterline: CORAL_CAST.waterline,
  pixelsPerMeter: 0.62,
  depth: currentDepth,
  drift: { x: 148, y: 18 },
  upstream: { x: 480, y: 307 },
  feeding: { x: 628, y: 325 },
  feedingRadius: { x: 79, y: 49 },
  deep: { x: 680, y: 441 },
  deepFeeding: { x: 828, y: 459 },
  deepRadius: { x: 92, y: 58 },
  deepWaterY: 395,
} as const;
export const currentBaitPools = {
  channel: [10, 11],
  feeding: [12, 13, 14],
  deepChannel: [10, 11, 15, 16],
  deepFeeding: [17, 18, 19],
};

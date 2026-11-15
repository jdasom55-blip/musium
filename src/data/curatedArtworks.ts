import solsticeImg from '../assets/images/museum_art_solstice_1794643620546.jpg';
import botanicalImg from '../assets/images/museum_art_botanical_1794643620544.jpg';
import nocturneImg from '../assets/images/museum_art_nocturne_1794643621231.jpg';
import terracottaImg from '../assets/images/museum_art_terracotta_1794643621445.jpg';
import type { MuseumArtwork } from '../types/museum';

export const CURATED_ARTWORKS: MuseumArtwork[] = [
  {
    id: 'curated-solstice',
    title: '트래버틴 회랑의 하지광',
    artistName: '엘레나 마르케스',
    description:
      '고전 석조 아치를 가로지르는 한낮의 태양빛과 깊은 그림자의 대비를 두터운 유화 질감으로 포착한 건축 연작입니다.',
    imageUrl: solsticeImg,
    isCurated: true,
    accessionNo: 'ACC. 2026.01',
    mediumLabel: '리넨 위 유채 · 120 × 90 cm',
    width: 1200,
    height: 900,
    createdAtMs: 1767225600000,
    frameStyle: 'walnut',
  },
  {
    id: 'curated-botanical',
    title: '감나무와 올리브 습작',
    artistName: '서연재',
    description:
      '한지 위에 먹과 천연 석채를 겹쳐 올려 여백의 호흡과 계절의 온도를 담아낸 현대 식물화입니다.',
    imageUrl: botanicalImg,
    isCurated: true,
    accessionNo: 'ACC. 2026.02',
    mediumLabel: '닥종이 위 먹과 석채 · 80 × 106 cm',
    width: 900,
    height: 1200,
    createdAtMs: 1767312000000,
    frameStyle: 'brass',
  },
  {
    id: 'curated-nocturne',
    title: '자정의 은빛 수평선',
    artistName: '앙리 드 라크루아',
    description:
      '깊은 감청빛 밤바다 위로 내려앉은 달빛의 파동을 대담한 나이프 터치와 임파스토 기법으로 표현했습니다.',
    imageUrl: nocturneImg,
    isCurated: true,
    accessionNo: 'ACC. 2026.03',
    mediumLabel: '캔버스 위 임파스토 유채 · 130 × 97 cm',
    width: 1200,
    height: 900,
    createdAtMs: 1767398400000,
    frameStyle: 'ebony',
  },
  {
    id: 'curated-terracotta',
    title: '석회암 위의 도기 정물',
    artistName: '마테오 로시',
    description:
      '테라코타와 차콜 빛 도기들이 오후의 사선 빛을 받아 만들어내는 기하학적 정적과 질감을 탐구한 작품입니다.',
    imageUrl: terracottaImg,
    isCurated: true,
    accessionNo: 'ACC. 2026.04',
    mediumLabel: '패널 위 유채와 젯소 · 85 × 113 cm',
    width: 900,
    height: 1200,
    createdAtMs: 1767484800000,
    frameStyle: 'walnut',
  },
];

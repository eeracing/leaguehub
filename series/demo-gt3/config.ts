import type { SeriesConfig } from '../../src/types';

export default {
  id: 'demo-gt3',
  name: 'DEMO · GT3 虚拟锦标赛',
  shortName: 'DEMO GT3',
  slug: 'demo-gt3',
  seasonName: 'DEMO 2026 GT3 赛季',
  logo: '/series/demo-gt3.svg',
  pointsSystem: 'standard',
  certificates: { top: 5 },
  display: {
    standingsLimit: 5,
    latestResultsLimit: 5,
  },
} satisfies SeriesConfig;

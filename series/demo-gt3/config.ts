import type { SeriesConfig } from '../../src/types';

export default {
  id: 'demo-gt3',
  name: 'GT3 国际挑战赛',
  shortName: 'GT3',
  slug: 'demo-gt3',
  seasonName: '2026 赛季',
  logo: '/series/demo-gt3.svg',
  pointsSystem: 'standard',
  certificates: { top: 5 },
  display: {
    standingsLimit: 5,
    latestResultsLimit: 5,
  },
} satisfies SeriesConfig;

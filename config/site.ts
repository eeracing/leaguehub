export type DisplayOptions = {
  car: boolean;
  carNumber: boolean;
  wins: boolean;
  poles: boolean;
  fastestLaps: boolean;
  incidents: boolean;
};

export const config = {
  site: {
    name: 'EE Racing',
    tagline: '模拟赛车赛事积分榜',
    logo: '/logo.svg',
    favicon: '/favicon.png',
    accent: '#1747d1',
    locale: 'zh-CN',
    timeZone: 'Pacific/Auckland',
  },
  season: {
    name: '2026 年第 1 赛季',
  },
  display: {
    car: true,
    carNumber: true,
    wins: true,
    poles: true,
    fastestLaps: true,
    incidents: false,
  } satisfies DisplayOptions,
};

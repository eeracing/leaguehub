import type { BonusDetail, OfficialRace, RaceResult } from '../src/types';

export type PointsSystem = {
  positions: readonly number[];
  poleBonus: number;
  fastestLapBonus: number;
  customBonus?: (race: OfficialRace) => Record<string, BonusDetail[]>;
};

export const pointsSystems = {
  standard: {
    positions: [25, 20, 16, 13, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1],
    poleBonus: 1,
    fastestLapBonus: 1,
  },
  endurance: {
    positions: [40, 35, 32, 30, 28, 26, 24, 22, 20, 18, 16, 14, 12, 10, 8],
    poleBonus: 0,
    fastestLapBonus: 1,
  },
  custom: {
    positions: [32, 24, 18, 14, 12, 10, 8, 6, 4, 2],
    poleBonus: 1,
    fastestLapBonus: 1,
    customBonus: (race: OfficialRace) => {
      const bonuses: Record<string, BonusDetail[]> = {};
      const award = (driverId: string, reason: string) => {
        (bonuses[driverId] ??= []).push({ reason, points: 1 });
      };
      const classified = race.results.filter((result) => result.position > 0 && result.status !== 'disqualified');

      const mostImproved = classified
        .filter((result) => result.startPosition > 0 && result.startPosition > result.position)
        .reduce<RaceResult | undefined>((best, result) =>
          !best || result.startPosition - result.position > best.startPosition - best.position
            || (result.startPosition - result.position === best.startPosition - best.position
              && result.position < best.position) ? result : best, undefined);
      if (mostImproved) award(mostImproved.driverId, '名次提升最多');

      const cleanest = classified.reduce<RaceResult | undefined>((best, result) =>
        !best || result.incidents < best.incidents
          || (result.incidents === best.incidents && result.position < best.position)
          ? result : best, undefined);
      if (cleanest) award(cleanest.driverId, '事故最少');

      for (const result of classified) {
        if (result.position >= 11 && result.status === 'finished') award(result.driverId, 'P11 起完赛奖励');
      }
      return bonuses;
    },
  },
} satisfies Record<string, PointsSystem>;

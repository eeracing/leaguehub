import type { OfficialRace, PenaltyFile, Race, RacePenalty, RaceResult } from '../types';

function validatePenalty(value: unknown, index: number): RacePenalty {
  if (!value || typeof value !== 'object') {
    throw new Error(`Invalid penalty at index ${index}`);
  }

  const penalty = value as Record<string, unknown>;
  if (typeof penalty.driverId !== 'string' || !penalty.driverId) {
    throw new Error(`Penalty at index ${index} requires a driverId string`);
  }
  if (penalty.reason !== undefined && typeof penalty.reason !== 'string') {
    throw new Error(`Penalty at index ${index} has an invalid reason`);
  }

  const base = { driverId: penalty.driverId, ...(penalty.reason ? { reason: penalty.reason } : {}) };
  if (penalty.type === 'position') {
    if (!Number.isInteger(penalty.positions) || (penalty.positions as number) <= 0) {
      throw new Error(`Position penalty at index ${index} requires a positive positions integer`);
    }
    return { ...base, type: 'position', positions: penalty.positions as number };
  }
  if (penalty.type === 'points') {
    if (typeof penalty.points !== 'number' || !Number.isFinite(penalty.points) || penalty.points <= 0) {
      throw new Error(`Points penalty at index ${index} requires a positive points value`);
    }
    return { ...base, type: 'points', points: penalty.points };
  }
  if (penalty.type === 'disqualification') {
    return { ...base, type: 'disqualification' };
  }
  throw new Error(`Unsupported penalty type at index ${index}`);
}

export function parsePenaltyFile(input: unknown): RacePenalty[] {
  if (!input || typeof input !== 'object' || !Array.isArray((input as PenaltyFile).penalties)) {
    throw new Error('Penalty file must contain a penalties array');
  }
  return (input as PenaltyFile).penalties.map(validatePenalty);
}

export function applyPenalties(race: Race, penalties: RacePenalty[]): OfficialRace {
  const results: RaceResult[] = race.results.map((result) => ({ ...result }));

  for (const penalty of penalties) {
    const index = results.findIndex((result) => result.driverId === penalty.driverId);
    if (index < 0) {
      throw new Error(`Penalty references unknown driver ${penalty.driverId} in ${race.roundId}`);
    }

    if (penalty.type === 'disqualification') {
      results[index] = {
        ...results[index],
        status: 'disqualified',
      };
    }
  }

  const classified = results.filter(
    (result) => result.status !== 'disqualified'
      && Number.isInteger(result.finishPosition) && result.finishPosition > 0,
  );
  const unclassified = results.filter(
    (result) => result.status !== 'disqualified'
      && (!Number.isInteger(result.finishPosition) || result.finishPosition <= 0),
  );
  const disqualified = results.filter((result) => result.status === 'disqualified');

  for (const penalty of penalties) {
    if (penalty.type !== 'position') continue;
    const index = classified.findIndex((result) => result.driverId === penalty.driverId);
    if (index < 0) {
      throw new Error(`Cannot apply a position penalty to an unclassified driver in ${race.roundId}`);
    }
    const [result] = classified.splice(index, 1);
    classified.splice(Math.min(index + penalty.positions, classified.length), 0, result);
  }

  const officialResults = [
    ...classified.map((result, index) => ({ ...result, position: index + 1 })),
    ...unclassified.map((result) => ({ ...result, position: -1 })),
    ...disqualified.map((result) => ({ ...result, position: -1 })),
  ];

  return { ...race, results: officialResults, penalties };
}

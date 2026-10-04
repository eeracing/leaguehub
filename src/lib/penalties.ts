import type { OfficialRace, PenaltyFile, Race, RacePenalty, RaceResult } from '../types';
import { formatDurationMs } from './time';

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
  if (penalty.type === 'time') {
    if (typeof penalty.seconds !== 'number' || !Number.isFinite(penalty.seconds) || penalty.seconds <= 0) {
      throw new Error(`Time penalty at index ${index} requires a positive seconds value`);
    }
    return { ...base, type: 'time', seconds: penalty.seconds };
  }
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
  const resultsByDriver = new Map(results.map((result) => [result.driverId, result]));

  for (const penalty of penalties) {
    const result = resultsByDriver.get(penalty.driverId);
    if (!result) {
      throw new Error(`Penalty references unknown driver ${penalty.driverId} in ${race.roundId}`);
    }

    if (penalty.type === 'disqualification') {
      result.status = 'disqualified';
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

  const penaltySeconds = new Map<RaceResult, number>();
  for (const penalty of penalties) {
    if (penalty.type !== 'time') continue;
    const result = resultsByDriver.get(penalty.driverId)!;
    if (result.status === 'disqualified') continue;
    if (!Number.isInteger(result.finishPosition) || result.finishPosition <= 0) {
      throw new Error(`Cannot apply a time penalty to an unclassified driver in ${race.roundId}`);
    }
    penaltySeconds.set(result, (penaltySeconds.get(result) ?? 0) + penalty.seconds);
  }
  const hasAppliedTimePenalty = penaltySeconds.size > 0;
  if (hasAppliedTimePenalty) {
    for (const result of classified) {
      if (result.timeMs === undefined || !Number.isFinite(result.timeMs)) {
        throw new Error(`Missing race time for ${result.driverId} in ${race.roundId}`);
      }
      const seconds = penaltySeconds.get(result);
      if (seconds !== undefined) {
        result.timeMs += seconds * 1000;
        if (!Number.isFinite(result.timeMs)) throw new Error(`Time penalty overflow in ${race.roundId}`);
        result.time = formatDurationMs(result.timeMs, true);
      }
    }
    classified.sort((a, b) => b.laps - a.laps || a.timeMs! - b.timeMs!);
  }

  for (const penalty of penalties) {
    if (penalty.type !== 'position') continue;
    const index = classified.findIndex((result) => result.driverId === penalty.driverId);
    if (index < 0) {
      throw new Error(`Cannot apply a position penalty to an unclassified driver in ${race.roundId}`);
    }
    const [result] = classified.splice(index, 1);
    classified.splice(Math.min(index + penalty.positions, classified.length), 0, result);
  }

  if (hasAppliedTimePenalty && classified.length) {
    const leader = classified[0];
    for (const result of classified) {
      const lapDeficit = leader.laps - result.laps;
      const differenceMs = result.timeMs! - leader.timeMs!;
      result.gap = result === leader ? '—'
        : lapDeficit > 0 ? `落后 ${lapDeficit} 圈`
          : lapDeficit < 0 ? `领先 ${-lapDeficit} 圈`
          : `${differenceMs < 0 ? '-' : '+'}${(Math.abs(differenceMs) / 1000).toFixed(3)}`;
    }
  }

  const officialResults = [
    ...classified.map((result, index) => ({ ...result, position: index + 1 })),
    ...unclassified.map((result) => ({ ...result, position: -1 })),
    ...disqualified.map((result) => ({ ...result, position: -1 })),
  ];

  return { ...race, results: officialResults, penalties };
}

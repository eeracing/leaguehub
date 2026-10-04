import { config, type DisplayOptions } from '../../config/site';
import type { EventSessions, ScoredRace, SeriesConfig, SeriesData, SeriesView } from '../types';
import { adaptIracingEventResult } from './iracing-adapter';
import { applyPenalties, parsePenaltyFile } from './penalties';
import { calculateRacePoints } from './points';
import { calculateStandings } from './standings';

const seriesModules = import.meta.glob('../../series/*/config.ts', {
  eager: true,
  import: 'default',
}) as Record<string, SeriesConfig>;

const jsonModules = import.meta.glob('../../series/*/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

const penaltyModules = import.meta.glob('../../series/*/penalties/*.json', {
  eager: true,
  import: 'default',
}) as Record<string, unknown>;

export function getSeriesConfigs(): SeriesConfig[] {
  return Object.entries(seriesModules)
    .sort(([pathA, a], [pathB, b]) =>
      (a.order ?? 0) - (b.order ?? 0) || pathA.localeCompare(pathB),
    )
    .map(([path, series]) => {
      const folder = path.split('/').at(-2);
      if (series.slug !== folder) {
        throw new Error(`Series slug "${series.slug}" must match its folder: ${path}`);
      }
      return series;
    });
}

export function getVisibleSeriesConfigs(): SeriesConfig[] {
  return getSeriesConfigs().filter((series) => series.visible !== false);
}

function dataFile<T>(slug: string, file: string): T {
  const key = `../../series/${slug}/${file}.json`;
  const value = jsonModules[key];
  if (!value) throw new Error(`Missing data file: series/${slug}/${file}.json`);
  return value as T;
}

function raceFiles(series: SeriesConfig, data: SeriesData): {
  races: ScoredRace[];
  eventSessions: Record<string, EventSessions>;
} {
  const races: ScoredRace[] = [];
  const eventSessions: Record<string, EventSessions> = {};
  for (const round of data.rounds) {
    if (!round.resultFile) continue;
    const raw = dataFile<unknown>(series.slug, round.resultFile);
    const sessions = adaptIracingEventResult(raw, round.id);
    eventSessions[round.id] = sessions;
    const penaltyFile = penaltyModules[`../../series/${series.slug}/penalties/${round.id}.json`];
    const penalties = penaltyFile ? parsePenaltyFile(penaltyFile) : [];
    const officialRace = applyPenalties(sessions.race, penalties);
    races.push(calculateRacePoints(officialRace, series));
  }
  return { races, eventSessions };
}

export function getSeriesView(series: SeriesConfig): SeriesView {
  const display = { ...config.display, ...series.display } as DisplayOptions;
  for (const key of ['standingsLimit', 'latestResultsLimit'] as const) {
    if (!Number.isInteger(display[key]) || display[key] < 0) {
      throw new Error(`${series.slug}: display.${key} must be a non-negative integer (0 shows everyone).`);
    }
  }
  const data = dataFile<SeriesData>(series.slug, 'series');
  const order = new Map(data.rounds.map((round) => [round.id, round.round]));
  const { races: scoredRaces, eventSessions } = raceFiles(series, data);
  scoredRaces.sort(
    (a, b) => (order.get(a.roundId) ?? 0) - (order.get(b.roundId) ?? 0),
  );
  const races = scoredRaces;
  const latestRace = races.at(-1);
  const completed = new Set(races.map((race) => race.roundId));
  const nextRound = data.rounds.find((round) => !completed.has(round.id));

  return {
    config: series,
    data,
    display,
    races,
    eventSessions,
    standings: calculateStandings(scoredRaces),
    latestRace,
    latestRound: data.rounds.find((round) => round.id === latestRace?.roundId),
    nextRound,
    currentRound: races.length,
  };
}

export function getVisibleSeries(): SeriesView[] {
  return getVisibleSeriesConfigs().map(getSeriesView);
}

export function getRace(series: SeriesConfig, roundId: string): ScoredRace | undefined {
  return getSeriesView(series).races.find((race) => race.roundId === roundId);
}

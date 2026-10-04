import type { EventSessions, RaceResult, TimedSession } from '../types';
import { formatDurationMs } from './time';

type IracingResult = {
  cust_id: number;
  display_name: string;
  finish_position: number;
  finish_position_in_class: number;
  starting_position: number;
  car_name: string;
  laps_complete: number;
  laps_lead?: number | null;
  reason_out: string;
  reason_out_id: number;
  interval: number;
  average_lap: number;
  best_lap_time: number;
  incidents: number;
  livery?: { car_number?: string };
};

type IracingSessionResult = {
  simsession_number: number;
  simsession_name: string;
  simsession_type: number;
  simsession_type_name: string;
  results: IracingResult[];
};

type IracingEventResult = {
  type: string;
  data: {
    session_id: number;
    subsession_id: number;
    session_results: IracingSessionResult[];
  };
};

const RACE_SESSION_TYPE = 6;
const QUALIFY_SESSION_TYPE = 4;
const PRACTICE_SESSION_TYPE = 3;
const IRACING_TIME_UNITS_PER_SECOND = 10_000;

function formatDuration(timeUnits: number, includeHours = false): string {
  return formatDurationMs(timeUnits / 10, includeHours);
}

function isRaceSession(session: IracingSessionResult): boolean {
  return session.simsession_type === RACE_SESSION_TYPE
    || session.simsession_type_name.toLowerCase() === 'race';
}

function isQualifyingSession(session: IracingSessionResult): boolean {
  return session.simsession_type === QUALIFY_SESSION_TYPE
    || session.simsession_name.toLowerCase().includes('qualify');
}

function isPracticeSession(session: IracingSessionResult): boolean {
  return session.simsession_type === PRACTICE_SESSION_TYPE
    || session.simsession_name.toLowerCase().includes('practice');
}

function positionFromIracing(position: number): number {
  return position < 0 ? -1 : position + 1;
}

function raceStatus(result: IracingResult): RaceResult['status'] {
  const reason = result.reason_out.trim().toLowerCase();
  if (reason === 'disqualified' || result.reason_out_id === 29) return 'disqualified';
  if (result.finish_position < 0 || !['running', 'finished'].includes(reason)) return 'dnf';
  return 'finished';
}

function timedSession(session: IracingSessionResult | undefined, reference: 'pole' | 'fastest'): TimedSession | undefined {
  if (!session) return undefined;
  const validLaps = session.results
    .map((result) => result.best_lap_time)
    .filter((time) => Number.isFinite(time) && time > 0);
  const fastestMs = validLaps.length ? Math.round(Math.min(...validLaps) / 10) : undefined;
  const poleLap = reference === 'pole'
    ? session.results.find((result) => result.finish_position === 0)?.best_lap_time
    : undefined;
  const referenceMs = poleLap !== undefined && poleLap > 0
    ? Math.round(poleLap / 10)
    : fastestMs;

  return {
    results: session.results
      .slice()
      .sort((a, b) => {
        const aPosition = a.finish_position < 0 ? Number.MAX_SAFE_INTEGER : a.finish_position;
        const bPosition = b.finish_position < 0 ? Number.MAX_SAFE_INTEGER : b.finish_position;
        return aPosition - bPosition;
      })
      .map((result) => {
        const bestLapMs = result.best_lap_time > 0
          ? Math.round(result.best_lap_time / 10)
          : Number.POSITIVE_INFINITY;
        const differenceMs = referenceMs === undefined ? 0 : bestLapMs - referenceMs;
        return {
          driverId: String(result.cust_id),
          driver: result.display_name,
          carNumber: result.livery?.car_number ?? '—',
          car: result.car_name,
          position: positionFromIracing(result.finish_position),
          bestLap: result.best_lap_time > 0 ? formatDuration(result.best_lap_time) : '—',
          bestLapMs,
          gap: referenceMs === undefined || !Number.isFinite(bestLapMs) || bestLapMs === referenceMs
            ? '—'
            : `${differenceMs < 0 ? '-' : '+'}${(Math.abs(differenceMs) / 1000).toFixed(3)}`,
        };
      }),
  };
}

export function adaptIracingEventResult(input: unknown, roundId: string): EventSessions {
  const event = input as IracingEventResult;
  if (event?.type !== 'event_result' || !Array.isArray(event?.data?.session_results)) {
    throw new Error(`Invalid iRacing event result for ${roundId}`);
  }

  const raceSession = event.data.session_results.find(isRaceSession);
  if (!raceSession) {
    throw new Error(`No Race session found in iRacing event result for ${roundId}`);
  }

  const qualifying = event.data.session_results.find(isQualifyingSession);
  const qualifyingPole = qualifying?.results
    .filter((result) => result.finish_position >= 0)
    .sort((a, b) => a.finish_position - b.finish_position)[0];
  const gridPole = raceSession.results.find((result) => result.starting_position === 0);
  const pole = qualifyingPole ?? gridPole;
  const leaderLaps = Math.max(...raceSession.results.map((result) => result.laps_complete));
  const leader = raceSession.results.find((result) => result.finish_position === 0);
  const leaderTimeMs = leader && Number.isFinite(leader.average_lap) && leader.average_lap >= 0
    ? leader.average_lap * leader.laps_complete / 10 : undefined;

  const results: RaceResult[] = raceSession.results
    .slice()
    .sort((a, b) => {
      const aPosition = a.finish_position < 0 ? Number.MAX_SAFE_INTEGER : a.finish_position;
      const bPosition = b.finish_position < 0 ? Number.MAX_SAFE_INTEGER : b.finish_position;
      return aPosition - bPosition;
    })
    .map((result) => {
      const position = positionFromIracing(result.finish_position);
      const lapDeficit = leaderLaps - result.laps_complete;
      // Use the recorded interval for lead-lap cars: average_lap is rounded.
      const timeMs = leaderTimeMs !== undefined && result.laps_complete === leader?.laps_complete
        && Number.isFinite(result.interval) && result.interval >= 0
        ? leaderTimeMs + result.interval / 10
        : Number.isFinite(result.average_lap) && result.average_lap >= 0
          ? result.average_lap * result.laps_complete / 10 : undefined;
      const gap = position === 1
        ? '—'
        : result.interval >= 0
          ? `+${(result.interval / IRACING_TIME_UNITS_PER_SECOND).toFixed(3)}`
          : `落后 ${lapDeficit} 圈`;

      return {
        driverId: String(result.cust_id),
        driver: result.display_name,
        carNumber: result.livery?.car_number ?? '—',
        car: result.car_name,
        startPosition: positionFromIracing(result.starting_position),
        finishPosition: position,
        classPosition: positionFromIracing(result.finish_position_in_class),
        position,
        laps: result.laps_complete,
        lapsLed: result.laps_lead ?? 0,
        status: raceStatus(result),
        reasonOut: result.reason_out,
        time: formatDurationMs(timeMs ?? NaN, true),
        timeMs,
        gap,
        bestLap: formatDuration(result.best_lap_time),
        bestLapMs: result.best_lap_time >= 0
          ? Math.round(result.best_lap_time / 10)
          : Number.MAX_SAFE_INTEGER,
        incidents: result.incidents,
      };
    });

  return {
    race: {
      roundId,
      sessionId: String(event.data.session_id),
      subsessionId: String(event.data.subsession_id),
      poleDriverId: pole ? String(pole.cust_id) : undefined,
      results,
    },
    qualifying: timedSession(qualifying, 'pole'),
    practice: timedSession(event.data.session_results.find(isPracticeSession), 'fastest'),
  };
}

import type { DisplayOptions } from '../config/site';
import type { pointsSystems } from '../config/points';

export type SeriesConfig = {
  id: string;
  name: string;
  shortName: string;
  slug: string;
  logo?: string;
  seasonName?: string;
  order?: number;
  visible?: boolean;
  pointsSystem: keyof typeof pointsSystems;
  certificates?: 'off' | 'all' | { top: number };
  display?: Partial<DisplayOptions>;
};

export type Round = {
  id: string;
  round: number;
  name: string;
  track: string;
  layout: string;
  date: string;
  resultFile?: string;
};

export type SeriesData = {
  carClass: string;
  rounds: Round[];
};

export type RaceResult = {
  driverId: string;
  driver: string;
  carNumber: string;
  car: string;
  startPosition: number;
  finishPosition: number;
  classPosition: number;
  position: number;
  laps: number;
  lapsLed: number;
  status: RaceStatus;
  reasonOut: string;
  time: string;
  gap: string;
  bestLap: string;
  bestLapMs: number;
  incidents: number;
};

export type Race = {
  roundId: string;
  sessionId?: string;
  subsessionId?: string;
  poleDriverId?: string;
  results: RaceResult[];
};

export type TimedSessionResult = {
  driverId: string;
  driver: string;
  carNumber: string;
  car: string;
  position: number;
  bestLap: string;
  bestLapMs: number;
  gap: string;
};

export type TimedSession = {
  results: TimedSessionResult[];
};

export type EventSessions = {
  race: Race;
  qualifying?: TimedSession;
  practice?: TimedSession;
};

export type RaceStatus = 'finished' | 'dnf' | 'disqualified';

type PenaltyBase = {
  driverId: string;
  reason?: string;
};

export type PositionPenalty = PenaltyBase & {
  type: 'position';
  positions: number;
};

export type PointsPenalty = PenaltyBase & {
  type: 'points';
  points: number;
};

export type DisqualificationPenalty = PenaltyBase & {
  type: 'disqualification';
};

export type RacePenalty = PositionPenalty | PointsPenalty | DisqualificationPenalty;

export type PenaltyFile = {
  penalties: RacePenalty[];
};

export type OfficialRace = Race & {
  penalties: RacePenalty[];
};

export type BonusDetail = {
  reason: string;
  points: number;
};

export type ChampionshipPoints = {
  driverId: string;
  positionPoints: number;
  poleBonus: number;
  fastestLapBonus: number;
  customBonusDetails: BonusDetail[];
  penalty: number;
  points: number;
};

export type ScoredRace = OfficialRace & {
  championshipPoints: ChampionshipPoints[];
};

export type Standing = {
  position: number;
  driverId: string;
  driver: string;
  carNumber: string;
  car: string;
  roundPoints: Record<string, number>;
  points: number;
  wins: number;
  poles: number;
  fastestLaps: number;
};

export type SeriesView = {
  config: SeriesConfig;
  data: SeriesData;
  display: DisplayOptions;
  races: ScoredRace[];
  eventSessions: Record<string, EventSessions>;
  standings: Standing[];
  latestRace?: ScoredRace;
  latestRound?: Round;
  nextRound?: Round;
  currentRound: number;
};

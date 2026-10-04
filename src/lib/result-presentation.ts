import type { RacePenalty, RaceResult } from '../types';

const retirementReasons: Record<string, string> = {
  accident: '事故退赛',
  'engine failure': '引擎故障',
  mechanical: '机械故障',
  'mechanical failure': '机械故障',
  disconnected: '连接断开',
  disconnect: '连接断开',
  retired: '主动退赛',
  'out of fuel': '燃油耗尽',
  disqualified: '原始结果取消资格',
  'did not start': '未发车',
};

export function validPosition(position: number): boolean {
  return Number.isInteger(position) && position > 0;
}

export function positionChange(result: RaceResult): { text: string; label: string; direction: 'gain' | 'loss' | 'unchanged' } | undefined {
  if (result.status === 'disqualified'
    || !validPosition(result.startPosition) || !validPosition(result.position)) return undefined;
  const gain = result.startPosition - result.position;
  return {
    direction: gain > 0 ? 'gain' : gain < 0 ? 'loss' : 'unchanged',
    text: gain > 0 ? `↑${gain}` : gain < 0 ? `↓${-gain}` : '—',
    label: gain > 0 ? `较发车位提升 ${gain} 位` : gain < 0 ? `较发车位下降 ${-gain} 位` : '与发车位相同',
  };
}

export function retirementReason(reason: string): string {
  return retirementReasons[reason.trim().toLowerCase()] ?? reason;
}

export function resultStatus(result: RaceResult, penalties: RacePenalty[]) {
  const eventDisqualification = penalties.some((penalty) => penalty.type === 'disqualification');
  const originalReason = result.reasonOut.trim();
  const hasReason = originalReason && !['running', 'finished'].includes(originalReason.toLowerCase());
  return {
    label: eventDisqualification ? '赛事取消资格' : result.status === 'disqualified' ? '取消资格' : result.status === 'dnf' ? '退赛' : '完赛',
    reason: result.status !== 'finished' && hasReason ? retirementReason(result.reasonOut) : undefined,
    reasonLabel: eventDisqualification ? '原始结果原因' : '原因',
  };
}

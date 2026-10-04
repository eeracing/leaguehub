export type DriverNames = ReadonlyMap<string, string>;

export function parseDriverNames(input: unknown, source: string): DriverNames {
  if (input === null || typeof input !== 'object' || Array.isArray(input)) {
    throw new Error(`${source}: expected an object mapping iRacing cust_id to driver names.`);
  }

  const names = new Map<string, string>();
  for (const [driverId, name] of Object.entries(input)) {
    if (!/^\d+$/.test(driverId)) {
      throw new Error(`${source}: invalid iRacing cust_id "${driverId}".`);
    }
    if (typeof name !== 'string' || !name.trim()) {
      throw new Error(`${source}: driver ${driverId} requires a non-empty name string.`);
    }
    names.set(driverId, name.trim());
  }
  return names;
}

export function withDriverNames<T extends { driverId: string; driver: string }>(
  results: T[],
  names: DriverNames,
): T[] {
  return results.map((result) => ({
    ...result,
    driver: names.get(result.driverId) ?? result.driver,
  }));
}

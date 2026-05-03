import {
  ContinentMap,
  type VisitedCountry,
  VisitedCountryStatus,
  wasVisited,
} from '$lib/db/types';
import { COUNTRIES } from '$lib/data/countries';
import { type FlightData, toTitleCase } from '$lib/utils';
import { differenceInMinutes, parseISO } from 'date-fns';

export type FlightChartKey =
  | 'seat-class'
  | 'seat'
  | 'reason'
  | 'continents'
  | 'airlines'
  | 'aircraft-models'
  | 'aircraft-regs'
  | 'airports'
  | 'routes';

export type CountryChartKey = 'visited-country-status';

export type CountryBarChartKey = 'countries-by-continent';

export type ChartKey = FlightChartKey | CountryChartKey | CountryBarChartKey;

export type StatsContext = {
  // If omitted, aggregate for all users
  userId?: string;
};

export type AggregationOptions = {
  limit?: number; // if provided, return top N
};

export type VisitedCountryStats = Pick<
  VisitedCountry,
  'code' | 'status' | 'note'
>;

export function visitedCountryStatusDistribution(
  visitedCountries: VisitedCountryStats[],
): Record<string, number> {
  const counts = VisitedCountryStatus.reduce<Record<string, number>>(
    (acc, status) => {
      acc[toTitleCase(status)] = visitedCountries.filter(
        (c) => c.status === status,
      ).length;
      return acc;
    },
    {},
  );
  return counts;
}

export function countriesByContinentDistribution(
  visitedCountries: VisitedCountryStats[],
): Record<string, { visited: number; total: number }> {
  const continentByNumeric = new Map<number, string>();
  const result: Record<string, { visited: number; total: number }> = {};

  for (const country of COUNTRIES) {
    if (country.continent) {
      continentByNumeric.set(country.numeric, country.continent);

      if (!result[country.continent]) {
        result[country.continent] = { visited: 0, total: 0 };
      }
      result[country.continent]!.total++;
    }
  }

  for (const visitedCountry of visitedCountries) {
    if (wasVisited(visitedCountry)) {
      const continent = continentByNumeric.get(visitedCountry.code);
      if (continent && result[continent]) {
        result[continent].visited++;
      }
    }
  }

  return result;
}

export type CountryDetail = {
  name: string;
  numeric: number;
  visited: boolean;
};

export function countriesByContinentDetails(
  visitedCountries: VisitedCountryStats[],
): Record<string, CountryDetail[]> {
  const visitedCodes: Set<number> = new Set();
  for (const country of visitedCountries) {
    if (wasVisited(country)) {
      visitedCodes.add(country.code);
    }
  }

  const result: Record<string, CountryDetail[]> = {};

  for (const country of COUNTRIES) {
    if (!country.continent) continue;

    if (!result[country.continent]) {
      result[country.continent] = [];
    }

    result[country.continent]!.push({
      name: country.name,
      numeric: country.numeric,
      visited: visitedCodes.has(country.numeric),
    });
  }

  for (const continent in result) {
    result[continent]!.sort((a, b) => {
      if (a.visited !== b.visited) {
        return a.visited ? -1 : 1; // visited first
      }
      return a.name.localeCompare(b.name); // alphabetically
    });
  }

  return result;
}

function sortAndLimit(
  counts: Record<string, number>,
  options?: AggregationOptions,
): Record<string, number> {
  const entries = Object.entries(counts).sort(([, a], [, b]) => b - a);
  if (!options?.limit || entries.length <= options.limit) {
    return Object.fromEntries(entries);
  }

  const top = entries.slice(0, options.limit);
  const others = entries
    .slice(options.limit)
    .reduce((acc, [, count]) => acc + count, 0);

  if (others > 0) {
    top.push(['Others', others]);
  }

  return Object.fromEntries(top);
}

export function seatDistribution(
  flights: FlightData[],
  ctx: StatsContext,
  options?: AggregationOptions,
): Record<string, number> {
  const categories = [
    'window',
    'aisle',
    'middle',
    'pilot',
    'copilot',
    'jumpseat',
    'other',
  ];

  if (!ctx.userId) {
    const seats = flights.flatMap((flight) => flight.seats);
    const counts = categories.reduce<Record<string, number>>(
      (acc, category) => {
        acc[toTitleCase(category)] = seats.filter(
          (seat) => seat.seat === category,
        ).length;
        return acc;
      },
      {},
    );

    const totalClassified = Object.values(counts).reduce((a, b) => a + b, 0);
    const noData = seats.length - totalClassified;
    if (noData > 0) {
      counts['No Data'] = noData;
    }

    return sortAndLimit(counts, options);
  }

  const counts = categories.reduce<Record<string, number>>((acc, category) => {
    acc[toTitleCase(category)] = flights.filter((f) =>
      f.seats.some((v) => v.userId === ctx.userId && v.seat === category),
    ).length;
    return acc;
  }, {});

  const totalClassified = Object.values(counts).reduce((a, b) => a + b, 0);
  const noData = flights.length - totalClassified;
  if (noData > 0) {
    counts['No Data'] = noData;
  }

  return sortAndLimit(counts, options);
}

export function seatClassDistribution(
  flights: FlightData[],
  ctx: StatsContext,
  options?: AggregationOptions,
): Record<string, number> {
  const categories = ['economy', 'economy+', 'business', 'first', 'private'];

  if (!ctx.userId) {
    const seats = flights.flatMap((flight) => flight.seats);
    const counts = categories.reduce<Record<string, number>>(
      (acc, category) => {
        acc[toTitleCase(category)] = seats.filter(
          (seat) => seat.seatClass === category,
        ).length;
        return acc;
      },
      {},
    );

    const totalClassified = Object.values(counts).reduce((a, b) => a + b, 0);
    const noData = seats.length - totalClassified;
    if (noData > 0) {
      counts['No Data'] = noData;
    }

    return sortAndLimit(counts, options);
  }

  const counts = categories.reduce<Record<string, number>>((acc, category) => {
    acc[toTitleCase(category)] = flights.filter((f) =>
      f.seats.some((v) => v.userId === ctx.userId && v.seatClass === category),
    ).length;
    return acc;
  }, {});

  const totalClassified = Object.values(counts).reduce((a, b) => a + b, 0);
  const noData = flights.length - totalClassified;
  if (noData > 0) {
    counts['No Data'] = noData;
  }

  return sortAndLimit(counts, options);
}

export function reasonDistribution(
  flights: FlightData[],
  _ctx: StatsContext,
  options?: AggregationOptions,
): Record<string, number> {
  const categories = ['leisure', 'business', 'crew', 'other'];
  const counts = categories.reduce<Record<string, number>>((acc, category) => {
    acc[toTitleCase(category)] = flights.filter(
      (f) => f.flightReason === category,
    ).length;
    return acc;
  }, {});

  const totalClassified = Object.values(counts).reduce((a, b) => a + b, 0);
  const noData = flights.length - totalClassified;
  if (noData > 0) {
    counts['No Data'] = noData;
  }

  return sortAndLimit(counts, options);
}

export function continentDistribution(
  flights: FlightData[],
  _ctx: StatsContext,
  options?: AggregationOptions,
): Record<string, number> {
  const continents = Object.entries(ContinentMap).map(([code, name]) => ({
    code,
    name,
  }));
  const counts = continents.reduce<Record<string, number>>((acc, continent) => {
    acc[continent.name] = flights.filter(
      (f) => f.to && f.to.continent === continent.code,
    ).length;
    return acc;
  }, {});

  const totalClassified = Object.values(counts).reduce((a, b) => a + b, 0);
  const noData = flights.length - totalClassified;
  if (noData > 0) {
    counts['No Data'] = noData;
  }

  return sortAndLimit(counts, options);
}

export function routeDistribution(
  flights: FlightData[],
  _ctx: StatsContext,
  options?: AggregationOptions,
): Record<string, number> {
  const counts = flights.reduce<Record<string, number>>((acc, flight) => {
    if (!flight.from || !flight.to) return acc;

    const label =
      (flight.from.iata || flight.from.icao) +
      '-' +
      (flight.to.iata || flight.to.icao);
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  return sortAndLimit(counts, options);
}

export function airlineDistribution(
  flights: FlightData[],
  _ctx: StatsContext,
  options?: AggregationOptions,
): Record<string, number> {
  const counts = flights.reduce<Record<string, number>>((acc, flight) => {
    const label = flight.airline?.name ?? 'No Data';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  return sortAndLimit(counts, options);
}

export function aircraftModelDistribution(
  flights: FlightData[],
  _ctx: StatsContext,
  options?: AggregationOptions,
): Record<string, number> {
  const counts = flights.reduce<Record<string, number>>((acc, flight) => {
    const label = flight.aircraft?.name ?? 'No Data';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  return sortAndLimit(counts, options);
}

export function aircraftRegDistribution(
  flights: FlightData[],
  _ctx: StatsContext,
  options?: AggregationOptions,
): Record<string, number> {
  const counts = flights.reduce<Record<string, number>>((acc, flight) => {
    const label = flight.aircraftReg ?? 'No Data';
    acc[label] = (acc[label] || 0) + 1;
    return acc;
  }, {});
  return sortAndLimit(counts, options);
}

export function airportDistribution(
  flights: FlightData[],
  _ctx: StatsContext,
  options?: AggregationOptions,
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const { from, to } of flights) {
    for (const code of [from?.iata || from?.icao, to?.iata || to?.icao]) {
      if (!code) continue;

      counts[code] = (counts[code] ?? 0) + 1;
    }
  }
  return sortAndLimit(counts, options);
}

// Aircraft Report Helper Functions
export function totalAircraftTypes(flights: FlightData[]): number {
  const types = new Set(
    flights.map((f) => f.aircraft?.name).filter((n) => n !== undefined),
  );
  return types.size;
}

export function mostFlownAircraftType(
  flights: FlightData[],
): { type: string; count: number } | null {
  if (flights.length === 0) return null;

  const aircraftDist = aircraftModelDistribution(flights, {});
  const entries = Object.entries(aircraftDist);
  if (entries.length === 0) return null;

  const [type, count] = entries[0]!;
  return { type, count };
}

export function mostFlownTail(
  flights: FlightData[],
): { tail: string; count: number } | null {
  if (flights.length === 0) return null;

  const tailDist = aircraftRegDistribution(flights, {});
  const entries = Object.entries(tailDist);
  if (entries.length === 0) return null;

  // Skip "No Data" and use the first tail with actual data
  const tailEntry = entries.find(([tail]) => tail !== 'No Data');
  if (!tailEntry) return null;

  const [tail, count] = tailEntry;
  return { tail, count };
}

// Punctuality Report Helper Functions
export function getDelayInMinutes(
  scheduled: string | null | undefined,
  actual: string | null | undefined,
): number | null {
  if (!scheduled || !actual) return null;
  try {
    const scheduledTime = parseISO(scheduled);
    const actualTime = parseISO(actual);
    return differenceInMinutes(actualTime, scheduledTime);
  } catch {
    return null;
  }
}

export function calculateDelayStats(flights: FlightData[]): {
  delayedFlights: number;
  totalDelayed: number;
  totalFlights: number;
  totalDelayMinutes: number;
  maxDelayMinutes: number;
  airlineDelays: Record<
    string,
    { delayedFlights: number; totalDelayMinutes: number; totalFlights: number }
  >;
} {
  let delayedFlights = 0;
  let totalDelayMinutes = 0;
  let maxDelayMinutes = 0;
  const airlineDelays: Record<
    string,
    { delayedFlights: number; totalDelayMinutes: number; totalFlights: number }
  > = {};

  for (const flight of flights) {
    // Use arrival_scheduled vs arrival for delay calculation
    const scheduled = flight.raw?.arrivalScheduled;
    const actual = flight.raw?.arrival;
    const airlineName = flight.airline?.name ?? 'Unknown';

    // Initialize airline total flights count
    if (!airlineDelays[airlineName]) {
      airlineDelays[airlineName] = {
        delayedFlights: 0,
        totalDelayMinutes: 0,
        totalFlights: 0,
      };
    }
    airlineDelays[airlineName]!.totalFlights++;

    if (scheduled && actual) {
      try {
        const delayMinutes = getDelayInMinutes(scheduled, actual);

        // Only count delays > 10 minutes
        if (delayMinutes !== null && delayMinutes > 10) {
          delayedFlights++;
          totalDelayMinutes += delayMinutes;
          maxDelayMinutes = Math.max(maxDelayMinutes, delayMinutes);

          airlineDelays[airlineName]!.delayedFlights++;
          airlineDelays[airlineName]!.totalDelayMinutes += delayMinutes;
        }
      } catch {
        // Skip flights with invalid dates
      }
    }
  }

  return {
    delayedFlights,
    totalDelayed: delayedFlights,
    totalFlights: flights.length,
    totalDelayMinutes,
    maxDelayMinutes,
    airlineDelays,
  };
}

export function getWorstAirlinesByDelay(
  airlineDelays: Record<
    string,
    { delayedFlights: number; totalDelayMinutes: number; totalFlights: number }
  >,
  limit: number = 3,
): Array<{
  airline: string;
  totalDelayMinutes: number;
  delayedFlights: number;
  delayPercentage: number;
}> {
  return Object.entries(airlineDelays)
    .map(([airline, delays]) => ({
      airline,
      totalDelayMinutes: delays.totalDelayMinutes,
      delayedFlights: delays.delayedFlights,
      delayPercentage:
        delays.totalFlights > 0
          ? (delays.delayedFlights / delays.totalFlights) * 100
          : 0,
    }))
    .sort((a, b) => b.totalDelayMinutes - a.totalDelayMinutes)
    .slice(0, limit);
}

export const FLIGHT_CHARTS: Record<
  FlightChartKey,
  {
    title: string;
    aggregate: (
      flights: FlightData[],
      ctx: StatsContext,
      options?: AggregationOptions,
    ) => Record<string, number>;
  }
> = {
  'seat-class': { title: 'Seat Class', aggregate: seatClassDistribution },
  seat: { title: 'Seat Preference', aggregate: seatDistribution },
  reason: { title: 'Flight Reasons', aggregate: reasonDistribution },
  continents: { title: 'Continents', aggregate: continentDistribution },
  airlines: { title: 'Airlines', aggregate: airlineDistribution },
  'aircraft-models': {
    title: 'Aircraft Models',
    aggregate: aircraftModelDistribution,
  },
  'aircraft-regs': {
    title: 'Specific Aircrafts',
    aggregate: aircraftRegDistribution,
  },
  airports: { title: 'Visited Airports', aggregate: airportDistribution },
  routes: { title: 'Routes', aggregate: routeDistribution },
};

export const COUNTRY_CHARTS: Record<
  CountryChartKey,
  {
    title: string;
    aggregate: (
      visitedCountries: VisitedCountryStats[],
    ) => Record<string, number>;
  }
> = {
  'visited-country-status': {
    title: 'Visited Country Status',
    aggregate: visitedCountryStatusDistribution,
  },
};

export const COUNTRY_BAR_CHARTS: Record<
  CountryBarChartKey,
  {
    title: string;
    aggregate: (
      visitedCountries: VisitedCountryStats[],
    ) => Record<string, { visited: number; total: number }>;
  }
> = {
  'countries-by-continent': {
    title: 'Countries by Continent',
    aggregate: countriesByContinentDistribution,
  },
};

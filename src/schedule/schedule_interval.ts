export type ScheduleInterval =
  | 'second'
  | 'two seconds'
  | 'three seconds'
  | 'four seconds'
  | 'five seconds'
  | 'ten seconds'
  | 'fifteen seconds'
  | 'twenty seconds'
  | 'thirty seconds'
  | 'minute'
  | 'two minutes'
  | 'three minutes'
  | 'four minutes'
  | 'five minutes'
  | 'ten minutes'
  | 'fifteen minutes'
  | 'twenty minutes'
  | 'thirty minutes'
  | 'hour'
  | 'two hours'
  | 'three hours'
  | 'four hours'
  | 'five hours'
  | 'six hours'
  | 'seven hours'
  | 'eight hours'
  | 'nine hours'
  | 'ten hours'
  | 'eleven hours'
  | 'twelve hours'
  | 'day'
  | 'week'
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'
  | 'month'
  | 'last day of month'
//   | 'quarter'
//   | 'year'

export type ScheduleIntervalDayOfWeek =
  | 'sunday'
  | 'monday'
  | 'tuesday'
  | 'wednesday'
  | 'thursday'
  | 'friday'
  | 'saturday'

type Hour = `${0 | 1 | 2}${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`
type Minute = `${0 | 1 | 2 | 3 | 4 | 5}${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`

export type ScheduleIntervalTime = `${Hour}:${Minute}`

export function parseTime(time: ScheduleIntervalTime): [number, number] {
  const [hour, minute] = time.split(':')

  if (!hour || !minute) {
    throw new Error('Invalid time format')
  }

  return [Number(hour), Number(minute)]
}

export interface IntervalCronOptions {
  /** Minute to run. Default: 0 */
  minute?: number
  /** Hour to run. Default: 0 */
  hour?: number
  /** Day of month to run. Default: 1 */
  dayOfMonth?: number
  /** Day of week to run. Default: 0 */
  dayOfWeek?: ScheduleIntervalDayOfWeek
}

export function dayOfWeekToNumber(
  dayOfWeek: ScheduleIntervalDayOfWeek,
): number {
  switch (dayOfWeek) {
    case 'sunday':
      return 0
    case 'monday':
      return 1
    case 'tuesday':
      return 2
    case 'wednesday':
      return 3
    case 'thursday':
      return 4
    case 'friday':
      return 5
    case 'saturday':
      return 6
  }
}

/**
 * Converts a ScheduleInterval to a cron pattern string.
 * For longer intervals (hour, day, week, etc.), you can customize when they run.
 *
 * @param interval - The schedule interval
 * @param options - Options to customize the cron pattern
 * @returns A cron pattern string
 *
 * @example
 * intervalToCron('minute')                           // '* * * * *' - every minute
 * intervalToCron('hour', { minute: 30 })             // '30 * * * *' - every hour at :30
 * intervalToCron('day', { hour: 14, minute: 30 })    // '30 14 * * *' - daily at 2:30 PM
 * intervalToCron('week', { dayOfWeek: 1, hour: 9 })  // '0 9 * * 1' - Mondays at 9 AM
 */
export function intervalToCron(
  interval: ScheduleInterval,
  options: IntervalCronOptions = {},
): string {
  const { minute = 0, hour = 0, dayOfMonth = 1, dayOfWeek } = options

  const dayOfWeekNumber = dayOfWeekToNumber(dayOfWeek ?? 'sunday')

  const patterns: Record<ScheduleInterval, string> = {
    second: '* * * * * *',
    'two seconds': '*/2 * * * * *',
    'three seconds': '*/3 * * * * *',
    'four seconds': '*/4 * * * * *',
    'five seconds': '*/5 * * * * *',
    'ten seconds': '*/10 * * * * *',
    'fifteen seconds': '*/15 * * * * *',
    'twenty seconds': '*/20 * * * * *',
    'thirty seconds': '*/30 * * * * *',

    minute: '* * * * *',
    'two minutes': '*/2 * * * *',
    'three minutes': '*/3 * * * *',
    'four minutes': '*/4 * * * *',
    'five minutes': '*/5 * * * *',
    'ten minutes': '*/10 * * * *',
    'fifteen minutes': '*/15 * * * *',
    'twenty minutes': '*/20 * * * *',
    'thirty minutes': '*/30 * * * *',

    hour: `${minute} * * * *`,
    'two hours': `${minute} */2 * * *`,
    'three hours': `${minute} */3 * * *`,
    'four hours': `${minute} */4 * * *`,
    'five hours': `${minute} */5 * * *`,
    'six hours': `${minute} */6 * * *`,
    'seven hours': `${minute} */7 * * *`,
    'eight hours': `${minute} */8 * * *`,
    'nine hours': `${minute} */9 * * *`,
    'ten hours': `${minute} */10 * * *`,
    'eleven hours': `${minute} */11 * * *`,
    'twelve hours': `${minute} */12 * * *`,

    day: `${minute} ${hour} * * *`,

    week: `${minute} ${hour} * * ${dayOfWeekNumber}`,
    sunday: `${minute} ${hour} * * 0`,
    monday: `${minute} ${hour} * * 1`,
    tuesday: `${minute} ${hour} * * 2`,
    wednesday: `${minute} ${hour} * * 3`,
    thursday: `${minute} ${hour} * * 4`,
    friday: `${minute} ${hour} * * 5`,
    saturday: `${minute} ${hour} * * 6`,

    month: `${minute} ${hour} ${dayOfWeek ? '*' : dayOfMonth} * ${dayOfWeek ? dayOfWeekNumber + '#1' : '*'}`,
    'last day of month': `${minute} ${hour} L * *`,

    // quarter: `${minute} ${hour} ${dayOfWeek ? '*' : dayOfMonth} */3 ${dayOfWeek ? dayOfWeekNumber : '*'}`,
    // year: `${minute} ${hour} ${dayOfMonth} 1 ${dayOfWeek ? dayOfWeekNumber : '*'}`,
  }

  return patterns[interval]
}

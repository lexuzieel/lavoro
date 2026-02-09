import {
  IntervalCronOptions,
  ScheduleInterval,
  ScheduleIntervalTime,
  intervalToCron,
  parseTime,
} from '@lavoro/core'
import { CronExpressionOptions, CronExpressionParser } from 'cron-parser'
import { describe, expect, test } from 'vitest'

const options = {
  currentDate: '2025-01-01T00:00:00Z',
  tz: 'UTC',
}

const parse = (
  interval: ScheduleInterval,
  config?: {
    cronOptions?: IntervalCronOptions
    testOptions?: CronExpressionOptions
  },
) => {
  return CronExpressionParser.parse(
    intervalToCron(interval, config?.cronOptions),
    { ...options, ...config?.testOptions },
  )
}

const check = (
  interval: ScheduleInterval,
  expected: string,
  config?: {
    cronOptions?: IntervalCronOptions
    testOptions?: CronExpressionOptions
  },
) => {
  const parsed = parse(interval, config)
  expect(parsed.next().toDate().toISOString()).toBe(
    new Date(expected).toISOString(),
  )
}

describe('ScheduleInterval', () => {
  test('parseTime', async () => {
    expect(parseTime('12:00')).toEqual([12, 0])
    expect(parseTime('00:00')).toEqual([0, 0])
    expect(parseTime('00:05')).toEqual([0, 5])
    expect(parseTime('01:00')).toEqual([1, 0])
    expect(parseTime('01:05')).toEqual([1, 5])
    expect(parseTime('12:35')).toEqual([12, 35])
    expect(parseTime('23:50')).toEqual([23, 50])
    expect(parseTime('00:00:00' as ScheduleIntervalTime)).toEqual([0, 0])
    expect(parseTime('12:00:00' as ScheduleIntervalTime)).toEqual([12, 0])
    expect(parseTime('12:12:99' as ScheduleIntervalTime)).toEqual([12, 12])
    expect(() => parseTime('0:0' as ScheduleIntervalTime)).toThrowError(
      'Invalid time format',
    )
    expect(() => parseTime('0' as ScheduleIntervalTime)).toThrowError(
      'Invalid time format',
    )
  })

  test('every second', async () => {
    check('second', '2025-01-01T00:00:01Z')
  })

  test('every two seconds', async () => {
    check('two seconds', '2025-01-01T00:00:02Z')
  })

  test('every three seconds', async () => {
    check('three seconds', '2025-01-01T00:00:03Z')
  })

  test('every four seconds', async () => {
    check('four seconds', '2025-01-01T00:00:04Z')
  })

  test('every five seconds', async () => {
    check('five seconds', '2025-01-01T00:00:05Z')
  })

  test('every ten seconds', async () => {
    check('ten seconds', '2025-01-01T00:00:10Z')
  })

  test('every fifteen seconds', async () => {
    check('fifteen seconds', '2025-01-01T00:00:15Z')
  })

  test('every twenty seconds', async () => {
    check('twenty seconds', '2025-01-01T00:00:20Z')
  })

  test('every thirty seconds', async () => {
    check('thirty seconds', '2025-01-01T00:00:30Z')
  })

  test('every minute', async () => {
    check('minute', '2025-01-01T00:01:00Z')
  })

  test('every two minutes', async () => {
    check('two minutes', '2025-01-01T00:02:00Z')
  })

  test('every three minutes', async () => {
    check('three minutes', '2025-01-01T00:03:00Z')
  })

  test('every four minutes', async () => {
    check('four minutes', '2025-01-01T00:04:00Z')
  })

  test('every five minutes', async () => {
    check('five minutes', '2025-01-01T00:05:00Z')
  })

  test('every ten minutes', async () => {
    check('ten minutes', '2025-01-01T00:10:00Z')
  })

  test('every fifteen minutes', async () => {
    check('fifteen minutes', '2025-01-01T00:15:00Z')
  })

  test('every twenty minutes', async () => {
    check('twenty minutes', '2025-01-01T00:20:00Z')
  })

  test('every thirty minutes', async () => {
    check('thirty minutes', '2025-01-01T00:30:00Z')
  })

  test('every hour', async () => {
    check('hour', '2025-01-01T01:00:00Z')
  })

  test('every two hours', async () => {
    check('two hours', '2025-01-01T02:00:00Z')
  })

  test('every three hours', async () => {
    check('three hours', '2025-01-01T03:00:00Z')
  })

  test('every four hours', async () => {
    check('four hours', '2025-01-01T04:00:00Z')
  })

  test('every five hours', async () => {
    check('five hours', '2025-01-01T05:00:00Z')
  })

  test('every six hours', async () => {
    check('six hours', '2025-01-01T06:00:00Z')
  })

  test('every seven hours', async () => {
    check('seven hours', '2025-01-01T07:00:00Z')
  })

  test('every eight hours', async () => {
    check('eight hours', '2025-01-01T08:00:00Z')
  })

  test('every nine hours', async () => {
    check('nine hours', '2025-01-01T09:00:00Z')
  })

  test('every ten hours', async () => {
    check('ten hours', '2025-01-01T10:00:00Z')
  })

  test('every eleven hours', async () => {
    check('eleven hours', '2025-01-01T11:00:00Z')
  })

  test('every twelve hours', async () => {
    check('twelve hours', '2025-01-01T12:00:00Z')
  })

  test('every day', async () => {
    check('day', '2025-01-02T00:00:00Z')
  })

  test('every day at 12:00', async () => {
    // If it is before 12:00 on this day, it will run at 12:00 on this day
    check('day', '2025-01-01T12:00:00Z', {
      testOptions: { currentDate: '2025-01-01T11:59:00Z' }, // at 11:59
      cronOptions: { hour: 12 },
    })

    // If it is 12:00 on this day, it will run at 12:00 the next day
    check('day', '2025-01-02T12:00:00Z', {
      testOptions: { currentDate: '2025-01-01T12:00:00Z' }, // at 12:00
      cronOptions: { hour: 12 },
    })
  })

  test('every week on sunday', async () => {
    // 2025-01-01T00:00:00Z is a WEDNESDAY
    // so the next SUNDAY is 2025-01-05T00:00:00Z
    check('sunday', '2025-01-05T00:00:00Z')
    check('week', '2025-01-05T00:00:00Z')
  })

  test('every week on monday', async () => {
    // 2025-01-01T00:00:00Z is a WEDNESDAY
    // so the next MONDAY is 2025-01-06T00:00:00Z
    check('monday', '2025-01-06T00:00:00Z')
    check('week', '2025-01-06T00:00:00Z', {
      cronOptions: { dayOfWeek: 'monday' },
    })
  })

  test('every week on tuesday', async () => {
    // 2025-01-01T00:00:00Z is a WEDNESDAY
    // so the next TUESDAY is 2025-01-07T00:00:00Z
    check('tuesday', '2025-01-07T00:00:00Z')
    check('week', '2025-01-07T00:00:00Z', {
      cronOptions: { dayOfWeek: 'tuesday' },
    })
  })

  test('every week on wednesday', async () => {
    // 2025-01-01T00:00:00Z is a WEDNESDAY
    // so the next WEDNESDAY is 2025-01-08T00:00:00Z
    check('wednesday', '2025-01-08T00:00:00Z')
    check('week', '2025-01-08T00:00:00Z', {
      cronOptions: { dayOfWeek: 'wednesday' },
    })
  })

  test('every week on thursday', async () => {
    // 2025-01-01T00:00:00Z is a WEDNESDAY
    // so the next THURSDAY is 2025-01-02T00:00:00Z
    check('thursday', '2025-01-02T00:00:00Z')
    check('week', '2025-01-02T00:00:00Z', {
      cronOptions: { dayOfWeek: 'thursday' },
    })
  })

  test('every week on friday', async () => {
    // 2025-01-01T00:00:00Z is a WEDNESDAY
    // so the next FRIDAY is 2025-01-03T00:00:00Z
    check('friday', '2025-01-03T00:00:00Z')
    check('week', '2025-01-03T00:00:00Z', {
      cronOptions: { dayOfWeek: 'friday' },
    })
  })

  test('every week on saturday', async () => {
    // 2025-01-01T00:00:00Z is a WEDNESDAY
    // so the next SATURDAY is 2025-01-04T00:00:00Z
    check('saturday', '2025-01-04T00:00:00Z')
    check('week', '2025-01-04T00:00:00Z', {
      cronOptions: { dayOfWeek: 'saturday' },
    })
  })

  test('every month', async () => {
    check('month', '2025-02-01T00:00:00Z')
  })

  test('every last day of month', async () => {
    check('last day of month', '2025-01-31T00:00:00Z')
    check('month', '2025-01-31T00:00:00Z', {
      cronOptions: { dayOfMonth: 31 },
    })

    // If it is the last day of the month,
    // so the next time is the last day of the next month
    check('last day of month', '2025-02-28T00:00:00Z', {
      testOptions: { currentDate: '2025-01-31T00:00:00Z' },
    })
  })

  // test('every quarter', async () => {
  //   check('quarter', '2025-04-01T00:00:00Z')

  //   check('quarter', '2025-07-01T00:00:00Z', {
  //     testOptions: { currentDate: '2025-04-01T00:00:00Z' },
  //   })

  //   check('quarter', '2025-10-01T00:00:00Z', {
  //     testOptions: { currentDate: '2025-07-01T00:00:00Z' },
  //   })

  //   check('quarter', '2026-01-01T00:00:00Z', {
  //     testOptions: { currentDate: '2025-10-01T00:00:00Z' },
  //   })

  //   console.log(intervalToCron('quarter', { dayOfMonth: 3 }))

  //   // Every quarter on thursday
  //   check('quarter', '2025-04-01T00:00:00Z', {
  //     testOptions: { currentDate: '2025-01-01T00:00:00Z' },
  //     cronOptions: { dayOfMonth: 1 },
  //   })
  //   check('quarter', '2025-04-02T00:00:00Z', {
  //     testOptions: { currentDate: '2025-01-01T00:00:00Z' },
  //     cronOptions: { dayOfMonth: 2 },
  //   })
  // })

  // test('every year', async () => {
  //   check('year', '2026-01-01T00:00:00Z')

  //   // check('year', '2026-01-01T00:00:00Z', {
  //   //   cronOptions: {
  //   //     dayOfMonth: 2,
  //   //     // dayOfWeek: 'tuesday'
  //   //   },
  //   // })
  // })
})

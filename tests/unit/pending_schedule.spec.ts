import { PendingSchedule } from '../../src/schedule/pending_schedule.js'

import { CronExpressionOptions, CronExpressionParser } from 'cron-parser'
import { describe, expect, test } from 'vitest'

const options = {
  currentDate: '2025-01-01T00:00:00Z',
  tz: 'UTC',
}

const check = (
  expected: string,
  fn: (pending: PendingSchedule) => PendingSchedule,
  config?: {
    testOptions?: CronExpressionOptions
  },
) => {
  const pending = new PendingSchedule(
    'test',
    () => Promise.resolve(),
    null as any,
  )
  const configured = fn(pending)
  const parsed = CronExpressionParser.parse((configured as any).cronPattern, {
    ...options,
    ...config?.testOptions,
  })
  expect(parsed.next().toDate().toISOString()).toBe(
    new Date(expected).toISOString(),
  )
}

describe('PendingSchedule', () => {
  test('every second', async () => {
    check('2025-01-01T00:00:01Z', (pending) => pending.every('second'))
  })

  test('every two seconds', async () => {
    check('2025-01-01T00:00:02Z', (pending) => pending.every('two seconds'))
  })

  test('every three seconds', async () => {
    check('2025-01-01T00:00:03Z', (pending) => pending.every('three seconds'))
  })

  test('every four seconds', async () => {
    check('2025-01-01T00:00:04Z', (pending) => pending.every('four seconds'))
  })

  test('every five seconds', async () => {
    check('2025-01-01T00:00:05Z', (pending) => pending.every('five seconds'))
  })

  test('every ten seconds', async () => {
    check('2025-01-01T00:00:10Z', (pending) => pending.every('ten seconds'))
  })

  test('every fifteen seconds', async () => {
    check('2025-01-01T00:00:15Z', (pending) => pending.every('fifteen seconds'))
  })

  test('every twenty seconds', async () => {
    check('2025-01-01T00:00:20Z', (pending) => pending.every('twenty seconds'))
  })

  test('every thirty seconds', async () => {
    check('2025-01-01T00:00:30Z', (pending) => pending.every('thirty seconds'))
  })

  test('every minute', async () => {
    check('2025-01-01T00:01:00Z', (pending) => pending.every('minute'))
  })

  test('every two minutes', async () => {
    check('2025-01-01T00:02:00Z', (pending) => pending.every('two minutes'))
  })

  test('every three minutes', async () => {
    check('2025-01-01T00:03:00Z', (pending) => pending.every('three minutes'))
  })

  test('every four minutes', async () => {
    check('2025-01-01T00:04:00Z', (pending) => pending.every('four minutes'))
  })

  test('every five minutes', async () => {
    check('2025-01-01T00:05:00Z', (pending) => pending.every('five minutes'))
  })

  test('every ten minutes', async () => {
    check('2025-01-01T00:10:00Z', (pending) => pending.every('ten minutes'))
  })

  test('every fifteen minutes', async () => {
    check('2025-01-01T00:15:00Z', (pending) => pending.every('fifteen minutes'))
  })

  test('every twenty minutes', async () => {
    check('2025-01-01T00:20:00Z', (pending) => pending.every('twenty minutes'))
  })

  test('every thirty minutes', async () => {
    check('2025-01-01T00:30:00Z', (pending) => pending.every('thirty minutes'))
  })

  test('every hour', async () => {
    check('2025-01-01T01:00:00Z', (pending) => pending.every('hour'))
  })

  test('every hour at minute 30', async () => {
    check('2025-01-01T00:30:00Z', (pending) =>
      pending.every('hour', { minute: 30 }),
    )
  })

  test('every two hours', async () => {
    check('2025-01-01T02:00:00Z', (pending) => pending.every('two hours'))
  })

  test('every three hours', async () => {
    check('2025-01-01T03:00:00Z', (pending) => pending.every('three hours'))
  })

  test('every four hours', async () => {
    check('2025-01-01T04:00:00Z', (pending) => pending.every('four hours'))
  })

  test('every five hours', async () => {
    check('2025-01-01T05:00:00Z', (pending) => pending.every('five hours'))
  })

  test('every six hours', async () => {
    check('2025-01-01T06:00:00Z', (pending) => pending.every('six hours'))
  })

  test('every seven hours', async () => {
    check('2025-01-01T07:00:00Z', (pending) => pending.every('seven hours'))
  })

  test('every eight hours', async () => {
    check('2025-01-01T08:00:00Z', (pending) => pending.every('eight hours'))
  })

  test('every nine hours', async () => {
    check('2025-01-01T09:00:00Z', (pending) => pending.every('nine hours'))
  })

  test('every ten hours', async () => {
    check('2025-01-01T10:00:00Z', (pending) => pending.every('ten hours'))
  })

  test('every eleven hours', async () => {
    check('2025-01-01T11:00:00Z', (pending) => pending.every('eleven hours'))
  })

  test('every twelve hours', async () => {
    check('2025-01-01T12:00:00Z', (pending) => pending.every('twelve hours'))
  })

  test('every day', async () => {
    check('2025-01-02T00:00:00Z', (pending) => pending.every('day'))
  })

  test('every day at 12:00', async () => {
    // If it is before 12:00 on this day, it will run at 12:00 on THIS day
    check(
      '2025-01-01T12:00:00Z',
      (pending) => pending.every('day').at('12:00'),
      {
        testOptions: { currentDate: '2025-01-01T11:59:00Z' }, // at 11:59
      },
    )

    // If it is 12:00 on this day, it will run at 12:00 the NEXT day
    check(
      '2025-01-02T12:00:00Z',
      (pending) => pending.every('day').at('12:00'),
      {
        testOptions: { currentDate: '2025-01-01T12:00:00Z' }, // at 12:00
      },
    )
  })

  test('every last day of month at 12:00', async () => {
    check('2025-01-31T12:00:00Z', (pending) =>
      pending.every('last day of month').at('12:00'),
    )

    check(
      '2025-02-28T12:00:00Z',
      (pending) => pending.every('last day of month').at('12:00'),
      {
        testOptions: { currentDate: '2025-02-01T00:00:00Z' },
      },
    )
  })

  test('every week on monday', async () => {
    // 2025-01-01T00:00:00Z is a WEDNESDAY
    // so the next MONDAY is 2025-01-06T00:00:00Z
    check('2025-01-06T00:00:00Z', (pending) => pending.every('monday'))
    check('2025-01-06T00:00:00Z', (pending) =>
      pending.every('week').on('monday'),
    )
  })

  test('every week on tuesday', async () => {
    // 2025-01-01T00:00:00Z is a WEDNESDAY
    // so the next TUESDAY is 2025-01-07T00:00:00Z
    check('2025-01-07T00:00:00Z', (pending) => pending.every('tuesday'))
    check('2025-01-07T00:00:00Z', (pending) =>
      pending.every('week').on('tuesday'),
    )
  })

  test('every week on wednesday', async () => {
    // 2025-01-01T00:00:00Z is a WEDNESDAY
    // so the next WEDNESDAY is 2025-01-08T00:00:00Z
    check('2025-01-08T00:00:00Z', (pending) => pending.every('wednesday'))
    check('2025-01-08T00:00:00Z', (pending) =>
      pending.every('week').on('wednesday'),
    )
  })

  test('every week on thursday', async () => {
    // 2025-01-01T00:00:00Z is a WEDNESDAY
    // so the next THURSDAY is 2025-01-02T00:00:00Z
    check('2025-01-02T00:00:00Z', (pending) => pending.every('thursday'))
    check('2025-01-02T00:00:00Z', (pending) =>
      pending.every('week').on('thursday'),
    )
  })

  test('every week on friday', async () => {
    // 2025-01-01T00:00:00Z is a WEDNESDAY
    // so the next FRIDAY is 2025-01-03T00:00:00Z
    check('2025-01-03T00:00:00Z', (pending) => pending.every('friday'))
    check('2025-01-03T00:00:00Z', (pending) =>
      pending.every('week').on('friday'),
    )
  })

  test('every week on saturday', async () => {
    // 2025-01-01T00:00:00Z is a WEDNESDAY
    // so the next SATURDAY is 2025-01-04T00:00:00Z
    check('2025-01-04T00:00:00Z', (pending) => pending.every('saturday'))
    check('2025-01-04T00:00:00Z', (pending) =>
      pending.every('week').on('saturday'),
    )
  })

  test('every week on sunday', async () => {
    // 2025-01-01T00:00:00Z is a WEDNESDAY
    // so the next SUNDAY is 2025-01-05T00:00:00Z
    check('2025-01-05T00:00:00Z', (pending) => pending.every('sunday'))
    check('2025-01-05T00:00:00Z', (pending) => pending.every('week'))
  })

  test('every month', async () => {
    check('2025-02-01T00:00:00Z', (pending) => pending.every('month'))
  })

  test('every month on monday', async () => {
    check('2025-01-06T00:00:00Z', (pending) =>
      pending.every('month').on('monday'),
    )
  })

  test('every month on tuesday', async () => {
    check('2025-01-07T00:00:00Z', (pending) =>
      pending.every('month').on('tuesday'),
    )
  })

  test('every month on wednesday', async () => {
    check('2025-02-05T00:00:00Z', (pending) =>
      pending.every('month').on('wednesday'),
    )
  })

  test('every month on thursday', async () => {
    check('2025-01-02T00:00:00Z', (pending) =>
      pending.every('month').on('thursday'),
    )
  })

  test('every month on friday', async () => {
    check('2025-01-03T00:00:00Z', (pending) =>
      pending.every('month').on('friday'),
    )
  })

  test('every month on saturday', async () => {
    check('2025-01-04T00:00:00Z', (pending) =>
      pending.every('month').on('saturday'),
    )
  })

  test('every month on sunday', async () => {
    check('2025-01-05T00:00:00Z', (pending) =>
      pending.every('month').on('sunday'),
    )
  })

  test('every last day of month', async () => {
    check('2025-01-31T00:00:00Z', (pending) =>
      pending.every('last day of month'),
    )

    check('2025-01-31T14:30:00Z', (pending) =>
      pending.every('last day of month').at('14:30'),
    )

    check('2025-01-31T00:00:00Z', (pending) =>
      pending.every('month', { dayOfMonth: 31 }),
    )

    // If it is the last day of the month,
    // so the next time is the last day of the next month
    check(
      '2025-02-28T00:00:00Z',
      (pending) => pending.every('last day of month'),
      {
        testOptions: { currentDate: '2025-01-31T00:00:00Z' },
      },
    )
  })

  describe('semantic guards', () => {
    test('.at() throws for small intervals', () => {
      const pending = new PendingSchedule(
        'test',
        () => Promise.resolve(),
        null as any,
      )

      expect(() => pending.every('second').at('12:00')).toThrow()
      expect(() => pending.every('minute').at('12:00')).toThrow()
      expect(() => pending.every('hour').at('12:00')).toThrow()
    })

    test('.at() works for daily intervals or larger', () => {
      expect(() =>
        new PendingSchedule('test', () => Promise.resolve(), null as any)
          .every('day')
          .at('12:00'),
      ).not.toThrow()
    })

    test('.on() throws for small intervals', () => {
      const pending = new PendingSchedule(
        'test',
        () => Promise.resolve(),
        null as any,
      )

      expect(() => pending.every('second').on('monday')).toThrow()
      expect(() => pending.every('minute').on('monday')).toThrow()
      expect(() => pending.every('hour').on('monday')).toThrow()
      expect(() => pending.every('day').on('monday')).toThrow()
    })

    test('.on() works for weekly intervals or larger', () => {
      check('2025-01-06T00:00:00Z', (pending) =>
        pending.every('week').on('monday'),
      )
      check('2025-01-07T00:00:00Z', (pending) =>
        pending.every('week').on('tuesday'),
      )
      check('2025-01-08T00:00:00Z', (pending) =>
        pending.every('week').on('wednesday'),
      )
      check('2025-01-02T00:00:00Z', (pending) =>
        pending.every('week').on('thursday'),
      )
      check('2025-01-03T00:00:00Z', (pending) =>
        pending.every('week').on('friday'),
      )
      check('2025-01-04T00:00:00Z', (pending) =>
        pending.every('week').on('saturday'),
      )
      check('2025-01-05T00:00:00Z', (pending) =>
        pending.every('week').on('sunday'),
      )

      check('2025-01-06T00:00:00Z', (pending) =>
        pending.every('month').on('monday'),
      )
      check('2025-01-07T00:00:00Z', (pending) =>
        pending.every('month').on('tuesday'),
      )
      check('2025-02-05T00:00:00Z', (pending) =>
        pending.every('month').on('wednesday'),
      )
      check('2025-01-02T00:00:00Z', (pending) =>
        pending.every('month').on('thursday'),
      )
      check('2025-01-03T00:00:00Z', (pending) =>
        pending.every('month').on('friday'),
      )
      check('2025-01-04T00:00:00Z', (pending) =>
        pending.every('month').on('saturday'),
      )
      check('2025-01-05T00:00:00Z', (pending) =>
        pending.every('month').on('sunday'),
      )
    })

    test('no schedule pattern throws', async () => {
      await expect(
        new PendingSchedule('test', () => Promise.resolve(), null as any),
      ).rejects.toThrow()
    })
  })
})

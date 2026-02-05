---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

title: 'Lavoro - Easy Background Job Scheduling for Node.js'
titleTemplate: ':title'

hero:
  name: Lavoro
  text: Easy Background Task Scheduling for Node.js
  tagline: Fluent, type-safe API & support for multiple drivers
  image:
    src: /hero-image.png
    alt: Lavoro is a background job queue and scheduler for Node.js
  actions:
    - theme: brand
      text: Quick Start
      link: /quick-start
    - theme: alt
      text: Documentation
      link: /introduction

features:
  - icon: ✨
    title: Fluent API
    details:
      Inspired by <a href="https://laravel.com/docs/12.x/queues">Laravel
      queues</a>, Lavoro brings TypeScript-first API that is a joy to use
  - icon: ⚡
    title: Distributed by Design
    details:
      Scale by launching more instances without complex scheduling coordination
      logic
  - icon: 📦
    title: Multiple Drivers
    details:
      Use your existing PostgreSQL database or store jobs in memory during
      development
      # Use your existing PostgreSQL database or bring in Redis for the high-throughput use cases
---

## Ever wanted to ...

1. Just specify job logic with a type-safe payload:

```ts
import { Job } from '@lavoro/core'

export class Inspire extends Job {
  async handle(payload: { quote: string }): Promise<void> {
    logger.info(payload.quote)
  }
}
```

2. Initialize Lavoro:

```ts
const queue = new Queue(queueConfig)
Job.setDefaultQueueServiceResolver(() => queue)

await queue.start()
```

3. And simply use it:

```ts
await Schedule.job(Inspire, {
  quote: 'Done is better than perfect',
}).every('five seconds')
```

... without running a separate worker process and manually coordinating job
scheduling?

**Lavoro makes this a breeze.**

First, install the queue drivers:

```bash
npm install @lavoro/memory @lavoro/postgres
```

Then, follow an easy [quick start guide](/quick-start) to get started.

Or if you're curious about the design philosophy behind Lavoro and how it is
different, check out the [motivation](/introduction#motivation) section of the
introduction.

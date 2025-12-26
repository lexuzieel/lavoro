---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

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
      link: /markdown-examples
    - theme: alt
      text: Documentation
      link: /api-examples

features:
  - icon: ✨
    title: Fluent API
    details:
      Inspired by Laravel, Lavoro brings TypeScript-first API that is a joy to
      use
  - icon: 🔍
    title: Type-Safe
    details: Type-safe queue names and payloads
  - icon: 📦
    title: Multiple Drivers (coming soon)
    details:
      Use your existing PostgreSQL database or bring in Redis for the
      high-throughput use cases.
---

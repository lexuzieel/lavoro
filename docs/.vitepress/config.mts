import { defineConfig } from 'vitepress'
import { withMermaid } from 'vitepress-plugin-mermaid'

export default withMermaid(
  // https://vitepress.dev/reference/site-config
  defineConfig({
    // title: 'Lavoro - Make Job Scheduling a Breeze',
    // description: 'Easy background job scheduling with fluent API for Node.js',
    // title: 'Lavoro - Easy Background Job Scheduling for Node.js',
    description: 'Easy background job scheduling with fluent API for Node.js',
    titleTemplate:
      ':title - Lavoro - Easy Background Task Scheduling for Node.js',
    themeConfig: {
      // https://vitepress.dev/reference/default-theme-config
      logo: {
        dark: '/lavoro-plain-dark.svg',
        light: '/lavoro-plain-light.svg',
      },
      siteTitle: 'Lavoro',
      nav: [
        { text: 'Home', link: '/' },
        {
          text: 'Integrations',
          items: [{ text: 'AdonisJS', link: '/markdown-examples' }],
        },
        {
          text: 'Drivers',
          items: [
            { text: 'PostgreSQL', link: '/markdown-examples' },
            { text: 'Memory', link: '/markdown-examples' },
            // { text: 'Redis', link: '/markdown-examples' },
          ],
        },
      ],

      sidebar: [
        {
          text: 'Guides',
          items: [
            { text: 'Introduction', link: '/introduction' },
            { text: 'Quick Start', link: '/quick-start' },
            { text: 'Configuration', link: '/configuration' },
            {
              text: 'Drivers',
              base: '/drivers',
              link: '/',
              items: [
                { text: 'Memory', link: '/memory' },
                { text: 'PostgreSQL', link: '/postgresql' },
              ],
            },
            { text: 'Creating a Queue', link: '/queue' },
            { text: 'Creating Jobs', link: '/jobs' },
            { text: 'Frequently Asked Questions', link: '/faq' },
            { text: 'Roadmap', link: '/roadmap' },
          ],
        },
        {
          text: 'Digging Deeper',
          items: [
            { text: 'Distributed Locking', link: '/distributed-locking' },
            { text: 'Logging', link: '/logging' },
            { text: 'Events', link: '/events' },
          ],
        },
        {
          text: 'Integrations',
          items: [
            { text: 'AdonisJS', link: '/integration-with-adonisjs' }, //
          ],
        },
      ],

      socialLinks: [
        { icon: 'github', link: 'https://github.com/lexuzieel/lavoro' },
      ],

      footer: {
        message: 'Released under the MIT License.',
        copyright: 'Copyright © 2025-present Aleksei Ivanov',
      },
    },

    head: [
      [
        'link',
        {
          rel: 'icon',
          type: 'image/svg+xml',
          href: '/favicon.svg',
        },
      ],
      [
        'link',
        {
          rel: 'alternate icon',
          type: 'image/x-icon',
          href: '/favicon.ico',
        },
      ],
      [
        'meta',
        {
          name: 'google-site-verification',
          content: 'mvsku5PfP6XggNM2FAFwjwl9l1BI6Ra0rcxI7k-CqLQ',
        },
      ],
    ],

    sitemap: {
      hostname: 'https://lavoro-docs.netlify.app',
    },
  }),
)

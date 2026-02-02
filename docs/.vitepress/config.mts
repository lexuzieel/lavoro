import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
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
        text: 'Examples',
        items: [
          { text: 'Markdown Examples', link: '/markdown-examples' },
          { text: 'Runtime API Examples', link: '/api-examples' },
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
})

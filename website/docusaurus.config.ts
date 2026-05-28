import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

const config: Config = {
  title: 'cicd_easy',
  tagline: '让 CI/CD 学习简单透明',
  favicon: 'img/favicon.ico',

  future: {
    v4: true,
  },

  url: 'https://yunper-wang.github.io',
  baseUrl: '/cicd_easy/',

  organizationName: 'yunper-wang',
  projectName: 'cicd_easy',

  onBrokenLinks: 'throw',

  i18n: {
    defaultLocale: 'zh-Hans',
    locales: ['zh-Hans'],
  },

  presets: [
    [
      'classic',
      {
        docs: {
          sidebarPath: './sidebars.ts',
          editUrl:
            'https://github.com/yunper-wang/cicd_easy/tree/main/website/',
        },
        theme: {
          customCss: './src/css/custom.css',
        },
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      defaultMode: 'dark',
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: 'cicd_easy',
      logo: {
        alt: 'cicd_easy Logo',
        src: 'img/logo.svg',
      },
      items: [
        {
          type: 'docSidebar',
          sidebarId: 'tutorialSidebar',
          position: 'left',
          label: '教程',
        },
        {
          type: 'docSidebar',
          sidebarId: 'labsSidebar',
          position: 'left',
          label: '实操练习',
        },
        {
          type: 'docSidebar',
          sidebarId: 'conceptsSidebar',
          position: 'left',
          label: '概念',
        },
        {
          to: '/docs/roadmap',
          label: '学习路线图',
          position: 'left',
        },
        {
          href: 'https://github.com/yunper-wang/cicd_easy',
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: '学习',
          items: [
            {
              label: '教程',
              to: '/docs/intro',
            },
            {
              label: '实操练习',
              to: '/docs/labs/stage1/overview',
            },
          ],
        },
        {
          title: '更多',
          items: [
            {
              label: '学习路线图',
              to: '/docs/roadmap',
            },
            {
              label: 'GitHub',
              href: 'https://github.com/yunper-wang/cicd_easy',
            },
          ],
        },
      ],
      copyright: `Copyright © ${new Date().getFullYear()} cicd_easy. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['yaml', 'bash', 'docker'],
    },
  } satisfies Preset.ThemeConfig,
};

export default config;

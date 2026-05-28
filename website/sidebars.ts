import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  tutorialSidebar: [
    'intro',
    'getting-started',
    'roadmap',
    {
      type: 'category',
      label: 'Stage 1: 静态部署',
      items: [
        'stage1/concepts',
        'stage1/pipeline-config',
        'stage1/config-diff',
        'stage1/hands-on',
      ],
    },
    {
      type: 'category',
      label: 'Stage 2: 多环境管理',
      items: [
        'stage2/concepts',
        'stage2/kustomize-config',
        'stage2/hands-on',
      ],
    },
    {
      type: 'category',
      label: 'Stage 3: Canary 发布',
      items: [
        'stage3/concepts',
        'stage3/rollout-config',
        'stage3/hands-on',
      ],
    },
  ],

  labsSidebar: [
    {
      type: 'category',
      label: '实操练习',
      items: [
        'labs/stage1/overview',
        'labs/stage2/overview',
        'labs/stage3/overview',
      ],
    },
  ],

  conceptsSidebar: [
    {
      type: 'category',
      label: '核心概念',
      items: [
        'concepts/gitops',
        'concepts/gitlab-ci',
        'concepts/argo-cd',
        'concepts/argo-rollouts',
        'concepts/docker',
        'concepts/kubernetes',
      ],
    },
  ],
};

export default sidebars;

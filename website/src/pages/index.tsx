import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Heading from '@theme/Heading';

import styles from './index.module.css';

const StageList = [
  {
    title: 'Stage 1: 静态部署',
    description: '从零开始，通过 GitLab CI 构建镜像，Argo CD 自动同步部署，体验完整的 GitOps 闭环。',
    link: '/docs/stage1/concepts',
    label: '开始学习',
    concepts: ['Docker', 'GitLab CI', 'Argo CD'],
  },
  {
    title: 'Stage 2: 多环境管理',
    description: '使用 Kustomize 管理 dev/staging/prod 三个环境，理解配置复用和环境差异化策略。',
    link: '/docs/stage2/concepts',
    label: '开始学习',
    concepts: ['Kustomize', '多环境', 'Sync Policy'],
  },
  {
    title: 'Stage 3: Canary 发布',
    description: '通过 Argo Rollouts 实现金丝雀发布，配置自动分析和回滚策略，掌握渐进式交付。',
    link: '/docs/stage3/concepts',
    label: '开始学习',
    concepts: ['Canary', 'Analysis', 'Auto Rollback'],
  },
];

function StageCard({title, description, link, label, concepts}: (typeof StageList)[number]) {
  return (
    <div className={clsx('col col--4')}>
      <div className={styles.stageCard}>
        <Heading as="h3">{title}</Heading>
        <p>{description}</p>
        <div className={styles.conceptTags}>
          {concepts.map((concept) => (
            <span key={concept} className={styles.conceptTag}>{concept}</span>
          ))}
        </div>
        <div className={styles.cardButton}>
          <Link className="button button--primary button--sm" to={link}>
            {label}
          </Link>
        </div>
      </div>
    </div>
  );
}

function HomepageHeader() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className={clsx('hero hero--primary', styles.heroBanner)}>
      <div className="container">
        <Heading as="h1" className="hero__title">
          {siteConfig.title}
        </Heading>
        <p className="hero__subtitle">{siteConfig.tagline}</p>
        <p className={styles.heroDesc}>
          通过 3 个渐进式 Stage，掌握 GitLab CI + Argo CD + Argo Rollouts 的完整 GitOps 工作流
        </p>
        <div className={styles.buttons}>
          <Link
            className="button button--secondary button--lg"
            to="/docs/getting-started">
            快速开始
          </Link>
          <Link
            className={clsx('button button--outline button--lg', styles.outlineBtn)}
            to="/docs/roadmap">
            学习路线图
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout
      title={`${siteConfig.title} — CI/CD 交互式学习`}
      description="从零到生产级的 CI/CD GitOps 交互式学习平台">
      <HomepageHeader />
      <main>
        <section className={styles.stagesSection}>
          <div className="container">
            <Heading as="h2" className={styles.sectionTitle}>
              3 个渐进式学习阶段
            </Heading>
            <div className="row">
              {StageList.map((props) => (
                <StageCard key={props.title} {...props} />
              ))}
            </div>
          </div>
        </section>
        <section className={styles.featuresSection}>
          <div className="container">
            <div className="row">
              <div className="col col--4">
                <div className={styles.featureItem}>
                  <Heading as="h3">交互式学习</Heading>
                  <p>通过可视化配置、流程模拟、代码对比，主动理解每个 CI/CD 概念</p>
                </div>
              </div>
              <div className="col col--4">
                <div className={styles.featureItem}>
                  <Heading as="h3">真实技术栈</Heading>
                  <p>基于 GitLab CI、Argo CD、Kubernetes 等行业标准工具，学以致用</p>
                </div>
              </div>
              <div className="col col--4">
                <div className={styles.featureItem}>
                  <Heading as="h3">透明对照</Heading>
                  <p>每个配置操作都对应真实的 CI/CD 流程，学习过程即实战过程</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>
    </Layout>
  );
}

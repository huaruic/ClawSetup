export type Locale = 'en' | 'zh';

export type Translations = (typeof translations)['en'];

export const translations = {
  en: {
    meta: {
      title: 'ClawSetup | Run OpenClaw locally without terminal friction',
      description:
        'A beginner-friendly local OpenClaw desktop client for macOS. Install, configure, and verify your local setup through a fast visual flow.',
    },
    brand: {
      tagline: 'OpenClaw local desktop client',
    },
    nav: {
      why: 'Why',
      walkthrough: 'Walkthrough',
      faq: 'FAQ',
    },
    hero: {
      eyebrow: ['macOS', 'Local-first', 'No terminal required'],
      title: 'Run OpenClaw locally without terminal friction.',
      text: 'ClawSetup is a beginner-friendly desktop client for installing, configuring, and verifying OpenClaw through a fast visual flow built for first-time users.',
      ctaPrimary: 'Star on GitHub',
      ctaSecondary: 'View walkthrough',
      points: [
        'Visual onboarding instead of command-line guesswork',
        'Runtime visibility, logs, and confidence checks in one place',
        'Designed for beginners, demos, and workshop-friendly setup',
      ],
    },
    stat: {
      minute: '1 minute goal',
      minuteDesc: 'Designed to reduce first-run setup friction.',
      local: 'Local control',
      localDesc: 'Built around private, on-device OpenClaw usage.',
    },
    why: {
      kicker: 'Why ClawSetup',
      title: 'OpenClaw is powerful. The first-run experience still scares off too many users.',
      text: 'The product opportunity is not just a nicer UI. It is a simpler, more confidence-building path for people who want local AI tooling without translating docs into shell commands.',
    },
    whatHappens: {
      kicker: 'What happens',
      title: 'A setup flow that feels more like onboarding than troubleshooting.',
    },
    steps: [
      'Check the local environment and OpenClaw CLI state.',
      'Configure your provider in a visual setup flow.',
      'Launch OpenClaw locally and verify runtime readiness.',
      'Finish setup and continue from a lightweight dashboard.',
    ],
    walkthrough: {
      kicker: 'Walkthrough',
      title: 'Show the product, not just the promise.',
      text: 'The first website version reuses the actual product screens so visitors can understand the flow before they ever clone the repository.',
    },
    gallery: [
      {
        src: '/readme/01-welcome.png',
        title: 'Welcome screen',
        description: 'A clear first step with environment context and an approachable setup entry point.',
        alt: 'ClawSetup welcome screen showing the first step of the local setup flow.',
      },
      {
        src: '/readme/03-ai-provider.png',
        title: 'Provider configuration',
        description: 'Paste credentials, validate configuration, and move forward without editing local files by hand.',
        alt: 'ClawSetup provider setup screen with visual configuration form.',
      },
      {
        src: '/readme/05-onboarding-ready.png',
        title: 'Runtime ready',
        description: 'Know when OpenClaw is actually running and inspect the state without switching back to terminal logs.',
        alt: 'ClawSetup runtime ready screen confirming local OpenClaw is available.',
      },
      {
        src: '/readme/10-setup-complete.png',
        title: 'Setup complete',
        description: 'Finish with a direct path into the OpenClaw dashboard and a clearer sense of what is ready.',
        alt: 'ClawSetup completion screen after the guided setup finishes.',
      },
    ],
    story: {
      kicker: 'Why local-first matters',
      title: 'ClawSetup is the entry point to a privacy-first OpenClaw desktop experience.',
      text: 'This is not just a wrapper around install commands. It is the foundation of a more approachable OpenClaw client: local control, clearer status, and a setup experience that helps users trust what is happening.',
    },
    faq: {
      kicker: 'FAQ',
      title: 'Short answers for the first questions visitors will ask.',
      items: [
        {
          question: 'Is ClawSetup a cloud service?',
          answer: 'No. The product direction is local-first and privacy-first. The setup flow is designed around running OpenClaw on your own machine.',
        },
        {
          question: 'Do I need to use terminal commands?',
          answer: 'That is exactly the friction ClawSetup tries to remove. The goal is to make setup approachable through a guided interface.',
        },
        {
          question: 'Who is this for?',
          answer: 'It is built for OpenClaw beginners, workshop participants, and anyone who prefers a visual setup experience over manual local configuration.',
        },
        {
          question: 'Is ClawSetup macOS only?',
          answer: 'Yes. The current version focuses on macOS. Cross-platform support may be explored later.',
        },
      ],
    },
    cta: {
      kicker: 'Get started',
      title: 'Explore the repo, follow the product story, and try the local flow.',
      primary: 'Open GitHub',
      secondary: 'Quick start',
    },
    highlight: [
      {
        title: 'Beginner-first setup',
        body: 'Turn OpenClaw setup into a guided visual flow instead of a fragile sequence of terminal commands.',
      },
      {
        title: 'Local-first by design',
        body: 'Keep runtime, config, and control on your own machine with a workflow built for local usage.',
      },
      {
        title: 'Fast confidence checks',
        body: 'See install status, runtime readiness, and next actions in one place instead of guessing.',
      },
      {
        title: 'Built for real onboarding',
        body: 'Ideal for first-time OpenClaw users, demos, workshops, and non-technical teammates.',
      },
    ],
  },
  zh: {
    meta: {
      title: 'ClawSetup | 本地运行 OpenClaw，告别终端门槛',
      description:
        '面向 macOS 的小白友好 OpenClaw Desktop Client。通过简单的可视化界面完成本地安装、配置与验证。',
    },
    brand: {
      tagline: 'OpenClaw 本地桌面客户端',
    },
    nav: {
      why: '为什么',
      walkthrough: '使用流程',
      faq: '常见问题',
    },
    hero: {
      eyebrow: ['macOS', '本地优先', '无需终端'],
      title: '本地运行 OpenClaw，告别终端门槛。',
      text: 'ClawSetup 是一套面向新手的桌面客户端，通过可视化的快速流程完成 OpenClaw 的安装、配置与验证，专为第一次使用的用户设计。',
      ctaPrimary: '在 GitHub 上 Star',
      ctaSecondary: '查看流程',
      points: [
        '可视化引导，告别命令行猜谜',
        '运行状态、日志与检查集中展示',
        '面向新手、演示与工作坊的 setup 体验',
      ],
    },
    stat: {
      minute: '1 分钟目标',
      minuteDesc: '力求降低首次运行时的操作阻力。',
      local: '本地掌控',
      localDesc: '围绕本地、本机运行 OpenClaw 的使用方式设计。',
    },
    why: {
      kicker: '为什么需要 ClawSetup',
      title: 'OpenClaw 很强大，但本地部署流程对很多新用户仍然过于技术化。',
      text: '产品机会不仅是更好的 UI，更是为想用本地 AI 工具的人提供一条更简单、更有信心的路径，而不用把文档翻译成 shell 命令。',
    },
    whatHappens: {
      kicker: '使用流程',
      title: 'Setup 流程更像 onboarding，而不是排错。',
    },
    steps: [
      '检查本地环境与 OpenClaw CLI 状态。',
      '在可视化流程中配置你的 provider。',
      '在本地启动 OpenClaw 并验证运行状态。',
      '完成 setup 并从轻量 dashboard 继续。',
    ],
    walkthrough: {
      kicker: '产品演示',
      title: '展示产品，而不只是承诺。',
      text: '官网首版复用产品实际截图，让访客在 clone 仓库前就能理解整个流程。',
    },
    gallery: [
      {
        src: '/readme/01-welcome.png',
        title: '欢迎页',
        description: '清晰的第一步，展示环境信息和可理解的 setup 入口。',
        alt: 'ClawSetup 欢迎页，展示本地 setup 流程的第一步。',
      },
      {
        src: '/readme/03-ai-provider.png',
        title: 'Provider 配置',
        description: '填写凭证、校验配置，无需手动编辑本地文件。',
        alt: 'ClawSetup provider 配置界面，带可视化表单。',
      },
      {
        src: '/readme/05-onboarding-ready.png',
        title: '运行就绪',
        description: '清楚了解 OpenClaw 是否在运行，无需切回终端查日志。',
        alt: 'ClawSetup 运行就绪界面，确认本地 OpenClaw 可用。',
      },
      {
        src: '/readme/10-setup-complete.png',
        title: 'Setup 完成',
        description: '直接进入 OpenClaw dashboard，清楚知道当前状态。',
        alt: 'ClawSetup 完成界面，guided setup 结束后的状态。',
      },
    ],
    story: {
      kicker: '为什么本地优先',
      title: 'ClawSetup 是通往隐私优先 OpenClaw 桌面体验的入口。',
      text: '这不仅是 install 命令的包装，而是更易上手的 OpenClaw 客户端的基石：本地掌控、更清晰的状态，以及让用户信任整个过程的 setup 体验。',
    },
    faq: {
      kicker: '常见问题',
      title: '访客最常问的问题，简短作答。',
      items: [
        {
          question: 'ClawSetup 是云服务吗？',
          answer: '不是。产品方向是本地优先、隐私优先，setup 流程围绕在你自己机器上运行 OpenClaw 设计。',
        },
        {
          question: '我需要在终端里敲命令吗？',
          answer: '这正是 ClawSetup 想要消除的摩擦，目标是让 setup 通过可视化界面完成。',
        },
        {
          question: '适合谁用？',
          answer: '为 OpenClaw 新手、工作坊参与者，以及更喜欢可视化 setup 而非手动配置的用户设计。',
        },
        {
          question: '目前只支持 macOS 吗？',
          answer: '是的。当前版本主要支持 macOS，后续可能会探索跨平台。',
        },
      ],
    },
    cta: {
      kicker: '开始使用',
      title: '浏览仓库、了解产品故事，并体验本地流程。',
      primary: '打开 GitHub',
      secondary: '快速开始',
    },
    highlight: [
      {
        title: '新手优先的 setup',
        body: '将 OpenClaw setup 变成可视化引导流程，而不是脆弱的终端命令序列。',
      },
      {
        title: '本地优先设计',
        body: '运行、配置和控制都在你自己的机器上完成。',
      },
      {
        title: '快速信心检查',
        body: '安装状态、运行就绪、下一步行动集中可见，不再靠猜。',
      },
      {
        title: '真实 onboarding 场景',
        body: '适合 OpenClaw 新手、演示、工作坊和非技术同事。',
      },
    ],
  },
} as const;

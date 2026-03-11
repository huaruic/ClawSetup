# ClawSetup

本地安装向导，用于安装和配置 [OpenClaw](https://openclaw.ai) 并接入[飞书](https://www.feishu.cn)机器人。

[English](./README.md)

## 功能介绍

ClawSetup 引导非技术用户通过四个步骤完成 OpenClaw 本地部署和飞书机器人接入：

1. **环境检测** — 检查 Node.js、OpenClaw CLI 和网关状态，缺失时提供一键安装。
2. **飞书配置** — 填写 App ID、App Secret 和 Verification Token，附带配置指南链接。
3. **初始化与验证** — 启动网关、应用配置并验证飞书 API 连通性（Token 交换 + Bot 信息校验）。
4. **完成** — 打开 OpenClaw 控制台。

## 快速开始

```bash
git clone https://github.com/anthropics/ClawSetup.git
cd ClawSetup
npm install
npm run dev
```

在浏览器中打开 [http://localhost:3000](http://localhost:3000)。

## 前置要求

- **Node.js** >= 18
- **OpenClaw CLI**（向导可以自动安装）

## 项目结构

```
ClawSetup/
├── src/
│   ├── app/
│   │   ├── page.tsx              # 步骤 1：环境检测
│   │   ├── feishu/page.tsx       # 步骤 2：飞书配置
│   │   ├── verify/page.tsx       # 步骤 3：初始化与验证
│   │   ├── done/page.tsx         # 步骤 4：配置完成
│   │   └── api/                  # API 路由
│   ├── components/
│   │   ├── setup-shell.tsx       # 共享向导布局
│   │   └── ui/                   # shadcn/ui 组件
│   └── lib/
│       ├── shell.ts              # Shell 命令执行与平台适配
│       ├── tasks.ts              # 内存异步任务系统
│       ├── feishu.ts             # 飞书 API 客户端与配置持久化
│       └── utils.ts
├── package.json
├── next.config.ts
├── tsconfig.json
└── CLAUDE.md
```

## 技术栈

- **框架**: [Next.js 16](https://nextjs.org)（App Router）+ React 19
- **UI**: [shadcn/ui](https://ui.shadcn.com) + [Tailwind CSS v4](https://tailwindcss.com)
- **校验**: [Zod v4](https://zod.dev)
- **Shell 执行**: [execa](https://github.com/sindresorhus/execa)
- **语言**: TypeScript（严格模式）

## 脚本命令

```bash
npm run dev       # 启动开发服务器（端口 3000）
npm run build     # 生产环境构建
npm run start     # 启动生产服务器
npm run lint      # 运行 ESLint
```

## 参与贡献

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 发起 Pull Request

## 许可证

[MIT](./LICENSE)

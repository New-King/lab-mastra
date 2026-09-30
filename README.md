# lab-mastra（Mastra 项目制课程）

Mastra 版的课程站点，站点结构、UI 与数据文件形状和 `lab-ai-sdk` 保持一致。

- `lab-ai-sdk`：AI SDK 的轻量面 + 前端（Core 的 `generateText` / `streamText` / `tool` / 结构化输出，UI 的消息流协议与 hooks）。
- `lab-mastra`（本项目）：同一个前端，后端换成 Mastra —— 覆盖 Agent / Workflow / Memory / RAG / Evals / Observability / 上线部署等重编排与工程化能力。

## 和 AI SDK 的关系

前端**不重学**。本课程的 Web UI 直接沿用 `lab-ai-sdk` 里已经做过的 `useChat` + `parts` 渲染 + `tool-*` / `data-*` part，只是后端从「自己写的 `app/api/generate/route.ts`」换成「Mastra 的 agent + `chatRoute()`」。

学员的感知应该是：**还是那个页面，后端升级了** —— 这样才能讲清"什么时候该上框架"。

## 站点结构（与 lab-ai-sdk 保持一致）

```text
lab-mastra/
├── AGENTS.md                    # 维护规则（课程结构、知识点规则、覆盖式演进约定）
├── README.md                    # 本文件
├── docs/
│   ├── curriculum.md            # 课表：主线 + 进阶，每课目标/能力/验收标准
│   ├── coverage-matrix.md       # Mastra 官方能力 ↔ 课次映射（含未进主线项与原因）
│   └── reference-repo-notes.md  # 参考仓库 my19940202/mastra-agent 的对照笔记
├── app/                         # 站点（结构照抄 lab-ai-sdk）
│   ├── (shell)/lab/[lessonSlug]/page.tsx
│   └── globals.css
├── components/                  # 代码面板 / 文档侧栏 / 延伸阅读弹窗（照抄 lab-ai-sdk）
└── lib/
    ├── projects.ts              # 课次数据（与 lab-ai-sdk 同名同结构：INIT_STEPS / NAV_ITEMS）
    ├── home.ts                  # 首页介绍数据
    └── layout-classes.ts        # 布局 class（照抄 lab-ai-sdk）
```

站点本身是「教程站点」，**不是**学员要照抄的项目。学员跟着每课在自己的 Mastra 项目里覆盖式演进（同一份 `src/mastra/**` 逐步叠加能力）。

## 学员项目的演进方式（覆盖式）

```text
第 1 课  pnpm create mastra@latest my-mastra-app   → src/mastra/index.ts、agents/agent.ts
第 2 课  覆盖 agents/*.ts（instructions、模型路由）
第 3 课  新增 tools/*.ts + 覆盖 agent
第 4~5 课 覆盖 agent 的 memory 配置
第 6 课  新增 app/api/chat/route.ts（chatRoute）+ 前端页面
第 7~9 课 新增 workflows/*.ts + 覆盖 agent/index
第 10 课 新增 knowledge/（入库脚本 + 检索工具）
第 11~12 课 新增 evals/、observability 配置
第 13~14 课 storage / auth / 部署
```

## 技术栈

- 站点：Next.js（App Router）+ Tailwind + shiki（与 lab-ai-sdk 一致）
- 课程主体：`@mastra/core`、`@mastra/ai-sdk`、`zod`、DeepSeek（`DEEPSEEK_API_KEY`，模型 `deepseek/deepseek-flash`）
- 本地存储：`file:./mastra.db`（libSQL），调试用 Mastra Studio（`localhost:4111`）

## 开发

```bash
pnpm install
pnpm dev          # 站点
```

## 待办

- [ ] 按 `docs/curriculum.md` 写各课内容（先第 1~3 课）
- [ ] 站点脚手架（照抄 lab-ai-sdk 的 components / layout-classes）
- [ ] 学员项目模板（每课「跟做」需要的最终代码）
- [ ] 每课右侧 `docLinks` 全部校验可访问（Mastra 文档路径会变）

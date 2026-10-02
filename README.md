# lab-mastra（Mastra 项目制课程）

Mastra 版的课程站点，站点结构、UI 与数据文件形状和 `lab-ai-sdk` 保持一致。

- `lab-ai-sdk`：AI SDK 的轻量面 + 前端（Core 的 `generateText` / `streamText` / `tool` / 结构化输出，UI 的消息流协议与 hooks）。
- `lab-mastra`（本项目）：同一个前端，后端换成 Mastra —— 覆盖 Agent / Workflow / Memory / RAG / Evals / Observability / 上线部署等重编排与工程化能力。

## 和 AI SDK 的关系

前端**不重学**。本课程的 Web UI 直接沿用 `lab-ai-sdk` 里已经做过的 `useChat` + `parts` 渲染 + `tool-*` / `data-*` part，只是后端从「自己写的 `app/api/generate/route.ts`」换成「Mastra 的 agent + `handleChatStream()`」（路由仍叫 `/api/generate`，所以页面一行不改）。

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
第 1 课  pnpm dlx create-next-app + pnpm dlx mastra@latest init
        → app/（前端，根目录）+ src/mastra/（agent、工具、index.ts）
第 2 课  新建 agents/support-agent.ts（虚拟宇宙公司客服：instructions + 模型 + 会话记忆）+ 注册进 index.ts
第 3 课  新增 data/products.ts（在售清单）、data/orders.ts（mock 订单）、tools/lookup-tool.ts、tools/return-tool.ts + 覆盖 agent
第 4 课  覆盖 agents/support-agent.ts（加工作记忆 customerProfile：跨对话记得这单办到哪）
第 5 课  覆盖 agents/support-agent.ts（semanticRecall + messageHistory 预算 + scope）；新增依赖 @ai-sdk/openai-compatible@^2（嵌入走硅基流动）
第 6 课  新增 app/api/generate/route.ts（handleChatStream）+ 复用 lab-ai-sdk 第 4 课的 app/page.tsx
第 7~9 课 新增 workflows/*.ts（售后流程 / 审批挂起 / 定时跟进）+ 覆盖 agent/index
第 10 课 新增 knowledge/（售后政策 P1–P5 入库 + 检索工具）
第 11~12 课 新增 evals/、observability 配置
第 13~14 课 storage / auth / 部署
```

## 技术栈

- 站点：Next.js（App Router）+ Tailwind + shiki（与 lab-ai-sdk 一致）
- 课程主体：Next.js（App Router，前端在**根 `app/`**）+ `@mastra/core`、`@mastra/ai-sdk`、`zod`、DeepSeek（`DEEPSEEK_API_KEY`，模型 `deepseek/deepseek-flash`）
- 第 6 课起：加 `@ai-sdk/react` + `ai` 以复用 lab-ai-sdk 的前端；**不装**官方 Next.js 指南推荐的 `ai-elements`
- 本地存储：`file:./mastra.db`（libSQL），调试用 Mastra Studio（`localhost:4111`）
- 业务场景（全课统一）：**虚拟宇宙公司官方客服** —— 卖武器、装备与药剂，货币用黑龙币；产品、SKU、政策 P1–P5、mock 数据、四类客户问题见 `docs/scenario.md`。数据一律 mock，**不接真实平台**

## 开发

```bash
pnpm install
pnpm dev          # 站点
```

## 待办

- [x] Studio 在 Next 一体化项目里可起：`pnpm exec mastra dev` → `http://localhost:4111`（2026-10-01 实测，官方 Next.js 指南未提 Studio）
- [x] **端点写法已定**（2026-10-01）：用官方 Next.js 指南的 `handleChatStream()` + `createUIMessageStreamResponse()`，路由放 `app/api/generate/route.ts`（与 lab-ai-sdk 页面里写死的地址一致）；AGENTS / README / 课表已统一
- [x] **第 5 课已实测**（2026-10-02）：Studio 里 `resource_id` 固定为 `support-agent`（跨对话召回成立）；向量落库在 `memory_messages_1024`（1024 维，对应 `BAAI/bge-large-zh-v1.5`）；每轮都会检索一次，跨对话命中会作为 system 消息注入
- [ ] **第 4 课待实测**：Studio 里工作记忆（`updateWorkingMemory`）是否总能写入
- [x] **第 5 课嵌入模型已定**（2026-10-02）：走**云**——硅基流动 `BAAI/bge-large-zh-v1.5`（1024 维，中文），依赖 `@ai-sdk/openai-compatible@^2`（**2.x，3.x 的规范 Mastra 不吃**）。本地 `@mastra/fastembed` 已弃用（默认英文模型 + 要能访问 HuggingFace）
- [ ] **第 6 课待实测**：`version: "v7"` 是否与安装的 `ai` 大版本一致；`chatId` 透传进 `handleChatStream` 的 `params` 是否被接受；`memory.deleteThread(threadId)`（签名已核对，未实跑）
- [x] **CLI 参数已核实**（2026-10-02 实跑 `create-next-app --help`）：**不存在** `--no-react-compiler` / `--no-import-alias`，只有正向的 `--react-compiler` 和 `--import-alias <prefix/*>`（默认 `@/*`）。第 1 课命令已改成显式 `--import-alias "@/*"`；第 6 课的 route 改用 `@/src/mastra` 别名导入，不再写 `../../../`
- [x] `mastra init` 的参数已录（2026-09-30 / 10-01，`mastra@1.31.4`）：**`--default` 是确定性路径**（硬编码 `components: [agents, tools, workflows]` + `addExample: true` + `src/` + OpenAI），实测生成 `weather-agent`；**只带 `--llm` 等部分参数则不会生成示例**；官方 `reference/cli/mastra` 的 `init` 一节无提问清单
- [ ] **待验证**：`pnpm exec mastra dev`（4111）与 `pnpm dev`（3000）在同一项目里并行运行
- [ ] **课里要说明**：`mastra init` 走**交互式**时会改写项目根 `AGENTS.md` / `CLAUDE.md` 并写入 `.agents/`、`skills-lock.json`（走 `--default` 则跳过）；API Key 留空时只写 `.env.example`、**不动 `.env`**；且**不往 `package.json` 加脚本**
- [ ] **可选/进阶（暂不做）**：在 Studio 里编辑提示词需要装 `@mastra/editor` + `index.ts` 加 `editor: new MastraEditor()`；注意改动**不回写源码**（代码里是默认值），保存是 **draft**、`Publish` 才生效，另有 `source: 'code'` 模式可写成 JSON 走 Git。主线不开，作为延伸阅读候选
- [ ] **第 3 课待实测**：无入参工具 `listProducts`（`inputSchema: z.object({})`）是否被当前版本正常调用
- [ ] 按 `docs/curriculum.md` 写各课内容（先第 1~3 课）
- [ ] 站点脚手架（照抄 lab-ai-sdk 的 components / layout-classes）
- [ ] 学员项目模板（每课「跟做」需要的最终代码）
- [ ] 每课右侧 `docLinks` 全部校验可访问（Mastra 文档路径会变）

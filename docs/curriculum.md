# 本课程课表（Mastra）

主线 **14 课** + 进阶 **5 课**。设计原则：一个学员项目覆盖式演进；前端沿用 lab-ai-sdk；每课有可验证的验收标准。

- 站点 UI / 结构 / 数据文件形状：与 `lab-ai-sdk` 一致
- 学员项目：`my-mastra-app`（Next 一体化：`npx create-next-app` + `npx --force mastra@latest init`），逐课叠加
- 模型：DeepSeek（`deepseek/deepseek-flash`）；存储：本地 libSQL（`file:./mastra.db`）
- 每课记录「验证时使用的 Mastra 版本」（Mastra 迭代快）

## 主线总览

| # | 课 | 核心能力（Mastra 侧） | 参考仓库对应阶段 | 前端 |
|---|---|---|---|---|
| 1 | 初始化 | Next 一体化脚手架 / Mastra 实例 / Studio / Model Router | 起步 | 前端项目就位（`app/`） |
| 2 | Agent 与模型 | Agent、instructions、Model Router、Fallback | 阶段 1（部分） | — |
| 3 | 工具与结构化输出 | `createTool`、Structured Output、RequestContext | 阶段 2 | — |
| 4 | 记忆（一）：会话与工作记忆 | Message History、Working Memory、Storage | 阶段 1 | — |
| 5 | 记忆（二）：语义召回与多用户 | Semantic Recall、Observational Memory、Processors、Multi-User Threads | **未覆盖（我们补）** | — |
| 6 | 接自己的前端 | `@mastra/ai-sdk` 的 `chatRoute()`、Server、Client | **未覆盖（我们补）** | 复用lab-ai-sdk 第 5 / 7 课 |
| 7 | 工作流（一）：把问答变成流程 | Workflow State、Control Flow、Agents & Tools | 阶段 3 | 复用第 6 课页面 |
| 8 | 工作流（二）：暂停恢复与人工审批 | Suspend & Resume、Human-in-the-Loop、Snapshots、Time Travel | 阶段 4 + 6 | 审批 UI |
| 9 | 工作流（三）：容错与定时 | Error Handling、Scheduled Workflows、Background Tasks、Schedules | 部分（模板有定时） | — |
| 10 | RAG：知识库与检索 | 向量存储、检索工具、chunking / rerank | 阶段 8 | `data-*` part 显示来源 |
| 11 | Evals：评测即回归 | Built-in / Custom Scorers、Datasets、Quick Checks、Gates、CI、Vitest | 阶段 5 | — |
| 12 | Observability：追踪与指标 | Traces、Logging、Metrics、Feedback、Studio | 阶段 5 | — |
| 13 | Guardrails 与 Processors | Guardrails、Processors（过滤 / 脱敏 / 注入防护） | **未覆盖（我们补）** | — |
| 14 | 上线：存储、鉴权、部署 | Storage、Auth（Simple/JWT/FGA）、Deploy（Server/Cloud/Workflow Runners）、Middleware | 阶段 9 | — |

> 「参考仓库」= `my19940202/mastra-agent`，分析见 `docs/reference-repo-notes.md`。

## 进阶（可选，按需开课）

| # | 课 | 能力 | 文档 |
|---|---|---|---|
| A1 | Subagents 与 Skills | 多 agent 分工、可复用技能包 | `/docs/subagents`、`/docs/skills` |
| A2 | 连接外部系统 | MCP、A2A、ACP、SDK Agents | `/docs/connections/mcp` 等 |
| A3 | 渠道接入 | Slack / Discord / Telegram / Teams / WhatsApp / GitHub | `/docs/channels` + integrations |
| A4 | Sandbox 与 Browser | 文件系统、检索、computer、LSP、浏览器 | `/docs/sandbox/*`、`/docs/browser` |
| A5 | 动态工作流与 Code Mode | Runtime 决定流程；让模型写代码调用工具 | `/docs/workflows/dynamic-workflows`、`/docs/agents/code-mode` |

---

## 逐课细节

### 第 1 课 · 初始化（guide 类型）

- **目标**：跑通 Next 一体化项目（前端 `app/` + Mastra `src/mastra/`），Studio 里能看到示例 agent
- **命令**（官方 Next.js 指南的写法）：
  - `pnpm dlx create-next-app@latest my-mastra-app --yes --ts --eslint --tailwind --app --turbopack --no-react-compiler --no-import-alias`（用**根 `app/`**，与 lab-ai-sdk 一致，第 6 课才能直接复用它的页面）
  - `cd my-mastra-app && pnpm dlx mastra@latest init`；实测交互项：创建位置（默认 `src/`）→ 默认模型提供商（**列表里没有 DeepSeek**）→ API Key（可留空）→ Enable Mastra Observability（选 `No`）→ 编码助手工具（按需）
  - `.env` 补 `DEEPSEEK_API_KEY`（`init` 写的是所选 provider 的 key，另加一行即可）
  - `pnpm exec mastra dev` → Studio `http://localhost:4111`；另开一个终端 `pnpm dev` → 应用 `http://localhost:3000`
- **知识点**：Mastra 实例、Studio、Model Router（`provider/model` 字符串）
- **验收**：Studio 打开并看到示例 agent；两个 dev 命令互不干扰
- **文档**：`/guides/getting-started/next-js`、`/docs/studio/overview`、`/models/providers/deepseek`
- **实测记录**（2026-09-30，`mastra@1.31.4`）：`init` 生成 `src/mastra/{index.ts, agents/weather-agent.ts, tools/weather-tool.ts, workflows/weather-workflow.ts}`；写入依赖 `@mastra/core`、`@mastra/libsql`、`@mastra/memory`、`@mastra/duckdb`、`@mastra/observability`、`@mastra/loggers`、`mastra`、`zod`；**不往 `package.json` 加脚本**（所以 Studio 用 `pnpm exec mastra dev`）；**会改写项目根的 `AGENTS.md` / `CLAUDE.md`，并写入 `.agents/` + `skills-lock.json`**；结尾的 `PostHogFetchNetworkError` 只是遥测上报失败，不影响初始化（可用 `MASTRA_TELEMETRY_DISABLED=1` 消除）
- **待验证**：`pnpm exec mastra dev` 与 `pnpm dev` 在同一项目里并行运行；`create-next-app` 的 `--no-react-compiler` / `--no-import-alias` 写法（未出现在 `--help` 里）

### 第 2 课 · Agent 与模型

- **目标**：定义自己的 agent（`id` / `name` / `instructions` / `model`），换模型与 fallback
- **能力**：Agent、instructions、Model Router、Providers / Gateways
- **验收**：Studio 里出现自己的 agent，回答符合 instructions（例如固定用中文、限制话题）
- **文档**：`/docs/agents`、`/docs/models`、`/models/providers/deepseek`

### 第 3 课 · 工具与结构化输出

- **目标**：`createTool({ id, description, inputSchema, execute })`；让 agent 在需要时调用；用 structured output 拿结构化结果
- **原则（借参考仓库阶段 2）**：**能用代码判断的业务规则，别写在 instructions 里** —— 放进工具的确定性函数，并为它写**不依赖模型**的单元测试
- **注意**：`execute(input, context)` 两个参数；裸对象工具不生效
- **验收**：问一句会触发工具；Studio 里能看到工具入参 / 返回值；`pnpm test` 里工具有确定性测试通过
- **文档**：`/docs/agents/tools`、`/docs/agents/structured-output`、`/docs/server/request-context`

### 第 4 课 · 记忆（一）：会话与工作记忆

- **目标**：配 memory（message history + working memory + schema），跨轮记住结构化信息；新 thread 不继承
- **原则（借参考仓库阶段 1）**：用 Zod 定义结构化记忆；**不同性质的信息用独立 schema**（事实 / 状态 / 授权 / 联系方式分开存，第 13 课展开）
- **验收**：连续几轮对话后，agent 能引用前文；新建 thread 后不记得旧内容
- **文档**：`/docs/memory/message-history`、`/docs/memory/working-memory`、`/docs/storage`

### 第 5 课 · 记忆（二）：语义召回与多用户

- **目标**：semantic recall（跨会话召回）、observational memory、memory processors（裁剪/压缩）、多用户线程隔离
- **验收**：新会话里能提到很久以前的结论；两个用户的消息互不串
- **文档**：`/docs/memory/semantic-recall`、`/docs/memory/observational-memory`、`/docs/memory/memory-processors`、`/docs/memory/multi-user-threads`

### 第 6 课 · 接自己的前端（AI SDK UI）

- **目标**：把**lab-ai-sdk 的前端页面**接上（页面粘过来即用）；前端一行不改
- **依赖**：首次装 `@mastra/ai-sdk` + `@ai-sdk/react` + `ai`；**不装**官方 Next.js 指南推荐的 `ai-elements`
- **能力**：`@mastra/ai-sdk`（`chatRoute` / `handleChatStream` / `toAISdkStream`）、Server、Mastra Client
- **端点写法（待定）**：官方 Next.js 指南用 `handleChatStream()` + `createUIMessageStreamResponse()`；reference 里另有 `chatRoute()`。二者选一后在课里统一（会影响 AGENTS / README 的措辞）
- **前端复用**：lab-ai-sdk 第 5 课（工具 → 卡片）、第 7 课（`data-*` 来源卡片）；页面放**根 `app/`**
- **验收**：网页上能聊天，工具调用渲染成卡片，刷新后历史还在
- **文档**：`/integrations/agentic-ui/ai-sdk-ui`、`/reference/ai-sdk/chat-route`、`/docs/server/mastra-client`

### 第 7 课 · 工作流（一）：把问答变成流程

- **目标**：`createWorkflow` 把「分类 → 检索 → 生成」串成固定步骤；在 workflow 里调 agent / 工具
- **能力**：Workflow State、Control Flow（分支）、Agents and Tools
- **验收**：一次请求按步骤跑完，Studio 里能看到每步的输入输出
- **文档**：`/docs/workflows/workflow-state`、`/docs/workflows/control-flow`、`/docs/workflows/agents-and-tools`

### 第 8 课 · 工作流（二）：暂停恢复与人工审批

- **目标**：流程跑到「等人工确认」时暂停；重启进程后从断点继续；能回看/重放快照
- **能力**：Suspend & Resume、Human-in-the-Loop、Snapshots、Time Travel
- **落实到具体 API（借参考仓库阶段 4 / 6）**：用内置 `ask_user` 挂起交互（它只负责"暂停 + 展示控件 + 返回答案"，**不负责业务判断、不直接写记忆**）；开启 `autoResumeSuspendedTools` 让被挂起的 run 能续；控件类型（`text` / `single_select` / `multi_select`）由**确定性字段映射**决定，未配置的字段默认文本框，避免模型临时编造选项；workflow 内部不等待自然语言答案，只产出稳定的 `responsePlan`
- **验收**：杀掉进程再启动，流程仍能续跑；快照可回放；同一个挂起点在不同答案下走不同分支
- **文档**：`/docs/workflows/suspend-and-resume`、`/docs/workflows/human-in-the-loop`、`/docs/workflows/snapshots`、`/docs/workflows/time-travel`

### 第 9 课 · 工作流（三）：容错与定时

- **目标**：步骤失败可重试 / 回滚；定时自动跑（日报、巡检）
- **能力**：Error Handling、Scheduled Workflows、Harness（Background Tasks / Schedules）
- **验收**：故意让某步失败，能看到重试与最终状态；到点自动触发一次
- **文档**：`/docs/workflows/error-handling`、`/docs/workflows/scheduled-workflows`、`/docs/harness/background-tasks`、`/docs/harness/schedules`

### 第 10 课 · RAG：知识库与检索

- **目标**：文档入库（chunk + embed + 存向量库）→ 检索工具 → agent 作答时引用来源
- **验收**：问知识库里的事实，回答带出处；问库里没有的，明确说不知道
- **文档**：官方 RAG / 向量存储相关页（写课时确认路径）+ `/docs/storage`

### 第 11 课 · Evals：评测即回归

- **目标**：定义评测集与 scorer，在 CI 里跑；分数低于阈值时门禁失败
- **能力**：Built-in Scorers、Custom Scorers、Datasets、Quick Checks、Gates and Verdicts、Running in CI、Vitest
- **做法（借参考仓库阶段 5）**：先写**不调用 judge 模型**的确定性 scorer（例如"一轮里只能问一个问题"、"必须带免责声明"），省钱且可回归；固定案例集放进 `src/mastra/evals/` 版本控制，之后可迁到 Studio Dataset；讲清三者分工 —— **Dataset 出题、Scorer 打分、Trace 定位是哪一步掉了分**
- **验收**：`pnpm test` 能跑评测；改坏提示词后评测失败
- **文档**：`/docs/evals/built-in-scorers`、`/docs/evals/custom-scorers`、`/docs/evals/datasets`、`/docs/evals/gates-and-verdicts`、`/docs/evals/running-in-ci`

### 第 12 课 · Observability：追踪与指标

- **目标**：一次会话能看到完整 trace（步骤、工具调用、token、耗时、错误），并接入日志与指标
- **能力**：Traces（Usage / Logging / Feedback / Storage）、Metrics、Studio Observability
- **立论（借参考仓库阶段 6）**：**排查靠 Trace，不靠模型自述** —— 模型的 `reasoning` 不是业务输出，可以设为 `none`；要看"为什么答错"就去看工具入参出参、workflow 走哪个分支、Working Memory 当时是什么
- **验收**：Studio 里能定位"这一步为什么慢 / 为什么答错"
- **文档**：`/docs/observability/tracing/overview`、`/docs/observability/logging`、`/docs/observability/metrics/overview`、`/docs/observability/feedback`、`/docs/studio/observability`

### 第 13 课 · Guardrails 与 Processors

- **目标**：输入侧拦注入 / 输出侧脱敏；对不合规内容返回兜底话术
- **能力**：Guardrails、Processors
- **与业务字段的关系（借参考仓库阶段 6）**：事实、授权、联系方式**分开保存**；授权记录必须同时具备 `granted` + 用途版本 + 完整范围 + 用户原话，只有一个布尔不算授权；用户拒绝或撤回后必须强制关闭后续采集
- **验收**：构造越狱输入被拦；输出里的敏感信息被脱敏；撤回授权后不再采集联系方式
- **文档**：`/docs/agents/guardrails`、`/docs/agents/processors`

### 第 14 课 · 上线：存储、鉴权、部署

- **目标**：换生产存储、加鉴权、部署到云；重启后 workflow 能续跑
- **能力**：Storage、Auth（Simple / JWT / FGA）、Deploy（Mastra Server / Cloud Providers / Workflow Runners / Workers / Web Framework）、Server Middleware
- **上线清单（借参考仓库阶段 9）**：鉴权与权限、敏感字段加密 + 日志脱敏、数据访问审计与保存期限 / 删除机制、用户撤回授权、Prompt 注入防护、限流与异常兜底、部署后的监控告警
- **验收**：公网访问需鉴权；服务重启后未完成的流程继续跑完；日志里看不到敏感字段
- **文档**：`/docs/storage`、`/docs/auth/simple-auth`、`/docs/auth/jwt`、`/docs/auth/fga`、`/docs/deployment/mastra-server`、`/docs/deployment/cloud-providers`、`/docs/deployment/workflow-runners`、`/docs/server/middleware`

---

## 推进优先级

- **第 1–9 课 = "能用"的主线**：能聊 → 能记 → 能编排 → 能审批 → 能容错定时。
- **第 10 课（RAG）不是前置**：它提升回答质量，采集/流程跑通后再做更划算（借参考仓库的排序结论）。
- **第 11–12 课（评测与观测）建议早做**：在"改提示词 / 换模型"之前就要有，否则每次调整都是盲改、无法判断有没有退化。
- **第 13–14 课（安全与上线）是接触真实用户的前置**：要收真实数据、真实联系方式前必须补。

## 写课风格（借参考仓库）

1. 每课开头**一句话点题**：「这一课学的是：……」
2. 每课固定有**怎样测试**：在 Studio 里点哪里 + 命令怎么跑 + 期望结果
3. **概念与实操分开**：`docs/` 放概念、课表与矩阵；站点每课页放跟做步骤、知识点、代码
4. 每课都要有**可独立验收**的产出，做到一半停下来也是能跑的（避免"必须写完 14 课才有东西"）

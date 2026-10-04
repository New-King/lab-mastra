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
| 2 | Agent 与模型 | Agent、instructions、会话记忆（Message History）、Model Router | 阶段 1（部分） | 定下全课场景：虚拟宇宙公司客服 |
| 3 | 工具调用 | `createTool`、RequestContext | 阶段 2 | — |
| 4 | 工作记忆 | Working Memory、Storage | 阶段 1 | 会话记忆第 2 课已有 |
| 5 | 语义召回 | Semantic Recall、Message History（token 预算）、Multi-User Threads | **未覆盖（我们补）** | — |
| 6 | 接入前端：用 AI SDK UI 聊天 | `@mastra/ai-sdk` 的 `handleChatStream()` / `toAISdkMessages()`、Server、Client | **未覆盖（我们补）** | 页面自己写：正文 + 思考 + 工具调用都渲染 |
| 7 | 工作流（一）：把问答变成流程 | Workflow State、Control Flow、Agents & Tools | 阶段 3 | 复用第 6 课页面 |
| 8 | 工作流（二）：暂停恢复与人工审批 | Suspend & Resume、Human-in-the-Loop、Snapshots、Time Travel | 阶段 4 + 6 | 审批 UI |
| 9 | 工作流（三）：容错与定时 | Error Handling、Scheduled Workflows、Background Tasks、Schedules | 部分（模板有定时） | — |
| 10 | RAG：知识库与检索 | 向量存储、检索工具、chunking / rerank | 阶段 8 | `data-*` part 显示来源 |
| 11 | 评测：把回归测试跑起来 | Built-in / Custom Scorers、Datasets、Quick Checks、Gates、CI、Vitest | 阶段 5 | — |
| 12 | 观测：用 trace 定位问题 | Traces、Logging、Metrics、Feedback、Studio | 阶段 5 | — |
| 13 | 护栏：在进模型前后各拦一道 | Guardrails、Processors（过滤 / 脱敏 / 注入防护） | **未覆盖（我们补）** | — |
| 14 | 上线：存储、鉴权与部署 | Storage、Auth（Simple/JWT/FGA）、Deploy（Server/Cloud/Workflow Runners）、Middleware | 阶段 9 | — |

> 「参考仓库」= `my19940202/mastra-agent`，分析见 `docs/reference-repo-notes.md`。

## 排列思路（与参考仓库的差异）

整条主线是**能力递进链**：先把判断做准（Agent → 工具 → 工作流），再解决多轮接得住（状态 / 暂停恢复 / 容错定时），最后才接真实用户（RAG → 评测 → 观测 → 安全 → 上线）。

和参考仓库「阶段 1–9」的三点结构性差异：

| | 参考仓库 | 本课程 |
|---|---|---|
| 切法 | 按**业务里程碑**切（采集 → 充分度 → 路由 → 恢复 → 授权 → 交接） | 按**能力单元**切：记忆拆 4/5、工作流拆 7/8/9、评测与观测拆 11/12 —— 一课一能力，每课可独立验收、能中途停 |
| 前端 | 全程 Studio 验证 | **第 6 课先打通「自己的前端」**，也是「同一个前端换后端」的证明点 |
| 补齐 | 语义召回 / 多用户、定时与后台任务、Evals 进 CI、Guardrails、Auth 与部署、多 provider 均未覆盖 | 依次落在第 5 / 9 / 11 / 13 / 14 / 2 课（全表见 `coverage-matrix.md`） |

它的**深水区主动降级**：法律域的「问题树 + 授权硬约束」只作为范例（第 4、8 课），业务换成中性场景，方便学员替换成自己的领域。

**MCP / Skills 不插主线**：MCP（接外部工具）和 Skills（指令资产化）都是外延能力，不是构建 agent 应用的必经路径；插进主线会打断「能力递进」叙事、并让后面课号整体后移。放在 `## 进阶`（MCP = A2，Skills = A1），主线的工具课（第 3 课）之后如需接入，走进阶课。

**一处待定的顺序差异**：参考仓库把**评测放在业务扩展之前**（阶段 5 的理由是"在收集真实线索前，证明 Agent 足够稳定"），而本课程把 RAG（第 10 课）排在 Evals（11）/ Observability（12）之前。两种取舍：

- 保持现状：先把能力铺完、再做工程保障 —— 需要在第 10 课开头说明为什么先 RAG 后评测；
- 调整顺序：把 11 / 12 提前到第 9 课之后 —— 更贴合「先稳定、再扩展」。

## 进阶（可选，按需开课）

| # | 课 | 能力 | 文档 |
|---|---|---|---|
| A1 | Subagents 与 Skills | 多 agent 分工、可复用技能包 | `/docs/subagents`、`/docs/skills` |
| A2 | **接入外部工具（MCP）** | `MCPClient` / `MCPServer`、静态与运行时工具、工具审批与安全；另含 A2A / ACP / SDK Agents | `/docs/connections/mcp`、`/reference/tools/mcp-client`、`/reference/tools/mcp-server` |
| A3 | 渠道接入 | Slack / Discord / Telegram / Teams / WhatsApp / GitHub | `/docs/channels` + integrations |
| A4 | Sandbox 与 Browser | 文件系统、检索、computer、LSP、浏览器 | `/docs/sandbox/*`、`/docs/browser` |
| A5 | 动态工作流与 Code Mode | Runtime 决定流程；让模型写代码调用工具 | `/docs/workflows/dynamic-workflows`、`/docs/agents/code-mode` |

---

## 逐课细节

### 第 1 课 · 初始化（guide 类型）

- **目标**：跑通 Next 一体化项目（前端 `app/` + Mastra `src/mastra/`），Studio 里能看到示例 agent
- **命令**（官方 Next.js 指南的写法）：
  - `pnpm dlx create-next-app@latest my-mastra-app --yes --ts --eslint --tailwind --app --turbopack --import-alias "@/*"`（用**根 `app/`**，第 6 课的 route 与页面都放这里，别名 `@/*` 才能直接指到 `src/mastra`）
  - `cd my-mastra-app && pnpm dlx mastra@latest init --default --no-observability`（`--default` = 位置 `src/` + 提供商 OpenAI + 示例代码；**不要让 agent 走交互提问——它没有 TTY，会卡住**；也不要只带 `--llm` 这类部分参数，不带 `-c` 时不会生成示例）
  - `.env`：API Key 留空时 `init` 只生成 `.env.example` → `cp .env.example .env`，再把变量名改成 `DEEPSEEK_API_KEY`
  - `pnpm exec mastra dev` → Studio `http://localhost:4111`；另开一个终端 `pnpm dev` → 应用 `http://localhost:3000`
  - 把示例 agent 的模型换成 DeepSeek：`src/mastra/agents/weather-agent.ts` 里 `model: "deepseek/deepseek-flash"`（脚手架默认写的是 OpenAI，学员没有那个 key，不换则点它就报错）
- **知识点**：Mastra 实例、Studio、Model Router（`provider/model` 字符串）
- **验收**：Studio 的 Agents 页（`http://localhost:4111/agents`）里看到示例 agent，问它天气能答；两个 dev 命令互不干扰
- **文档**：`/guides/getting-started/next-js`、`/docs/studio/overview`、`/models/providers/deepseek`
- **实测记录**（2026-09-30 / 10-01，`mastra@1.31.4`）：
  - `init` 生成 `src/mastra/{index.ts, agents/weather-agent.ts, tools/weather-tool.ts, workflows/weather-workflow.ts}`；写入依赖 `@mastra/core`、`@mastra/libsql`、`@mastra/memory`、`@mastra/duckdb`、`@mastra/observability`、`@mastra/loggers`、`mastra`、`zod`
  - `--default` 是**确定性路径**（硬编码 `components: [agents, tools, workflows]` + `addExample: true` + `src/` + OpenAI），实测产出 `weather-agent`；只带 `--llm` 等部分参数则**不会**生成示例
  - **不往 `package.json` 加脚本**（所以 Studio 用 `pnpm exec mastra dev`）；API Key 留空时只写 `.env.example`，**不动 `.env`**；**不重新 `git init`**
  - 走交互式时：**会改写项目根的 `AGENTS.md` / `CLAUDE.md`，并写入 `.agents/` + `skills-lock.json`**（走 `--default` 则跳过这两项）
  - 结尾的 `PostHogFetchNetworkError` 只是遥测上报失败，不影响初始化（可用 `MASTRA_TELEMETRY_DISABLED=1` 消除）
- **已核实（2026-10-02，跑 `create-next-app --help`）**：不存在 `--no-react-compiler` / `--no-import-alias`，命令改用显式 `--import-alias "@/*"`；第 6 课 route 用 `@/src/mastra` 别名导入
- **待验证**：`pnpm exec mastra dev` 与 `pnpm dev` 在同一项目里并行运行

### 第 2 课 · Agent 与模型

- **目标**：定义自己的 agent（`id` / `name` / `instructions` / `model`），换模型与 fallback
- **能力**：Agent、instructions、会话记忆（`Memory` + `lastMessages`）、Model Router、Providers / Gateways
- **会话记忆在这里就配**：`memory: new Memory({ options: { lastMessages: 20 } })` —— 不配的话每轮只看到最新一条消息，多轮对话接不上（Studio 只发新消息，历史由服务端 memory 提供）
- **场景（全课统一）**：agent = **虚拟宇宙公司官方客服**（`id: "support-agent"`，文件 `src/mastra/agents/support-agent.ts`），卖武器、装备与药剂，货币用**黑龙币**；事实底本见 `docs/scenario.md`。选它的理由：客服天然有**规则可算**（退换窗口 / 修复）、**政策可查**（P1–P5）、**审批有后果**（补偿上限）、**数据敏感**（通讯号 / 收货坐标）、**多客户要隔离** —— 第 7/8/9/10/11/13/14 课全都有硬落点
- **注意**：注册 agent 是往 `src/mastra/index.ts` **加两处**（顶部 `import` + `new Mastra({ agents })` 里加一项），**不要整体覆盖** —— scaffold 生成的文件里有 `storage` / `logger` / `observability`，覆盖就丢
- **验收**：打开 `http://localhost:4111/agents`，跟 `support-agent` 对话；问「我的刀坏了」它直接对上 S 级飞刀并给出处置；问「我的机甲坏了」它直接说明不在售后范围（说明 instructions 生效）
- **不做命令行脚本**：裸 `node` 跑 `src/mastra/index.ts` 不可行（无扩展名导入 + top-level await，`node` / `tsx` 都撞墙）；要用 HTTP 验证就等第 6 课的 `app/api/generate/route.ts`
- **文档**：`/docs/agents`、`/docs/models`、`/models/providers/deepseek`

### 第 3 课 · 工具调用

- **目标**：`createTool({ id, description, inputSchema, outputSchema, execute })`；写一个**自己的**工具并挂到 agent
- **原则（借参考仓库阶段 2）**：**能用代码判断的业务规则，别写在 instructions 里** —— 放进工具的确定性函数，并为它写**不依赖模型**的单元测试
- **不问问题类型**：客户只给订单号时，按质量问题判，并在结论后补一句「若未拆封也可按 P1 退货」—— 拆封状态只有客户知道，反问会打断流程，默认 + 补充更顺
- **三个工具、三种动作**：`listProducts()` 查清单（对上商品 / 答政策类问题 / 判断不在售）；`findOrders({ sku? })` 查订单 —— **不让客户背订单号**，对得上商品直接查、直接判；`checkReturnEligibility({ orderId, issue })` 判具体订单 —— 按 P1 / P2 / P3 判定 `refund` / `exchange` / `repair` / `reject` / `pending`。选它的理由：**模型只负责把客户的话归成 `issue`，天数与条款由代码算** —— 这正是「能用代码判断的业务规则别写在 instructions 里」；而且它读的 `orderId` 又是第 4 课工作记忆的字段，两课接成一条链
- **mock 数据**：`src/mastra/data/products.ts`（在售清单，含 `repairable` 与 `rule` 规则摘要）+ `src/mastra/data/orders.ts`（7 条订单，覆盖可退 / 可换 / 修复 / 超保修 / 未签收 / 耗材可退 / 耗材不可修复全部分支）。**时间用「签收距今天数」，不用绝对日期** —— 否则 7 天 / 15 天窗口过几天就失效，课程不可复现；真实项目里换成订单库或平台接口，本课不接任何真实平台
- **不碰脚手架自带的 `tools/weather-tool.ts`**：它是官方示例（真调 open-meteo），课里保持原样
- **注意**：`execute(input, context)` 两个参数；裸对象工具不生效；无入参工具（`listProducts`）的 `inputSchema` 用 `z.object({})`
- **待验证**：`z.object({})` 这种空 schema 的工具调用是否被当前版本接受（未实跑）
- **验收**：`http://localhost:4111/agents` 里问 `support-agent`「NX-1001 的金丝断裂，能换新吗？」→ 它调用 `checkReturnEligibility` 给出 `exchange` 与理由（P2）；Trace 里能看到入参 / 返回值
- **工具分支要覆盖全**：耗材不换新（P5）、未拆封超 7 天不可退（P6）都要在工具里实现，不能只写在文档里
- **不讲 `structuredOutput`**：目前**没有可跑的载体**（Studio 不支持传 schema；脚本方式在现脚手架下跑不通），已从第 3 课移除；`coverage-matrix.md` 标记为「暂不进主线」，等有 route / HTTP 载体再定
- **文档**：`/docs/agents/tools`、`/docs/agents`、`/docs/server/request-context`

### 第 4 课 · 工作记忆

- **目标**：给 agent 加**长期记忆**：`options.workingMemory`（`enabled` + `schema`）把这次售后跨对话记住（商品 / 订单号 / 问题 / 已答复方案）（会话记忆第 2 课已随 agent 一起配置）
- **依据（2026-10-01 核对 `@mastra/memory@1.33.0` 随包类型）**：`MemoryConfig` 的字段都在 `options` 下（不是扁平的）；`semanticRecall` **默认 `false`**；`workingMemory` 的 `schema` 是**合并语义**（只提交要改的字段，设 `null` 即删除）；`template` 与 `schema` 二选一
- **只改一个文件**：`src/mastra/agents/support-agent.ts` —— 加 `workingMemory` + 字段（会话记忆第 2 课已有，这里只补长期记忆）
- **存储不用动**：实例级 `storage` 由脚手架在 `src/mastra/index.ts` 配好（`MastraCompositeStore` + `LibSQLStore`）
- **字段（`customerProfile`）**：`sku` / `orderId` / `issue` / `promise` —— 全部指向「客服干活必需的信息」
- **设计要点**：字段必须是**角色的产物**（角色 → 任务 → 必须知道什么 → schema），否则只是硬记。`orderId` 同时是第 3 课 `checkReturnEligibility` 的入参，`promise`（已答复的方案）保证客服不改口 —— 「记下来」换来的是「不用再问」和「前后一致」；写入靠提示词那行「客户报的商品、订单号、问题和已答复的方案，用 updateWorkingMemory 记下来」
- **原则（借参考仓库阶段 1）**：用 Zod 定义结构化记忆；**不同性质的信息用独立 schema**（事实 / 状态 / 授权 / 联系方式分开存，第 13 课展开）
- **验收**：先聊「NX-1002 这台的金丝断裂，能换新吗」→ 新建对话问「我上次那件事怎么样了」→ 它答得出订单号 / 商品 / 已答复方案（工作记忆按 `resource` 范围跨对话生效；客户已由提示词固定为罗峰先生，不是靠记忆认人）
- **待验证**：Studio 里工作记忆是否总能写入（依赖 agent 主动调 `updateWorkingMemory`）；Studio 新建对话时 `resourceId` 是否保持不变
- **文档**：`/docs/memory/working-memory`、`/docs/memory/overview`、`/docs/storage`

### 第 5 课 · 语义召回

- **目标**：开 `semanticRecall`（需 `vector` + `embedder`）、用 `messageHistory.maxTokens` 按 token 预算裁剪、用 `scope`（`thread` / `resource`）决定跨不跨对话
- **依赖（2026-10-02 实测跑通）**：`pnpm add @ai-sdk/openai-compatible@^2` —— 嵌入模型走**云**（硅基流动，OpenAI 兼容端点 `https://api.siliconflow.cn/v1`，模型 `BAAI/bge-large-zh-v1.5`，1024 维）。**必须装 2.x**：3.x 面向更新的 AI SDK 规范（provider spec v4），Mastra 只认到 v3
- **弃用路径**：本地 `@mastra/fastembed` —— 实测其默认模型是**英文**的（`bge-small-en-v1.5`），且首次要能访问 HuggingFace 下权重（国内网络会报「Failed to determine the embedder's output dimension」）；包也没导出中文小模型的入口
- **依据**：官方 `docs/memory/semantic-recall`（`storage` 与 `vector` 分开传，省略时默认 LibSQL；官方示例本身就是接云嵌入 `ModelRouterEmbeddingModel("openai/text-embedding-3-small")`）；官方 `docs/memory/message-history` 原文「Setting `messageHistory` without `lastMessages` disables the default 10-message cap. Set both to combine a count cap with a token budget.」
- **只改一个文件**：`src/mastra/agents/support-agent.ts`
- **本课不讲**：Observational Memory（长会话压缩，需要 LibSQL / PG / MongoDB，先用 `messageHistory` 的 token 预算解决）；Memory Processors（手动处理器与通用 Processors 一起放第 13 课）
- **验收**：先聊「NX-1002 这台的金丝断裂」→ 新建对话问「我上次说的那台金丝网什么问题？」→ 它召回那句话，接着问「能换新吗」它会调工具；Trace 里能看到带进上下文的消息
- **实测结论（2026-10-02，Studio + 查库）**：
  - 向量确实落库：表名 `memory_messages_1024`（**1024 就是嵌入模型的输出维度**），每条 `embedding` = 4096 字节 = 1024 个 float
  - Studio 里 `resource_id` 固定为 `support-agent`（Studio 用 agent id 当 resource）→ 跨对话召回成立，原「待验证」结案
  - **每轮都会检索一次**（发「你好」也一样）；跨对话命中的旧消息会作为 system 消息注入上下文，所以模型可能主动提起上次的事
- **课里要讲的可调项**：`topK`（召回几条）、`messageRange`（每条命中前后各带几条）、`scope`（`resource` 跨对话 / `thread` 单条对话）；不想让它主动翻旧账 → 提示词里约束或调小 `topK`
- **文档**：`/docs/memory/semantic-recall`、`/docs/memory/multi-user-threads`、`/reference/memory/memory-class`、`/reference/vectors/libsql`

### 第 6 课 · 接入前端：用 AI SDK UI 聊天

- **目标**：给 agent 配一个能交付的网页聊天界面 —— 后端 `app/api/generate/route.ts` 用 Mastra 的 `handleChatStream()`，前端页面自己写（不是直接抄 lab-ai-sdk 的那份：我们要把流里的正文、思考、工具调用都渲染出来）
- **端点写法（已定，2026-10-01）**：用官方 Next.js 指南的 `handleChatStream()` + `createUIMessageStreamResponse()`（**不用** `chatRoute()`）；路由放在 **`app/api/generate/route.ts`**（沿用 lab-ai-sdk 的路径习惯）
- **依赖**：`pnpm add @mastra/ai-sdk@latest @ai-sdk/react ai react-markdown remark-gfm`；**不装**官方指南推荐的 `ai-elements`
- **渲染（自己写的那部分）**：遍历 `message.parts` 分三类渲染 —— `text` 走 markdown（表格靠 `remark-gfm`）、`reasoning` 做成可折叠块、`tool-xxx` 做成工具卡（展开看入参 / 结果）。part 类型随 AI SDK 大版本变化，写之前先看 `ai` 的 `UIMessagePart` 定义
- **要实现三个方法**：`POST`（流式回复）／`GET`（`memory.recall` + `toAISdkMessages` 返回页面要的 `{ messages }`）／`DELETE`（`memory.deleteThread(chatId)` 支撑页面的「清空」按钮）
- **agentId**：`support-agent`；`memory.thread` 用页面带来的 `chatId`，`memory.resource` 固定成一个客户 id（多客户时换成真实客户 id，就是记忆的隔离边界）
- **官方坑（可选，不影响网页）**：Studio 与 `next dev` 并行时，`src/mastra/index.ts` 里 storage 的 `url` 用相对路径会各建一个 `mastra.db`（相对路径按各进程工作目录解析）—— 后果只是「Studio 里看不到网页那条对话」。想让 Studio 看到同一批数据：`url` 写绝对路径，或放进 `.env`（`TURSO_DATABASE_URL=file:/你的路径/mastra.db`），重启两个进程
- **验收**：`localhost:3000` 上能聊、流式输出、工具照常调用、刷新后历史还在；流式过程中能看到思考块、工具卡（入参 / 结果）与 markdown 表格
- **`sendReasoning`**：`handleChatStream` 默认 false（思考不进流），课里的 route 传了 `true`
- **待验证**：`version: "v7"` 要与安装的 `ai` 大版本一致（官方指南写 v7）；`chatId` 透传进 `handleChatStream` 的 `params` 是否被接受；`memory.deleteThread` 签名已按 `@mastra/core/dist/memory/memory.d.ts`（`abstract deleteThread(threadId: string)`）核对，未实跑
- **文档**：`/guides/getting-started/next-js`、`/integrations/agentic-ui/ai-sdk-ui`、`/reference/memory/recall`、AI SDK 的 `useChat`

### 第 7 课 · 工作流（一）：把问答变成流程

- **目标**：`createWorkflow` 把一次售后处理串成固定步骤 —— **意图分类 → 查订单 → 判定 → 回复**；三类意图都走通（退货判退 / 换 / 修、物流回运输状态、咨询直接答）；分类同时抽出问题类型（unopened / quality），退货据此走 P1 或 P2 / P3
- **能力**：Workflow State、Control Flow（`.then()` 顺序）、Agents and Tools
- **依赖**：无新增（工作流在 `@mastra/core/workflows` 里）
- **新增/改动文件**：覆盖 `src/mastra/tools/lookup-tool.ts` + `return-tool.ts`（把业务逻辑抽成 `queryOrders` / `judgeReturn`）、新建 `src/mastra/agents/classifier-agent.ts` + `reply-agent.ts`（各管一件事、都不挂 tools）、新建 `src/mastra/workflows/after-sales.ts`、`src/mastra/index.ts`（注册两个 agent 与工作流）
- **依据（2026-10-02 核对随包文档 + 脚手架样例 `weather-workflow.ts`）**：`createStep({ id, description, inputSchema, outputSchema, stateSchema, execute: async ({ inputData, state, setState, mastra, requestContext }) })`；`createWorkflow({ id, inputSchema, outputSchema, stateSchema }).then(a).branch([[cond, step]]).parallel([...]).commit()`；步骤里调 agent 用 `mastra.getAgent("support-agent")`，调工具用 `findOrders.execute(input, { requestContext })`；代码里取结构化结果用 `agent.generate(prompt, { structuredOutput: { schema } })` → `res.object`
- **验收**：一次请求按步骤跑完，Studio 里能看到每步的输入输出
- **待验证**：Studio 的 Workflows 页里输入 `{ message }` 跑一次；`findOrders.execute` 在步骤内的 `requestContext` 透传是否正常
- **文档（已核实 200）**：`/docs/workflows/overview`、`/docs/workflows/workflow-state`、`/docs/workflows/control-flow`、`/docs/workflows/agents-and-tools`

### 第 8 课 · 工作流（二）：暂停恢复与人工审批

- **与场景的挂钩**：审批条件按政策 **P4**（客服可自主补偿 ≤ 50 黑龙币，超出需主管）判定，所以退款类判定一定挂起 —— 审批有真实的金钱后果

- **目标**：流程跑到「等人工确认」时暂停；重启进程后从断点继续；能回看/重放快照
- **能力**：Suspend & Resume、Human-in-the-Loop、Snapshots、Time Travel、Control Flow（`.branch()` 条件分支）
- **依据（2026-10-02 核对随包文档）**：步骤里加 `suspendSchema` / `resumeSchema`，执行时 `return await suspend({ ... })` 挂起；恢复用 `run.resume({ step, resumeData })`，只传 `resumeData` 时恢复最近一个挂起点；拿 `workflow.createRun({ runId })` 可以把某次运行取回来再 resume（所以恢复可以放在 HTTP 路由 / 审批后台里）。状态（`state`/`setState`）跨 suspend/resume 保留
- **另一种做法（参考仓库阶段 4/6，本课不采用）**：用内置 `ask_user` 挂起 + `autoResumeSuspendedTools` 自动续跑，把控件类型（`text` / `single_select`）做成确定性字段映射 —— 适合"要给客户展示选项"的场景；我们这里审批人是我们自己的后台，直接 `resume` 更简单
- **改动文件**：只重写 `src/mastra/workflows/after-sales.ts` —— 判资格顺带标出 `needsApproval`；判资格与回复之间用 `.branch` 分两路：审批（内部 `suspend`，用 `orders` 取订单金额）/ 直接放行；`src/mastra/index.ts` 不用动
- **验收**：杀掉进程再启动，流程仍能续跑；快照可回放；同一个挂起点在不同答案下走不同分支
- **待验证**：Studio 的 Workflows 页里挂起后能不能直接点恢复（界面行为未实测）；`createRun({ runId })` 跨进程恢复（runId 从库里取）是否正常
- **文档（已核实 200）**：`/docs/workflows/suspend-and-resume`、`/docs/workflows/human-in-the-loop`、`/docs/workflows/snapshots`、`/docs/workflows/time-travel`

### 第 9 课 · 工作流（三）：容错与定时

- **目标**：步骤失败可重试 / 回滚；定时自动跑（日报、巡检）
- **能力**：Error Handling、Scheduled Workflows、Control Flow（`.foreach()` 批量循环）、Harness（Background Tasks / Schedules）
- **依据（2026-10-02 核对随包文档）**：工作流级 `retryConfig: { attempts, delay }`；步骤级 `createStep({ retries })` 覆盖前者；最终失败走 `options.onError(errorInfo)`（`error` / `status` / `steps`）。定时：在 `createWorkflow` 里写 `schedule: { cron, timezone, inputData }`，**Mastra 启动时自动接管**，不需要额外的注册调用；带 `schedule` 的工作流照样能手动 `start()`
- **改动文件**：`after-sales.ts`（加重试与 onError）+ 新建 `daily-check.ts`（每天 9 点巡检：`scan` → `.foreach` 逐单生成提醒 → 汇总）+ `index.ts` 注册
- **验收**：故意让某步失败，能看到重试与最终状态；到点自动触发一次
- **待验证**：cron 是否按 `timezone: "Asia/Shanghai"` 到点触发（未实跑等待）；Studio 里能不能手动触发带 schedule 的工作流
- **文档（已核实 200）**：`/docs/workflows/error-handling`、`/docs/workflows/scheduled-workflows`、`/docs/harness/background-tasks`、`/docs/harness/schedules`

### 第 10 课 · RAG：知识库与检索

- **目标**：文档入库（chunk + embed + 存向量库）→ 检索工具 → agent 作答时引用来源；**语料就是售后政策原文（P1–P6）**
- **依赖（新增）**：`pnpm add @mastra/rag` —— `MDocument`（切块）与 `createVectorQueryTool`（检索工具）都在这里；嵌入模型沿用第 5 课的硅基流动，不再新增 key
- **新增文件**：`knowledge/embedder.ts`、`knowledge/policies.ts`、`workflows/ingest-policies.ts`、`tools/policy-search.ts`；覆盖 `agents/support-agent.ts`（挂检索工具）；`index.ts` 注册 `vectors` 与入库工作流
- **依据（2026-10-02 核对随包文档）**：`MDocument.fromText(...)` → `doc.chunk({ strategy: "recursive", maxSize, overlap, separators })` → `embedMany({ model, values })`（`ai` 包）→ `vectorStore.createIndex({ indexName, dimension, metric })` → `vectorStore.upsert({ indexName, vectors, metadata })`；检索用 `createVectorQueryTool({ vectorStoreName, indexName, model })`，`vectorStoreName` 必须是 Mastra 实例 `vectors` 里注册的名字
- **入库方式**：做成工作流 `ingest-policies`，在 Studio 的 Workflows 页跑一次（不依赖额外脚本运行器）；metadata 里带条款号，回答才能说清依据
- **验收**：问「过了 15 天还能换新吗」→ 回答引用 P2 并给出正确结论；问政策里没写的事 → 明确说不知道，不编
- **待验证**：`createIndex` 重复运行是否报错（重复入库前要先删旧索引）；`createVectorQueryTool` 的 `model` 接受 AI SDK 的 openai-compatible 嵌入模型
- **文档（已核实 200）**：`/reference/rag/overview`、`/reference/rag/chunking-and-embedding`、`/reference/rag/retrieval`、`/reference/rag/vector-databases`

### 第 11 课 · 评测：把回归测试跑起来

- **目标**：定义评测集与 scorer，在 CI 里跑；分数低于阈值时门禁失败
- **能力**：Built-in Scorers、Custom Scorers、Datasets、Quick Checks、Gates and Verdicts、Running in CI、Vitest
- **做法（借参考仓库阶段 5）**：先写**不调用 judge 模型**的确定性 scorer（例如"一轮里只能问一个问题"、"必须带免责声明"），省钱且可回归；固定案例集放进 `src/mastra/evals/` 版本控制，之后可迁到 Studio Dataset；讲清三者分工 —— **Dataset 出题、Scorer 打分、Trace 定位是哪一步掉了分**
- **依赖**：无新增 —— `createScorer` 与 `runEvals` 都在 `@mastra/core/evals`；prebuilt scorers（用 judge 模型）才需要另装 `@mastra/evals`
- **新增文件**：`src/mastra/evals/{scorers,cases,run}.ts`
- **依据（2026-10-02 核对随包文档）**：`createScorer({ id, description }).analyze(...).generateScore(...)`（全函数步骤不调 judge）；`runEvals({ target, data, gates, scorers })`，`gates` 必须全部 1.0，普通 scorer 可带 `threshold`；返回 `result.verdict`（`passed` / `scored` / `failed`）+ `scores`
- **验收**：`pnpm dlx tsx src/mastra/evals/run.ts` 能跑完案例集；把提示词改坏（例如去掉「说清依据哪一条」）后 verdict 不是 passed、进程退出码非 0
- **待验证**：`pnpm dlx tsx` 在学员机器上首次会下载 tsx（离线环境需换成本地 tsx 或 vitest）；`result.scores` 的具体结构未实跑打印
- **文档（已核实 200）**：`/docs/evals/overview`、`/docs/evals/custom-scorers`、`/docs/evals/gates-and-verdicts`、`/docs/evals/running-in-ci`

### 第 12 课 · 观测：用 trace 定位问题

- **目标**：一次会话能看到完整 trace（步骤、工具调用、token、耗时、错误），并接入日志与指标
- **能力**：Traces（Usage / Logging / Feedback / Storage）、Metrics、Studio Observability
- **立论（借参考仓库阶段 6）**：**排查靠 Trace，不靠模型自述** —— 模型的 `reasoning` 不是业务输出，可以设为 `none`；要看"为什么答错"就去看工具入参出参、workflow 走哪个分支、Working Memory 当时是什么
- **脚手架已配好**（不用新装包）：`index.ts` 里已有 `PinoLogger` + `Observability({ configs: { default: { serviceName, exporters: [MastraStorageExporter, MastraPlatformExporter], spanOutputProcessors: [SensitiveDataFilter] } } })`，观测数据落在 `MastraCompositeStore` 的 `domains.observability`（DuckDB）
- **改动文件**：只改 `index.ts` 里 logger 的 name 与 level（level 走 `LOG_LEVEL` 环境变量）
- **验收**：Studio 里能定位"这一步为什么慢 / 为什么答错"
- **待验证**：Studio Observability 页里 trace 的字段与本文描述一致；DuckDB 存储文件在本地项目里的落点
- **文档（已核实 200）**：`/docs/observability/tracing/overview`、`/docs/observability/logging`、`/docs/observability/metrics/overview`、`/docs/studio/observability`

### 第 13 课 · 护栏：在进模型前后各拦一道

- **目标**：输入侧拦注入 / 输出侧脱敏；对不合规内容返回兜底话术
- **能力**：Guardrails、Processors
- **与业务字段的关系（借参考仓库阶段 6）**：事实、授权、联系方式**分开保存**；授权记录必须同时具备 `granted` + 用途版本 + 完整范围 + 用户原话，只有一个布尔不算授权；用户拒绝或撤回后必须强制关闭后续采集
- **依据（2026-10-02 核对随包文档）**：处理器挂在 Agent 上：`inputProcessors` / `outputProcessors`；内置的来自 `@mastra/core/processors`（`PromptInjectionDetector`、`ModerationProcessor`、`UnicodeNormalizer`、`TokenLimiter` 等）；自定义实现 `Processor` 接口（`processInput({ messages })` → 返回新消息数组，正文在 `content.parts` 里，只改 `type === "text"` 的 part）
- **新增/改动文件**：`src/mastra/processors/mask-contact.ts`（自定义脱敏）+ 覆盖 `agents/support-agent.ts`（挂前后处理器）
- **验收**：构造越狱输入被拦；消息里的手机号 / 邮箱在进模型前被换成占位符；不合规输出被拦或改写
- **待验证**：`PromptInjectionDetector` / `ModerationProcessor` 用 DeepSeek 模型的分类效果；被拦下时返回给客户的话术是否可定制
- **文档（已核实 200）**：`/docs/agents/guardrails`、`/docs/agents/processors`、`/reference/processors/processor-interface`

### 第 14 课 · 上线：存储、鉴权与部署

- **目标**：换生产存储、加鉴权、部署到云；重启后 workflow 能续跑
- **能力**：Storage、Auth（Simple / JWT / FGA）、Deploy（Mastra Server / Cloud Providers / Workflow Runners / Workers / Web Framework）、Server Middleware
- **上线清单（借参考仓库阶段 9）**：鉴权与权限、敏感字段加密 + 日志脱敏、数据访问审计与保存期限 / 删除机制、用户撤回授权、Prompt 注入防护、限流与异常兜底、部署后的监控告警
- **依据（2026-10-02 核对随包文档）**：`SimpleAuth` 来自 `@mastra/core/server`，挂在 `new Mastra({ server: { auth: new SimpleAuth<User>({ tokens: { ... } }) } })`；构建产物用 `pnpm exec mastra build` 生成到 `.mastra/output/`
- **改动文件**：只改 `index.ts`（加 `server.auth`）；生产 token 走环境变量
- **验收**：不带 token 的请求被拒；服务重启后未完成的流程继续跑完；日志里看不到敏感字段
- **待验证**：`mastra build` + 启动产物在本项目里能跑通（未实跑）；curl 带 / 不带 token 的实际响应码
- **文档（已核实 200）**：`/docs/storage`、`/docs/auth/simple-auth`、`/docs/auth/jwt`、`/docs/deployment/mastra-server`、`/docs/deployment/cloud-providers`、`/docs/server/middleware`

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

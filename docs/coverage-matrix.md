# 能力覆盖矩阵：Mastra 官方核心能力 → 课次

来源：Mastra 官方文档目录（`https://mastra.ai/llms.txt`，核对时间 2026-09-29）。
用途：确保「官方核心能力」都有落点，或明确写出「不进主线 + 原因」。

## 一、官方能力 → 课次映射

| 官方分区 | 能力页 | 课次 |
|---|---|---|
| **Build / Agents** | Tools | 第 3 课 |
| | Structured Output | **暂不进主线**（Studio 不支持传 schema，脚本方式在现脚手架下跑不通；等有 route / HTTP 载体再定） |
| | Human-in-the-Loop | 第 8 课 |
| | Guardrails | 第 13 课 |
| | Processors | 第 13 课 |
| | Code Mode | 进阶 A5 |
| **Build / Workflows** | Workflow State | 第 7 课 |
| | Control Flow | 第 7 课 |
| | Agents and Tools | 第 7 课 |
| | Snapshots | 第 8 课 |
| | Suspend and Resume | 第 8 课 |
| | Human-in-the-Loop | 第 8 课 |
| | Time Travel | 第 8 课 |
| | Error Handling | 第 9 课 |
| | Scheduled Workflows | 第 9 课 |
| | Dynamic Workflows | 进阶 A5 |
| **Build / Harness** | Durable Agents | 第 8 课（概念） |
| | Background Tasks | 第 9 课 |
| | Schedules | 第 9 课 |
| | Goals / Signals / Signal Providers / Agent Controller | **不进主线**（见第二节） |
| **Build / Memory** | Message History | 第 4 课 |
| | Working Memory | 第 4 课 |
| | Semantic Recall | 第 5 课 |
| | Observational Memory | 第 5 课 |
| | Memory Processors | 第 5 课 |
| | Multi-User Threads | 第 5 课 |
| **Extend** | Subagents / Skills | 进阶 A1 |
| | Channels | 进阶 A3 |
| | Sandboxes（Filesystem / Search / Computer / LSP） | 进阶 A4 |
| | Browser | 进阶 A4 |
| | Connections（MCP）| 进阶 A2（`MCPClient` / `MCPServer`、静态与运行时工具、工具审批、安全边界） |
| | Connections（A2A / ACP / SDK Agents） | 进阶 A2（次要项） |
| **Develop / Deploy** | Storage | 第 4 课（基础）、第 14 课（生产） |
| | Server（Adapters / Custom API Routes / Client） | 第 6 课 |
| | Server（Middleware / Request Context） | 第 14 课（RequetContext 第 3 课已有基础） |
| | Server（PubSub / Custom Adapters） | **不进主线** |
| | Studio（Observability / Editor / Deployment / Auth） | 第 1 / 12 / 14 课 |
| | Auth（Simple / JWT / FGA） | 第 14 课 |
| | Auth（Composite / Custom Provider / Workers） | **不进主线** |
| | Deploy（Mastra Server / Cloud Providers / Workflow Runners / Web Framework） | 第 14 课 |
| | Deploy（Monorepo / Sandbox / Workers） | **不进主线** |
| **Observe** | Traces（Usage / Logging / Feedback / Storage） | 第 12 课 |
| | Metrics | 第 12 课 |
| | Evals（Built-in Scorers / Custom / Quick Checks / Gates / Multi-turn / CI / Vitest / Datasets / Experiments / with Memory） | 第 11 课 |
| **Models** | Providers / Model Router / Gateways / Fallbacks | 第 2 课 |
| **Integrations** | Agentic UI → AI SDK UI | 第 6 课 |
| | Agentic UI → assistant-ui / CopilotKit / OpenUI | **不进主线**（可选） |
| | Frameworks → Next.js | 第 6 课 |
| | Frameworks → 其他（Express / Hono / NestJS / Nuxt / Astro / SvelteKit / …） | **不进主线** |
| | Observability exporters（Langfuse / Datadog / Braintrust / …） | 第 12 课（提一句，选一家） |
| | Sandboxes 商用沙箱（E2B / Daytona / Modal / …） | **不进主线** |

## 二、不进主线的能力与原因

| 能力 | 为什么不做成课 |
|---|---|
| Harness：Goals / Signals / Signal Providers / Agent Controller | 面向"长时间自治 agent"，需要外部信号系统与常驻运行时；第 8–9 课已覆盖 durable / background / schedules 的可用部分，其余等真实需求 |
| Server PubSub / Custom Adapters | 只在多实例、水平扩展时才需要，属部署进阶；第 14 课讲清基本部署即可 |
| Auth：Composite / Custom Provider / Workers | 取决于公司既有鉴权体系，不是通用知识点 |
| Deploy：Monorepo / Sandbox / Workers | 与仓库形态和运维相关；默认按"单仓 + Mastra Server"讲 |
| 前端生态（assistant-ui / CopilotKit / OpenUI） | 我们已用 **AI SDK UI** 打通一条链路；其他生态按需自取，不做课 |
| 其他框架集成 / 商用沙箱 | 环境相关，写进"延伸阅读"即可 |

## 三、与参考仓库 `my19940202/mastra-agent` 的对照

### 它覆盖、我们也覆盖

| 它的阶段 | 我们的课 |
|---|---|
| 阶段 1 结构化记忆与采集 Prompt | 第 2、4 课 |
| 阶段 2 案件充分度 Tool | 第 3 课 |
| 阶段 3 确定性 Workflow 路由 | 第 7 课 |
| 阶段 4 多轮状态与恢复 | 第 8 课 |
| 阶段 5 自动化评测与可观测性 | 第 11、12 课 |
| 阶段 6 线索资格与用户授权 | 第 8 课（HITL） |
| 阶段 7 线索保存与律师交接 | 第 14 课（存储与对外交付） |
| 阶段 8 法律知识库与 RAG | 第 10 课 |
| 阶段 9 生产安全与上线 | 第 13、14 课 |

### 它没覆盖、我们补上（差异点）

| 我们补的能力 | 课 |
|---|---|
| **接自己的前端**（`chatRoute()` + AI SDK UI，复用 lab-ai-sdk 页面） | 第 6 课 |
| Semantic Recall / Observational Memory / Memory Processors / 多用户线程隔离 | 第 5 课 |
| 定时任务与后台任务（Scheduled Workflows / Background Tasks / Schedules） | 第 9 课 |
| Guardrails 与 Processors（注入防护、输出脱敏） | 第 13 课 |
| Evals 的 CI / Datasets / Gates / Experiments（它只到 scorer + trace） | 第 11 课 |
| Auth（Simple / JWT / FGA）与部署形态（Workflow Runners 等） | 第 14 课 |
| 多 provider / fallback / Gateways | 第 2 课 |
| Subagents / MCP / Channels / Sandbox（放进阶） | A1–A5 |

### 它有、我们刻意不照搬的

- **业务域**：它是"家庭法律预咨询"（领域很深、问题树写进 instructions）。我们换成更中性的场景，方便学员替换成自己的领域；法律那套"问题树 + 结构化工作记忆 schema"的做法会在第 4 课作为范例讲。
- **Studio-only 的演示方式**：它全程在 Studio 里验证。我们额外给一条"自己的前端"链路（第 6 课），因为多数人要交付的是产品界面而不是 Studio。

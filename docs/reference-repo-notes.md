# 参考仓库笔记：`my19940202/mastra-agent`

分析时间 2026-09-29。用途：给本课程课表提供对照与可借鉴做法。

## 一、仓库概况

- **形态**：`pnpm/npm create mastra@latest` 生成的 Mastra 项目，外加自写的学习文档
- **业务域**：家庭法律预咨询（离婚 / 彩礼 / 继承 / 家庭财产）→ 采集案件信息 → 生成律师咨询摘要 → 线索交接
- **关键文件**：
  ```text
  src/mastra/agents/family-legal-intake-agent.ts   法律 agent：问题树、记忆结构、instructions
  src/mastra/index.ts                               Mastra 入口、注册 agent / workflow / scorer / storage / observability
  docs/学习阶段 1-9.md                               阶段化学习文档（本文主要参考）
  docs/mastra-core-concepts.md                      基础概念笔记（Mastra 实例 / Agent / Model Router / Tool / Workflow / Memory / Storage / Studio）
  tests/legal-intake-scorers.test.ts                规则级自动化测试（pnpm test:legal-intake）
  ```
- **技术选择**：DeepSeek（`DEEPSEEK_API_KEY`）、thread Working Memory（Zod schema）、libSQL（`file:./mastra.db`）、调度任务持久化、Studio（`localhost:4111`）验证
- **验证方式**：全程在 **Studio** 里跑（Agents / Tools / Graph / Trace），加 `pnpm test:legal-intake` 做规则级回归

## 二、它的九个阶段（原文标题）

| 阶段 | 一句话（原文的"这一阶段学习的是"） |
|---|---|
| 1 结构化记忆与采集 Prompt ✅ | 让大模型成为有角色、边界和上下文的 Agent |
| 2 案件充分度 Tool ✅ | 把业务判断从 Prompt 迁移到可测试代码 |
| 3 确定性 Workflow 路由 ✅ | Tool 是能力，Workflow 是对能力的编排 |
| 4 多轮状态与恢复 ✅ | Workflow State + `ask_user` suspend/resume + Agent 自动恢复 |
| 5 自动化评测与可观测性 ✅ | 用 Scorer / Trace / Dataset 证明 agent 足够稳定 |
| 6 线索资格与用户授权 ✅ | 授权必须显式、可追溯，且与案件事实分开保存 |
| 7 线索保存与律师交接 | 幂等、状态流转、人工审核、失败重试、审计日志 |
| 8 法律知识库与 RAG | 每份知识都要有来源 / 效力 / 版本；手册先校验拆分再入库 |
| 9 生产安全与上线 | 认证、加密、审计、撤回、注入防护、限流兜底 |

**它的推进优先级建议**（值得照抄的思路）：
> 阶段 4–7 是可靠线索收集的主线；阶段 8（RAG）用于提升回答质量，**不是 MVP 前置**；阶段 9 是接触真实用户前的必要条件。

## 三、值得借鉴的 6 点（会落到我们课表里）

1. **"把业务判断从 Prompt 挪到确定性代码"**（阶段 1→2）
   → 我们的第 3 课会明确：能用代码判断的规则别写在 instructions 里，工具里放确定性函数，并为它写**不依赖模型**的测试。

2. **结构化 Working Memory + 每类信息独立 schema**（阶段 1、6）
   → 第 4 课用"结构化工作记忆"讲法；第 13 课讲"事实 / 授权 / 联系方式分开存"，授权记录必须含**用途版本 + 范围 + 用户原话**，不能是单个布尔。

3. **workflow 负责编排，agent 负责对话**（阶段 3、4）
   → 第 7 课的主线；且强调 workflow 不等待自然语言答案，`responsePlan` 保持确定。

4. **`ask_user` + suspend/resume + `autoResumeSuspendedTools`**（阶段 4、6）
   → 第 8 课会点名这套：`ask_user` 只负责"暂停 + 展示控件（text / single_select / multi_select）+ 返回答案"，**不负责业务判断、不直接写记忆**；题型由确定性字段映射决定，未配置字段默认文本框（避免模型编造选项）。

5. **确定性 Scorer + 固定回归案例集**（阶段 5）
   → 第 11 课照这个思路：先写**不调用 judge 模型**的规则级 scorer（省钱、可回归），固定案例集可版本控制、也可迁到 Studio Dataset；`Scorer 打分 / Trace 定位 / Dataset 存题` 三者分工要讲清。

6. **"排查靠 Trace，不靠模型自述"**（阶段 6）
   → 第 12 课的立论：把 `reasoning` 设为 none，排查看 Trace 里的工具入参出参、workflow 分支、working memory，而不是依赖模型的自然语言推理。

## 四、它没覆盖、我们补上的能力

| 我们补的 | 课 | 为什么要补 |
|---|---|---|
| 接自己的前端（`chatRoute()` + AI SDK UI） | 第 6 课 | 它只在 Studio 里验证；多数人要交付产品界面 |
| Semantic Recall / Observational Memory / Memory Processors / 多用户线程隔离 | 第 5 课 | 它只用 thread Working Memory，没有长期记忆与跨会话召回 |
| 定时 / 后台任务（Scheduled Workflows、Background Tasks、Schedules） | 第 9 课 | 模板自带 schedules，但阶段里没讲 |
| Guardrails 与 Processors | 第 13 课 | 它把注入防护放到阶段 9 的清单里，缺专门一课 |
| Evals 的 CI / Datasets / Gates / Experiments | 第 11 课 | 它到"scorer + 固定案例"为止，没进 CI 门禁 |
| Auth（Simple / JWT / FGA）与部署形态（Workflow Runners 等） | 第 14 课 | 它只在阶段 9 列了要求，没有具体实现路线 |
| 多 provider / fallback / Gateways | 第 2 课 | 它固定用 DeepSeek（+ 模板的 Google），没讲路由与降级 |
| Subagents / MCP / Channels / Sandbox | 进阶 A1–A5 | 属于编排之外的外延能力 |

## 五、我们刻意不照搬的

- **业务域**：法律（问题树写进 instructions、隐私与合规极重）。我们换成中性场景，方便学员替换成自己的领域；法律那套"问题树 + 结构化记忆"只作为第 4 课的范例出现。
- **Studio-only 的验证方式**：我们额外给"自己的前端"链路（第 6 课）+ 可跑的验收标准，学员能拿出去交付。
- **把 MVP 压在一条很长的业务链上**：它阶段 4–7 才是完整闭环，周期长；我们把「能聊 → 能记 → 能编排 → 能审批 → 能评」拆成每课都可独立验收的小步。

## 六、它的文档风格值得抄的部分

- 每阶段**一句话点题**（"这一阶段学习的是：…"）
- 每阶段都有**怎样测试**（Studio 里怎么点、命令怎么跑）
- "基础概念"与"阶段实践"分开两篇
- 结尾给**后续推进顺序**与优先级理由

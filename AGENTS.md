# AGENTS.md — lab-mastra 维护规则

Mastra 课程（lab-mastra）的约定。改这个仓库前先读本文件；与 `docs/curriculum.md` 冲突时以本文件为准。

## 一、信息架构

- **左侧菜单 = 主线课 + 进阶课**，顺序见 `docs/curriculum.md`（主线 14 课，进阶 5 课）。
- 每课页 = 跟做步骤 + 知识点 + 文件 + 代码 + 右侧官方文档（`docLinks`），可选「延伸阅读」弹窗。
- 每课有两个标题字段：`title`（页内 h1，完整、可带「：说明」）与 `menuTitle`（左侧菜单，短名）。**两个都必填**，不用派生规则截断。
- **验收写法**：2～3 行**陈述句** —— ① 怎么打开（Studio / 页面，选哪个 agent）；② **这是什么 agent、现在具备什么能力**。不写问句、不写检查清单、不写预期输出，也不用口语化措辞（「随便给…」「看它…」）。
- 站点结构、组件、布局 class 与 `lab-ai-sdk` **保持一致**：`app/`、`components/`、`lib/layout-classes.ts` 直接复用 lab-ai-sdk；数据文件沿用同名 `lib/projects.ts`（`INIT_STEPS` / `NAV_ITEMS` / 类型与辅助函数）与 `lib/home.ts`。

## 二、动笔前必做：先查文档，不清楚就问

1. **先查官方文档**：`https://mastra.ai/docs`（中文镜像 `https://mastra.org.cn`）。API 名、参数、CLI 参数与交互项逐项对着文档写；已有官方指南页（如 Next.js 集成）就用其原文措辞，**不自己重写流程**。
2. **文档没写的、或文档与实际不符的**：先问用户。例：`create-mastra` 参考页列了 `--default` / `--components` / `--dir` / `--mcp`，但已发布版本里不存在（实测报 `unknown option`）。这类冲突不要自己跑命令试探，也不要凭印象写进课里。
3. **需要取舍的**（学员项目形态、示例 agent 留不留、端点用 `chatRoute()` 还是 `handleChatStream()` 等）：给「方案 + 推荐 + 代价」，让用户拍板，不擅自决定。已定：**端点用官方 Next.js 指南的 `handleChatStream()` + `createUIMessageStreamResponse()`**，路由放 `app/api/generate/route.ts`（对齐 lab-ai-sdk 页面里写死的地址）。
4. **没实测过的不要写成事实**：确认过的才写进步骤说明，未验证的在课里标 `待验证`，并同步进 `README.md` 待办。
5. **改 `lib/projects.ts` 前先 `git diff` 或重读文件**：整段替换会**静默覆盖**别人的改动（别的 agent、用户自己的编辑都会中招）。

## 三、知识点规则

只写 **Mastra 真实存在的 API / 概念**（来源：`mastra.ai/docs`），每条 = **名称 + 一句中文说明它干什么**。例如：

```text
createTool — 定义 agent 可调用的工具：id、description、inputSchema（zod）、execute(input, context)
```

不要写：

- 自写函数（如 `loadChat` / `saveChat` 这类本课程自己的代码）
- 「我们把参数传到哪」这类代码层面知识
- 同一个能力在后续课重复列（哪课首次出现就在哪课写）

## 四、前端不重学

本课程的 Web UI **沿用 lab-ai-sdk**（`useChat`、`message.parts`、`tool-*` / `data-*` part 渲染）。本课程知识点只讲 Mastra 侧；讲前端时用一句话指回 lab-ai-sdk，不重复展开。目的是让学员看到「同一个前端，后端换成 Mastra」。

## 五、覆盖式演进（学员项目）

学员只维护**一个 Next 项目** `my-mastra-app`：前端在**根 `app/`**（与 lab-ai-sdk 一致），Mastra 在 `src/mastra/`，逐课叠加：

| 课 | 新增 | 覆盖 |
|---|---|---|
| 1 | Next 一体化脚手架（`pnpm dlx create-next-app` + `pnpm dlx mastra@latest init`） | — |
| 2 | 会话记忆（`memory` + `lastMessages`） | `src/mastra/agents/*.ts` |
| 3 | `src/mastra/data/*.ts` + `src/mastra/tools/*.ts` | agent |
| 4 | — | agent 的 memory（加 `workingMemory` + schema） |
| 5 | 依赖 `@mastra/fastembed`（本地嵌入） | agent 的 memory（`semanticRecall` + `vector` + `messageHistory` 预算） |
| 6 | `app/api/generate/route.ts`（`handleChatStream`）+ 复用 lab-ai-sdk 第 4 课的 `app/page.tsx`；首次装 `@mastra/ai-sdk` / `@ai-sdk/react` / `ai` | 覆盖脚手架 `app/page.tsx`；`index.ts` 的 storage `url` 改绝对路径 |
| 7–9 | `src/mastra/workflows/*.ts` | agent / `index.ts` |
| 10 | `src/mastra/knowledge/*.ts` | 检索工具注册 |
| 11–12 | `src/mastra/evals/*.ts`、observability 配置 | `index.ts` |
| 13–14 | — | `index.ts`（storage / auth / 部署配置） |

禁止每课新建项目、新建平行目录；同一能力只在同一处演进。

## 六、代码与依赖约定

- **统一场景**：学员的 agent 是**虚拟宇宙公司官方客服**（虚拟品牌，卖**武器、装备与药剂**；`src/mastra/agents/support-agent.ts`，`id: "support-agent"`；货币是**黑龙币**）。全课事实底本见 `docs/scenario.md`（产品 / SKU / 政策 P1–P5 / mock 数据 / 四类客户问题 / 三条纪律）—— 改场景必须**整条链一起改**：角色 → 任务 → 必须知道什么 → `workingMemory.schema` → 工具 → 政策语料。
- **夸张的皮，严谨的规则**：世界观可以俏皮（虚拟宇宙公司、星际运输队、遁天梭），但天数、条件、责任方、金额一律精确 —— 第 7 课的分支与第 11 课的判分靠的是规则，不是设定。
- **数据一律 mock**：订单、客户、物流都在 `src/mastra/data/` 里，**不接任何真实平台接口、不出现真实品牌名**；学员不需要任何商家凭证就能跑通全部 14 课。这份数据是**一份共享 mock**（没有登录、没有归属校验，谁查都是同一份）——工具入参里的客户姓名只是**筛选条件**，不是权限边界；不要往课里写「某客户名下的订单」这种生产系统的归属 / 隔离概念。
- 模型统一 **DeepSeek**：`model: "deepseek/deepseek-flash"` + `DEEPSEEK_API_KEY`；不要为了示例引入其他 provider（要讲多模型/fallback 时单独说明可选 provider）。
- 存储用**本地 libSQL**（`file:./mastra.db`），不要默认上云服务（Turso 只在「部署」课作为可选说明）。
- 依赖只加课程真需要的包：`@mastra/core`、`@mastra/ai-sdk`、`zod`。第 5 课为语义召回加 `@mastra/fastembed`（本地嵌入，避免引入第二个 provider 的 key）；第 6 课接 lab-ai-sdk 前端时才装 `@mastra/ai-sdk` + `@ai-sdk/react` + `ai`；**不装官方 Next.js 指南里推荐的 `ai-elements`**（前端用我们自己的）。
- 示例代码写**中文注释**讲关键行为；知识点列表只列名称，注释解释用法。
- **跟做步骤的文案照 `lab-ai-sdk` 的写法**：一句话、动词开头、只说做什么；`choices` 用「项 → 取值」。理由、取舍、背景**不写进步骤说明**（放知识点、延伸阅读或仓库文档）。
- 课的 `agentPrompt` 必须**显式给出项目路径占位符**（如 `[路径名]`），并要求 agent 在位置不明确时先问用户 —— 不能依赖 agent 的当前工作目录（它可能正是课程站点仓库，会把项目建进去）。
- 工具必须用 `createTool()`（不要用裸对象），`execute` 签名是 `execute(input, context)`。
- **工具按「客户会怎么说」设计，不按数据表结构设计**：定工具前先列**台词清单**（客户可能说的每句话），逐句确认至少有一个工具能接住；接不住就是缺工具。反例：只有 `checkReturnEligibility({ orderId })` 时，「我的刀能退吗」只能被推回「请提供订单号」——补上 `findOrders({ sku? })` 才成立。
- **检索与判定分开**：查的归查（`listProducts` / `findOrders`），判的归判（`checkReturnEligibility`），模型才分得清「该查还是该判」。工具名用直白的能力词（「查在售清单」「查订单」），不用「按称呼查」这类实现细节措辞。提示词里只需再补两句：**能用工具解决的，优先用工具，不要麻烦客户**；以及**当前客户是谁**（「您当前正在服务的客户是罗峰先生」）—— 写明了模型就不会去问名字。
- **提示词只点名工具**：`instructions` 里一行一个工具（「`findOrders`：查订单」）就够；政策细节、判定规则、问题类型映射都写在工具的 `description` 里（模型能读到）。规则抄进提示词，只会和代码两处打架。
- **只有一个客户就不要身份参数**：mock 数据里所有订单都是同一个人（罗峰先生），工具入参只管商品名、不要客户名 —— 带身份参数等于在暗示模型「先去问名字」，白多一轮废话。
- **覆盖 vs 局部修改**：文件是**我们自己的**（前几课学员新建的，如 `agents/support-agent.ts`）→ 用 `replace` **整体覆盖**，和 `lab-ai-sdk` 一致；文件是**脚手架生成的**（含一大段生成配置，如 `src/mastra/index.ts` 里的 storage / logger / observability）→ 用 `edit` **只列要加/改的行**，别整段覆盖。

## 七、文档链接（`docLinks`）

- 只挂 **Mastra 官方文档**（`https://mastra.ai/docs/...`），一课 3~5 条，与当课能力一一对应。
- 每次改动后**批量校验 HTTP 200**（Mastra 文档路径变动频繁）。
- AI SDK 的文档只在「接入前端」一课挂 1 条（`@ai-sdk/react` 的 useChat 参考）。

## 八、版本与时效

Mastra 迭代快，API 变动频繁：

- 每课在 `docs/curriculum.md` 里记录**验证时使用的 Mastra 版本**。
- 示例代码以官方文档为准；写课时代码必须**实际跑通**（Studio 或脚本），不能只抄文档。
- 已知会变动的点（如 `@mastra/ai-sdk` 的 `handleChatStream()` 需要指定对接的 AI SDK 版本 `version: "v7"`、`create-mastra` / `mastra init` 的 CLI 参数）要在课里显式说明。

## 九、每次改动的自检清单

1. 动笔前是否已核对官方文档？文档与实际不一致处是否已问过用户？
2. 该课代码在学员项目里能**跑通**（Studio 里能看到效果），并有可验证的「验收标准」。
3. 新增 API / 概念是否已写进该课知识点，并挂上对应官方文档？
4. 是否与 lab-ai-sdk 的 UI 结构一致（组件、布局 class、数据文件形状）？
5. `docLinks` 是否全部 200？
6. 是否误引了其他 provider / 云服务 / AI SDK 包？
7. 新增工具前是否列过台词清单、逐句确认有动作能接住（含「客户不记得订单号」这类常态）？
8. lint / build 是否通过？

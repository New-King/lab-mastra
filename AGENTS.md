# AGENTS.md — lab-mastra 维护规则

Mastra 课程（lab-mastra）的约定。改这个仓库前先读本文件；与 `docs/curriculum.md` 冲突时以本文件为准。

## 一、信息架构

- **左侧菜单 = 主线课 + 进阶课**，顺序见 `docs/curriculum.md`（主线 12 课，进阶 5 课）。
- 每课页 = 跟做步骤 + 知识点 + 文件 + 代码 + 右侧官方文档（`docLinks`），可选「延伸阅读」弹窗。
- 站点结构、组件、布局 class 与 `lab-ai-sdk` **保持一致**：`app/`、`components/`、`lib/layout-classes.ts` 直接复用 lab-ai-sdk；数据文件沿用同名 `lib/projects.ts`（`INIT_STEPS` / `NAV_ITEMS` / 类型与辅助函数）与 `lib/home.ts`。

## 二、知识点规则

只写 **Mastra 真实存在的 API / 概念**（来源：`mastra.ai/docs`），每条 = **名称 + 一句中文说明它干什么**。例如：

```text
createTool — 定义 agent 可调用的工具：id、description、inputSchema（zod）、execute(input, context)
```

不要写：

- 自写函数（如 `loadChat` / `saveChat` 这类本课程自己的代码）
- 「我们把参数传到哪」这类代码层面知识
- 同一个能力在后续课重复列（哪课首次出现就在哪课写）

## 三、前端不重学

本课程的 Web UI **沿用 lab-ai-sdk**（`useChat`、`message.parts`、`tool-*` / `data-*` part 渲染）。本课程知识点只讲 Mastra 侧；讲前端时用一句话指回 lab-ai-sdk，不重复展开。目的是让学员看到「同一个前端，后端换成 Mastra」。

## 四、覆盖式演进（学员项目）

学员只维护**一个** Mastra 项目，逐课叠加：

| 课 | 新增 | 覆盖 |
|---|---|---|
| 1 | 脚手架（`pnpm create mastra@latest`） | — |
| 2 | — | `src/mastra/agents/*.ts` |
| 3 | `src/mastra/tools/*.ts` | agent |
| 4–5 | — | agent 的 memory 配置 |
| 6 | `app/api/chat/route.ts` + 前端页面 | — |
| 7–9 | `src/mastra/workflows/*.ts` | agent / `index.ts` |
| 10 | `src/mastra/knowledge/*.ts` | 检索工具注册 |
| 11–12 | `src/mastra/evals/*.ts`、observability 配置 | `index.ts` |
| 13–14 | — | `index.ts`（storage / auth / 部署配置） |

禁止每课新建项目、新建平行目录；同一能力只在同一处演进。

## 五、代码与依赖约定

- 模型统一 **DeepSeek**：`model: "deepseek/deepseek-flash"` + `DEEPSEEK_API_KEY`；不要为了示例引入其他 provider（要讲多模型/fallback 时单独说明可选 provider）。
- 存储用**本地 libSQL**（`file:./mastra.db`），不要默认上云服务（Turso 只在「部署」课作为可选说明）。
- 依赖只加课程真需要的包（`@mastra/core`、`@mastra/ai-sdk`、`zod`）；**不要在 Mastra 项目里混装 AI SDK 的包**，除非该课确实要接 lab-ai-sdk 的前端。
- 示例代码写**中文注释**讲关键行为；知识点列表只列名称，注释解释用法。
- 工具必须用 `createTool()`（不要用裸对象），`execute` 签名是 `execute(input, context)`。

## 六、文档链接（`docLinks`）

- 只挂 **Mastra 官方文档**（`https://mastra.ai/docs/...`），一课 3~5 条，与当课能力一一对应。
- 每次改动后**批量校验 HTTP 200**（Mastra 文档路径变动频繁）。
- AI SDK 的文档只在「接自己的前端」一课挂 1 条（`@ai-sdk/react` 的 useChat 参考）。

## 七、版本与时效

Mastra 迭代快，API 变动频繁：

- 每课在 `docs/curriculum.md` 里记录**验证时使用的 Mastra 版本**。
- 示例代码以官方文档为准；写课时代码必须**实际跑通**（Studio 或脚本），不能只抄文档。
- 已知会变动的点（如 `chatRoute()` 需要指定对接的 AI SDK 版本）要在课里显式说明。

## 八、每次改动的自检清单

1. 该课代码在学员项目里能**跑通**（Studio 里能看到效果），并有可验证的「验收标准」。
2. 新增 API / 概念是否已写进该课知识点，并挂上对应官方文档？
3. 是否与 lab-ai-sdk 的 UI 结构一致（组件、布局 class、数据文件形状）？
4. `docLinks` 是否全部 200？
5. 是否误引了其他 provider / 云服务 / AI SDK 包？
6. lint / build 是否通过？

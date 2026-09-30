import type { DocLink } from "@/lib/doc-link";

export type CommandStep = {
  description: string;
  command: string;
  /** 交互式脚手架时的推荐选项 */
  choices?: string[];
};

export type FileAction = "create" | "replace";

export type ProjectFile = {
  path: string;
  code?: string;
  hint?: string;
  steps?: CommandStep[];
  /** 项目课：跟做顺序 */
  order?: number;
  /** 项目课：新建或覆盖已有文件 */
  action?: FileAction;
};

export type FollowStep = {
  description: string;
  command: string;
};

export type LabOperation =
  | {
      kind: "scaffold";
      id: "scaffold";
      order: number;
      label: string;
      description: string;
      command: string;
    }
  | {
      kind: "file";
      id: string;
      order: number;
      label: string;
      file: ProjectFile;
    };

/** 生成 mkdir + touch 脚手架命令（仅包含 action: create 的文件） */
export function buildScaffoldCommand(files: ProjectFile[]): string | null {
  const sorted = [...files]
    .filter((file) => file.order != null && file.action != null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const createFiles = sorted.filter((file) => file.action === "create");
  if (createFiles.length === 0) return null;

  const dirs = new Set<string>();
  const paths: string[] = [];

  for (const file of createFiles) {
    paths.push(file.path);
    const slash = file.path.lastIndexOf("/");
    if (slash > 0) dirs.add(file.path.slice(0, slash));
  }

  const parts: string[] = [];
  if (dirs.size > 0) {
    parts.push(`mkdir -p ${[...dirs].sort().join(" ")}`);
  }
  parts.push(`touch ${paths.join(" ")}`);
  return parts.join(" && ");
}

/** 操作列表：创建文件 → 逐文件粘贴代码 */
export function getLabOperations(files: ProjectFile[]): LabOperation[] {
  const sorted = [...files]
    .filter((file) => file.order != null && file.action != null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const operations: LabOperation[] = [];
  let order = 1;

  const command = buildScaffoldCommand(sorted);
  if (command) {
    operations.push({
      kind: "scaffold",
      id: "scaffold",
      order: order++,
      label: "创建文件",
      description: `在 ${PROJECT_DIR} 目录执行，创建本课需要新建的文件夹和空文件。`,
      command,
    });
  }

  for (const file of sorted) {
    operations.push({
      kind: "file",
      id: file.path,
      order: order++,
      label: getFileName(file.path),
      file,
    });
  }

  return operations;
}

export type GuideProject = {
  kind: "guide";
  slug: string;
  title: string;
  /** 可选：整课交给编码助手执行的提示词（与下面的命令步骤等价） */
  agentPrompt?: string;
  files: ProjectFile[];
  docLinks: DocLink[];
};

/** 知识点右上角「更多」弹窗里的文章 */
export type ConceptArticle = {
  title: string;
  /** 每项一段：`## ` 开头是小标题，`- ` 开头是要点，``` 之间是代码 */
  body: string[];
};

export type LabProject = {
  kind: "project";
  slug: string;
  title: string;
  summary: string;
  concepts: string[];
  /** 可选：知识点旁的延伸阅读 */
  conceptArticle?: ConceptArticle;
  files: ProjectFile[];
  docLinks: DocLink[];
};

const ORDER_LABELS = ["①", "②", "③", "④", "⑤", "⑥"] as const;

export function getOrderLabel(order: number) {
  return ORDER_LABELS[order - 1] ?? String(order);
}

export function getFileActionLabel(action: FileAction) {
  return action === "replace" ? "覆盖" : "新建";
}

export function getFileName(path: string) {
  return path.split("/").pop() ?? path;
}

export type NavItem = GuideProject | LabProject;

export const PROJECT_DIR = "my-mastra-app";

export const INIT_STEPS: CommandStep[] = [
  {
    description:
      "创建 Mastra 项目。脚手架会生成示例 agent、本地存储、Studio 调试界面，以及 workspace / 调度 / 网络访问等常用能力。",
    command: `pnpm create mastra@latest ${PROJECT_DIR}`,
    choices: [
      "是否给编码 agent 装 Mastra skills → 可选（随便）",
      "其余提问按回车用默认值即可",
    ],
  },
  {
    description: "进入刚创建的项目目录。",
    command: `cd ${PROJECT_DIR}`,
  },
  {
    description: "启动开发服务，浏览器打开 Studio：http://localhost:4111。",
    command: "pnpm dev",
  },
];

export const NAV_ITEMS: NavItem[] = [
  {
    kind: "guide",
    slug: "getting-started",
    title: "初始化",
    agentPrompt: `在本机创建一个 Mastra 项目，严格按下面步骤执行，不要自行发挥：

1. 执行 pnpm create mastra@latest ${PROJECT_DIR}，交互项全部按回车用默认值
2. 进入项目目录，新建 .env，写入 DEEPSEEK_API_KEY=（先向我索要，不要编造）
3. 确认 src/mastra/agents 里的 agent 使用 model: "deepseek/deepseek-flash"
4. 启动 pnpm dev，把 Studio 地址（http://localhost:4111）告诉我，并说明第一步该点哪里验收

限制：不引入其他模型 provider、云服务或额外依赖；不改动上述范围之外的文件。
完成后列出改动过的文件清单。`,
    docLinks: [
      { title: "Get started", href: "https://mastra.ai/docs" },
      { title: "Mastra Studio", href: "https://mastra.ai/docs/studio/overview" },
      {
        title: "DeepSeek Provider",
        href: "https://mastra.ai/models/providers/deepseek",
      },
    ],
    files: [
      {
        path: "终端",
        steps: INIT_STEPS,
      },
      {
        path: ".env",
        hint: "打开 .env，填入 DEEPSEEK_API_KEY（Mastra 会自动读取）：",
        steps: [
          {
            description: `先进入 ${PROJECT_DIR} 项目目录，再创建 .env。`,
            command: "touch .env",
          },
        ],
        code: `DEEPSEEK_API_KEY=sk-...`,
      },
    ],
  },
  {
    kind: "project",
    slug: "agent-and-model",
    title: "Agent 与模型",
    summary:
      "定义一个自己的 agent：id、name、instructions、model，注册到 Mastra 入口，在 Studio 和命令行里跑起来。",
    concepts: [
      "Agent — 一个 agent 就是 id、name 和 instructions，加上 model，用 new Agent({ ... }) 定义",
      "instructions — agent 长期遵守的工作手册：角色、边界、输出要求都写在这里",
      'Model Router — 模型写成 "provider/model" 字符串（如 deepseek/deepseek-flash），Mastra 自动读取对应的环境变量',
      "Mastra 实例 — new Mastra({ agents }) 是应用入口；注册过的 agent 才会出现在 Studio 里",
      "agent.generate / agent.stream — 在脚本或服务里直接跑一次；stream 用于流式输出",
    ],
    docLinks: [
      { title: "Agents", href: "https://mastra.ai/docs/agents" },
      { title: "Models", href: "https://mastra.ai/models" },
      {
        title: "DeepSeek Provider",
        href: "https://mastra.ai/models/providers/deepseek",
      },
      { title: "Mastra Studio", href: "https://mastra.ai/docs/studio/overview" },
    ],
    files: [
      {
        path: "src/mastra/agents/my-agent.ts",
        order: 1,
        action: "create",
        hint: "定义 agent：身份 + 工作手册 + 模型",
        code: `import { Agent } from "@mastra/core/agent";

// 一个 agent = 身份（id / name）+ 工作手册（instructions）+ 模型（model）
export const myAgent = new Agent({
  id: "my-agent",
  name: "My Agent",
  // instructions 相当于系统提示：写清角色、边界和输出要求，agent 每轮都遵守
  instructions: \`你是一个中文技术助手。
- 只用中文回答，回答尽量简短
- 不确定的事情直接说不确定，不要编造
- 涉及代码时给最小可运行示例\`,
  // 模型写成 "provider/model" 字符串，Mastra 会自动读取 DEEPSEEK_API_KEY
  model: "deepseek/deepseek-flash",
});
`,
      },
      {
        path: "src/mastra/index.ts",
        order: 2,
        action: "replace",
        hint: "注册 agent（脚手架已有此文件，覆盖它）",
        code: `import { Mastra } from "@mastra/core";
import { myAgent } from "./agents/my-agent.ts";

// 应用入口：只有注册到这里的 agent 才会出现在 Studio 里
export const mastra = new Mastra({
  agents: { myAgent },
});
`,
      },
      {
        path: "run-my-agent.mjs",
        order: 3,
        action: "create",
        hint: "命令行跑一次，确认 agent 能回答",
        code: `// 运行：node run-my-agent.mjs
// Node 22.18+ 可以直接运行 TypeScript 文件，所以这里能 import .ts
import { mastra } from "./src/mastra/index.ts";

const agent = mastra.getAgentById("my-agent");
const response = await agent.generate("用一句话介绍你自己");

console.log(response.text);
`,
      },
    ],
  },
  {
    kind: "project",
    slug: "tools-and-structured-output",
    title: "工具与结构化输出",
    summary:
      "让 agent 会调工具：用 createTool 定义工具、用 zod 约束入参和返回值；再让 agent 直接产出结构化对象。",
    concepts: [
      "createTool — 定义 agent 可调用的工具：id、description、inputSchema、execute；裸对象定义不会被执行",
      "inputSchema — 模型需要填的参数，用 zod 约束并写 describe 说明",
      "outputSchema — 工具的返回值也用 zod 约束，后面拿到的就是结构化数据",
      "execute(input, context) — 只有这一种签名：校验后的入参 + 执行上下文（requestContext、abortSignal 等），用不到时可省略第二个参数",
      "tools — 传给 Agent：tools: { weatherTool }，由模型决定什么时候调用",
      "structuredOutput — agent.generate(prompt, { structuredOutput: { schema } }) 让回复直接是对象，读 response.object",
    ],
    docLinks: [
      { title: "Tools", href: "https://mastra.ai/docs/agents/tools" },
      {
        title: "Structured Output",
        href: "https://mastra.ai/docs/agents/structured-output",
      },
      { title: "Agents", href: "https://mastra.ai/docs/agents" },
    ],
    files: [
      {
        path: "src/mastra/tools/weather-tool.ts",
        order: 1,
        action: "create",
        hint: "定义第一个工具",
        code: `import { createTool } from "@mastra/core/tools";
import { z } from "zod";

// 工具必须用 createTool 定义（用裸对象写不会被执行）
export const weatherTool = createTool({
  id: "get-weather",
  description: "查询某个城市的当前天气",
  // inputSchema：模型要填的参数，用 zod 约束
  inputSchema: z.object({
    location: z.string().describe("城市名，例如 上海"),
  }),
  // outputSchema：返回值也约束住，后续步骤拿到的是结构化数据
  outputSchema: z.object({
    location: z.string(),
    temperatureCelsius: z.number(),
    conditions: z.string(),
  }),
  // execute 只有这一种签名：(input, context)；用不到上下文时可省略第二个参数
  execute: async ({ location }) => {
    // 真实项目里这里去请求天气接口；本课先用假数据
    return { location, temperatureCelsius: 21, conditions: "晴" };
  },
});
`,
      },
      {
        path: "src/mastra/agents/my-agent.ts",
        order: 2,
        action: "replace",
        hint: "把工具交给 agent",
        code: `import { Agent } from "@mastra/core/agent";
import { weatherTool } from "../tools/weather-tool.ts";

export const myAgent = new Agent({
  id: "my-agent",
  name: "My Agent",
  instructions: \`你是一个中文技术助手。
- 只用中文回答，回答尽量简短
- 不确定的事情直接说不确定，不要编造
- 问到天气时，调用 weatherTool 拿数据，再基于返回结果回答\`,
  model: "deepseek/deepseek-flash",
  // 把工具交给 agent，由模型决定什么时候调用
  tools: { weatherTool },
});
`,
      },
      {
        path: "run-my-agent.mjs",
        order: 3,
        action: "replace",
        hint: "跑一次：触发工具 + 结构化输出",
        code: `// 运行：node run-my-agent.mjs
import { z } from "zod";
import { mastra } from "./src/mastra/index.ts";

const agent = mastra.getAgentById("my-agent");

// 1) 这句话会触发工具调用：Studio 的 Trace 里能看到工具入参与返回值
const answer = await agent.generate("上海今天天气怎么样？");
console.log(answer.text);

// 2) 结构化输出：把回复约束成对象，直接读 response.object
const plan = await agent.generate("给我一个今天的三步工作计划", {
  structuredOutput: {
    schema: z.object({
      steps: z.array(
        z.object({
          title: z.string(),
          minutes: z.number(),
        }),
      ),
    }),
  },
});
console.log(plan.object);
`,
      },
    ],
  },
];

export function getNavItem(slug: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.slug === slug);
}

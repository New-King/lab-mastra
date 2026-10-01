import type { DocLink } from "@/lib/doc-link";

export type CommandStep = {
  description: string;
  command: string;
  /** 交互式脚手架时的推荐选项 */
  choices?: string[];
};

export type FileAction = "create" | "replace" | "edit";

export type ProjectFile = {
  path: string;
  code?: string;
  hint?: string;
  steps?: CommandStep[];
  /** 项目课：跟做顺序 */
  order?: number;
  /** 项目课：新建（create）/ 整体覆盖（replace）/ 局部修改（edit） */
  action?: FileAction;
};

export type FollowStep = {
  description: string;
  command: string;
};

/** 课末的验收步骤：去哪儿看、看到什么算通过（每项一行） */
export type ProjectVerify = {
  label: string;
  description: string[];
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
      kind: "check";
      id: "verify";
      order: number;
      label: string;
      description: string[];
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

/** 操作列表：创建文件 → 逐文件粘贴代码 → 验收 */
export function getLabOperations(
  files: ProjectFile[],
  verify?: ProjectVerify,
): LabOperation[] {
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

  if (verify) {
    operations.push({
      kind: "check",
      id: "verify",
      order: order++,
      label: verify.label,
      description: verify.description,
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
  /** 可选：课末验收步骤（操作列表的最后一项） */
  verify?: ProjectVerify;
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
  if (action === "replace") return "覆盖";
  if (action === "edit") return "修改";
  return "新建";
}

export function getFileName(path: string) {
  return path.split("/").pop() ?? path;
}

export type NavItem = GuideProject | LabProject;

export const PROJECT_DIR = "my-mastra-app";

export const INIT_STEPS: CommandStep[] = [
  {
    description: "在你选定的目录下创建 Next.js 项目（根 app/ 目录，与 lab-ai-sdk 一致）。",
    command: `pnpm dlx create-next-app@latest ${PROJECT_DIR} --yes --ts --eslint --tailwind --app --turbopack --no-react-compiler --no-import-alias`,
  },
  {
    description: "初始化 Mastra，生成 src/mastra/（推荐直接用这条带参数命令，跳过交互提问）。",
    command: `cd ${PROJECT_DIR} && pnpm dlx mastra@latest init --default --no-observability`,
    choices: [
      "--default = 位置 src/ + 提供商 OpenAI + 示例代码（agents/weather-agent.ts、tools/weather-tool.ts、workflows/weather-workflow.ts）",
      "若仍出现选项：创建位置 src/ → 提供商 OpenAI → API Key 留空 → Observability No → 编码助手工具按需",
      "注意：只带 --llm 这类部分参数（不给 -c）不会生成示例；要么用 --default，要么走交互",
    ],
  },
  {
    description: "删掉脚手架建的 git 仓库。",
    command: "rm -rf .git",
  },
  {
    description: "启动 Studio，打开 Agents 页：http://localhost:4111/agents。",
    command: "pnpm exec mastra dev",
  },
  {
    description: "另开一个终端启动前端：http://localhost:3000。",
    command: "pnpm dev",
  },
];

export const NAV_ITEMS: NavItem[] = [
  {
    kind: "guide",
    slug: "getting-started",
    title: "初始化",
    agentPrompt: `创建这个课程的学员项目：一个 Next.js 应用，并在其中初始化 Mastra。

目标位置：<父目录>/${PROJECT_DIR}（不要用当前工作目录，不要建在已有项目的目录里）
DEEPSEEK_API_KEY：<key>（只在本地写进 .env，回复里不要回显）

只有下面两件事需要问我，一次问一个、等我回答再问下一个；我已经说过的就不用问：

1. 建在哪个目录？
2. DEEPSEEK_API_KEY 是多少？

其余全部按下面执行，不要为细节反复找我确认。

执行步骤：

1. 进入 <父目录>，执行 pnpm dlx create-next-app@latest ${PROJECT_DIR} --yes --ts --eslint --tailwind --app --turbopack --no-react-compiler --no-import-alias
2. 进入 ${PROJECT_DIR}，执行 pnpm dlx mastra@latest init --default --no-observability
   --default = 位置 src/ + 提供商 OpenAI + 示例代码（agents/weather-agent.ts、tools/weather-tool.ts、workflows/weather-workflow.ts）。
   不要走交互问答（执行环境没有 TTY，会卡住）；也不要只带 --llm 这类部分参数——不带 -c 时不会生成示例。
   若仍出现选项：API Key 留空、Observability 选 No、编码助手工具按需。
3. 删掉脚手架建的 git 仓库：rm -rf .git
4. 在项目根目录准备 .env，只写 DEEPSEEK_API_KEY=<key>。API Key 留空时 init 只会生成 .env.example，把它复制成 .env，并删掉里面的占位行。
5. 后台启动 Studio：pnpm exec mastra dev（默认 http://localhost:4111）
6. 后台启动前端：pnpm dev（默认 http://localhost:3000）
7. 最后统一汇报：两个实际访问地址、src/mastra/agents/weather-agent.ts 是否已生成、Studio 里第一步该点哪里验收、改动过的文件清单，以及所有与上面步骤不一致之处

约束：端口被占就自己换（Next / Mastra 会自动选下一个端口），不要 kill 别人的进程；允许只读探测（如 --help、查端口占用）；不改生成代码、不装 ai-elements、不额外引入 provider / 云服务 / 依赖；不替我 git commit / git push（脚手架自带的 git init 和 initial commit 属正常）；只改上述范围内的文件。`,
    docLinks: [
      {
        title: "Next.js 集成",
        href: "https://mastra.ai/guides/getting-started/next-js",
      },
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
        hint: "API Key 留空时 init 只写 .env.example（内容为 OPENAI_API_KEY=your-api-key），先复制成 .env，再把变量名改成 DEEPSEEK_API_KEY（Mastra 按模型前缀读对应变量）：",
        steps: [
          {
            description: `先进入 ${PROJECT_DIR} 项目目录，把 .env.example 复制成 .env。`,
            command: "cp .env.example .env",
          },
        ],
        code: `DEEPSEEK_API_KEY=sk-...`,
      },
      {
        path: "src/mastra/agents/weather-agent.ts",
        hint: "把示例 agent 的模型换成 DeepSeek（脚手架默认写的是 OpenAI，学员没有那个 key），Studio 里才能真的对话：",
        code: `model: "deepseek/deepseek-flash",`,
      },
    ],
  },
  {
    kind: "project",
    slug: "agent-and-model",
    title: "Agent 与模型",
    summary:
      "定义一个自己的 agent：id、name、instructions、model，注册到 Mastra 入口，然后在 Studio 的 Agents 页（http://localhost:4111/agents）跟它对话。",
    verify: {
      label: "去 Studio 对话",
      description: [
        "打开 http://localhost:4111/agents，选 my-agent",
        "问「你好」→ 中文、简短回答",
        "问「请用英文详细回答」→ 它拒绝，说明 instructions 生效",
      ],
    },
    concepts: [
      "Agent — 一个 agent 就是 id、name 和 instructions，加上 model，用 new Agent({ ... }) 定义",
      "instructions — agent 长期遵守的工作手册：角色、边界、输出要求都写在这里",
      'Model Router — 模型写成 "provider/model" 字符串（如 deepseek/deepseek-flash），Mastra 自动读取对应的环境变量',
      "Mastra 实例 — new Mastra({ agents }) 是应用入口；注册过的 agent 才会出现在 Studio 里",
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
        action: "edit",
        hint: "只加两处，不要整体覆盖 —— 保留脚手架已有的 storage / logger / observability",
        code: `// ① 顶部加一行 import
import { myAgent } from "./agents/my-agent";

// ② 在 new Mastra({ ... }) 的参数里加一项，其余配置保持不动
agents: { myAgent },
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

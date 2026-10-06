import type { DocLink } from "@/lib/doc-link";

export type CommandStep = {
  description: string;
  command: string;
  /** 交互式脚手架时的推荐选项 */
  choices?: string[];
};

export type FileAction = "create" | "replace" | "edit" | "run";

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

/**
 * 局部修改（edit）的代码按编号注释拆块：`// ① …`（顶格）当小标题，后面的代码各自成块、各自可复制。
 * 只认 ①~⑩ 编号，所以代码里普通的说明注释不会被误切；只有一块时返回空数组，调用方整块渲染。
 */
export function splitFileCode(code: string): { label: string; code: string }[] {
  const lines = code.split("\n");
  const blocks: { label: string; lines: string[] }[] = [];

  lines.forEach((line, index) => {
    const isHeading = /^\/\/\s*[①②③④⑤⑥⑦⑧⑨⑩]/.test(line);
    if (isHeading) {
      blocks.push({ label: line.replace(/^\/\/\s*/, "").trim(), lines: [] });
      return;
    }
    if (blocks.length === 0) blocks.push({ label: "", lines: [] });
    blocks[blocks.length - 1].lines.push(line);
  });

  const parts = blocks
    .map((block) => ({ label: block.label, code: block.lines.join("\n").trim() }))
    .filter((block) => block.code.length > 0);

  return parts.length > 1 ? parts : [];
}

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
      kind: "deps";
      id: "deps";
      order: number;
      label: string;
      description: string;
      command: string;
    }
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
  install?: LabProject["install"],
): LabOperation[] {
  const sorted = [...files]
    .filter((file) => file.order != null && file.action != null)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));

  const operations: LabOperation[] = [];
  let order = 1;

  // 需要新装依赖的课：第一步就是装包，别让它藏在文件说明里
  if (install) {
    operations.push({
      kind: "deps",
      id: "deps",
      order: order++,
      label: "装依赖",
      description:
        install.description ??
        `在 ${PROJECT_DIR} 目录执行，安装本课新增的依赖。`,
      command: install.command,
    });
  }

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
      // 同一个文件可能分两步改（如第 4 课先加聊天记忆、再加长期记忆），id 要带上 order
      id: `${file.path}@${file.order}`,
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
  /** 课页 h1：完整标题 */
  title: string;
  /** 左侧菜单用：短标题，不带冒号后的说明 */
  menuTitle: string;
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
  /** 课页 h1：完整标题 */
  title: string;
  /** 左侧菜单用：短标题，不带冒号后的说明 */
  menuTitle: string;
  summary: string;
  /** 可选：本课新增的依赖，会渲染成操作列表的第一步 */
  install?: {
    command: string;
    description?: string;
  };
  /** 可选：课末验收步骤（操作列表的最后一项） */
  verify?: ProjectVerify;
  concepts: string[];
  /** 可选：知识点旁的延伸阅读 */
  conceptArticle?: ConceptArticle;
  files: ProjectFile[];
  docLinks: DocLink[];
};

const ORDER_LABELS = [
  "①",
  "②",
  "③",
  "④",
  "⑤",
  "⑥",
  "⑦",
  "⑧",
  "⑨",
  "⑩",
] as const;

export function getOrderLabel(order: number) {
  return ORDER_LABELS[order - 1] ?? String(order);
}

export function getFileActionLabel(action: FileAction) {
  if (action === "replace") return "覆盖";
  if (action === "edit") return "修改";
  if (action === "run") return "执行";
  return "新建";
}

export function getFileName(path: string) {
  return path.split("/").pop() ?? path;
}

export type NavItem = GuideProject | LabProject;

export const PROJECT_DIR = "my-mastra-app";

export const INIT_STEPS: CommandStep[] = [
  {
    description: "在你选定的目录下创建 Next.js 项目（前端放根 app/，Mastra 放 src/mastra/）。",
    command: `pnpm dlx create-next-app@latest ${PROJECT_DIR} --yes --ts --eslint --tailwind --app --turbopack --import-alias "@/*"`,
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
    menuTitle: "初始化",
    agentPrompt: `创建这个课程的学员项目：一个 Next.js 应用，并在其中初始化 Mastra。

目标位置：<父目录>/${PROJECT_DIR}（不要用当前工作目录，不要建在已有项目的目录里）
DEEPSEEK_API_KEY：<key>（只在本地写进 .env，回复里不要回显）

只有下面两件事需要问我，一次问一个、等我回答再问下一个；我已经说过的就不用问：

1. 建在哪个目录？
2. DEEPSEEK_API_KEY 是多少？

其余全部按下面执行，不要为细节反复找我确认。

执行步骤：

1. 进入 <父目录>，执行 pnpm dlx create-next-app@latest ${PROJECT_DIR} --yes --ts --eslint --tailwind --app --turbopack --import-alias "@/*"
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
          {
        title: "CLI 参考（mastra init）",
        href: "https://mastra.ai/reference/cli/mastra",
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
    menuTitle: "Agent 与模型",
    summary:
      "把空壳 agent 定成你的场景：虚拟宇宙公司官方客服 —— 写清职责与边界，挂上会话记忆，注册到 Mastra 入口，在 Studio 里跟它对话。",
    verify: {
      label: "去 Studio 对话",
      description: [
        "打开 http://localhost:4111/agents，选 support-agent",
        "这是一个虚拟宇宙公司客服 agent，在售商品只有四种：遁天梭、金丝网、S 级飞刀、生命之水",
      ],
    },
    concepts: [
      "`Agent` — `new Agent({ id, name, instructions, model })` 定义 agent；id 用于注册引用",
      "`instructions` — 长期遵循的行为准则",
      "`Memory` — 会话记忆：多轮对话可用",
      "`lastMessages` — 每轮带入上下文的最近消息条数",
      "`Mastra` — `new Mastra({ agents })` 应用入口；注册过的 agent 才出现在 Studio",
    ],
    docLinks: [
      { title: "Agents", href: "https://mastra.ai/docs/agents" },
      {
        title: "Message History",
        href: "https://mastra.ai/docs/memory/message-history",
      },
      { title: "Models", href: "https://mastra.ai/models" },
      {
        title: "DeepSeek Provider",
        href: "https://mastra.ai/models/providers/deepseek",
      },
      { title: "Mastra Studio", href: "https://mastra.ai/docs/studio/overview" },
    ],
    files: [
      {
        path: "src/mastra/agents/support-agent.ts",
        order: 1,
        action: "create",
        hint: "定义 agent：身份 + 工作手册 + 模型 + 会话记忆",
        code: `import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";

// 一个 agent = 身份（id / name）+ 工作手册（instructions）+ 模型（model）+ 会话记忆（memory）
export const supportAgent = new Agent({
  id: "support-agent",
  name: "虚拟宇宙公司客服",
  // instructions 相当于系统提示：写清角色、职责和回答方式，agent 每轮都遵守
  instructions: \`你是虚拟宇宙公司官方客服，负责武器、装备与药剂的退换、修复、运输。您当前正在服务的客户是罗峰先生
- 在售商品只有四种：遁天梭、金丝网、S 级飞刀、生命之水；其它的一律不受理
- 售后规则：P1 签收 7 天内未拆封可退；P2 签收 15 天内质量问题可换新；P3 一年保修期内可修复（耗材不适用）
- 能用上面的清单和规则解决的，直接判，不要麻烦客户
- 中文、简短、专业；政策外的处置一律说「需要主管确认」\`,
  // 模型写成 "provider/model" 字符串，Mastra 会自动读取 DEEPSEEK_API_KEY
  model: "deepseek/deepseek-flash",
  // 会话记忆：把最近 20 条消息带回上下文，多轮对话才接得上
  memory: new Memory({
    options: { lastMessages: 20 },
  }),
});
`,
      },
      {
        path: "src/mastra/index.ts",
        order: 2,
        action: "edit",
        hint: "只加两处，不要整体覆盖 —— 保留脚手架已有的 storage / logger / observability",
        code: `// ① 顶部加一行 import
import { supportAgent } from "./agents/support-agent";

// ② 在 new Mastra({ ... }) 的参数里加一项 supportAgent，其余配置保持不动
agents: { weatherAgent, supportAgent },
`,
      },
    ],
  },
  {
    kind: "project",
    slug: "tools",
    title: "工具调用",
    menuTitle: "工具调用",
    summary:
      "让 agent 会调工具：把售后政策写成一个资格判定工具，模型只负责把客户的话归类，天数与条款交给代码。",
    verify: {
      label: "去 Studio 试工具",
      description: [
        "打开 http://localhost:4111/agents，选 support-agent",
        "这是一个虚拟宇宙公司客服 agent，能查在售商品清单、查订单，并按售后政策判定退换资格",
      ],
    },
    concepts: [
      "`createTool` — 声明工具：`id` / `description` / `inputSchema` / `execute`",
      "`inputSchema` / `outputSchema` — 用 zod 约束参数与返回值",
      "`describe` — 参数说明，写在 zod 里给模型看",
      "`tools` — 声明给 Agent 的工具；何时调用由模型决定",
    ],
    docLinks: [
      { title: "Tools", href: "https://mastra.ai/docs/agents/tools" },
      { title: "Agents", href: "https://mastra.ai/docs/agents" },
      {
        title: "Request Context",
        href: "https://mastra.ai/docs/server/request-context",
      },
          {
        title: "createTool 参考",
        href: "https://mastra.ai/reference/tools/create-tool",
      },
],
    files: [
      {
        path: "src/mastra/data/products.ts",
        order: 1,
        action: "create",
        hint: "在售商品清单 —— 客服对商品名、以及判定规则，都以它为准",
        code: `// 在售商品清单：对商品名、以及判定规则，都以它为准
export type Product = {
  sku: string;
  price: number; // 黑龙币
  category: "主体" | "配件" | "小件" | "耗材";
  repairable: boolean; // 是否适用 P3 修复（耗材无维修价值，不修复；退货与换新照常适用）
  rule: string; // 售后规则摘要：客户只问政策时，照这句答，不必查订单
};

const REPAIRABLE = "7 天内封禁未启可退；15 天内质量问题可换新；一年内可修复";

export const products: Product[] = [
  { sku: "遁天梭", price: 24999, category: "主体", repairable: true, rule: REPAIRABLE },
  { sku: "金丝网", price: 1299, category: "配件", repairable: true, rule: REPAIRABLE },
  { sku: "S 级飞刀", price: 899, category: "小件", repairable: true, rule: REPAIRABLE },
  { sku: "生命之水", price: 399, category: "耗材", repairable: false, rule: "7 天内封禁未启可退；15 天内质量问题可换新；耗材不修复（无维修价值）" },
];
`,
      },
      {
        path: "src/mastra/data/orders.ts",
        order: 2,
        action: "create",
        hint: "先造一份模拟数据 —— 真实项目里换成你的订单库或平台接口（本课不接任何真实平台）",
        code: `// 模拟数据：真实项目里换成你的订单库 / 平台接口
export type Order = {
  orderId: string; // 订单号：对外唯一的凭证，客服只认它
  customer: string; // 客户称呼
  sku: string; // 商品
  price: number; // 黑龙币
  deliveredDaysAgo: number | null; // 签收距今多少天；未签收为 null
  logistics: string;
  logisticsStuckDays: number; // 物流在途停留天数
  address: string; // 收货地址（含个人信息，真实项目要做脱敏）
};

// 客户只有一个（罗峰先生）：这就是一份共享 mock，谁问都是他这 7 条订单
// 时间一律用「距今天数」而不是固定日期：课程任何时候跑，判定结果都一样
// 7 条刻意覆盖全部分支：可退 / 可换 / 保修内 / 超保修 / 未签收 / 超 15 天换新期
export const orders: Order[] = [
  { orderId: "NX-1001", customer: "罗峰先生", sku: "遁天梭", price: 24999, deliveredDaysAgo: 6, logistics: "已签收（星际运输队抵达）", logisticsStuckDays: 0, address: "地球·江南基地市 8 号住所" },
  { orderId: "NX-1002", customer: "罗峰先生", sku: "金丝网", price: 1299, deliveredDaysAgo: 13, logistics: "已签收（星际运输队抵达）", logisticsStuckDays: 0, address: "地球·江南基地市 21 号住所" },
  { orderId: "NX-1003", customer: "罗峰先生", sku: "S 级飞刀", price: 899, deliveredDaysAgo: 420, logistics: "已签收（星际运输队抵达）", logisticsStuckDays: 0, address: "地球·江南基地市 5 号住所" },
  { orderId: "NX-1004", customer: "罗峰先生", sku: "遁天梭", price: 24999, deliveredDaysAgo: 200, logistics: "已签收（星际运输队抵达）", logisticsStuckDays: 0, address: "地球·江南基地市 12 号住所" },
  { orderId: "NX-1005", customer: "罗峰先生", sku: "生命之水", price: 399, deliveredDaysAgo: null, logistics: "运输中（星际运输队）", logisticsStuckDays: 5, address: "地球·江南基地市 3 号仓库" },
  { orderId: "NX-1006", customer: "罗峰先生", sku: "生命之水", price: 399, deliveredDaysAgo: 30, logistics: "已签收（星际运输队抵达）", logisticsStuckDays: 0, address: "地球·江南基地市 6 号住所" },
  { orderId: "NX-1007", customer: "罗峰先生", sku: "生命之水", price: 399, deliveredDaysAgo: 3, logistics: "已签收（星际运输队抵达）", logisticsStuckDays: 0, address: "地球·江南基地市 9 号住所" },
];
`,
      },
      {
        path: "src/mastra/tools/lookup-tool.ts",
        order: 3,
        action: "create",
        hint: "两个查询类工具：查在售清单（listProducts）、查订单（findOrders）",
        code: `import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { orders } from "../data/orders";
import { products } from "../data/products";

// 查在售清单：客户说不清是哪件商品、或只问商品政策时用它
export const listProducts = createTool({
  id: "list-products",
  description:
    "列出在售商品清单（名称 / 价格 / 类别 / 售后规则 / 是否可修复）。用途：① 客户说的是简称（「我的刀」）时，用它对上最接近的那一件；② 客户只问某件商品的政策（能不能退 / 换 / 修）时，按清单里的 rule 回答，不必查订单。客户说的商品不在这份清单里，就是不在售",
  // 没有入参也要给一个空对象 schema
  inputSchema: z.object({}),
  outputSchema: z.object({
    products: z.array(
      z.object({
        sku: z.string(),
        price: z.number(),
        category: z.string(),
        repairable: z.boolean(),
        rule: z.string(),
      }),
    ),
  }),
  execute: async () => ({ products }),
});

// 查订单：客户不记得订单号时用它 —— 不要让客户去背订单号
// 商品名按「包含」匹配（去掉空格、忽略大小写），所以「刀」「飞刀」「S 级飞刀」都能命中同一件商品
const normalizeSku = (value: string) => value.replace(/\\s+/g, "").toLowerCase();

export const findOrders = createTool({
  id: "find-orders",
  description:
    "查询订单（可按商品名筛选，商品名不确定就留空），返回候选订单（订单号 / 商品 / 签收天数 / 物流）。查到一条直接调 checkReturnEligibility 判定；多条说不清时才复述让客户确认",
  inputSchema: z.object({
    sku: z.string().optional().describe("商品名，例如 生命之水；不确定就留空"),
  }),
  outputSchema: z.object({
    orders: z.array(
      z.object({
        orderId: z.string(),
        customer: z.string(),
        sku: z.string(),
        deliveredDaysAgo: z.number().nullable(),
        logistics: z.string(),
      }),
    ),
    hint: z.string().optional().describe("没匹配上时的提示（可用商品名有哪些）"),
  }),
  execute: async ({ sku }) => {
    const keyword = sku ? normalizeSku(sku) : "";
    const matched = orders.filter((item) => {
      if (!keyword) return true;
      const name = normalizeSku(item.sku);
      return name.includes(keyword) || keyword.includes(name);
    });

    return {
      orders: matched.map((item) => ({
        orderId: item.orderId,
        customer: item.customer,
        sku: item.sku,
        deliveredDaysAgo: item.deliveredDaysAgo,
        logistics: item.logistics,
      })),
      // 没匹配上时把在售商品报给它，免得它换着关键字一个个试
      ...(keyword && matched.length === 0
        ? {
            hint: \`没有匹配「\${sku}」的订单；在售商品只有：\${[...new Set(orders.map((item) => item.sku))].join(" / ")}\`,
          }
        : {}),
    };
  },
});
`,
      },
      {
        path: "src/mastra/tools/return-tool.ts",
        order: 4,
        action: "create",
        hint: "把售后政策写成一个确定性工具（脚手架自带的 weather-tool.ts 保持不动）",
        code: `import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { orders } from "../data/orders";
import { products } from "../data/products";

// outputSchema：返回值也约束住，后面拿到的是结构化数据
const outputSchema = z.object({
  orderId: z.string(),
  sku: z.string(),
  daysSinceDelivery: z.number().optional(),
  decision: z.enum(["refund", "exchange", "repair", "reject", "pending"]),
  reason: z.string(),
});

// 判定结果的类型：execute 显式声明返回它，否则字面量会被放宽成 string、跟 schema 对不上
type Verdict = z.infer<typeof outputSchema>;

// 工具必须用 createTool 定义（用裸对象写不会被执行）
export const checkReturnEligibility = createTool({
  id: "check-return-eligibility",
  description:
    "按售后政策判断订单里的商品能否退货、换新或修复：P1 签收 7 天内封禁未启可退；P2 签收 15 天内质量问题可换；P3 一年保修期内可修（耗材不适用修复）",
  // inputSchema：模型要填的参数，用 zod 约束，并写 describe 帮模型填对
  inputSchema: z.object({
    orderId: z.string().describe("订单号，例如 NX-1002 —— 正常流程里由 findOrders 查到并确认后再传"),
    issue: z
      .enum(["unopened", "quality", "other"])
      .default("quality")
      .describe("问题类型：unopened 未拆封、quality 坏了 / 故障、other 其他；客户说「坏了」就按 quality"),
  }),
  outputSchema,
  // execute 只有这一种签名：(input, context)；用不到上下文时可省略第二个参数
  execute: async ({ orderId, issue }): Promise<Verdict> => {
    // 天数与条款是确定性的事，交给代码；模型只负责把客户的话归成 issue
    const matched = orders.find((item) => item.orderId === orderId);
    // 教学兜底：订单号没匹配上时，优先按客户说的商品挑示例订单，其次才退回第一条
    // （真实项目里应该返回「查不到」并请客户核对订单号）
    // 教学兜底：订单号对不上就拿示例订单演示，方便反复试
    // （真实项目里应该返回「查不到」并请客户核对）
    const order = matched ?? orders[1];
    // 商品类别也来自清单：耗材不适用 P2 换新
    const product = products.find((item) => item.sku === order.sku);
    const note = matched
      ? ""
      : "（未匹配到该订单号，先按示例订单 " + order.orderId + " 演示）";
    if (order.deliveredDaysAgo === null) {
      return {
        orderId: order.orderId,
        sku: order.sku,
        decision: "pending",
        reason:
          note +
          "该订单还没签收（物流：" +
          order.logistics +
          "，已停留 " +
          order.logisticsStuckDays +
          " 天），先查运输进度再谈售后",
      };
    }
    // 数据里存的就是「签收距今天数」，判定不依赖系统时间，结果永远可复现
    const days = order.deliveredDaysAgo;
    if (issue === "unopened" && days <= 7) {
      return {
        orderId: order.orderId,
        sku: order.sku,
        daysSinceDelivery: days,
        decision: "refund",
        reason: note + "签收 " + days + " 天、封禁未启，符合 P1：全额退款，星际运费由商家承担",
      };
    }
    if (issue === "unopened") {
      // 过了 7 天：无理由退货窗口关闭，但没拆封不等于不能处理质量问题
      return {
        orderId: order.orderId,
        sku: order.sku,
        daysSinceDelivery: days,
        decision: "reject",
        reason:
          note +
          "签收 " + days + " 天，已过 P1 的 7 天无理由窗口，未拆封也不能退；如有质量问题请提供故障记录，我再按 P2 / P3 处理",
      };
    }
    if (issue === "quality" && days <= 15) {
      return {
        orderId: order.orderId,
        sku: order.sku,
        daysSinceDelivery: days,
        decision: "exchange",
        reason: note + "签收 " + days + " 天、质量问题，符合 P2：免费换新（需提供故障记录）",
      };
    }
    if (days <= 365) {
      if (product && !product.repairable) {
        // 耗材：换新窗口（15 天）已过，又没有维修价值
        return {
          orderId: order.orderId,
          sku: order.sku,
          daysSinceDelivery: days,
          decision: "reject",
          reason:
            note +
            "签收 " + days + " 天：" + order.sku + " 属耗材，无维修价值、无法修复；质量问题可在签收 15 天内换新，未拆封可在 7 天内退货",
        };
      }
      return {
        orderId: order.orderId,
        sku: order.sku,
        daysSinceDelivery: days,
        decision: "repair",
        reason: note + "签收 " + days + " 天，已过 7 / 15 天窗口，但在 P3 一年保修期内：非人为损坏免费修复",
      };
    }
    return {
      orderId: order.orderId,
      sku: order.sku,
      daysSinceDelivery: days,
      decision: "reject",
      reason: note + "签收 " + days + " 天，已超出 P3 的一年保修期：只能付费修复",
    };
  },
});
`,
      },
      {
        path: "src/mastra/agents/support-agent.ts",
        order: 5,
        action: "replace",
        hint: "把工具交给 agent",
        code: `import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { listProducts, findOrders } from "../tools/lookup-tool";
import { checkReturnEligibility } from "../tools/return-tool";

export const supportAgent = new Agent({
  id: "support-agent",
  name: "虚拟宇宙公司客服",
  instructions: \`你是虚拟宇宙公司官方客服，负责武器、装备与药剂的退换、修复、运输。您当前正在服务的客户是罗峰先生
- listProducts：查在售商品与售后政策
- findOrders：查订单（可按商品名筛）
- checkReturnEligibility：判退换资格，不要自己推算天数
- 能用工具解决的，优先用工具，不要麻烦客户
- 中文、简短、专业；政策外的处置一律说「需要主管确认」\`,
  model: "deepseek/deepseek-flash",
  // 把工具交给 agent，由模型决定什么时候调用
  tools: { listProducts, findOrders, checkReturnEligibility },
  // 会话记忆：第 2 课已加，这里保持一致
  memory: new Memory({
    options: { lastMessages: 20 },
  }),
});
`,
      },
    ],
  },
  {
    kind: "project",
    slug: "memory-conversation",
    title: "工作记忆",
    menuTitle: "工作记忆",
    summary:
      "给 agent 加长期记忆：把正在处理的这单（商品 / 订单号 / 问题 / 已答复方案）写进工作记忆，新建对话也接着办。",
    verify: {
      label: "去 Studio 试记忆",
      description: [
        "打开 http://localhost:4111/agents，选 support-agent",
        "这是一个带工作记忆的客服 agent，新建对话后仍记得正在处理的这一单：订单号、商品、问题、已答复的方案",
      ],
    },
    concepts: [
      "`workingMemory` — 跨对话保留的结构化档案",
      "`schema` — 用 zod 定义档案字段；更新是合并语义",
      "`updateWorkingMemory` — 写档案的内置工具（开启工作记忆后自动挂上）",
    ],
    docLinks: [
      {
        title: "Working Memory",
        href: "https://mastra.ai/docs/memory/working-memory",
      },
      { title: "Memory 总览", href: "https://mastra.ai/docs/memory/overview" },
      { title: "Storage", href: "https://mastra.ai/docs/storage" },
          {
        title: "另一种记忆：Observational Memory",
        href: "https://mastra.ai/docs/memory/observational-memory",
      },
],
    files: [
      {
        path: "src/mastra/agents/support-agent.ts",
        order: 1,
        action: "replace",
        hint: "加长期记忆：工作记忆 + 字段（会话记忆第 2 课已经有了）",
        code: `import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { z } from "zod";
import { listProducts, findOrders } from "../tools/lookup-tool";
import { checkReturnEligibility } from "../tools/return-tool";

// 工作记忆的字段用 zod 约束：agent 只填该填的，读出来是结构化数据
const customerProfile = z.object({
  sku: z.string().optional().describe("涉及的装备或药剂，例如 S 级飞刀"),
  orderId: z.string().optional().describe("订单号，例如 NX-1002"),
  issue: z.string().optional().describe("正在处理的售后问题，例如 金丝断裂"),
  promise: z.string().optional().describe("已经答复客户的处理方案，例如 已告知可换新（P2）"),
});

export const supportAgent = new Agent({
  id: "support-agent",
  name: "虚拟宇宙公司客服",
  instructions: \`你是虚拟宇宙公司官方客服，负责武器、装备与药剂的退换、修复、运输。您当前正在服务的客户是罗峰先生
- listProducts：查在售商品与售后政策
- findOrders：查订单（可按商品名筛）
- checkReturnEligibility：判退换资格，不要自己推算天数
- 能用工具解决的，优先用工具，不要麻烦客户
- 客户报的商品、订单号、问题和已答复的方案，用 updateWorkingMemory 记下来，之后不要重复问
- 已经答复过的方案不要改口
- 中文、简短、专业；政策外的处置一律说「需要主管确认」\`,
  model: "deepseek/deepseek-flash",
  tools: { listProducts, findOrders, checkReturnEligibility },
  // 记忆：会话记忆 + 这个客户的档案
  memory: new Memory({
    options: {
      lastMessages: 20,
      workingMemory: {
        enabled: true,
        schema: customerProfile,
      },
    },
  }),
});
`,
      },
    ],
  },
  {
    kind: "project",
    slug: "memory-recall",
    title: "语义召回",
    menuTitle: "语义召回",
    summary:
      "让 agent 记得更久：把历史向量化做语义召回，按 token 预算裁剪上下文，并用 thread / resource 两个 id 决定它记得谁、记得哪一段。",
    install: {
      command: "pnpm add @ai-sdk/openai-compatible@^2",
      description: "在 my-mastra-app 目录执行 —— 嵌入模型走硅基流动的兼容端点：装它的 AI SDK provider，并把 SILICONFLOW_API_KEY 写进 .env。注意装 2.x（3.x 对应更新的 AI SDK 规范，Mastra 只认到 v3）。",
    },
    verify: {
      label: "去 Studio 试召回",
      description: [
        "打开 http://localhost:4111/agents，选 support-agent",
        "这是一个已启用语义召回的客服 agent，在一条对话里说过的细节，换对话后仍能接得上",
      ],
    },
    concepts: [
      "`semanticRecall` — 每轮按语义召回历史消息（默认关闭）",
      "`vector` / `embedder` — 向量库（`LibSQLVector`）与向量化模型（`BAAI/bge-large-zh-v1.5`）",
      "`topK` / `messageRange` — 召回条数 / 命中消息前后各带几条",
      "`messageHistory.maxTokens` — 按 token 预算裁剪历史",
      "`embedder.ts` / `db.ts` — 嵌入模型与库路径各只建一处；`DB_URL` 用绝对路径，两个进程才共用一份库",
    ],
    docLinks: [
      {
        title: "Semantic Recall",
        href: "https://mastra.ai/docs/memory/semantic-recall",
      },
      { title: "嵌入模型（Embed）", href: "https://mastra.ai/reference/rag/embeddings" },
      {
        title: "可换的向量库",
        href: "https://mastra.ai/reference/rag/vector-databases",
      },
      { title: "Memory 类参考", href: "https://mastra.ai/reference/memory/memory-class" },
      { title: "LibSQL 向量库", href: "https://mastra.ai/reference/vectors/libsql" },
    ],
    files: [
      {
        path: "src/mastra/db.ts",
        order: 1,
        action: "create",
        hint: "把数据库路径收成绝对路径：相对路径按各进程的工作目录解析，两个进程会各建一份库（入库写 A、检索查 B）",
        code: `import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// 数据库只留一个文件。
// 写相对路径（file:./mastra.db）时，它按**各进程的工作目录**解析：mastra dev 的子进程
// 跑在 src/mastra/public（或 .mastra/output）下、Next 应用跑在项目根 —— 于是各建一份库，
// 入库写进 A、检索查 B，policySearch 永远返回空（还不报错，很难发现）。
// 这里从本文件位置向上找项目根（同时有 package.json 与 src/mastra 的那一层），
// 算出绝对路径：无论哪个进程、从哪个目录启动，都指向同一个 mastra.db。
// 想显式指定就设 MASTRA_DB_FILE（绝对路径）。
function findProjectRoot(from: string): string {
  let dir = from;
  for (let i = 0; i < 10; i += 1) {
    const hasApp = existsSync(path.join(dir, "package.json")) && existsSync(path.join(dir, "src", "mastra"));
    if (hasApp) return dir;
    const up = path.dirname(dir);
    if (up === dir) break;
    dir = up;
  }
  return process.cwd();
}

const dbFile = process.env.MASTRA_DB_FILE
  ? path.resolve(process.env.MASTRA_DB_FILE)
  : path.join(findProjectRoot(path.dirname(fileURLToPath(import.meta.url))), "mastra.db");

export const DB_URL = "file:" + dbFile;`,
      },
      {
        path: "src/mastra/embedder.ts",
        order: 2,
        action: "create",
        hint: "新建共用的嵌入模型模块：这一课的语义召回与后面 RAG 的检索都用它 —— 别在两个文件里各写一份 provider",
        code: `import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// 嵌入模型走硅基流动的 OpenAI 兼容端点：中文效果好，也不用在本地下载模型
// 记忆检索（semanticRecall）与政策检索（RAG）共用这一个 —— 不要在两个文件里各建一份
const siliconflow = createOpenAICompatible({
  name: "siliconflow",
  baseURL: "https://api.siliconflow.cn/v1",
  apiKey: process.env.SILICONFLOW_API_KEY,
});

export const embedder = siliconflow.embeddingModel("BAAI/bge-large-zh-v1.5");

// 输出维度：建向量索引、建表都要用同一个值（换模型 = 维度变 = 旧向量要重建）
export const EMBED_DIM = 1024;`,
      },
      {
        path: "src/mastra/agents/support-agent.ts",
        order: 3,
        action: "replace",
        hint: "只改 memory 这一段（加 vector + embedder + 语义召回）；数据库连接由 src/mastra/index.ts 的 storage 提供，这个文件本课不用动",
        code: `import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLVector } from "@mastra/libsql";
import { z } from "zod";
import { listProducts, findOrders } from "../tools/lookup-tool";
import { checkReturnEligibility } from "../tools/return-tool";
import { embedder } from "../embedder";
import { DB_URL } from "../db";

const customerProfile = z.object({
  sku: z.string().optional().describe("涉及的装备或药剂，例如 S 级飞刀"),
  orderId: z.string().optional().describe("装备或配件订单号，例如 NX-1002"),
  issue: z.string().optional().describe("正在处理的售后问题，例如 金丝断裂"),
  promise: z.string().optional().describe("已经答复客户的处理方案，例如 已告知可换新（P2）"),
});

export const supportAgent = new Agent({
  id: "support-agent",
  name: "虚拟宇宙公司客服",
  instructions: \`你是虚拟宇宙公司官方客服，负责武器、装备与药剂的退换、修复、运输。您当前正在服务的客户是罗峰先生
- listProducts：查在售商品与售后政策
- findOrders：查订单（可按商品名筛）
- checkReturnEligibility：判退换资格，不要自己推算天数
- 能用工具解决的，优先用工具，不要麻烦客户
- 客户报的商品、订单号、问题和已答复的方案，用 updateWorkingMemory 记下来，之后不要重复问
- 已经答复过的方案不要改口
- 中文、简短、专业；政策外的处置一律说「需要主管确认」\`,
  model: "deepseek/deepseek-flash",
  tools: { listProducts, findOrders, checkReturnEligibility },
  memory: new Memory({
    // 向量和消息存同一个本地库文件（路径来自 src/mastra/db.ts，绝对路径）
    vector: new LibSQLVector({ id: "mastra-vector", url: DB_URL }),
    // 嵌入模型：共用 src/mastra/embedder.ts 里那一个（硅基流动 bge-large-zh-v1.5，1024 维，中文）
    embedder,
    options: {
      // 条数上限 + token 预算，两个都写就是双重上限
      lastMessages: 20,
      messageHistory: { maxTokens: 8000 },
      // 语义召回：跨对话捞回相关旧消息；topK 召回几条、messageRange 每条前后带几条、scope 跨不跨对话
      semanticRecall: { topK: 3, messageRange: 2, scope: "resource" },
      workingMemory: { enabled: true, schema: customerProfile },
    },
  }),
});`,
      },
    ],
  },
  {
    kind: "project",
    slug: "chat-ui",
    title: "接入前端：用 AI SDK UI 聊天",
    menuTitle: "接入前端",
    summary:
      "给 agent 配一个网页聊天界面：加一个 API 路由把 agent 的输出转成 AI SDK 的消息流，前端把正文、思考、工具调用都渲染出来。",
    install: {
      command:
        "pnpm add @mastra/ai-sdk@latest @ai-sdk/react ai react-markdown remark-gfm",
      description:
        "在 my-mastra-app 目录执行 —— 把 agent 的输出转成 AI SDK 的消息流；react-markdown + remark-gfm 渲染正文里的 markdown（表格靠它）。",
    },
    verify: {
      label: "打开页面验证",
      description: [
        "打开 http://localhost:3000，聊一句「我的刀能退吗」",
        "流式过程中能看到思考块、工具卡（入参 / 结果）与 markdown 表格；刷新页面历史还在",
        "这是一个接在自定义前端上的客服 agent，不依赖 Studio",
      ],
    },
    concepts: [
      "`handleChatStream` — 把一次 agent 运行转成 AI SDK 消息流",
      "`getMemory` / `toAISdkMessages` — 刷新时读回历史、转成 UIMessage 水合",
      "`useChat` / `DefaultChatTransport` — 指定 `/api/generate`：POST 发消息、GET 水合、DELETE 清空",
      "`UIMessage.parts` — 消息是 part 数组：text / reasoning / tool-*",
      "`sendReasoning` — handleChatStream 的选项，默认 false",
    ],
    docLinks: [
      { title: "Vercel AI SDK 官网", href: "https://ai-sdk.dev" },
      {
        title: "Mastra 侧的 AI SDK 参考",
        href: "https://mastra.ai/reference/ai-sdk/overview",
      },
      {
        title: "handleChatStream() 参考",
        href: "https://mastra.ai/reference/ai-sdk/handle-chat-stream",
      },
      { title: "recall 参考", href: "https://mastra.ai/reference/memory/recall" },
      {
        title: "useChat",
        href: "https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat",
      },
    ],
    files: [
      {
        path: "app/api/generate/route.ts",
        order: 1,
        action: "create",
        hint: "路径必须是 /api/generate（下面的 app/page.tsx 用 useChat 调它）。注意 RESOURCE_ID 固定成 web-user：页面和 Studio 用的是两套 resource，记忆不互通（多客户时换成真实客户 id）。若页面 500、报 \"@duckdb/node-bindings-<平台>\" 之类的 Module not found：模板自带的 DuckDB 是原生模块（按平台分包），Next 打包会把每个平台的分支都当依赖去解析 —— 在 next.config.ts 加 serverExternalPackages: [\"@mastra/duckdb\", \"@duckdb/node-api\", \"@duckdb/node-bindings\"]，重启 next dev 即可",
        code: `import { handleChatStream } from "@mastra/ai-sdk";
import { toAISdkMessages } from "@mastra/ai-sdk/ui";
import { createUIMessageStreamResponse } from "ai";
import { NextResponse } from "next/server";
import { mastra } from "@/src/mastra";

// 当前用户：多用户/多端时换成一个真实用户 id，就是记忆的隔离边界
const RESOURCE_ID = "web-user";
const DEFAULT_THREAD = "default";

// POST：把 agent 的输出转成 AI SDK 的消息流，页面用的就是这个协议
export async function POST(req: Request) {
  const params = await req.json();

  const stream = await handleChatStream({
    mastra,
    agentId: "support-agent",
    // 与安装的 AI SDK 大版本对齐（官方 Next.js 指南写的是 v7）
    version: "v7",
    // 默认 false：思考不进流
    sendReasoning: true,
    params: {
      ...params,
      // 页面带来的 chatId 当会话 id
      memory: {
        ...params.memory,
        thread: params.chatId ?? DEFAULT_THREAD,
        resource: RESOURCE_ID,
      },
    },
  });

  return createUIMessageStreamResponse({ stream });
}

// GET：刷新页面时把历史读回来（页面首屏会调它）
export async function GET(req: Request) {
  const chatId =
    new URL(req.url).searchParams.get("chatId") ?? DEFAULT_THREAD;
  const memory = await mastra.getAgentById("support-agent").getMemory();

  const response = await memory?.recall({
    threadId: chatId,
    resourceId: RESOURCE_ID,
  });

  return NextResponse.json({
    messages: toAISdkMessages(response?.messages ?? [], { version: "v7" }),
  });
}

// DELETE：页面的「清空」按钮调它，把这条会话从库里删掉
export async function DELETE(req: Request) {
  const chatId =
    new URL(req.url).searchParams.get("chatId") ?? DEFAULT_THREAD;
  const memory = await mastra.getAgentById("support-agent").getMemory();

  await memory?.deleteThread(chatId);
  return NextResponse.json({ ok: true });
}
`,
      },
      {
        path: "app/page.tsx",
        order: 2,
        action: "create",
        hint: "前端页面：useChat + DefaultChatTransport 消费 /api/generate；遍历 message.parts，把正文（markdown）、思考（折叠块）、工具调用（入参 / 结果）分别渲染出来；含刷新水合（GET）与清空对话（DELETE）",
        code: `"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type UIMessage } from "ai";
import {
  useEffect,
  useRef,
  useState,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const CHAT_ID = "default";

/* ============================ 图标（内联 SVG） ============================ */

function IconChevron({ open, className = "" }: { open: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={\`\${className} transition-transform duration-200 \${open ? "rotate-90" : ""}\`}
    >
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function IconThinking({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className={className}>
      <path d="M12 3l1.7 5.6L19 10l-5.3 1.4L12 17l-1.7-5.6L5 10l5.3-1.4L12 3z" />
    </svg>
  );
}

function IconTool({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="7" y="7" width="10" height="10" rx="2.5" />
      <path d="M10 3v4M14 3v4M10 17v4M14 17v4M3 10h4M3 14h4M17 10h4M17 14h4" />
    </svg>
  );
}

function IconAlert({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M12 4.5l8.5 15h-17l8.5-15z" />
      <path d="M12 10v4M12 16.5h.01" />
    </svg>
  );
}

/* ============================ 折叠卡片外壳 ============================ */

function Collapsible({
  icon,
  title,
  hint,
  tone = "neutral",
  defaultOpen = false,
  children,
}: {
  icon: ReactNode;
  title: ReactNode;
  hint?: ReactNode;
  tone?: "neutral" | "error";
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="-mx-1 flex w-full items-center gap-2 rounded-lg px-1 py-1.5 text-left hover:bg-zinc-50"
      >
        <span className={tone === "error" ? "text-red-500" : "text-zinc-400"}>{icon}</span>
        <span className="truncate text-[15px] text-zinc-700">{title}</span>
        <span className="ml-auto flex shrink-0 items-center gap-2 pl-2">
          {hint}
          <IconChevron open={open} className="size-4 text-zinc-300" />
        </span>
      </button>
      {open && <div className="pt-1.5">{children}</div>}
    </div>
  );
}

/* ============================ 思考过程 ============================ */

function ReasoningBlock({ text, streaming }: { text: string; streaming: boolean }) {
  return (
    <Collapsible
      icon={<IconThinking className="size-[18px]" />}
      title="思考"
      hint={streaming ? <span className="text-xs text-zinc-300">思考中…</span> : undefined}
    >
      <p className="whitespace-pre-wrap pl-6 text-[15px] leading-7 text-zinc-600">{text}</p>
    </Collapsible>
  );
}

/* ============================ 工具调用 ============================ */

type ToolPartLike = {
  type: string;
  state?: string;
  input?: unknown;
  output?: unknown;
  errorText?: string;
};

function formatValue(value: unknown): string {
  if (value === undefined) return "（还没有）";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

function statusOf(state?: string) {
  switch (state) {
    case "output-available":
      return { label: "完成", tone: "ok" as const };
    case "output-error":
      return { label: "失败", tone: "error" as const };
    case "input-streaming":
      return { label: "参数生成中", tone: "busy" as const };
    default:
      return { label: "调用中", tone: "busy" as const };
  }
}

function ToolCard({ part }: { part: ToolPartLike }) {
  const name = part.type.replace(/^tool-/, "");
  const { label, tone } = statusOf(part.state);
  const hasError = Boolean(part.errorText);
  const hasOutput = part.output !== undefined;

  // 出错只显示错误；正常则「入参 + 结果」都显示（还没出结果时只显示入参）
  const blocks: { label?: string; value: string }[] = hasError
    ? [{ value: part.errorText ?? "" }]
    : hasOutput
      ? [
          { label: "入参", value: formatValue(part.input) },
          { label: "结果", value: formatValue(part.output) },
        ]
      : [{ value: formatValue(part.input) }];

  return (
    <Collapsible
      tone={hasError ? "error" : "neutral"}
      icon={
        hasError ? <IconAlert className="size-[18px]" /> : <IconTool className="size-[18px]" />
      }
      title={name}
      hint={tone === "busy" ? <span className="text-xs text-zinc-300">{label}…</span> : undefined}
    >
      <div className="space-y-2">
        {blocks.map((block, index) => (
          <div key={index}>
            {block.label && (
              <p className="mb-1 pl-1 text-xs text-zinc-400">{block.label}</p>
            )}
            <pre
              className={\`max-h-80 overflow-auto whitespace-pre-wrap break-words rounded-xl px-4 py-3 font-mono text-[13px] leading-6 \${
                hasError
                  ? "bg-red-50 text-red-700"
                  : "bg-zinc-50 text-zinc-700 ring-1 ring-zinc-100"
              }\`}
            >
              {block.value}
            </pre>
          </div>
        ))}
      </div>
    </Collapsible>
  );
}

/* ============================ markdown ============================ */

function TableBlock({ children }: { children?: ReactNode }) {
  const ref = useRef<HTMLTableElement>(null);
  const [copied, setCopied] = useState(false);

  function copyAsMarkdown() {
    const table = ref.current;
    if (!table) return;
    const rows = Array.from(table.querySelectorAll("tr")).map((row) =>
      Array.from(row.querySelectorAll("th, td")).map((cell) =>
        (cell.textContent ?? "").trim().replace(/\\s+/g, " "),
      ),
    );
    if (rows.length === 0) return;
    const [header, ...body] = rows;
    const markdown = [
      \`| \${header.join(" | ")} |\`,
      \`| \${header.map(() => "---").join(" | ")} |\`,
      ...body.map((row) => \`| \${row.join(" | ")} |\`),
    ].join("\\n");
    void navigator.clipboard?.writeText(markdown);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="my-3">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={copyAsMarkdown}
          className="mb-1 rounded-md px-2 py-0.5 text-xs text-zinc-400 hover:bg-zinc-50 hover:text-zinc-600"
        >
          {copied ? "已复制" : "复制表格"}
        </button>
      </div>
      <div className="overflow-hidden rounded-xl border border-zinc-200">
        <div className="overflow-x-auto">
          <table ref={ref} className="w-full border-collapse text-[15px]">
            {children}
          </table>
        </div>
      </div>
    </div>
  );
}

const markdownComponents: Components = {
  p: ({ children }) => <p className="my-2 leading-7 first:mt-0 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
  ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
  li: ({ children }) => <li className="leading-7">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-blue-600 underline underline-offset-2"
    >
      {children}
    </a>
  ),
  h1: ({ children }) => <h3 className="mt-4 mb-2 text-base font-semibold">{children}</h3>,
  h2: ({ children }) => <h3 className="mt-4 mb-2 text-base font-semibold">{children}</h3>,
  h3: ({ children }) => <h4 className="mt-3 mb-1.5 text-sm font-semibold">{children}</h4>,
  strong: ({ children }) => <strong className="font-semibold text-zinc-900">{children}</strong>,
  blockquote: ({ children }) => (
    <blockquote className="my-3 border-l-2 border-zinc-200 pl-3 text-zinc-600">
      {children}
    </blockquote>
  ),
  hr: () => <hr className="my-4 border-zinc-100" />,
  pre: ({ children }) => (
    <pre className="my-3 overflow-x-auto rounded-lg bg-zinc-900 px-3 py-2.5 font-mono text-[12.5px] leading-6 text-zinc-100">
      {children}
    </pre>
  ),
  code: ({ className, children }) => {
    const isBlock = typeof className === "string" && className.startsWith("language-");
    if (isBlock) return <code className="font-mono">{children}</code>;
    return (
      <code className="rounded bg-zinc-100 px-1 py-0.5 font-mono text-[0.85em] text-zinc-800">
        {children}
      </code>
    );
  },
  table: ({ children }) => <TableBlock>{children}</TableBlock>,
  thead: ({ children }) => <thead className="text-zinc-400">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-zinc-100">{children}</tbody>,
  tr: ({ children }) => <tr>{children}</tr>,
  th: ({ children }) => (
    <th className="whitespace-nowrap border-b border-zinc-100 px-4 py-2.5 text-left text-[13px] font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-4 py-2.5 align-top">{children}</td>,
};

function Markdown({ children }: { children: string }) {
  return (
    <div className="text-[15px] leading-7 text-zinc-800">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

/* ============================ 消息 ============================ */

function AssistantMessage({ message }: { message: UIMessage }) {
  return (
    <div className="w-full space-y-2">
      {message.parts.map((part, index) => {
        if (part.type === "text") {
          if (!part.text.trim()) return null;
          return <Markdown key={index}>{part.text}</Markdown>;
        }
        if (part.type === "reasoning") {
          if (!part.text.trim()) return null;
          return (
            <ReasoningBlock
              key={index}
              text={part.text}
              streaming={part.state === "streaming"}
            />
          );
        }
        if (part.type.startsWith("tool-")) {
          return <ToolCard key={index} part={part as unknown as ToolPartLike} />;
        }
        if (part.type === "step-start") {
          return <div key={index} className="my-2 h-px bg-zinc-100" />;
        }
        return null;
      })}
    </div>
  );
}

/* ============================ 页面 ============================ */

export default function Home() {
  const { messages, setMessages, sendMessage, status, stop, error } = useChat({
    id: CHAT_ID,
    transport: new DefaultChatTransport({
      api: "/api/generate",
      body: { chatId: CHAT_ID },
      fetch: async (input, init) => {
        const res = await fetch(input, init);
        if (res.status === 503) {
          const data = await res.json().catch(() => ({}));
          throw new Error(
            typeof data.error === "string" ? data.error : "请先完成初始化",
          );
        }
        return res;
      },
    }),
  });
  const [input, setInput] = useState("");
  const loading = status === "streaming" || status === "submitted";
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(\`/api/generate?chatId=\${CHAT_ID}\`)
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.messages) && data.messages.length > 0) {
          setMessages(data.messages);
        }
      })
      .catch(() => {});
  }, [setMessages]);

  // 新内容进来时贴着底部滚动（Studio 也是这个行为）
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages, status]);

  // 清空记录：服务端删掉存档，本地消息也清掉，界面立刻变空
  async function handleClear() {
    await fetch("/api/generate?chatId=" + CHAT_ID, { method: "DELETE" });
    setMessages([]);
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8 font-sans">
      <main className="flex min-h-0 w-full max-w-3xl flex-1 flex-col gap-4">
        <header className="flex shrink-0 items-start justify-between gap-4">
          <div className="space-y-1">
            <h1 className="text-xl font-semibold tracking-tight">虚拟宇宙公司 · 客服</h1>
            <p className="text-sm text-zinc-500">
              对话存在 Mastra memory 里（thread: {CHAT_ID}），刷新自动恢复。
            </p>
          </div>
          <button
            type="button"
            onClick={handleClear}
            disabled={messages.length === 0 || loading}
            className="shrink-0 rounded-lg border border-zinc-200 px-3 py-1.5 text-sm text-zinc-600 hover:bg-zinc-50 disabled:opacity-50"
          >
            清空记录
          </button>
        </header>

        <div
          ref={scrollRef}
          className="min-h-[280px] flex-1 overflow-y-auto rounded-xl border border-zinc-200 bg-white px-4 py-5"
        >
          {messages.length === 0 ? (
            <p className="text-sm text-zinc-400">
              发送第一条消息开始对话，比如「我这单能退吗」
            </p>
          ) : (
            <ul className="space-y-6">
              {messages.map((message) => (
                <li key={message.id}>
                  {message.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-zinc-900 px-3.5 py-2 text-sm leading-6 text-white">
                        {message.parts.map((part, index) =>
                          part.type === "text" ? (
                            <span key={index}>{part.text}</span>
                          ) : null,
                        )}
                      </div>
                    </div>
                  ) : (
                    <AssistantMessage message={message} />
                  )}
                </li>
              ))}
              {loading && (
                <li className="flex items-center gap-2 text-sm text-zinc-400">
                  <span className="size-1.5 animate-pulse rounded-full bg-zinc-400" />
                  正在生成…
                </li>
              )}
            </ul>
          )}
        </div>

        {error && <p className="shrink-0 text-sm text-red-600">{error.message}</p>}

        <form
          className="shrink-0 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!input.trim() || loading) return;
            sendMessage({ text: input.trim() });
            setInput("");
          }}
        >
          <textarea
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => {
              if (event.nativeEvent.isComposing) return;
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                event.currentTarget.form?.requestSubmit();
              }
            }}
            rows={2}
            placeholder="输入消息…（Enter 发送，Shift + Enter 换行）"
            className="w-full resize-none rounded-xl border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
          />
          <div className="flex gap-2">
            <SendButton type="submit" disabled={loading || !input.trim()}>
              {loading ? "回复中…" : "发送"}
            </SendButton>
            {loading && (
              <SendButton
                type="button"
                variant="ghost"
                onClick={() => stop()}
              >
                停止
              </SendButton>
            )}
          </div>
        </form>
      </main>
    </div>
  );
}

function SendButton({
  variant = "solid",
  className = "",
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "solid" | "ghost" }) {
  const base =
    "rounded-lg px-4 py-2 text-sm font-medium disabled:opacity-50 transition-colors";
  const styles =
    variant === "solid"
      ? "bg-zinc-900 text-white hover:bg-zinc-800"
      : "border border-zinc-200 text-zinc-700 hover:bg-zinc-50";
  return (
    <button className={\`\${base} \${styles} \${className}\`} {...props}>
      {children}
    </button>
  );
}`,
      },
    ],
  },
  {
    kind: "project",
    slug: "workflow-basics",
    title: "工作流（一）：把售后处理做成流程",
    menuTitle: "工作流（一）",
    summary:
      "把一次售后处理做成固定流程：分类 → 查订单 → 判定 → 回复；退换、物流、其他咨询三类都能走通，哪一步出错、哪一步慢在 Studio 里都看得到。",
    verify: {
      label: "去 Studio 跑流程",
      description: [
        "打开 http://localhost:4111/workflows，选 after-sales",
        "试「我买的遁天梭没拆封，想退」：同名商品有两单，流程不猜，在回复里问客户是哪一单",
        "这是一个把售后处理串成流程的客服工作流：意图分类、查订单、判定、生成回复按步执行；退货走售后政策、物流回运输状态、咨询直接回答，每步的输入输出都能查到",
      ],
    },
    concepts: [
      "`createWorkflow` — 定义流程：id / 输入输出 schema，`.then()` 串联，`.commit()` 收尾",
      "`createStep` — 一个步骤一件事，自声明输入输出 schema",
      "`stateSchema` / `setState` — 所有步骤共享的状态",
      "`mastra.getAgentById(…)` — 步骤里取专用 agent",
      "`.then()` — 上一步 output 即下一步 inputData（`.branch` 见第 8 课）",
    ],
    docLinks: [
      { title: "Workflows 总览", href: "https://mastra.ai/docs/workflows/overview" },
      { title: "Workflow State", href: "https://mastra.ai/docs/workflows/workflow-state" },
      { title: "Control Flow", href: "https://mastra.ai/docs/workflows/control-flow" },
      { title: "Agents and Tools", href: "https://mastra.ai/docs/workflows/agents-and-tools" },
    ],
    files: [
      {
        path: "src/mastra/tools/lookup-tool.ts",
        order: 1,
        action: "replace",
        hint: "把查订单的逻辑抽成导出的普通函数 queryOrders，工具照旧调用它 —— 工作流里要直接用这段逻辑",
        code: `import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { orders } from "../data/orders";
import { products } from "../data/products";

// 查在售清单：客户说不清是哪件商品、或只问商品政策时用它
export const listProducts = createTool({
  id: "list-products",
  description:
    "列出在售商品清单（名称 / 价格 / 类别 / 售后规则 / 是否可修复）。用途：① 客户说的是简称（「我的刀」）时，用它对上最接近的那一件；② 客户只问某件商品的政策（能不能退 / 换 / 修）时，按清单里的 rule 回答，不必查订单。客户说的商品不在这份清单里，就是不在售",
  // 没有入参也要给一个空对象 schema
  inputSchema: z.object({}),
  outputSchema: z.object({
    products: z.array(
      z.object({
        sku: z.string(),
        price: z.number(),
        category: z.string(),
        repairable: z.boolean(),
        rule: z.string(),
      }),
    ),
  }),
  execute: async () => ({ products }),
});

// 查订单：客户不记得订单号时用它 —— 不要让客户去背订单号
// 商品名按「包含」匹配（去掉空格、忽略大小写），所以「刀」「飞刀」「S 级飞刀」都能命中同一件商品
const normalizeSku = (value: string) => value.replace(/\\s+/g, "").toLowerCase();

export const findOrders = createTool({
  id: "find-orders",
  description:
    "查询订单（可按商品名筛选，商品名不确定就留空），返回候选订单（订单号 / 商品 / 签收天数 / 物流）。查到一条直接调 checkReturnEligibility 判定；多条说不清时才复述让客户确认",
  inputSchema: z.object({
    sku: z.string().optional().describe("商品名，例如 生命之水；不确定就留空"),
  }),
  outputSchema: z.object({
    orders: z.array(
      z.object({
        orderId: z.string(),
        customer: z.string(),
        sku: z.string(),
        deliveredDaysAgo: z.number().nullable(),
        logistics: z.string(),
      }),
    ),
    hint: z.string().optional().describe("没匹配上时的提示（可用商品名有哪些）"),
  }),
  execute: async ({ sku }) => queryOrders({ sku }),
});

// 查订单的业务逻辑写成普通函数：工具是给模型用的壳，工作流里直接调它
export function queryOrders(input: { sku?: string }) {
  const { sku } = input;

    const keyword = sku ? normalizeSku(sku) : "";
    const matched = orders.filter((item) => {
      if (!keyword) return true;
      const name = normalizeSku(item.sku);
      return name.includes(keyword) || keyword.includes(name);
    });

    return {
      orders: matched.map((item) => ({
        orderId: item.orderId,
        customer: item.customer,
        sku: item.sku,
        deliveredDaysAgo: item.deliveredDaysAgo,
        logistics: item.logistics,
      })),
      // 没匹配上时把在售商品报给它，免得它换着关键字一个个试
      ...(keyword && matched.length === 0
        ? {
            hint: \`没有匹配「\${sku}」的订单；在售商品只有：\${[...new Set(orders.map((item) => item.sku))].join(" / ")}\`,
          }
        : {}),
    };
}

`,
      },
      {
        path: "src/mastra/tools/return-tool.ts",
        order: 2,
        action: "replace",
        hint: "同样把判定逻辑抽成导出的 judgeReturn，工具照旧调用它",
        code: `import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { orders } from "../data/orders";
import { products } from "../data/products";

// outputSchema：返回值也约束住，后面拿到的是结构化数据
const outputSchema = z.object({
  orderId: z.string(),
  sku: z.string(),
  daysSinceDelivery: z.number().optional(),
  decision: z.enum(["refund", "exchange", "repair", "reject", "pending"]),
  reason: z.string(),
});

// 判定结果的类型：execute 显式声明返回它，否则字面量会被放宽成 string、跟 schema 对不上
type Verdict = z.infer<typeof outputSchema>;

// 工具必须用 createTool 定义（用裸对象写不会被执行）
export const checkReturnEligibility = createTool({
  id: "check-return-eligibility",
  description:
    "按售后政策判断订单里的商品能否退货、换新或修复：P1 签收 7 天内封禁未启可退；P2 签收 15 天内质量问题可换；P3 一年保修期内可修（耗材不适用修复）",
  // inputSchema：模型要填的参数，用 zod 约束，并写 describe 帮模型填对
  inputSchema: z.object({
    orderId: z.string().describe("订单号，例如 NX-1002 —— 正常流程里由 findOrders 查到并确认后再传"),
    issue: z
      .enum(["unopened", "quality", "other"])
      .default("quality")
      .describe("问题类型：unopened 未拆封、quality 坏了 / 故障、other 其他；客户说「坏了」就按 quality"),
  }),
  outputSchema,
  // execute 只有这一种签名：(input, context)；用不到上下文时可省略第二个参数
  execute: async ({ orderId, issue }) => judgeReturn({ orderId, issue }),
});

// 判定逻辑写成普通函数：工具是给模型用的壳，工作流里直接调它
export function judgeReturn(input: {
  orderId: string;
  issue: "unopened" | "quality" | "other";
}): Verdict {
  const { orderId, issue } = input;

    // 天数与条款是确定性的事，交给代码；模型只负责把客户的话归成 issue
    const matched = orders.find((item) => item.orderId === orderId);
    // 教学兜底：订单号没匹配上时，优先按客户说的商品挑示例订单，其次才退回第一条
    // （真实项目里应该返回「查不到」并请客户核对订单号）
    // 教学兜底：订单号对不上就拿示例订单演示，方便反复试
    // （真实项目里应该返回「查不到」并请客户核对）
    const order = matched ?? orders[1];
    // 商品类别也来自清单：耗材不适用 P2 换新
    const product = products.find((item) => item.sku === order.sku);
    const note = matched
      ? ""
      : "（未匹配到该订单号，先按示例订单 " + order.orderId + " 演示）";
    if (order.deliveredDaysAgo === null) {
      return {
        orderId: order.orderId,
        sku: order.sku,
        decision: "pending",
        reason:
          note +
          "该订单还没签收（物流：" +
          order.logistics +
          "，已停留 " +
          order.logisticsStuckDays +
          " 天），先查运输进度再谈售后",
      };
    }
    // 数据里存的就是「签收距今天数」，判定不依赖系统时间，结果永远可复现
    const days = order.deliveredDaysAgo;
    if (issue === "unopened" && days <= 7) {
      return {
        orderId: order.orderId,
        sku: order.sku,
        daysSinceDelivery: days,
        decision: "refund",
        reason: note + "签收 " + days + " 天、封禁未启，符合 P1：全额退款，星际运费由商家承担",
      };
    }
    if (issue === "unopened") {
      // 过了 7 天：无理由退货窗口关闭，但没拆封不等于不能处理质量问题
      return {
        orderId: order.orderId,
        sku: order.sku,
        daysSinceDelivery: days,
        decision: "reject",
        reason:
          note +
          "签收 " + days + " 天，已过 P1 的 7 天无理由窗口，未拆封也不能退；如有质量问题请提供故障记录，我再按 P2 / P3 处理",
      };
    }
    if (issue === "quality" && days <= 15) {
      return {
        orderId: order.orderId,
        sku: order.sku,
        daysSinceDelivery: days,
        decision: "exchange",
        reason: note + "签收 " + days + " 天、质量问题，符合 P2：免费换新（需提供故障记录）",
      };
    }
    if (days <= 365) {
      if (product && !product.repairable) {
        // 耗材：换新窗口（15 天）已过，又没有维修价值
        return {
          orderId: order.orderId,
          sku: order.sku,
          daysSinceDelivery: days,
          decision: "reject",
          reason:
            note +
            "签收 " + days + " 天：" + order.sku + " 属耗材，无维修价值、无法修复；质量问题可在签收 15 天内换新，未拆封可在 7 天内退货",
        };
      }
      return {
        orderId: order.orderId,
        sku: order.sku,
        daysSinceDelivery: days,
        decision: "repair",
        reason: note + "签收 " + days + " 天，已过 7 / 15 天窗口，但在 P3 一年保修期内：非人为损坏免费修复",
      };
    }
    return {
      orderId: order.orderId,
      sku: order.sku,
      daysSinceDelivery: days,
      decision: "reject",
      reason: note + "签收 " + days + " 天，已超出 P3 的一年保修期：只能付费修复",
    };
}

`,
      },
      {
        path: "src/mastra/agents/classifier-agent.ts",
        order: 3,
        action: "create",
        hint: "新建一个只管分类的 agent：提示词只说分类规则，不挂任何工具",
        code: `import { Agent } from "@mastra/core/agent";

// 这一步只做分类：提示词只写分类规则，不挂 tools —— 分类不需要任何工具
export const classifierAgent = new Agent({
  id: "classifier-agent",
  name: "意图分类",
  instructions: \`你只做一件事：把客户的话归类，并抽出商品名与问题类型。
- intent 三选一：return（退 / 换 / 修）、logistics（物流 / 运输）、question（其他咨询）
- sku：客户提到的商品名；没提就不填
- issue 三选一：unopened（没拆封 / 不要了，想退货）、quality（坏了 / 故障 / 不能用）、other（其他）
- 不要回答客户，不要解释，不要寒暄\`,
  model: "deepseek/deepseek-flash",
});
`,
      },
      {
        path: "src/mastra/agents/reply-agent.ts",
        order: 4,
        action: "create",
        hint: "再来一个只管措辞的 agent：把结论转成客户听得懂的话，同样不挂工具",
        code: `import { Agent } from "@mastra/core/agent";

// 这一步只负责措辞：事实由工作流给出，它只把话说明白
export const replyAgent = new Agent({
  id: "reply-agent",
  name: "客服措辞",
  instructions: \`你是虚拟宇宙公司客服的措辞助手，只把收到的结论转成给客户看的话。
- 简短、专业；不加承诺、不编造政策
- 结论不明确或需要转人工时，照实说明\`,
  model: "deepseek/deepseek-flash",
});
`,
      },
      {
        path: "src/mastra/workflows/after-sales.ts",
        order: 5,
        action: "create",
        hint: "把一次售后处理做成工作流（脚手架自带的 weather-workflow.ts 保持不动）",
        code: `import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { orders } from "../data/orders";
import { queryOrders } from "../tools/lookup-tool";
import { judgeReturn } from "../tools/return-tool";

const intentSchema = z.enum(["return", "logistics", "question"]);
const issueSchema = z.enum(["unopened", "quality", "other"]);

// 所有步骤共享的状态：客户在办哪一单、办到哪一步
const stateSchema = z.object({
  message: z.string().optional(),
  intent: intentSchema.optional(),
  sku: z.string().optional(),
  issue: issueSchema.optional(),
  orderId: z.string().optional(),
  logistics: z.string().optional(),
  decision: z.string().optional(),
  reason: z.string().optional(),
});

// ① 分类：语言理解交给模型
const classify = createStep({
  id: "classify",
  description: "判断客户这句话属于退换、物流还是其他咨询",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({
    intent: intentSchema,
    sku: z.string().optional(),
    issue: issueSchema,
  }),
  stateSchema,
  execute: async ({ inputData, mastra, setState }) => {
    // 分类规则写在 classifier-agent 的 instructions 里，这一步只把客户原话递过去
    const agent = mastra?.getAgentById("classifier-agent");
    if (!agent) throw new Error("classifier-agent not found");
    const res = await agent.generate(inputData.message, {
      structuredOutput: {
        schema: z.object({
          intent: intentSchema,
          sku: z.string().optional(),
          issue: issueSchema.optional(),
        }),
      },
    });
    const out = res.object ?? { intent: "question" as const };
    // 问题类型决定后面走哪条政策：没提就按质量问题
    const issue = out.issue ?? "quality";
    await setState({ message: inputData.message, intent: out.intent, sku: out.sku, issue });
    return { intent: out.intent, sku: out.sku, issue };
  },
});

// ② 查订单：确定性的事交给工具，不让模型自己挑一单
//    inputSchema 必须接住上一步的 output（intent + sku）—— 这两个字段这一步都真用到
const lookupOrder = createStep({
  id: "lookup-order",
  description: "先按订单号、再按商品名查订单 —— 唯一命中才写进状态",
  inputSchema: z.object({
    intent: intentSchema,
    sku: z.string().optional(),
    issue: issueSchema,
  }),
  outputSchema: z.object({ intent: intentSchema, found: z.boolean() }),
  stateSchema,
  execute: async ({ inputData, state, setState }) => {
    // 纯咨询不查订单；退货与物流都要查
    if (inputData.intent === "question") {
      return { intent: inputData.intent, found: false };
    }
    // 客户报了订单号就以它为准（订单号唯一，客户也常直接报它）；没报再按商品名模糊查
    const byOrderId = state.message?.match(/NX-\\d+/i)?.[0];
    const matched = byOrderId
      ? orders.filter((item) => item.orderId.toUpperCase() === byOrderId.toUpperCase())
      : queryOrders({ sku: inputData.sku }).orders;
    if (matched.length !== 1) return { intent: inputData.intent, found: false };
    const order = orders.find((item) => item.orderId === matched[0].orderId);
    await setState({
      orderId: matched[0].orderId,
      // 物流信息也写进状态：物流类的问题要直接回它
      logistics:
        (order?.logistics ?? matched[0].logistics) +
        (order?.logisticsStuckDays
          ? "，已停留 " + order.logisticsStuckDays + " 天"
          : ""),
    });
    return { intent: inputData.intent, found: true };
  },
});

// ③ 判定：退货走售后政策、物流回运输状态、咨询留给回复
const judge = createStep({
  id: "judge",
  description: "按意图给出结论：退货判退 / 换 / 修，物流回运输状态，咨询交给回复",
  inputSchema: z.object({ intent: intentSchema, found: z.boolean() }),
  outputSchema: z.object({ decision: z.string(), reason: z.string() }),
  stateSchema,
  execute: async ({ inputData, state, setState }) => {
    // 纯咨询：不用判定，让回复步骤直接答客户的问题
    if (inputData.intent === "question") {
      await setState({ decision: "answer", reason: "" });
      return { decision: "answer", reason: "" };
    }
    // 物流：把状态里的物流信息整理成结论
    if (inputData.intent === "logistics") {
      const reason = state.orderId
        ? "订单 " + state.orderId + "：" + (state.logistics ?? "暂无物流信息")
        : "没查到对应订单，先跟客户确认是哪一件商品";
      await setState({ decision: "logistics", reason });
      return { decision: "logistics", reason };
    }
    // 退货：没查到订单就先补齐信息
    if (!inputData.found || !state.orderId) {
      const reason = "还缺商品名或订单号，先跟客户确认是哪一件";
      await setState({ decision: "need-info", reason });
      return { decision: "need-info", reason };
    }
    const verdict = judgeReturn({ orderId: state.orderId, issue: state.issue ?? "quality" });
    await setState({ decision: verdict.decision, reason: verdict.reason });
    return { decision: verdict.decision, reason: verdict.reason };
  },
});

// ④ 回复：把状态里的事实交给模型组织成人话（咨询类由它直接答客户的问题）
const reply = createStep({
  id: "reply",
  description: "用客户听得懂的话说明结果",
  inputSchema: z.object({ decision: z.string(), reason: z.string() }),
  outputSchema: z.object({ answer: z.string() }),
  stateSchema,
  execute: async ({ state, mastra }) => {
    const agent = mastra?.getAgentById("reply-agent");
    const question = state.message ?? "";
    const prompt =
      state.decision === "answer"
        ? "客户问：" + question + "。按虚拟宇宙公司客服的职责简短回答；不确定就说明要转人工，不要编。"
        : "把下面这条判定结果转达给客户：简短、专业、不要新增承诺。\\n" +
          "判定：" + (state.decision ?? "") + "\\n依据：" + (state.reason ?? "") +
          "\\n客户原话：" + question;
    const res = await agent?.generate(prompt);
    return { answer: res?.text ?? state.reason ?? "" };
  },
});

export const afterSalesWorkflow = createWorkflow({
  id: "after-sales",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ answer: z.string() }),
  stateSchema,
})
  .then(classify)
  .then(lookupOrder)
  .then(judge)
  .then(reply)
  .commit();
`,
      },
      {
        path: "src/mastra/index.ts",
        order: 6,
        action: "edit",
        hint: "注册两个专用 agent 与这个工作流：import 三行 + agents / workflows 各加项，其余配置不动",
        code: `// ① 顶部加三个 import：两个专用 agent + 一个工作流
import { classifierAgent } from "./agents/classifier-agent";
import { replyAgent } from "./agents/reply-agent";
import { afterSalesWorkflow } from "./workflows/after-sales";

// ② agents 里加两个专用 agent，workflows 里加一项
agents: { weatherAgent, supportAgent, classifierAgent, replyAgent },
workflows: { weatherWorkflow, afterSalesWorkflow },
`,
      },
    ],
  },
  {
    kind: "project",
    slug: "workflow-suspend",
    title: "工作流（二）：暂停恢复与人工审批",
    menuTitle: "工作流（二）",
    summary:
      "让流程会分路：需要人拍板的走审批并挂起，批完从断点继续；其余直接放行。",
    verify: {
      label: "去 Studio 试审批",
      description: [
        "打开 http://localhost:4111/workflows，选 after-sales",
        "跑一条判成退款的请求（数据里符合条件的是 NX-1001 与 NX-1007，未拆封且签收在 7 天内）：金额超出客服权限，会挂起等主管批；批准后从断点继续跑完",
        "跑「生命之水没拆封，我想退」：同名商品有多单，会先挂在 lookup-order 并列出候选，在 Resume Data 里给出其中一个订单号后继续判到审批",
        "其余判定（换新 / 维修 / 拒绝）直接放行，不会挂起",
      ],
    },
    concepts: [
      "`.branch` — 条件分支：`[[条件, 步骤], …]`，两条路的 schema 必须一致",
      "`suspend` / `suspendSchema` / `resumeSchema` — 步骤内挂起，等外部恢复",
      "`run.resume({ step, resumeData })` — 从挂起点恢复运行",
      "`createRun({ runId })` — 凭 runId 取回运行再恢复",
    ],
    docLinks: [
      { title: "Suspend & Resume", href: "https://mastra.ai/docs/workflows/suspend-and-resume" },
      { title: "Human-in-the-Loop", href: "https://mastra.ai/docs/workflows/human-in-the-loop" },
      { title: "Snapshots", href: "https://mastra.ai/docs/workflows/snapshots" },
      { title: "Time Travel", href: "https://mastra.ai/docs/workflows/time-travel" },
      { title: "Workflows 总览", href: "https://mastra.ai/docs/workflows/overview" },
      { title: "Error Handling（重试与兜底）", href: "https://mastra.ai/docs/workflows/error-handling" },
      { title: "Scheduled Workflows（定时）", href: "https://mastra.ai/docs/workflows/scheduled-workflows" },
      { title: "Workers（丢到后台进程跑）", href: "https://mastra.ai/docs/deployment/workers" },
    ],
    files: [
      {
        path: "src/mastra/workflows/after-sales.ts",
        order: 1,
        action: "replace",
        hint: "在上一课的流程里加两处挂起：定不到唯一订单时挂起问客户要订单号；超出客服权限的退款挂起等主管批 —— 其余判定直接放行",
        code: `import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { orders } from "../data/orders";
import { queryOrders } from "../tools/lookup-tool";
import { judgeReturn } from "../tools/return-tool";

const intentSchema = z.enum(["return", "logistics", "question"]);
const issueSchema = z.enum(["unopened", "quality", "other"]);

// 所有步骤共享的状态：客户在办哪一单、办到哪一步
const stateSchema = z.object({
  message: z.string().optional(),
  intent: intentSchema.optional(),
  sku: z.string().optional(),
  issue: issueSchema.optional(),
  orderId: z.string().optional(),
  logistics: z.string().optional(),
  decision: z.string().optional(),
  reason: z.string().optional(),
  // lookup-order 写下的说明：候选里没有符合条件时，说明为什么办不了
  lookupNote: z.string().optional(),
});

// ① 分类：语言理解交给模型
const classify = createStep({
  id: "classify",
  description: "判断客户这句话属于退换、物流还是其他咨询",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({
    intent: intentSchema,
    sku: z.string().optional(),
    issue: issueSchema,
  }),
  stateSchema,
  execute: async ({ inputData, mastra, setState }) => {
    // 分类规则写在 classifier-agent 的 instructions 里，这一步只把客户原话递过去
    const agent = mastra?.getAgentById("classifier-agent");
    if (!agent) throw new Error("classifier-agent not found");
    const res = await agent.generate(inputData.message, {
      structuredOutput: {
        schema: z.object({
          intent: intentSchema,
          sku: z.string().optional(),
          issue: issueSchema.optional(),
        }),
      },
    });
    const out = res.object ?? { intent: "question" as const };
    // 问题类型决定后面走哪条政策：没提就按质量问题
    const issue = out.issue ?? "quality";
    await setState({ message: inputData.message, intent: out.intent, sku: out.sku, issue });
    return { intent: out.intent, sku: out.sku, issue };
  },
});

// ② 查订单：确定性的事交给工具，不让模型自己挑一单
//    inputSchema 必须接住上一步的 output（intent + sku）—— 这两个字段这一步都真用到
const lookupOrder = createStep({
  id: "lookup-order",
  description: "先按订单号、再按商品名查订单 —— 唯一命中才写进状态；定不了就挂起，等客户补信息",
  inputSchema: z.object({
    intent: intentSchema,
    sku: z.string().optional(),
    issue: issueSchema,
  }),
  outputSchema: z.object({ intent: intentSchema, found: z.boolean() }),
  stateSchema,
  // 恢复时外部要传什么：客户补充的那句话（一般带着订单号）
  resumeSchema: z.object({ reply: z.string() }),
  // 挂起时把要给人看的信息一起存下来：问什么、候选有哪些
  // 候选要带够客户判断的信息（商品 + 金额 + 签收天数 + 这单能怎么处理）
  suspendSchema: z.object({
    question: z.string(),
    candidates: z
      .array(
        z.object({
          orderId: z.string(),
          sku: z.string(),
          price: z.number(),
          deliveredDaysAgo: z.number().nullable(),
          // 这一单按当前诉求能怎么处理：refund 可退 / exchange 可换新 / repair 保修期内可修
          verdict: z.string(),
        }),
      )
      .optional(),
  }),
  execute: async ({ inputData, state, resumeData, suspend, setState }) => {
    // 纯咨询不查订单；退货与物流都要查
    if (inputData.intent === "question") {
      return { intent: inputData.intent, found: false };
    }
    // 拿客户的话来定单：首次 = 原话，恢复后 = 他补充的那句（补充的话同样可能是商品名）
    const text = resumeData?.reply ?? state.message ?? "";
    // 报了订单号就以它为准（订单号唯一，客户也常直接报它）；否则拿话里的商品名模糊查
    const byOrderId = text.match(/NX-\\d+/i)?.[0];
    const keyword = resumeData?.reply ?? inputData.sku;
    const matched = byOrderId
      ? orders.filter((item) => item.orderId.toUpperCase() === byOrderId.toUpperCase())
      : queryOrders({ sku: keyword }).orders;

    // 定下某一单：订单号 + 物流信息写进状态
    const adopt = async (orderId: string) => {
      const picked = orders.find((item) => item.orderId === orderId);
      await setState({
        orderId,
        logistics:
          (picked?.logistics ?? "") +
          (picked?.logisticsStuckDays ? "，已停留 " + picked.logisticsStuckDays + " 天" : ""),
      });
      return { intent: inputData.intent, found: true };
    };

    if (matched.length !== 1) {
      // 多单不能一股脑丢给客户 —— 只列「按当前诉求有机会受理」的：
      // 退货看未拆封 7 天内能退的；其它诉求剔除直接拒绝与未签收的
      const candidates = matched
        .map((item) => {
          const order = orders.find((o) => o.orderId === item.orderId);
          const verdict = judgeReturn({
            orderId: item.orderId,
            issue: inputData.intent === "return" ? "unopened" : inputData.issue,
          });
          return {
            orderId: item.orderId,
            sku: item.sku,
            price: order?.price ?? 0,
            deliveredDaysAgo: order?.deliveredDaysAgo ?? null,
            verdict: verdict.decision,
          };
        })
        .filter((item) =>
          inputData.intent === "return"
            ? item.verdict === "refund"
            : item.verdict !== "reject" && item.verdict !== "pending",
        );

      // 客户补充之后候选收敛到一张：直接采用（他已经指出是哪一件，就不必再点一次）
      if (resumeData && candidates.length === 1) {
        return adopt(candidates[0].orderId);
      }
      // 第一次：挂起让客户确认是哪一单（候选已经只剩有机会的）
      if (!resumeData && candidates.length > 0) {
        return await suspend({
          question: "同名商品有多单，请确认是哪一单",
          candidates,
        });
      }
      // 没有可受理的候选：别挂起，交给 judge 说明为什么不能办
      if (matched.length > 0 && candidates.length === 0) {
        await setState({
          lookupNote:
            "这些订单都不符合退货条件：" +
            matched
              .map(
                (item) =>
                  item.sku +
                  (item.deliveredDaysAgo === null
                    ? "（未签收）"
                    : "（已签收 " + item.deliveredDaysAgo + " 天）"),
              )
              .join("、"),
        });
      }
      // 补充之后还是定不了：不再挂起，交给 judge 走 need-info
      return { intent: inputData.intent, found: false };
    }

    return adopt(matched[0].orderId);
  },
});

// ③ 判定：退货走售后政策、物流回运输状态、咨询留给回复；同时标明要不要主管拍板
const judge = createStep({
  id: "judge",
  description: "按意图给出结论，并标明要不要主管拍板",
  inputSchema: z.object({ intent: intentSchema, found: z.boolean() }),
  outputSchema: z.object({
    decision: z.string(),
    reason: z.string(),
    needsApproval: z.boolean(),
  }),
  stateSchema,
  execute: async ({ inputData, state, setState }) => {
    // 纯咨询：不用判定，也不用审批
    if (inputData.intent === "question") {
      await setState({ decision: "answer", reason: "" });
      return { decision: "answer", reason: "", needsApproval: false };
    }
    // 物流：把状态里的物流信息整理成结论
    if (inputData.intent === "logistics") {
      const reason = state.orderId
        ? "订单 " + state.orderId + "：" + (state.logistics ?? "暂无物流信息")
        : "没查到对应订单，先跟客户确认是哪一件商品";
      await setState({ decision: "logistics", reason });
      return { decision: "logistics", reason, needsApproval: false };
    }
    // 退货：没查到订单就先补齐信息
    if (!inputData.found || !state.orderId) {
      const reason = state.lookupNote ?? "还缺商品名或订单号，先跟客户确认是哪一件";
      await setState({ decision: "need-info", reason });
      return { decision: "need-info", reason, needsApproval: false };
    }
    const verdict = judgeReturn({ orderId: state.orderId, issue: state.issue ?? "quality" });
    // P4：客服可自主补偿 ≤ 50 黑龙币；超出的退款必须主管点头
    const price = orders.find((item) => item.orderId === state.orderId)?.price ?? 0;
    const needsApproval = verdict.decision === "refund" && price > 50;
    await setState({ decision: verdict.decision, reason: verdict.reason });
    return {
      decision: verdict.decision,
      reason: verdict.reason,
      needsApproval,
    };
  },
});

// ④ 人工审批：只有 judge 标了 needsApproval 的单才会走到这里（由下面的 .branch 分路）
const approval = createStep({
  id: "approval",
  description: "金额超出客服权限的退款：挂起等主管批准或驳回",
  inputSchema: z.object({
    decision: z.string(),
    reason: z.string(),
    needsApproval: z.boolean(),
  }),
  outputSchema: z.object({ decision: z.string(), reason: z.string() }),
  stateSchema,
  // 恢复时外部要传什么
  resumeSchema: z.object({ approved: z.boolean(), note: z.string().optional() }),
  // 挂起时把要给人看的信息一起存下来
  suspendSchema: z.object({ orderId: z.string().optional(), reason: z.string() }),
  execute: async ({ inputData, resumeData, state, suspend, setState }) => {
    // 第一次执行：挂起，等主管
    if (!resumeData) {
      const price = orders.find((item) => item.orderId === state.orderId)?.price ?? 0;
      return await suspend({
        orderId: state.orderId,
        reason: inputData.reason + "（退款金额 " + price + " 黑龙币，超出 P4 的 50）",
      });
    }
    // 被 resume 之后才走到这里
    const decision = resumeData.approved ? "refund-approved" : "handover";
    await setState({ decision });
    return { decision, reason: resumeData.note ?? inputData.reason };
  },
});

// 分支的另一条路：客服权限内的判定直接放行 —— 两条路的输入输出 schema 必须一致
const autoPass = createStep({
  id: "auto-pass",
  description: "客服权限内的判定：直接放行，不打扰主管",
  inputSchema: z.object({
    decision: z.string(),
    reason: z.string(),
    needsApproval: z.boolean(),
  }),
  outputSchema: z.object({ decision: z.string(), reason: z.string() }),
  execute: async ({ inputData }) => ({
    decision: inputData.decision,
    reason: inputData.reason,
  }),
});

// ⑤ 回复：把状态里的事实交给模型组织成人话
// ⑤ 回复：分支只跑一条，产物按步骤名分组（approval / auto-pass），所以两个字段都声明成可选
//    具体说什么看 state —— judge 与 approval 都已经把结论写进去了
const reply = createStep({
  id: "reply",
  description: "用客户听得懂的话说明结果",
  inputSchema: z.object({
    approval: z.object({ decision: z.string(), reason: z.string() }).optional(),
    "auto-pass": z.object({ decision: z.string(), reason: z.string() }).optional(),
  }),
  outputSchema: z.object({ answer: z.string() }),
  stateSchema,
  execute: async ({ state, mastra }) => {
    const agent = mastra?.getAgentById("reply-agent");
    const question = state.message ?? "";
    const prompt =
      state.decision === "answer"
        ? "客户问：" + question + "。按虚拟宇宙公司客服的职责简短回答；不确定就说明要转人工，不要编。"
        : "把下面这条判定结果转达给客户：简短、专业、不要新增承诺。\\n" +
          "判定：" + (state.decision ?? "") + "\\n依据：" + (state.reason ?? "") +
          "\\n客户原话：" + question;
    const res = await agent?.generate(prompt);
    return { answer: res?.text ?? state.reason ?? "" };
  },
});

export const afterSalesWorkflow = createWorkflow({
  id: "after-sales",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ answer: z.string() }),
  stateSchema,
})
  .then(classify)
  .then(lookupOrder)
  .then(judge)
  // ④ 分路：要主管拍板的走审批（里面挂起），其余的走 autoPass
  .branch([
    [async ({ inputData }) => inputData.needsApproval, approval],
    [async ({ inputData }) => !inputData.needsApproval, autoPass],
  ])
  .then(reply)
  .commit();

// 恢复入口：真实项目里放在 HTTP 路由或审批后台
export async function approveRun(runId: string, approved: boolean) {
  const run = await afterSalesWorkflow.createRun({ runId });
  return run.resume({ step: "approval", resumeData: { approved } });
}`,
      },
    ],
  },
  {
    kind: "project",
    slug: "rag-knowledge",
    title: "RAG：把售后政策做成知识库",
    menuTitle: "RAG",
    summary:
      "政策原文切块、向量化、入库，再给 agent 一个检索工具：答政策问题时引用条款，而不是凭印象说。",
    install: {
      command: "pnpm add @mastra/rag",
      description: "在 my-mastra-app 目录执行 —— 切块（MDocument）和检索工具（createVectorQueryTool）都在 @mastra/rag 里；嵌入模型直接复用第 5 课建的 src/mastra/embedder.ts（不再新建模块，也不用再配 key）。",
    },
    verify: {
      label: "点按钮入库，再问政策",
      description: [
        "打开 http://localhost:3001/knowledge —— 页面会告诉你现在有没有入库；没入库就点「初始化知识库」，一两秒后显示「已入库：7 个块（1024 维）」",
        "然后回聊天页问「S 级飞刀用了四年、梭体核心坏了怎么办」：agent 先检索政策原文，回答里说清依据哪一条",
        "改了 src/mastra/knowledge/policies.md（那份政策文档）就回这个页面点一次「重建知识库」—— 入库 = 先删旧索引再写，重复点不会堆重复段落",
        "注意：浏览器直接打开 /api/knowledge/ingest 只会看到状态（GET），入库是页面按钮发的 POST",
      ],
    },
    concepts: [
      "`MDocument.fromText` — 装载原文，再按标题切成一块块",
      "`embedMany` — 批量向量化；维度要与建索引时一致",
      "`createIndex` / `upsert` — 建索引、写向量；`metadata` 要带正文",
      "`deleteIndex` — upsert 是追加不是覆盖：入库前先删索引",
      "`createVectorQueryTool` — 把检索封装成工具；`vectorStoreName` 要在 `vectors` 里注册",
      "`/api/knowledge/ingest` — 入库走应用自己的接口（入库与检索同进程同库）",
    ],
    conceptArticle: {
      title: "图检索（GraphRAG）：什么时候需要，怎么实现",
      body: [
        "## 一句话",
        "向量检索是「谁和查询像就取谁」；GraphRAG 先取一批种子块，再顺着「块 ↔ 块」的关系扩展 —— 于是能捞到「和查询不像、但和命中块像」的二级相关内容。",
        "",
        "## 两种「关系」完全不同",
        "### 相似度图（Mastra 这版的 createGraphRAGTool）",
        "- 节点 = 入库的块；边 = 块与块的向量相似度 ≥ graphOptions.threshold（官方建议从 0.7 起调）",
        "- 查询时临时建图：向量召回 → 建图 → 沿边遍历（randomWalkSteps、restartProb）→ 返回「直接命中 + 顺着边摸到的块」",
        "- 关系是**算出来**的，不用你定义；但它只知道「读起来像」，不懂「引用了 / 导致了」",
        "### 抽取关系图（LangChain + Neo4j、微软 GraphRAG）",
        "- 关系由 LLM 抽出来（引用 / 属于 / 导致…）再存进图数据库：LLMGraphTransformer 抽三元组、Neo4jGraph 写入",
        "- 查询：GraphCypherQAChain 把自然语言翻成 Cypher 查子图；微软那套还要做社区聚类 + 社区摘要（用来回答「整批文档的主题」这类全局问题）",
        "- 能多跳、可解释；代价是建图要跑一遍 LLM（钱 + 时间），还得先定实体 / 关系 schema",
        "### LangGraph 的位置",
        "- 它本身不提供 GraphRAG，只是编排：把「向量召回 / Cypher 查图 / 改写问题 / 生成」画成节点与条件边",
        "",
        "## 为什么小语料用不上",
        "- 一份文档、几个条款、单跳问答：把 topK 从 3 调到 10，结果和「相似度图扩展」几乎一样",
        "- 相似度图的增量只有二级相关与多跳；语料小、条款之间互不引用时收益 ≈ 0",
        "- 代价却是真的：每次查询多「建图 + 遍历」两步，还要把 threshold 调对",
        "",
        "## 更划算的替代：用 metadata 存显式关系",
        "文档里写着的引用（例如「P6 … 如有质量问题再按 P2 / P3 处理」）解析出来存进 metadata，命中后按引用扩展：",
        "```",
        "metadatas.push({ source, text, refs: [\"P2\", \"P3\"] });",
        "```",
        "- 可控、可解释、零额外 LLM 成本，还能讲清「关系是从哪来的」",
        "- 真该上 GraphRAG 的场合：答案散在多份文档里、必须沿关系才能凑齐，或者要回答「整批文档的主题」",
        "",
        "## 官方文档",
        "- Mastra：https://mastra.cn/docs/rag/graph-rag （createGraphRAGTool、threshold、dimension）",
        "- LangChain：LLMGraphTransformer / GraphCypherQAChain（Neo4j 的 GraphRAG 教程）",
      ],
    },
    docLinks: [
      { title: "RAG 总览", href: "https://mastra.ai/reference/rag/overview" },
      { title: "切块与向量化", href: "https://mastra.ai/reference/rag/chunking-and-embedding" },
      { title: "检索与检索工具", href: "https://mastra.ai/reference/rag/retrieval" },
      { title: "可换的向量库", href: "https://mastra.ai/reference/rag/vector-databases" },
    ],
    files: [
      {
        path: "src/mastra/knowledge/config.ts",
        order: 1,
        action: "create",
        hint: "语料路径与索引名收在一处：入库与检索必须同一个索引（真实项目里换成上传目录 / 对象存储）",
        code: `import path from "node:path";
import { PROJECT_ROOT } from "../db";

// 语料就是一份纯文本文件（真实项目里换成用户上传的文档 / 对象存储 / 知识库接口）
export const POLICY_FILE = path.join(PROJECT_ROOT, "src", "mastra", "knowledge", "policies.md");

// 向量索引名：入库（ingest-policies）与检索（policy-search）必须用同一个值
export const POLICY_INDEX = "policies";`,
      },
      {
        path: "src/mastra/knowledge/policies.md",
        order: 2,
        action: "create",
        hint: "语料就是一份纯文本 / Markdown 文档（真实项目里是用户上传的文档）；## 标题就是条款号",
        code: `# 虚拟宇宙公司 售后政策

## P1 退货
签收后 7 个自然日内、原厂封禁未启（未拆封、未启用）：全额退款，星际运费由商家承担；超过 7 天不再适用无理由退货。

## P2 换新
签收后 15 个自然日内出现质量问题（梭体灵纹闪烁、金丝断裂）：免费换新，需要客户提供故障记录。

## P3 修复
1 年免费修复，梭体核心非人为损坏免费修复；人为损坏（含强行灌注念力）收材料费。

## P4 补偿
客服可自主补偿不超过 50 黑龙币；超出部分必须走主管审批。

## P5 出处
政策解释以售后政策文件为准，客服不得口头加码；不在在售清单内或超出窗口的，一律需要主管确认。

## P6 超期未拆封
未拆封但已过 7 天，无理由退货窗口关闭、不能退；如有质量问题再按 P2 / P3 处理。

## 耗材说明
生命之水属于耗材，退货与换新照常适用（P1 / P2），但不适用修复（P3），因为一次性消耗品没有维修价值。`,
      },
      {
        path: "src/mastra/workflows/ingest-policies.ts",
        order: 3,
        action: "create",
        hint: "入库工作流：读文档 → 按标题切块 → 向量化 → 重建索引写入（从应用侧触发）",
        code: `import { createStep, createWorkflow } from "@mastra/core/workflows";
import { LibSQLVector } from "@mastra/libsql";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { embedder, EMBED_DIM } from "../embedder";
import { DB_URL } from "../db";
import { POLICY_FILE, POLICY_INDEX } from "../knowledge/config";

// 向量和消息存在同一个库文件里（路径来自 src/mastra/db.ts：绝对路径，入库与检索必然同一个库）
const vectorStore = new LibSQLVector({
  id: "knowledgeBase",
  url: DB_URL,
});

const ingest = createStep({
  id: "ingest",
  description: "把政策文档切块、向量化、写入向量库",
  inputSchema: z.object({}),
  outputSchema: z.object({ chunks: z.number() }),
  execute: async () => {
    // ① 读文档：一份纯文本文件（真实项目里换成用户上传的文档 / 对象存储 / 知识库接口）
    const source = path.basename(POLICY_FILE);
    const raw = await readFile(POLICY_FILE, "utf8");

    // ② 切块：这份文档是带标题的（# 文档名、## 条款），按标题切 —— 每个条款自成一块，
    //    检索回来就能直接说"依据哪一条"。纯按字数切会把几条政策挤在同一块里，引用就不精确了。
    const document = MDocument.fromText(raw, { source });
    const parts = await document.chunk({
      strategy: "markdown",
      headers: [
        ["#", "h1"],
        ["##", "h2"],
      ],
      // 标题留在块里：检索回来时模型才看得到"这是哪一条"（默认会把标题剥掉）
      stripHeaders: false,
    });

    const chunks = parts.map((part) => part.text);
    // 正文写进 metadata：检索回来才有可引用的原文（只存文件名的话，模型看不见内容）
    const metadatas = chunks.map((text) => ({ source, text }));

    // ③ 向量化：模型输出维度必须和建索引时一致
    const { embeddings } = await embedMany({
      model: embedder,
      values: chunks,
    });

    // ④ 重建索引：先删旧的、再建新的、再写入。
    //    实测（2026-10-05）：createIndex 对已存在的索引不报错，但 upsert 是**追加** ——
    //    重复入库会让同一个块堆很多份，topK 里全是重复段落。所以入库按「重建」写：删 → 建 → 写。
    await vectorStore.deleteIndex({ indexName: POLICY_INDEX }).catch(() => {
      // 第一次入库时索引还不存在，删失败是正常的
    });
    await vectorStore.createIndex({
      indexName: POLICY_INDEX,
      dimension: EMBED_DIM,
      metric: "cosine",
    });
    await vectorStore.upsert({
      indexName: POLICY_INDEX,
      vectors: embeddings,
      metadata: metadatas,
    });

    return { chunks: chunks.length };
  },
});

export const ingestPoliciesWorkflow = createWorkflow({
  id: "ingest-policies",
  inputSchema: z.object({}),
  outputSchema: z.object({ chunks: z.number() }),
})
  .then(ingest)
  .commit();`,
      },
      {
        path: "src/mastra/tools/policy-search.ts",
        order: 4,
        action: "create",
        hint: "把检索包成工具，交给 agent",
        code: `import { createVectorQueryTool } from "@mastra/rag";
import { embedder } from "../embedder";
import { POLICY_INDEX } from "../knowledge/config";

// 把检索包成一个工具：agent 只有遇到政策问题时才会调它
// vectorStoreName 对应 Mastra 实例里注册的向量库名字（这里是 knowledgeBase）
export const policySearch = createVectorQueryTool({
  vectorStoreName: "knowledgeBase",
  indexName: POLICY_INDEX,
  model: embedder,
});`,
      },
      {
        path: "src/mastra/agents/support-agent.ts",
        order: 5,
        action: "replace",
        hint: "把检索工具挂到 agent 上，并在提示词里要求「说清依据哪一条」",
        code: `import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLVector } from "@mastra/libsql";
import { z } from "zod";
import { listProducts, findOrders } from "../tools/lookup-tool";
import { checkReturnEligibility } from "../tools/return-tool";
import { policySearch } from "../tools/policy-search";
import { embedder } from "../embedder";
import { DB_URL } from "../db";

const customerProfile = z.object({
  sku: z.string().optional().describe("涉及的装备或药剂，例如 S 级飞刀"),
  orderId: z.string().optional().describe("装备或配件订单号，例如 NX-1002"),
  issue: z.string().optional().describe("正在处理的售后问题，例如 金丝断裂"),
  promise: z.string().optional().describe("已经答复客户的处理方案，例如 已告知可换新（P2）"),
});

export const supportAgent = new Agent({
  id: "support-agent",
  name: "虚拟宇宙公司客服",
  instructions: \`你是虚拟宇宙公司官方客服，负责武器、装备与药剂的退换、修复、运输。您当前正在服务的客户是罗峰先生
- listProducts：查在售商品与售后政策
- findOrders：查订单（可按商品名筛）
- checkReturnEligibility：判退换资格，不要自己推算天数
- policySearch：查售后政策原文（P1–P6）；答政策问题时，在回答里说清依据哪一条
- 能用工具解决的，优先用工具，不要麻烦客户
- 客户报的商品、订单号、问题和已答复的方案，用 updateWorkingMemory 记下来，之后不要重复问
- 已经答复过的方案不要改口
- 中文、简短、专业；政策外的处置一律说「需要主管确认」\`,
  model: "deepseek/deepseek-flash",
  tools: { listProducts, findOrders, checkReturnEligibility, policySearch },
  memory: new Memory({
    // 向量和消息存同一个本地库文件（路径来自 src/mastra/db.ts，绝对路径）
    vector: new LibSQLVector({ id: "mastra-vector", url: DB_URL }),
    // 嵌入模型：共用 src/mastra/embedder.ts 里那一个（硅基流动 bge-large-zh-v1.5，1024 维，中文）
    embedder,
    options: {
      // 条数上限 + token 预算，两个都写就是双重上限
      lastMessages: 20,
      messageHistory: { maxTokens: 8000 },
      // 语义召回：跨对话捞回相关旧消息；topK 召回几条、messageRange 每条前后带几条、scope 跨不跨对话
      semanticRecall: { topK: 3, messageRange: 2, scope: "resource" },
      workingMemory: { enabled: true, schema: customerProfile },
    },
  }),
});`,
      },
      {
        path: "src/mastra/index.ts",
        order: 6,
        action: "edit",
        hint: "注册向量库与入库工作流（vectorStoreName 要和这里注册的名字一致）",
        code: `// ① 顶部加 import
import { LibSQLVector } from "@mastra/libsql";
import { ingestPoliciesWorkflow } from "./workflows/ingest-policies";
import { DB_URL } from "./db";

// ② 在 new Mastra({ ... }) 里加两项
vectors: {
  knowledgeBase: new LibSQLVector({ id: "knowledgeBase", url: DB_URL }),
},
workflows: {
  weatherWorkflow,
  afterSalesWorkflow,
  ingestPoliciesWorkflow,
},
`,
      },
      {
        path: "app/api/knowledge/ingest/route.ts",
        order: 7,
        action: "create",
        hint: "入库接口：GET 看状态、POST 触发入库（浏览器直接打开只有 GET，不会入库）；跑在应用进程里，向量落进应用正在用的那个库",
        code: `import { NextResponse } from "next/server";
import { LibSQLVector } from "@mastra/libsql";
import { mastra } from "@/src/mastra";
import { DB_URL } from "@/src/mastra/db";
import { POLICY_INDEX } from "@/src/mastra/knowledge/config";

// GET：看一眼知识库现在什么状态（有没有入库、几个块）。
// 注意：浏览器直接打开这个地址只会走到这里（GET），**不会**触发入库 —— 入库要 POST。
export async function GET() {
  const store = new LibSQLVector({ id: "knowledgeBase", url: DB_URL });
  try {
    const stats = await store.describeIndex({ indexName: POLICY_INDEX });
    return NextResponse.json({
      index: POLICY_INDEX,
      ingested: stats.count > 0,
      chunks: stats.count,
      dimension: stats.dimension,
    });
  } catch {
    return NextResponse.json({ index: POLICY_INDEX, ingested: false, chunks: 0 });
  }
}

// POST：入库（向量化）—— 跑在应用这个进程里，向量就直接落进应用正在用的那个库。
// 它是「重建」语义：先删旧索引 → 再建 → 再写，所以重复跑不会堆重复段落。
// 真实项目里这里还会加鉴权，或者挂成定时任务（政策更新后自动重跑）。
export async function POST() {
  const workflow = mastra.getWorkflow("ingestPoliciesWorkflow");
  const run = await workflow.createRun();
  const result = await run.start({ inputData: {} });

  const outcome = result as {
    status: string;
    result?: { chunks?: number };
    error?: { message?: string };
  };

  if (outcome.status !== "success") {
    return NextResponse.json(
      { ok: false, status: outcome.status, error: outcome.error?.message ?? "入库失败" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true, chunks: outcome.result?.chunks ?? 0 });
}`,
      },
      {
        path: "app/knowledge/page.tsx",
        order: 8,
        action: "create",
        hint: "知识库页：一个按钮就把「初始化 / 重建向量」做完 —— 学员不用会 curl，也不用进 Studio",
        code: `"use client";

import { useEffect, useState } from "react";

type Status = { ingested: boolean; chunks: number; dimension?: number };

// 知识库页：把「初始化向量」做成一个按钮 —— 学员不用会 curl，也不用去 Studio。
// 点一下 = POST /api/knowledge/ingest = 读 knowledge/policies.md 这份政策文档
// 切块 → 向量化 → 写进应用正在用的那个库（重建语义：先删旧索引再写）。
export default function KnowledgePage() {
  const [status, setStatus] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  // 首次打开先读一次状态（有没有入库、几个块）
  useEffect(() => {
    fetch("/api/knowledge/ingest")
      .then((res) => res.json())
      .then((data) => setStatus(data))
      .catch(() => {});
  }, []);

  async function refresh() {
    const res = await fetch("/api/knowledge/ingest");
    setStatus(await res.json());
  }

  async function ingest() {
    setBusy(true);
    setMessage("");
    try {
      const res = await fetch("/api/knowledge/ingest", { method: "POST" });
      const data = await res.json();
      setMessage(
        data.ok
          ? \`入库完成：\${data.chunks} 个块写入向量库\`
          : \`入库失败：\${data.error ?? "未知错误"}\`,
      );
      await refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-2xl flex-col gap-6 px-6 py-12">
      <header>
        <h1 className="text-lg font-medium text-zinc-800">虚拟宇宙公司 · 售后知识库</h1>
        <p className="text-[13px] text-zinc-400">
          把政策原文向量化入库 —— agent 答政策问题时，会先来这里检索条款。
        </p>
      </header>

      <section className="rounded-2xl border border-zinc-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-zinc-400">当前状态</p>
            <p className="mt-1 text-[15px] text-zinc-800">
              {status
                ? status.ingested
                  ? \`已入库：\${status.chunks} 个块\${status.dimension ? \`（\${status.dimension} 维）\` : ""}\`
                  : "还没入库 —— 检索会是空的，先点右边这个按钮"
                : "读取中…"}
            </p>
          </div>
          <button
            type="button"
            onClick={ingest}
            disabled={busy}
            className="rounded-xl bg-zinc-800 px-4 py-1.5 text-sm text-white disabled:opacity-40"
          >
            {busy ? "入库中…" : status?.ingested ? "重建知识库" : "初始化知识库"}
          </button>
        </div>

        {message && (
          <p className="mt-3 rounded-xl bg-zinc-50 px-3 py-2 text-[13px] text-zinc-600 ring-1 ring-zinc-100">
            {message}
          </p>
        )}

        <ul className="mt-3 space-y-1 text-[13px] leading-6 text-zinc-500">
          <li>· 入库跑在你自己的应用进程里，所以向量落进应用正在用的那个库（跟对话检索同一个库）</li>
          <li>· 重复点是安全的：入库 = 重建（先删旧索引再写），不会堆出重复段落</li>
          <li>· 改了 <code className="text-zinc-700">src/mastra/knowledge/policies.md</code> 就要回来点一次</li>
        </ul>
      </section>
    </main>
  );
}`,
      },
    ],
  },
  {
    kind: "project",
    slug: "evals",
    title: "评测：把回归测试跑起来",
    menuTitle: "评测",
    summary:
      "给 agent 配一套会自己判分的案例集：改提示词、换模型之后，跑一遍就知道有没有变差。",
    verify: {
      label: "跑一遍评测",
      description: [
        "在 my-mastra-app 目录执行 pnpm dlx tsx --env-file=.env src/mastra/evals/run.ts（tsx 不会自己读 .env，少了它 agent 调模型会没 key）",
        "这是一个带评测的客服 agent：固定案例集会逐个问一遍，再用两个 scorer 打分，未达阈值时命令以失败退出",
      ],
    },
    concepts: [
      "`runEvals({ target, data, gates, scorers })` — 逐个问案例，再打分",
      "`gates` / `threshold` — gates 必须全 1.0（红线）；scorers 低于阈值记为 scored",
      "verdict — `passed` / `scored` / `failed`；非 passed 时退出码非 0",
      "`cites-policy` / `no-over-promise` — 两个 scorer：是否引用条款 / 是否越权承诺",
      "`run.output.text` — 打分要取 `.text`；拿整个对象去匹配永远命中不了",
    ],
    docLinks: [
      { title: "Evals 总览", href: "https://mastra.ai/docs/evals/overview" },
      { title: "自定义 Scorer", href: "https://mastra.ai/docs/evals/custom-scorers" },
      { title: "Gates 与 Verdict", href: "https://mastra.ai/docs/evals/gates-and-verdicts" },
      { title: "在 CI 里跑", href: "https://mastra.ai/docs/evals/running-in-ci" },
    ],
    files: [
      {
        path: "src/mastra/evals/scorers.ts",
        order: 1,
        action: "create",
        hint: "两个确定性打分器：有没有引用条款、有没有越权承诺",
        code: `import { createScorer } from "@mastra/core/evals";

// agent.generate() 返回的是对象，正文在 .text 里；兼容直接给字符串的情况
function outputText(run: { output?: unknown }): string {
  const out = run.output as any;
  if (typeof out === "string") return out;
  return out?.text ?? JSON.stringify(out ?? "");
}

// ① 确定性 scorer：不调模型，只看回答里有没有引用条款编号（P1–P6）
export const citesPolicyScorer = createScorer({
  id: "cites-policy",
  description: "回答是否引用了售后政策条款编号",
})
  .analyze(({ run }) => ({ cited: /P[1-6]/.test(outputText(run)) }))
  .generateScore(({ results }) => (results.analyzeStepResult.cited ? 1 : 0));

// ② 确定性 scorer：有没有超出政策的承诺（客服最容易犯的错）
export const noOverPromiseScorer = createScorer({
  id: "no-over-promise",
  description: "回答里有没有「保证 / 一定能」这类越权承诺",
})
  .analyze(({ run }) => ({ over: /保证|一定能|肯定能/.test(outputText(run)) }))
  .generateScore(({ results }) => (results.analyzeStepResult.over ? 0 : 1));`,
      },
      {
        path: "src/mastra/evals/cases.ts",
        order: 2,
        action: "create",
        hint: "固定案例集 —— 挑业务里真正会出错的问法",
        code: `// 固定案例集：放进版本控制，改提示词 / 换模型后拿它回归
// 案例要覆盖业务里真正会出错的点，而不是「你好」这种
export const evalCases = [
  { input: "生命之水能退吗" },
  { input: "我这单 15 天前签收的，坏了能换新吗" },
  { input: "你们有飞行器吗" },
  { input: "我这单能退吗" },
];
`,
      },
      {
        path: "src/mastra/evals/run.ts",
        order: 3,
        action: "create",
        hint: "跑一遍并把结果变成退出码（CI 用同一条命令）",
        code: `import { runEvals } from "@mastra/core/evals";
import { Mastra } from "@mastra/core/mastra";
import { LibSQLStore, LibSQLVector } from "@mastra/libsql";
import { supportAgent } from "../agents/support-agent";
import { evalCases } from "./cases";
import { citesPolicyScorer, noOverPromiseScorer } from "./scorers";
import { DB_URL } from "../db";

// 独立运行时没有 index.ts 里那个 Mastra 实例：agent 的记忆拿不到存储、打分结果也无处落库。
// 这里建一个挂了 storage 和 scorers 的最小实例、从它手里取 agent —— 与实例注入是同一机制。
const mastra = new Mastra({
  agents: { supportAgent },
  scorers: { citesPolicyScorer, noOverPromiseScorer },
  storage: new LibSQLStore({ id: "mastra-storage", url: DB_URL }),
  // 检索工具按名字从实例找向量库，这里也要有
  vectors: { knowledgeBase: new LibSQLVector({ id: "knowledgeBase", url: DB_URL }) },
});

// 顶层不能用 await（tsx 会把这个文件按 CommonJS 处理），所以包一层函数
async function main() {
  // 跑一遍案例集：每个案例问一次 agent，再用两个 scorer 打分
  const result = await runEvals({
    target: mastra.getAgent("supportAgent"),
    data: evalCases,
    // gates 必须全部 1.0，否则这次评测直接失败（越权承诺是红线）
    gates: [noOverPromiseScorer],
    // 普通 scorer 可以设阈值：低于阈值 verdict 会变成 scored
    scorers: [{ scorer: citesPolicyScorer, threshold: 0.6 }],
  });

  console.log("verdict:", result.verdict);
  console.log(JSON.stringify(result.scores ?? {}, null, 2));

  // 门禁：不是 passed 就以失败退出，CI 里就是一条红线
  if (result.verdict !== "passed") {
    process.exit(1);
  }
}

main();`,
      },
    ],
  },
  {
    kind: "project",
    slug: "deploy",
    title: "上线：存储、鉴权与部署",
    menuTitle: "上线",
    summary:
      "不上线也能验的三件事：给 API 加一道门（401 → 200）、构建产物真的能起起来、杀掉进程后没跑完的流程还能接着跑完。",
    verify: {
      label: "三个实验（命令都在「终端」栏）",
      description: [
        "① 门：不带钥匙的请求被拒、带上的才有响应 —— 两次 curl 分别看到 401 与 200",
        "② 产物：停掉 dev 后构建，再用另一个端口把产物起起来 —— 终端出现 Mastra API running 与 Studio available",
        "③ 续跑：在产物进程里发起一个会挂起的流程，把它杀掉，再用另一个进程凭 runId 跑完 —— 最后 status: success，五个步骤全 success",
      ],
    },
    concepts: [
      "`SimpleAuth` — 最简鉴权：把 token（API 访问凭证）与用户的对应关系写在代码里",
      "`Operator` — token 对应的用户类型：id / name / role",
      "`server.auth` — 鉴权挂在这里；没带 token 的请求会被拒",
      "`mastra build` — 打包出上线用的产物 `.mastra/output`（构建前先停 dev）",
      "`mastra start` — 起构建产物；`PORT=4112` 换个端口",
      "`resume-async?runId=` — 凭 runId 从挂起点继续跑（进程换了也能接着跑）",
    ],
    conceptArticle: {
      title: "延伸阅读：本地 → 线上，存储与观测怎么选",
      body: [
        "## 一句话",
        "本地是**两个文件**（业务数据一个、trace 一个）；线上要按域各找托管服务 —— 业务库用 Turso 最省事，观测（trace）交给 Langfuse / 平台 / ClickHouse。",
        "",
        "## 先分清两块数据",
        "- **业务数据**：对话记忆、workflow 快照、评测分数、政策向量 —— 库没了这些就真没了",
        "- **观测数据**：trace / 日志 / 指标 —— 用来排查和复盘，可以换后端",
        "",
        "## 本地现在连的是什么（没有服务、没有云）",
        "- `mastra.db`：libSQL 文件库（`db.ts` 里算出的绝对路径），装业务数据 + 向量",
        "- `mastra.duckdb`：DuckDB 文件库，装 trace / 日志；**没写路径 → 按各进程工作目录解析**，网页进程与 `mastra dev` 各建一份，所以 Studio 看不到网页里的对话",
        "- 模型是外部 API（`.env` 里的 key），不是本地",
        "",
        "## 业务库：Turso（推荐）还是 Postgres",
        "- **Turso（托管 libSQL）**：`index.ts` 里 `url: process.env.TURSO_DATABASE_URL ?? DB_URL` 与 `TURSO_AUTH_TOKEN` 就是为它留的 → **代码零改动**，官方 CLI 有 `mastra env db create --kind turso`",
        "- **Postgres（Neon / Supabase / Railway 等托管）**：团队本来就在运维 PG，或这库要长期跑真实业务、并发更高、需要更标准的备份与权限体系",
        "- 官方对 memory 这个域的推荐本就是 libSQL / PostgreSQL / MongoDB 三选一；判断标准：**课程 demo、单库小流量 → Turso；长期生产系统 → Postgres**",
        "",
        "## 观测库（trace / 日志 / 指标）：四选一",
        "- **Langfuse**（推荐起步）：挂 exporter 就跑，不用自己运维数据库；本机可用 `@mastra/langfuse`",
        "- **Mastra 平台**：`MastraPlatformExporter` 已经在 `index.ts` 里挂着，差一个 `MASTRA_PLATFORM_ACCESS_TOKEN`",
        "- **ClickHouse**：官方点名 observability 域该用的分析型后端（高频写入 + 聚合查询），包是 `@mastra/clickhouse`；适合要自己长期留存与分析的场景",
        "- **OTel 系**（Datadog / New Relic / SigNoz…）：团队已有这套监控体系时选它，包是 `@mastra/otel-exporter`",
        "- ⚠️ 官方硬规则：**多进程生产不要用本地文件库**；`observability` 域要么路由到专用分析后端，要么交给 exporter 上报",
        "",
        "## 顺手澄清三个容易混的概念",
        "- **libSQL 是文件型吗**：它是 SQLite 的分支 —— 本地用时是文件（`file:…`）；它另有**服务端形态**（`libsql://…` + token），Turso 就是把这层托管起来",
        "- **服务端模式 ≠ 绝对路径**：绝对路径是「多个进程各自打开同一份文件」，能不能行取决于引擎（libSQL 支持多进程、DuckDB 不行，所以两份 duckdb 分家）；服务端模式是「只有一个进程持有数据，其他人用 URL 请求它」—— 目标一样（一份数据），手段和前提不同",
        "- **exporters 是上报，不是搬家**：数据存在哪只由 storage 决定；挂了 `MastraStorageExporter` 才有本地那份给 Studio 读，另外挂的平台 / Langfuse 只是**再复制一份发出去**",
        "",
        "## Studio 的定位（别被「本地工具」误导）",
        "- 官方 Studio 文档明确：可以本地跑，也可以**加鉴权后部署到生产**给团队看",
        "- 它本质是个 UI 客户端：Settings 里填 `instance URL` + 认证 header，展示的是**所连 server 的 storage** 里的数据 —— 所以生产能不能看 trace，取决于那个 server 的观测存在哪，跟 Studio 本身无关",
        "",
        "## 落地顺序（以后有时间再走）",
        "1. **换业务库**：建 Turso 库 → 配 `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` → 代码不动，本地仍可继续用文件；验证：托管库里出现数据",
        "2. **接观测**：先挂 Langfuse（免费档）把上报链跑通，确认能看到线上用户的 trace；要自己留存分析，再把 `domains.observability` 换成 ClickHouse",
        "3. **部署与访问控制**：`mastra build` 打包到 `.mastra/output` 按平台启动（或用平台托管）；Studio 自托管时加 `SimpleAuth` 之类的鉴权",
        "",
        "## 官方出处",
        "- Storage 总览：https://mastra.ai/docs/storage/overview（域划分；应用与 `mastra dev` 同时运行要用绝对路径指向同一个库；生产用托管库；observability 走分析型后端）",
        "- DuckDB 集成：https://mastra.ai/integrations/databases/duckdb（开发期专用、进程内单文件、官方不推荐生产）",
        "- Studio 总览：https://mastra.ai/docs/studio/overview（可部署到生产；UI 客户端 + instance URL）",
        "",
        "## 这份笔记里没核实的东西",
        "- 各家价格与免费额度、Turso/Neon 的 SLA、Turso 内部的复制与分片实现细节 —— 都没查，用之前自己确认",
      ],
    },
    docLinks: [
      { title: "Storage", href: "https://mastra.ai/docs/storage" },
      { title: "Simple Auth", href: "https://mastra.ai/docs/auth/simple-auth" },
      { title: "部署 Mastra Server", href: "https://mastra.ai/docs/deployment/mastra-server" },
      { title: "Server Middleware", href: "https://mastra.ai/docs/server/middleware" },
    ],
    files: [
      {
        path: "src/mastra/index.ts",
        order: 1,
        action: "edit",
        hint: "给 HTTP 层加鉴权（其余配置不动）。这里的 token 是 API 访问凭证、不是模型 token —— 加完 Studio 也要在 Settings 里填 header 才能用",
        code: `// ① 顶部加 import
import { SimpleAuth } from "@mastra/core/server";

// ② 定义操作员类型：token → 用户（示例写死，生产放环境变量或换 JWT）
type Operator = { id: string; name: string; role: "admin" | "agent" };

// ③ 在 new Mastra({ ... }) 里加 server 一项
server: {
  auth: new SimpleAuth<Operator>({
    tokens: {
      "sk-admin-token": { id: "op-1", name: "主管", role: "admin" },
      "sk-agent-token": { id: "op-2", name: "客服", role: "agent" },
    },
  }),
},
`,
      },
      {
        path: "终端",
        order: 2,
        action: "run",
        hint: "两个本地实验：② 构建产物并起起来（前提是先停 dev）③ 杀掉进程后凭 runId 在另一个进程里续跑。三条命令的真实输出都写在注释里",
        code: `# ① 门关上了吗：不带 token → 401（Invalid or expired token）
curl -s http://localhost:4111/api/agents

# 带上钥匙 → 200 + agent 列表。这就是 token 的作用
curl -s -H "Authorization: Bearer sk-admin-token" http://localhost:4111/api/agents

# ② 先停掉正在跑的 dev（它占着产物目录），再构建
pnpm exec mastra build

# 换个端口把产物起起来：出现这两行，说明对外服务的是产物而不是源码
PORT=4112 pnpm exec mastra start
#   Mastra API running  http://localhost:4112/api
#   Studio available   http://localhost:4112

# ③ 在产物进程上发起一个会挂起的流程，记下返回里的 runId
curl -s -X POST "http://localhost:4112/api/workflows/after-sales/start-async" \\
  -H "Authorization: Bearer sk-admin-token" -H "Content-Type: application/json" \\
  -d '{"inputData":{"message":"NX-1007 没拆封，我想退"}}'
#   {"status":"suspended","runId":"…"}

# 杀掉这个进程（模拟重启 / 进程挂掉）
pkill -f "mastra start"

# 换另一个进程（4111 的 dev）凭 runId 续跑 —— runId 是查询参数，不是 body
curl -s -X POST "http://localhost:4111/api/workflows/after-sales/resume-async?runId=<刚才的 runId>" \\
  -H "Authorization: Bearer sk-admin-token" -H "Content-Type: application/json" \\
  -d '{"step":"approval","resumeData":{"approved":true}}'
#   status: success —— classify / lookup-order / judge / approval / reply 全 success
`,
      },
    ],
  },
];

export function getNavItem(slug: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.slug === slug);
}

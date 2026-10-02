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
      "Agent — 一个 agent 就是 id、name 和 instructions，加上 model，用 new Agent({ ... }) 定义",
      "instructions — agent 长期遵守的工作手册：角色是什么、该先问什么、不做什么，都写在这里",
      'Model Router — 模型写成 "provider/model" 字符串（如 deepseek/deepseek-flash），Mastra 自动读取对应的环境变量',
      "Memory — 挂到 Agent 上的会话记忆：让 agent 接得住多轮对话；数据落到 Mastra 实例的 storage（脚手架已配好 libSQL）",
      "lastMessages — 每一轮带进上下文的最近消息条数（默认 10，设 false 关闭）",
      "Mastra 实例 — new Mastra({ agents }) 是应用入口；注册过的 agent 才会出现在 Studio 里",
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
      "createTool — 定义 agent 可调用的工具：id、description、inputSchema、execute；裸对象定义不会被执行",
      "inputSchema — 模型需要填的参数，用 zod 约束并写 describe 说明",
      "outputSchema — 工具的返回值也用 zod 约束，后面拿到的就是结构化数据",
      "execute(input, context) — 只有这一种签名：校验后的入参 + 执行上下文（requestContext、abortSignal 等），用不到时可省略第二个参数",
      "tools — 传给 Agent：tools: { listProducts, findOrders, checkReturnEligibility }，一个工具一种动作，由模型决定什么时候调用",
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
  address: string; // 收货地址（第 13 课用来讲 PII 脱敏）
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
  }),
  execute: async ({ sku }) => ({
    orders: orders
      .filter(
        (item) =>
          (!sku || item.sku === sku),
      )
      .map((item) => ({
        orderId: item.orderId,
        customer: item.customer,
        sku: item.sku,
        deliveredDaysAgo: item.deliveredDaysAgo,
        logistics: item.logistics,
      })),
  }),
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
      "workingMemory — agent 的工作记忆（通俗说就是它的长期记忆）：跨对话保留的一小块结构化档案，不是聊天记录",
      "schema — 用 zod 定义档案有哪些字段；更新走合并语义：只提交要改的字段，没提的保持不变，传 null 才删除",
      "updateWorkingMemory — 写档案用的内置工具：开了工作记忆就有，不用自己声明；什么时候记，由提示词决定",
      "会话记忆 vs 工作记忆 — 会话记忆是「这段对话」的原文（第 2 课的 lastMessages），只在本对话内；工作记忆是 agent 自己写下的档案（订单号 / 商品 / 问题 / 已答复方案），跨对话都在",
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
      "semanticRecall — 把历史消息向量化，按语义相似度找回旧消息；开了之后每轮都要检索一次（说「你好」也一样），换了对话也捞得回来（默认关闭，开启要 vector + embedder）",
      "vector — 存这些向量的库：LibSQLVector 直接写本地文件（跟消息同一个 mastra.db）",
      "embedder — 把文字变成向量的模型：用云的（如硅基流动 BAAI/bge-large-zh-v1.5）或本地的 @mastra/fastembed；换模型会换维度，旧向量作废",
      "messageHistory.maxTokens — 按 token 预算裁掉太旧的历史；lastMessages 管条数，两个都写就是条数 + 预算双重上限",
      "可调项 — topK（召回几条）、messageRange（每条命中前后各带几条）、scope（resource＝客户/跨对话，thread＝单条对话）；命中的旧消息每轮都会进上下文，模型可能主动提起旧事，介意就在提示词里约束或调小 topK",
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
        path: "src/mastra/agents/support-agent.ts",
        order: 1,
        action: "replace",
        hint: "只改 memory 这一段（加 vector + embedder + 语义召回），其余保持上一课的样子",
        code: `import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLVector } from "@mastra/libsql";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { listProducts, findOrders } from "../tools/lookup-tool";
import { checkReturnEligibility } from "../tools/return-tool";

// 嵌入模型走硅基流动的 OpenAI 兼容端点：中文效果好，也不用在本地下载模型
const siliconflow = createOpenAICompatible({
  name: "siliconflow",
  baseURL: "https://api.siliconflow.cn/v1",
  apiKey: process.env.SILICONFLOW_API_KEY,
});

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
    // 向量和消息存同一个本地库文件
    vector: new LibSQLVector({ id: "mastra-vector", url: "file:./mastra.db" }),
    // 嵌入模型：硅基流动的 bge-large-zh-v1.5（1024 维，中文）
    embedder: siliconflow.embeddingModel("BAAI/bge-large-zh-v1.5"),
    options: {
      // 条数上限 + token 预算，两个都写就是双重上限
      lastMessages: 20,
      messageHistory: { maxTokens: 8000 },
      // 语义召回：跨对话捞回相关旧消息；topK 召回几条、messageRange 每条前后带几条、scope 跨不跨对话
      semanticRecall: { topK: 3, messageRange: 2, scope: "resource" },
      workingMemory: { enabled: true, schema: customerProfile },
    },
  }),
});
`,
      },
    ],
  },
  {
    kind: "project",
    slug: "chat-ui",
    title: "接入前端：用 AI SDK UI 聊天",
    menuTitle: "接入前端",
    summary:
      "给 agent 配一个网页聊天界面：加一个 API 路由把 agent 的输出转成 AI SDK 的消息流，前端用 useChat 消费。",
    install: {
      command: "pnpm add @mastra/ai-sdk@latest @ai-sdk/react ai",
      description: "在 my-mastra-app 目录执行 —— 把 agent 的输出转成 AI SDK 的消息流，页面才接得上。",
    },
    verify: {
      label: "打开页面验证",
      description: [
        "打开 http://localhost:3000（Studio 在 http://localhost:4111）",
        "这是一个接在自定义前端上的客服 agent，刷新页面后历史保留",
      ],
    },
    concepts: [
      "handleChatStream — 把 agent 的一次运行输出成 AI SDK 的消息流，前端协议不用改",
      "createUIMessageStreamResponse — AI SDK 的响应助手：把这条流按 UI 消息协议返回给客户端",
      "toAISdkMessages — 把 memory 里的消息转成 AI SDK 的 UIMessage，刷新页面时喂给 useChat",
      "getMemory / recall — 从 agent 拿到 memory，按对话 id + 客户 id 读回历史消息",
      "version — handleChatStream 与 toAISdkMessages 要和你装的 AI SDK 大版本对齐（官方 Next.js 指南写的是 v7）",
      "前端怎么接 — AI SDK 的 useChat：用 DefaultChatTransport 指定 api（/api/generate）和 body（chatId），POST 发消息、GET 水合历史、DELETE 清空；后端换成 Mastra 后这套协议不用改",
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
        hint: "路径必须是 /api/generate（下面的 app/page.tsx 用 useChat 调它）。注意 RESOURCE_ID 固定成 web-user：页面和 Studio 用的是两套 resource，记忆不互通（多客户时换成真实客户 id）",
        code: `import { handleChatStream } from "@mastra/ai-sdk";
import { toAISdkMessages } from "@mastra/ai-sdk/ui";
import { createUIMessageStreamResponse } from "ai";
import { NextResponse } from "next/server";
// 用项目根配好的 @/* 别名导入，别写 ../../../ 这种相对路径
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
        path: "src/mastra/index.ts",
        order: 2,
        action: "edit",
        hint: "只改 storage 里的一行：把数据库路径从相对路径换成绝对路径 —— 否则 Studio 和网页各建一份库，两边数据互不相通",
        code: `// 改动前
url: process.env.TURSO_DATABASE_URL ?? "file:./mastra.db",

// 这一行管什么：memory 的消息、工作记忆、向量都写在这个 libSQL 文件里
// 为什么要改：file:./xxx 是相对「进程的工作目录」，而两个进程的工作目录不一样
//           实测：mastra dev 会把库建到 src/mastra/public/mastra.db，不是项目根
// 不改会怎样：Studio 和网页各读写一份库 —— 在 Studio 里聊的记录，网页上根本看不到

// 改动后（换成你机器上的绝对路径）
url: process.env.TURSO_DATABASE_URL ?? "file:/Users/you/my-mastra-app/mastra.db",

// 怎么验证改对了：两个进程都跑起来后，项目里只该存在这一份 mastra.db；
// 在 Studio 里聊一句，刷新网页也能看到（反过来也一样）
`,
      },
      {
        path: "app/page.tsx",
        order: 3,
        action: "create",
        hint: "前端页面：useChat + DefaultChatTransport 消费 /api/generate，含刷新水合（GET）与清空对话（DELETE）",
        code: `"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { useEffect, useState } from "react";

const CHAT_ID = "default";

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

  // 清空记录：服务端删掉存档，本地消息也清掉，界面立刻变空
  async function handleClear() {
    await fetch("/api/generate?chatId=" + CHAT_ID, { method: "DELETE" });
    setMessages([]);
  }

  return (
    <div className="flex flex-1 flex-col items-center px-4 py-8 font-sans">
      <main className="flex min-h-0 w-full max-w-4xl flex-1 flex-col gap-4">
        <header className="flex shrink-0 items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl font-semibold tracking-tight">多轮对话</h1>
            <p className="text-sm text-zinc-500">
              连续聊天；消息保存在服务端 .chats/，刷新后自动恢复。
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

        <div className="min-h-[240px] flex-1 overflow-y-auto rounded-lg border border-zinc-200 bg-white p-4">
          {messages.length === 0 ? (
            <p className="text-sm text-zinc-400">发送第一条消息开始对话</p>
          ) : (
            <ul className="space-y-4">
              {messages.map((message) => (
                <li
                  key={message.id}
                  className={
                    message.role === "user" ? "flex justify-end" : "flex justify-start"
                  }
                >
                  <div
                    className={
                      message.role === "user"
                        ? "max-w-[85%] rounded-lg bg-zinc-900 px-3 py-2 text-sm leading-6 text-white"
                        : "max-w-[85%] rounded-lg bg-zinc-100 px-3 py-2 text-sm leading-6 text-zinc-900"
                    }
                  >
                    {message.parts.map((part, index) =>
                      part.type === "text" ? (
                        <span key={index} className="whitespace-pre-wrap">
                          {part.text}
                        </span>
                      ) : null,
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        {error && (
          <p className="shrink-0 text-sm text-red-600">{error.message}</p>
        )}

        <form
          className="shrink-0 space-y-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!input.trim() || loading) return;
            sendMessage({ text: input.trim() });
            setInput("");
          }}
        >
          <label className="block text-sm font-medium">
            消息
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
              placeholder="输入消息…"
              className="mt-1 w-full resize-none rounded-lg border border-zinc-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-zinc-200"
            />
          </label>
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
            >
              {loading ? "回复中…" : "发送"}
            </button>
            {loading && (
              <button
                type="button"
                onClick={() => stop()}
                className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
              >
                停止
              </button>
            )}
          </div>
        </form>
      </main>
    </div>
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
      "把一次售后处理做成固定流程：分类 → 查订单 → 判资格 → 回复；哪一步出错、哪一步慢，在 Studio 里都看得到。",
    verify: {
      label: "去 Studio 跑流程",
      description: [
        "打开 http://localhost:4111/workflows，选 after-sales",
        "这是一个把售后处理串成流程的客服工作流：意图分类、查订单、判资格、生成回复按步执行，每步的输入输出都能查到",
      ],
    },
    concepts: [
      "createWorkflow — 定义一个工作流：id、inputSchema、outputSchema、stateSchema，用 .then() / .branch() / .parallel() 串步骤，最后 .commit()",
      "createStep — 一步：id、inputSchema、outputSchema，execute 拿到 { inputData, state, setState, mastra, requestContext }",
      "Workflow State — 所有步骤共享的状态：stateSchema 声明字段，setState 更新，跨暂停恢复也保留",
      "Control Flow — .then 顺序、.branch 条件分支、.parallel 并行；分支写成一串 [条件函数, 步骤]",
      "步骤里调 agent / 调工具 — mastra.getAgent(\"support-agent\") 拿 agent；工具直接 findOrders.execute(input, { requestContext })",
    ],
    docLinks: [
      { title: "Workflows 总览", href: "https://mastra.ai/docs/workflows/overview" },
      { title: "Workflow State", href: "https://mastra.ai/docs/workflows/workflow-state" },
      { title: "Control Flow", href: "https://mastra.ai/docs/workflows/control-flow" },
      { title: "Agents and Tools", href: "https://mastra.ai/docs/workflows/agents-and-tools" },
    ],
    files: [
      {
        path: "src/mastra/workflows/after-sales.ts",
        order: 1,
        action: "create",
        hint: "把一次售后处理做成工作流（脚手架自带的 weather-workflow.ts 保持不动）",
        code: `import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { findOrders } from "../tools/lookup-tool";
import { checkReturnEligibility } from "../tools/return-tool";

// 所有步骤共享的状态：客户在办哪一单、办到哪一步
const stateSchema = z.object({
  intent: z.enum(["return", "logistics", "question"]).optional(),
  sku: z.string().optional(),
  orderId: z.string().optional(),
  decision: z.string().optional(),
  reason: z.string().optional(),
});

// ① 分类：语言理解交给模型
const classify = createStep({
  id: "classify",
  description: "判断客户这句话属于退换、物流还是其他咨询",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({
    intent: z.enum(["return", "logistics", "question"]),
    sku: z.string().optional(),
  }),
  stateSchema,
  execute: async ({ inputData, mastra, setState }) => {
    const agent = mastra?.getAgent("support-agent");
    if (!agent) throw new Error("support-agent not found");
    const res = await agent.generate(
      "把客户这句话归类，并抽出他说的商品名。客户原话：" + inputData.message,
      {
        structuredOutput: {
          schema: z.object({
            intent: z.enum(["return", "logistics", "question"]),
            sku: z.string().optional(),
          }),
        },
      },
    );
    const out = res.object ?? { intent: "question" as const };
    await setState({ intent: out.intent, sku: out.sku });
    return out;
  },
});

// ② 查订单：确定性的事交给工具，不让模型自己挑一单
const lookupOrder = createStep({
  id: "lookup-order",
  description: "按商品名查订单，唯一命中就写进状态",
  inputSchema: z.object({
    intent: z.enum(["return", "logistics", "question"]),
    sku: z.string().optional(),
  }),
  outputSchema: z.object({ found: z.boolean() }),
  stateSchema,
  execute: async ({ inputData, requestContext, setState }) => {
    if (inputData.intent !== "return") return { found: false };
    const { orders } = await findOrders.execute(
      { sku: inputData.sku },
      { requestContext },
    );
    if (orders.length !== 1) return { found: false };
    await setState({ orderId: orders[0].orderId });
    return { found: true };
  },
});

// ③ 判资格：天数与条款都在工具里，模型不参与
const judge = createStep({
  id: "judge",
  description: "按售后政策判定这一单能不能退 / 换 / 修",
  inputSchema: z.object({ found: z.boolean() }),
  outputSchema: z.object({ decision: z.string(), reason: z.string() }),
  stateSchema,
  execute: async ({ inputData, requestContext, state, setState }) => {
    if (!inputData.found || !state.orderId) {
      const reason = "还缺商品名或订单号，先跟客户确认是哪一件";
      await setState({ decision: "need-info", reason });
      return { decision: "need-info", reason };
    }
    const verdict = await checkReturnEligibility.execute(
      { orderId: state.orderId, issue: "quality" },
      { requestContext },
    );
    await setState({ decision: verdict.decision, reason: verdict.reason });
    return { decision: verdict.decision, reason: verdict.reason };
  },
});

// ④ 回复：把状态里的事实交给模型组织成人话
const reply = createStep({
  id: "reply",
  description: "用客户听得懂的话说明结果",
  inputSchema: z.object({ decision: z.string(), reason: z.string() }),
  outputSchema: z.object({ answer: z.string() }),
  stateSchema,
  execute: async ({ inputData, state, mastra }) => {
    const agent = mastra?.getAgent("support-agent");
    const prompt =
      "把下面这条判定结果转达给客户：简短、专业、不要新增承诺。\n" +
      "判定：" + inputData.decision + "\n依据：" + inputData.reason +
      "\n当前状态：" + JSON.stringify(state);
    const res = await agent?.generate(prompt);
    return { answer: res?.text ?? inputData.reason };
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
        order: 2,
        action: "edit",
        hint: "只加两处：import 与 workflows 里的一项，其余配置不动",
        code: `// ① 顶部加一行 import
import { afterSalesWorkflow } from "./workflows/after-sales";

// ② 在 new Mastra({ ... }) 的 workflows 里加一项
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
      "让流程在需要人拍板的地方停下来：挂起等主管批、批完从断点继续，重启进程也不丢。",
    verify: {
      label: "去 Studio 试审批",
      description: [
        "打开 http://localhost:4111/workflows，选 after-sales",
        "这是一个会中途等人工审批的客服工作流：退款类判定会挂起，批准或驳回后从断点继续跑完",
      ],
    },
    concepts: [
      "suspend — 步骤里 return await suspend({ ... }) 挂起本次运行，等外部带 resumeData 回来才继续往下走",
      "resumeSchema / suspendSchema — 前者声明「恢复时要传什么」，后者声明「挂起时要给人看什么」",
      "run.resume({ step, resumeData }) — 从挂起点继续：step 可传步骤实例或 id；只传 resumeData 就恢复最近那个挂起点",
      "createRun({ runId }) — 拿 runId 把某次运行取回来再 resume，所以恢复可以发生在任意请求里（HTTP 路由、审批后台）",
      "snapshots / time travel — 每一步的状态都落库：进程重启后仍能从断点续跑；也能回放到某一步重跑，用来查「这一步为什么错」",
    ],
    docLinks: [
      { title: "Suspend & Resume", href: "https://mastra.ai/docs/workflows/suspend-and-resume" },
      { title: "Human-in-the-Loop", href: "https://mastra.ai/docs/workflows/human-in-the-loop" },
      { title: "Snapshots", href: "https://mastra.ai/docs/workflows/snapshots" },
      { title: "Time Travel", href: "https://mastra.ai/docs/workflows/time-travel" },
    ],
    files: [
      {
        path: "src/mastra/workflows/after-sales.ts",
        order: 1,
        action: "replace",
        hint: "在上一课的流程里插一步「人工审批」：退款类判定挂起，批完再继续；其余步骤不动",
        code: `import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { orders } from "../data/orders";
import { findOrders } from "../tools/lookup-tool";
import { checkReturnEligibility } from "../tools/return-tool";

// 所有步骤共享的状态：客户在办哪一单、办到哪一步
const stateSchema = z.object({
  intent: z.enum(["return", "logistics", "question"]).optional(),
  sku: z.string().optional(),
  orderId: z.string().optional(),
  decision: z.string().optional(),
  reason: z.string().optional(),
});

// ① 分类：语言理解交给模型
const classify = createStep({
  id: "classify",
  description: "判断客户这句话属于退换、物流还是其他咨询",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({
    intent: z.enum(["return", "logistics", "question"]),
    sku: z.string().optional(),
  }),
  stateSchema,
  execute: async ({ inputData, mastra, setState }) => {
    const agent = mastra?.getAgent("support-agent");
    if (!agent) throw new Error("support-agent not found");
    const res = await agent.generate(
      "把客户这句话归类，并抽出他说的商品名。客户原话：" + inputData.message,
      {
        structuredOutput: {
          schema: z.object({
            intent: z.enum(["return", "logistics", "question"]),
            sku: z.string().optional(),
          }),
        },
      },
    );
    const out = res.object ?? { intent: "question" as const };
    await setState({ intent: out.intent, sku: out.sku });
    return out;
  },
});

// ② 查订单：确定性的事交给工具，不让模型自己挑一单
const lookupOrder = createStep({
  id: "lookup-order",
  description: "按商品名查订单，唯一命中就写进状态",
  inputSchema: z.object({
    intent: z.enum(["return", "logistics", "question"]),
    sku: z.string().optional(),
  }),
  outputSchema: z.object({ found: z.boolean() }),
  stateSchema,
  execute: async ({ inputData, requestContext, setState }) => {
    if (inputData.intent !== "return") return { found: false };
    const { orders } = await findOrders.execute(
      { sku: inputData.sku },
      { requestContext },
    );
    if (orders.length !== 1) return { found: false };
    await setState({ orderId: orders[0].orderId });
    return { found: true };
  },
});

// ③ 判资格：天数与条款都在工具里，模型不参与
const judge = createStep({
  id: "judge",
  description: "按售后政策判定这一单能不能退 / 换 / 修",
  inputSchema: z.object({ found: z.boolean() }),
  outputSchema: z.object({ decision: z.string(), reason: z.string() }),
  stateSchema,
  execute: async ({ inputData, requestContext, state, setState }) => {
    if (!inputData.found || !state.orderId) {
      const reason = "还缺商品名或订单号，先跟客户确认是哪一件";
      await setState({ decision: "need-info", reason });
      return { decision: "need-info", reason };
    }
    const verdict = await checkReturnEligibility.execute(
      { orderId: state.orderId, issue: "quality" },
      { requestContext },
    );
    await setState({ decision: verdict.decision, reason: verdict.reason });
    return { decision: verdict.decision, reason: verdict.reason };
  },
});

// ④ 人工审批：退款类判定要主管点头，其余直接过
const approval = createStep({
  id: "approval",
  description: "需要人工拍板的判定在这里挂起，等批准或驳回",
  inputSchema: z.object({ decision: z.string(), reason: z.string() }),
  outputSchema: z.object({ approved: z.boolean() }),
  stateSchema,
  // 恢复时外部要传什么
  resumeSchema: z.object({ approved: z.boolean(), note: z.string().optional() }),
  // 挂起时把要给人看的信息一起存下来
  suspendSchema: z.object({ orderId: z.string().optional(), reason: z.string() }),
  execute: async ({ inputData, resumeData, state, suspend, setState }) => {
    if (inputData.decision !== "refund") return { approved: true };
    // P4：客服可自主补偿 ≤ 50 黑龙币，超出必须主管审批
    const price = orders.find((item) => item.orderId === state.orderId)?.price ?? 0;
    if (price <= 50) return { approved: true };
    // 第一次执行：挂起，等主管
    if (!resumeData) {
      return await suspend({
        orderId: state.orderId,
        reason: inputData.reason + "（退款金额 " + price + " 黑龙币，超出 P4 的 50）",
      });
    }
    // 被 resume 之后才走到这里
    await setState({
      decision: resumeData.approved ? "refund-approved" : "handover",
    });
    return { approved: resumeData.approved };
  },
});

// ⑤ 回复：把状态里的事实交给模型组织成人话
const reply = createStep({
  id: "reply",
  description: "用客户听得懂的话说明结果",
  inputSchema: z.object({ decision: z.string(), reason: z.string() }),
  outputSchema: z.object({ answer: z.string() }),
  stateSchema,
  execute: async ({ inputData, state, mastra }) => {
    const agent = mastra?.getAgent("support-agent");
    const prompt =
      "把下面这条判定结果转达给客户：简短、专业、不要新增承诺。\n" +
      "判定：" + inputData.decision + "\n依据：" + inputData.reason +
      "\n当前状态：" + JSON.stringify(state);
    const res = await agent?.generate(prompt);
    return { answer: res?.text ?? inputData.reason };
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
  .then(approval)
  .then(reply)
  .commit();

// 恢复入口：真实项目里放在 HTTP 路由或审批后台
export async function approveRun(runId: string, approved: boolean) {
  const run = await afterSalesWorkflow.createRun({ runId });
  return run.resume({ step: "approval", resumeData: { approved } });
}
`,
      },
    ],
  },
  {
    kind: "project",
    slug: "workflow-resilience",
    title: "工作流（三）：容错与定时",
    menuTitle: "工作流（三）",
    summary:
      "让流程自己扛住失败、按点自己跑：失败按策略重试、出错有统一兜底、到点自动做一次订单巡检。",
    verify: {
      label: "看两个工作流",
      description: [
        "打开 http://localhost:4111/workflows，能看到 after-sales 与 daily-check 两个工作流",
        "这是一个会重试、会兜底、会定时自跑的客服工作流：步骤失败按配置重试，每天 9 点自动跑一次订单巡检",
      ],
    },
    concepts: [
      "retryConfig — 工作流级重试：{ attempts, delay } 对所有步骤生效",
      "retries — 步骤级重试次数，写在 createStep 里，会覆盖工作流级的配置",
      "options.onError — 只在最终失败时调用：拿得到 error、status（failed / tripwire）与各步骤结果，适合统一发告警",
      "schedule — 在 createWorkflow 里写 { cron, timezone, inputData }，Mastra 启动时自动接管；同一个工作流照样能被手动运行",
      "Background Tasks — 跑很久的任务不想占着请求就丢到后台执行（本课不展开，链接在右侧）",
    ],
    docLinks: [
      { title: "Error Handling", href: "https://mastra.ai/docs/workflows/error-handling" },
      { title: "Scheduled Workflows", href: "https://mastra.ai/docs/workflows/scheduled-workflows" },
      { title: "Background Tasks", href: "https://mastra.ai/docs/harness/background-tasks" },
      { title: "Schedules", href: "https://mastra.ai/docs/harness/schedules" },
    ],
    files: [
      {
        path: "src/mastra/workflows/after-sales.ts",
        order: 1,
        action: "edit",
        hint: "在第 8 课的流程上加：重试策略与失败兜底（不要整体覆盖）",
        code: `// ① 工作流定义里加 retryConfig（所有步骤通用）与 onError（最终失败的兜底）
const afterSalesWorkflow = createWorkflow({
  id: "after-sales",
  inputSchema: z.object({ message: z.string() }),
  outputSchema: z.object({ answer: z.string() }),
  stateSchema,
  // 失败重试 3 次，间隔 1 秒
  retryConfig: { attempts: 3, delay: 1000 },
  options: {
    onError: async (errorInfo) => {
      console.error("[after-sales] 失败：", errorInfo.error?.message);
    },
  },
})
  .then(classify)
  .then(lookupOrder)
  .then(judge)
  .then(approval)
  .then(reply)
  .commit();

// ② 只想给某一步单独设重试次数，就写在 createStep({ ... }) 里（覆盖工作流级）
const lookupOrder = createStep({
  id: "lookup-order",
  description: "按商品名查订单，唯一命中就写进状态",
  retries: 3,
  // ...其余同上一课
});
`,
      },
      {
        path: "src/mastra/workflows/daily-check.ts",
        order: 2,
        action: "create",
        hint: "新建一个定时工作流：每天 9 点自动扫一遍订单",
        code: `import { createStep, createWorkflow } from "@mastra/core/workflows";
import { z } from "zod";
import { orders } from "../data/orders";

// 巡检：挑出快到 7 天 / 15 天售后窗口的订单
const scan = createStep({
  id: "scan",
  description: "扫一遍订单，挑出快到售后窗口的",
  inputSchema: z.object({}),
  outputSchema: z.object({ todo: z.array(z.string()) }),
  execute: async () => {
    const todo = orders
      .filter(
        (item) =>
          item.deliveredDaysAgo !== null &&
          item.deliveredDaysAgo >= 5 &&
          item.deliveredDaysAgo <= 15,
      )
      .map(
        (item) =>
          item.orderId + " " + item.sku + " 已签收 " + item.deliveredDaysAgo + " 天",
      );
    return { todo };
  },
});

const collect = createStep({
  id: "collect",
  description: "把待跟进清单整理成一行摘要",
  inputSchema: z.object({ todo: z.array(z.string()) }),
  outputSchema: z.object({ count: z.number(), summary: z.string() }),
  execute: async ({ inputData }) => {
    const count = inputData.todo.length;
    return {
      count,
      summary: count === 0 ? "今天没有快到窗口的订单" : inputData.todo.join("；"),
    };
  },
});

export const dailyCheckWorkflow = createWorkflow({
  id: "daily-check",
  inputSchema: z.object({}),
  outputSchema: z.object({ count: z.number(), summary: z.string() }),
  // 每天 9 点（上海时间）自动跑一次；Mastra 启动时会接管这个 schedule，不用另外注册
  schedule: {
    cron: "0 9 * * *",
    timezone: "Asia/Shanghai",
    inputData: {},
  },
})
  .then(scan)
  .then(collect)
  .commit();
`,
      },
      {
        path: "src/mastra/index.ts",
        order: 3,
        action: "edit",
        hint: "把新工作流也注册进去（带 schedule 的工作流同样要注册才会被调度）",
        code: `// ① 顶部加一行 import
import { dailyCheckWorkflow } from "./workflows/daily-check";

// ② workflows 里加一项
workflows: { weatherWorkflow, afterSalesWorkflow, dailyCheckWorkflow },
`,
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
      description: "在 my-mastra-app 目录执行 —— 切块（MDocument）和检索工具（createVectorQueryTool）都在 @mastra/rag 里；嵌入模型沿用第 5 课的硅基流动，不用再配 key。",
    },
    verify: {
      label: "去 Studio 问政策",
      description: [
        "先打开 http://localhost:4111/workflows 手动跑一次 ingest-policies，把政策原文入库",
        "这是一个带政策知识库的客服 agent：答政策问题时先检索条款，回答里会说清依据 P1 还是 P2",
      ],
    },
    concepts: [
      "MDocument — 把原文装进来：MDocument.fromText(...)，也支持 fromMarkdown / fromHTML / fromJSON",
      "chunk — 切块：{ strategy: \"recursive\", maxSize, overlap, separators }；块太大检索粗、太小丢上下文",
      "embedMany — 批量向量化（ai 包提供）：embedMany({ model, values }) → { embeddings }，维度必须和建索引时一致",
      "createIndex / upsert — 先建索引（indexName、dimension、metric）再写向量；metadata 里带条款号，回答才能给出来源",
      "createVectorQueryTool — 把检索包成工具给 agent：{ vectorStoreName, indexName, model }；vectorStoreName 要在 Mastra 实例的 vectors 里注册",
    ],
    docLinks: [
      { title: "RAG 总览", href: "https://mastra.ai/reference/rag/overview" },
      { title: "切块与向量化", href: "https://mastra.ai/reference/rag/chunking-and-embedding" },
      { title: "检索与检索工具", href: "https://mastra.ai/reference/rag/retrieval" },
      { title: "可换的向量库", href: "https://mastra.ai/reference/rag/vector-databases" },
    ],
    files: [
      {
        path: "src/mastra/knowledge/embedder.ts",
        order: 1,
        action: "create",
        hint: "把嵌入模型与索引名抽出来：入库和检索两处要用同一份",
        code: `import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// 嵌入模型沿用第 5 课的硅基流动：中文好用，也不用在本地下载模型
const siliconflow = createOpenAICompatible({
  name: "siliconflow",
  baseURL: "https://api.siliconflow.cn/v1",
  apiKey: process.env.SILICONFLOW_API_KEY,
});

export const policyEmbedder = siliconflow.embeddingModel(
  "BAAI/bge-large-zh-v1.5",
);

// 向量索引名与模型维度：入库和检索两处都要用同一个值
export const POLICY_INDEX = "policies";
export const POLICY_EMBED_DIM = 1024;
`,
      },
      {
        path: "src/mastra/knowledge/policies.ts",
        order: 2,
        action: "create",
        hint: "政策原文 —— 检索的唯一事实来源（对应 docs/scenario.md 的 P1–P6）",
        code: `// 售后政策原文：这是唯一的事实来源，检索工具只会引用它
// （条款必须可判定：时间窗口 + 条件 + 责任方，一个字都不能含糊）
export const policyDocs: { title: string; text: string }[] = [
  {
    title: "P1 退货",
    text: "P1 退货：签收后 7 个自然日内、原厂封禁未启（未拆封、未启用）：全额退款，星际运费由商家承担；超过 7 天不再适用无理由退货。",
  },
  {
    title: "P2 换新",
    text: "P2 换新：签收后 15 个自然日内出现质量问题（梭体灵纹闪烁、金丝断裂）：免费换新，需要客户提供故障记录。",
  },
  {
    title: "P3 修复",
    text: "P3 修复：1 年免费修复，梭体核心非人为损坏免费修复；人为损坏（含强行灌注念力）收材料费。",
  },
  {
    title: "P4 补偿",
    text: "P4 补偿：客服可自主补偿不超过 50 黑龙币；超出部分必须走主管审批。",
  },
  {
    title: "P5 出处",
    text: "P5 出处：政策解释以售后政策文件为准，客服不得口头加码；不在在售清单内或超出窗口的，一律需要主管确认。",
  },
  {
    title: "P6 超期未拆封",
    text: "P6 超期未拆封：未拆封但已过 7 天，无理由退货窗口关闭、不能退；如有质量问题再按 P2 / P3 处理。",
  },
  {
    title: "耗材说明",
    text: "耗材说明：生命之水属于耗材，退货与换新照常适用（P1 / P2），但不适用修复（P3），因为一次性消耗品没有维修价值。",
  },
];
`,
      },
      {
        path: "src/mastra/workflows/ingest-policies.ts",
        order: 3,
        action: "create",
        hint: "入库工作流：切块 → 向量化 → 建索引 → 写入（在 Studio 里跑一次即可）",
        code: `import { createStep, createWorkflow } from "@mastra/core/workflows";
import { LibSQLVector } from "@mastra/libsql";
import { MDocument } from "@mastra/rag";
import { embedMany } from "ai";
import { z } from "zod";
import {
  POLICY_EMBED_DIM,
  POLICY_INDEX,
  policyEmbedder,
} from "../knowledge/embedder";
import { policyDocs } from "../knowledge/policies";

// 向量和消息存在同一个库文件里
// （第 6 课讲过：两个进程并行时这里要用绝对路径，否则各建一份库）
const vectorStore = new LibSQLVector({
  id: "knowledgeBase",
  url: "file:./mastra.db",
});

const ingest = createStep({
  id: "ingest",
  description: "把政策原文切块、向量化、写入向量库",
  inputSchema: z.object({}),
  outputSchema: z.object({ chunks: z.number() }),
  execute: async () => {
    // ① 切块：块大小和重叠决定检索粒度
    const chunks: string[] = [];
    const metadatas: { title: string }[] = [];
    for (const doc of policyDocs) {
      const document = MDocument.fromText(doc.text);
      const parts = await document.chunk({
        strategy: "recursive",
        maxSize: 256,
        overlap: 32,
        separators: ["\n"],
      });
      for (const part of parts) {
        chunks.push(part.text);
        // metadata 里带上条款号：检索回来才能说清"依据哪一条"
        metadatas.push({ title: doc.title });
      }
    }

    // ② 向量化：模型输出维度必须和建索引时一致
    const { embeddings } = await embedMany({
      model: policyEmbedder,
      values: chunks,
    });

    // ③ 建索引 + 写入（索引已存在时会报错，重复入库前先删旧索引或换个索引名）
    await vectorStore.createIndex({
      indexName: POLICY_INDEX,
      dimension: POLICY_EMBED_DIM,
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
  .commit();
`,
      },
      {
        path: "src/mastra/tools/policy-search.ts",
        order: 4,
        action: "create",
        hint: "把检索包成工具，交给 agent",
        code: `import { createVectorQueryTool } from "@mastra/rag";
import { POLICY_INDEX, policyEmbedder } from "../knowledge/embedder";

// 把检索包成一个工具：agent 只有遇到政策问题时才会调它
// vectorStoreName 对应 Mastra 实例里注册的向量库名字（这里是 knowledgeBase）
export const policySearch = createVectorQueryTool({
  vectorStoreName: "knowledgeBase",
  indexName: POLICY_INDEX,
  model: policyEmbedder,
});
`,
      },
      {
        path: "src/mastra/agents/support-agent.ts",
        order: 5,
        action: "replace",
        hint: "把检索工具挂到 agent 上，并在提示词里要求「说清依据哪一条」",
        code: `import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLVector } from "@mastra/libsql";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import { listProducts, findOrders } from "../tools/lookup-tool";
import { checkReturnEligibility } from "../tools/return-tool";
import { policySearch } from "../tools/policy-search";

// 嵌入模型走硅基流动的 OpenAI 兼容端点：中文效果好，也不用在本地下载模型
const siliconflow = createOpenAICompatible({
  name: "siliconflow",
  baseURL: "https://api.siliconflow.cn/v1",
  apiKey: process.env.SILICONFLOW_API_KEY,
});

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
    vector: new LibSQLVector({ id: "mastra-vector", url: "file:./mastra.db" }),
    embedder: siliconflow.embeddingModel("BAAI/bge-large-zh-v1.5"),
    options: {
      lastMessages: 20,
      messageHistory: { maxTokens: 8000 },
      semanticRecall: { topK: 3, messageRange: 2, scope: "resource" },
      workingMemory: { enabled: true, schema: customerProfile },
    },
  }),
});
`,
      },
      {
        path: "src/mastra/index.ts",
        order: 6,
        action: "edit",
        hint: "注册向量库与入库工作流（vectorStoreName 要和这里注册的名字一致）",
        code: `// ① 顶部加 import
import { LibSQLVector } from "@mastra/libsql";
import { ingestPoliciesWorkflow } from "./workflows/ingest-policies";

// ② 在 new Mastra({ ... }) 里加两项
vectors: {
  knowledgeBase: new LibSQLVector({ id: "knowledgeBase", url: "file:./mastra.db" }),
},
workflows: {
  weatherWorkflow,
  afterSalesWorkflow,
  dailyCheckWorkflow,
  ingestPoliciesWorkflow,
},
`,
      },
    ],
  },
];

export function getNavItem(slug: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.slug === slug);
}

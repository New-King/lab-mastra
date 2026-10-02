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
    menuTitle: "初始化",
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
    title: "接入前端：复用 lab-ai-sdk 的页面",
    menuTitle: "接入前端",
    summary:
      "换成 lab-ai-sdk 的前端：加一个 API 路由把 agent 的输出转成 AI SDK 的消息流，页面原样搬过来就能用。",
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
    ],
    docLinks: [
      {
        title: "Next.js 集成",
        href: "https://mastra.ai/guides/getting-started/next-js",
      },
      {
        title: "AI SDK UI",
        href: "https://mastra.ai/integrations/agentic-ui/ai-sdk-ui",
      },
      { title: "recall 参考", href: "https://mastra.ai/reference/memory/recall" },
      {
        title: "useChat",
        href: "https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat",
      },
          {
        title: "toAISdkStream（消息转换）",
        href: "https://mastra.ai/reference/ai-sdk/to-ai-sdk-stream",
      },
],
    files: [
      {
        path: "app/api/generate/route.ts",
        order: 1,
        action: "create",
        hint: "路径用 /api/generate，和 lab-ai-sdk 第 4 课页面里写死的地址一致 —— 把那份 app/page.tsx 整份复制过来覆盖本项目的，一行都不用改。注意 RESOURCE_ID 固定成 web-user：页面和 Studio 用的是两套 resource，记忆不互通（多客户时换成真实客户 id）",
        code: `import { handleChatStream } from "@mastra/ai-sdk";
import { toAISdkMessages } from "@mastra/ai-sdk/ui";
import { createUIMessageStreamResponse } from "ai";
import { NextResponse } from "next/server";
// app/ 在项目根目录，Mastra 在 src/mastra/，所以用相对路径
import { mastra } from "../../../src/mastra";

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
        hint: "只改 storage 里的一行：next dev 和 mastra dev 的工作目录不同，相对路径会各建一个库文件，Studio 和页面看到的就不是同一份数据（把路径换成你机器上的实际路径）",
        code: `// 改动前
url: process.env.TURSO_DATABASE_URL ?? "file:./mastra.db",

// 改动后（绝对路径）
url: process.env.TURSO_DATABASE_URL ?? "file:/absolute/path/to/my-mastra-app/mastra.db",
`,
      },
    ],
  },
];

export function getNavItem(slug: string): NavItem | undefined {
  return NAV_ITEMS.find((item) => item.slug === slug);
}

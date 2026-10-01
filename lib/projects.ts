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
      "把空壳 agent 定成你的场景：虚拟宇宙公司官方客服 —— 写清职责、边界和「先确认什么再谈处置」，注册到 Mastra 入口，在 Studio 里跟它对话。",
    verify: {
      label: "去 Studio 对话",
      description: [
        "打开 http://localhost:4111/agents，选 support-agent",
        "问「你好」→ 中文、简短回答",
        "问「我的金丝断裂」→ 它先问你要物品序列号或订单号，说明 instructions 生效了",
      ],
    },
    concepts: [
      "Agent — 一个 agent 就是 id、name 和 instructions，加上 model，用 new Agent({ ... }) 定义",
      "instructions — agent 长期遵守的工作手册：角色是什么、该先问什么、不做什么，都写在这里",
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
        path: "src/mastra/agents/support-agent.ts",
        order: 1,
        action: "create",
        hint: "定义 agent：身份 + 工作手册 + 模型",
        code: `import { Agent } from "@mastra/core/agent";

// 一个 agent = 身份（id / name）+ 工作手册（instructions）+ 模型（model）
export const supportAgent = new Agent({
  id: "support-agent",
  name: "虚拟宇宙公司客服",
  // instructions 相当于系统提示：写清角色、职责和回答方式，agent 每轮都遵守
  instructions: \`你是虚拟宇宙公司官方客服。
- 职责：帮客户解决武器、装备与药剂的问题（退换、修复、运输）
- 先确认物品序列号或订单号，再谈处置；不知道就先问一句
- 只承诺售后政策内的处置，政策外的一律说「需要主管确认」
- 中文、简短、专业，不卖萌\`,
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
        "问「DT-7A31-X9 的金丝断裂，能换新吗？」→ 它调用 checkReturnEligibility，给出 exchange 与理由（P2）",
        "问「NX-1001 那单封禁未启，想退掉」→ 给出 refund（P1）",
        "在 Trace 里能看到工具的入参（serial / issue）与返回值",
      ],
    },
    concepts: [
      "createTool — 定义 agent 可调用的工具：id、description、inputSchema、execute；裸对象定义不会被执行",
      "inputSchema — 模型需要填的参数，用 zod 约束并写 describe 说明",
      "outputSchema — 工具的返回值也用 zod 约束，后面拿到的就是结构化数据",
      "execute(input, context) — 只有这一种签名：校验后的入参 + 执行上下文（requestContext、abortSignal 等），用不到时可省略第二个参数",
      "tools — 传给 Agent：tools: { checkReturnEligibility }，由模型决定什么时候调用",
    ],
    docLinks: [
      { title: "Tools", href: "https://mastra.ai/docs/agents/tools" },
      { title: "Agents", href: "https://mastra.ai/docs/agents" },
      {
        title: "Request Context",
        href: "https://mastra.ai/docs/server/request-context",
      },
    ],
    files: [
      {
        path: "src/mastra/data/orders.ts",
        order: 1,
        action: "create",
        hint: "先造一份模拟数据 —— 真实项目里换成你的订单库或平台接口（本课不接任何真实平台）",
        code: `// 模拟数据：真实项目里换成你的订单库 / 平台接口
export type Order = {
  orderId: string;
  customer: string; // 客户称呼
  sku: string; // 商品
  price: number; // 黑龙币
  serial: string; // 装备 / 配件序列号
  deliveredAt: string | null; // 签收日期；未签收为 null
  logistics: string;
  logisticsUpdatedAt: string;
  address: string; // 收货坐标（第 13 课用来讲 PII 脱敏）
};

// 5 条数据刻意覆盖全部分支：可退 / 可换 / 保修内 / 超修复 / 未签收
export const orders: Order[] = [
  {
    orderId: "NX-1001",
    customer: "林悦",
    sku: "遁天梭",
    price: 24999,
    serial: "DT-7A31-X9",
    deliveredAt: "2026-09-25",
    logistics: "已签收（星际运输队抵达）",
    logisticsUpdatedAt: "2026-09-25",
    address: "地球·江南基地市 8 号住所",
  },
  {
    orderId: "NX-1002",
    customer: "陈默",
    sku: "金丝网",
    price: 1299,
    serial: "JS-4482-M1",
    deliveredAt: "2026-09-18",
    logistics: "已签收（星际运输队抵达）",
    logisticsUpdatedAt: "2026-09-18",
    address: "地球·江南基地市 21 号住所",
  },
  {
    orderId: "NX-1003",
    customer: "苏航",
    sku: "S 级飞刀",
    price: 899,
    serial: "FD-0091-K7",
    deliveredAt: "2025-08-01",
    logistics: "已签收（星际运输队抵达）",
    logisticsUpdatedAt: "2025-08-01",
    address: "地球·江南基地市 5 号住所",
  },
  {
    orderId: "NX-1004",
    customer: "周嘉",
    sku: "遁天梭",
    price: 24999,
    serial: "DT-2210-Q4",
    deliveredAt: "2025-09-15",
    logistics: "已签收（星际运输队抵达）",
    logisticsUpdatedAt: "2025-09-15",
    address: "地球·江南基地市 12 号住所",
  },
  {
    orderId: "NX-1005",
    customer: "郑一",
    sku: "生命之水",
    price: 399,
    serial: "SM-7712-T0",
    deliveredAt: null,
    logistics: "运输中（已停留 5 天）",
    logisticsUpdatedAt: "2026-09-26",
    address: "地球·江南基地市 3 号仓库",
  },
];
`,
      },
      {
        path: "src/mastra/tools/return-tool.ts",
        order: 2,
        action: "create",
        hint: "把售后政策写成一个确定性工具（脚手架自带的 weather-tool.ts 保持不动）",
        code: `import { createTool } from "@mastra/core/tools";
import { z } from "zod";
import { orders } from "../data/orders";

const DAY = 24 * 60 * 60 * 1000;

// 工具必须用 createTool 定义（用裸对象写不会被执行）
export const checkReturnEligibility = createTool({
  id: "check-return-eligibility",
  description:
    "按售后政策判断这套装备 / 配件能否退货、换新或修复：P1 签收 7 天内封禁未启可退；P2 签收 15 天内质量问题可换；P3 一年保修期内可修",
  // inputSchema：模型要填的参数，用 zod 约束，并写 describe 帮模型填对
  inputSchema: z.object({
    serial: z.string().describe("装备或配件序列号，例如 DT-7A31-X9"),
    issue: z
      .enum(["unopened", "quality", "other"])
      .describe("客户的问题类型：unopened 未拆封、quality 质量问题、other 其他"),
  }),
  // outputSchema：返回值也约束住，后面拿到的是结构化数据
  outputSchema: z.object({
    serial: z.string(),
    sku: z.string(),
    daysSinceDelivery: z.number().optional(),
    decision: z.enum(["refund", "exchange", "repair", "reject", "pending"]),
    reason: z.string(),
  }),
  // execute 只有这一种签名：(input, context)；用不到上下文时可省略第二个参数
  execute: async ({ serial, issue }) => {
    // 天数与条款是确定性的事，交给代码；模型只负责把客户的话归成 issue
    const order = orders.find((item) => item.serial === serial);
    if (!order) {
      return {
        serial,
        sku: "未知",
        decision: "reject",
        reason: "查不到该序列号对应的订单，先请客户核对序列号或订单号",
      };
    }
    if (!order.deliveredAt) {
      return {
        serial,
        sku: order.sku,
        decision: "pending",
        reason: "该订单还没签收（物流：" + order.logistics + "），先查运输进度再谈售后",
      };
    }
    const days = Math.floor(
      (Date.now() - new Date(order.deliveredAt).getTime()) / DAY,
    );
    if (issue === "unopened" && days <= 7) {
      return {
        serial,
        sku: order.sku,
        daysSinceDelivery: days,
        decision: "refund",
        reason: "签收 " + days + " 天、封禁未启，符合 P1：全额退款，星际运费由商家承担",
      };
    }
    if (issue === "quality" && days <= 15) {
      return {
        serial,
        sku: order.sku,
        daysSinceDelivery: days,
        decision: "exchange",
        reason: "签收 " + days + " 天、质量问题，符合 P2：免费换新（需提供故障记录）",
      };
    }
    if (days <= 365) {
      return {
        serial,
        sku: order.sku,
        daysSinceDelivery: days,
        decision: "repair",
        reason: "签收 " + days + " 天，已过 7 / 15 天窗口，但在 P3 一年保修期内：非人为损坏免费修复",
      };
    }
    return {
      serial,
      sku: order.sku,
      daysSinceDelivery: days,
      decision: "reject",
      reason: "签收 " + days + " 天，已超出 P3 的一年保修期：只能付费修复",
    };
  },
});
`,
      },
      {
        path: "src/mastra/agents/support-agent.ts",
        order: 3,
        action: "replace",
        hint: "把工具交给 agent",
        code: `import { Agent } from "@mastra/core/agent";
import { checkReturnEligibility } from "../tools/return-tool";

export const supportAgent = new Agent({
  id: "support-agent",
  name: "虚拟宇宙公司客服",
  instructions: \`你是虚拟宇宙公司官方客服。
- 职责：帮客户解决武器、装备与药剂的问题（退换、修复、运输）
- 先确认物品序列号或订单号，再谈处置；不知道就先问一句
- 判定退换资格时调用 checkReturnEligibility，不要自己推算天数
- 只承诺售后政策内的处置，政策外的一律说「需要主管确认」
- 中文、简短、专业，不卖萌\`,
  model: "deepseek/deepseek-flash",
  // 把工具交给 agent，由模型决定什么时候调用
  tools: { checkReturnEligibility },
});
`,
      },
    ],
  },
  {
    kind: "project",
    slug: "memory-conversation",
    title: "记忆（一）：会话与工作记忆",
    menuTitle: "记忆（一）",
    summary:
      "给 agent 挂上记忆：缺的信息先问一次、记进工作记忆，之后不再重复问；最近的对话也一并带进上下文。",
    verify: {
      label: "去 Studio 试记忆",
      description: [
        "打开 http://localhost:4111/agents，选 support-agent",
        "问「我的金丝断裂，要换新」→ 它先问你序列号（还没记住）",
        "答「JS-4482-M1」→ 它给出换新结论（P2），并把序列号与结论写进工作记忆",
        "再问「那你们什么时候安排？」→ 直接引用刚才的答复，不再问序列号",
        "新建一条 thread，问「我的物品序列号是多少？」→ 仍答得出（工作记忆跨会话）",
      ],
    },
    concepts: [
      "Memory — 挂到 Agent 上的记忆：memory: new Memory({ options: { ... } })，数据落到 Mastra 实例配置的 storage（脚手架已配好 libSQL）",
      "lastMessages — 每一轮带进上下文的最近消息条数（默认 10，设 false 关闭）",
      "workingMemory — agent 的跨轮记事本：记住客户信息（称呼、序列号、问题、已答复的方案）；格式二选一，template（Markdown 文本块）或 schema（zod 对象），不能同时用",
      "schema 的合并语义 — agent 只提交要改的字段，没提的保持不变；字段设成 null 就是删除",
      "scope — 工作记忆与语义召回的作用范围：resource（默认，同一个用户的所有会话共享）或 thread（只在本会话内）",
      "updateWorkingMemory — agent 写工作记忆用的内置工具；它该问什么、该记什么，由 instructions 决定",
    ],
    docLinks: [
      { title: "Memory 总览", href: "https://mastra.ai/docs/memory/overview" },
      {
        title: "Message History",
        href: "https://mastra.ai/docs/memory/message-history",
      },
      {
        title: "Working Memory",
        href: "https://mastra.ai/docs/memory/working-memory",
      },
      { title: "Storage", href: "https://mastra.ai/docs/storage" },
    ],
    files: [
      {
        path: "src/mastra/agents/support-agent.ts",
        order: 1,
        action: "replace",
        hint: "在上一课的基础上加 memory（本轮对话 + 跨会话的工作记忆），其余不动",
        code: `import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { z } from "zod";
import { checkReturnEligibility } from "../tools/return-tool";

// 工作记忆的字段用 zod 约束：agent 只填该填的，读出来是结构化数据
const customerProfile = z.object({
  name: z.string().optional().describe("客户称呼"),
  serial: z.string().optional().describe("装备或配件序列号，例如 JS-4482-M1"),
  issue: z.string().optional().describe("正在处理的售后问题，例如 金丝断裂"),
  promise: z.string().optional().describe("已经答复客户的处理方案，例如 已告知可换新（P2）"),
});

export const supportAgent = new Agent({
  id: "support-agent",
  name: "虚拟宇宙公司客服",
  instructions: \`你是虚拟宇宙公司官方客服。
- 职责：帮客户解决武器、装备与药剂的问题（退换、修复、运输）
- 先确认物品序列号或订单号，再谈处置；不知道就先问一句
- 判定退换资格时调用 checkReturnEligibility，不要自己推算天数
- 拿到序列号、问题和已答复的方案，用 updateWorkingMemory 记下来，之后不要重复问
- 已经答复过的方案不要改口
- 只承诺售后政策内的处置，政策外的一律说「需要主管确认」
- 中文、简短、专业，不卖萌\`,
  model: "deepseek/deepseek-flash",
  tools: { checkReturnEligibility },
  // 记忆：最近 20 条消息进上下文，外加一块跨会话的工作记忆
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
    title: "记忆（二）：语义召回与多用户",
    menuTitle: "记忆（二）",
    summary:
      "让 agent 记得更久：把历史向量化做语义召回，按 token 预算裁剪上下文，并用 thread / resource 两个 id 决定它记得谁、记得哪一段。",
    verify: {
      label: "去 Studio 试召回",
      description: [
        "打开 http://localhost:4111/agents，选 support-agent",
        "先聊一句能放很久的：「JS-4482-M1 这台的金丝断裂」",
        "新建一条 thread，问「我上次说的那台金丝网什么问题？」→ 它召回那句话；接着问「能换新吗」它会调工具",
        "打开 Trace，能看到这次请求真正带上来的消息（最近历史 + 召回结果）",
      ],
    },
    concepts: [
      "semanticRecall — 把历史消息向量化，按语义相似度找回旧消息（默认关闭；开启需要 vector + embedder）",
      "vector — 向量库：LibSQLVector 存本地文件，也可以换成其他向量存储",
      "embedder — 嵌入模型：走 Model Router 用 provider/model（需要对应 provider 的 key），或本地的 fastembed",
      "@mastra/fastembed — 本地跑的嵌入模型，不需要额外的 API Key",
      "messageHistory.maxTokens — 按 token 预算裁剪进上下文的历史（atMaxRemoveTokens 一次删多少，设 0 关闭）；与 lastMessages 同时写就是条数 + 预算双重上限",
      "thread / resource — thread 是一条会话，resource 是会话归属的用户；两者一起决定 agent 记得谁、记得哪一段历史",
      "多用户线程 — 多人共用一条 thread 时，把说话人身份写进消息正文，agent 才能分清谁在说",
    ],
    docLinks: [
      {
        title: "Semantic Recall",
        href: "https://mastra.ai/docs/memory/semantic-recall",
      },
      {
        title: "Multi-user Threads",
        href: "https://mastra.ai/docs/memory/multi-user-threads",
      },
      { title: "Memory 类参考", href: "https://mastra.ai/reference/memory/memory-class" },
      { title: "LibSQL 向量库", href: "https://mastra.ai/reference/vectors/libsql" },
    ],
    files: [
      {
        path: "src/mastra/agents/support-agent.ts",
        order: 1,
        action: "replace",
        hint: "先装依赖：pnpm add @mastra/fastembed。只改 memory 这一段，其余保持上一课的样子",
        code: `import { Agent } from "@mastra/core/agent";
import { Memory } from "@mastra/memory";
import { LibSQLVector } from "@mastra/libsql";
import { fastembed } from "@mastra/fastembed";
import { z } from "zod";
import { checkReturnEligibility } from "../tools/return-tool";

const customerProfile = z.object({
  name: z.string().optional().describe("客户称呼"),
  serial: z.string().optional().describe("装备或配件序列号，例如 JS-4482-M1"),
  issue: z.string().optional().describe("正在处理的售后问题，例如 金丝断裂"),
  promise: z.string().optional().describe("已经答复客户的处理方案，例如 已告知可换新（P2）"),
});

export const supportAgent = new Agent({
  id: "support-agent",
  name: "虚拟宇宙公司客服",
  instructions: \`你是虚拟宇宙公司官方客服。
- 职责：帮客户解决武器、装备与药剂的问题（退换、修复、运输）
- 先确认物品序列号或订单号，再谈处置；不知道就先问一句
- 判定退换资格时调用 checkReturnEligibility，不要自己推算天数
- 拿到序列号、问题和已答复的方案，用 updateWorkingMemory 记下来，之后不要重复问
- 已经答复过的方案不要改口
- 只承诺售后政策内的处置，政策外的一律说「需要主管确认」
- 中文、简短、专业，不卖萌\`,
  model: "deepseek/deepseek-flash",
  tools: { checkReturnEligibility },
  memory: new Memory({
    // 向量和消息存同一个本地库文件
    vector: new LibSQLVector({ id: "mastra-vector", url: "file:./mastra.db" }),
    // 嵌入模型：fastembed 在本地跑，不需要额外的 API Key
    embedder: fastembed,
    options: {
      // 条数上限 + token 预算，两个都写就是双重上限
      lastMessages: 20,
      messageHistory: { maxTokens: 8000 },
      // 语义召回：跨会话找回相关的旧消息（resource 范围 = 同一个用户）
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
    verify: {
      label: "打开页面验证",
      description: [
        "两个终端都在跑：Studio（http://localhost:4111）+ 应用（http://localhost:3000）",
        "打开 http://localhost:3000 问「我上次说的那台金丝网什么问题？」→ 回答流式出现，并沿用记忆里的信息",
        "问「能换新吗？」→ 它调 checkReturnEligibility 给出结论（工具也接上了）",
        "刷新页面 → 历史还在（GET 路由从 memory 里读回）",
      ],
    },
    concepts: [
      "handleChatStream — 把 agent 的一次运行输出成 AI SDK 的消息流（@mastra/ai-sdk），前端协议不用改",
      "createUIMessageStreamResponse — AI SDK 的响应助手：把这条流按 UI 消息协议返回给客户端",
      "toAISdkMessages — 把 memory 里的消息转成 AI SDK 的 UIMessage（刷新页面时喂给 useChat）",
      "getMemory / recall — 从 agent 拿到 memory，按 threadId + resourceId 读回历史消息",
      "version — handleChatStream 与 toAISdkMessages 要和你安装的 AI SDK 大版本对齐（官方 Next.js 指南写的是 v7）",
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
    ],
    files: [
      {
        path: "app/api/generate/route.ts",
        order: 1,
        action: "create",
        hint: "先装依赖：pnpm add @mastra/ai-sdk@latest @ai-sdk/react ai。路径用 /api/generate，和 lab-ai-sdk 第 4 课页面里写死的地址一致 —— 把那份 app/page.tsx 整份复制过来覆盖本项目的，一行都不用改",
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

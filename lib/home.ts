export type HomeSection = {
  title: string;
  paragraphs?: string[];
  bullets?: string[];
};

import type { DocLink } from "@/lib/doc-link";

export type HomeDocLink = DocLink;

export type HomeStackItem = {
  label: string;
  value: string;
};

export const HOME_INIT_PATH = "/lab/getting-started";

export const HOME = {
  title: "Mastra Lab",
  sections: [
    {
      title: "什么是 Mastra",
      paragraphs: [
        "Mastra 是一个 TypeScript 框架，用来构建 AI 应用与智能体：把模型调用、工具、工作流、记忆、评测和观测收在一套 API 里，而不是让你自己拼。",
      ],
    },
    {
      title: "核心组成",
      bullets: [
        "Agent — 身份、instructions、模型与工具，用 new Agent({ ... }) 定义。",
        "Workflow — 多步编排：状态、分支、暂停与恢复、人工介入、定时任务。",
        "Memory — 会话历史、结构化工作记忆、语义召回与多用户隔离。",
        "Storage / Studio / Evals / Observability — 持久化、可视化调试、评测与追踪。",
        "Model Router — 模型写成 provider/model 字符串（本 Lab 用 DeepSeek），自动读取对应环境变量。",
      ],
    },
    {
      title: "和 AI SDK 的区别与关系",
      paragraphs: [
        "两者是同一件事的两层，不是二选一：AI SDK 是 SDK —— 服务端（Core）发请求，UI 端（消费端）接流渲染；Mastra 是框架 —— 管运行状态、多步编排、审批、容错与评测；不提供前端渲染层。",
        "Mastra 支持 AI SDK：@mastra/ai-sdk 的 chatRoute() 把 agent 输出成 AI SDK 的消息流（第 6 课）。",
      ],
      bullets: [
        "AI SDK（见 lab-ai-sdk）— 服务端 Core（generateText / streamText / generateObject）+ UI 端（消息流协议、hooks 与前端渲染）。",
        "Mastra（本 Lab）— Agent / Workflow / Memory / RAG / Evals / Observability，对应记忆、编排、审批、容错、评测。",
      ],
    },
    {
      title: "什么时候不要用 Mastra",
      bullets: [
        "只有一问一答的聊天：AI SDK 的 agent 循环就够了，加一层框架是负担。",
        "固定两三步的链：两次 await 就串完了，不值得为它定义 Workflow。",
        "判断线：功能里出现「状态、多步、恢复、人工介入、观测、评测」两个以上，框架才开始划算。",
      ],
    },
    {
      title: "本 Lab 讲什么",
      paragraphs: [
        "项目驱动：在独立的 Mastra 项目 my-mastra-app 里逐课叠加能力，Lab 提供步骤、代码与官方文档对照。",
        "学习路径：初始化 → Agent 与模型 → 工具与结构化输出 → 记忆 → 接自己的前端 → 工作流（编排 / 暂停恢复 / 容错定时）→ RAG → 评测 → 观测 → 安全与上线。",
      ],
    },
  ] satisfies HomeSection[],
  stack: {
    title: "本教程技术栈",
    items: [
      { label: "框架", value: "Next.js（App Router）+ Mastra（@mastra/core）" },
      { label: "语言", value: "TypeScript" },
      { label: "模型提供商", value: "DeepSeek（deepseek-flash，走 Model Router）" },
      { label: "本地存储", value: "libSQL（file:./mastra.db）" },
      { label: "调试界面", value: "Mastra Studio（localhost:4111）" },
    ] satisfies HomeStackItem[],
  },
  cta: {
    label: "立即开始",
    href: HOME_INIT_PATH,
  },
  docLinks: [
    { title: "Get started", href: "https://mastra.ai/docs" },
    { title: "Agents", href: "https://mastra.ai/docs/agents" },
    { title: "Tools", href: "https://mastra.ai/docs/agents/tools" },
    { title: "Studio", href: "https://mastra.ai/docs/studio/overview" },
    { title: "DeepSeek Provider", href: "https://mastra.ai/models/providers/deepseek" },
  ] satisfies HomeDocLink[],
};

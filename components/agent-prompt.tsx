"use client";

import { useState } from "react";
import { ClaudeIcon, CodexIcon, CursorIcon } from "@/components/agent-icons";
import { copyToClipboard } from "@/lib/copy-to-clipboard";

type CopyState = "idle" | "copied" | "failed";

/** 按钮文案：三行叠放，靠位移滚动切换；第一行为最长文案，用它撑住按钮宽度 */
const LABELS: { key: CopyState; text: string }[] = [
  { key: "idle", text: "快速开始：复制给编码助手" },
  { key: "copied", text: "已复制" },
  { key: "failed", text: "复制失败" },
];

/** 快速开始：把本课步骤交给编码助手执行；悬停可预览提示词，与下面的命令步骤等价 */
export function AgentPrompt({ prompt }: { prompt: string }) {
  const [state, setState] = useState<CopyState>("idle");
  const activeIndex = LABELS.findIndex((item) => item.key === state);

  async function onCopy() {
    const ok = await copyToClipboard(prompt);
    setState(ok ? "copied" : "failed");
    window.setTimeout(() => setState("idle"), 1500);
  }

  return (
    <div className="group relative mb-6 inline-block">
      <button
        type="button"
        onClick={onCopy}
        className="inline-flex h-11 items-center gap-3 rounded-full bg-accent pl-5 pr-4 text-sm font-medium text-accent-fg shadow-[0_2px_8px_rgba(0,0,0,0.16)] ring-1 ring-inset ring-white/15 transition-colors hover:bg-zinc-800"
      >
        {/* 文案滚动切换：尺寸由隐藏的定宽占位撑住，切换时按钮大小不变 */}
        <span className="relative block h-5 overflow-hidden text-left">
          <span className="invisible block h-5 whitespace-nowrap">{LABELS[0].text}</span>
          {LABELS.map((item, index) => (
            <span
              key={item.key}
              className={`absolute inset-0 flex items-center whitespace-nowrap transition-all duration-300 ease-out ${
                index === activeIndex
                  ? "translate-y-0 opacity-100"
                  : index < activeIndex
                    ? "-translate-y-full opacity-0"
                    : "translate-y-full opacity-0"
              }`}
            >
              {item.text}
            </span>
          ))}
        </span>

        {/* 三个图标始终不变 */}
        <span className="flex items-center gap-2 text-accent-fg/70">
          <ClaudeIcon className="h-4 w-4" />
          <CodexIcon className="h-4 w-4" />
          <CursorIcon className="h-4 w-4" />
        </span>
      </button>

      {/* 悬停 / 键盘聚焦时浮出提示词预览：只截前几行，底部渐隐 */}
      <div className="invisible absolute left-0 top-full z-20 w-[min(420px,calc(100vw-3rem))] pt-3 opacity-0 transition-opacity duration-150 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
        <div className="relative max-h-44 overflow-hidden rounded-xl border border-zinc-800 bg-[#0d1117] py-4 pl-5 pr-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)]">
          <pre className="m-0 whitespace-pre-wrap break-words font-mono text-xs leading-6 text-zinc-300">
            {prompt}
          </pre>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-[#0d1117] to-transparent" />
        </div>
      </div>
    </div>
  );
}

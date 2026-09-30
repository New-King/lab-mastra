"use client";

import { useState } from "react";
import { CodePanel } from "@/components/code-panel";
import { DocLinksSidebar } from "@/components/doc-links-sidebar";
import {
  labContent,
  labFileGrid,
  labMain,
  labScroll,
} from "@/lib/layout-classes";
import { getOrderLabel, type GuideProject } from "@/lib/projects";

/** 初始化：命令清单，左中右布局 */
export function GuideProjectView({ project }: { project: GuideProject }) {
  const [selectedPath, setSelectedPath] = useState(project.files[0]?.path ?? "");

  const selectedFile =
    project.files.find((file) => file.path === selectedPath) ?? project.files[0];

  return (
    <main className={labMain}>
      <div className={labContent}>
        <section className={labScroll}>
          <header className="mb-6">
            <h1 className="text-2xl font-semibold tracking-tight">{project.title}</h1>
          </header>

          <div className={labFileGrid}>
            <FileList
              files={project.files}
              selectedPath={selectedFile?.path ?? ""}
              onSelect={setSelectedPath}
            />
            <CodeBlock file={selectedFile} />
          </div>
        </section>
      </div>

      <DocLinksSidebar
        links={project.docLinks}
        description="初始化涉及的工具与配置，详见官方文档。"
      />
    </main>
  );
}

function FileList({
  files,
  selectedPath,
  onSelect,
}: {
  files: GuideProject["files"];
  selectedPath: string;
  onSelect: (path: string) => void;
}) {
  return (
    <section className="space-y-2">
      <h2 className="text-sm font-semibold">操作</h2>
      <ul className="space-y-1">
        {files.map((file, index) => {
          const active = file.path === selectedPath;
          return (
            <li key={file.path}>
              <button
                type="button"
                onClick={() => onSelect(file.path)}
                className={`w-full rounded-lg px-3 py-2 text-left transition-colors ${
                  active
                    ? "bg-neutral-200 text-foreground"
                    : "text-foreground hover:bg-white/80"
                }`}
              >
                <p className="truncate font-mono text-xs">
                  <span className="mr-1 text-muted">{getOrderLabel(index + 1)}</span>
                  {file.path}
                </p>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function CodeBlock({ file }: { file: GuideProject["files"][number] | undefined }) {
  if (!file) return null;

  return (
    <section className="flex min-h-0 min-w-0 w-full flex-col space-y-2">
      <h2 className="text-sm font-semibold">代码</h2>

      {file.steps && file.steps.length > 0 && (
        <div className="min-w-0 space-y-5">
          {file.steps.map((step) => (
            <div key={step.command} className="min-w-0 space-y-2">
              <p className="text-sm leading-6 text-muted">{step.description}</p>
              {step.choices && step.choices.length > 0 && (
                <ul className="space-y-1 rounded-lg border border-border bg-white px-3 py-2">
                  {step.choices.map((choice) => (
                    <li key={choice} className="text-xs leading-5 text-muted">
                      {choice}
                    </li>
                  ))}
                </ul>
              )}
              <CodePanel code={step.command} language="bash" />
            </div>
          ))}
        </div>
      )}

      {file.code && (
        <div className="min-w-0 space-y-2">
          {file.hint && (
            <p className="text-sm leading-6 text-muted">{file.hint}</p>
          )}
          <CodePanel
            code={file.code}
            path={file.steps ? file.path : undefined}
            language={file.steps ? undefined : "bash"}
          />
        </div>
      )}
    </section>
  );
}

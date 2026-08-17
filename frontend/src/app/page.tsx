"use client";

import { useState } from "react";
import {
  ArrowUp,
  Bot,
  CheckCircle2,
  Clock3,
  FileText,
  FolderKanban,
  LayoutDashboard,
  Menu,
  Plus,
  Search,
  Settings,
  Sparkles,
  Terminal,
  X,
} from "lucide-react";

const examples = [
  {
    title: "Research",
    description: "Research the Indian AI healthcare market",
    icon: Search,
  },
  {
    title: "Build",
    description: "Create a project roadmap for my startup",
    icon: FolderKanban,
  },
  {
    title: "Analyze",
    description: "Analyze this data and find important insights",
    icon: FileText,
  },
];

const recentTasks = [
  "CureBlend market analysis",
  "Hackathon project roadmap",
  "AI career roadmap",
];

export default function Home() {
  const [task, setTask] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");

  const runAgent = async () => {
    if (!task.trim() || running) return;

    setRunning(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch("http://localhost:8000/api/tasks", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          task: task.trim(),
        }),
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      console.log("AGENTX response:", data);

      if (!data.success) {
        throw new Error("AGENTX failed to process the task.");
      }

      // Store backend response
      setResult(data);
    } catch (err) {
      console.error("AGENTX error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Could not connect to AGENTX backend."
      );
    } finally {
      setRunning(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/[0.07] bg-[#0d0d10] transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Sidebar header */}
        <div className="flex h-[72px] items-center justify-between border-b border-white/[0.07] px-5">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white text-black">
              <Sparkles size={18} />
            </div>

            <div>
              <div className="text-[15px] font-semibold tracking-tight">
                AGENTX
              </div>

              <div className="text-[10px] uppercase tracking-[0.18em] text-zinc-500">
                AI Execution OS
              </div>
            </div>
          </div>

          <button
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* New task */}
        <div className="p-4">
          <button
            onClick={() => {
              setTask("");
              setResult(null);
              setError("");
            }}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            <Plus size={17} />
            New task
          </button>
        </div>

        {/* Navigation */}
        <nav className="px-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Workspace
          </p>

          <NavItem
            icon={<LayoutDashboard size={17} />}
            label="Overview"
            active
          />

          <NavItem
            icon={<FolderKanban size={17} />}
            label="Projects"
          />

          <NavItem
            icon={<Clock3 size={17} />}
            label="Task history"
          />
        </nav>

        {/* Recent tasks */}
        <div className="mt-8 flex-1 overflow-hidden px-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Recent
          </p>

          {recentTasks.map((item) => (
            <button
              key={item}
              onClick={() => {
                setTask(item);
                setResult(null);
                setError("");
              }}
              className="mb-1 w-full truncate rounded-lg px-3 py-2 text-left text-[13px] text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200"
            >
              {item}
            </button>
          ))}
        </div>

        {/* Sidebar footer */}
        <div className="border-t border-white/[0.07] p-3">
          <NavItem
            icon={<Settings size={17} />}
            label="Settings"
          />

          <div className="mt-2 flex items-center gap-3 rounded-xl p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium">
              AS
            </div>

            <div>
              <p className="text-xs font-medium text-zinc-200">
                Aditya Sinha
              </p>

              <p className="text-[10px] text-zinc-600">
                Personal workspace
              </p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main section */}
      <section className="min-h-screen lg:pl-[260px]">
        {/* Top header */}
        <header className="flex h-[72px] items-center border-b border-white/[0.07] px-5 sm:px-8">
          <button
            onClick={() => setSidebarOpen(true)}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <Menu size={20} />
          </button>

          <div className="hidden text-xs text-zinc-600 sm:block">
            Personal workspace
          </div>

          <div className="ml-auto flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/[0.07] bg-white/[0.02] px-3 py-1.5 text-[11px] text-zinc-500 sm:flex">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              All systems operational
            </div>

            <button className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium">
              AS
            </button>
          </div>
        </header>

        {/* Main content */}
        <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-[1000px] flex-col px-5 py-12 sm:px-8 lg:py-20">
          {/* Hero */}
          <div className="mb-10 text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-zinc-400">
              <Bot size={13} />
              Your AI execution layer
            </div>

            <h1 className="text-3xl font-semibold tracking-[-0.03em] text-white sm:text-5xl">
              What do you want to accomplish?
            </h1>

            <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-zinc-500 sm:text-base">
              Give AGENTX a goal. It will plan the work, use the right tools,
              execute the task, and verify the result.
            </p>
          </div>

          {/* Task input */}
          <div className="rounded-2xl border border-white/[0.09] bg-[#101014] p-2 shadow-2xl shadow-black/20">
            <div className="rounded-xl bg-[#0c0c0f]">
              <textarea
                value={task}
                onChange={(e) => setTask(e.target.value)}
                placeholder="Describe what you want AGENTX to accomplish..."
                className="min-h-[150px] w-full resize-none bg-transparent px-5 py-5 text-sm leading-6 text-zinc-200 outline-none placeholder:text-zinc-600"
              />

              <div className="flex items-center justify-between border-t border-white/[0.06] px-4 py-3">
                <div className="flex items-center gap-2 text-[11px] text-zinc-600">
                  <Terminal size={13} />

                  {running ? "AGENTX is executing..." : "Agent ready"}
                </div>

                <button
                  onClick={runAgent}
                  disabled={!task.trim() || running}
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {running ? "Running..." : "Run AGENTX"}

                  {running ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  ) : (
                    <ArrowUp size={15} />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Error */}
          {error && (
            <div className="mt-5 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm text-red-400">
              <div className="font-medium">
                AGENTX Error
              </div>

              <div className="mt-1 text-xs text-red-400/80">
                {error}
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* AGENTX RESULT */}
          {/* ====================================================== */}

          {result && (
            <div className="mt-6 rounded-2xl border border-white/[0.09] bg-[#101014] p-6 shadow-xl shadow-black/10">
              {/* Result header */}
              <div className="mb-6 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                    Execution result
                  </p>

                  <h2 className="mt-1 text-lg font-semibold text-white">
                    AGENTX Result
                  </h2>
                </div>

                <div className="flex items-center gap-2 rounded-full border border-emerald-400/10 bg-emerald-400/5 px-3 py-1.5 text-[11px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  Completed
                </div>
              </div>

              <div className="space-y-5">
                {/* Task */}
                <div>
                  <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                    Task
                  </p>

                  <p className="text-sm leading-6 text-zinc-300">
                    {result.result?.task || task}
                  </p>
                </div>

                {/* Summary */}
                {result.result?.summary && (
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Summary
                    </p>

                    <p className="text-sm leading-6 text-zinc-300">
                      {result.result.summary}
                    </p>
                  </div>
                )}

                {/* Pipeline */}
                {Array.isArray(result.pipeline) && (
                  <div>
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Pipeline
                    </p>

                    <div className="flex flex-wrap gap-2">
                      {result.pipeline.map(
                        (step: string, index: number) => (
                          <span
                            key={`${step}-${index}`}
                            className="rounded-full border border-white/[0.08] bg-white/[0.03] px-3 py-1.5 text-[11px] text-zinc-400"
                          >
                            {step}
                          </span>
                        )
                      )}
                    </div>
                  </div>
                )}

                {/* Understanding */}
                {result.result?.understanding && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Understand
                    </p>

                    <div className="space-y-2 text-sm text-zinc-400">
                      {typeof result.result.understanding === "object" ? (
                        Object.entries(result.result.understanding).map(
                          ([key, value]) => (
                            <div key={key}>
                              <span className="font-medium capitalize text-zinc-300">
                                {key.replace(/_/g, " ")}:
                              </span>{" "}
                              {String(value)}
                            </div>
                          )
                        )
                      ) : (
                        <p>
                          {String(result.result.understanding)}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Plan */}
                {result.result?.plan && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Plan
                    </p>

                    {Array.isArray(result.result.plan) ? (
                      <ol className="space-y-3 text-sm text-zinc-400">
                        {result.result.plan.map(
                          (step: string, index: number) => (
                            <li
                              key={index}
                              className="flex gap-3"
                            >
                              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] text-zinc-500">
                                {index + 1}
                              </span>

                              <span className="leading-6">
                                {step}
                              </span>
                            </li>
                          )
                        )}
                      </ol>
                    ) : (
                      <p className="text-sm leading-6 text-zinc-400">
                        {String(result.result.plan)}
                      </p>
                    )}
                  </div>
                )}

                {/* Execution */}
                {result.result?.execution && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Execute
                    </p>

                    <div className="whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                      {typeof result.result.execution === "string"
                        ? result.result.execution
                        : JSON.stringify(
                            result.result.execution,
                            null,
                            2
                          )}
                    </div>
                  </div>
                )}

                {/* Verification */}
                {result.result?.verification && (
                  <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Verify
                    </p>

                    <div className="whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                      {typeof result.result.verification === "string"
                        ? result.result.verification
                        : JSON.stringify(
                            result.result.verification,
                            null,
                            2
                          )}
                    </div>
                  </div>
                )}

                {/* Deliver */}
                {result.result?.deliverable && (
                  <div className="rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] p-4">
                    <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-emerald-500/70">
                      Deliver
                    </p>

                    <div className="whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                      {typeof result.result.deliverable === "string"
                        ? result.result.deliverable
                        : JSON.stringify(
                            result.result.deliverable,
                            null,
                            2
                          )}
                    </div>
                  </div>
                )}

                {/* Full response */}
                <details className="rounded-xl border border-white/[0.06] bg-black/20 p-4">
                  <summary className="cursor-pointer text-xs font-medium text-zinc-400 transition hover:text-zinc-200">
                    View full AGENTX response
                  </summary>

                  <pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap rounded-lg bg-black/30 p-3 text-[11px] leading-5 text-zinc-500">
                    {JSON.stringify(result, null, 2)}
                  </pre>
                </details>
              </div>
            </div>
          )}

          {/* ====================================================== */}
          {/* EXAMPLES */}
          {/* ====================================================== */}

          <div className="mt-7">
            <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-600">
              Try an example
            </p>

            <div className="grid gap-3 sm:grid-cols-3">
              {examples.map((example) => {
                const Icon = example.icon;

                return (
                  <button
                    key={example.title}
                    onClick={() => {
                      setTask(example.description);
                      setResult(null);
                      setError("");
                    }}
                    className="group rounded-xl border border-white/[0.07] bg-white/[0.015] p-4 text-left transition hover:border-white/[0.13] hover:bg-white/[0.035]"
                  >
                    <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06] text-zinc-400 transition group-hover:text-white">
                      <Icon size={15} />
                    </div>

                    <p className="text-xs font-medium text-zinc-300">
                      {example.title}
                    </p>

                    <p className="mt-1 text-[11px] leading-5 text-zinc-600">
                      {example.description}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Pipeline footer */}
          <div className="mt-14 border-t border-white/[0.07] pt-7">
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-zinc-600">
              {[
                "Understand",
                "Plan",
                "Execute",
                "Verify",
                "Deliver",
              ].map((step, index) => (
                <div
                  key={step}
                  className="flex items-center gap-3"
                >
                  <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                    {step}
                  </span>

                  {index < 4 && <span>→</span>}
                </div>
              ))}
            </div>

            <div className="mt-5 flex items-center justify-center gap-2 text-[10px] text-zinc-700">
              <CheckCircle2 size={12} />
              Human approval is required for sensitive actions
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

function NavItem({
  icon,
  label,
  active = false,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
}) {
  return (
    <button
      className={`mb-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-[13px] transition ${
        active
          ? "bg-white/[0.07] text-white"
          : "text-zinc-500 hover:bg-white/[0.04] hover:text-zinc-200"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
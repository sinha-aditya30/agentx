"use client";

import { useEffect, useState } from "react";
import {
  ArrowUp,
  Bot,
  CheckCircle2,
  Clock3,
  ExternalLink,
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

type TaskRecord = {
  id: string;
  task: string;
  created_at: string;
  result: any;
};

type PageType = "overview" | "projects" | "history" | "settings";

export default function Home() {
  const [task, setTask] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState("");
  const [activePage, setActivePage] = useState<PageType>("overview");
  const [tasks, setTasks] = useState<TaskRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);

  const loadTasks = async () => {
    try {
      const response = await fetch("http://localhost:8000/api/tasks", {
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error(`Backend error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.success || !Array.isArray(data.tasks)) {
        throw new Error("Could not load AGENTX task history.");
      }

      setTasks(data.tasks);
    } catch (err) {
      console.error("AGENTX history error:", err);
    } finally {
      setLoadingHistory(false);
    }
  };

  useEffect(() => {
    loadTasks();
  }, []);

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

      setResult(data);

      if (data.task_record) {
        setTasks((previous) => [
          data.task_record,
          ...previous.filter((item) => item.id !== data.task_record.id),
        ]);
      } else {
        await loadTasks();
      }
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

  const resetTask = () => {
    setTask("");
    setResult(null);
    setError("");
    setActivePage("overview");
  };

  const openPage = (page: PageType) => {
    setActivePage(page);
    setSidebarOpen(false);
  };

  const openTask = (taskRecord: TaskRecord) => {
    setTask(taskRecord.task);
    setError("");

    if (taskRecord.result) {
      setResult(taskRecord.result);
    } else {
      setResult(null);
    }

    setActivePage("overview");
    setSidebarOpen(false);
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      {/* ============================================================
          MOBILE SIDEBAR OVERLAY
      ============================================================ */}

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ============================================================
          SIDEBAR
      ============================================================ */}

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
            type="button"
            onClick={() => setSidebarOpen(false)}
            className="rounded-lg p-2 text-zinc-500 hover:bg-white/5 hover:text-white lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* New task */}

        <div className="p-4">
          <button
            type="button"
            onClick={resetTask}
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
            active={activePage === "overview"}
            onClick={() => openPage("overview")}
          />

          <NavItem
            icon={<FolderKanban size={17} />}
            label="Projects"
            active={activePage === "projects"}
            onClick={() => openPage("projects")}
          />

          <NavItem
            icon={<Clock3 size={17} />}
            label="Task history"
            active={activePage === "history"}
            onClick={() => openPage("history")}
          />
        </nav>

        {/* Recent tasks */}

        <div className="mt-8 flex-1 overflow-hidden px-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Recent
          </p>

          {tasks.slice(0, 5).map((item) => (
            <button
              type="button"
              key={item.id}
              onClick={() => openTask(item)}
              className="mb-1 w-full truncate rounded-lg px-3 py-2 text-left text-[13px] text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200"
              title={item.task}
            >
              {item.task}
            </button>
          ))}

          {!loadingHistory && tasks.length === 0 && (
            <p className="px-3 py-2 text-[12px] text-zinc-700">
              No tasks yet
            </p>
          )}
        </div>

        {/* Sidebar footer */}

        <div className="border-t border-white/[0.07] p-3">
          <NavItem
            icon={<Settings size={17} />}
            label="Settings"
            active={activePage === "settings"}
            onClick={() => openPage("settings")}
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

      {/* ============================================================
          MAIN SECTION
      ============================================================ */}

      <section className="min-h-screen lg:pl-[260px]">
        {/* Top header */}

        <header className="flex h-[72px] items-center border-b border-white/[0.07] px-5 sm:px-8">
          <button
            type="button"
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

            <button
              type="button"
              onClick={() => openPage("settings")}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-zinc-800 text-xs font-medium transition hover:bg-zinc-700"
              title="Open settings"
            >
              AS
            </button>
          </div>
        </header>

        {/* ============================================================
            OVERVIEW
        ============================================================ */}

        {activePage === "overview" && (
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

            {/* Task Input */}

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
                    type="button"
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
                <div className="font-medium">AGENTX Error</div>

                <div className="mt-1 text-xs text-red-400/80">
                  {error}
                </div>
              </div>
            )}

            {/* ========================================================
                RESULT
            ======================================================== */}

            {result && (
              <div className="mt-6 rounded-2xl border border-white/[0.09] bg-[#101014] p-6 shadow-xl shadow-black/10">
                {/* Result header */}

                <div className="mb-6 flex items-start justify-between gap-4">
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
                  {/* TASK */}

                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                      Task
                    </p>

                    <p className="text-sm leading-6 text-zinc-300">
                      {result.result?.task || task}
                    </p>
                  </div>

                  {/* SUMMARY */}

                  {result.result?.summary && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                        Summary
                      </p>

                      <p className="text-sm leading-6 text-zinc-300">
                        {result.result.summary}
                      </p>
                    </div>
                  )}

                  {/* PIPELINE */}

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

                  {/* UNDERSTANDING */}

                  {result.result?.understanding && (
                    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4">
                      <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                        Understand
                      </p>

                      <div className="space-y-2 text-sm text-zinc-400">
                        {typeof result.result.understanding === "object" ? (
                          Object.entries(
                            result.result.understanding
                          ).map(([key, value]) => (
                            <div key={key}>
                              <span className="font-medium capitalize text-zinc-300">
                                {key.replace(/_/g, " ")}:
                              </span>{" "}
                              {String(value)}
                            </div>
                          ))
                        ) : (
                          <p>{String(result.result.understanding)}</p>
                        )}
                      </div>
                    </div>
                  )}

                  {/* PLAN */}

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

                  {/* RESEARCH REPORT */}

                  {result.result?.execution &&
                    typeof result.result.execution === "object" &&
                    Array.isArray(result.result.execution.sources) && (
                      <div className="rounded-2xl border border-white/[0.07] bg-[#0c0c0f] p-5">
                        {/* Research header */}

                        <div className="mb-5 flex items-start justify-between gap-4">
                          <div>
                            <div className="mb-2 flex items-center gap-2">
                              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.06]">
                                <Search
                                  size={15}
                                  className="text-zinc-300"
                                />
                              </div>

                              <div>
                                <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                                  Research report
                                </p>

                                <h3 className="mt-0.5 text-base font-semibold text-white">
                                  Research Findings
                                </h3>
                              </div>
                            </div>

                            {result.result.execution.query && (
                              <p className="mt-3 text-xs text-zinc-500">
                                Search query:{" "}
                                <span className="text-zinc-300">
                                  {result.result.execution.query}
                                </span>
                              </p>
                            )}
                          </div>

                          <div className="shrink-0 rounded-full border border-white/[0.07] bg-white/[0.03] px-3 py-1.5 text-[10px] text-zinc-400">
                            {result.result.execution.sources.length}{" "}
                            {result.result.execution.sources.length === 1
                              ? "source"
                              : "sources"}
                          </div>
                        </div>

                        {/* Findings */}

                        {Array.isArray(
                          result.result.execution.findings
                        ) &&
                          result.result.execution.findings.length > 0 && (
                            <div className="mb-6">
                              <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                                Key findings
                              </p>

                              <div className="space-y-3">
                                {result.result.execution.findings.map(
                                  (finding: any, index: number) => {
                                    const source =
                                      finding?.source ||
                                      finding?.title ||
                                      `Finding ${index + 1}`;

                                    const content =
                                      finding?.content ||
                                      finding?.snippet ||
                                      finding?.text ||
                                      "";

                                    return (
                                      <div
                                        key={index}
                                        className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4"
                                      >
                                        <div className="mb-2 flex items-start gap-3">
                                          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.06] text-[10px] font-medium text-zinc-400">
                                            {index + 1}
                                          </span>

                                          <div className="min-w-0">
                                            <p className="text-xs font-medium leading-5 text-zinc-200">
                                              {source}
                                            </p>

                                            {content && (
                                              <p className="mt-2 text-sm leading-6 text-zinc-400">
                                                {content}
                                              </p>
                                            )}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  }
                                )}
                              </div>
                            </div>
                          )}

                        {/* Sources */}

                        <div>
                          <p className="mb-3 text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                            Sources
                          </p>

                          <div className="grid gap-3">
                            {result.result.execution.sources.map(
                              (source: any, index: number) => {
                                const title =
                                  source?.title ||
                                  source?.source ||
                                  `Source ${index + 1}`;

                                const url = source?.url;

                                const snippet =
                                  source?.snippet ||
                                  source?.content ||
                                  "";

                                return (
                                  <div
                                    key={index}
                                    className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 transition hover:border-white/[0.11]"
                                  >
                                    <div className="flex items-start gap-3">
                                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.05] text-zinc-500">
                                        <FileText size={14} />
                                      </div>

                                      <div className="min-w-0 flex-1">
                                        {url ? (
                                          <a
                                            href={url}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="group inline-flex items-center gap-1.5 text-xs font-medium leading-5 text-zinc-200 hover:text-white"
                                          >
                                            <span>{title}</span>

                                            <ExternalLink
                                              size={12}
                                              className="text-zinc-600 transition group-hover:text-zinc-300"
                                            />
                                          </a>
                                        ) : (
                                          <p className="text-xs font-medium leading-5 text-zinc-200">
                                            {title}
                                          </p>
                                        )}

                                        {url && (
                                          <p className="mt-1 truncate text-[10px] text-zinc-600">
                                            {url}
                                          </p>
                                        )}

                                        {snippet && (
                                          <p className="mt-2 line-clamp-3 text-xs leading-5 text-zinc-500">
                                            {snippet}
                                          </p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                );
                              }
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                  {/* GENERIC EXECUTION RESULT */}

                  {result.result?.execution &&
                    !(
                      typeof result.result.execution === "object" &&
                      Array.isArray(result.result.execution.sources)
                    ) && (
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

                  {/* VERIFICATION */}

                  {result.result?.verification && (
                    <div
                      className={`rounded-xl border p-4 ${
                        result.result.verification.passed
                          ? "border-emerald-400/10 bg-emerald-400/[0.03]"
                          : "border-red-400/10 bg-red-400/[0.03]"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                            result.result.verification.passed
                              ? "bg-emerald-400/10 text-emerald-400"
                              : "bg-red-400/10 text-red-400"
                          }`}
                        >
                          <CheckCircle2 size={15} />
                        </div>

                        <div className="min-w-0">
                          <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-zinc-600">
                            Verification
                          </p>

                          <p
                            className={`mt-1 text-sm font-medium ${
                              result.result.verification.passed
                                ? "text-emerald-300"
                                : "text-red-300"
                            }`}
                          >
                            {result.result.verification.passed
                              ? "Verification passed"
                              : "Verification failed"}
                          </p>

                          {result.result.verification.message && (
                            <p className="mt-1 text-xs leading-5 text-zinc-500">
                              {result.result.verification.message}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* DELIVERABLE */}

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

                  {/* FULL RESPONSE */}

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

            {/* ========================================================
                EXAMPLES
            ======================================================== */}

            <div className="mt-7">
              <p className="mb-3 text-[11px] font-medium uppercase tracking-[0.16em] text-zinc-600">
                Try an example
              </p>

              <div className="grid gap-3 sm:grid-cols-3">
                {examples.map((example) => {
                  const Icon = example.icon;

                  return (
                    <button
                      type="button"
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
        )}

        {/* ============================================================
            PROJECTS PAGE
        ============================================================ */}

        {activePage === "projects" && (
          <div className="mx-auto min-h-[calc(100vh-72px)] max-w-[1000px] px-5 py-12 sm:px-8 lg:py-20">
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
                  <FolderKanban size={19} className="text-zinc-300" />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                    Workspace
                  </p>

                  <h1 className="mt-1 text-2xl font-semibold text-white">
                    Projects
                  </h1>
                </div>
              </div>

              <p className="max-w-xl text-sm leading-6 text-zinc-500">
                Access your previous AGENTX projects and continue working on
                them.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {tasks.slice(0, 6).map((project, index) => (
                <button
                  type="button"
                  key={project.id}
                  onClick={() => openTask(project)}
                  className="group rounded-2xl border border-white/[0.07] bg-[#101014] p-5 text-left transition hover:border-white/[0.14] hover:bg-[#131318]"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-400 group-hover:text-white">
                      <FolderKanban size={17} />
                    </div>

                    <span className="text-[10px] text-zinc-700">
                      PROJECT {String(index + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <h2 className="text-sm font-medium text-zinc-200">
                    {project.task}
                  </h2>

                  <p className="mt-2 text-xs leading-5 text-zinc-600">
                    Continue working with AGENTX
                  </p>
                </button>
              ))}

              <button
                type="button"
                onClick={() => {
                  resetTask();
                  setTask("");
                }}
                className="group rounded-2xl border border-dashed border-white/[0.09] bg-white/[0.01] p-5 text-left transition hover:border-white/[0.16] hover:bg-white/[0.025]"
              >
                <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-500 group-hover:text-white">
                  <Plus size={18} />
                </div>

                <h2 className="text-sm font-medium text-zinc-300">
                  Create new project
                </h2>

                <p className="mt-2 text-xs leading-5 text-zinc-600">
                  Start a new task with AGENTX
                </p>
              </button>
            </div>
          </div>
        )}

        {/* ============================================================
            TASK HISTORY PAGE
        ============================================================ */}

        {activePage === "history" && (
          <div className="mx-auto min-h-[calc(100vh-72px)] max-w-[1000px] px-5 py-12 sm:px-8 lg:py-20">
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
                  <Clock3 size={19} className="text-zinc-300" />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                    Workspace
                  </p>

                  <h1 className="mt-1 text-2xl font-semibold text-white">
                    Task history
                  </h1>
                </div>
              </div>

              <p className="max-w-xl text-sm leading-6 text-zinc-500">
                Quickly reopen tasks you have recently worked on.
              </p>
            </div>

            <div className="space-y-3">
              {loadingHistory ? (
                <div className="rounded-2xl border border-white/[0.07] bg-[#101014] p-5 text-sm text-zinc-600">
                  Loading task history...
                </div>
              ) : tasks.length === 0 ? (
                <div className="rounded-2xl border border-white/[0.07] bg-[#101014] p-5 text-sm text-zinc-600">
                  No tasks have been executed yet.
                </div>
              ) : (
                tasks.map((item, index) => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => openTask(item)}
                  className="group flex w-full items-center gap-4 rounded-2xl border border-white/[0.07] bg-[#101014] p-5 text-left transition hover:border-white/[0.14] hover:bg-[#131318]"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-zinc-500 group-hover:text-white">
                    <Clock3 size={17} />
                  </div>

                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-zinc-200">
                      {item.task}
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Recent execution • Task {index + 1}
                    </p>
                  </div>

                  <ArrowUp
                    size={15}
                    className="rotate-45 text-zinc-700 transition group-hover:text-zinc-300"
                  />
                </button>
                ))
              )}
            </div>

            <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.015] p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                  <Bot size={16} className="text-zinc-500" />
                </div>

                <div>
                  <p className="text-xs font-medium text-zinc-300">
                    Task persistence
                  </p>

                  <p className="mt-1 text-xs leading-5 text-zinc-600">
                    These are the tasks currently available in your AGENTX
                    workspace.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================
            SETTINGS PAGE
        ============================================================ */}

        {activePage === "settings" && (
          <div className="mx-auto min-h-[calc(100vh-72px)] max-w-[1000px] px-5 py-12 sm:px-8 lg:py-20">
            <div className="mb-10">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.06]">
                  <Settings size={19} className="text-zinc-300" />
                </div>

                <div>
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
                    Workspace
                  </p>

                  <h1 className="mt-1 text-2xl font-semibold text-white">
                    Settings
                  </h1>
                </div>
              </div>

              <p className="max-w-xl text-sm leading-6 text-zinc-500">
                Manage your AGENTX workspace configuration.
              </p>
            </div>

            <div className="space-y-4">
              {/* Profile */}

              <div className="rounded-2xl border border-white/[0.07] bg-[#101014] p-5">
                <div className="mb-5">
                  <p className="text-sm font-medium text-zinc-200">
                    Profile
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    Your AGENTX workspace identity
                  </p>
                </div>

                <div className="flex items-center gap-4 rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 text-sm font-medium">
                    AS
                  </div>

                  <div>
                    <p className="text-sm font-medium text-zinc-200">
                      Aditya Sinha
                    </p>

                    <p className="mt-1 text-xs text-zinc-600">
                      Personal workspace
                    </p>
                  </div>
                </div>
              </div>

              {/* Backend */}

              <div className="rounded-2xl border border-white/[0.07] bg-[#101014] p-5">
                <div className="mb-5">
                  <p className="text-sm font-medium text-zinc-200">
                    Backend connection
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    AGENTX API configuration
                  </p>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-emerald-400/10 bg-emerald-400/[0.03] p-4">
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-full bg-emerald-400" />

                    <div>
                      <p className="text-sm text-zinc-300">
                        Backend server
                      </p>

                      <p className="mt-1 text-xs text-zinc-600">
                        http://localhost:8000
                      </p>
                    </div>
                  </div>

                  <span className="rounded-full border border-emerald-400/10 bg-emerald-400/[0.05] px-3 py-1.5 text-[10px] text-emerald-400">
                    Connected
                  </span>
                </div>
              </div>

              {/* System */}

              <div className="rounded-2xl border border-white/[0.07] bg-[#101014] p-5">
                <div className="mb-5">
                  <p className="text-sm font-medium text-zinc-200">
                    System status
                  </p>

                  <p className="mt-1 text-xs text-zinc-600">
                    Current AGENTX environment
                  </p>
                </div>

                <div className="space-y-3">
                  <StatusRow
                    label="Frontend"
                    status="Operational"
                  />

                  <StatusRow
                    label="Backend API"
                    status="Operational"
                  />

                  <StatusRow
                    label="Agent pipeline"
                    status="Ready"
                  />
                </div>
              </div>

              {/* Security */}

              <div className="rounded-2xl border border-white/[0.07] bg-[#101014] p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.04]">
                    <CheckCircle2
                      size={16}
                      className="text-zinc-500"
                    />
                  </div>

                  <div>
                    <p className="text-xs font-medium text-zinc-300">
                      Human approval
                    </p>

                    <p className="mt-1 text-xs leading-5 text-zinc-600">
                      Human approval is required for sensitive actions before
                      execution.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

/* ============================================================
   NAVIGATION ITEM
============================================================ */

function NavItem({
  icon,
  label,
  active = false,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
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

/* ============================================================
   STATUS ROW
============================================================ */

function StatusRow({
  label,
  status,
}: {
  label: string;
  status: string;
}) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-white/[0.05] bg-white/[0.02] p-4">
      <div className="flex items-center gap-3">
        <span className="h-2 w-2 rounded-full bg-emerald-400" />

        <span className="text-sm text-zinc-300">
          {label}
        </span>
      </div>

      <span className="text-xs text-emerald-400">
        {status}
      </span>
    </div>
  );
}
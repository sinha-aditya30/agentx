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

  const runAgent = async () => {
  if (!task.trim() || running) return;

  setRunning(true);

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

    alert(
  `AGENTX received your task:\n\n${JSON.stringify(data, null, 2)}`
);
  } catch (error) {
    console.error("AGENTX error:", error);

    alert(
      "Could not connect to AGENTX backend.\n\nMake sure FastAPI is running on port 8000."
    );
  } finally {
    setRunning(false);
  }
};

  return (
    <main className="min-h-screen bg-[#09090b] text-zinc-100">
      {sidebarOpen && (
        <button
          aria-label="Close sidebar"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[260px] flex-col border-r border-white/[0.07] bg-[#0d0d10] transition-transform duration-200 lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
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

        <div className="p-4">
          <button
            onClick={() => setTask("")}
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-white px-4 py-3 text-sm font-medium text-black transition hover:bg-zinc-200"
          >
            <Plus size={17} />
            New task
          </button>
        </div>

        <nav className="px-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Workspace
          </p>

          <NavItem
            icon={<LayoutDashboard size={17} />}
            label="Overview"
            active
          />

          <NavItem icon={<FolderKanban size={17} />} label="Projects" />

          <NavItem icon={<Clock3 size={17} />} label="Task history" />
        </nav>

        <div className="mt-8 flex-1 overflow-hidden px-3">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-zinc-600">
            Recent
          </p>

          {recentTasks.map((item) => (
            <button
              key={item}
              onClick={() => setTask(item)}
              className="mb-1 w-full truncate rounded-lg px-3 py-2 text-left text-[13px] text-zinc-500 transition hover:bg-white/[0.04] hover:text-zinc-200"
            >
              {item}
            </button>
          ))}
        </div>

        <div className="border-t border-white/[0.07] p-3">
          <NavItem icon={<Settings size={17} />} label="Settings" />

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

      <section className="min-h-screen lg:pl-[260px]">
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

        <div className="mx-auto flex min-h-[calc(100vh-72px)] max-w-[1000px] flex-col px-5 py-12 sm:px-8 lg:py-20">
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
                  Agent ready
                </div>

                <button
                  onClick={runAgent}
                  disabled={!task.trim() || running}
                  className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  {running ? "Starting..." : "Run AGENTX"}
                  {running ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-black/20 border-t-black" />
                  ) : (
                    <ArrowUp size={15} />
                  )}
                </button>
              </div>
            </div>
          </div>

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
                    onClick={() => setTask(example.description)}
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

          <div className="mt-14 border-t border-white/[0.07] pt-7">
            <div className="flex flex-wrap items-center justify-center gap-3 text-[11px] text-zinc-600">
              {["Understand", "Plan", "Execute", "Verify", "Deliver"].map(
                (step, index) => (
                  <div key={step} className="flex items-center gap-3">
                    <span className="rounded-full border border-white/[0.06] bg-white/[0.02] px-3 py-1.5">
                      {step}
                    </span>

                    {index < 4 && <span>→</span>}
                  </div>
                )
              )}
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
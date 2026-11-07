---
title: 'Multi-Agent Coding System'
subtitle: 'AI agents that plan, build and review code, with a human in charge'
kind: 'personal'
summary: 'A Claude lead runs a team of AI coding agents through three phases and four quality gates, and a human signs off before building starts and again at review.'
start: '2025'
end:
tech: ['Claude', 'Antigravity', 'Codex', 'tmux', 'hcom', 'AI-DLC']
image: '../../../assets/art/project-agentic-loop.svg'
imageAlt: 'Illustration: three stages on a path, with gates between them, two sign-off checkmarks and a lane of agent nodes below.'
stats:
  - value: '2'
    label: 'human sign-offs per run'
    note: 'At the end of Inception and of Review. The approve command refuses to run inside an AI session.'
  - value: '0'
    label: 'auto-merges'
    note: 'Only the lead merges, after the gates pass, and no agent runs with permission-skipping flags.'
  - value: '286'
    label: 'automated tests'
    note: 'Passing in a plain shell when the kit''s spec was audited on 26 October 2026.'
problem: 'AI coding agents are fast, but each is best at a different job: one researches, one designs, one writes code, one reviews. No single platform does all of it well, so they have to be combined into one system. Run side by side without rules, they skip steps, lose track of who decided what, and call work done without proof.'
approach: 'Give each agent the job it does best and put the process in charge. A Claude lead plans and routes every task, Antigravity researches and designs, Codex builds test-first, and a Claude reviewer with fresh context checks the work. Every run passes three phases and four gates, with a human sign-off before building starts and at review.'
result: 'Work arrives with proof instead of promises. Each unit passes a verification command a human approved, the reviewer checks it against a receipt the kit wrote itself, and every task, result and decision is a file that can be read back.'
loop:
  title: 'AI-DLC kit'
  lines: ['research', 'requirements', 'architecture', 'implement', 'verify', 'review']
design:
  intro: 'A small Python CLI, standard library only, runs every task through the same lifecycle. The diagram shows the path: three phases, four gates and two human sign-offs, with the agents doing the work in the lane below. Status: in progress; the kit''s spec is implemented in part.'
  diagram: 'aidlc-kit'
  decisions:
    - '**Files are the truth:** Messages between parallel agents can be missed or arrive late. So every task and result is a file in the run folder, an hcom message only says a file is ready, and a stop hook nudges an agent that ends without a status line. Any run can be read back from disk, and a stalled task is reported, not lost.'
    - '**The lead decides, Jev advises:** An automatic router can pick the wrong agent and still sound sure. So the lead picks the agent, skill, model and effort, and Jev, which is optional, answers routing and gate questions and hands the choice back when unsure. Every decision has an owner and a line in decisions.jsonl.'
    - '**Review with fresh eyes:** A builder''s own report is the weakest evidence that the work is done. So the reviewer starts with fresh context, does not trust the implementer''s report, and works from a receipt the kit wrote itself. Approval rests on evidence.'
    - '**Least privilege:** An agent with broad permissions can do broad damage. So there are no permission-skipping flags and no auto-merge, the reviewer gets a read-only audit profile, and sensitive patterns are stripped before anything goes to Jev. A wrong move stays small, and sign-off commands refuse to run inside an AI session.'
workflow:
  intro: 'One run, start to finish, on the feature track. Each step closes a common way agent work goes wrong. Runs take one of three tracks: patch, feature or system.'
  steps:
    - '**Start with an intent:** A vague request leads to vague work. The human gives the lead one intent, the kit opens a run folder, and the run gets a track. Patch runs keep inception to requirements only.'
    - '**Plan before code:** Agents that start coding at once build the wrong thing. Antigravity researches, the lead writes requirements and units, and Antigravity designs the architecture. The spec_ready gate asks whether an engineer could build every unit without more questions, and a human signs off before construction.'
    - '**Build one unit at a time:** A big change made all at once is hard to check. Each unit is one bolt, in dependency order, walking skeleton first. Codex implements test-first, the unit_done gate runs the human-approved verification command, and a failure goes to debug.'
    - '**Review the risky work first:** Reviewing everything at once slows the run, and skipping review is worse. The review_now gate sends risky units to review at once and batches low-risk ones for the end of construction.'
    - '**Review, sign off, merge:** The builder''s word is not proof. A fresh-context Claude reviewer checks each unit against its definition of done and reruns the tests, and the review_risk gate runs the full verification, writes a receipt and sends high-risk work to a human. After the human signs off, the lead merges.'
featured: true
---

- **Daily Use of Coding Agents:** Use coding agents (**Claude Code**, **Codex**, **Gemini**) **daily** for design, implementation, code review, testing, and documentation, both at work and on personal projects.
- **Role-Based Agent Team:** Designed an **AI-DLC** kit in **Python** (standard library only) with **5 roles** (lead, research, architect, build, review): a **Claude** lead, **Antigravity** for research and architecture, **Codex** for build and debug, and a fresh-context **Claude** reviewer, coordinated through **tmux** panes and **hcom**.
- **Lifecycle & Quality Gates:** Implemented **3 phases** (Inception, Construction, Review) on **3 tracks** (patch, feature, system) with **4 gates** (**spec_ready**, **unit_done**, **review_now**, **review_risk**), one human-approved verification command per run, and human sign-off at the inception and review boundaries.
- **Advisor, Dispatch & Recovery:** Added **Jev** as an optional advisor behind **aidlc dispatch**, with the lead keeping the final decision, plus a stop hook that nudges an agent back when its result file has no status line, so a stalled task is reported instead of lost.
- **Safety & Verification:** Kept files as the source of truth with every decision logged, and applied least privilege: no permission-skipping flags, no auto-merge, a read-only audit profile for the reviewer, and a verification receipt written by the kit itself.

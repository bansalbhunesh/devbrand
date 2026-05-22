# 🤖 DevBrand Agent Playbook (AGENTS.md)

This playbook governs how AI agents interact with the DevBrand codebase, maintain documentation state, execute commands, and avoid repeating past operational mistakes. Read this file in full before performing any work.

---

## 1. 🧠 Memory Routing & Documentation State

Agents must maintain a clear log of project tasks, design plans, and walkthroughs. The following files are the primary storage for documentation state:
* **Task List (`task.md`)**: Located in the conversation brain folder (`<appDataDir>\brain\<conversation-id>\task.md`). This tracks active progress. Complete, in-progress, and pending tasks should be marked with `[x]`, `[/]`, and `[ ]` respectively.
* **Implementation Plan (`implementation_plan.md`)**: Document significant design changes and architectural additions here for user review and approval before writing code.
* **Walkthrough (`walkthrough.md`)**: Update this document after completing features to record what changed, how it was verified, and screenshots/results.
* **Implementation Notes (`IMPLEMENTATION.md`)**: Log every major decision during an implementation session.

---

## 2. 🛑 Hard Rules (Non-Negotiable Constraints)

* **Secret Leakage**: Never write, stage, or commit actual credentials, database passwords, or private keys to source control. Always read them from `.env` or `.env.local`.
* **No Direct Unvalidated Pushes**: Never run `git push` unless builds and lints pass.
* **Incremental Migrations**: Never delete or edit historical database migration files under `infrastructure/database/migrations/`. Always write new, sequential SQL files to perform schema modifications.
* **No `cd` in Proposed Shell Commands**: Never propose `cd` in terminal commands. Propose commands from the appropriate directory using the working directory (`Cwd`) parameter.

---

## 3. 🔍 Smallest Context Rules (Token & Efficiency Rules)

* **Bounded File Reads**: Do not read full files if only a specific section is needed. Use `StartLine` and `EndLine` in `view_file` to only load context within range.
* **No Recursive Folder Spans**: Avoid recursive directory listings or recursive file searches across the entire hard drive. Confine all operations to the active codebase.
* **Clean Code Edits**: Prefer `replace_file_content` for single contiguous changes and `multi_replace_file_content` for non-contiguous changes over writing full files to preserve tokens.

---

## 4. 📝 Learn Log (Baked-In Operational Failures)

Every correction made in production is stored here as an immutable rule so we never make the same mistake twice.

### 📌 Failure 1: Syntax / Bracket Errors on File Replacements
* **Rule**: When executing `replace_file_content`, verify that the target content boundaries match the file's braces exactly. Proactively check the end of the file for duplicate closing brackets before running checks.

### 📌 Failure 2: Running `grep` on Windows Environments
* **Rule**: Do not use Unix commands like `grep`, `ls`, or `sed` directly in Windows shells. Use PowerShell commands (e.g. `Get-ChildItem | Select-String`) or internal search tools instead.

### 📌 Failure 3: React Purity Violations & Render Impurities
* **Rule**: Wrap time-based initial states in lazy initializers, e.g. `const [now, setNow] = useState(() => Date.now())`, and manage periodic updates cleanly inside `useEffect`.

### 📌 Failure 4: Framer Motion Variant Type Mismatches
* **Rule**: Force literal type interpretation by appending `as const` to properties in Framer Motion variant objects.

### 📌 Failure 5: Package Manager Mismatch
* **Rule**: This monorepo uses `pnpm` (with `workspace:*` dependencies). Do NOT run standard `npm install`. Always use `pnpm install` and `pnpm run`.

---

## 5. 📂 Workspace Organization

* **`apps/web/`**: The TanStack Start React frontend. Uses Vite, Tailwind CSS v4, Framer Motion, and Radix UI.
* **`packages/*/`**: Shared libraries (repo-intelligence, ai-sdk, telemetry).
* **`modules/*/`**: Domain-specific logic modules (auth, billing, core, repos, roast, transform).
* **`infrastructure/*/`**: Database schema, drizzle config, and core infrastructure logic.

---

## 6. 💬 Platform & Response Formatting

* **Clickable Links**: Always link to files and directories using standard markdown link syntax with the `file:///` absolute path format. Do NOT surround clickable links with backticks.
* **Brief Summaries**: Keep response updates concise and highlight next steps clearly. Let the artifacts do the heavy lifting of showing detail.

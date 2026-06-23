---
name: nextu-review-all
description: Runs the full NEXTU FileShare review pipeline (code, security, clean code, best practices, verifier). Use when the user asks for a full review, pre-commit check, release readiness, or "run all agents".
---

# Full review pipeline

Run these subagents **in parallel** (Task tool), then `verifier` last:

1. `code-reviewer`
2. `security-reviewer`
3. `clean-code-reviewer`
4. `best-practices-reviewer`
5. `architecture-reviewer` — only if changes touch auth, API surface, Docker, or service boundaries

After parallel reviews complete and Critical/High issues are addressed:

6. `verifier` — confirm builds and claimed work

## Summarize for the user

Merge findings into one table:

| Severity | Agent | Location | Finding |

Sort by severity. End with overall **Verdict**: Ready / Not ready.

Playbooks: `.cursor/agents/*.md`

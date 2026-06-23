---
name: nextu-review-security
description: Runs security-reviewer on NEXTU FileShare changes. Use when the user asks for security review, auth audit, or before merging security-sensitive work.
---

# Security review

Launch the `security-reviewer` subagent (readonly) with the changed scope.

Prompt shape:
```
Review security for [describe changes or "all uncommitted changes"].
Focus on auth, file upload, sharing, admin API, and secrets.
Repository: NEXTU FileShare — see BACKEND.md and .cursor/agents/security-reviewer.md
```

Summarize findings in a table: Severity | Location | Finding | Remediation.

Do not fix unless the user asks.

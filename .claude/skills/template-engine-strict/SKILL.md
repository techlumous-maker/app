---
name: template-engine-strict
description: Enforce the non-negotiable implementation rules for Techlumous template-engine work. Use whenever an AI edits, creates, refactors, or reviews a template-engine template. Enforces the existing dependency allowlist and defensive handling of optional object and array content props.
metadata:
  short-description: Strict template implementation rules
---

# Strict Template-Engine Rules (Claude entry point)

This file exists only so Claude Code can discover this skill automatically —
Claude only auto-discovers skills under `.claude/skills/`, not a plain
top-level `skills/` folder.

The actual, assistant-agnostic rules (kept in `skills/` so Codex and other AI
assistants can read them too, without duplicating them here and risking
drift) are:

[`skills/template-engine-strict/SKILL.md`](../../../skills/template-engine-strict/SKILL.md)

Read that file now and follow it exactly. Do not summarize it from memory or
skip it, and apply it even in auto-approval or auto-permission mode.

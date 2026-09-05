---
name: template-engine
description: Create, modify, register, preview, validate, and troubleshoot templates in Techlumous's isolated template engine. Use when working under template-engine/, adding a template, changing a template's content schema, metadata, component, styles, assets, or dependencies, or tracing the template-specific editor, preview, catalog, publishing, and deployed-renderer boundaries. Do not use for unrelated dashboard, authentication, billing, or general deployment work.
metadata:
  short-description: Work safely on Techlumous templates
---

# Template Engine (Claude entry point)

This file exists only so Claude Code can discover this skill automatically —
Claude only auto-discovers skills under `.claude/skills/`, not a plain
top-level `skills/` folder.

The actual, assistant-agnostic skill (kept in `skills/` so Codex and other AI
assistants can read it too, without duplicating it here and risking drift) is:

[`skills/template-engine/SKILL.md`](../../../skills/template-engine/SKILL.md)

Read that file now and follow it exactly, including the strict rules skill
and references it points to. Do not summarize it from memory or skip it.

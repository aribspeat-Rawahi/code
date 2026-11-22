---
name: skill-router
description: Picks the single best installed skill (plus an optional follow-up) for a new request before any work starts, across gstack, animation, finance, marketing, design, productivity, Anthropic and built-in skills. Use at the start of a new chat or task, or when asked "which skill should I use", "find the best skill", "route this request", "what skill fits this".
---

# Skill Router

Goal: map the user's request to the best skill, invoke it, and get out of the way.
Never do the task's work inside this skill; route, then hand over.

## Procedure

1. **Read the request once.** Extract: the action (build, fix, review, test, ship, plan, explain, write, analyze), the target (web UI, React Native/Expo, iOS, WordPress/WooCommerce, API/server, docs, data, finance, marketing), and the deliverable (code change, report, file, artifact, answer).
2. **Check the live skill list.** The session's "available skills" listing is the source of truth. The catalog below is a map, not a guarantee: skip any skill that is not listed now.
3. **Pick using the rules below**, most specific first. One primary skill. Add one follow-up only when the request clearly spans two phases (e.g. build then review).
4. **Decide whether to route at all.** No skill when the request is a quick question, a one-line fix, plain explanation, or no skill clearly fits. Then just answer directly. A weak match is worse than none.
5. **Act.**
   - Clear match: say in one line which skill and why, then invoke it with the Skill tool, passing the user's request as `args`.
   - Two close candidates where the choice changes the outcome: ask one short question naming both by skill name.
   - The user explicitly asked only "which skill?": answer with the recommendation and don't invoke.

Reply in the user's language (Bengali for this user), keeping skill names in English.

## Tie-breaking rules

- Specific beats general: `animate-expo` over `animate` for Expo; `ios-fix` over `qa` for an iOS bug; `finance:sox-testing` over `finance:audit-support` for a SOX sample.
- Action-only variants: if the user says "just report" / "don't fix", prefer `qa-only` over `qa`, `improve-animations` (plans only) over editing skills.
- Diff review: `review` for a general pre-merge review, `code-review` for a correctness-bug hunt at a chosen effort level, `security-review` / `cso` for security, `simplify` for cleanup only.
- Planning before code: `plan-eng-review` for architecture; `spec` when the intent itself is still vague; `office-hours` for "is this worth building".
- Unsure which gstack skill: route to `gstack` (its own router) instead of guessing.
- A page/dashboard/deck to view or share: no skill here; use the Artifact tool's quickstart flow.

## Catalog by intent

### Build & code
| Request looks like | Skill |
|---|---|
| Plan a feature, architecture, data flow | `plan-eng-review` |
| Vague idea → precise spec/ticket | `spec` |
| Run checks/tests until green | `build-check` |
| Run/start/screenshot the app to see a change | `run` |
| Write or migrate Swift | `write-swift` |
| Claude API / Anthropic SDK / LLM app | `claude-api` |
| Find code worth extracting to shared libs | `deslop-shared-libs` |
| Create CLAUDE.md for a repo | `init` |

### Review, QA & security
| Request looks like | Skill |
|---|---|
| Review my diff / branch / PR | `review` (or `code-review`) |
| Clean up changed code, no bug hunt | `simplify` |
| Security review of pending changes | `security-review` |
| Full security audit | `cso` |
| Test the site/API and fix bugs | `qa` |
| Test and report only | `qa-only` |
| Stress-test UI with worst-case data | `break-ui` |
| Code quality dashboard | `health` |
| Low-value / duplicate tests | `test-audit` |
| Page speed / perf regression | `benchmark` |
| Second opinion from another model | `codex` |

### Ship & operate
| Request looks like | Skill |
|---|---|
| Ship it / create PR / bump version | `ship` |
| Configure deploy | `setup-deploy` |
| Monitor after deploy | `canary` |
| Update docs after ship | `document-release` |
| Write missing docs | `document-generate` |
| Weekly retro | `retro` |
| Safety for destructive commands (e.g. prod VPS) | `careful` / `guard` |
| Lock edits to one directory | `freeze` (undo: `unfreeze`) |
| Save / restore working context | `context-save` / `context-restore` |
| Heavy run on a remote VM | `ubicloud` |

### Mobile
| Request looks like | Skill |
|---|---|
| React Native / Expo animation, gestures, haptics | `animate-expo` |
| Web app should feel native on phone, PWA | `mobile-native` |
| iOS bug / QA / visual audit | `ios-fix` / `ios-qa` / `ios-design-review` |

### UI, design & motion
| Request looks like | Skill |
|---|---|
| Add an animation (web) | `animate` |
| Several elements animating together | `choreograph` |
| Drag, swipe, sheets | `gestures` |
| Janky / dropped-frame animation | `animation-performance` |
| Audit all motion in the codebase | `improve-animations` |
| Too much animation | `remove-animations` |
| Where should things animate? | `find-animation-opportunities` |
| "What's that effect called?" | `animation-vocabulary` |
| Component polish, interaction details | `emil-design-eng` |
| Apple-style fluid UI | `apple-design` |
| Sonner toasts | `ask-sonner` |
| New design system for a product | `design-consultation` |
| Visual design QA and fixes | `design-review` |
| Several design variants | `design-shotgun` |
| Mockup → production HTML/CSS | `design-html` |
| Design critique / a11y / handoff / UX copy | `design:design-critique` / `design:accessibility-review` / `design:design-handoff` / `design:ux-copy` |
| Any chart or dashboard | `dataviz` |
| Diagram from description | `diagram` |

### Browser & data
| Request looks like | Skill |
|---|---|
| Open a page, click through a flow | `browse` |
| Scrape data from a page | `scrape` |
| Deep multi-source research | `anthropic-skills:deep-research` |

### Documents & files
| Request looks like | Skill |
|---|---|
| .docx / .xlsx / .pptx / .pdf file | `anthropic-skills:docx` / `xlsx` / `pptx` / `pdf` |
| Markdown → PDF | `make-pdf` |
| Write or improve a skill | `write-skill` (or `anthropic-skills:skill-creator`) |

### Business
| Request looks like | Skill |
|---|---|
| SEO audit (e.g. WooCommerce store) | `marketing:seo-audit` |
| Campaign plan / email sequence / content | `marketing:campaign-plan` / `marketing:email-sequence` / `marketing:content-creation` |
| Competitor positioning | `marketing:competitive-brief` |
| P&L / variance / reconciliation / journal entries | `finance:financial-statements` / `finance:variance-analysis` / `finance:reconciliation` / `finance:journal-entry` |
| Tasks / memory | `productivity:task-management` / `productivity:memory-management` |

### Claude Code config
| Request looks like | Skill |
|---|---|
| Settings, permissions, hooks, "whenever X do Y" | `update-config` |
| Fewer permission prompts | `fewer-permission-prompts` |
| Keybindings | `keybindings-help` |
| Recurring task / polling | `loop` |
| SessionStart hook committed to repo | `session-start-hook` |

## No-skill cases (answer directly)

- WordPress/WooCommerce hook, filter, PHP snippet, plugin code: no dedicated skill; write it directly (child theme or custom plugin, nonce + capability checks).
- Linux VPS commands, nginx/systemd config, Docker: answer directly; add `careful` only for destructive production work.
- Explanations, quick questions, single-line fixes.

## Output format

One line, then invoke:

```
Skill: <name> — <why, under 15 words>. (Next: <follow-up skill>, if any)
```

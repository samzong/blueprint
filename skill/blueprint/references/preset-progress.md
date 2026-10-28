# Progress Preset

Use `progress` only when the owner explicitly requests a progress or status page for a task that spans hours, days, or multiple agent sessions.
The page answers five questions: the goal, completed work, current work, owner decisions, and update time.

## Workflow and ownership

```bash
blueprint create progress .local/task-progress
blueprint check .local/task-progress
blueprint preview .local/task-progress
```

The Agent writes only `src/progress.json`. The CLI owns `index.html`, labels, layout, grouping, and native disclosures.
Do not edit the generated HTML. Repeating `create` preserves the JSON and project identity.
If you use `--output`, its path must resolve inside the project directory.
This keeps entry-path checks and previews connected to the source project.
`check` recompiles the JSON before validation. `preview` also checks and compiles before it starts the server.
The same JSON and Blueprint version produce the same static HTML. The page displays the source timestamp without interpreting its age.
The page does not fetch task state or refresh source data. After a JSON edit, run `check` and reload the preview.

Once a task has a progress page, update it immediately after every item status change. Also update it when an owner decision appears.
For each change, update `src/progress.json`, refresh `updated_at` to the current time with a timezone, and run `blueprint check <directory>`.
If `check` fails, treat the update as failed. Correct the source and rerun the check. Do not skip the failure or report the page as current.
Do not create a progress page for a task that has no explicit owner request.
The Preset uses a fixed visual baseline without a Theme selector.

## Source

```json
{
  "title": "Release acceptance",
  "lang": "en",
  "goal": "Complete the agreed acceptance checks and record the remaining limits.",
  "updated_at": "2026-10-28T09:00:00-04:00",
  "status": "blocked",
  "decisions": [
    {
      "question": "Can the capacity check move to the next round?",
      "context": "Before this round closes, the owner must accept the missing capacity evidence. Keeping it in this round delays completion.",
      "recommendation": "Move capacity to the next round and keep its result unverified.",
      "links": [{ "label": "Acceptance criteria", "url": "https://example.com/acceptance" }]
    }
  ],
  "phases": [
    {
      "id": "acceptance",
      "title": "Acceptance",
      "items": [
        {
          "id": "browser-flow",
          "title": "Verify the browser flow",
          "status": "blocked",
          "result": "The identity interface must be available before verification.",
          "links": [{ "label": "Issue", "url": "https://example.com/issues/1" }],
          "session": "lody://session/00000000-0000-0000-0000-000000000000",
          "operation": "acceptance-browser-1",
          "owner": "Identity team"
        }
      ]
    }
  ]
}
```

`title`, `goal`, `updated_at`, `status`, and `phases` are required.
`lang` defaults to `en`. Labels support English and `zh-CN`. Other valid language tags use English labels.
`updated_at` must be a valid ISO 8601 timestamp with a timezone.
The task status is `on_track`, `at_risk`, `blocked`, or `done`. The author sets this judgment.
Item status is `done`, `active`, `next`, `blocked`, or `dropped`.
`result` records one completed result or the current situation. Keep it separate from the item title.
`decisions` and `links` default to empty arrays. Recovery fields `session`, `operation`, and `owner` are optional.

## Compact owner view

The compiler uses the same items for all views. Do not write separate summaries for these views.

The top progress bar shows the completed count, included count, and percentage rounded down.
For a nonempty workload, 100% means that every included item is done. An empty workload shows 0%.
Its segments represent phases, weighted by each phase's included item count. Each segment shows that phase's completed count.
The current phase is the first phase with active work, then the first blocked phase, then the first phase with next work.
The goal and overall status sit next to the progress bar. The update line shows the source timestamp as plain text.

When `decisions` is nonempty, a compact strip appears below the progress bar.
Each decision occupies one collapsed row with its question and recommendation. Native disclosure reveals context and links.
When `decisions` is empty, the entire strip is absent.
Each decision names when it matters, its effect on use, the other choice's cost, and a recommendation.
Use verified links and facts. Do not convert an unknown result into a pass or invent a pending owner decision.

Below the strip, three columns show completed work, current work, and upcoming work.
Completed work stays collapsed by default and shows its count. Current work includes active and visibly labeled blocked items.
Upcoming work contains next items. Dropped items are hidden and excluded from every count.

Each item initially occupies one row: title, status, and small evidence tags.
A native disclosure reveals the full title, result, phase, extra links, and recovery fields.
The first two links appear in the row. Remaining links stay inside the disclosure.
Long titles and link labels truncate visually, with the full text available through disclosure or the link title.
The source remains complete. Do not delete task data to make the page shorter.

## Design resources

Use the shared design system in [design-system.md](design-system.md).
The compiler embeds `src/shared/tokens.css` before the Preset styles.
Use its colors, font families, and lift shadow. Dates, percentages, and counts use the mono font.
Complete status uses teal, blocked or at-risk status uses orange, and active work uses accent.
The page loads the same Inter, Noto Sans SC, and JetBrains Mono families as the existing pitch output.
Cards use 6–8px radii. Only the overview card uses the lift shadow.
Native `progress` and `details` provide progress and disclosure behavior. Native disclosure markers need no custom icons.

Briefing's `.stage-row` contains wrapping, equal-width cards with whole-stage states.
Progress needs weighted segments with partial completion inside each segment.
Sharing the card styles would require replacing their sizing, spacing, surfaces, and state semantics.
Keep the briefing component unchanged. Progress uses a compact native progress track with shared tokens.
The shared deck stylesheet includes slide snapping, navigation, and full-screen rules, so Progress does not embed it.

| Resource | Reuse or addition | Reason for Preset styles |
| --- | --- | --- |
| Shared colors, fonts, lift shadow | Reuse `tokens.css` and the existing fixed teal/orange slots | All values come from shared tokens |
| Font loading | Reuse the pitch font stylesheet URL | The same families support Latin, Chinese, and metrics |
| Page base and focus | New reset, type sizing, and focus rules with shared tokens | The deck stylesheet also adds slide snapping and navigation |
| Phase progress track | New layout around native `progress` | Weighted partial completion differs from briefing stage cards |
| Overview and three columns | New compact spacing and grid | Slide canvases and padded cards exceed this page's height budget |
| Decision and item rows | New one-row layout around native `details` | Existing checklist cards do not collapse results or recovery fields |
| Status and evidence tags | New compact selectors with shared tokens | Existing slide labels and callouts use larger spacing and theme-specific states |

## Rendered size budget

Use the actual workload for acceptance, with at least 17 items. Keep all source items.
At a desktop viewport of 1440 by 900 pixels, measure `document.documentElement.scrollHeight` and `innerHeight`.
With completed work and all other disclosures closed, the page height must not exceed the viewport height.
With every disclosure open, the page height must not exceed twice the viewport height.
Record both measurements and capture screenshots for the collapsed and expanded states.
If the budget fails, first tighten each item's presentation and the source text limits. Do not remove sample data.

## Validation limits

Phase and item IDs share one namespace. Use 1–64 letters, digits, underscores, or hyphens, with a letter or digit first.
The source supports at most 20 phases, 200 items in total, 10 decisions, and 8 links per item or decision.
Each supplied text field must be nonempty. Link URLs allow at most 2048 characters, language tags 80, and timestamps 64.

| Field | Maximum characters |
| --- | ---: |
| Title | 120 |
| Goal, result, recommendation | 240 |
| Decision question | 160 |
| Decision context | 480 |
| Link label | 80 |
| Session URL, operation, owner | 240 |

Links and session URLs must be absolute `https:`, `http:`, or `lody:` URLs without credentials or control characters.
The compiler rejects other protocols, including `javascript:`, `file:`, and `data:`.
All source text is plain text. The compiler escapes HTML markup.

## Acceptance

Run `check`, then inspect the compiled page at 1440 by 900 pixels through `preview`.
Make sure that the progress bar identifies the current phase, each item appears once, evidence links work, and disclosures reveal the complete content.
Measure the rendered size budget in both desktop states. Use an empty `decisions` array to exercise section removal.
A successful check proves source and output structure. It does not prove factual freshness or the linked task's completion.

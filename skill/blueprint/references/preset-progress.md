# Progress Preset

Create a `progress` Artifact only when the owner explicitly requests a status page.
Use it to show task progress, owner decisions, and the latest update time.

## Create and update

```bash
blueprint create progress <directory>
blueprint check <directory>
```

Edit only `src/progress.json`. The CLI owns the HTML, labels, layout, and disclosures.
A repeated `create` reads the existing JSON and preserves the project identity.
The `--output` path follows the `briefing` rule and can be outside the project directory.

After every item status change or new owner decision, update the JSON and `updated_at`.
Then rerun `blueprint create progress <directory>` and `blueprint check <directory>`.
If `check` fails, correct the JSON and repeat both commands. Do not skip the failure.
`create` validates the JSON and compiles the page. `check` validates only the generated Artifact.

## Source fields

```json
{
  "title": "Release acceptance",
  "lang": "en",
  "goal": "Complete the agreed checks and record remaining limits.",
  "updated_at": "2026-10-28T09:00:00-04:00",
  "status": "at_risk",
  "decisions": [],
  "phases": [
    {
      "id": "acceptance",
      "title": "Acceptance",
      "items": [
        {
          "id": "browser-flow",
          "title": "Verify the browser flow",
          "status": "active",
          "result": "The identity interface is ready for verification.",
          "links": [],
          "session": "lody://session/00000000-0000-0000-0000-000000000000"
        }
      ]
    }
  ]
}
```

Required fields are `title`, `goal`, `updated_at`, `status`, and `phases`.
`lang` defaults to `en`. Supported task statuses are `on_track`, `at_risk`, `blocked`, and `done`.
Item statuses are `done`, `active`, `next`, `blocked`, and `dropped`.
Each phase requires `id`, `title`, and `items`. Each item requires `id`, `title`, `status`, and `result`.
An item can include `links` and `session`.
Each decision requires `question`, `context`, and `recommendation`. Its `links` are optional.
`decisions` and `links` default to empty arrays. `session` uses a session link.

IDs must be valid and unique across phases and items. Decisions do not need an ID.
The validator checks required fields, types, enum values, and valid unique IDs.
Links accept safe `http`, `https`, or `lody` URLs. `updated_at` uses ISO 8601 with a timezone.
Do not add limits on text or collection size.

## Layout and design

The fixed desktop layout uses shared design tokens and no Theme selector.
At 1440×900, verify the actual workload: collapsed height must be at most 900 pixels, and expanded height at most 1800 pixels.
The overview shows the goal, task status, update time, and progress weighted by phase items.
Each segment shows completed work. The current phase is active, then blocked, then next work.
Three columns show completed, current, and upcoming items. Completed work is collapsed by default.
Dropped items are hidden. Current work includes active and blocked items.
Decisions appear as collapsed rows when present. Disclosures reveal item results and details.
Progress reuses shared tokens. Briefing's equal-width stage cards do not support weighted progress or compact disclosures.

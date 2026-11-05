# Rendered acceptance

Apply this procedure before delivering `html`, `prototype-lite`, or `prototype-full`, including a rebuild or upgrade.
`blueprint check` proves structure. It does not execute scripts or prove visual quality.
This procedure does not select a Theme or change the `html` scaffold.

## Prepare the browser

1. Run `blueprint check <output>` after authoring the final content.
2. For `prototype-full`, install missing dependencies with `pnpm install --ignore-workspace`, then run `pnpm build` in the Artifact.
3. Run `blueprint preview <output>` and use the exact entry URL that it prints.
4. Read the installed `ego-browser skill` guide before browser work.
5. Create one TaskSpace for this Artifact and print its ID. Resume that space in later rounds.

Creation authorizes the local preview needed for acceptance. Stop only the preview process that you started after acceptance.
If the browser, preview, or image viewer is unavailable, report the exact failure and the unverified scope.
Return the Artifact path for recovery, but do not call delivery or visual acceptance complete.
Do not install or upgrade browser tools without separate authorization.

Copy this pattern into `ego-browser nodejs`. Replace the task name, exact preview URL, and absolute evidence directory.
Create the evidence directory outside the published content before running it.

```js
const task = await taskSpace("accept Artifact SESSION_ID");
const page = task.page("p1");
await page.goto("http://127.0.0.1:PORT/index.html");
await page.cdp("egoAutomated.disable");
await page.cdp("Runtime.enable");
await page.cdp("Log.enable");
await page.events();
await page.reload();
const startupEvents = (await page.events()).filter(event =>
  ["Runtime.exceptionThrown", "Runtime.consoleAPICalled", "Log.entryAdded"].includes(event.method)
);
console.log({ spaceId: task.spaceId, startupEvents });
for (const [name, width, height] of [["wide", 1280, 900], ["narrow", 375, 812]]) {
  await page.cdp("Emulation.setDeviceMetricsOverride", {
    width, height, deviceScaleFactor: 1, mobile: false,
  });
  await page.waitForFunction(() => document.readyState === "complete");
  console.log(await page.snapshot({ scope: "full_page" }));
  console.log(await page.evaluate(() => ({
    viewport: innerWidth,
    pageWidth: document.documentElement.scrollWidth,
    overflows: document.documentElement.scrollWidth > innerWidth,
  })));
  console.log(await page.screenshot({ path: `/ABSOLUTE/EVIDENCE/${name}.png`, fullPage: true }));
}
```

Wait for the Artifact's actual content before capturing asynchronous views. A load event alone does not prove that React mounted.
Enabling console capture before reload includes startup failures. `page.events()` drains the buffer. Save relevant events before draining again.
Inspect `Runtime.exceptionThrown`, `Runtime.consoleAPICalled`, and `Log.entryAdded`, including warnings and failed resources.
After interactions, collect events again. Explain unrelated warnings with evidence instead of hiding them.

## Inspect and exercise

At both viewport sizes, perform these checks on the rendered page:

1. Open the screenshots with an image viewer. Inspect the full page and each changed interaction state.
2. Inspect hierarchy, text readability, contrast, clipping, overlap, wrapping, and spacing around related content.
3. Inspect the snapshot for named buttons and labeled inputs. Fix empty names or missing labels in the rendered controls.
4. Operate every visible control and link in its intended scope. For external actions, inspect the destination without executing an unauthorized action.
5. Use Tab, Shift+Tab, Enter, and Space where applicable. Make sure that focus stays visible and follows the task order.
6. For prototypes, execute the selected flow's failure and recovery using the [prototype contract](preset-prototype.md).
7. Collect console events after the flow. Fix Artifact errors and broken states before rerunning the affected checks.

Measure page overflow at both widths and after state changes. Require `pageWidth <= viewport`.
Do not mask overflow with page-level `overflow-x: hidden`. Reflow the offending content.
A necessary two-dimensional table can scroll inside a labeled, keyboard-reachable container. The page must still fit the viewport.

For suspect or critical text, record the computed foreground and the actual opaque background behind it.
Resolve transparent ancestors or composited surfaces before measuring contrast.
Pass their hex values to the existing numeric check:

```bash
blueprint palette check '#FOREGROUND' --mode light --kind text --surface '#BACKGROUND' --json
```

Use `--mode dark` for a supported dark appearance. Keep `--surface` bound to the actual background.
This screening requires 4.5:1 for text. A numeric PASS does not prove readability, hierarchy, or full accessibility.
Inspect screenshots as well. If the Artifact supports multiple appearance modes, repeat for each supported mode.
Do not add an appearance mode for this procedure.

## Finish with evidence

Fix clipping, overlap, unreadable text, broken controls or states, and page-level horizontal overflow before delivery.
Rerun the affected interactions, measurements, and screenshots after each correction.
A saved screenshot without opening it does not establish visual acceptance.

Keep the acceptance evidence outside published content. Record these details in the handoff:

- Artifact entry URL and the exact version or files tested.
- Viewport sizes, screenshot paths, and what you observed when opening each image.
- Controls and keyboard paths exercised, including the prototype failure and recovery result.
- Page-width measurements, console findings, corrections, and anything still unverified.

Keep the TaskSpace open while inspecting screenshots and rerunning corrections.
After those steps pass, run this separate completion round with the recorded ID:

```js
const task = await taskSpace(SPACE_ID);
await task.finish({ keep: [] });
```

Keep a result page only when the user needs it to continue. Stop your preview process after the browser work ends.

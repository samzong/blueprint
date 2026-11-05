# Preset: prototype

Use this contract for clickable concepts, interaction models, mode switching, and short-lived demos.

- `prototype-lite`: one page, one bounded review flow, short lifetime.
- `prototype-full`: multiple views, sustained iteration, or expected growth.

## Complete the reviewed flow

Choose the flow that answers the review question. Implement its relevant failure and recovery through to a visible result.
The number of modes does not establish completeness. Do not add unrelated states or require a fixed state checklist.
Use realistic input, labels, explanations, and results for the selected flow.

For example, a save review needs this sequence:

1. Edit realistic input and submit it with the keyboard.
2. Show that saving is in progress and prevent duplicate submissions while it is pending.
3. Trigger a reproducible simulated failure. Keep the entered values and explain the next action.
4. Move focus to the error summary or affected input. Associate field errors with their inputs when applicable.
5. Retry from that state without re-entering valid input.
6. Show success with the saved values and announce the result.

Use native controls with accessible names, associated labels, visible focus, and logical Tab order.
Support pointer and keyboard operation for the same flow. Keep controls at least 44px tall with narrow-screen wrapping.
If the flow includes a dialog, move focus into it, support Escape, and restore focus to its trigger after closing.
Keep status text available to assistive technology through an appropriate live region or alert.
Do not let replacing a result panel strand focus on `BODY`.

Label simulated effects where the reviewer encounters them.
State where the real product must take over, such as service persistence, authentication, permission checks, or sending an approval.
Explain any omitted behavior that limits the review question. Do not imply that a local success saved production data.

## prototype-lite

```bash
blueprint create prototype-lite <output>
```

Edit `<output>/index.html`. Keep local React state and the existing scaffold.
Do not add a build chain, state library, or UI framework.
Move to `prototype-full` when the file approaches 600 lines or needs routing.
Failure and recovery states within one flow do not alone require `prototype-full`.

## prototype-full

```bash
blueprint create prototype-full <output>
```

Fill `src/data/content.ts`, `src/types.ts`, `src/App.tsx`, and `src/index.css`.
The scaffold owns Vite, React, strict TypeScript, Tailwind CSS 4, and pnpm.
Keep state local and add routing only for real multiple pages.

## Acceptance

Complete [rendered acceptance](rendered-acceptance.md) before delivery for either prototype Preset.
At wide and narrow widths, trigger the failure and finish recovery in the actual browser.
Record input retention, error focus, the retry result, and the visible real-product boundary.
Inspect screenshots of the initial, failed, and recovered views. Functional clicks alone do not establish visual acceptance.

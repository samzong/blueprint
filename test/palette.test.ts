import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { checkPalette, contrast, cvdMatrices, linearize, oklab, parseHex, simulate } from "../src/palette.ts";

const close = (actual: number, expected: number, tolerance = 1e-7) => assert.ok(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);

test("matches independent color-space and luminance reference vectors", () => {
  const red = linearize(parseHex("#f00"));
  assert.deepEqual(red, [1, 0, 0]);
  const lab = oklab(red);
  [0.6279553606, 0.2248630611, 0.1258462985].forEach((value, index) => close(lab[index], value));
  assert.deepEqual(simulate(red, cvdMatrices.protan), [0.152286, 0.114503, 0]);
  assert.deepEqual(simulate(red, cvdMatrices.deutan), [0.367322, 0.280085, 0]);
  assert.deepEqual(simulate(red, cvdMatrices.tritan), [1, 0, 0.004733]);
  close(contrast(linearize(parseHex("#000")), linearize(parseHex("#fff"))), 21);
  close(contrast(linearize(parseHex("#777")), linearize(parseHex("#fff"))), 4.4780894536);
});

test("copyable reference tokens pass their actual role in both modes", async () => {
  const reference = await readFile(new URL("../skill/blueprint/references/chart-method.md", import.meta.url), "utf8");
  const css = reference.match(/```css\n([\s\S]*?)\n```/)![1];
  const [light, dark] = css.split("@media");
  for (const [mode, block] of [["light", light], ["dark", dark]] as const) {
    const tokens = Object.fromEntries([...block.matchAll(/--chart-([\w-]+): (#[a-f\d]{6});/g)].map((match) => [match[1], match[2]]));
    const colors = (names: string[]) => names.map((name) => tokens[name]);
    const categorical = checkPalette(colors([1,2,3,4,5].map((n) => `category-${n}`)), mode);
    assert.equal(categorical.pass, true, categorical.failures.join("\n"));
    assert.equal(categorical.pairs.length, 40);
    for (let mask = 1; mask < 32; mask++) {
      const subset = colors([1,2,3,4,5].filter((n) => mask & (1 << (n - 1))).map((n) => `category-${n}`));
      if (subset.length > 1) assert.equal(checkPalette(subset, mode).pass, true);
    }
    for (const [kind, names] of [
      ["sequential", ["sequential-1", "sequential-2", "sequential-3", "sequential-4", "sequential-5"]],
      ["diverging", ["diverging-low", "diverging-low-mid", "diverging-neutral", "diverging-high-mid", "diverging-high"]],
      ["status", ["status-info", "status-warning", "status-danger", "status-success"]],
      ["text", ["text"]], ["mark", ["grid"]],
    ] as const) {
      const result = checkPalette(colors([...names]), mode, kind, tokens.surface);
      assert.equal(result.pass, true, `${mode}/${kind}: ${result.failures.join("\n")}`);
    }
  }
});

test("reference identities preserve hue across modes and ordered scales retain their encoding", async () => {
  const reference = await readFile(new URL("../skill/blueprint/references/chart-method.md", import.meta.url), "utf8");
  const blocks = reference.match(/```css\n([\s\S]*?)\n```/)![1].split("@media");
  const modes = blocks.map((block) => Object.fromEntries([...block.matchAll(/--chart-([\w-]+): (#[a-f\d]{6});/g)].map((match) => [match[1], match[2]])));
  const hueDistance = (a: number, b: number) => Math.min(Math.abs(a - b), 360 - Math.abs(a - b));
  const sample = (color: string) => checkPalette([color], "light", "mark").samples[0];
  for (let slot = 1; slot <= 5; slot++) {
    const [light, dark] = modes.map((tokens) => sample(tokens[`category-${slot}`]));
    assert.ok(hueDistance(light.h, dark.h) < 3);
    assert.ok(light.C >= 0.08 && light.C <= 0.14 && dark.C >= 0.08 && dark.C <= 0.14);
  }
  for (const tokens of modes) {
    const sequential = [1,2,3,4,5].map((n) => sample(tokens[`sequential-${n}`]));
    assert.ok(sequential.every((stop) => hueDistance(stop.h, 250) < 3));
    assert.ok(sample(tokens["diverging-neutral"]).C < 0.001);
    const danger = sample(tokens["status-danger"]), warning = sample(tokens["status-warning"]), success = sample(tokens["status-success"]);
    assert.ok(danger.h > 15 && danger.h < 35);
    assert.ok(warning.h > 60 && warning.h < 90);
    assert.ok(success.h > 140 && success.h < 165);
  }
});

test("checks nonadjacent pairs exposed by filtering, not just neighboring colors", () => {
  const result = checkPalette(["#243078", "#c07818", "#243079"], "light");
  assert.equal(result.pass, false);
  assert.ok(result.failures.some((failure) => failure.includes("pair 1/3")));
  assert.equal(result.pairs.length, 12);
});

test("rejects CVD collisions despite normal vision separation", () => {
  const result = checkPalette(["#ff0000", "#008000"], "light");
  assert.equal(result.pass, false);
  assert.ok(result.failures.some((failure) => failure.startsWith("protan pair") || failure.startsWith("deutan pair")));
});

test("contrast shortfalls and required compensation never yield PASS", () => {
  assert.equal(checkPalette(["#fff", "#243078"], "light").pass, false);
  assert.equal(checkPalette(["#777"], "light", "mark").pass, true);
  assert.equal(checkPalette(["#777"], "light", "text").pass, false);
  assert.equal(checkPalette(["#243078", "#c07818"], "light", "categorical", "#243078").pass, false);
});

test("ordered ramps reject reversal, a flat step, and opposed diverging arms", () => {
  assert.equal(checkPalette(["#202020", "#707070", "#505050"], "light", "sequential").pass, false);
  assert.equal(checkPalette(["#505050", "#505051"], "light", "sequential").pass, false);
  assert.equal(checkPalette(["#202020", "#505050", "#707070"], "light", "diverging").pass, false);
});

test("rejects unsupported colors and malformed ramps before computation", () => {
  for (const hex of ["#1234", "#12345678", "red", "", "#gggggg"]) assert.throws(() => parseHex(hex));
  assert.throws(() => checkPalette(["#123"], "light"));
  assert.throws(() => checkPalette(["#123", "#456", "#789", "#abc"], "light", "diverging"));
});

test("built CLI exposes complete JSON and truthful process exit status", () => {
  const invoke = (args: string[]) => spawnSync(process.execPath, ["dist/bin.js", "palette", "check", ...args], { encoding: "utf8" });
  const good = invoke(["#255387,#bf8832,#248164,#9572b1,#682122", "--mode", "light", "--json"]);
  assert.equal(good.status, 0, good.stderr);
  const result = JSON.parse(good.stdout);
  assert.equal(result.pass, true);
  assert.equal(result.pairs.length, 40);
  const bad = invoke(["#243078,#c07818,#243079", "--mode", "light", "--json"]);
  assert.equal(bad.status, 1);
  assert.equal(JSON.parse(bad.stdout).pass, false);
  assert.ok(JSON.parse(bad.stdout).failures.some((failure: string) => failure.includes("1/3")));
  for (const args of [["#123,#456"], ["#123,#456", "--mode", "night"], ["#123,#456", "--mode", "light", "--surface", "transparent"]]) {
    assert.equal(invoke(args).status, 1);
  }
});

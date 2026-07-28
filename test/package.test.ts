import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { cp, mkdir, mkdtemp, readFile, readdir, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

const exec = promisify(execFile);
const repository = fileURLToPath(new URL("..", import.meta.url));

test("installs a runnable package with every preset and the bundled skill", { timeout: 30_000 }, async () => {
  const scratch = await mkdtemp(path.join(os.tmpdir(), "blueprint-package-"));
  await exec("npm", ["pack", "--pack-destination", scratch], { cwd: repository });
  const tarball = (await readdir(scratch)).find((entry) => entry.endsWith(".tgz"));
  assert.ok(tarball);

  const prefix = path.join(scratch, "install");
  await exec(
    "npm",
    ["install", "--ignore-scripts", "--no-audit", "--no-fund", "--prefix", prefix, path.join(scratch, tarball)],
    { cwd: repository },
  );

  const executable = path.join(prefix, "node_modules", ".bin", "blueprint");
  const { stdout: version } = await exec(executable, ["--version"], { cwd: scratch });
  assert.equal(version.trim(), "blueprint 0.1.0");

  for (const preset of ["pitch", "briefing"]) {
    const project = path.join(scratch, preset);
    await cp(path.join(repository, "test", "fixtures", preset), project, { recursive: true });
    await exec(executable, ["create", preset, project], { cwd: scratch });
    await exec(executable, ["check", project], { cwd: scratch });
  }

  for (const preset of ["prototype-lite", "prototype-full", "dossier"]) {
    const project = path.join(scratch, preset);
    await exec(executable, ["create", preset, project], { cwd: scratch });
    assert.match(await readFile(path.join(project, "index.html"), "utf8"), /<html/);
  }

  assert.match(await readFile(path.join(scratch, "prototype-lite", "index.html"), "utf8"), /ReactDOM\.createRoot/);

  const installHome = path.join(scratch, "home");
  const installEnv = { ...process.env, HOME: installHome };
  await exec(
    executable,
    ["skill", "install", "--scope", "user", "--agent", "codex", "--yes"],
    { cwd: scratch, env: installEnv },
  );
  const installedSkill = path.join(installHome, ".agents", "skills", "blueprint");
  assert.match(await readFile(path.join(installedSkill, "SKILL.md"), "utf8"), /^# blueprint$/m);
  assert.match(await readFile(path.join(installedSkill, ".kitup.json"), "utf8"), /"appId": "blueprint"/);
  await exec(
    executable,
    ["skill", "install", "--scope", "user", "--agent", "codex", "--yes"],
    { cwd: scratch, env: installEnv },
  );

  const conflictHome = path.join(scratch, "conflict-home");
  const conflictSkill = path.join(conflictHome, ".agents", "skills", "blueprint");
  await mkdir(conflictSkill, { recursive: true });
  await writeFile(path.join(conflictSkill, "sentinel.txt"), "keep\n");
  await assert.rejects(
    exec(
      executable,
      ["skill", "install", "--scope", "user", "--agent", "codex", "--yes"],
      { cwd: scratch, env: { ...process.env, HOME: conflictHome } },
    ),
    /Installation has conflicts/,
  );
  assert.equal(await readFile(path.join(conflictSkill, "sentinel.txt"), "utf8"), "keep\n");

  assert.match(
    await readFile(
      path.join(prefix, "node_modules", "@samzong", "blueprint", "skill", "blueprint", "SKILL.md"),
      "utf8",
    ),
    /^# blueprint$/m,
  );
});

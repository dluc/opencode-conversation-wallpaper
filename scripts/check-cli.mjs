import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { mkdir, mkdtemp, readFile, writeFile } from "node:fs/promises"
import { homedir } from "node:os"
import path from "node:path"

const binary = process.env.OPENCODE_TEST_BIN || "opencode"
const old = "github:dluc/opencode-conversation-wallpaper#v0.2.1"
const target = "github:dluc/opencode-conversation-wallpaper"
await mkdir("test-results", { recursive: true })
const root = await mkdtemp(path.resolve("test-results/native-cli-"))
// Never connect to the calling session's server or reuse its database/registration.
const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("OPENCODE")))
for (const kind of ["CONFIG", "DATA", "CACHE", "STATE"]) {
  const directory = path.join(root, kind.toLowerCase())
  await mkdir(directory)
  env[`XDG_${kind}_HOME`] = directory
}
env.GH_CONFIG_DIR = process.env.GH_CONFIG_DIR || path.join(process.env.XDG_CONFIG_HOME || path.join(homedir(), ".config"), "gh")
const cwd = path.join(root, "work")
await mkdir(cwd)
const run = (...args) => execFileSync(binary, args, { env, cwd, encoding: "utf8", timeout: 90_000 })
const config = path.join(root, "config/opencode/opencode.json")

try {
  console.log(run("--version").trim())
  console.log(run("plugin", "add", old).trim())
  // This sentinel/comment exist only in the isolated fixture, not user configuration.
  const initial = JSON.parse(await readFile(config, "utf8"))
  assert.deepEqual(initial.plugins, [old])
  initial.plugins.push("-example.keep")
  initial.$schema = "https://opencode.ai/config.json"
  await writeFile(config, `// Unrelated config must survive\n${JSON.stringify(initial, null, 2)}\n`)

  console.log(run("plugin", "remove", old).trim())
  console.log(run("plugin", "add", target).trim())
  const text = await readFile(config, "utf8")
  const current = JSON.parse(text.split("\n").filter(line => !line.trimStart().startsWith("//")).join("\n"))
  assert.deepEqual(current.plugins, ["-example.keep", target], "Keep other entries and exactly one unpinned wallpaper")
  assert.equal(current.$schema, "https://opencode.ai/config.json")
  assert(text.includes("// Unrelated config must survive"))

  // A cold Location's inventory loads asynchronously. Wait for the actual target,
  // not a fixed delay, before asserting the updater can find it.
  const deadline = Date.now() + 45_000
  while (true) {
    const listed = run("plugin", "list")
    if (listed.split("\n").some(line => line.trim().split(/\s+/)[2] === target)) {
      console.log(listed.trim())
      break
    }
    assert(Date.now() < deadline, "Timed out waiting for the configured wallpaper to enter the inventory")
    await new Promise(resolve => setTimeout(resolve, 100))
  }
  const result = run("plugin", "update", target)
  assert(/No plugin updates available|Updated/.test(result), "Expected a successful update result")
  console.log(result.trim())
  console.log("Native CLI checks passed: pinned-to-branch remove/add, one wallpaper entry, preserved unrelated config/comment, standard update.")
} finally {
  console.log(run("service", "stop").trim() || "Isolated service stopped.")
}

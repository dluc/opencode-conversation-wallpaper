import assert from "node:assert/strict"
import { execFileSync } from "node:child_process"
import { readFileSync } from "node:fs"

const manifest = JSON.parse(readFileSync("package.json", "utf8"))
assert.equal(manifest.license, "MIT", "Keep the SPDX license identifier in package metadata")
assert.equal(manifest.dependencies, undefined, "The prebuilt GUI needs no installed runtime dependencies")
for (const name of ["build", "prepare", "prepack", "preinstall", "install", "postinstall"]) {
  assert.equal(manifest.scripts[name], undefined, `Do not add install-time script ${name}`)
}
const [{ files }] = JSON.parse(execFileSync("npm", ["pack", "--dry-run", "--json"], { encoding: "utf8" }))
const paths = new Set(files.map(file => file.path))
assert(paths.has("README.md"))
assert(paths.has("LICENSE"), "The MIT license must ship with the package")
assert(paths.has("CHANGELOG.md"), "The changelog must ship with the package")
const license = readFileSync("LICENSE", "utf8")
assert(license.startsWith("MIT License\n") && license.includes("Permission is hereby granted, free of charge"), "Include the full MIT license text")
const readme = readFileSync("README.md", "utf8")
for (const [, asset] of readme.matchAll(/!\[[^\]]*\]\((docs\/images\/[^)]+)\)/g)) {
  assert(paths.has(asset), `README image is missing from the package: ${asset}`)
}
for (const entry of Object.values(manifest.exports)) assert(paths.has(entry.replace(/^\.\//, "")), `Missing export ${entry}`)
assert(![...paths].some(path => /^(src|tests|preview|node_modules)\//.test(path)), "Do not ship tests, fixtures or node_modules")
const bundle = readFileSync("dist/gui-experimental.cjs", "utf8")
const externals = new Set([...bundle.matchAll(/require\(["']([^"']+)["']\)/g)].map(match => match[1]))
for (const name of externals) assert(["effect", "solid-js", "solid-js/web", "@opencode/plugin/gui"].includes(name), `Unexpected runtime import ${name}`)
console.log(`Package verified: ${paths.size} files; runtime imports: ${[...externals].join(", ")}`)

import { defineConfig } from "vite"
import solid from "vite-plugin-solid"
import { fileURLToPath } from "node:url"

export default defineConfig({
  plugins: [solid()],
  resolve: { alias: { "@opencode/plugin/gui": fileURLToPath(new URL("./preview/sdk.ts", import.meta.url)) } },
  server: { host: "127.0.0.1", port: 4321, strictPort: true },
})

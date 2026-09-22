import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// Build-time version info, shown in the staff area so anyone can say which
// update they are looking at. `revision` goes up with every release and matches
// the app's (package.json "revision"); the commit comes from whichever host
// built it (Cloudflare Pages sets CF_PAGES_COMMIT_SHA), else local git.
const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8'))
function localCommit(): string {
  try {
    return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim()
  } catch {
    return 'dev'
  }
}

// https://vite.dev/config/
export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
    __APP_REVISION__: JSON.stringify(Number(pkg.revision ?? 0)),
    __APP_COMMIT__: JSON.stringify(process.env.CF_PAGES_COMMIT_SHA || process.env.COMMIT_REF || localCommit()),
    __APP_BUILD_TIME__: JSON.stringify(new Date().toISOString()),
  },
  plugins: [react(), tailwindcss()],
})

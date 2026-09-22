// Build/version info injected by vite.config.ts, shown in the staff area.
// The revision matches the app's, so "rev 5" means the same update on both.
declare const __APP_VERSION__: string
declare const __APP_REVISION__: number
declare const __APP_COMMIT__: string
declare const __APP_BUILD_TIME__: string

export const build = {
  version: __APP_VERSION__,
  revision: __APP_REVISION__,
  commit: __APP_COMMIT__,
  commitShort: __APP_COMMIT__.slice(0, 7),
  builtAt: __APP_BUILD_TIME__,
}

/** "v0.2.3 · rev 5" — the one string to quote when reporting something. */
export const buildLabel = `v${build.version} · rev ${build.revision}`

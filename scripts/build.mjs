import { readFile } from 'node:fs/promises'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { build } from 'esbuild'
import { loadOriginalGame } from './original.mjs'

const { name } = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf8'))
const tailwind = fileURLToPath(new URL('../node_modules/@tailwindcss/cli/dist/index.mjs', import.meta.url))
const originalGame = await loadOriginalGame()
const theme = execFileSync(process.execPath, [tailwind, '-i', 'src/theme.css', '--minify'], { encoding: 'utf8' })
  // Scope generated theme defaults and legacy custom-property fallbacks to the plugin.
  .replaceAll(':root,:host{', '.stonk-workspace{')
  .replaceAll('*,:before,:after,::backdrop{', '.stonk-workspace,.stonk-workspace *,.stonk-workspace :before,.stonk-workspace :after{')
  .replaceAll('--tw-', '--sr-tw-')

await build({
  entryPoints: ['src/client.tsx'],
  outfile: 'lib/client.js',
  bundle: true,
  platform: 'browser',
  format: 'cjs',
  external: ['react', 'react/jsx-runtime'],
  jsx: 'automatic',
  target: 'es2022',
  loader: { '.css': 'text' },
  plugins: [{ name: 'stonk-tailwind', setup(build) {
    build.onResolve({ filter: /^\.\/theme\.css$/ }, () => ({ path: 'theme.css', namespace: 'stonk' }))
    build.onLoad({ filter: /.*/, namespace: 'stonk' }, () => ({ contents: theme, loader: 'text' }))
  } }, { name: 'stonk-original', setup(build) {
    build.onResolve({ filter: /^\.\/original-game\.html$/ }, () => ({ path: 'original-game.html', namespace: 'stonk-game' }))
    build.onLoad({ filter: /.*/, namespace: 'stonk-game' }, () => ({ contents: originalGame, loader: 'text' }))
  } }],
  banner: { js: `window.__ModuleLoader__.load({ id: ${JSON.stringify(name)}, factory: (require) => { const module = { exports: {} };` },
  footer: { js: 'return module.exports; } });' },
})

import { build } from 'esbuild'
import { mkdtemp, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const source = fileURLToPath(new URL('../src/chat-width.ts', import.meta.url))
const outdir = await mkdtemp(join(process.cwd(), '.tmp-chat-width-'))
const outfile = join(outdir, 'chat-width.mjs')
await build({ entryPoints: [source], bundle: true, format: 'esm', platform: 'node', outfile, logLevel: 'silent' })
const mod = await import(pathToFileURL(outfile).href)
await rm(outdir, { recursive: true, force: true })

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ` — ${detail}`}`)
}

check('limits leave the track a column', mod.chatWidthLimit(1400) === mod.chatWidthMax)
check('shrinks the cap with the panel', mod.chatWidthLimit(900) === 900 - mod.trackMinWidth - mod.splitterWidth)
check('never drops below the minimum', mod.chatWidthLimit(0) === mod.chatWidthMin)
check('minimum stays usable for the conversation', mod.chatWidthMin === 300)
check('splitter keeps a 9px hit area', mod.splitterWidth === 9)
check('preferred width is preserved when it fits', mod.clampChatWidth(520, 1400) === 520)
check('too-narrow drag clamps up', mod.clampChatWidth(100, 1400) === mod.chatWidthMin)
check('too-wide drag clamps to the panel cap', mod.clampChatWidth(900, 1200) === mod.chatWidthLimit(1200))
check('missing measurement clamps to the minimum', mod.clampChatWidth(500, 0) === mod.chatWidthMin)
check('invalid number clamps to the minimum', mod.clampChatWidth(Number.NaN, 1400) === mod.chatWidthMin)

const store = new Map()
const storage = {
  getItem: key => store.has(key) ? store.get(key) : null,
  setItem: (key, value) => { store.set(key, String(value)) },
  removeItem: key => { store.delete(key) },
}
mod.writeChatWidth(438, storage)
check('width round-trips through storage', mod.readChatWidth(storage) === 438)
check('stored width is rounded', store.get(mod.chatWidthKey) === '438')
mod.writeChatWidth(438.6, storage)
check('fractional drag is rounded up', mod.readChatWidth(storage) === 439)
mod.writeChatWidth(null, storage)
check('reset clears storage', mod.readChatWidth(storage) === null)
store.set(mod.chatWidthKey, 'not-a-number')
check('garbage storage is ignored', mod.readChatWidth(storage) === null)
store.set(mod.chatWidthKey, '-12')
check('negative storage is ignored', mod.readChatWidth(storage) === null)
check('failed storage access is ignored', mod.readChatWidth({ getItem() { throw new Error('denied') } }) === null)

mod.writeChatOpen(true, storage)
check('chat-open=true round-trips', mod.readChatOpen(storage) === true)
mod.writeChatOpen(false, storage)
check('chat-open=false round-trips', mod.readChatOpen(storage) === false)
store.delete(mod.chatOpenKey)
check('missing chat-open preference returns null', mod.readChatOpen(storage) === null)
check('invalid chat-open preference returns null', (() => { store.set(mod.chatOpenKey, 'yes'); return mod.readChatOpen(storage) === null })())
check('failed chat-open storage is ignored', mod.readChatOpen({ getItem() { throw new Error('denied') } }) === null)

console.log(failures ? `\n${failures} failure(s)` : '\nall checks passed')
process.exitCode = failures ? 1 : 0

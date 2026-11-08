import { spawn } from 'node:child_process'
import { mkdir, rm, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const promoDir = join(root, 'promo')
const framesDir = join(promoDir, 'frames')
const port = 9333
const chromePath = process.env.CHROME_PATH || 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const secondsArg = Number(process.argv.find(arg => arg.startsWith('--seconds='))?.slice(10) || 0)
const duration = secondsArg > 0 ? secondsArg : 32200

await rm(framesDir, { recursive: true, force: true })
await mkdir(framesDir, { recursive: true })
const manifest = []
let frameIndex = 0

const chrome = spawn(chromePath, [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  '--no-first-run',
  '--no-default-browser-check',
  '--force-device-scale-factor=1',
  '--window-size=1622,998',
  '--remote-debugging-port=' + port,
  '--remote-allow-origins=*',
  '--user-data-dir=' + join(promoDir, '.chrome-profile'),
  pathToFileURL(join(promoDir, 'host.html')).href,
], { stdio: 'ignore' })

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms))

async function waitForDebugger() {
  for (let attempt = 0; attempt < 120; attempt++) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`)
      if (response.ok) return
    } catch { /* retry */ }
    await sleep(250)
  }
  throw new Error('Chrome remote debugger did not start')
}

function connect(url) {
  return new Promise((resolve, reject) => {
    const socket = new WebSocket(url)
    const pending = new Map()
    let sequence = 0
    socket.addEventListener('open', () => resolve({
      send(method, params = {}) {
        return new Promise((res, rej) => {
          const id = ++sequence
          pending.set(id, { res, rej })
          socket.send(JSON.stringify({ id, method, params }))
        })
      },
      on(method, handler) { listeners.set(method, handler) },
      close() { socket.close() },
    }))
    socket.addEventListener('error', reject)
    const listeners = new Map()
    socket.addEventListener('message', event => {
      const message = JSON.parse(event.data)
      if (message.id && pending.has(message.id)) {
        const { res, rej } = pending.get(message.id)
        pending.delete(message.id)
        if (message.error) rej(new Error(message.error.message))
        else res(message.result)
        return
      }
      const listener = listeners.get(message.method)
      if (listener) listener(message.params)
    })
  })
}

try {
  await waitForDebugger()
  const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
  const target = targets.find(item => item.type === 'page' && item.url.includes('host.html')) || targets.find(item => item.type === 'page')
  if (!target) throw new Error('No page target')
  const client = await connect(target.webSocketDebuggerUrl)
  const { send } = client

  await send('Page.enable')
  await send('Runtime.enable')

  for (let attempt = 0; attempt < 80; attempt++) {
    const result = await send('Runtime.evaluate', { expression: 'window.__promoReady === true', returnByValue: true })
    if (result.result.value) break
    await sleep(250)
  }

  client.on('Page.screencastFrame', async frame => {
    const name = `frame-${String(frameIndex++).padStart(6, '0')}.jpg`
    await writeFile(join(framesDir, name), Buffer.from(frame.data, 'base64'))
    manifest.push({ file: name, timestamp: frame.metadata.timestamp })
    await send('Page.screencastFrameAck', { sessionId: frame.sessionId }).catch(() => {})
  })

  await send('Page.startScreencast', {
    format: 'jpeg', quality: 94, maxWidth: 1600, maxHeight: 900, everyNthFrame: 1,
  })
  await sleep(180)
  const startedAt = Date.now()
  await send('Runtime.evaluate', { expression: 'window.startPromo()' })
  await sleep(duration)
  await send('Page.stopScreencast').catch(() => {})

  const promoStartResult = await send('Runtime.evaluate', {
    expression: 'window.__promoStart || document.documentElement.getAttribute("data-promo-start") || null', returnByValue: true,
  }).catch(() => null)
  const promoStartValue = promoStartResult?.result?.value ?? null
  const promoStart = promoStartValue == null || promoStartValue === 'null' ? null : Number(promoStartValue)
  manifest.sort((a, b) => a.timestamp - b.timestamp)
  await writeFile(join(framesDir, 'manifest.json'), JSON.stringify({ frames: manifest, startedAt, promoStart }, null, 2))
  console.log(`captured ${manifest.length} frames over ${((Date.now() - startedAt) / 1000).toFixed(2)}s`)
  if (promoStart != null) console.log(`promo started at frame-clock ${promoStart}`)
  const errorResult = await send('Runtime.evaluate', { expression: 'window.__promoError || null', returnByValue: true }).catch(() => null)
  if (errorResult?.result?.value) console.log('PROMO ERROR:', errorResult.result.value)
  await send('Browser.close').catch(() => {})
  client.close()
} finally {
  chrome.kill()
  await sleep(300)
}


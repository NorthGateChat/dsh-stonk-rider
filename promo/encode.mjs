import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('./', import.meta.url))
const framesDir = join(dir, 'frames')
const manifest = JSON.parse(await readFile(join(framesDir, 'manifest.json'), 'utf8'))
const all = manifest.frames
const promoStart = manifest.promoStart
if (!promoStart) throw new Error('manifest.promoStart is missing')

const endTime = promoStart + 40
const selected = all.filter(frame => frame.timestamp >= promoStart)
if (!selected.length) throw new Error('no frames after promoStart')
const videoStart = selected[0].timestamp
const audioTrim = Math.max(0, videoStart - promoStart)

const lines = ['ffconcat version 1.0']
for (let index = 0; index < selected.length; index++) {
  const frame = selected[index]
  const next = selected[index + 1]
  const end = next ? Math.min(next.timestamp, endTime) : endTime
  const duration = Math.max(0.01, end - frame.timestamp)
  lines.push(`file '${join(framesDir, frame.file).replaceAll('\\', '/')}'`)
  lines.push(`duration ${duration.toFixed(6)}`)
}
lines.push(`file '${join(framesDir, selected[selected.length - 1].file).replaceAll('\\', '/')}'`)
const listPath = join(dir, 'frames.txt')
await writeFile(listPath, `${lines.join('\n')}\n`)

const ff = args => execFileSync('ffmpeg', args, { stdio: 'inherit' })
const silent = join(dir, 'video-silent.mp4')
ff(['-y', '-f', 'concat', '-safe', '0', '-i', listPath,
  '-vf', 'fps=30,scale=1920:1080:flags=lanczos,unsharp=5:5:0.45:5:5:0.0,format=yuv420p',
  '-t', '40', '-an', '-c:v', 'libx264', '-preset', 'slow', '-crf', '18',
  '-movflags', '+faststart', silent])

const final = join(dir, 'stonk-rider-launch.mp4')
const audioFilter = audioTrim > 0.001
  ? `[1:a]atrim=start=${audioTrim.toFixed(4)},apad,atrim=0:40[a]`
  : '[1:a]apad,atrim=0:40[a]'
ff(['-y', '-i', silent, '-i', join(dir, 'audio.wav'),
  '-filter_complex', audioFilter, '-map', '0:v:0', '-map', '[a]',
  '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000',
  '-shortest', '-t', '40', '-movflags', '+faststart', final])

console.log('wrote', final, 'audio trim', audioTrim.toFixed(3), 'frames', selected.length)



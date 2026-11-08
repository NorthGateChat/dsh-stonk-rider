import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const dir = fileURLToPath(new URL('./', import.meta.url))
const bgm = join(dir, '..', 'src', 'original', 'bgm.mp3')
const sfx = name => join(dir, name)
const ff = args => execFileSync('ffmpeg', args, { stdio: 'inherit' })

if (!existsSync(sfx('whoosh.wav'))) {
  ff(['-y', '-f', 'lavfi', '-i', 'anoisesrc=color=pink:duration=0.75:amplitude=0.55:sample_rate=48000',
    '-af', 'highpass=f=220,lowpass=f=6500,afade=t=in:st=0:d=0.20,afade=t=out:st=0.30:d=0.45,volume=0.55',
    '-ac', '2', '-ar', '48000', sfx('whoosh.wav')])
}
if (!existsSync(sfx('click.wav'))) {
  ff(['-y', '-f', 'lavfi', '-i', 'aevalsrc=0.32*sin(2*PI*1250*t)*exp(-45*t):d=0.07:s=48000',
    '-ac', '2', '-ar', '48000', sfx('click.wav')])
}
if (!existsSync(sfx('coin.wav'))) {
  ff(['-y', '-f', 'lavfi', '-i', 'aevalsrc=0.17*sin(2*PI*1046.5*t)*exp(-8*t)+0.10*sin(2*PI*1568*t)*exp(-10*t)+0.07*sin(2*PI*2093*t)*exp(-14*t):d=0.55:s=48000',
    '-ac', '2', '-ar', '48000', sfx('coin.wav')])
}
if (!existsSync(sfx('riser.wav'))) {
  ff(['-y', '-f', 'lavfi', '-i', 'aevalsrc=0.16*sin(2*PI*(260+900*t)*t)*t/1.1:d=1.1:s=48000',
    '-af', 'afade=t=out:st=0.9:d=0.2', '-ac', '2', '-ar', '48000', sfx('riser.wav')])
}
if (!existsSync(sfx('boom.wav'))) {
  ff(['-y', '-f', 'lavfi', '-i', 'aevalsrc=0.34*sin(2*PI*68*t)*exp(-5.5*t)+0.10*sin(2*PI*130*t)*exp(-8*t):d=0.9:s=48000',
    '-af', 'afade=t=out:st=0.55:d=0.35', '-ac', '2', '-ar', '48000', sfx('boom.wav')])
}

const mix = [
  '[0:a]atrim=0:40,asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.6,afade=t=out:st=38.2:d=1.8,volume=0.92[bgm]',
  '[1:a]asplit=7[w1][w2][w3][w4][w5][w6][w7]',
  '[w1]adelay=2680|2680,volume=0.30[a1]',
  '[w2]adelay=9280|9280,volume=0.24[a2]',
  '[w3]adelay=14980|14980,volume=0.24[a3]',
  '[w4]adelay=20980|20980,volume=0.24[a4]',
  '[w5]adelay=26980|26980,volume=0.24[a5]',
  '[w6]adelay=30480|30480,volume=0.24[a6]',
  '[w7]adelay=36380|36380,volume=0.22[a7]',
  '[2:a]adelay=3800|3800,volume=0.26[a8]',
  '[3:a]asplit=2[c1][c2]',
  '[c1]adelay=22400|22400,volume=0.22[a9]',
  '[c2]adelay=27300|27300,volume=0.18[a10]',
  '[4:a]adelay=25800|25800,volume=0.20[a11]',
  '[5:a]adelay=32300|32300,volume=0.32[a12]',
  '[bgm][a1][a2][a3][a4][a5][a6][a7][a8][a9][a10][a11][a12]amix=inputs=13:duration=longest:normalize=0[mix]',
  '[mix]loudnorm=I=-14:TP=-1.5:LRA=11,aresample=48000[a]',
].join(';')

ff(['-y', '-i', bgm, '-i', sfx('whoosh.wav'), '-i', sfx('click.wav'), '-i', sfx('coin.wav'), '-i', sfx('riser.wav'), '-i', sfx('boom.wav'),
  '-filter_complex', mix, '-map', '[a]', '-t', '40', '-ar', '48000', '-ac', '2', join(dir, 'audio.wav')])
console.log('wrote promo/audio.wav (40s)')


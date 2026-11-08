import { readFile } from 'node:fs/promises'
import vm from 'node:vm'
import { loadOriginalGame } from './original.mjs'

const stocks = JSON.parse(await readFile(new URL('../src/original/stocks.json', import.meta.url), 'utf8'))
const cases = {
  season: { cash: 1850, round: 2, peak: 2100, history: [], buffs: ['coin_x2', 'peak_def'], matchLen: 8, matchDone: false },
  none: null,
  done: { cash: 4200, round: 8, peak: 5100, history: [], buffs: ['coin_x2'], matchLen: 8, matchDone: true },
}
const template = await loadOriginalGame()
const pages = {}
for (const [name, season] of Object.entries(cases)) {
  const storage = season ? { stonk_season: JSON.stringify(season) } : {}
  const config = JSON.stringify({ channel: 'test', parentOrigin: 'null', storage, stocks }).replaceAll('<', '\\u003c')
  const bootstrap = `<script>
    const dshConfig = ${config};
    let dshPaused = false;
    const dshPost = () => {};
    const dshValues = new Map(Object.entries(dshConfig.storage));
    const dshStorage = {
      getItem: key => dshValues.get(key) ?? null,
      setItem(key, value) { dshValues.set(key, String(value)); },
      removeItem(key) { dshValues.delete(key); },
    };
  </script>`
  pages[name] = template.replace('<!--DSH_STONK_BOOTSTRAP-->', () => bootstrap)
}

let failures = 0
const check = (label, ok, detail = '') => {
  if (!ok) failures++
  console.log(`${ok ? 'PASS' : 'FAIL'} ${label}${ok ? '' : ` — ${detail}`}`)
}

const html = pages.season
check('home season card markup', html.includes('<div id="dshHomeSeason" class="hide"></div>'))
check('home season card css', html.includes('#dshHomeSeason .dshHsSeg.done') && html.includes('#dshHomeSeason .dshHsSeg.now'))
check('intermission next-round hint markup', html.includes('<p id="dshImNext" class="dshImNext"></p>'))
check('goHome refresh', html.includes("renderPicker();\n  dshHomeSummary();\n  document.getElementById('startOv').classList.remove('hide');"))
check('next round continues from intermission', html.includes('drawCard(null, Math.min(ctx.nextRound, ctx.matchLen));'))
check('drawCard accepts the round label', html.includes('function drawCard(targetKey, round){'))
check('intermission copy explains the hand-off', html.includes('选卡或跳过后，直接进入第 '))

// Every inline script must still parse; this catches syntax damage from the injection.
const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1])
scripts.forEach((script, index) => {
  try { new Function(script); check(`script #${index} parses`, true) }
  catch (error) { check(`script #${index} parses`, false, String(error)) }
})

const start = html.indexOf('function dshHomeSummary(){')
const end = html.indexOf('\n}\n;(() => {', start)
check('dshHomeSummary extracted', start >= 0 && end > start)
const summary = html.slice(start, end + 2)

function render(season) {
  const pill = {
    className: 'hide', innerHTML: '', textContent: '', attributes: {},
    setAttribute(name, value) { this.attributes[name] = value },
  }
  const home = { classes: new Set(), classList: { add: name => home.classes.add(name), remove: name => home.classes.delete(name) } }
  const sub = { textContent: '' }
  const document = {
    getElementById: id => id === 'dshHomeSeason' ? pill : id === 'startOv' ? home : null,
    querySelector: () => sub,
  }
  const context = vm.createContext({ document, getSeason: () => season, CONFIG: { MATCH_LEN: 8, START_CASH: 1000 } })
  vm.runInContext(`${summary}\ndshHomeSummary();`, context)
  return { pill, home, sub }
}

const count = (text, needle) => text.split(needle).length - 1

const active = render(cases.season)
check('active season card', active.pill.className === 'show'
  && active.pill.innerHTML.includes('dshHsTag">赛程进行中')
  && active.pill.innerHTML.includes('dshHsRound">第 3/8 回合')
  && active.pill.innerHTML.includes('本金 <b>$1,850</b>')
  && active.pill.innerHTML.includes('峰值 $2,100')
  && active.pill.innerHTML.includes('2 张卡'), active.pill.innerHTML)
check('active progress segments', count(active.pill.innerHTML, 'dshHsSeg done') === 2
  && count(active.pill.innerHTML, 'dshHsSeg now') === 1, active.pill.innerHTML)
check('active CTA', active.sub.textContent === '继续第 3 回合 · 随机抽一只股', active.sub.textContent)
check('active spacing class', active.home.classes.has('has-season'))

const fresh = render(null)
check('fresh season card explains the format', fresh.pill.className === 'show'
  && fresh.pill.innerHTML.includes('8 回合赛程')
  && fresh.pill.innerHTML.includes('第 1/8 回合')
  && fresh.pill.innerHTML.includes('起始本金 <b>$1,000</b>')
  && fresh.pill.innerHTML.includes('滚入下一回合'), fresh.pill.innerHTML)
check('fresh progress starts at round one', count(fresh.pill.innerHTML, 'dshHsSeg now') === 1
  && count(fresh.pill.innerHTML, 'dshHsSeg done') === 0, fresh.pill.innerHTML)
check('fresh CTA states the format', fresh.sub.textContent === '开始 8 回合赛程 · 随机抽一只股', fresh.sub.textContent)

const done = render(cases.done)
check('done season card', done.pill.className === 'show done'
  && done.pill.innerHTML.includes('赛程达成')
  && done.pill.innerHTML.includes('8/8 回合')
  && done.pill.innerHTML.includes('$5,100'), done.pill.innerHTML)
check('done progress segments', count(done.pill.innerHTML, 'dshHsSeg done') === 8
  && count(done.pill.innerHTML, 'dshHsSeg now') === 0, done.pill.innerHTML)
check('done CTA', done.sub.textContent === '赛程已达 · 再跑一局', done.sub.textContent)

console.log(failures ? `\n${failures} failure(s)` : '\nall checks passed')
process.exitCode = failures ? 1 : 0

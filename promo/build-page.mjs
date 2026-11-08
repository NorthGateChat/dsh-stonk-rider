import { readFile, writeFile } from 'node:fs/promises'
import { loadOriginalGame } from '../scripts/original.mjs'

const dir = new URL('./', import.meta.url)
const [template, stockData, icon] = await Promise.all([
  readFile(new URL('page.template.html', dir), 'utf8'),
  readFile(new URL('../src/original/stocks.json', dir), 'utf8'),
  readFile(new URL('../src/original/icon.webp', dir), 'base64'),
])

const stocks = JSON.parse(stockData)
const season = {
  cash: 1850, round: 2, peak: 2100, history: [], buffs: ['coin_x2', 'peak_def'], matchLen: 8, matchDone: false, version: 2,
}
const storage = { stonk_season: JSON.stringify(season), stonk_bgm: '0', sr_guide_seen: '1' }
const config = JSON.stringify({ channel: 'promo', parentOrigin: '*', storage, stocks }).replaceAll('<', '\\u003c')
const bootstrap = `<script>
  const dshConfig = ${config};
  let dshPaused = false;
  let dshActiveKey;
  const dshPost = () => {};
  const dshValues = new Map(Object.entries(dshConfig.storage));
  const dshStorage = {
    getItem: key => dshValues.get(key) ?? null,
    setItem(key, value) { dshValues.set(key, String(value)); },
    removeItem(key) { dshValues.delete(key); },
  };
</script>`

const promoBridge = `<style>
  #ctrl, #rotate, #hint, #bgmBtn, #homeBtn, #helpBtn { display:none !important; }
  body { background:#101216; }
</style>
<script>
  addEventListener('message', event => {
    if (event.source !== parent) return;
    const data = event.data || {};
    try {
      if (data.promo === 'click') { const node = document.getElementById(data.id); if (node) node.click(); }
      else if (data.promo === 'key') {
        window.dispatchEvent(new KeyboardEvent(data.type || 'keydown', {
          key: data.key, code: data.code || '', bubbles: true, cancelable: true,
        }));
      } else if (data.promo === 'pause') {
        dshSetPaused(!!data.paused);
      } else if (data.promo === 'intermission') {
        openIntermission({ round: data.round || 3, matchLen: 8 });
      } else if (data.promo === 'hide-intermission') {
        document.getElementById('intermissionOv').classList.remove('show');
      } else if (data.promo === 'end-win') {
        endGame(true);
      } else if (data.promo === 'skip-intermission') {
        document.getElementById('imSkipBtn').click();
      } else if (data.promo === 'open-trade-review') {
        const review = document.getElementById('dshTradeReview');
        if (review) { review.hidden = false; review.open = true; }
      } else if (data.promo === 'start-next') {
        document.getElementById('startOv').classList.add('hide');
        startGame();
      } else if (data.promo === 'mid-bust') {
        if (state !== 'play') {
          document.getElementById('startOv').classList.add('hide');
          startGame();
        }
        const season = getSeason();
        const startCash = typeof runStartCash === 'number'
          ? runStartCash
          : (season ? season.cash : Math.floor(score));
        if (!position) openPosition(-1);
        if (position) {
          position.dir = -1;
          position.stake = Math.round(Math.max(position.stake, score * 1.2));
          position.entryPrice = priceAt(bike.x).price * 0.5;
        }
        setTimeout(() => {
          const loss = document.getElementById('endLoss');
          if (loss) loss.textContent = '$' + startCash.toLocaleString() + ' 本金 → $0　血本无归';
          const sub = document.getElementById('endSub');
          if (sub) sub.textContent = sub.textContent.replace(/ · 栽在.*$/, '');
        }, 1700);
      } else if (data.promo === 'bust') {
        document.getElementById('intermissionOv').classList.remove('show');
        document.getElementById('startOv').classList.add('hide');
        document.getElementById('cardOv').classList.add('hide');
        const season = getSeason();
        const startCash = season ? season.cash : 1850;
        bankrupt = true;
        score = 0;
        endGame(false);
        setTimeout(() => {
          const loss = document.getElementById('endLoss');
          if (loss) loss.textContent = '$' + startCash.toLocaleString() + ' 本金 → $0　血本无归';
        }, 900);
      } else if (data.promo === 'home') {
        goHome();
      } else if (data.promo === 'snapshot') {
        parent.postMessage({ promo: 'game-state', state: {
          state, cash: Math.floor(score), bankrupt: !!bankrupt,
          hasPosition: !!position, won: !!(lastRun && lastRun.win),
        } }, '*');
      }
    } catch (error) {
      parent.postMessage({ promo: 'promo-error', message: String(error) }, '*');
    }
  });
  parent.postMessage({ promo: 'game-ready' }, '*');
</script>`

let game = await loadOriginalGame()
game = game.replace('<!--DSH_STONK_BOOTSTRAP-->', () => bootstrap)
game = game.replace('</body>', () => `${promoBridge}\n</body>`)
const gameJson = JSON.stringify(game).replaceAll('<', '\\u003c')
const gameScript = `<script>window.PROMO_GAME = ${gameJson};</script>`

let host = template.replace('{{ICON}}', `data:image/webp;base64,${icon}`)
host = host.replace('<!--PROMO_GAME-->', () => gameScript)
await writeFile(new URL('host.html', dir), host)
console.log('wrote host.html', host.length, 'game iframe', game.length)

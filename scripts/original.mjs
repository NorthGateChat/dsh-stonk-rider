import { readFile } from 'node:fs/promises'

const dir = new URL('../src/original/', import.meta.url)

export async function loadOriginalGame() {
  const [source, icon, bgm, bridge, review, reviewStyle] = await Promise.all([
    readFile(new URL('index.html', dir), 'utf8'),
    readFile(new URL('icon.png', dir), 'base64'),
    readFile(new URL('bgm.mp3', dir), 'base64'),
    readFile(new URL('bridge.js', dir), 'utf8'),
    readFile(new URL('review.js', dir), 'utf8'),
    readFile(new URL('review.css', dir), 'utf8'),
  ])
  let document = source.replaceAll('\r\n', '\n')
  function replace(before, after) {
    if (!document.includes(before)) throw new Error(`Stonk Rider source changed at: ${before.slice(0, 90)}`)
    document = document.replace(before, () => after)
  }

  replace('<head>', `<head>
<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data:; media-src data:; connect-src 'none'; form-action 'none'; base-uri 'none'">
<!--DSH_STONK_BOOTSTRAP-->
<style>${reviewStyle}</style>
<style>
/* Key hints live in pseudo-elements so the in-game PnL rewrites of #closeBtn
   never wipe them; the space label follows the platform via a custom property.
   Arrow keys get WASD fallbacks so a keyboard without arrow keys (Mac) still
   plays: W 做多, S 做空, D 秀一下, Space / X 平仓. */
#longBtn, #shortBtn, #gas, #closeBtn { position:relative; }
#longBtn::after, #shortBtn::after, #gas::after, #closeBtn::after {
  position:absolute; left:50%; bottom:4px; transform:translateX(-50%);
  font:600 9px/1 ui-monospace,Menlo,monospace; letter-spacing:.4px; opacity:.72;
  white-space:nowrap; pointer-events:none; }
#longBtn::after { content:'↑ W'; }
#shortBtn::after { content:'↓ S'; }
#gas::after { content:'→ D'; }
#closeBtn::after { content:var(--dsh-space-label,'空格') ' X'; }
</style>`)
  replace('<script src="https://s1.hdslb.com/bfs/seed/toy/app/sdk/toy-sdk.js" defer></script>', '')
  replace('src="icon.png"', `src="data:image/png;base64,${icon}"`)
  replace("bgmEl.src='bgm.mp3'; bgmEl.loop=true; bgmEl.preload='auto'; bgmEl.crossOrigin='anonymous';",
    `bgmEl.src='data:audio/mpeg;base64,${bgm}'; bgmEl.loop=true; bgmEl.preload='auto';`)
  document = document.replaceAll('localStorage', 'dshStorage')
  replace('function resize(){', 'function resize(){\n  if (!C.clientWidth || !C.clientHeight) return;')
  replace("unit:(d.cls==='港互'?'HK$':(d.sym||'').match(/^(SH|SZ)/)?'¥':'$'),",
    "unit:(d.cls==='港互'?'HK$':d.cls==='A股'||/^(SH|SZ)/.test(d.sym||'')?'¥':'$'),")
  replace('function step(){', 'function step(){\n  if(dshPaused) return;')
  replace('function startBGM(){', 'function startBGM(){\n  if(dshPaused) return;')
  replace("addEventListener('keydown',e=>{", "addEventListener('keydown',e=>{\n  if(dshPaused) return;")
  replace('function startGame(){', 'function startGame(){\n  dshActiveKey = trackKey;')
  replace('function reset(){', 'function reset(){\n  dshResetReview();')
  replace("closePosition(false, true, 'flip'); openPosition(dir);", `const reversedFrom = dshActiveTrade?.id;
  closePosition(false, true, 'flip'); openPosition(dir, reversedFrom);`)
  replace('function openPosition(dir){', 'function openPosition(dir, reversedFrom){')
  const open = 'position={ dir, entryPrice:pr.price, entryT:performance.now(), steps:1, stake:step };'
  replace(open, `${open}\n  dshOpenTrade(pr, position, reversedFrom);`)
  const add = 'position.steps++; position.stake+=step;'
  replace(add, `${add}\n  dshAddStake(step);`)
  replace('pnl=Math.round(pnl);', 'pnl=Math.round(pnl);\n  const dshSettlement = { base: pnl, adjustments: [] };')
  const settlementSteps = [
    ['// ===== Buff 效果:pnl 修正 =====', '资金耗尽结算'],
    ['// 精准平仓:主动平仓', '短线鬼才'],
    ['// 逆势王:反手平仓', '精准平仓'],
    ['// 涨停敏感:单笔', '逆势王'],
    ['// 止损保险:每局第一次亏损', '涨停敏感'],
    ['// 保本单:每局 1 次', '止损保险'],
    ['pnlScore+=pnl; score+=pnl;', '保本单'],
  ]
  for (const [anchor, label] of settlementSteps) {
    replace(anchor, `dshPnlStep(dshSettlement, '${label}', pnl);\n  ${anchor}`)
  }
  replace('pnlScore+=pnl; score+=pnl;', 'dshCloseTrade(pr, held, pnl, reason, dshSettlement);\n  pnlScore+=pnl; score+=pnl;')
  replace('n.snapshotted = true;', 'n.snapshotted = true;\n      dshCaptureMoment(n);')
  replace('n.evtPct = (px - startPrice) / startPrice * 100;', 'n.evtPct = (px.price - startPrice) / startPrice * 100;')
  replace('judge, judgeCls, icon });', 'judge, judgeCls, icon, dshReviewId: n.dshReviewId });')
  replace('<div class="imEvPct ${pctCls}">${pctStr}</div>', '<div class="imEvPct ${pctCls}">${pctStr}<small class="dsh-event-baseline">较起点</small></div>')
  replace('evBox.appendChild(row);', `if (e.dshReviewId) row.append(dshAskButton('moment', e.dshReviewId, '问 DSH：' + (e.date || '') + ' ' + (e.label || '赛道关键时刻')));
      evBox.appendChild(row);`)
  replace("document.getElementById('intermissionOv').classList.add('show');", `dshRenderTradeReview();
  document.getElementById('intermissionOv').classList.add('show');`)
  replace('<div class="imRound" id="imRound">回合 —/—</div>', `<div class="imRound" id="imRound">回合 —/—</div>
      <button type="button" id="dshGoCards" class="dsh-review-button">去选卡</button>`)
  replace('card.onclick = ()=>{ pickIntermissionCard(idx); };', `card.onclick = ()=>{ pickIntermissionCard(idx); };
    card.setAttribute('role', 'button');
    card.tabIndex = 0;
    card.onkeydown = event => {
      if (event.key !== 'Enter' && event.key !== ' ') return;
      event.preventDefault(); event.stopPropagation();
      card.click();
    };`)
  replace(`    <div class="imSection">
      <div class="imSecLabel">升级 Build · 三选一</div>`, `    <details id="dshTradeReview" hidden>
      <summary>本回合交易 <span id="dshTradeCount"></span></summary>
      <div id="dshTradeRows"></div>
    </details>
    <p id="dshReviewStatus" role="status"></p>
    <div class="imSection">
      <div class="imSecLabel">升级 Build · 三选一</div>`)
  replace("document.addEventListener('touchmove',e=>{ e.preventDefault(); },{passive:false});",
    "document.addEventListener('touchmove',e=>{ if (!e.target.closest?.('#intermissionOv.show')) e.preventDefault(); },{passive:false});")
  // Arrow keys are unavailable on some Mac keyboards; WASD mirrors them.
  replace("  if(e.key==='ArrowRight')gasOn=true;   // → 专职跳跃/秀一下\n  if(e.key==='ArrowUp'){ e.preventDefault(); if(!e.repeat) pressDir(1); }\n  if(e.key==='ArrowDown'){ e.preventDefault(); if(!e.repeat) pressDir(-1); }",
    "  if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')gasOn=true;   // → / D 专职跳跃/秀一下\n  if(e.key==='ArrowUp'||e.key==='w'||e.key==='W'){ e.preventDefault(); if(!e.repeat) pressDir(1); }\n  if(e.key==='ArrowDown'||e.key==='s'||e.key==='S'){ e.preventDefault(); if(!e.repeat) pressDir(-1); }")
  replace("addEventListener('keyup',e=>{ if(e.key==='ArrowRight')gasOn=false; });",
    "addEventListener('keyup',e=>{ if(e.key==='ArrowRight'||e.key==='d'||e.key==='D')gasOn=false; });")
  // The two drive buttons print their keyboard hint through CSS pseudo-elements, so
  // the game's own PnL rewrites of #closeBtn keep the hint. The Space label is
  // localized per platform in the bootstrap below (Mac keyboards say "Space").
  replace('<div class="gkRow"><span class="kbd">↑</span><span>做多 / 看涨（再按<b>加仓</b>）</span></div>',
    '<div class="gkRow"><span class="kbd">↑</span><span class="kbd">W</span><span>做多 / 看涨（再按<b>加仓</b>）</span></div>')
  replace('<div class="gkRow"><span class="kbd">↓</span><span>做空 / 看跌（再按<b>加仓</b>）</span></div>',
    '<div class="gkRow"><span class="kbd">↓</span><span class="kbd">S</span><span>做空 / 看跌（再按<b>加仓</b>）</span></div>')
  replace('<div class="gkRow"><span class="kbd">空格</span><span><b>平仓</b> / 落袋（主操作）</span></div>',
    '<div class="gkRow"><span class="kbd" data-dsh-key="close">空格</span><span><b>平仓</b> / 落袋（主操作；<b>←</b> / <b>X</b> 亦可）</span></div>')
  replace('<div class="gkRow"><span class="kbd">→</span><span>秀一下 / 跳跃捡钱</span></div>',
    '<div class="gkRow"><span class="kbd">→</span><span class="kbd">D</span><span><b>秀一下</b> / 跳跃捡钱（空中按住翻跟头；Mac 无方向键用 <b>W/S/D</b>）</span></div>')
  const loading = document.indexOf('// ===== 载入真实行情（stocks.json）=====')
  if (loading < 0) throw new Error('Stonk Rider data initialization not found')
  // The Bilibili SDK follows the network loader. Both are replaced by bundled data and a local bridge.
  return document.slice(0, loading) + `STOCKDATA = dshConfig.stocks;
buildTracks();
trackKey = randomKey();
resize();
${review}
${bridge}
;(() => {
  // Mac keyboards label the space bar "Space"; keep the hints consistent with the platform.
  const mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
  const space = mac ? 'Space' : '空格';
  if (mac) document.documentElement.style.setProperty('--dsh-space-label', '"' + space + '"');
  for (const node of document.querySelectorAll('[data-dsh-key="close"]')) node.textContent = space;
})();
</script>
</body>
</html>`
}

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
/* DSH: the 8-round season is the real run structure, but the home page used to
   read as a one-off arcade start. Give it a visible season card: tag, round,
   eight-segment progress, and the money that actually rolls between rounds. */
#dshHomeSeason {
  display:none; box-sizing:border-box; width:min(320px, calc(100% - 12px));
  margin:4px auto 0; padding:9px 13px 10px; text-align:left;
  background:rgba(24,27,34,.72); border:1px solid rgba(61,220,151,.28);
  border-radius:14px; color:var(--txt2); font-size:11.5px; letter-spacing:1.2px;
  font-weight:500; font-variant-numeric:tabular-nums;
}
#dshHomeSeason.show { display:block; }
#dshHomeSeason .dshHsTop { display:flex; align-items:baseline; justify-content:space-between; gap:8px; }
#dshHomeSeason .dshHsTag { color:#3ddc97; font-weight:700; letter-spacing:2px; }
#dshHomeSeason.done .dshHsTag { color:#ffcf3a; }
#dshHomeSeason .dshHsRound { color:var(--txt2); font-size:11px; letter-spacing:1.5px; }
#dshHomeSeason .dshHsDots { display:flex; gap:4px; margin:7px 0 8px; }
#dshHomeSeason .dshHsSeg { flex:1; height:5px; border-radius:3px; background:rgba(255,255,255,.09); }
#dshHomeSeason .dshHsSeg.done { background:#3ddc97; }
#dshHomeSeason .dshHsSeg.now { background:rgba(61,220,151,.42); box-shadow:inset 0 0 0 1px rgba(61,220,151,.45); }
#dshHomeSeason .dshHsRow { font-size:11.5px; color:var(--txt2); line-height:1.55; letter-spacing:1px; }
#dshHomeSeason .dshHsRow b { color:var(--txt); font-weight:700; }
/* Round hand-off copy in the intermission footer. */
.imFoot { flex-direction:column; align-items:center; }
.dshImNext { margin:0 0 8px; color:var(--txt3); font-size:11px; letter-spacing:1.2px; text-align:center; }
#startOv.has-season > p:last-of-type { margin-bottom:10px; }
#startOv.has-season #startBtn { margin-top:14px; }
@media (max-height:520px){
  #startOv #gameIcon { width:84px; height:84px; margin-bottom:8px; }
  #startOv h1 { font-size:26px; margin-bottom:5px; }
  #startOv > p { font-size:11.5px; line-height:1.45; }
  #startOv > p:last-of-type { margin-bottom:6px; }
  #startOv.has-season > p:last-of-type { margin-bottom:6px; }
  #dshHomeSeason { padding:7px 10px 8px; }
  #dshHomeSeason .dshHsDots { margin:5px 0 6px; }
  #startOv.has-season #startBtn { margin-top:10px; padding:11px 32px; font-size:15px; }
  #startOv .lib-btn { margin-top:12px; }
}
@media (max-height:360px){
  #startOv #gameIcon { width:64px; height:64px; margin-bottom:6px; }
  #startOv h1 { font-size:22px; }
  #startOv > p:last-of-type { display:none; }
  #dshHomeSeason { padding:6px 9px 7px; }
  #startOv.has-season #startBtn { margin-top:8px; }
}
</style>`)
  replace('<script src="https://s1.hdslb.com/bfs/seed/toy/app/sdk/toy-sdk.js" defer></script>', '')
  replace('src="icon.png"', `src="data:image/png;base64,${icon}"`)
  replace('    <button class="start-btn" id="startBtn">出发', `    <div id="dshHomeSeason" class="hide"></div>
    <button class="start-btn" id="startBtn">出发`)
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
  // The intermission footer never said what happened after a card pick, and the
  // original then bounced to the home screen. Keep the season contiguous and say so.
  replace(`    <div class="imFoot">
      <button id="imSkipBtn" class="imSkipBtn" type="button">跳过 · 保留原 Build</button>`,
    `    <div class="imFoot">
      <p id="dshImNext" class="dshImNext"></p>
      <button id="imSkipBtn" class="imSkipBtn" type="button">跳过 · 保留原 Build</button>`)
  replace("  document.getElementById('imRound').textContent = `回合 ${seasonInfo.round}/${ctx.matchLen}`;",
    "  document.getElementById('imRound').textContent = `回合 ${seasonInfo.round}/${ctx.matchLen}`;\n  const dshImNext = document.getElementById('dshImNext');\n  if(dshImNext) dshImNext.textContent = '选卡或跳过后，直接进入第 ' + ctx.nextRound + '/' + ctx.matchLen + ' 回合';")
  replace(`  // 进入下一回合:直接调用 startGame(不 goHome,不出结算面板)
  // 保留 trackKey 不变,让玩家在同一支股票继续冲下一段? 还是换一支? —— 沿用旧路径:换一支股票(在 startOv 里选)
  // 沿用旧行为:回选股页,玩家自己选下一场 —— 保持策略选择空间
  goHome();`,
    `  // DSH: falling back to the home screen here read as "the run restarted".
  // The season is contiguous, so let the draw ritual introduce the next round.
  drawCard(null, Math.min(ctx.nextRound, ctx.matchLen));`)
  replace('function drawCard(targetKey){', 'function drawCard(targetKey, round){')
  replace("  hint.textContent='正在接入行情…';",
    "  hint.textContent=(round?'第 '+round+'/'+CONFIG.MATCH_LEN+' 回合 · ':'')+'正在接入行情…';")
  replace("      hint.textContent='就它了，出发！';",
    "      hint.textContent=(round?'第 '+round+'/'+CONFIG.MATCH_LEN+' 回合 · ':'')+'就它了，出发！';")
  // The rolling season bankroll only lived in the riding HUD and the end panel;
  // returning home lost sight of the current round, cash, peak and build size.
  replace("  renderPicker();\n  document.getElementById('startOv').classList.remove('hide');",
    "  renderPicker();\n  dshHomeSummary();\n  document.getElementById('startOv').classList.remove('hide');")
  const loading = document.indexOf('// ===== 载入真实行情（stocks.json）=====')
  if (loading < 0) throw new Error('Stonk Rider data initialization not found')
  // The Bilibili SDK follows the network loader. Both are replaced by bundled data and a local bridge.
  return document.slice(0, loading) + `STOCKDATA = dshConfig.stocks;
buildTracks();
trackKey = randomKey();
resize();
${review}
${bridge}
// The home page used to read as a one-off arcade start. Render the season card so
// the 8-round structure, the rolling bankroll and the carried build are visible
// before the next draw — and still visible after a reload or an abandoned round.
function dshHomeSummary(){
  const el = document.getElementById('dshHomeSeason');
  const home = document.getElementById('startOv');
  const sub = document.querySelector('#startBtn > span');
  if(!el) return;
  const s = getSeason();
  const len = (s && s.matchLen) || CONFIG.MATCH_LEN;
  const money = n => '$' + Math.floor(n).toLocaleString();
  let tag, roundText, done, row, subtitle, doneSeason = false;
  if(!s){
    tag = '8 回合赛程';
    roundText = '第 1/' + len + ' 回合';
    done = 0;
    row = '起始本金 <b>' + money(CONFIG.START_CASH) + '</b> · 冲线后本金和卡组滚入下一回合';
    subtitle = '开始 8 回合赛程 · 随机抽一只股';
  } else {
    const cash = Math.max(0, Math.floor(s.cash));
    const peak = Math.floor(s.peak || cash);
    const buffs = (s.buffs || []).length;
    if(s.matchDone){
      tag = '赛程达成'; roundText = len + '/' + len + ' 回合'; done = len; doneSeason = true;
      row = '本金 <b>' + money(cash) + '</b> · 峰值 <b>' + money(peak) + '</b>';
      subtitle = '赛程已达 · 再跑一局';
    } else {
      const round = Math.min(s.round + 1, len);
      tag = '赛程进行中'; roundText = '第 ' + round + '/' + len + ' 回合'; done = s.round;
      row = '本金 <b>' + money(cash) + '</b> · 峰值 ' + money(peak) + (buffs ? ' · ' + buffs + ' 张卡' : '');
      subtitle = '继续第 ' + round + ' 回合 · 随机抽一只股';
    }
  }
  const segments = [];
  for(let i = 0; i < len; i++){
    const cls = i < done ? ' done' : (i === done && !doneSeason ? ' now' : '');
    segments.push('<span class="dshHsSeg' + cls + '"></span>');
  }
  el.innerHTML = '<div class="dshHsTop"><span class="dshHsTag">' + tag + '</span><span class="dshHsRound">' + roundText + '</span></div>'
    + '<div class="dshHsDots" aria-hidden="true">' + segments.join('') + '</div>'
    + '<div class="dshHsRow">' + row + '</div>';
  el.className = 'show' + (doneSeason ? ' done' : '');
  el.setAttribute('aria-label', tag + ' ' + roundText);
  if(home) home.classList.add('has-season');
  if(sub) sub.textContent = subtitle;
}
;(() => {
  // Mac keyboards label the space bar "Space"; keep the hints consistent with the platform.
  const mac = /Mac|iPhone|iPad|iPod/.test(navigator.platform || navigator.userAgent || '');
  const space = mac ? 'Space' : '空格';
  if (mac) document.documentElement.style.setProperty('--dsh-space-label', '"' + space + '"');
  for (const node of document.querySelectorAll('[data-dsh-key="close"]')) node.textContent = space;
})();
dshHomeSummary();
</script>
</body>
</html>`
}

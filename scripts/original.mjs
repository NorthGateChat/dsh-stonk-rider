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
/* PC adaptation wrappers dissolve into the original phone column on narrow screens. */
.dshHome, .dshHomeMain, .dshHomeMenu, .dshEndCard, .dshEndMain, .dshEndSide { display:contents; }
.dshHomeKeys { display:none; }
#startOv.has-season .dshHomeMain > p:last-of-type { margin-bottom:10px; }
#startOv.has-season #startBtn { margin-top:14px; }
@media (max-height:520px){
  #startOv #gameIcon { width:84px; height:84px; margin-bottom:8px; }
  #startOv h1 { font-size:26px; margin-bottom:5px; }
  #startOv .dshHomeMain > p { font-size:11.5px; line-height:1.45; }
  #startOv .dshHomeMain > p:last-of-type { margin-bottom:6px; }
  #dshHomeSeason { padding:7px 10px 8px; }
  #dshHomeSeason .dshHsDots { margin:5px 0 6px; }
  #startOv.has-season #startBtn { margin-top:10px; padding:11px 32px; font-size:15px; }
  #startOv .lib-btn { margin-top:12px; }
}
@media (max-height:360px){
  #startOv #gameIcon { width:64px; height:64px; margin-bottom:6px; }
  #startOv h1 { font-size:22px; }
  #startOv .dshHomeMain > p:last-of-type { display:none; }
  #dshHomeSeason { padding:6px 9px 7px; }
  #startOv.has-season #startBtn { margin-top:8px; }
}
/* PC layout: the game now lives in a wide DSH panel, not a phone. The start menu
   becomes a two-column hero, the settlement a dialog over the track, and the
   intermission/recap use the desktop width instead of a phone column. */
@media (min-width:720px) and (min-height:380px){
  #startOv { padding:26px 34px; }
  #startOv .dshHome { display:flex; align-items:center; justify-content:center; gap:clamp(30px,6vw,84px); width:min(900px,96%); text-align:left; }
  #startOv .dshHomeMain { display:flex; flex-direction:column; align-items:flex-start; flex:0 1 470px; min-width:0; }
  #startOv .dshHomeMenu { display:flex; flex-direction:column; align-items:stretch; flex:0 1 350px; min-width:0; }
  #startOv #gameIcon { width:104px; height:104px; margin-bottom:16px; }
  #startOv h1 { font-size:46px; margin-bottom:5px; letter-spacing:-.02em; }
  #startOv .dshHomeMain > p:last-of-type { font-size:14px; line-height:1.8; max-width:440px; margin-bottom:0; }
  #dshHomeSeason { width:100%; margin:0 0 16px; padding:11px 14px 12px; font-size:12.5px; }
  #dshHomeSeason .dshHsRow { font-size:12.5px; }
  #dshHomeSeason .dshHsDots { margin:8px 0 9px; }
  #dshHomeSeason .dshHsSeg { height:6px; }
  #startOv .dshHomeMenu #startBtn { width:100%; min-width:0; margin-top:0; padding:16px 28px; font-size:17px; }
  #startOv .dshHomeMenu .lib-btn { display:block; width:100%; margin-top:10px; }
  #startOv .dshHomeMenu #lbBtn { margin-top:10px; }
  #startOv .dshHomeKeys { display:block; margin-top:14px; color:var(--txt3); font-size:11.5px; line-height:1.7; letter-spacing:.4px; }
  #endOv { padding:24px; background:rgba(8,10,14,.58); }
  #endOv.lost { background:radial-gradient(120% 80% at 50% 0%, rgba(224,109,109,.14) 0%, rgba(8,10,14,.62) 62%); }
  #endOv .dshEndCard {
    display:grid; grid-template-columns:minmax(0,1.15fr) minmax(0,.85fr); gap:2px 38px;
    width:min(820px, calc(100% - 40px)); max-height:calc(100% - 40px); overflow:auto;
    padding:28px 34px; background:var(--bg2); border:1px solid var(--line2);
    border-radius:18px; box-shadow:0 30px 70px rgba(0,0,0,.55); text-align:left;
  }
  #endOv .dshEndMain { display:flex; flex-direction:column; align-items:flex-start; }
  #endOv .dshEndSide { display:flex; flex-direction:column; justify-content:center; gap:8px; padding-left:34px; border-left:1px solid var(--line); }
  #endOv #endTitle { font-size:28px; margin:0 0 4px; text-align:left; }
  #endOv .stars { font-size:24px; letter-spacing:6px; margin:0 0 6px; }
  #endOv #endSub { font-size:12px; line-height:1.6; max-width:none; margin:0 0 6px; text-align:left; }
  #endOv #endScore { font-size:54px; margin:4px 0 2px; }
  #endOv #endLoss { font-size:12px; margin-top:0; }
  #endOv .sub2 { font-size:11px; }
  #endOv .best { font-size:12px; margin-top:4px; }
  #endOv .unlock { font-size:12px; padding:6px 12px; margin-top:8px; }
  #endOv #endSeason { margin:0 0 6px; max-width:100%; font-size:10.5px; line-height:1.6; letter-spacing:1px; }
  #endOv .endActions { width:100%; margin:0; }
  #endOv .endBtns { flex-direction:column; gap:8px; margin-top:10px; }
  #endOv .endBtns .start-btn { width:100%; padding:12px 10px; font-size:14px; white-space:nowrap; }
  #endOv .endActions .textBtn { font-size:11px; }
  /* Round intermission: score + moments on the left, build choice on the right. */
  #intermissionOv { padding:22px; }
  #intermissionOv .imBox {
    display:grid; grid-template-columns:minmax(0,.92fr) minmax(0,1.08fr);
    grid-template-areas:"head head" "score build" "events build" "extra foot";
    gap:10px 24px; width:min(1000px, calc(100% - 44px)); max-height:calc(100% - 40px);
    overflow:auto; padding:16px 22px;
  }
  #intermissionOv .imHead { grid-area:head; padding-bottom:8px; }
  #intermissionOv .imSection.imScore { grid-area:score; }
  #intermissionOv .imSection.imEventsBlock { grid-area:events; }
  #intermissionOv .imSection.imBuild { grid-area:build; align-self:stretch; }
  #intermissionOv #dshTradeReview { grid-area:extra; align-self:start; }
  #intermissionOv #dshReviewStatus { grid-column:1 / -1; }
  #intermissionOv #dshReviewStatus:empty { display:none; }
  #intermissionOv .imFoot { grid-area:foot; flex-direction:row; justify-content:flex-end; align-items:center; gap:12px; margin:0; }
  #intermissionOv .imFoot .dshImNext { margin:0; font-size:10.5px; }
  #intermissionOv .imSkipBtn { white-space:nowrap; padding:7px 16px; letter-spacing:2px; }
  #intermissionOv .imScorecard { padding:10px 12px; }
  #intermissionOv .imEvents { padding:8px 11px; }
  #intermissionOv .imEvent { padding:6px 3px; }
  #intermissionOv .imCards { flex-wrap:nowrap; gap:10px; }
  #intermissionOv .imCards .buffCard { width:auto; flex:1 1 0; min-width:0; min-height:140px; padding:11px 10px 10px; }
  #intermissionOv .imCards .buffCard .bcName { font-size:14px; }
  #intermissionOv .imCards .buffCard .bcDesc { font-size:11px; }
  /* Full-season recap: widen to the desktop grid and show all eight rounds in one row. */
  #matchRecapOv.overlay { padding:26px 30px; gap:12px; }
  #matchRecapOv #mrHeader, #matchRecapOv #mrStats, #matchRecapOv #mrRoundsWrap, #matchRecapOv #mrBuildWrap { width:min(820px, 96%); max-width:none; }
  #matchRecapOv #mrStats { gap:12px; }
  #matchRecapOv #mrRounds { grid-template-columns:repeat(8, 1fr); }
  #matchRecapOv #mrGrade { padding:10px 22px; }
  #matchRecapOv #mrGradeLetter { font-size:54px; }
  #matchRecapOv .endActions { width:min(820px, 96%); }
  #matchRecapOv .endBtns { justify-content:center; gap:12px; }
  #matchRecapOv .endBtns .start-btn { flex:0 0 auto; padding:12px 36px; }
}
@media (min-width:720px) and (min-height:380px) and (max-height:500px){
  #matchRecapOv.overlay { padding:14px 20px 12px; gap:8px; }
  #matchRecapOv #mrGrade { padding:8px 16px; }
  #matchRecapOv #mrGradeLetter { font-size:44px; }
  #matchRecapOv #mrStats { gap:8px; }
  #matchRecapOv .mrStat { padding:7px 6px; }
  #matchRecapOv #mrRounds { gap:5px; }
  #matchRecapOv .mrRound { padding:6px 3px; }
  #matchRecapOv #mrBuild { gap:5px; }
  #matchRecapOv .mrBuff { padding:4px 8px; font-size:10.5px; }
}
@media (min-width:720px) and (min-height:380px) and (max-height:510px){
  #intermissionOv { padding:14px; }
  #intermissionOv .imBox { gap:6px 16px; padding:10px 14px; }
  #intermissionOv .imHead { padding-bottom:5px; }
  #intermissionOv .imStockDate { display:none; }
  #intermissionOv .imScorecard { padding:7px 9px; gap:6px; }
  #intermissionOv .imEvents { padding:6px 8px; }
  #intermissionOv .imEvent { padding:4px 2px; }
  #intermissionOv .imCards { gap:8px; }
  #intermissionOv .imCards .buffCard { min-height:118px; padding:9px 8px; }
  #intermissionOv .imCards .buffCard .bcDesc { font-size:10.5px; line-height:1.4; }
  #intermissionOv .imFoot { gap:10px; }
  #intermissionOv .imFoot .dshImNext { font-size:10px; }
  #intermissionOv .imSkipBtn { padding:6px 12px; font-size:11px; letter-spacing:1px; }
}
@media (min-width:720px) and (min-height:380px) and (max-height:460px){
  #intermissionOv { padding:10px; }
  #intermissionOv .imBox { gap:5px 14px; padding:8px 12px; }
  #intermissionOv .imHead { padding-bottom:4px; }
  #intermissionOv .imTitle { font-size:13px; letter-spacing:4px; }
  #intermissionOv .imRound { font-size:10px; }
  #intermissionOv .imSection { gap:5px; }
  #intermissionOv .imSecLabel { font-size:9px; letter-spacing:3px; }
  #intermissionOv .imStockKey { font-size:13px; }
  #intermissionOv .imScorecard { padding:6px 8px; gap:5px; }
  #intermissionOv .imStatLbl { font-size:9px; letter-spacing:1px; }
  #intermissionOv .imStatVal { font-size:13px; }
  #intermissionOv .imEvents { padding:5px 7px; gap:4px; }
  #intermissionOv .imEvent { padding:3px 2px; font-size:11px; }
  #intermissionOv .imEvHead { font-size:10px; }
  #intermissionOv .imEvJudge { font-size:11px; }
  #intermissionOv .imCards .buffCard { min-height:104px; padding:8px 7px; }
  #intermissionOv .imCards .buffCard .bcName { font-size:13px; margin-bottom:5px; }
  #intermissionOv .imCards .buffCard .bcDesc { font-size:10px; line-height:1.35; }
  #intermissionOv .imCards .buffCard .bcHint { margin-top:4px; }
  #intermissionOv .imFoot .dshImNext { font-size:9.5px; }
}
@media (min-width:720px) and (min-height:380px) and (max-height:430px){
  #startOv { padding:16px 26px; }
  #startOv #gameIcon { width:76px; height:76px; margin-bottom:8px; }
  #startOv h1 { font-size:34px; }
  #startOv .dshHomeMain > p:last-of-type { font-size:12px; line-height:1.6; }
  #dshHomeSeason { padding:8px 11px 9px; margin-bottom:10px; font-size:11.5px; }
  #dshHomeSeason .dshHsRow { font-size:11.5px; }
  #dshHomeSeason .dshHsDots { margin:6px 0 7px; }
  #startOv .dshHomeMenu #startBtn { padding:12px 24px; font-size:15px; }
  #startOv .dshHomeKeys { margin-top:8px; font-size:10px; }
}
</style>`)
  replace('<script src="https://s1.hdslb.com/bfs/seed/toy/app/sdk/toy-sdk.js" defer></script>', '')
  replace('src="icon.png"', `src="data:image/png;base64,${icon}"`)
  // PC layout wrappers: display:contents keeps the original phone column untouched;
  // the wide-screen media query turns the same children into a two-column hero.
  replace('    <div id="gameIcon" aria-hidden="true">',
    `    <div class="dshHome">
    <div class="dshHomeMain">
    <div id="gameIcon" aria-hidden="true">`)
  replace('    <button class="start-btn" id="startBtn">出发', `      </div>
      <div class="dshHomeMenu">
    <div id="dshHomeSeason" class="hide"></div>
    <button class="start-btn" id="startBtn">出发`)
  replace(`    <button class="lib-btn hide" id="lbBtn" style="margin-top:10px">🏆 排行榜</button>
  </div>`, `    <button class="lib-btn hide" id="lbBtn" style="margin-top:10px">🏆 排行榜</button>
      <p id="dshHomeKeys" class="dshHomeKeys"></p>
      </div>
    </div>
  </div>`)
  replace('  <div class="overlay hide" id="endOv">',
    `  <div class="overlay hide" id="endOv">
    <div class="dshEndCard">
    <div class="dshEndMain">`)
  replace(`    <!-- v1.0.58: 赛季徽章 —— 显示第几局/峰值/累计涨跌 -->
    <div id="endSeason" class="hide"></div>`, `    </div>
    <div class="dshEndSide">
    <!-- v1.0.58: 赛季徽章 —— 显示第几局/峰值/累计涨跌 -->
    <div id="endSeason" class="hide"></div>`)
  replace(`    <button class="textBtn" id="backBtn" style="display:none">换一支股票</button>
  </div>`, `    <button class="textBtn" id="backBtn" style="display:none">换一支股票</button>
    </div>
    </div>
  </div>`)
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
      <div class="imSecLabel">本场战绩</div>`, `    <div class="imSection imScore">
      <div class="imSecLabel">本场战绩</div>`)
  replace(`    <div class="imSection">
      <div class="imSecLabel">关键时刻回顾</div>`, `    <div class="imSection imEventsBlock">
      <div class="imSecLabel">关键时刻回顾</div>`)
  replace(`    <div class="imSection">
      <div class="imSecLabel">升级 Build · 三选一</div>`, `    <details id="dshTradeReview" hidden>
      <summary>本回合交易 <span id="dshTradeCount"></span></summary>
      <div id="dshTradeRows"></div>
    </details>
    <p id="dshReviewStatus" role="status"></p>
    <div class="imSection imBuild">
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
  const keys = document.getElementById('dshHomeKeys');
  if (keys) keys.textContent = 'W 做多 · S 做空 · ' + space + '/X 平仓 · D 秀一下 · Enter 出发';
  // PC players expect Enter to start from the menu without aiming at the button.
  addEventListener('keydown', event => {
    if (event.key !== 'Enter' || event.repeat || event.defaultPrevented) return;
    if (document.activeElement && document.activeElement.tagName === 'BUTTON') return;
    const start = document.getElementById('startOv');
    if (!start || start.classList.contains('hide')) return;
    const lib = document.getElementById('libOv');
    if (lib && !lib.classList.contains('hide')) return;
    const guide = document.getElementById('guide');
    if (guide && guide.classList.contains('show')) return;
    event.preventDefault();
    document.getElementById('startBtn').click();
  });
})();
dshHomeSummary();
</script>
</body>
</html>`
}

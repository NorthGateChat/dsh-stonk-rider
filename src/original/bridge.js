// Runs in the original script's lexical scope. Only presentation pause and read-only game context cross the frame.
let dshPausedAt = 0;
let dshMusicWasPlaying = false;

function dshSetPaused(next) {
  if (next === dshPaused) return;
  dshPaused = next;
  const now = performance.now();
  gasOn = false;
  if (next) {
    dshPausedAt = now;
    dshMusicWasPlaying = !!bgmEl && !bgmEl.paused;
    stopBGM();
    if (engineGain) engineGain.gain.value = 0;
  } else {
    if (state === 'play') {
      startT += now - Math.max(dshPausedAt, startT);
      if (position) position.entryT += now - Math.max(dshPausedAt, position.entryT);
    }
    if (bgmEnabled && (dshMusicWasPlaying || state === 'play')) startBGM();
  }
}

function dshReport(requestId) {
  const shown = id => !document.getElementById(id).classList.contains('hide');
  const phase = state === 'play' ? 'play' : shown('startOv') || shown('libOv') ? 'home'
    : shown('cardOv') ? 'draw' : dshActiveKey && lastRun?.key === dshActiveKey ? 'result' : 'home';
  if (!dshActiveKey || !bike || phase === 'home' || phase === 'draw') {
    const season = getSeason();
    dshPost('state', {
      phase,
      // The home page reports its rolling bankroll too, so the DSH header can show
      // the same season context before the next draw starts.
      season: season && {
        round: season.round,
        matchLen: season.matchLen || CONFIG.MATCH_LEN,
        cash: Math.max(0, Math.floor(season.cash)),
        peak: Math.floor(season.peak || season.cash),
        buffs: (season.buffs || []).length,
        matchDone: !!season.matchDone,
      },
    }, requestId);
    return;
  }
  const point = priceAt(bike.x);
  const finished = phase === 'result';
  const season = getSeason();
  dshPost('state', {
    phase, assetKey: dshActiveKey, point,
    round: finished ? (window._lastSeasonInfo?.round ?? (season?.round || 0) + 1) : (season?.round || 0) + 1,
    roundCount: CONFIG.MATCH_LEN, progress: Math.round(Math.min(1, bike.x / trackLen) * 100),
    cash: Math.floor(score), startCash: runStartCash, pnl: Math.round(pnlScore), trades: posCount,
    flips, perfectLands, bankrupt: !!bankrupt, won: finished && lastRun.win,
    lastEvent: trackEvents.filter(event => event.hit).at(-1)?.date,
    events: reviewEvents(buffNodes).map(({ date, label, judge }) => ({ date, label, judge })),
    position: position && { dir: position.dir, stake: position.stake, pnl: Math.round(posPnl(position, point.price)) },
  }, requestId);
}

addEventListener('message', event => {
  if (event.source !== parent || event.origin !== dshConfig.parentOrigin || event.data?.channel !== dshConfig.channel) return;
  if (event.data.type === 'pause' && typeof event.data.paused === 'boolean') {
    dshSetPaused(event.data.paused);
    dshReport();
  }
  if (event.data.type === 'snapshot' && Number.isSafeInteger(event.data.requestId)) dshReport(event.data.requestId);
  if (event.data.type === 'review-result' && Number.isSafeInteger(event.data.requestId)) dshReviewResult(event.data.requestId, event.data.error);
  if (event.data.type === 'focus-review' && dshIntermissionOpen()) dshReviewButton?.focus({ preventScroll: true });
});
addEventListener('blur', () => { gasOn = false; });
setInterval(dshReport, 160);
dshReport();

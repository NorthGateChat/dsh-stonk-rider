// Sidecar for the original engine. The engine still owns prices, positions and settlements.
let dshTrades = [];
let dshActiveTrade = null;
let dshMoments = [];
let dshReviewButton = null;
let dshReviewRequest = 0;

function dshResetReview() {
  dshTrades = [];
  dshActiveTrade = null;
  dshMoments = [];
  dshReviewButton = null;
}

function dshTradePoint(point) {
  return { ...point, atMs: Math.round(Math.max(0, performance.now() - startT)) };
}

function dshOpenTrade(point, pos, reversedFrom) {
  dshActiveTrade = {
    id: dshTrades.length + 1, dir: pos.dir, reversedFrom,
    open: { ...dshTradePoint(point), stake: pos.stake }, additions: [],
  };
  dshTrades.push(dshActiveTrade);
}

function dshAddStake(amount) {
  dshActiveTrade?.additions.push({ ...dshTradePoint(priceAt(bike.x)), amount, stake: position.stake });
}

function dshPnlStep(settlement, label, after) {
  const before = settlement.adjustments.at(-1)?.after ?? settlement.base;
  if (before !== after) settlement.adjustments.push({ label, before, after });
}

function dshCloseTrade(point, held, pnl, reason, settlement) {
  if (!dshActiveTrade) return;
  dshActiveTrade.close = {
    ...dshTradePoint(point), held, reason: reason || 'manual', stake: position.stake, pnl,
    ...settlement, cashBefore: score, cashAfterSettlement: score + pnl,
  };
  dshActiveTrade = null;
}

function dshCaptureMoment(node) {
  const point = priceAt(node.x);
  node.dshReviewId = dshMoments.length + 1;
  dshMoments.push({
    id: node.dshReviewId, point: dshTradePoint(point), label: node.evtLabel || '赛道关键时刻',
    position: position && { dir: position.dir, stake: position.stake, entryPrice: position.entryPrice,
      pnl: Math.round(posPnl(position, point.price)), tradeId: dshActiveTrade?.id },
  });
}

function dshIntermissionOpen() {
  return document.getElementById('intermissionOv').classList.contains('show');
}

function dshAskButton(kind, id, name) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'dsh-review-button';
  button.textContent = '问 DSH';
  button.setAttribute('aria-label', name);
  button.onclick = () => {
    if (!dshIntermissionOpen()) return;
    const moment = kind === 'moment' ? dshMoments.find(item => item.id === id) : undefined;
    const trade = dshTrades.find(item => item.close && item.id === (kind === 'trade' ? id : moment?.position?.tradeId));
    if (kind === 'trade' ? !trade : !moment) return;
    const related = trade ? dshTrades.filter(item => item.close && (item.id === trade.reversedFrom || item.reversedFrom === trade.id)) : [];
    dshReviewButton?.removeAttribute('aria-current');
    dshReviewButton = button;
    document.getElementById('dshReviewStatus').textContent = '';
    dshPost('review', {
      kind, assetKey: dshActiveKey, round: window._intermissionCtx.seasonInfo.round,
      trade, moment, related,
    }, ++dshReviewRequest);
  };
  return button;
}

function dshRenderTradeReview() {
  const details = document.getElementById('dshTradeReview');
  const rows = document.getElementById('dshTradeRows');
  const closed = dshTrades.filter(item => item.close);
  details.hidden = closed.length === 0;
  details.open = false;
  document.getElementById('dshTradeCount').textContent = `${closed.length} 笔已结算`;
  document.getElementById('dshReviewStatus').textContent = '';
  rows.replaceChildren(...closed.map(trade => {
    const row = document.createElement('div');
    row.className = 'dsh-trade-row';
    const label = document.createElement('span');
    label.textContent = `第 ${trade.id} 笔 · ${trade.dir === 1 ? '做多' : '做空'}`;
    const note = document.createElement('small');
    const close = trade.close;
    note.textContent = `${trade.open.date} → ${close.date}${close.reason === 'flip' ? ' · 反手' : ''}`;
    label.append(note);
    const amount = document.createElement('strong');
    amount.dataset.positive = String(close.pnl >= 0);
    amount.textContent = `${close.pnl < 0 ? '−' : close.pnl > 0 ? '+' : ''}$${Math.abs(close.pnl).toLocaleString()}`;
    row.append(label, amount, dshAskButton('trade', trade.id, `问 DSH 第 ${trade.id} 笔交易`));
    return row;
  }));
}

function dshReviewResult(requestId, error) {
  if (!dshIntermissionOpen() || requestId !== dshReviewRequest) return;
  if (!error) dshReviewButton?.setAttribute('aria-current', 'true');
  document.getElementById('dshReviewStatus').textContent = error || '已带入 DSH 草稿，可编辑后发送。';
}

document.getElementById('dshGoCards').onclick = () => {
  const cards = document.getElementById('imCards');
  cards.scrollIntoView({ block: 'nearest' });
  cards.firstElementChild?.focus({ preventScroll: true });
};

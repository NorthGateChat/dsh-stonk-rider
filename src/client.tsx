import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { ComponentType, ReactNode } from 'react'
import {
  ArrowDownRight, ArrowLeft, ArrowUpRight, ChartNoAxesCombined, ExternalLink, MessageSquareText,
  PanelRightClose, Pause, Play,
} from 'lucide-react'
import {
  OriginalGame, stocks, type GameControl, type GameSnapshot, type Point, type RestReview,
  type RunSnapshot, type SettledTrade, type Track, type TrackEvent, type TradePoint,
} from './original-game.tsx'
import { Badge } from './ui/badge.tsx'
import { Button } from './ui/button.tsx'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card.tsx'
import { Kbd } from './ui/kbd.tsx'
import theme from './theme.css'
import workspaceStyle from './workspace.css'

export const name = 'dsh-stonk-rider-client'
export const inject = ['slots', 'sessions', 'conversation', 'layout']

const panelId = 'dsh-stonk-rider'
const chatSlot = 'stonk-rider.conversation'
const title = 'Stonk Rider'
const source = 'Stonk Rider 1.0.73 附带的离散历史价格采样'
const trackCount = Object.keys(stocks).length
// The space bar is the same key everywhere; only the printed label differs.
const spaceKeyLabel = /Mac|iPhone|iPad|iPod/.test(globalThis.navigator?.platform || globalThis.navigator?.userAgent || '') ? 'Space' : '空格'

type Topic = { kind: 'node'; event: TrackEvent; track: Track } | { kind: 'asset'; track: Track }
  | { kind: 'run'; date: string; finished: boolean; track: Track } | { kind: 'review'; review: RestReview; track: Track }
type Binding = { ctx: object }
type SessionReference = { sessionId: string; binding: Binding; release(): void }
type RenderSlot = (name: string, owner: Record<string, unknown>) => ReactNode
type PageProps = {
  SessionProvider: ComponentType<{ session: SessionReference; children?: ReactNode }>
  renderSlot: RenderSlot
}
type ChatProps = {
  renderFactorySlot(
    name: string,
    input: { variant: 'embedded'; phase: 'active'; hero: false },
    options: { slots: { views: ComponentType<{ renderSlot: RenderSlot }> } },
  ): ReactNode
}
type Disposer = () => void
type ClientContext = {
  effect(setup: () => Disposer, name: string): void
  slots: {
    inject(slot: string, register: () => Disposer): Disposer
    register<Props>(options: {
      name: string; key?: string; id?: string; label?: string; order?: number
      children?: Record<string, { kind: 'single'; scope: 'session' }>
    }, component: ComponentType<Props>): Disposer
  }
  sessions: {
    list: {
      getSnapshot(): { byId: Record<string, { id: string; retainedBy: { mainView?: number } }> }
      subscribe(listener: () => void): Disposer
    }
    retain(id: string, options: { source: 'stonkRiderChat' }): SessionReference
  }
  layout: {
    selectPanel(id: string | null): void
  }
  conversation: {
    input: {
      requestDraftInitialization(binding: Binding, options: { prompt: string; whenDraftExists: 'append' }): 'applied' | 'preserved' | 'blocked'
      for(ctx: object): { focus(): void; state: { getSnapshot(): { draft: string } } }
    }
  }
}

function quote(track: Track, price: number) {
  const unit = track.cls === '港互' ? 'HK$' : track.cls === 'A股' || /^(SH|SZ)/.test(track.sym) ? '¥' : '$'
  return `${unit}${price.toFixed(price < 1 ? 4 : 2)}`
}

function formatPoint(track: Track, point: Point) {
  return `${point.date} · ${quote(track, point.price)}`
}

function buildRunQuestion(track: Track, snapshot: RunSnapshot) {
  const finished = snapshot.phase === 'result'
  const lines = [
    finished
      ? `请帮我复盘 Stonk Rider 这轮 ${track.name}（${track.sym}）的交易与骑行。`
      : `请解释 ${track.name}（${track.sym}）当前这段行情，以及我在游戏里的持仓表现。`,
    `数据：${source}。当前位置（赛道插值）：${formatPoint(track, snapshot.point)}。`,
    `第 ${snapshot.round}/${snapshot.roundCount} 回合，进度 ${snapshot.progress}%。游戏资金 $${snapshot.startCash} → $${snapshot.cash}，已结算交易盈亏 $${snapshot.pnl}，共开仓 ${snapshot.trades} 次。`,
  ]
  if (finished) {
    lines.push(`本局结果：${snapshot.won ? '冲线' : snapshot.bankrupt ? '破产' : '翻车'}。空翻 ${snapshot.flips} 次，完美落地 ${snapshot.perfectLands} 次。`)
    for (const event of snapshot.events) lines.push(`${event.date || '赛道中'} · ${event.label || '关键时刻'} · ${event.judge}`)
  } else {
    const position = snapshot.position
    lines.push(position ? `当前${position.dir === 1 ? '做多' : '做空'}，仓位 $${position.stake}，浮动盈亏 $${position.pnl}。` : '当前空仓。')
    const latest = track.events.find(event => event.date === snapshot.lastEvent)
    if (latest) lines.push(`最近节点：${latest.date} · ${latest.label}。`)
  }
  lines.push('请区分历史行情和游戏结算。涉及真实涨跌原因时，请标明能查证的来源。')
  return lines.join('\n')
}

function nodePoints(track: Track, { i }: TrackEvent) {
  return [i - 1, i, i + 1].flatMap((index, offset) => {
    const date = track.dates[index]
    const price = track.prices[index]
    return date && price !== undefined ? [{ date, price, label: ['前一采样', '节点', '后一采样'][offset] }] : []
  })
}

function buildNodeQuestion(track: Track, event: TrackEvent) {
  return [
    `请帮我理解 ${track.name}（${track.sym}）在 ${event.date} 附近的变化。`,
    `历史采样（${source}）：${nodePoints(track, event).map(point => formatPoint(track, point)).join(' → ')}`,
    '请比较采样点之间的涨跌。若能查到相关公告、财报或其他可靠资料，请注明来源，并区分已证实的信息和推测。',
  ].join('\n')
}

function assetQuestion(track: Track) {
  return `我在玩 Stonk Rider 的 ${track.name}（${track.sym}）历史赛道。请用通俗的话介绍这个标的、它所属的类别，以及理解它的历史价格时值得留意哪些信息。若引用具体数字，请标明时间和来源。`
}

const closeReason: Record<SettledTrade['close']['reason'], string> = {
  manual: '主动平仓', flip: '反手平仓', liq: '资金耗尽结算', end_win: '冲线自动平仓', end_loss: '翻车自动平仓',
}

function direction(dir: 1 | -1) { return dir === 1 ? '做多' : '做空' }
function gameMoney(value: number) { return `${value < 0 ? '−' : ''}$${Math.abs(value).toLocaleString('en-US')}` }

function formatTradePoint(track: Track, point: TradePoint) {
  return `开跑后 ${(point.atMs / 1000).toFixed(1)} 秒，${formatPoint(track, point)}`
}

function tradeLines(track: Track, trade: SettledTrade) {
  const { open, close } = trade
  const reversal = trade.reversedFrom === undefined ? '' : `（接续第 ${trade.reversedFrom} 笔反手）`
  return [
    `第 ${trade.id} 笔 · ${direction(trade.dir)}${reversal}`,
    `开仓：${formatTradePoint(track, open)}，初始仓位 ${gameMoney(open.stake)}。`,
    ...trade.additions.map(add => `加仓：${formatTradePoint(track, add)}，增加 ${gameMoney(add.amount)}，仓位到 ${gameMoney(add.stake)}。`),
    `平仓：${formatTradePoint(track, close)}，${closeReason[close.reason]}，持有 ${close.held.toFixed(1)} 秒，最终仓位 ${gameMoney(close.stake)}。`,
    `基础盈亏 ${gameMoney(close.base)}，实际结算 ${gameMoney(close.pnl)}；资金 ${gameMoney(close.cashBefore)} → ${gameMoney(close.cashAfterSettlement)}（仅本笔结算）。`,
    ...close.adjustments.map(step => `${step.label}：${gameMoney(step.before)} → ${gameMoney(step.after)}。`),
  ]
}

function buildReviewQuestion(track: Track, review: RestReview) {
  const lines = [
    review.kind === 'trade'
      ? `请复盘我在第 ${review.round} 回合 ${track.name}（${track.sym}）赛道上的第 ${review.trade.id} 笔交易。`
      : `请复盘我在第 ${review.round} 回合 ${track.name}（${track.sym}）赛道经过「${review.moment.label}」时的操作。`,
    '以下是游戏内记录，交易时点的行情价是赛道插值，资金和盈亏是游戏模拟值。',
  ]
  if (review.kind === 'moment') {
    const { point, position, label } = review.moment
    lines.push(`经过时：${formatTradePoint(track, point)}。`)
    lines.push(position
      ? `当时${direction(position.dir)}，仓位 ${gameMoney(position.stake)}，开仓参考价 ${quote(track, position.entryPrice)}，浮动盈亏 ${gameMoney(position.pnl)}。`
      : '当时空仓。')
    const event = track.events.find(item => item.date === point.date && item.label === label)
    if (event) lines.push(`前后历史采样（${source}）：${nodePoints(track, event).map(sample => formatPoint(track, sample)).join(' → ')}。`)
  }
  if (review.trade) {
    lines.push(...tradeLines(track, review.trade))
    if (review.related.length) lines.push('反手关联的交易：', ...review.related.flatMap(trade => tradeLines(track, trade)))
    lines.push('请按记录解释盈亏来自价格方向、仓位还是结算效果。原版加仓沿用首次开仓价，请按这个规则复盘。')
  } else lines.push('请结合行情与空仓状态解释这个节点，并说明哪些结论可以由采样数据验证。')
  lines.push('涉及真实市场涨跌原因时，请区分有来源的事实与推测。')
  return lines.join('\n')
}

function writeDraft(ctx: ClientContext, binding: Binding, prompt: string) {
  const resolver = ctx.conversation.input
  const input = resolver.for(binding.ctx)
  const compact = (text: string) => text.trim().replace(/\s+/g, ' ')
  if (compact(input.state.getSnapshot().draft).includes(compact(prompt))) return input
  return resolver.requestDraftInitialization(binding, { prompt, whenDraftExists: 'append' }) === 'applied' ? input : null
}

function nodeMovement(track: Track, event: TrackEvent) {
  const before = track.prices[event.i - 1] ?? track.prices[event.i]!
  const after = track.prices[event.i]!
  const change = (after / before - 1) * 100
  return { before, after, rising: change > 0, label: `${change > 0 ? '+' : '−'}${Math.abs(change).toFixed(1)}%` }
}

function PriceNode({ track, event, active, onAsk }: { track: Track; event: TrackEvent; active: boolean; onAsk(): void }) {
  const change = nodeMovement(track, event)
  return <Card className="stonk-node" data-current={active}>
    <Button type="button" variant="ghost" className="stonk-node-trigger" onClick={onAsk}
      aria-label={`问 DSH 关于 ${event.date} 节点（${change.label}）`}>
      <span className="stonk-node-top">
        <time dateTime={event.date}>{event.date}</time>
        <Badge variant="secondary" className="stonk-movement" data-rising={change.rising}>
          {change.rising ? <ArrowUpRight aria-hidden="true" /> : <ArrowDownRight aria-hidden="true" />}{change.label}
        </Badge>
      </span>
      <span className="stonk-node-bottom">
        <span>{quote(track, change.before)} → {quote(track, change.after)}</span>
        <MessageSquareText aria-hidden="true" />
      </span>
    </Button>
  </Card>
}

function QuestionContext({ topic, track, onAsset }: { topic: Topic | undefined; track: Track | undefined; onAsset(): void }) {
  const context = topic?.track ?? track
  let title = '从一个价格节点开始'
  switch (topic?.kind) {
    case 'node': title = topic.event.date; break
    case 'run': title = topic.finished ? '本局复盘' : `赛段 · ${topic.date}`; break
    case 'asset': title = '标的概览'; break
    case 'review': title = topic.review.kind === 'trade'
      ? `第 ${topic.review.trade.id} 笔 · ${direction(topic.review.trade.dir)}` : topic.review.moment.label; break
  }
  return <Card className="stonk-context">
    <CardHeader className="stonk-context-header">
      <div className="stonk-context-label"><ChartNoAxesCombined size={14} aria-hidden="true" />{context ? `${context.sym} · ${context.name}` : 'K线狂飙 · 原版赛程'}</div>
      <CardTitle>{title}</CardTitle>
      <CardDescription aria-live="polite">{topic ? '可在输入框补充问题，再发送给 DSH。'
        : track ? '点赛道下方的节点，带着历史采样价格提问。' : '抽中标的后，可以追问历史节点或复盘交易。'}</CardDescription>
    </CardHeader>
    <CardContent className="stonk-context-content">
      {topic?.kind === 'node' && <dl className="stonk-context-points">
        {nodePoints(topic.track, topic.event).map(point => <div key={point.date}>
          <dt>{point.label}</dt>
          <dd>{quote(topic.track, point.price)}</dd>
        </div>)}
      </dl>}
      {topic?.kind === 'review' && (topic.review.kind === 'trade'
        ? <dl className="stonk-context-points">
          <div><dt>开仓价</dt><dd>{quote(topic.track, topic.review.trade.open.price)}</dd></div>
          <div><dt>平仓价</dt><dd>{quote(topic.track, topic.review.trade.close.price)}</dd></div>
          <div><dt>模拟结算</dt><dd>{gameMoney(topic.review.trade.close.pnl)}</dd></div>
        </dl>
        : <dl className="stonk-context-points">
          <div><dt>赛道日期</dt><dd>{topic.review.moment.point.date}</dd></div>
          <div><dt>经过时仓位</dt><dd>{topic.review.moment.position ? direction(topic.review.moment.position.dir) : '空仓'}</dd></div>
          <div><dt>模拟浮盈亏</dt><dd>{topic.review.moment.position ? gameMoney(topic.review.moment.position.pnl) : '—'}</dd></div>
        </dl>)}
      {track && <Button type="button" variant="outline" size="sm" onClick={onAsset}>了解当前标的 <ArrowUpRight aria-hidden="true" /></Button>}
    </CardContent>
  </Card>
}

export function apply(ctx: ClientContext) {
  const list = ctx.sessions.list
  const subscribeSessions = (listener: () => void) => list.subscribe(listener)
  const mainSessionId = () => Object.values(list.getSnapshot().byId).find(row => (row.retainedBy.mainView ?? 0) > 0)?.id
  const narrowScreen = matchMedia('(max-width: 900px)')
  const subscribeWidth = (listener: () => void) => {
    narrowScreen.addEventListener('change', listener)
    return () => narrowScreen.removeEventListener('change', listener)
  }

  function SidebarIcon({ size }: { size: number }) {
    return <ChartNoAxesCombined size={size} aria-hidden="true" />
  }

  function FixedChat({ renderSlot }: { renderSlot: RenderSlot }) {
    return renderSlot('conversation.session', { view: 'chat' })
  }

  function ChatContent({ renderFactorySlot }: ChatProps) {
    return renderFactorySlot('conversation.content', { variant: 'embedded', phase: 'active', hero: false }, {
      slots: { views: FixedChat },
    })
  }

  function RiderPage({ SessionProvider, renderSlot }: PageProps) {
    const sessionId = useSyncExternalStore(subscribeSessions, mainSessionId)
    const narrow = useSyncExternalStore(subscribeWidth, () => narrowScreen.matches)
    const [reference, setReference] = useState<SessionReference>()
    const [chatPreference, setChatPreference] = useState<boolean>()
    const [gameInfo, setGameInfo] = useState<GameSnapshot>({ phase: 'home' })
    const [manualPause, setManualPause] = useState(false)
    const [hidden, setHidden] = useState(document.hidden)
    const [topic, setTopic] = useState<Topic>()
    const [notice, setNotice] = useState('')
    const chatOpen = chatPreference ?? !narrow
    const chatSession = reference?.sessionId === sessionId ? reference : undefined
    const frame = useRef<HTMLIFrameElement>(null)
    const game = useRef<GameControl>(null)
    const latest = useRef<GameSnapshot>(gameInfo)
    const focusFrame = useRef(0)
    const run = 'assetKey' in gameInfo ? gameInfo : undefined
    const track = run && stocks[run.assetKey]
    const homeSeason = !run && 'season' in gameInfo ? gameInfo.season : undefined
    const homeRound = homeSeason ? (homeSeason.matchDone ? homeSeason.matchLen : Math.min(homeSeason.round + 1, homeSeason.matchLen)) : 0
    const paused = manualPause || hidden || (narrow && chatOpen)

    const receiveSnapshot = useCallback((value: GameSnapshot) => {
      const previous = latest.current
      latest.current = value
      const currentKey = 'assetKey' in value ? value.assetKey : undefined
      const previousKey = 'assetKey' in previous ? previous.assetKey : undefined
      if (currentKey !== previousKey) setTopic(undefined)
      const currentSeason = 'season' in value ? value.season : undefined
      const previousSeason = 'season' in previous ? previous.season : undefined
      const seasonChanged = currentSeason?.round !== previousSeason?.round
        || currentSeason?.cash !== previousSeason?.cash || currentSeason?.peak !== previousSeason?.peak
        || currentSeason?.buffs !== previousSeason?.buffs || currentSeason?.matchDone !== previousSeason?.matchDone
      if (previous.phase !== value.phase || currentKey !== previousKey || seasonChanged) {
        if (value.phase !== 'play') setManualPause(false)
        setGameInfo(value)
      }
    }, [])

    useLayoutEffect(() => {
      if (!sessionId) return
      const next = ctx.sessions.retain(sessionId, { source: 'stonkRiderChat' })
      setReference(next)
      return () => next.release()
    }, [sessionId])

    useLayoutEffect(() => {
      setTopic(undefined)
      setNotice('')
      return () => cancelAnimationFrame(focusFrame.current)
    }, [sessionId])

    useLayoutEffect(() => {
      const sync = () => setHidden(document.hidden)
      document.addEventListener('visibilitychange', sync)
      return () => document.removeEventListener('visibilitychange', sync)
    }, [])

    function toggleChat() {
      if (narrow && !chatOpen && gameInfo.phase === 'play') setManualPause(true)
      setChatPreference(!chatOpen)
      if (narrow && chatOpen) {
        cancelAnimationFrame(focusFrame.current)
        focusFrame.current = requestAnimationFrame(() => {
          frame.current?.focus({ preventScroll: true })
          if (topic?.kind === 'review') game.current?.focusReview()
        })
      }
    }

    function resume() {
      setManualPause(false)
      cancelAnimationFrame(focusFrame.current)
      focusFrame.current = requestAnimationFrame(() => {
        frame.current?.focus({ preventScroll: true })
        frame.current?.contentWindow?.focus()
      })
    }

    function handoff(prompt: string, nextTopic: Topic) {
      if (!chatSession || chatSession.sessionId !== mainSessionId()) {
        const error = '请先从左侧打开一个 DSH 对话。'
        setNotice(error)
        return error
      }
      const input = writeDraft(ctx, chatSession.binding, prompt)
      if (!input) {
        const error = '输入框暂时无法编辑，请稍后再试。'
        setNotice(error)
        return error
      }
      if (latest.current.phase === 'play') setManualPause(true)
      setNotice('')
      setTopic(nextTopic)
      setChatPreference(true)
      cancelAnimationFrame(focusFrame.current)
      focusFrame.current = requestAnimationFrame(() => {
        if (chatSession.sessionId === mainSessionId()) input.focus()
      })
    }

    function askRestReview(review: RestReview) {
      const currentTrack = stocks[review.assetKey]
      if (!currentTrack) return '暂时读不到本回合的标的。'
      return handoff(buildReviewQuestion(currentTrack, review), { kind: 'review', review, track: currentTrack })
    }

    async function askRun() {
      const snapshot = await game.current?.snapshot()
      if (!game.current) return
      if (!snapshot || !('assetKey' in snapshot)) {
        setNotice('暂时读不到赛道状态，请稍后再试。')
        return
      }
      const currentTrack = stocks[snapshot.assetKey]
      if (!currentTrack) return
      handoff(buildRunQuestion(currentTrack, snapshot), {
        kind: 'run', date: snapshot.point.date, finished: snapshot.phase === 'result', track: currentTrack,
      })
    }

    return <div className="stonk-workspace">
      <style>{theme}{workspaceStyle}</style>
      <div className="stonk-workspace-bar" data-stonk-ui>
        <span className="stonk-workspace-brand"><ChartNoAxesCombined aria-hidden="true" /> Stonk Rider</span>
        <Button type="button" variant="outline" size="sm" aria-expanded={chatOpen} aria-controls="stonk-chat-pane" onClick={toggleChat}>
          {chatOpen ? (narrow ? <ArrowLeft aria-hidden="true" /> : <PanelRightClose aria-hidden="true" />) : <MessageSquareText aria-hidden="true" />}
          {chatOpen ? (narrow ? (topic?.kind === 'review' ? '返回休整室' : '返回赛道') : '收起对话') : '打开 DSH 对话'}
        </Button>
      </div>
      <div className="stonk-workspace-body" data-chat-open={chatOpen}>
        <section className="stonk-track" aria-label="Stonk Rider 赛道" data-stonk-ui data-dsh-stonk-rider>
          <header className="stonk-track-header">
            <div>
              <h2>{track?.sym ?? 'K线狂飙'} {track && <span>{track.name}</span>}</h2>
              <div className="stonk-track-meta">
                <Badge variant="secondary">
                  {run ? `第 ${run.round}/${run.roundCount} 回合`
                    : homeSeason ? (homeSeason.matchDone ? `赛程达成 ${homeSeason.matchLen}/${homeSeason.matchLen}` : `第 ${homeRound}/${homeSeason.matchLen} 回合`)
                    : '新赛程'}
                </Badge>
                <span>
                  {track ? `${track.dates[0]} — ${track.dates.at(-1)}`
                    : homeSeason ? `本金 ${gameMoney(homeSeason.cash)} · 峰值 ${gameMoney(homeSeason.peak)}`
                    : `${trackCount} 个标的 · 8 回合赛程`}
                </span>
              </div>
            </div>
            {gameInfo.phase === 'play' && <Button type="button" variant="outline" size="sm" onClick={manualPause ? resume : () => setManualPause(true)}>
              {manualPause ? <Play aria-hidden="true" /> : <Pause aria-hidden="true" />}{manualPause ? '继续骑行' : '暂停骑行'}
            </Button>}
          </header>
          <div className="stonk-stage">
            <OriginalGame frame={frame} control={game} paused={paused} onSnapshot={receiveSnapshot} onReview={askRestReview} />
            {manualPause && gameInfo.phase === 'play' && <div className="stonk-paused">
              <Card className="stonk-paused-card">
                <CardTitle>骑行已暂停</CardTitle>
                <Button type="button" size="sm" onClick={resume}><Play aria-hidden="true" />返回赛道</Button>
              </Card>
            </div>}
          </div>
          <div className="stonk-stage-meta">
            <span><Kbd>↑</Kbd>/<Kbd>W</Kbd> 做多 <Kbd>↓</Kbd>/<Kbd>S</Kbd> 做空 <Kbd>{spaceKeyLabel}</Kbd>/<Kbd>X</Kbd> 平仓 <Kbd>→</Kbd>/<Kbd>D</Kbd> 秀一下</span>
          </div>
          <section className="stonk-timeline" aria-label="关键价格节点">
            <div className="stonk-timeline-heading">
              <div><h3>关键价格节点</h3><p>{track ? '涨跌幅按相邻采样点计算' : '抽中标的并进入赛道后显示'}</p></div>
              {track && <Button type="button" variant="outline" size="sm" onClick={askRun}>
                <MessageSquareText aria-hidden="true" />{gameInfo.phase === 'result' ? '复盘本回合' : '问当前赛段'}
              </Button>}
            </div>
            {track && <div className="stonk-node-grid">
              {track.events.map(event => <PriceNode key={`${event.date}:${event.i}`} track={track} event={event} active={topic?.kind === 'node' && topic.event === event}
                onAsk={() => handoff(buildNodeQuestion(track, event), { kind: 'node', event, track })} />)}
            </div>}
            <p role="status" className="stonk-error">{notice}</p>
          </section>
        </section>
        <aside id="stonk-chat-pane" aria-label="DSH 对话" hidden={!chatOpen}>
          <div className="stonk-chat-chrome" data-stonk-ui>
            <div className="stonk-chat-heading">
              <h2><MessageSquareText aria-hidden="true" />赛道问答</h2>
              <Button type="button" variant="ghost" size="icon-sm" aria-label="在完整对话中打开" title="在完整对话中打开"
                onClick={() => ctx.layout.selectPanel(null)}><ExternalLink aria-hidden="true" /></Button>
            </div>
            <QuestionContext topic={topic} track={track} onAsset={() => track && handoff(assetQuestion(track), { kind: 'asset', track })} />
            {narrow && chatOpen && <p role="status" className="stonk-error">{notice}</p>}
          </div>
          <div className="stonk-chat-content">
            {chatSession ? <SessionProvider session={chatSession}>{renderSlot(chatSlot, {})}</SessionProvider>
              : <p className="stonk-chat-empty">从左侧打开一个对话，就可以带着赛道节点来提问。</p>}
          </div>
        </aside>
      </div>
    </div>
  }

  ctx.effect(() => ctx.slots.inject('main', () => ctx.slots.register({
    name: 'main', key: panelId, children: { [chatSlot]: { kind: 'single', scope: 'session' } },
  }, RiderPage)), 'Stonk Rider main workspace')
  ctx.effect(() => ctx.slots.inject(chatSlot, () => ctx.slots.register({ name: chatSlot }, ChatContent)), 'Stonk Rider embedded conversation')
  ctx.effect(() => ctx.slots.inject('sidebar.panellist', () => ctx.slots.register({
    name: 'sidebar.panellist', id: panelId, order: 15, label: title,
  }, SidebarIcon)), 'Stonk Rider sidebar entry')
}

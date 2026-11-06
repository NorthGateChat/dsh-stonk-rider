import { useImperativeHandle, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import documentTemplate from './original-game.html'
import stockData from './original/stocks.json'

export type Point = { date: string; price: number }
export type TrackEvent = { i: number; date: string; label: string }
export type Track = { sym: string; name: string; cls: string; dates: string[]; prices: number[]; events: TrackEvent[] }
export const stocks: Readonly<Record<string, Track>> = stockData

export type RunSnapshot = {
  phase: 'play' | 'result'; assetKey: string; point: Point; progress: number
  cash: number; startCash: number; pnl: number; trades: number
  round: number; roundCount: number; flips: number; perfectLands: number
  bankrupt: boolean; won: boolean; lastEvent?: string
  events: { date: string; label: string; judge: string }[]
  position: null | { dir: 1 | -1; stake: number; pnl: number }
}
export type GameSnapshot = { phase: 'home' | 'draw' } | RunSnapshot
export type TradePoint = Point & { atMs: number }
export type SettledTrade = {
  id: number; dir: 1 | -1; reversedFrom?: number
  open: TradePoint & { stake: number }
  additions: (TradePoint & { amount: number; stake: number })[]
  close: TradePoint & {
    held: number; reason: 'manual' | 'flip' | 'liq' | 'end_win' | 'end_loss'; stake: number; pnl: number
    base: number; adjustments: { label: string; before: number; after: number }[]
    cashBefore: number; cashAfterSettlement: number
  }
}
type ReviewMoment = {
  point: TradePoint; label: string
  position: null | { dir: 1 | -1; stake: number; entryPrice: number; pnl: number }
}
export type RestReview = { assetKey: string; round: number; related: SettledTrade[] } & (
  { kind: 'trade'; trade: SettledTrade } | { kind: 'moment'; moment: ReviewMoment; trade?: SettledTrade }
)
export type GameControl = { snapshot(): Promise<GameSnapshot | undefined>; focusReview(): void }

const storagePrefix = 'dsh-stonk-rider:original:'
const validKey = (key: string) => key === 'sr_guide_seen'
  || /^(?:stonk_(?:bgm|played|season)|stonk_(?:stars|best)_[a-z\d_]+)$/i.test(key)

function gameStorage() {
  const values: Record<string, string> = {}
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const name = localStorage.key(i)
      if (!name?.startsWith(storagePrefix)) continue
      const key = name.slice(storagePrefix.length)
      const value = localStorage.getItem(name)
      if (value !== null && validKey(key)) values[key] = value
    }
  } catch { /* The original game can also run without persistent storage. */ }
  return values
}

function frameDocument(channel: string) {
  const config = JSON.stringify({ channel, parentOrigin: location.origin, storage: gameStorage(), stocks }).replaceAll('<', '\\u003c')
  return documentTemplate.replace('<!--DSH_STONK_BOOTSTRAP-->', () => `<script>
    const dshConfig = ${config};
    let dshPaused = false;
    let dshActiveKey;
    const dshPost = (type, payload, requestId) => parent.postMessage({ channel: dshConfig.channel, type, payload, requestId }, dshConfig.parentOrigin);
    const dshValues = new Map(Object.entries(dshConfig.storage));
    const dshStorage = {
      getItem: key => dshValues.get(key) ?? null,
      setItem(key, value) { const text = String(value); dshValues.set(key, text); dshPost('storage', { key, value: text }); },
      removeItem(key) { dshValues.delete(key); dshPost('storage', { key, value: null }); },
    };
  </script>`)
}

export function OriginalGame({ frame, control, paused, onSnapshot, onReview }: {
  frame: RefObject<HTMLIFrameElement>; control: RefObject<GameControl>; paused: boolean; onSnapshot(value: GameSnapshot): void
  onReview(review: RestReview): string | undefined
}) {
  const [{ channel, srcDoc }] = useState(() => {
    const id = crypto.randomUUID()
    return { channel: id, srcDoc: frameDocument(id) }
  })
  const [ready, setReady] = useState(false)
  const request = useRef<{ id: number; promise: ReturnType<GameControl['snapshot']>; finish(value?: GameSnapshot): void }>()
  const sequence = useRef(0)
  const reviewHandler = useRef(onReview)

  useLayoutEffect(() => { reviewHandler.current = onReview }, [onReview])

  useImperativeHandle(control, () => ({
    focusReview() {
      frame.current?.contentWindow?.postMessage({ channel, type: 'focus-review' }, '*')
    },
    snapshot() {
      if (request.current) return request.current.promise
      const target = frame.current?.contentWindow
      if (!target) return Promise.resolve(undefined)
      const id = ++sequence.current
      let finish!: (value?: GameSnapshot) => void
      const promise = new Promise<GameSnapshot | undefined>(resolve => {
        const timer = window.setTimeout(() => request.current?.finish(), 700)
        finish = (value?: GameSnapshot) => {
          clearTimeout(timer)
          request.current = undefined
          resolve(value)
        }
      })
      request.current = { id, promise, finish }
      target.postMessage({ channel, type: 'snapshot', requestId: id }, '*')
      return promise
    },
  }), [frame, channel])

  useLayoutEffect(() => {
    function onMessage(event: MessageEvent) {
      if (event.source !== frame.current?.contentWindow || event.origin !== 'null' || event.data?.channel !== channel) return
      const { type, payload, requestId } = event.data
      if (type === 'state' && payload && (
        payload.phase === 'home' || payload.phase === 'draw'
        || (payload.phase === 'play' || payload.phase === 'result') && Object.hasOwn(stocks, payload.assetKey)
      )) {
        setReady(true)
        onSnapshot(payload)
        if (request.current?.id === requestId) request.current?.finish(payload)
      }
      if (type === 'review' && Number.isSafeInteger(requestId) && payload && Object.hasOwn(stocks, payload.assetKey)
        && (payload.kind === 'trade' && payload.trade?.close || payload.kind === 'moment' && payload.moment?.point)) {
        const error = reviewHandler.current(payload)
        frame.current?.contentWindow?.postMessage({ channel, type: 'review-result', requestId, error }, '*')
      }
      if (type !== 'storage' || typeof payload?.key !== 'string' || !validKey(payload.key)) return
      const key = storagePrefix + payload.key
      try {
        if (payload.value === null) localStorage.removeItem(key)
        else if (typeof payload.value === 'string' && payload.value.length <= 100_000) localStorage.setItem(key, payload.value)
      } catch { /* Browser storage restrictions do not interrupt a run. */ }
    }
    window.addEventListener('message', onMessage)
    return () => {
      window.removeEventListener('message', onMessage)
      request.current?.finish()
    }
  }, [frame, channel, onSnapshot])

  useLayoutEffect(() => {
    const node = frame.current
    if (!node) return
    node.inert = paused
    if (ready) node.contentWindow?.postMessage({ channel, type: 'pause', paused }, '*')
  }, [frame, channel, paused, ready])

  return <iframe ref={frame} className="stonk-original-frame" title="K线狂飙原版游戏"
    sandbox="allow-scripts" referrerPolicy="no-referrer" srcDoc={srcDoc} />
}

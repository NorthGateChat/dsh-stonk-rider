// Width rules for the split between the track and the embedded DSH conversation.
// Kept free of React/DOM so the arithmetic is unit-testable in plain Node.
export const chatWidthKey = 'dsh-stonk-rider:chat-width'
export const chatWidthMin = 260
export const chatWidthMax = 760
export const trackMinWidth = 380
export const splitterWidth = 7

type ReadStorage = Pick<Storage, 'getItem'>
type WriteStorage = Pick<Storage, 'setItem' | 'removeItem'>

/** Largest conversation width that still leaves the track a usable column. */
export function chatWidthLimit(containerWidth: number) {
  return Math.max(chatWidthMin, Math.min(chatWidthMax, containerWidth - trackMinWidth - splitterWidth))
}

/** Clamp a requested conversation width to the current panel size. */
export function clampChatWidth(value: number, containerWidth: number) {
  if (!Number.isFinite(value)) return chatWidthMin
  return Math.round(Math.min(Math.max(value, chatWidthMin), chatWidthLimit(containerWidth)))
}

export function readChatWidth(storage?: ReadStorage): number | null {
  try {
    const raw = (storage ?? globalThis.localStorage)?.getItem(chatWidthKey)
    if (raw === null) return null
    const value = Number(raw)
    return Number.isFinite(value) && value > 0 ? value : null
  } catch { return null }
}

export function writeChatWidth(value: number | null, storage?: WriteStorage) {
  try {
    const target = storage ?? globalThis.localStorage
    if (value === null) target.removeItem(chatWidthKey)
    else target.setItem(chatWidthKey, String(Math.round(value)))
  } catch { /* storage restrictions do not block resizing */ }
}

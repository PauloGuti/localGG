import type { Advice } from '@localgg/engine'

export type OverlayState =
  | { status: 'waiting' }
  | { status: 'loading-data' }
  | { status: 'in-game'; gameTime: number; advice: Advice; patch: string }
  | { status: 'error'; message: string }

export const STATE_CHANNEL = 'overlay:state'

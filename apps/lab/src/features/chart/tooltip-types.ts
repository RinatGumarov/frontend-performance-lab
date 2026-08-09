export interface TooltipSnapshot {
  visible: boolean;
  x: number;
  y: number;
  tradeId: number | null;
  pnl: number | null;
}

export const HIDDEN_TOOLTIP: TooltipSnapshot = Object.freeze({
  visible: false,
  x: 0,
  y: 0,
  tradeId: null,
  pnl: null,
});

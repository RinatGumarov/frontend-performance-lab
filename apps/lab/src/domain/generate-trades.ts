import type { DatasetSize, Trade } from './trade';

const START_TIMESTAMP = 1_735_689_600_000;
const MINUTE_MS = 60_000;
const PRICE_ANCHOR = 100;

function createMulberry32(seed: number): () => number {
  let state = seed >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function integerBetween(random: () => number, min: number, max: number): number {
  return Math.floor(random() * (max - min + 1)) + min;
}

export function generateTrades(count: DatasetSize, seed = 42): Trade[] {
  const random = createMulberry32(seed);
  const trades = new Array<Trade>(count);
  let openedAt = START_TIMESTAMP;
  let previousExitPrice = PRICE_ANCHOR;
  let cumulativePnl = 0;

  for (let index = 0; index < count; index += 1) {
    openedAt += integerBetween(random, 1, 60) * MINUTE_MS;
    const closedAt =
      openedAt + integerBetween(random, 1, 240) * MINUTE_MS;
    const side = random() >= 0.5 ? 'long' : 'short';
    const meanReversion = (PRICE_ANCHOR - previousExitPrice) * 0.03;
    const entryNoise = (random() - 0.5) * 1.8;
    const entryPrice = roundCurrency(
      Math.max(1, previousExitPrice + meanReversion + entryNoise),
    );
    const priceMove = (random() - 0.5) * 0.025;
    const exitPrice = roundCurrency(Math.max(1, entryPrice * (1 + priceMove)));
    const quantity = roundCurrency(0.1 + random() * 9.9);
    const signedMove =
      side === 'long' ? exitPrice - entryPrice : entryPrice - exitPrice;
    const pnl = roundCurrency(signedMove * quantity);
    cumulativePnl = roundCurrency(cumulativePnl + pnl);

    trades[index] = {
      id: index + 1,
      openedAt,
      closedAt,
      side,
      entryPrice,
      exitPrice,
      quantity,
      pnl,
      cumulativePnl,
    };
    openedAt = closedAt;
    previousExitPrice = exitPrice;
  }

  return trades;
}

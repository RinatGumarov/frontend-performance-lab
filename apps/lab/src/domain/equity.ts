import type { EquityPoint, Trade } from './trade';

const DEFAULT_INITIAL_CAPITAL = 100_000;

function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function toEquityPoint(
  trade: Trade,
  initialCapital: number,
): EquityPoint {
  return {
    time: trade.closedAt,
    value: roundCurrency(initialCapital + trade.cumulativePnl),
    tradeId: trade.id,
    pnl: trade.pnl,
  };
}

export function toEquitySeries(
  trades: readonly Trade[],
  initialCapital = DEFAULT_INITIAL_CAPITAL,
): EquityPoint[] {
  return trades.map((trade) => toEquityPoint(trade, initialCapital));
}

export function toBoundedEquitySeries(
  trades: readonly Trade[],
  maxPoints: number,
  initialCapital = DEFAULT_INITIAL_CAPITAL,
): EquityPoint[] {
  if (!Number.isInteger(maxPoints) || maxPoints < 4) {
    throw new RangeError('maxPoints must be an integer greater than or equal to 4');
  }
  if (trades.length <= maxPoints) {
    return toEquitySeries(trades, initialCapital);
  }

  const interiorCount = trades.length - 2;
  const bucketCount = Math.floor((maxPoints - 2) / 2);
  const selectedIndices = [0];

  for (let bucket = 0; bucket < bucketCount; bucket += 1) {
    const start = 1 + Math.floor((bucket * interiorCount) / bucketCount);
    const end =
      1 + Math.floor(((bucket + 1) * interiorCount) / bucketCount);
    let minimumIndex = start;
    let maximumIndex = start;

    for (let index = start + 1; index < end; index += 1) {
      if (
        trades[index]!.cumulativePnl <
        trades[minimumIndex]!.cumulativePnl
      ) {
        minimumIndex = index;
      }
      if (
        trades[index]!.cumulativePnl >
        trades[maximumIndex]!.cumulativePnl
      ) {
        maximumIndex = index;
      }
    }

    if (minimumIndex === maximumIndex) {
      selectedIndices.push(minimumIndex);
    } else if (minimumIndex < maximumIndex) {
      selectedIndices.push(minimumIndex, maximumIndex);
    } else {
      selectedIndices.push(maximumIndex, minimumIndex);
    }
  }

  selectedIndices.push(trades.length - 1);
  return selectedIndices.map((index) =>
    toEquityPoint(trades[index]!, initialCapital),
  );
}

import { useState } from 'react';
import { formatMoney, formatMoneyCompact } from '../money/money';
import { formatMonthLong, formatMonthShort } from '../months/month';
import type { MonthTotals } from './summary-api';

const WIDTH = 640;
const HEIGHT = 240;
const PLOT = { top: 16, right: 8, bottom: 32, left: 56 };
const BAR_WIDTH = 18;
const BAR_GAP = 2;
const TICK_COUNT = 4;

const SERIES = [
  { key: 'incomeCents', label: 'Income', className: 'series-income' },
  { key: 'expenseCents', label: 'Expenses', className: 'series-expense' },
] as const;

function niceCeiling(maxCents: number): number {
  if (maxCents <= 0) return 100_000;
  const magnitude = 10 ** Math.floor(Math.log10(maxCents));
  const step = [1, 2, 2.5, 5, 10].find((multiplier) => multiplier * magnitude >= maxCents) ?? 10;
  return step * magnitude;
}

function roundedTopBar(x: number, y: number, width: number, height: number): string {
  const radius = Math.min(4, height);
  return `M${x},${y + height} V${y + radius} Q${x},${y} ${x + radius},${y} H${x + width - radius} Q${x + width},${y} ${x + width},${y + radius} V${y + height} Z`;
}

export function TrendChart({ trend, selectedMonth }: { trend: MonthTotals[]; selectedMonth: string }) {
  const [hovered, setHovered] = useState<number | null>(null);
  const plotWidth = WIDTH - PLOT.left - PLOT.right;
  const plotHeight = HEIGHT - PLOT.top - PLOT.bottom;
  const ceiling = niceCeiling(Math.max(...trend.flatMap((point) => [point.incomeCents, point.expenseCents])));
  const slot = plotWidth / trend.length;
  const scaleY = (cents: number) => (cents / ceiling) * plotHeight;
  const ticks = Array.from({ length: TICK_COUNT + 1 }, (_, index) => (ceiling / TICK_COUNT) * index);
  const hoveredPoint = hovered === null ? null : trend[hovered];

  return (
    <figure className="chart">
      <div className="chart__legend" aria-hidden="true">
        {SERIES.map((series) => (
          <span key={series.key} className="legend-item">
            <span className={`legend-swatch ${series.className}`} />
            {series.label}
          </span>
        ))}
      </div>
      <div className="chart__canvas">
        <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Income and expenses over the last six months">
          {ticks.map((tick) => {
            const y = PLOT.top + plotHeight - scaleY(tick);
            return (
              <g key={tick} className="chart__grid">
                <line x1={PLOT.left} x2={WIDTH - PLOT.right} y1={y} y2={y} />
                <text x={PLOT.left - 8} y={y} dy="0.32em" textAnchor="end">
                  {formatMoneyCompact(tick)}
                </text>
              </g>
            );
          })}
          {trend.map((point, index) => {
            const groupX = PLOT.left + slot * index + slot / 2 - BAR_WIDTH - BAR_GAP / 2;
            const isSelected = point.month === selectedMonth;
            return (
              <g key={point.month} className={hovered !== null && hovered !== index ? 'chart__group is-dimmed' : 'chart__group'}>
                <rect
                  className="chart__hit"
                  x={PLOT.left + slot * index}
                  y={PLOT.top}
                  width={slot}
                  height={plotHeight}
                  onMouseEnter={() => setHovered(index)}
                  onMouseLeave={() => setHovered(null)}
                />
                {SERIES.map((series, seriesIndex) => {
                  const height = scaleY(point[series.key]);
                  if (height <= 0) return null;
                  const x = groupX + seriesIndex * (BAR_WIDTH + BAR_GAP);
                  return <path key={series.key} className={series.className} d={roundedTopBar(x, PLOT.top + plotHeight - height, BAR_WIDTH, height)} />;
                })}
                <text className={isSelected ? 'chart__axis-label is-selected' : 'chart__axis-label'} x={PLOT.left + slot * index + slot / 2} y={HEIGHT - 10} textAnchor="middle">
                  {formatMonthShort(point.month)}
                </text>
              </g>
            );
          })}
          <line className="chart__baseline" x1={PLOT.left} x2={WIDTH - PLOT.right} y1={PLOT.top + plotHeight} y2={PLOT.top + plotHeight} />
        </svg>
        {hoveredPoint && hovered !== null && (
          <div className="chart__tooltip" style={{ left: `${((PLOT.left + slot * (hovered + 0.5)) / WIDTH) * 100}%` }} role="status">
            <strong>{formatMonthLong(hoveredPoint.month)}</strong>
            {SERIES.map((series) => (
              <span key={series.key} className="tooltip-row">
                <span className={`legend-swatch ${series.className}`} />
                {series.label}
                <b>{formatMoney(hoveredPoint[series.key])}</b>
              </span>
            ))}
          </div>
        )}
      </div>
      <table className="visually-hidden">
        <caption>Monthly income and expenses</caption>
        <thead>
          <tr>
            <th scope="col">Month</th>
            <th scope="col">Income</th>
            <th scope="col">Expenses</th>
          </tr>
        </thead>
        <tbody>
          {trend.map((point) => (
            <tr key={point.month}>
              <th scope="row">{formatMonthLong(point.month)}</th>
              <td>{formatMoney(point.incomeCents)}</td>
              <td>{formatMoney(point.expenseCents)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}

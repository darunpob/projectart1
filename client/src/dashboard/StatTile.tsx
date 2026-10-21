interface StatTileProps {
  label: string;
  figure: string;
  caption?: string;
  tone?: 'income' | 'expense' | 'neutral';
}

export function StatTile({ label, figure, caption, tone = 'neutral' }: StatTileProps) {
  return (
    <article className={`stat-tile stat-tile--${tone}`}>
      <span className="stat-tile__label">{label}</span>
      <strong className="stat-tile__figure">{figure}</strong>
      {caption && <span className="stat-tile__caption">{caption}</span>}
    </article>
  );
}

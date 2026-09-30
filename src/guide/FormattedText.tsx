import { memo, type CSSProperties, type ReactNode } from 'react';
import type { ContentItem } from './types';

const URL_RE = /(https?:\/\/[^\s]+)/g;

function colorOf(item: ContentItem): string | undefined {
  const c = item.formatting?.color;
  if (!c) return undefined;
  const r = c.r ?? 0, g = c.g ?? 0, b = c.b ?? 0;
  // Plain black is the doc's default body colour; let the theme decide instead.
  if (r + g + b < 0.05) return undefined;
  return `rgb(${Math.round(r * 255)}, ${Math.round(g * 255)}, ${Math.round(b * 255)})`;
}

function renderItem(item: ContentItem, key: number): ReactNode {
  const f = item.formatting ?? {};
  const style: CSSProperties = {};
  if (f.bold) style.fontWeight = 700;
  if (f.italic) style.fontStyle = 'italic';
  const deco = [f.underline && 'underline', f.strikethrough && 'line-through'].filter(Boolean);
  if (deco.length) style.textDecoration = deco.join(' ');
  const color = colorOf(item);
  // Doc colours are chosen for a white page; CSS lightens them in dark mode.
  const className = color ? 'tc' : undefined;
  if (color) (style as Record<string, string>)['--c'] = color;

  const href = (item.isLink && item.url) || (f.isLink && f.url) || undefined;
  if (href) {
    return (
      <a key={key} href={href} target="_blank" rel="noreferrer" className={className} style={style}>
        {item.text}
      </a>
    );
  }

  if (URL_RE.test(item.text)) {
    URL_RE.lastIndex = 0;
    const parts = item.text.split(URL_RE);
    return (
      <span key={key} className={className} style={style}>
        {parts.map((p, i) =>
          i % 2 === 1 ? (
            <a key={i} href={p} target="_blank" rel="noreferrer">
              {p}
            </a>
          ) : (
            p
          )
        )}
      </span>
    );
  }

  return (
    <span key={key} className={className} style={style}>
      {item.text}
    </span>
  );
}

export const FormattedText = memo(function FormattedText({ content }: { content: ContentItem[] }) {
  return <>{content.map(renderItem)}</>;
});

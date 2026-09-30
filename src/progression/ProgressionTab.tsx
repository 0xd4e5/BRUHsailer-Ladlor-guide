import { Fragment, useMemo } from 'react';
import { LADLOR_RAW } from '../remote';
import { usePersistentState } from '../storage';

export interface MilestoneMeta {
  imgUrl: string; // e.g. "/images/item_icons/1725.png"
  wikiUrl: string;
  type: string; // "" | "skill" | "slayer" | ...
}

export interface LadlorData {
  main: string[][];
  retirement: string[][];
  meta: Record<string, MilestoneMeta>;
}

// Icons for the current chart are bundled; anything added upstream later
// loads straight from the chart's GitHub repo.
const localIcon = (imgUrl: string) => `ladlor-icons${imgUrl.replace(/^\/images/, '')}`;
const remoteIcon = (imgUrl: string) => `${LADLOR_RAW}/frontend/public${imgUrl}`;

function Chart({
  sequence,
  meta,
  done,
  onToggle,
}: {
  sequence: string[][];
  meta: Record<string, MilestoneMeta>;
  done: Set<string>;
  onToggle: (m: string) => void;
}) {
  const groups = sequence.map((g) => g.filter((m) => meta[m])).filter((g) => g.length);
  return (
    <div className="chart">
      {groups.map((group, i) => (
        <Fragment key={i}>
          <div className="node-group" style={{ gridTemplateColumns: `repeat(${group.length <= 3 ? group.length : Math.ceil(group.length / 2)}, 44px)` }}>
            {group.map((m) => {
              const md = meta[m];
              const isSkill = md.type === 'skill' || /^\d{1,2} \w+/.test(m);
              return (
                <button
                  key={m}
                  className={`node${done.has(m) ? ' done' : ''}`}
                  title={`${m}\n(right-click: open wiki)`}
                  aria-label={m}
                  aria-pressed={done.has(m)}
                  onClick={() => onToggle(m)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    if (/^https?:\/\//i.test(md.wikiUrl)) window.open(md.wikiUrl, '_blank', 'noopener');
                  }}
                >
                  <img
                    src={localIcon(md.imgUrl)}
                    alt=""
                    draggable={false}
                    loading="lazy"
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (!img.dataset.fallback) {
                        img.dataset.fallback = '1';
                        img.src = remoteIcon(md.imgUrl);
                      }
                    }}
                  />
                  {isSkill && <span className="lvl">{m.split(' ')[0]}</span>}
                </button>
              );
            })}
          </div>
          {i < groups.length - 1 && <div className="arrow" aria-hidden="true" />}
        </Fragment>
      ))}
    </div>
  );
}

export default function ProgressionTab({ data }: { data: LadlorData }) {
  // Same key and format (array of milestone names) as ladlorchart.com.
  const [doneList, setDoneList] = usePersistentState<string[]>('milestonesComplete', []);
  const [showRetirement, setShowRetirement] = usePersistentState<boolean>('showRetirement', false);
  const done = useMemo(() => new Set(doneList), [doneList]);

  const toggle = (m: string) =>
    setDoneList((list) => (list.includes(m) ? list.filter((x) => x !== m) : [...list, m]));

  return (
    <>
      <div className="toolbar">
        <p className="toolbar-note">
          Click an item to mark it obtained. Right-click opens its wiki page.
        </p>
        <div className="tools">
          <button className={showRetirement ? 'on' : ''} aria-pressed={showRetirement} onClick={() => setShowRetirement((v) => !v)}>
            Retirement home
          </button>
          <button
            className="danger"
            onClick={() => window.confirm('Reset progression chart?') && setDoneList([])}
          >
            Reset progress
          </button>
        </div>
      </div>
      <div className="progression">
        <Chart sequence={data.main} meta={data.meta} done={done} onToggle={toggle} />
        {showRetirement && (
          <>
            <h2 className="chart-heading">Retirement home</h2>
            <Chart sequence={data.retirement} meta={data.meta} done={done} onToggle={toggle} />
          </>
        )}
      </div>
    </>
  );
}

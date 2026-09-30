import { useEffect, useState } from 'react';
import GuideTab, { type Variant } from './guide/GuideTab';
import type { GuideData } from './guide/types';
import ProgressionTab, { type LadlorData, type MilestoneMeta } from './progression/ProgressionTab';
import { fetchWithFallback, GUIDE_RAW, LADLOR_RAW, useAsync } from './remote';
import { usePersistentState } from './storage';

type Tab = 'guide' | 'progression';
type Theme = 'auto' | 'light' | 'dark';

const GUIDE_DOC = 'https://docs.google.com/document/d/1CBkFM70SnrW4hJXvHM2F1fYCuBF_fRnEXnTYgRnRkAE';
const GUIDE_FILE: Record<Variant, string> = { main: 'guide_data.json', landlubber: 'guide_data_landlubber.json' };

const tabFromHash = (): Tab => (location.hash === '#progression' ? 'progression' : 'guide');

function formatDate(s: string) {
  const d = new Date(`${s}T00:00:00`);
  return isNaN(d.getTime()) ? s : d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function loadLadlor(): Promise<LadlorData> {
  const f = <T,>(remotePath: string, local: string) => fetchWithFallback<T>(`${LADLOR_RAW}/${remotePath}`, `data/ladlor/${local}`);
  return Promise.all([
    f<string[][]>('data/logic/milestone-sequence-main.json', 'milestone-sequence-main.json'),
    f<string[][]>('data/logic/milestone-sequence-retirement.json', 'milestone-sequence-retirement.json'),
    f<Record<string, MilestoneMeta>>('data/generated/milestone-metadata.json', 'milestone-metadata.json'),
  ]).then(([main, retirement, meta]) => ({ main, retirement, meta }));
}

export default function App() {
  const [tab, setTab] = useState<Tab>(tabFromHash);
  const [theme, setTheme] = usePersistentState<Theme>('theme', 'auto');
  const [variant, setVariant] = usePersistentState<Variant>('guideVariant', 'main');

  useEffect(() => {
    const onHash = () => setTab(tabFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  useEffect(() => {
    if (theme === 'auto') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  // Tagged with its variant so a stale result is never rendered under the new one.
  const guide = useAsync(
    () =>
      fetchWithFallback<GuideData>(`${GUIDE_RAW}/${GUIDE_FILE[variant]}`, `data/${GUIDE_FILE[variant]}`).then(
        (data) => ({ variant, data })
      ),
    [variant]
  );
  const guideData = guide.data?.variant === variant ? guide.data.data : null;
  // Only fetched once the Progression tab is first opened.
  const [ladlorWanted, setLadlorWanted] = useState(tab === 'progression');
  useEffect(() => {
    if (tab === 'progression') setLadlorWanted(true);
  }, [tab]);
  const ladlor = useAsync(() => ((ladlorWanted ? loadLadlor() : null)), [ladlorWanted]);

  const go = (t: Tab) => {
    history.replaceState(null, '', `#${t}`);
    setTab(t);
  };

  return (
    <>
      <header className="banner">
        <h1>BRUHsailer</h1>
        <p className="credit">
          An ironman guide by <strong>So Iron BRUH</strong> and <strong>ParasailerOSRS</strong> · web version by{' '}
          <a href="https://github.com/umkyzn/BRUHsailer" target="_blank" rel="noreferrer">kyyznn</a>
        </p>
        <p className="links">
          <a href={GUIDE_DOC} target="_blank" rel="noreferrer">Original guide (Google Doc)</a>
          <a href="https://umkyzn.github.io/BRUHsailer/" target="_blank" rel="noreferrer">Original web version</a>
          {guideData && <span className="updated">Last updated: {formatDate(guideData.updatedOn)}</span>}
        </p>
      </header>

      <nav className="tabs">
        <div className="tab-list" role="tablist">
          <button role="tab" aria-selected={tab === 'guide'} onClick={() => go('guide')}>
            Guide
          </button>
          <button role="tab" aria-selected={tab === 'progression'} onClick={() => go('progression')}>
            Progression
          </button>
        </div>
        <div className="theme-switch" role="radiogroup" aria-label="Colour theme">
          {(['auto', 'light', 'dark'] as Theme[]).map((t) => (
            <button key={t} role="radio" aria-checked={theme === t} onClick={() => setTheme(t)}>
              {t === 'auto' ? 'Auto' : t === 'light' ? 'Light' : 'Dark'}
            </button>
          ))}
        </div>
      </nav>

      <main>
        <div hidden={tab !== 'guide'}>
          {guide.error && <p className="status error">Couldn't load the guide: {guide.error}</p>}
          {!guideData && !guide.error && <p className="status">Loading guide…</p>}
          {guideData && <GuideTab key={variant} data={guideData} variant={variant} onVariantChange={setVariant} />}
        </div>
        <div hidden={tab !== 'progression'}>
          <p className="chart-credit">
            <a href="https://ladlorchart.com/" target="_blank" rel="noreferrer">Ladlor's Interactive Gear Progression Chart</a>{' '}
            by Ladlor, Mads S. Balto and the Ironscape Discord community.
          </p>
          {ladlor.error && <p className="status error">Couldn't load the chart: {ladlor.error}</p>}
          {!ladlor.data && !ladlor.error && <p className="status">Loading chart…</p>}
          {ladlor.data && <ProgressionTab data={ladlor.data} />}
        </div>
      </main>
    </>
  );
}

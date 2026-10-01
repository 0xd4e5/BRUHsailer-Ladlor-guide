// DOM helpers for search marks and user highlights. Both are applied directly
// to the (memoized, never re-rendered) step bodies, the same way the original
// site does it, because a highlight can cover any arbitrary text selection.

import type { Highlight, HighlightColor } from './types';

function unwrap(el: Element) {
  const parent = el.parentNode;
  if (!parent) return;
  while (el.firstChild) parent.insertBefore(el.firstChild, el);
  parent.removeChild(el);
  (parent as Element).normalize();
}

function textNodes(root: Node): Text[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const out: Text[] = [];
  while (walker.nextNode()) out.push(walker.currentNode as Text);
  return out;
}

export function clearSearchMarks(root: HTMLElement) {
  root.querySelectorAll('mark.search-hit').forEach(unwrap);
}

export function markSearchTerm(el: HTMLElement, term: string) {
  const lc = term.toLowerCase();
  for (const node of textNodes(el)) {
    const val = node.nodeValue ?? '';
    const lcVal = val.toLowerCase();
    if (!lcVal.includes(lc)) continue;
    const frag = document.createDocumentFragment();
    let last = 0;
    let idx: number;
    while ((idx = lcVal.indexOf(lc, last)) !== -1) {
      if (idx > last) frag.appendChild(document.createTextNode(val.slice(last, idx)));
      const mark = document.createElement('mark');
      mark.className = 'search-hit';
      mark.textContent = val.slice(idx, idx + lc.length);
      frag.appendChild(mark);
      last = idx + lc.length;
    }
    if (last < val.length) frag.appendChild(document.createTextNode(val.slice(last)));
    node.parentNode?.replaceChild(frag, node);
  }
}

export function clearHighlights(root: HTMLElement) {
  root.querySelectorAll('.hl').forEach(unwrap);
}

function wrap(node: Text, start: number, end: number, color: HighlightColor, group: string) {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const span = document.createElement('span');
  span.className = `hl hl-${color}`;
  span.dataset.hl = group;
  range.surroundContents(span);
}

const newGroup = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

/**
 * Highlights saved before groups existed: one selection was stored as several
 * entries in a row (same step, same colour). Give each such run one group.
 */
export function withGroups(highlights: Highlight[]): Highlight[] {
  let run = 0;
  return highlights.map((h, i) => {
    if (h.group) return h;
    const prev = highlights[i - 1];
    if (!prev || prev.group || prev.parentId !== h.parentId || prev.color !== h.color) run++;
    return { ...h, group: `legacy-${run}` };
  });
}

/** Character offset of the start of `node` within `body`'s text. */
function offsetOf(body: Node, node: Node): number {
  const r = document.createRange();
  r.setStart(body, 0);
  r.setEndBefore(node);
  return r.toString().length;
}

/** Wrap the text between two character offsets of `body` (may span several text nodes). */
function wrapOffsets(body: Element, start: number, end: number, color: HighlightColor, group: string) {
  const parts: [Text, number, number][] = [];
  let acc = 0;
  for (const node of textNodes(body)) {
    const len = node.length;
    const s = Math.max(start, acc);
    const e = Math.min(end, acc + len);
    if (s < e) parts.push([node, s - acc, e - acc]);
    acc += len;
    if (acc >= end) break;
  }
  for (const [node, s, e] of parts) wrap(node, s, e, color, group);
}

export function applyHighlights(root: HTMLElement, highlights: Highlight[]) {
  clearHighlights(root);
  // Where the previous piece of each group ended, for the text-search fallback.
  const groupEnd = new Map<string, number>();
  for (const h of highlights) {
    const body = root.querySelector(`#${CSS.escape(h.parentId)} .step-body`);
    if (!body || !h.htmlContent) continue;
    const group = h.group ?? newGroup();
    const text = body.textContent ?? '';
    let start = h.start ?? -1;
    // Saved position no longer matches (older save, or the guide text changed): search instead.
    if (text.slice(start, start + h.htmlContent.length) !== h.htmlContent) {
      start = text.indexOf(h.htmlContent, groupEnd.get(group) ?? 0);
      if (start === -1) start = text.indexOf(h.htmlContent);
      if (start === -1) continue;
    }
    wrapOffsets(body, start, start + h.htmlContent.length, h.color, group);
    groupEnd.set(group, start + h.htmlContent.length);
  }
}

/** Read highlights back from the page; touching pieces of one selection are saved as one entry. */
export function collectHighlights(root: HTMLElement): Highlight[] {
  const out: Highlight[] = [];
  root.querySelectorAll<HTMLElement>('.hl').forEach((span) => {
    const step = span.closest('.step');
    const body = span.closest('.step-body');
    const text = span.textContent ?? '';
    if (!step?.id || !body || !text) return;
    const color = [...span.classList].find((c) => c.startsWith('hl-'))?.slice(3) as HighlightColor;
    const start = offsetOf(body, span);
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.parentId === step.id &&
      prev.group === span.dataset.hl &&
      prev.color === color &&
      prev.start! + prev.htmlContent.length === start
    ) {
      prev.htmlContent += text;
    } else {
      out.push({ parentId: step.id, htmlContent: text, color, group: span.dataset.hl, start });
    }
  });
  return out;
}

/** Wrap the current selection (within a single step body) in highlight spans. Returns true if anything changed. */
export function highlightSelection(root: HTMLElement, color: HighlightColor): boolean {
  const sel = window.getSelection();
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  const range = sel.getRangeAt(0);
  const startEl =
    range.startContainer instanceof Element ? range.startContainer : range.startContainer.parentElement;
  const body = startEl?.closest('.step-body');
  if (!body || !root.contains(body)) return false;

  const hit = textNodes(body).filter((t) => range.intersectsNode(t));
  const group = newGroup();
  let changed = false;
  for (const t of hit) {
    const start = t === range.startContainer ? range.startOffset : 0;
    const end = t === range.endContainer ? range.endOffset : (t.nodeValue ?? '').length;
    if (start >= end || !(t.nodeValue ?? '').slice(start, end).trim()) continue;
    // Re-colour instead of nesting when the text is already highlighted.
    const existing = t.parentElement?.closest<HTMLElement>('.hl');
    if (existing) {
      existing.className = `hl hl-${color}`;
      existing.dataset.hl = group;
    } else wrap(t, start, end, color, group);
    changed = true;
  }
  sel.removeAllRanges();
  if (changed) mergeAdjacent(body);
  return changed;
}

function mergeAdjacent(body: Element) {
  body.querySelectorAll<HTMLElement>('.hl').forEach((span) => {
    let next = span.nextSibling;
    while (
      next instanceof HTMLElement &&
      next.classList.contains('hl') &&
      next.className === span.className &&
      next.dataset.hl === span.dataset.hl
    ) {
      span.textContent = (span.textContent ?? '') + (next.textContent ?? '');
      const rm = next;
      next = next.nextSibling;
      rm.remove();
    }
  });
}

/** Remove the whole highlight (every piece of its selection) under the click. */
export function removeHighlightAt(target: EventTarget | null): boolean {
  const span = target instanceof HTMLElement ? target.closest<HTMLElement>('.hl') : null;
  if (!span) return false;
  const group = span.dataset.hl;
  const scope = span.closest('.step') ?? span.parentElement;
  const pieces = group && scope ? [...scope.querySelectorAll<HTMLElement>('.hl')].filter((s) => s.dataset.hl === group) : [span];
  pieces.forEach(unwrap);
  return true;
}

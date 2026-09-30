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

function wrap(node: Text, start: number, end: number, color: HighlightColor) {
  const range = document.createRange();
  range.setStart(node, start);
  range.setEnd(node, end);
  const span = document.createElement('span');
  span.className = `hl hl-${color}`;
  range.surroundContents(span);
}

export function applyHighlights(root: HTMLElement, highlights: Highlight[]) {
  clearHighlights(root);
  for (const h of highlights) {
    const stepEl = root.querySelector(`#${CSS.escape(h.parentId)} .step-body`);
    if (!stepEl || !h.htmlContent) continue;
    for (const node of textNodes(stepEl)) {
      if (node.parentElement?.classList.contains('hl')) continue;
      const idx = node.nodeValue?.indexOf(h.htmlContent) ?? -1;
      if (idx === -1) continue;
      wrap(node, idx, idx + h.htmlContent.length, h.color);
      break;
    }
  }
}

export function collectHighlights(root: HTMLElement): Highlight[] {
  const out: Highlight[] = [];
  root.querySelectorAll<HTMLElement>('.hl').forEach((span) => {
    const step = span.closest('.step');
    const color = [...span.classList].find((c) => c.startsWith('hl-'))?.slice(3) as HighlightColor;
    if (step?.id && span.textContent) out.push({ parentId: step.id, htmlContent: span.textContent, color });
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
  let changed = false;
  for (const t of hit) {
    const start = t === range.startContainer ? range.startOffset : 0;
    const end = t === range.endContainer ? range.endOffset : (t.nodeValue ?? '').length;
    if (start >= end || !(t.nodeValue ?? '').slice(start, end).trim()) continue;
    // Re-colour instead of nesting when the text is already highlighted.
    const existing = t.parentElement?.closest('.hl');
    if (existing) existing.className = `hl hl-${color}`;
    else wrap(t, start, end, color);
    changed = true;
  }
  sel.removeAllRanges();
  if (changed) mergeAdjacent(body);
  return changed;
}

function mergeAdjacent(body: Element) {
  body.querySelectorAll('.hl').forEach((span) => {
    let next = span.nextSibling;
    while (next instanceof HTMLElement && next.classList.contains('hl') && next.className === span.className) {
      span.textContent = (span.textContent ?? '') + (next.textContent ?? '');
      const rm = next;
      next = next.nextSibling;
      rm.remove();
    }
  });
}

export function removeHighlightAt(target: EventTarget | null): boolean {
  const span = target instanceof Element ? target.closest('.hl') : null;
  if (!span) return false;
  unwrap(span);
  return true;
}

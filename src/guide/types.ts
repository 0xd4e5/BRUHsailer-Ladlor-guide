export interface Formatting {
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  color?: { r?: number; g?: number; b?: number };
  url?: string;
  isLink?: boolean;
}

export interface ContentItem {
  text: string;
  url?: string;
  isLink?: boolean;
  formatting?: Formatting;
}

export interface Step {
  content: ContentItem[];
  nestedContent?: { level: number; content: ContentItem[] }[];
  metadata?: Record<string, string | undefined>;
}

export interface Chapter {
  title: string;
  titleFormatted?: ContentItem[];
  sections: { title: string; steps: Step[] }[];
  footnotes?: { content: ContentItem[] }[];
}

export interface GuideData {
  updatedOn: string;
  chapters: Chapter[];
}

export type HighlightColor = 'green' | 'yellow' | 'blue' | 'pink' | 'red' | 'purple';
export const HIGHLIGHT_COLORS: HighlightColor[] = ['green', 'yellow', 'blue', 'pink', 'red', 'purple'];

// Same shape the original site stores, so its localStorage entries can be copied over.
export interface Highlight {
  parentId: string; // e.g. "step-1-4"
  htmlContent: string; // highlighted text
  color: HighlightColor;
  group?: string; // all pieces of one selection share a group, so they're removed together
}

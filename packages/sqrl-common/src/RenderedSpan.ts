interface RenderedSpanText {
  class: string[];
  text: string;
  children?: never;
}
interface RenderedSpanGroup {
  class: string[];
  children: RenderedSpan[];
  text?: never;
}
export type RenderedSpan = RenderedSpanText | RenderedSpanGroup;

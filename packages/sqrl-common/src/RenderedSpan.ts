/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
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

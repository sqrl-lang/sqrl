/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { RenderedSpan } from "sqrl-common";

export function mkSpan(
  classStr: string,
  contents: string | RenderedSpan[]
): RenderedSpan {
  const classes = classStr.split(":");
  if (typeof contents === "string") {
    return {
      class: classes,
      text: contents,
    };
  } else {
    return {
      class: classes,
      children: contents,
    };
  }
}

function indentRecurse(span: RenderedSpan, indentString: string) {
  if (span.children) {
    return {
      ...span,
      children: span.children.map((child) =>
        indentRecurse(child, indentString)
      ),
    };
  } else {
    return {
      ...span,
      text: span.text.replace(/\n/g, `\n${indentString}`),
    };
  }
}

export function indentSpan(span: RenderedSpan, spaces: number): RenderedSpan {
  const indentString = " ".repeat(spaces);
  return mkSpan("", [
    mkSpan("", indentString),
    indentRecurse(span, indentString),
  ]);
}

import { RenderedSpan } from "sqrl-common";
import chalk from "chalk";

const classColor = {
  type: "magentaBright",
  "type:syntax": "magenta",
  value: "blueBright",
  separator: "blue",
  "value:json": "gray"
};

export function spanToShell(span: RenderedSpan): string {
  let color: string = null;
  for (let idx = 0; idx < span.class.length; idx++) {
    const joined = span.class.slice(0, idx + 1).join(":");
    color = classColor[joined] || color;
  }

  let rv: string;
  if (span.children) {
    rv = span.children.map(child => spanToShell(child)).join("");
  } else {
    rv = span.text;
  }
  if (color) {
    return chalk[color](rv);
  } else {
    return rv;
  }
}

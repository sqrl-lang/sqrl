import { format as utilFormat } from "util";

export function invariant(condition: any, format: string, ...message: any[]) {
  if (!condition) {
    throw new Error(utilFormat(format, ...message));
  }
}

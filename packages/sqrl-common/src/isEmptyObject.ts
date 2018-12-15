import { invariant } from "./invariant";

export function isEmptyObject(obj: any): boolean {
  invariant(typeof obj === "object", "expected object to be tested");
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      return false;
    }
  }
  return true;
}

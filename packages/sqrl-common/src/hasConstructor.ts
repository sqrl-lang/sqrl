/**
 * Returns true if obj is not JSONifiable without losing constructor information.
 */
export function hasConstructor(obj): boolean {
  if (typeof obj !== "object" || obj === null) {
    return false;
  }

  return obj.constructor !== Object && obj.constructor !== Array;
}

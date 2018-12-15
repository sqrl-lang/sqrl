import { emptyFunction } from "./emptyFunction";
import { invariant } from "./invariant";

export function range(n: number): number[];
export function range<T>(n: number, valueFactory: (n: number) => T): T[];
export function range(n, valueFactory?) {
  invariant(typeof n === "number", "expected range(<number>, [factory])");
  valueFactory = valueFactory || (v => v);
  return rangeFromTo(0, n, valueFactory);
}

export function rangeFromTo(
  from,
  to,
  valueFactory = emptyFunction.thatReturnsArgument
) {
  invariant(
    typeof from === "number" && typeof to === "number",
    "expected range.fromTo(<number>, <number>, [factory])"
  );
  return Array.from(Array(to - from), (_, i) => valueFactory(i + from));
}

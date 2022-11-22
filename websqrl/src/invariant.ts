export function invariant(test: any, message: string): asserts test {
  if (!test) {
    throw new Error(message);
  }
}

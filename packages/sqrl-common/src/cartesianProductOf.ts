/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * Gets Cartesian product of multiple arrays.
 */
export function cartesianProductOf<T>(args: T[][]): T[][] {
  const initial: T[][] = [[]];
  return args.reduce((a, b) => {
    const ret: T[][] = [];
    a.forEach(a => {
      b.forEach(b => {
        ret.push(a.concat([b]));
      });
    });
    return ret;
  }, initial);
}

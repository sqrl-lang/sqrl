/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * Gets Cartesian product of multiple arrays.
 */
export default function cartesianProductOf(...args) {
  return args.reduce(
    (a, b) => {
      const ret = [];
      a.some(a => {
        b.some(b => {
          ret.push(a.concat([b]));
        });
      });
      return ret;
    },
    [[]]
  );
}

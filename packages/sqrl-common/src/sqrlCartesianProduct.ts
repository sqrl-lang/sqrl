/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { cartesianProductOf } from "./cartesianProductOf";
import { invariant } from "./invariant";
import { SqrlObject } from "./SqrlObject";

/**
 * This returns a safe cartesian product of a number of different SQRL values
 */
export function sqrlCartesianProduct<T>(
  featureValues?: [T | T[]][],
  options: {
    maxArrays?: number;
  } = {}
): T[][] {
  const hasEmpty: boolean = featureValues.some(v => {
    return !SqrlObject.isTruthy(v);
  });

  if (hasEmpty || featureValues.length === 0) {
    return [];
  }

  let arrayCount: number = 0;
  const valueArrays: any[][] = featureValues.map(featureValue => {
    if (Array.isArray(featureValue)) {
      arrayCount += 1;
      return featureValue.filter(i => i);
    } else if (featureValue) {
      return [featureValue];
    }
    return [];
  });

  invariant(
    !options.maxArrays || arrayCount <= options.maxArrays,
    `Exceeded sqrl maximum array count:: ${arrayCount} of ${options.maxArrays}`
  );

  return cartesianProductOf(valueArrays);
}

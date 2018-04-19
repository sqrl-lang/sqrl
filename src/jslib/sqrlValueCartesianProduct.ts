/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import cartesianProductOf from "./cartesianProductOf";
import invariant from "../jslib/invariant";

export interface Options {
  maxArrays?: number;
}

export default function sqrlValueCartesianProduct(
  featureValues?: any[],
  options: Options = {}
): any[] {
  const hasEmpty: boolean = featureValues.some(
    (v): boolean => {
      return v === null || v === "" || (Array.isArray(v) && v.length === 0);
    }
  );

  if (hasEmpty || featureValues.length === 0) {
    return [];
  }

  let arrayCount: number = 0;
  const valueArrays: any[] = featureValues.map(featureValue => {
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

  return cartesianProductOf(...valueArrays);
}

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlFunctionRegistry } from "./FunctionRegistry";

import { SqrlKey } from "../object/SqrlKey";

import { murmurhashJsonBuffer } from "../jslib/murmurhashJson";
import { SqrlObject } from "../object/SqrlObject";
import { nice } from "node-nice";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import SqrlNode from "../object/SqrlNode";
import { Context } from "../api/ctx";
import { sqrlCartesianProduct } from "sqrl-common";

export async function buildKey40(
  ctx: Context,
  counterNode: SqrlNode,
  ...featureValues: Array<any>
): Promise<SqrlKey | null> {
  const hasEmpty = featureValues.some(v => {
    return v === null || v === "";
  });
  if (hasEmpty) {
    return null;
  }

  // Search through all the values for Node/UniqueId
  let timeMs = counterNode.uniqueId.getTimeMs();
  for (const value of featureValues) {
    if (value instanceof SqrlObject) {
      timeMs = Math.max(timeMs, value.tryGetTimeMs() || 0);
    }
  }

  const basicFeatureValues = await nice(() =>
    SqrlObject.ensureBasic(featureValues)
  );
  let featuresHash: Buffer;
  if (featureValues.length) {
    featuresHash = await murmurhashJsonBuffer(basicFeatureValues);
  } else {
    featuresHash = Buffer.alloc(16);
  }
  return new SqrlKey(
    ctx.requireDatabaseSet(),
    counterNode,
    basicFeatureValues,
    timeMs,
    featuresHash
  );
}

async function getKeyList(
  ctx: Context,
  counterNode?,
  ...featureValues: Array<any>
): Promise<SqrlKey[]> {
  if (counterNode === null) {
    return [];
  }
  if (featureValues.length === 0) {
    return [await buildKey40(ctx, counterNode)];
  }

  return Promise.all(
    sqrlCartesianProduct(featureValues, {
      maxArrays: 1
    }).map(values => buildKey40(ctx, counterNode, ...values))
  );
}

export function registerKeyFunctions(registry: SqrlFunctionRegistry) {
  registry.save(
    async function buildKey40Sqrl(
      state: SqrlExecutionState,
      counterNode: SqrlNode,
      ...args
    ) {
      const key = await buildKey40(state.ctx, counterNode, ...args);
      if (state.manipulator) {
        state.manipulator.trackSqrlKey(key);
      }
      return key;
    },
    {
      name: "_buildKey40",
      allowSqrlObjects: true,
      stateArg: true
    }
  );

  registry.save(
    async function getKeyListSqrl(state: SqrlExecutionState, ...args) {
      const keys = await getKeyList(state.ctx, ...args);
      keys.forEach(key => {
        if (state.manipulator) {
          state.manipulator.trackSqrlKey(key);
        }
      });
      return keys;
    },
    {
      name: "_getKeyList",
      allowSqrlObjects: true,
      allowNull: true,
      stateArg: true
    }
  );
}

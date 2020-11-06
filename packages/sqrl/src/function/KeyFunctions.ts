/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { StdlibRegistry } from "./Instance";

import { SqrlKey } from "../object/SqrlKey";

import { AstTypes as AT } from "../ast/AstTypes";
import { murmurhashJson } from "../jslib/murmurhashJson";
import { SqrlObject } from "../object/SqrlObject";
import { nice } from "node-nice";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import SqrlEntity from "../object/SqrlEntity";
import { Context } from "../api/ctx";
import { sqrlCartesianProduct } from "sqrl-common";

export async function buildKey(
  ctx: Context,
  counterEntity: SqrlEntity,
  ...featureValues: Array<any>
): Promise<SqrlKey | null> {
  const hasEmpty = featureValues.some((v) => {
    return v === null || v === "";
  });
  if (hasEmpty) {
    return null;
  }

  // Search through all the values for Entity/UniqueId
  let timeMs = counterEntity.uniqueId.getTimeMs();
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
    featuresHash = await murmurhashJson(basicFeatureValues);
  } else {
    featuresHash = new Buffer(16);
  }
  return new SqrlKey(
    ctx.requireDatabaseSet(),
    counterEntity,
    basicFeatureValues,
    timeMs,
    featuresHash
  );
}

async function getKeyList(
  ctx: Context,
  counterEntity: SqrlEntity,
  ...featureValues: Array<any>
): Promise<SqrlKey[]> {
  if (counterEntity === null) {
    return [];
  }
  if (featureValues.length === 0) {
    return [await buildKey(ctx, counterEntity)];
  }

  return Promise.all(
    sqrlCartesianProduct(featureValues, {
      maxArrays: 1,
    }).map((values) => buildKey(ctx, counterEntity, ...values))
  );
}

export function registerKeyFunctions(instance: StdlibRegistry) {
  instance.save(
    async function buildKeySqrl(
      state: SqrlExecutionState,
      counterEntity: SqrlEntity,
      ...args
    ) {
      const key = await buildKey(state.ctx, counterEntity, ...args);
      if (state.manipulator) {
        state.manipulator.trackSqrlKey(key);
      }
      return key;
    },
    {
      name: "_buildKey",
      allowSqrlObjects: true,
      args: [AT.state, AT.any.sqrlEntity, AT.any.repeated],
      async: true,
    }
  );

  instance.save(
    async function getKeyListSqrl(
      state: SqrlExecutionState,
      counterEntity: SqrlEntity,
      ...args
    ) {
      const keys = await getKeyList(state.ctx, counterEntity, ...args);
      keys.forEach((key) => {
        if (state.manipulator) {
          state.manipulator.trackSqrlKey(key);
        }
      });
      return keys;
    },
    {
      name: "_getKeyList",
      args: [AT.state, AT.any.sqrlEntity, AT.any.repeated.optional],
      allowSqrlObjects: true,
      allowNull: true,
      async: true,
    }
  );
}

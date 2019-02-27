/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { UniqueId } from "../api/services";
import { SqrlObject } from "./SqrlObject";
import SqrlUniqueId from "./SqrlUniqueId";

import invariant from "../jslib/invariant";
import { EntityId } from "../platform/EntityId";
import { Context } from "../api/ctx";
import { SqrlKey } from "./SqrlKey";
import { nice } from "node-nice";
import { murmurhashJsonBuffer } from "../jslib/murmurhashJson";
import { sqrlCartesianProduct, RenderedSpan } from "sqrl-common";
import { mkSpan, indentSpan } from "./span";

export default class SqrlEntity extends SqrlObject {
  public entityId: EntityId;

  constructor(
    public uniqueId: SqrlUniqueId,
    public type: string,
    public value: string
  ) {
    super();
    if (typeof value === "number") {
      value = value + "";
    }
    invariant(
      typeof value === "string" && value.length > 0,
      "SqrlEntity value expected non-empty string"
    );

    this.entityId = new EntityId(type, value);
    this.uniqueId = uniqueId;
  }

  getEntityId(): EntityId {
    return this.entityId;
  }

  getBasicValue(): string {
    return this.value;
  }
  getNumberString(): string {
    return this.uniqueId.getNumberString();
  }
  tryGetTimeMs(): number {
    return this.uniqueId.getTimeMs();
  }
  getUniqueId(): UniqueId {
    return this.uniqueId.getUniqueId();
  }

  render(): RenderedSpan {
    return mkSpan("type:entity", [
      mkSpan("type:name", "entity"),
      mkSpan("type:syntax", "<"),
      mkSpan("value:entityId", [
        mkSpan("entityId:type", this.entityId.type),
        mkSpan("value:separator", "/"),
        mkSpan("entityId:key", this.entityId.key)
      ]),
      mkSpan("type:syntax", "> {\n"),
      indentSpan(this.uniqueId.render(), 2),
      mkSpan("type:syntax", "\n}")
    ]);
  }

  getData() {
    return {
      type: this.type,
      value: this.value,
      uniqueId: this.uniqueId.getData()
    };
  }

  async buildCounterKey(
    ctx: Context,
    ...featureValues: Array<any>
  ): Promise<SqrlKey | null> {
    const hasEmpty = featureValues.some(v => {
      return v === null || v === "";
    });
    if (hasEmpty) {
      return null;
    }

    // Search through all the values for Entity/UniqueId
    let timeMs = this.uniqueId.getTimeMs();
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
      this,
      basicFeatureValues,
      timeMs,
      featuresHash
    );
  }

  async buildCounterKeyList(
    ctx: Context,
    ...featureValues: Array<any>
  ): Promise<SqrlKey[]> {
    if (featureValues.length === 0) {
      return [await this.buildCounterKey(ctx)];
    }

    return Promise.all(
      sqrlCartesianProduct(featureValues, {
        maxArrays: 1
      }).map(values => this.buildCounterKey(ctx, ...values))
    );
  }
}

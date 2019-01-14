/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { UniqueId } from "../api/services";
import { SqrlObject } from "./SqrlObject";
import SqrlUniqueId from "./SqrlUniqueId";

import invariant from "../jslib/invariant";
import { NodeId } from "../platform/NodeId";
import { Context } from "../api/ctx";
import { SqrlKey } from "./SqrlKey";
import { nice } from "node-nice";
import { murmurhashJsonBuffer } from "../jslib/murmurhashJson";
import { sqrlCartesianProduct, RenderedSpan } from "sqrl-common";
import { mkSpan, indentSpan } from "./span";

export default class SqrlNode extends SqrlObject {
  public nodeId: NodeId;

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
      "SqrlNode value expected non-empty string"
    );

    this.nodeId = new NodeId(type, value);
    this.uniqueId = uniqueId;
  }

  getNodeId(): NodeId {
    return this.nodeId;
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
    return mkSpan("type:node", [
      mkSpan("type:name", "node"),
      mkSpan("type:syntax", "<"),
      mkSpan("value:nodeId", [
        mkSpan("nodeId:type", this.nodeId.type),
        mkSpan("value:separator", "/"),
        mkSpan("nodeId:key", this.nodeId.key)
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

    // Search through all the values for Node/UniqueId
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

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import SqrlNode from "./SqrlNode";
import { SqrlObject } from "./SqrlObject";

import { bufferToHexEncodedAscii } from "../jslib/bufferToHexEncodedAscii";
import invariant from "../jslib/invariant";
import stringify = require("fast-stable-stringify");
import { timeToBuffer } from "../jslib/timeToBuffer";
import { DatabaseSet } from "../api/ctx";
import { RenderedSpan } from "sqrl-common";
import { mkSpan, indentSpan } from "./span";

export class SqrlKey extends SqrlObject {
  public shardValue: number;
  public buffer: Buffer;

  constructor(
    public databaseSet: DatabaseSet,
    public counterNode: SqrlNode,
    public featureValues: any[],
    public timeMs: number,
    public featuresHash: Buffer
  ) {
    super();

    invariant(counterNode instanceof SqrlNode, "Expected SqrlNode for counter");
    invariant(featuresHash.length === 16, "Expected 16 bytes featuresHash");

    const timeMsBuffer = timeToBuffer(this.timeMs);

    this.buffer = Buffer.concat([
      this.databaseSet.getDatasetIdBuffer(),
      this.counterNode.uniqueId.getBuffer(),
      timeMsBuffer,
      this.featuresHash
    ]);
  }

  getDebugString() {
    const counterHash = this.counterNode.getBasicValue().substring(0, 8);
    let featureString = "";
    if (this.featureValues.length) {
      featureString = stringify(this.featureValues);
    }
    return (
      `counter=${counterHash};` +
      `timeMs=${new Date(this.timeMs).toISOString()};` +
      `features=${featureString}`
    );
  }

  render(): RenderedSpan {
    return mkSpan("type:key", [
      mkSpan("", "key {\n"),
      mkSpan("counter", [indentSpan(this.counterNode.render(), 2)]),
      mkSpan("key:time", "\n  time: "),
      mkSpan("value:time", new Date(this.timeMs).toISOString() + "\n"),
      mkSpan("key:features", `  features: `),
      mkSpan(
        "value:features",
        this.featureValues ? stringify(this.featureValues) : "<none>"
      ),
      mkSpan("", "\n}")
    ]);
  }

  getHex(): string {
    return this.buffer.toString("hex");
  }

  tryGetTimeMs() {
    return this.timeMs;
  }

  getShardValue() {
    return this.shardValue;
  }

  getFeatureValues() {
    return this.featureValues;
  }

  getBuffer() {
    return this.buffer;
  }

  getData() {
    return {
      key: bufferToHexEncodedAscii(this.buffer),
      shardValue: this.getShardValue(),
      counter: this.counterNode.getData(),
      time: new Date(this.timeMs).toISOString(),
      featureValues: this.featureValues
    };
  }

  getBasicValue() {
    return this.getHex();
  }
}

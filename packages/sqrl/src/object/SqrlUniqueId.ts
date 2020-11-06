/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlObject } from "./SqrlObject";
import { mkSpan } from "./span";
import { UniqueId } from "../api/entity";

export default class SqrlUniqueId extends SqrlObject {
  constructor(private uniqueId: UniqueId) {
    super();
  }

  getUniqueId(): UniqueId {
    return this.uniqueId;
  }
  getBuffer() {
    return this.uniqueId.getBuffer();
  }
  tryGetTimeMs() {
    return this.uniqueId.getTimeMs();
  }
  getRemainder() {
    return this.uniqueId.getRemainder();
  }
  getNumberString() {
    return this.uniqueId.getNumberString();
  }

  getData() {
    return {
      time: new Date(this.uniqueId.getTimeMs()).toISOString(),
      remaining: this.uniqueId.getRemainder(),
    };
  }

  render() {
    return mkSpan("type:uniqueId", [
      mkSpan("type:name", "uniqueId"),
      mkSpan("type:syntax", "<"),
      mkSpan("value:time", new Date(this.uniqueId.getTimeMs()).toISOString()),
      mkSpan("value:separator", "@"),
      mkSpan("value:remainder", this.uniqueId.getRemainder().toString()),
      mkSpan("type:syntax", ">"),
    ]);
  }

  getBasicValue() {
    return this.uniqueId.getHexString();
  }
}

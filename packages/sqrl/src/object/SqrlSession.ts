/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlKey } from "../";
import { SqrlObject } from "./SqrlObject";

import invariant from "../jslib/invariant";
import { murmurhashHexSync } from "../jslib/murmurhashJson";
import { timeToBuffer } from "../jslib/timeToBuffer";
import { indentSpan, mkSpan } from "./span";

const DATE_FORMAT_LENGTH = "YYYYMMDDHHMMSSMMM".length;

export default class SqrlSession extends SqrlObject {
  readonly id: string;

  constructor(public key: SqrlKey, public startMs: number) {
    super();
    //       key.isSqrlObject && key.constructor.name === "SqrlKey",

    invariant(key instanceof SqrlKey, "Expected SqrlKey for session");
    this.key = key;
    this.startMs = startMs;
    this.id = murmurhashHexSync(
      Buffer.concat([this.key.getBuffer(), timeToBuffer(this.startMs)])
    );
  }

  tryGetTimeMs() {
    return this.startMs;
  }

  getData() {
    return {
      id: this.id,
      key: this.key.getData(),
      startMs: this.startMs,
    };
  }

  render() {
    return mkSpan("type:session", [
      mkSpan("", `session<`),
      mkSpan("value:sessionId", this.id),
      mkSpan("", "> {\n"),
      mkSpan("key:time", "  start: "),
      mkSpan("value:time", new Date(this.startMs).toISOString() + "\n"),
      indentSpan(this.key.render(), 2),
      mkSpan("", "\n}"),
    ]);
  }

  getBasicValue(): string {
    // Semi-hacky way to convert milliseconds to readable hex
    const startISO = new Date(this.startMs).toISOString();
    const dateString = startISO.replace(/[^0-9]/g, "");
    invariant(
      dateString.length === DATE_FORMAT_LENGTH,
      "Non-consistent date string"
    );
    return this.id;
  }
}

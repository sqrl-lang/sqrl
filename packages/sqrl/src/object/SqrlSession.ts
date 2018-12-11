/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import SqrlKey from "./SqrlKey";
import SqrlObject from "./SqrlObject";

import invariant from "../jslib/invariant";
import chalk from "chalk";
import { indent } from "../jslib/indent";
import { murmurhashHexSync } from "../jslib/murmurhashJson";
import { timeToBuffer } from "../jslib/timeToBuffer";

const DATE_FORMAT_LENGTH = "YYYYMMDDHHMMSSMMM".length;

export default class SqrlSession extends SqrlObject {
  readonly id: string;

  constructor(public key: SqrlKey, public startMs: number) {
    super();
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
      startMs: this.startMs
    };
  }

  renderText() {
    return chalk.grey(
      `session<${chalk.blue(this.id)}> {\n` +
        `  start: ${chalk.blue(new Date(this.startMs).toISOString())}\n` +
        `${indent(this.key.renderText().trimRight(), 2)}\n` +
        `}`
    );
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

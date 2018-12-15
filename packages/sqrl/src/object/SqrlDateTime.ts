/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlObject } from "./SqrlObject";

export default class SqrlDateTime extends SqrlObject {
  isoString: string;

  constructor(public timeMs: number) {
    super();
    this.isoString = new Date(this.timeMs).toISOString();
  }

  getData() {
    return this.isoString;
  }
  getBasicValue() {
    return this.isoString;
  }
  tryGetTimeMs() {
    return this.timeMs;
  }
}

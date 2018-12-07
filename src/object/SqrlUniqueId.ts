/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import SqrlObject from "./SqrlObject";

import { UniqueId } from "../platform/UniqueId";
import chalk from "chalk";

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
      remaining: this.uniqueId.getRemainder()
    };
  }

  renderText() {
    return chalk.grey(
      `uniqueId<${chalk.blue(
        new Date(this.uniqueId.getTimeMs()).toISOString()
      )}@${chalk.blue(this.uniqueId.getRemainder().toString())}>`
    );
  }

  getBasicValue() {
    return this.uniqueId.getHexString();
  }
}

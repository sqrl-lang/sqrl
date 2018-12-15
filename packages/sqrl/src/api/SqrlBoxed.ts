import { SqrlObject } from "sqrl-common";

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

export class SqrlBoxed extends SqrlObject {
  constructor(private value: any) {
    super();
  }
  getData() {
    return this.value;
  }
  getBasicValue() {
    return this.value;
  }
}

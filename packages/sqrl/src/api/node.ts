/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
export class NodeId {
  constructor(public type: string, public key: string) {}

  getIdString(): string {
    return `${this.type}/${this.key}`;
  }
}

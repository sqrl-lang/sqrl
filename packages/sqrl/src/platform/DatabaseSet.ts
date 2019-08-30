/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { toBufferBE } from "bigint-buffer";
import { DatabaseSet } from "../api/ctx";

export class SimpleDatabaseSet implements DatabaseSet {
  constructor(private datasetId: string) {
    /* nothing else */
  }
  getDatasetId(): string {
    return this.datasetId;
  }
  getDatasetIdBuffer(): Buffer {
    return toBufferBE(BigInt(this.getDatasetId()), 8);
  }
}

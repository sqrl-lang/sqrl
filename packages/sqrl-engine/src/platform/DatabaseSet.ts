/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import bignum = require("bignum");
import { DatabaseSet } from "../api/ctx";

export class SimpleDatabaseSet implements DatabaseSet {
  constructor(private datasetId: string) {
    /* nothing else */
  }
  getDatasetId(): string {
    return this.datasetId;
  }
  getDatasetIdBuffer(): Buffer {
    return new bignum(this.getDatasetId()).toBuffer({ endian: "big", size: 8 });
  }
}

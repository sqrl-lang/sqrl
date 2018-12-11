/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Logger, getGlobalLogger } from "./log";
import { SimpleContext } from "../platform/Trace";
import { SimpleDatabaseSet } from "../platform/DatabaseSet";

export interface DatabaseSet {
  /**
   * Returns the dataset id as a string
   */
  getDatasetId(): string;

  /**
   * Returns an eight byte buffer representing the dataset id
   */
  getDatasetIdBuffer(): Buffer;
}

export interface Context extends Logger {
  requireDatabaseSet(): DatabaseSet;
}

export function createSimpleContext() {
  return new SimpleContext(new SimpleDatabaseSet("0"), getGlobalLogger());
}

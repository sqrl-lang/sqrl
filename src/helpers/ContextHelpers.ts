/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SimpleDatabaseSet } from "../platform/DatabaseSet";
import { getGlobalLogger } from "../api/log";
import { SimpleContext } from "../platform/Trace";

// With many customers we can create new dataset id's, for now scope it down to 1
export const DEFAULT_DATASET_ID = "1";

export function createDefaultContext() {
  return new SimpleContext(
    new SimpleDatabaseSet(DEFAULT_DATASET_ID),
    getGlobalLogger()
  );
}

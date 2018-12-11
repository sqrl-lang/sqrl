/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { AbstractLogger } from "../util/Logger";
import { DatabaseSet, Context } from "../api/ctx";
import { Logger, LogProperties } from "../api/log";
import invariant from "../jslib/invariant";

export class SimpleContext extends AbstractLogger implements Context {
  constructor(private databaseSet: DatabaseSet, private logger: Logger) {
    super();
  }

  log(level: string, props: LogProperties, format: string, ...param: any[]) {
    return this.logger.log(level, props, format, ...param);
  }

  requireDatabaseSet(): DatabaseSet {
    invariant(
      this.databaseSet !== null,
      "Context databaseSet was not available"
    );
    return this.databaseSet;
  }
}

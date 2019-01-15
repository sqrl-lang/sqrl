/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
export interface AssertService {
  compare(
    manipulator: any,
    left: any,
    operator: string,
    right: any,
    arrow: string
  ): void;

  ok(manipulator: any, value: any, arrow: string): void;
}

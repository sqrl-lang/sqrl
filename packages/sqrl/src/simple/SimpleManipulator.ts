/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { FeatureMap, Manipulator, ManipulatorCallback } from "../api/execute";
import { SqrlKey } from "../object/SqrlKey";

export class SimpleManipulator extends Manipulator {
  public sqrlKeys: Set<string> = new Set();

  readonly loggedErrors: Error[] = [];
  public loggedFeatures: FeatureMap = {};
  public logged: string[] = [];

  getCurrentHumanOutput() {
    return {};
  }

  trackSqrlKey(key: SqrlKey): void {
    this.sqrlKeys.add(key.getDebugString());
  }

  log(message: string) {
    this.logged.push(message);
  }

  logError(err: Error): void {
    this.loggedErrors.push(err);
  }
  throwFirstError() {
    if (this.loggedErrors.length) {
      throw this.loggedErrors[0];
    }
  }

  async mutate(ctx): Promise<void> {
    await Promise.all(this.callbacks.map(cb => cb(ctx)));
  }
  private callbacks: ManipulatorCallback[] = [];
  addCallback(cb: ManipulatorCallback) {
    this.callbacks.push(cb);
  }
}

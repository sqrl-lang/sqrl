/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  RateLimitService,
  RateLimitProps
} from "../function/RateLimitFunctions";

export class MockRateLimit implements RateLimitService {
  private db = {};
  async fetch(ctx, props: RateLimitProps) {
    const {
      keys,
      maxAmount,
      // refillTimeMs,
      // refillAmount,
      take
      // at,
      // strict
    } = props;

    return keys.map(key => {
      const stringKey = key.getHex();
      if (!this.db.hasOwnProperty(stringKey)) {
        this.db[stringKey] = maxAmount;
      }
      const rv = this.db[stringKey];
      this.db[stringKey] = Math.max(0, this.db[stringKey] - take);
      return rv;
    });
  }
  async sessionize(ctx, props): Promise<[number, number]> {
    throw new Error("Not implemented yet");
  }
}

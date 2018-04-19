/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  RateLimitService,
  RateLimitProps,
  SessionProps
} from "../function/RateLimitFunctions";
import { addressToHostPort } from "../jslib/addressToHostPort";
import * as Redis from "ioredis";
import SqrlKey from "../object/SqrlKey";
import { Context } from "../api/ctx";

/**
 * Rate limit service for the Smyte rate limit database
 * https://github.com/smyte/ratelimit
 */
export class SmyteRateLimit implements RateLimitService {
  // @TODO: IORedis needs better typing
  private conn: any;

  constructor(address?: string) {
    const [host, port] = addressToHostPort(address || "localhost", 9049);
    this.conn = new Redis({ host, port });
  }

  async fetch(ctx: Context, props: RateLimitProps): Promise<number[]> {
    const {
      keys,
      maxAmount,
      refillTimeMs,
      refillAmount,
      take,
      at,
      strict
    } = props;

    return Promise.all(
      keys.map(async (key: SqrlKey) => {
        return this.conn.send_command(
          "RL.PREDUCE",
          key.getBuffer(),
          maxAmount,
          refillTimeMs,
          "REFILL",
          refillAmount,
          "TAKE",
          take,
          "AT",
          at,
          ...(strict ? ["STRICT"] : [])
        );
      })
    );
  }

  async sessionize(
    ctx: Context,
    props: SessionProps
  ): Promise<[number, number]> {
    const {
      key,
      maxAmount,
      refillTimeMs,
      refillAmount,
      take,
      at,
      strict
    } = props;

    const rv = await this.conn.send_command(
      "RL.PSESSIONIZE",
      key.getBuffer(),
      maxAmount,
      refillTimeMs,
      "REFILL",
      refillAmount,
      "TAKE",
      take,
      "AT",
      at,
      ...(strict ? ["STRICT"] : [])
    );
    if (!(Array.isArray(rv) && rv.length === 2)) {
      throw new Error("Expected pair return value from sessionize");
    }
    const [id, timestamp] = rv.map(num => {
      if (typeof num !== "number") {
        throw new Error("Expected number return values from sessionize");
      }
      return num;
    });
    return [id, timestamp];
  }

  close() {
    this.conn.disconnect();
  }
}

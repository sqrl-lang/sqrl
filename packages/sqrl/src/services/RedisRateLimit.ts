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
import { RedisInterface } from "./RedisService";
import SqrlKey from "../object/SqrlKey";
import { Context } from "../api/ctx";

/**
 * Rate limit service based on redis
 */
/*

d, i = struct.unpack("d", s, i)
+ "local current = tonumber(redis.call(\"get\", KEYS[1])) \n"
	+ "if (current ~= nil and current >= tonumber(ARGV[1])) then \n"
	+ "	error(\"too many requests\") \n"
	+ "end \n"
	+ "local result = redis.call(\"incr\", KEYS[1]) \n"
	+ "redis.call(\"expire\", KEYS[1], tonumber(ARGV[2])) \n"
  + "return result";
*/

export class RedisRateLimit implements RateLimitService {
  private prefix: Buffer;
  constructor(private redis: RedisInterface, prefix: string) {
    this.prefix = Buffer.from(prefix, "utf-8");
  }

  async fetch(ctx: Context, props: RateLimitProps): Promise<number[]> {
    return Promise.all(
      props.keys.map(
        (key: SqrlKey): Promise<number> => {
          return this.redis.rateLimitFetch(
            ctx,
            Buffer.concat([this.prefix, key.getBuffer()]),
            {
              maxAmount: props.maxAmount,
              refillTimeMs: props.refillTimeMs,
              refillAmount: props.refillAmount,
              take: props.take,
              at: props.at,
              strict: props.strict
            }
          );
        }
      )
    );
    /*
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
    );*/
  }

  async sessionize(
    ctx: Context,
    props: SessionProps
  ): Promise<[number, number]> {
    return [0, 0];
    /*
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
    */
  }
}

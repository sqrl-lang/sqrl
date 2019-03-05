/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Context, SqrlKey } from "sqrl-engine";
import { RedisInterface, redisKey } from "./RedisService";
import {
  getBucketSize,
  getBucketTimeForTimeMs,
  getBucketKey,
  getCurrentBucketExpirySeconds,
  getAllBucketKeys,
  getWindowStart
} from "./BucketedKeys";

/**
 * By default expire total counts if they haven't been seen in 90 days
 */
export const TOTAL_COUNT_EXPIRY_SEC = 90 * 24 * 3600;

export interface RedisBucketCountInterface {
  bump(
    ctx: Context,
    props: {
      at: number;
      key: SqrlKey;
      amount: number;
    }
  ): Promise<void>;
  count(
    ctx: Context,
    props: {
      key: SqrlKey;
      at: number;
    }
  ): Promise<number>;
}

export class RedisTotalCountService implements RedisBucketCountInterface {
  constructor(private redis: RedisInterface, private prefix: string) {
    /* nothing else */
  }
  async bump(
    ctx: Context,
    props: {
      at: number;
      key: SqrlKey;
      amount: number;
    }
  ): Promise<void> {
    const key = redisKey(
      ctx.requireDatabaseSet(),
      this.prefix,
      props.key.getHex()
    );

    await Promise.all([
      this.redis.increment(ctx, key, props.amount),
      this.redis.expire(ctx, key, TOTAL_COUNT_EXPIRY_SEC)
    ]);
  }

  async count(
    ctx: Context,
    props: {
      key: SqrlKey;
      at: number;
    }
  ): Promise<number> {
    const key = redisKey(
      ctx.requireDatabaseSet(),
      this.prefix,
      props.key.getHex()
    );
    const values = await this.redis.mgetNumbers(ctx, [key]);
    return values[0];
  }
}

export class RedisSingleWindowApproxCountService
  implements RedisBucketCountInterface {
  constructor(
    private redis: RedisInterface,
    private prefix: string,
    private windowMs: number,
    private numBuckets: number
  ) {
    /* nothing else */
  }
  async bump(
    ctx: Context,
    props: {
      at: number;
      key: SqrlKey;
      amount: number;
    }
  ): Promise<void> {
    const { at, key, amount } = props;

    const bucketSize = getBucketSize(this.windowMs, this.numBuckets);
    const currentBucket = getBucketTimeForTimeMs(at, bucketSize);
    const redisKey = getBucketKey(
      ctx.requireDatabaseSet(),
      this.prefix,
      key.getHex(),
      this.windowMs,
      currentBucket
    );

    await Promise.all([
      this.redis.increment(ctx, redisKey, amount),
      this.redis.expire(
        ctx,
        redisKey,
        getCurrentBucketExpirySeconds(this.windowMs, bucketSize)
      )
    ]);
  }

  async count(
    ctx: Context,
    props: {
      key: SqrlKey;
      at: number;
    }
  ): Promise<number> {
    const { key, at } = props;

    const keys = getAllBucketKeys(
      ctx.requireDatabaseSet(),
      this.prefix,
      key,
      at,
      this.windowMs,
      this.numBuckets
    );

    // Since the oldest bucket partially exists outside of our time window,
    // reduce it proportionally.
    const bucketSize = getBucketSize(this.windowMs, this.numBuckets);
    const startTime = getWindowStart(at, this.windowMs);
    const firstBucketTime = getBucketTimeForTimeMs(startTime, bucketSize);
    const firstBucketTimeToExclude = startTime - firstBucketTime;
    const percentOfFirstBucketToInclude =
      (bucketSize - firstBucketTimeToExclude) / bucketSize;

    const values = await this.redis.mgetNumbers(ctx, keys);
    values[0] *= percentOfFirstBucketToInclude;

    return Math.round(values.reduce((accum, item) => accum + (item || 0), 0));
  }
}

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Context, SqrlKey } from "sqrl";
import { RedisInterface } from "./RedisService";
import {
  getBucketSize,
  getBucketTimeForTimeMs,
  getBucketKey,
  getCurrentBucketExpirySeconds,
  getAllBucketKeys,
  getWindowStart
} from "./BucketedKeys";

export class RedisSingleWindowApproxCountService {
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

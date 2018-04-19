/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import SqrlKey from "../object/SqrlKey";
import { CountUniqueService } from "../function/CountUniqueFunctions";
import { RedisInterface, redisKey } from "./RedisService";
import { Manipulator } from "../platform/Manipulator";
import {
  getBucketSize,
  getBucketTimeForTimeMs,
  getBucketKey,
  getCurrentBucketExpirySeconds,
  getAllBucketKeys
} from "./BucketedKeys";
import invariant from "../jslib/invariant";
import { Context } from "../api/ctx";

const HOUR = 3600000;
// hour, day, week, month
const TIME_WINDOWS = [HOUR, 24 * HOUR, 24 * HOUR * 7, 24 * HOUR * 30].sort();
const NUM_BUCKETS = 10;

export class RedisApproxCountUniqueService implements CountUniqueService {
  windows: {
    [windowMs: number]: RedisSingleWindowApproxCountUniqueService;
  };
  constructor(redis: RedisInterface, prefix: string) {
    this.windows = {};
    for (const windowMs of TIME_WINDOWS) {
      this.windows[windowMs] = new RedisSingleWindowApproxCountUniqueService(
        redis,
        prefix,
        windowMs,
        NUM_BUCKETS
      );
    }
  }

  bump(
    manipulator: Manipulator,
    props: {
      at: number;
      key: SqrlKey;
      sortedHashes: string[];
      expireAtMs: number;
    }
  ) {
    const { at, key, sortedHashes } = props;
    manipulator.addCallback(async ctx => {
      await Promise.all(
        TIME_WINDOWS.map(windowMs =>
          this.windows[windowMs].bump(ctx, {
            at,
            key,
            hashes: sortedHashes
          })
        )
      );
    });
  }

  async fetchHashes(
    ctx: Context,
    props: { keys: SqrlKey[]; windowStartMs: number }
  ): Promise<string[]> {
    throw new Error("fetchHashes() is not implemented");
  }

  async fetchCounts(
    ctx: Context,
    props: {
      keys: SqrlKey[];
      at: number;
      windowMs: number;
      addHashes: string[];
    }
  ): Promise<number[]> {
    const { at, keys, windowMs, addHashes } = props;
    const window = this.windows[windowMs];
    invariant(window, "invalid time window: %s", windowMs);
    return Promise.all(
      keys.map(key =>
        window.count(ctx, {
          key,
          at,
          additionalHashes: addHashes
        })
      )
    );
  }
}

export class RedisSingleWindowApproxCountUniqueService {
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
      hashes: string[];
    }
  ) {
    const { at, key, hashes } = props;
    const bucketSize = getBucketSize(this.windowMs, this.numBuckets);
    const currentBucket = getBucketTimeForTimeMs(at, bucketSize);
    const redisKey = getBucketKey(
      ctx.requireDatabaseSet(),
      this.prefix,
      key.getHex(),
      this.windowMs,
      currentBucket
    );

    await this.redis.pfadd(ctx, redisKey, hashes);
    await this.redis.expire(
      ctx,
      redisKey,
      getCurrentBucketExpirySeconds(this.windowMs, bucketSize)
    );
  }

  async count(
    ctx: Context,
    props: {
      key: SqrlKey;
      at: number;
      additionalHashes: string[];
    }
  ): Promise<number> {
    const { key, at, additionalHashes } = props;
    const databaseSet = ctx.requireDatabaseSet();
    const keys = getAllBucketKeys(
      databaseSet,
      this.prefix,
      key,
      at,
      this.windowMs,
      this.numBuckets
    );

    if (additionalHashes.length === 0) {
      return this.redis.pfcount(ctx, keys);
    }

    const tempKey = redisKey(
      databaseSet,
      this.prefix,
      "temp",
      ...additionalHashes
    );
    await this.redis.pfadd(ctx, tempKey, additionalHashes);
    await this.redis.expire(ctx, tempKey, 1);
    return this.redis.pfcount(ctx, keys.concat([tempKey]));
  }
}

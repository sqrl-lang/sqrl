/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { RedisInterface, RedisService } from "../../src/services/RedisService";
import { MockRedisService } from "../../src/mocks/MockRedisService";
import * as bluebird from "bluebird";
import { buildTestTrace } from "./sqrlTest";
import invariant from "../../src/jslib/invariant";

export function redisTest(
  name: string,
  callback: (redis: RedisInterface) => Promise<void>
) {
  test(name + " (with mock)", async () => {
    return callback(new MockRedisService());
  });

  if ((global as any).__INTEGRATION__) {
    test(name + " (with redis)", async () => {
      invariant(
        process.env.SQRL_TEST_REDIS,
        "Integration test requires SQRL_TEST_REDIS environment variable"
      );
      const redis = new RedisService(process.env.SQRL_TEST_REDIS);
      const pingResult = await bluebird
        .resolve(redis.ping(buildTestTrace()))
        .timeout(100)
        .catch(err => {
          return "Redis ping failed: " + err.toString();
        });
      expect(pingResult).toEqual("PONG");
      try {
        return await callback(redis);
      } finally {
        redis.close();
      }
    });
  }
}

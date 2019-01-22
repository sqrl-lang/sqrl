/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { RedisSingleWindowApproxCountService } from "../src/services/RedisBucketedCount";
import { RedisInterface } from "../src/services/RedisService";
import { RedisUniqueIdService } from "../src/services/RedisUniqueId";
import { SqrlNode, SqrlUniqueId, createSimpleContext } from "sqrl";
import { redisTest } from "./helpers/redisTest";

redisTest("works", async (redis: RedisInterface) => {
  const ctx = createSimpleContext();

  const prefix = "test" + Date.now();

  const uniqueId = new RedisUniqueIdService(redis, prefix);
  const service = new RedisSingleWindowApproxCountService(
    redis,
    prefix,
    5000,
    10
  );

  async function getKeyForIp(ip) {
    const nodeUniqueId = new SqrlUniqueId(await uniqueId.fetch(ctx, "Ip", ip));
    const nodeId = new SqrlNode(nodeUniqueId, "Ip", ip);
    const key = await nodeId.buildCounterKey(ctx);

    return key;
  }

  const key = await getKeyForIp("1.2.3.4");

  await service.bump(ctx, {
    at: Date.now(),
    key,
    amount: 1
  });

  let count = await service.count(ctx, {
    key,
    at: Date.now() + 10
  });

  expect(count).toEqual(1);

  count = await service.count(ctx, {
    key: await getKeyForIp("5.6.7.8"),
    at: Date.now() + 10
  });

  expect(count).toEqual(0);

  const newKey = await getKeyForIp("a.b.c.d");
  const epoch = 1530388687022;

  async function bump(currentTime) {
    await service.bump(ctx, {
      at: epoch + currentTime,
      key: newKey,
      amount: 1
    });
  }

  async function check(currentTime) {
    return service.count(ctx, {
      key: newKey,
      at: epoch + currentTime
    });
  }

  await bump(1000);
  await bump(1100);
  await bump(1200);
  expect(await check(1300)).toBe(3);
  expect(await check(7000)).toBe(0);

  await bump(4000);
  expect(await check(4100)).toBe(4);
  expect(await check(7000)).toBe(1);
});

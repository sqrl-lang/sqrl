/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { RedisSingleWindowApproxCountUniqueService } from "../src/services/RedisApproxCountUnique";
import { RedisUniqueIdService } from "../src/services/RedisUniqueId";
import { SqrlKey, SqrlEntity, SqrlUniqueId, createSimpleContext } from "sqrl";
import { redisTest } from "./helpers/redisTest";

redisTest("works", async redis => {
  const ctx = createSimpleContext();
  const prefix = "test" + Date.now();

  const uniqueId = new RedisUniqueIdService(redis, () => Date.now(), prefix);
  const service = new RedisSingleWindowApproxCountUniqueService(
    redis,
    prefix,
    5000,
    10
  );

  async function getKeyForIp(ip): Promise<SqrlKey> {
    const entityUniqueId = new SqrlUniqueId(
      await uniqueId.fetch(ctx, "Ip", ip)
    );
    const entityId = new SqrlEntity(entityUniqueId, "Ip", ip);
    return entityId.buildCounterKey(ctx);
  }

  const key = await getKeyForIp("1.2.3.4");

  await service.bump(ctx, {
    at: Date.now(),
    key,
    hashes: ["a", "b"]
  });

  let count = await service.count(ctx, {
    key,
    at: Date.now() + 10,
    additionalHashes: ["b", "c"]
  });

  expect(count).toEqual(3);

  count = await service.count(ctx, {
    key: await getKeyForIp("5.6.7.8"),
    at: Date.now() + 10,
    additionalHashes: ["b", "c"]
  });

  expect(count).toEqual(2);

  const newKey = await getKeyForIp("a.b.c.d");
  const interval = 1000;

  let currentTime = Date.now();

  async function bump(hashes, expectedCount) {
    await service.bump(ctx, {
      at: currentTime,
      key: newKey,
      hashes
    });

    const count = await service.count(ctx, {
      key: newKey,
      at: currentTime,
      additionalHashes: []
    });

    expect(count).toBe(expectedCount);

    currentTime += interval;
  }

  await bump(["a", "b", "c", "d"], 4);
  await bump(["d", "e"], 5);
  await bump([], 5);
  await bump([], 5);
  await bump(["d", "f"], 6);
  await bump(["f"], 6);
  await bump([], 3);
});

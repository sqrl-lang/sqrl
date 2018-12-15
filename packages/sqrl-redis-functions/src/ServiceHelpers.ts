/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-submodule-imports (@TODO)

import { CountService } from "./CountFunctions";
import { CountUniqueService } from "./CountUniqueFunctions";
import { LabelService } from "./LabelFunctions";
import { RateLimitService } from "./RateLimitFunctions";
import { RedisInterface, RedisService } from "./services/RedisService";
import { MockRedisService } from "./mocks/MockRedisService";
import { RedisCountService } from "./services/RedisCountService";
import { RedisApproxCountUniqueService } from "./services/RedisApproxCountUnique";
import { RedisLabelService } from "./services/RedisLabelService";
import { RedisUniqueIdService } from "./services/RedisUniqueId";
import { RedisRateLimit } from "./services/RedisRateLimit";
import { UniqueIdService } from "sqrl";

interface Closeable {
  close(): void;
}

class RedisServices {
  count?: CountService;
  countUnique?: CountUniqueService;
  label?: LabelService;
  uniqueId?: UniqueIdService;
  rateLimit?: RateLimitService;

  private shutdown: Closeable[] = [];
  constructor(props: { redisAddress?: string; inMemory?: boolean }) {
    const { redisAddress, inMemory } = props;

    let redisService: RedisInterface = null;
    if (redisAddress) {
      const redis = new RedisService(redisAddress);
      redisService = redis;
      this.shutdown.push(redis);
    } else if (inMemory) {
      redisService = new MockRedisService();
    }

    if (redisService) {
      this.count = new RedisCountService(redisService, "count~");
      this.countUnique = new RedisApproxCountUniqueService(
        redisService,
        "countUnique~"
      );
      this.label = new RedisLabelService(redisService, "label~");
      this.uniqueId = new RedisUniqueIdService(redisService, "id~");

      if (!this.rateLimit) {
        this.rateLimit = new RedisRateLimit(redisService, "ratelimit~");
      }
    }
  }

  close() {
    this.shutdown.forEach(svc => svc.close());
  }
}

export function buildServicesFromAddresses(props: {
  redisAddress?: string;
  inMemory?: boolean;
}) {
  return new RedisServices(props);
}

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import {
  FunctionServices,
  KafkaService
} from "../function/registerAllFunctions";
import { AssertService } from "../function/AssertFunctions";
import { BlockService } from "../function/BlockFunctions";
import { CountService } from "../function/CountFunctions";
import { CountUniqueService } from "../function/CountUniqueFunctions";
import { LabelService } from "../function/LabelFunctions";
import { PatternService } from "../function/PatternFunctions";
import { UniqueIdService } from "../function/NodeFunctions";
import { RateLimitService } from "../function/RateLimitFunctions";
import { ObjectService } from "../function/SaveFunctions";
import { InProcessPatternService } from "../services/InProcessPatternService";
import { SmyteRateLimit } from "../services/SmyteRateLimit";
import { RedisInterface, RedisService } from "../services/RedisService";
import { MockRedisService } from "../mocks/MockRedisService";
import { RedisCountService } from "../services/RedisCountService";
import { RedisApproxCountUniqueService } from "../services/RedisApproxCountUnique";
import { RedisLabelService } from "../services/RedisLabelService";
import { RedisUniqueIdService } from "../services/RedisUniqueId";
import { RedisRateLimit } from "../services/RedisRateLimit";

interface Closeable {
  close(): void;
}

class SqrlStandardServices implements FunctionServices {
  assert?: AssertService;
  block?: BlockService;
  count?: CountService;
  countUnique?: CountUniqueService;
  label?: LabelService;
  pattern?: PatternService;
  uniqueId?: UniqueIdService;
  rateLimit?: RateLimitService;
  saveFeatures?: KafkaService;
  object?: ObjectService;

  private shutdown: Closeable[] = [];
  constructor(props: {
    ratelimitAddress?: string;
    redisAddress?: string;
    inMemory?: boolean;
  }) {
    const { ratelimitAddress, redisAddress, inMemory } = props;
    this.pattern = new InProcessPatternService();

    let redisService: RedisInterface = null;
    if (redisAddress) {
      const redis = new RedisService(redisAddress);
      redisService = redis;
      this.shutdown.push(redis);
    } else if (inMemory) {
      redisService = new MockRedisService();
    }

    if (ratelimitAddress) {
      const rateLimit = new SmyteRateLimit(ratelimitAddress);
      this.rateLimit = rateLimit;
      this.shutdown.push(rateLimit);
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
  ratelimitAddress?: string;
  redisAddress?: string;
  inMemory?: boolean;
}) {
  return new SqrlStandardServices(props);
}

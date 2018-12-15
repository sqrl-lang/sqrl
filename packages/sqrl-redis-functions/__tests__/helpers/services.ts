import { RedisCountService } from "../../src/services/RedisCountService";
import { RedisApproxCountUniqueService } from "../../src/services/RedisApproxCountUnique";
import { RedisLabelService } from "../../src/services/RedisLabelService";
import { MockRedisService } from "../../src/mocks/MockRedisService";
import { RedisRateLimit } from "../../src/services/RedisRateLimit";
import { RedisServices } from "../../src";

export function buildServices(): RedisServices {
  const redis = new MockRedisService();
  return {
    count: new RedisCountService(redis, "count~"),
    countUnique: new RedisApproxCountUniqueService(redis, "countUnique~"),
    rateLimit: new RedisRateLimit(redis, "ratelimit~"),
    label: new RedisLabelService(redis, "label~")
  };
}

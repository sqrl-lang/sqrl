/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { CountService, registerCountFunctions } from "./CountFunctions";
import {
  registerCountUniqueFunctions,
  CountUniqueService
} from "./CountUniqueFunctions";
import {
  registerRateLimitFunctions,
  RateLimitService
} from "./RateLimitFunctions";
import { LabelService, registerLabelFunctions } from "./LabelFunctions";
import { buildServicesFromAddresses } from "./ServiceHelpers";
import { UniqueIdService, FunctionRegistry } from "sqrl";

export interface RedisServices {
  count?: CountService;
  countUnique?: CountUniqueService;
  label?: LabelService;
  rateLimit?: RateLimitService;
  uniqueId?: UniqueIdService;
}

export function buildServicesWithMockRedis(): RedisServices {
  return buildServicesFromAddresses({
    inMemory: true
  });
}

export function buildServices(redisAddress: string): RedisServices {
  return buildServicesFromAddresses({
    redisAddress
  });
}

export function register(
  registry: FunctionRegistry,
  services: RedisServices = {}
) {
  if (services.count) {
    registerCountFunctions(registry, services.count);
  }
  if (services.countUnique) {
    registerCountUniqueFunctions(registry, services.countUnique);
  }
  if (services.label) {
    registerLabelFunctions(registry, services.label);
  }
  if (services.rateLimit) {
    registerRateLimitFunctions(registry, services.rateLimit);
  }
}

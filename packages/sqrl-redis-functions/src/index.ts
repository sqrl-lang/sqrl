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
import { RedisServices } from "./ServiceHelpers";
import { FunctionRegistry } from "sqrl";
import { registerEntityFunctions } from "./EntityFunctions";
import { UniqueIdService } from "./services/RedisUniqueId";

export interface RedisServices {
  count: CountService;
  countUnique: CountUniqueService;
  label: LabelService;
  rateLimit: RateLimitService;
  uniqueId: UniqueIdService;
}

export function register(registry: FunctionRegistry) {
  const services = new RedisServices(registry.getConfig());

  registerCountFunctions(registry, services.count);
  registerCountUniqueFunctions(registry, services.countUnique);
  registerEntityFunctions(registry, services.uniqueId);
  registerLabelFunctions(registry, services.label);
  registerRateLimitFunctions(registry, services.rateLimit);
}

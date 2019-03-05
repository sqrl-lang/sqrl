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
import { Instance } from "sqrl-engine";
import { registerEntityFunctions } from "./EntityFunctions";
import { UniqueIdService } from "./services/RedisUniqueId";

export interface RedisServices {
  count: CountService;
  countUnique: CountUniqueService;
  label: LabelService;
  rateLimit: RateLimitService;
  uniqueId: UniqueIdService;
}

export function register(instance: Instance) {
  const services = new RedisServices(instance.getConfig());

  registerCountFunctions(instance, services.count);
  registerCountUniqueFunctions(instance, services.countUnique);
  registerEntityFunctions(instance, services.uniqueId);
  registerLabelFunctions(instance, services.label);
  registerRateLimitFunctions(instance, services.rateLimit);
}

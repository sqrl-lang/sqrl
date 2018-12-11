/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import FunctionRegistry from "./FunctionRegistry";
import { registerBoolFunctions } from "./BoolFunctions";
import { registerTypeFunctions } from "./TypeFunctions";
import { registerComparisonFunctions } from "./ComparisonFunctions";
import { registerMathFunctions } from "./MathFunctions";
import { registerStdlibFunctions } from "./StdlibFunctions";
import {
  registerRateLimitFunctions,
  RateLimitService
} from "./RateLimitFunctions";
import { registerNodeFunctions, UniqueIdService } from "./NodeFunctions";
import { registerKeyFunctions } from "./KeyFunctions";
import { registerArrayFunctions } from "./ArrayFunctions";
import { registerDateFunctions } from "./DateFunctions";
import { registerDataFunctions } from "./DataFunctions";
import { PatternService, registerPatternFunctions } from "./PatternFunctions";
import { registerStringFunctions } from "./StringFunctions";
import { registerTimeFunctions } from "./TimeFunctions";
import { registerSaveFunctions, ObjectService } from "./SaveFunctions";
import {
  registerCountUniqueFunctions,
  CountUniqueService
} from "./CountUniqueFunctions";
import { Manipulator } from "../platform/Manipulator";
import { registerSourceFunction } from "./SourceFunctions";
import { BlockService, registerBlockFunctions } from "./BlockFunctions";
import { AssertService, registerAssertFunctions } from "./AssertFunctions";
import { registerCountFunctions, CountService } from "./CountFunctions";
import { LabelService, registerLabelFunctions } from "./LabelFunctions";
import { registerLoadFunctions } from "./LoadFunctions";
import { registerLogFunctions, LogService } from "./LogFunctions";
import { registerWhenFunctions } from "./WhenFunctions";

export abstract class KafkaService {
  abstract writeJson(manipulator: Manipulator, obj: any);
}

export interface FunctionServices {
  assert?: AssertService;
  block?: BlockService;
  count?: CountService;
  countUnique?: CountUniqueService;
  label?: LabelService;
  log?: LogService;
  pattern?: PatternService;
  uniqueId?: UniqueIdService;
  rateLimit?: RateLimitService;
  saveFeatures?: KafkaService;
  object?: ObjectService;
}

export function registerAllFunctions(
  functionRegistry: FunctionRegistry,
  services: FunctionServices = {}
) {
  registerTypeFunctions(functionRegistry);
  registerBoolFunctions(functionRegistry);
  registerComparisonFunctions(functionRegistry);
  registerMathFunctions(functionRegistry);
  registerLogFunctions(functionRegistry, services.log);
  registerLoadFunctions(functionRegistry);
  registerStdlibFunctions(functionRegistry);
  registerWhenFunctions(functionRegistry);

  if (services.assert) {
    registerAssertFunctions(functionRegistry, services.assert);
  }
  if (services.block) {
    registerBlockFunctions(functionRegistry, services.block);
  }
  if (services.count) {
    registerCountFunctions(functionRegistry, services.count);
  }
  if (services.countUnique) {
    registerCountUniqueFunctions(functionRegistry, services.countUnique);
  }
  if (services.label) {
    registerLabelFunctions(functionRegistry, services.label);
  }
  if (services.pattern) {
    registerPatternFunctions(functionRegistry, services.pattern);
  }
  if (services.rateLimit) {
    registerRateLimitFunctions(functionRegistry, services.rateLimit);
  }
  if (services.uniqueId) {
    registerNodeFunctions(functionRegistry, services.uniqueId);
  }

  registerSaveFunctions(functionRegistry, services);
  registerKeyFunctions(functionRegistry);
  registerArrayFunctions(functionRegistry);
  registerDataFunctions(functionRegistry);
  registerDateFunctions(functionRegistry);
  registerTimeFunctions(functionRegistry);
  registerStringFunctions(functionRegistry);
  registerSourceFunction(functionRegistry);
}

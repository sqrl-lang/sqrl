/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlFunctionRegistry } from "./FunctionRegistry";
import { registerBoolFunctions } from "./BoolFunctions";
import { registerTypeFunctions } from "./TypeFunctions";
import { registerComparisonFunctions } from "./ComparisonFunctions";
import { registerMathFunctions } from "./MathFunctions";
import { registerStdlibFunctions } from "./StdlibFunctions";
import { registerEntityFunctions } from "./EntityFunctions";
import { registerKeyFunctions } from "./KeyFunctions";
import { registerArrayFunctions } from "./ArrayFunctions";
import { registerDateFunctions } from "./DateFunctions";
import { registerDataFunctions } from "./DataFunctions";
import { registerStringFunctions } from "./StringFunctions";
import { registerTimeFunctions } from "./TimeFunctions";
import { registerSaveFunctions, ObjectService } from "./SaveFunctions";
import { Manipulator } from "../api/execute";
import { registerSourceFunction } from "./SourceFunctions";
import { BlockService, registerBlockFunctions } from "./BlockFunctions";
import { registerAssertFunctions } from "./AssertFunctions";
import { registerLoadFunctions } from "./LoadFunctions";
import { registerLogFunctions, LogService } from "./LogFunctions";
import { registerWhenFunctions } from "./WhenFunctions";
import { AssertService } from "sqrl-common";
import { UniqueIdService } from "../api/services";

export abstract class KafkaService {
  abstract writeJson(manipulator: Manipulator, obj: any);
}

export interface FunctionServices {
  assert?: AssertService;
  block?: BlockService;
  log?: LogService;
  uniqueId?: UniqueIdService;
  saveFeatures?: KafkaService;
  object?: ObjectService;
}

export function registerAllFunctions(
  functionRegistry: SqrlFunctionRegistry,
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

  if (services.uniqueId) {
    registerEntityFunctions(functionRegistry, services.uniqueId);
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

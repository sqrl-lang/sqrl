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
import { registerControlFunctions } from "./ControlFunctions";
import { registerEntityFunctions } from "./EntityFunctions";
import { registerKeyFunctions } from "./KeyFunctions";
import { registerArrayFunctions } from "./ArrayFunctions";
import { registerDateFunctions } from "./DateFunctions";
import { registerDataFunctions } from "./DataFunctions";
import { registerStringFunctions } from "./StringFunctions";
import { registerTimeFunctions } from "./TimeFunctions";
import { registerAssertFunctions } from "./AssertFunctions";
import { registerWhenFunctions } from "./WhenFunctions";
import { FunctionServices } from "../api/execute";

export function registerAllFunctions(
  functionRegistry: SqrlFunctionRegistry,
  services: FunctionServices = {}
) {
  registerTypeFunctions(functionRegistry.createStdlibRegistry("type"));
  registerBoolFunctions(functionRegistry.createStdlibRegistry("bool"));
  registerComparisonFunctions(functionRegistry.createStdlibRegistry("compare"));
  registerMathFunctions(functionRegistry.createStdlibRegistry("math"));
  registerControlFunctions(functionRegistry.createStdlibRegistry("control"));
  registerWhenFunctions(functionRegistry.createStdlibRegistry("when"));
  registerAssertFunctions(
    functionRegistry.createStdlibRegistry("assert"),
    services.assert
  );
  registerEntityFunctions(functionRegistry.createStdlibRegistry("entity"));
  registerKeyFunctions(functionRegistry.createStdlibRegistry("key"));
  registerArrayFunctions(functionRegistry.createStdlibRegistry("list"));
  registerDataFunctions(functionRegistry.createStdlibRegistry("data"));
  registerDateFunctions(functionRegistry.createStdlibRegistry("date-time"));
  registerTimeFunctions(functionRegistry.createStdlibRegistry("date-time"));
  registerStringFunctions(functionRegistry.createStdlibRegistry("string"));
}

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlInstance } from "./Instance";
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
  instance: SqrlInstance,
  services: FunctionServices = {}
) {
  registerTypeFunctions(instance.createStdlibRegistry("type"));
  registerBoolFunctions(instance.createStdlibRegistry("bool"));
  registerComparisonFunctions(instance.createStdlibRegistry("compare"));
  registerMathFunctions(instance.createStdlibRegistry("math"));
  registerControlFunctions(instance.createStdlibRegistry("control"));
  registerWhenFunctions(instance.createStdlibRegistry("when"));
  registerAssertFunctions(
    instance.createStdlibRegistry("assert"),
    services.assert
  );
  registerEntityFunctions(instance.createStdlibRegistry("entity"));
  registerKeyFunctions(instance.createStdlibRegistry("key"));
  registerArrayFunctions(instance.createStdlibRegistry("list"));
  registerDataFunctions(instance.createStdlibRegistry("data"));
  registerDateFunctions(instance.createStdlibRegistry("date-time"));
  registerTimeFunctions(instance.createStdlibRegistry("date-time"));
  registerStringFunctions(instance.createStdlibRegistry("string"));
}

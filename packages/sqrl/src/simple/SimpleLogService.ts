/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Manipulator } from "../api/Manipulator";
import { SimpleManipulator } from "../simple/SimpleManipulator";
import { LogService } from "../function/LogFunctions";

export class SimpleLogService implements LogService {
  log(manipulator: Manipulator, message: string) {
    if (!(manipulator instanceof SimpleManipulator)) {
      throw new Error("Expected SimpleManipulator for SimpleBlockService");
    }
    manipulator.log(message);
  }
  logFeature(manipulator: Manipulator, name: string, value: any) {
    if (!(manipulator instanceof SimpleManipulator)) {
      throw new Error("Expected SimpleManipulator for SimpleBlockService");
    }
    manipulator.logFeature(name, value);
  }
}

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { BlockService } from "../function/BlockFunctions";
import { Manipulator } from "../api/execute";
import { SimpleManipulator } from "./SimpleManipulator";
import { WhenCause } from "../function/WhenFunctions";

export class SimpleBlockService implements BlockService {
  block(manipulator: Manipulator, cause: WhenCause | null) {
    if (!(manipulator instanceof SimpleManipulator)) {
      throw new Error("Expected SimpleManipulator for SimpleBlockService");
    }
    manipulator.setBlocked(cause);
  }
  whitelist(manipulator: Manipulator, cause: WhenCause | null) {
    if (!(manipulator instanceof SimpleManipulator)) {
      throw new Error("Expected SimpleManipulator for SimpleBlockService");
    }
    manipulator.setWhitelisted(cause);
  }
  wasBlocked(manipulator: Manipulator): boolean {
    if (!(manipulator instanceof SimpleManipulator)) {
      throw new Error("Expected SimpleManipulator for SimpleBlockService");
    }
    return manipulator.wasBlocked();
  }
}

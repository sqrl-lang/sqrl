/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Ast, CallAst } from "../api/ast";

export interface ArgumentCheck {
  readonly isOptional: boolean;
  compileTimeCheck(argAst: Ast, functionAst: CallAst);
  runtimeChecker?(value: any);
}

export class StateArgument implements ArgumentCheck {
  readonly repeated = false;
  readonly isOptional = false;
  compileTimeCheck() {
    /* no check needed. */
  }
}

export class WhenCauseArgument implements ArgumentCheck {
  readonly repeated = false;
  readonly isOptional = false;
  compileTimeCheck() {
    /* no check needed. */
  }
}

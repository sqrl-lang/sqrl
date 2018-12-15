import { Ast, CallAst } from "./ast";

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

export class WhenContextArgument implements ArgumentCheck {
  readonly repeated = false;
  readonly isOptional = false;
  compileTimeCheck() {
    /* no check needed. */
  }
}

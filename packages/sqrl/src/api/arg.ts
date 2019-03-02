/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
/**
 * Shorthand for Argument Type
 */
import { AstTypes } from "../ast/AstTypes";
import { ArgumentCheck } from "../ast/ArgumentCheck";
export {
  ArgumentCheck,
  StateArgument,
  WhenCauseArgument
} from "../ast/ArgumentCheck";

interface OptArgumentCheck extends ArgumentCheck {
  optional: ArgumentCheck;
}

interface ArgumentCheckWithRuntime extends ArgumentCheck {
  sqrlEntityOrEntities: ArgumentCheck;
  sqrlEntity: ArgumentCheck;
  string: ArgumentCheck;
  number: ArgumentCheck;
  bool: ArgumentCheck;
  array: ArgumentCheck;
}

interface OptArgumentCheckWithRuntime extends ArgumentCheckWithRuntime {
  optional: ArgumentCheckWithRuntime;
  repeated: ArgumentCheckWithRuntime;
}

export const AT: {
  state: ArgumentCheck;
  whenCause: ArgumentCheck;
  any: OptArgumentCheckWithRuntime;
  feature: OptArgumentCheckWithRuntime;
  constant: {
    string: OptArgumentCheck;
    null: OptArgumentCheck;
    number: OptArgumentCheck;
  };
} = AstTypes;

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
  WhenCauseArgument,
} from "../ast/ArgumentCheck";

interface OptRepArgumentCheck extends ArgumentCheck {
  optional: RepArgumentCheck;
  repeated: OptArgumentCheck;
}
interface OptArgumentCheck extends ArgumentCheck {
  optional: ArgumentCheck;
}
interface RepArgumentCheck extends ArgumentCheck {
  repeated: ArgumentCheck;
}

interface ArgumentCheckWithRuntime extends ArgumentCheck {
  sqrlEntityOrEntities: ArgumentCheck;
  sqrlEntity: ArgumentCheck;
  string: ArgumentCheck;
  number: ArgumentCheck;
  bool: ArgumentCheck;
  array: ArgumentCheck;
}

interface OptRepArgumentCheckWithRuntime extends ArgumentCheckWithRuntime {
  optional: RepArgumentCheckWithRuntime;
  repeated: OptArgumentCheckWithRuntime;
}
interface RepArgumentCheckWithRuntime extends ArgumentCheckWithRuntime {
  repeated: ArgumentCheckWithRuntime;
}
interface OptArgumentCheckWithRuntime extends ArgumentCheckWithRuntime {
  optional: ArgumentCheckWithRuntime;
}

export const AT: {
  state: ArgumentCheck;
  whenCause: ArgumentCheck;
  any: OptRepArgumentCheckWithRuntime;
  feature: OptRepArgumentCheckWithRuntime;
  constant: {
    string: OptRepArgumentCheck;
    null: OptRepArgumentCheck;
    number: OptRepArgumentCheck;
  };
} = AstTypes;

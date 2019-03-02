/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { AstTypes as AT } from "../ast/AstTypes";
import { StdlibRegistry } from "./FunctionRegistry";
import { SqrlObject } from "../object/SqrlObject";

export function registerBoolFunctions(registry: StdlibRegistry) {
  registry.save(
    function _and(...args) {
      let seenNull = false;
      for (const arg of args) {
        if (arg === null) {
          seenNull = true;
        } else if (!SqrlObject.isTruthy(arg)) {
          return false;
        }
      }
      return seenNull ? null : true;
    },
    {
      safe: true,
      allowSqrlObjects: true,
      allowNull: true,
      argstring: "value[, ...]",
      docstring:
        "Return true if all of the input values are truthy, false otherwise"
    }
  );

  registry.save(
    function _not(value) {
      if (value === null) {
        return null;
      } else {
        return !SqrlObject.isTruthy(value);
      }
    },
    {
      args: [AT.any],
      safe: true,
      allowNull: true,
      pure: true,
      argstring: "value",
      docstring: "Return false if the value is truthy, true if it is falsy"
    }
  );

  registry.save(
    async function _andSequential(state, callbacks) {
      let arg;
      let seenNull = false;
      for (const callback of callbacks) {
        arg = await callback();
        if (arg === null) {
          seenNull = true;
        } else if (!SqrlObject.isTruthy(arg)) {
          return false;
        }
      }
      return seenNull ? null : true;
    },
    {
      allowSqrlObjects: true,
      allowNull: true,
      promiseArgs: true,
      callbackArgs: true,
      stateArg: true,
      safe: true,
      asyncSafe: true
    }
  );

  registry.save(
    function _isNull(value) {
      return value === null;
    },
    {
      allowNull: true,
      args: [AT.any],
      argstring: "value",
      docstring: "Returns true if the given value is null, false otherwise"
    }
  );

  registry.save(
    async function choice(state, ...promises) {
      for (const p of promises) {
        const arg = await p;
        if (SqrlObject.isTruthy(arg)) {
          return arg;
        }
      }
      return promises[promises.length - 1];
    },
    {
      stateArg: true,
      promiseArgs: true,
      allowSqrlObjects: true,
      allowNull: true,
      safe: true,
      asyncSafe: true,
      argstring: "value[, ...]",
      docstring: "Returns the first truthy value, otherwise the final value."
    }
  );

  registry.save(
    function coalesce(...args) {
      for (const arg of args) {
        if (arg !== null) {
          return arg;
        }
      }
      return null;
    },
    {
      allowSqrlObjects: true,
      allowNull: true,
      argstring: "value[, ...]",
      docstring: "Returns the first value that is not null"
    }
  );

  registry.save(
    function _or(...args) {
      let hadNull = false;
      for (const arg of args) {
        if (SqrlObject.isTruthy(arg)) {
          return true;
        } else if (arg === null) {
          hadNull = true;
        }
      }
      return hadNull ? null : false;
    },
    {
      allowSqrlObjects: true,
      safe: true,
      allowNull: true,
      argstring: "value[, ...]",
      docstring: "Returns true if any of the values are truthy, false otherwise"
    }
  );

  registry.save(
    async function _orSequential(state, callbacks) {
      let hadNull = false;
      for (const callback of callbacks) {
        const arg = await callback();
        if (SqrlObject.isTruthy(arg)) {
          return true;
        } else if (arg === null) {
          hadNull = true;
        }
      }
      return hadNull ? null : false;
    },
    {
      promiseArgs: true,
      callbackArgs: true,
      allowSqrlObjects: true,
      allowNull: true,
      stateArg: true,
      safe: true,
      asyncSafe: true
    }
  );

  registry.save(
    function _orParallel(state, ...promises) {
      return new Promise(resolve => {
        let remaining = promises.length;
        let hadNull = false;
        for (const promise of promises) {
          promise.then(result => {
            if (resolve && SqrlObject.isTruthy(result)) {
              resolve(true);
              resolve = null;
            } else {
              if (result === null) {
                hadNull = true;
              }
              remaining -= 1;
              if (remaining === 0) {
                resolve(hadNull ? null : false);
              }
            }
          });
        }
      });
    },
    {
      promiseArgs: true,
      allowSqrlObjects: true,
      allowNull: true,
      async: true,
      stateArg: true
    }
  );
}

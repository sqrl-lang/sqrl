/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import FunctionRegistry from "./FunctionRegistry";

import { default as AT } from "../ast/AstTypes";
import SqrlObject from "../object/SqrlObject";

function and(...args) {
  for (const arg of args) {
    if (!SqrlObject.isTruthy(arg)) {
      return false;
    }
  }
  return true;
}

export function registerBoolFunctions(registry: FunctionRegistry) {
  registry.save(and, {
    safe: true,
    allowSqrlObjects: true,
    allowNull: true,
    args: AT.minArgs(2)
  });

  registry.save(and, {
    name: "andOrNull",
    safe: true,
    allowSqrlObjects: true,
    args: AT.minArgs(2)
  });

  registry.save(
    function not(value) {
      if (Array.isArray(value)) {
        return value.length === 0 ? true : false;
      } else if (value === null) {
        return null;
      } else {
        return !value;
      }
    },
    {
      argCount: 1,
      safe: true,
      allowNull: true,
      pure: true
    }
  );

  registry.save(
    async function _andSequential(state, callbacks) {
      let arg;
      for (const callback of callbacks) {
        arg = await callback();
        if (!SqrlObject.isTruthy(arg)) {
          return false;
        }
      }
      return true;
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
    function is(left, right) {
      return left === right;
    },
    {
      allowNull: true,
      argCount: 2,
      args: [AT.any, AT.constant.null]
    }
  );

  registry.save(
    function isNot(left, right) {
      return left !== right;
    },
    {
      allowNull: true,
      argCount: 2,
      args: [AT.any, AT.constant.null]
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
      asyncSafe: true
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
      allowNull: true
    }
  );

  registry.save(
    function or(...args) {
      for (const arg of args) {
        if (SqrlObject.isTruthy(arg)) {
          return true;
        }
      }
      return false;
    },
    {
      allowSqrlObjects: true,
      args: AT.minArgs(2),
      safe: true,
      allowNull: true
    }
  );

  registry.save(
    async function _orSequential(state, callbacks) {
      for (const callback of callbacks) {
        const arg = await callback();
        if (SqrlObject.isTruthy(arg)) {
          return true;
        }
      }
      return false;
    },
    {
      promiseArgs: true,
      callbackArgs: true,
      allowSqrlObjects: true,
      args: AT.minArgs(2),
      allowNull: true,
      stateArg: true,
      safe: true,
      asyncSafe: true
    }
  );

  // This *should* become the preferred version of or
  registry.save(
    function orParallel(state, ...promises) {
      return new Promise(resolve => {
        let remaining = promises.length;
        for (const promise of promises) {
          promise.then(result => {
            if (resolve && SqrlObject.isTruthy(result)) {
              resolve(true);
              resolve = null;
            } else {
              remaining -= 1;
              if (remaining === 0) {
                resolve(false);
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
      stateArg: true,
      args: AT.minArgs(2)
    }
  );
}

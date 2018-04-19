/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import FunctionRegistry from "../function/FunctionRegistry";
import bluebird = require("bluebird");
import vm = require("vm");

export type JsCallback = () => Promise<any>;

export class JsExecutionContext {
  private sandbox: vm.Context;
  private cache: { [js: string]: JsCallback } = {};

  constructor(functionRegistry: FunctionRegistry) {
    this.sandbox = vm.createContext({
      console,
      functions: functionRegistry.functions,
      bluebird
    });
  }

  compileSlotJs(js: string): JsCallback {
    if (!this.cache[js]) {
      const script = `(function(){return ${js};})()`;
      this.cache[js] = new vm.Script(script).runInContext(this.sandbox);
    }
    return this.cache[js];
  }

  compileSlots(slotJs: string[]): JsCallback[] {
    return slotJs.map(js => this.compileSlotJs(js));
  }
}

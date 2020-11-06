/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { SqrlInstance } from "../function/Instance";
import bluebird = require("bluebird");

export type JsCallback = () => Promise<any>;

export class JsExecutionContext {
  private context: any;
  private cache: { [js: string]: JsCallback } = {};

  constructor(instance: SqrlInstance) {
    this.context = {
      console,
      functions: instance.functions,
      bluebird
    };
  }

  compileSlotJs(js: string): JsCallback {
    if (!this.cache[js]) {
      const script = `(function({console,functions,bluebird}){return ${js};})`;
      this.cache[js] = eval(script)(this.context);
    }
    return this.cache[js];
  }

  compileSlots(slotJs: string[]): JsCallback[] {
    return slotJs.map(js => this.compileSlotJs(js));
  }
}
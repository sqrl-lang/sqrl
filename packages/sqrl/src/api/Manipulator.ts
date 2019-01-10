/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlKey } from "../object/SqrlKey";
import { Context } from "./ctx";

export interface ExecutionErrorProperties {
  functionName?: string;
  fatal?: boolean;
}

export type ManipulatorCallback = (ctx: Context) => Promise<void>;
export abstract class Manipulator {
  constructor() {
    /* do nothing */
  }
  public codedWarnings: string[];
  public codedErrors: string[];

  abstract getCurrentHumanOutput(): any;
  abstract addCallback(cb: ManipulatorCallback);
  abstract mutate(ctx: Context): Promise<void>;
  abstract logError(err: Error, props: ExecutionErrorProperties): void;
  abstract throwFirstError(): void;

  trackSqrlKey(key: SqrlKey): void {
    /* optional function, do nothing by default */
  }
}

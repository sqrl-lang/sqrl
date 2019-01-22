import { Context } from "./ctx";

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
export abstract class UniqueId {
  abstract getTimeMs(): number;
  abstract getRemainder(): number;
  abstract getBuffer(): Buffer;
  abstract getNumberString(): string;

  getHexString() {
    return this.getBuffer().toString("hex");
  }
}

export interface UniqueIdService {
  create(ctx: Context): Promise<UniqueId>;
  fetch(ctx: Context, type: string, value: string): Promise<UniqueId>;
}
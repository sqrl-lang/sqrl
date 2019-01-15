/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { invariant } from "sqrl-common";

interface Closeable {
  close(): void;
}

export class CloseableGroup {
  private list: Closeable[] = [];
  private closed = false;

  add(obj: Closeable) {
    invariant(!this.closed, "The closeable group has already been closed.");
    this.list.push(obj);
  }
  close() {
    this.closed = true;
    this.list.forEach(o => o.close());
    this.list = [];
  }
}

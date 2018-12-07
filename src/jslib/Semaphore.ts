/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// @NOTE: Super-weak semaphore implementation. Used mostly for waiting until counts are empty but
// could/should be extended later. Probably by picking up a library that does better.

import bluebird = require("bluebird");

import { EventEmitter } from "events";
import invariant from "./invariant";
import pendingPromise, { PendingPromise } from "./pendingPromise";

import isPromise from "./isPromise";

const MAX_TIMEOUT = 30000;

export default class Semaphore extends EventEmitter {
  count: number;
  max: number | null;
  timeout: number;
  private _zeroPromiseResolver: PendingPromise<void> | null;
  private _resolvers: (() => void)[];

  constructor(
    options: {
      max?: number;
      timeout?: number;
    } = {}
  ) {
    super();
    this.count = 0;
    this.max = options.max || null;
    this.timeout = options.hasOwnProperty("timeout")
      ? options.timeout
      : MAX_TIMEOUT;

    this._zeroPromiseResolver = null;
    this._resolvers = [];
  }

  withLock(coroutine) {
    invariant(
      typeof coroutine === "function",
      "Function must be passed to withLock"
    );
    return this.increment().then(() => {
      const promise = coroutine();
      invariant(
        isPromise(promise),
        "Semaphore withLock coroutine must return a promise"
      );
      // Bluebird just required for `.finally`. Can get rid of it later.
      return bluebird.resolve(promise).finally(() => {
        this.decrement();
      });
    });
  }

  wrap<T>(promise: Promise<T> | bluebird<T>): bluebird<T> {
    invariant(
      this.max === null,
      "Cannot use wrap if semaphore has a max (might block)"
    );
    this.increment();
    // Bluebird just required for `.finally`. Can get rid of it later.
    return bluebird.resolve(promise).finally(() => {
      this.decrement();
    });
  }

  increment(): bluebird<void> {
    if (this.max === null || this.count < this.max) {
      this.count++;
      this.emit("change", this.count);
      return bluebird.resolve();
    } else {
      let promise: bluebird<void> = new bluebird((resolve, reject) => {
        this._resolvers.push(resolve);
      });
      if (this.timeout) {
        promise = promise.timeout(this.timeout, "Semaphore increase timeout");
      }
      return promise;
    }
  }
  decrement() {
    // If something is waiting for this, just pass the
    if (
      this._resolvers.length &&
      (this.max === null || this.count <= this.max)
    ) {
      const resolver = this._resolvers.shift();
      resolver();
      return;
    }
    this.count--;
    this.emit("change", this.count);
    if (this.count === 0 && this._zeroPromiseResolver) {
      this._zeroPromiseResolver.resolve();
      this._zeroPromiseResolver = null;
    }
  }

  // Synonyms for increment/decrement
  take() {
    return this.increment();
  }
  release() {
    return this.decrement();
  }

  setMax(max) {
    invariant(max === null || typeof max === "number", "Expected number/null");
    this.max = max;
    while (
      this._resolvers.length &&
      (this.max === null || this.count < this.max)
    ) {
      this.count++;
      const resolver = this._resolvers.shift();
      resolver();
      this.emit("change", this.count);
    }
  }
  getCount() {
    return this.count;
  }
  getRequestedCount() {
    return this.count + this._resolvers.length;
  }
  waitForZero() {
    if (this.count === 0) {
      return bluebird.resolve(null);
    } else if (!this._zeroPromiseResolver) {
      this._zeroPromiseResolver = pendingPromise();
    }
    return this._zeroPromiseResolver.promise;
  }
}

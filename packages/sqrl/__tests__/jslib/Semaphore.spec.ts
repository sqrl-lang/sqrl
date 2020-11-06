/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import Semaphore from "../../src/jslib/Semaphore";
import * as bluebird from "bluebird";

const setImmediatePromise = () => {
  return new Promise((resolve) => setImmediate(resolve));
};

test("hits promise when it gets to zero", async () => {
  const counter = new Semaphore();

  const counts = [];
  counter.on("change", (count?) => counts.push(count));

  // Make sure it yields immediately at first
  await counter.waitForZero();

  counter.increment();
  counter.increment();
  let promise = counter.waitForZero();

  expect(promise.isPending()).toBe(true);
  counter.decrement();
  expect(promise.isPending()).toBe(true);
  counter.decrement();
  expect(promise.isPending()).toBe(false);

  counter.increment();
  promise = counter.waitForZero();
  expect(promise.isPending()).toBe(true);
  counter.decrement();
  expect(promise.isPending()).toBe(false);

  expect(counts).toEqual([1, 2, 1, 0, 1, 0]);
});

test("locks as expected", async () => {
  const counter = new Semaphore({ max: 3 });
  const counts = [];
  counter.on("change", (count?) => counts.push(count));

  // Take two of the three
  let value = 0;
  counter.increment().then(function () {
    value++;
  });
  counter.increment().then(function () {
    value++;
  });

  await setImmediatePromise();

  expect(value).toEqual(2);

  // Third one
  counter.increment().then(function () {
    value++;
  });
  await setImmediatePromise();
  expect(value).toEqual(3);
  expect(counts).toEqual([1, 2, 3]);

  // Fourth (of three?!)
  counter.increment().then(function () {
    value++;
  });
  await setImmediatePromise();
  expect(value).toEqual(3);
  await setImmediatePromise();
  expect(value).toEqual(3);
  expect(counts).toEqual([1, 2, 3]);

  // Start a coroutine
  let coroutineStarted = false;
  const coroutinePromise = counter.withLock(async function () {
    coroutineStarted = true;
    await bluebird.delay(150);
    return "OKAY!";
  });

  counter.decrement();
  await setImmediatePromise();
  expect(value).toEqual(4);

  // The decrement was followed by an immediate increment, so no change emits
  expect(counts).toEqual([1, 2, 3]);

  expect(coroutineStarted).toEqual(false);
  await setImmediatePromise();
  expect(coroutineStarted).toEqual(false);

  counter.decrement();
  await setImmediatePromise();
  expect(coroutineStarted).toEqual(true);

  // Still no change is logged
  expect(counts).toEqual([1, 2, 3]);

  // Make sure when the coroutine finishes, the remaining count is the first two we took
  expect(await coroutinePromise).toBe("OKAY!");
  expect(counter.getCount()).toEqual(2);

  // Now finally the decrement to 2 is a change
  await bluebird.promisify(process.nextTick)();
  expect(counts).toEqual([1, 2, 3, 2]);

  // Reset the value, and add a ton of counters
  value = 0;
  for (let i = 0; i < 50; i++) {
    counter.increment().then(function () {
      value++;
    });
  }

  await setImmediatePromise();
  expect(value).toEqual(1);

  // Free up 7 more slots
  counter.setMax(10);
  await setImmediatePromise();
  expect(value).toEqual(8);

  // Disable the limit
  counter.setMax(null);
  await setImmediatePromise();
  expect(value).toEqual(50);
});

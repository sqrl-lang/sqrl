/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// Simple task manager so it is easier to ensure all tasks are complete before
// initiating a shutdown.
//
// All methods take a 'name' for debug purposes.

import bluebird = require("bluebird");
import Semaphore from "./Semaphore";

import invariant from "./invariant";
import { timeoutPromise } from "./timeoutPromise";

export class Task {
  removed: boolean = false;
  constructor(public name: string) {
    invariant(typeof name === "string", "Task name must be a string");
    TaskManager._semaphore.take();
  }
  remove() {
    invariant(this.removed === false, "Task has already been removed");
    this.removed = true;
    TaskManager._semaphore.release();
  }
}

export const TaskManager = {
  _counts: {},
  _semaphore: new Semaphore(),

  getTaskCount(): number {
    return TaskManager._semaphore.getCount();
  },

  buildCompletePromise(): Promise<void> {
    return TaskManager._semaphore.waitForZero();
  },

  add(name: string): Task {
    const task = new Task(name);

    if (TaskManager.testing.tasks) {
      // If we're capturing tasks in tests, also keep a dangling error that
      // includes a traceback of where the task was started
      TaskManager.testing.tasks.push({
        task,
        danglingError: new Error(`Task was dangling: ${name}`)
      });
    }

    return task;
  },

  wrap(name?, promise?) {
    const task = TaskManager.add(name);
    return bluebird.resolve(promise).finally(task.remove.bind(task));
  },

  testing: {
    tasks: null,
    ensureComplete: bluebird.method(async function(timeout) {
      // Make sure none are dangling from the previous test
      return timeoutPromise(TaskManager.buildCompletePromise(), timeout).catch(
        () => {
          (TaskManager.testing.tasks || []).forEach((entry?) => {
            if (!entry.task.removed) {
              throw entry.danglingError;
            }
          });
        }
      );
    }),
    reset() {
      TaskManager.testing.tasks = [];
      TaskManager._semaphore = new Semaphore();
    }
  }
};

export default TaskManager;

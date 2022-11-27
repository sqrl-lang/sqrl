/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { SimpleManipulator, WhenCause } from "sqrl";

export interface TweetResult {
  blocked: boolean;
  blockedCause?: WhenCause;
}
export class TweetManipulator extends SimpleManipulator {
  private result: TweetResult = {
    blocked: false,
  };

  blockTweet(cause: WhenCause) {
    this.result.blocked = true;
    this.result.blockedCause = cause;
  }

  getResult() {
    return this.result;
  }
}

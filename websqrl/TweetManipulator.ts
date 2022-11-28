/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { SimpleManipulator, WhenCause } from "sqrl";

interface BlockedTweetResult {
  blocked: true;
  blockedCause: WhenCause;
}

interface UnblockedTweetResult {
  blocked: false;
}

export type TweetResult = BlockedTweetResult | UnblockedTweetResult;

export class TweetManipulator extends SimpleManipulator {
  private result: TweetResult = {
    blocked: false,
  };

  blockTweet(cause: WhenCause) {
    this.result = {
      blocked: true,
      blockedCause: cause,
    };
  }

  getResult() {
    return this.result;
  }
}

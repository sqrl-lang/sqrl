/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { SimpleManipulator, WhenCause } from "sqrl";

interface ShownWebSQRLResult {
  shown: true;
  shownCause: WhenCause;
}

interface HiddenWebSQRLResult {
  shown: false;
}

export type WebSQRLResult = ShownWebSQRLResult | HiddenWebSQRLResult;

export class WebSQRLManipulator extends SimpleManipulator {
  private result: WebSQRLResult = {
    shown: false,
  };

  showEvent(cause: WhenCause) {
    this.result = {
      shown: true,
      shownCause: cause,
    };
  }

  getResult() {
    return this.result;
  }
}

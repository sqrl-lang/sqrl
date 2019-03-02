import { textSqrlTest } from "./helpers/textSqrlTest";

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

textSqrlTest(
  "works",
  `

  ASSERT sha256("67hello joe") = 'b42a77e208707718d939c3529dbfb5c9cfbf57f52551a72a352cbd64c74111b4';
  
  `
);

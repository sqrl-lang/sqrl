/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */

import { textSqrlTest } from "./helpers/textSqrlTest";

textSqrlTest(
  "works",
  `
 
 LET StoryOne := 'Once there was a horse named one, who was a very good horse indeed and loved to race every single day. This was true until one day there was a terrible accident.';
 LET StoryTwo := 'Once there was a horse named two, who was a very good horse indeed and loved to race every single day. This was true until one day there was a terrible accident.';

 ASSERT simhash(StoryOne) = "d9410e85";
 ASSERT simhash(StoryTwo) = "d9410685";
 
 `
);

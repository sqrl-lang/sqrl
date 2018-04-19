/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
const SECOND_IN_NS = 1e9;

export default function hrtimeToNs(hrtime: [number, number]) {
  return hrtime[0] * SECOND_IN_NS + hrtime[1];
}

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
export function isValidFeatureName(featureName) {
  return (
    typeof featureName === "string" && /^[A-Z][A-Za-z0-9_]*$/.test(featureName)
  );
}

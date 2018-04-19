// Copyright 2018 Twitter, Inc.
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

module.exports = {
  setupTestFrameworkScriptFile: "jest-extended",
  transform: {
    ".(ts)": "<rootDir>/node_modules/ts-jest/preprocessor.js"
  },
  globals: {
    __INTEGRATION__: false
  },
  testRegex: "/__tests__/.*\\.spec\\.ts$",
  moduleFileExtensions: ["ts", "js"],
  testEnvironment: "node"
};

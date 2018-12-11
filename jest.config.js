// Copyright 2018 Twitter, Inc.
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const base = require("./jest.base");

module.exports = {
  ...base,
  projects: ["packages/sqrl/jest.config.js"],
  coverageDirectory: "<rootDir>/coverage/",
  testRegex: `.*\\.spec\\.ts$`
};

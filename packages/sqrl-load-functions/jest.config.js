// Copyright 2018 Twitter, Inc.
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const base = require("../../jest.base");
const package = require("./package");

module.exports = {
  ...base,
  displayName: package.name,
  rootDir: "../..",
  testRegex: `/packages/${package.name}/__tests__/.*\\.spec\\.ts$`,
};

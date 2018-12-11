// Copyright 2018 Twitter, Inc.
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const base = require("../../jest.base");
const package = require("./package");

module.exports = {
  ...base,
  name: package.name,
  rootDir: "../..",
  setupTestFrameworkScriptFile: "jest-extended",
  transform: {
    "\\.ts$": "ts-jest"
  },
  testRegex: `<rootDir>/packages/${package.name}/__tests__/.*\\.spec\\.ts$`,
  moduleFileExtensions: ["ts", "js"],
  testEnvironment: "node"
};

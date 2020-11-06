// Copyright 2018 Twitter, Inc.
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const base = require("./jest.base");
const glob = require("glob");
const path = require("path");

module.exports = {
  ...base,
  projects: glob.sync(path.join(__dirname, 'packages/*/jest.config.js')),
  coverageDirectory: "<rootDir>/coverage/",
  testRegex: `.*/__tests__/.*\\.spec\\.ts$`
};

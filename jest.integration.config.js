// Copyright 2018 Twitter, Inc.
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const config = require("./jest.config");
const glob = require('glob');
const path = require('path');

module.exports = {
  ...config,
  projects: glob.sync(path.join(__dirname, 'packages/*/jest.integration.config.js')),
};

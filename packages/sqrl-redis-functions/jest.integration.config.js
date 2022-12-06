// Copyright 2018 Twitter, Inc.
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

const config = require("./jest.config");

module.exports = {
  ...config,
  globals: {
    ...(config.globals || {}),
    __INTEGRATION__: true,
  },
};

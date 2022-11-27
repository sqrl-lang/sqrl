// Copyright 2018 Twitter, Inc.
// Licensed under the Apache License, Version 2.0
// http://www.apache.org/licenses/LICENSE-2.0

module.exports = {
  setupFilesAfterEnv: ["jest-extended/all"],
  transform: {
    ".+\\.tsx?$": [
      "ts-jest",
      {
        tsconfig: "<rootDir>/tsconfig.jest.json",
      },
    ],
  },
  globals: {
    __INTEGRATION__: false,
  },
  moduleFileExtensions: ["ts", "js", "node"],
  testEnvironment: "node",
};

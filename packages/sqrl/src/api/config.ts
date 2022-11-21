/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { validate } from "jsonschema";

const CONFIG_SCHEMA = {
  $schema: "http://json-schema.org/draft-07/schema#",
  $id: "http://sqrl-lang.github.io/sqrl/schema/Config",
  title: "Config",
  additionalProperties: false,

  properties: {
    "state.allow-in-memory": {
      type: "boolean",
      description:
        "Enable in-memory state storage if database addresses are not provided",
    },

    "redis.address": {
      type: "string",
      description: "Address of a redis server to use as storage",
    },

    "testing.fixed-date": {
      type: "string",
      description: "A fixed date time for testing",
    },
  },

  // Per-package configuration is in square brackets by package name
  patternProperties: {
    "^[.*]$": {
      type: "object",
      patternProperties: {
        "^[a-z][a-z-]*(.[a-z][a-z-]*)+$": {},
      },
    },
  },
};

// @todo: We should be able to generate a type from the schema
export interface Config {
  "state.allow-in-memory"?: boolean;
  "redis.address"?: string;
  "testing.fixed-date"?: string;

  [packageName: string]:
    | any
    | {
        [settingName: string]: any;
      };
}

const DEFAULT_CONFIG: Config = {
  "state.allow-in-memory": false,
  "redis.address": process.env.SQRL_REDIS || null,
};

export function getConfigSchema() {
  return CONFIG_SCHEMA;
}

export function getDefaultConfig(): Config {
  return DEFAULT_CONFIG;
}

export function validateConfig(config: Config) {
  validate(config, CONFIG_SCHEMA);
}

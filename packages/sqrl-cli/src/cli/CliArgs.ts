/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { docopt } from "docopt";
import { isValidFeatureName, FeatureMap } from "sqrl";
import { readJsonFileSync } from "./readJsonFile";
import { CliError } from "./CliError";
import { invariant } from "sqrl-common";

export const CliDoc = `
Usage:
  sqrl [options] print <filename> [(-s <key=value>)...]
  sqrl [options] run <filename> [--stream=<feature>] [(-s <key=value>)...] [<feature>...]
  sqrl [options] repl [<filename> [(-s <key=value>)...]]
  sqrl [options] serve [--port=<port>] <filename>
  sqrl [options] compile <filename> [(-s <key=value>)...]
  sqrl [options] test <filename>
  sqrl [options] help functions

Options:
  --config=<path>          Load the provided given JSON file as configuration
  --color=<when>           Force color in ouput. When can be \`never\`, \`always\`, or \`auto\`.
  --stream=<feature>       Stream inputs to the given feature from stdin as newline seperated json
  --require=<package>      Require packages that contain SQRL functions
  --concurrency=<N>        Limit actions processed in parallel [default: 50]
  --compiled               Read compiled SQRL rather than source
  --only-blocked           Only show blocked actions
  --redis=<address>        Address of redis server
  --output=<output>        Output format [default: pretty]
  --port=<port>            Port for server [default: 2288]
  --skip-default-requires  Do not include bundled SQRL function packages
`;

export const defaultDocOptArgs: DocOptArgs = {
  "--output": "pretty",
  "--concurrency": "50",
  "--port": "2288",
  "<feature>": [],
  "<key=value>": []
};

export interface DocOptArgs {
  compile?: boolean;
  run?: boolean;
  serve?: boolean;
  print?: boolean;
  repl?: boolean;
  test?: boolean;
  help?: boolean;
  "<filename>"?: string;
  "<feature>": string[];
  "<key=value>": string[];
  "--config"?: string;
  "--redis"?: string;
  "--require"?: string; // @todo: would be great if this could be specified multiple times
  "--compiled"?: boolean;
  "--output": string;
  "--concurrency": string;
  "--port": string;
  "--skip-default-requires"?: boolean;
}

export interface BaseArgs {
  output: string;
  config: string | null;
  redis: string | null;
  skipDefaultRequires: boolean;
  requires: string[];

  // @note: These don't apply to all functions, but a refactor is required to
  // move them out of BaseAgs
  features: string[];
  onlyBlocked: boolean;
}
export interface CompiledCommandArgs extends BaseArgs {
  inputs: FeatureMap;
  filename: string | null;
  compiled: boolean;
}

export interface CompileArgs extends CompiledCommandArgs {
  command: "compile";
}

export interface HelpArgs extends BaseArgs {
  command: "help";
  section: "functions";
}

export interface PrintArgs extends BaseArgs {
  command: "print";
}

export interface ReplArgs extends CompiledCommandArgs {
  command: "repl";
}

export interface RunArgs extends CompiledCommandArgs {
  command: "run";
  concurrency: number;
  streamFeature: string | null;
}

export interface ServeArgs extends CompiledCommandArgs {
  command: "serve";
  port: number;
}

export interface TestArgs extends BaseArgs {
  command: "test";
  filename: string;
}

export type CliArgs =
  | CompileArgs
  | HelpArgs
  | PrintArgs
  | ReplArgs
  | RunArgs
  | ServeArgs
  | TestArgs;

function getInputs(args: DocOptArgs) {
  const inputs: FeatureMap = {};
  for (const pair of args["<key=value>"]) {
    const [key] = pair.split("=", 1);
    const valueString = pair.substring(key.length + 1);

    if (!isValidFeatureName(key)) {
      throw new CliError(
        "Invalid feature name for input: " + JSON.stringify(key)
      );
    }
    if (valueString.startsWith("@")) {
      const path = valueString.substring(1);
      inputs[key] = readJsonFileSync(path);
      continue;
    }

    try {
      const value = JSON.parse(valueString);
      inputs[key] = value;
    } catch (err) {
      // tslint:disable-next-line:no-console
      console.error(
        `Warning: Invalid JSON value for ${key}, assuming string: ${JSON.stringify(
          valueString
        )}`
      );
      inputs[key] = valueString;
    }
  }
  return inputs;
}

function getBaseArgs(args: DocOptArgs): BaseArgs {
  return {
    features: args["<feature>"] || [],
    onlyBlocked: args["--only-blocked"],
    output: args["--output"],
    config: args["--config"] || null,
    redis: args["--redis"] || null,
    requires: (args["--require"] || "").split(",").filter(v => v),
    skipDefaultRequires: args["--skip-default-requires"] || false
  };
}

function getCompiledCommandArgs(args: DocOptArgs): CompiledCommandArgs {
  return {
    ...getBaseArgs(args),
    inputs: getInputs(args),
    filename: args["<filename>"] || null,
    compiled: args["--compiled"] || false
  };
}

function intArg(args: DocOptArgs, arg: string) {
  const value = parseInt(args[arg], 10);
  invariant(!isNaN(value), "Expected number for argument: " + arg);
  return value;
}

export function docOptToCliArgs(args: DocOptArgs): CliArgs {
  if (args.compile) {
    return {
      command: "compile",
      ...getCompiledCommandArgs(args)
    };
  } else if (args.help) {
    return {
      command: "help",
      ...getBaseArgs(args),
      section: "functions"
    };
  } else if (args.repl) {
    return {
      command: "repl",
      ...getCompiledCommandArgs(args)
    };
  } else if (args.run) {
    return {
      command: "run",
      ...getCompiledCommandArgs(args),
      concurrency: intArg(args, "--concurrency"),
      streamFeature: args["--stream"] || null
    };
  } else if (args.serve) {
    return {
      command: "serve",
      port: intArg(args, "--port"),
      ...getCompiledCommandArgs(args)
    };
  } else if (args.test) {
    return {
      command: "test",
      ...getBaseArgs(args),
      filename: args["<filename>"]
    };
  } else {
    throw new Error("Unknown docopt command");
  }
}

export function parseArgs(argv?: string[]): CliArgs {
  if (!argv) {
    argv = process.argv.slice(2);
  }
  const args: DocOptArgs = {
    defaultDocOptArgs,
    ...docopt(CliDoc, {
      version: 0.1,
      argv
    })
  };

  return docOptToCliArgs(args);
}

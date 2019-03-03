/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-console
// tslint:disable:no-submodule-imports (@TODO)
import { createSqrlServer, ServerWaitCallback } from "../SqrlServer";
import { SqrlTest } from "sqrl/lib/testing/SqrlTest";
import { SqrlRepl } from "../repl/SqrlRepl";
import * as path from "path";
import * as waitForSigint from "wait-for-sigint";
import {
  AssertService,
  SqrlObject,
  sqrlCompare,
  executableFromSpec,
  FunctionRegistry,
  Executable,
  compileFromFilesystem,
  ExecutableCompiler,
  ExecutableSpec,
  getDefaultConfig,
  Config,
  Manipulator,
  FunctionServices,
  LogService,
  LocalFilesystem,
  Filesystem
} from "sqrl";
import SqrlAst from "sqrl/lib/ast/SqrlAst";
import { StatementAst } from "sqrl/lib/ast/Ast";
import { sourceOptionsFromPath } from "sqrl/lib/helpers/CompileHelpers";
import { createDefaultContext } from "sqrl/lib/helpers/ContextHelpers";
import { WatchedFilesystem } from "./WatchedFilesystem";
import { CliPrettyOutput } from "./CliPrettyOutput";
import { CliRun } from "./CliRun";
import {
  CliActionOutput,
  CliCsvOutput,
  CliOutputOptions,
  CliJsonOutput,
  CliOutput,
  CliCompileOutput,
  CliExprOutput,
  CliSlotJsOutput,
  CliTableOutput
} from "./CliOutput";
import { getGlobalLogger } from "sqrl/lib/api/log";
import { SimpleDatabaseSet } from "sqrl/lib/platform/DatabaseSet";
import { SimpleContext } from "sqrl/lib/platform/Trace";
import { Readable, Writable } from "stream";
import { CloseableGroup } from "../jslib/Closeable";

// tslint:disable-next-line:no-duplicate-imports
import * as SQRL from "sqrl";
import { invariant } from "sqrl-common";
import { renderFunctionsHelp } from "../renderFunctionsHelp";
import { CliError } from "./CliError";
import { CliManipulator } from "sqrl-cli-functions";
import Semaphore from "sqrl/lib/jslib/Semaphore";
import { CliArgs } from "./CliArgs";
import { readJsonFile } from "./readJsonFile";

const STATEFUL_FUNCTIONS = ["_fetchRateLimit", "_fetchSession", "_entity"];

export function getCliOutput(
  args: CliArgs,
  stdout: Writable = process.stdout
): CliOutput {
  const outputOptions: CliOutputOptions = {
    stdout,
    features: args.features,
    onlyBlocked: args.onlyBlocked
  };
  if (args.output === "pretty") {
    if (args.command === "compile") {
      return new CliSlotJsOutput(stdout);
    } else {
      return new CliPrettyOutput(outputOptions);
    }
  } else if (args.output === "csv") {
    return new CliCsvOutput(outputOptions);
  } else if (args.output === "table") {
    return new CliTableOutput(outputOptions);
  } else if (args.output === "json") {
    return new CliJsonOutput(outputOptions);
  } else if (args.output === "expr") {
    return new CliExprOutput(stdout);
  } else if (args.output === "slot-js") {
    return new CliSlotJsOutput(stdout);
  } else {
    throw new CliError("Unknown output type: " + args.output);
  }
}

export class CliAssertService implements AssertService {
  compare(
    manipulator: Manipulator,
    left: any,
    operator: string,
    right: any,
    arrow: string
  ) {
    if (!sqrlCompare(left, operator, right)) {
      console.error("Assertion failed:", left, operator, right);
      console.error(arrow);
      process.exit(1);
    }
  }
  ok(manipulator: Manipulator, value: any, arrow: string) {
    if (!SqrlObject.isTruthy(value)) {
      console.error("Assertion failed:", value);
      console.error(arrow);
      process.exit(1);
    }
  }
}

export class CliLogService implements LogService {
  log(manipulator: Manipulator, message: string) {
    if (!(manipulator instanceof CliManipulator)) {
      throw new Error("Expected CliManipulator");
    }
    manipulator.log(message);
  }
}

async function buildInstance(
  args: CliArgs
): Promise<{
  functionRegistry: FunctionRegistry;
}> {
  const config: Config = {
    ...getDefaultConfig(),
    "state.allow-in-memory": true,
    ...(args.config ? await readJsonFile(args.config) : {})
  };

  // Allow the --redis argument to override the config
  if (args.redis) {
    config["redis.address"] = args.redis;
  }

  const services: FunctionServices = {
    assert: new CliAssertService(),
    log: new CliLogService()
  };
  const functionRegistry = SQRL.buildFunctionRegistry({ config, services });

  const requires = [
    ...(args.skipDefaultRequires
      ? []
      : [
          "sqrl-redis-functions",
          "sqrl-text-functions",
          "sqrl-load-functions",
          "sqrl-cli-functions"
        ]),
    ...args.requires
  ];

  for (const name of requires) {
    await functionRegistry.importFromPackage(name, await import(name));
  }

  return { functionRegistry };
}

type FunctionRegistrator = (registry: FunctionRegistry) => void;

export interface CliMainOptions {
  registerFunctions?: FunctionRegistrator;
  output?: CliOutput;
  stdin?: Readable;
  stdout?: Writable;
  serverWaitCallback?: ServerWaitCallback;
  filesystem?: Filesystem;
}

export async function cliMain(
  args: CliArgs,
  closeables: CloseableGroup,
  options: CliMainOptions = {}
) {
  const defaultTrc = createDefaultContext();
  let output: CliOutput;
  if (options.output) {
    output = options.output;
  } else {
    output = getCliOutput(args, options.stdout || process.stdout);
    closeables.add(output);
  }

  const { functionRegistry } = await buildInstance(args);
  if (options.registerFunctions) {
    options.registerFunctions(functionRegistry);
  }

  if (args.command === "help") {
    if (output instanceof CliPrettyOutput) {
      console.log(renderFunctionsHelp(functionRegistry));
    } else {
      output.printFunctions(functionRegistry.listFunctions());
    }
  } else if (args.command === "test") {
    const { filesystem, source } = await sourceOptionsFromPath(args.filename);

    const test = new SqrlTest(functionRegistry._functionRegistry, {
      filesystem,
      manipulatorFactory: () => new CliManipulator()
    });

    // @todo: If we're using stateful storage this might cause conflicts
    const datasetId = "0";

    const ctx = new SimpleContext(
      new SimpleDatabaseSet(datasetId),
      getGlobalLogger()
    );

    await test.run(ctx, source);
  } else if (
    args.command === "compile" ||
    args.command === "run" ||
    args.command === "serve" ||
    args.command === "repl"
  ) {
    const ctx = defaultTrc;
    const { compiled, filename, inputs } = args;

    const { functionRegistry } = await buildInstance(args);
    if (options.registerFunctions) {
      options.registerFunctions(functionRegistry);
    }

    // <filename> is sqrl source code
    let executable: Executable | null = null;
    let spec: ExecutableSpec = null;
    let compiler: ExecutableCompiler = null;

    let watchedSource: WatchedFilesystem = null;
    let filesystem: Filesystem;

    if (options.filesystem) {
      filesystem = options.filesystem;
    } else if (args.command === "run" && args.streamFeature) {
      watchedSource = new WatchedFilesystem(path.dirname(args.filename));
      filesystem = watchedSource;
    } else if (args.filename) {
      filesystem = new LocalFilesystem(path.dirname(args.filename));
    }

    /***
     * Return the loaded source code. This should not be done inside the async
     * function as we want to log the moment the change occurs.
     */
    async function loadSource() {
      if (compiled) {
        spec = await readJsonFile(filename);
        return {
          executable: executableFromSpec(functionRegistry, spec),
          spec: null,
          compiler: null
        };
      } else {
        return compileFromFilesystem(functionRegistry, filesystem, {
          context: ctx,
          mainFile: path.basename(filename),
          setInputs: inputs
        });
      }
    }

    let run: CliRun;

    // Lock to ensure we only compile once at a time
    const compilingLock = new Semaphore({ max: 1 });
    await compilingLock.take();

    let streamFeature: string = null;
    if (args.command === "run") {
      streamFeature = args.streamFeature;

      if (streamFeature) {
        watchedSource.on("change", async () => {
          await compilingLock.take();
          try {
            await run.triggerRecompile(() => {
              return loadSource().then(rv => rv.executable);
            });
          } finally {
            compilingLock.release();
          }
        });
      }
    }

    if (args.filename) {
      ({ executable, spec, compiler } = await loadSource());

      if (args.command === "run") {
        // In run mode, make sure we have all required inputs
        for (const feature of executable.getRequiredFeatures()) {
          if (!inputs.hasOwnProperty(feature) && streamFeature !== feature) {
            throw new CliError("Required input was not provided: " + feature, {
              suggestion: `Try add: -s ${feature}=<value>`
            });
          }
        }
      }

      const allFeatures = executable.getFeatures();
      for (const feature of [...args.features, ...Object.keys(inputs)]) {
        if (!allFeatures.includes(feature)) {
          throw new CliError("Feature not defined: " + feature);
        }
      }

      if (compiler && !functionRegistry.getConfig()["redis.address"]) {
        for (const func of compiler.getUsedFunctions(ctx)) {
          if (STATEFUL_FUNCTIONS.includes(func)) {
            console.error(
              "Warning: Using stateful functions but `--redis` flag was not provided. State will be in-memory only."
            );
            break;
          }
        }
      }
    }

    if (args.command === "run") {
      if (!(output instanceof CliActionOutput)) {
        throw new CliError("Output format not compatible with `run`");
      }
      run = new CliRun(executable, output);
      compilingLock.release();

      if (streamFeature) {
        output.startStream();

        let concurrency: number = null;
        if (args.concurrency) {
          concurrency = args.concurrency;
        }
        await run.stream({
          ctx,
          inputs,
          concurrency,
          streamFeature,
          features: args.features
        });
      } else {
        await run.action(ctx, inputs, args.features);
      }

      run.close();
    } else if (args.command === "compile") {
      if (!(output instanceof CliCompileOutput)) {
        throw new CliError("Output format not compatible with `compile`");
      }
      invariant(compiler, "Compile options must include a filename");
      await output.compiled(spec, compiler);
    } else if (args.command === "repl") {
      let filesystem: Filesystem = new LocalFilesystem(process.cwd());
      const statements: StatementAst[] = [];
      if (executable) {
        ({ filesystem } = await sourceOptionsFromPath(args.filename));
        statements.push(SqrlAst.include(path.basename(args.filename)));
      }
      const test = new SqrlTest(functionRegistry._functionRegistry, {
        filesystem,
        manipulatorFactory: () => new CliManipulator(),
        inputs
      });
      await test.runStatements(ctx, statements);
      const repl = new SqrlRepl(functionRegistry, test, {
        traceFactory: () => ctx,
        stdin: options.stdin,
        stdout: options.stdout
      });
      repl.start();
      await new Promise(resolve => {
        repl.on("exit", resolve);
      });
    } else if (args.command === "serve") {
      // Read the port from the argument, or `0` for automatically pick
      const server = createSqrlServer(ctx, executable);
      server.listen(args.port);

      await new Promise((resolve, reject) => {
        server.on("listening", resolve);
        server.on("error", err => reject(err));
      });

      try {
        // If port was 0 it might have changed by this point
        const address = server.address();
        if (typeof address === "string") {
          throw new Error("Expected `AddressInfo` from server.address()");
        }
        console.log("Serving", args.filename, "on port", address.port);

        const serverWaitCallback = options.serverWaitCallback || waitForSigint;
        await serverWaitCallback({ server });
      } finally {
        server.close();
      }
    } else {
      throw new Error("Unknown cli command");
    }
  } else {
    throw new Error("Unknown cli command");
  }
}

import * as SQRL from "sqrl";
import * as sqrlJsonPath from "sqrl-jsonpath";
import * as sqrlRedisFunctions from "sqrl-redis-functions";
import * as sqrlTextFunctions from "sqrl-text-functions/web";
import { Request, Response, WikiEvent, LogEntry } from "../src/types";
import { Execution, AT } from "sqrl";
import { invariant } from "../src/invariant";

const COMPILE_DEBOUNCE_MS = 15;
const ctx: Worker = self as any;

let compileTimeout: any = null;

function respond(response: Response) {
  ctx.postMessage(response);
}

// TODO(meyer) look into why this isn't getting transformed
(ctx as any).setImmediate = (func: (...args: any) => void) => {
  setTimeout(func, 0);
};

async function buildInstance() {
  const instance = SQRL.createInstance({
    config: {
      "state.allow-in-memory": true,
      "sqrl-text-functions": {
        builtinRegExp: true,
      },
    },
  });
  await instance.importFromPackage("sqrl-jsonpath", sqrlJsonPath);
  await instance.importFromPackage("sqrl-redis-functions", sqrlRedisFunctions);
  await instance.importFromPackage("sqrl-text-functions", sqrlTextFunctions);

  instance.registerStatement(
    "SqrlLogStatements",
    async function consoleLog(state: Execution, format: string, ...args) {
      console.log(format, ...args);
    },
    {
      allowNull: true,
      args: [AT.state, AT.any.repeated],
      argstring: "format string, value...",
      docstring: "Logs a message using console.log()",
    }
  );

  instance.registerStatement(
    "SqrlLogStatements",
    async function log(state: Execution, format: string, ...args) {
      state.setDefault<LogEntry[]>(logStore, []).push({
        format,
        args,
      });
    },
    {
      allowNull: true,
      args: [AT.state, AT.any.repeated],
      argstring: "format string, value...",
      docstring: "Logs a message using console.log()",
    }
  );
  return instance;
}

let instancePromise: Promise<SQRL.Instance> = null;

const logStore = Symbol("logs");
async function compile(source: string) {
  if (!instancePromise) {
    instancePromise = buildInstance().catch((err) => {
      instancePromise = null;
      throw err;
    });
  }
  const instance = await instancePromise;
  const fs = new SQRL.VirtualFilesystem({
    "main.sqrl": source,
  });
  const { executable } = await SQRL.compileFromFilesystem(instance, fs);

  return executable;
}

let latestSource: string = "";
let latestExecutable: SQRL.Executable;
let compilePromise: Promise<void> = null;

function triggerCompile() {
  const source = latestSource;
  return compile(source)
    .then((exe) => {
      if (source === latestSource) {
        latestExecutable = exe;

        respond({
          type: "compileOkay",
          source,
        });
      }
    })
    .catch((err) => {
      let message = err.stack;
      if (err.location) {
        message =
          "Line " +
          err.location.start.line +
          ":\n" +
          // sourceArrow(source, err.location) +
          "\n" +
          message;
      }
      respond({
        type: "compileError",
        message,
        source,
      });
    })
    .finally(() => {
      compilePromise = null;
      if (source !== latestSource) {
        debounceCompile();
      }
    });
}

async function runEvent(event: WikiEvent) {
  invariant(latestExecutable, "No executable to process event");

  const ctx = SQRL.createSimpleContext();
  const execution = await latestExecutable.execute(ctx, {
    manipulator: new SQRL.SimpleManipulator(),
    inputs: {
      EventData: event,
    },
  });

  await execution.fetchFeature("SqrlExecutionComplete");
  await execution.manipulator.mutate(ctx);

  return {
    logs: execution.get<LogEntry[]>(logStore, []),
  };
}
function debounceCompile() {
  if (!compilePromise) {
    clearTimeout(compileTimeout);
    compileTimeout = setTimeout(triggerCompile, COMPILE_DEBOUNCE_MS);
  }
}

ctx.addEventListener("message", (event) => {
  const message = event.data as Request;

  if (message.type === "compile") {
    const { source } = message;
    latestSource = source;
    debounceCompile();
  } else if (message.type === "event") {
    if (latestExecutable) {
      runEvent(message.event).then(
        (props) => {
          respond({
            type: "result",
            source: latestSource,
            ...props,
          });
        },
        (err) => {
          respond({
            type: "runtimeError",
            message: err.stack,
            source: latestSource,
          });
        }
      );
    }
  }
});

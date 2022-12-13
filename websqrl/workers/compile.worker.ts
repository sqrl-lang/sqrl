import * as SQRL from "sqrl";
import * as sqrlJsonPath from "sqrl-jsonpath";
import * as sqrlLoadFunctions from "sqrl-load-functions";
import * as sqrlRedisFunctions from "sqrl-redis-functions";
import * as sqrlTextFunctions from "sqrl-text-functions";
import { Request, Response, EventData, LogEntry } from "../src/types";
import { Execution, AT, WhenCause, FeatureMap } from "sqrl";
import { invariant } from "../src/invariant";
import { TweetManipulator } from "../TweetManipulator";
import badWordsRot13 from "../src/bad-words-rot13.json";

const COMPILE_DEBOUNCE_MS = 200;

let compileTimeout: any = null;

function respond(response: Response<string>) {
  self.postMessage(response);
}

// TODO(meyer) look into why this isn't getting transformed
self.setImmediate = ((func: (...args: any[]) => void) => {
  setTimeout(func, 0);
}) as any;

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
  await instance.importFromPackage("sqrl-load-functions", sqrlLoadFunctions);

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

  instance.registerStatement(
    "SqrlBlockStatements",
    async function blockTweet(state: Execution, cause: WhenCause) {
      if (!(state.manipulator instanceof TweetManipulator)) {
        throw new Error("Expected TweetManipulator for WebSQRL");
      }
      state.manipulator.blockTweet(cause);
    },
    {
      args: [AT.state, AT.whenCause],
      allowNull: true,
      argstring: "",
      docstring: "Mark the current action as blocked",
    }
  );

  return instance;
}

let instancePromise: Promise<SQRL.Instance> | null = null;

const logStore = Symbol("logs");

function stringRot13(input) {
  const prev = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  const next = 'NOPQRSTUVWXYZABCDEFGHIJKLMnopqrstuvwxyzabcdefghijklm';
  return input.split('').map(chr => {
    const idx = prev.indexOf(chr);
    return idx >= 0 ? next[idx] : chr;
  }).join('');
}

async function compile(source: string) {
  if (!instancePromise) {
    instancePromise = buildInstance()
      .catch((err) => {
        instancePromise = null;
        throw err;
      })
      .then((instance) => {
        respond({
          type: "sqrlInit",
          functions: instance.listFunctions(),
        });
        return instance;
      });
  }



  const instance = await instancePromise;
  const fs = new SQRL.VirtualFilesystem({
    "main.sqrl": source,
    'bad-words.txt': badWordsRot13.map(w => stringRot13(w)).join('\n'),
  });
  const { executable } = await SQRL.compileFromFilesystem(instance, fs);

  return executable;
}

let latestSource: string = "";
let latestExecutable: SQRL.Executable;
let compilePromise: Promise<void> | null = null;

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
      console.error(err);
      respond({
        type: "compileError",
        stack: err.stack,
        message: err.message,
        location: err.location,
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

async function runEvent(event: EventData, requestFeatures: readonly string[]) {
  invariant(latestExecutable, "No executable to process event");

  const ctx = SQRL.createSimpleContext();
  const manipulator = new TweetManipulator();
  const execution = await latestExecutable.execute(ctx, {
    manipulator,
    inputs: {
      EventData: event,
    },
  });

  const completePromise = execution.fetchFeature("SqrlExecutionComplete");

  const features: FeatureMap = {};
  await Promise.all(
    requestFeatures.map(async (name) => {
      features[name] = await execution.fetchValue(name);
    })
  );

  await completePromise;
  await manipulator.mutate(ctx);

  return {
    logs: execution.get<LogEntry[]>(logStore, []),
    result: manipulator.getResult(),
    features,
  };
}
function debounceCompile() {
  if (!compilePromise) {
    clearTimeout(compileTimeout);
    compileTimeout = setTimeout(triggerCompile, COMPILE_DEBOUNCE_MS);
  }
}

self.addEventListener("message", (event) => {
  const message = event.data as Request<string>;

  if (message.type === "compile") {
    const { source } = message;
    latestSource = source;
    debounceCompile();
  } else if (message.type === "event") {
    if (latestExecutable) {
      runEvent(message.event, message.requestFeatures).then(
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

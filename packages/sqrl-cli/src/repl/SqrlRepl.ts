/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
// tslint:disable:no-console
// tslint:disable:no-submodule-imports (@TODO)

import * as repl from "repl";
import { SqrlTest } from "sqrl/lib/testing/SqrlTest";
import { parseRepl } from "sqrl/lib/parser/SqrlParse";
import SqrlAst from "sqrl/lib/ast/SqrlAst";
import * as expandTilde from "expand-tilde";
import { existsSync, readFileSync, appendFileSync } from "fs";
import { EventEmitter } from "eventemitter3";
import { Ast, StatementAst } from "sqrl/lib/ast/Ast";
import { SqrlCompileError, SqrlObject, Context, FunctionRegistry } from "sqrl";
import chalk from "chalk";
import { SlotMissingCallbackError } from "sqrl/lib/execute/SqrlExecutionState";
import { isValidFeatureName } from "sqrl/lib/feature/FeatureName";
import { Readable, Writable } from "stream";
import Semaphore from "sqrl/lib/jslib/Semaphore";
import { invariant } from "sqrl-common";
import { spanToShell } from "../spanToShell";

export class SqrlRepl extends EventEmitter {
  private traceFactory: () => Context;
  private server: repl.REPLServer | null = null;
  private historyPath: string = expandTilde("~/.sqrl_repl_history");
  private stdin: Readable;
  private stdout: Writable;
  private busy = new Semaphore();

  constructor(
    private functionRegistry: FunctionRegistry,
    private test: SqrlTest,
    options: {
      traceFactory: () => Context;
      stdin?: Readable;
      stdout?: Writable;
    }
  ) {
    super();
    this.traceFactory = options.traceFactory;
    this.stdin = options.stdin || process.stdin;
    this.stdout = options.stdout || process.stdout;
  }

  async repl(ctx: Context, input: string): Promise<any> {
    let returnFeature = null;

    if (isValidFeatureName(input.trim())) {
      returnFeature = input.trim();
    } else {
      const ast = parseRepl(input, {
        customFunctions: this.functionRegistry._wrapped.customFunctions
      });
      const statements = ast.statements;
      if (!statements.length) {
        return;
      }

      // If the last statement is an expression, save its result in SqrlReplOutput
      let last: Ast = statements[statements.length - 1];

      // If it's a call, make sure it's to a statement otherwise treat as an expression
      if (last.type === "call") {
        if (
          this.functionRegistry._wrapped.has(last.func) &&
          !this.functionRegistry._wrapped.isStatement(last.func)
        ) {
          last = {
            type: "expr",
            location: last.location,
            expr: last
          };
        }
      }

      if (last.type === "let") {
        returnFeature = last.feature;
      } else if (last.type === "expr") {
        statements.pop();
        const { expr, location } = last;
        statements.push(
          SqrlAst.letStatement("SqrlReplOutput", expr, {
            description: null,
            location
          })
        );
        returnFeature = "SqrlReplOutput";
      }

      // @NOTE: Only the last statement could be an Expr and that is handled
      // above. Newer TypeScript version may be able to handle this constraint
      // without a cast.
      await this.test.runStatements(ctx, statements as StatementAst[]);
    }

    if (returnFeature) {
      const state = await this.test.executeStatements(ctx, []);
      return state.fetchByName(returnFeature);
    }
  }

  private printHelp() {
    for (const [name, props] of Object.entries(
      this.functionRegistry._wrapped.functionProperties
    ).sort()) {
      if (!name.startsWith("_")) {
        console.log(
          `${name}: ${props.docstring || chalk.gray("<no docstring provided>")}`
        );
      }
    }
  }

  private async eval(cmd, context, filename) {
    this.busy.increment();
    const ctx = this.traceFactory();
    try {
      appendFileSync(this.historyPath, cmd);

      if (cmd.trim() === "help") {
        this.printHelp();
        return;
      }

      const result = await this.repl(ctx, cmd);

      if (result instanceof SqrlObject) {
        console.log(spanToShell(result.render()).trimRight());
        return result.getBasicValue();
      }

      return result;
    } catch (e) {
      if (this.isRecoverableError(e)) {
        throw new repl.Recoverable(e);
      } else if (e instanceof SqrlCompileError) {
        console.log(chalk.red(e.message));
        return;
      } else if (e instanceof SlotMissingCallbackError) {
        console.log(
          chalk.red("Required feature was not defined: ") +
            chalk.red.bold(e.slotName)
        );
      } else {
        throw e;
      }
    } finally {
      this.busy.decrement();
    }
  }

  isRecoverableError(error) {
    return / but end of input found\.$/.test(error.message);
  }

  readHistory() {
    if (existsSync(this.historyPath)) {
      return readFileSync(this.historyPath, { encoding: "utf-8" })
        .split("\n")
        .reverse()
        .filter(line => line.trim());
    } else {
      return [];
    }
  }

  on(event: "exit", callback: () => void);
  on(event, callback) {
    invariant(event === "exit", "Only exit event is supported");
    super.on("exit", () => {
      this.busy.waitForZero().then(callback);
    });
  }

  start() {
    this.server = repl.start({
      input: this.stdin,
      output: this.stdout,
      prompt: "sqrl> ",
      ignoreUndefined: true,
      eval: (cmd, context, filename, callback) => {
        this.eval(cmd, context, filename).then(
          rv => callback(null, rv),
          err => callback(err, null)
        );
      }
    });
    this.server.on("exit", () => {
      this.server = null;
      this.emit("exit");
    });

    // Internal api to push history
    if ((this.server as any).history) {
      this.readHistory().map(line => (this.server as any).history.push(line));
    }
  }

  stop() {
    this.server.close();
  }
}

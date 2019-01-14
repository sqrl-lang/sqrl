/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import { FeatureMap, Manipulator } from "../api/execute";
import SqrlAst from "../ast/SqrlAst";
import { SqrlParserState } from "../compile/SqrlParserState";

import { StatementAst } from "../ast/Ast";
import { parseSqrl } from "../parser/SqrlParse";
import { SqrlFunctionRegistry } from "../function/FunctionRegistry";
import { SqrlCompiledOutput } from "../compile/SqrlCompiledOutput";
import { JsExecutionContext } from "../execute/JsExecutionContext";
import SqrlSourcePrinter from "../compile/SqrlSourcePrinter";
import { Filesystem } from "../api/filesystem";
import { Context } from "../api/ctx";

const DEFAULT_FEATURE_TIMEOUT = 5000;

export interface MutationOptions {
  repeat: number;
  skipWait: boolean;
}
export type MutationCallback = (
  state: SqrlExecutionState,
  options: MutationOptions
) => Promise<void>;

export class SqrlTest {
  executionContext: JsExecutionContext;
  statements: StatementAst[];
  files;
  extendTimeout: () => void;
  allowPrivate: boolean;
  calculateCost: boolean;
  setFeatures;
  mutate: MutationCallback | null;
  featureTimeout: number;
  manipulatorFactory: (() => Manipulator) | null;
  private filesystem: Filesystem;

  constructor(
    private functionRegistry: SqrlFunctionRegistry,
    props: {
      files?: any;
      setFeatures?: FeatureMap;
      allowPrivate?: boolean;
      extendTimeout?: () => void;
      calculateCost?: boolean;
      mutate?: MutationCallback;
      featureTimeout?: number;
      filesystem?: Filesystem;
      manipulatorFactory?: () => Manipulator;
    } = {}
  ) {
    this.featureTimeout = props.featureTimeout || DEFAULT_FEATURE_TIMEOUT;
    this.executionContext = new JsExecutionContext(functionRegistry);
    this.files = props.files || {};
    this.extendTimeout =
      props.extendTimeout ||
      (() => {
        /* nothing */
      });

    this.manipulatorFactory = props.manipulatorFactory || null;
    this.mutate = props.mutate || null;
    this.allowPrivate = props.allowPrivate || false;
    this.calculateCost = props.calculateCost || false;
    this.setFeatures = props.setFeatures;
    this.filesystem = props.filesystem || null;

    // Keep track of the actual sqrl statements being run
    this.statements = [];
  }

  async run(ctx: Context, sqrl: string) {
    const statements = parseSqrl(sqrl, {
      customFunctions: this.functionRegistry.customFunctions
    }).statements;
    return this.runStatements(ctx, statements);
  }

  async runStatements(
    ctx: Context,
    statements: StatementAst[]
  ): Promise<{
    codedErrors: any[];
    executions: SqrlExecutionState[];
  }> {
    let assertions = [];
    const codedErrors = [];
    const executions: SqrlExecutionState[] = [];

    const execute = async (wait = false) => {
      const state = await this.executeStatements(ctx, assertions, wait);
      executions.push(state);

      codedErrors.push(...state.loggedCodedErrors);
      assertions = [];
      return state;
    };

    for (const statement of statements) {
      if (statement.type === "assert") {
        assertions.push(statement);
      } else if (statement.type === "execute") {
        for (let idx = 0; idx < statement.repeat; idx++) {
          const state = await execute(true);
          if (this.mutate) {
            await this.mutate(state, {
              skipWait: statement.skipWait,
              repeat: statement.repeat || 1
            });
          } else if (state.manipulator) {
            await state.manipulator.mutate(ctx);
          } else {
            ctx.warn({}, "Mutation function / manipulator is not injected");
          }
        }
      } else {
        if (assertions.length) {
          await execute();
        }

        // Allow overrides of previous let statements but keep order
        if (
          statement.type === "let" &&
          SqrlAst.isConstantTrue(statement.where)
        ) {
          const replace = this.statements.findIndex(
            s => s.type === "let" && s.feature === statement.feature
          );
          if (replace >= 0) {
            this.statements[replace] = statement;
            continue;
          }
        }

        this.statements.push(statement);
      }
    }

    if (assertions.length || !executions.length) {
      await execute();
    }

    return {
      codedErrors,
      executions
    };
  }

  async executeStatements(
    ctx: Context,
    statements: StatementAst[],
    waitExecute: boolean = false
  ): Promise<SqrlExecutionState> {
    const parserState = new SqrlParserState({
      statements: [...this.statements, ...statements],
      allowAssertions: true,
      allowReplaceInput: true,
      allowPrivate: this.allowPrivate,
      functionRegistry: this.functionRegistry,
      filesystem: this.filesystem
    });

    const compiledOutput = await SqrlCompiledOutput.build(ctx, parserState, {
      skipCostCalculations: !this.calculateCost
    });

    const processed = await compiledOutput.buildLabelerSpec(ctx, {
      skipSourceVersion: true
    });

    const slotCallback = this.executionContext.compileSlots(processed.slotJs);

    const sourcePrinter = new SqrlSourcePrinter({
      slotNames: processed.slotNames,
      slotJs: processed.slotJs
    });

    // sourcePrinter.printAllSource();

    const manipulator = this.manipulatorFactory
      ? this.manipulatorFactory()
      : null;

    // Create an execution state and run
    const state = new SqrlExecutionState(
      ctx,
      slotCallback,
      processed.slotNames,
      manipulator,
      {
        sourcePrinter,
        featureTimeout: this.featureTimeout,
        ruleSpecs: processed.ruleSpec
      },
      this.setFeatures
    );

    await state.fetchClock();

    await Promise.all([
      state.tryWait("SqrlAssertionStatements").then(() => this.extendTimeout()),
      state.tryWait("SqrlLogStatements").then(() => this.extendTimeout()),
      waitExecute
        ? state
            .fetchByName("SqrlExecutionComplete")
            .then(() => this.extendTimeout())
        : Promise.resolve()
    ]);

    return state;
  }
}

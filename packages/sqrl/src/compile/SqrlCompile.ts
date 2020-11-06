/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Ast } from "../ast/Ast";
import {
  SqrlParserState,
  SqrlParserOptions,
  SqrlSerialized,
} from "./SqrlParserState";
import { parseSqrlFiles, parseSqrl } from "../parser/SqrlParse";
import { labelerPushStatement } from "./compileLabelerStatements";
import { Context } from "../api/ctx";

const SQRL_MAIN = "main.sqrl";

export function createParserState(
  ctx: Context,
  props: {
    sourceFiles: { [filename: string]: string };
    mainSqrl?: string;
    parserOptions: SqrlParserOptions;
    serialized?: SqrlSerialized;
  }
): SqrlParserState {
  const fileAst = parseSqrlFiles(props.sourceFiles);

  let mainAst: Ast = fileAst[SQRL_MAIN];
  if (props.mainSqrl) {
    mainAst = parseSqrl(props.mainSqrl);
  }

  return new SqrlParserState(
    {
      statements: mainAst.statements,
      ...props.parserOptions,
    },
    props.serialized || null
  );
}

export function compileParserStateAst(parserState: SqrlParserState) {
  parserState.setPushStatement((ast) => labelerPushStatement(parserState, ast));
  parserState.statements.forEach((stmt) => {
    parserState.pushStatement(stmt);
  });
}

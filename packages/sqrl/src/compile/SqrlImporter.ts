/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { ScriptAst, Ast, IncludeAst } from "../ast/Ast";
import SqrlAst from "../ast/SqrlAst";
import { Filesystem } from "../api/filesystem";
import { dirname, join } from "path";
import { parseSqrl } from "../parser/SqrlParse";
import { sqrlInvariant } from "../api/parse";

const DYNAMIC_INCLUDE_REGEX = /^(.*)\/\$\{([A-Za-z0-9_.]+)\}([^/]*)$/;

export default class SqrlImporter {
  constructor(
    public filesystem: Filesystem,
    private customFunctions: Set<string> = new Set()
  ) {
    /* noting */
  }

  private readAst(sourceAst: Ast, path: string): ScriptAst {
    const source = this.filesystem.tryRead(path);
    sqrlInvariant(sourceAst, source, "Could not find sqrl file: " + path);
    return parseSqrl(source.toString("utf-8"), {
      filename: path,
      customFunctions: this.customFunctions,
    });
  }

  getReferencedFileAst(
    ast: Ast,
    filename: string | null,
    from: string | null
  ): {
    path: string;
    scriptAst: ScriptAst;
  } {
    sqrlInvariant(ast, filename, "Unknown file for import");

    let path = filename;
    if (from) {
      path = join(dirname(from), path);
    }
    const scriptAst = this.readAst(ast, path);
    return { path, scriptAst };
  }

  getIncludeFiles(ast: IncludeAst): {
    ast: ScriptAst;
    filename: string;
    where: Ast;
  }[] {
    const match = DYNAMIC_INCLUDE_REGEX.exec(ast.filename);
    if (!match) {
      const { scriptAst, path } = this.getReferencedFileAst(
        ast,
        ast.filename,
        ast.location ? ast.location.filename : null
      );
      return [
        {
          ast: scriptAst,
          filename: path,
          where: SqrlAst.constant(true),
        },
      ];
    }

    const [, dir, feature, extension] = match;

    sqrlInvariant(
      ast,
      SqrlAst.isConstantTrue(ast.where),
      "Expected empty where clause for dynamic include"
    );

    const pwd = ast.location.filename ? dirname(ast.location.filename) : ".";
    const matchedFiles = this.filesystem.tryList(join(pwd, dir));
    sqrlInvariant(ast, matchedFiles, `The ${dir}/ directory was not found`);

    return matchedFiles
      .filter((filename) => filename.endsWith(extension))
      .map((filename) => {
        const filePath = join(pwd, `features/${filename}`);
        const value = filename.substring(0, filename.length - extension.length);
        const fileAst = this.readAst(ast, filePath);

        // Add where clause to include
        return {
          ast: fileAst,
          filename,
          where: SqrlAst.featureEquals(feature, value),
        };
      });
  }
}

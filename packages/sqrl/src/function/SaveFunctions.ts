/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { SqrlFunctionRegistry } from "./FunctionRegistry";
import { FunctionServices } from "./registerAllFunctions";
import { default as AT } from "../ast/AstTypes";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import { DatabaseSet } from "../api/ctx";

export interface ObjectService {
  write(
    databaseSet: DatabaseSet,
    collection: string,
    key: string,
    data: any
  ): void;
}
export function registerSaveFunctions(
  registry: SqrlFunctionRegistry,
  services: FunctionServices
) {
  if (services.saveFeatures) {
    registry.save(
      function saveFeatures(
        state: SqrlExecutionState,
        tableName: string,
        features: {
          [featureName: string]: any;
        }
      ) {
        services.saveFeatures.writeJson(state.manipulator, {
          tableName,
          features
        });
      },
      {
        args: [AT.state, AT.constant.string, AT.any],
        statement: true,
        statementFeature: "SqrlSaveStatements"
      }
    );
  }

  if (services.object) {
    registry.save(
      function objectSave(state, collection, key, data) {
        services.object.write(state.databaseSet, collection, key, data);
      },
      {
        statement: true,
        statementFeature: "SqrlSaveStatements",
        args: [AT.state, AT.any.string, AT.any.string, AT.any]
      }
    );
  }
}

/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { AstTypes as AT } from "../ast/AstTypes";
import { StdlibRegistry } from "./Instance";
import { SqrlExecutionState } from "../execute/SqrlExecutionState";
import invariant from "../jslib/invariant";
import { REASON_FEATURE_REGEX } from "../slot/SqrlRuleSlot";
import { WhenCause, FiredRule } from "../api/when";
export { WhenCause, FiredRule };
export function registerWhenFunctions(instance: StdlibRegistry) {
  instance.save(
    function _buildWhenCause(
      state: SqrlExecutionState,
      ruleNames: string[],
      ruleFeatures: any[][]
    ): WhenCause {
      invariant(
        state.ruleSpecs,
        "The execution must be passed ruleSpecs in order to use WHEN blocks"
      );

      const firedRules: FiredRule[] = [];

      ruleNames.forEach((name, ruleIdx) => {
        if (!ruleFeatures[ruleIdx]) {
          return;
        }

        const spec = state.ruleSpecs[name];
        let reason = "";
        if (spec.reason) {
          let featureIdx = 0;
          reason = spec.reason.replace(REASON_FEATURE_REGEX, () => {
            return ruleFeatures[ruleIdx][featureIdx++].toString();
          });
        }

        firedRules.push({
          name,
          reason,
        });
      });
      if (firedRules.length === 0) {
        return null;
      }
      return { firedRules };
    },
    {
      args: [AT.state, AT.any, AT.any],
      allowSqrlObjects: true,
    }
  );
}

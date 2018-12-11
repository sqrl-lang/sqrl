/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { UniqueId } from "../platform/UniqueId";
import SqrlObject from "./SqrlObject";
import SqrlUniqueId from "./SqrlUniqueId";

import invariant from "../jslib/invariant";
import { NodeId } from "../platform/NodeId";
import chalk from "chalk";
import { indent } from "../jslib/indent";

export default class SqrlNode extends SqrlObject {
  public nodeId: NodeId;

  constructor(
    public uniqueId: SqrlUniqueId,
    public type: string,
    public value: string
  ) {
    super();
    if (typeof value === "number") {
      value = value + "";
    }
    invariant(
      typeof value === "string" && value.length > 0,
      "SqrlNode value expected non-empty string"
    );

    this.nodeId = new NodeId(type, value);
    this.uniqueId = uniqueId;
  }

  getNodeId(): NodeId {
    return this.nodeId;
  }

  getBasicValue(): string {
    return this.value;
  }
  getNumberString(): string {
    return this.uniqueId.getNumberString();
  }
  tryGetTimeMs(): number {
    return this.uniqueId.getTimeMs();
  }
  getUniqueId(): UniqueId {
    return this.uniqueId.getUniqueId();
  }

  renderText() {
    return chalk.grey(
      `node<${chalk.blue(this.nodeId.type)}/${chalk.blue(
        this.nodeId.key
      )}> {\n` +
        `${indent(this.uniqueId.renderText(), 2)}\n` +
        `}`
    );
  }

  getData() {
    return {
      type: this.type,
      value: this.value,
      uniqueId: this.uniqueId.getData()
    };
  }
}

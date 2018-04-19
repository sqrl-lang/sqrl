/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Ast, CallAst, jsonAst, ConstantAst } from "../ast/Ast";

import invariant from "../jslib/invariant";
import SqrlAst from "../ast/SqrlAst";
import {
  SerializedSlotBase,
  SerializedSlot,
  SerializedStatementSlot,
  SerializedConstantSlot,
  SerializedFixedSlot,
  registerSlotClass
} from "./SerializedSlot";

export abstract class SqrlSlot {
  private index: number = null;
  name: string;

  constructor(nameOrData: string | SerializedSlotBase) {
    if (typeof nameOrData === "string") {
      this.name = nameOrData;
    } else if (typeof nameOrData.name === "string") {
      this.name = nameOrData.name;
    } else {
      throw new Error("Invalid SqrlSlot name");
    }
  }

  serialize(): SerializedSlot {
    return {
      class: this.constructor.name,
      name: this.name
    } as any;
  }
  deserializor(data: SerializedSlot): void {
    this.index = null;
    this.name = data.name;
  }

  abstract finalizedAst(): Ast;

  getIndex(): number {
    invariant(
      this.index !== null,
      "Slot has not yet been assigned an index:: %s",
      this.name
    );
    return this.index;
  }
  setIndex(idx: number): void {
    invariant(
      this.index === null,
      "Can only set slot index once:: %s",
      this.name
    );
    this.index = idx;
  }
}

@registerSlotClass
export class SqrlIteratorSlot extends SqrlSlot {
  finalizedAst() {
    return SqrlAst.constant(null);
  }
}

@registerSlotClass
export class SqrlStatementSlot extends SqrlSlot {
  private finalized = false;
  private referencedSlots: Set<string> = new Set();
  serialize(): SerializedStatementSlot {
    return {
      ...(super.serialize() as SerializedStatementSlot),
      referencedSlots: Array.from(this.referencedSlots).sort()
    };
  }
  deserializor(data: SerializedStatementSlot) {
    super.deserializor(data);
    this.finalized = false;
    this.referencedSlots = new Set(data.referencedSlots);
  }

  finalizedAst(): CallAst {
    this.finalized = true;
    return SqrlAst.call(
      "_slotWait",
      Array.from(this.referencedSlots).map(slotName =>
        SqrlAst.slotName(slotName)
      )
    );
  }

  addWait(slotName: string) {
    invariant(
      !this.finalized,
      "Slot cannot be set after it is read: %s",
      this.name
    );
    this.referencedSlots.add(slotName);
  }
}

@registerSlotClass
export class SqrlConstantSlot extends SqrlSlot {
  private finalized = false;
  // Store as a ConstantAst so that we can keep the serialized json
  ast: ConstantAst;

  constructor(name: string, value: any) {
    super(name);
    this.ast = SqrlAst.constant(value);
  }
  deserializor(data: SerializedConstantSlot) {
    super.deserializor(data);
    this.finalized = false;
    this.ast = data.ast;
  }

  serialize(): SerializedConstantSlot {
    jsonAst(this.ast);
    return {
      ...(super.serialize() as SerializedConstantSlot),
      ast: this.ast
    };
  }

  setValue(value: any) {
    invariant(this.finalized === false, "constant slot was finalized");
    this.ast = SqrlAst.constant(value);
  }
  getValue(): any {
    return this.ast.value;
  }
  finalizedAst() {
    this.finalized = true;
    return this.ast;
  }
}

@registerSlotClass
export class SqrlEmptySlot extends SqrlSlot {
  // Slot used when there is no ast associated but it may be replaced later
  finalizedAst() {
    return SqrlAst.constant(null);
  }
}

@registerSlotClass
export class SqrlInputSlot extends SqrlSlot {
  finalizedAst() {
    return SqrlAst.constant(null);
  }
}

@registerSlotClass
export class SqrlFixedSlot extends SqrlSlot {
  constructor(
    name: string,
    private ast: Ast,
    readonly replaceable: boolean = false
  ) {
    super(name);
    this.ast = ast;
  }

  deserializor(data: SerializedFixedSlot) {
    super.deserializor(data);
    this.ast = data.ast;
    data.replaceable = this.replaceable;
  }

  serialize(): SerializedFixedSlot {
    jsonAst(this.ast);
    return {
      ...(super.serialize() as SerializedFixedSlot),
      ast: this.ast,
      replaceable: this.replaceable
    };
  }

  finalizedAst() {
    return this.ast;
  }
}

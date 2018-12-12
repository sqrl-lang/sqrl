/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { Manipulator, ManipulatorCallback } from "../platform/Manipulator";
import { kafkaBufferHumanJson } from "../jslib/kafkaBufferHumanJson";
import mapObject from "../jslib/mapObject";
import SqrlKey from "../object/SqrlKey";
import { WhenCause, FiredRule } from "../function/WhenFunctions";
import { FeatureMap } from "..";

export class SimpleManipulator extends Manipulator {
  public sqrlKeys: Set<string> = new Set();
  public kafkaOutput: {
    [topic: string]: Buffer[];
  } = {};

  public blocked: boolean = false;
  public whitelisted: boolean = false;
  public blockedRules: FiredRule[] = [];
  public whitelistedRules: FiredRule[] = [];

  public loggedFeatures: FeatureMap = {};
  public logged: string[] = [];

  addKafka(topic: string, message: Buffer) {
    this.kafkaOutput[topic] = this.kafkaOutput[topic] || [];
    this.kafkaOutput[topic].push(message);
  }

  setBlocked(context: WhenCause | null) {
    this.blocked = true;
    if (context) {
      this.blockedRules.push(...context.firedRules);
    }
  }
  setWhitelisted(context: WhenCause | null) {
    this.whitelisted = true;
    if (context) {
      this.whitelistedRules.push(...context.firedRules);
    }
  }
  wasBlocked() {
    return this.blocked && !this.whitelisted;
  }

  getCurrentHumanOutput() {
    return {
      kafka: mapObject(this.kafkaOutput, (messages, topic) => {
        return messages.map(msg => {
          return kafkaBufferHumanJson(topic, msg);
        });
      })
    };
  }

  trackSqrlKey(key: SqrlKey): void {
    this.sqrlKeys.add(key.getDebugString());
  }

  log(message: string) {
    this.logged.push(message);
  }
  logFeature(name: string, value: any) {
    this.loggedFeatures[name] = value;
  }
  logError(props: any): void {
    /* do nothing for now */
  }

  async mutate(ctx): Promise<void> {
    await Promise.all(this.callbacks.map(cb => cb(ctx)));
  }
  private callbacks: ManipulatorCallback[] = [];
  addCallback(cb: ManipulatorCallback) {
    this.callbacks.push(cb);
  }
}

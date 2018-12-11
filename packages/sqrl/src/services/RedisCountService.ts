/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { RedisInterface } from "./RedisService";
import {
  CountService,
  TIMESPAN_CONFIG,
  CountServiceBumpProps
} from "../function/CountFunctions";
import SqrlKey from "../object/SqrlKey";
import { Manipulator } from "../platform/Manipulator";
import { RedisSingleWindowApproxCountService } from "./RedisApproxCount";
import { foreachObject } from "../jslib/foreachObject";
import { Context } from "../api/ctx";

const NUM_BUCKETS = 10;

export class RedisCountService implements CountService {
  private suffixToWindow: {
    [suffix: string]: RedisSingleWindowApproxCountService;
  };
  constructor(redis: RedisInterface, prefix: string) {
    this.suffixToWindow = {};
    foreachObject(TIMESPAN_CONFIG, ({ suffix, windowMs }, key) => {
      this.suffixToWindow[suffix] = new RedisSingleWindowApproxCountService(
        redis,
        prefix,
        windowMs,
        NUM_BUCKETS
      );
    });
  }
  async fetch(
    ctx: Context,
    at: number,
    keys: SqrlKey[],
    suffix: string
  ): Promise<number[]> {
    return Promise.all(
      keys.map(key => this.suffixToWindow[suffix].count(ctx, { key, at }))
    );
  }
  bump(manipulator: Manipulator, props: CountServiceBumpProps) {
    const { at, by, keys, flags } = props;

    manipulator.addCallback(async ctx => {
      const promises = [];
      foreachObject(TIMESPAN_CONFIG, ({ suffix, flag }, key) => {
        // tslint:disable-next-line:no-bitwise
        if (flags & flag) {
          for (const key of keys) {
            promises.push(
              this.suffixToWindow[suffix].bump(ctx, {
                at,
                key,
                amount: by
              })
            );
          }
        }
      });

      await Promise.all(promises);
    });
  }
}

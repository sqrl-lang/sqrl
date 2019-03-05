/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { LabelService } from "../LabelFunctions";
import { RedisInterface, redisKey } from "./RedisService";
import { Context, Manipulator, SqrlEntity, WhenCause } from "sqrl-engine";

const EXPIRY = 60 * 60 * 24 * 30;

export class RedisLabelService implements LabelService {
  constructor(private redis: RedisInterface, private prefix: string) {}

  addLabel(
    manipulator: Manipulator,
    entity: SqrlEntity,
    label: string,
    cause: WhenCause
  ) {
    manipulator.addCallback(async ctx => {
      const key = redisKey(
        ctx.requireDatabaseSet(),
        this.prefix,
        "label",
        entity.getNumberString(),
        label
      );
      await this.redis.set(ctx, key, "1");
      await this.redis.expire(ctx, key, EXPIRY);
    });
  }
  removeLabel(
    manipulator: Manipulator,
    entity: SqrlEntity,
    label: string,
    cause: WhenCause
  ) {
    manipulator.addCallback(async ctx => {
      const key = redisKey(
        ctx.requireDatabaseSet(),
        this.prefix,
        "label",
        entity.getNumberString(),
        label
      );
      await this.redis.del(ctx, key);
    });
  }
  async hasLabel(
    ctx: Context,
    entity: SqrlEntity,
    label: string
  ): Promise<boolean> {
    const rv = await this.redis.get(
      ctx,
      redisKey(
        ctx.requireDatabaseSet(),
        this.prefix,
        "label",
        entity.getNumberString(),
        label
      )
    );
    return !!rv;
  }
}

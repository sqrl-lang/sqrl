#!/bin/bash
# Copyright 2018 Twitter, Inc.
# Licensed under the Apache License, Version 2.0
# http://www.apache.org/licenses/LICENSE-2.0


###
# This script is intended to be sourced:
# $ . ./scripts/ensure-docker-env.sh
#
# It ensures the docker containers are running (sqrl_redis and sqrl_ratelimit) and
# sets up the environment variables for both.

function ensure_container() {
  NAME="$1"
  IMAGE="$2"
  PORT="$3"

  if [ ! "$(docker ps -q -f "name=$NAME")" ]; then
    if [ "$(docker ps -aq -f status=exited -f "name=$NAME")" ]; then
      docker rm "$NAME" >/dev/null
    fi
    docker run -d --publish "127.0.0.1::$PORT" --name "$NAME" "$IMAGE" >/dev/null
  fi

  docker port "$NAME" "$PORT"
}

export SQRL_TEST_REDIS="$(ensure_container sqrl_redis redis 6379)"

## Tests don't use ratelimit container any more.
# export RATELIMIT="$(ensure_container sqrl_ratelimit authbox/ratelimit 9049)"

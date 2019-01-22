title: Redis example
---

# Redis example

### Connecting to a Redis database

By default SQRL will run in an in-memory only mode, which means state is not persisted between executions. For convenience a Redis implementation of most counters is included out of the box.

For this to work you should be running a local redis server, if you are not the easiest way to start one up is with the [Docker](https://www.docker.com/) command `docker run -d -p 6379:6379 redis`

```
$ source ./scripts/setup-sqrl-db-local-docker-env.sh

$ cat > ratelimit.sqrl
LET Ip := input();
LET SqrlMutate := true;
LET Remaining := rateLimit(BY Ip MAX 2 EVERY 30 SECONDS);

CREATE RULE BlockedByRateLimit WHERE Remaining = 0;
WHEN BlockedByRateLimit BLOCK ACTION;

# Add an environment variable, could also use the `--redis=<>` option
$ export SQRL_REDIS=localhost:6379

$ sqrl run ratelimit.sqrl  -s 'RequestIp="1.2.3.5"' BlockedByRateLimit Remaining
✓ 2019-01-14 15:46 action was allowed.
BlockedByRateLimit=false
Remaining=2

$ sqrl run ratelimit.sqrl  -s 'RequestIp="1.2.3.5"' BlockedByRateLimit Remaining
✓ 2019-01-14 15:46 action was allowed.
BlockedByRateLimit=false
Remaining=1

$ sqrl run ratelimit.sqrl  -s 'RequestIp="1.2.3.5"' BlockedByRateLimit Remaining
✗ 2019-01-14 15:46 action was blocked.
↳ [BlockedByRateLimit]
BlockedByRateLimit=true
Remaining=0
```

### Try out a REPL

For some information on our REPL, check out the [next example](repl.html)
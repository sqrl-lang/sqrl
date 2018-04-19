[![Build Status](https://travis-ci.org/smyte/sqrl.svg?branch=master)](https://travis-ci.org/smyte/sqrl.svg?branch=master)
[![Coverage Status](https://coveralls.io/repos/github/smyte/sqrl/badge.svg?branch=master)](https://coveralls.io/github/smyte/sqrl?branch=master)

# SQRL

```
$ cat samples/simple.sqrl
> LET ActionData := input();
> LET ActionName := jsonValue(ActionData, '$.name');

$ ./sqrl run samples/simple.sqrl -s 'ActionData={"name":"login"}' ActionName
> ActionName="login"
```

## Rate limit example (using Docker databases)

```
$ source ./scripts/setup-sqrl-db-local-docker-env.sh

$ cat samples/ratelimit.sqrl
LET Ip := input();
LET SqrlMutate := true;
LET Remaining := rateLimit(BY Ip MAX 2 EVERY 30 SECONDS);

CREATE RULE BlockedByRateLimit WHERE Remaining = 0;
WHEN BlockedByRateLimit BLOCK ACTION;

$ ./sqrl run samples/ratelimit.sqrl -s 'RequestIp="1.2.3.5"' BlockedByRateLimit Remaining
BlockedByRateLimit=false
Remaining=2
$ ./sqrl run samples/ratelimit.sqrl -s 'RequestIp="1.2.3.5"' BlockedByRateLimit Remaining
BlockedByRateLimit=false
Remaining=1
$ ./sqrl run samples/ratelimit.sqrl -s 'RequestIp="1.2.3.5"' BlockedByRateLimit Remaining
BlockedByRateLimit=true
Remaining=0
```

## Repl

```
$ ./sqrl repl
sqrl> LET ActionData := {"name": "hi"};
{ name: 'hi' }
sqrl> LET ActionName := jsonValue(ActionData, "$.name")
'hi'
sqrl> printSource(ActionName);
function() {
  const f0 = () =>
    bluebird.resolve(functions.attr(this.slots["ActionData"].value(), "name"));
  return this.load("ActionData").then(f0);
}
```

## HTTP API Server (using Docker databases)

```
$ source ./scripts/setup-sqrl-db-local-docker-env.sh
$ ./sqrl serve --port=2288 samples/ratelimit.sqrl
Serving samples/ratelimit.sqrl on port 2288

$ curl -d '{"RequestIp": "1.2.3.4"}' 'localhost:2288/run?features=BlockedByRateLimit,Remaining&pretty'
{
  "allow": false,
  "verdict": {
    "blockRules": [
      "BlockedByRateLimit"
    ]
  },
  "features": {
    "BlockedByRateLimit": true,
    "Remaining": 0
  }
}
```

## Support

Create a [new issue](https://github.com/twitter/sqrl/issues/new) on GitHub.

## Contributing

We feel that a welcoming community is important and we ask that you follow Twitter's
[Open Source Code of Conduct](https://github.com/twitter/code-of-conduct/blob/master/code-of-conduct.md)
in all interactions with the community.

## Authors

* Josh Yudaken <opensource@twitter.com>

A full list of [contributors](https://github.com/twitter/sqrl/graphs/contributors?type=a) can be found on GitHub.

Follow [@TwitterOSS](https://twitter.com/twitteross) on Twitter for updates.

## License

Copyright 2018 Twitter, Inc.

Licensed under the Apache License, Version 2.0: https://www.apache.org/licenses/LICENSE-2.0

## Security Issues?

Please report sensitive security issues via Twitter's bug-bounty program (https://hackerone.com/twitter) rather than GitHub.

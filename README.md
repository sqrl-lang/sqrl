# [SQRL](https://twitter.github.io/sqrl/) &middot; [![GitHub license](https://img.shields.io/badge/license-Apache%202-blue.svg)](https://github.com/twitter/sqrl/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/sqrl.svg?style=flat)](https://www.npmjs.com/package/sqrl) [![Build Status](https://travis-ci.org/twitter/sqrl.svg?branch=master)](https://travis-ci.org/twitter/sqrl.svg?branch=master) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/twitter/sqrl/blob/master/CONTRIBUTING.md)

SQRL is a Safe, Stateful Rules Language for Event Streams

### :boom: This is a **beta release**. :boom:

The code here *was* used by Smyte pre-acquisition but has not been tested in a production since it was extracted from the code base. We plan to work with the community on making it production ready, but we want to set expectations correctly. We hope you find it useful. :squirrel:

## Documentation

You can find the SQRL documentation [on the website](https://twitter.github.io/sqrl).

The documentation is divided into several sections:

* [Getting Started](https://twitter.github.io/sqrl/)
* [API Documentation](https://twitter.github.io/sqrl/reference/globals.html)

## Examples

**SQRL** is designed to be used as a library, but the easiest way to see what it can do is to try out the command line interface.

```
$ npm install --global sqrl-cli
$ cat > simple.sqrl
LET ActionData := input();
LET ActionName := jsonValue(ActionData, '$.name');

$ sqrl run simple.sqrl -s 'ActionData={"name":"login"}' ActionName
✓ 2019-01-14 15:09 action was allowed.
ActionName="login"
```

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

## Trying out the REPL

Once you start getting a feel for SQRL and want to try play around in realtime, a REPL is included

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

## Scanning Wikipedia for *bad* words

Once you get a little further, we have a demonstration that looks for a set of bad words on wikipedia.

```
git clone git@github.com:twitter/sqrl
cd sqrl/examples/wikipedia
npx wikipedia-diff-stream | sqrl run main.sqrl --stream=EventData --only-blocked

...
✗ 2018-11-15 11:25 action was blocked.
↳ [UsedBadWords]: Matched pattern shit: this is all bullshit
Page: https://en.wikipedia.org/wiki/List_of_synthetic_polymers
Diff: https://en.wikipedia.org/w/index.php?title=List%20of%20synthetic%20polymers&type=revision&diff=868997967&oldid=868800716
Count by user: 3 (<redacted>)
```

If you do run this example you will see **a lot** of false positives. A simple list of bad words
does not make an effective spam filter. The tools provided by SQRL should allow you to combine
separate counters, rate limits, text filters and logic in order to greatly reduce the false
positive rate.

## More examples

For a lot more examples please check out [the website](https://twitter.github.io/sqrl) :squirrel:

## Support

Create a [new issue](https://github.com/twitter/sqrl/issues/new) on GitHub.

## Contributing

We feel that a welcoming community is important and we ask that you follow Twitter's
[Open Source Code of Conduct](https://github.com/twitter/code-of-conduct/blob/master/code-of-conduct.md)
in all interactions with the community.

## Authors

* Josh Yudaken
* Pete Hunt
* Julian Tempelsman
* Paul Mou
* Yunjing Xu
* David Newman

A full list of [contributors](https://github.com/twitter/sqrl/graphs/contributors?type=a) can be found on GitHub.

Follow [@TwitterOSS](https://twitter.com/twitteross) on Twitter for updates.

## License

Copyright 2018 Twitter, Inc.

Licensed under the Apache License, Version 2.0: https://www.apache.org/licenses/LICENSE-2.0

## Security Issues?

Please report sensitive security issues via Twitter's bug-bounty program (https://hackerone.com/twitter) rather than GitHub.

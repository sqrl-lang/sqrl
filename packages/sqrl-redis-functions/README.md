# [SQRL](https://twitter.github.io/sqrl/) &middot; [![GitHub license](https://img.shields.io/badge/license-Apache%202-blue.svg)](https://github.com/twitter/sqrl/blob/master/LICENSE) [![npm version](https://img.shields.io/npm/v/sqrl.svg?style=flat)](https://www.npmjs.com/package/sqrl) [![Build Status](https://travis-ci.org/twitter/sqrl.svg?branch=master)](https://travis-ci.org/twitter/sqrl.svg?branch=master) [![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](https://github.com/twitter/sqrl/blob/master/CONTRIBUTING.md)

# `sqrl-redis-functions` package

This package includes functions for some counters and services running on top of redis. It may be useful as a starting point for creating your own simple SQRL function packs.
 
## count()

Provides sliding window simple counters. This is useful for answering questions such as "How many times have I seen this IP addreses in the last hour?".

## countUnique()

Provides sliding window set cardinality counters. This is useful for answering questions such as "How many different IP addreses have I seen for this user in the last hour?".

## rateLimit(), rateLimited()

Provides a token bucket rate limiter. This is useful for answering questions such as "Have I seen more that X requests for this user in the last Y hours?".

## sessionize()

Provides sessionization based on a set of features and time. This is useful for grouping actions by IP addresses or users based on time windows.

## addLabel(), removeLabel(), hasLabel()

Provides basic labeling abilities

# SQRL documentation

Please see [the website](https://twitter.github.io/sqrl) for full **SQRL** documentation.

This documentation includes [detailed information](https://twitter.github.io/sqrl/language/simple.html) on the counters listed above

## Support

Create a [new issue](https://github.com/twitter/sqrl/issues/new) on GitHub.

## Contributing

We feel that a welcoming community is important and we ask that you follow Twitter's
[Open Source Code of Conduct](https://github.com/twitter/code-of-conduct/blob/master/code-of-conduct.md)
in all interactions with the community.

## License

Copyright 2018 Twitter, Inc.

Licensed under the Apache License, Version 2.0: https://www.apache.org/licenses/LICENSE-2.0

## Security Issues

Please report sensitive security issues via Twitter's bug-bounty program (https://hackerone.com/twitter) rather than GitHub.

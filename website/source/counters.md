title: Counters
---

# SQRL

This is not linked to by documentation yet, but left here for reference

### Extending SQRL with functions and counters

The [`sqrl`](https://github.com/sqrl-lang/sqrl/tree/main/packages/sqrl) package includes a base set of functions that should be common to any application. None of them require any external network access or databases, and should fulfill your basic.

We've included [`sqrl-text-functions`](https://github.com/sqrl-lang/sqrl/tree/main/packages/sqrl-text-functions) which has more advanced text analysis functions such as `patternMatch` (RE2 regular expression text based pattern matching), and `simhash()` which returns similar values for similar text.

The real power of SQRL comes with its streaming counters. While the *Redis database* is not the best choice for large production systems, it is one of the most wildly available and easy to set up choices. The [`sqrl-redis-functions`](https://github.com/sqrl-lang/sqrl/tree/main/packages/sqrl-redis-functions) builds a couple of common counters on top of this database:

* count() - Streaming counters (*How many requests from this IP in the last day*)
* countUnique() - Streaming set cardinatily (*How many unique users on this IP in the last day*)
* rateLimit() - Token-bucket based rate limiter (*Have we seen more than X requests per hour*)
* sessionize() - Sessionization (*When did the current session from this IP start*)

These packages are all designed as examples, we built SQRL to be extendable with functions you need, as well as any new databases as you require. We're hoping the community can come together and use/extend these tools to protect online users.
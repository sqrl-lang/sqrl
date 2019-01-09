title: SQRL
---

# SQRL

**A Safe, Stateful Rules Language for Event Streams**

SQRL is a language and runtime designed to stop a variety of attacks on large social websites and marketplaces.

It provides a simple language that reads like SQL, but allows analysts to quickly and safely deploy rules to stop abusive users.

## Getting Started

To get started:

```bash
$ npm install
$ ./examples/wikipedia/stream
```

Now look at the source that is being run

open `examples/wikipedia/main.sqrl`

## Extending SQRL with functions and counters

The `sqrl` package inscludes a base set of functions that should be common to any application. None of them require any extrenal network access or databases, and fulfil the basic needs of mathematics and simple text analysis.

The `sqrl-text-functions` includes some more advanced text analysis functions such as RE2 regular expression based pattern matching, and `simhash()` which returns similar values for similar text.

The real power of SQRL comes with its streaming counters. While the *Redis database* is not the best choice for large production systems, it is one of the most wildly available and easy to set up choices. The `sqrl-redis-functions` builds a couple of common counters on top of this database:
* count()
* countUnique()
* rateLimit()
* sessionize()

These packages are all designed as examples, we built SQRL to be extendable with functions you need, as well as new databases as you require.

## API Reference

For detailed information view the [API Reference](https://twitter.github.io/sqrl/reference/globals.html).

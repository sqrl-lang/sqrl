title: Introduction
---

# SQRL

**A Safe, Stateful Rules Language for Event Streams**

### :boom: This is a **beta release**. :boom:

The code here *was* used by Smyte pre-acquisition but has not been tested in a production since it was extracted from the code base. We plan to work with the community on making it production ready, but we want to set expectations correctly. We hope you find it useful. :squirrel:

### Why SQRL

At Smyte we needed a solution that would allow our customers to write their own rules to fight spam on their websites. We wanted to provide a powerful tool but with a simple language that reads like SQL. SQRL is a language and runtime that has been used to stop a variety of attacks on large social websites and marketplaces.

## Getting Started

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

Once you've got that running, you can dive into our example section:
* Set up external state storage in [Redis](examples/redis.html)
* See a real-life use case on [Wikipedia](examples/wikipedia.html)

### Extending SQRL with functions and counters

The [`sqrl`](https://github.com/twitter/sqrl/tree/master/packages/sqrl) package includes a base set of functions that should be common to any application. None of them require any external network access or databases, and should fulfill your basic.

We've included [`sqrl-text-functions`](https://github.com/twitter/sqrl/tree/master/packages/sqrl-text-functions) which has more advanced text analysis functions such as RE2 regular expression based pattern matching, and `simhash()` which returns similar values for similar text.

The real power of SQRL comes with its streaming counters. While the *Redis database* is not the best choice for large production systems, it is one of the most wildly available and easy to set up choices. The [`sqrl-redis-functions`](https://github.com/twitter/sqrl/tree/master/packages/sqrl-redis-functions) builds a couple of common counters on top of this database:
* count()
* countUnique()
* rateLimit()
* sessionize()

These packages are all designed as examples, we built SQRL to be extendable with functions you need, as well as new databases as you require.

## API Reference

For detailed information view the [API Reference](https://twitter.github.io/sqrl/reference/globals.html).

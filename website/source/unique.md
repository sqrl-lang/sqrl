title: What makes SQRL unique?
----
# What makes SQRL unique?

SQRL has a number of features that we think are cool and/or unique.

## Parallelizable data fetching

Data fetching is implicit and can be parallelized. The runtime can decide whether to fetch eagerly or lazily to balance speed vs cost as needed without changing the source of the rule.

This is similar to a number of projects, including [Haxl](https://github.com/facebook/Haxl), but isn't part of any mainstream languages to our knowledge.

## No halting problem

SQRL does not have recursion or unbounded loops, meaning that we can know that the program will halt.

## No call stack

SQRL does not have user-defined functions. Introducing user-defined functions can often lead to difficult to understand code for nonprogrammers.

## Entities as first-class citizens

SQRL has a notion of an "entity", which is a `type` (i.e. "EmailAddress") and a string `key` (i.e. "foo@bar.com"). It gets a stable 64 bit ID called a `UniqueId` where the most significant bits of the ID are the timestamp that the ID was created. Subsequent references to the same (`type`, `key`) pair will get the same `UniqueId`.

This has many advantages:
* We often use entities as keys in databases, and a 64 bit `UniqueId` requires less storage than the full entity `key`.
* Storing an opaque `UniqueId` instead of the string `key` limits the proliferation of personal data across different databases.
* We automatically know the date that we first saw an entity with no additional storage. We use this signal often in the anti-spam, anti-fraud and security domains that SQRL is primarily used in.
* If the `UniqueId` is used as a database key, most databases will store entities in chronological order (i.e. B-trees and LSM-trees, the most popular type of DB indexes, store rows in key-sorted order). When doing spam, fraud, or security investigations, you usually want to query the oldest or newest entities of a given type, which won't require a separate (slow) sort step since they're already sorted.

This has proven to be incredibly useful and we think it's unique to SQRL.

## Declarative state

SQRL functions like `count()` track their own state declaratively, rather than requiring the rule author to write rules to explicitly mutate state. A problem we found with other systems was that you'd have a set of rules that mutate state imperatively, and a set of rules that read from the state, often written by different people. Keeping these rules in sync is painful, and if they fall out of sync your state will be very inconsistent.

We think this is unique to SQRL (but it's a pretty good idea so someone else must have done it somewhere).

## Can run synchronously

Many languages for event processing (i.e. [KSQL](https://www.confluent.io/product/ksql/)) expect to be run as part of an asynchronous stream processing pipeline. SQRL needs to be able to run synchronously in under 100 ms.

## Feature imports and overrides

SQRL libraries can be shared between event types and customers, and specific features can be overridden (similar to how you can extend a class in an OOP language).

This let Smyte create a common set of libraries for identifying spam in text content, and then apply them to a new customer with just a few lines of code to "wire up" the new customer's event schemas.
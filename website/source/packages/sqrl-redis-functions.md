## title: sqrl-redis-functions

# sqrl-redis-functions

This package implements some counters on top of redis.

The `count`, `countUnique` and `trending` functions use buckets to approximate the value. The `countUnique` function also uses the HyperLogLog algorithm to approximate the unique set count for each bucket.

Future work could include switching to the [Sliding HyperLogLog](https://hal.archives-ouvertes.fr/hal-00465313/document) algorithm for `countUnique`. This would enable it to count all time windows together with better accuracy (no need for bucketing) and smaller space requirements.

**Note**: Only the counts that are present in the source file are tracked. This means that all the counts will begin at zero when each counter is first introduced to your source.

## addLabel

**addLabel**(entity | entity list, label)

Adds the provided label to the specified entities

## count

**count**(BY Feature[, ...] [WHERE Condition] [LAST Timespan])

Returns the streaming count for the given window

Timespans: LAST [X] SECONDS/MINUTES/HOURS/DAYS/WEEKS
DAY OVER DAY, DAY OVER WEEK, WEEK OVER WEEK
TOTAL

## countUnique

**countUnique**(Feature[, ...] [GROUP BY Feature[, ...]] [WHERE Condition] [LAST Duration] [BEFORE ACTION])

Performs a sliding window unique set count

## entity

**entity**(type, key)

Create an entity of the given type

## entityList

**entityList**(type, keys)

Create a list of entities of the given type

## hasLabel

**hasLabel**(entity, label)

Returns true if the provided entity has the given label

## rateLimit

**rateLimit**(BY Feature[, ...] [MAX Tokens] EVERY Duration [REFILL Count] [TAKE Count] [STRICT] [WHERE Condition])

Returns the number of tokens left in the token bucket ratelimiter before decrementing

## rateLimited

**rateLimited**(BY Feature[, ...] [MAX Tokens] EVERY Duration [REFILL Count] [TAKE Count] [STRICT] [WHERE Condition])

Returns true if the token bucket rate limiter has no tokens left, false otherwise

## rateLimitedValues

**rateLimitedValues**(BY Feature[, ...] [MAX Tokens] EVERY Duration [REFILL Count] [TAKE Count] [STRICT] [WHERE Condition])

Returns the values that were rate limited by the token bucket rate limiter

## removeLabel

**removeLabel**(entity | entity list, label)

Removes the provided label to the specified entities

## sessionize

**sessionize**(BY Feature[, ...] [MAX Tokens] EVERY Duration [REFILL Count] [TAKE Count] [STRICT] [WHERE Condition])

Creates a new session using a token bucket rate limiter

## trending

**trending**(Feature[, ...] [WHERE Condition] [WITH MIN Count EVENTS] (Timespan))

Returns values whose counts have gone up by an order of magnitude

Timespans: DAY OVER DAY, DAY OVER WEEK, DAY OVER FULL WEEK

## title: Rate limiters

# Rate limiters

One of the most powerful ways to stop abuse is to create rate limiters. Rate limiters limit the number of times an action can be performed over a certain time period. By combining multiple features together, rate limiters become quite powerful.

### Your first rate limiter

A good first rate limiter is limiting the number of signups that can come from an individual IP address. You can begin by editing rules/actions/signup.sqrl (or the equivalent rules file for your signup action) and adding a rate limiter:

```
CREATE RULE QuickSignupsByIp
  WHERE rateLimited(BY Ip MAX 3 EVERY 10 MINUTES);
```

The rateLimited function checks if the ratelimit has been hit. It has quite a few different options available. The ones in use here are:

**BY** - The features to ratelimit by. Specifying multiple features (Ip, Machine) will group by each specific pair.
**MAX** - The maximum number of actions allowed during the time period. In this case the first three events will not be ratelimited, but the fourth and onwards will.
**EVERY** - How often the ratelimit will be reset. Valid timespan units are MONTHS, WEEKS, DAYS, HOURS, MINUTES, SECONDS.

In this example, we're rate limiting by Ip address, and allow a maximum of three signups every ten minutes. If a given IP is used in an action four or more times in a 10 minutes window, then we mark the address that is used with a "possible_bot" label.

## Feature combinations

Our previous rate limiter does a decent job of slowing down bots, but it's prone to false positives if an IP is shared amongst lots of users (like a university wifi access point). To reduce the false positive rate, we can increase the `maxAmount` for our existing `NumSignups_TenMinutes_Ip` rate limiter, and create a more strict rate limiter on a combination of features.

For example, let's make a new rate limiter that limits how often the actions may be taken on the pair (Ip, UserAgent). To implement this, every unique user agent appearing on a given IP gets its own quota. With our previous rate limiter, all user agents appearing on a given IP share a single quota.

```
CREATE RULE QuickSignupsByUserAgentOnIp
  WHERE rateLimited(BY Ip, UserAgent MAX 3 EVERY 10 MINUTES);
WHEN QuickSignupsByUserAgentOnIp THEN addLabel(Ip, "possible_bot");
```

## Conditionals

Often you only want to rate limit under certain conditions. We provide a WHERE statement inside the rateLimited clause that will allow you to check if the user was rate limited but only in the specified condition.

An easy example of where that is useful is high value payments. The rule described below will allow any number of payments under $100, but only a maximum of two payment over that per day.

```
LET IsHighDollarPaymentAmount := PaymentAmountUsd >= 100;
CREATE RULE MultipleHighValuePurchasesByActorDay WHERE
  rateLimited(BY Actor MAX 2 EVERY DAY WHERE IsHighDollarPaymentAmount);
```

### A strikes system example

You can use rate limiters to build advanced policies, such as a strikes system for rules.

If you already have a rule in place and you want to give the user (or IP, or any combination of features) "3 strikes", simply do the following:

```
CREATE RULE ThreeStrikesCheating
  WHERE rateLimited(BY Actor MAX 2 EVERY WEEK WHERE Cheated);
```

We leave it up to the user to define the Cheated feature. To get started on that though you'll want to review our features documentation.

### Conditional rate limiters behavior

Sometimes you may only want a rate limiter to run if a given condition is met. For example, perhaps we want to limit the number of high-value purchases a user can make.

```
LET IsHighDollarPaymentAmount := PaymentAmountUsd >= 100;
CREATE RULE MultipleHighValuePurchasesByActorDay
  WHERE rateLimited(BY Actor MAX 2 EVERY DAY WHERE IsHighDollarPaymentAmount);
```

The statement above will allow each Actor to make a maximum of 2 payments for $100 or above each DAY. Once a specific Actor has made the two payments in one day the rate limit will be triggered and any future payments (even if they are less than $100) will be flagged.

### Conditions inside and outside of the rateLimited clause

The position of the IsHighDollarPaymentAmount inside or outside of the rateLimited() function changes the behavior.

As an example, within one twenty-four hour period a user made the following payments in order: $110, $30, $10, $120, $200, $50.

```
rateLimited(BY Actor MAX 2 EVERY DAY) AND IsHighDollarPaymentAmount
```

This would fire on all payments over $100, after the user had made two previous purchases that day. In the example given, it would fire on the $120, and $200 payments.

```
rateLimited(BY Actor MAX 2 EVERY DAY WHERE IsHighDollarPaymentAmount)
```

This would fire on all payments, after the user had made two previous purchases for over $100. In the given example, it would fire on the $200 and $50 payments.

```
rateLimited(BY Actor MAX 2 EVERY DAY WHERE IsHighDollarPaymentAmount) AND IsHighDollarPaymentAmount
```

This would fire on all payments over $100, after the user had made two previous purchases for over $100. In the given example it would only fire on the $200 purchase.

## Leaky buckets

Up until this point, we've created rate limiters that refill their entire quota at the end of each period. It's often more effective to utilize "leaky bucket" quota refills, where the quota slowly builds up over an extended period rather than all at once. This severely punishes attackers who continue to go over their quota, while minimizing the impact on legitimate behavior.

Let's add a leaky bucket rate limiter on the Simhash of every comment posted. A Simhash is a fuzzy text fingerprint of the comments text. By ratelimiting on that we ensure that the same (or very similar) text may only be sent a limited number of times by any actor throughout the system. This is a powerful way to automatically stop large-scale spam attacks without writing custom text content rules or rate limiting the actor, IP, or other connection characteristics.

The following rate limiter limits an individual fuzzy text fingerprint may only be used 100 times a minute, and if the quota is exceeded the rate limit goes down to 10 times a minute.

```
CREATE RULE NumCommentsSimhash WHERE rateLimited(BY Simhash MAX 100 REFILL 10 EVERY MINUTE);
```

## Strict mode

Often when you create a ratelimit (such as the one above) you want to penalize the rate limited entity once their quota has been exhausted. To accomplish this, Smyte has created a special STRICT mode. Once an entity has been rate limited in STRICT mode they will be rate limited until the entire refill time period has passed.

```
CREATE RULE UserCommentBot WHERE rateLimited(BY Actor MAX 5 EVERY MINUTE STRICT);
```

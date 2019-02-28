title: Home
---

# SQRL: A Safe, Stateful Language for Event Streams

**Instant** – New features and rules can be deployed to production in seconds.
**Inclusive** – Non-technical users can review and safely deploy changes to production without talking to an engineer.
**Powerful** – Rules can declaratively aggregate state, trigger side effects, and call functions in other languages.
**Auditable** – It's easy to understand why a rule fired or a side effect occured, and rules can be safely replayed.

## Community

Come talk to us on the [SQRL discord server](https://discord.gg/mMJwWT6)

## Getting started

**SQRL** (Smyte Query and Rules Language) is designed to be used as a library, but the easiest way to start is with the command line interface.

```
$ npm install --global sqrl-cli
$ cat <<EOF > simple.sqrl
LET Username := input();
LET Message := concat("Hello, ", Username, "!");
EOF

$ sqrl run simple.sqrl -s 'Username="josh"' Message
✓ 2019-01-14 15:09 action was allowed.
Message="Hello, josh!"
```

## SQRL snippets

### Stopping account compromise
```
-- Check for lots of failed login attempts from a single IP address
LET NumLoginAttemptsForIpLastDay := count(BY Ip LAST DAY);
LET NumFailedLoginsForIpLastDay := count(BY Ip WHERE IsFailedLogin LAST DAY);
CREATE RULE IsCredentialStuffingLoginAttempt WHERE
  NumLoginAttemptsForIpLastDay > 20 AND
  NumLoginAttemptsForIpLastDay / NumFailedLoginsForIpLastDay > 0.9
  WITH REASON "IP ${Ip} had ${NumLoginAttemptsForIpLastDay} login attempts in "
              "the last day and more than 90% of those failed."
```

### Mitigating abuse and bullying
```
-- If users swear too much we give them a warning
LET UsedBadWord := patternMatches("BadWords.txt", UserGeneratedText);
LET NumStrikes := count(BY User WHERE UsedBadWord LAST WEEK);
CREATE RULE IsToxicComment
  WHERE NumStrikes > 3
  WITH REASON "User sent ${NumStrikes} messages with bad words in the last week."
```

### Preventing credit card fraud
```
-- If a single user is using lots of credit cards it's an indicator of fraud
LET NumCards := countUnique(CreditCard BY Actor LAST 5 DAYS);
CREATE RULE SuspiciousNumCreditCards
  WHERE NumCards > 4
  WITH REASON "User ${Actor} used ${NumCards} in the last 5 days";

-- If a credit card was used in multiple risky countries then it's suspicious
LET NumRiskyCountries := countUnique(
  Country BY CreditCard WHERE RiskyCountry LAST 5 DAYS);
CREATE RULE MultiRiskyCountryCreditCard WHERE NumRiskyCountries > 1
  WITH REASON "Credit card was used in ${NumRiskyCountries} risky "
              "countries in last 5 days.";
```

### Identifying duplicate accounts
```
-- If a user has signed up with the same normalized email address (i.e. 
-- lowercased, removing + suffixes, etc), cookie, or phone number, or if a
-- subnet is creating lots of accounts, flag it.
LET NormalizedActorEmail := normalizeEmail(ActorEmail);
LET NumSignupsByNormalizedActorEmail := count(BY NormalizedActorEmail TOTAL);
LET NumSignupsByBrowserCookie := count(BY BrowserCookie TOTAL);
LET NumSignupsByActorPhone := count(BY ActorPhone TOTAL);
CREATE RULE IsDuplicateSignup
  WHERE NumSignupsByNormalizedActorEmail > 1 OR NumSignupsByBrowserCookie > 1 OR
        NumSignupsByActorPhone > 1 OR rateLimited(BY IpNetwork MAX 100 EVERY DAY)
  WITH REASON "Signup was a duplicate."
```

### Stopping spam
```
-- Limit quickly accelerating, similar looking messages.
-- It's a good idea to do this with URLs too.
LET Simhash := simhash(UserGeneratedText);
LET NumSimhashWeek := count(BY Simhash LAST WEEK);
LET NumSimhashDay := count(BY Simhash LAST DAY);

CREATE RULE IsSpammyMessage
  WHERE NumSimhashDay > 50 AND NumSimhashDay / NumSimhashWeek > 0.9
  WITH REASON "A simhash was used ${NumSimhashDay} times in the last day, "
              "but only ${NumSimhashWeek} times in the last week.";
```

### Interfacing with ML models
```
-- When someone reports an NSFW image, automatically take it down if our NSFW 
-- model agrees and the reporter does not have a history of false positives.
LET NsfwScore := mlScores("nsfw", ReportedImageUrl);
LET IsLikelyNsfwImage := NsfwScore > 0.92;
LET NumReporterReports := count(BY Actor LAST MONTH);
LET NumReporterFalsePositives := 
  count(BY Actor WHERE NOT IsLikelyNsfwImage LAST MONTH);
LET IsReporterTrustworthy := 
  NumReporterReports < 3 OR NumReporterFalsePositives / NumReporterReports < 0.3;
CREATE RULE AutomaticTakeDown
  WHERE IsLikelyNsfwImage AND IsReporterTrustworthy
  WITH REASON "Trustworthy reporter reported image with NSFW score ${NsfwScore}.";
```

### Coupon codes for high-value users
```
-- Give users spending $200 every month for at least 3 months a discount.
LET PurchaseSession := sessionize(
  BY User EVERY 1 MONTH WHERE PurchaseAmountUsd >= 200);
LET PurchaseSessionAgeInMonths := dateDiff(
  "MONTH", 
  PurchaseSession, 
  Timestamp
);

CREATE RULE GiveLoyaltyDiscount
  WHERE PurchaseSessionAgeInMonths >= 3
  WITH REASON "User ${Actor} has made purchases for $200 or more for "
              "than ${PurchaseSessionAgeInMonths} consecutive months."
```

## Examples

If you want to try out SQRL, you can dive into our example section:
* Set up external state storage in [Redis](examples/redis.html)
* See a real-life use case on [Wikipedia](examples/wikipedia.html)

title: Tutorial
----

# Tutorial

Welcome to the SQRL tutorial! Before we begin, let's go over a few concepts.

SQRL takes an event, called an **action**, and turns it into one or more **features** (some special features are also called **rules**, but we'll get to that later). Your server-side application will usually send an action to a SQRL service, and do something based on the results of the features (i.e. show the user a warning or queue something for manual review).

An **action** is something the user did, or is about to do. For example, some common events include `login`, `signup`, `post_comment`, and `add_payment_method`. Actions are just JSON blobs that we call `ActionData`. For example, one of the most important actions at Twitter is `tweet`:

```
{"name": "tweet", "username": "floydophone", "text": "hello world!"}
```

Save that JSON blob into a file called `tweet.json`. We'll need it later.

## Wiring up features

Now let's wire up some basic **features** in SQRL. **Features** are similar to variables in other languages. You can bind them using the `LET` keyword, and can reference them in any expression. Open up your favorite editor (hint: it's emacs) and create a file called `main.sqrl` with the following code in it:

```
LET ActionData := input();
LET ActionName := jsonValue(ActionData, "$.name");
LET Username := jsonValue(ActionData, "$.username");
LET Text := jsonValue(ActionData, "$.text");
```

`jsonValue()` is a builtin function that parses a JSON string and returns the value at the given [JSONPath](http://jsonpath.com/). Note that SQRL is smart enough to only parse the JSON once.

Let's fire up the [repl](https://en.wikipedia.org/wiki/Read%E2%80%93eval%E2%80%93print_loop) and play with it.
```
$ npm install -g sqrl-cli
$ sqrl repl main.sqrl -s ActionData=@tweet.json
sqrl> Username
'floydophone'
sqrl> Text
'hello world!'
sqrl> ActionName
'tweet'
sqrl> ActionData
{ name: 'tweet', text: 'hello world!', username: 'floydophone' }
sqrl> SqrlClock
'2019-02-21T09:15:45.615Z'
sqrl> SomethingElse
Error: Could not find the requested name:: SomethingElse
```

Cool! You'll see that the features were extracted successfully, and that there's a built-in (but overridable) `SqrlClock` feature that represents the event time. Note also that features are case sensitive.

The current SQRL implementation runs on Node.js and is a compiler, not an interpreter. As we've run this at scale for a long time at a startup that needed to conserve cash, we've put in some effort to make this JS as efficient as we could. You can see a readable version of the compiled code for a feature by calling `printSource()`:

```
sqrl> printSource(Username);
function() {
  const f0 = () =>
    bluebird.resolve(
      functions.attr(this.slots["ActionData"].value(), "username")
    );
  return this.load("ActionData").then(f0);
}
```

We can also spin up a SQRL service to serve this code over the network:

```
$ sqrl serve main.sqrl &
$ curl -H "Accept: application/json" 'http://localhost:2288/run?features=Username,Text,ActionName&pretty' -d @tweet.json
{
  "Username": "floydophone",
  "Text": "hello, world!",
  "ActionName": "tweet"
}
```

We call this process of unpacking a JSON object into feature names **wiring up the action**. You usually do this work once per action type. Once an action is wired up, all of your existing features and rules will automatically start to work on the new action.

Let's say that we want to identify cryptocurrency spam on Twitter. A useful thing to know would be if the user is tweeting about specific cryptocurrencies, like Bitcoin (BTC) or Ethereum (ETH). Let's create a feature for that in the REPL:

```
sqrl> LET HasCryptoKeywords := Text CONTAINS "BTC" OR Text CONTAINS "ETH";
false
sqrl> Text CONTAINS "world"
true
```

## Counters

Now let's say we want to count how often someone is tweeting about cryptocurrency. We'll need to use a **stateful feature** like a counter. Let's create a new feature `NumCryptoTweetsLastDay`:

```
sqrl> LET NumTweetsAboutCrypto := count(BY Username WHERE HasCryptoKeywords LAST DAY);
0
```

The value is `0` because there are no crypto keywords in our `tweet.json` file. Let's pretend that there are and see what happens:

```
sqrl> LET HasCryptoKeywords := true;
true
sqrl> NumTweetsAboutCrypto
1
sqrl> NumTweetsAboutCrypto
1
```

Now the value is `1` because the tweet `HasCryptoKeywords`. But note that even though we evaluate the feature multiple times, the count doesn't go up. That's because SQRL is **idempotent**. This is a valuable property because it allows us to reprocess actions at a later time if we need to.

The SQRL repl has an `EXECUTE` command that will actually update the state and begin the processing of a new action:

```
sqrl> EXECUTE;
sqrl> NumTweetsAboutCrypto
2
sqrl> NumTweetsAboutCrypto
2
sqrl> EXECUTE;
sqrl> NumTweetsAboutCrypto
3
sqrl> EXECUTE;
```

At this point, we can flip `HasCryptoKeywords` back to false, and the counter will cease to increment.

```
sqrl> LET HasCryptoKeywords := false;
false
sqrl> NumTweetsAboutCrypto
3
sqrl> EXECUTE;
sqrl> NumTweetsAboutCrypto
3
```

This is what we mean when we say SQRL is a **stateful** rules language, and it's what sets it apart from many other rules languages.

Another thing to note is that the rule writer declaratively specified what they wanted to count. They didn't explicitly increment or decrement the counter. It's impossible for the counter to accidentally get out of sync, and the backend can be swapped out for a different data store without changing the SQRL source code. At Smyte, we did this at least four times: we moved from a quick and dirty Redis-based counters implementation, to RocksDB, and finally to Google Cloud BigTable. We also had a separate in-memory implementation for unit tests.

If you wait 15 minutes, this counter will eventually decrement. But why wait? All you need to do is change `SqrlClock` to be 15 minutes or more into the future and the counter will drop:

```
sqrl> LET SqrlClock := "2100-02-13T08:00:00.000Z"
'2100-02-13T08:00:00.000Z'
sqrl> NumTweetsAboutCrypto
0
```

This is super useful for replaying old actions or writing unit tests.

## Text pattern matching

As we all know, cryptocurrencies come and go... often. We may want to keep a list of known crypto keywords that people can update rather than requiring a code change all the time.

First, make a file `CryptoKeywords.txt` containing:
```
btc
eth
```

And then in the repl:

```
sqrl> LET HasCryptoKeywords := patternMatches("CryptoKeywords.txt", Text);
false
sqrl> patternMatches("CryptoKeywords.txt", "buy some eth!")
true
sqrl> patternMatches("CryptoKeywords.txt", "buy some ETH!")
true
sqrl> patternMatches("CryptoKeywords.txt", "hi, seth!")
false
```

Note that `patternMatch()` understands word boundaries in multiple languages, so that "hi, seth!" won't trigger a false positive.

## Writing a rule

Now let's say we want to limit people to 100 crypto tweets a day. We'd never write a rule like this in the real world, but it's a useful example of what's possible. Rules are just boolean features with some extra metadata and a nice syntax. Here's how you'd do it.

```
sqrl> CREATE RULE TooMuchCrypto WHERE NumTweetsAboutCrypto > 10 WITH REASON "User ${Username} tweeted about crypto ${NumTweetsAboutCrypto} in the last day";
sqrl> TooMuchCrypto
false
sqrl> LET NumTweetsAboutCrypto := 11;
11
sqrl> NumTweetsAboutCrypto
true
```

## Side effects

Your rule should actually do something. Perhaps we want to label every user that is tweeting too much about crypto for manual review. You can do this with a `WHEN` block. A `WHEN` block ORs together a set of rules, and runs a side effect when one or more of those rules fire.

For example, if you had an `addUserToReviewQueue()` function defined, you could call it like this:

```
WHEN TooMuchCrypto THEN addUserToReviewQueue("cryptospam");
```

The fuction `addUserToReviewQueue()` is not included with the default SQRL distribution, but if you have a review queue set up with an API, you can easily define a new [when clause function](functions/when.html).

## Next steps

* View functions in the [standard library](stdlib/assert.html)
* See the example using [redis to store state](examples/redis.html)
* Try out a real life use case on [Wikipedia edits](examples/wikipedia.html)
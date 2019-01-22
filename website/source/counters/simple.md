title: Simple Counters
---

# Simple Counters

Another powerful tool at your disposal is the ability to flexibly count across multiple timespans. Let's get started with a simple count.

## Your first counter

Here's an example of a simple counter that counts the number of action by a given User in the last week.

```
LET NumMessages := count(BY User LAST WEEK);
```

## Understanding the BY clause

You can create a counter by one or more features. In the above example for each unique **User** we have created another counter of the number of actions performed in the last week.

For certain use cases you'll want to count pairwise features. Perhaps you'll want to know the number of messages the given user sent on this **Ip** as compared to the number they have sent total. That is easy to do just by comma separating the features.

```
LET NumMessages := count(BY User LAST HOUR);
LET NumIpMessages := count(BY User, Ip LAST HOUR);
LET PercentMessagesByIp = 100 * (NumIpMessages / NumMessages);
```


## Available timespans

The LAST clause specifies the timespan we want to count by. For simple counters we do not allow custom timespans, even though we do for unique counts.

The list of available timespans are:

* TOTAL
* LAST 180 DAYS
* LAST MONTH
* LAST TWO WEEKS
* LAST EIGHT DAYS
* LAST TWO DAYS
* LAST DAY
* LAST HOUR

## Counting with conditions

In the previous example we were only counting actions `WHERE ActionName="message"`. It is very easy to create more interesting counters by passing in a WHERE statement as well.

Let's imagine you were interested in tracking users who had a high percentage of messages with profanity. We could easily accomplish this by tracking two counts.

```
LET NumMessagesWithProfanity := count(BY User WHERE TextWithStrongProfanity LAST WEEK);
LET NumMessagesWithoutProfanity := count(BY User WHERE NOT TextWithStrongProfanity LAST WEEK); 
```

Here we have set up two counters – NumMessagesWithProfanity will be increased when the text contains profanity, otherwise NumMessagesWithoutProfanity will be increased. Both counters are available to be read on every action.

### Restrictions on conditions in WHERE clauses

For reasons discussed under where expressions in our advanced documentation there are strict restrictions on what you can put in a WHERE clause. Anything other than simple equality, **AND**, **OR**, and **NOT** is not allowed.

Since ActorAgeDays < 10 is invalid inside a counter where statement, if you wanted to only count messages by new actors you'll need to create another feature.

The example below creates IsYoungActor and uses that in order to count how many messages were sent on the current ip address by users created in the last ten days.

```
LET IsYoungActor := ActorAgeDays < 10;
LET NumMessagesByYoungActorsOnIp := count(BY Ip WHERE IsYoungActor);
```
 
Labeling users that use a high percentage of profanity
To tie it all together we could create a rule for flagging users who have a high percentage of messages containing profanity.

``` 
LET NumMessagesWithProfanity := count(BY User WHERE TextWithStrongProfanity LAST WEEK);
LET NumMessagesWithoutProfanity := count(BY User WHERE NOT TextWithStrongProfanity LAST WEEK);

# Keep track of total and percentage so we can use in reason string.
LET TotalMessages := NumWithProfanity + NumWithoutProfanity;
LET PercentProfaneMessages := NumWithProfanity / TotalMessages;
CREATE RULE HighPercentageProfanity
  WHERE PercentProfaneMessages > 0.5 AND TotalMessages > 2;
  
WHEN HighPercentageProfanity THEN blockAction(), addLabel(User, "bad_user");
```

We could just have easily tracked users who received lots of profane messages and either block the action or label the recipient to trigger some form of outreach. Let's look at what that code would look like:

```
LET NumReceivedWithProfanity := count(BY Target WHERE TextWithStrongProfanity LAST WEEK);
LET NumReceivedWithoutProfanity := count(BY Target WHERE NOT TextWithStrongProfanity LAST WEEK);

# Keep track of total and percentage so we can use in reason string.
LET TotalReceived := NumReceivedWithProfanity + NumReceivedWithoutProfanity;
LET PercentProfaneReceived := NumReceivedWithProfanity / TotalReceived;
CREATE RULE HighPercentageProfanityReceived
  WHERE PercentProfaneReceived > 0.5 AND TotalReceived > 2;
  
WHEN HighPercentageProfanityReceived
  blockAction(),
  addLabel(Target, "harassment_recipient");
```
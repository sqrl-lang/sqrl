title: Sessionization
---

# Sessionization

Sessionization is a powerful tool for combating abuse and is often used to detect anomalies, identify bots, cluster accounts, and surface other risky behavior. In this post we will explore how sessionization works and some interesting properties associated with sessions.

## What is a session?

A session is “a unit of measurement of a user's actions taken within a period of time or with regard to completion of a task.” In other words, sessions allow us to cluster activity from a particular time window together.

SQRL (the Smyte Query and Rules Language) allows you to easily create sessions using custom keys across arbitrary timespans in real-time as your data streams in. Smyte’s definition of a session is slightly broader in that we do not restrict sessions to just users. In fact, we can create sessions that are keyed off of IP addresses, credit cards, URLs, or any feature for that matter without having to wait for complex, expensive batch jobs to run.

## Getting started

Let’s imagine a simple case where we wanted to create a one hour session for a user. We can accomplish this with a single line of code:

```
LET UserHourSession := sessionize(BY User EVERY 1 HOUR);
```
 
From now on, whenever the user performs an action (logs in, sends a message, makes a payment, etc) we will check to see if a session exists. If no session exists, we will create a session that lasts for one hour.

### Creating a one hour session

If the specified time elapses with no activity, the current session is destroyed. Any subsequent event will create a new session.

Creating a new session after too much time has elapsed

If the session does exist, then we will extend the current session’s window by an additional hour.

Extending a session

It is important to note that each session gets its own unique ID. This identifier can be used in simple counters, unique counters, or rate-limits to identify suspect behavior and can even be used to determine the age of the session since we embed timestamps in all Smyte IDs.

## Conditional sessions

In our first example, we created a simple session with no conditions; however, we can easily add qualifiers with a WHERE clause.

Let’s imagine we want to create a session for any time a user sends a message.

We could accomplish this with the following line of code:

```
LET UserMessageHourSession := sessionize( BY User EVERY 1 HOUR WHERE ActionName = "send_message" );
```

In this case, we only consider message events as valid actions to be grouped in a session.

## Detecting bots

As mentioned above, Smyte tracks session age through unique IDs. To show how this is useful in detecting bots, let’s consider the example above. If we call the dateDiff function, we can see how many hours have elapsed since the session was created.

### Session age

```
LET UserMessageHourSession := sessionize(BY User EVERY 1 HOUR WHERE ActionName="send_message");

-- Get session age in hours
LET MessageHourSessionAgeInHours := dateDiff(
  "HOUR", 
  UserMessageHourSession, 
  EventTimestamp
);
```

Remember that as soon as an hour has elapsed with no activity the session is destroyed and a new one will be created. This means that if a user has a message session that is 24 hours old they have been actively sending messages for the past 24 hours straight! This type of behavior often indicates that the user is in fact a bot.

With this insight, you can easily create a rule to flag and review this suspicious behavior.

### Session age rule

```
CREATE RULE DayLongMessageSession WHERE MessageHourSessionAgeInHours >= 24
 WITH REASON "User has been sending a message for the "
             "past ${MessageHourSessionAgeInHours} hours straight";
 ```
 

## Variance checks

Another interesting way of using sessions is to cluster accounts together and look for relations or anomalous behavior. Let’s imagine we are trying to detect suspect email signups from IP addresses.

```
Email,       Ip,      Timestamp
a@gmail.com, 1.2.3.4, 2018-04-11T04:35:30.143Z
b@gmail.com, 1.2.3.4, 2018-04-11T04:36:30.143Z
c@gmail.com, 1.2.3.4, 2018-04-11T04:37:30.143Z
d@email.com, 1.2.3.4, 2018-04-11T04:38:30.143Z
e@gmail.com, 1.2.3.4, 2018-04-11T04:39:30.143Z
f@gmail.com, 1.2.3.4, 2018-04-11T04:40:30.143Z
```

Notice that all the email addresses here are of a fixed length. This is a common pattern we see when looking for fake accounts. Attackers often use scripts that generate email addresses of a fixed length, albeit with random characters.

We can take advantage of sessions here to segment our data and look for an anomaly like this, since it is extremely atypical for all email addresses to be of the same length.

### Variance in a session

```
LET IpSignupSessionHour := sessionize(BY Ip EVERY 1 HOUR WHERE IsSignupAction);
LET EmailLengthIpSessionVariance := variance(ActorEmailHandleLength GROUP BY IpSignupSession);
```

With two lines of code we can now look at the variance in email lengths across signups for a given IP address!
If we wanted to create a rule to flag this we might want to add a minimum number of signups before considering this risky behavior. All this would require is counting how many total signups we have seen for this signup session.

## Counting

```
LET NumSignupsByIpSignupSessionHour := count(
  BY IpSignupSessionHour LAST WEEK WHERE IsSignupAction
);
```

Here, we are counting how many signups we have seen for this session over the past week. This gives us plenty of buffer in case the IP has continuous signup activity (remember that as soon as an hour with no signups elapses we will get a new session ID).
To tie it all together we can create a rule like this:

## Variance rule

```
LET IpSignupSessionHour := sessionize(BY Ip EVERY 1 HOUR WHERE IsSignupAction);
LET EmailLengthIpSessionVariance := variance(
	ActorEmailHandleLength GROUP BY IpSignupSession
);
LET NumSignupsByIpSignupSessionHour := count(
  BY IpSignupSessionHour LAST WEEK WHERE IsSignupAction
);
CREATE RULE LowVarianceEmailSignup
  WHERE EmailLengthIpSessionVariance < 1
  AND NumSignupsByIpSignupSessionHour > 10
  WITH REASON "We have seen ${NumSignupsByIpSignupSessionHour} signups from "
              "this IP with low variance in email length";

LET IpSignupSessionHour := sessionize(BY Ip EVERY 1 HOUR WHERE IsSignupAction);
LET EmailLengthIpSessionVariance := variance(ActorEmailHandleLength GROUP BY IpSignupSession);
LET NumSignupsByIpSignupSessionHour := count(BY IpSignupSessionHour LAST WEEK WHERE IsSignupAction);
CREATE RULE LowVarianceEmailSignup
  WHERE EmailLengthIpSessionVariance < 1 AND NumSignupsByIpSignupSessionHour > 10
  WITH REASON "We have seen ${NumSignupsByIpSignupSessionHour} signups from this IP "
              "with low variance in email length";
```

## Velocity

The final use case for sessions that we will discuss here revolve around velocities. Velocities allow us to flag the rate or speed of which something is being done. In this example, let’s imagine we are trying to flag users who are making payments too quickly.

This can be done with three lines of code using the velocity function.

```
-- Create hour long session for payments
LET PaymentSessionHour := sessionize(BY User EVERY 1 HOUR WHERE IsPaymentAction);
-- Track how many payments are being made in the current session
LET PaymentSessionSize := count(BY PaymentSessionHour LAST DAY);
-- Calculate velocity / rate at which payments are being made. 
-- The third parameter is the minimum # of events required for us to calculate velocities.
LET PaymentVelocity := velocity(
  PaymentSessionHour, 
  PaymentSessionSize, 
  3
);
```

velocity takes in three arguments - the session, the total size, and the minimum number of events required for us to calculate velocity. Velocities calculated here are the per/hour rate at which the action is occurring.

More often than not you will have some idea of what a risky velocity might be, but sometimes you might not know this offhand or you do not want to statically set this. We can take advantage of Smyte’s streaming statistics to set these thresholds dynamically.

To do this we would use the percentileCheck function. percentileCheck expects two arguments - the percentile to check against and a value.

## Percentile

```
LET PaymentVelocity := velocity(PaymentSession, PaymentSessionSize, 3);
LET IsPaymentVelocity99Percentile := percentileCheck(99, PaymentVelocity);
CREATE RULE 99PercentilePaymentVelocity
  WHERE IsPaymentVelocity99Percentile
  WITH REASON “User is in the 99th percentile for payment velocity: ${PaymentVelocity}”;
```

## Conclusion

As you can see, sessionization is a powerful tool to detect all sorts of malicious behavior - ranging from fake accounts, payment fraud, to bots and spam. At Smyte, we believe that taking a holistic approach; bringing back a human in the loop; and taking advantage of advances in stream processing are the keys to successfully combating abuse. Rather than solely relying on machine learning, we can use the abuse primitives Smyte provides in combination and create more powerful, transparent classifiers. If you are interested in learning more and would like a demo please reach out to sales@smyte.com.

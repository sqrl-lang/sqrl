title: Unique Counters
---

# Unique Counters

Sometimes simple counters are not enough and you need more powerful counters. This is where unique counts, or **time windowed set cardinalities**, come into play.

### Your first unique counter

To get started we're going to count the number of unique credit cards used over your entire account in the last twelve hours. While simple counters are restricted to a small number of windows, with our unique counters you can specify arbitrary time windows.

```
LET NumCreditCards := countUnique(CreditCard LAST 12 HOURS);
```

### Grouping unique counts

It is rare that you just want to count unique values across your whole dataset. More often than not, you will be interested in counting unique values grouped by another feature.

Let's say we wanted to create a rule that blocks payments from users who have a suspicious number of credit cards. We could accomplish that with the following rule.

```
LET NumCreditCards := countUnique(CreditCard BY SessionActor LAST 5 DAYS);
CREATE RULE SuspiciousNumCreditCards WHERE NumCreditCards > 4;
```

Now, rather than counting all the unique credit cards we have seen for everyone, we are counting the number of cards by each individual user.

### Counting with conditions and groups

Let's bring it together with an example that includes a WHERE condition as well. In this example we want to create a rule that picks up when a credit card is used in more than one risky country.

We include the number of risky countries it has been seen in inside the rule reason. Finally we mark the rule as fully rolled out, and set it to both block the action and apply a bad_credit_card label to the card that was used.

```
LET NumRiskyCountries := countUnique(Country BY CreditCard WHERE RiskyCountry LAST 5 DAYS);
CREATE RULE MultiRiskyCountryCreditCard WHERE NumRiskyCountries > 1
  WITH REASON "Credit card was used in ${NumRiskyCountries} risky countries in last 5 days.";
  
WHEN MultiRiskyCountryCreditCard
  blockAction(),
  addLabel(CreditCard, "bad_credit_card");
```

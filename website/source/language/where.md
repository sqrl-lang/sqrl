title: Where Clauses
---

# Where Clauses

In order to get an in-depth understanding of SQRL it is vital that you understand how WHERE statements affect underlying counters and rules.

Limitations on expressions in WHERE statements
In order to provide automatic counters and other similar features, we impose some limitations on the syntax you are allowed to use inside a where statement.

This is restricted to the following operations:

* Feature truthness, and NOT (i.e. WHERE X, WHERE NOT Y)
* Boolean AND/OR (i.e. WHERE X AND Y, WHERE (X AND Y) OR Z)
* Equality / inequality with constants (i.e. WHERE X="A", WHERE Y!="B")

## Counter values

Smyte does not automatically track every counter you could possibly use in SQRL. The simple reason for this is cost savings... since keeping track of counters costs money, and since we allow an infinite set of different counters, we can't afford to spend infinite money on them.

For most counters we'll only start tracking the counts when you first push the count(), countUnique(), checkPercentile()or similar call to our system. It is important to identify how counters are uniquely identified in our system to avoid unintentionally starting a new counter (and losing all previous values).

For example the following two counters are maintained separately:

```
LET LoginCount := count(BY SessionActor WHERE ActionName="login");
LET PurchaseCount := count(BY SessionActor WHERE ActionName="purchase");
```
 
This is to be expected. LoginCount is a count of logins, while PurchaseCount is a count of purchases. Internally we track the features used in the WHERE statement and use them to identify the counter.

Using ActionName directly in count() is not recommended though, because in future you may wish to add a new action mobile_login, or perhaps change login to logged_in. Changing the constant ActionName would use a new set of counters.

Instead we recommend you use additional feature:

```
LET IsLogin := ActionName = "login";
LET LoginCount := count(BY SessionActor WHERE IsLogin);
```

With this change later we can safely update IsLogin.

```
LET IsLogin := ActionName IN ["login", "mobile_login"];
LET LoginCount := count(BY SessionActor WHERE IsLogin);
```

In the above case since the body of the WHERE clause did not change any previous tracked counts under the "login"action will still exist.

## INCLUDE statements

When you include a file with a WHERE clause every statement in that file is included with that additional expression.

This is most clearly demonstrated by taking the following combination of files:


**rules/purchase.sqrl**

```
LET NumPurchaseByActor := count(BY SessionActor);
LET ManyPurchaseByActor := NumPurchaseByActor > 5;
CREATE RULE ManyPurchase WHERE ManyPurcaseByActor;
```

**main.sqrl**
```
LET IsPurchase := ActionName = "purchase";
INCLUDE "purchase.sqrl" WHERE IsPurchase;
```

To achieve the same thing in a single file, the equivalent SQRL code would be:

```
LET IsPurchase := ActionName = "purchase";
LET NumPurchaseByActor := 
  if(IsPurchase, count(BY SessionActor WHERE IsPurchase));
LET ManyPurchaseByActor := 
  if(IsPurchase, NumPurchaseByActor > 5);
CREATE RULE ManyPurchases 
  WHERE ManyPurcaseByActor AND IsPurchase;
```
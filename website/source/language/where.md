## title: Where Clauses

# Where Clauses

In order to get an in-depth understanding of SQRL it is vital that you understand how WHERE statements affect underlying counters and rules.

Limitations on expressions in WHERE statements
In order to provide automatic counters and other similar features, we impose some limitations on the syntax you are allowed to use inside a where statement.

This is restricted to the following operations:

- Features, and unary **NOT** (i.e. WHERE _IsLogin_, WHERE _NOT IsSignup_)
- Boolean **AND**/**OR** (i.e. WHERE _IsSignup AND TrustedIp_, WHERE _(X AND Y) OR Z_)
- Equality (**=**) / inequality (**!=**) to constants (i.e. WHERE _Username="josh"_, WHERE _Ip!="127.0.0.1"_")

## Counter values

For most counters SQRL will only track the counts that exist in the source code. It is important to identify how counters are uniquely identified in SQRL to avoid unintentionally changing the identification of a counter (and losing all previous values).

For example the following two counters are maintained separately:

```
LET LoginCount := count(BY SessionActor WHERE Event="login");
LET PurchaseCount := count(BY SessionActor WHERE Event="purchase");
```

This is to be expected. LoginCount is a count of logins, while PurchaseCount is a count of purchases. Internally we track the features used in the WHERE statement and use them to identify the counter.

Using `Event` directly in count() is not recommended though, because in future you may wish to add a new action `"mobile_login"`, or perhaps change `"login"` to `"logged_in"`. Changing the constant in the `Event="X"` where clause would use a new set of counters.

Instead we recommend you use additional feature:

```
LET IsLogin := Event = "login";
LET LoginCount := count(BY SessionActor WHERE IsLogin);
```

With this change later we can safely update IsLogin.

```
LET IsLogin := Event IN ["login", "mobile_login"];
LET LoginCount := count(BY SessionActor WHERE IsLogin);
```

In the above case since the body of the WHERE clause did not change any previous tracked counts under the `"login"` event will still exist.

## INCLUDE statements

When you include a file with a WHERE clause every statement in that file is included with that additional expression.

This is most clearly demonstrated by taking the following combination of files:

**rules/purchase.sqrl**

```
LET NumPurchaseByActor := count(BY SessionActor);
LET ManyPurchaseByActor := NumPurchaseByActor > 5;
CREATE RULE ManyPurchase WHERE ManyPurchaseByActor;
```

**main.sqrl**

```
LET IsPurchase := Event = "purchase";
INCLUDE "purchase.sqrl" WHERE IsPurchase;
```

To achieve the same thing in a single file, the equivalent SQRL code would be:

```
LET IsPurchase := Event = "purchase";
LET NumPurchaseByActor := if(IsPurchase, count(BY SessionActor WHERE IsPurchase));
LET ManyPurchaseByActor := if(IsPurchase, NumPurchaseByActor > 5);
CREATE RULE ManyPurchases WHERE ManyPurchaseByActor AND IsPurchase;
```

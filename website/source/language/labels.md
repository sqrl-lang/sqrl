title: Labels
---

# Labels

You'll often want to keep a little bit of additional information attached to the various [entities](entities.html) in your system.

Usually these labels are applied as a result of rules, for example:

```
CREATE RULE SignupFromTor WHERE isTorExitNode(Ip);
WHEN SignupFromTor THEN addLabel(User, "tor_signup");
```

This will let you later keep track of users that were created via Tor and apply stricter ratelimits.

_Note_: The `isTorExitNode` function is not included in this package. You can define it yourself though. See [definiting functions](../functions/simple.html) to get started!

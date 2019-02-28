title: Wikipedia
---

# Wikipedia

Once you get a little further, we have a demonstration that looks for a set of bad words on wikipedia.

```
git clone git@github.com:twitter/sqrl
cd sqrl/examples/wikipedia
npx wikipedia-diff-stream en.wikipedia.org | sqrl run main.sqrl --stream=EventData --only-blocked

...
✗ 2018-11-15 11:25 action was blocked.
↳ [UsedBadWords]: Matched pattern shit: this is all bullshit
Page: https://en.wikipedia.org/wiki/List_of_synthetic_polymers
Diff: https://en.wikipedia.org/w/index.php?title=List%20of%20synthetic%20polymers&type=revision&diff=868997967&oldid=868800716
Count by user: 3 (<redacted>)
```

If you do run this example you will see **a lot** of false positives. A simple list of bad words
does not make an effective spam filter. The tools provided by SQRL should allow you to combine
separate counters, rate limits, text filters and logic in order to greatly reduce the false
positive rate.
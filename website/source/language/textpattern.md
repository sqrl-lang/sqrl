## title: Text Patterns

# Text Patterns

As new spam campaigns emerge and existing ones change, it is important to be able to quickly update content rules.

Here's an example of a rule that blocks any comments using a blacklisted keyword.

```
CREATE RULE UsedBlacklistedKeyword WHERE patternMatches("BlacklistedKeywords.txt", Text);
```

The patternMatches returns back an array of extracted matches or an empty array if none are found (empty arrays evaluate to false in SQRL). Often times you would want to use the extracted matches in the rule's reason. We can easily do that by updating the code to the following.

```
LET BlacklistedKeywordMatches := patternMatches("BlacklistedKeywords.txt", Text);
CREATE RULE UsedBlacklistedKeyword WHERE BlacklistedKeywordMatches
  WITH REASON "Text used blacklisted keywords: ${BlacklistedKeywordMatches}";
```

### Maintaining blacklists

This feature is also useful for maintaining blacklists, in this example of email addresses:

```
LET BlacklistedEmailMatches := patternMatches("BlacklistedEmail.txt", ActorEmail);
CREATE RULE UsedBlacklistedEmail WHERE BlacklistedEmailMatches
  WITH REASON "Email contained blacklisted patterns: ${BlacklistedEmailMatches}";
```

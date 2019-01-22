title: Text Patterns
---

# Text Patterns

Getting started
As new spam campaigns emerge and existing ones change, it is important to be able to quickly update content rules. Smyte allows you to easily add or modify custom text patterns on the fly – we call this system Matchmaker.

Creating rules that use Smyte Matchmaker is simple. Here's an example of a rule that blocks any comments using a blacklisted keyword.

```
CREATE RULE UsedBlacklistedKeyword
  WHERE patternMatches("BlacklistedKeywords");
```

The patternMatches returns back an array of extracted matches or an empty array if none are found (empty arrays evaluate to false in SQRL). Often times you would want to use the extracted matches in the rule's reason. We can easily do that by updating the code to the following.

```
LET BlacklistedKeywordMatches := patternMatches("BlacklistedKeywords");
CREATE RULE UsedBlacklistedKeyword WHERE BlacklistedKeywordMatches
  WITH REASON "Text used blacklisted keywords: "
              "${BlacklistedKeywordMatches}";
```
 
Matching against specific text fields
By default patternMatches will execute the given pattern against the UserGeneratedText feature. Sometimes you might want to run this against another feature. This is accomplished by providing the feature you want to run against as a second parameter to patternMatches.

```
LET BlacklistedEmailMatches := patternMatches("BlacklistedEmail", ActorEmail);
CREATE RULE UsedBlacklistedEmail WHERE BlacklistedEmailMatches
  WITH REASON "Email contained blacklisted patterns: "
              "${BlacklistedEmailMatches}";
```
title: sqrl-text-functions
---

# sqrl-text-functions

Functions for doing analysis on text.

## charGrams

**charGrams**(text, size)

Returns all the chargrams of a given size from the text

## normalizeEmail

**normalizeEmail**(email)

Returns the normalized form of the given email address

## patternMatches

**patternMatches**(filename, text)

Match a list of patterns in the given file against the provided text

## regexMatch

**regexMatch**(regex, string)

Returns the matches of the given regular expression against the string

## regexReplace

**regexReplace**(regex, replacement, string)

Replaces each match of the given regular expression in the string

## regexTest

**regexTest**(regex, string)

Returns true if the given regular expression matches the string

## sha256

**sha256**(value)

Returns the sha256 hash of the given value as hex

## simhash

**simhash**(text)

Return the simhash of the given text


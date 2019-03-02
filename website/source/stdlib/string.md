title: String Functions
---

# String Functions

These are the functions that perform operations on strings in the standard library.
Some functions such as `list` and `concat` operate on both strings and lists (strings are
treated as lists of unicode characters) and are documented on the [list](list.html) page.

## endsWith

**endsWith**(string, suffix)

Returns true if the given string ends with the suffix

## escapeRegex

**escapeRegex**(value)

Encodes special characters in the given string for use in a regular expression

## escapeURI

**escapeURI**(value)

Encodes special characters in the given string for a component in a URI

## hasDigit

**hasDigit**(string)

Returns true if the given string contains a digit

## hexEncode

**hexEncode**(value)

Returns the value encoded as a hex string

## iso8601

**iso8601**(date)

Returns the date as a valid ISO8601 date string

## lower

**lower**(string)

Returns the lowercase version of the given string

## repr

**repr**(value)

Represent the given value (including nulls) as a string

## split

**split**(value, by)

Splits a string into a list of strings

## startsWith

**startsWith**(string, prefix)

Returns true if the given string starts with the prefix

## stringify

**stringify**(value)

Returns the value encoded as a json string

## strip

**strip**(value)

Strips whitespace from either end of the given string

## substr

**substr**(string, start, [end])

Returns the substring from the given start index of the string

## upper

**upper**(string)

Returns the uppercase version of the given string


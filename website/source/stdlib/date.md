title: Date Functions
---

# Date Functions

## date

**date**(value)

Convert the given object or ISO8601 string to a date

## dateAdd

**dateAdd**(date, duration)

Add a given duration (ISO8601 format) to the given date

## dateDiff

**dateDiff**(unit, start, end?)

Returns the difference between the two dates in the given unit (millisecond, second, minute, hour, day, week)

## dateFromMs

**dateFromMs**(value)

Converts a count of milliseconds since the unix epoch to a date

## formatDate

**formatDate**(date, format)

Format a given date according to a given format (see https://momentjs.com/docs/#/displaying/format/)

## timeMs

**timeMs**(date)

Returns the count of milliseconds since the unix epoch for the provided value


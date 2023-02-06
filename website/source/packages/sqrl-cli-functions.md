## title: sqrl-cli-functions

# sqrl-cli-functions

These functions are intended for use with the sqrl cli. At a later stage they may be ported to a separate package.

## allSource

**allSource**(None)

Returns all of the source code for this execution

## blockAction

**blockAction**(None)

Mark the current action as blocked

## featureSource

**featureSource**(feature)

Returns the JavaScript source of the given feature

## log

**log**(format string, value...)

Logs a message using sprintf style formatting

## logFeature

**logFeature**(feature)

Logs the given feature and its value

## printAllSource

**printAllSource**(None)

Prints the SQRL execution source

## printSource

**printSource**(feature)

Prints the JavaScript source of the given feature

## wasBlocked

**wasBlocked**(None)

Check if the current action was marked as blocked

## whitelistAction

**whitelistAction**(None)

Mark the current action as whitelisted

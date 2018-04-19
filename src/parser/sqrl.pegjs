{
  (function() {
    // @NOTE: These are just here to remove the unused warning in generated ts
    (error || expected || peg$anyExpectation);
  })();

  function loc(): AstLocation {
    return options.mergeLocation(location());
  }
  function camelCase(string) {
    // * Lowercase the string
    // * Uppercase any letter at a word boundary
    // * Remove all spaces
    return string.toLowerCase().replace(/\b\w/g, function(chr, idx) {
      return idx > 0 ? chr.toUpperCase() : chr;
    }).replace(/\s+/g, '');
  }
}

SqrlScript = flag:FlagStatement? topStatements:SqrlClosedStatement* FinalWhitespace {
  // @TODO: Get rid of sections
  return {
    type: 'script',
    flag: flag || null,
    statements: topStatements,
    location: loc(),
  };
}

SqrlRepl = _? topStatements:SqrlClosedStatement* last:(SqrlStatement / SqrlExpr)? _? ";"? FinalWhitespace {
  return {
    type: 'repl',
    statements: [...topStatements, last].filter(f => f),
    location: loc(),
  };
}

SqrlExpr = _? expr:Expr _? {
  return {
    type: 'expr',
    expr: expr,
    location: loc(),
  };
}

FlagStatement = "'use migrate';" {
  return 'migrate';
}

SqrlClosedStatement = _? statement:SqrlStatement _? ";" {
  return statement;
}

SqrlStatement = statement:(
  AssertStatement /
  ExecuteStatement /
  IncludeStatement /
  LetStatement /
  RuleStatement /
  WhenStatement /
  ListComprehensionExpr /
  CallStatement
) {
  return statement;
}


IncludeStatement = "INCLUDE"i _ library:("LIBRARY"i _)? filename:String where:WhereClause? {
  where = where || {'type': 'constant', value: true};
  return {
    type: 'include',
    filename: filename,
    where: where,
    library: !!library,
    location: loc(),
  };
}

AssertStatement = "ASSERT"i _ expr:Expr {
  return {
    type: 'assert',
    expr: expr,
    location: loc()
  };
}

ExecuteStatement = "EXECUTE"i repeat:(_ Number _ "TIMES"i)? skipWait:SkipWaitClause? {
  return {
    type: 'execute',
    repeat: repeat ? repeat[1] : 1,
    skipWait: !!skipWait,
    location: loc()
  };
}

DefaultClause = _ "DEFAULT"i { return "default"; }

SwitchClause = DefaultClause / WhereClause

LetStatement = keyword:LetKeyword description:LetDescriptionClause? _ feature:Feature _? ":=" _? expr:Expr where:SwitchClause? {
  const isDefaultCase = where === 'default';
  if (isDefaultCase) {
    where = { type: 'constant', value: null };
  } else {
    where = where || {'type': 'constant', value: true};
  }

  return {
    type: 'let',

    description,
    expr,
    feature,
    final: keyword === 'final',
    isDefaultCase,
    location: loc(),
    where,
  };
}

LetKeyword = ("DEFAULT"i / "LET"i / "FINAL"i) {
  return text().toLowerCase();
}

LetDescriptionClause = _ description:String {
  return description;
}

RolloutClause = _ "ROLLOUT TO"i _ value:IntLiteral "%"{
  return value;
}

RuleStatement = keyword:("CREATE"i / "DEFAULT"i) description:LetDescriptionClause? _ rule:NewRuleClause {
  return Object.assign({}, rule, {
    description: description,
    location: loc(),
  });
}

WhenStatement = "WHEN"i _ rules:(NewRuleClause / RulesExpr) _ "THEN"i _ statements:WhenStatementList {
  return {
    type: 'when',
    rules,
    statements,
    location: loc()
  };
}

NewRuleClause = sync:SyncClause? "RULE"i _ name:Feature alias:(_ "ALIAS"i _ alias:Feature)? where:WhereClause? reason:ReasonClause? rolloutPercent:RolloutClause? {
  where = where || {'type': 'constant', value: true};
  return {
    type: 'rule',
    name,
    where,
    reason,
    sync: !!sync,
    rolloutPercent: rolloutPercent || 0,
    alias: alias ? alias[3] : null,
    location: loc()
  };
}

SyncClause = value:("SYNC"i / "ASYNC"i) _ {
  return value.toLowerCase() === 'sync';
}

// In future we could switch this to use CallStatement to allow for ` WHERE` clauses. That would
// complicate the WHEN block significantly so leaving it out for now.
WhenStatementList = first:CallExpr rest:(_? "," _? CallExpr)* {
  return [first].concat(rest.map(item => item[1]));
}

RulesExpr = ("RULES"i _)? firstRule:FeatureExpr restRules:(_? "," _? FeatureExpr)* {
  return {type: 'rules', rules: [firstRule].concat(restRules.map(arg => arg[3])), location: loc()};
}

CallStatement = call:CallExpr where:WhereClause? {
  if (where) {
    return {
      type: 'call',
      func: 'if',
      args: [where, call]
    };
  }
  return call;
}

CallExpr = (
  CountCallExpr /
  CountPreviousCallExpr /
  CountUniqueCallExpr /
  PercentileCallExpr /
  PercentileForCallExpr /
  RateLimitCallExpr /
  StreamingStatsCallExpr /
  SumCallExpr /
  TrendingCallExpr /
  SimpleCallExpr
);

SumCallExpr = SumFunc _? "(" _? sumFeature:FeatureExpr _? "BY"i _ features:AliasFeatureList where:WhereClause? timespan:CountTimespanClause? _? ")" {
  where = where || {'type': 'constant', value: true};
  return {
    type: 'call',
    func: 'count',
    args: [{
      type: 'countArgs',
      features,
      sumFeature,
      timespan: timespan || 'total',
    }, where],
    location: loc()
  };
}

CountCallExpr = CountFunc _? "(" _? "BY"i _ features:AliasFeatureList where:WhereClause? timespan:CountTimespanClause? _? ")" {
  where = where || {'type': 'constant', value: true};
  return {
    type: 'call',
    func: 'count',
    args: [{
      type: 'countArgs',
      features,
      sumFeature: null,
      timespan: timespan || 'total',
    }, where],
    location: loc()
  };
}

TrendingTimespanClause = _ timespan:(
  "DAY OVER DAY"i /
  "DAY OVER FULL WEEK"i /
  "WEEK OVER WEEK"i
) {
  return camelCase(timespan);
}

TrendingCallExpr = TrendingFunc _? "(" _?
  features:AliasFeatureList
  where:WhereClause?
  minEvents:MinEventsClause?
  timespan:TrendingTimespanClause
  _? ")" {
  where = where || {'type': 'constant', value: true};
  return {
    type: 'call',
    func: 'trending',
    args: [{
      type: 'trendingArgs',
      features,
      minEvents: minEvents || 1,
      timespan,
    }, where],
    location: loc()
  };
}

CountTimespanClause = _ timespan:(
  "DAY OVER DAY"i /
  "DAY OVER WEEK"i /
  "LAST DAY"i /
  "LAST EIGHT DAYS"i /
  "LAST HOUR"i /
  "LAST MONTH"i /
  "LAST 180 DAYS"i /
  "LAST TWO DAYS"i /
  "LAST TWO WEEKS"i /
  "LAST WEEK"i /
  "TOTAL"i /
  "WEEK OVER WEEK"i /

  /* These are included for backwards compatibility but a bit ugly... */
  "LAST 1 HOUR"i /
  "LAST 1 DAY"i /
  "LAST 1 WEEK"i /
  "LAST 1 MONTH"i
) {
  // @TODO: We should improve numeric handling in this
  timespan = timespan.replace(/ 1 /, ' ');

  return camelCase(timespan);
}

CountPreviousCallExpr = CountPreviousFunc _? "(" _? "BY"i _ features:AliasFeatureList where:WhereClause? _ previousTimespan:("LAST DAY"i / "LAST WEEK") _? ")" {
  where = where || {'type': 'constant', value: true};
  return {
    type: 'call',
    func: 'count',
    args: [{
      type: 'countArgs',
      features,
      sumFeature: null,
      timespan: camelCase('previous ' + previousTimespan),
    }, where],
    location: loc()
  };
}


CountUniqueCallExpr = CountUniqueFunc _? "(" _?
  uniques:AliasFeatureList
  groups:(_ GroupBy _ groups:AliasFeatureList )?
  setOperation:(_ ("INTERSECT"i / "UNION"i) _ AliasFeatureList )?
  where:WhereClause?
  windowMs:LastMsClause?
  beforeAction:BeforeActionClause?
  _?
")" {
  where = where || {'type': 'constant', value: true};
  return {
    type: 'call',
    func: 'countUnique',
    args: [{
      type: 'countUniqueArgs',
      uniques,
      groups: groups ? groups[3] : [],
      setOperation: setOperation ? {
        operation: setOperation[1].toLowerCase(),
        features: setOperation[3],
      } : null,
      windowMs: windowMs || null,
      beforeAction: beforeAction === true,
    }, where],
    location: loc()
  };
}

RateLimitCallExpr = func:(RateLimitFunc) _? "(" _? "BY"i _ features:FeatureList _ max:("MAX"i _
    maxAmount:IntLiteral _)? "EVERY"i _ refillTimeMs:DurationMsExpr refillAmount:RateLimitRefillClause?
    tokenAmount:RateLimitTakeClause? strict:RateLimitStrictClause?
    where:WhereClause? _? ")" {
  const maxAmount = max ? max[2] : 1;
  refillAmount = refillAmount || maxAmount;
  tokenAmount = tokenAmount || {'type': 'constant', value: 1};
  strict = strict || false;
  where = where || {'type': 'constant', value: true};
  return {
    type: 'call',
    func,
    args: [{
      type: 'rateLimitArgs',
      features,
      maxAmount,
      refillTimeMs,
      refillAmount,
      tokenAmount,
      strict,
    }, where],
    location: loc()
  };
}

RateLimitRefillClause = _ "REFILL"i _ value:IntLiteral {
  return value;
}

RateLimitTakeClause = _ "TAKE"i _ value:Expr {
  return value;
}

RateLimitStrictClause = _ "STRICT"i {
  return true;
}

PercentileArgsExpr = feature:Feature groupFeatures:(_ GroupBy _ groupFeatures:FeatureList )? where:WhereClause? {
  where = where || {'type': 'constant', value: true};
  return [{
    type: 'percentileArgs',
    groupFeatures: groupFeatures ? groupFeatures[3] : [],
    feature,
  }, where];
}

PercentileCallExpr = func:(PercentileFunc) _? "(" _? percentile:IntLiteral _? "," _? percentileArgs:PercentileArgsExpr _? ")" {
  const [config, where] = percentileArgs;
  return {
    type: 'call',
    func,
    args: [Object.assign(config, {percentile}), where],
    location: loc()
  };
}

PercentileForCallExpr = func:PercentileForFunc _? "(" _? percentileArgs:PercentileArgsExpr _? ")" {
  return {
    type: 'call',
    func,
    args: percentileArgs,
    location: loc()
  }
}

SimpleCallExpr = func:Func _? "(" _? args:ExprList? _? ")" {
  return {type: 'call', func: func, args: args || [], location: loc()};
}

StreamingStatsCallExpr = func:(StreamingStatsFunc) _? "(" _? feature:Feature group:(_ GroupBy _ group:Feature )? where:WhereClause? _? ")" {
  where = where || {'type': 'constant', value: true};
  return {
    type: 'call',
    func,
    args: [{
      type: 'streamingStatArgs',
      feature,
      group: group ? group[3] : null,
    }, where],
    location: loc()
  };
}

ExprList = first:Expr rest:(_? "," _? Expr)* {
  return [first].concat(rest.map(item => item[3]));
}

SubExpr = "(" _? expr:Expr _? ")" {
  return expr;
}

LazyExpr = Lazy _ expr:Expr {
  return {type: 'priority', priority: 'lazy',  expr: expr, location: loc()};
}

EagerExpr = Eager _ expr:Expr {
  return {type: 'priority', priority: 'eager', expr: expr, location: loc()};
}

WhereClause = _ "WHERE"i _ expr:Expr {
  return expr;
}

MinEventsClause = _ "WITH MIN EVENTS"i _ numEvents:IntLiteral {
  return numEvents;
}

ReasonClause = _ "WITH REASON"i _ string:String {
  return string;
}

SkipWaitClause = _ skipWait:("WITHOUT"i / "WITH"i) _ "WAIT"i {
  return skipWait.toLowerCase() === 'without';
}

LastMsClause = _ "LAST"i _ lastMs:DurationMsExpr {
  return lastMs;
}

BeforeActionClause = _ "BEFORE ACTION"i {
  return true;
}

TimespanSecondsExpr = timespan:(
  "SECONDS"i / "SECOND"i /
  "MINUTES"i / "MINUTE"i /
  "HOURS"i / "HOUR"i /
  "DAYS"i / "DAY"i /
  "WEEKS"i / "WEEK"i /
  "MONTHS"i / "MONTH"i
) {
  return {
    second: 1,
    seconds: 1,
    minute: 60,
    minutes: 60,
    hour: 60 * 60,
    hours: 60 * 60,
    day: 60 * 60 * 24,
    days: 60 * 60 * 24,
    week: 60 * 60 * 24 * 7,
    weeks: 60 * 60 * 24 * 7,
    month: 60 * 60 * 24 * 30,
    months: 60 * 60 * 24 * 30,
  }[timespan.toLowerCase()];
}

DurationMsExpr = quantity:(IntLiteral _)? timespanSeconds:TimespanSecondsExpr {
  quantity = quantity ? quantity[0] : 1;
  return quantity * timespanSeconds * 1000;
}

DataObjectExpr = EmptyDataObjectExpr / NonEmptyDataObjectExpr;

EmptyDataObjectExpr = "{" _? "}" {
  return {
    type: 'constant',
    value: {},
    location: loc()
  };
}

NonEmptyDataObjectExpr = "{" _? firstPair:DataObjectPair restExprs:(_? "," _? DataObjectPair)* _? ","? _? "}" {
  const args = firstPair.concat(...restExprs.map(e => e[3]));

  if (args.every(arg => arg.type === 'constant')) {
    const value = {};
    for (let i = 0; i < args.length; i+=2) {
      value[args[i].value] = args[i + 1].value;
    }

    return {
      value,
      type: 'constant',
      location: loc()
    };
  }

  return {
    args,
    type: 'call',
    func: 'dataObject',
    location: loc()
  };
}

DataObjectPair
  = key:ConstantString _? ":" _? val:Expr {
    return [key, val];
  }
  / feature:Feature {
    return [
      {type: 'constant', value: feature, location: loc()},
      {type: 'feature', value: feature, location: loc()},
    ]
  }

ListExpr = EmptyListExpr / ListComprehensionExpr / NonEmptyListExpr;

ListComprehensionExpr = "[" _? output:Expr _ "FOR"i _ feature:FeatureExpr _ "IN"i _ input:Expr where:WhereClause? _? "]" {
  where = where || {'type': 'constant', value: true};
  const iterator = feature.value;
  const replaceIterator = (ast: Ast): Ast => {
    if (ast.type === 'feature' && ast.value === iterator) {
      return {
        type: 'iterator',
        name: iterator,
        location: ast.location,
      };
    } else if (ast.type === 'aliasFeature') {
      if (ast.value === iterator) {
        throw buildSqrlError(ast, 'Expression is not valid during a list comprehension');
      }
    }
    return ast;
  };

  return {
    type: 'listComprehension',
    output: mapAst(output, replaceIterator),
    input: input,
    iterator: {
      type: 'iterator',
      name: iterator,
      location: feature.location,
    },
    where: mapAst(where, replaceIterator),
    location: loc()
  };

}

EmptyListExpr = "[" _? "]" {
  return {
    type: 'list',
    exprs: [],
    location: loc()
  };
}

NonEmptyListExpr = "[" _? firstExpr:Expr restExprs:(_? "," _? Expr)* _? ","? _? "]" {
  return {
    type: 'list',
    exprs: [firstExpr].concat(restExprs.map(e => e[3])),
    location: loc()
  };
}

Expr = BooleanExpr

BooleanExpr = BinaryBooleanExpr / UnaryBooleanExpr / BooleanTerm
BinaryBooleanExpr = left:UnaryBooleanExpr _ op:("AND"i / "OR"i) _ right:BooleanExpr {
  return {type: 'boolean_expr', left: left, operator: op.toLowerCase(), right:right, location: loc()};
}

UnaryBooleanExpr = NotBooleanTerm / BooleanTerm
NotBooleanTerm = "NOT"i _ expr:UnaryBooleanExpr {
  return {type: 'not', expr: expr, location: loc()};
}

BooleanTerm = BinaryLogicalExpr / IsNullLogicalExpr / LogicalTerm

IsNullLogicalExpr = left:LogicalTerm _? op:("IS NOT"i / "IS"i) _? right:NullExpr {
  return {type: 'binary_expr', left: left, operator: op.toLowerCase(), right: right, location: loc()};
}

BinaryLogicalExpr = left:LogicalTerm _? op:("=" / "!=" / ">=" / "<=" / ">" / "<" / "CONTAINS"i / "IN"i) _? right:LogicalTerm {
  return {type: 'binary_expr', left: left, operator: op.toLowerCase(), right: right, location: loc()};
}

LogicalTerm = BinaryArithmeticExpr / ArithmeticTerm

ArithmeticExpr = BinaryArithmeticExpr / ArithmeticTerm
BinaryArithmeticExpr = left:ArithmeticTerm _? op:("+" / "-") _? right:ArithmeticExpr {
  return {type: 'binary_expr', left: left, operator: op.toLowerCase(), right: right, location: loc()};
}
ArithmeticTerm = HighArithmeticExpr

HighArithmeticExpr = BinaryHighArithmeticExpr / HighArithmeticTerm
BinaryHighArithmeticExpr = left:HighArithmeticTerm _? op:("*" / "/" / "%") _? right:HighArithmeticExpr {
  return {type: 'binary_expr', left: left, operator: op.toLowerCase(), right: right, location: loc()};
}
HighArithmeticTerm = EagerExpr / LazyExpr / CallExpr / DataObjectExpr / ListExpr / SubExpr / Literal / FeatureExpr

FeatureExpr = value:Feature {
  return {type: 'feature', value: value, location: loc()};
}

AliasFeature = value:Feature alias:(_ "AS"i _ alias:Feature)? {
  return {
    type: 'aliasFeature',
    value,
    alias: alias ? alias[3] : value,
    location: loc()
  };
}

AliasFeatureList = first:AliasFeature rest:(_? "," _? AliasFeature)* {
  return [first].concat(rest.map(item => item[3]));
}

FeatureList = first:Feature rest:(_? "," _? Feature)* {
  return [first].concat(rest.map(item => item[3]));
}

Feature "feature name" = Symbol ("." Symbol)* {
  return text();
}

Symbol = [A-Za-z0-9_]+ {
  return text();
}

GroupBy = ("GROUP"i _ )? "BY"i {}

Func "function name" = [A-Za-z0-9_]+ {
  return text();
}
CountFunc "function name" = "count"
CountPreviousFunc "function name" = "countPrevious"
CountUniqueFunc "function name" = "countUnique"
RateLimitFunc "function name" = ("rateLimitedValues" / "rateLimited" / "rateLimit" / "sessionize")
PercentileFunc "function name" = ("percentileCheck" / "percentileValue")
PercentileForFunc "function name" = ("percentileFor")
StreamingStatsFunc "function name" = ("stats" / "kurtosis" / "skew" / "size" / "mean" / "variance" / "std")
SumFunc "function name" = "sum"
TrendingFunc "function name" = "trending"


Literal = value:(Number / String / True / False / Null) {
  return {type: 'constant', value: value, location: loc()};
}

ConstantString = value:String {
  return {type: 'constant', value: value, location: loc()};
}

NullExpr = "NULL"i {
  return {type: 'constant', value: null, location: loc()};
}

Eager "eager" = "EAGER"i
Lazy "lazy" = "LAZY"i

Null "null" = "null" {
  return null;
}

True "true" = "true" {
  return true;
}

False "false" = "false" {
  return false;
}

Number "literal number" = FloatLiteral / IntLiteral

IntLiteral = ZeroLiteral / [-]?[1-9][0-9]* {
  return parseInt(text(), 10);
}

ZeroLiteral = "0" {
  return 0;
}

// Not sure if we want to allow -0.0; but this does.
FloatLiteral = [-]?([0-9]+)? "." [0-9]+ {
  return parseFloat(text());
}

String = first:QuoteString rest:(_ QuoteString)* {
  return first.concat(...rest.map(item => item[1]));
}


FinalWhitespace = _? UnterminatedComment?

_ "whitespace" = (Whitespace / Comment)+

Whitespace = [ \t\n\r]
Comment = UnterminatedComment ([\n]+)
UnterminatedComment = ("#" / "--") ([^\n])*

QuoteString "string" = SingleQuoteString / DoubleQuoteString
SingleQuoteString = "'" chars:SingleQuoteStringChar* "'" { return chars.join(""); }
DoubleQuoteString = '"' chars:DoubleQuoteStringChar* '"' { return chars.join(""); }

SingleQuoteStringChar
  = SingleQuoteStringCharUnescaped
  / StringEscapedChar;
DoubleQuoteStringChar
  = DoubleQuoteStringCharUnescaped
  / StringEscapedChar;

StringEscapedChar
  = StringCharEscape
    sequence:(
        '"'
      / "'"
      / "\\"
      / "/"
      / "b" { return "\b"; }
      / "f" { return "\f"; }
      / "n" { return "\n"; }
      / "r" { return "\r"; }
      / "t" { return "\t"; }
      / "u" digits:$(HexDigit HexDigit HexDigit HexDigit) {
          return String.fromCharCode(parseInt(digits, 16));
        }
    )
{
  return sequence;
}

StringCharEscape = "\\"
DoubleQuoteStringCharUnescaped = [^\0-\x1F\x22\x5C]
SingleQuoteStringCharUnescaped = [^\0-\x1F\x27\x5C]
HexDigit = [0-9a-f]i

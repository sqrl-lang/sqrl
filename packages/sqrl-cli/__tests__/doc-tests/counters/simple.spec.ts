/**
 * Copyright 2019 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { runCli } from "../../helpers/runCli";
import { VirtualFilesystem } from "sqrl";
import stripAnsi from "strip-ansi";

test("works", async () => {
  const filesystem = new VirtualFilesystem({
    "samples.sqrl": `
LET SqrlClock := '2019-03-01T01:02:03.456Z';

LET Ip := input();
LET User := input();
LET Text := input();
LET NumMessagesBasic := count(BY User LAST WEEK);

LET NumMessages := count(BY User LAST HOUR);
LET NumIpMessages := count(BY User, Ip LAST HOUR);
LET PercentMessagesByIp := 100 * (NumIpMessages / NumMessages);

LET TextWithStrongProfanity := regexMatch('\\b(shit)\\b', Text);
LET NumMessagesWithProfanity := count(BY User WHERE TextWithStrongProfanity LAST WEEK);
LET NumMessagesWithoutProfanity := count(BY User WHERE NOT TextWithStrongProfanity LAST WEEK); 

LET ActorAgeDays := dateDiff('DAY', '2019-03-01');
LET IsYoungActor := ActorAgeDays < 10;
LET NumMessagesByYoungActorsOnIp := count(BY Ip WHERE IsYoungActor);

# Keep track of total and percentage so we can use in reason string.
LET TotalMessages := NumMessagesWithProfanity + NumMessagesWithoutProfanity;
LET PercentProfaneMessages := NumMessagesWithProfanity / TotalMessages;
CREATE RULE HighPercentageProfanity
    WHERE PercentProfaneMessages > 0.5 AND TotalMessages > 2;
    
WHEN HighPercentageProfanity THEN blockAction(), addLabel(User, "bad_user");

LET Target := input();
LET NumReceivedWithProfanity := count(BY Target WHERE TextWithStrongProfanity LAST WEEK);
LET NumReceivedWithoutProfanity := count(BY Target WHERE NOT TextWithStrongProfanity LAST WEEK);

# Keep track of total and percentage so we can use in reason string.
LET TotalReceived := NumReceivedWithProfanity + NumReceivedWithoutProfanity;
LET PercentProfaneReceived := NumReceivedWithProfanity / TotalReceived;
CREATE RULE HighPercentageProfanityReceived
    WHERE PercentProfaneReceived > 0.5 AND TotalReceived > 2;
    
WHEN HighPercentageProfanityReceived THEN
    blockAction(),
    addLabel(Target, "harassment_recipient");
    `,
  });
  const stdout = await runCli(
    [
      "run",
      "samples.sqrl",
      "-s",
      "Ip=1.2.3.4",
      "-s",
      "User=josh",
      "-s",
      "Target=greg",
      "-s",
      "Text=poop",
      "HighPercentageProfanityReceived",
    ],
    "",
    {
      filesystem,
    }
  );

  // Replace is needed because timezones change the date
  expect(stripAnsi(stdout).replace(/[0-9]/g, "x")).toEqual(
    "✓ xxxx-xx-xx xx:xx action was allowed.\n" +
      "HighPercentageProfanityReceived=false\n"
  );
});

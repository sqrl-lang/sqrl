import { sqrlTest } from "../helpers/sqrlTest";

sqrlTest(
  "handles null correctly",
  `
LET T := true;
LET F := false;
LET N := null;


ASSERT repr(T) = "true";
ASSERT repr(F) = "false";
ASSERT repr(N) = "null";
ASSERT repr(T AND T) = "true";
ASSERT repr(T AND F) = "false";
ASSERT repr(T AND F AND N) = "false";
ASSERT repr(T OR T) = "true";
ASSERT repr(T OR F) = "true";
ASSERT repr(F OR T) = "true";
ASSERT repr(F OR F OR F) = "false";
ASSERT repr(NOT T) = "false";
ASSERT repr(NOT F) = "true";

ASSERT repr(NOT N) = "null";
ASSERT repr(T AND N) = "false";
ASSERT repr(F OR N) = "false";
`
);

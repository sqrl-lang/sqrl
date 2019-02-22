/**
 * Copyright 2018 Twitter, Inc.
 * Licensed under the Apache License, Version 2.0
 * http://www.apache.org/licenses/LICENSE-2.0
 */
import { sqrlTest } from "../helpers/sqrlTest";

sqrlTest(
  "works",
  `
  LET Six := 6;
  LET Seven := 7;
  LET Zero := 0;
  LET EmptyList := [];
  LET Key := "key";
  LET AffiliateUrls := ["amazon.com?tag=1234"];
  LET StringArray := ["Hello"];
  LET DupedStringList := ["a", "b", "a", "c"];
  LET IntList := [1, 2, 3];
  LET StringSix := "6.5";
  LET Hello := "Hello";
  LET NullFeature := null;

  LET DataBlob := {
    "0": "a",
    "array": [1, 2],
    "key": 0,
    "nested": {
      "key": 1
    },
    "key_2": 2,
    "null": null,
  };
  LET Complex := {
    "a-b": [
      {
        'c."': {
          "'": "OKAY!"
        }
      }
    ]
  };

  
  ASSERT dedupe(DupedStringList) = ["a", "b", "c"];
  ASSERT keys(DataBlob) = ["0", "array", "key", "nested", "key_2", "null"];
  ASSERT keys(StringSix) = null;
  ASSERT hasAttr(NullFeature, "key") = null;
  ASSERT attr(NullFeature, "key") = null;
  ASSERT attr(DataBlob, NullFeature) = null;
  ASSERT hasAttr(DataBlob, NullFeature) = null;
  ASSERT attr(DataBlob, "key") = 0;
  ASSERT hasAttr(DataBlob, "missing") = false;
  ASSERT hasAttr(DataBlob, "key") = true;
  ASSERT attr(DataBlob, Key) = 0;
  ASSERT hasAttr(DataBlob, Key) = true;
  ASSERT attr(DataBlob, node("Ip", "key")) = 0;
  ASSERT jsonValue(DataBlob, "$.key") = 0;
  ASSERT jsonValue(DataBlob, "$.key_2") = 2;
  ASSERT jsonValue(DataBlob, "$.nested.key") = 1;
  ASSERT jsonValue(DataBlob, "$.nested.missing") = null;
  ASSERT jsonValue(DataBlob, "$.null") = null;
  ASSERT jsonValue(DataBlob, "$.missing") = null;
  ASSERT jsonValue(DataBlob, "$.array") = [1, 2];
  ASSERT jsonValue(DataBlob, "$.array[0]") = 1;
  ASSERT jsonValue(DataBlob, "$.array[1]") = 2;
  ASSERT jsonValue(DataBlob, \"$['array']\") = [1, 2];
  ASSERT jsonValue(DataBlob, "$[\\"array\\"]") = [1, 2];
  ASSERT jsonValue(DataBlob, "$[0]") = "a";
  
  ASSERT jsonValue(Complex, "$['a-b'][0]['c.\\\\\\"']['\\\\'']") = "OKAY!";
  ASSERT bool(0) = false;
  ASSERT bool([1]) = true;
  ASSERT bool([]) = false;
  ASSERT str([]) = "[array]";
  ASSERT str(DataBlob) = "[object]";
  ASSERT str(NullFeature) = null;
  ASSERT NOT EmptyList = true;
  ASSERT NOT [] = true;
  ASSERT NOT 0 = true;
  ASSERT NOT "" = true;
  ASSERT NOT 0.0 = true;
  ASSERT (NOT (NOT (0.0))) = false;
  ASSERT (NOT NOT 0.0) = false;
  ASSERT (NOT "not") = false;
  ASSERT (NOT NOT "not") = true;
  ASSERT (NOT NullFeature) = null;
  ASSERT (NOT NOT NullFeature) = null;
  ASSERT NOT bool([]) = true;
  ASSERT (null IS NULL) = true;
  ASSERT (1 IS NULL) = false;
  ASSERT ((NOT null) IS NULL) = true;
  ASSERT (NullFeature OR false) = false;
  ASSERT (NullFeature OR Six) = true;
  ASSERT (NullFeature IS NULL) = true;
  ASSERT (NullFeature IS NOT NULL) = false;
  ASSERT (Six != NullFeature) is null;
  ASSERT (Hello IS NULL) = false;
  ASSERT (Hello IS NOT NULL) = true;
  ASSERT length(StringSix) = 3;
  ASSERT 0 - 0.005 = -0.005;
  ASSERT 100 * -0.05 = -5;
  ASSERT hasDigit(StringSix) = true;
  ASSERT hasDigit(Hello) = false;
  ASSERT length(EmptyList) = 0;
  ASSERT length(IntList) = 3;
  ASSERT length(NullFeature) = null;
  ASSERT length(Six) = null;
  ASSERT log10(100) = 2;
  ASSERT log10(StringSix) = null;
  ASSERT max(5) = 5;
  ASSERT max(StringSix) = null;
  ASSERT max(5, StringSix) = null;
  ASSERT max(5, 5, 10) = 10;
  ASSERT min(5) = 5;
  ASSERT min(StringSix) = null;
  ASSERT min(5, StringSix) = null;
  ASSERT min(5, 5, 10) = 5;
  ASSERT contains(StringSix, 6) = true;
  ASSERT contains(EmptyList, 3) = false;
  ASSERT contains(IntList, 3) = true;
  ASSERT contains(NullFeature, 3) = null;
  ASSERT contains(Six, 3) = null;
  ASSERT split(StringSix, ".") = ["6", "5"];
  ASSERT split(StringSix, "Z") = ["6.5"];
  ASSERT join(StringSix, 6) = null;
  ASSERT join(EmptyList, 3) = null;
  ASSERT join(IntList, '~') = "1~2~3";
  ASSERT join(NullFeature, 3) = null;
  ASSERT join(Six, 3) = null;
  ASSERT charAt(StringSix, 1) = ".";
  ASSERT index(EmptyList, 1) = null;
  ASSERT index(IntList, 1) = 2;
  ASSERT index(NullFeature, 3) = null;
  ASSERT index(Six, 3) = null;
  ASSERT listSum([1,2,3]) = 6;
  ASSERT list(Six, 7, Hello) = [6, 7, "Hello"];
  ASSERT list(Six, 7, NullFeature) = null;
  ASSERT list([]) = [[]];
  ASSERT ([] and true) = false;
  ASSERT (true and ["foo"]) = true;
  ASSERT ([1] and [7]) = true;
  ASSERT bool([] and true) = false;
  ASSERT 5+"h" = null;
  ASSERT []+[] = null; # @TODO: perhaps concat later
  ASSERT first(IntList) = 1;
  ASSERT last(IntList) = 3;
  ASSERT first(EmptyList) = null;
  ASSERT last(EmptyList) = null;
  ASSERT 5 = 5;
  ASSERT 0 = 0;
  ASSERT "0" = "0";
  ASSERT if([], true, false) = false;
  ASSERT if(true, 1, null) = 1;
  ASSERT if(true, null, 5) = null;
  ASSERT if(false, null, 6) = 6;
  ASSERT if(false, 6, null) = null;
  ASSERT if([1], true, false) = true;
  ASSERT escapeURI(":/?") = "%3A%2F%3F";
  ASSERT (null = null) IS null;
  ASSERT (NullFeature = null) IS null;
  ASSERT (NullFeature = NullFeature) IS null;
  ASSERT Six = 6;
  ASSERT 5 + Six = 11;
  ASSERT 5 + 0 = 5;
  ASSERT 5 + Zero = 5;
  ASSERT 1 / 2 = 0.5;
  ASSERT null / 5 = null;
  ASSERT null % 5 = null;
  ASSERT 5 % 2 = 1;
  ASSERT -5 = -5;
  ASSERT 100 * -.5 = -50;
  ASSERT 2 * -1 = -2;
  ASSERT 2 * -0.5 = -1;
  ASSERT -10*-0.1 = 1;
  ASSERT (not not EmptyList) = false;
  ASSERT cmpL(null, 1) is null;
  ASSERT (null=NullFeature) is null;
  ASSERT (6=null) is null;
  ASSERT (5>4) = true;
  ASSERT (5>Six) = false;
  ASSERT (Six>Six) = false;
  ASSERT (Six>=Six) = true;
  ASSERT (Six=Six) = true;
  ASSERT (Six=NullFeature) is null;
  ASSERT (Six=Seven) = false;
  ASSERT (Six>=Seven) = false;
  ASSERT (Seven>=Six) = true;
  ASSERT (Seven>=6) = true;
  ASSERT (Six+1>=7) = true;
  ASSERT (Six+0>=7) = false;
  ASSERT (Six+0>=7-1) = true;
  
  ASSERT max(5, 7) = 7;
  ASSERT max(7, 5) = 7;
  ASSERT max() is null;
  ASSERT min(7, null, 3) = 3;
  ASSERT min(7, null, null) = 7;
  ASSERT min(null, null, null) is null;
  
  ASSERT sha256(join([Six, Seven, "hello joe"], "")) = 'b42a77e208707718d939c3529dbfb5c9cfbf57f52551a72a352cbd64c74111b4';
  
`
);

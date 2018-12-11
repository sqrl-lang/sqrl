Wikipedia SQRL Example
======================

To stream live data from wikipedia and run it against the SQRL files here, simply run:
$ ./stream

If you want to batch process days worth of data from a file, and only highlight bad entries
cat wiki-data | ../../sqrl -- run ./main.sqrl --stream=EventData --only-blocked

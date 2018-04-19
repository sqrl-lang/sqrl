
To fetch articles in realtime and scan them:
./stream-updates/main.js en.wikipedia.org | ../../sqrl -- run ./main.sqrl --stream=EventData

To batch process a days worth from a file, only highlighting the bad ones
cat wiki-data | ../../sqrl -- run ./main.sqrl --stream=EventData --only-blocked

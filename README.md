# Examples

## Exporter

Creates a file with the results of a specified query

```bash
./bin/export -q ../query.json -t "mv {file_name}" -d myoutput.txt
```

## Importer

Imports a file to elasticsearch

```bash
./bin/import -f file_listing.txt
```

Where `file_listing.txt` is the output of one of these things:

```bash

use: find -type f

maybe -exec (some utility)

find . -type f -ls

find . -type f -exec ls -lpT {} \;


find / -newerct '1 minute ago' -print
             Print out a list of all the files whose inode change time is more recent than the current time minus one minute.
```
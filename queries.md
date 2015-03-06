# Search by type, size, and date

* extension : _mp4_
* size greater than: _23495524_ bytes
* date modified before: _2013-01-01_

```
GET directory/file/_search
{
  "query": {
    "filtered": {
      "filter": {
        "and": {
          "filters": [
            {
              "term" : {
                "file_extension" : "mp4"
              }
            },
            {
              "range" : {
                "size" : {
                  "gt" : 23495524
                }
              }
            },
            {
              "range" : {
                "date_modified": {
                  "lt" : "2014-01-01"
                }
              }
            }
          ]
        }
      }
    }
  }
}
```

# Search for files starting with

* file names starting with: _977_

```
GET directory/file/_search
{
  "query": {
    "match" : {
      "file_name.partial_file_name" : "977"
    }
  }
}
```

# Search for files string with foo under directory bar

```
GET /directory/file/_search
{
  "query": {
    "filtered": {
      "query": {
        "match": {
          "file_name.partial_file_name": "mcm"
        }
      },
      "filter": {
        "term": {
          "path.tree": "/Users/mklaber"
        }
      }
    }
  }
}
```


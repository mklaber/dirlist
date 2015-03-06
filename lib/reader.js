
var client = require('elasticsearch').Client({
      log : ['error']
    }),
    colors = require('colors'),
    LineByLineReader = require('line-by-line'),
    path = require('path'),
    _ = require('lodash');

// http://www.elasticsearch.org/guide/en/elasticsearch/guide/current/denormalization-concurrency.html

var MAX_BULK_SIZE = 10000;

var regex = /^([^ ]+)\s+(\d+)\s+([^ ]+)\s+([^ ]+)\s+(\d+)\s+([A-Za-z]+\s+\d+\s+\d\d:\d\d:\d\d\s+\d{4})\s+(.+)$/;
var lineToObject = function(s) {
  // 0 - prefix
  // 1 - number of links
  // 2 - user
  // 3 - group
  // 4 - size
  // 5 - date
  // 6 - path
  var m = regex.exec(s);

  var filePath = (m[7] || '').replace(/\/\//g, '/');
  if (filePath.indexOf('//') > -1) {
    console.error('original: %s', m[7]);
    console.error('replaced: %s', filePath);
    throw new Error();
  }
  var dirName = path.dirname(filePath);
  var fileName = path.basename(filePath);
  var fileExt = path.extname(filePath);
  var dateMod = new Date(Date.parse(('' || m[6]).replace(/\s{2,}/g, ' ')) || 0);
  return {
    path : dirName,
    file_name : fileName,
    file_extension : fileExt,
    date_modified : dateMod,
    attributes : m[1],
    size : parseInt(m[5]),
    user : m[3],
    group : m[4],
    line : s,
    path_uid : (new Buffer(filePath)).toString('base64')
  };
};

var duplicate_count = 0;

var duplicates = {};

var upload = function(lines) {
  var cmds = [];
  lines.forEach(function(l) {
    cmds.push({ index : { _index : 'directory', _type : 'file' }});
    cmds.push(l);
  });
  return client.bulk({
    body : cmds
  }).then(function(r) {
    if (r.errors) {
      console.error(JSON.stringify(r.errors, null, 2).red);
    }

    if(_.any(r.items, function(i) { return i.index._version > 1; })) {
      console.log('some have newer versions'.yellow);
      _.filter(r.items, function(i) {
        return i.index._version > 1;
      }).forEach(function(d) {
        duplicate_count++;
        //console.log(d.index._id.red);
        duplicates[d.index._id] = (duplicates[d.index._id] || 0) + 1;
        //console.log(duplicates[d.index._id]);
      });
      //console.log(JSON.stringify(_.filter(r.items, function(i) {
      //  return i.index._version > 1;
      //}), null, 2).yellow);
      //process.exit(1);
    }

  });
}

var allDone = function(totalLines) {
  console.log("Finished processing %s lines (%s duplicates)".green, totalLines, duplicate_count);
  if (duplicates.length > 0 || true) {
    console.log(JSON.stringify(duplicates, null, 2).yellow);
  }
  process.exit(0);
}

var Reader = {
  readFile : function(file) {
    console.log("reading this file %s".green, file);

    var lr = new LineByLineReader(file),
        lineCount = 0,
        buffer = [];

    lr.on('error', function(err) {
      console.error('Failure'.red);
      console.error(err);
    });

    lr.on('line', function(s) {
      lineCount++;
      buffer.push(lineToObject(s));
      //console.log(JSON.stringify(lineToObject(s), null, 2));
      if (lineCount % MAX_BULK_SIZE === 0) {
        lr.pause();
        console.log('About to bulk %s lines'.green, buffer.length);
        upload(buffer).then(function(r) {
          buffer = [];
          lr.resume();
        });
        //setTimeout(function() {
        //  console.log('start again'.yellow);
        //  lr.resume();
        //
        //}, 1000);
      }

    });

    lr.on('end', function() {
      if (buffer.length) {
        console.log('About to bulk the remaining %s lines'.green, buffer.length);
        upload(buffer).then(function(r) {
          allDone(lineCount);
        });
      } else {
        allDone(lineCount);
      }

    });

    //return fs.readFileAsync(file, 'utf8').then(function(data) {
    //  console.log(data);
    //
    //}).error(function (e) {
    //  console.error("unable to read file, because: ", e.message);
    //});


  }
}

module.exports = Reader;
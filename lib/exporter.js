var client = require('elasticsearch').Client({
      log : ['error']
    }),
    colors = require('colors'),
    Promise = require('bluebird'),
    fs = Promise.promisifyAll(require('fs'));

function escapeRegExp(str) {
  return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
}

var Exporter = {
  exportQueryResults : function(q, fields, template, destination) {
    var allResults = [];

    var getMoreUntilDone = function(response) {
      response.hits.hits.forEach(function(hit) {
        var s = template;
        fields.forEach(function(f) {
          var reg = new RegExp('{' + escapeRegExp(f) + '}', 'g');
          s = s.replace(reg, hit.fields[f]);
        })

        allResults.push(s);
      });

      if (response.hits.total !== allResults.length) {
        return client.scroll({
          scrollId : response._scroll_id,
          scroll : '30s'
        }).then(getMoreUntilDone);

      } else {
        console.log('All done!'.green);
        //console.log(allResults);

        return allResults;


        //process.exit(0);
      }
    };

    return client.search({
      index : 'directory',
      type : 'file',
      size : 200,
      body : q,
      scroll : '30s',
      fields : fields
    }).then(getMoreUntilDone)
        .then(function(lines) {
          //console.log(lines.join('\n').green);
          console.log('to file: %s'.green, destination.yellow);

          return fs.writeFileAsync(destination, lines.join('\n'));

        });
  }
};

module.exports = Exporter;
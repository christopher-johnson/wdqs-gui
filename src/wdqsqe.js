var $ = require('jquery');
var root = module.exports = require('wdqs-editor');

root.defaults = $.extend(true, root.defaults, {
    persistent: null,
    consumeShareLink: null,
    createShareLink: null,
    sparql: {
        endpoint: "http://wdm-rdf.wmflabs.org/bigdata/sparql",
        showQueryButton: true,
        acceptHeaderGraph: "text/turtle",
        acceptHeaderSelect: "application/sparql-results+json"
    }
});

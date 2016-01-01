"use strict";

var $ =  require('jquery'),
    EventEmitter = require('events').EventEmitter,
    bootstraptags = require('bootstrap-tagsinput'),
    jquerypopover = require('jquery-popover'),
    datatables = require('datatables.net')(),
    datatablesbs = require('datatables.net-bs')();

var WDQSGUI = function(parent, options) {
    EventEmitter.call(this);
    var wdqsgui = this;
    wdqsgui.wrapperElement = $('<div class="wikibase-queryservice"></div>').appendTo($(parent));
    wdqsgui.emit('ready');
    return wdqsgui;
};

WDQSGUI.prototype = new EventEmitter;

module.exports = function(parent, options) {
    return new WDQSGUI(parent, options);
};

module.exports.$ = $;

var Vis = require('vis');
require('bootstrap');

require('./wdqs.js')($, Vis);
var Explorer = require('./wdqs-explorer.js');
require('./wikibase/codemirror/addon/hint/wikibaseSparqlHint.js');
require('./wikibase/codemirror/addon/hint/wikibaseRdfHint.js');
var Mod = require('codemirror');
var Tooltip = require('./wikibase/codemirror/addon/tooltip/wikibaseRDFTooltip.js');
var Editor = require('./wikibase/queryService/ui/editor.js');
var QueryExampleDialog = require('./wikibase/queryService/ui/queryExampleDialog.js');
var Sparql = require('./wikibase/queryService/api/sparqlApi.js');
var QuerySamples = require('./wikibase/queryService/api/querySamples.js');
var RdfNamespaces = require('./wikibase/queryService/rdfNamespaces.js');
var App = require('./wikibase/queryService/ui/app.js');


$( document ).ready( function () {
    new App($('.wikibase-queryservice'),Mod, Editor, Sparql, QuerySamples, Tooltip,
        QueryExampleDialog, RdfNamespaces, Vis, Explorer);
} );
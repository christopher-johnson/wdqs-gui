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

require('vis');
require('bootstrap');

require('./wdqs.js');
require('./wdqs-explorer.js');
require('./wikibase/codemirror/addon/hint/WikibaseSparqlHint.js');
require('./wikibase/codemirror/addon/hint/WikibaseRdfHint.js');
var Mod = require('codemirror');
var Tooltip = require('./wikibase/codemirror/addon/tooltip/WikibaseRDFTooltip.js');
var Editor = require('./wikibase/queryService/ui/Editor.js');
var QueryExampleDialog = require('./wikibase/queryService/ui/QueryExampleDialog.js');
var Sparql = require('./wikibase/queryService/api/SparqlApi.js');
var QuerySamples = require('./wikibase/queryService/api/QuerySamples.js');
var RdfNamespaces = require('./wikibase/queryService/RdfNamespaces.js');
var App = require('./wikibase/queryService/ui/App.js');


$( document ).ready( function () {
    new App($('.wikibase-queryservice'),Mod, Editor, Sparql, QuerySamples, Tooltip, QueryExampleDialog, RdfNamespaces);
} );
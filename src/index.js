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
var Explorer = require('./wdqsExplorer.js');
var Mod = require('codemirror');
var Tooltip = require('./codemirror/addon/tooltip/wikibaseRDFTooltip.js');
var Editor = require('./editor.js');
var QueryExampleDialog = require('./queryExampleDialog.js');
var Sparql = require('./api/sparqlApi.js');
var QuerySamples = require('./api/querySamples.js');
var RdfNamespaces = require('./rdfNamespaces.js');
var App = require('./app.js');


$( document ).ready( function () {
    new App($('.wikibase-queryservice'),Mod, Editor, Sparql, QuerySamples, Tooltip,
        QueryExampleDialog, RdfNamespaces, Vis, Explorer);
} );
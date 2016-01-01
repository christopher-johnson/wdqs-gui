"use strict";
module.exports = App;

var SHORTURL = '//tinyurl.com/create.php?url=';
var SHORTURL_API = '//tinyurl.com/api-create.php?url=';
var EXPLORE_URL = 'http://www.wikidata.org/entity/Q';

/**
 * A ui application for the Wikibase query service
 *
 * @class App
 * @licence GNU GPL v2+
 *
 * @author Stanislav Malyshev
 * @author Jonas Kress
 * @constructor
 *
 * @param {jQuery} $element
 * @param {wikibase.queryService.ui.Editor}
 * @param {wikibase.queryService.api.Sparql}
 */
function App( $element, Mod, Editor, SparqlApi, QuerySamples, Tooltip, QueryExampleDialog,
			  RdfNamespaces, Vis, Explorer ) {
	this._$element = $element;
	this._queryExampleDialog = QueryExampleDialog;
	this._RdfNamespaces = RdfNamespaces;
	this._Vis = Vis;
	this._Explorer = Explorer;
	this._init($, SparqlApi, QuerySamples, Editor, Mod, Tooltip);
}

/**
 * @property {string}
 * @private
 **/
App.prototype._$element = null;

/**
 * @property {wikibase.queryService.api.Sparql}
 * @private
 **/
App.prototype._sparqlApi = null;

/**
 * @property {wikibase.queryService.api.QuerySamplesApi}
 * @private
 **/
App.prototype._querySamplesApi = null;

/**
 * @property {wikibase.queryService.ui.Editor}
 * @type wikibase.queryService.ui.Editor
 * @private
 **/
App.prototype._editor = null;

/**
 * Initialize private members and call delegate to specific init methods
 * @private
 **/
App.prototype._init = function($, SparqlApi, QuerySamples, Editor, Mod, Tooltip) {

	if( !this._sparqlApi ){
		this._sparqlApi = new SparqlApi($);
	}

	if( !this._querySamples ){
		this._querySamples = new QuerySamples($);
	}

	if( !this._editor ){
		this._editor = new Editor($, Mod, Tooltip);
	}

	this._initEditor();
	this._initExamples();
	this._initDataUpdated();
	this._initQuery();
	this._initRdfNamespaces();
	this._initHandlers();

};

/**
 * @private
 **/
App.prototype._initEditor = function() {
	var element = this._$element.find( '.queryEditor' )[0];
	this._editor.fromTextArea( element );
	this._editor.addKeyMap( 'Ctrl-Enter',  $.proxy( this._handleQuerySubmit, this ) );
};

/**
 * @private
 **/
App.prototype._initExamples = function() {
	var self = this;
	var prefixes = this._RdfNamespaces.STANDARD_PREFIXES.join( '\n' );
	this._callback = function( query ){
		if ( !query || !query.trim() ) {
			return;
		}

		self._editor.setValue( query );
		self._editor.prepandValue( prefixes + '\n\n' );
	};
	new this._queryExampleDialog( $, $( '#QueryExamples' ), this._querySamples, this._callback );
};

/**
 * @private
 */
App.prototype._initRdfNamespaces = function() {
	var category, select, ns, container = $( '.namespace-shortcuts' ),
		namespaces = this._RdfNamespaces.NAMESPACE_SHORTCUTS;

	container.click( function( e ) {
		e.stopPropagation();
	} );

	// add namespaces to dropdowns
	for ( category in namespaces ) {
		select = $( '<select>' )
			.attr( 'class', 'form-control' )
			.append( $( '<option>' ).text( category ) )
			.appendTo( container );
		for ( ns in namespaces[category] ) {
			select.append( $( '<option>' ).text( ns ).attr( {
				value: namespaces[category][ns]
			} ) );
		}
	}
};

/**
 * @private
 **/
App.prototype._initQuery = function() {
	if ( window.location.hash !== '' ) {
		this._editor.setValue( decodeURIComponent( window.location.hash.substr( 1 ) ) );
		this._editor.refresh();
	}
};



/**
 * @private
 **/
App.prototype._initDataUpdated = function() {
	this._sparqlApi.queryDataUpdatedTime().done( function( time ){
		$( '#dbUpdated' ).text( time );
	} ).fail(function(){
		$( '#dbUpdated' ).text( '[unable to connect]' );
	});
};


/**
 * @private
 **/
App.prototype._initHandlers = function() {
	var self = this;

	$( '#query-form' ).submit(  $.proxy( this._handleQuerySubmit, this ) );
	$( '.namespace-shortcuts' ).on( 'change', 'select', $.proxy( this._handleNamespaceSelected, this ) );

	$( '.addPrefixes' ).click( function() {
		var prefixes = self._RdfNamespaces.STANDARD_PREFIXES.join( '\n' );
		self._editor.prepandValue( prefixes + '\n\n' );
	} );

	$( '#clear-button' ).click( function () {
		self._editor.setValue( '' );
	} );

	$( '.explorer-close' ).click( function( e ){
		e.preventDefault();
		$( '.explorer-panel' ).hide();
	} );

	$( window ).on( 'popstate', $.proxy( this._initQuery(), this ) );

	$('body').on('click', function (e) {
		if ($(e.target).data('toggle') !== 'popover'
			&& $(e.target).parents('.popover.in').length === 0) {
			$('[data-toggle="popover"]').popover('hide');
		}
	});

	this._initHandlersDownloads();
};

/**
 * @private
 **/
App.prototype._initHandlersDownloads = function() {
	var download = require('./download.js');
	var api = this._sparqlApi;
	var DOWNLOAD_FORMATS = {
			'CSV': {
				handler: $.proxy( api.getResultAsCsv, api ),
				mimetype: 'text/csv;charset=utf-8'
			},
			'JSON': {
				handler: $.proxy( api.getResultAsJson, api ),
				mimetype: 'application/json;charset=utf-8'
			},
			'TSV': {
				handler: $.proxy( api.getSparqlTsv, api ),
				mimetype: 'text/tab-separated-values;charset=utf-8'
			},
			'Simple TSV': {
				handler: $.proxy( api.getSimpleTsv, api ),
				mimetype: 'text/tab-separated-values;charset=utf-8',
				ext: 'tsv'
			},
			'Full JSON': {
				handler: $.proxy( api.getResultAsAllJson, api ),
				mimetype: 'application/json;charset=utf-8',
				ext: 'json'
			}
		};

	var downloadHandler = function( filename, handler, mimetype ) {

		return function ( e ) {
			e.preventDefault();

			if ( api.getResultLength() === null ) {
				return '';
			}

			new download(handler(), filename, mimetype);
		};
	};

	for ( var format in DOWNLOAD_FORMATS ) {
		var extension = DOWNLOAD_FORMATS[format].ext || format.toLowerCase();
		var formatName = format.replace( /\s/g, '-' );
		$( '#download' + formatName ).click(
				downloadHandler( 'query.' + extension,	DOWNLOAD_FORMATS[format].handler,
						DOWNLOAD_FORMATS[format].mimetype )
		 );
	}
};

/**
 * @private
 **/
App.prototype._handleQuerySubmit = function( e ) {
	var self = this;

	e.preventDefault();
	this._editor.save();

	var hash = encodeURIComponent( this._editor.getValue() );
	if ( window.location.hash !== hash ) {
		window.location.hash = hash;
	}
	$( '#shorturl' ).attr( 'href', SHORTURL + encodeURIComponent( window.location ) );

	$( '#shorturl' ).click( function(){

		$( '#shorturl' ).popover({
			placement : 'left',
			'html':true,
			'content':function(){
				return '<iframe class="shortUrl" src="' + SHORTURL_API + encodeURIComponent( window.location )  +   '">';
			}
		});
		$( '#shorturl' ).popover('show');
		return false;
	} );

	$( '#query-result' ).empty( '' );
	$( '#query-result' ).hide();
	$( '#total' ).hide();
	$( '.actionMessage' ).show();
	$( '.actionMessage' ).text( 'Running query...' );

	if ( $.fn.dataTable.isDataTable( '#data-table' ) ) {
		$('#data-table').DataTable().destroy();
		$('#data-table').empty();
	}

	var query = $( '#query-form' ).serialize();
	this._sparqlApi.query(query)
	.done( $.proxy( this._handleQueryResult, this ) )
	.fail(function(){
		$( '.actionMessage' ).hide();
		$( '#query-error' ).html( $( '<pre>' ).text( self._sparqlApi.getErrorMessage() ) ).show();
		self._editor.highlightError( self._sparqlApi.getErrorMessage() );
	} );

	$( '.queryUri' ).attr( 'href',self._sparqlApi.getQueryUri() );
};

/**
 * @private
 */
App.prototype._getDTOptions = function() {
	var options = {};
	options = {
		"pageLength": 50,
		"lengthMenu": [[10, 25, 50, -1], [10, 25, 50, "All"]],
		"pagingType": "simple_numbers",
		"aaSorting": []
	};
	return options;
};

/**
 * @private
 */
App.prototype._drawDataTable = function () {
	var table = this._sparqlApi.getDataTable();
	var options = this._getDTOptions();
	var config = $.extend({}, table, options);
	if (config.data) {
		$('#data-table').DataTable(config);
	}
};

/**
 * @private
 */
App.prototype._handleQueryResult = function() {

	var api = this._sparqlApi;
	$( '#total-results' ).text( api.getResultLength() );
	$( '#query-time' ).text( api.getExecutionTime() );
	$( '#total' ).show();
	var table = api.getDataTable();
	var options = this._getDTOptions();
	var config = $.extend({}, table, options);
	if (!config.data) {
		return;
	} else {
		$('#data-table').DataTable(config);
	}
	$( '.actionMessage' ).hide();
	$( '#query-error' ).hide();

	var linkableItems = $( '#data-table' ).find('a').filter( function() {
		return this.href.match( EXPLORE_URL + '(.+)' );
	} );

	var exploreLink = $( '<a href="#" title="Explore item" class="glyphicon glyphicon-search" aria-hidden="true"></a>' );
	exploreLink.click( $.proxy( this._handleExploreItem, this ) );
	linkableItems.after( exploreLink );
};

/**
 * @private
 */
App.prototype._handleNamespaceSelected = function( e ) {
	var ns, uri = e.target.value, current = this._editor.getValue();

	if ( current.indexOf( '<' + uri + '>' ) === -1 ) {
		ns = $( e.target ).find(':selected').text();
		this._editor.setValue('PREFIX ' + ns + ': <' + uri + '>\n' + current);
	}

	// reselect group label
	e.target.selectedIndex = 0;
};

/**
 * @private
 */
App.prototype._handleExploreItem = function( e ) {
	var id, url = $(e.target).prev().attr( 'href' ) || '', match;

	match = url.match( EXPLORE_URL + '(.+)' );
	if ( !match ) {
		return;
	}

	$( '.explorer' ).empty( '' );
	$( '.explorer-panel' ).show();

	id = match[1];
	this._Vis.config = { get: function () {
		return 'Q'+id;
	} };
	new this._Explorer( $, this._Vis, $( '.explorer' ), this._Vis.config.get('wgWikibaseItemId') );
	return false;
};



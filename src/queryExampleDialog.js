module.exports =  QueryExampleDialog;

"use strict";

/**
 * A ui dialog for selecting a query example
 *
 * @class wikibase.queryService.ui.App
 * @licence GNU GPL v2+
 *
 * @author Jonas Kress
 * @constructor
 *
 * @param {jQuery} $element
 */
function QueryExampleDialog( $, $element, QuerySamples, callback ) {
	this._$element = $element;
	this._querySamplesApi = QuerySamples;
	this._callback = callback;

	this._init();
}

/**
 * @private
 **/
QueryExampleDialog.prototype._querySamplesApi = null;

/**
 * @property {function}
 * @private
 **/
QueryExampleDialog.prototype._callback = null;

/**
 * @property {function}
 * @private
 **/
QueryExampleDialog.prototype._examples = null;

/**
 * Initialize private members and call delegate to specific init methods
 * @private
 **/
QueryExampleDialog.prototype._init = function() {
	var self = this;
	this._initFilter();
	this._initExamples();
};

/**
 * @private
 **/
QueryExampleDialog.prototype._initFilter = function() {
	var self = this;

	this._$element.find( '.tableFilter' ).keyup( $.proxy( this._filterTable, this ));

	//tags
	this._$element.find( '.tagFilter' ).tagsinput({
		afterAddingTag: $.proxy( this._filterTable, this ),
		afterDeletingTag: $.proxy( this._filterTable, this )
	});

};

/**
 * @private
 **/
QueryExampleDialog.prototype._initExamples = function() {
	var self = this;

	this._querySamplesApi.getExamples().done( function( examples ){
		self._examples = examples;
		self._initTagCloud();

		$.each( examples, function( key, example ) {
			self._addExample( example.title, example.query, example.href, example.tags );
		});

	} );
};

/**
 * @private
 **/
QueryExampleDialog.prototype._initTagCloud = function() {
	var self = this;

	this._$element.find( '.tagCloudPopover' ).popover({
		placement: 'right',
		trigger: 'click',
		container: 'body',
		title: '<b>Filter by tags</b>',
		content: '<div class="tagCloud" style="height:400px; width:400px;"></div>',
		html: true
	});

	this._$element.find( '.tagCloudPopover' ).click(function () {
		self._drawTagCloud();

	});
};

/**
 * @private
 **/
QueryExampleDialog.prototype._drawTagCloud = function() {
	var self = this;


	var jQCloudTags = [];
	$.each( this._getCloudTags(), function( tag, weight ) {
		jQCloudTags.push( { text: tag, weight: weight,
			link: '#',
			html: {title: weight + " match(es)"} } );
	});

	$(".tagCloud").empty();
	$(".tagCloud").jQCloud(jQCloudTags, {
		afterCloudRender: function( e ){
		$(".tagCloud").find('a').click( function( e ){
			e.preventDefault();
			self._$element.find( '.tagFilter' ).tags().addTag( $(this).text() );
			self._drawTagCloud();
			return false;
		});
	}});

};


/**
 * @private
 **/
QueryExampleDialog.prototype._getCloudTags= function() {
	var self = this;

	//filter tags that don't effect the filter for examples
	var tagsFilter = function( tags ){
		var selectedTags = self._$element.find( '.tagFilter' ).tags().getTags(),
		matches = true;
		if( selectedTags.length === 0 ){
			return true;
		}

		$.each( selectedTags, function (key, selectedTag){
			if( tags.indexOf( selectedTag ) === -1 ){
				matches = false;
			}
		} );

		return matches;
	};

	//filter selected tags from tag cloud
	var tagFilter = function( tag ){
		var selectedTags = self._$element.find( '.tagFilter' ).tags().getTags();
		if( selectedTags.indexOf( tag ) === -1 ){
			return  false;
		}

		return true;
	};

	var tagCloud = {};
	$.each( self._examples, function( key, example ) {

		if( !tagsFilter( example.tags ) ){
			return;
		}

		$.each( example.tags, function( key, tag ) {

			if( tagFilter( tag ) ){
				return;
			}

			if( !tagCloud[tag] ){
				tagCloud[tag] = 1;
			}else{
				tagCloud[tag]++;
			}
		});
	});

	return tagCloud;
};

/**
 * @private
 **/
QueryExampleDialog.prototype._addExample = function( title, query, href, tags ) {
	var self = this;

	var title = $( '<a>' ).text(title).attr( 'href', href ).attr( 'target', '_blank' ),
		tags = $( '<td/>' ).text( tags.join( '|' ) ).hide(),
		select = $( '<a href="#" title="Select this Query" data-dismiss="modal">'
					+'<span class="glyphicon glyphicon-copy" aria-hidden="true"></span></a>' ).click( function(){
			self._callback( query );
		} ),
		preview = $( '<span class="glyphicon glyphicon-eye-open" aria-hidden="true"></span>' ).popover({
			placement: 'bottom',
			trigger: 'hover',
			container: 'body',
			title: 'Preview',
			content: $( '<pre/>' ).text( query ),
			html: true
		});

	var example = $( '<tr/>' );
	example.append( $( '<td/>' ).append( title ) );
	example.append( $( '<td/>' ).append( preview ) );
	example.append( $( '<td/>' ).append( select ) );
	example.append( tags );

	this._$element.find( '.searchable' ).append( example );
};


/**
 * @private
 **/
QueryExampleDialog.prototype._filterTable = function() {

	var filter = this._$element.find( '.tableFilter' ),
		filterRegex = new RegExp( filter.val(), 'i');

	var tags = this._$element.find( '.tagFilter' ).tags().getTags();

	var tagFilter = function( text ){
		var matches = true;
		text = text.toLowerCase();

		$.each( tags, function( key, tag ){
			if( text.indexOf( tag.toLowerCase() ) === -1 ){
				matches = false;
			}
		});

		return matches;
	}

	this._$element.find( '.searchable tr' ).hide();
	this._$element.find( '.searchable tr' ).filter( function () {
		return filterRegex.test( $(this).text() )
				&& tagFilter( $(this).text() );
	}).show();

};


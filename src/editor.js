"use strict";
module.exports = Editor;

/**
 * An ui this._editor for the Wikibase query service
 *
 * @class wikibase.queryService.ui.this._editor
 * @licence GNU GPL v2+
 *
 * @author Stanislav Malyshev
 * @author Jonas Kress
 * @constructor
 */
function Editor( $, Mod, Tooltip) {
	require('codemirror/addon/hint/show-hint');
	require('./codemirror/lib/grammar/tokenizer.js');
	require('./codemirror/addon/hint/wikibaseSparqlHint.js');
	require('./codemirror/addon/hint/wikibaseRdfHint.js');
	this.CODEMIRROR_DEFAULTS = {
			mode: 'sparql11',
			extraKeys: { 'Ctrl-Space': 'autocomplete' },
			viewportMargin: Infinity,
			value: "PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>\nPREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>\nSELECT * WHERE {\n  ?sub ?pred ?obj .\n} \nLIMIT 10",
			highlightSelectionMatches: {
				showToken: /\w/
			},
			tabMode: "indent",
			lineNumbers: true,
			lineWrapping: true,
			backdrop: false,
			collapsePrefixesOnLoad: false,
			gutters: ["gutterErrorBar", "CodeMirror-linenumbers", "CodeMirror-foldgutter"],
			matchBrackets: true,
			fixedGutter: true,
			syntaxErrorCheck: true
		};
	this.ERROR_LINE_MARKER = null;
	this.ERROR_CHARACTER_MARKER = null;
	this.CodeMirror = Mod;
	this.tooltip = Tooltip;
}

/**
 * @property {CodeMirror}
 * @type CodeMirror
 * @private
 **/
Editor.prototype._editor = null;

/**
 * Construct an this._editor on the given textarea DOM element
 *
 * @param {Element} element
 **/
Editor.prototype.fromTextArea = function( element ) {
	var self = this;
	this._editor = this.CodeMirror.fromTextArea( element, this.CODEMIRROR_DEFAULTS );
	this._editor.on( 'change', function ( editor, changeObj ) {
		self.clearError();
		if( changeObj.text[0] === '?' ){
			this._editor.showHint({closeCharacters: /[\s]/});
		}
	} );
	this._editor.focus();

	new this.tooltip($, this._editor, this.CodeMirror);
};

/**
 * Construct an this._editor on the given textarea DOM element
 *
 * @param {string} keyMap
 * @throws {function} callback
 **/
Editor.prototype.addKeyMap = function( keyMap, callback ) {
	this._editor.addKeyMap( { keyMap : callback } );
};

/**
 * @param {string} value
 **/
Editor.prototype.setValue = function( value ) {
	this._editor.setValue( value );
};

/**
 * @return {string}
 **/
Editor.prototype.getValue = function() {
	return this._editor.getValue();
};

Editor.prototype.save = function() {
	this._editor.save();
};

/**
 * @param {string} value
 **/
Editor.prototype.prepandValue = function( value ) {
	this._editor.setValue( value + this._editor.getValue() );
};

Editor.prototype.refresh = function() {
	this._editor.refresh();
};

/**
 * Highlight SPARQL error in editor window.
 *
 * @param {string} description
 */
Editor.prototype.highlightError = function( description ) {
	var line, character,
		match = description.match( /line (\d+), column (\d+)/ );
	if ( match ) {
		// highlight character at error position
		line = match[1] - 1;
		character = match[2] - 1;
		this.ERROR_LINE_MARKER = this._editor.doc.markText(
			{ 'line': line, 'ch': 0 },
			{ 'line': line },
			{ 'className': 'error-line' }
		);
		this.ERROR_CHARACTER_MARKER = this._editor.doc.markText(
			{ 'line': line, 'ch': character },
			{ 'line': line, 'ch': character + 1 },
			{ 'className': 'error-character' }
		);
	}
};

/**
 * Clear SPARQL error in editor window.
 *
 * @param {string} description
 */
Editor.prototype.clearError = function() {
	if ( this.ERROR_LINE_MARKER ) {
		this.ERROR_LINE_MARKER.clear();
		this.ERROR_CHARACTER_MARKER.clear();
	}
};


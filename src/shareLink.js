var $ = require('jquery');
var deparam = function(queryString) {
	var params = [];
	if (queryString && queryString.length > 0) {
		var vars = queryString.split("&");
		for (var i = 0; i < vars.length; i++) {
			var pair = vars[i].split("=");
			var key = pair[0];
			var val = pair[1];
			if (key.length > 0 && val && val.length > 0) {
				//we at least need a key right

				//do the decoding. Do plus sign separately (not done by the native decode function)
				val = val.replace(/\+/g, ' ');
				val = decodeURIComponent(val);
				params.push({
					name: pair[0],
					value: val
				});
			}
		}
	}
	return params;
};


var getUrlParams = function() {
	//first try hash
	var urlParams = [];
	if (window.location.hash.length > 1) {
		//firefox does some decoding if we're using window.location.hash (e.g. the + sign in contentType settings)
		//Don't want this. So simply get the hash string ourselves
		urlParams = deparam(location.href.split("#")[1])
		window.location.hash = ""; //clear hash
	} else if (window.location.search.length > 1) {
		//ok, then just try regular url params
		urlParams = deparam(window.location.search.substring(1));
	}
	return urlParams;
};

module.exports = {
	getShortLinkHandler: function(wdqsui) {
		return function(url, callback) {
			$.ajax({
				url: wdqsui.options.api.urlShortener,
				data: {
					url: url
				},
				error: function(jqXhr, textStatus, errorThrown){
					callback(jqXhr.responseText);
				},
				success: function(data) {
					callback(null, data);
				}
			})
		}
	},
	getCreateLinkHandler: function(tab) {
		return function() {
			/**
			 * First set YASQE settings
			 */
			var params = [{
				name: 'query',
				value: tab.wdqsqe.getValue()
			}, {
				name: 'contentTypeConstruct',
				value: tab.persistentOptions.wdqsqe.sparql.acceptHeaderGraph
			}, {
				name: 'contentTypeSelect',
				value: tab.persistentOptions.wdqsqe.sparql.acceptHeaderSelect
			}, {
				name: 'endpoint',
				value: tab.persistentOptions.wdqsqe.sparql.endpoint
			}, {
				name: 'requestMethod',
				value: tab.persistentOptions.wdqsqe.sparql.requestMethod
			}, {
				name: 'tabTitle',
				value: tab.persistentOptions.name
			}, {
				name: 'headers',
				value: JSON.stringify(tab.persistentOptions.wdqsqe.sparql.headers)
			}];

			tab.persistentOptions.wdqsqe.sparql.args.forEach(function(paramPair) {
				params.push(paramPair);
			});
			tab.persistentOptions.wdqsqe.sparql.namedGraphs.forEach(function(ng) {
				params.push({
					name: 'namedGraph',
					value: ng
				});
			});
			tab.persistentOptions.wdqsqe.sparql.defaultGraphs.forEach(function(dg) {
				params.push({
					name: 'defaultGraph',
					value: dg
				});
			});

			/**
			 * Now set YASR settings
			 */
			params.push({
				name: 'outputFormat',
				value: tab.yasr.options.output
			});
			if (tab.yasr.plugins[tab.yasr.options.output].getPersistentSettings) {
				var persistentPluginSettings = tab.yasr.plugins[tab.yasr.options.output].getPersistentSettings();
				if (typeof persistentPluginSettings == "object") {
					persistentPluginSettings = JSON.stringify(persistentPluginSettings);
				}
				params.push({
					name: 'outputSettings',
					value: persistentPluginSettings
				});
			}

			//extend existing link, so first fetch current arguments. But: make sure we don't include items already used in share link
			if (window.location.hash.length > 1) {
				var keys = [];
				params.forEach(function(paramPair) {
					keys.push(paramPair.name)
				});
				var currentParams = deparam(window.location.hash.substring(1))
				currentParams.forEach(function(paramPair) {
					if (keys.indexOf(paramPair.name) == -1) {
						params.push(paramPair);
					}
				});
			}

			return params;
		}
	},
	getOptionsFromUrl: function() {
		var options = {
			wdqsqe: {
				sparql: {}
			},
			yasr: {}
		};

		var params = getUrlParams();
		var validYasguiOptions = false;

		params.forEach(function(paramPair) {
			if (paramPair.name == 'query') {
				validYasguiOptions = true;
				options.wdqsqe.value = paramPair.value;
			} else if (paramPair.name == 'outputFormat') {
				var output = paramPair.value;
				if (output == 'simpleTable') output = 'table'; //this query link is from v1. don't have this plugin anymore
				options.yasr.output = output;
			} else if (paramPair.name == 'outputSettings') {
				options.yasr.outputSettings = JSON.parse(paramPair.value);
			} else if (paramPair.name == 'contentTypeConstruct') {
				options.wdqsqe.sparql.acceptHeaderGraph = paramPair.value;
			} else if (paramPair.name == 'contentTypeSelect') {
				options.wdqsqe.sparql.acceptHeaderSelect = paramPair.value;
			} else if (paramPair.name == 'endpoint') {
				options.wdqsqe.sparql.endpoint = paramPair.value;
			} else if (paramPair.name == 'requestMethod') {
				options.wdqsqe.sparql.requestMethod = paramPair.value;
			} else if (paramPair.name == 'tabTitle') {
				options.name = paramPair.value;
			} else if (paramPair.name == 'namedGraph') {
				if (!options.wdqsqe.sparql.namedGraphs) options.wdqsqe.sparql.namedGraphs = [];
				options.wdqsqe.sparql.namedGraphs.push(paramPair.value);
			} else if (paramPair.name == 'defaultGraph') {
				if (!options.wdqsqe.sparql.defaultGraphs) options.wdqsqe.sparql.defaultGraphs = [];
				options.wdqsqe.sparql.defaultGraphs.push(paramPair.value);
			} else if (paramPair.name == 'headers') {
				if (!options.wdqsqe.sparql.headers) options.wdqsqe.sparql.headers = {};
				var headers = JSON.parse(paramPair.value);
				if ($.isPlainObject(headers)) {
					options.wdqsqe.sparql.headers = headers;
				}
			} else {
				if (!options.wdqsqe.sparql.args) options.wdqsqe.sparql.args = [];
				//regular arguments. So store them as regular arguments
				options.wdqsqe.sparql.args.push(paramPair);
			}
		});
		if (validYasguiOptions) {
			return options;
		} else {
			return null;
		}
	}
}

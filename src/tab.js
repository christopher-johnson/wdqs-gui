'use strict';

var $ = require('jquery'),
	EventEmitter = require('events').EventEmitter,
	utils = require('./utils.js'),
	Storage = require('wdqs-storage'),
	_ = require('underscore'),
	WDQSGUI = require('./index.js');

var defaultPersistent = {
	wdqsqe: {
		height: 300,
		sparql: {
			endpoint: WDQSGUI.WDQSQE.defaults.sparql.endpoint,
			acceptHeaderGraph: WDQSGUI.WDQSQE.defaults.sparql.acceptHeaderGraph,
			acceptHeaderSelect: WDQSGUI.WDQSQE.defaults.sparql.acceptHeaderSelect,
			args: WDQSGUI.WDQSQE.defaults.sparql.args,
			defaultGraphs: WDQSGUI.WDQSQE.defaults.sparql.defaultGraphs,
			namedGraphs: WDQSGUI.WDQSQE.defaults.sparql.namedGraphs,
			requestMethod: WDQSGUI.WDQSQE.defaults.sparql.requestMethod,
			headers: WDQSGUI.WDQSQE.defaults.sparql.headers
		}
	}
};

module.exports = function(wdqsgui, id, name, endpoint) {
	return new Tab(wdqsgui, id, name, endpoint);
};

var Tab = function(wdqsgui, id, name, endpoint) {
	EventEmitter.call(this);
	if (!wdqsgui.persistentOptions.tabs[id]) {
		wdqsgui.persistentOptions.tabs[id] = $.extend(true, {
			id: id,
			name: name
		}, defaultPersistent);
	} else {
		wdqsgui.persistentOptions.tabs[id] = $.extend(true, {}, defaultPersistent, wdqsgui.persistentOptions.tabs[id]);
	}
	var persistentOptions = wdqsgui.persistentOptions.tabs[id];
	if (endpoint) persistentOptions.wdqsqe.sparql.endpoint = endpoint;
	var tab = this;
	tab.persistentOptions = persistentOptions;

	var menu = require('./tabPaneMenu.js')(wdqsgui, tab);
	var $pane = $('<div>', {
		id: persistentOptions.id,
		style: 'position:relative',
		class: 'tab-pane',
		role: 'tabpanel'
	}).appendTo(wdqsgui.$tabPanesParent);

	var $paneContent = $('<div>', {
		class: 'wrapper'
	}).appendTo($pane);
	var $controlBar = $('<div>', {
		class: 'controlbar'
	}).appendTo($paneContent);
	var $paneMenu = menu.initWrapper().appendTo($pane);
	var $endpointInput;
	var addControlBar = function() {
		$('<button>', {
				type: 'button',
				class: 'menuButton btn btn-default'
			})
			.on('click', function(e) {
				if ($pane.hasClass('menu-open')) {
					$pane.removeClass('menu-open');
					menu.store();
				} else {
					menu.updateWrapper();
					$pane.addClass('menu-open');
					//					utils.onOutsideClick($(".menu-slide,.menuButton"), function() {$pane.removeClass('menu-open'); menu.store();});
					$(".menu-slide,.menuButton").onOutsideClick(function() {
						$pane.removeClass('menu-open');
						menu.store();
					});

				}
			})
			.append($('<span>', {
				class: 'icon-bar'
			}))
			.append($('<span>', {
				class: 'icon-bar'
			}))
			.append($('<span>', {
				class: 'icon-bar'
			}))
			.appendTo($controlBar);

		//add endpoint text input
		$endpointInput = $('<select>')
			.appendTo($controlBar)
			.endpointCombi(wdqsgui, {
				value: persistentOptions.wdqsqe.sparql.endpoint,
				onChange: function(val) {
					persistentOptions.wdqsqe.sparql.endpoint = val;
					tab.refreshYasqe();
					wdqsgui.store();

				}
			});

	};


	var wdqsqeContainer = $('<div>', {
		id: 'wdqsqe_' + persistentOptions.id
	}).appendTo($paneContent);
	var wdqsrContainer = $('<div>', {
		id: 'wdqsq_' + persistentOptions.id
	}).appendTo($paneContent);



	var wdqsqeOptions = {
		createShareLink: require('./shareLink').getCreateLinkHandler(tab)
	};
	if (wdqsgui.options.api.urlShortener) {
		wdqsqeOptions.createShortLink = require('./shareLink').getShortLinkHandler(wdqsgui)
	}
	var storeInHist = function() {
		persistentOptions.wdqsqe.value = tab.wdqsqe.getValue(); //in case the onblur hasnt happened yet
		var resultSize = null;
		if (tab.wdqsr.results.getBindings()) {
			resultSize = tab.wdqsr.results.getBindings().length;
		}
		var histObject = {
			options: $.extend(true, {}, persistentOptions), //create copy
			resultSize: resultSize
		};
		delete histObject.options.name; //don't store this one
		wdqsgui.history.unshift(histObject);

		var maxHistSize = 50;
		if (wdqsgui.history.length > maxHistSize) {
			wdqsgui.history = wdqsgui.history.slice(0, maxHistSize);
		}


		//store in localstorage as well
		if (wdqsgui.persistencyPrefix) {
			Storage.storage.set(wdqsgui.persistencyPrefix + 'history', wdqsgui.history);
		}


	};

	tab.setPersistentInYasqe = function() {
		if (tab.wdqsqe) {
			$.extend(tab.wdqsqe.options.sparql, persistentOptions.wdqsqe.sparql);
			//set value manualy, as this triggers a refresh
			if (persistentOptions.wdqsqe.value) tab.wdqsqe.setValue(persistentOptions.wdqsqe.value);
		}
	}
	$.extend(wdqsqeOptions, persistentOptions.wdqsqe);

	var initYasr = function() {
		if (!tab.wdqsr) {
			var addQueryDuration = function(wdqsr, plugin) {
				if (tab.wdqsqe.lastQueryDuration && plugin.name == "Table") {
					var tableInfo = tab.wdqsr.resultsContainer.find('.dataTables_info');
					if (tableInfo.length > 0) {
						var text = tableInfo.first().text();
						tableInfo.text(text + ' (in ' + (tab.wdqsqe.lastQueryDuration / 1000) + ' seconds)');
					}
				}
			}
			if (!tab.wdqsqe) initYasqe(); //we need this one to initialize wdqsr
			var getQueryString = function() {
				return persistentOptions.wdqsqe.sparql.endpoint + "?" +
					$.param(tab.wdqsqe.getUrlArguments(persistentOptions.wdqsqe.sparql));
			};
			WDQSGUI.WDQSR.plugins.error.defaults.tryQueryLink = getQueryString;
			tab.wdqsr = WDQSGUI.WDQSR(wdqsrContainer[0], $.extend({
				//this way, the URLs in the results are prettified using the defined prefixes in the query
				getUsedPrefixes: tab.wdqsqe.getPrefixesFromQuery
			}, persistentOptions.wdqsr));
			tab.wdqsr.on('drawn', addQueryDuration);
		}

	};
	tab.query = function() {
		tab.wdqsqe.query();
	};

	var initYasqe = function() {
		if (!tab.wdqsqe) {
			addControlBar();
			WDQSGUI.WDQSQE.defaults.extraKeys['Ctrl-Enter'] = function() {
				tab.wdqsqe.query.apply(this, arguments)
			};
			WDQSGUI.WDQSQE.defaults.extraKeys['Cmd-Enter'] = function() {
				tab.wdqsqe.query.apply(this, arguments)
			};
			tab.wdqsqe = WDQSGUI.WDQSQE(wdqsqeContainer[0], wdqsqeOptions);
			tab.wdqsqe.setSize("100%", persistentOptions.wdqsqe.height);
			tab.wdqsqe.on('blur', function(wdqsqe) {
				persistentOptions.wdqsqe.value = wdqsqe.getValue();
				wdqsgui.store();
			});
			tab.wdqsqe.on('query', function() {

				wdqsgui.$tabsParent.find('a[href="#' + id + '"]').closest('li').addClass('querying');
				wdqsgui.emit('query', wdqsgui, tab);
			});
			tab.wdqsqe.on('queryFinish', function() {
				wdqsgui.$tabsParent.find('a[href="#' + id + '"]').closest('li').removeClass('querying');
				wdqsgui.emit('queryFinish', wdqsgui, tab);
			});
			var beforeSend = null;
			tab.wdqsqe.options.sparql.callbacks.beforeSend = function() {
				beforeSend = +new Date();
			}
			tab.wdqsqe.options.sparql.callbacks.complete = function() {
				var end = +new Date();
				wdqsgui.tracker.track(persistentOptions.wdqsqe.sparql.endpoint, tab.wdqsqe.getValueWithoutComments(), end - beforeSend);
				tab.wdqsr.setResponse.apply(this, arguments);
				storeInHist();
			}

			tab.wdqsqe.query = function() {
				var options = {}
				options = $.extend(true, options, tab.wdqsqe.options.sparql);

				if (wdqsgui.options.api.corsProxy && wdqsgui.corsEnabled) {
					if (!wdqsgui.corsEnabled[persistentOptions.wdqsqe.sparql.endpoint]) {
						//use the proxy //name value

						options.args.push({
							name: 'endpoint',
							value: options.endpoint
						});
						options.args.push({
							name: 'requestMethod',
							value: options.requestMethod
						});
						options.requestMethod = "POST";
						options.endpoint = wdqsgui.options.api.corsProxy;
						WDQSGUI.WDQSQE.executeQuery(tab.wdqsqe, options);
					} else {
						WDQSGUI.WDQSQE.executeQuery(tab.wdqsqe, options);
					}
				} else {
					WDQSGUI.WDQSQE.executeQuery(tab.wdqsqe, options);
				}
			};



		}
	};
	tab.onShow = function() {
		initYasqe();
		tab.wdqsqe.refresh();
		initYasr();
		if (wdqsgui.options.allowYasqeResize) {
			$(tab.wdqsqe.getWrapperElement()).resizable({
				minHeight: 150,
				handles: 's',
				resize: function() {
					_.debounce(function() {
						tab.wdqsqe.setSize("100%", $(this).height());
						tab.wdqsqe.refresh()
					}, 500);
				},
				stop: function() {
					persistentOptions.wdqsqe.height = $(this).height();
					tab.wdqsqe.refresh()
					wdqsgui.store();
				}
			});
			$(tab.wdqsqe.getWrapperElement()).find('.ui-resizable-s').click(function() {
				$(tab.wdqsqe.getWrapperElement()).css('height', 'auto');
				persistentOptions.wdqsqe.height = 'auto';
				wdqsgui.store();
			})
		}
	};

	tab.beforeShow = function() {
		initYasqe();
	}
	tab.refreshYasqe = function() {
		if (tab.wdqsqe) {
			$.extend(true, tab.wdqsqe.options, tab.persistentOptions.wdqsqe);
			if (tab.persistentOptions.wdqsqe.value) tab.wdqsqe.setValue(tab.persistentOptions.wdqsqe.value);
		}
	};
	tab.destroy = function() {
		if (!tab.wdqsr) {
			//instantiate wdqsr (without rendering results, to avoid load)
			//this way, we can clear the wdqsr persistent results
			tab.wdqsr = WDQSGUI.WDQSR(wdqsrContainer[0], {
				outputPlugins: []
			}, '');
		}
		Storage.storage.removeAll(function(key, val) {
			return key.indexOf(tab.wdqsr.getPersistencyId('')) == 0;
		})
	}
	tab.getEndpoint = function() {
		var endpoint = null;
		if (Storage.nestedExists(tab.persistentOptions, 'wdqsqe', 'sparql', 'endpoint')) {
			endpoint = tab.persistentOptions.wdqsqe.sparql.endpoint;
		}
		return endpoint;
	}

	return tab;
}

Tab.prototype = new EventEmitter;

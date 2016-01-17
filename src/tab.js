'use strict';

var $ = require('jquery'),
	EventEmitter = require('events').EventEmitter,
	utils = require('./utils.js'),
	Storage = require('wdqs-storage'),
	_ = require('underscore'),
	WDQSUI = require('./index.js');

var defaultPersistent = {
	wdqsqe: {
		height: 300,
		sparql: {
			endpoint: WDQSUI.WDQSQE.defaults.sparql.endpoint,
			acceptHeaderGraph: WDQSUI.WDQSQE.defaults.sparql.acceptHeaderGraph,
			acceptHeaderSelect: WDQSUI.WDQSQE.defaults.sparql.acceptHeaderSelect,
			args: WDQSUI.WDQSQE.defaults.sparql.args,
			defaultGraphs: WDQSUI.WDQSQE.defaults.sparql.defaultGraphs,
			namedGraphs: WDQSUI.WDQSQE.defaults.sparql.namedGraphs,
			requestMethod: WDQSUI.WDQSQE.defaults.sparql.requestMethod,
			headers: WDQSUI.WDQSQE.defaults.sparql.headers
		}
	}
};

module.exports = function(wdqsui, id, name, endpoint) {
	return new Tab(wdqsui, id, name, endpoint);
};

var Tab = function(wdqsui, id, name, endpoint) {
	EventEmitter.call(this);
	if (!wdqsui.persistentOptions.tabs[id]) {
		wdqsui.persistentOptions.tabs[id] = $.extend(true, {
			id: id,
			name: name
		}, defaultPersistent);
	} else {
		wdqsui.persistentOptions.tabs[id] = $.extend(true, {}, defaultPersistent, wdqsui.persistentOptions.tabs[id]);
	}
	var persistentOptions = wdqsui.persistentOptions.tabs[id];
	if (endpoint) persistentOptions.wdqsqe.sparql.endpoint = endpoint;
	var tab = this;
	tab.persistentOptions = persistentOptions;

	var menu = require('./tabPaneMenu.js')(wdqsui, tab);
	var $pane = $('<div>', {
		id: persistentOptions.id,
		style: 'position:relative',
		class: 'tab-pane',
		role: 'tabpanel'
	}).appendTo(wdqsui.$tabPanesParent);

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
			.endpointCombi(wdqsui, {
				value: persistentOptions.wdqsqe.sparql.endpoint,
				onChange: function(val) {
					persistentOptions.wdqsqe.sparql.endpoint = val;
					tab.refreshYasqe();
					wdqsui.store();

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
	if (wdqsui.options.api.urlShortener) {
		wdqsqeOptions.createShortLink = require('./shareLink').getShortLinkHandler(wdqsui)
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
		wdqsui.history.unshift(histObject);

		var maxHistSize = 50;
		if (wdqsui.history.length > maxHistSize) {
			wdqsui.history = wdqsui.history.slice(0, maxHistSize);
		}


		//store in localstorage as well
		if (wdqsui.persistencyPrefix) {
			Storage.storage.set(wdqsui.persistencyPrefix + 'history', wdqsui.history);
		}


	};

	tab.setPersistentInYasqe = function() {
		if (tab.wdqsqe) {
			$.extend(tab.wdqsqe.options.sparql, persistentOptions.wdqsqe.sparql);
			//set value manualy, as this triggers a refresh
			if (persistentOptions.wdqsqe.value) tab.wdqsqe.setValue(persistentOptions.wdqsqe.value);
		}
	};
	$.extend(wdqsqeOptions, persistentOptions.wdqsqe);

	var initWDQSR = function() {
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
			if (!tab.wdqsqe) initWDQSQE(); //we need this one to initialize wdqsr
			var getQueryString = function() {
				return persistentOptions.wdqsqe.sparql.endpoint + "?" +
					$.param(tab.wdqsqe.getUrlArguments(persistentOptions.wdqsqe.sparql));
			};
			WDQSUI.WDQSR.plugins.error.defaults.tryQueryLink = getQueryString;
			tab.wdqsr = WDQSUI.WDQSR(wdqsrContainer[0], $.extend({
				//this way, the URLs in the results are prettified using the defined prefixes in the query
				getUsedPrefixes: tab.wdqsqe.getPrefixesFromQuery
			}, persistentOptions.wdqsr));
			tab.wdqsr.on('drawn', addQueryDuration);
		}

	};
	tab.query = function() {
		tab.wdqsqe.query();
	};

	var initWDQSQE = function() {
		if (!tab.wdqsqe) {
			addControlBar();
			WDQSUI.WDQSQE.defaults.extraKeys['Ctrl-Enter'] = function() {
				tab.wdqsqe.query.apply(this, arguments)
			};
			WDQSUI.WDQSQE.defaults.extraKeys['Cmd-Enter'] = function() {
				tab.wdqsqe.query.apply(this, arguments)
			};
			tab.wdqsqe = WDQSUI.WDQSQE(wdqsqeContainer[0], wdqsqeOptions);
			tab.wdqsqe.setSize("100%", persistentOptions.wdqsqe.height);
			tab.wdqsqe.on('blur', function(wdqsqe) {
				persistentOptions.wdqsqe.value = wdqsqe.getValue();
				wdqsui.store();
			});
			tab.wdqsqe.on('query', function() {

				wdqsui.$tabsParent.find('a[href="#' + id + '"]').closest('li').addClass('querying');
				wdqsui.emit('query', wdqsui, tab);
			});
			tab.wdqsqe.on('queryFinish', function() {
				wdqsui.$tabsParent.find('a[href="#' + id + '"]').closest('li').removeClass('querying');
				wdqsui.emit('queryFinish', wdqsui, tab);
			});
			var beforeSend = null;
			tab.wdqsqe.options.sparql.callbacks.beforeSend = function() {
				beforeSend = +new Date();
			};
			tab.wdqsqe.options.sparql.callbacks.complete = function() {
				var end = +new Date();
				wdqsui.tracker.track(persistentOptions.wdqsqe.sparql.endpoint, tab.wdqsqe.getValueWithoutComments(), end - beforeSend);
				tab.wdqsr.setResponse.apply(this, arguments);
				storeInHist();
			};

			tab.wdqsqe.query = function() {
				var options = {}
				options = $.extend(true, options, tab.wdqsqe.options.sparql);

				if (wdqsui.options.api.corsProxy && wdqsui.corsEnabled) {
					if (!wdqsui.corsEnabled[persistentOptions.wdqsqe.sparql.endpoint]) {
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
						options.endpoint = wdqsui.options.api.corsProxy;
						WDQSUI.WDQSQE.executeQuery(tab.wdqsqe, options);
					} else {
						WDQSUI.WDQSQE.executeQuery(tab.wdqsqe, options);
					}
				} else {
					WDQSUI.WDQSQE.executeQuery(tab.wdqsqe, options);
				}
			};



		}
	};
	tab.onShow = function() {
		initWDQSQE();
		tab.wdqsqe.refresh();
		initWDQSR();
		if (wdqsui.options.allowEditorResize) {
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
					tab.wdqsqe.refresh();
					wdqsui.store();
				}
			});
			$(tab.wdqsqe.getWrapperElement()).find('.ui-resizable-s').click(function() {
				$(tab.wdqsqe.getWrapperElement()).css('height', 'auto');
				persistentOptions.wdqsqe.height = 'auto';
				wdqsui.store();
			})
		}
	};

	tab.beforeShow = function() {
		initWDQSQE();
	};
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
			tab.wdqsr = WDQSUI.WDQSR(wdqsrContainer[0], {
				outputPlugins: []
			}, '');
		}
		Storage.storage.removeAll(function(key, val) {
			return key.indexOf(tab.wdqsr.getPersistencyId('')) == 0;
		})
	};
	tab.getEndpoint = function() {
		var endpoint = null;
		if (Storage.nestedExists(tab.persistentOptions, 'wdqsqe', 'sparql', 'endpoint')) {
			endpoint = tab.persistentOptions.wdqsqe.sparql.endpoint;
		}
		return endpoint;
	};

	return tab;
};

Tab.prototype = new EventEmitter;

"use strict";

var $ =  require('jquery'),
    EventEmitter = require('events').EventEmitter,
    bootstraptags = require('bootstrap-tagsinput'),
    jquerypopover = require('jquery-popover'),
    Storage = require('wdqs-storage'),
    datatables = require('datatables.net')(),
    datatablesbs = require('datatables.net-bs')();
require('./jquery/extendJquery.js');

var setWDQSUIOptions = function(options) {
};

var WDQSUI = function(parent, options) {
    EventEmitter.call(this);
    var wdqsui = this;
    wdqsui.wrapperElement = $('<div class="wdqs-ui"></div>').appendTo($(parent));
    wdqsui.options = $.extend(true, {}, module.exports.defaults, options);
    setWDQSUIOptions(wdqsui.options);
    wdqsui.history = [];

    wdqsui.persistencyPrefix = null;
    if (wdqsui.options.persistencyPrefix) {
        wdqsui.persistencyPrefix = (typeof wdqsui.options.persistencyPrefix == 'function' ? wdqsui.options.persistencyPrefix(wdqsui) : wdqsui.options.persistencyPrefix);
    }

    if (wdqsui.persistencyPrefix) {
        var histFromStorage = Storage.storage.get(wdqsui.persistencyPrefix + 'history');
        if (histFromStorage) wdqsui.history = histFromStorage;
    }

    wdqsui.store = function() {
        if (wdqsui.persistentOptions) {
            Storage.storage.set(wdqsui.persistencyPrefix, wdqsui.persistentOptions);
        }
    };

    var getSettingsFromStorage = function() {
        var settings = Storage.storage.get(wdqsui.persistencyPrefix);
        if (!settings) settings = {};
        return settings;
    };

    wdqsui.persistentOptions = getSettingsFromStorage();
    var persistentOptions = wdqsui.persistentOptions;

    wdqsui.tabs = {};

    //the actual tabs parent containing the ul of tab buttons
    var $tabsParent;

    //contains the tabs and panes
    var $tabPanel = null;

    //context menu for the tab context menu
    var $contextMenu = null;

    var getTabName = function(name, i) {
        if (!name) name = "Query";
        if (!i) i = 0;
        var fullName = name + (i > 0 ? " " + i : "");

        if (tabNameTaken(fullName)) fullName = getTabName(name, i + 1);
        return fullName;
    };

    var tabNameTaken = function(name) {
        for (var tabId in wdqsui.tabs) {
            if (wdqsui.tabs[tabId].persistentOptions.name == name) {
                return true;
            }
        }
        return false;
    };

    var getRandomId = function() {
        return Math.random().toString(36).substring(7);
    };


    wdqsui.init = function() {

        //tab panel contains tabs and panes
        $tabPanel = $('<div>', {
            role: 'tabpanel'
        }).appendTo(wdqsui.wrapperElement);

        //init tabs
        $tabsParent = $('<ul>', {
            class: 'nav nav-tabs mainTabs',
            role: 'tablist'
        }).appendTo($tabPanel);
        wdqsui.$tabsParent = $tabsParent;

        //init add button
        var $addTab = $('<a>', {
            role: 'addTab'
        })
            .click(function(e) {
                addTab();
            })
            .text('+');
        $tabsParent.append(
            $("<li>", {
                role: "presentation"
            })
                .append($addTab)
        );

        //init panes
        wdqsui.$tabPanesParent = $('<div>', {
            class: 'tab-content'
        }).appendTo($tabPanel);

        if (!persistentOptions || $.isEmptyObject(persistentOptions)) {
            //ah, this is on first load. initialize some stuff
            persistentOptions.tabOrder = [];
            persistentOptions.tabs = {};
            persistentOptions.selected = null;
        }
        var optionsFromUrl = require('./shareLink.js').getOptionsFromUrl();
        if (optionsFromUrl) {
            //hmm, we have options from the url. make sure we initialize everything using this tab
            //the one thing we don't have is the ID. generate it.
            var tabId = getRandomId();
            optionsFromUrl.id = tabId;
            persistentOptions.tabs[tabId] = optionsFromUrl;
            persistentOptions.tabOrder.push(tabId);
            persistentOptions.selected = tabId;
            wdqsui.once('ready', function() {
                if (persistentOptions.tabs[tabId].yasr.outputSettings) {
                    var plugin = wdqsui.current().yasr.plugins[persistentOptions.tabs[tabId].yasr.output];
                    if (plugin.options) {
                        $.extend(plugin.options, persistentOptions.tabs[tabId].yasr.outputSettings);
                    }
                    delete persistentOptions.tabs[tabId]['yasr']['outputSettings'];
                }

                wdqsui.current().query();
            })
        }

        if (persistentOptions.tabOrder.length > 0) {
            persistentOptions.tabOrder.forEach(addTab);
        } else {
            //hmm, nothing to be drawn. just initiate a single tab
            addTab();
        }

        $tabsParent.sortable({
            placeholder: "tab-sortable-highlight",
            items: 'li:has([data-toggle="tab"])', //don't allow sorting after ('+') icon
            forcePlaceholderSize: true,
            update: function() {
                var newTabOrder = [];
                $tabsParent.find('a[data-toggle="tab"]').each(function() {
                    newTabOrder.push($(this).attr('aria-controls'));
                });
                persistentOptions.tabOrder = newTabOrder;
                wdqsui.store();
            }

        });

        //Add context menu
        $contextMenu = $('<div>', {
            class: 'tabDropDown'
        }).appendTo(wdqsui.wrapperElement);
        var $contextMenuList = $('<ul>', {
            class: 'dropdown-menu',
            role: 'menu'
        }).appendTo($contextMenu);
        var addMenuItem = function(name, onClick) {
            var $listItem = $('<li>', {
                role: 'presentation'
            }).appendTo($contextMenuList);
            if (name) {
                $listItem.append($('<a>', {
                        role: 'menuitem',
                        href: '#'
                    }).text(name))
                    .click(function() {
                        $contextMenu.hide();
                        event.preventDefault();
                        if (onClick) onClick($contextMenu.attr('target-tab'));
                    })
            } else {
                $listItem.addClass('divider');
            }
        };
        addMenuItem('Add new Tab', function(tabId) {
            addTab();
        });
        addMenuItem('Rename', function(tabId) {
            $tabsParent.find('a[href="#' + tabId + '"]').dblclick();
        });
        addMenuItem('Copy', function(tabId) {
            var newTabId = getRandomId();
            var copiedSettings = $.extend(true, {}, persistentOptions.tabs[tabId]);
            copiedSettings.id = newTabId;
            persistentOptions.tabs[newTabId] = copiedSettings;
            addTab(newTabId);
            selectTab(newTabId);
        });
        addMenuItem();
        addMenuItem('Close', closeTab);
        addMenuItem('Close others', function(tabId) {
            $tabsParent.find('a[role="tab"]').each(function() {
                var currentId = $(this).attr('aria-controls');
                if (currentId != tabId) closeTab(currentId);
            })
        });
        addMenuItem('Close all', function() {
            $tabsParent.find('a[role="tab"]').each(function() {
                closeTab($(this).attr('aria-controls'));
            })
        });
    };

    var selectTab = function(id) {
        $tabsParent.find('a[aria-controls="' + id + '"]').tab('show');
        return wdqsui.current();
    };

    wdqsui.selectTab = selectTab;
    var closeTab = function(id) {
        /**
         * cleanup local storage
         */
        wdqsui.tabs[id].destroy();

        /**cleanup variables**/
        delete wdqsui.tabs[id];
        delete persistentOptions.tabs[id];
        var orderIndex = persistentOptions.tabOrder.indexOf(id);
        if (orderIndex > -1) persistentOptions.tabOrder.splice(orderIndex, 1);

        /**
         * select new tab
         */
        var newSelectedIndex = null;
        if (persistentOptions.tabOrder[orderIndex]) {
            //use the tab now in position of the old one
            newSelectedIndex = orderIndex;
        } else if (persistentOptions.tabOrder[orderIndex - 1]) {
            //use the tab in the previous position
            newSelectedIndex = orderIndex - 1;
        }
        if (newSelectedIndex !== null) selectTab(persistentOptions.tabOrder[newSelectedIndex]);

        /**
         * cleanup dom
         */
        $tabsParent.find('a[href="#' + id + '"]').closest('li').remove();
        $("#" + id).remove();


        wdqsui.store();
        return wdqsui.current();
    };
    wdqsui.closeTab = closeTab;
    var addTab = function(tabId) {
        var newItem = !tabId;
        if (!tabId) tabId = getRandomId();
        if (!('tabs' in persistentOptions)) persistentOptions.tabs = {};
        var name = null;
        if (persistentOptions.tabs[tabId] && persistentOptions.tabs[tabId].name) {
            name = persistentOptions.tabs[tabId].name
        }
        if (!name) name = getTabName();


        //Initialize new tab with endpoint from currently selected tab (if there is one)
        var endpoint = null;
        if (wdqsui.current() && wdqsui.current().getEndpoint()) {
            endpoint = wdqsui.current().getEndpoint();
        }

        //first add tab
        var $tabToggle = $('<a>', {
            href: '#' + tabId,
            'aria-controls': tabId,
            role: 'tab',
            'data-toggle': 'tab'
        })
            .click(function(e) {
                e.preventDefault();
                $(this).tab('show');
                wdqsui.tabs[tabId].wdqsqe.refresh();
            })
            .on('shown.bs.tab', function(e) {
                persistentOptions.selected = $(this).attr('aria-controls');
                wdqsui.tabs[tabId].onShow();
                wdqsui.store();
            })
            .append($('<div>', {class: 'loader'}))
            .append($('<span>').text(name))
            .append(
                $('<button>', {
                    class: "close",
                    type: "button"
                })
                    .text('x')
                    .click(function() {
                        closeTab(tabId);
                    })
            );
        var $tabRename = $('<div><input type="text"></div>')
            .keydown(function(e) {
                if (event.which == 27 || event.keyCode == 27) {
                    //esc
                    $(this).closest('li').removeClass('rename');
                } else if (event.which == 13 || event.keyCode == 13) {
                    //enter
                    storeRename($(this).closest('li'));
                }
            });


        var storeRename = function($liEl) {
            var tabId = $liEl.find('a[role="tab"]').attr('aria-controls');
            var val = $liEl.find('input').val();
            $tabToggle.find('span').text($liEl.find('input').val());
            persistentOptions.tabs[tabId].name = val;
            wdqsui.store();
            $liEl.removeClass('rename');
        };
        var $tabItem = $("<li>", {
            role: "presentation"
        })
            .append($tabToggle)
            .append($tabRename)
            .dblclick(function() {
                var el = $(this);
                var val = el.find('span').text();
                el.addClass('rename');
                el.find('input').val(val);
                $tabRename.find('input').focus();
                el.onOutsideClick(function() {
                    storeRename(el);
                })
            })
            .mousedown(function(e){
                if (e.which == 2) {
                    //middle Click
                    closeTab(tabId);
                }
            })
            .bind('contextmenu', function(e) {
                e.preventDefault();
                $contextMenu
                    .show()
                    .onOutsideClick(function() {
                        $contextMenu.hide();
                    }, {
                        allowedElements: $(this).closest('li')
                    })
                    .addClass('open')
                    .attr('target-tab', $tabItem.find('a[role="tab"]').attr('aria-controls'))
                    .position({
                        my: "left top-3",
                        at: "left bottom",
                        of: $(this)
                    });

            });


        $tabsParent.find('li:has(a[role="addTab"])').before($tabItem);

        if (newItem) persistentOptions.tabOrder.push(tabId);
        wdqsui.tabs[tabId] = require('./tab.js')(wdqsui, tabId, name, endpoint);
        if (newItem || persistentOptions.selected == tabId) {
            wdqsui.tabs[tabId].beforeShow();
            $tabToggle.tab('show');
        }
        return wdqsui.tabs[tabId];
    };


    wdqsui.current = function() {
        return wdqsui.tabs[persistentOptions.selected];
    };
    wdqsui.addTab = addTab;

    wdqsui.init();
    wdqsui.tracker = require('./tracker.js')(wdqsui);
    wdqsui.emit('ready');

    return wdqsui;
};




WDQSUI.prototype = new EventEmitter;

module.exports = function(parent, options) {
    //new App($('.wdqs-gui'), CodeMirror, Editor, Sparql, QuerySamples, Tooltip,
       // QueryExampleDialog, RdfNamespaces, Vis, Explorer);
    return new WDQSUI(parent, options);
};

module.exports.$ = $;
module.exports.WDQSQE = require('./wdqsqe.js');
module.exports.WDQSR = require('./wdqsr.js');
module.exports.defaults = require('./defaults.js');

//var Vis = require('vis');
require('bootstrap');
//var Explorer = require('wdqs-explorer');
//var CodeMirror = require('codemirror');
//var Tooltip = require('./codemirror/addon/tooltip/wikibaseRDFTooltip.js');
//var Editor = require('./editor.js');
//var QueryExampleDialog = require('./queryExampleDialog.js');
//var Sparql = require('./api/sparqlApi.js');
//var QuerySamples = require('./api/querySamples.js');
//var RdfNamespaces = require('./rdfNamespaces.js');
//var App = require('./app.js');



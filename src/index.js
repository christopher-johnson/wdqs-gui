"use strict";

var $ =  require('jquery'),
    EventEmitter = require('events').EventEmitter,
    bootstraptags = require('bootstrap-tagsinput'),
    jquerypopover = require('jquery-popover'),
    Storage = require('wdqs-storage'),
    datatables = require('datatables.net')(),
    datatablesbs = require('datatables.net-bs')();
require('./jquery/extendJquery.js');

var setWDQSGUIOptions = function(options) {
};

var WDQSGUI = function(parent, options) {
    EventEmitter.call(this);
    var wdqsgui = this;
    wdqsgui.wrapperElement = $('<div class="wdqs-gui"></div>').appendTo($(parent));
    wdqsgui.options = $.extend(true, {}, module.exports.defaults, options);
    setWDQSGUIOptions(wdqsgui.options);
    wdqsgui.history = [];

    wdqsgui.persistencyPrefix = null;
    if (wdqsgui.options.persistencyPrefix) {
        wdqsgui.persistencyPrefix = (typeof wdqsgui.options.persistencyPrefix == 'function' ? wdqsgui.options.persistencyPrefix(wdqsgui) : wdqsgui.options.persistencyPrefix);
    }

    if (wdqsgui.persistencyPrefix) {
        var histFromStorage = Storage.storage.get(wdqsgui.persistencyPrefix + 'history');
        if (histFromStorage) wdqsgui.history = histFromStorage;
    }

    wdqsgui.store = function() {
        if (wdqsgui.persistentOptions) {
            Storage.storage.set(wdqsgui.persistencyPrefix, wdqsgui.persistentOptions);
        }
    };

    var getSettingsFromStorage = function() {
        var settings = Storage.storage.get(wdqsgui.persistencyPrefix);
        if (!settings) settings = {};
        return settings;
    };

    wdqsgui.persistentOptions = getSettingsFromStorage();
    var persistentOptions = wdqsgui.persistentOptions;

    wdqsgui.tabs = {};

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
        for (var tabId in wdqsgui.tabs) {
            if (wdqsgui.tabs[tabId].persistentOptions.name == name) {
                return true;
            }
        }
        return false;
    };

    var getRandomId = function() {
        return Math.random().toString(36).substring(7);
    };


    wdqsgui.init = function() {

        //tab panel contains tabs and panes
        $tabPanel = $('<div>', {
            role: 'tabpanel'
        }).appendTo(wdqsgui.wrapperElement);

        //init tabs
        $tabsParent = $('<ul>', {
            class: 'nav nav-tabs mainTabs',
            role: 'tablist'
        }).appendTo($tabPanel);
        wdqsgui.$tabsParent = $tabsParent;

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
        wdqsgui.$tabPanesParent = $('<div>', {
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
            wdqsgui.once('ready', function() {
                if (persistentOptions.tabs[tabId].yasr.outputSettings) {
                    var plugin = wdqsgui.current().yasr.plugins[persistentOptions.tabs[tabId].yasr.output];
                    if (plugin.options) {
                        $.extend(plugin.options, persistentOptions.tabs[tabId].yasr.outputSettings);
                    }
                    delete persistentOptions.tabs[tabId]['yasr']['outputSettings'];
                }

                wdqsgui.current().query();
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
                wdqsgui.store();
            }

        });

        //Add context menu
        $contextMenu = $('<div>', {
            class: 'tabDropDown'
        }).appendTo(wdqsgui.wrapperElement);
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
        return wdqsgui.current();
    };

    wdqsgui.selectTab = selectTab;
    var closeTab = function(id) {
        /**
         * cleanup local storage
         */
        wdqsgui.tabs[id].destroy();

        /**cleanup variables**/
        delete wdqsgui.tabs[id];
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


        wdqsgui.store();
        return wdqsgui.current();
    };
    wdqsgui.closeTab = closeTab;
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
        if (wdqsgui.current() && wdqsgui.current().getEndpoint()) {
            endpoint = wdqsgui.current().getEndpoint();
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
                wdqsgui.tabs[tabId].yasqe.refresh();
            })
            .on('shown.bs.tab', function(e) {
                persistentOptions.selected = $(this).attr('aria-controls');
                wdqsgui.tabs[tabId].onShow();
                wdqsgui.store();
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
            wdqsgui.store();
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
        wdqsgui.tabs[tabId] = require('./tab.js')(wdqsgui, tabId, name, endpoint);
        if (newItem || persistentOptions.selected == tabId) {
            wdqsgui.tabs[tabId].beforeShow();
            $tabToggle.tab('show');
        }
        return wdqsgui.tabs[tabId];
    };


    wdqsgui.current = function() {
        return wdqsgui.tabs[persistentOptions.selected];
    };
    wdqsgui.addTab = addTab;

    wdqsgui.init();
    wdqsgui.tracker = require('./tracker.js')(wdqsgui);
    wdqsgui.emit('ready');

    return wdqsgui;
};




WDQSGUI.prototype = new EventEmitter;

module.exports = function(parent, options) {
    //new App($('.wdqs-gui'), CodeMirror, Editor, Sparql, QuerySamples, Tooltip,
       // QueryExampleDialog, RdfNamespaces, Vis, Explorer);
    return new WDQSGUI(parent, options);
};

module.exports.$ = $;
module.exports.WDQSQE = require('./wdqsqe.js');
module.exports.WDQSR = require('./wdqsr.js');
module.exports.defaults = require('./defaults.js');

var Vis = require('vis');
require('bootstrap');
var Explorer = require('wdqs-explorer');
//var CodeMirror = require('codemirror');
//var Tooltip = require('./codemirror/addon/tooltip/wikibaseRDFTooltip.js');
//var Editor = require('./editor.js');
var QueryExampleDialog = require('./queryExampleDialog.js');
var Sparql = require('./api/sparqlApi.js');
var QuerySamples = require('./api/querySamples.js');
var RdfNamespaces = require('./rdfNamespaces.js');
//var App = require('./app.js');



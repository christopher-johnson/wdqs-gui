'use strict';

var $ = require('jquery');
module.exports = {
    persistencyPrefix: function(wdqsui) {
        return "wdqsui_" + $(wdqsui.wrapperElement).closest('[id]').attr('id') + "_";
    },
    allowEditorResize: true,
    api: {
        corsProxy: "/proxy/",
        urlShortener: "/shorten",
        collections: "/collections"
    },
    tracker: {
        googleAnalyticsId: null,
        askConsent: true,
    },

    catalogueEndpoints: [{"endpoint":"http://wdm-rdf.wmflabs.org/bigdata/sparql","title":"WDQS Test"},{"endpoint":"https://query.wikidata.org/sparql","title":"WDQS Production"}]
};

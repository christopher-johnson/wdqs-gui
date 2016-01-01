'use strict';

module.exports = function ($, vis) {
  var id = function (x) {
    return x;
  };

  var future = function(f) {
    return {
      apply: function (k) {
        if (k === undefined) {
          return f(id);
        } else {
          return f(k);
        }
      },
      map: function (g) {
        return future (function (k) {
          return f(function (x) {
            return k(g(x));
          });
        });
      },
      flatMap: function (g) {
        return future (function (k) {
          return f(function (x) {
            return g(x).apply(k);
          });
        });
      },
      sequence: function (f2) {
        var x1 = null;
        var x2 = null;
        return future(function (k) {
          f(function (x) {
            x1 = x;
            if (x2 !== null) {
              k([x1, x2]);
            }
          });
          f2.apply(function (x) {
            x2 = x;
            if (x1 !== null) {
              k([x1, x2]);
            }
          });
        });
      }
    };
  };

  vis.wdqsQuery = function (query) {
    return future(function (k) {
      $.ajax({
        url: 'https://query.wikidata.org/bigdata/namespace/wdq/sparql',
        data: { query: query },
        dataType: 'json',
        success: function (x) { return k(x.results.bindings); }
      });
    });
  };

  vis.wdqsGetIncomingLinks = function (uri) {
    return vis.wdqsQuery(
      'SELECT ?o ?ol ?p ?pl WHERE {' +
      '  ?o ?p ' + uri + ' .' +
      '  ?o <http://www.w3.org/2000/01/rdf-schema#label> ?ol .' +
      '  FILTER ( LANG(?ol) = "en" )' +
      '  ?ps <http://wikiba.se/ontology#directClaim> ?p .' +
      '  ?ps rdfs:label ?pl .' +
      '  FILTER ( LANG(?pl) = "en" )' +
      '} LIMIT 50'
    );
  };

  vis.wdqsGetIncomingLinksById = function (qid) {
    return vis.wdqsGetIncomingLinks('<http://www.wikidata.org/entity/' + qid + '>');
  };

  vis.wdqsGetOutgoingLinks = function (uri) {
    return vis.wdqsQuery(
      'SELECT ?p ?pl ?o ?ol WHERE {' +
      '  ' + uri + ' ?p ?o .' +
      '  ?o <http://www.w3.org/2000/01/rdf-schema#label> ?ol .' +
      '  FILTER ( LANG(?ol) = "en" )' +
      '  ?s <http://wikiba.se/ontology#directClaim> ?p .' +
      '  ?s rdfs:label ?pl .' +
      '  FILTER ( LANG(?pl) = "en" )' +
      '} LIMIT 50'
    );
  };

  vis.wdqsGetOutgoingLinksById = function (qid) {
    return vis.wdqsGetOutgoingLinks('<http://www.wikidata.org/entity/' + qid + '>');
  };

  vis.wdqsGetLabel = function (uri) {
    return vis.wdqsQuery(
      'SELECT ?sl WHERE {' +
      '  ' + uri + ' <http://www.w3.org/2000/01/rdf-schema#label> ?sl .' +
      '  FILTER ( LANG(?sl) = "en" )' +
      '} LIMIT 1'
    );
  };

  vis.wdqsGetLabelById = function (qid) {
    return vis.wdqsGetLabel('<http://www.wikidata.org/entity/' + qid + '>').map(
      function (bindings) {
        if (bindings.length === 1 &&
            bindings[0].sl &&
            bindings[0].sl.value) {
          return bindings[0].sl.value;
        } else {
          return '(unlabeled)';
        }
      }
    );
  };

};


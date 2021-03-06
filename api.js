// --- api.js
// A simple API for Australian LGA statistics
var api = function() {
  var express = require('express');
  var fs = require('fs');
  var _ = require('underscore');

  var app = express();
  var config = {
    dataDir: __dirname + '/data/'
  };

  var getStateFromCode = function(code) {
    var map = [
      { state_code: 1, abbr: "NSW", name: "New South Wales" },
      { state_code: 2, abbr: "VIC", name: "Victoria" },
      { state_code: 3, abbr: "QLD", name: "Queensland" },
      { state_code: 4, abbr: "SA", name: "South Australia" },
      { state_code: 5, abbr: "WA", name: "Western Australia" },
      { state_code: 6, abbr: "TAS", name: "Tasmania" },
      { state_code: 7, abbr: "NT", name: "Northen Territory" },
      { state_code: 8, abrr: "ACT", name: "Australian Capital Territory" },
      { state_code: 9, abbr: "OTH", name: "Other Territories" }
    ];

    return map.filter(function(el) { return el.state_code == +code; })[0];
  };

  var ausLgaGeoData = JSON.parse(fs.readFileSync(config.dataDir + 'aus_lga.json', 'utf8'));
  var ausLgaPopulationData = JSON.parse(fs.readFileSync(config.dataDir + 'aus_lga_pop.json', 'utf8'));
  var ausLgaSeifaData = JSON.parse(fs.readFileSync(config.dataDir + 'aus_lga_seifa.json', 'utf8'));
  var ausLgaIndigenousData = JSON.parse(fs.readFileSync(config.dataDir + 'nsw_a_tsi.json', 'utf8'));

  // -- Data Munging
  _.each(ausLgaGeoData.features, function(lga) {
    var lgaItem = lga.properties;

    // create better property names
    lgaItem.lga_data = {
      id: lgaItem.LGA_CODE11,
      name: lgaItem.LGA_NAME11
    };
    
    lgaItem.state_data = getStateFromCode(lgaItem.STATE_CODE);
    
    // remove old property names
    delete lgaItem.STATE_CODE;
    delete lgaItem.LGA_CODE11;
    delete lgaItem.LGA_NAME11;

    // mung the population data into lga.features.properties
    var lgaId = lgaItem.lga_data.id;
    var lgaName = lgaItem.lga_data.name;
    var isLGA = function(obj) { return +obj.id === +lgaId; };

    _.each(ausLgaPopulationData, function(outer) {
      // outer is an array of objects
      var result = outer.filter(isLGA);
      if( result.length === 1 ) {
        lgaItem.population_data = result[0];
      }
    });

    // SEIFA data is indexed by lga_id so nice and easy to retrieve
    lgaItem.seifa_data = ausLgaSeifaData.filter(function(item) { return item.lga_id === lgaId; })[0];

    // Aboriginal and TSI peoples data
    _.each(ausLgaIndigenousData, function(item) {
      var dataItem = item.filter(function(i) {
        if( i.lga_name.trim() === lgaName ) {

          // 'String' wont fucking trim...
          _.each(i, function(prop) {
            prop.toString().replace(' ',"").trim();
          });

          return _.extend(i, {lga_id: lgaId});
        }
      });

      if( dataItem )
        lgaItem.indigenous_data = dataItem;
    });
  });

  return {
    listen: function() {
        app.get('/', function(req, res) {
        res.type('text/html');
        res.sendfile(__dirname + '/index.html');
      });

      // --- Serve the API
      app.get('/lga', function(req, res) {
        res.type('application/json');
        res.json(ausLgaGeoData);
      });

      console.log('Listening on :' + config.port);
      app.listen(config.port);
    }
  }
};

module.exports.api = api;

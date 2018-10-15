// This isn't necessary but it keeps the editor from thinking L is a typo
/* global L, Mustache, d3, turf, mapboxgl, topojson */
// prints "hi" in the browser's dev tools console
console.log('hi');

var southWest = L.latLng(40.695705, -74.041629),
northEast = L.latLng(40.720559, -73.993993);
var bounds = L.latLngBounds(southWest, northEast);

var mapOpt = { maxBoundsViscosity: 1 };

var map = L.map('map', mapOpt).setView([40.70967, -74.009], 14);
map.setMaxBounds(bounds);

var tileUrl = 'https://api.mapbox.com/styles/v1/dcook55/cjn1zk13w6h3m2rpqc0n933h2/tiles/256/{z}/{x}/{y}@2x?access_token=pk.eyJ1IjoiZGNvb2s1NSIsImEiOiJjamd6ODh3c2MwMWI2MnFteHI5b2QycjZ5In0.JpZCxOHsG_87QnrbaujA8g';
var tileOpt = { maxZoom: 20,
              minZoom:14 };

// Add base layer
L.tileLayer(tileUrl, tileOpt).addTo(map);
// other base map options:
// stamen: 'https://stamen-tiles.a.ssl.fastly.net/toner/{z}/{x}/{y}.png'
// hillshade: 'http://c.tiles.wmflabs.org/hillshading/{z}/{x}/{y}.png'
// osm bw: 'https://tiles.wmflabs.org/bw-mapnik/{z}/{x}/{y}.png'
// watercolor: 'http://c.tile.stamen.com/watercolor/{z}/{x}/{y}.jpg'
// carto light: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/light_all/{z}/{x}/{y}.png'
// carto dark: 'https://cartodb-basemaps-{s}.global.ssl.fastly.net/dark_all/{z}/{x}/{y}.png'

var dataUrl = "https://cdn.glitch.com/1a383ac1-2053-4930-a437-54c8589bfa60%2Fbpc_trees_2018_10-5.geojson?1538762340858";
var getResp = (response) => response.json();
// var getData = (data) => L.geoJson(data).addTo(map);

// Mustache popup template
var popupTemplate = document.querySelector('.popup-template').innerHTML;
var popupTemplate2 = document.querySelector('.popup-template2').innerHTML;

var treeData = L.geoJson();

function loadTrees(){
  // getting the data, styling it, putting it into marker clusters
  fetch(dataUrl)
    .then(getResp)
    .then(function (data) {
      // Create the Leaflet layer for the data 
      // https://leafletjs.com/reference-1.3.4.html#circlemarker
      treeData = L.geoJson(data, {
          // https://leafletjs.com/examples/geojson/
          pointToLayer: function(geoJSONpoint, latlng) {
            return L.circleMarker(latlng);
          },
          style: function(geoJSONpoint) {
            return {
              color: '',
              fillColor: '#21ff00',
              fillOpacity: .5,
              radius:3,
            };
          },
          onEachFeature: function(feature, layer){
              layer.bindPopup(function (layer) {
                return Mustache.render(popupTemplate, layer.feature.properties);
              });
              layer.on({
                //mouseover: highlightFeature,
                mouseover: highlightSameSpecies,
                mouseout: resetHighlight
              });
          },
        },
      );
      // Uncomment this to see all properties on the clicked feature:
      // console.log(layer.feature.properties);
      // Add marker clusters
      // https://github.com/Leaflet/Leaflet.markercluster
      var markers = L.markerClusterGroup({
        spiderfyOnMaxZoom: false,
        showCoverageOnHover: false,
        disableClusteringAtZoom: 15,
      });
      markers.addLayer(treeData);
      map.addLayer(markers);
  });
};

loadTrees();

var parkLayer = L.geoJson();

function loadParkCounts() {
// counting tree points in park areas using Turf

  var parksFetch = fetch('https://cdn.glitch.com/cc0f34e9-df91-4e1d-bd55-1ddfb2bc0af7%2Fbpc_park_shapes.geojson?1539178612661')
    .then(function (response) {
        // Read data as JSON
        return response.json();
    });
  var treesFetch = fetch('https://cdn.glitch.com/1a383ac1-2053-4930-a437-54c8589bfa60%2Fbpc_trees_2018_10-5.geojson?1538762340858')
    .then(function (response) {
        // Read data as JSON
        return response.json();
    });
  Promise.all([parksFetch, treesFetch])
    .then(function (fetchedData) {
        // Unpack the data from the Promise
        var treesData = fetchedData[1];
        var parksData = fetchedData[0];
        turf.featureEach(parksData, function (park) {
              var treesInPark = turf.pointsWithinPolygon(treesData, park);
              var treesCount = treesInPark.features.length;
              park.properties.treesCount = treesCount;
        });
      var myStyle = {
        "weight": 0,
        "opacity": .2,
        "fillOpacity": .2
      };
      parkLayer = L.geoJson(parksData, {
          style: myStyle,
          onEachFeature: function(feature, layer){
              layer.bindPopup(function (layer) {
              return Mustache.render(popupTemplate2, layer.feature.properties);
            })
          }
      });
      //parkLayer.bindPopup(function (layer) {
        //console.log(layer.feature.properties.treesCount);
        //return layer.feature.properties.treesCount;
      //});
      parkLayer.addTo(map);
    });
};

//event listeners to load and clear park area layer

document.querySelector('.load-data-trees').addEventListener('click', function () {
  parkLayer.clearLayers();
});

document.querySelector('.load-data-parks').addEventListener('click', function () {
  parkLayer.clearLayers();
  loadParkCounts();
});

//functions and event listeners to highlight trees of the same species as what is clicked

function resetHighlight(e) {
    treeData.eachLayer(function (layer) {
      treeData.resetStyle(layer);
    })
};

var highlightTree = {
    color: '',
    fillColor: '#fff300',
    fillOpacity: .8,
    radius:4,
};

function highlightFeature(e) {
    // treeData.setStyle(e.target, highlightTree);
    //console.log(e.target.setStyle(highlightTree));
    e.target.setStyle(highlightTree)
};

function highlightSameSpecies(e) {
  // console.log(e.target.feature.properties.scientific);  
  treeData.eachLayer(function (layer) {
      if (layer.feature.properties.scientific == e.target.feature.properties.scientific) {
        layer.setStyle(highlightTree);
      }
    })
};



/*

// highlighting for just one point:

function resetHighlight(e) {
    treeData.resetStyle(e.target);
};


function highlightFeature(e) {
    // treeData.setStyle(e.target, highlightTree);
    //console.log(e.target.setStyle(highlightTree));
    e.target.setStyle(highlightTree)
};

function highlightSameSpecies(name) {
    map._layers[name].setStyle(highlightTree);
};
*/
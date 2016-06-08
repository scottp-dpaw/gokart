"use strict";
window.gokart = window.gokart || {};

(function(self) {

    // default matrix from KMI
    var _matrixSets = {
        "EPSG:4326" : {
            "1024":{
                "name":"gda94",
                "resolutions" : [ .17578125, .087890625, .0439453125, .02197265625, .010986328125, .0054931640625, .00274658203125, .001373291015625, .0006866455078125, .0003433227539062, .0001716613769531, 858306884766e-16, 429153442383e-16, 214576721191e-16, 107288360596e-16, 53644180298e-16, 26822090149e-16, 13411045074e-16 ],
                "minLevel" : 0,
                "maxLevel" : 17,
            }
        },
    };

    // generate matrix IDs from name and level number
    $.each(_matrixSets,function(projection,innerMatrixSets){
        $.each(innerMatrixSets,function(tileSize,matrixSet){
            var matrixIds = new Array(matrixSet.maxLevel - matrixSet.minLevel + 1);
            for (var z = matrixSet.minLevel; z <= matrixSet.maxLevel; ++z) {
                matrixIds[z] =  matrixSet.name + ":" + z;
            }
            matrixSet.matrixIds = matrixIds;
        });
    });


    self.defaultLayer = {
        opacity: 100,
        name: "dpaw:mapbox_outdoors",
        format: "image/jpeg",
        tileSize: 1024,
        projection: "EPSG:4326",
        wmts_url: "https://kmi.dpaw.wa.gov.au/geoserver/gwc/service/wmts",
    };

    // Convenience loader to create a WMTS layer from a kmi datasource
    self.create_tile_layer = function(layer) {
        layer = layer || {};
        layer = $.extend({}, self.defaultLayer, layer);

        var matrixSet =  _matrixSets[layer.projection][layer.tileSize];
        var tileLayer = new ol.layer.Tile({
            opacity: (layer.opacity || 100) / 100,
            source: new ol.source.WMTS({
                url: layer.wmts_url,
                crossOrigin: 'https://' + window.location.hostname,
                layer: layer.name,
                matrixSet: matrixSet.name,
                format: layer.format,
                projection: layer.projection,
                wrapX: true,
                tileGrid: new ol.tilegrid.WMTS({
                    origin: ol.extent.getTopLeft([ -180, -90, 180, 90 ]),
                    resolutions: matrixSet.resolutions,
                    matrixIds: matrixSet.matrixIds,
                    tileSize: layer.tileSize
                })
            })
        });
        return tileLayer;
    };

    self.init = function() {
        self.map = new ol.Map({
            logo: false,
            renderer: "canvas",
            target: "map",
            layers: [
                self.create_tile_layer({
                    'name': 'dpaw:mapbox_outdoors'
                }),
                self.create_tile_layer({
                    'name': 'cddp:dpaw_regions',
                    'format': 'image/png'
                }), 
            ],
            view: new ol.View({
                projection: "EPSG:4326",
                center: [ 123.75, -24.966 ],
                zoom: 5,
                maxZoom: 21,
                minZoom: 3
            }),
            controls: [
                new ol.control.Zoom(),
                new ol.control.ScaleLine(),
                new ol.control.MousePosition({
                    projection: "EPSG:4326",
                    coordinateFormat: function(coord) {
                        return ol.coordinate.toStringHDMS(coord);
                    }
                }),
            ]
        });
    };
})(window.gokart);

"use strict";
window.gokart = (function(self) {
    var $self = $(self)

    // default matrix from KMI
    var _matrixSets = {
        "EPSG:4326": {
            "1024": {
                "name": "gda94",
                "resolutions": [.17578125, .087890625, .0439453125, .02197265625, .010986328125, .0054931640625, .00274658203125, .001373291015625, .0006866455078125, .0003433227539062, .0001716613769531, 858306884766e-16, 429153442383e-16, 214576721191e-16, 107288360596e-16, 53644180298e-16, 26822090149e-16, 13411045074e-16],
                "minLevel": 0,
                "maxLevel": 17,
            }
        },
    };

    // generate matrix IDs from name and level number
    $.each(_matrixSets, function(projection, innerMatrixSets) {
        $.each(innerMatrixSets, function(tileSize, matrixSet) {
            var matrixIds = new Array(matrixSet.maxLevel - matrixSet.minLevel + 1);
            for (var z = matrixSet.minLevel; z <= matrixSet.maxLevel; ++z) {
                matrixIds[z] = matrixSet.name + ":" + z;
            }
            matrixSet.matrixIds = matrixIds;
        });
    });

    self.defaultLayer = {
        opacity: 100,
        name: "MapBox Outdoors",
        id: "dpaw:mapbox_outdoors",
        format: "image/jpeg",
        tileSize: 1024,
        projection: "EPSG:4326",
        wmts_url: "https://kmi.dpaw.wa.gov.au/geoserver/gwc/service/wmts",
    };

    // Convenience loader to create a WMTS layer from a kmi datasource
    self.createTileLayer = function(layer) {
        layer = layer || {};
        layer = $.extend({}, self.defaultLayer, layer);

        var matrixSet = _matrixSets[layer.projection][layer.tileSize];
        var tileLayer = new ol.layer.Tile({
            opacity: (layer.opacity || 100) / 100,
            source: new ol.source.WMTS({
                url: layer.wmts_url,
                crossOrigin: 'https://' + window.location.hostname,
                layer: layer.id,
                matrixSet: matrixSet.name,
                format: layer.format,
                projection: layer.projection,
                wrapX: true,
                tileGrid: new ol.tilegrid.WMTS({
                    origin: ol.extent.getTopLeft([-180, -90, 180, 90]),
                    resolutions: matrixSet.resolutions,
                    matrixIds: matrixSet.matrixIds,
                    tileSize: layer.tileSize
                })
            })
        });
        // set properties for use in layer selector
        tileLayer.set("name", layer.name);
        tileLayer.set("id", layer.id);
        return tileLayer;
    };

    self.layerById = function(id) {
        return $.grep(self.map.getLayers().getArray(), function(layer) {
            return layer.get("id") == id;
        })[0];
    }

    //supported fixed scales
    self.fixed_scales = [1000, 2000, 2500, 5000, 10000, 20000, 25000, 50000, 80000, 100000, 125000, 250000, 500000, 1000000, 2000000, 3000000, 5000000, 10000000, 25000000];

    //set scale, in meters
    self.set_scale = function(scale) {
        var size = self.map.getSize();
        if (size[0] > size[1]) {
            var bigsize = size[0]
        } else {
            var bigsize = size[1]
        }
        var width = bigsize / self.px_per_mm;
        var distance = scale * width / 1000 / 2 / 1000; //in kilometers
        var center = self.map.getView().getCenter();
        var extent = turf.extent(turf.buffer(turf.point(center), distance, 'kilometers'));
        self.map.setSize([bigsize, bigsize])
        self.map.getView().setResolution(self.map.getView().getResolutionForExtent(extent, self.map.getSize()));
        self.map.setSize(size)
    }

    //return the scale, in meters
    self.get_scale = function() {
        var center = self.map.getView().getCenter();
        var size = self.map.getSize();
        var width = size[0] / self.px_per_mm;
        var extent = self.map.getView().calculateExtent(size);
        var distance = turf.distance(turf.point([extent[0], center[1]]), turf.point(center), 'kilometers') * 2;
        return distance * 1000 * 1000 / width;
    }


    //get a fixed scale which is not smaller than the current scale.
    //but if scale is too small, use the smallest scale
    self.get_fixed_scale = function() {
        var scale = self.get_scale();
        var clampedScale = 1000;
        $.each(self.fixed_scales, function(index, value) {
            if (value > scale) {
                clampedScale = value;
                return false;
            }
        });
        return clampedScale;
    };

    //return scale string
    self.get_scale_text = function(scale) {
        var scale = Math.round(scale);
        if (scale < 1000) {
            return "1:" + numeral(scale).format('0,0') + "m";
        } else {
            scale = Math.round(scale / 10) / 100;
            return "1:" + numeral(scale).format('0,0') + "km";
        }
    }

    // initialise map
    self.init = function(layers) {
        self.map = new ol.Map({
            logo: false,
            renderer: "canvas",
            target: "map",
            layers: layers,
            view: new ol.View({
                projection: "EPSG:4326",
                center: [123.75, -24.966],
                zoom: 5,
                maxZoom: 21,
                minZoom: 5
            }),
            controls: [
                new ol.control.Zoom(),
                new ol.control.ScaleLine(),
                new ol.control.FullScreen(),
                new ol.control.MousePosition({
                    projection: "EPSG:4326",
                    coordinateFormat: function(coord) {
                        return ol.coordinate.toStringHDMS(coord);
                    }
                }),
            ]
        });
        // calculate screen res
        $("body").append('<div id="px_per_mm" style="width:1mm;display:none"></div>');
        self.px_per_mm = parseFloat($('#px_per_mm').width());
        $("#px_per_mm").remove();
        // Create the graticule component
        self.graticule = new ol.Graticule({
            showLabels: true,
            lonLabelFormatter: function(lon) {
                var formattedLon = Math.abs(Math.round(lon * 100) / 100);
                formattedLon += (lon < 0) ? 'W' : ((lon > 0) ? 'E' : '');
                return formattedLon;
            },
            lonLabelPosition: 0.02,
            latLabelFormatter: function(lat) {
                var formattedLat = Math.abs(Math.round(lat * 100) / 100);
                formattedLat += (lat < 0) ? 'S' : ((lat > 0) ? 'N' : '');
                return formattedLat;
            },
            latLabelPosition: 0.98
        });
        self.graticule.setMap(self.map);
        $self.trigger("init_map");
    };
    return self;
})(window.gokart || {});

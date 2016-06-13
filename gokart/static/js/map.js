"use strict";
window.gokart = (function(self) {
    var $self = $(self)

    // calculate screen res
    self.mmPerInch = 25.4;
    $("body").append('<div id="dpi" style="width:1in;display:none"></div>');
    self.dpi = parseFloat($('#dpi').width());
    self.dpmm = self.dpi / self.mmPerInch;
    $("#dpi").remove();

    // get user info
    $.get("/auth", function(data) {
        self.whoami = JSON.parse(data);
    });

    // default matrix from KMI
    self.resolutions = [.17578125, .087890625, .0439453125, .02197265625, .010986328125, .0054931640625, .00274658203125, .001373291015625, .0006866455078125, .0003433227539062, .0001716613769531, 858306884766e-16, 429153442383e-16, 214576721191e-16, 107288360596e-16, 53644180298e-16, 26822090149e-16, 13411045074e-16]

    var _matrixSets = {
        "EPSG:4326": {
            "1024": {
                "name": "gda94",
                "resolutions": self.resolutions,
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

    self.createWFSLayer = function(options) {
        var url = "/geoserver/wfs"
        options.params = $.extend({
            version: "1.1.0",
            service: "WFS",
            request: "GetFeature",
            outputFormat: "application/json",
            srsname: "EPSG:4326",
            typename: options.id,
        }, options.params || {})
        var vectorSource = new ol.source.Vector({
            format: new ol.format.GeoJSON(),
            url: function(extent) { return url + "?" + $.param(options.params) + "&bbox=" + extent.join(",") + "," + options.params.srsname },
            strategy: ol.loadingstrategy.bbox
        });
        var vector = new ol.layer.Vector({
            source: vectorSource,
            style: options.style
        });
        vector.set("name", options.name);
        vector.set("id", options.id);
        return vector;
    }

    // Convenience loader to create a WMTS layer from a kmi datasource
    self.createTileLayer = function(layer) {
        layer = layer || {};
        layer = $.extend({
            opacity: 100,
            name: "MapBox Outdoors",
            id: "dpaw:mapbox_outdoors",
            format: "image/jpeg",
            tileSize: 1024,
            projection: "EPSG:4326",
            wmts_url: "/geoserver/gwc/service/wmts",
        }, layer);

        var matrixSet = _matrixSets[layer.projection][layer.tileSize];
        var tileGrid = new ol.tilegrid.WMTS({
            origin: ol.extent.getTopLeft([-180, -90, 180, 90]),
            resolutions: matrixSet.resolutions,
            matrixIds: matrixSet.matrixIds,
            tileSize: layer.tileSize
        });
        // Make grids pick nicer zoom levels for client zooming
        tileGrid.origGetZForResolution = tileGrid.getZForResolution;
        tileGrid.getZForResolution = function(resolution, opt_direction) {
            return tileGrid.origGetZForResolution(resolution, -1);
        };
        // allow for reconstructing unique layers to bust caching for live tiles
        if (layer.time) {
            var url = layer.wmts_url + "?time="+ layer.time;
        } else { var url = layer.wmts_url };
        var tileLayer = new ol.layer.Tile({
            opacity: (layer.opacity || 100) / 100,
            source: new ol.source.WMTS({
                url: url,
                crossOrigin: 'https://' + window.location.hostname,
                layer: layer.id,
                matrixSet: matrixSet.name,
                format: layer.format,
                projection: layer.projection,
                wrapX: true,
                tileGrid: tileGrid
            })
        });
        // set properties for use in layer selector
        tileLayer.set("name", layer.name);
        tileLayer.set("id", layer.id);
        return tileLayer;
    };

    self.layerById = function(id) {
        return self.map.getLayers().getArray().find(function(layer) {
            return layer.get("id") == id;
        });
    }

    //supported fixed scales
    self.fixed_scales = [.25, .5, 1, 2, 2.5, 5, 10, 20, 25, 50, 80, 100, 125, 250, 500, 1000, 2000, 3000, 5000, 10000, 25000];

    //set scale 000's, in meters
    self.set_scale = function(scale) {
        while (Math.abs(self.get_scale() - scale) > 0.001) {
            self.map.getView().setResolution(self.map.getView().getResolution() * scale / self.get_scale());
        }
    }

    //return the scale 000's, in meters
    self.get_scale = function() {
        var size = self.map.getSize();
        var center = self.map.getView().getCenter();
        var extent = self.map.getView().calculateExtent(size);
        var distance = turf.distance(turf.point([extent[0], center[1]]), turf.point(center), 'kilometers') * 2;
        return distance * 1000 * self.dpmm / size[0] ;
    }

    self.getScaleString = function() {
        return "1:" + (Math.round(self.get_scale() * 100) / 100).toLocaleString() + "K";
    }


    //get a fixed scale 000's closest to current scale.
    self.get_fixed_scale = function() {
        var scale = self.get_scale();
        var closest = null;
        $.each(self.fixed_scales, function() {
            if (closest == null || Math.abs(this - scale) < Math.abs(closest - scale)) {
                closest = this;
            }
        });
        return closest;
    };

    // initialise map
    self.init = function(layers) {
        self.map = new ol.Map({
            logo: false,
            renderer: "canvas",
            target: "map",
            layers: layers.reverse(),
            view: new ol.View({
                projection: "EPSG:4326",
                center: [123.75, -24.966],
                zoom: 6,
                maxZoom: 21,
                minZoom: 5
            }),
            controls: [
                new ol.control.Zoom(),
                new ol.control.ScaleLine(),
                new ol.control.FullScreen({source: $("body").get(0)})
            ]
        });
        // Create the graticule component
        self.graticule = new ol.LabelGraticule();
        self.graticule.setMap(self.map);
        $self.trigger("init_map");
    };
    return self;
})(window.gokart || {});

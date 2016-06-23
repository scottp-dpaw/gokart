"use strict";
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
    var timeout;
    return function() {
        var context = this, args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
};

window.gokart = (function(self) {
    var $self = $(self)

    // method to precache SVGs as raster (PNGs)
    // workaround for Firefox missing the SurfaceCache when blitting to canvas
    self.pngs = {}
    self.svgToPNG = function(url) {
        if (self.pngs[url]) { return self.pngs[url] };
        var canvas = $("<canvas>").get(0);
        var ctx = canvas.getContext("2d");
        var img = new Image()
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(function(blob) {
                self.pngs[url] = URL.createObjectURL(blob);
            }, 'image/png');
        }
        img.src = url;
        return url;
    }
    
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

    // overridable defaults for WMTS and WFS loading
    // (these default paths are handled by a reverse proxy in front of the app)
    self.defaultWMTSSrc = "/geoserver/gwc/service/wmts";
    self.defaultWFSSrc = "/geoserver/wfs";

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

    // loader for layers with a "time" axis, e.g. live satellite imagery
    self.createTimelineLayer = function() {
        var options = this;
        options.params = $.extend({
            FORMAT: "image/jpeg",
            SRS: "EPSG:4326",
        }, options.params || {});
        
        // technically, we can specify a WMS source and a layer without
        // either the source URL or the layerID. which is good, because
        // we need to do that later on in a callback.
        var tileSource = new ol.source.TileWMS({
            params: options.params,
            tileGrid: new ol.tilegrid.TileGrid({
                extent: [-180, -90, 180, 90],
                resolutions: self.resolutions,
                tileSize: [1024, 1024]
            })
        });
    
        var tileLayer = new ol.layer.Tile({
            opacity: options.opacity || 1,
            source: tileSource
        });

        tileLayer.on("propertychange", function(event) {
            if (event.key == "timeIndex") {
                tileSource.updateParams({
                    "layers": options.timeline[event.target.get(event.key)][1]
                });
            }
        });
       
        // helper function to update the time index
        options.updateTimeline = function() {
            // fetch the latest timestamp-to-layerID map from the source URL
            $.getJSON(options.source, function(data) {
                tileLayer.set("updated", moment().toLocaleString());
                tileSource.setUrls(data["servers"]);
                options.timeline = data["layers"].reverse();
                tileLayer.set("timeIndex", options.timeIndex || options.timeline.length-1);
                self.ui.layers.update();
            });
        };

        options.updateTimeline();
        // if the "refresh" option is set, set a timer
        // to update the source
        if (options.refresh) {
            tileLayer.refresh = setInterval(function() {
                options.updateTimeline();
            }, options.refresh*1000);
        };

        // set properties for use in layer selector
        tileLayer.set("name", options.name);
        tileLayer.set("id", options.id);
        this.olLayer = tileLayer;
        this.toggled = true;
        tileLayer.set("catalogueEntry", this);
        return tileLayer;
    }
    

    // loader for vector layers with hover querying
    self.createWFSLayer = function() {
        var options = this;
        var url = self.defaultWFSSrc;
        // default overridable params sent to the WFS source
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
            url: function() {
                if (options.cql_filter) {
                    options.params.cql_filter = options.cql_filter 
                } else if (options.params.cql_filter) {
                    delete options.params.cql_filter
                }
                return url + "?" + $.param(options.params);
            }
        });

        // bind vue template (specified in options) to update
        // whenever OL3 fires the "addfeature" event
        var vueTemplate = options.vueTemplate || 'default';
        vectorSource.on("addfeature", function(event) {
            event.feature.set("vueTemplate", vueTemplate);
            if (options.onadd) { options.onadd(event.feature) };
        });

        var vector = new ol.layer.Vector({
            opacity: options.opacity || 1,
            source: vectorSource,
            style: options.style
        });

        // if the "refresh" option is set, set a timer
        // to update the source
        if (options.refresh) {
            vector.set("updated", moment().toLocaleString())
            vectorSource.refresh = setInterval(function() {
                vector.set("updated", moment().toLocaleString());
                vectorSource.clear();
            }, options.refresh * 1000)
        };

        vector.set("name", options.name);
        vector.set("id", options.id);
        this.olLayer = vector;
        this.toggled = true;
        vector.set("catalogueEntry", this);
        return vector;
    }

    // loader to create a WMTS layer from a kmi datasource
    self.createTileLayer = function() {
        var layer = this;
        layer = $.extend({
            opacity: 1,
            name: "Mapbox Outdoors",
            id: "dpaw:mapbox_outdoors",
            format: "image/jpeg",
            tileSize: 1024,
            projection: "EPSG:4326",
            wmts_url: self.defaultWMTSSrc,
        }, layer);

        // create a tile grid using the stock KMI resolutions
        var matrixSet = _matrixSets[layer.projection][layer.tileSize];
        var tileGrid = new ol.tilegrid.WMTS({
            origin: ol.extent.getTopLeft([-180, -90, 180, 90]),
            resolutions: matrixSet.resolutions,
            matrixIds: matrixSet.matrixIds,
            tileSize: layer.tileSize
        });

        // override getZForResolution on tile grid object;
        // for weird zoom levels, the default is to round up or down to the 
        // nearest integer to determine which tiles to use. 
        // because we want the printing rasters to contain as much detail as 
        // possible, we rig it here to always round up.
        tileGrid.origGetZForResolution = tileGrid.getZForResolution;
        tileGrid.getZForResolution = function(resolution, opt_direction) {
            return tileGrid.origGetZForResolution(resolution, -1);
        };

        // helper function to create a tile source
        var tileSource = function(url) {
            return new ol.source.WMTS({
                url: url,
                layer: layer.id,
                matrixSet: matrixSet.name,
                format: layer.format,
                projection: layer.projection,
                wrapX: true,
                tileGrid: tileGrid
            });
        }
        var tileLayer = new ol.layer.Tile({
            opacity: layer.opacity || 1,
            source: tileSource(layer.wmts_url)
        });
        // if the "refresh" option is set, set a timer
        // to force a reload of the tile content
        if (layer.refresh) {
            tileLayer.set("updated", moment().toLocaleString());
            tileLayer.refresh = setInterval(function() {
                tileLayer.set("updated", moment().toLocaleString());
                tileLayer.setSource(tileSource(layer.wmts_url + "?time=" + moment.utc().unix()));
            }, layer.refresh * 1000);
        };
        // set properties for use in layer selector
        tileLayer.set("name", layer.name);
        tileLayer.set("id", layer.id);
        this.olLayer = tileLayer;
        this.toggled = true;
        tileLayer.set("catalogueEntry", this);
        return tileLayer;
    };

    self.layerById = function(id) {
        return self.map.getLayers().getArray().find(function(layer) {
            return layer.get("id") == id;
        });
    }

    // fixed scales for the scale selector (1:1K increments)
    self.fixedScales = [.25, .5, 1, 2, 2.5, 5, 10, 20, 25, 50, 80, 100, 125, 250, 500, 1000, 2000, 3000, 5000, 10000, 25000];

    // force OL to approximate a fixed scale (1:1K increments)
    self.setScale = function(scale) {
        while (Math.abs(self.getScale() - scale) > 0.001) {
            self.map.getView().setResolution(self.map.getView().getResolution() * scale / self.getScale());
        }
    }

    self.wgs84Sphere = new ol.Sphere(6378137);

    // return the scale (1:1K increments)
    self.getScale = function() {
        var size = self.map.getSize();
        var center = self.map.getView().getCenter();
        var extent = self.map.getView().calculateExtent(size);
        var distance = self.wgs84Sphere.haversineDistance([extent[0], center[1]], center) * 2;
        return distance * self.dpmm / size[0] ;
    }

    // get the fixed scale (1:1K increments) closest to current scale
    self.getFixedScale = function() {
        var scale = self.getScale();
        var closest = null;
        $.each(self.fixedScales, function() {
            if (closest == null || Math.abs(this - scale) < Math.abs(closest - scale)) {
                closest = this;
            }
        });
        return closest;
    };

    // generate a human-readable scale string
    self.getScaleString = function(scale) {
        if (scale < 1.0) {
            return "1:" + (Math.round(scale * 100000)/100).toLocaleString();
        } else if (scale >= 1000.0) {
            return "1:" + (Math.round(scale/10)/100).toLocaleString() + "M";
        }
        
        return "1:" + (Math.round(scale * 100) / 100).toLocaleString() + "K";
    };

    // helper to populate the catalogue from a CSW service
    self.loadCatalogue = function(options) {
        options = options || {};
        options.url = options.url || "/catalogue/";
        options.params = $.extend({
            request: "GetRecords",
            service: "CSW",
            version: "2.0.2",
            ElementSetName: "full",
            typeNames: "csw:Record",
            outputFormat: "application/json",
            resultType: "results"
        }, options.params || {});
        var req = new XMLHttpRequest();
        req.onload = function() {
            self.cswCatalogue = JSON.parse(this.responseText);
        };
        req.open("GET", options.url + "?" + $.param(options.params));
        req.send();
    }

    // initialise map
    self.init = function(layers, options) {
        options = options || {};

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
                new ol.control.FullScreen({source: $("body").get(0)}),
                new ol.control.Control({element: $("#map-controls").get(0)})
            ]
        });
        // Create the graticule component
        self.graticule = new ol.LabelGraticule();
        self.graticule.setMap(self.map);

        // alert other components that the map is ready
        $self.trigger("init_map");
    };
    return self;
})(window.gokart || {});

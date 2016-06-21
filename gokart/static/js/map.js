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

    // method to precache SVGs as raster,
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

    // for layers with hover querying
    self.createWFSLayer = function() {
        var options = this;
        var url = self.defaultWFSSrc;
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
        var vueTemplate = this.vueTemplate || 'default';
        vectorSource.on("addfeature", function(event) {
            event.feature.set("vueTemplate", vueTemplate);
            if (options.onadd) { options.onadd(event.feature) };
        });
        var vector = new ol.layer.Vector({
            opacity: options.opacity || 1,
            source: vectorSource,
            style: options.style
        });
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

    // Convenience loader to create a WMTS layer from a kmi datasource
    self.createTileLayer = function() {
        var layer = this;
        layer = $.extend({
            opacity: 1,
            name: "MapBox Outdoors",
            id: "dpaw:mapbox_outdoors",
            format: "image/jpeg",
            tileSize: 1024,
            projection: "EPSG:4326",
            wmts_url: self.defaultWMTSSrc,
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

    //supported fixed scales
    self.fixed_scales = [.25, .5, 1, 2, 2.5, 5, 10, 20, 25, 50, 80, 100, 125, 250, 500, 1000, 2000, 3000, 5000, 10000, 25000];

    //set scale 000's, in meters
    self.set_scale = function(scale) {
        while (Math.abs(self.get_scale() - scale) > 0.001) {
            self.map.getView().setResolution(self.map.getView().getResolution() * scale / self.get_scale());
        }
    }

    self.wgs84Sphere = new ol.Sphere(6378137);

    //return the scale 000's, in meters
    self.get_scale = function() {
        var size = self.map.getSize();
        var center = self.map.getView().getCenter();
        var extent = self.map.getView().calculateExtent(size);
        var distance = self.wgs84Sphere.haversineDistance([extent[0], center[1]], center) * 2;
        return distance * self.dpmm / size[0] ;
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

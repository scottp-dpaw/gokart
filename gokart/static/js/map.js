/* jslint browser: true */
// Returns a function, that, as long as it continues to be invoked, will not
// be triggered. The function will be called after it stops being called for
// N milliseconds. If `immediate` is passed, trigger the function on the
// leading edge, instead of the trailing.
function debounce(func, wait, immediate) {
    "use strict";
    var timeout;
    return function() {
        var context = this,
            args = arguments;
        var later = function() {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        var callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func.apply(context, args);
    };
}

window.gokart = (function(self) {
    "use strict";
    var $self = $(self);

    // method to precache SVGs as raster (PNGs)
    // workaround for Firefox missing the SurfaceCache when blitting to canvas
    self.pngs = {};
    self.svgToPNG = function(url) {
        if (self.pngs[url]) {
            return self.pngs[url];
        }
        var canvas = $("<canvas>").get(0);
        var ctx = canvas.getContext("2d");
        var img = new Image();
        img.onload = function() {
            canvas.width = img.width;
            canvas.height = img.height;
            ctx.drawImage(img, 0, 0);
            canvas.toBlob(function(blob) {
                self.pngs[url] = URL.createObjectURL(blob);
            }, 'image/png');
        };
        img.src = url;
        return url;
    };

    // calculate screen res
    self.mmPerInch = 25.4;
    $("body").append('<div id="dpi" style="width:1in;display:none"></div>');
    self.dpi = parseFloat($('#dpi').width());
    self.dpmm = self.dpi / self.mmPerInch;
    $("#dpi").remove();

    // get user info
    (function() {
        var req = new XMLHttpRequest();
        req.withCredentials = true;
        req.onload = function() {
            self.whoami = JSON.parse(this.responseText);
        };
        req.open("GET", "https://oim.dpaw.wa.gov.au/api/whoami");
        req.send();
    })();

    // default matrix from KMI
    self.resolutions = [0.17578125, 0.087890625, 0.0439453125, 0.02197265625, 0.010986328125, 0.0054931640625, 0.00274658203125, 0.001373291015625, 0.0006866455078125, 0.0003433227539062, 0.0001716613769531, 858306884766e-16, 429153442383e-16, 214576721191e-16, 107288360596e-16, 53644180298e-16, 26822090149e-16, 13411045074e-16];
    ol.OVERVIEWMAP_MIN_RATIO = 1;
    ol.OVERVIEWMAP_MAX_RATIO = 1;

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
    self.defaultWMTSSrc = "https://kmi.dpaw.wa.gov.au/geoserver/gwc/service/wmts";
    self.defaultWFSSrc = "https://kmi.dpaw.wa.gov.au/geoserver/wfs";

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

    // reusable tile loader hook to update a loading indicator
    var _tileLoaderHook = function(tileSource, tileLayer) {
        // number of tiles currently in flight
        var numLoadingTiles = 0;
        // number of misses for the current set
        var badTiles = 0;
        var tileLoader = tileSource.getTileLoadFunction();
        return function(tile, src) {
            if (numLoadingTiles === 0) {
                tileLayer.progress = "loading";
                badTiles = 0;
            }
            numLoadingTiles++;
            var image = tile.getImage();
            // to hell with you, cross origin policy!
            image.crossOrigin = "anonymous";
            image.onload = function() {
                numLoadingTiles--;
                if (numLoadingTiles === 0) {
                    if (badTiles > 0) {
                        tileLayer.progress = "error";
                    } else {
                        tileLayer.progress = "idle";
                    }
                }
            };
            image.onerror = function() {
                badTiles++;
                image.onload();
            };
            tileLoader(tile, src);
        };
    };

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

        // hook the tile loading function to update progress indicator
        tileLayer.progress = "";
        tileSource.setTileLoadFunction(_tileLoaderHook(tileSource, tileLayer));

        // hook to swap the tile layer when timeIndex changes
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
                tileSource.setUrls(data.servers);
                options.timeline = data.layers.reverse();
                tileLayer.set("timeIndex", options.timeIndex || options.timeline.length - 1);
                self.ui.layers.update();
            });
        };

        options.updateTimeline();
        // if the "refresh" option is set, set a timer
        // to update the source
        if (options.refresh) {
            tileLayer.refresh = setInterval(function() {
                options.updateTimeline();
            }, options.refresh * 1000);
        }

        // set properties for use in layer selector
        tileLayer.set("name", options.name);
        tileLayer.set("id", options.id);
        return tileLayer;
    };


    self.geojson = new ol.format.GeoJSON();

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
        }, options.params || {});


        var vectorSource = new ol.source.Vector();
        var vector = new ol.layer.Vector({
            opacity: options.opacity || 1,
            source: vectorSource,
            style: options.style
        });
        vector.progress = "";

        vectorSource.loadSource = function() {
            if (options.cql_filter) {
                options.params.cql_filter = options.cql_filter;
            } else if (options.params.cql_filter) {
                delete options.params.cql_filter;
            }
            vector.progress = "loading";
            $.ajax({
                url: url + "?" + $.param(options.params),
                success: function(response, stat, xhr) {
                    var features = self.geojson.readFeatures(response);
                    vectorSource.clear(true);
                    vectorSource.addFeatures(features);
                    vector.progress = "idle";
                },
                error: function() {
                    vector.progress = "error";
                },
                dataType: "json",
                xhrFields: {
                    withCredentials: true
                }
            });
        };

        if (options.onadd) {
            vectorSource.on("addfeature", function(event) {
                options.onadd(event.feature);
            });
        }


        // if the "refresh" option is set, set a timer
        // to update the source
        if (options.refresh) {
            vector.set("updated", moment().toLocaleString());
            vectorSource.refresh = setInterval(function() {
                vector.set("updated", moment().toLocaleString());
                vectorSource.loadSource();
            }, options.refresh * 1000);
        }
        vectorSource.loadSource();

        vector.set("name", options.name);
        vector.set("id", options.id);
        return vector;
    };

    // loader to create a WMTS layer from a kmi datasource
    self.createTileLayer = function() {
        var layer = this;
        if (layer.base) {
            layer.format = "image/jpeg";
        }
        layer = $.extend({
            opacity: 1,
            name: "Mapbox Outdoors",
            id: "dpaw:mapbox_outdoors",
            format: "image/png",
            tileSize: 1024,
            style: "",
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

        // create a tile source
        var tileSource = new ol.source.WMTS({
            url: layer.wmts_url,
            layer: layer.id,
            matrixSet: matrixSet.name,
            format: layer.format,
            style: layer.style,
            projection: layer.projection,
            wrapX: true,
            tileGrid: tileGrid
        });

        var tileLayer = new ol.layer.Tile({
            opacity: layer.opacity || 1,
            source: tileSource
        });

        // hook the tile loading function to update progress indicator
        tileLayer.progress = "";
        tileSource.setTileLoadFunction(_tileLoaderHook(tileSource, tileLayer));

        // if the "refresh" option is set, set a timer
        // to force a reload of the tile content
        if (layer.refresh) {
            tileLayer.set("updated", moment().toLocaleString());
            tileLayer.refresh = setInterval(function() {
                tileLayer.set("updated", moment().toLocaleString());
                tileSource.setUrl(layer.wmts_url + "?time=" + moment.utc().unix());
            }, layer.refresh * 1000);
        }
        // set properties for use in layer selector
        tileLayer.set("name", layer.name);
        tileLayer.set("id", layer.id);
        return tileLayer;
    };

    self.getMapLayer = function(id) {
        return self.map.getLayers().getArray().find(function(layer) {
            return layer.get("id") == id;
        });
    };

    self.getLayer = function(id) {
        return self.catalogue.getArray().find(function(layer) {
            return layer.id == id;
        });
    };

    // fixed scales for the scale selector (1:1K increments)
    self.fixedScales = [0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 80, 100, 125, 250, 500, 1000, 2000, 3000, 5000, 10000, 25000];

    // force OL to approximate a fixed scale (1:1K increments)
    self.setScale = function(scale) {
        while (Math.abs(self.getScale() - scale) > 0.001) {
            self.map.getView().setResolution(self.map.getView().getResolution() * scale / self.getScale());
        }
    };

    self.wgs84Sphere = new ol.Sphere(6378137);

    // return the scale (1:1K increments)
    self.getScale = function() {
        var size = self.map.getSize();
        var center = self.map.getView().getCenter();
        var extent = self.map.getView().calculateExtent(size);
        var distance = self.wgs84Sphere.haversineDistance([extent[0], center[1]], center) * 2;
        return distance * self.dpmm / size[0];
    };

    // get the fixed scale (1:1K increments) closest to current scale
    self.getFixedScale = function() {
        var scale = self.getScale();
        var closest = null;
        $.each(self.fixedScales, function() {
            if (closest === null || Math.abs(this - scale) < Math.abs(closest - scale)) {
                closest = this;
            }
        });
        return closest;
    };

    // generate a human-readable scale string
    self.getScaleString = function(scale) {
        if (Math.round(scale * 100) / 100 < 1.0) {
            return "1:" + (Math.round(scale * 100000) / 100).toLocaleString();
        } else if (Math.round(scale * 100) / 100 >= 1000.0) {
            return "1:" + (Math.round(scale / 10) / 100).toLocaleString() + "M";
        }

        return "1:" + (Math.round(scale * 100) / 100).toLocaleString() + "K";
    };

    // helper to populate the catalogue from a remote service
    self.loadRemoteCatalogue = function(url) {
        var req = new XMLHttpRequest();
        req.withCredentials = true;
        req.onload = function() {
            JSON.parse(this.responseText).forEach(function(l) {
                self.catalogue.push(l);
            });

        };
        req.open("GET", url);
        req.send();
    };

    // initialise map
    self.init = function(catalogue, layers, options) {
        self.catalogue = new ol.Collection();
        options = options || {};

        var getMapLayer = function() {
            return self.getMapLayer(this.id);
        };

        self.catalogue.on("add", function(event) {
            var l = event.element;
            l.olLayer = getMapLayer;
            l.id = l.id || l.identifier;
            l.name = l.name || l.title;
            l.init = l.init || self.createTileLayer; // override based on layer type
        });

        self.catalogue.extend(catalogue);

        var initialLayers = layers.reverse().map(function(id) {
            return self.getLayer(id).init();
        });

        self.map = new ol.Map({
            logo: false,
            renderer: "canvas",
            target: "map",
            layers: initialLayers,
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
                new ol.control.FullScreen({
                    source: $("body").get(0),
                    label: $("<i/>", {
                        class: "fa fa-expand"
                    })[0]
                }),
                new ol.control.Control({
                    element: $("#menu-scale").get(0)
                }),
                new ol.control.Attribution()
            ],
            interactions: ol.interaction.defaults({
                altShiftDragRotate: false,
                pinchRotate: false,
                dragPan: false,
                doubleClickZoom: false,
                keyboard: false
            })
        });
        var params = {};
        decodeURIComponent(location.search).slice(1).split("&").forEach(function(p) {
            var t = p.split("=");
            params[t[0]] = parseFloat(t[1]);
        });
        if (params.scale) {
            self.map.getView().setCenter([params.lon, params.lat]);
            self.setScale(params.scale / 1000);
        }
        // add some default interactions
        self.dragPanInter = new ol.interaction.DragPan();
        self.doubleClickZoomInter = new ol.interaction.DoubleClickZoom();
        self.keyboardPanInter = new ol.interaction.KeyboardPan();
        self.keyboardZoomInter = new ol.interaction.KeyboardZoom();
        self.map.addInteraction(self.dragPanInter);
        self.map.addInteraction(self.doubleClickZoomInter);
        self.map.addInteraction(self.keyboardPanInter);
        self.map.addInteraction(self.keyboardZoomInter);

        // Create the graticule component
        self.graticule = new ol.LabelGraticule();
        self.graticule.setMap(self.map);

        // alert other components that the map is ready
        $self.trigger("init_map");
    };
    return self;
})(window.gokart || {});
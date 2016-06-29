"use strict";
window.gokart = (function(self) {
    $(document).foundation();
    svg4everybody();

    var $self = $(self)
    var ui = self.ui = {};

    // bind menu side-tabs to reveal the side pane
    var offCanvasLeft = $("#offCanvasLeft");
    $("#menu-tabs").on("change.zf.tabs", function(ev) {
        offCanvasLeft.addClass("reveal-responsive");
        self.map.updateSize();
    }).on("click", ".tabs-title a[aria-selected=false]", function(ev) {
        offCanvasLeft.addClass("reveal-responsive");
        $(this).attr("aria-selected", true);
        self.map.updateSize();
    }).on("click", ".tabs-title a[aria-selected=true]", function(ev) {
        offCanvasLeft.removeClass("reveal-responsive");
        $(this).attr("aria-selected", false);
        self.map.updateSize();
    });
    $("#side-pane-close").on("click", function(ev) {
        offCanvasLeft.removeClass("reveal-responsive");
        $("#menu-tabs").find(".tabs-title a[aria-selected=true]").attr("aria-selected", false);
        self.map.updateSize();
    });

    // hovering layer information panel
    ui.info = new Vue({
        el: '#info',
        // variables
        data: {
            features: false,
            coordinate: "",
            offset: 20,
            pixel: [0, 0],
        },
        // parts of the template to be computed live
        computed: {
            // because the viewport size changes when the tab pane opens, don't cache the map width and height
            mapWidth: { cache: false, get: function() { return $("#map").width() }},
            mapHeight: { cache: false, get: function() { return $("#map").height() }},
            featuresLength: function() {
                return Object.keys(this.features).length;
            },
            // info panel should be positioned near the mouse in the quadrant furthest away from the viewport edges
            css: function() {
                var css = {
                    "left": this.pixel[0] + this.offset + "px",
                    "top": this.pixel[1] + this.offset + "px",
                    "bottom": this.mapHeight - this.pixel[1] + this.offset + "px",
                    "right": this.mapWidth - this.pixel[0] + this.offset + "px"
                }
                if (this.pixel[0] < this.mapWidth / 2) { delete css.right } else { delete css.left };
                if (this.pixel[1] < this.mapHeight / 2) { delete css.bottom } else { delete css.top };
                return css;
            }
        },
        // methods callable from inside the template
        methods: {
            // update the panel content
            display: function(event) {
                if (event.dragging) { return };
                var pixel = self.map.getEventPixel(event.originalEvent);
                var features = {}
                var featureFound = self.map.forEachFeatureAtPixel(pixel, function(f) {
                    features[f.getGeometry().getExtent().join(" ")] = f.getProperties();
                });
                if (Object.keys(features).length > 0) {
                    this.features = features;
                    this.coordinate = ol.coordinate.toStringXY(self.map.getCoordinateFromPixel(pixel), 3);
                    this.pixel = pixel;
                }
            }
        }
    });

    // update "Map Layers" pane
    self.initLayers = function() {
        ui.layers = new Vue({
            el: "#menu-tab-layers",
            // variables            
            data: {
                sliderOpacity: 0,
                layer: {},
                olLayers: [],
                catalogue: {},
                swapBaseLayers: true,
                search: "",
                searchAttrs: ["name", "id"],
                timeIndex: 0
            },
            // parts of the template to be computed live
            computed: { 
                graticule: {
                    cache: false, 
                    get: function() { 
                        return self.graticule.getMap() == self.map 
                    }
                },
                sliderTimeline: {
                    get: function() {
                        this.timeIndex = this.layer.olLayer.get("timeIndex");
                        return this.timeIndex;
                    },
                    set: function(val) {
                        this.layer.olLayer.set("timeIndex", val);
                        this.timeIndex = val;
                    }
                },
                timelineTS: {
                    cache: false,
                    get: function() {
                        return this.layer.timeline[this.timeIndex][0];
                    }
                },
                sliderMax: {
                    cache: false,
                    get: function() {
                        return this.layer.timeline.length-1;
                    }
                },
                layerOpacity: {
                    get: function() {
                        return Math.round(this.layer.olLayer.getOpacity() * 100);
                    },
                    set: function(val) {
                        this.layer.olLayer.setOpacity(val / 100);
                    }
                }    
            },
            // methods callable from inside the template
            methods: {
                toggleGraticule: function() {
                    if (this.graticule) {
                        self.graticule.setMap(null);
                    } else {
                        self.graticule.setMap(self.map);
                    }
                },
                update: function() {
                    var vm = this;
                    vm.olLayers = [];
                    Vue.nextTick(function() {
                        vm.olLayers = gokart.map.getLayers().getArray();
                    });
                },
                removeLayer: function(olLayer) {
                    olLayer.get("catalogueEntry").toggled = false;
                    self.map.removeLayer(olLayer);
                },
                // change order of OL layers based on "Map Layers" list order
                updateOrder: function(el) {
                    Array.prototype.slice.call(el.parentNode.children).reverse().forEach(function(row) {
                        var layer = self.layerById(row.dataset.id);
                        self.map.removeLayer(layer);
                        self.map.addLayer(layer);
                    });
                },
                // toggle a layer in the Layer Catalogue
                onLayerChange: function(layer) {
                    var vm = this;
                    if (layer.toggled) {
                        if (layer.base) {
                            // "Switch out base layers automatically" is enabled, remove
                            // all other layers with the "base" option set.
                            if (vm.swapBaseLayers) {
                                vm.olLayers.forEach(function(olLayer) {
                                    if (olLayer.get("catalogueEntry").base) {
                                        vm.removeLayer(olLayer);
                                    }
                                });
                            } 
                            // add new base layer to bottom
                            self.map.getLayers().insertAt(0, layer.init());
                        } else {
                            self.map.addLayer(layer.init());
                        }
                    } else {
                        vm.removeLayer(layer.olLayer);
                    }
                }
            },
            ready: function () { 
                dragula([document.querySelector("#layers-active-list")]).on("dragend", this.updateOrder); 
            }
        });
        ui.layers.olLayers = self.map.getLayers().getArray();
        ui.layers.catalogue = self.catalogue;
    }

    // collection to store all annotation features
    ui.features = new ol.Collection();
    ui.selectedFeatures = new ol.Collection();
    ui.features.on("add", function(ev) {
        var feature = ev.element;
        if (feature.get("toolName")) {
            var style = ui.annotations.tools.filter(function(t) { 
                return t.name == feature.get("toolName"); 
            })[0].style;
        } else {
            feature.set("toolName", ui.annotations.tool.name);
            var style = ui.annotations.tool.style;
        }
        feature.setStyle(style || null);
    });
    // NASTYHACK: add/remove default style based on select status
    ui.selectedFeatures.on("add", function(ev) {
        var feature = ev.element;
        feature.preSelectStyle = feature.getStyle();
        feature.setStyle(null);
    });
    ui.selectedFeatures.on("remove", function(ev) {
        var feature = ev.element;
        feature.setStyle(feature.preSelectStyle);
        delete feature.preSelectStyle;
    });
    // layer/source for modiftying annotation features
    ui.featureOverlay = new ol.layer.Vector({
        source: new ol.source.Vector({ features: ui.features })
    });
    ui.featureOverlay.set("id", "annotations");
    ui.featureOverlay.set("name", "My Annotations");
    // collection for tracking selected features

    // add new points to annotations layer
    ui.pointInter = new ol.interaction.Draw({
        type: "Point",
        features: ui.features
    });

    // add new lines to annotations layer
    ui.lineInter = new ol.interaction.Draw({
        type: "LineString",
        features: ui.features
    });

    // add new polygons to annotations layer
    ui.polyInter = new ol.interaction.Draw({
        type: "Polygon",
        features: ui.features
    });

    // next three interacts are bundled into the Select tool
    // allow modifying features by click+dragging
    ui.modifyInter = new ol.interaction.Modify({
        features: ui.features
    });

    // allow dragbox selection of features
    ui.dragSelectInter = new ol.interaction.DragBox();
    // modify selectedFeatures after dragging a box
    ui.dragSelectInter.on("boxend", function() {
        var extent = ui.dragSelectInter.getGeometry().getExtent();
        ui.featureOverlay.getSource().forEachFeatureIntersectingExtent(extent, function(feature) {
            ui.selectedFeatures.push(feature);
        });
    });
    // clear selectedFeatures before dragging a box
    ui.dragSelectInter.on("boxstart", function() {
        ui.selectedFeatures.clear();
    });
    // allow selecting multiple features by clicking
    ui.selectInter = new ol.interaction.Select({
        layers: [ui.featureOverlay],
        features: ui.selectedFeatures
    });


    self.initAnnotations = function() {
        self.catalogue.gokartAnnotations = {
            init: function() {
                this.olLayer = ui.featureOverlay;
                this.toggled = true;
                ui.featureOverlay.set("catalogueEntry", this);
                return ui.featureOverlay;
            },
            id: "annotations",
            name: "My Annotations"
        }
        var defaultTool = {
            name: "Pan",
            icon: "fa-hand-paper-o",
            interactions: [
                self.dragPanInter,
                self.doubleClickZoomInter
            ]
        }
        ui.annotations = new Vue({
            el: "#menu-tab-annotations",
            data: {
                tool: defaultTool,
                tools: [
                    defaultTool,
                    {
                        name: "Select",
                        icon: "fa-mouse-pointer",
                        interactions: [
                            ui.selectInter, 
                            ui.dragSelectInter,
                            ui.modifyInter
                        ]
                    },
                    {
                        name: "Point",
                        icon: "/static/images/iD-sprite.svg#icon-point",
                        interactions: [ui.pointInter]
                    },
                    {
                        name: "Line",
                        icon: "/static/images/iD-sprite.svg#icon-line",
                        interactions: [ui.lineInter]
                    },
                    {
                        name: "Polygon",
                        icon: "/static/images/iD-sprite.svg#icon-area",
                        interactions: [ui.polyInter]
                    }
                ],
                features: ui.features,
                featureOverlay: ui.featureOverlay,
                size: 12,
                colour: "#cc0000",
                colours: [
                    ["red", "#cc0000"],
                    ["orange", "#f57900"],
                    ["yellow", "#edd400"],
                    ["green", "#73d216"],
                    ["blue", "#3465a4"],
                    ["violet", "#75507b"],
                    ["brown", "#8f5902"],
                    ["grey", "#555753"],
                    ["black", "#000000"]
                ],
                advanced: false
            },
            methods: {
                icon: function(t) {
                    if (t.icon.startsWith("fa-")) {
                        return '<i class="fa '+t.icon+'" aria-hidden="true"></i>';
                    } else {
                        return '<svg class="icon"><use xlink:href="'+t.icon+'"></use></svg>';
                    }
                },
                setTool: function(t) {
                    var vm = this;
                    self.map.unByKey(ui.infoEvent);
                    vm.tools.forEach(function(tool) {
                        tool.interactions.forEach(function (inter) {
                            self.map.removeInteraction(inter);
                        });
                    });
                    t.interactions.forEach(function (inter) {
                        self.map.addInteraction(inter);
                    });
                    if (t.name == 'Pan') {
                        ui.infoEvent = self.map.on('pointermove', ui.info.display);
                    } else if (!self.catalogue.gokartAnnotations.toggled) {
                        self.catalogue.gokartAnnotations.toggled = true;
                        ui.layers.onLayerChange(self.catalogue.gokartAnnotations);
                    }
                    vm.tool = t;
                }
            }
        });
    }
    

    $self.on("init_map", function() {
        // setup scale events
        self.map.on("postrender", function() { if (self.mapControls) { 
            self.mapControls.scale = self.getScale();
            history.replaceState(null, null, location.pathname + "?" + self.mapControls.shortUrl);
        }});
        // display hover popups
        ui.infoEvent = self.map.on('pointermove', ui.info.display);
        if (document.querySelector("#menu-tab-layers")) { self.initLayers() };
        if (document.querySelector("#menu-tab-annotations")) { self.initAnnotations() };

        $.get("/static/images/legend.svg", function(tmpl) {
            $("#legendsvg").html(tmpl);
            self.initMapControls();
        }, "text");
    });

    return self;
})(window.gokart || {});



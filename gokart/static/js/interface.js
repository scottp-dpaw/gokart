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
    Vue.partial('featureInfo', document.querySelectorAll("#featureInfo")[0].innerHTML);
    ui.info = new Vue({
        el: '#info',
        // variables
        data: {
            enabled: true,
            features: false,
            coordinate: "",
            selected: {},
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
                    features[f.getGeometry().getExtent().join(" ")] = f;
                });
                if (Object.keys(features).length > 0) {
                    this.features = features;
                    this.coordinate = ol.coordinate.toStringXY(self.map.getCoordinateFromPixel(pixel), 3);
                    this.pixel = pixel;
                }
            },
            onPointerMove: function(event) {
                if (this.enabled) {
                    this.display(event);
                }
            },
            getPartial: function(f) {
                window.featureTest = f;
            },
            select: function(key) {
                var selected = this.selected;
                selected[key] = !selected[key];
                this.selected = {};
                this.$nextTick(function() {
                    this.selected = selected;
                });
            }
        }
    });

    // update "Map Layers" pane
    self.initLayers = function() {
        ui.layers = new Vue({
            el: "#layers-active",
            // variables            
            data: {
                sliderOpacity: 0,
                layer: {},
                olLayers: self.map.getLayers().getArray(),
                hoverInfoCache: true,
                timeIndex: 0
            },
            // parts of the template to be computed live
            computed: { 
                graticule: {
                    cache: false, 
                    get: function() { 
                        return self.graticule.getMap() == self.map; 
                    }
                },
                hoverInfo: {
                    cache: false,
                    get: function() {
                        return ui.info.enabled;
                    },
                    set: function(val) {
                        ui.info.enabled = val;
                    }
                },
                sliderTimeline: {
                    get: function() {
                        this.timeIndex = this.layer.olLayer().get("timeIndex");
                        return this.timeIndex;
                    },
                    set: function(val) {
                        this.layer.olLayer().set("timeIndex", val);
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
                        return Math.round(this.layer.olLayer().getOpacity() * 100);
                    },
                    set: function(val) {
                        this.layer.olLayer().setOpacity(val / 100);
                    }
                }    
            },
            // methods callable from inside the template
            methods: {
                getLayer: self.getLayer,
                toggleGraticule: function() {
                    if (this.graticule) {
                        self.graticule.setMap(null);
                    } else {
                        self.graticule.setMap(self.map);
                    }
                },
                toggleHoverInfo: function(ev) {
                    this.hoverInfoCache = ev.target.checked;
                    this.hoverInfo = ev.target.checked;
                },
                update: function() {
                    var vm = this;
                    vm.olLayers = [];
                    Vue.nextTick(function() {
                        vm.olLayers = gokart.map.getLayers().getArray();
                    });
                },
                removeLayer: function(olLayer) {
                    self.map.removeLayer(olLayer);
                },
                // change order of OL layers based on "Map Layers" list order
                updateOrder: function(el) {
                    Array.prototype.slice.call(el.parentNode.children).reverse().forEach(function(row) {
                        var layer = self.getMapLayer(row.dataset.id);
                        self.map.removeLayer(layer);
                        self.map.addLayer(layer);
                    });
                },
            },
            ready: function () { 
                dragula([document.querySelector("#layers-active-list")]).on("dragend", this.updateOrder); 
            }
        });
        ui.catalogue = new Vue({
            el: "#layers-catalogue",
            data: {
                layer: {},
                catalogue: self.catalogue,
                swapBaseLayers: true,
                search: "",
                searchAttrs: ["name", "id"]
            },
            methods: {
                // helper function to simulate a <label> style click on a row
                onToggle: function(index) {
                    $(this.$el).find("#ctlgsw"+index).trigger("click");
                },
                // toggle a layer in the Layer Catalogue
                onLayerChange: function(layer, checked) {
                    // if layer matches state, return
                    if (checked == (layer.olLayer() !== undefined)) { return }
                    // make the layer match the state
                    if (checked) {
                        if (layer.base) {
                            // "Switch out base layers automatically" is enabled, remove
                            // all other layers with the "base" option set.
                            if (this.swapBaseLayers) {
                                ui.layers.olLayers.forEach(function(olLayer) {
                                    if (self.getLayer(olLayer.get("id")).base) {
                                        ui.layers.removeLayer(olLayer);
                                    }
                                });
                            } 
                            // add new base layer to bottom
                            self.map.getLayers().insertAt(0, layer.init());
                        } else {
                            self.map.addLayer(layer.init());
                        }
                    } else {
                        ui.layers.removeLayer(layer.olLayer());
                    }
                }
            }
        });
    };


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


    ui.defaultPan = {
        name: "Pan",
        icon: "fa-hand-paper-o",
        interactions: [
            self.dragPanInter,
            self.doubleClickZoomInter
        ]
    };
    ui.defaultSelect = {
        name: "Select",
        icon: "fa-mouse-pointer",
        interactions: [
            ui.selectInter, 
            ui.dragSelectInter,
            ui.modifyInter
        ]
    };
    ui.defaultPoint = {
        name: "Point",
        icon: "/static/images/iD-sprite.svg#icon-point",
        interactions: [ui.pointInter]
    };
    ui.defaultLine = {
        name: "Line",
        icon: "/static/images/iD-sprite.svg#icon-line",
        interactions: [ui.lineInter]
    };
    ui.defaultPolygon = {
        name: "Polygon",
        icon: "/static/images/iD-sprite.svg#icon-area",
        interactions: [ui.polyInter]
    };

    Vue.filter('filterIf', function(list, prop, value) {
        return list.filter(function(val) {
            return val[prop] == value;
        });
    });

    self.initAnnotations = function() {
        self.catalogue.push({
            init: function() {
                return ui.featureOverlay;
            },
            id: "annotations",
            name: "My Annotations"
        });
        ui.annotations = new Vue({
            el: "#menu-tab-annotations",
            data: {
                tool: ui.defaultPan,
                tools: [
                    ui.defaultPan,
                    ui.defaultSelect
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
                    vm.tools.forEach(function(tool) {
                        tool.interactions.forEach(function (inter) {
                            self.map.removeInteraction(inter);
                        });
                    });
                    t.interactions.forEach(function (inter) {
                        self.map.addInteraction(inter);
                    });
                    ui.layers.hoverInfo = ((t.name == 'Pan') && (ui.layers.hoverInfoCache));
                    if (!self.getLayer("annotations").olLayer()) {
                        ui.catalogue.onLayerChange(self.getLayer("annotations"), true);
                    }
                    vm.tool = t;
                }
            }
        });
    }
    

    $self.on("init_map", function() {
        // setup scale events
        self.map.on("postrender", function() { 
            if (self.mapScaleControl) { 
                self.mapScaleControl.scale = self.getScale();
            }
            if (self.mapExportControls) {
                history.replaceState(null, null, location.pathname + "?" + self.mapExportControls.shortUrl);
            }
        });
        // display hover popups
        self.map.on("pointermove", ui.info.onPointerMove);
        if (document.querySelector("#menu-tab-layers")) { self.initLayers() };
        if (document.querySelector("#menu-tab-annotations")) { self.initAnnotations() };

        $.get("/static/images/legend.svg", function(tmpl) {
            $("#legendsvg").html(tmpl);
            self.initMapControls();
        }, "text");
    });

    return self;
})(window.gokart || {});



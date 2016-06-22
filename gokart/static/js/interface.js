"use strict";
window.gokart = (function(self) {
    $(document).foundation();
    svg4everybody();

    var $self = $(self)
    var ui = self.ui = {};

    ui.sizes = {
        "tool-size-small": 16,
        "tool-size-medium": 32,
        "tool-size-large": 64
    };

    ui.colours = {
    };

    // bind menu side-tabs to reveal the side pane
    var offCanvasLeft = $("#offCanvasLeft")
    $("#menu-tabs").on("change.zf.tabs", function(ev) {
        offCanvasLeft.addClass("reveal-for-medium");
        self.map.updateSize();
    }).on("click", ".tabs-title a[aria-selected=false]", function(ev) {
        offCanvasLeft.addClass("reveal-for-medium");
        $(this).attr("aria-selected", true);
        self.map.updateSize();
    }).on("click", ".tabs-title a[aria-selected=true]", function(ev) {
        offCanvasLeft.removeClass("reveal-for-medium");
        $(this).attr("aria-selected", false);
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
                    cache: false,
                    get: function() {
                        return this.layer.olLayer.get("timeIndex");
                    },
                    set: function(val) {
                        this.layer.olLayer.set("timeIndex", val);
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
                toggleLayer: function(layer) {
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
            ready: function () { dragula([document.querySelector("#layers-active")]).on("dragend", this.updateOrder); }
        });
        ui.layers.olLayers = self.map.getLayers().getArray();
        ui.layers.catalogue = self.catalogue;
    }

    self.initAnnotations = function() {
        ui.annotations = new Vue({
            el: "#menu-tab-annotations",
            data: {
                mode: "pan",
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
                setMode: function(mode) {
                    this.mode = mode
                }
            }
        });
    }
    

    $self.on("init_map", function() {
        // setup scale events
        self.map.on("postrender", function() { if (self.mapControls) { self.mapControls.scale = self.getScale() }});
        // display hover popups
        self.map.on('pointermove', ui.info.display);
        if (document.querySelector("#menu-tab-layers")) { gokart.initLayers() };
        if (document.querySelector("#menu-tab-annotations")) { gokart.initAnnotations() };
    });

    return self;
})(window.gokart || {});



"use strict";
// Basic jpg/pdf printing from canvas and other map controls
window.gokart = (function(self) {
    var $self = $(self)
    var layout = self.layout = {};

    self.initMapControls = function() {
        self.mapControls = new Vue({
            el: "#map-controls",
            // variables
            data: {
                minDPI: 100,
                paperSizes: {
                  A0: [1189, 841],
                  A1: [841, 594],
                  A3: [420, 297],
                  A4: [297, 210]
                },
                paperSize: "A3",
                layout: {},
                title: "Quick Print",
                fixedScales: self.fixedScales,
                scale: 0,
            },
            // parts of the template to be computed live
            computed: {
                // map viewport settings to use for generating the print raster
                mapLayout: function() {
                    var dims = this.paperSizes[this.paperSize];
                    var size = self.map.getSize();
                    return {
                        width: dims[0], height: dims[1], size: size,
                        extent: self.map.getView().calculateExtent(size),
                        scale: this.scale, dpmm: self.dpmm
                    }
                },
                // scale string for the current map zoom level
                scaleString: function() {
                    return self.getScaleString(this.scale);
                },
                // info for the legend block on the print raster
                legendInfo: function() {
                    var whoami = self.whoami || {email: ""};
                    return {
                        km: (Math.round(self.getScale() * 40) / 1000).toLocaleString(),
                        scale: "ISO " + this.paperSize + " " + this.scaleString,
                        title: this.title, author: whoami.email,
                        date: "Printed " + moment().toLocaleString()
                    }
                }
            },
            // methods callable from inside the template
            methods: {
                // wrappers for scale methods
                setScale: function(scale) { self.setScale(scale); this.scale = scale; },
                getScaleString: function(scale) { return self.getScaleString(scale); },
                // resize map to page dimensions (in mm) for printing, save layout
                setSize: function() {
                    $("body").css("cursor", "progress");
                    $("#map-controls").addClass("hide");
                    this.layout = this.mapLayout;
                    self.dpmm = this.minDPI / self.mmPerInch;
                    self.map.setSize([self.dpmm * this.layout.width, self.dpmm * this.layout.height]);
                    self.map.getView().fit(this.layout.extent, self.map.getSize());
                    this.setScale(self.getFixedScale());
                },
                // restore map to viewport dimensions
                resetSize: function() {
                    self.map.setSize(this.layout.size); self.dpmm = this.layout.dpmm;
                    self.map.getView().fit(this.layout.extent, self.map.getSize());
                    this.setScale(this.layout.scale);
                    $("body").css("cursor", "default");
                    $("#map-controls").removeClass("hide");
                },
                // generate legend block, scale ruler is 40mm wide
                renderLegend: function() {
                    var blob = new Blob([$("#legendsvg").html()], {type: "image/svg+xml;charset=utf-8"});
                    var qrcanvas = kjua({
                        text: "http://dpaw.io/sss?" + $.param({bbox: this.mapLayout.extent.join(",")}),
                        render: 'canvas'
                    });
                    return [URL.createObjectURL(blob), qrcanvas];
                },
                // POST a generated JPG to the gokart server backend to convert to GeoPDF
                blobToPDF: function(blob, name) {
                    var formData = new FormData();
                    formData.append("extent", this.layout.extent.join(" "));
                    formData.append("jpg", blob, name + ".jpg");
                    formData.append("dpi", Math.round(this.layout.canvasPxPerMM * 25.4));
                    formData.append("title", this.title)
                    formData.append("author", this.legendInfo.author)
                    var req = new XMLHttpRequest();
                    req.open("POST", "/gdal/pdf");
                    req.responseType = "blob";
                    req.onload = function(event) {
                        saveAs(req.response, name + ".pdf");
                        this.resetSize();
                    }
                    req.send(formData);
                },
                // make a printable raster from the map
                print: function(format) {
                    this.title = window.prompt("Title for printout?", "Quick Print");
                    if (!this.title) { return };
                    // rig the viewport to have printing dimensions
                    this.setSize();
                    var timer; var vm = this;
                    // wait until map is rendered before continuing
                    var composing = self.map.on("postcompose", function(event) {
                        timer && clearTimeout(timer);
                        timer = setTimeout(function() {
                            // remove composing watcher
                            self.map.unByKey(composing);
                            var canvas = event.context.canvas;
                            var img = new Image();
                            var legend = vm.renderLegend();
                            var url = legend[0];
                            var qrcanvas = legend[1];
                            // wait until legend is rendered
                            img.onload = function () {
                                // legend is 12cm wide
                                vm.layout.canvasPxPerMM = canvas.width / vm.layout.width
                                var height = 120 * vm.layout.canvasPxPerMM * img.height / img.width;
                                canvas.getContext("2d").drawImage(img, 0, 0, 120 * vm.layout.canvasPxPerMM, height);
                                canvas.getContext("2d").drawImage(qrcanvas, 0, height);
                                URL.revokeObjectURL(url);
                                // generate a jpg copy of the canvas contents
                                var filename = vm.title.replace(" ", "_");
                                canvas.toBlob(function(blob) {
                                    if (format == "jpg") {
                                        saveAs(blob, filename + ".jpg");
                                        vm.resetSize();
                                    } else if (format == "pdf") {
                                        vm.blobToPDF(blob, filename);
                                    }
                                }, 'image/jpeg', 0.9)
                            }
                            img.src = url;
                        // only output after 5 seconds of no tiles
                        }, 5000);
                    });
                    self.map.renderSync();
                }
            }
        });
    }

    return self;
})(window.gokart || {});

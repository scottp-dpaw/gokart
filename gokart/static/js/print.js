"use strict";
/**
 * Render a grid for a coordinate system on a map.
 * Based on https://github.com/Brictarus/ol3/blob/d41eb87204e76cbf99d61915eb89b1c16c4a4e05/src/ol/graticule.js
 */
(function(ol) {
    var self = function(opt_options) {
        var options = $.extend({}, {
            showLabels: true,
            lonLabelFormatter: function(lon) {
                var formattedLon = Math.abs(Math.round(lon * 1000) / 1000);
                formattedLon += lon < 0 ? "W" : lon > 0 ? "E" : "";
                return formattedLon;
            },
            lonLabelPosition: .02,
            latLabelFormatter: function(lat) {
                var formattedLat = Math.abs(Math.round(lat * 1000) / 1000);
                formattedLat += lat < 0 ? "S" : lat > 0 ? "N" : "";
                return formattedLat;
            },
            latLabelPosition: .98
        }, opt_options);
        ol.Graticule.call(this, opt_options);
        this.meridiansLabels_ = [];
        this.parallelsLabels_ = [];
        this.baseTextStyle_ = {
            font: "10px Helvetica,Roboto,Arial,sans-serif",
            textAlign: "center",
            fill: new ol.style.Fill({
                color: "rgba(0,0,0,.8)"
            }),
            stroke: new ol.style.Stroke({
                color: "rgba(255,255,255,.8)",
                width: 2
            })
        };
        this.showLabels_ = options.showLabels !== undefined ? options.showLabels : false;
        this.lonLabelFormatter_ = options.lonLabelFormatter !== undefined ? options.lonLabelFormatter : null;
        this.lonLabelPosition_ = options.lonLabelPosition !== undefined ? ol.math.clamp(options.lonLabelPosition, 0, 1) : 1;
        this.latLabelFormatter_ = options.latLabelFormatter !== undefined ? options.latLabelFormatter : null;
        this.latLabelPosition_ = options.latLabelPosition !== undefined ? ol.math.clamp(options.latLabelPosition, 0, 1) : 1;
        this.setMap(options.map !== undefined ? options.map : null);
    };
    ol.inherits(self, ol.Graticule);
    self.intervals_ = [5, 2, 1, .5, .2, .1, .05, .01, .005, .002, .001];
    self.prototype.addMeridianLabel_ = function(lon, squaredTolerance, extent, index) {
        var textPoint = this.getMeridianPoint_(lon, squaredTolerance, extent, index);
        var style = new ol.style.Text(this.baseTextStyle_);
        style.setText(this.lonLabelFormatter_ ? this.lonLabelFormatter_(lon) : lon.toString());
        style.setTextBaseline("bottom");
        style.setTextAlign("center");
        this.meridiansLabels_[index++] = {
            geom: textPoint,
            style: style
        };
        return index;
    };
    self.prototype.getMeridianPoint_ = function(lon, squaredTolerance, extent, index) {
        var flatCoordinates = ol.geom.flat.geodesic.meridian(lon, this.minLat_, this.maxLat_, this.projection_, squaredTolerance);
        var lat = extent[1] + Math.abs(extent[1] - extent[3]) * this.lonLabelPosition_;
        var coordinate = [flatCoordinates[0], lat];
        var point = this.meridiansLabels_[index] !== undefined ? this.meridiansLabels_[index].geom : new ol.geom.Point(null);
        point.setCoordinates(coordinate);
        return point;
    };
    self.prototype.addParallelLabel_ = function(lat, squaredTolerance, extent, index) {
        var textPoint = this.getParallelPoint_(lat, squaredTolerance, extent, index);
        var style = new ol.style.Text(this.baseTextStyle_);
        style.setTextBaseline("middle");
        style.setText(this.latLabelFormatter_ ? this.latLabelFormatter_(lat) : lat.toString());
        style.setTextAlign("right");
        this.parallelsLabels_[index++] = {
            geom: textPoint,
            style: style
        };
        return index;
    };
    self.prototype.getParallelPoint_ = function(lat, squaredTolerance, extent, index) {
        var flatCoordinates = ol.geom.flat.geodesic.parallel(lat, this.minLon_, this.maxLon_, this.projection_, squaredTolerance);
        var lon = extent[0] + Math.abs(extent[0] - extent[2]) * this.latLabelPosition_;
        var coordinate = [lon, flatCoordinates[1]];
        var point = this.parallelsLabels_[index] !== undefined ? this.parallelsLabels_[index].geom : new ol.geom.Point(null);
        point.setCoordinates(coordinate);
        return point;
    };
    self.prototype.createGraticule_ = function(extent, center, resolution, squaredTolerance) {
        var interval = this.getInterval_(resolution);
        if (interval == -1) {
            this.meridians_.length = this.parallels_.length = 0;
            this.meridiansLabels_.length = this.parallelsLabels_.length = 0;
            return;
        }
        var centerLonLat = this.toLonLatTransform_(center);
        var centerLon = centerLonLat[0];
        var centerLat = centerLonLat[1];
        var maxLines = this.maxLines_;
        var cnt, idx, lat, lon, idxLabels = 0;
        var validExtent = [Math.max(extent[0], this.minLonP_), Math.max(extent[1], this.minLatP_), Math.min(extent[2], this.maxLonP_), Math.min(extent[3], this.maxLatP_)];
        validExtent = ol.proj.transformExtent(validExtent, this.projection_, "EPSG:4326");
        var maxLat = validExtent[3];
        var maxLon = validExtent[2];
        var minLat = validExtent[1];
        var minLon = validExtent[0];
        centerLon = Math.floor(centerLon / interval) * interval;
        lon = ol.math.clamp(centerLon, this.minLon_, this.maxLon_);
        idx = this.addMeridian_(lon, minLat, maxLat, squaredTolerance, extent, 0);
        if (this.showLabels_) {
            idxLabels = this.addMeridianLabel_(lon, squaredTolerance, extent, 0);
        }
        cnt = 0;
        while (lon != this.minLon_ && cnt++ < maxLines) {
            lon = Math.max(lon - interval, this.minLon_);
            idx = this.addMeridian_(lon, minLat, maxLat, squaredTolerance, extent, idx);
            if (this.showLabels_) {
                idxLabels = this.addMeridianLabel_(lon, squaredTolerance, extent, idxLabels);
            }
        }
        lon = ol.math.clamp(centerLon, this.minLon_, this.maxLon_);
        cnt = 0;
        while (lon != this.maxLon_ && cnt++ < maxLines) {
            lon = Math.min(lon + interval, this.maxLon_);
            idx = this.addMeridian_(lon, minLat, maxLat, squaredTolerance, extent, idx);
            if (this.showLabels_) {
                idxLabels = this.addMeridianLabel_(lon, squaredTolerance, extent, idxLabels);
            }
        }
        this.meridians_.length = idx;
        this.meridiansLabels_.length = idxLabels;
        centerLat = Math.floor(centerLat / interval) * interval;
        lat = ol.math.clamp(centerLat, this.minLat_, this.maxLat_);
        idxLabels = 0;
        idx = this.addParallel_(lat, minLon, maxLon, squaredTolerance, extent, 0);
        if (this.showLabels_) {
            idxLabels = this.addParallelLabel_(lat, squaredTolerance, extent, 0);
        }
        cnt = 0;
        while (lat != this.minLat_ && cnt++ < maxLines) {
            lat = Math.max(lat - interval, this.minLat_);
            idx = this.addParallel_(lat, minLon, maxLon, squaredTolerance, extent, idx);
            if (this.showLabels_) {
                idxLabels = this.addParallelLabel_(lat, squaredTolerance, extent, idxLabels);
            }
        }
        lat = ol.math.clamp(centerLat, this.minLat_, this.maxLat_);
        cnt = 0;
        while (lat != this.maxLat_ && cnt++ < maxLines) {
            lat = Math.min(lat + interval, this.maxLat_);
            idx = this.addParallel_(lat, minLon, maxLon, squaredTolerance, extent, idx);
            if (this.showLabels_) {
                idxLabels = this.addParallelLabel_(lat, squaredTolerance, extent, idxLabels);
            }
        }
        this.parallels_.length = idx;
        this.parallelsLabels_.length = idxLabels;
    };
    self.prototype.handlePostCompose_ = function(e) {
        var vectorContext = e.vectorContext;
        var frameState = e.frameState;
        var extent = frameState.extent;
        var viewState = frameState.viewState;
        var center = viewState.center;
        var projection = viewState.projection;
        var resolution = viewState.resolution;
        var pixelRatio = frameState.pixelRatio;
        var squaredTolerance = resolution * resolution / (4 * pixelRatio * pixelRatio);
        var updateProjectionInfo = !this.projection_ || !ol.proj.equivalent(this.projection_, projection);
        if (updateProjectionInfo) {
            this.updateProjectionInfo_(projection);
        }
        var offsetX = 0;
        if (projection.canWrapX()) {
            var projectionExtent = projection.getExtent();
            var worldWidth = ol.extent.getWidth(projectionExtent);
            var x = frameState.focus[0];
            if (x < projectionExtent[0] || x > projectionExtent[2]) {
                var worldsAway = Math.ceil((projectionExtent[0] - x) / worldWidth);
                offsetX = worldWidth * worldsAway;
                extent = [extent[0] + offsetX, extent[1], extent[2] + offsetX, extent[3]];
            }
        }
        this.createGraticule_(extent, center, resolution, squaredTolerance);
        vectorContext.setFillStrokeStyle(null, this.strokeStyle_);
        var i, l, line;
        for (i = 0, l = this.meridians_.length; i < l; ++i) {
            line = this.meridians_[i];
            vectorContext.drawLineString(line, null);
        }
        for (i = 0, l = this.parallels_.length; i < l; ++i) {
            line = this.parallels_[i];
            vectorContext.drawLineString(line, null);
        }
        if (this.showLabels_) {
            var point, style;
            for (i = 0, l = this.meridiansLabels_.length; i < l; ++i) {
                point = this.meridiansLabels_[i].geom;
                style = this.meridiansLabels_[i].style;
                vectorContext.setTextStyle(style);
                vectorContext.drawPoint(point, null);
            }
            for (i = 0, l = this.parallelsLabels_.length; i < l; ++i) {
                point = this.parallelsLabels_[i].geom;
                style = this.parallelsLabels_[i].style;
                vectorContext.setTextStyle(style);
                vectorContext.drawPoint(point, null);
            }
        }
    };
    ol.LabelGraticule = self;
})(ol);
// Basic jpg/pdf printing from canvas
window.gokart = (function(self) {
    var $self = $(self)
    var layout = self.layout = {};

    $.get("/static/images/legend.svg", function(tmpl) {
        layout.legendTmpl = Handlebars.compile(tmpl)
    }, "text");

    layout.minDPI = 150;

    layout.paperSizes = {
      A1: [841,594],
      A3: [420, 297],
      A4: [297, 210]
    }

    // resize to mm dimensions, save layout
    layout.setSize = function(paperSize) {
        $("body").css("cursor", "progress");
        $(".download").addClass("hide");
        var dims = layout.paperSizes[paperSize];
        layout.width = dims[0];
        layout.height = dims[1];
        layout.size = self.map.getSize()
        layout.extent = self.map.getView().calculateExtent(layout.size);
        layout.dpmm = self.dpmm;
        layout.scale = self.get_fixed_scale();
        self.dpmm = layout.minDPI / self.mmPerInch;
        self.map.setSize([self.dpmm * layout.width, self.dpmm * layout.height]);
        self.map.getView().fit(layout.extent, self.map.getSize());
        self.set_scale(layout.scale);
    }

    layout.resetSize = function() {
        self.map.setSize(layout.size);
        self.dpmm = layout.dpmm;
        self.map.getView().fit(layout.extent, self.map.getSize());
        self.set_scale(layout.scale);
        $("body").css("cursor", "default");
        $(".download").removeClass("hide");
    }

    self.renderLegend = function(title, subtitle) {
        return URL.createObjectURL(new Blob([layout.legendTmpl({
            // scale ruler is 40mm wide
            km: (Math.round(self.get_scale() * 40) / 1000).toLocaleString(),
            scale: $("#menu-scale").val(),
            title: layout.title,
            subtitle: self.whoami.email,
            date: moment().format('[Printed] MMMM Do YYYY, h:mm:ss a')
        })], {type: "image/svg+xml;charset=utf-8"}));
    }

    self.blobToPDF = function(blob, name) {
        var formData = new FormData();
        formData.append("extent", self.map.getView().calculateExtent(self.map.getSize()).join(" "));
        formData.append("jpg", blob, name + ".jpg");
        formData.append("dpi", Math.round(layout.canvasPxPerMM * 25.4))
        var req = new XMLHttpRequest();
        req.open("POST", "/gdal/pdf");
        req.responseType = "blob";
        req.onload = function(event) {
            saveAs(req.response, name + ".pdf");
            layout.resetSize();
        }
        req.send(formData);
    }
    
    self.print = function(format) {
        layout.title = window.prompt("Title for printout?", "Quick Print")
        if (!layout.title) { return };
        // Resize to A3 landscape 150dpi
        layout.setSize("A3");
        var timer;
        var composing = self.map.on("postcompose", function(event) {
            timer && clearTimeout(timer);
            timer = setTimeout(function() {
                // remove composing watcher
                self.map.unByKey(composing);
                var canvas = event.context.canvas;
                var img = new Image();
                var url = self.renderLegend();
                img.onload = function () {
                    // legend is 12cm wide
                    layout.canvasPxPerMM = canvas.width / layout.width
                    canvas.getContext("2d").drawImage(img, 0, 0, 120 * layout.canvasPxPerMM, 120 * layout.canvasPxPerMM * img.height / img.width);
                    URL.revokeObjectURL(url);
                    var filename = layout.title.replace(" ", "_");
                    canvas.toBlob(function(blob) {
                        if (format == "jpg") {
                            saveAs(blob, filename + ".jpg");
                            layout.resetSize();
                        } else if (format == "pdf") {
                            self.blobToPDF(blob, filename);
                        }
                    }, 'image/jpeg', 0.9)
                }
                img.src = url;
            // only output after 5 seconds of no tiles
            }, 5000);
        });
        self.map.renderSync();
    }

    return self;
})(window.gokart || {});

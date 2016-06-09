"use strict";
/**
 * Render a grid for a coordinate system on a map.
 * Based on https://github.com/Brictarus/ol3/blob/d41eb87204e76cbf99d61915eb89b1c16c4a4e05/src/ol/graticule.js
 * @constructor
 * @param {olx.GraticuleOptions=} opt_options Options.
 * @api
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
        this.map_ = null;
        this.projection_ = null;
        this.maxLat_ = Infinity;
        this.maxLon_ = Infinity;
        this.minLat_ = -Infinity;
        this.minLon_ = -Infinity;
        this.maxLatP_ = Infinity;
        this.maxLonP_ = Infinity;
        this.minLatP_ = -Infinity;
        this.minLonP_ = -Infinity;
        this.targetSize_ = options.targetSize !== undefined ? options.targetSize : 100;
        this.maxLines_ = options.maxLines !== undefined ? options.maxLines : 100;
        this.meridians_ = [];
        this.meridiansLabels_ = [];
        this.parallels_ = [];
        this.parallelsLabels_ = [];
        this.strokeStyle_ = options.strokeStyle !== undefined ? options.strokeStyle : self.DEFAULT_STROKE_STYLE_;
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
        this.fromLonLatTransform_ = undefined;
        this.toLonLatTransform_ = undefined;
        this.projectionCenterLonLat_ = null;
        this.showLabels_ = options.showLabels !== undefined ? options.showLabels : false;
        this.lonLabelFormatter_ = options.lonLabelFormatter !== undefined ? options.lonLabelFormatter : null;
        this.lonLabelPosition_ = options.lonLabelPosition !== undefined ? ol.math.clamp(options.lonLabelPosition, 0, 1) : 1;
        this.latLabelFormatter_ = options.latLabelFormatter !== undefined ? options.latLabelFormatter : null;
        this.latLabelPosition_ = options.latLabelPosition !== undefined ? ol.math.clamp(options.latLabelPosition, 0, 1) : 1;
        this.setMap(options.map !== undefined ? options.map : null);
    };
    self.DEFAULT_STROKE_STYLE_ = new ol.style.Stroke({
        color: "rgba(0,0,0,0.2)"
    });
    self.intervals_ = [5, 2, 1, .5, .2, .1, .05, .01, .005, .002, .001];
    self.prototype.addMeridian_ = function(lon, minLat, maxLat, squaredTolerance, extent, index) {
        var lineString = this.getMeridian_(lon, minLat, maxLat, squaredTolerance, index);
        if (ol.extent.intersects(lineString.getExtent(), extent)) {
            this.meridians_[index++] = lineString;
        }
        return index;
    };
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
    self.prototype.addParallel_ = function(lat, minLon, maxLon, squaredTolerance, extent, index) {
        var lineString = this.getParallel_(lat, minLon, maxLon, squaredTolerance, index);
        if (ol.extent.intersects(lineString.getExtent(), extent)) {
            this.parallels_[index++] = lineString;
        }
        return index;
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
    self.prototype.getInterval_ = function(resolution) {
        var centerLon = this.projectionCenterLonLat_[0];
        var centerLat = this.projectionCenterLonLat_[1];
        var interval = -1;
        var i, ii, delta, dist;
        var target = Math.pow(this.targetSize_ * resolution, 2);
        var p1 = [];
        var p2 = [];
        for (i = 0, ii = self.intervals_.length; i < ii; ++i) {
            delta = self.intervals_[i] / 2;
            p1[0] = centerLon - delta;
            p1[1] = centerLat - delta;
            p2[0] = centerLon + delta;
            p2[1] = centerLat + delta;
            this.fromLonLatTransform_(p1, p1);
            this.fromLonLatTransform_(p2, p2);
            dist = Math.pow(p2[0] - p1[0], 2) + Math.pow(p2[1] - p1[1], 2);
            if (dist <= target) {
                break;
            }
            interval = self.intervals_[i];
        }
        return interval;
    };
    self.prototype.getMap = function() {
        return this.map_;
    };
    self.prototype.getMeridian_ = function(lon, minLat, maxLat, squaredTolerance, index) {
        var flatCoordinates = ol.geom.flat.geodesic.meridian(lon, minLat, maxLat, this.projection_, squaredTolerance);
        var lineString = this.meridians_[index] !== undefined ? this.meridians_[index] : new ol.geom.LineString(null);
        lineString.setFlatCoordinates(ol.geom.GeometryLayout.XY, flatCoordinates);
        return lineString;
    };
    self.prototype.getMeridians = function() {
        return this.meridians_;
    };
    self.prototype.getParallel_ = function(lat, minLon, maxLon, squaredTolerance, index) {
        var flatCoordinates = ol.geom.flat.geodesic.parallel(lat, this.minLon_, this.maxLon_, this.projection_, squaredTolerance);
        var lineString = this.parallels_[index] !== undefined ? this.parallels_[index] : new ol.geom.LineString(null);
        lineString.setFlatCoordinates(ol.geom.GeometryLayout.XY, flatCoordinates);
        return lineString;
    };
    self.prototype.getParallels = function() {
        return this.parallels_;
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
    self.prototype.updateProjectionInfo_ = function(projection) {
        var epsg4326Projection = ol.proj.get("EPSG:4326");
        var extent = projection.getExtent();
        var worldExtent = projection.getWorldExtent();
        var worldExtentP = ol.proj.transformExtent(worldExtent, epsg4326Projection, projection);
        var maxLat = worldExtent[3];
        var maxLon = worldExtent[2];
        var minLat = worldExtent[1];
        var minLon = worldExtent[0];
        var maxLatP = worldExtentP[3];
        var maxLonP = worldExtentP[2];
        var minLatP = worldExtentP[1];
        var minLonP = worldExtentP[0];
        this.maxLat_ = maxLat;
        this.maxLon_ = maxLon;
        this.minLat_ = minLat;
        this.minLon_ = minLon;
        this.maxLatP_ = maxLatP;
        this.maxLonP_ = maxLonP;
        this.minLatP_ = minLatP;
        this.minLonP_ = minLonP;
        this.fromLonLatTransform_ = ol.proj.getTransform(epsg4326Projection, projection);
        this.toLonLatTransform_ = ol.proj.getTransform(projection, epsg4326Projection);
        this.projectionCenterLonLat_ = this.toLonLatTransform_(ol.extent.getCenter(extent));
        this.projection_ = projection;
    };
    self.prototype.setMap = function(map) {
        if (this.map_) {
            this.map_.un(ol.render.EventType.POSTCOMPOSE, this.handlePostCompose_, this);
            this.map_.render();
        }
        if (map) {
            map.on(ol.render.EventType.POSTCOMPOSE, this.handlePostCompose_, this);
            map.render();
        }
        this.map_ = map;
    };
    ol.LabelGraticule = self;
})(ol);
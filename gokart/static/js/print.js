"use strict";
window.gokart = (function(self) {
    var $self = $(self)
    var layout = self.layout = {};

    $.get("/static/images/legend.svg", function(tmpl) {
        layout.legendTmpl = Handlebars.compile(tmpl)
    }, "text");

    // resize to mm dimensions, save layout
    layout.setSize = function(width, height) {
        $("body").css("cursor", "progress");
        $(".download").addClass("hide");
        layout.width = width;
        layout.height = height;
        layout.size = self.map.getSize()
        layout.extent = self.map.getView().calculateExtent(layout.size);
        layout.px_per_mm = self.px_per_mm;
        layout.scale = self.get_fixed_scale();
        self.px_per_mm = 150 / 25.4;
        self.map.setSize([self.px_per_mm * width, self.px_per_mm * height]);
        self.map.getView().fit(layout.extent, self.map.getSize());
        self.set_scale(layout.scale);
    }

    layout.resetSize = function() {
        self.map.setSize(layout.size);
        self.px_per_mm = layout.px_per_mm;
        self.map.getView().fit(layout.extent, self.map.getSize());
        self.set_scale(layout.scale);
        $("body").css("cursor", "default");
        $(".download").removeClass("hide");
    }

    self.renderLegend = function(title, subtitle) {
        return URL.createObjectURL(new Blob([layout.legendTmpl({
            km: (Math.round(self.get_scale() * 40) / 1000).toLocaleString(),
            scale: $("#menu-scale").val(),
            title: title,
            subtitle: subtitle,
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
        var timer;
        // Resize to A3 landscape 150dpi
        layout.setSize(420, 297);
        var composing = self.map.on("postcompose", function(event) {
            timer && clearTimeout(timer);
            timer = setTimeout(function() {
                // remove composing watcher
                self.map.unByKey(composing);
                var canvas = event.context.canvas;
                var img = new Image();
                var url = self.renderLegend("Quick Print", "some@user");
                img.onload = function () {
                    // legend is 12cm wide
                    layout.canvasPxPerMM = canvas.width / layout.width
                    canvas.getContext("2d").drawImage(img, 0, 0, 120 * layout.canvasPxPerMM, 120 * layout.canvasPxPerMM * img.height / img.width);
                    URL.revokeObjectURL(url);
                    canvas.toBlob(function(blob) {
                        if (format == "jpg") {
                            saveAs(blob, "map.jpg");
                            layout.resetSize();
                        } else if (format == "pdf") {
                            self.blobToPDF(blob, "map");
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

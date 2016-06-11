"use strict";
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

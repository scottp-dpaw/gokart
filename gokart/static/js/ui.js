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
        "tool-colour-r": "#cc0000",
        "tool-colour-o": "#f57900",
        "tool-colour-y": "#edd400",
        "tool-colour-g": "#73d216",
        "tool-colour-b": "#3465a4",
        "tool-colour-v": "#75507b",
        "tool-colour-br": "#8f5902",
        "tool-colour-gr": "#555753",
        "tool-colour-bl": "#000000"
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

    // rig up groups
    $("#tool-group-mode").on("click", ".button", function(ev) {
        $("#tool-group-mode .button").removeClass("selected");
        $(this).addClass("selected");
        self.mode = this.id;
    });

    $("#tool-group-size").on("click", ".button", function(ev) {
        $("#tool-group-size .button").removeClass("selected");
        $(this).addClass("selected");
        self.size = this.id;
    });

    $("#tool-group-colour").on("click", ".button", function(ev) {
        $("#tool-group-colour .button").removeClass("selected");
        $(this).addClass("selected");
        self.colour = this.id;
    });

    ui.renderActiveLayers = function(ev) {
        if (ui.updatingOrder) { return }
        ui.layersActive.html(ui.activeLayersTmpl({
            layers: self.map.getLayers().getArray()
        })).append(ui.layersActive.children().get().reverse());
    }
    
    ui.updateOrder = function(el) {
        ui.updatingOrder = true;
        $(ui.layersActive.children().get().reverse()).each(function() {
            var layer = self.layerById($(this).attr("data-layer-id"));
            self.map.removeLayer(layer);
            self.map.addLayer(layer);
        })
        ui.updatingOrder = false;
    }

    ui.downloadJPG = function() {
        var timer;
        $("body").css("cursor", "progress");
        var composing = self.map.on("postcompose", function(event) {
            timer && clearTimeout(timer);
            timer = setTimeout(function() {
                var canvas = event.context.canvas;
                var img = new Image();
                var svg = new Blob([ui.legendTmpl({
                    km: (Math.round(self.get_scale() * 40) / 1000).toLocaleString(),
                    scale: $("#menu-scale").val(),
                    title: "map.jpg",
                    subtitle: "some@user",
                    date: moment().format('[Printed] MMMM Do YYYY, h:mm:ss a')
                })], {type: "image/svg+xml;charset=utf-8"});
                var url = URL.createObjectURL(svg);
                img.onload = function () {
                    // legend is 12cm wide
                    canvas.getContext("2d").drawImage(img, 0, 0, 787, 787 * img.height / img.width);
                    URL.revokeObjectURL(url);
                    canvas.toBlob(function(blob) {
                        saveAs(blob, "map.jpg")
                        // remove composing watcher
                        self.map.unByKey(composing);
                        self.map.setSize(ui.origSize);
                        self.px_per_mm = ui.origPxPerMM;
                        self.map.getView().fit(ui.origExtent, self.map.getSize());
                        self.set_scale(ui.origScale);
                        $("body").css("cursor", "default");
                    }, 'image/jpeg', 0.9)
                }
                img.src = url;
            }, 2000);
        });
        self.map.renderSync();
    }

    $.get("/static/images/legend.svg", function(tmpl) {
        ui.legendTmpl = Handlebars.compile(tmpl)
    }, "text");
    

    $self.on("init_map", function() {
        // setup scale events
        ui.menuScale = $("#menu-scale").on("change", function() { self.set_scale($(this).val().replace("1:", "").replace(/,/g, "").replace("K", "")) });
        $.each(self.fixed_scales, function(index, val) { ui.menuScale.append("<option>1:" + val.toLocaleString() + "K</option>") });
        ui.menuScale.prepend('<option id="actualScale">' + self.getScaleString() + '</option>');
        self.map.on("postrender", function() {
            ui.menuScale.find("#actualScale").text(self.getScaleString());
            ui.menuScale.val(self.getScaleString());
        });
        $("#download-jpg").on("click", function() {
            ui.origSize = self.map.getSize()
            ui.origExtent = self.map.getView().calculateExtent(ui.origSize);
            ui.origPxPerMM = self.px_per_mm;
            ui.origScale = self.get_fixed_scale();
            // Resize to A3 landscape
            self.map.setSize([2481, 1754]);
            self.px_per_mm = 2481 / 420;
            // Back to normal extent
            self.map.getView().fit(ui.origExtent, self.map.getSize());
            // Pick a nice scale
            self.set_scale(ui.origScale);
            ui.downloadJPG();
        });
        // setup layer ordering if layer ui available
        if ($("#layers-active").length == 1) {
            ui.activeLayersTmpl = Handlebars.compile($("#layers-active-template").html());
            ui.layerDetailsTmpl = Handlebars.compile($("#layer-details-template").html());
            ui.layersActive = $("#layers-active").on("click", "div[data-layer-id]", function() {
                $("#layer-details").html(ui.layerDetailsTmpl({
                    ol_layer: self.layerById($(this).attr("data-layer-id")),
                    catalog_layer: {abstract: "placeholder abstract"}
                }));
            });
            self.map.getLayerGroup().on("change", ui.renderActiveLayers);
            dragula([ui.layersActive.get(0)]).on("dragend", ui.updateOrder);
            ui.renderActiveLayers();
        }
    });

    return self;
})(window.gokart || {});



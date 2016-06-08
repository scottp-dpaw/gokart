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
        ui.layersActive.html(ui.activeLayersTmpl({
            layers: self.map.getLayers().getArray()
        })).append(ui.layersActive.children().get().reverse());
    }
    
    ui.updateOrder = function(el) {
        console.log(ui.layersActive.children());
    }

    // wire up scale
    $self.on("init_map", function() {
        ui.menuScale = $("#menu-scale").appendTo($(gokart.map.getTargetElement()).find(".ol-overlaycontainer-stopevent"));
        $.each(self.fixed_scales, function(index, val) {
            ui.menuScale.append("<option>1:" + (val / 1000).toLocaleString() + "K</option>");
        })
        ui.menuScale.on("change", function() {
            self.set_scale($(this).val().replace("1:", "").replace(/,/g, "").replace("K", "") * 1000);
        })
        self.map.on("postrender", function() {
            ui.menuScale.val("1:" + (self.get_fixed_scale() / 1000).toLocaleString() + "K")
        })
        if ($("#layers-active").length == 1) {
            ui.activeLayersTmpl = Handlebars.compile($("#layers-active-template").html());
            ui.layersActive = $("#layers-active").on("click", "div[data-layer-id]", function() {
                console.log($(this).attr("data-layer-id"));
            })
            self.map.getLayerGroup().on("change", ui.renderActiveLayers);
            dragula([ui.layersActive.get(0)]).on("dragend", ui.updateOrder);
            ui.renderActiveLayers();
        }
    });

    return self;
})(window.gokart || {});



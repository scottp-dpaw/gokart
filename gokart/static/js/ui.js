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

    return self;
})(window.gokart || {});



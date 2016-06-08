var map = new ol.Map({
    target: 'map',
    layers: [
        new ol.layer.Tile({
            source: new ol.source.MapQuest({layer: 'sat'})
        })
    ],
    view: new ol.View({
        center: ol.proj.fromLonLat([37.41, 8.82]),
        zoom: 4
    }),
    controls: [
        new ol.control.Zoom(),
        new ol.control.ScaleLine(),
        new ol.control.MousePosition({
            projection: "EPSG:4326",
            coordinateFormat: function(coord) {
                return ol.coordinate.toStringHDMS(coord);
            }
        }),
    ]
});

// bind menu side-tabs to reveal the side pane

$("#menu-tabs").on("change.zf.tabs", function(ev) {
    $("#offCanvasLeft").addClass("reveal-for-medium");
    map.updateSize();
});

$("#menu-tabs").on("click", ".tabs-title a[aria-selected=false]", function(ev) {
    $("#offCanvasLeft").addClass("reveal-for-medium");
    $(this).attr("aria-selected", true);
    map.updateSize();
}); 

$("#menu-tabs").on("click", ".tabs-title a[aria-selected=true]", function(ev) {
    $("#offCanvasLeft").removeClass("reveal-for-medium");
    $(this).attr("aria-selected", false);
    map.updateSize();
});

var sizes = {
    "tool-size-small": 16,
    "tool-size-medium": 32,
    "tool-size-large": 64
}; 

var colours = {
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

var sss_mode = $("#tool-group-mode .button.selected")[0].id;
var sss_size = $("#tool-group-size .button.selected")[0].id;
var sss_colour = $("#tool-group-colour .button.selected")[0].id;

// rig up groups

$("#tool-group-mode").on("click", ".button", function(ev) {
    $("#tool-group-mode .button").removeClass("selected");
    $(this).addClass("selected");
    sss_mode = this.id;
});

$("#tool-group-size").on("click", ".button", function(ev) {
    $("#tool-group-size .button").removeClass("selected");
    $(this).addClass("selected");
    sss_size = this.id;
});

$("#tool-group-colour").on("click", ".button", function(ev) {
    $("#tool-group-colour .button").removeClass("selected");
    $(this).addClass("selected");
    sss_colour = this.id;
});



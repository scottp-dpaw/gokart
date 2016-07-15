<template>
    <div class="map" id="map" tabindex="0">
        <gk-info v-ref:info></gk-info>
        <select v-el:scale @change="setScale($event.target.value)" id="menu-scale" v-cloak>
            <option value="{{ scale }}" selected>{{ scaleString }}</option>
            <option v-for="s in fixedScales" value="{{ s }}">{{ getScaleString(s) }}</option>
        </select>
    </div>
</template>

<script>
    import gkInfo from './info.vue'
    export default {
        components: { gkInfo },
        data: function() {
            var resolutions = [0.17578125, 0.087890625, 0.0439453125, 0.02197265625, 0.010986328125, 0.0054931640625, 0.00274658203125, 0.001373291015625, 0.0006866455078125, 0.0003433227539062, 0.0001716613769531, 858306884766e-16, 429153442383e-16, 214576721191e-16, 107288360596e-16, 53644180298e-16, 26822090149e-16, 13411045074e-16]
            return {
                // default matrix from KMI
                resolutions: resolutions,
                matrixSets: {
                    'EPSG:4326': {
                        '1024': {
                            'name': 'gda94',
                            'resolutions': resolutions,
                            'minLevel': 0,
                            'maxLevel': 17
                        }
                    }
                },
                // overridable defaults for WMTS and WFS loading
                defaultWMTSSrc: 'https://kmi.dpaw.wa.gov.au/geoserver/gwc/service/wmts',
                defaultWFSSrc: 'https://kmi.dpaw.wa.gov.au/geoserver/wfs',
                // fixed scales for the scale selector (1:1K increments)
                fixedScales: [0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 80, 100, 125, 250, 500, 1000, 2000, 3000, 5000, 10000, 25000],
                scale: 0,
                graticule: new ol.LabelGraticule(),
                dragPanInter: new ol.interaction.DragPan(),
                doubleClickZoomInter: new ol.interaction.DoubleClickZoom(),
                keyboardPanInter: new ol.interaction.KeyboardPan(),
                keyboardZoomInter: new ol.interaction.KeyboardZoom()
            }
        },
        // parts of the template to be computed live
        computed: {
            // scale string for the current map zoom level
            scaleString: function() {
                return this.getScaleString(this.scale);
            },
            // because the viewport size changes when the tab pane opens, don't cache the map width and height            
            mapWidth: {
                cache: false,
                get: function get() {
                    if (this.$el) {
                        return this.$el.clientWidth
                    }
                    return 0
                }
            },
            mapHeight: {
                cache: false,
                get: function get() {
                    if (this.$el) {
                        return this.$el.clientHeight
                    }
                    return 0
                }
            }
        },
        // methods callable from inside the template
        methods: {
            // force OL to approximate a fixed scale (1:1K increments)
            setScale: function(scale) {
                while (Math.abs(this.getScale() - scale) > 0.001) {
                    this.olmap.getView().setResolution(this.olmap.getView().getResolution() * scale / this.getScale())
                }
                this.scale = scale
                this.$els.scale.selectedIndex = 0
            },
            // return the scale (1:1K increments)
            getScale: function () {
                var size = this.olmap.getSize()
                var center = this.olmap.getView().getCenter()
                var extent = this.olmap.getView().calculateExtent(size)
                var distance = this.$root.wgs84Sphere.haversineDistance([extent[0], center[1]], center) * 2
                return distance * this.$root.dpmm / size[0]
            },
            // get the fixed scale (1:1K increments) closest to current scale
            getFixedScale: function () {
                var scale = this.getScale()
                var closest = null
                $.each(this.fixedScales, function () {
                    if (closest === null || Math.abs(this - scale) < Math.abs(closest - scale)) {
                        closest = this
                    }
                })
                return closest
            },
            // generate a human-readable scale string
            getScaleString: function (scale) {
                if (Math.round(scale * 100) / 100 < 1.0) {
                    return '1:' + (Math.round(scale * 100000) / 100).toLocaleString()
                } else if (Math.round(scale * 100) / 100 >= 1000.0) {
                    return '1:' + (Math.round(scale / 10) / 100).toLocaleString() + 'M'
                }
                return '1:' + (Math.round(scale * 100) / 100).toLocaleString() + 'K'
            },
            // reusable tile loader hook to update a loading indicator
            tileLoaderHook: function (tileSource, tileLayer) {
                // number of tiles currently in flight
                var numLoadingTiles = 0
                // number of misses for the current set
                var badTiles = 0
                var tileLoader = tileSource.getTileLoadFunction()
                return function (tile, src) {
                    if (numLoadingTiles === 0) {
                        tileLayer.progress = 'loading'
                        badTiles = 0
                    }
                    numLoadingTiles++
                    var image = tile.getImage()
                    // to hell with you, cross origin policy!
                    image.crossOrigin = 'anonymous'
                    image.onload = function () {
                        numLoadingTiles--
                        if (numLoadingTiles === 0) {
                            if (badTiles > 0) {
                                tileLayer.progress = 'error'
                            } else {
                                tileLayer.progress = 'idle'
                            }
                        }
                    }
                    image.onerror = function () {
                        badTiles++
                        image.onload()
                    }
                    tileLoader(tile, src)
                }
            },
            // loader for layers with a "time" axis, e.g. live satellite imagery
            createTimelineLayer: function (mapObj) {
                var options = this
                options.params = $.extend({
                    FORMAT: 'image/jpeg',
                    SRS: 'EPSG:4326',
                }, options.params || {})

                // technically, we can specify a WMS source and a layer without
                // either the source URL or the layerID. which is good, because
                // we need to do that later on in a callback.
                var tileSource = new ol.source.TileWMS({
                    params: options.params,
                    tileGrid: new ol.tilegrid.TileGrid({
                        extent: [-180, -90, 180, 90],
                        resolutions: mapObj.resolutions,
                        tileSize: [1024, 1024]
                    })
                })

                var tileLayer = new ol.layer.Tile({
                    opacity: options.opacity || 1,
                    source: tileSource
                })

                // hook the tile loading function to update progress indicator
                tileLayer.progress = ''
                tileSource.setTileLoadFunction(mapObj.tileLoaderHook(tileSource, tileLayer))

                // hook to swap the tile layer when timeIndex changes
                tileLayer.on('propertychange', function (event) {
                    if (event.key === 'timeIndex') {
                        tileSource.updateParams({
                            'layers': options.timeline[event.target.get(event.key)][1]
                        })
                    }
                })

                // helper function to update the time index
                options.updateTimeline = function () {
                    // fetch the latest timestamp-to-layerID map from the source URL
                    $.getJSON(options.source, function (data) {
                        tileLayer.set('updated', moment().toLocaleString())
                        tileSource.setUrls(data.servers)
                        options.timeline = data.layers.reverse()
                        tileLayer.set('timeIndex', options.timeIndex || options.timeline.length - 1)
                        mapObj.$root.gkLayers.update()
                    })
                }

                options.updateTimeline()
                // if the "refresh" option is set, set a timer
                // to update the source
                if (options.refresh) {
                    tileLayer.refresh = setInterval(function () {
                        options.updateTimeline()
                    }, options.refresh * 1000)
                }

                // set properties for use in layer selector
                tileLayer.set('name', options.name)
                tileLayer.set('id', options.id)
                return tileLayer
            },
            // loader for vector layers with hover querying
            createWFSLayer: function (mapObj) {
                var options = this
                var url = mapObj.defaultWFSSrc
                // default overridable params sent to the WFS source
                options.params = $.extend({
                    version: '1.1.0',
                    service: 'WFS',
                    request: 'GetFeature',
                    outputFormat: 'application/json',
                    srsname: 'EPSG:4326',
                    typename: options.id,
                }, options.params || {})


                var vectorSource = new ol.source.Vector()
                var vector = new ol.layer.Vector({
                    opacity: options.opacity || 1,
                    source: vectorSource,
                    style: options.style
                })
                vector.progress = ''

                vectorSource.loadSource = function () {
                    if (options.cql_filter) {
                        options.params.cql_filter = options.cql_filter
                    } else if (options.params.cql_filter) {
                        delete options.params.cql_filter
                    }
                    vector.progress = 'loading'
                    $.ajax({
                        url: url + '?' + $.param(options.params),
                        success: function (response, stat, xhr) {
                            var features = mapObj.$root.geojson.readFeatures(response)
                            vectorSource.clear(true)
                            vectorSource.addFeatures(features)
                            vector.progress = 'idle'
                        },
                        error: function () {
                            vector.progress = 'error'
                        },
                        dataType: 'json',
                        xhrFields: {
                            withCredentials: true
                        }
                    })
                }

                if (options.onadd) {
                    vectorSource.on('addfeature', function (event) {
                        options.onadd(event.feature)
                    })
                }


                // if the "refresh" option is set, set a timer
                // to update the source
                if (options.refresh) {
                    vector.set('updated', moment().toLocaleString())
                    vectorSource.refresh = setInterval(function () {
                        vector.set('updated', moment().toLocaleString())
                        vectorSource.loadSource()
                    }, options.refresh * 1000)
                }
                vectorSource.loadSource()

                vector.set('name', options.name)
                vector.set('id', options.id)
                return vector
            },
            // loader to create a WMTS layer from a kmi datasource
            createTileLayer: function (mapObj) {
                var layer = this
                if (layer.base) {
                    layer.format = 'image/jpeg'
                }
                layer = $.extend({
                    opacity: 1,
                    name: 'Mapbox Outdoors',
                    id: 'dpaw:mapbox_outdoors',
                    format: 'image/png',
                    tileSize: 1024,
                    style: '',
                    projection: 'EPSG:4326',
                    wmts_url: mapObj.defaultWMTSSrc,
                }, layer)

                // create a tile grid using the stock KMI resolutions
                var matrixSet = mapObj.matrixSets[layer.projection][layer.tileSize]
                var tileGrid = new ol.tilegrid.WMTS({
                    origin: ol.extent.getTopLeft([-180, -90, 180, 90]),
                    resolutions: matrixSet.resolutions,
                    matrixIds: matrixSet.matrixIds,
                    tileSize: layer.tileSize
                })

                // override getZForResolution on tile grid object;
                // for weird zoom levels, the default is to round up or down to the
                // nearest integer to determine which tiles to use.
                // because we want the printing rasters to contain as much detail as
                // possible, we rig it here to always round up.
                tileGrid.origGetZForResolution = tileGrid.getZForResolution
                tileGrid.getZForResolution = function (resolution, opt_direction) {
                    return tileGrid.origGetZForResolution(resolution, -1)
                }

                // create a tile source
                var tileSource = new ol.source.WMTS({
                    url: layer.wmts_url,
                    layer: layer.id,
                    matrixSet: matrixSet.name,
                    format: layer.format,
                    style: layer.style,
                    projection: layer.projection,
                    wrapX: true,
                    tileGrid: tileGrid
                })

                var tileLayer = new ol.layer.Tile({
                    opacity: layer.opacity || 1,
                    source: tileSource
                })

                // hook the tile loading function to update progress indicator
                tileLayer.progress = ''
                tileSource.setTileLoadFunction(mapObj.tileLoaderHook(tileSource, tileLayer))

                // if the "refresh" option is set, set a timer
                // to force a reload of the tile content
                if (layer.refresh) {
                    tileLayer.set('updated', moment().toLocaleString())
                    tileLayer.refresh = setInterval(function () {
                        tileLayer.set('updated', moment().toLocaleString())
                        tileSource.setUrl(layer.wmts_url + '?time=' + moment.utc().unix())
                    }, layer.refresh * 1000)
                }
                // set properties for use in layer selector
                tileLayer.set('name', layer.name)
                tileLayer.set('id', layer.id)
                return tileLayer
            },
            getMapLayer: function (id) {
                if (id && id.id) { id = id.id } // if passed a catalogue layer, get actual id
                return this.olmap.getLayers().getArray().find(function (layer) {
                    return layer.get('id') === id
                })
            },
            // initialise map
            init: function (catalogue, layers, options) {
                var vm = this
                options = options || {}
                this.$root.catalogue.catalogue.extend(catalogue)

                var initialLayers = layers.reverse().map(function (id) {
                    return vm.$root.catalogue.getLayer(id).init()
                })

                this.olmap = new ol.Map({
                    logo: false,
                    renderer: 'canvas',
                    target: 'map',
                    layers: initialLayers,
                    view: new ol.View({
                        projection: 'EPSG:4326',
                        center: [123.75, -24.966],
                        zoom: 6,
                        maxZoom: 21,
                        minZoom: 5
                    }),
                    controls: [
                        new ol.control.Zoom(),
                        new ol.control.ScaleLine(),
                        new ol.control.FullScreen({
                            source: $('body').get(0),
                            label: $('<i/>', {
                                class: 'fa fa-expand'
                            })[0]
                        }),
                        new ol.control.Control({
                            element: $('#menu-scale').get(0)
                        }),
                        new ol.control.Attribution()
                    ],
                    interactions: ol.interaction.defaults({
                        altShiftDragRotate: false,
                        pinchRotate: false,
                        dragPan: false,
                        doubleClickZoom: false,
                        keyboard: false
                    })
                })
                var params = {}
                decodeURIComponent(location.search).slice(1).split('&').forEach(function (p) {
                    var t = p.split('=')
                    params[t[0]] = parseFloat(t[1])
                })
                if (params.scale) {
                    this.olmap.getView().setCenter([params.lon, params.lat])
                    vm.setScale(params.scale / 1000)
                }
                // add some default interactions
                this.olmap.addInteraction(this.dragPanInter)
                this.olmap.addInteraction(this.doubleClickZoomInter)
                this.olmap.addInteraction(this.keyboardPanInter)
                this.olmap.addInteraction(this.keyboardZoomInter)

                // Create the graticule component
                this.graticule.setMap(this.olmap)

                // setup scale events
                this.olmap.on('postrender', function () {
                    vm.scale = vm.getScale()
                    vm.$els.scale.selectedIndex = 0
                })

                // tell other components map is ready
                this.$root.$broadcast("gk-init")
            }
        },
        ready: function() {
            // generate matrix IDs from name and level number
            $.each(this.matrixSets, function (projection, innerMatrixSets) {
                $.each(innerMatrixSets, function (tileSize, matrixSet) {
                    var matrixIds = new Array(matrixSet.maxLevel - matrixSet.minLevel + 1)
                    for (var z = matrixSet.minLevel; z <= matrixSet.maxLevel; ++z) {
                        matrixIds[z] = matrixSet.name + ':' + z
                    }
                    matrixSet.matrixIds = matrixIds
                })
            })
        }
    }
</script>

<style>
    /* full-height page for slippy map, thanks */
    
    html,
    body {
        width: 100%;
        height: 100%;
        margin: 0;
        padding: 0;
        overflow: hidden;
    }
    
    [v-cloak] {
        display: none;
    }
    /* mousehover info pane, hide for mobile */
    
    @media screen and (max-width: 40em) {
        #info {
            display: none;
        }
    }
    
    #info {
        position: absolute;
        z-index: 100;
        padding: 2em;
        background-color: #424f5a;
        max-width: 40%;
    }
    
    #info .content {
        max-height: 30vh;
        overflow: auto;
    }
    /* full-height the foundation off-canvas stuff also */
    
    .off-canvas-wrapper {
        height: 100%;
    }
    
    .off-canvas-wrapper-inner {
        height: 100%;
        background-color: #424f5a;
        color: #fbfbfb;
    }
    /* SVG icons for buttons (include margin for aligning to text) */
    
    .icon {
        width: 20px;
        height: 20px;
        margin-bottom: -5px;
    }
    
    .off-canvas-content {
        height: 100%;
    }
    
    .off-canvas {
        height: 100%;
        display: flex;
        flex-direction: column;
        justify-content: flex-start;
        align-items: stretch;
        align-content: stretch;
    }
    
    .off-canvas .tabs-content {
        height: 100%;
        flex: 1;
    }
    /* slippy map widget */
    
    .map {
        width: 100%;
        height: 100%;
        min-height: 20px;
        flex: 1;
        background: url('../static/images/bg.png') repeat;
        background-position: center;
        position: relative;
        outline: 0;
    }
    
    .ol-overviewmap .ol-overviewmap-map {
        border: 0px;
        margin: 0px;
        width: 30vw;
        height: 30vh;
    }
    
    .ol-overviewmap .ol-overviewmap-map .ol-overviewmap-box {
        display: none;
    }
    /* position fixes for top-right OpenLayers map widgets */
    
    .ol-scale-line {
        top: 72px;
        left: auto;
        right: 72px;
        bottom: auto;
        border: 1px solid transparent;
    }
    
    .ol-full-screen {
        top: 16px;
        right: 16px;
        padding: 0;
    }
    
    .ol-zoom {
        top: 72px;
        left: auto;
        right: 16px;
        bottom: auto;
        padding: 0;
    }
    
    .ol-zoom button,
    .ol-full-screen button {
        width: 48px;
        height: 48px;
    }
    
    #menu-scale {
        position: absolute;
        top: 16px;
        right: 72px;
        width: 96px;
        cursor: pointer;
        font-size: 0.8rem;
        border: 0;
        margin: 1px;
        color: white;
        height: 48px;
    }
    /* for mobile screens, size the pane to fill the viewport */
    
    .off-canvas.position-left {
        left: -100vw;
        width: 100vw;
    }
    
    .position-left.reveal-responsive {
        left: 0;
        position: fixed;
        z-index: 0;
    }
    
    .position-left.reveal-responsive ~ .off-canvas-content {
        margin-left: 100vw;
    }
    
    #side-pane-close {
        display: none;
    }
    
    .position-left.reveal-responsive #side-pane-close {
        display: block;
        position: absolute;
        right: 0;
        top: 0;
    }
    /* for non-mobile screens, have a fixed 400px left pane */
    
    @media screen and (min-width: 40em) {
        /* widen the off canvas area*/
        .off-canvas.position-left {
            left: -424px;
            width: 424px;
        }
        .position-left.reveal-responsive {
            left: 0;
            position: fixed;
            z-index: auto;
        }
        .position-left.reveal-responsive ~ .off-canvas-content {
            margin-left: 424px;
        }
        #side-pane-close {
            display: none;
        }
        .position-left.reveal-responsive #side-pane-close {
            display: none;
        }
    }
    /* raise our widgets above the slippy map */
    
    .map-widget {
        position: absolute;
        z-index: 1;
    }
    /* remove some of the annoying tab box styles */
    
    #offCanvasLeft {
        background-color: transparent;
    }
    
    #offCanvasLeft .tabs-content {
        background-color: transparent;
        border: 0;
    }
    /* fix tool labels/padding */
    
    .tool-label,
    .off-canvas label.tool-label {
        font-size: 80%;
        float: left;
        width: 200px;
    }
    
    .tool-slice {
        margin-bottom: 4px;
    }
    
    .tool-slice input,
    .tool-slice select,
    .tool-slice button {
        margin: 0px;
    }
    
    .tool-slice .button.selected {
        border: 2px dotted #ffffff;
    }
    
    ;
    .button-group input {
        display: none;
    }
    
    .button-group input:checked + label,
    .button-group input:checked + label:active {
        background-color: rgba(0, 60, 136, 0.7);
    }
    /* make range sliders visible */
    
    input[type="range"] {
        background-color: transparent;
    }
    
    .tool-slice input[type="range"] {
        width: 100%;
    }
    /* make tool button text bigger */
    
    .button-group.expanded .button-tool {
        padding: 0.5em;
        font-size: 18px;
    }
    
    #menu-tabs {
        background-color: transparent;
        border: 0;
    }
    
    #menu-pagesize {
        font-weight: bold;
    }
    /* styling for tabs used in the side-pane */
    
    .off-canvas .tabs {
        background-color: rgba(37, 45, 51, 0.9);
        border: 0;
    }
    
    .off-canvas .tabs a {
        color: white;
        border: 1px solid transparent;
        text-align: center;
        padding: 16px 4px;
    }
    
    .off-canvas .tabs a:hover {
        background-color: rgba(128, 128, 128, 0.23);
    }
    
    .off-canvas .tabs a:focus {
        background-color: transparent;
    }
    
    .off-canvas .tabs a[aria-selected="true"] {
        background-color: rgba(128, 128, 128, 0.46);
        border: 1px solid rgba(37, 45, 51, 0.9);
    }
    /* rig the tabs to use flexbox for full-width */
    
    .off-canvas .tabs {
        display: flex;
        width: 100%;
    }
    
    .off-canvas .tabs .tabs-title {
        flex: 1 1 0px;
    }
    
    .off-canvas .tabs a {
        height: 100%;
    }
    /* styling for switch widgets used in the side pane */
    
    .off-canvas .switch-paddle {
        background: rgba(37, 45, 51, 0.9);
    }
    
    .off-canvas .switch-input,
    .off-canvas .switch {
        margin: 0;
    }
    
    .off-canvas label {
        color: white;
        line-height: inherit;
        font-size: inherit;
        font-weight: inherit;
    }
    
    .side-label {
        margin-left: 1em;
    }
    /* Set height of internal layers to allow for bottom details */
    
    .layers-topframe {
        height: 60vh;
        border-bottom: 1px solid rgba(37, 45, 51, 0.9);
    }
    
    .scroller {
        overflow-y: auto;
    }
    /* remove extra padding for tab boxes inside other tab boxes */
    
    #layers-list {
        padding: 1rem 0 0 0;
    }
    /* styling for movable row boxes */
    
    .layer-row,
    .feature-row {
        color: white;
        background-color: rgba(37, 45, 51, 0.5);
        padding: 4px;
        cursor: pointer;
    }
    
    .layer-row:nth-child(even),
    .feature-row:nth-child(even) {
        background-color: rgba(37, 45, 51, 0.3);
    }
    
    .layer-row .layer-title {
        font-size: 120%;
    }
    
    .layer-row .layer-id {
        font-style: italic;
        font-size: 75%;
    }
    /* Add dotted line box to dragged layers*/
    
    .layer-row.gu-transit {
        border: 2px dashed #ffffff;
        border-radius: 4px;
    }
    /* Add status indicator to left hand side of layer rows */
    
    .layer-row {
        border-left: 3px solid transparent;
    }
    
    @keyframes layer-pulse {
        0% {
            border-left-color: #ffcf41;
        }
        50% {
            border-left-color: #edb100;
        }
        100% {
            border-left-color: #ffcf41;
        }
    }
    
    .layer-row.idle {
        border-left-color: #71c837;
    }
    
    .layer-row.loading {
        animation-name: layer-pulse;
        animation-duration: 1s;
        animation-iteration-count: infinite;
    }
    
    .layer-row.error {
        border-left-color: #ec5840;
    }
    /* custom F6 tab style overrides for the side buttons  */
    
    .side-button > a {
        background-color: rgba(37, 45, 51, 0.7);
        border-left: 3px solid transparent;
        padding: 1em;
        font-size: 24px;
        color: white;
    }
    
    .side-button .icon {
        width: 24px;
        height: 24px;
    }
    
    .side-button > a:hover {
        background-color: rgba(37, 45, 51, 0.9);
    }
    
    .side-button > a:focus {
        background-color: rgba(37, 45, 51, 0.7);
    }
    
    .side-button > a[aria-selected="true"] {
        background-color: rgba(37, 45, 51, 0.8);
        border-left: 3px solid #2199e8;
    }
    /* fix absurdly large margins on button groups */
    
    .button-group {
        margin-bottom: 1px;
    }
    /* colouring changes to OpenLayers widgets to match side buttons*/
    
    .ol-control,
    .ol-control:hover {
        background-color: transparent;
    }
    
    .ol-control button,
    .ol-control button:focus,
    .ol-scale-line,
    #menu-scale {
        background-color: rgba(37, 45, 51, 0.7);
    }
    
    .ol-control button:hover,
    .ol-scale-line:hover,
    #menu-scale:hover {
        background-color: rgba(37, 45, 51, 0.9);
    }
</style>

<template>
    <div class="tabs-panel" id="menu-tab-annotations" v-cloak>
        <div class="row collapse">
            <div class="columns">
                <ul class="tabs" data-tabs id="annotations-tabs">
                    <li class="tabs-title is-active"><a href="#annotations-edit" aria-selected="true">Annotations</a></li>
                </ul>
            </div>
        </div>
        <div class="row collapse" id="annotations-tab-panels">
            <div class="columns">
                <div class="tabs-content vertical" data-tabs-content="annotations-tabs">

                    <div class="tabs-panel is-active" id="annotations-edit" v-cloak>
                        <div class="tool-slice row collapse">
                            <div class="small-2"><label class="tool-label">Tool:</label></div>
                            <div class="small-10">
                                <div class="expanded button-group">
                                    <a v-for="t in tools | filterIf 'showName' undefined" class="button button-tool" v-bind:class="{'selected': t.name == tool.name}"
                                        @click="setTool(t)" v-bind:title="t.name">{{{ icon(t) }}}</a>
                                </div>
                                <div class="expanded stacked button-group">
                                    <a v-for="t in tools | filterIf 'showName' true" class="button" v-bind:class="{'selected': t.name == tool.name}" @click="setTool(t)"
                                        v-bind:title="t.name">{{{ icon(t) }}} {{ t.name }}</a>
                                </div>
                            </div>
                        </div>
                        <div v-if="advanced" class="tool-slice row collapse">
                            <div class="small-2"><label class="tool-label">Size:<br/>({{ size }})</label></div>
                            <div class="small-10">
                                <div class="expanded button-group">
                                    <a @click="size = 8" v-bind:class="{'selected': size == 8}" class="button"><small>Small</small></a>
                                    <a @click="size = 12" v-bind:class="{'selected': size == 12}" class="button">Medium</a>
                                    <a @click="size = 16" v-bind:class="{'selected': size == 16}" class="button"><big>Large</big></a>
                                </div>
                            </div>
                        </div>
                        <div v-if="advanced" class="tool-slice row collapse">
                            <div class="small-2"><label class="tool-label">Colour:</label></div>
                            <div class="small-10">
                                <div class="expanded button-group">
                                    <a v-for="c in colours" class="button" title="{{ c[0] }}" @click="colour = c[1]" v-bind:class="{'selected': c[1] == colour}"
                                        v-bind:style="{ backgroundColor: c[1] }"></a>
                                </div>
                            </div>
                        </div>
                        <div class="tool-slice row collapse">
                            <div class="small-2"><label class="tool-label">Ops:</label></div>
                            <div class="small-10">
                                <div class="expanded button-group">
                                    <a id="tool-cut" class="button"><i class="fa fa-cut" aria-hidden="true"></i> Cut</a>
                                    <a id="tool-copy" class="button"><i class="fa fa-copy" aria-hidden="true"></i> Copy</a>
                                    <a id="tool-paste" class="button"><i class="fa fa-paste" aria-hidden="true"></i> Paste</a>
                                </div>
                                <div class="expanded button-group">
                                    <a id="tool-undo" class="button"><i class="fa fa-undo" aria-hidden="true"></i> Undo</a>
                                    <a id="tool-redo" class="button"><i class="fa fa-repeat" aria-hidden="true"></i> Redo</a>
                                </div>
                                <div class="expanded button-group">
                                    <a id="tool-import" class="button"><i class="fa fa-upload" aria-hidden="true"></i> Import</a>
                                    <a id="tool-export" class="button"><i class="fa fa-download" aria-hidden="true"></i> Export</a>
                                </div>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>

    </div>
</template>

<script>
    var ui = {}
    export default {
        data: function() { return {
            tool: ui.defaultPan,
            tools: [
                ui.defaultPan,
                ui.defaultSelect
            ],
            features: ui.features,
            featureOverlay: ui.featureOverlay,
            size: 12,
            colour: '#cc0000',
            colours: [
                ['red', '#cc0000'],
                ['orange', '#f57900'],
                ['yellow', '#edd400'],
                ['green', '#73d216'],
                ['blue', '#3465a4'],
                ['violet', '#75507b'],
                ['brown', '#8f5902'],
                ['grey', '#555753'],
                ['black', '#000000']
            ],
            advanced: false
        }},
        methods: {
            icon: function (t) {
                if (t.icon.startsWith('fa-')) {
                    return '<i class="fa ' + t.icon + '" aria-hidden="true"></i>'
                } else {
                    return '<svg class="icon"><use xlink:href="' + t.icon + '"></use></svg>'
                }
            },
            setTool: function (t) {
                var vm = this
                // remove all custom tool interactions from map
                vm.tools.forEach(function (tool) {
                    tool.interactions.forEach(function (inter) {
                        self.map.removeInteraction(inter)
                    })
                })

                // add interactions for this tool
                t.interactions.forEach(function (inter) {
                    self.map.addInteraction(inter)
                })

                // remove selections
                ui.selectedFeatures.clear()

                // auto-disable hover info, but remember the user's choice
                ui.layers.hoverInfo = ((t.name === 'Pan') && (ui.layers.hoverInfoCache))

                // enable annotations layer, if disabled
                if (!self.getLayer('annotations').olLayer()) {
                    ui.catalogue.onLayerChange(self.getLayer('annotations'), true)
                }
                vm.tool = t
            },
            deleteSelected: function () {
                ui.selectedFeatures.forEach(function (feature) {
                    ui.features.remove(feature)
                })
                ui.selectedFeatures.clear()
            }
        },
        ready: function() {
            // collection to store all annotation features
            ui.features = new ol.Collection()
            ui.selectedFeatures = new ol.Collection()
            ui.features.on('add', function (ev) {
                var feature = ev.element
                var style = null
                if (feature.get('toolName')) {
                    style = ui.annotations.tools.filter(function (t) {
                        return t.name === feature.get('toolName')
                    })[0].style
                } else {
                    feature.set('toolName', ui.annotations.tool.name)
                    style = ui.annotations.tool.style
                }
                feature.setStyle(style || null)
            })
            // NASTYHACK: add/remove default style based on select status
            ui.selectedFeatures.on('add', function (ev) {
                var feature = ev.element
                feature.preSelectStyle = feature.getStyle()
                feature.setStyle(null)
            })
            ui.selectedFeatures.on('remove', function (ev) {
                var feature = ev.element
                feature.setStyle(feature.preSelectStyle)
                delete feature.preSelectStyle
            })
            // layer/source for modiftying annotation features
            ui.featureOverlay = new ol.layer.Vector({
                source: new ol.source.Vector({
                    features: ui.features
                })
            })
            ui.featureOverlay.set('id', 'annotations')
            ui.featureOverlay.set('name', 'My Annotations')
            // collection for tracking selected features

            // add new points to annotations layer
            ui.pointInter = new ol.interaction.Draw({
                type: 'Point',
                features: ui.features
            })

            // add new lines to annotations layer
            ui.lineInter = new ol.interaction.Draw({
                type: 'LineString',
                features: ui.features
            })

            // add new polygons to annotations layer
            ui.polyInter = new ol.interaction.Draw({
                type: 'Polygon',
                features: ui.features
            })

            // next three interacts are bundled into the Select tool
            // allow modifying features by click+dragging
            ui.modifyInter = new ol.interaction.Modify({
                features: ui.features
            })

            // allow dragbox selection of features
            ui.dragSelectInter = new ol.interaction.DragBox()
            // modify selectedFeatures after dragging a box
            ui.dragSelectInter.on('boxend', function () {
                var extent = ui.dragSelectInter.getGeometry().getExtent()
                ui.featureOverlay.getSource().forEachFeatureIntersectingExtent(extent, function (feature) {
                    ui.selectedFeatures.push(feature)
                })
            })
            // clear selectedFeatures before dragging a box
            ui.dragSelectInter.on('boxstart', function () {
                ui.selectedFeatures.clear()
            })
            // allow selecting multiple features by clicking
            ui.selectInter = new ol.interaction.Select({
                layers: [ui.featureOverlay],
                features: ui.selectedFeatures
            })

            // OpenLayers3 hook for keyboard input
            ui.keyboardInter = new ol.interaction.Interaction({
                handleEvent: function (mapBrowserEvent) {
                    var stopEvent = false
                    if (mapBrowserEvent.type === ol.events.EventType.KEYDOWN) {
                        var keyEvent = mapBrowserEvent.originalEvent
                        switch (keyEvent.keyCode) {
                        case 46: // Delete
                            ui.annotations.deleteSelected()
                            break
                        default:
                            break
                        }
                        console.log(keyEvent)
                    }
                    return !stopEvent
                }
            })
            // load default tools
            ui.defaultPan = {
                name: 'Pan',
                icon: 'fa-hand-paper-o',
                interactions: [
                    self.dragPanInter,
                    self.doubleClickZoomInter,
                    self.keyboardPanInter,
                    self.keyboardZoomInter
                ]
            }
            ui.defaultSelect = {
                name: 'Select',
                icon: 'fa-mouse-pointer',
                interactions: [
                    ui.keyboardInter,
                    ui.selectInter,
                    ui.dragSelectInter,
                    ui.modifyInter
                ]
            }
            ui.defaultPoint = {
                name: 'Point',
                icon: 'static/images/iD-sprite.svg#icon-point',
                interactions: [ui.pointInter]
            }
            ui.defaultLine = {
                name: 'Line',
                icon: 'static/images/iD-sprite.svg#icon-line',
                interactions: [ui.lineInter]
            }
            ui.defaultPolygon = {
                name: 'Polygon',
                icon: 'static/images/iD-sprite.svg#icon-area',
                interactions: [ui.polyInter]
            }

            // add annotations layer to catalogue list
            this.$root.catalogue.catalogue.push({
                init: function () {
                    return ui.featureOverlay
                },
                id: 'annotations',
                name: 'My Annotations'
            })
        }
    }
</script>
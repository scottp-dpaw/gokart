<template>
    <div class="tabs-panel" id="layers-catalogue" v-cloak>
        <div class="row">
            <div class="columns">
                <div class="row">
                    <div class="switch tiny">
                        <input class="switch-input" id="switchBaseLayers" type="checkbox" v-model="swapBaseLayers" />
                        <label class="switch-paddle" for="switchBaseLayers">
                                        <span class="show-for-sr">Switch out base layers</span>
                                    </label>
                    </div>
                    <label for="switchBaseLayers" class="side-label">Switch out base layers automatically</label>
                </div>
                <div class="row collapse">
                    <div class="small-6 columns">
                        <select name="select" v-model="search">
                                        <option value="" selected>All layers</option> 
                                        <option value="himawari">Himawari</option>
                                        <option v-bind:value="search">Custom search:</option>
                                    </select>
                    </div>
                    <div class="small-6 columns">
                        <input type="search" v-model="search" placeholder="Find a layer">
                    </div>
                </div>
                <div id="layers-catalogue-list">
                    <div v-for="l in catalogue.getArray() | filterBy search in searchAttrs | orderBy 'name'" class="row layer-row" @mouseover="preview(l)"
                        @mouseleave="preview(false)" @click="onToggle($index)">
                        <div class="small-9">
                            <div class="layer-title">{{ l.name || l.id }}</div>
                        </div>
                        <div class="small-3">
                            <div class="text-right">
                                <div class="switch tiny" @click="$event.stopPropagation();">
                                    <input class="switch-input" id="ctlgsw{{ $index }}" @change="onLayerChange(l, $event.target.checked)" v-bind:checked="l.olLayer() !== undefined"
                                        type="checkbox" />
                                    <label class="switch-paddle" for="ctlgsw{{ $index }}">
                                                <span class="show-for-sr">Toggle layer</span>
                                            </label>
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
    export default {
        data: function() { return {
            layer: {},
            catalogue: new ol.Collection(),
            swapBaseLayers: true,
            search: '',
            searchAttrs: ['name', 'id'],
            overview: false
        }},
        methods: {
            preview: function (layer) {
                if (this.layer === layer) {
                    return
                }
                if (!layer && this.layer.preview) {
                    this.layer.preview.setMap(null)
                    if (!layer) {
                        this.layer = {}
                        return
                    }
                }
                layer.preview = new ol.control.OverviewMap({
                    layers: [layer.init()],
                    collapsed: false,
                    collapsible: false,
                    view: new ol.View({
                        projection: 'EPSG:4326'
                    })
                })
                layer.preview.setMap(this.$root.map.map)
                this.layer = layer
            },
            // helper function to simulate a <label> style click on a row
            onToggle: function (index) {
                $(this.$el).find('#ctlgsw' + index).trigger('click')
            },
            // toggle a layer in the Layer Catalogue
            onLayerChange: function (layer, checked) {
                // if layer matches state, return
                if (checked === (layer.olLayer() !== undefined)) {
                    return
                }
                // make the layer match the state
                if (checked) {
                    if (layer.base) {
                        // "Switch out base layers automatically" is enabled, remove
                        // all other layers with the "base" option set.
                        if (this.swapBaseLayers) {
                            ui.layers.olLayers.forEach(function (olLayer) {
                                if (self.getLayer(olLayer.get('id')).base) {
                                    ui.layers.removeLayer(olLayer)
                                }
                            })
                        }
                        // add new base layer to bottom
                        self.map.getLayers().insertAt(0, layer.init())
                    } else {
                        self.map.addLayer(layer.init())
                    }
                } else {
                    ui.layers.removeLayer(layer.olLayer())
                }
            }
        }
    }
</script>

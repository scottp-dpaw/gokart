<template>
    <div class="tabs-panel is-active" id="layers-active" v-cloak>

        <div class="layers-topframe scroller row">
            <div class="columns">

                <div class="row">
                    <div class="switch tiny">
                        <input class="switch-input" id="toggleGraticule" type="checkbox" v-bind:checked="graticule" @change="toggleGraticule" />
                        <label class="switch-paddle" for="toggleGraticule">
                                        <span class="show-for-sr">Display graticule</span>
                                    </label>
                    </div>
                    <label for="toggleGraticule" class="side-label">Display graticule</label>
                </div>
                <div class="row show-for-medium">
                    <div class="switch tiny">
                        <input class="switch-input" id="toggleHoverInfo" type="checkbox" v-bind:checked="hoverInfo" @change="toggleHoverInfo" />
                        <label class="switch-paddle" for="toggleHoverInfo">
                                        <span class="show-for-sr">Display hovering feature info</span>
                                    </label>
                    </div>
                    <label for="toggleHoverInfo" class="side-label">Display hovering feature info</label>
                </div>

                <div id="layers-active-list">
                    <div v-for="l in olLayers.slice().reverse()" class="row layer-row" v-bind:class="l.progress" data-id="{{ l.get('id') }}"
                        track-by="values_.id" @click="layer = getLayer(l.get('id'))">
                        <div class="small-9">
                            <div class="layer-title">{{ l.get("name") }} - {{ Math.round(l.getOpacity() * 100) }}%</div>
                            <small v-if="l.get('updated')">Updated: {{ l.get("updated") }}</small>
                        </div>
                        <div class="small-3">
                            <div class="text-right">
                                <a @click="removeLayer(l)" class="button alert">&#x2715;</a>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        <div class="row collapse">
            <div class="columns">
                <h4>{{ layer.name }}</h4>
                <div class="tool-slice row" v-if="layer.olLayer()">
                    <div class="columns small-2"><label class="tool-label">Opacity:<br/>{{ layerOpacity }}%</label></div>
                    <div class="columns small-10"><input type="range" min="1" max="100" step="1" v-model="layerOpacity"></div>
                </div>
                <div class="tool-slice row" v-if="layer.timeline">
                    <div class="columns small-2"><label class="tool-label">Timeline:<br/>{{ timelineTS }}</label></div>
                    <div class="columns small-10"><input type="range" v-bind:max="sliderMax" min="0" step="1" v-model="sliderTimeline"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
    export default {
        data: function () { 
            return { sliderOpacity: 0, layer: { olLayer: function() {} }, olLayers: [], hoverInfoCache: true, timeIndex: 0 }
        } 
    }
</script>
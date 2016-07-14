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
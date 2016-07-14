<template>
  <div class="off-canvas-wrapper">
        <div class="off-canvas-wrapper-inner" data-off-canvas-wrapper>
            <div class="off-canvas position-left" id="offCanvasLeft" data-off-canvas>
                <a id="side-pane-close" class="button alert hide-for-medium">&#x2715;</a> 
                  <div class="tabs-content vertical" data-tabs-content="menu-tabs">
                    <layers></layers>
      
    
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
                                <a v-for="t in tools | filterIf 'showName' undefined" class="button button-tool" v-bind:class="{'selected': t.name == tool.name}" @click="setTool(t)" v-bind:title="t.name">{{{ icon(t) }}}</a>
                            </div>
                            <div class="expanded stacked button-group">
                                <a v-for="t in tools | filterIf 'showName' true" class="button" v-bind:class="{'selected': t.name == tool.name}" @click="setTool(t)" v-bind:title="t.name">{{{ icon(t) }}} {{ t.name }}</a>
                            </div>
                        </div>
                    </div>
                    <div v-if="advanced" class="tool-slice row collapse">
                        <div class="small-2"><label class="tool-label">Size:<br/>({{ size }})</label></div>
                        <div class="small-10"><div class="expanded button-group">
                            <a @click="size = 8" v-bind:class="{'selected': size == 8}" class="button"><small>Small</small></a>
                            <a @click="size = 12" v-bind:class="{'selected': size == 12}" class="button">Medium</a>
                            <a @click="size = 16" v-bind:class="{'selected': size == 16}" class="button"><big>Large</big></a>
                        </div></div>
                    </div>
                    <div v-if="advanced" class="tool-slice row collapse">
                        <div class="small-2"><label class="tool-label">Colour:</label></div>
                        <div class="small-10"><div class="expanded button-group">
                            <a v-for="c in colours" class="button" title="{{ c[0] }}" @click="colour = c[1]" v-bind:class="{'selected': c[1] == colour}" v-bind:style="{ backgroundColor: c[1] }"></a>
                        </div></div>
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

<div class="tabs-panel" id="menu-tab-tracking">
    <div class="row collapse">
        <div class="columns">
            <ul class="tabs" data-tabs id="tracking-tabs">
                <li class="tabs-title is-active"><a href="#tracking-list-tab" aria-selected="true">Resource Tracking</a></li>
                <li class="tabs-title"><a href="#tracking-groups-tab" aria-selected="true">Device Groups</a></li>
            </ul>
        </div>
    </div>
    <div class="row collapse" id="tracking-tab-panels">
        <div class="columns">
            <div class="tabs-content vertical" data-tabs-content="tracking-tabs">
                <div id="tracking-list-tab" class="tabs-panel is-active" v-cloak>
                    <div class="row">
                        <div class="switch tiny">
                            <input class="switch-input" id="resourcesInViewport" type="checkbox" v-model="viewportOnly"/>
                            <label class="switch-paddle" for="resourcesInViewport">
                                <span class="show-for-sr">Viewport resources only</span>
                            </label>
                        </div>
                        <label for="resourcesInViewport" class="side-label">Restrict to viewport ({{ stats }})</label>
                    </div>
                    <div class="row collapse">
                        <div class="small-6 columns">
                            <select name="select" v-model="cql" @change="setCQLFilter(cql)">
                                <option value="" selected>All resources</option> 
                                <option value="symbolid LIKE '%comms_bus'">Communications Bus</option>
                                <option value="symbolid LIKE '%gang_truck'">Gang Truck</option>
                                <option value="symbolid LIKE '%heavy_duty'">Heavy Duty</option>
                                <option value="(symbolid LIKE '%heavy_duty' OR symbolid LIKE '%gang_truck')">GT and HD</option>
                                <option value="symbolid LIKE '%aircraft'">Aircraft</option>
                            </select>
                        </div>
                        <div class="small-6 columns">
                            <input type="search" v-model="search" placeholder="Find a resource">
                        </div>
                    </div>
                    <div class="row">
                        <div class="small-10">
                            <div class="columns"><div class="row">
                                <div class="switch tiny">
                                    <input class="switch-input" id="resourceHistory" type="checkbox" v-model="toggleHistory"/>
                                    <label class="switch-paddle" for="resourceHistory">
                                        <span class="show-for-sr">Query history</span>
                                    </label>
                                </div>
                                <label for="resourceHistory" class="side-label">Query history</label>
                            </div></div>
                            <div class="columns"><div class="row">
                                <div class="switch tiny">
                                    <input class="switch-input" id="selectedOnly" type="checkbox" v-model="selectedOnly"/>
                                    <label class="switch-paddle" for="selectedOnly">
                                        <span class="show-for-sr">Show selected only</span>
                                    </label>
                                </div>
                                <label for="selectedOnly" class="side-label">Show selected only</label>
                            </div></div>
                        </div><div class="small-2">
                            <a class="button" @click="zoomToSelected()" style="float: right"><i class="fa fa-search"></i></a>
                        </div>
                    </div>
                    <div id="history-panel" v-if="toggleHistory">
                        <div class="row collapse tool-slice">
                            <div class="small-2">
                                <label for="historyFrom">From:</label>
                            </div><div class="small-4">
                                <input type="text" v-model="historyFromDate" placeholder="yyyy-mm-dd"></input>
                            </div><div class="small-2">
                                <input type="text" v-model="historyFromTime" placeholder="24:00"></input>
                            </div>
                            <div class="small-4">
                                <select name="select" v-model="history" @change="historyRange = history">
                                    <option value="" selected>Date range</option> 
                                    <!-- values in milliseconds -->
                                    <option value="3600000">Last hour</option> 
                                    <option value="10800000">Last 3 hours</option> 
                                    <option value="86400000">Last day</option> 
                                    <option value="604800000">Last week</option> 
                                    <option value="2678400000">Last month</option> 
                                </select>
                            </div>
                        </div>
                        <div class="row collapse tool-slice">
                            <div class="small-2">
                                <label for="historyTo">To:</label>
                            </div><div class="small-4">
                                <input type="text" v-model="historyToDate" placeholder="yyyy-mm-dd"></input>
                            </div><div class="small-2">
                                <input type="text" v-model="historyToTime" placeholder="24:00"></input>
                            </div>
                            <div class="small-2"></div>
                            <div class="small-2">
                                <button class="button" @click="historyCQLFilter">Go</button>
                            </div>
                        </div>
                    </div>
                    <div id="tracking-list">
                        <div v-for="f in features | filterBy resourceFilter | orderBy resourceOrder" class="row feature-row" v-bind:class="{'device-selected': selected(f) }" @click="select(f)">
                            <partial name="resourceInfo"></partial>
                        </div>
                    </div>
                    
                </div>
                <div id="tracking-groups-tab" class="tabs-panel">
                    Group search shortcuts here
                </div>
            </div>
        </div>
    </div>
    
    <div id="resourceInfo" class="hide">
        <div class="columns">
            <div class="feature-title"><img v-bind:src="f.get('icon')" /> {{ f.get('label') }} <small>({{ f.get('deviceid') }})</small></div>
            <small>{{ f.get('time') }}</small>
        </div>
    </div>
    
    <style type="text/css">

    </style>
</div>

</div>

            </div>
            <div class="off-canvas-content" data-off-canvas-content>
                
<ul class="tabs vertical map-widget" id="menu-tabs" data-tabs>
    


    <li class="tabs-title side-button"><a href="#menu-tab-layers" title="Map Layers">
        <svg class="icon"><use xlink:href="static/images/iD-sprite.svg#icon-layers"></use></svg>
    </a></li>
    
<li class="tabs-title side-button"><a href="#menu-tab-annotations" title="Annotations">
    <svg class="icon"><use xlink:href="static/images/iD-sprite.svg#icon-data"></use></svg>
</a></li>

<li class="tabs-title side-button"><a href="#menu-tab-tracking" title="Vehicle Tracking">
    <svg class="icon"><use xlink:href="static/images/iD-sprite.svg#icon-geolocate"></use></svg>
</a></li>

</ul>
 
                <select @change="setScale" id="menu-scale" v-cloak>
                    <option value="{{ scale }}" selected>{{ scaleString }}</option>
                    <option v-for="s in fixedScales" value="{{ s }}">{{ getScaleString(s) }}</option>
                </select>

                <map></map>
                <div class="hide" id="featureInfo">{{ f.getId() }}</div>
                 

            </div>
        </div>
    </div>
</template>

<script>
import map from '../components/map.vue'
import layers from '../components/layers.vue'

export default {
  components: {
    "map": map,
    "layers": layers
  }
}

</script>

<style>
#tracking-list .feature-row {
    cursor: pointer;
    border-right: 1px transparent;
}
#tracking-list .feature-row:hover {
    border-right: 1px solid #fff;
}
.device-selected {
    background-color: #165016;
}
.feature-row:nth-child(even).device-selected {
    background-color: #185a18;
}
</style>

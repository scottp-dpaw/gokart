<template>
  <div class="off-canvas-wrapper">
        <div class="off-canvas-wrapper-inner" data-off-canvas-wrapper>
            <div class="off-canvas position-left" id="offCanvasLeft" data-off-canvas>
                <a id="side-pane-close" class="button alert hide-for-medium">&#x2715;</a> 
                  <div class="tabs-content vertical" data-tabs-content="menu-tabs">
                    <layers></layers>
                    <annotations></annotations>
                    <tracking></tracking>
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
 
                <map></map>
            </div>
        </div>
    </div>
</template>

<script>
    import map from '../components/map.vue'
    import layers from '../components/layers.vue'
    import annotations from '../components/annotations.vue'
    import tracking from '../components/sss/tracking.vue'

    export default {
        components: {
            "map": map,
            "layers": layers,
            "annotations": annotations,
            "tracking": tracking
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
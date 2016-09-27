<template>
    <div class="off-canvas-wrapper">
        <div class="off-canvas-wrapper-inner" data-off-canvas-wrapper>
            <div class="off-canvas position-left reveal-responsive" id="offCanvasLeft" data-off-canvas>
                <a id="side-pane-close" class="button alert hide-for-medium">&#x2715;</a>
                <div class="tabs-content vertical" data-tabs-content="menu-tabs">
                    <gk-layers v-ref:layers></gk-layers>
                    <gk-annotations v-ref:annotations></gk-annotations>
                    <gk-tracking v-ref:tracking></gk-tracking>
                    <gk-bfrs v-ref:bfrs></gk-bfrs>
                </div>
            </div>
            <div class="off-canvas-content" data-off-canvas-content>
                <ul class="tabs vertical map-widget" id="menu-tabs" data-tabs>
                    <li class="tabs-title side-button is-active">
                        <a href="#menu-tab-layers" title="Map Layers" @click="$root.annotations.setTool('Pan')">
                            <svg class="icon">
                                <use xlink:href="dist/static/images/iD-sprite.svg#icon-layers"></use>
                            </svg>
                        </a>
                    </li>
                    <li class="tabs-title side-button">
                        <a href="#menu-tab-annotations" title="Annotations" @click="$root.annotations.init()">
                            <i class="fa fa-pencil" aria-hidden="true"></i>
                        </a>
                    </li>
                    <li class="tabs-title side-button">
                        <a href="#menu-tab-tracking" title="Vehicle Tracking" @click="$root.tracking.init()">
                            <i class="fa fa-truck" aria-hidden="true"></i>
                        </a>
                    </li>
                    <li class="tabs-title side-button">
                        <a href="#menu-tab-bfrs" title="Bushfire Report System" @click="$root.bfrs.init()">
                            <i class="fa fa-fire" aria-hidden="true"></i>
                        </a>
                    </li>
                </ul>
                <gk-map v-ref:map></gk-map>
            </div>
        </div>
    </div>
</template>

<script>
    import gkMap from '../components/map.vue'
    import gkLayers from '../components/layers.vue'
    import gkAnnotations from '../components/annotations.vue'
    import gkTracking from '../components/sss/tracking.vue'
    import gkBfrs from '../components/sss/bfrs.vue'
    import { ol } from 'src/vendor.js'


    export default { 
      components: { gkMap, gkLayers, gkAnnotations, gkTracking,gkBfrs },
      methods: {
      }
    }
</script>


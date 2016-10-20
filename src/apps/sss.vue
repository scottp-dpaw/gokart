<template>
    <gk-loading v-ref:loading application="SSS"></gk-loading>
    <div class="off-canvas-wrapper">
        <div class="off-canvas-wrapper-inner" data-off-canvas-wrapper>
            <div class="off-canvas position-left" id="offCanvasLeft" data-off-canvas>
                <a id="side-pane-close" class="button alert hide-for-medium">&#x2715;</a>
                <div class="tabs-content vertical" data-tabs-content="menu-tabs">
                    <gk-layers v-ref:layers></gk-layers>
                    <gk-annotations v-ref:annotations></gk-annotations>
                    <gk-tracking v-ref:tracking></gk-tracking>
                    <!--gk-bfrs v-ref:bfrs></gk-bfrs-->
                </div>
            </div>
            <div class="off-canvas-content" data-off-canvas-content>
                <ul class="tabs vertical map-widget" id="menu-tabs" data-tabs>
                    <li class="tabs-title side-button is-active">
                        <a href="#menu-tab-layers" title="Map Layers" @click="switchMenu('mapLayers',init)">
                            <svg class="icon">
                                <use xlink:href="dist/static/images/iD-sprite.svg#icon-layers"></use>
                            </svg>
                        </a>
                    </li>
                    <li class="tabs-title side-button">
                        <a href="#menu-tab-annotations" title="Annotations" @click="switchMenu('annotations',$root.annotations.init)">
                            <i class="fa fa-pencil" aria-hidden="true"></i>
                        </a>
                    </li>
                    <li class="tabs-title side-button">
                        <a href="#menu-tab-tracking" title="Vehicle Tracking" @click="switchMenu('vehicleTracking',$root.tracking.init)">
                            <i class="fa fa-truck" aria-hidden="true"></i>
                        </a>
                    </li>
                    <!--li class="tabs-title side-button">
                        <a href="#menu-tab-bfrs" title="Bushfire Report System" @click="switchMenu('bushfireReportSystem',$root.bfrs.init)">
                            <i class="fa fa-fire" aria-hidden="true"></i>
                        </a>
                    </li-->
                </ul>
                <gk-map v-ref:map></gk-map>
		<div id="external-controls"></div>
            </div>
        </div>
    </div>
</template>

<script>
    import gkMap from '../components/map.vue'
    import gkLayers from '../components/layers.vue'
    import gkAnnotations from '../components/annotations.vue'
    import gkTracking from '../components/sss/tracking.vue'
    import gkLoading from '../components/loading.vue'
    //import gkBfrs from '../components/sss/bfrs.vue'
    import { ol } from 'src/vendor.js'


    export default { 
      data: function() {
        return {
            activeMenu : null
        }
      },
      components: { gkMap, gkLayers, gkAnnotations, gkTracking, gkLoading },//, gkBfrs },
      methods: {
        init: function() {
            this.$root.annotations.setTool('Pan')
        },
        switchMenu: function(menu, initFunc) {
            if (this.activeMenu && this.activeMenu == menu) {
                //click on the active menu, do nothing
                return
            } else {
                this.activeMenu = menu
                if (initFunc) {
                    initFunc()
                }
            }
        }
      },
      ready: function () {
      }
    }
</script>


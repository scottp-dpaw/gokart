<template>
    <div class="off-canvas-wrapper">
        <div class="off-canvas-wrapper-inner" data-off-canvas-wrapper>
            <div class="off-canvas position-left" id="offCanvasLeft" data-off-canvas>
                <a id="side-pane-close" class="button alert hide-for-medium">&#x2715;</a>
                <div class="tabs-content vertical" data-tabs-content="menu-tabs">
                    <gk-layers v-ref:layers></gk-layers>
                    <gk-annotations v-ref:annotations></gk-annotations>
                    <gk-tracking v-ref:tracking></gk-tracking>
                </div>
            </div>
            <div class="off-canvas-content" data-off-canvas-content>
                <ul class="tabs vertical map-widget" id="menu-tabs" data-tabs>
                    <li class="tabs-title side-button">
                        <a href="#menu-tab-layers" title="Map Layers" @click="$root.annotations.setTool('Pan')">
                            <svg class="icon">
                                <use xlink:href="dist/static/images/iD-sprite.svg#icon-layers"></use>
                            </svg>
                        </a>
                    </li>
                    <li class="tabs-title side-button">
                        <a href="#menu-tab-annotations" title="Annotations">
                            <svg class="icon">
                                <use xlink:href="dist/static/images/iD-sprite.svg#icon-data"></use>
                            </svg>
                        </a>
                    </li>
                    <li class="tabs-title side-button">
                        <a href="#menu-tab-tracking" title="Vehicle Tracking" @click="$root.annotations.setTool('Pan')">
                            <svg class="icon">
                                <use xlink:href="dist/static/images/iD-sprite.svg#icon-geolocate"></use>
                            </svg>
                        </a>
                    </li>
                </ul>
                <gk-map v-ref:map></gk-map>
            </div>
        </div>
    </div>
    <div class="hide">
      <div v-for="blob in svgBlobs">
        <img v-bind:src="blob"/>
      </div>
    </div>
</template>

<script>
    import gkMap from '../components/map.vue'
    import gkLayers from '../components/layers.vue'
    import gkAnnotations from '../components/annotations.vue'
    import gkTracking from '../components/sss/tracking.vue'
    import { ol } from 'src/vendor.js'


    export default { 
      components: { gkMap, gkLayers, gkAnnotations, gkTracking },
      data: function() {
        var stroke = '#ff6600'
        var fill = '#7c3100'
        return {
          tints: {
            'red': [[stroke,'#ed2727'], [fill,'#480000']],
            'orange': [[stroke,'#ff6600'], [fill,'#562200']],
            'yellow': [[stroke,'#ffd700'], [fill,'#413104']],
            'green': [[stroke,'#71c837'], [fill,'#1b310d']],
            'selected': [[stroke,'#ffffff'], [fill,'#2199e8']]
          },
          svgTemplates: {},
          svgBlobs: {}
        }
      },
      methods: {
        tintSVG: function(svgstring, tintKey) {
          this.tints[tintKey].forEach(function(colour) {
            svgstring = svgstring.split(colour[0]).join(colour[1])
          })
          return svgstring
        },
        getBlob: function(url, tintKey) {
          var key = url + '#' + tintKey
          if (this.svgBlobs[key]) {
            return this.svgBlobs[key]
          } else {
            this.addSVG(url)
          }
        },
        addSVG: function(url, tints, dims) {
          var vm = this
          if (!tints) {
            // tint everything if not specified
            var tints = Object.keys(this.tints)
          }
          if (!dims) {
            dims = [48, 48]
          }
          if (this.svgTemplates[url]) {
            return
          }
          var svg = this.svgTemplates[url] = { url: url, tints: tints, dims: dims }
          var req = new window.XMLHttpRequest()
          req.withCredentials = true
          req.onload = function () {
            var svgstring = this.responseText
            svg.tints.forEach(function(tint) {
              var canvas = $('<canvas>')
              canvas.attr({width: svg.dims[0], height: svg.dims[1]})
              canvas.drawImage({
                source: 'data:image/svg+xml;utf8,' + encodeURIComponent(vm.tintSVG(svgstring, tint)),
                fromCenter: false, x: 0, y: 0, width: dims[0], height: dims[1],
                load: function () {
                  canvas.get(0).toBlob(function (blob) {
                    vm.svgBlobs[svg.url + '#' + tint] = window.URL.createObjectURL(blob)
                  }, 'image/png')
                }
              })
            })
          }
          req.open('GET', svg.url)
          req.send()
        }
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
    
    .feature-row.device-selected {
        background-color: #165016;
    }
    
    .feature-row:nth-child(even).device-selected {
        background-color: #185a18;
    }
</style>
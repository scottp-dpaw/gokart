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
                        <a href="#menu-tab-annotations" title="Annotations" @click="$root.annotations.init()">
                            <svg class="icon">
                                <use xlink:href="dist/static/images/iD-sprite.svg#icon-data"  ></use>
                            </svg>
                        </a>
                    </li>
                    <li class="tabs-title side-button">
                        <a href="#menu-tab-tracking" title="Vehicle Tracking" @click="$root.tracking.init()">
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
        var fill = '#ff6600'
        var stroke = '#7c3100'
        return {
          tints: {
            'red': [[fill,'#ed2727'], [stroke,'#480000']],
            'orange': [[fill,'#ff6600'], [stroke,'#562200']],
            'yellow': [[fill,'#ffd700'], [stroke,'#413104']],
            'green': [[fill,'#71c837'], [stroke,'#1b310d']],
            'selected': [['#000000', '#2199e8'], [stroke,'#2199e8'], [fill, '#ffffff']]
          },
          svgTemplates: {},
          svgBlobs: {},
          styles: {}
        }
      },
      methods: {
        tintSVG: function(svgstring, tints) {
          tints.forEach(function(colour) {
            svgstring = svgstring.split(colour[0]).join(colour[1])
          })
          return svgstring
        },
        cacheStyle: function(styleFunc, feature, keys) {
          var key = keys.map(function(k) {
            return feature.get(k)
          }).join(";")
          var style = this.styles[key]
          if (style) { return style }
          style = styleFunc(feature)
          if (style) {
            this.styles[key] = style
            return style
          }
          return ol.style.defaultStyleFunction()
        },
        getBlob: function(feature, keys) {
          // method to precache SVGs as raster (PNGs)
          // workaround for Firefox missing the SurfaceCache when blitting to canvas
          // returns a url or undefined if svg isn't baked yet

          var key = keys.map(function(k) {
            return feature.get(k)
          }).join(";")
          if (this.svgBlobs[key]) {
            return this.svgBlobs[key]
          } else {
            var dims = feature.get('dims') || [48, 48]
            var tint = feature.get('tint')
            var url = feature.get('icon')
            this.addSVG(key, url, tint, dims, feature)
          }
        },
        addSVG: function(key, url, tint, dims, feature) {
          var vm = this
          var prom = new Promise( function (resolve, reject) { 
            if (typeof tint === 'string') {
              tint = vm.tints[tint] || []
            }
            if (vm.svgTemplates[url]) {
              // render from loaded svg
              //console.log('addSVG: Cache hit for '+key)
              vm.drawSVG(key, vm.svgTemplates[url], tint, dims, feature, resolve, reject)
              return
            }
            // load svg
            //console.log('addSVG: Cache miss for '+key)
            var req = new window.XMLHttpRequest()
            req.withCredentials = true
            req.onload = function () {
              if (!this.responseText) {
                return 
              }
              vm.svgTemplates[url] = this.responseText
              vm.drawSVG(key, this.responseText, tint, dims, feature, resolve, reject)
            }
            req.onerror = function() {
              reject()
            }
            req.open('GET', url)
            req.send()
          } )
          return prom
        },
        drawSVG: function(key, svgstring, tints, dims, feature, resolve, reject) {
          var vm = this
          if (key in vm.svgBlobs) {
            //console.log('drawSVG: Cache hit for '+key)
            return
          }
          //console.log('drawSVG: Cache miss for '+key)
          vm.svgBlobs[key] = ''
          var canvas = $('<canvas>')
          canvas.attr({width: dims[0], height: dims[1]})
          canvas.drawImage({
            source: 'data:image/svg+xml;utf8,' + encodeURIComponent(vm.tintSVG(svgstring, tints)),
            fromCenter: false, x: 0, y: 0, width: dims[0], height: dims[1],
            load: function () {
              canvas.get(0).toBlob(function (blob) {
                vm.svgBlobs[key] = window.URL.createObjectURL(blob)
                if (feature) {
                  feature.changed()
                }
                resolve()
              }, 'image/png')
            }
          })
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

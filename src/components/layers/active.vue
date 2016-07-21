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
                <a @click="removeLayer(l)" class="button alert remove-layer">&#x2715;</a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <div class="row collapse">
      <div id="layer-config" class="columns">
        <h4>{{ layer.name }}</h4>
        <div class="tool-slice row" v-if="mapLayer()">
          <div class="columns small-2"><label class="tool-label">Opacity:<br/>{{ layerOpacity }}%</label></div>
          <div class="columns small-10"><input class="layer-opacity" type="range" min="1" max="100" step="1" v-model="layerOpacity"></div>
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
  import { Vue, dragula } from 'src/vendor.js'
  export default {
    // variables
    data: function () {
      return {
        sliderOpacity: 0,
        layer: {},
        olLayers: [],
        hoverInfoCache: true,
        timeIndex: 0
      }
    },
    // parts of the template to be computed live
    computed: {
      graticule: {
        cache: false,
        get: function () {
          return this.$root.map.graticule && this.$root.map.graticule.getMap() === this.$root.map.olmap
        }
      },
      hoverInfo: {
        cache: false,
        get: function () {
          return this.$root.info.enabled
        },
        set: function (val) {
          this.$root.info.enabled = val
        }
      },

      sliderTimeline: {
        get: function () {
          this.timeIndex = this.mapLayer().get('timeIndex')
          return this.timeIndex
        },
        set: function (val) {
          this.mapLayer().set('timeIndex', val)
          this.timeIndex = val
        }
      },
      timelineTS: function () {
        return this.layer.timeline[this.timeIndex][0]
      },
      sliderMax: function () {
        return this.layer.timeline.length - 1
      },
      layerOpacity: {
        get: function () {
          return Math.round(this.mapLayer().getOpacity() * 100)
        },
        set: function (val) {
          this.mapLayer().setOpacity(val / 100)
        }
      }
    },
    // methods callable from inside the template
    methods: {
      activeLayers: function () {
        var catalogue = this.$root.catalogue
        var results = []
        var success = this.olLayers.every(function (layer) {
          // catlayer doesn't exist at startup, need to
          // persist relevant catalogue entries perhaps?
          var catLayer = catalogue.getLayer(layer)
          if (!catLayer) {
            return false
          }
          var options = {
            id: layer.get('id'),
            name: layer.get('name'),
            type: catLayer.type,
            opacity: layer.getOpacity()
          }
          results.push([layer.get('id'), options])
          return true
        })
        if (!success) {
          return false
        }
        return results.reverse()
      },
      mapLayer: function (id) { return this.$root.map.getMapLayer(id || this.layer) },
      getLayer: function (id) {
        return this.$root.catalogue.getLayer(id)
      },
      toggleGraticule: function () {
        var map = this.$root.map
        if (this.graticule) {
          map.graticule.setMap(null)
        } else {
          map.graticule.setMap(map.olmap)
        }
      },
      toggleHoverInfo: function (ev) {
        this.hoverInfoCache = ev.target.checked
        this.hoverInfo = ev.target.checked
      },
      update: function () {
        var vm = this
        vm.olLayers = []
        Vue.nextTick(function () {
          vm.olLayers = this.$root.map.getLayers().getArray()
        })
      },
      removeLayer: function (olLayer) {
        this.$root.map.olmap.removeLayer(olLayer)
      },
      // change order of OL layers based on "Map Layers" list order
      updateOrder: function (el) {
        var map = this.$root.map
        Array.prototype.slice.call(el.parentNode.children).reverse().forEach(function (row) {
          var layer = map.getMapLayer(row.dataset.id)
          map.olmap.removeLayer(layer)
          map.olmap.addLayer(layer)
        })
      }
    },
    ready: function () {
      dragula([document.querySelector('#layers-active-list')]).on('dragend', this.updateOrder)
      this.$on('gk-init', function () {
        this.olLayers = this.$root.map.olmap.getLayers().getArray()
      })
    }
  }
</script>

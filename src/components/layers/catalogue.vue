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
            <input id="find-layer" type="search" v-model="search" placeholder="Find a layer">
          </div>
        </div>
        <div v-show="catalogue.getArray() | filterBy search in searchAttrs | lessThan 11" class="row">
          <div class="columns text-right">
            <label for="switchBaseLayers" class="side-label">Toggle all</label>
          </div>
          <div class="small-2 text-right">
            <div class="switch tiny">
              <input class="switch-input" title="Toggle all filtered layers" id="ctlgswall" @change="toggleAll($event.target.checked, $event)" type="checkbox" />
              <label class="switch-paddle" for="ctlgswall">
                <span class="show-for-sr">Toggle all</span>
              </label>
            </div>
          </div>
        </div>
        <div id="layers-catalogue-list">
          <div v-for="l in catalogue.getArray() | filterBy search in searchAttrs | orderBy 'name'" class="row layer-row" @mouseover="preview(l)" @mouseleave="preview(false)" @click="onToggle($index)" track-by="id">
            <div class="small-10">
              <a @click.stop href="https://oim.dpaw.wa.gov.au/django-admin/catalogue/record/?identifier={{ l.id }}" target="_blank" class="button tiny secondary float-right short"><i class="fa fa-pencil"></i></a>
              <div class="layer-title">{{ l.name || l.id }}</div>
            </div>
            <div class="small-2">
              <div class="text-right">
                <div class="switch tiny" @click.stop>
                  <input class="switch-input ctlgsw" id="ctlgsw{{ $index }}" @change="onLayerChange(l, $event.target.checked)" v-bind:checked="getMapLayer(l) !== undefined"
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

<style>
.short.button {
    margin: 0px;
}
</style>

<script>
  import { $, ol, Vue } from 'src/vendor.js'
  Vue.filter('lessThan', function(value, length) {
    return value.length < length
  })
  export default {
    data: function () {
      return {
        layer: {},
        catalogue: new ol.Collection(),
        swapBaseLayers: true,
        search: '',
        searchAttrs: ['name', 'id'],
        overview: false
      }
    },
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
          layers: [this.$root.map['create' + layer.type](layer)],
          collapsed: false,
          collapsible: false,
          view: new ol.View({
            projection: 'EPSG:4326'
          })
        })
        layer.preview.setMap(this.$root.map.map)
        this.layer = layer
      },
      toggleAll: function (checked, event) {
        var switches = $(this.$el).find('input.ctlgsw')
        switches.attr('checked', !checked).trigger('click')
      },
      // helper function to simulate a <label> style click on a row
      onToggle: function (index) {
        $(this.$el).find('#ctlgsw' + index).trigger('click')
      },
      // toggle a layer in the Layer Catalogue
      onLayerChange: function (layer, checked) {
        var vm = this
        var active = this.$root.active
        var map = this.$root.map
        // if layer matches state, return
        if (checked === (map.getMapLayer(layer) !== undefined)) {
          return
        }
        // make the layer match the state
        if (checked) {
          if (layer.base) {
            // "Switch out base layers automatically" is enabled, remove
            // all other layers with the "base" option set.
            if (this.swapBaseLayers) {
              active.olLayers.forEach(function (mapLayer) {
                if (vm.getLayer(mapLayer).base) {
                  active.removeLayer(mapLayer)
                }
              })
            }
            // add new base layer to bottom
            map.olmap.getLayers().insertAt(0, map['create' + layer.type](layer))
          } else {
            map.olmap.addLayer(map['create' + layer.type](layer))
          }
        } else {
          active.removeLayer(map.getMapLayer(layer))
        }
      },
      // helper to populate the catalogue from a remote service
      loadRemoteCatalogue: function (url, callback) {
        var vm = this
        var req = new window.XMLHttpRequest()
        req.withCredentials = true
        req.onload = function () {
          JSON.parse(this.responseText).forEach(function (l) {
            vm.catalogue.push(l)
          })
          callback()
        }
        req.open('GET', url)
        req.send()
      },
      getLayer: function (id) {
        // handle openlayers layers as well as raw ids
        if (id && id.get) { id = id.get('id') }
        return this.catalogue.getArray().find(function (layer) {
          return layer.id === id
        })
      },
      getMapLayer: function (id) {
        return this.$root.map.getMapLayer(id)
      }
    },
    ready: function () {
      this.catalogue.on('add', function (event) {
        var l = event.element
        l.id = l.id || l.identifier
        l.name = l.name || l.title
        l.type = l.type || 'TileLayer'
      })
    }
  }
</script>

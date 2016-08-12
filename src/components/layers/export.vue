<template>
  <div class="tabs-panel" id="layers-export" v-cloak>
    <div id="map-export-controls">
      <!--div class="tool-slice row collapse">
        <div class="small-3">
          <label class="tool-label">Vector format:</label>
        </div>
        <div class="small-9">
          <select name="select" v-model="vectorFormat">
            <option value="json" selected>GeoJSON (web GIS)</option> 
            <option value="kml">KML (Google Earth)</option>
            <option value="geopkg">Geopackage (high performance)</option>
            <option value="shapefile">Shapefile (legacy desktop GIS)</option>
            <option value="csv">CSV (Spreadsheet/Excel)</option>
          </select>
        </div>
      </div-->
      <div class="tool-slice row collapse">
        <div class="small-3">
          <label class="tool-label">Save state:</label>
        </div>
        <div class="small-9 columns">
          <div class="input-group">
            <input v-el:savestatename class="input-group-field" type="text" placeholder="Name for saved state"/>
            <div class="input-group-button">
              <a class="button" @click="saveStateButton()">Save</a>
            </div>
          </div>
        </div>
      </div>
      <div class="tool-slice row collapse">
        <div class="small-3">
          <label class="tool-label">Export state:</label>
        </div>
        <div class="small-9 columns">
          <div class="expanded button-group">
            <a class="button expanded" @click="download()"><i class="fa fa-download"></i> Download current state</a>
          </div>
        </div>
      </div>
      <div class="tool-slice row collapse">
        <div class="small-3">
          <label class="tool-label">Load state:</label>
        </div>
        <div class="small-9 columns">
          <div v-for="state in states" class="feature-row" style="overflow: hidden">
            <div class="float-right button-group small">
              <a class="button" title="Open state" @click="open(state)"><i class="fa fa-folder-open"></i></a>
              <a class="button" title="Download state" @click="download(state)"><i class="fa fa-download"></i></a>
              <a class="button alert" title="Delete state" @click="remove(state)">✕</a>
            </div>
            {{ state }}
          </div>
          <div v-if="states.length == 0" class="feature-row">
            No saved states yet
          </div>
          <div class="expanded button-group">
            <label class="button expanded" for="uploadFile"><i class="fa fa-upload"></i> Upload state file</label><input type="file" id="uploadFile" class="show-for-sr" name="statefile" accept="application/json" v-model="statefile" v-el:statefile @change="load()"/>
          </div>
        </div>
      </div>
      <div class="tool-slice row collapse">
        <div class="small-3">
          <label class="tool-label">Reset:</label>
        </div>
        <div class="small-9">
          <div class="expanded button-group">
            <a id="reset-sss" class="button alert" title="Clear current config and annotations" @click="reset()"><i class="fa fa-refresh"></i> Reset SSS</a>
          </div>
        </div>
      </div>
      <hr class="row"/>
      <div class="tool-slice row collapse">
        <div class="small-3">
          <label class="tool-label">Name:</label>
        </div>
        <div class="small-9">
          <input id="export-name" type="text" v-model="title" />
        </div>
      </div>
      <div class="tool-slice row collapse">
        <div class="small-3">
          <label class="tool-label">Paper size:</label>
        </div>
        <div class="small-9">
          <select v-model="paperSize">
                    <option v-for="size in paperSizes" v-bind:value="$key">ISO {{ $key }} ({{ size[0] }}mm &times; {{ size[1] }}mm)</option>
                  </select>
        </div>
      </div>
      <div class="tool-slice row collapse">
        <div class="small-3">
          <label class="tool-label">Download:</label>
        </div>
        <div class="small-9">
          <div class="expanded button-group">
            <a class="button" title="JPG for quick and easy printing" @click="print('jpg')"><i class="fa fa-file-image-o"></i><br>JPG</a>
            <a class="button" title="Geospatial PDF for use in PDF Maps and Adobe Reader" @click="print('pdf')"><i class="fa fa-print"></i><br>PDF</a>
            <a class="button" title="GeoTIFF for use in QGIS on the desktop" @click="print('tif')"><i class="fa fa-picture-o"></i><br>GeoTIFF</a>
          </div>
        </div>
      </div>

      <div class="hide" v-el:legendsvg>
        <gk-legend></gk-legend>
      </div>
    </div>
  </div>
</template>
<script>
  import { kjua, saveAs, moment, $, localforage } from 'src/vendor.js'
  import gkLegend from './legend.vue'
  export default {
    store: ['whoami', 'dpmm', 'view', 'mmPerInch','gokartService'],
    components: { gkLegend },
    data: function () {
      return {
        minDPI: 100,
        paperSizes: {
          A0: [1189, 841],
          A1: [841, 594],
          A2: [594, 420],
          A3: [420, 297],
          A4: [297, 210]
        },
        paperSize: 'A3',
        layout: {},
        title: 'Quick Print',
        statefile: '',
        vectorFormat: 'json',
        states: []
      }
    },
    // parts of the template to be computed live
    computed: {
      olmap: function () {
        return this.$root.map.olmap
      },
      // map viewport settings to use for generating the print raster
      mapLayout: function () {
        var dims = this.paperSizes[this.paperSize]
        var size = this.olmap.getSize()
        return {
          width: dims[0], height: dims[1], size: size,
          extent: this.olmap.getView().calculateExtent(size),
          scale: this.scale, dpmm: this.dpmm
        }
      },
      shortUrl: {
        cache: false,
        get: function () {
          if (!this.olmap) { return }
          var lonlat = this.olmap.getView().getCenter()
          return $.param({ lon: lonlat[0], lat: lonlat[1], scale: Math.round(this.$root.map.getScale() * 1000) })
        }
      }
    },
    // methods callable from inside the template
    methods: {
      // info for the legend block on the print raster
      legendInfo: function () {
        var result = {
          km: (Math.round(this.$root.map.getScale() * 40) / 1000).toLocaleString(),
          scale: 'ISO ' + this.paperSize + ' ' + this.$root.map.scaleString,
          title: this.title,
          author: this.whoami.email,
          date: 'Printed ' + moment().toLocaleString()
        }
        return result
      },
      exportVector: function(features, name) {
        var name = name || ''
        var result = this.$root.geojson.writeFeatures(features)
        var blob = new window.Blob([result], {type: 'application/json;charset=utf-8'})
        if (this.vectorFormat === 'json') {
          saveAs(blob, name + '_' + moment().add(moment().utcOffset(), 'minutes').toISOString().split('.')[0] + '.geo.json')
        } else {
          var formData = new window.FormData()
          formData.append('json', blob, name + '.json')
          var req = new window.XMLHttpRequest()
          req.open('POST', this.gokartService + '/ogr/' + this.vectorFormat)
          req.responseType = 'blob'
          req.onload = function (event) {
            saveAs(req.response, name + '.' + format)
          }
          req.send(formData)
        }
      },
      // resize map to page dimensions (in mm) for printing, save layout
      setSize: function () {
        $('body').css('cursor', 'progress')
        this.layout = this.mapLayout
        this.dpmm = this.minDPI / this.mmPerInch
        this.olmap.setSize([this.dpmm * this.layout.width, this.dpmm * this.layout.height])
        this.olmap.getView().fit(this.layout.extent, this.olmap.getSize())
        this.$root.map.setScale(this.$root.map.getFixedScale())
      },
      // restore map to viewport dimensions
      resetSize: function () {
        this.olmap.setSize(this.layout.size)
        this.dpmm = this.layout.dpmm
        this.olmap.getView().fit(this.layout.extent, this.olmap.getSize())
        this.$root.map.setScale(this.layout.scale)
        $('body').css('cursor', 'default')
      },
      // generate legend block, scale ruler is 40mm wide
      renderLegend: function () {
        var qrcanvas = kjua({text: 'http://dpaw.io/sss?' + this.shortUrl, render: 'canvas', size: 100})
        return ['data:image/svg+xml;utf8,' + encodeURIComponent(this.$els.legendsvg.innerHTML), qrcanvas]
      },
      // POST a generated JPG to the gokart server backend to convert to GeoPDF
      blobGDAL: function (blob, name, format) {
        var formData = new window.FormData()
        formData.append('extent', this.layout.extent.join(' '))
        formData.append('jpg', blob, name + '.jpg')
        formData.append('dpi', Math.round(this.layout.canvasPxPerMM * 25.4))
        formData.append('title', this.title)
        formData.append('author', this.legendInfo().author)
        var req = new window.XMLHttpRequest()
        req.open('POST', this.gokartService + '/gdal/' + format)
        req.responseType = 'blob'
        var vm = this
        req.onload = function (event) {
          saveAs(req.response, name + '.' + format)
          vm.resetSize()
        }
        req.send(formData)
      },
      // make a printable raster from the map
      print: function (format) {
        // rig the viewport to have printing dimensions
        this.setSize()
        var timer
        var vm = this
        // wait until map is rendered before continuing
        var composing = vm.olmap.on('postcompose', function (event) {
          timer && clearTimeout(timer)
          timer = setTimeout(function () {
            // remove composing watcher
            vm.olmap.unByKey(composing)
            var canvas = event.context.canvas
            var img = new window.Image()
            var legend = vm.renderLegend()
            var url = legend[0]
            var qrcanvas = legend[1]
            // wait until legend is rendered
            img.onerror = function (err) {
              window.alert(JSON.stringify(err))
            }
            img.onload = function () {
              // legend is 12cm wide
              vm.layout.canvasPxPerMM = canvas.width / vm.layout.width
              var height = 120 * vm.layout.canvasPxPerMM * img.height / img.width
              canvas.getContext('2d').drawImage(img, 0, 0, 120 * vm.layout.canvasPxPerMM, height)
              canvas.getContext('2d').drawImage(qrcanvas, 8, height)
              window.URL.revokeObjectURL(url)
              // generate a jpg copy of the canvas contents
              var filename = vm.title.replace(' ', '_')
              canvas.toBlob(function (blob) {
                if (format === 'jpg') {
                  saveAs(blob, filename + '.jpg')
                  vm.resetSize()
                } else {
                  vm.blobGDAL(blob, filename, format)
                }
              }, 'image/jpeg', 0.9)
            }
            img.src = url
          // only output after 5 seconds of no tiles
          }, 5000)
        })
        vm.olmap.renderSync()
      },
      download: function (key) {
        if (key) {
          // download JSON blob from the state store
          localforage.getItem('sssStateStore').then(function (store) {
            if (key in store) {
              var blob = new window.Blob([JSON.stringify(store[key], null, 2)], {type: 'application/json;charset=utf-8'})
              saveAs(blob, key+'.sss.json')
            }
          })
        } else {
          // download JSON blob of the current state
          localforage.getItem('sssOfflineStore').then(function (store) {
            var blob = new window.Blob([JSON.stringify(store, null, 2)], {type: 'application/json;charset=utf-8'})
            saveAs(blob, 'sss_state_' +moment().format('YYYY-MM-DD-HHmm')+'.sss.json')
          })
        }
      },
      open: function (key) {
        // load the JSON blob from the state store into the offline store
        localforage.getItem('sssStateStore').then(function (store) {
          if (key in store) {
            localforage.setItem('sssOfflineStore', store[key]).then(function (v) {
              document.location.reload()
            })
          }
        })
      },
      remove: function (key) {
        // if there's a key matching in the state store, remove it
        var vm = this
        localforage.getItem('sssStateStore').then(function (store) {
          if (key in store) {
            delete store[key]
            vm.states = Object.keys(store)
            localforage.setItem('sssStateStore', store)
          }
        })
      },
      load: function () {
        // upload JSON into a state slot 
        var vm = this
        var reader = new window.FileReader()
        var key = this.$els.statefile.files[0].name.split('.', 1)[0]
        reader.onload = function (e) {
          localforage.getItem('sssStateStore').then(function(store) {
            store[key] = JSON.parse(e.target.result)
            localforage.setItem('sssStateStore', store).then(function (v) {
              vm.states = Object.keys(store)
            })
          })
        }
        reader.readAsText(this.$els.statefile.files[0])
      },
      reset: function () {
        if (window.confirm('This will clear all of your selected layers and annotations. Are you sure?')) {
          localforage.removeItem('sssOfflineStore').then(function (v) {
            document.location.reload()
          })
        }
      },
      saveStateButton: function () {
        var key = this.$els.savestatename.value
        if (!key) {
          key = moment().format('DD/MM/YYYY HH:mm')
        }
        this.saveState(key)
      },
      saveState: function (key) {
        var vm = this
        var store = this.$root.store
        // don't save if user is in tour
        if (vm.$root.touring) { return }

        // store attributes
        store.view.center = vm.olmap.getView().getCenter()
        store.view.scale = Math.round(vm.$root.map.getScale() * 1000)
        var activeLayers = vm.$root.active.activeLayers()
        if (activeLayers === false) {
          return
        }
        store.activeLayers = activeLayers || []
        store.annotations = JSON.parse(vm.$root.geojson.writeFeatures(vm.$root.annotations.features.getArray()))

        // save in the offline store
        localforage.setItem('sssOfflineStore', store).then(function (value) {
          vm.$root.saved = moment().toLocaleString()
        })

        // if key is defined, store in state store
        if (key) {
          localforage.getItem('sssStateStore', function (err, value) {
            var states = {}
            if (value) {
              states = value
            }
            states[key] = store
            localforage.setItem('sssStateStore', states).then(function (value) {
              vm.states = Object.keys(states)
            })
            
          })
        }
      }
    },
    ready: function () {
      this.$on('gk-init', function () {
        var vm = this
        // save state every render
        this.olmap.on('postrender', global.debounce(function (ev) {vm.saveState()}, 1000, true))
        var stateStore = localforage.getItem('sssStateStore', function (err, value) {
          if (value) {
            vm.states = Object.keys(value)
          }
        })
      })
    }
  }
</script>

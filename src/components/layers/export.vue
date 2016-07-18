<template>
  <div class="tabs-panel" id="layers-export" v-cloak>
    <div id="map-export-controls">
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
            <a class="button" title="JPG for quick and easy printing" @click="print('jpg')"><i class="fa fa-file-image-o"></i> JPG</a>
            <a class="button" title="Geospatial PDF for use in PDF Maps and Adobe Reader" @click="print('pdf')"><i class="fa fa-print"></i> PDF</a>
            <a class="button" title="GeoTIFF for use in QGIS on the desktop" @click="print('tif')"><i class="fa fa-picture-o"></i> TIF</a>
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
  import { kjua, saveAs, moment, $ } from 'src/vendor.js'
  import gkLegend from './legend.vue'
  export default {
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
        title: 'Quick Print'
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
          scale: this.scale, dpmm: this.$root.dpmm
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
        var settings = this.$root.db.addCollection('settings')
        var whoami = settings.get('whoami') || {email: ''}
        var result = {
          km: (Math.round(this.$root.map.getScale() * 40) / 1000).toLocaleString(),
          scale: 'ISO ' + this.paperSize + ' ' + this.$root.map.scaleString,
          title: this.title,
          author: whoami.email,
          date: 'Printed ' + moment().toLocaleString()
        }
        return result
      },
      // resize map to page dimensions (in mm) for printing, save layout
      setSize: function () {
        $('body').css('cursor', 'progress')
        this.layout = this.mapLayout
        this.$root.dpmm = this.minDPI / this.$root.mmPerInch
        this.olmap.setSize([this.$root.dpmm * this.layout.width, this.$root.dpmm * this.layout.height])
        this.olmap.getView().fit(this.layout.extent, this.olmap.getSize())
        this.$root.map.setScale(this.$root.map.getFixedScale())
      },
      // restore map to viewport dimensions
      resetSize: function () {
        this.olmap.setSize(this.layout.size)
        this.$root.dpmm = this.layout.dpmm
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
        req.open('POST', '/gdal/' + format)
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
      }
    },
    ready: function () {
      var vm = this
      this.$on('gk-init', function () {
        // update url with location of viewport
        this.olmap.on('postrender', function () {
          window.history.replaceState(null, null, window.location.pathname + '?' + vm.shortUrl)
        })
      })
    }
  }
</script>

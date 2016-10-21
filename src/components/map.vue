<template>
  <div class="map" id="map" tabindex="0"></div>
  <gk-info v-ref:info></gk-info>
  <gk-scales v-ref:scales></gk-scales>
  <gk-search v-ref:search></gk-search>
  <gk-measure v-ref:measure></gk-measure>
</template>

<script>
  import { $, ol, proj4, moment } from 'src/vendor.js'
  import gkInfo from './info.vue'
  import gkScales from './scales.vue'
  import gkSearch from './search.vue'
  import gkMeasure from './measure.vue'
  export default {
    store: ['defaultWMTSSrc', 'defaultWFSSrc', 'gokartService', 'fixedScales', 'resolutions', 'matrixSets', 'dpmm', 'view'],
    components: { gkInfo, gkScales, gkSearch, gkMeasure },
    data: function () {
      return {
        scale: 0,
        graticule: new ol.LabelGraticule(),
        dragPanInter: new ol.interaction.DragPan({
          condition: function (mapBrowserEvent) {
            if (mapBrowserEvent.pointerEvent && (mapBrowserEvent.pointerEvent.button === 1)) {
              return false
            }
            return ol.events.condition.noModifierKeys(mapBrowserEvent)
          }
        }),
        doubleClickZoomInter: new ol.interaction.DoubleClickZoom(),
        keyboardPanInter: new ol.interaction.KeyboardPan(),
        keyboardZoomInter: new ol.interaction.KeyboardZoom(),
        middleDragPanInter: new ol.interaction.DragPan({
          condition: function (mapBrowserEvent) {
            if (mapBrowserEvent.pointerEvent && (mapBrowserEvent.pointerEvent.button === 1)) {
              mapBrowserEvent.preventDefault()
              return true
            }
            return false
          }
        })
      }
    },
    // parts of the template to be computed live
    computed: {
      loading: function () { return this.$root.loading },
      // because the viewport size changes when the tab pane opens, don't cache the map width and height
      width: {
        cache: false,
        get: function get () {
          return $("#map").width()
        }
      },
      height: {
        cache: false,
        get: function get () {
          return $("#map").height()
        }
      }
    },
    // methods callable from inside the template
    methods: {
      editResource: function(event) {
        var target = (event.target.nodeName == "A")?event.target:event.target.parentNode;
        if (env.appType == "cordova") {
            window.open(target.href,"_system");
        } else {
            window.open(target.href,target.target);
        }
      },
      tintSVG: function(svgstring, tints) {
        tints.forEach(function(colour) {
          svgstring = svgstring.split(colour[0]).join(colour[1])
        })
        return svgstring
      },
      getBlob: function(feature, keys,tintSettings,callback) {
        // method to precache SVGs as raster (PNGs)
        // workaround for Firefox missing the SurfaceCache when blitting to canvas
        // returns a url or undefined if svg isn't baked yet
        var vm = this
        var key = keys.map(function(k) {
          return feature.get(k)
        }).join(";")
        if (this.svgBlobs[key]) {
          return this.svgBlobs[key]
        } else if (this.jobs[key]) {
          vm.jobs[key].then(function(){
                feature.changed()
                if (callback) {callback()}
          })
        } else {
          var dims = feature.get('dims') || [48, 48]
          var tint = feature.get('tint')
          tint = (tintSettings)?tintSettings[tint]:[]
          var url = feature.get('icon')
          if (typeof tint === "string") {
            //tint is not just a color replacement, is a totally different icon
            url = tint
            tint = []
          }
          vm.jobs[key] = new Promise(function(resolve, reject) {
            vm.addSVG(key, url, tint, dims, resolve)
          }).then(function() {
            feature.changed()
            delete vm.jobs[key]
            if (callback) {callback()}
          })
        }


      },
      addSVG: function(key, url, tint, dims, pResolve) {
        var vm = this
        tint = tint || []
        var draw = function() {
          if (typeof vm.svgBlobs[key] !== 'undefined') { pResolve() }
          // RACE CONDITION: MS edge inlines promises and callbacks!
          // we can't set vm.svgBlobs[key] to be the Promise, as
          // it's entirely possible for the whole thing to have been 
          // completed in the constructor before the svgBlobs array is even set
          //vm.svgBlobs[key] = ''
          var drawJob = new Promise(function(resolve, reject) {
            vm.drawSVG(key, vm.svgTemplates[url], tint, dims, resolve, reject)
          }).then(function() {
            pResolve()
          })
        }
        if (vm.svgTemplates[url]) {
          // render from loaded svg or queue render post load promise
          draw()
        } else if (vm.jobs[url]) {
            vm.jobs[url].then(function(){
                draw()
            })
        } else {
          vm.jobs[url] = new Promise(function (resolve, reject) { 
            // load svg
            //console.log('addSVG: Cache miss for '+key)
            var req = new window.XMLHttpRequest()
            req.withCredentials = true
            req.onload = function () {
              //console.log('addSVG: XHR returned for '+key)
              if (!this.responseText) {
                return
              }
              vm.svgTemplates[url] = this.responseText
              resolve()
            }
            req.onerror = function() {
              reject()
            }
            req.open('GET', url)
            req.send()
          }).then(function(){
            draw()
            delete vm.jobs[url]
          })
        }
      },
      drawSVG: function(key, svgstring, tints, dims, resolve, reject) {
        var vm = this
        //console.log('drawSVG: Cache miss for '+key)
        var canvas = $('<canvas>')
        canvas.attr({width: dims[0], height: dims[1]})
        canvas.drawImage({
          source: 'data:image/svg+xml;utf8,' + encodeURIComponent(vm.tintSVG(svgstring, tints)),
          fromCenter: false, x: 0, y: 0, width: dims[0], height: dims[1],
          load: function () {
            //console.log('drawSVG: Canvas drawn for '+key)
            canvas.get(0).toBlob(function (blob) {
              vm.svgBlobs[key] = window.URL.createObjectURL(blob)
              //console.log("drawSVG:" + key + "\t url = " + vm.svgBlobs[key])
              resolve()
            }, 'image/png')
          }
        })
      },
      cacheStyle: function(styleFunc, feature, keys) {
        if (feature) {
            var key = keys.map(function(k) {
              return feature.get(k)
            }).join(";")
            var style = this.cachedStyles[key]
            if (style) { 
                return style 
            }
            style = styleFunc(feature)
            if (style) {
              this.cachedStyles[key] = style
              return style
            }
        }
        return new ol.layer.Vector().getStyleFunction()()
      },
      animatePan: function (location) {
        // pan from the current center
        var pan = ol.animation.pan({
          source: this.getCenter()
        })
        this.olmap.beforeRender(pan)
        // when we set the new location, the map will pan smoothly to it
        this.olmap.getView().setCenter(location)
      },
      animateZoom: function (resolution) {
        // zoom from the current resolution
        var zoom = ol.animation.zoom({
          resolution: this.olmap.getView().getResolution()
        })
        this.olmap.beforeRender(zoom)
        // setting the resolution to a new value will smoothly zoom in or out
        // depending on the factor
        this.olmap.getView().setResolution(resolution)
      },
      // force OL to approximate a fixed scale (1:1K increments)
      setScale: function (scale) {
        while (Math.abs(this.getScale() - scale) > 0.001) {
          this.olmap.getView().setResolution(this.olmap.getView().getResolution() * scale / this.getScale())
        }
        this.scale = scale
      },
      // return the scale (1:1K increments)
      getScale: function () {
        var size = this.olmap.getSize()
        var center = this.getCenter()
        var extent = this.olmap.getView().calculateExtent(size)
        var distance = this.$root.wgs84Sphere.haversineDistance([extent[0], center[1]], center) * 2
        return distance * this.dpmm / size[0]
      },
      // get the fixed scale (1:1K increments) closest to current scale
      getFixedScale: function () {
        var scale = this.getScale()
        var closest = null
        $.each(this.fixedScales, function () {
          if (closest === null || Math.abs(this - scale) < Math.abs(closest - scale)) {
            closest = this
          }
        })
        return closest
      },
      // generate a human-readable scale string
      getScaleString: function (scale) {
        if (Math.round(scale * 100) / 100 < 1.0) {
          return '1:' + (Math.round(scale * 100000) / 100).toLocaleString()
        } else if (Math.round(scale * 100) / 100 >= 1000.0) {
          return '1:' + (Math.round(scale / 10) / 100).toLocaleString() + 'M'
        }
        return '1:' + (Math.round(scale * 100) / 100).toLocaleString() + 'K'
      },
      // get the decimal degrees representation of some EPSG:4326 coordinates
      getDeg: function(coords) {
        return coords[0].toFixed(5)+', '+coords[1].toFixed(5)
      },
      // get the DMS representation of some EPSG:4326 coordinates
      getDMS: function(coords) {
        return ol.coordinate.degreesToStringHDMS_(coords[0], 'EW', 1) + ', ' +
               ol.coordinate.degreesToStringHDMS_(coords[1], 'NS', 1)
      },
      // get the MGA representation of some EPSG:4326 coordinates
      getMGA: function(coords) {
        var mga = this.getMGARaw(coords)
        if (mga) {
            return 'MGA '+mga.mgaZone+' '+Math.round(mga.mgaEast)+'mE '+Math.round(mga.mgaNorth)+'mN'
        }
        return ''
      },
      getMGARaw: function(coords) {
        var results = {}
        if ((coords[0] >= 108) && (coords[0] < 114)) {
          results.mgaZone = 49
        } else if ((coords[0] >= 114) && (coords[0] < 120)) {
          results.mgaZone = 50
        } else if ((coords[0] >= 120) && (coords[0] < 126)) {
          results.mgaZone = 51
        } else if ((coords[0] >= 126) && (coords[0] < 132)) {
          results.mgaZone = 52
        } else if ((coords[0] >= 132) && (coords[0] < 138)) {
          results.mgaZone = 53
        } else if ((coords[0] >= 138) && (coords[0] < 144)) {
          results.mgaZone = 54
        } else if ((coords[0] >= 144) && (coords[0] < 150)) {
          results.mgaZone = 55
        } else if ((coords[0] >= 150) && (coords[0] < 156)) {
          results.mgaZone = 56
        } else {
          // fail if not in the bounding box for MGA
          return null
        }
        var newCoords = proj4('EPSG:4326', 'EPSG:283'+results.mgaZone).forward(coords)
        results.mgaEast = newCoords[0]
        results.mgaNorth = newCoords[1]
        return results
      },
      // parse a string containing coordinates in decimal or DMS format
      parseDMSString: function(dmsStr) {
        // https://regex101.com/r/kS2zR1/22
        var dmsRegex = /^\s*(-)?(\d+(?:\.\d+)?)[°º:d\s]?\s*(?:(\d+(?:\.\d+)?)['’‘′:m]\s*(?:(\d{1,2}(?:\.\d+)?)(?:"|″|’’|''|s)?)?)?\s*([NSEW])?[,:\s]+(-)?(\d+(?:\.\d+)?)[°º:d\s]?\s?(?:(\d+(?:\.\d+)?)['’‘′:m]\s*(?:(\d{1,2}(?:\.\d+)?)(?:"|″|’’|''|s)?)?)?\s*([NSEW])?$/gmi
        
        var groups = dmsRegex.exec(dmsStr)

        if (!groups) {
          return null
        }

        var dmsToDecimal = function(sign, deg, min, sec, dir) {
          var sg = sign ? -1 : 1
          sg = sg * (('wWsS'.indexOf(dir) >= 0) ? -1 : 1)
          var d = Number(deg)
          var m = min ? Number(min) : 0
          var s = sec ? Number(sec) : 0
          if (!(d >= 0 && d <= 180)) return null
          if (!(m >= 0 && m <= 60)) return null
          if (!(s >= 0 && s <= 60)) return null
          return sg*(d+(m/60)+(s/3600))
        }

        var coords = [
          dmsToDecimal(groups[1], groups[2], groups[3], groups[4], groups[5]),
          dmsToDecimal(groups[6], groups[7], groups[8], groups[9], groups[10])
        ]

        if ((!coords[0]) || (!coords[1])) {
          // one coordinate fails the sniff test
          return null
        }

        // order most people use is northing, easting (opposite of EPSG:4326)
        if (!groups[5] && !groups[10]) {
            coords = coords.reverse()
        // if only one is explicitly defined, swap if required
        } else if (!groups[5] || !groups[10]) {
          if (groups[5] && ('nNsS'.indexOf(groups[5]) >=0)) {
            coords = coords.reverse()
          } else if (groups[10] && ('wWeE'.indexOf(groups[10]) >=0)) {
            coords = coords.reverse()
          }
        // both are explicitly defined
        } else {
          // bomb out if someone describes two of the same
          if (('nNsS'.indexOf(groups[5]) >=0) && ('nNsS'.indexOf(groups[10]) >=0)) {
            return null
          } else if (('wWeE'.indexOf(groups[5]) >=0) && ('wWeE'.indexOf(groups[10]) >=0)) {
            return null
          }
          // swap if defined around the other way
          if (('nNsS'.indexOf(groups[5]) >=0) && ('wWeE'.indexOf(groups[10]) >=0)) {
            coords = coords.reverse()
          }
        }
        return coords 
      },
      // parse a string containing coordinates in MGA grid reference format
      // e.g. MGA 51 340000 6340000, MGA 51 340000mE 6340000mN, MGA 51 3406340
      parseMGAString: function(mgaStr) {
        // https://regex101.com/r/zY8dW4/2
        var mgaRegex = /(?:MGA|mga)\s*(49|50|51|52|53|54|55|56)\s*(\d{3,7})\s*[mM]{0,1}\s*([nNeE]{0,1})\s*,*\s*(\d{4,7})\s*[mM]{0,1}\s*([nNeE]{0,1})/gi
        var groups = mgaRegex.exec(mgaStr)
        
        if (!groups) {
          return null
        }

        var results = {
          mgaZone: parseInt(groups[1]),
          mgaEast: groups[2],
          mgaNorth: groups[4],
        }
        if ((groups[5] === "E") && (groups[3] === "N")) {
          results.mgaEast = groups[4]
          results.mgaNorth = groups[2]
        }
        if ((results.mgaEast.length === 3) && (results.mgaNorth.length === 4)) {
          results.mgaEast = results.mgaEast + '000'
          results.mgaNorth = results.mgaNorth + '000'
        } else if ((results.mgaEast.length === 6) && (results.mgaNorth.length === 7)) {
          // full length MGA coords
        } else {
          return null  // invalid MGA length
        }
        results.mgaEast = parseInt(results.mgaEast)
        results.mgaNorth = parseInt(results.mgaNorth)

        var coords = proj4('EPSG:283'+groups[1], 'EPSG:4326').forward([results.mgaEast, results.mgaNorth])
        results.coords = coords
        
        return results
      },
      // parse a string containing a FD Grid reference
      parseGridString: function(fdStr) {
        var fdRegex = /(FD|fd|PIL|pil)\s*([a-zA-Z]{1,2})\s*([0-9]{1,5})/gi
        var groups = fdRegex.exec(fdStr)
        if (!groups) {
          return null
        }
        var results = {
          gridType: groups[1].toUpperCase(),
          gridNorth: groups[2].toUpperCase(),
          gridEast: groups[3]
        }
        return results
      },

      getCenter: function() {
        return this.olmap.getView().getCenter();
      },

      // reusable tile loader hook to update a loading indicator
      tileLoaderHook: function (tileSource, tileLayer) {
        // number of tiles currently in flight
        var numLoadingTiles = 0
        // number of misses for the current set
        var badTiles = 0
        var tileLoader = tileSource.getTileLoadFunction()
        return function (tile, src) {
          if (numLoadingTiles === 0) {
            tileLayer.progress = 'loading'
            badTiles = 0
          }
          numLoadingTiles++
          var image = tile.getImage()
          // to hell with you, cross origin policy!
          image.crossOrigin = 'use-credentials'
          image.onload = function () {
            numLoadingTiles--
            if (numLoadingTiles === 0) {
              if (badTiles > 0) {
                tileLayer.progress = 'error'
              } else {
                tileLayer.progress = 'idle'
              }
            }
          }
          image.onerror = function () {
            badTiles++
            image.onload()
          }
          tileLoader(tile, src)
        }
      },
      // loader for layers with a "time" axis, e.g. live satellite imagery
      createTimelineLayer: function (options) {
        var vm = this
        options.params = $.extend({
          FORMAT: 'image/jpeg',
          SRS: 'EPSG:4326'
        }, options.params || {})

        // technically, we can specify a WMS source and a layer without
        // either the source URL or the layerID. which is good, because
        // we need to do that later on in a callback.
        var tileSource = new ol.source.TileWMS({
          params: options.params,
          tileGrid: new ol.tilegrid.TileGrid({
            extent: [-180, -90, 180, 90],
            resolutions: this.resolutions,
            tileSize: [1024, 1024]
          })
        })

        var tileLayer = new ol.layer.Tile({
          opacity: options.opacity || 1,
          source: tileSource
        })

        // hook the tile loading function to update progress indicator
        tileLayer.progress = ''
        tileSource.setTileLoadFunction(this.tileLoaderHook(tileSource, tileLayer))

        // hook to swap the tile layer when timeIndex changes
        tileLayer.on('propertychange', function (event) {
          if (event.key === 'timeIndex') {
            tileSource.updateParams({
              'layers': options.timeline[event.target.get(event.key)][1]
            })
          }
        })

        // helper function to update the time index
        options.updateTimeline = function () {
          // fetch the latest timestamp-to-layerID map from the source URL
          $.getJSON(options.source, function (data) {
            tileLayer.set('updated', moment().toLocaleString())
            tileSource.setUrls(data.servers)
            options.timeline = data.layers.reverse()
            tileLayer.set('timeIndex', options.timeIndex || options.timeline.length - 1)
            vm.$root.active.update()
          })
        }

        options.updateTimeline()
        // if the "refresh" option is set, set a timer
        // to update the source
        if (options.refresh) {
          tileLayer.refresh = setInterval(function () {
            options.updateTimeline()
          }, options.refresh * 1000)
        }

        // set properties for use in layer selector
        tileLayer.set('name', options.name)
        tileLayer.set('id', options.id)
        return tileLayer
      },
      // loader for vector layers with hover querying
      createWFSLayer: function (options) {
        var vm = this
        var url = this.defaultWFSSrc
        // default overridable params sent to the WFS source
        options.params = $.extend({
          version: '1.1.0',
          service: 'WFS',
          request: 'GetFeature',
          outputFormat: 'application/json',
          srsname: 'EPSG:4326',
          typename: options.id
        }, options.params || {})

        var vectorSource = new ol.source.Vector()
        var vector = new ol.layer.Vector({
          opacity: options.opacity || 1,
          source: vectorSource,
          style: options.style
        })
        vector.progress = ''

        vectorSource.loadSource = function (loadType,onSuccess) {
          if (options.cql_filter) {
            options.params.cql_filter = options.cql_filter
          } else if (options.params.cql_filter) {
            delete options.params.cql_filter
          }
          vm.$root.active.refreshRevision += 1
          vector.progress = 'loading'
          $.ajax({
            url: url + '?' + $.param(options.params),
            success: function (response, stat, xhr) {
              var features = vm.$root.geojson.readFeatures(response)
              var defaultOnload = function(loadType,source,features) {
                  source.clear(true)
                  source.addFeatures(features)
              }
              if (options.onload) {
                options.onload(loadType,vectorSource,features,defaultOnload)
              } else {
                defaultOnload(loadType,vectorSource,features)
              }
              vm.$root.active.refreshRevision += 1
              vector.progress = 'idle'
              vector.set('updated', moment().toLocaleString())
              vectorSource.dispatchEvent('loadsource')
              if (onSuccess) {
                onSuccess()
              }
            },
            error: function () {
              vm.$root.active.refreshRevision += 1
              vector.progress = 'error'
            },
            dataType: 'json',
            xhrFields: {
              withCredentials: true
            }
          })
        }

        if (options.onadd) {
          vectorSource.on('addfeature', function (event) {
            options.onadd(event.feature)
          })
        }
        
        vector.postRemove = function () {
          // disable autoupdates
          if (this.autoRefresh) {
            clearInterval(this.autoRefresh)
            delete this.autoRefresh
          }
        }

        // if the "refresh" option is set, set a timer
        // to update the source
        if (options.refresh && !vector.autoRefresh) {
          vector.autoRefresh = setInterval(function () {
            vectorSource.loadSource("auto")
          }, options.refresh * 1000)
        }
        // populate the source with data
        vectorSource.loadSource("initial")

        vector.set('name', options.name)
        vector.set('id', options.id)

        vector.stopAutoRefresh = function() {
            if (this.autoRefresh) {
                clearInterval(this.autoRefresh)
                //console.log("Stop auto refresh for layer (" + options.id + ")")
                delete this.autoRefresh
            }
        }

        vector.startAutoRefresh = function() {
            if (!options.refresh) {
                //not refreshable
                return
            } 
            if(this.autoRefresh) {
                //already started
                return
            }
            this.autoRefresh = setInterval(function () {
                vectorSource.loadSource("auto")
            }, options.refresh * 1000)
            //console.log("Start auto refresh for layer (" + options.id + ") with interval " + options.refresh)
        }

        return vector
      },
      createAnnotations: function (layer) {
        return this.$root.annotations.featureOverlay
      },
      // loader to create a WMTS layer from a kmi datasource
      createTileLayer: function (layer) {
        var vm = this
        if (layer.base) {
          layer.format = 'image/jpeg'
        }
        layer = $.extend({
          opacity: 1,
          name: 'Mapbox Outdoors',
          id: 'dpaw:mapbox_outdoors',
          format: 'image/png',
          tileSize: 1024,
          style: '',
          projection: 'EPSG:4326',
          wmts_url: this.defaultWMTSSrc
        }, layer)

        // create a tile grid using the stock KMI resolutions
        var matrixSet = this.matrixSets[layer.projection][layer.tileSize]
        var tileGrid = new ol.tilegrid.WMTS({
          origin: ol.extent.getTopLeft([-180, -90, 180, 90]),
          resolutions: this.resolutions,
          matrixIds: matrixSet.matrixIds,
          tileSize: layer.tileSize
        })

        // override getZForResolution on tile grid object;
        // for weird zoom levels, the default is to round up or down to the
        // nearest integer to determine which tiles to use.
        // because we want the printing rasters to contain as much detail as
        // possible, we rig it here to always round up.
        tileGrid.origGetZForResolution = tileGrid.getZForResolution
        tileGrid.getZForResolution = function (resolution, optDirection) {
          return tileGrid.origGetZForResolution(resolution*1.4, -1)
        }

        // create a tile source
        var tileSource = new ol.source.WMTS({
          url: layer.wmts_url,
          layer: layer.id,
          matrixSet: matrixSet.name,
          format: layer.format,
          style: layer.style,
          projection: layer.projection,
          wrapX: true,
          tileGrid: tileGrid
        })

        tileSource.setUrlTimestamp = function() {
            var originFunc = tileSource.getTileUrlFunction()
            return function(time) {
                tileSource.setTileUrlFunction(function(tileCoord,pixelRatio,projection){
                    return originFunc(tileCoord,pixelRatio,projection) + "&time=" + time
                },tileSource.getUrls()[0] + "?time=" + time)
            }
        }()

        var tileLayer = new ol.layer.Tile({
          opacity: layer.opacity || 1,
          source: tileSource
        })

        // hook the tile loading function to update progress indicator
        tileLayer.progress = ''
        tileSource.setTileLoadFunction(this.tileLoaderHook(tileSource, tileLayer))

        tileLayer.postRemove = function () {
          if (this.autoRefresh) {
            clearInterval(this.autoRefresh)
            delete this.autoRefresh
          }
        }   


        // if the "refresh" option is set, set a timer
        // to force a reload of the tile content
        if (layer.refresh) {
          tileLayer.set('updated', moment().toLocaleString())
          vm.$root.active.refreshRevision += 1
          tileSource.load = function() {
            tileLayer.set('updated', moment().toLocaleString())
            tileSource.setUrlTimestamp(moment.utc().unix())
            vm.$root.active.refreshRevision += 1
          }
          tileLayer.autoRefresh = setInterval(function () {
            tileSource.load()
          }, layer.refresh * 1000)
        }

        // set properties for use in layer selector
        tileLayer.set('name', layer.name)
        tileLayer.set('id', layer.id)

        tileLayer.stopAutoRefresh = function() {
            if (this.autoRefresh) {
                clearInterval(this.autoRefresh)
                //console.log("Stop auto refresh for layer (" + layer.id + ")")
                delete this.autoRefresh
            }
        }

        tileLayer.startAutoRefresh = function() {
            if (!layer.refresh) {
                //not refreshable
                return
            } 
            if(this.autoRefresh) {
                //already started
                return
            }
            this.autoRefresh = setInterval(function () {
                tileSource.load()
            }, layer.refresh * 1000)
            //console.log("Start auto refresh for layer (" + layer.id + ") with interval " + layer.refresh)
        }


        return tileLayer
      },

      getMapLayer: function (id) {
        if (id && id.id) { id = id.id } // if passed a catalogue layer, get actual id
        return this.olmap.getLayers().getArray().find(function (layer) {
          return layer.get('id') === id
        })
      },
      // initialise map
      init: function (options) {
        var vm = this
        options = options || {}

        // add some extra projections
        proj4.defs("EPSG:28349","+proj=utm +zone=49 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
        proj4.defs("EPSG:28350","+proj=utm +zone=50 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
        proj4.defs("EPSG:28351","+proj=utm +zone=51 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
        proj4.defs("EPSG:28352","+proj=utm +zone=52 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
        proj4.defs("EPSG:28353","+proj=utm +zone=53 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
        proj4.defs("EPSG:28354","+proj=utm +zone=54 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
        proj4.defs("EPSG:28355","+proj=utm +zone=55 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");
        proj4.defs("EPSG:28356","+proj=utm +zone=56 +south +ellps=GRS80 +towgs84=0,0,0,0,0,0,0 +units=m +no_defs");

        // bump search bar over if there's no fullscreen button
        if (!ol.control.FullScreen.isFullScreenSupported()) {
          $('#map-search').addClass('noFullScreen')
          $('#map-search-button').addClass('noFullScreen')
        }

        this.olmap = new ol.Map({
          logo: false,
          renderer: 'canvas',
          target: 'map',
          view: new ol.View({
            projection: 'EPSG:4326',
            center: vm.view.center,
            zoom: 6,
            maxZoom: 21,
            minZoom: 5
          }),
          controls: [
            new ol.control.Zoom({
              target: $('#external-controls').get(0)   
            }),
            new ol.control.ScaleLine(),
            new ol.control.MousePosition({
                coordinateFormat: function(coordinate) {
                    return vm.getDeg(coordinate)+'<br/>'+vm.getDMS(coordinate)+'<br/>'+vm.getMGA(coordinate)
                }
            }),
            new ol.control.FullScreen({
              source: $('body').get(0),
              target: $('#external-controls').get(0),
              label: $('<i/>', {
                class: 'fa fa-expand'
              })[0]
            }),
            new ol.control.Control({
              element: $('#menu-scale').get(0),
              target: $('#external-controls').get(0)
            }),
            new ol.control.Control({
              element: $('#map-search').get(0),
              target: $('#external-controls').get(0)
            }),
            new ol.control.Control({
              element: $('#map-search-button').get(0),
              target: $('#external-controls').get(0)
            }),
            new ol.control.Attribution()
          ],
          interactions: ol.interaction.defaults({
            altShiftDragRotate: false,
            pinchRotate: false,
            dragPan: false,
            doubleClickZoom: false,
            keyboard: false
          })
        })

        this.setScale(this.view.scale / 1000)

        // add some default interactions
        this.olmap.addInteraction(this.dragPanInter)
        this.olmap.addInteraction(this.doubleClickZoomInter)
        this.olmap.addInteraction(this.keyboardPanInter)
        this.olmap.addInteraction(this.keyboardZoomInter)
        this.olmap.addInteraction(this.middleDragPanInter)

        // Create the graticule component
        this.graticule.setMap(this.olmap)

        // setup scale events
        this.olmap.on('postrender', function () {
          vm.scale = vm.getScale()
        })

      },
      initLayers: function (catalogue, layers) {
        var vm = this
        //add the hardcoded layers to category
        $.each(catalogue,function(index,layer) {
            var catLayer = vm.$root.catalogue.getLayer(layer.id)
            if (catLayer) {
                //hardcoded layer already exist, update the properties 
                $.extend(catLayer,layer)
            } else {
                //hardcoded layer not exist, add it
                vm.$root.catalogue.catalogue.push(layer)
            }
        })
        //create active open layers 
        var initialLayers = layers.reverse().map(function (value) {
          var layer = $.extend(vm.$root.catalogue.getLayer(value[0]), value[1])
          return vm['create' + layer.type](layer)
        })
        //add active layers into map
        $.each(initialLayers,function(index,layer){
            vm.olmap.addLayer(layer)
        })
      }
    },
    ready: function () {
      var mapStatus = this.loading.register("olmap","Open layer map Component","Initialize")
      this.svgBlobs = {}
      this.svgTemplates = {}
      this.cachedStyles = {}
      this.jobs = {}

      // generate matrix IDs from name and level number
      $.each(this.matrixSets, function (projection, innerMatrixSets) {
        $.each(innerMatrixSets, function (tileSize, matrixSet) {
          var matrixIds = new Array(matrixSet.maxLevel - matrixSet.minLevel + 1)
          for (var z = matrixSet.minLevel; z <= matrixSet.maxLevel; ++z) {
            matrixIds[z] = matrixSet.name + ':' + z
          }
          matrixSet.matrixIds = matrixIds
        })
      })
      mapStatus.end()
    }
  }
</script>

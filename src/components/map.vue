<template>
  <div class="map" id="map" tabindex="0">
    <gk-info v-ref:info></gk-info>
    <select v-el:scale @change="setScale($event.target.value)" id="menu-scale" v-cloak>
      <option value="{{ scale }}" selected>{{ scaleString }}</option>
      <option v-for="s in fixedScales" value="{{ s }}">{{ getScaleString(s) }}</option>
    </select>
  </div>
</template>

<script>
  import { $, ol, moment } from 'src/vendor.js'
  import gkInfo from './info.vue'
  export default {
    store: ['defaultWMTSSrc', 'defaultWFSSrc', 'fixedScales', 'resolutions', 'matrixSets', 'dpmm', 'view'],
    components: { gkInfo },
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
      // scale string for the current map zoom level
      scaleString: function () {
        return this.getScaleString(this.scale)
      },
      // because the viewport size changes when the tab pane opens, don't cache the map width and height
      width: {
        cache: false,
        get: function get () {
          if (this.$el) {
            return this.$el.clientWidth
          }
          return 0
        }
      },
      height: {
        cache: false,
        get: function get () {
          if (this.$el) {
            return this.$el.clientHeight
          }
          return 0
        }
      }
    },
    // methods callable from inside the template
    methods: {
      animatePan: function (location) {
        // pan from the current center
        var pan = ol.animation.pan({
          source: this.olmap.getView().getCenter()
        })
        this.olmap.beforeRender(pan)
        // when we set the new location, the map will pan smoothly to it
        this.olmap.getView().setCenter(location)
      },
      animateZoom: function (factor) {
        // zoom from the current resolution
        var zoom = ol.animation.zoom({
          resolution: this.olmap.getView().getResolution()
        })
        this.olmap.beforeRender(zoom)
        // setting the resolution to a new value will smoothly zoom in or out
        // depending on the factor
        this.olmap.getView().setResolution(this.olmap.getView().getResolution() * factor)
      },
      // force OL to approximate a fixed scale (1:1K increments)
      setScale: function (scale) {
        while (Math.abs(this.getScale() - scale) > 0.001) {
          this.olmap.getView().setResolution(this.olmap.getView().getResolution() * scale / this.getScale())
        }
        this.scale = scale
        this.$els.scale.selectedIndex = 0
      },
      // return the scale (1:1K increments)
      getScale: function () {
        var size = this.olmap.getSize()
        var center = this.olmap.getView().getCenter()
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
          image.crossOrigin = 'anonymous'
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
            vm.$root.gkLayers.update()
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

        vectorSource.loadSource = function (onSuccess) {
          if (options.cql_filter) {
            options.params.cql_filter = options.cql_filter
          } else if (options.params.cql_filter) {
            delete options.params.cql_filter
          }
          vector.progress = 'loading'
          $.ajax({
            url: url + '?' + $.param(options.params),
            success: function (response, stat, xhr) {
              var features = vm.$root.geojson.readFeatures(response)
              vectorSource.clear(true)
              vectorSource.addFeatures(features)
              vector.progress = 'idle'
              if (onSuccess) {
                onSuccess()
              }
            },
            error: function () {
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

        // if the "refresh" option is set, set a timer
        // to update the source
        if (options.refresh) {
          vector.set('updated', moment().toLocaleString())
          vectorSource.refresh = setInterval(function () {
            vector.set('updated', moment().toLocaleString())
            vectorSource.loadSource()
          }, options.refresh * 1000)
        }
        vectorSource.loadSource()

        vector.set('name', options.name)
        vector.set('id', options.id)
        return vector
      },
      createAnnotations: function (layer) {
        return this.$root.annotations.featureOverlay
      },
      // loader to create a WMTS layer from a kmi datasource
      createTileLayer: function (layer) {
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
          return tileGrid.origGetZForResolution(resolution*1.05, -1)
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

        var tileLayer = new ol.layer.Tile({
          opacity: layer.opacity || 1,
          source: tileSource
        })

        // hook the tile loading function to update progress indicator
        tileLayer.progress = ''
        tileSource.setTileLoadFunction(this.tileLoaderHook(tileSource, tileLayer))

        // if the "refresh" option is set, set a timer
        // to force a reload of the tile content
        if (layer.refresh) {
          tileLayer.set('updated', moment().toLocaleString())
          tileLayer.refresh = setInterval(function () {
            tileLayer.set('updated', moment().toLocaleString())
            tileSource.setUrl(layer.wmts_url + '?time=' + moment.utc().unix())
          }, layer.refresh * 1000)
        }
        // set properties for use in layer selector
        tileLayer.set('name', layer.name)
        tileLayer.set('id', layer.id)
        return tileLayer
      },
      getMapLayer: function (id) {
        if (id && id.id) { id = id.id } // if passed a catalogue layer, get actual id
        return this.olmap.getLayers().getArray().find(function (layer) {
          return layer.get('id') === id
        })
      },
      // initialise map
      init: function (catalogue, layers, options) {
        var vm = this
        options = options || {}
        this.$root.catalogue.catalogue.extend(catalogue)
        var initialLayers = layers.reverse().map(function (value) {
          var layer = $.extend(vm.$root.catalogue.getLayer(value[0]), value[1])
          return vm['create' + layer.type](layer)
        })

        this.olmap = new ol.Map({
          logo: false,
          renderer: 'canvas',
          target: 'map',
          layers: initialLayers,
          view: new ol.View({
            projection: 'EPSG:4326',
            center: vm.view.center,
            zoom: 6,
            maxZoom: 21,
            minZoom: 5
          }),
          controls: [
            new ol.control.Zoom(),
            new ol.control.ScaleLine(),
            new ol.control.FullScreen({
              source: $('body').get(0),
              label: $('<i/>', {
                class: 'fa fa-expand'
              })[0]
            }),
            new ol.control.Control({
              element: $('#menu-scale').get(0)
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
          vm.$els.scale.selectedIndex = 0
        })

        // tell other components map is ready
        this.$root.$broadcast('gk-init')
      }
    },
    ready: function () {
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
    }
  }
</script>

import {
  $,
  svg4everybody,
  ol,
  proj4,
  moment,
  localforage,
  Vue,
  VueStash
} from 'src/vendor.js'
import App from './sss.vue'
import tour from './sss-tour.js'

global.tour = tour

global.debounce = function (func, wait, immediate) {
  // Returns a function, that, as long as it continues to be invoked, will not
  // be triggered. The function will be called after it stops being called for
  // N milliseconds. If `immediate` is passed, trigger the function on the
  // leading edge, instead of the trailing.
  'use strict'
  var timeout
  return function () {
    var context = this
    var args = arguments
    var later = function () {
      timeout = null
      if (!immediate) func.apply(context, args)
    }
    var callNow = immediate && !timeout
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
    if (callNow) func.apply(context, args)
  }
}

var defaultStore = {
  tourVersion: null,
  whoami: { email: null },
  // filters for finding layers
  catalogueFilters: [
    ['basemap', 'Base Imagery'],
    ['boundaries', 'Admin Boundaries'],
    ['communications', 'Communications'],
    ['operations', 'DPaW Operations'],
    ['bushfire', 'Fire'],
    ['infrastructure', 'Infrastructure'],
    ['meteorology', 'Meteorology'],
    ['relief', 'Relief'],
    ['sensitive', 'Sensitive Sites']
  ],
  // overridable defaults for WMTS and WFS loading
  remoteCatalogue: process.env.CSW_SERVICE + "?format=json&application__name=sss",
  defaultWMTSSrc: process.env.WMTS_SERVICE,
  defaultWFSSrc: process.env.WFS_SERVICE,
  defaultLegendSrc: process.env.LEGEND_SRC,
  gokartService: process.env.GOKART_SERVICE,
  // default matrix from KMI
  resolutions: [0.17578125, 0.087890625, 0.0439453125, 0.02197265625, 0.010986328125, 0.0054931640625, 0.00274658203125, 0.001373291015625, 0.0006866455078125, 0.0003433227539062, 0.0001716613769531, 858306884766e-16, 429153442383e-16, 214576721191e-16, 107288360596e-16, 53644180298e-16, 26822090149e-16, 13411045074e-16],
  // fixed scales for the scale selector (1:1K increments)
  fixedScales: [0.25, 0.5, 1, 2, 2.5, 5, 10, 20, 25, 50, 80, 100, 125, 250, 500, 1000, 2000, 3000, 5000, 10000, 25000],
  view: {
    center: [123.75, -24.966]
  },
  // id followed by properties to merge into catalogue
  activeLayers: [
    ['dpaw:resource_tracking_live', {}],
    ['cddp:smb_250K', {}]
  ],
  matrixSets: {
    'EPSG:4326': {
      '1024': {
        'name': 'gda94',
        'minLevel': 0,
        'maxLevel': 17
      }
    }
  },
  mmPerInch: 25.4,
  // blank annotations
  annotations: {
    type: 'FeatureCollection',
    features: []
  }
}
global.gokartService = defaultStore.gokartService;

global.localforage = localforage
global.$ = $

Vue.use(VueStash)
localforage.getItem('sssOfflineStore').then(function (store) {
  global.gokart = new Vue({
    el: 'body',
    components: {
      App
    },
    data: {
      // store contains state we want to reload/persist
      store: $.extend(defaultStore, store || {}),
      pngs: {},
      saved: null,
      touring: false
    },
    computed: {
      map: function () { return this.$refs.app.$refs.map },
      info: function () { return this.$refs.app.$refs.map.$refs.info },
      active: function () { return this.$refs.app.$refs.layers.$refs.active },
      catalogue: function () { return this.$refs.app.$refs.layers.$refs.catalogue },
      export: function () { return this.$refs.app.$refs.layers.$refs.export },
      annotations: function () { return this.$refs.app.$refs.annotations },
      tracking: function () { return this.$refs.app.$refs.tracking },
      geojson: function () { return new ol.format.GeoJSON() },
      wgs84Sphere: function () { return new ol.Sphere(6378137) }
    },
    ready: function () {
      var self = this
      // setup foundation, svg url support
      $(document).foundation()
      svg4everybody()
      // calculate screen res
      $('body').append('<div id="dpi" style="width:1in;display:none"></div>')
      this.dpi = parseFloat($('#dpi').width())
      this.store.dpmm = self.dpi / self.store.mmPerInch
      $('#dpi').remove();
      // get user info
      (function () {
        var req = new window.XMLHttpRequest()
        req.withCredentials = true
        req.onload = function () {
          self.whoami = JSON.parse(this.responseText)
        }
        req.open('GET', 'https://oim.dpaw.wa.gov.au/api/whoami')
        req.send()
      })()
      // bind menu side-tabs to reveal the side pane
      var offCanvasLeft = $('#offCanvasLeft')
      $('#menu-tabs').on('change.zf.tabs', function (ev) {
        offCanvasLeft.addClass('reveal-responsive')
        self.map.olmap.updateSize()
      }).on('click', '.tabs-title a[aria-selected=false]', function (ev) {
        offCanvasLeft.addClass('reveal-responsive')
        $(this).attr('aria-selected', true)
        self.map.olmap.updateSize()
      }).on('click', '.tabs-title a[aria-selected=true]', function (ev) {
        offCanvasLeft.removeClass('reveal-responsive')
        $(this).attr('aria-selected', false)
        self.map.olmap.updateSize()
      })
      $('#side-pane-close').on('click', function (ev) {
        offCanvasLeft.removeClass('reveal-responsive')
        $('#menu-tabs').find('.tabs-title a[aria-selected=true]').attr('aria-selected', false)
        self.map.olmap.updateSize()
      })

      var resourceTrackingStyle = function (res) {
        var feat = this
        // cache styles for performance
        var style = self.$refs.app.cacheStyle(function (feat) {
          var src = self.$refs.app.getBlob(feat, ['icon', 'tint'])
          if (!src) { return false }
          return new ol.style.Style({
            image: new ol.style.Icon({
              src: src,
              scale: 0.5,
              snapToPixel: true
            }),
            text: new ol.style.Text({
              offsetX: 12,
              textAlign: 'left',
              font: '12px Helvetica,Roboto,Arial,sans-serif',
              stroke: new ol.style.Stroke({
                color: '#fff',
                width: 4
              })
            }),
            stroke: new ol.style.Stroke({
              color: [52, 101, 164, 0.6],
              width: 4.0
            })
          })
        }, feat, ['icon', 'tint'])
        if (style.getText) {
          if (res < 0.002) {
            style.getText().setText(feat.get('label'))
          } else {
            style.getText().setText('')
          }
        }
        return style
      }

      var addResource = function (f) {
        var tint = 'red'
        if (f.get('age') < 24) {
          tint = 'orange'
        };
        if (f.get('age') < 3) {
          tint = 'yellow'
        };
        if (f.get('age') <= 1) {
          tint = 'green'
        };
        f.set('icon', 'dist/static/symbols/device/' + f.get('symbolid') + '.svg')
        f.set('tint', tint)
        f.set('baseTint', tint)
        f.set('label', f.get('name') || f.get('callsign') || f.get('rego') || f.get('deviceid'))
        f.set('time', moment(f.get('seen')).toLocaleString())
        // Set a different vue template for rendering
        f.set('partialId', 'resourceInfo')
        // Set id for select tools
        f.set('selectId', f.get('deviceid'))
        f.setStyle(resourceTrackingStyle)
      }

      var iconStyle = function (feat, res) {
        var style = self.$refs.app.cacheStyle(function (feat) {
          var src = self.$refs.app.getBlob(feat, ['icon', 'tint'])
          if (!src) { return false }
          var rot = feat.get('rotation') || 0.0
          return new ol.style.Style({
            image: new ol.style.Icon({
              src: src,
              scale: 0.5,
              rotation: rot,
              rotateWithView: true,
              snapToPixel: true
            })
          })
        }, feat, ['icon', 'tint', 'rotation'])
        return style
      }

      var getPerpendicular = function (coords) {
        // find the nearest Polygon or lineString in the annotations layer
        var nearestFeature = gokart.annotations.featureOverlay.getSource().getClosestFeatureToCoordinate(
          coords, function (feat) {
            var geom = feat.getGeometry()
            return ((geom instanceof ol.geom.Polygon) || (geom instanceof ol.geom.LineString))
          }
        )
        if (!nearestFeature) {
          // no feature == no rotation
          return 0.0
        }
        var segments = []
        var source = []
        var segLength = 0
        // if a Polygon, join the last segment to the first
        if (nearestFeature.getGeometry() instanceof ol.geom.Polygon) {
          source = nearestFeature.getGeometry().getCoordinates()[0]
          segLength = source.length
        } else {
        // if a LineString, don't include the last segment
          source = nearestFeature.getGeometry().getCoordinates()
          segLength = source.length-1
        }
        for (var i=0; i < segLength; i++) {
          segments.push([source[i], source[(i+1)%source.length]])
        }
        // sort segments by ascending distance from point
        segments.sort(function (a, b) {
          return ol.coordinate.squaredDistanceToSegment(coords, a) - ol.coordinate.squaredDistanceToSegment(coords, b)
        })

        // head of the list is our target segment. reverse this to get the normal angle
        var offset = [segments[0][1][0] - segments[0][0][0], segments[0][1][1] - segments[0][0][1]]
        var normal = Math.atan2(-offset[1], offset[0])
        return normal
      }

      
      // pack-in catalogue
      var catalogue = [{
        type: 'WFSLayer',
        name: 'Resource Tracking',
        id: 'dpaw:resource_tracking_live',
        onadd: addResource,
        refresh: 30
      }, {
        type: 'WFSLayer',
        name: 'Resource Tracking History',
        id: 'dpaw:resource_tracking_history',
        onadd: addResource,
        cql_filter: false
      }, {
        type: 'TileLayer',
        name: 'Firewatch Hotspots 72hrs',
        id: 'landgate:firewatch_ecu_hotspots_last_0_72',
        format: 'image/png',
        refresh: 60
      }, {
        type: 'TimelineLayer',
        name: 'Himawari-8 Hotspots',
        id: 'himawari8:hotspots',
        source: this.store.gokartService + '/hi8/AHI_TKY_FHS',
        params: {
          FORMAT: 'image/png'
        },
        refresh: 300
      }, {
        type: 'TimelineLayer',
        name: 'Himawari-8 True Colour',
        id: 'himawari8:bandtc',
        source: this.store.gokartService + '/hi8/AHI_TKY_b321',
        refresh: 300,
        base: true
      }, {
        type: 'TimelineLayer',
        name: 'Himawari-8 Band 3',
        id: 'himawari8:band3',
        source: this.store.gokartService + '/hi8/AHI_TKY_b3',
        refresh: 300,
        base: true
      }, {
        type: 'TimelineLayer',
        name: 'Himawari-8 Band 7',
        id: 'himawari8:band7',
        source: this.store.gokartService + '/hi8/AHI_TKY_b7',
        refresh: 300,
        base: true
      }, {
        type: 'TimelineLayer',
        name: 'Himawari-8 Band 15',
        id: 'himawari8:band15',
        source: this.store.gokartService + '/hi8/AHI_TKY_b15',
        refresh: 300,
        base: true
      }, {
        type: 'TileLayer',
        name: 'State Map Base',
        id: 'cddp:smb_250K',
        base: true
      }, {
        type: 'TileLayer',
        name: 'Virtual Mosaic',
        id: 'landgate:LGATE-V001',
        base: true
      }]

      // load custom annotation tools
      /*var hotSpotStyle = new ol.style.Style({
        image: new ol.style.Circle({
          fill: new ol.style.Fill({
            color: '#b43232'
          }),
          radius: 8
        })
      })*/

      var iconDrawFactory = function (options) {
        var defaultFeat = new ol.Feature({
          'icon': options.icon,
        })
        var draw =  new ol.interaction.Draw({
          type: 'Point',
          features: options.features,
          style: function (feat, res) { return iconStyle(defaultFeat, res) }
        })
        draw.on('drawstart', function (ev) {
          // set parameters
          ev.feature.set('icon', options.icon)
          if (options.perpendicular) {
            var coords = ev.feature.getGeometry().getCoordinates()
            ev.feature.set('rotation', getPerpendicular(coords))
          }
        })
        return draw
      }

      /*var hotSpotDraw = new ol.interaction.Draw({
        type: 'Point',
        features: this.annotations.features,
        style: hotSpotStyle
      })*/

      var originPointDraw = iconDrawFactory({
        icon: 'dist/static/symbols/fire/origin.svg',
        features:  this.annotations.features,
        tint: 'default',
      })
      var spotFireDraw = iconDrawFactory({
        icon: 'dist/static/symbols/fire/spotfire.svg',
        features:  this.annotations.features,
        tint: 'default',
      })
      var divisionDraw = iconDrawFactory({
        icon: 'dist/static/symbols/fire/division.svg',
        features:  this.annotations.features,
        tint: 'default',
        perpendicular: true
      })
      var sectorDraw = iconDrawFactory({
        icon: 'dist/static/symbols/fire/sector.svg',
        features:  this.annotations.features,
        tint: 'default',
        perpendicular: true
      })


      var fireBoundaryStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
          width: 4.0,
          color: [0, 0, 0, 1.0]
        }),
        fill: new ol.style.Fill({
          color: [0, 0, 0, 0.25]
        })
      })

      var fireBoundaryDraw = new ol.interaction.Draw({
        type: 'Polygon',
        features: this.annotations.features,
        style: fireBoundaryStyle
      })

      var snapToLines = new ol.interaction.Snap({
        features: this.annotations.features,
        edge: true,
        vertex: false,
        pixelTolerance: 16
      })

      var sssTools = [
        {
        /*  name: 'Hot Spot',
          icon: 'fa-circle red',
          interactions: [hotSpotDraw],
          style: hotSpotStyle,
          showName: true
        }, {*/
          name: 'Origin Point',
          icon: 'dist/static/symbols/fire/origin.svg',
          interactions: [originPointDraw],
          style: function (res) { return iconStyle(this, res) },
          showName: true,
          selectedTint: [['#b43232','#2199e8']]
        }, {
          name: 'Spot Fire',
          icon: 'dist/static/symbols/fire/spotfire.svg',
          interactions: [spotFireDraw],
          style: function (res) { return iconStyle(this, res) },
          showName: true,
          selectedTint: [['#b43232','#2199e8']]
        }, {
          name: 'Division',
          icon: 'dist/static/symbols/fire/division.svg',
          interactions: [divisionDraw, snapToLines],
          style: function (res) { return iconStyle(this, res) },
          showName: true
        }, {
          name: 'Sector',
          icon: 'dist/static/symbols/fire/sector.svg',
          interactions: [sectorDraw, snapToLines],
          style: function (res) { return iconStyle(this, res) },
          showName: true
        }, {
          name: 'Fire Boundary',
          icon: 'dist/static/images/iD-sprite.svg#icon-area',
          style: fireBoundaryStyle,
          interactions: [fireBoundaryDraw],
          showName: true
        },
        self.annotations.ui.defaultText,
        self.annotations.ui.defaultLine,
        self.annotations.ui.defaultPolygon
      ]

      sssTools.forEach(function (tool) {
        self.annotations.tools.push(tool)
      })

      // load map with default layers
      this.map.init(catalogue, this.store.activeLayers)
      this.catalogue.loadRemoteCatalogue(this.store.remoteCatalogue, function () {
        // after catalogue load trigger a tour
        if (self.store.tourVersion !== tour.version) {
          self.store.tourVersion = tour.version
          self.export.saveState()
          self.touring = true
          tour.start()
        }
      })
    }
  })
})

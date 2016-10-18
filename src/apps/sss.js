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
  remoteCatalogue: env.cswService + "?format=json&application__name=sss",
  defaultWMTSSrc: env.wmtsService,
  defaultWFSSrc: env.wfsService,
  defaultLegendSrc: env.legendSrc,
  gokartService: env.gokartService,
  oimService:env.oimService,
  sssService:env.sssService,
  bfrsService:env.bfrsService,
  appType:env.appType,
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
      fixedLayers:[],
      saved: null,
      touring: false,
      tints: {
        'selectedPoint': [['#b43232', '#2199e8']],
        'selectedDivision': [['#000000', '#2199e8'], ['#7c3100','#2199e8'], ['#ff6600', '#ffffff']]
      }
    },
    computed: {
      loading: function () { return this.$refs.app.$refs.loading },
      map: function () { return this.$refs.app.$refs.map },
      scales: function () { return this.$refs.app.$refs.map.$refs.scales },
      search: function () { return this.$refs.app.$refs.map.$refs.search },
      measure: function () { return this.$refs.app.$refs.map.$refs.measure },
      info: function () { return this.$refs.app.$refs.map.$refs.info },
      active: function () { return this.$refs.app.$refs.layers.$refs.active },
      catalogue: function () { return this.$refs.app.$refs.layers.$refs.catalogue },
      export: function () { return this.$refs.app.$refs.layers.$refs.export },
      annotations: function () { return this.$refs.app.$refs.annotations },
      tracking: function () { return this.$refs.app.$refs.tracking },
      bfrs: function () { return this.$refs.app.$refs.bfrs },
      geojson: function () { return new ol.format.GeoJSON() },
      wgs84Sphere: function () { return new ol.Sphere(6378137) }
    },
    ready: function () {
      var self = this
      self.loading.app.progress(5,"Initialize UI")
      // setup foundation, svg url support
      $(document).foundation()
      svg4everybody()
      // set title
      $('title').text('Spatial Support System v3')
      // calculate screen res
      $('body').append('<div id="dpi" style="width:1in;display:none"></div>')
      self.dpi = parseFloat($('#dpi').width())
      self.store.dpmm = self.dpi / self.store.mmPerInch
      $('#dpi').remove();
      // get user info
      (function () {
        var req = new window.XMLHttpRequest()
        req.withCredentials = true
        req.onload = function () {
          self.whoami = JSON.parse(this.responseText)
        }
        req.open('GET', self.store.oimService + '/api/whoami')
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
        offCanvasLeft.toggleClass('reveal-responsive')
        self.map.olmap.updateSize()
      })
      $('#side-pane-close').on('click', function (ev) {
        offCanvasLeft.removeClass('reveal-responsive')
        $('#menu-tabs').find('.tabs-title a[aria-selected=true]').attr('aria-selected', false)
        self.map.olmap.updateSize()
      })

      self.loading.app.progress(10,"Initialize Fixed Layers")
      // pack-in catalogue
      self.fixedLayers = self.fixedLayers.concat([{
        type: 'TileLayer',
        name: 'Firewatch Hotspots 72hrs',
        id: 'landgate:firewatch_ecu_hotspots_last_0_72',
        format: 'image/png',
        refresh: 60
      }, {
        type: 'TimelineLayer',
        name: 'Himawari-8 Hotspots',
        id: 'himawari8:hotspots',
        source: self.store.gokartService + '/hi8/AHI_TKY_FHS',
        params: {
          FORMAT: 'image/png'
        },
        refresh: 300
      }, {
        type: 'TimelineLayer',
        name: 'Himawari-8 True Colour',
        id: 'himawari8:bandtc',
        source: self.store.gokartService + '/hi8/AHI_TKY_b321',
        refresh: 300,
        base: true
      }, {
        type: 'TimelineLayer',
        name: 'Himawari-8 Band 3',
        id: 'himawari8:band3',
        source: self.store.gokartService + '/hi8/AHI_TKY_b3',
        refresh: 300,
        base: true
      }, {
        type: 'TimelineLayer',
        name: 'Himawari-8 Band 7',
        id: 'himawari8:band7',
        source: self.store.gokartService + '/hi8/AHI_TKY_b7',
        refresh: 300,
        base: true
      }, {
        type: 'TimelineLayer',
        name: 'Himawari-8 Band 15',
        id: 'himawari8:band15',
        source: self.store.gokartService + '/hi8/AHI_TKY_b15',
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
      }])

      // load custom annotation tools
      /*var hotSpotStyle = new ol.style.Style({
        image: new ol.style.Circle({
          fill: new ol.style.Fill({
            color: '#b43232'
          }),
          radius: 8
        })
      })*/

      /*var hotSpotDraw = new ol.interaction.Draw({
        type: 'Point',
        features: this.annotations.features,
        style: hotSpotStyle
      })*/

      self.loading.app.progress(20,"Initialize SSS tools")
      var originPointDraw = self.annotations.iconDrawFactory({
        icon: 'dist/static/symbols/fire/origin.svg',
        features:  self.annotations.features,
        tint: 'default',
        tints: self.tints
      })
      var spotFireDraw = self.annotations.iconDrawFactory({
        icon: 'dist/static/symbols/fire/spotfire.svg',
        features:  self.annotations.features,
        tint: 'default',
        tints: self.tints
      })
      var divisionDraw = self.annotations.iconDrawFactory({
        icon: 'dist/static/symbols/fire/division.svg',
        features:  self.annotations.features,
        tint: 'default',
        tints: self.tints,
        perpendicular: true
      })
      var sectorDraw = self.annotations.iconDrawFactory({
        icon: 'dist/static/symbols/fire/sector.svg',
        features:  self.annotations.features,
        tint: 'default',
        tints: self.tints,
        perpendicular: true
      })


      var fireBoundaryStyle = function() {
          var f = this
          var style = null
          if (f && f.get('tint') == 'selected') {
              style = [
                  new ol.style.Style({
                    fill: new ol.style.Fill({
                      color: [0, 0, 0, 0.25]
                    }),
                    stroke: new ol.style.Stroke({
                      color: '#2199e8',
                      width: 6
                    })
                  }),
                  new ol.style.Style({
                    stroke: new ol.style.Stroke({
                      color: '#ffffff',
                      width: 4
                    })
                  }),
              ]
          } else {
              style = new ol.style.Style({
                stroke: new ol.style.Stroke({
                  width: 4.0,
                  color: [0, 0, 0, 1.0]
                }),
                fill: new ol.style.Fill({
                  color: [0, 0, 0, 0.25]
                }),
                image: new ol.style.Circle({
                  radius: 5,
                  fill: new ol.style.Fill({
                  color: 'rgb(0, 153, 255)'
                  })
                })
              })
          }
          return style
      }

      var fireBoundaryDraw = new ol.interaction.Draw({
        type: 'Polygon',
        features: self.annotations.features,
        style: self.annotations.getStyleFunction(fireBoundaryStyle)
      })

      var snapToLines = new ol.interaction.Snap({
        features: self.annotations.features,
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
          style: self.annotations.getIconStyleFunction(self.tints),
          selectedTint: 'selectedPoint',
          scope:["annotation"],
          showName: true,
        }, {
          name: 'Spot Fire',
          icon: 'dist/static/symbols/fire/spotfire.svg',
          interactions: [spotFireDraw],
          style: self.annotations.getIconStyleFunction(self.tints),
          selectedTint: 'selectedPoint',
          scope:["annotation"],
          showName: true,
        }, {
          name: 'Division',
          icon: 'dist/static/symbols/fire/division.svg',
          interactions: [divisionDraw, snapToLines],
          style: self.annotations.getIconStyleFunction(self.tints),
          selectedTint: 'selectedDivision',
          scope:["annotation"],
          showName: true
        }, {
          name: 'Sector',
          icon: 'dist/static/symbols/fire/sector.svg',
          interactions: [sectorDraw, snapToLines],
          style: self.annotations.getIconStyleFunction(self.tints),
          selectedTint: 'selectedDivision',
          scope:["annotation"],
          showName: true
        }, {
          name: 'Fire Boundary',
          icon: 'dist/static/images/iD-sprite.svg#icon-area',
          style: fireBoundaryStyle,
          interactions: [fireBoundaryDraw],
          scope:["annotation"],
          showName: true
        },
        self.annotations.ui.defaultText,
        self.annotations.ui.defaultLine,
        self.annotations.ui.defaultPolygon
      ]

      sssTools.forEach(function (tool) {
        self.annotations.tools.push(tool)
      })

      // load map without layers
      self.loading.app.progress(30,"Initialize ol map")
      self.map.init()
      self.loading.app.progress(40,"Load Remote Catalogue")
      try {
          self.catalogue.loadRemoteCatalogue(self.store.remoteCatalogue, function () {
            //add default layers
            try {
                self.loading.app.progress(70,"Initialize Active Layers")
                self.map.initLayers(self.fixedLayers, self.store.activeLayers)
                // tell other components map is ready
                self.loading.app.progress(80,"Broadcast 'gk-init' event")
                self.$broadcast('gk-init')
                // after catalogue load trigger a tour
                $("#menu-tab-layers-label").trigger("click")
                self.loading.app.end()
            } catch(err) {
                //some exception happens
                self.loading.app.failed()
                throw err
            }
            if (self.store.tourVersion !== tour.version) {
              self.store.tourVersion = tour.version
              self.export.saveState()
              self.touring = true
              tour.start()
            }
          },function(reason){
            self.loading.app.failed(reason)
          })
      } catch(err) {
          //some exception happens
          self.loading.app.failed()
          throw err
      }
    }
  })
})


import {
  $,
  svg4everybody,
  moment,
  localforage,
  Vue,
  VueStash
} from 'src/vendor.js'
import ol from '../ol-extras.js'
import App from './sss.vue'

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
  whoami: { email: null },
  remoteCatalogue: 'https://oim.dpaw.wa.gov.au/catalogue/api/records?format=json&application__name=sss',
  // overridable defaults for WMTS and WFS loading
  defaultWMTSSrc: 'https://kmi.dpaw.wa.gov.au/geoserver/gwc/service/wmts',
  defaultWFSSrc: 'https://kmi.dpaw.wa.gov.au/geoserver/wfs',
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
  // selected features
  sel: [],
  mmPerInch: 25.4,
  // blank annotations
  annotations: {
    type: "FeatureCollection",
    features: []
  }
}

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
      saved: null
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
    methods: {
      // method to precache SVGs as raster (PNGs)
      // workaround for Firefox missing the SurfaceCache when blitting to canvas
      svgToPNG: function (url) {
        var self = this
        if (self.pngs[url]) {
          return self.pngs[url]
        }
        var canvas = $('<canvas>').get(0)
        var ctx = canvas.getContext('2d')
        var img = new window.Image()
        img.onload = function () {
          canvas.width = img.width
          canvas.height = img.height
          ctx.drawImage(img, 0, 0)
          canvas.toBlob(function (blob) {
            self.pngs[url] = window.URL.createObjectURL(blob)
          }, 'image/png')
        }
        img.src = url
        return url
      }
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

      var stylecache = {}
      var textStyle = new ol.style.Text({
        offsetX: 12,
        textAlign: 'left',
        font: '12px Helvetica,Roboto,Arial,sans-serif',
        stroke: new ol.style.Stroke({
          color: '#fff',
          width: 4
        })
      })
      var initStyle = function (icon) {
        var imageicon = new ol.style.Icon({
          src: self.svgToPNG(icon),
          opacity: 0.9
        })
        var style = new ol.style.Style({
          image: imageicon,
          text: textStyle,
          stroke: new ol.style.Stroke({
            color: [52, 101, 164, 0.6],
            width: 4.0
          })
        })
        stylecache[icon] = style
        return style
      }
      var addResource = function (f) {
        var color = '_red'
        if (f.get('age') < 24) {
          color = '_orange'
        };
        if (f.get('age') < 3) {
          color = '_yellow'
        };
        if (f.get('age') <= 1) {
          color = '_green'
        };
        f.set('icon', 'static/symbols/device/' + f.get('symbolid') + color + '.svg')
        f.set('label', f.get('name') || f.get('callsign') || f.get('rego') || f.get('deviceid'))
        f.set('time', moment(f.get('seen')).toLocaleString())
        // Set a different vue template for rendering
        f.set('partialId', 'resourceInfo')
        // Set id for select tools
        f.set('selectId', f.get('deviceid'))
      }
      var resourceTrackingStyle = function (f, res) {
        var style = stylecache[f.get('icon')] || initStyle(f.get('icon'))
        if (self.pngs[style.getImage().iconImage_.src_]) {
          style = initStyle(f.get('icon'))
        };
        if (res < 0.002) {
          style.getText().setText(f.get('label'))
        } else {
          style.getText().setText('')
        }
        return style
      }

      // pack-in catalogue
      var catalogue = [{
        type: 'WFSLayer',
        name: 'Resource Tracking',
        id: 'dpaw:resource_tracking_live',
        style: resourceTrackingStyle,
        onadd: addResource,
        refresh: 30
      }, {
        type: 'WFSLayer',
        name: 'Resource Tracking History',
        id: 'dpaw:resource_tracking_history',
        style: resourceTrackingStyle,
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
        source: '/hi8/AHI_TKY_FHS',
        params: {
          FORMAT: 'image/png'
        },
        refresh: 300
      }, {
        type: 'TimelineLayer',
        name: 'Himawari-8 True Colour',
        id: 'himawari8:bandtc',
        source: '/hi8/AHI_TKY_b321',
        refresh: 300,
        base: true
      }, {
        type: 'TimelineLayer',
        name: 'Himawari-8 Band 3',
        id: 'himawari8:band3',
        source: '/hi8/AHI_TKY_b3',
        refresh: 300,
        base: true
      }, {
        type: 'TimelineLayer',
        name: 'Himawari-8 Band 7',
        id: 'himawari8:band7',
        source: '/hi8/AHI_TKY_b7',
        refresh: 300,
        base: true
      }, {
        type: 'TimelineLayer',
        name: 'Himawari-8 Band 15',
        id: 'himawari8:band15',
        source: '/hi8/AHI_TKY_b15',
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
      var hotSpotStyle = new ol.style.Style({
        image: new ol.style.Circle({
          fill: new ol.style.Fill({
            color: '#b43232'
          }),
          radius: 8
        })
      })

      var hotSpotDraw = new ol.interaction.Draw({
        type: 'Point',
        features: this.annotations.features,
        style: hotSpotStyle
      })

      var spotFireStyle = new ol.style.Style({
        image: new ol.style.Icon({
          anchor: [0.5, 0.5],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          src: 'static/symbols/svgs/sss/spotfire.svg'
        })
      })

      var spotFireDraw = new ol.interaction.Draw({
        type: 'Point',
        features: this.annotations.features,
        style: spotFireStyle
      })

      var divisionStyle = new ol.style.Style({
        image: new ol.style.Icon({
          anchor: [0.5, 0.5],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          src: 'static/symbols/svgs/sss/division.svg'
        })
      })

      var divisionDraw = new ol.interaction.Draw({
        type: 'Point',
        features: this.annotations.features,
        style: divisionStyle
      })

      var sectorStyle = new ol.style.Style({
        image: new ol.style.Icon({
          anchor: [0.5, 0.5],
          anchorXUnits: 'fraction',
          anchorYUnits: 'fraction',
          src: 'static/symbols/svgs/sss/sector.svg'
        })
      })

      var sectorDraw = new ol.interaction.Draw({
        type: 'Point',
        features: this.annotations.features,
        style: sectorStyle
      })

      var fireLineStyle = new ol.style.Style({
        stroke: new ol.style.Stroke({
          width: 4.0,
          lineDash: [20, 20],
          color: [0, 114, 0, 1.0],
          lineCap: 'square',
          lineJoin: 'bevel'
        })
      })

      var fireLineDraw = new ol.interaction.Draw({
        type: 'LineString',
        features: this.annotations.features,
        style: fireLineStyle
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

      var sssTools = [{
        name: 'Hot Spot',
        icon: 'fa-circle red',
        interactions: [hotSpotDraw],
        style: hotSpotStyle,
        showName: true
      }, {
        name: 'Spot Fire',
        icon: 'static/symbols/svgs/sss/spotfire.svg',
        interactions: [spotFireDraw],
        style: spotFireStyle,
        showName: true
      }, {
        name: 'Division',
        icon: 'static/symbols/svgs/sss/division.svg',
        interactions: [divisionDraw, snapToLines],
        style: divisionStyle,
        showName: true
      }, {
        name: 'Sector',
        icon: 'static/symbols/svgs/sss/sector.svg',
        interactions: [sectorDraw, snapToLines],
        style: sectorStyle,
        showName: true
      }, {
        name: 'Fire Line Constructed',
        icon: 'static/images/iD-sprite.svg#icon-line',
        style: fireLineStyle,
        interactions: [fireLineDraw],
        showName: true
      }, {
        name: 'Fire Boundary',
        icon: 'static/images/iD-sprite.svg#icon-area',
        style: fireBoundaryStyle,
        interactions: [fireBoundaryDraw],
        showName: true
      }]

      sssTools.forEach(function (tool) {
        self.annotations.tools.push(tool)
      })

      var renderTracking = debounce(function () {
        if ((!self.map.getMapLayer(trackingLayer)) || (self.map.getMapLayer(trackingLayer).getSource().getFeatures().length === 0)) {
          return
        }
        self.tracking.extentFeatures = self.map.getMapLayer(trackingLayer).getSource().getFeaturesInExtent(self.export.mapLayout.extent)
        self.tracking.allFeatures = self.map.getMapLayer(trackingLayer).getSource().getFeatures()
      }, 100)

      // load map with default layers
      this.map.init(catalogue, this.store.activeLayers)
      this.catalogue.loadRemoteCatalogue(this.store.remoteCatalogue)
      var trackingLayer = this.catalogue.getLayer('dpaw:resource_tracking_live')

      this.map.olmap.getLayerGroup().on('change', renderTracking)
      this.map.olmap.getView().on('propertychange', renderTracking)
    }
  })
})

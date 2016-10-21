<template>
  <div class="tabs-panel" id="menu-tab-tracking">
    <div class="row collapse">
      <div class="columns">
        <ul class="tabs" data-tabs id="tracking-tabs">
          <li class="tabs-title is-active"><a href="#tracking-list-tab" aria-selected="true">Resource Tracking</a></li>
        </ul>
      </div>
    </div>
    <div class="row collapse" id="tracking-tab-panels">
      <div class="columns">
        <div class="tabs-content vertical" data-tabs-content="tracking-tabs">
          <div id="tracking-list-tab" class="tabs-panel is-active" v-cloak>
            <div class="tool-slice row collapse">
              <div class="small-12">
                <div class="expanded button-group">
                  <a v-for="t in tools | filterIf 'showName' undefined" class="button button-tool" v-bind:class="{'selected': t.name == annotations.tool.name}"
                    @click="annotations.setTool(t)" v-bind:title="t.name">{{{ annotations.icon(t) }}}</a>
                </div>
                <div class="row resetmargin">
                  <div v-for="t in tools | filterIf 'showName' true" class="small-6" v-bind:class="{'rightmargin': $index % 2 === 0}" >
                    <a class="expanded secondary button" v-bind:class="{'selected': t.name == annotations.tool.name}" @click="annotations.setTool(t)"
                      v-bind:title="t.name">{{{ annotations.icon(t) }}} {{ t.name }}</a>
                  </div>
                </div>
              </div>
            </div>
            <div class="row">
              <div class="switch tiny">
                <input class="switch-input" id="resourcesInViewport" type="checkbox" v-model="viewportOnly" />
                <label class="switch-paddle" for="resourcesInViewport">
                  <span class="show-for-sr">Viewport resources only</span>
                </label>
              </div>
              <label for="resourcesInViewport" class="side-label">Restrict to viewport ({{ stats }})</label>
            </div>
            <div class="row">
              <div class="switch tiny">
                <input class="switch-input" id="toggleResourceInfo" type="checkbox" v-bind:checked="$root.active.hoverInfo" @change="$root.active.toggleHoverInfo" />
                <label class="switch-paddle" for="toggleResourceInfo">
                  <span class="show-for-sr">Display hovering resource info</span>
                </label>
              </div>
              <label for="toggleResourceInfo" class="side-label">Display hovering resource info</label>
            </div>
            <div class="row collapse">
              <div class="small-6 columns">
                <select name="select" v-model="cql" @change="updateCQLFilter">
                  <option value="" selected>All resources</option> 
                  <option value="symbolid LIKE '%comms_bus'">Communications Bus</option>
                  <option value="symbolid LIKE '%gang_truck'">Gang Truck</option>
                  <option value="symbolid LIKE '%heavy_duty'">Heavy Duty</option>
                  <option value="(symbolid LIKE '%heavy_duty' OR symbolid LIKE '%gang_truck')">GT and HD</option>
                  <option value="(symbolid LIKE '%dozer' OR symbolid LIKE '%grader' OR symbolid LIKE '%loader')">Machinery</option>
                  <option value="symbolid LIKE '%aircraft'">Aircraft</option>
                </select>
              </div>
              <div class="small-6 columns">
                <input type="search" v-model="search" placeholder="Find a resource" @keyup="updateResourceFilter | debounce 700">
              </div>
            </div>
            <div class="row">
              <div class="small-9">
                <div class="columns">
                  <div class="row">
                    <div class="switch tiny">
                      <input class="switch-input" id="resourceHistory" type="checkbox" v-model="toggleHistory" @change="clearHistory" />
                      <label class="switch-paddle" for="resourceHistory">
                    <span class="show-for-sr">Query history</span>
                  </label>
                    </div>
                    <label for="resourceHistory" class="side-label">Query history</label>
                  </div>
                </div>
                <div class="columns">
                  <div class="row">
                    <div class="switch tiny">
                      <input class="switch-input" id="selectedOnly" type="checkbox" v-model="selectedOnly" @change="updateCQLFilter" />
                      <label class="switch-paddle" for="selectedOnly">
                    <span class="show-for-sr">Show selected only</span>
                 </label>
                    </div>
                    <label for="selectedOnly" class="side-label">Show selected only</label>
                  </div>
                </div>
              </div>
              <div class="small-3">
                <a title="Zoom to selected" class="button float-right" @click="zoomToSelected()"><i class="fa fa-search"></i></a>
                <a title="Download list" class="button" @click="downloadList()" class="float-right"><i class="fa fa-download"></i></a>
              </div>
            </div>
            <div id="history-panel" v-if="toggleHistory">
              <div class="row collapse tool-slice">
                <div class="small-2">
                  <label for="historyFrom">From:</label>
                </div>
                <div class="small-4">
                  <input type="text" v-on:blur="verifyDate($event,['YY-M-D','YYYY-M-D'],'YYYY-MM-DD')" v-model="historyFromDate" placeholder="yyyy-mm-dd"></input>
                </div>
                <div class="small-2">
                  <input type="text" v-on:blur="verifyDate($event,'H:m','HH:mm')" v-model="historyFromTime" placeholder="24:00"></input>
                </div>
                <div class="small-4">
                  <select name="select" v-model="history" @change="historyRange = history">
                  <option value="" selected>Date range</option> 
                  <!-- values in milliseconds -->
                  <option value="3600000">Last hour</option> 
                  <option value="10800000">Last 3 hours</option> 
                  <option value="86400000">Last day</option> 
                  <option value="604800000">Last week</option> 
                  <option value="2678400000">Last month</option> 
                </select>
                </div>
              </div>
              <div class="row collapse tool-slice">
                <div class="small-2">
                  <label for="historyTo">To:</label>
                </div>
                <div class="small-4">
                  <input type="text" v-on:blur="verifyDate($event,['YY-M-D','YYYY-M-D'],'YYYY-MM-DD')" v-model="historyToDate" placeholder="yyyy-mm-dd"></input>
                </div>
                <div class="small-2">
                  <input type="text" v-on:blur="verifyDate($event,'H:m','HH:mm')" v-model="historyToTime" placeholder="24:00"></input>
                </div>
                <div class="small-2"></div>
                <div class="small-2">
                  <button v-bind:disabled="queryHistoryDisabled" class="button" style="float: right" @click="historyCQLFilter">Go</button>
                </div>
              </div>
            </div>
            <div id="tracking-list">
              <div v-for="f in features" class="row feature-row" v-bind:class="{'feature-selected': selected(f) }"
                @click="toggleSelect(f)" track-by="get('id')">
                <div class="columns">
                  <a @click.stop.prevent="map.editResource($event)" title="Edit resource" href="{{sssService}}/sss_admin/tracking/device/{{ f.get('id') }}/change/" target="_blank" class="button tiny secondary float-right"><i class="fa fa-pencil"></i></a>
                  <div class="feature-title"><img class="feature-icon" id="device-icon-{{f.get('id')}}" v-bind:src="featureIconSrc(f)" /> {{ f.get('label') }} <i><small>({{ ago(f.get('seen')) }})</small></i></div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
  import { ol, moment } from 'src/vendor.js'
  export default {
    store: ['sssService'],
    data: function () {
      var fill = '#ff6600'
      var stroke = '#7c3100'
      return {
        viewportOnly: true,
        toggleHistory: false,
        selectedOnly: false,
        search: '',
        cql: '',
        tools: [],
        history: '',
        fields: ['id', 'name', 'callsign', 'deviceid', 'symbol', 'district'],
        allFeatures: [],
        extentFeatures: [],
        selectedDevices: [],
        historyFromDate: '',
        historyFromTime: '',
        historyToDate: '',
        historyToTime: '',
        historyRangeMilliseconds: 0,
        loadedIcons:0,
        tints: {
          'red': [[fill,'#ed2727'], [stroke,'#480000']],
          'orange': [[fill,'#ff6600'], [stroke,'#562200']],
          'yellow': [[fill,'#ffd700'], [stroke,'#413104']],
          'green': [[fill,'#71c837'], [stroke,'#1b310d']],
          'selected': [['#000000', '#2199e8'], [stroke,'#2199e8'], [fill, '#ffffff']],
        },
      }
    },
    computed: {
      map: function () { return this.$root.$refs.app.$refs.map },
      annotations: function () { return this.$root.$refs.app.$refs.annotations },
      loading: function () { return this.$root.loading },
      features: function () {
        if (this.viewportOnly) {
          return this.extentFeatures
        } else {
          return this.allFeatures
        }
      },
      selectedFeatures: function () {
        return this.features.filter(this.selected)
      },
      stats: function () {
        return Object.keys(this.extentFeatures).length + '/' + Object.keys(this.allFeatures).length
      },
      queryHistoryDisabled: function() {
        return !(this.selectedFeatures && this.selectedFeatures.length && this.historyFromDate && this.historyFromTime && this.historyToDate && this.historyToTime)
      },
      historyRange: {
        get: function () {
          return this.historyRangeMilliseconds
        },
        set: function (val) {
          this.historyRangeMilliseconds = val
          var currentDate = moment()
          this.historyToDate = currentDate.format('YYYY-MM-DD')
          this.historyToTime = currentDate.format('HH:mm')
          var fromDate = currentDate.subtract(val, 'milliseconds')
          this.historyFromDate = fromDate.format('YYYY-MM-DD')
          this.historyFromTime = fromDate.format('HH:mm')
        }
      },
      trackingLayer: function() {
        return this.$root.catalogue.getLayer('dpaw:resource_tracking_live')
      },
      trackingMapLayer: function() {
        return this.$root.map.getMapLayer(this.trackingLayer)
      },
      historyLayer: function() {
        return this.$root.catalogue.getLayer('dpaw:resource_tracking_history')
      }
    },
    methods: {
      verifyDate: function(event,inputPattern,pattern) {
        var element = event.target;
        element.value = element.value.trim()
        if (element.value.length > 0) {
            var m = moment(element.value,inputPattern,true)
            if (!m.isValid()) {
                setTimeout(function() {
                    element.focus()
                },10);
            } else {
                element.value = m.format(pattern)
            }
        }
      },
      ago: function (time) {
        var now = moment()
        if (now.diff(moment(time), 'days') == 1) {
            return now.diff(moment(time), 'days') + ' day'
        } else if ((now.diff(moment(time), 'days') > 1)) {
            return now.diff(moment(time), 'days') + ' days'
        } else if ((now.diff(moment(time), 'hours') == 1)) {
            return now.diff(moment(time), 'hours') + ' hr'
        } else if ((now.diff(moment(time), 'hours') > 1)) {
            return now.diff(moment(time), 'hours') + ' hrs'
        } else if ((now.diff(moment(time), 'minutes') == 1)) {
            return now.diff(moment(time), 'minutes') + ' min'
        } else if ((now.diff(moment(time), 'minutes') < 1)) {
            return '<1 min'
        } else {
            return now.diff(moment(time), 'minutes') + ' mins'
        }
      },
      toggleSelect: function (f) {
        if (this.selected(f)) {
          this.$root.annotations.selectedFeatures.remove(f)
        } else {
          this.$root.annotations.selectedFeatures.push(f)
        }
      },
      featureIconSrc:function(f) {
        var vm = this
        //trigger dynamic binding
        var tmp = vm.selectedDevices
        tmp = this.loadedIcons
        return this.map.getBlob(f, ['icon', 'tint'],this.tints,function(){
            $("#device-icon-" + f.get('id')).attr("src", vm.featureIconSrc(f))
        })
      },
      selected: function (f) {
        return f.get('deviceid') && (this.selectedDevices.indexOf(f.get('deviceid')) > -1)
      },
      downloadList: function () {
        this.$root.export.exportVector(this.features.filter(this.resourceFilter).sort(this.resourceOrder), 'trackingdata')
      },
      clearHistory: function () {
          var historyLayer = this.historyLayer
          if (!this.toggleHistory) {
              historyLayer.cql_filter = "clearhistorylayer"
              this.$root.catalogue.onLayerChange(historyLayer, false)
          }
      },
      updateCQLFilter: function () {
        var vm = this
        var groupFilter = this.cql
        var deviceFilter = ''
        // filter by specific devices if "Show selected only" is enabled
        if ((this.selectedDevices.length > 0) && (this.selectedOnly)) {
          deviceFilter = 'deviceid in (' + this.selectedDevices.join(',') + ')'
        }
        // CQL statement assembling logic
        if (groupFilter && deviceFilter) {
          this.trackingLayer.cql_filter = '(' + groupFilter + ') and (' + deviceFilter + ')'
        } else if (deviceFilter) {
          this.trackingLayer.cql_filter = deviceFilter
        } else {
          this.trackingLayer.cql_filter = groupFilter
        }
        this.trackingMapLayer.set('updated', moment().toLocaleString())
        this.trackingMapLayer.getSource().loadSource("query")
      },
      updateResourceFilter: function () {
        var mapLayer = this.trackingMapLayer
        // update vue list for filtered features in the current extent
        this.extentFeatures = mapLayer.getSource().getFeaturesInExtent(this.$root.export.mapLayout.extent).filter(this.resourceFilter)
        this.extentFeatures.sort(this.resourceOrder)
        // update vue list for filtered features
        this.allFeatures = mapLayer.getSource().getFeatures().filter(this.resourceFilter)
        this.allFeatures.sort(this.resourceOrder)
      },
      historyCQLFilter: function () {
        var vm = this
        var historyLayer = this.historyLayer
        var deviceFilter = 'deviceid in (' + this.selectedDevices.join(',') + ')'
        historyLayer.cql_filter = deviceFilter + "and seen between '" + this.historyFromDate + ' ' + this.historyFromTime + ":00' and '" + this.historyToDate + ' ' + this.historyToTime + ":00'"
        this.$root.catalogue.onLayerChange(historyLayer, true)
        var source = this.$root.map.getMapLayer(historyLayer).getSource()
        source.loadSource("query",function () {
          // callback to draw the line trail after the points information is loaded
          var devices = {}
          // group by device
          source.getFeatures().forEach(function (feature) {
            var props = feature.getProperties()
            if (!(props.name in devices)) {
              devices[props.name] = []
            }
            devices[props.name].push(feature)
          })
          Object.keys(devices).forEach(function (device) {
            // sort by timestamp
            devices[device].sort(vm.resourceOrder)
            // pull the coordinates
            var coords = devices[device].map(function (point) {
              point.set('label', moment(point.get('seen')).format('MMM DD HH:mm')) 
              return point.getGeometry().getCoordinates()
            })
            // create a new linestring
            var feature = new ol.Feature({
              name: device + ' path',
              geometry: new ol.geom.LineString(coords)
            })
            source.addFeature(feature)
          })
        })
      },
      resourceFilter: function (f) {
        var search = ('' + this.search).toLowerCase()
        var found = !search || this.fields.some(function (key) {
          return ('' + f.get(key)).toLowerCase().indexOf(search) > -1
        })
        if (this.selectedOnly) {
          return this.selected(f) && found
        };
        return found
      },
      resourceOrder: function (a, b) {
        var as = a.get('seen')
        var bs = b.get('seen')
        if (as < bs) {
          return 1
        } else if (as > bs) {
          return -1
        }
        return 0
      },
      zoomToSelected: function () {
        var extent = ol.extent.createEmpty()
        this.selectedFeatures.forEach(function (f) {
          ol.extent.extend(extent, f.getGeometry().getExtent())
        })
        var map = this.$root.map.olmap
        map.getView().fit(extent, map.getSize())
      },
      updateTracking: function() {
        var vm = this
        // syncing of Resource Tracking features between Vue state and OL source
        var mapLayer = this.trackingMapLayer
        if (!mapLayer) { return }
        var feats = mapLayer.getSource().getFeatures()
        // update the contents of the selectedFeatures group
        if (vm.$root.annotations.selectable && vm.$root.annotations.selectable.length == 1 && vm.$root.annotations.selectable[0] == vm.trackingMapLayer) {
            var deviceIds = this.selectedDevices.slice()
            this.$root.annotations.selectedFeatures.clear()
            feats.filter(function(el, index, arr) {
              var id = el.get('deviceid')
              if (!id) return false
              if (deviceIds.indexOf(id) < 0) return false
              return true
            }).forEach(function (el) {
              vm.$root.annotations.selectedFeatures.push(el)
            })
        }

        // update vue list for filtered features in the current extent
        this.extentFeatures = mapLayer.getSource().getFeaturesInExtent(this.$root.export.mapLayout.extent).filter(this.resourceFilter)
        this.extentFeatures.sort(this.resourceOrder)
        // update vue list for filtered features
        this.allFeatures = feats.filter(this.resourceFilter)
        this.allFeatures.sort(this.resourceOrder)
      },
      init: function() {
        // enable resource tracking layer, if disabled
        var catalogue = this.$root.catalogue
        if (!this.trackingMapLayer) {
          catalogue.onLayerChange(this.trackingLayer, true)
        }

        this.$root.annotations.selectable = [this.trackingMapLayer]
        this.$root.annotations.setTool('Select')
        this.$root.tracking.updateCQLFilter()
      }
    },
    ready: function () {
      var vm = this
      var trackingStatus = this.loading.register("tracking","Resource Tracking Component","Initialize")
      var map = this.$root.map

      var resourceTrackingStyle = function (res) {
        var feat = this
        // cache styles for performance
        var style = vm.map.cacheStyle(function (feat) {
          var src = vm.map.getBlob(feat, ['icon', 'tint'],vm.tints)
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
        if (f.get('district') == null){
            f.set('label', f.get('callsign') +' '+ f.get('name'))
        } else {
            f.set('label', f.get('district') +' '+ f.get('callsign') +' '+ f.get('name'))
        }
        f.set('time', moment(f.get('seen')).toLocaleString())
        // Set a different vue template for rendering
        f.set('partialId', 'resourceInfo')
        // Set id for select tools
        f.set('selectId', f.get('deviceid'))
        f.setStyle(resourceTrackingStyle)
      }

      var getFeatureInfo = function (f) {
        return '<div class="feature-title"><img class="feature-icon" src="' + map.getBlob(f, ['icon', 'tint']) + '" /> ' + f.get("label") + ' <i><small>seen ' +  moment(f.get("seen")).fromNow() + '</small></i></div>'
      }

      this.$root.fixedLayers.push({
        type: 'WFSLayer',
        name: 'Resource Tracking',
        id: 'dpaw:resource_tracking_live',
        onadd: addResource,
        getFeatureInfo:getFeatureInfo,
        refresh: 60
      }, {
        type: 'WFSLayer',
        name: 'Resource Tracking History',
        id: 'dpaw:resource_tracking_history',
        onadd: addResource,
        cql_filter: false
      })

      trackingStatus.wait(40,"Listen 'gk-init' event")
      // post init event hookup
      this.$on('gk-init', function () {
        trackingStatus.progress(80,"Process 'gk-init' event")
        var viewChanged = global.debounce(function () {
          vm.updateTracking()
        }, 100)
        map.olmap.getView().on('propertychange', viewChanged)
        viewChanged()

        var layersAdded = global.debounce(function () {
          var mapLayer = vm.trackingMapLayer
          if (!mapLayer) { return }
          if (!mapLayer.get('tracking')) {
            mapLayer.set('tracking', mapLayer.getSource().on('loadsource', viewChanged))
          }
        }, 100)
        map.olmap.getLayerGroup().on('change', layersAdded)
        layersAdded()

        this.$root.annotations.selectedFeatures.on('add', function (event) {
          if (event.element.get('deviceid')) {
            vm.selectedDevices.push(event.element.get('deviceid'))
          }
        })
        this.$root.annotations.selectedFeatures.on('remove', function (event) {
          if (event.element.get('deviceid')) {
            vm.selectedDevices.$remove(event.element.get('deviceid'))
          }
        })
        vm.tools = vm.annotations.tools.filter(function (t) {
          return t.scope && t.scope.indexOf("resourcetracking") >= 0
        })
        trackingStatus.end()
      })
    }
  }
</script>

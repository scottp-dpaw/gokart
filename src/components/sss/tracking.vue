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
            <div class="row">
              <div class="switch tiny">
                <input class="switch-input" id="resourcesInViewport" type="checkbox" v-model="viewportOnly" />
                <label class="switch-paddle" for="resourcesInViewport">
                <span class="show-for-sr">Viewport resources only</span>
              </label>
              </div>
              <label for="resourcesInViewport" class="side-label">Restrict to viewport ({{ stats }})</label>
            </div>
            <div class="row collapse">
              <div class="small-6 columns">
                <select name="select" v-model="cql" @change="updateCQLFilter">
                  <option value="" selected>All resources</option> 
                  <option value="symbolid LIKE '%comms_bus'">Communications Bus</option>
                  <option value="symbolid LIKE '%gang_truck'">Gang Truck</option>
                  <option value="symbolid LIKE '%heavy_duty'">Heavy Duty</option>
                  <option value="(symbolid LIKE '%heavy_duty' OR symbolid LIKE '%gang_truck')">GT and HD</option>
                  <option value="symbolid LIKE '%aircraft'">Aircraft</option>
                </select>
              </div>
              <div class="small-6 columns">
                <input type="search" v-model="search" placeholder="Find a resource">
              </div>
            </div>
            <div class="row">
              <div class="small-9">
                <div class="columns">
                  <div class="row">
                    <div class="switch tiny">
                      <input class="switch-input" id="resourceHistory" type="checkbox" v-model="toggleHistory" />
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
                  <input type="text" v-model="historyFromDate" placeholder="yyyy-mm-dd"></input>
                </div>
                <div class="small-2">
                  <input type="text" v-model="historyFromTime" placeholder="24:00"></input>
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
                  <input type="text" v-model="historyToDate" placeholder="yyyy-mm-dd"></input>
                </div>
                <div class="small-2">
                  <input type="text" v-model="historyToTime" placeholder="24:00"></input>
                </div>
                <div class="small-2"></div>
                <div class="small-2">
                  <button class="button" style="float: right" @click="historyCQLFilter">Go</button>
                </div>
              </div>
            </div>
            <div id="tracking-list">
              <div v-for="f in features" class="row feature-row" v-bind:class="{'device-selected': selected(f) }"
                @click="toggleSelect(f)" track-by="get('id')">
                <div class="columns">
                  <a @click.stop href="https://sss.dpaw.wa.gov.au/admin/tracking/device/{{ f.get('id') }}/change/" target="_blank" class="button small secondary float-right"><i class="fa fa-pencil"></i></a>
                  <div class="feature-title"><img class="feature-icon" v-bind:src="$root.$refs.app.getBlob(f, ['icon', 'tint'])" /> {{ f.get('label') }} <i><small>seen {{ ago(f.get('seen')) }}</small></i></div>
                  <small>{{ f.get('time') }}</small>
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
    data: function () {
      return {
        viewportOnly: true,
        toggleHistory: false,
        selectedOnly: false,
        search: '',
        cql: '',
        history: '',
        fields: ['id', 'name', 'callsign', 'make', 'model', 'rego', 'category', 'deviceid', 'symbol'],
        allFeatures: [],
        extentFeatures: [],
        selectedDevices: [],
        historyFromDate: '',
        historyFromTime: '',
        historyToDate: '',
        historyToTime: '',
        historyRangeMilliseconds: 0
      }
    },
    computed: {
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
      }
    },
    methods: {
      ago: function (time) {
        return moment(time).fromNow()
      },
      toggleSelect: function (f) {
        if (this.selected(f)) {
          this.$root.annotations.selectedFeatures.remove(f)
        } else {
          this.$root.annotations.selectedFeatures.push(f)
        }
      },
      selected: function (f) {
        return f.get('deviceid') && (this.selectedDevices.indexOf(f.get('deviceid')) > -1)
      },
      downloadList: function () {
        this.$root.export.exportVector(this.features.filter(this.resourceFilter).sort(this.resourceOrder), 'trackingdata')
      },
      updateCQLFilter: function () {
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
        this.trackingMapLayer.getSource().loadSource()
      },
      historyCQLFilter: function () {
        var vm = this
        var historyLayer = this.$root.catalogue.getLayer('dpaw:resource_tracking_history')
        var deviceFilter = 'deviceid in (' + this.selectedDevices.join(',') + ')'
        historyLayer.cql_filter = deviceFilter + "and seen between '" + this.historyFromDate + ' ' + this.historyFromTime + ":00' and '" + this.historyToDate + ' ' + this.historyToTime + ":00'"
        this.$root.catalogue.onLayerChange(historyLayer, true)
        var source = this.$root.map.getMapLayer(historyLayer).getSource()
        source.loadSource(function () {
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
      init: function() {
        this.$root.annotations.selectable = [this.trackingMapLayer]
        this.$root.annotations.setTool('Select')
      }
    },
    ready: function () {
      var vm = this
      var map = this.$root.map
      // post init event hookup
      this.$on('gk-init', function () {
        var trackingLayer = this.$root.catalogue.getLayer('dpaw:resource_tracking_live')

        // syncing of Resource Tracking features between Vue state and OL source
        var renderTracking = global.debounce(function () {
          if (!map.getMapLayer(trackingLayer)) { return }
          vm.extentFeatures = map.getMapLayer(trackingLayer).getSource().getFeaturesInExtent(vm.$root.export.mapLayout.extent).filter(vm.resourceFilter)
          vm.extentFeatures.sort(vm.resourceOrder)
          vm.allFeatures = map.getMapLayer(trackingLayer).getSource().getFeatures().filter(vm.resourceFilter)
          vm.allFeatures.sort(vm.resourceOrder)
          //console.log('update features')
        }, 100)

        map.olmap.getLayerGroup().on('change', renderTracking)
        map.olmap.getView().on('propertychange', renderTracking)
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
      })
    }
  }
</script>

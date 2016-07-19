<template>
  <div class="tabs-panel" id="menu-tab-tracking">
    <div class="row collapse">
      <div class="columns">
        <ul class="tabs" data-tabs id="tracking-tabs">
          <li class="tabs-title is-active"><a href="#tracking-list-tab" aria-selected="true">Resource Tracking</a></li>
          <li class="tabs-title"><a href="#tracking-groups-tab" aria-selected="true">Device Groups</a></li>
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
              <div class="small-10">
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
              <div class="small-2">
                <a class="button" @click="zoomToSelected()" style="float: right"><i class="fa fa-search"></i></a>
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
              <div v-for="f in features | filterBy resourceFilter | orderBy resourceOrder" class="row feature-row" v-bind:class="{'device-selected': selected(f) }"
                @click="select(f)">
                <div class="columns">
                  <div class="feature-title"><img v-bind:src="f.get('icon')" /> {{ f.get('label') }} <small>({{ f.get('deviceid') }})</small></div>
                  <small>{{ f.get('time') }}</small>
                </div>
              </div>
            </div>

          </div>
          <div id="tracking-groups-tab" class="tabs-panel">
            Group search shortcuts here
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
<script>
  import { moment } from 'src/vendor.js'
  import ol from '../../ol-extras.js'
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
      }
    },
    methods: {
      select: function (f) {
        this.$root.info.select(f)
      },
      selected: function (f) {
        return this.$root.info.selected(f)
      },
      updateCQLFilter: function () {
        var trackingLayer = this.$root.catalogue.getLayer('dpaw:resource_tracking_live')
        var groupFilter = this.cql
        var deviceFilter = ''
        // filter by specific devices if "Show selected only" is enabled
        if ((this.$root.info.sel.length > 0) && (this.selectedOnly)) {
          deviceFilter = 'deviceid in (' + this.$root.info.sel.join(',') + ')'
        }
        // CQL statement assembling logic
        if (groupFilter && deviceFilter) {
          trackingLayer.cql_filter = '(' + groupFilter + ') and (' + deviceFilter + ')'
        } else if (deviceFilter) {
          trackingLayer.cql_filter = deviceFilter
        } else {
          trackingLayer.cql_filter = groupFilter
        }
        this.$root.map.getMapLayer(trackingLayer).getSource().loadSource()
      },
      historyCQLFilter: function () {
        var historyLayer = this.$root.catalogue.getLayer('dpaw:resource_tracking_history')
        historyLayer.cql_filter = 'deviceid in (' + this.$root.info.sel.join(',') + ") and seen between '" + this.historyFromDate + ' ' + this.historyFromTime + ":00' and '" + this.historyToDate + ' ' + this.historyToTime + ":00'"
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
            devices[device].sort(function (a, b) {
              var as = a.get('seen')
              var bs = b.get('seen')
              if (as < bs) {
                return -1
              } else if (as > bs) {
                return 1
              }
              return 0
            })
            // pull the coordinates
            var coords = devices[device].map(function (point) {
              return point.getGeometry().getCoordinates()
            })
            // create a new linestring
            var feature = new ol.Feature({
              name: device+' path',
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
      resourceOrder: function (f1, f2) {
        return f1.get('age') > f2.get('age')
      },
      zoomToSelected: function () {
        var extent = ol.extent.createEmpty()
        this.selectedFeatures.forEach(function (f) {
          ol.extent.extend(extent, f.getGeometry().getExtent())
        })
        var map = this.$root.map.olmap
        map.getView().fit(extent, map.getSize())
      }
    }
  }
</script>

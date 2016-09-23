<template>
  <div class="tabs-panel" id="menu-tab-bfrs">
    <div class="row collapse">
      <div class="columns">
        <ul class="tabs" data-tabs id="tracking-tabs">
          <li class="tabs-title is-active"><a href="#bushfire-report-list-tab" aria-selected="true">Bushfire Report</a></li>
        </ul>
      </div>
    </div>
    <div class="row collapse" id="bushfire-report-tab-panels">
      <div class="columns">
        <div class="tabs-content vertical" data-tabs-content="tracking-tabs">
          <div id="bushfire-report-list-tab" class="tabs-panel is-active" v-cloak>
            <div class="row">
              <div class="switch tiny">
                <input class="switch-input" id="bushfireReportsInViewport" type="checkbox" v-model="viewportOnly" />
                <label class="switch-paddle" for="bushfireReportsInViewport">
                <span class="show-for-sr">Viewport resources only</span>
              </label>
              </div>
              <label for="bushfireReportsInViewport" class="side-label">Restrict to viewport ({{ stats }})</label>
            </div>
            <div class="row collapse">
              <div class="small-6 columns">
                <select name="select" v-model="cql" @change="updateCQLFilter">
                  <option value="" selected>All Reports</option> 
                </select>
              </div>
              <div class="small-6 columns">
                <input type="search" v-model="search" placeholder="Find a report" @keyup="updateCQLFilter | debounce 700">
              </div>
            </div>
            <div class="row">
                <div class="small-2">
                  <label for="bushfireReportFrom">From:</label>
                </div>
                <div class="small-5">
                  <input type="text" v-on:blur="verifyDate($event,['YY-M-D','YYYY-M-D'],'YYYY-MM-DD')" v-model="reportFromDate" placeholder="yyyy-mm-dd"></input>
                </div>
                <div class="small-5">
                  <select name="select" v-model="range" @change="reportRange = range">
                  <option value="" selected>Date range</option> 
                  <!-- values in milliseconds -->
                  <option value="1">Last day</option> 
                  <option value="7">Last week</option> 
                  <option value="30">Last month</option> 
                </select>
              </div>

              <div class="small-2">
                <label for="bushfireReportTo">To:</label>
              </div>
              <div class="small-5">
                <input type="text" v-on:blur="verifyDate($event,['YY-M-D','YYYY-M-D'],'YYYY-MM-DD')" v-model="reportToDate" placeholder="yyyy-mm-dd"></input>
              </div>
              <div class="small-2">
              </div>
              <div class="small-3">
                  <a title="Zoom to selected" class="button float-right" @click="zoomToSelected()"><i class="fa fa-search"></i></a>
                  <a title="Download list" class="button" @click="downloadList()" class="float-right"><i class="fa fa-download"></i></a>
              </div>
            </div>

            <div id="bushfire-report-list">
              <div v-for="f in features" class="row feature-row" v-bind:class="{'report-selected': selected(f) }"
                @click="toggleSelect(f)" track-by="get('prk_id')">
                <div class="columns">
                  <a @click.stop.prevent="edit" href="{{bfrsService}}/sss_admin/tracking/device/{{ f.get('id') }}/change/" target="_blank" class="button tiny secondary float-right"><i class="fa fa-pencil"></i></a>
                  <div class="feature-title"><img class="feature-icon" v-bind:src="map.getBlob(f, ['icon', 'tint'])" /> {{ f.get('label') }} <i><small></small></i></div>
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
    store: ['bfrsService'],
    data: function () {
      return {
        viewportOnly: true,
        selectedOnly: false,
        search: '',
        cql: '',
        fields: ['id', 'name'],
        allFeatures: [],
        extentFeatures: [],
        selectedReports: [],
        reportFromDate: '',
        reportToDate: '',
        range:'',
        reportRangeDays: 0,
        tints: {
          'draft': [['#b43232','#ff6600']],
          'final': [['#b43232','#71c837']],
          'selected': [['#b43232', '#2199e8']],
          },
      }
    },
    computed: {
      map: function () { return this.$root.$refs.app.$refs.map },
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
      reportRange: {
        get: function () {
          return this.reportRangeDays
        },
        set: function (val) {
          this.reportRangeDays = val
          var currentDate = moment()
          this.reportToDate = currentDate.format('YYYY-MM-DD')
          var fromDate = currentDate.subtract(val, 'days')
          this.reportFromDate = fromDate.format('YYYY-MM-DD')
        }
      },
      reportLayer: function() {
        return this.$root.catalogue.getLayer('dpaw:ratis_rtv_web_parks')
      },
      reportMapLayer: function() {
        return this.$root.map.getMapLayer(this.reportLayer)
      },
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
      edit: function(event) {
            var target = (event.target.nodeName == "A")?event.target:event.target.parentNode;
            if (env.appType == "cordova") {
                window.open(target.href,"_system");
            } else {
                window.open(target.href,target.target);
            }
      },
      toggleSelect: function (f) {
        if (this.selected(f)) {
          this.$root.annotations.selectedFeatures.remove(f)
        } else {
          this.$root.annotations.selectedFeatures.push(f)
        }
      },
      selected: function (f) {
        return f.get(this.reportKey) && (this.selectedReports.indexOf(f.get(this.reportKey)) > -1)
      },
      downloadList: function () {
        this.$root.export.exportVector(this.features.filter(this.resourceFilter).sort(this.resourceOrder), 'bushfirereport')
      },
      updateCQLFilter: function () {
        var vm = this
        var filters = []
        if(this.cql.trim()) {filter.push(this.cql.trim())}
        var reportFilter = ''
        // filter by specific reports if "Show selected only" is enabled
        if ((this.selectedReports.length > 0) && (this.selectedOnly)) {
          filters.push( this.reportKey + ' in (' + this.selectedReports.join(',') + ')')
        }
        if (this.reportFromDate && this.reportToDate) {
            filters.push( "seen between '" + this.reportFromDate + ' ' + "00:00:00' and '" + this.reportToDate + ' ' + "23:59:00'")
        }

        // CQL statement assembling logic
        if (filters.length == 0) {
          this.reportLayer.cql_filter = ""
        } else if(filters.length == 1) {
          this.reportLayer.cql_filter = filters[0]
        } else {
          this.reportLayer.cql_filter = "(" + filters.join(") and (") + ")"
        }
    
        this.reportMapLayer.set('updated', moment().toLocaleString())
        this.reportMapLayer.getSource().loadSource()
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
      zoomToSelected: function () {
        var extent = ol.extent.createEmpty()
        this.selectedFeatures.forEach(function (f) {
          ol.extent.extend(extent, f.getGeometry().getExtent())
        })
        var map = this.$root.map.olmap
        map.getView().fit(extent, map.getSize())
      },
      updateReport: function() {
        var vm = this
        // syncing of Resource Tracking features between Vue state and OL source
        var mapLayer = this.reportMapLayer
        if (!mapLayer) { return }
        var feats = mapLayer.getSource().getFeatures()
        // update the contents of the selectedFeatures group
        if (vm.$root.annotations.selectable && vm.$root.annotations.selectable.length == 1 && vm.$root.annotations.selectable[0] == vm.reportMapLayer) {
            var reportIds = this.selectedReports.slice()
            this.$root.annotations.selectedFeatures.clear()
            feats.filter(function(el, index, arr) {
              var id = el.get(vm.reportkey)
              if (!id) return false
              if (reportIds.indexOf(id) < 0) return false
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
        if (!this.reportMapLayer) {
          catalogue.onLayerChange(this.reportLayer, true)
        }

        this.selectable = [this.reportMapLayer]
        this.$root.annotations.selectable = this.selectable
        this.$root.annotations.setTool('Select')
        this.updateCQLFilter()
      }
    },
    ready: function () {
      var vm = this
      var map = this.$root.map
      this.reportKey = "prk_id"

      var addReport = function (f) {
        var tint = 'draft'
        if (f.get(vm.reportKey) % 2 == 0) {
            tint = 'draft'
        } else {
            tint = 'final'
        }
        f.set('tint', tint)
        f.set('baseTint', tint)
        f.set('label', f.get('name'))
        f.set('icon','dist/static/symbols/fire/origin.svg')
        f.set('selectId', f.get(vm.reportKey))
        f.setStyle(reportStyle)
      }

      var reportStyle = function(res) {
        
        var feat = this
        var style = vm.map.cacheStyle(function (feat) {
          var src = vm.map.getBlob(feat, ['icon', 'tint'],vm.tints)
          if (!src) { return false }
          return new ol.style.Style({
            image: new ol.style.Icon({
              src: src,
              scale: 0.5
            })
          })
        }, feat, ['icon', 'tint'])
        return style
      }

      this.$root.fixedLayers.push({
        type: 'WFSLayer',
        name: 'Bushfire Report',
        id: 'dpaw:ratis_rtv_web_parks',
        onadd: addReport,
        cql_filter: false
      })
      // post init event hookup
      this.$on('gk-init', function () {
        var viewChanged = global.debounce(function () {
          vm.updateReport()
        }, 100)
        map.olmap.getView().on('propertychange', viewChanged)

        var layersAdded = global.debounce(function () {
          var mapLayer = vm.reportMapLayer
          if (!mapLayer) { return }
          if (!mapLayer.get('tracking')) {
            mapLayer.set('tracking', mapLayer.getSource().on('loadsource', viewChanged))
          }
        }, 100)
        map.olmap.getLayerGroup().on('change', layersAdded)
        layersAdded()

        this.$root.annotations.selectedFeatures.on('add', function (event) {
          if (vm.$root.annotations.selectable === vm.selectable) {
            vm.selectedReports.push(event.element.get(vm.reportKey))
          }
        })
        this.$root.annotations.selectedFeatures.on('remove', function (event) {
          if (vm.$root.annotations.selectable === vm.selectable) {
            vm.selectedReports.$remove(event.element.get(vm.reportKey))
          }
        })
      })
    }
  }
</script>

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
            <div class="tool-slice row collapse">
              <div class="small-12">
                <div class="expanded button-group">
                  <a v-for="t in tools | filterIf 'showName' undefined" class="button button-tool" v-bind:class="{'selected': t.name == annotations.tool.name}"
                    @click="annotations.setTool(t)" v-bind:title="t.name">{{{ annotations.icon(t) }}}</a>
                </div>
                <div class="row resetmargin">
                  <div class="small-6 rightmargin">
                    <a v-for="t in tools | filterIf 'showName' true" v-if="$index % 2 === 0" class="expanded secondary button" v-bind:class="{'selected': t.name == annotations.tool.name}" @click="annotations.setTool(t)"
                      v-bind:title="t.name">{{{ annotations.icon(t) }}} {{ t.name }}</a>
                  </div>
                  <div class="small-6">
                    <a v-for="t in tools | filterIf 'showName' true" v-if="$index % 2 === 1" class="expanded secondary button" v-bind:class="{'selected': t.name == annotations.tool.name}" @click="annotations.setTool(t)"
                      v-bind:title="t.name">{{{ annotations.icon(t) }}} {{ t.name }}</a>
                  </div>
                </div>
              </div>
            </div>
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
                <select name="select" v-model="cql" >
                  <option value="" selected>All Reports</option> 
                </select>
              </div>
              <div class="small-6 columns">
                <input type="search" v-model="search" placeholder="Find a report" @keyup="updateResourceFilter | debounce 700">
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
              <div class="small-5">
                  <div class="float-right">
                      <a class="button" @click="updateCQLFilter" >Go</a>
                      <a title="Download list" class="button" @click="downloadList()" ><i class="fa fa-download"></i></a>
                      <a title="Zoom to selected" class="button" @click="zoomToSelected()"><i class="fa fa-search"></i></a>
                  </div>
              </div>
            </div>

            <div id="bushfire-report-list">
              <div v-for="f in features" class="row feature-row" v-bind:class="{'feature-selected': selected(f) }" 
                @click="toggleSelect(f)" track-by="get('prk_id')">
                <div class="columns">
                  <span class="feature-title"><img class="feature-icon" id="report-icon-{{f.get(reportKey)}}" v-bind:Src="featureIconSrc(f)" /> {{ f.get('label') }} <i><small></small></i></span>
                  <span class="float-right">
                      <a @click.stop.prevent="map.editResource($event)" v-if="isModified(f)" class="button tiny secondary" href="{{editUrl(f)}}" target="_blank">
                        <i class="fa fa-save"></i>
                      </a>
                      <a @click.stop.prevent="map.editResource($event)" href="{{editUrl(f)}}" target="_blank" class="button tiny secondary"><i class="fa {{editIcon(f)}}"></i></a>
                  </span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  </div>
  <div id="bushfireReportEditOverlay" >
    <a v-if="isModified()" @click.stop.prevent="map.editResource($event)" class="button tiny secondary" href="{{editUrl()}}" target="_blank">
        <i class="fa fa-save"></i>
    </a>
    <a @click.stop.prevent="map.editResource($event)" class="button tiny secondary" href="{{editUrl()}}" target="_blank">
        <i class="fa {{editIcon()}}"></i>
    </a>
  </div>
</template>
<script>
  import { ol, moment,$ } from 'src/vendor.js'
  export default {
    store: ['bfrsService'],
    data: function () {
      return {
        viewportOnly: true,
        search: '',
        cql: '',
        tools: [],
        fields: ['prk_id', 'name'],
        allFeatures: [],
        extentFeatures: [],
        selectedReports: [],
        editableFeatures: new ol.Collection(),
        droppinFeatures:new ol.Collection(),
        modifiedFeatures:[],
        reportFromDate: '',
        reportToDate: '',
        editRevision:0,
        range:'',
        reportRangeDays: 0,
        tints: {
          'draft': [['#ff4444','#008000']],
          'modified': [['#ff4444', '#8a2be2']],
          'selected': [['#ff4444', '#2199e8']],
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
      editingFeature:function() {
        if (this.annotations.tool === this.droppinTool) {
            return (this.droppinFeatures.getLength() > 0)?this.droppinFeatures.item(0):null
        } else if(this.annotations.tool === this.editTool) {
            return (this.annotations.selectedFeatures.getLength() > 0)?this.annotations.selectedFeatures.item(0):null
        } else {
            return null
        }
      },
      editingFeaturePosition:function() {
        var feat = this.editingFeature
        return (feat)?feat.getGeometry().getLastCoordinate():undefined
      },
    },
    watch:{
      'editingFeaturePosition': function(val,oldVal) {
        this.editButtonOverlay.setPosition(val)
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
      isEditable: function(f) {
        return ["draft","modified"].indexOf(f.get('baseTint')) >= 0
      },
      isModified: function(f) {
        var tmp = this.editRevision
        var feat = f || this.editingFeature
        return feat && feat.get('baseTint') === "modified"
      },
      editIcon:function(f) {
        var tmp = this.editRevision
        var feat = f || this.editingFeature
        if (!feat) {
            //no editing feature
            return "fa-pencil"
        } else if (feat.get(this.reportKey)) {
            //has report key
            if (this.isEditable(feat)) {
                //edit
                return "fa-pencil"
            } else {
                //view
                return "fa-eye"
            }
        } else {
            //no report key,create
            return "fa-pencil"
        }
      },
      editUrl:function(f) {
        var feat = f || this.editingFeature
        if (!feat) {
            //no editing feature
            return ""
        } else if (feat.get(this.reportKey)) {
            //has report key
            if (this.isEditable(feat)) {        
                //edit
                return this.bfrsService + "/reports/" + feat.get(this.reportKey) + "?point=" 
            } else {
                //view
                return this.bfrsService + "/reports/" + feat.get(this.reportKey) + "?point=" 
            }
        } else {
            //no report key,create
            return this.bfrsService + "/reports" + "?point=" 
        }
      },
      toggleSelect: function (f) {
        if (this.selected(f)) {
          this.annotations.selectedFeatures.remove(f)
        } else {
          this.annotations.selectedFeatures.push(f)
        }
      },
      featureIconSrc:function(f) {
        var vm = this
        //trigger dynamic binding
        var tmp = this.selectedReports
        return this.map.getBlob(f, ['icon', 'tint'],this.tints,function(){
            $("#report-icon-" + f.get(vm.reportKey)).attr("src", vm.featureIconSrc(f))
        })
      },
      selected: function (f) {
        return f.get(this.reportKey) && (this.selectedReports.indexOf(f.get(this.reportKey)) > -1)
      },
      downloadList: function () {
        this.$root.export.exportVector(this.features.filter(this.resourceFilter).sort(this.resourceOrder), 'bushfirereport')
      },
      updateCQLFilter: function () {
        var filters = []
        if(this.cql.trim()) {filter.push(this.cql.trim())}
        var reportFilter = ''
        // filter by specific reports if "Show selected only" is enabled
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
        this.reportMapLayer.getSource().loadSource("query")
      },
      updateResourceFilter: function () {
        var mapLayer = this.reportMapLayer
        // update vue list for filtered features in the current extent
        this.extentFeatures = mapLayer.getSource().getFeaturesInExtent(this.$root.export.mapLayout.extent).filter(this.resourceFilter)
        this.extentFeatures.sort(this.resourceOrder)
        // update vue list for filtered features
        this.allFeatures = mapLayer.getSource().getFeatures().filter(this.resourceFilter)
        this.allFeatures.sort(this.resourceOrder)
      },
      resourceFilter: function (f) {
        var search = ('' + this.search).toLowerCase()
        var found = !search || this.fields.some(function (key) {
          return ('' + f.get(key)).toLowerCase().indexOf(search) > -1
        })
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
        var mapLayer = vm.reportMapLayer
        if (!mapLayer) { return }
        var feats = mapLayer.getSource().getFeatures()
        // update the contents of the selectedFeatures group
        if (vm.annotations.selectable === vm.selectable) {
            var reportIds = vm.selectedReports.slice()
            for(var i = vm.annotations.selectedFeatures.getLength() - 1;i >= 0; i--) {
                if (!vm.isModified(vm.annotations.selectedFeatures.item(i))) {
                    //element is not modified,remote it and readd it later
                    vm.annotations.selectedFeatures.removeAt(i)
                }
            }
            feats.filter(function(el, index, arr) {
              var id = el.get(vm.reportKey)
              if (!id) return false
              if (reportIds.indexOf(id) < 0) return false
              //feature is modified, and is kept in selected features, no need to add it again
              if (vm.isModified(el)) return false 
              return true
            }).forEach(function (el) {
              vm.annotations.selectedFeatures.push(el)
            })
        }

        // update vue list for filtered features in the current extent
        vm.extentFeatures = mapLayer.getSource().getFeaturesInExtent(vm.$root.export.mapLayout.extent).filter(vm.resourceFilter)
        vm.extentFeatures.sort(vm.resourceOrder)
        // update vue list for filtered features
        vm.allFeatures = feats.filter(vm.resourceFilter)
        vm.allFeatures.sort(vm.resourceOrder)
      },
      init: function() {
        // enable bushfire report layer, if disabled
        var catalogue = this.$root.catalogue
        if (!this.reportMapLayer) {
          catalogue.onLayerChange(this.reportLayer, true)
        }

        this.selectable = [this.reportMapLayer]
        this.annotations.selectable = this.selectable
        this.annotations.setTool('Pan')
      }
    },
    ready: function () {
      var vm = this
      var bfrsStatus = vm.loading.register("bfrs","Bushfire Report Component","Initialize")
      var map = this.$root.map
      this.reportKey = "prk_id"

      var addReport = function (f) {
        if (f.get('tint')) {
            //not reloaded for some reason, no need to set again
            return
        }
        var tint = 'draft'
        if (f.get(vm.reportKey) % 2 == 0) {
            tint = 'draft'
        } else {
            tint = 'final'
        }
        f.set('tint', tint)
        f.set('baseTint', tint)
        f.set('label', f.get('name'))
        f.set('icon','dist/static/symbols/fire/fire.svg')
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

      vm.reports = new ol.Collection()
      vm.$root.fixedLayers.push({
        type: 'WFSLayer',
        name: 'Bushfire Report',
        id: 'dpaw:ratis_rtv_web_parks',
        onadd: addReport,
        refresh: 120,
        min_interval:30,
        max_interval:600,
        interval_step:30,
        cql_filter: false,
        onload:function(loadType,source,features,defaultFunc) {
            if (loadType == "auto" ) {
                if (vm.modifiedFeatures.length > 0) {
                    //remote all unmodified features
                    source.clear(true)
                    source.addFeatures(vm.modifiedFeatures)
                    source.addFeatures(features.filter(function(f){
                        return !vm.modifiedFeatures.some(function(modifiedFeature) {
                            return modifiedFeature.get(vm.reportKey) === f.get(vm.reportKey)
                        })
                    }))
                } else {
                    vm.modifiedFeatures = []
                    defaultFunc(loadType,source,features)
                }
            } else {
                vm.modifiedFeatures = []
                defaultFunc(loadType,source,features)
            }
        }
      })

      vm.editButtonOverlay = new ol.Overlay({
        id: "bushfireReportEditOverlay",
        element: $("#bushfireReportEditOverlay")[0],
        positioning: "bottom-left",
        stopEvent:true,
      })

      vm.droppinOverlay = new ol.layer.Vector({
        source: new ol.source.Vector({
          features: vm.droppinFeatures
        })
      })
      var droppinDraw = vm.annotations.iconDrawFactory({
        icon: 'dist/static/images/droppin.svg',
        features:  vm.droppinFeatures,
        tint: 'default',
      })
      droppinDraw.on("drawend",function(ev) {
        var feature = ev.feature
        feature.set('tint', vm.annotations.tool.tint || 'default')
        feature.setStyle(vm.annotations.tool.style || null)
        vm.droppinFeatures.clear()
      })

      vm.droppinTool = {
        name: 'Drop Pin',
        icon: 'dist/static/images/droppin.svg',
        interactions: [droppinDraw],
        selectedTint: 'selectedPoint',
        style: vm.annotations.getIconStyleFunction(),
        scope:["bushfirereport"],
        onSet:function() {
          vm.droppinOverlay.setMap(vm.map.olmap)
        },
        onUnset: function() {
          vm.droppinOverlay.setMap(null)
        }
      }

      vm.modifyInter = new ol.interaction.Modify({
        features: vm.editableFeatures,
        deleteCondition: function(event) {return false}
      })
      vm.modifyInter.on("modifystart",function(ev){
        ev.features.item(0).set('baseTint','modified')
        vm.modifiedFeatures.push(ev.features.item(0))
        vm.editButtonOverlay.setPosition(undefined)
        vm.editRevision += 1
      })
      vm.modifyInter.on("modifyend",function(ev){
        vm.editButtonOverlay.setPosition(ev.features.item(0).getGeometry().getLastCoordinate())
      })

      vm.editTool = {
        name: 'Edit',
        icon: 'fa-pencil',
        scope:["bushfirereport"],
        interactions: [
          vm.annotations.ui.keyboardInter,
          vm.annotations.ui.selectInter,
          vm.annotations.ui.dragSelectInter,
          vm.modifyInter
        ],
        onSet: function() {
          vm.annotations.ui.dragSelectInter.setMulti(false)
          vm.annotations.ui.selectInter.setMulti(false)
        }
      }

      vm.annotations.tools.push(vm.editTool)
      vm.annotations.tools.push(vm.droppinTool)

      bfrsStatus.wait(40,"Listen 'gk-init' event")
      // post init event hookup
      vm.$on('gk-init', function () {
        bfrsStatus.progress(80,"Process 'gk-init' event")
        var viewChanged = global.debounce(function () {
          vm.updateReport()
        }, 100)
        map.olmap.getView().on('propertychange', viewChanged)
        viewChanged()

        var layersAdded = global.debounce(function () {
          var mapLayer = vm.reportMapLayer
          if (!mapLayer) { return }
          if (!mapLayer.get('tracking')) {
            mapLayer.set('tracking', mapLayer.getSource().on('loadsource', viewChanged))
          }
        }, 100)
        map.olmap.getLayerGroup().on('change', layersAdded)
        layersAdded()

        vm.annotations.selectedFeatures.on('add', function (event) {
          if (vm.annotations.selectable === vm.selectable) {
            vm.selectedReports.push(event.element.get(vm.reportKey))
            if (vm.isEditable(event.element)) {
                vm.editableFeatures.push(event.element)
            }
          }
        })
        vm.annotations.selectedFeatures.on('remove', function (event) {
          if (vm.annotations.selectable === vm.selectable) {
            vm.selectedReports.$remove(event.element.get(vm.reportKey))
            vm.editableFeatures.remove(event.element)
          }
        })

        vm.editButtonOverlay.setMap(vm.map.olmap)

        vm.tools = vm.annotations.tools.filter(function (t) {
          return t.scope && t.scope.indexOf("bushfirereport") >= 0
        })
        bfrsStatis.end()
      })
    }
  }
</script>

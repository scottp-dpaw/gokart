<template>
  <div id="map-measure" class="ol-selectable ol-control">
      <button type="button" title="Measure length" @click="toggleMeasure('MeasureLength')" v-bind:class="{'selected':isMeasureLength}"><img src="dist/static/images/measure-length.svg"></button>
      <button type="button" title="Measure area" @click="toggleMeasure('MeasureArea')" v-bind:class="{'selected':isMeasureArea}"><img src="dist/static/images/measure-area.svg"></button>
      <button type="button" title="Clear measurements" v-show="showClear" @click="clearMeasure()"><i class="fa fa-trash"></i></button>
  </div>
</template>

<style>
  .feature-icon {
    width: 24px;
    height: 24px;
  }
</style>

<script>
  import { ol } from 'src/vendor.js'
  export default {
    data: function () {
      return {
      }
    },
    // parts of the template to be computed live
    computed: {
      annotations: function () { 
        return this.$root.$refs.app.$refs.annotations 
      },
      measureType: function() {
        if (["MeasureLength","MeasureArea"].indexOf(this.annotations.tool.name) >= 0) {
            return this.annotations.tool.name
        } else {
            return ""
        }
      },
      showClear: function () {
        return this.measureType != "" && this.features.getLength()
      },
      isMeasureLength: function () {
        return this.measureType == "MeasureLength"
      },
      isMeasureArea:function() {
        return this.measureType == "MeasureArea"
      },
    },
    // methods callable from inside the template
    methods: {
      toggleMeasure: function (type) {
        if (this.measureType == type) {
            this.annotations.setTool('Pan')
        } else  {
            this.annotations.setTool(type)
        }
      },
      clearMeasure:function() {
        if (this.features) {
            this.features.clear()
        }
        if (this.feature) {
            this.annotations.setTool(this.measureType)
            //console.log("Reset measure")
        }
    
      },
      startMeasure:function(evt) {
        //console.log("Start measure")
        // set feature
        this.feature = evt.feature

        this.createMeasureTooltip()

        /** @type {ol.Coordinate|undefined} */
        var tooltipCoord = evt.coordinate

        listener = this.feature.getGeometry().on('change', this.measuring,this)
      },
      measuring: function(evt) {
        var geom = evt.target
        var output
        var tooltipCoord = null
        if (geom instanceof ol.geom.Polygon) {
            output = this.formatArea(geom)
            tooltipCoord = geom.getInteriorPoint().getCoordinates()
        } else if (geom instanceof ol.geom.LineString) {
            output = this.formatLength(geom)
            tooltipCoord = geom.getLastCoordinate()
        }
        if (tooltipCoord) {
            this.measureTooltipElement.innerHTML = output
            this.measureTooltip.setPosition(tooltipCoord)
        }
      },
      endMeasure: function(evt) {
        //console.log("End measure")
        this.measureTooltipElement.className = 'tooltip-measure tooltip-measured'
        this.measureTooltip.setOffset([0, -7])

        this.feature.set("tooltip",this.measureTooltip)
        this.feature.set("tooltipElement",this.measureTooltipElement)
        this.feature.getGeometry().un("change",this.measuring)

        // unset feature
        this.feature = null
        // unset tooltip so that a new one can be created
        this.measureTooltipElement = null
        this.measureTooltip = null
      },
      deleteDrawingFeature: function() {
        this.feature.getGeometry().un("change",this.measuring)
        if(this.measureTooltipElement) {
            //console.log("Remove measuring tooltip")
            this.removeMeasureTooltip(this.measureTooltipElement,this.measureTooltip)
            this.measureTooltipElement = null
            this.measureTooltip = null
        }
      },
      showMeasureTooltip:function(show) {
        var vm = this
        if (this.features && this.features.getLength()) {
            this.features.forEach(function(f){
                if (f.get('tooltip')) {
                    if (show) {
                        vm.$root.map.olmap.addOverlay(f.get('tooltip'))
                    } else {
                        vm.$root.map.olmap.removeOverlay(f.get('tooltip'))
                    }
                }
            })
        }
      },
      createMeasureTooltip: function () {
        if (!this.measureTooltipElement) {
            //console.log("Create measure tooltip")
            this.measureTooltipElement = document.createElement('div')
            this.measureTooltipElement.className = 'tooltip-measure tooltip-measuring'
            this.measureTooltip = new ol.Overlay({
              element: this.measureTooltipElement,
              offset: [0, -15],
              stopEvent:false,
              positioning: 'bottom-center'
            })
            this.$root.map.olmap.addOverlay(this.measureTooltip)
        }
      },
      removeMeasureTooltip: function (element,overlay) {
        if (element) {
            this.$root.map.olmap.removeOverlay(overlay)
            element.parentNode.removeChild(element);
        }
      },
      formatLength : function(line) {
        var length
        var coordinates = line.getCoordinates()
        length = 0
        var sourceProj = this.$root.map.olmap.getView().getProjection()
        for (var i = 0, ii = coordinates.length - 1; i < ii; ++i) {
          var c1 = ol.proj.transform(coordinates[i], sourceProj, 'EPSG:4326')
          var c2 = ol.proj.transform(coordinates[i + 1], sourceProj, 'EPSG:4326')
          length += this.wgs84Sphere.haversineDistance(c1, c2)
        }
        var output
        if (length > 100) {
          output = (Math.round(length / 1000 * 100) / 100) +
              ' ' + 'km'
        } else {
          output = (Math.round(length * 100) / 100) +
              ' ' + 'm'
        }
        return output
      },
      formatArea : function(polygon) {
        var area
        var sourceProj = this.$root.map.olmap.getView().getProjection()
        var geom = /** @type {ol.geom.Polygon} */(polygon.clone().transform(
            sourceProj, 'EPSG:4326'))
        var coordinates = geom.getLinearRing(0).getCoordinates()
        area = Math.abs(this.wgs84Sphere.geodesicArea(coordinates))
        var output
        if (area > 10000) {
          output = (Math.round(area / 1000000 * 100) / 100) +
              ' ' + 'km<sup>2</sup>'
        } else {
          output = (Math.round(area * 100) / 100) +
              ' ' + 'm<sup>2</sup>'
        }
        return output
      },
    },
    ready: function () {
      var vm = this
      var map = this.$root.map
      //initialize the overlay and interactions
      this.features = new ol.Collection()
      this.features.on("remove",function(event){
          if (event.element.get('tooltipElement')) {
              //console.log("Remove measured tooltip")
              vm.removeMeasureTooltip(event.element.get('tooltipElement'),event.element.get('tooltip'))
          }
      })
      this.style =  new ol.style.Style({
          fill: new ol.style.Fill({
            color: 'rgba(0,0,0, 0.25)'
          }),
          stroke: new ol.style.Stroke({
            color: 'rgba(0, 0, 0, 0.5)',
            lineDash: [10, 10],
            width: 2
          }),
          image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({
              color: 'rgb(0, 153, 255)'
            })
          })
      })
      this.source = new ol.source.Vector({
          features:this.features
      })
      this.overlay = new ol.layer.Vector({
          source: this.source,
          style: this.style
      })

      var measureLengthInter = new ol.interaction.Draw({
              source: this.source,
              type: 'LineString',
              style: this.style
            });
      measureLengthInter.on('drawstart',this.startMeasure,this)
      measureLengthInter.on('drawend',this.endMeasure, this)

      var measureLength = {
        name: 'MeasureLength',
        interactions:[
            //map.dragPanInter,
            //map.doubleClickZoomInter,
            //map.keyboardPanInter,
            //map.keyboardZoomInter,
            measureLengthInter,
        ]
      }
      this.annotations.tools.push(measureLength)

      var measureAreaInter = new ol.interaction.Draw({
              source: this.source,
              type: 'Polygon',
              style: this.style
            });
      measureAreaInter.on('drawstart',this.startMeasure,this)
      measureAreaInter.on('drawend',this.endMeasure, this)

      var measureArea = {
        name: 'MeasureArea',
        interactions:[
            //map.dragPanInter,
            //map.doubleClickZoomInter,
            //map.keyboardPanInter,
            //map.keyboardZoomInter,
            measureAreaInter
        ]
      }

      this.annotations.tools.push(measureArea)
      this.$watch("measureType",function(newVal,oldVal){
        if (newVal == "") {
            //switchoff
            if (this.overlay) {
                this.overlay.setMap(null)
            }
            if (this.measureTooltipElement) {
                this.removeMeasureTooltip(this.measureTooltipElement,this.measureTooltip)
                this.measureTooltipElement = null
                this.measureTooltip = null
            }
            //hidden measuretips
            this.showMeasureTooltip(false)
        } else if (oldVal == ""){
            //switchon
            this.overlay.setMap(this.$root.map.olmap)
            this.showMeasureTooltip(true)
        } else {
            //switch measure type
            if (this.feature) {
                this.deleteDrawingFeature()
                this.feature = null
            }
        }
      })

      this.wgs84Sphere = new ol.Sphere(6378137);
      this.$on("gk-init",function(){
        vm.$root.map.olmap.addControl(new ol.control.Control({
          element: $('#map-measure').get(0),
	  target: $('#external-controls').get(0)
        }))
      })
    }
  }
</script>

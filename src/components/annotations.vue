<template>
  <div class="tabs-panel" id="menu-tab-annotations" v-cloak>
    <div class="row collapse">
      <div class="columns">
        <ul class="tabs" data-tabs id="annotations-tabs">
          <li class="tabs-title is-active"><a href="#annotations-edit" aria-selected="true">Annotations</a></li>
        </ul>
      </div>
    </div>
    <div class="row collapse" id="annotations-tab-panels">
      <div class="columns">
        <div class="tabs-content vertical" data-tabs-content="annotations-tabs">

          <div class="tabs-panel is-active" id="annotations-edit" v-cloak>
            <div class="tool-slice row collapse">
              <div class="small-2"><label class="tool-label">Tool:</label></div>
              <div class="small-10">
                <div class="expanded button-group">
                  <a v-for="t in annotationTools | filterIf 'showName' undefined" class="button button-tool" v-bind:class="{'selected': t.name == tool.name}"
                    @click="setTool(t)" v-bind:title="t.name">{{{ icon(t) }}}</a>
                </div>
                <div class="row resetmargin">
                  <div v-for="t in annotationTools | filterIf 'showName' true" class="small-6" v-bind:class="{'rightmargin': $index % 2 === 0}" >
                    <a class="expanded secondary button" v-bind:class="{'selected': t.name == tool.name}" @click="setTool(t)"
                      v-bind:title="t.name">{{{ icon(t) }}} {{ t.name }}</a>
                  </div>
                </div>
              </div>
            </div>

            <div class="tool-slice row collapse">
              <div class="small-2"><label class="tool-label">Ops:</label></div>
              <div class="small-10">
                <div class="expanded button-group hide">
                  <a class="button"><i class="fa fa-cut" aria-hidden="true"></i> Cut</a>
                  <a class="button"><i class="fa fa-copy" aria-hidden="true"></i> Copy</a>
                  <a class="button"><i class="fa fa-paste" aria-hidden="true"></i> Paste</a>
                </div>
                <div class="expanded button-group hide">
                  <a class="button"><i class="fa fa-undo" aria-hidden="true"></i> Undo</a>
                  <a class="button"><i class="fa fa-repeat" aria-hidden="true"></i> Redo</a>
                </div>
                <div class="expanded button-group">
                  <a class="button"><i class="fa fa-upload" aria-hidden="true"></i> Upload Boundary</a>
                  <a class="button" @click="downloadAnnotations()"><i class="fa fa-download" aria-hidden="true"></i> Export Annotations</a>
                </div>
              </div>
            </div>

            <div v-show="shouldShowSizePicker" class="tool-slice row collapse">
              <div class="small-2"><label class="tool-label">Size:<br/>({{ size }})</label></div>
              <div class="small-10">
                <div class="expanded button-group">
                  <a @click="setProp('size', 1)" v-bind:class="{'selected': size == 1}" class="button"><img src="dist/static/images/thick-1.svg"/></a>
                  <a @click="setProp('size', 2)" v-bind:class="{'selected': size == 2}" class="button"><img src="dist/static/images/thick-2.svg"/></a>
                  <a @click="setProp('size', 4)" v-bind:class="{'selected': size == 4}" class="button"><img src="dist/static/images/thick-4.svg"/></a>
                </div>
              </div>
            </div>
            <div v-show="shouldShowColourPicker" class="tool-slice row collapse">
              <div class="small-2"><label class="tool-label">Colour:</label></div>
              <div class="small-10">
                <div @click="updateNote(false)" class="expanded button-group">
                  <a v-for="c in colours" class="button" title="{{ c[0] }}" @click="setProp('colour', c[1])" v-bind:class="{'selected': c[1] == colour}"
                    v-bind:style="{ backgroundColor: c[1] }"></a>
                </div>
              </div>
            </div>

            <div v-show="shouldShowNoteEditor" class="tool-slice row collapse">
              <div class="small-2">Note:</div>
              <div class="small-10">
                <select name="select" @change="note.text = $event.target.value.split('<br>').join('\n')">
                  <option value="">Text Templates</option> 
                  <option value="Sector: <br>Channel: <br>Commander: " selected>Sector Details</option>
                </select>
                <textarea @blur="updateNote(true)" class="notecontent" v-el:notecontent @keyup="updateNote(false)" @click="updateNote(true)" @mouseup="updateNote(false)">{{ note.text }}</textarea>
              </div>
            </div>
            <div class="tool-slice row collapse">
              <div class="small-12 canvaspane">
                <canvas v-show="shouldShowNoteEditor" v-el:textpreview></canvas>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<style>
  .notecontent {
    width: 100%;
    height: 100px;
    resize: both;
    background-image: url('dist/static/images/boxresize.svg');
    background-repeat: no-repeat;
    background-position: right bottom;
  }
  .canvaspane {
    overflow: hidden;
    width: 100px;
    height: 30vh;
  }
  .row.resetmargin {
    margin: 0px;
  }
  .resetmargin .small-6.rightmargin {
    margin-right: 1px;
  }
  .resetmargin .small-6 {
    margin-right: -1px;
    padding-right: 1px;
  }
  .resetmargin .expanded.button {
    margin-bottom: 2px;
  }
  .fa.red {
    color: #b43232;
  }
</style>

<script>
  import { $, ol, Vue } from 'src/vendor.js'

  Vue.filter('filterIf', function (list, prop, value) {
    if (!list) { return }
    return list.filter(function (val) {
      return val && val[prop] === value
    })
  })

  var noteOffset = 0
  var notePadding = 10

  var noteStyles = {
    'general': function (note) {
      var textTmpl = {
        fontSize: '16px',
        fontFamily: '"Helvetica Neue",Helvetica,Roboto,Arial,sans-serif',
        text: note.text,
        x: noteOffset + notePadding, y: notePadding,
        align: 'left',
        fromCenter: false
      }
      return [
        ['drawText', $.extend({layer:true,name:"decorationLayer",strokeWidth: 3, strokeStyle: 'rgba(255, 255, 255, 0.9)'}, textTmpl)],
        ['drawText', $.extend({layer:true,name:"textLayer",fillStyle: note.colour}, textTmpl)]
      ]
    }
  }

  export default {
    data: function () {
      return {
        ui: {},
        tool: {},
        tools: [],
        annotationTools: [],
        features: new ol.Collection(),
        selectedFeatures: new ol.Collection(),
        // array of layers that are selectable
        selectable: [],
        featureOverlay: {},
        note: {
          style: 'general',
          text: 'Sector: \nChannel: \nCommander: ',
          colour: '#000000'
        },
        notes: {},
        size: 2,
        colour: '#000000',
        colours: [
          ['red', '#cc0000'],
          ['orange', '#f57900'],
          ['yellow', '#edd400'],
          ['green', '#73d216'],
          ['blue', '#3465a4'],
          ['violet', '#75507b'],
          ['brown', '#8f5902'],
          ['grey', '#555753'],
          ['black', '#000000']
        ],
        advanced: false
      }
    },
    computed: {
      map: function () { return this.$root.$refs.app.$refs.map },
      loading: function () { return this.$root.loading },
      featureEditing: function() {
        if (this.tool == this.ui.editStyle && this.selectedFeatures.getLength() > 0) {
            return this.selectedFeatures.item(0)
        } else {
            return null
        }
      },
      shouldShowNoteEditor: function () {
        if (!this.tool || !this.tool.name) {
          return false
        }
        // FIXME: replace this with a tool property
        return this.tool === this.ui.defaultText || 
            (this.tool === this.ui.editStyle && this.featureEditing && this.getTool(this.featureEditing.get('toolName')) === this.ui.defaultText)
      },
      shouldShowSizePicker: function () {
        if (!this.tool || !this.tool.name) {
          return false
        }
        // FIXME: replace this with a tool property
        return this.tool === this.ui.defaultLine || 
               this.tool === this.ui.defaultPolygon || 
               (this.tool == this.ui.editStyle && this.featureEditing && ([this.ui.defaultLine,this.ui.defaultPolygon].indexOf(this.getTool(this.featureEditing.get('toolName'))) >= 0))
      },
      shouldShowColourPicker: function () {
        if (!this.tool || !this.tool.name) {
          return false
        }
        // FIXME: replace this with a tool property
        return this.tool === this.ui.defaultLine || 
               this.tool === this.ui.defaultPolygon || 
               this.tool == this.ui.defaultText || 
               (this.tool === this.ui.editStyle && this.featureEditing && ([this.ui.defaultLine,this.ui.defaultPolygon,this.ui.defaultText].indexOf(this.getTool(this.featureEditing.get('toolName'))) >= 0))
      },
    },
    watch:{
      'featureEditing': function(val,oldVal) {
        if (val && val instanceof ol.Feature && val.get) {
            if (val.get('note')) {
                //it is a text note
                this.note = val.get('note')
                this.drawNote(this.note)
                this.colour = this.note.colour || this.colour
            } else {
                this.size = val.get('size') || this.size
                this.colour = val.get('colour') || this.colour
            }
        }
      }
    },
    methods: {
      getStyleFunction: function(featureStyleFunction,thisArg) {
        var func = function(feat,res) {
            return featureStyleFunction.call(thisArg || feat,res)
        }
        return func
      },
      downloadAnnotations: function() {
        this.$root.export.exportVector(this.features.getArray(), 'annotations')
      },
      getIconStyleFunction : function(tints) {
        var vm = this
        return function (res) {
            var feat = this
            var style = vm.map.cacheStyle(function (feat) {
              var src = vm.map.getBlob(feat, ['icon', 'tint'],tints || {})
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
      },
      getPerpendicular : function (coords) {
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
      },
      iconDrawFactory : function (options) {
        var vm = this
        var defaultFeat = new ol.Feature({
            'icon': options.icon,
            'tint': options.tint
        })

        var draw =  new ol.interaction.Draw({
          type: 'Point',
          features: options.features,
          style: vm.getStyleFunction(vm.getIconStyleFunction(options.tints || {}),defaultFeat)
        })
        draw.on('drawstart', function (ev) {
          // set parameters
          ev.feature.set('icon', options.icon)
          if (options.perpendicular) {
            var coords = ev.feature.getGeometry().getCoordinates()
            ev.feature.set('rotation', vm.getPerpendicular(coords))
          }
        })
        return draw
      },
      icon: function (t) {
        if (t.icon.startsWith('fa-')) {
          return '<i class="fa ' + t.icon + '" aria-hidden="true"></i>'
        } else if (t.icon.search('#') === -1) {
          // plain svg/image
          return '<img class="icon" src="' + t.icon + '" />'
        } else {
          // svg reference
          return '<svg class="icon"><use xlink:href="' + t.icon + '"></use></svg>'
        }
      },
      setProp: function (prop, value) {
        this[prop] = value
        if (this.featureEditing instanceof ol.Feature) {
          this.featureEditing.set(prop, value)
        }
      },
      getTool: function (toolName) {
        return this.tools.filter(function (t) {
          return t.name === toolName
        })[0]
      },
      setTool: function (t) {
        if (typeof t == 'string') {
          t = this.getTool(t)
        }
        if (this.tool === t) {
            //choose the same tool, do nothing,
            return
        } else if(this.tool.onUnset) {
            this.tool.onUnset()
        }
        var map = this.map
        // remove all custom tool interactions from map
        this.tools.forEach(function (tool) {
          tool.interactions.forEach(function (inter) {
            map.olmap.removeInteraction(inter)
          })
        })

        // add interactions for this tool
        t.interactions.forEach(function (inter) {
          map.olmap.addInteraction(inter)
        })

        // remove selections
        this.selectedFeatures.clear()

        // auto-disable hover info, but remember the user's choice
        this.$root.active.hoverInfo = ((t.name === 'Pan') && (this.$root.active.hoverInfoCache))

        this.tool = t

        if (t.onSet) { t.onSet() }
      },
      selectAll: function () {
        var vm = this
        this.features.forEach(function (feature) {
          if (!(feature in vm.selectedFeatures)) {
            vm.selectedFeatures.push(feature)
          }
        })
      },
      deleteSelected: function () {
        var vm = this
        this.selectedFeatures.forEach(function (feature) {
          vm.features.remove(feature)
        })
        this.selectedFeatures.clear()
      },
      updateNote: function (save) {
        var note = null
        if (this.tool ===  this.ui.editStyle) {
            //edit mode
            if (!this.featureEditing || !this.featureEditing.get('note')) {
              //this feature is not a note. return
              return
            }
            note = this.featureEditing.get('note')
        } else {
            //draw mode
            note = this.note
        }
        note.text = this.$els.notecontent.value
        note.width = $(this.$els.notecontent).width()
        note.height = $(this.$els.notecontent).height()
        note.colour = this.colour
        this.drawNote(note, save)
      },
      drawNote: function (note, save) {
        if (!note) { return }
        var vm = this
        var noteCanvas = this.$els.textpreview
        $(noteCanvas).removeLayer("decorationLayer")
        $(noteCanvas).removeLayer("textLayer")
        $(noteCanvas).clearCanvas()
        if ((note.style) && (note.style in noteStyles)) {
          //draw
          $(noteCanvas).attr('height', note.height + noteOffset)
          $(noteCanvas).attr('width', note.width + noteOffset)
          noteStyles[note.style](note).forEach(function (cmd) {
            $(noteCanvas)[cmd[0]](cmd[1])
          })
          //measure and set canvas dimension
          var annotationSize = $(noteCanvas).measureText("decorationLayer")
          note.size = [annotationSize.width + noteOffset + notePadding, annotationSize.height + notePadding]
          $(noteCanvas).attr('width', note.size[0])
          $(noteCanvas).attr('height', note.size[1])
          $(noteCanvas).drawLayers()
            
          if (save) {
            var key = JSON.stringify(note)
            // temp placeholder
            this.notes[key] = ''
            noteCanvas.toBlob(function (blob) {
              // switch for actual image
              vm.notes[key] = window.URL.createObjectURL(blob)
              // FIXME: redraw stuff when saving blobs (broken in chrome)
              vm.features.getArray().forEach(function (f) {
                if (JSON.stringify(f.get('note')) === key) {
                  f.changed()
                }
              })
              // Set canvas back to the vm's note
              vm.drawNote(vm.note, false)
            }, 'image/png')
          }
        }
      },
      getNoteUrl: function (note) {
        var key = JSON.stringify(note)
        if (!(key in this.notes)) {
          this.drawNote(note, true)
        }
        return this.notes[key]
      },
      init: function() {
        // enable annotations layer, if disabled
        var catalogue = this.$root.catalogue
        if (!this.map.getMapLayer('annotations')) {
          catalogue.onLayerChange(catalogue.getLayer('annotations'), true)
        }
        // runs on switch to this tab
        this.selectable = [this.featureOverlay]
        this.setTool('Edit')
      },
      getNoteExtent: function(feature) {
        var note = feature.get('note')
        if (!note) return null
        var map = this.map.olmap
        var bottomLeftCoordinate = feature.getGeometry().getFirstCoordinate()
        var bottomLeftPosition = map.getPixelFromCoordinate(bottomLeftCoordinate)
        var upRightCoordinate = map.getCoordinateFromPixel([bottomLeftPosition[0] + note.size[0],bottomLeftPosition[1] - note.size[1]])
        return [bottomLeftCoordinate[0],bottomLeftCoordinate[1],upRightCoordinate[0],upRightCoordinate[1]]
      }
    },
    ready: function () {
      var vm = this
      this.loading.begin("Annotation Component", "Initialize")
      var map = this.map
      // collection to store all annotation features
      this.features.on('add', function (ev) {
        var feature = ev.element
        var tool = null
        if (feature.get('toolName')) {
          tool = vm.getTool(feature.get('toolName'))
        } else {
          feature.set('toolName', vm.tool.name)
          tool = vm.tool
        }
        feature.set('tint', tool.tint || 'default')
        if (tool.onAdd) {
          tool.onAdd(feature)
        }
        feature.setStyle(tool.style || null)
      })
      var savedFeatures = this.$root.geojson.readFeatures(this.$root.store.annotations)
      this.$on('gk-init', function () {
        if (savedFeatures) {
          this.features.extend(savedFeatures)
        }
      })
      // add/remove selected property
      this.selectedFeatures.on('add', function (ev) {
        var feature = ev.element
        feature.set('baseTint', feature.get('tint'),true)
        var tool = vm.getTool(feature.get('toolName'))
        if (tool) {
            feature.set('tint', tool.selectedTint || 'selected')
        } else {
            feature.set('tint', 'selected')
        }
      })
      this.selectedFeatures.on('remove', function (ev) {
        var feature = ev.element
        feature.set('tint', feature.get('baseTint'))
      })
      // layer/source for modifying annotation features
      this.featureOverlay = new ol.layer.Vector({
        source: new ol.source.Vector({
          features: this.features
        })
      })
      this.featureOverlay.set('id', 'annotations')
      this.featureOverlay.set('name', 'My Annotations')
      // collection for tracking selected features

      // add new points to annotations layer
      this.ui.pointInter = new ol.interaction.Draw({
        type: 'Point',
        features: this.features
      })

      // add new lines to annotations layer
      this.ui.lineInter = new ol.interaction.Draw({
        type: 'LineString',
        features: this.features
      })

      // add new polygons to annotations layer
      this.ui.polyInter = new ol.interaction.Draw({
        type: 'Polygon',
        features: this.features
      })

      // the following interacts are bundled into the Select and Edit tools.
      // main difference is that Select allows movement of whole features around the map,
      // whereas Edit is for movement of individual nodes

      // allow translating of features by click+dragging
      this.ui.translateInter = new ol.interaction.Translate({
        layers: [this.featureOverlay],
        features: this.selectedFeatures
      })
      // allow modifying features by click+dragging
      this.ui.modifyInter = new ol.interaction.Modify({
        features: this.features
      })

      // allow dragbox selection of features
      this.ui.dragSelectInter = new ol.interaction.DragBox()
      // modify selectedFeatures after dragging a box
      this.ui.dragSelectInter.on('boxend', function (event) {
        vm.selectedFeatures.clear()
        var extent = event.target.getGeometry().getExtent()
        var multi = (this.multi_ == undefined)?true:this.multi_
        vm.selectable.forEach(function(layer) {
          if (!multi && vm.selectedFeatures.getLength() > 0) {return true}
          if (layer == vm.featureOverlay) {
              //select all annotation features except text note
              layer.getSource().forEachFeatureIntersectingExtent(extent, function (feature) {
                if (!multi && vm.selectedFeatures.getLength() > 0) {return true}
                if (!feature.get('note')) {
                    vm.selectedFeatures.push(feature)
                    return !multi
                }
              })
              //select text note
              vm.features.forEach(function(feature){
                if (!multi && vm.selectedFeatures.getLength() > 0) {return}
                if (feature.get('note')) {
                  if (ol.extent.intersects(extent,vm.getNoteExtent(feature))) {
                    vm.selectedFeatures.push(feature)
                  }
                }
              })
          } else {
              layer.getSource().forEachFeatureIntersectingExtent(extent, function (feature) {
                if (!multi && vm.selectedFeatures.getLength() > 0) {return true}
                vm.selectedFeatures.push(feature)
                return !multi
              })
          }
        })
      })
      // clear selectedFeatures before dragging a box
      this.ui.dragSelectInter.on('boxstart', function () {
        //vm.selectedFeatures.clear()
      })
      this.ui.dragSelectInter.setMulti = function(multi) {
        this.multi_ = multi
      }

      // allow selecting multiple features by clicking
      this.ui.selectInter = new ol.interaction.Select({
        layers: function(layer) { 
          return vm.selectable.indexOf(layer) > -1
        },
        features: this.selectedFeatures
      })
      this.ui.selectInter.defaultHandleEvent = this.ui.selectInter.defaultHandleEvent || this.ui.selectInter.handleEvent
      this.ui.selectInter.handleEvent = function(event) {
        if (this.condition_(event)) {
            try {
                vm.selecting = true
                return this.defaultHandleEvent(event)
            } finally {
                vm.selecting = false
            }
        } else {
            vm.selecting = false
            return this.defaultHandleEvent(event)
        }
      }
      this.ui.selectInter.setMulti = function(multi) {
        this.multi_ = multi
      }
      // OpenLayers3 hook for keyboard input
      this.ui.keyboardInter = new ol.interaction.Interaction({
        handleEvent: function (mapBrowserEvent) {
          var stopEvent = false
          if (mapBrowserEvent.type === ol.events.EventType.KEYDOWN) {
            var keyEvent = mapBrowserEvent.originalEvent
            switch (keyEvent.keyCode) {
              case 65: // a
                if (keyEvent.ctrlKey) {
                  vm.selectAll()
                  stopEvent = true
                }
                break
              case 46: // Delete
                vm.deleteSelected()
                stopEvent = true
                break
              default:
                break
            }
          }
          // if we intercept a key combo, disable any browser behaviour
          if (stopEvent) {
            keyEvent.preventDefault()
          }
          return !stopEvent
        }
      })
      // load default tools
      this.tool = this.ui.defaultPan = {
        name: 'Pan',
        icon: 'fa-hand-paper-o',
        scope:["annotation","bushfirereport","resourcetracking"],
        interactions: [
          map.dragPanInter,
          map.doubleClickZoomInter,
          map.keyboardPanInter,
          map.keyboardZoomInter
        ]
      }
      this.ui.editStyle = {
        name: 'Edit Style',
        icon: 'fa-pencil-square-o',
        scope:["annotation"],
        interactions: [
          this.ui.dragSelectInter,
          this.ui.selectInter,
        ],
        onSet: function() {
            vm.ui.dragSelectInter.setMulti(false)
            vm.ui.selectInter.setMulti(false)
        }
      }
      this.ui.defaultSelect = {
        name: 'Select',
        icon: 'fa-mouse-pointer',
        scope:["annotation","resourcetracking"],
        interactions: [
          this.ui.keyboardInter,
          this.ui.dragSelectInter,
          this.ui.selectInter,
          this.ui.translateInter
        ],
        onSet: function() {
            vm.ui.dragSelectInter.setMulti(true)
            vm.ui.selectInter.setMulti(true)
        }
      }
      this.ui.defaultEdit = {
        name: 'Edit',
        icon: 'fa-pencil',
        scope:["annotation"],
        interactions: [
          this.ui.keyboardInter,
          this.ui.selectInter,
          this.ui.dragSelectInter,
          this.ui.modifyInter
        ],
        onSet: function() {
            vm.ui.dragSelectInter.setMulti(true)
            vm.ui.selectInter.setMulti(true)
        }
      }
      this.tools = [
        this.ui.defaultPan,
        this.ui.defaultSelect,
        this.ui.defaultEdit,
        this.ui.editStyle
      ]

      var noteStyleCache = {}
      var noteStyle = function (res) {
        var f = this
        var url = ''
        if (f) {
          url = vm.getNoteUrl(f.get('note'))
        } else {
          return null
        }
        var tint = f.get('tint') || "notselected"
        if (!noteStyleCache[url]) {
            noteStyleCache[url] = []
        }
        if (!noteStyleCache[url][tint]) {
          var color = (tint == "selected")?'#70BDF0':undefined
          noteStyleCache[url][tint] = new ol.style.Style({
            image: new ol.style.Icon({
              anchorOrigin: 'bottom-left',
              anchor: [0, 0],
              color: color,
              src: url
            })
          })
        }
        return noteStyleCache[url][tint]
      }
      var noteDraw = new ol.interaction.Draw({
        type: 'Point',
        features: this.features
      })
      this.ui.defaultText = {
        name: 'Text Note',
        icon: 'fa-comment',
        style: noteStyle,
        interactions: [noteDraw],
        showName: true,
        scope:["annotation"],
        onAdd: function (f) {
          f.getGeometry().defaultGetExtent = f.getGeometry().defaultGetExtent || f.getGeometry().getExtent
          f.getGeometry().getExtent = function() {
              if (vm.selecting) {
                  return vm.getNoteExtent(f)
              } else {
                  return this.defaultGetExtent()
              }
          }
          if (f.get('note')) { return }
          f.set('note', $.extend({}, vm.note))
        },
      }
      var customAdd = function (f) {
        if (!f.get('size')) { 
          f.set('size', vm.size)
        }
        if (!f.get('colour')) { 
          f.set('colour', vm.colour)
        }
      }
      var vectorStyle = function () {
        var f = this
        var style = vm.map.cacheStyle(function (f) {
          if (f.get('tint') === 'selected') {
            return [
              new ol.style.Style({
                fill: new ol.style.Fill({
                  color: 'rgba(255, 255, 255, 0.2)'
                }),
                stroke: new ol.style.Stroke({
                  color: '#2199e8',
                  width: 2 * f.get('size') + 2
                })
              }),
              new ol.style.Style({
                stroke: new ol.style.Stroke({
                  color: '#ffffff',
                  width: 2 * f.get('size')
                })
              }),
           ]
          } else {
            return new ol.style.Style({
              fill: new ol.style.Fill({
                color: 'rgba(255, 255, 255, 0.2)'
              }),
              stroke: new ol.style.Stroke({
                color: f.get('colour'),
                width: 2 * f.get('size')
              })
            })
          }
        },f,['size','colour','tint'])
        return style
      }
      this.ui.defaultLine = {
        name: 'Custom Line',
        icon: 'dist/static/images/iD-sprite.svg#icon-line',
        interactions: [this.ui.lineInter],
        showName: true,
        scope:["annotation"],
        onAdd: customAdd,
        style: vectorStyle
      }
      this.ui.defaultPolygon = {
        name: 'Custom Area',
        icon: 'dist/static/images/iD-sprite.svg#icon-area',
        interactions: [this.ui.polyInter],
        showName: true,
        scope:["annotation"],
        onAdd: customAdd,
        style: vectorStyle
      }

      // add annotations layer to catalogue list
      this.$root.catalogue.catalogue.push({
        type: 'Annotations',
        id: 'annotations',
        name: 'My Annotations'
      })

      this.loading.wait("Annotation Component",80,"Listen 'gk-init' event")
      this.$on("gk-init",function() {
        vm.annotationTools = this.tools.filter(function (t) {
          return t.scope && t.scope.indexOf("annotation") >= 0
        })
        vm.loading.end("Annotation Component","Initialized")
      })

    }

  }
</script>

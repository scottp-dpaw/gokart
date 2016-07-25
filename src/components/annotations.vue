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
                  <a v-for="t in tools | filterIf 'showName' undefined" class="button button-tool" v-bind:class="{'selected': t.name == tool.name}"
                    @click="setTool(t)" v-bind:title="t.name">{{{ icon(t) }}}</a>
                  <a class="button button-tool" v-bind:class="{'disabled': selectedFeatures.getArray().length !== 1}"
                    @click="editFeature(selectedFeatures.getArray()[0])" title="Edit selected feature"><i class="fa fa-pencil-square-o"></i></a>
                </div>
                <div class="row resetmargin">
                  <div class="small-6 rightmargin">
                    <a v-for="t in tools | filterIf 'showName' true" v-if="$index % 2 === 0" class="expanded secondary button" v-bind:class="{'selected': t.name == tool.name}" @click="setTool(t)"
                      v-bind:title="t.name">{{{ icon(t) }}} {{ t.name }}</a>
                  </div>
                  <div class="small-6">
                    <a v-for="t in tools | filterIf 'showName' true" v-if="$index % 2 === 1" class="expanded secondary button" v-bind:class="{'selected': t.name == tool.name}" @click="setTool(t)"
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
                  <a class="button"><i class="fa fa-download" aria-hidden="true"></i> Export Annotations</a>
                </div>
              </div>
            </div>

            <div v-show="tool.name.startsWith('Custom')" class="tool-slice row collapse">
              <div class="small-2"><label class="tool-label">Size:<br/>({{ size }})</label></div>
              <div class="small-10">
                <div class="expanded button-group">
                  <a @click="setProp('size', 1)" v-bind:class="{'selected': size == 1}" class="button"><small>Small</small></a>
                  <a @click="setProp('size', 2)" v-bind:class="{'selected': size == 2}" class="button">Medium</a>
                  <a @click="setProp('size', 4)" v-bind:class="{'selected': size == 4}" class="button"><big>Large</big></a>
                </div>
              </div>
            </div>
            <div v-show="tool.name.startsWith('Custom') || tool.name.startsWith('Text')" class="tool-slice row collapse">
              <div class="small-2"><label class="tool-label">Colour:</label></div>
              <div class="small-10">
                <div @click="updateNote(false)" class="expanded button-group">
                  <a v-for="c in colours" class="button" title="{{ c[0] }}" @click="setProp('colour', c[1])" v-bind:class="{'selected': c[1] == colour}"
                    v-bind:style="{ backgroundColor: c[1] }"></a>
                </div>
              </div>
            </div>

            <div v-show="tool.name == 'Text Note'" class="tool-slice row collapse">
              <div class="small-2">Note:</div>
              <div class="small-10">
                <select name="select" @change="note.text = $event.target.value.split('<br>').join('\n')">
                  <option value="" selected>Text Templates</option> 
                  <option value="Sector Alpha<br>Channel: <br>Commander: ">Sector Details</option>
                </select>
                <textarea @blur="updateNote(true)" class="notecontent" v-el:notecontent @keyup="updateNote(false)" @click="updateNote(true)" @mouseup="updateNote(false)">{{ note.text }}</textarea>
              </div>
            </div>
            <div class="tool-slice row collapse">
              <div class="small-12 canvaspane">
                <canvas v-show="tool.name == 'Text Note'" v-el:textpreview></canvas>
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
    width: 300px;
    height: 40px;
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

  var noteOffset = 20
  var notePadding = 10

  var noteStyles = {
    'general': function(note) {
      var pathTmpl = {
        strokeCap: 'round',
        p1: {
          type: 'line',
          x1: 2, y1: note.height + noteOffset - 2,
          x2: noteOffset, y2: note.height + noteOffset/2
        },
        p2: {
          type: 'line',
          x1: noteOffset, y1: 2,
          x2: noteOffset, y2: note.height + noteOffset/2,
          x3: note.width + noteOffset - 2, y3: note.height + noteOffset/2
        }
      }
      var textTmpl = {
        fontSize: '16px "Helvetica Neue",Helvetica,Roboto,Arial,sans-serif',
        text: note.text,
        x: noteOffset + notePadding, y: notePadding,
        align: 'left',
        maxWidth: note.width + notePadding * -2,
        fromCenter: false
      }
      return [
        ['drawPath', $.extend({strokeWidth: 4, strokeStyle: 'rgba(255, 255, 255, 0.9)'}, pathTmpl)],
        ['drawPath', $.extend({strokeWidth: 2, strokeStyle: note.colour}, pathTmpl)],
        ['drawText', $.extend({strokeWidth: 3, strokeStyle: 'rgba(255, 255, 255, 0.9)'}, textTmpl)],
        ['drawText', $.extend({fillStyle: note.colour}, textTmpl)]
      ]
    }
  }


  export default {
    data: function () {
      return {
        ui: {},
        tool: {},
        tools: [],
        features: new ol.Collection(),
        selectedFeatures: new ol.Collection(),
        featureOverlay: {},
        featureEditing: {},
        note: {
          style: 'general',
          text: 'Insert note here',
          width: 300,
          height: 40,
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
    methods: {
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
      editFeature: function (f) {
        this.featureEditing = f
        this.setTool(this.getTool(f.get('toolName')))
        // set note so edit context makes sense
        if (f.get('note')) {
          this.note = $.extend({}, f.get('note'))
          this.drawNote(f.get('note'))
        }
        if (f.get('size')) {
          this.size = f.get('size')
        }
        if (f.get('colour')) {
          this.colour = f.get('colour')
        }
      },
      setTool: function (t) {
        if (!this.featureEditing.get || t.name !== this.featureEditing.get('toolName')) {
          this.featureEditing = {}
        }
        var map = this.$root.map
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

        // enable annotations layer, if disabled
        var catalogue = this.$root.catalogue
        if (!map.getMapLayer('annotations')) {
          catalogue.onLayerChange(catalogue.getLayer('annotations'), true)
        }
        this.tool = t
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
        var note = this.note
        if (this.featureEditing.get) {
          note = this.featureEditing.get('note') || note
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
        $(noteCanvas).clearCanvas()
        if ((note.style) && (note.style in noteStyles)) {
          $(noteCanvas).attr("height", note.height + noteOffset)
          $(noteCanvas).attr("width", note.width + noteOffset)
          noteStyles[note.style](note).forEach(function (cmd) {
            $(noteCanvas)[cmd[0]](cmd[1])
          })
          if (save) {
            var key = JSON.stringify(note)
            // temp placeholder
            this.notes[key] = 'dist/static/images/placeholder.svg'
            noteCanvas.toBlob(function (blob) {
              // switch for actual image
              vm.notes[key] = window.URL.createObjectURL(blob)
              // FIXME: redraw stuff when saving blobs (broken in chrome)
              vm.features.getArray().forEach(function(f) {
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
        if (!this.notes[key]) {
          this.drawNote(note, true)
        }
        return this.notes[key]
      }
    },
    ready: function () {
      var vm = this
      var map = this.$root.map
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
      // NASTYHACK: add/remove default style based on select status
      this.selectedFeatures.on('add', function (ev) {
        var feature = ev.element
        feature.preSelectStyle = feature.getStyle()
        feature.setStyle(null)
      })
      this.selectedFeatures.on('remove', function (ev) {
        var feature = ev.element
        feature.setStyle(feature.preSelectStyle)
        delete feature.preSelectStyle
      })
      // layer/source for modiftying annotation features
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
        var extent = event.target.getGeometry().getExtent()
        vm.featureOverlay.getSource().forEachFeatureIntersectingExtent(extent, function (feature) {
          vm.selectedFeatures.push(feature)
        })
      })
      // clear selectedFeatures before dragging a box
      this.ui.dragSelectInter.on('boxstart', function () {
        vm.selectedFeatures.clear()
      })
      // allow selecting multiple features by clicking
      this.ui.selectInter = new ol.interaction.Select({
        layers: [this.featureOverlay],
        features: this.selectedFeatures
      })

      // OpenLayers3 hook for keyboard input
      this.ui.keyboardInter = new ol.interaction.Interaction({
        handleEvent: function (mapBrowserEvent) {
          var stopEvent = false
          if (mapBrowserEvent.type === ol.events.EventType.KEYDOWN) {
            var keyEvent = mapBrowserEvent.originalEvent
            //console.log(keyEvent)
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
        interactions: [
          map.dragPanInter,
          map.doubleClickZoomInter,
          map.keyboardPanInter,
          map.keyboardZoomInter
        ]
      }
      this.ui.defaultSelect = {
        name: 'Select',
        icon: 'fa-mouse-pointer',
        interactions: [
          this.ui.keyboardInter,
          this.ui.dragSelectInter,
          this.ui.selectInter,
          this.ui.translateInter
        ]
      }
      this.ui.defaultEdit = {
        name: 'Edit',
        icon: 'fa-pencil',
        interactions: [
          this.ui.keyboardInter,
          this.ui.selectInter,
          this.ui.dragSelectInter,
          this.ui.modifyInter
        ]
      }
      this.tools = [
        this.ui.defaultPan,
        this.ui.defaultSelect,
        this.ui.defaultEdit
      ]

      var noteStyleCache = {}
      var noteStyle = function (res) {
        var f = this
        var url = 'dist/static/images/placeholder.svg'
        if (f) {
          url = vm.getNoteUrl(f.get('note'))
        }
        if (!noteStyleCache[url]) {
          noteStyleCache[url] = new ol.style.Style({
            image: new ol.style.Icon({
              anchorOrigin: 'bottom-left',
              anchor: [0, 0],
              src: url
            })
          })
        }
        return noteStyleCache[url]
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
        onAdd: function (f) {
          if (f.get('note')) { return }
          f.set('note', $.extend({}, vm.note))
        }
      }
      var customAdd = function (f) {
        if (f.get('size')) { return }
        f.set('size', vm.size)
        if (f.get('colour')) { return }
        f.set('colour', vm.colour)
      }
      var vectorStyleCache = {
        'default': ol.style.defaultStyleFunction()
      }
      var vectorStyle = function (res) {
        var f = this
        var key = 'default'
        if (f) {
          key = f.get('size') + f.get('colour')
        }
        if (!vectorStyleCache[key]) {
          vectorStyleCache[key] = new ol.style.Style({
            fill: new ol.style.Fill({
              color: 'rgba(255, 255, 255, 0.2)'
            }),
            stroke: new ol.style.Stroke({
              color: f.get('colour'),
              width: 2 * f.get('size')
            })
          })
        }
        return vectorStyleCache[key]
      }
      this.ui.defaultLine = {
        name: 'Custom Line',
        icon: 'dist/static/images/iD-sprite.svg#icon-line',
        interactions: [this.ui.lineInter],
        showName: true,
        onAdd: customAdd,
        style: vectorStyle
      }
      this.ui.defaultPolygon = {
        name: 'Custom Area',
        icon: 'dist/static/images/iD-sprite.svg#icon-area',
        interactions: [this.ui.polyInter],
        showName: true,
        onAdd: customAdd,
        style: vectorStyle
      }

      // add annotations layer to catalogue list
      this.$root.catalogue.catalogue.push({
        type: 'Annotations',
        id: 'annotations',
        name: 'My Annotations'
      })
    }
  }
</script>

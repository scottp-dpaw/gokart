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
                  <a class="button"><i class="fa fa-upload" aria-hidden="true"></i> Import</a>
                  <a class="button"><i class="fa fa-download" aria-hidden="true"></i> Export</a>
                </div>
              </div>
            </div>

            <div v-if="tool.name.startsWith('Custom')" class="tool-slice row collapse">
              <div class="small-2"><label class="tool-label">Size:<br/>({{ size }})</label></div>
              <div class="small-10">
                <div class="expanded button-group">
                  <a @click="size = 1" v-bind:class="{'selected': size == 1}" class="button"><small>Small</small></a>
                  <a @click="size = 2" v-bind:class="{'selected': size == 2}" class="button">Medium</a>
                  <a @click="size = 4" v-bind:class="{'selected': size == 4}" class="button"><big>Large</big></a>
                </div>
              </div>
            </div>
            <div v-if="tool.name.startsWith('Custom')" class="tool-slice row collapse">
              <div class="small-2"><label class="tool-label">Colour:</label></div>
              <div class="small-10">
                <div class="expanded button-group">
                  <a v-for="c in colours" class="button" title="{{ c[0] }}" @click="colour = c[1]" v-bind:class="{'selected': c[1] == colour}"
                    v-bind:style="{ backgroundColor: c[1] }"></a>
                </div>
              </div>
            </div>

            <div v-if="tool.name == 'Text Note'" class="tool-slice row collapse">
              <div class="small-2">Note:</div>
              <div class="small-10">
                <textarea style="width:{{ note.width }}px;height:{{ note.height }}px;" @blur="drawNote(note, true)" class="notecontent" v-el:notecontent @keyup="updateNote($event.target)" @mouseup="updateNote($event.target)">{{ note.text }}</textarea>
              </div>
            </div>
            <div class="tool-slice row collapse">
              <div class="small-12 canvaspane">
                <canvas width="1000" height="1000" v-show="tool.name == 'Text Note'" v-el:textpreview></canvas>
              </div>
            </div>

          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<style>
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
  import { Vue } from 'src/vendor.js'
  import ol from '../ol-extras.js'

  Vue.filter('filterIf', function (list, prop, value) {
    if (!list) { return }
    return list.filter(function (val) {
      return val && val[prop] === value
    })
  })

  export default {
    data: function () {
      return {
        ui: {},
        tool: {},
        tools: [],
        features: new ol.Collection(),
        selectedFeatures: new ol.Collection(),
        featureOverlay: {},
        note: {
          style: 'general',
          text: "A cool note",
          width: 236,
          height: 100
        },
        notes: {},
        noteStyles: {
          'general': [
            ['drawRect', {
              fillStyle: '#fef6bb',
              strokeStyle: '#c4a000',
              x: 20, y: 20,
              width: '$eval:note.width',
              height: '$eval:note.height',
              cornerRadius: 4,
              fromCenter: false
            }],
            ['drawPath', {
              fillStyle: '#fef6bb',
              strokeStyle: '#c4a000',
              p1: {
                type: 'line',
                x1: 20.5, y1: 27.5,
                x2: 2.5, y2: 2.5,
                x3: 27.5, y3: 20.5
              }
            }],
            ['drawText', {
              fillStyle: '#000',
              fontSize: '12pt',
              text: '$eval:note.text',
              x: 30, y: 30,
              align: 'left',
              maxWidth: '$eval:note.width - 20',
              fromCenter: false
            }]
          ]
        },
        size: 2,
        colour: '#cc0000',
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
      setTool: function (t) {
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
      deleteSelected: function () {
        var vm = this
        this.selectedFeatures.forEach(function (feature) {
          vm.features.remove(feature)
        })
        this.selectedFeatures.clear()
      },
      updateNote: function(textarea) {
        this.note.text = textarea.value
        this.note.width = textarea.clientWidth
        this.note.height = textarea.clientHeight
        this.drawNote()
      },
      drawNote: function(save) {
        var vm = this
        var noteCanvas = this.$els.textpreview
        $(noteCanvas).clearCanvas()
        this.noteStyles[this.note.style].forEach(function(cmd) {
          var params = $.extend({}, cmd[1])
          Object.keys(params).forEach(function(key) {
            if (typeof params[key] === 'string' && params[key].startsWith('$eval:')) {
              params[key] = vm.$eval(params[key].replace('$eval:',''))
            }
          })
          $(noteCanvas)[cmd[0]](params)
        })
        if (save) {
          var key = JSON.stringify(this.note)
          // temp placeholder
          this.notes[key] = 'dist/static/images/placeholder.svg'
          noteCanvas.toBlob(function (blob) {
            // switch for actual image
            vm.notes[key] = window.URL.createObjectURL(blob)
            // FIXME: redraw stuff when savin blobs (broken in chrome)
            global.debounce(function() { vm.$root.map.olmap.updateSize() }, 100)
          }, 'image/png')
        }
      },
      getNoteUrl: function(note) {
        var key = JSON.stringify(note)
        if (!this.notes[key]) {
          this.note = $.extend({}, note)
          this.drawNote(true)
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
        var style = null
        if (feature.get('toolName')) {
          tool = vm.tools.filter(function (t) {
            return t.name === feature.get('toolName')
          })[0]
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

      // next three interacts are bundled into the Select tool
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
            switch (keyEvent.keyCode) {
              case 46: // Delete
                vm.deleteSelected()
                break
              default:
                break
            }
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
          this.ui.selectInter,
          this.ui.dragSelectInter,
          this.ui.modifyInter
        ]
      }
      this.tools = [
        this.ui.defaultPan,
        this.ui.defaultSelect
      ]

      var noteStyleCache = {}
      var noteStyle = function(res) {
        var f = this
        var url = 'dist/static/images/placeholder.svg'
        if (f) {
          url = vm.getNoteUrl(f.get('note'))
        }
        if (!noteStyleCache[url]) {
          noteStyleCache[url] = new ol.style.Style({
            image: new ol.style.Icon({
              anchor: [0, 0],
              anchorXUnits: 'fraction',
              anchorYUnits: 'fraction',
              opacity: 0.8,
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
          f.set('note', $.extend({}, vm.note))
        }
      }
      var customAdd = function (f) {
        f.set('size', vm.size),
        f.set('colour', vm.colour)
      }
      var vectorStyleCache = {
        'default': ol.style.defaultStyleFunction()
      }
      var vectorStyle = function(res) {
        var f = this
        var key = "default"
        if (f) {
          key = f.get('size') + f.get('colour')
        }
        if (!vectorStyleCache[key]) {
          vectorStyleCache[key] = new ol.style.Style({
            fill: new ol.style.Fill({
                color: "rgba(255, 255, 255, 0.2)"
            }),
            stroke: new ol.style.Stroke({
                color: f.get("colour"),
                width: 2 * f.get("size")
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

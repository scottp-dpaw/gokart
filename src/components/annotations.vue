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

            <div v-if="advanced" class="tool-slice row collapse">
              <div class="small-2"><label class="tool-label">Size:<br/>({{ size }})</label></div>
              <div class="small-10">
                <div class="expanded button-group">
                  <a @click="size = 8" v-bind:class="{'selected': size == 8}" class="button"><small>Small</small></a>
                  <a @click="size = 12" v-bind:class="{'selected': size == 12}" class="button">Medium</a>
                  <a @click="size = 16" v-bind:class="{'selected': size == 16}" class="button"><big>Large</big></a>
                </div>
              </div>
            </div>
            <div v-if="advanced" class="tool-slice row collapse">
              <div class="small-2"><label class="tool-label">Colour:</label></div>
              <div class="small-10">
                <div class="expanded button-group">
                  <a v-for="c in colours" class="button" title="{{ c[0] }}" @click="colour = c[1]" v-bind:class="{'selected': c[1] == colour}"
                    v-bind:style="{ backgroundColor: c[1] }"></a>
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
            <div v-if="tool.name == 'Sector Note'" class="tool-slice row collapse">
              <div class="small-2">Note:</div>
              <div class="small-10">
                <textarea class="notecontent" v-model="noteContent">Placeholder note</textarea>
              </div>
            </div>
            <canvas v-show="tool.name == 'Sector Note'" v-el:textpreview></canvas>
          </div>

        </div>
      </div>
    </div>

  </div>
</template>

<style>
  textarea.notecontent {
    width: 236px;
    height: 100px;
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
        noteContent: "A cool note",
        notes: {},
        noteStyles: {
          'general': [
            ['drawRect', {
              fillStyle: '#fef6bb',
              strokeStyle: '#c4a000',
              x: 20, y: 20,
              width: 256,
              height: 100,
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
              text: 'The quick brown fox jumps over the lazy dog.',
              x: 30, y: 30,
              align: 'left',
              maxWidth: 236,
              fromCenter: false
            }]
          ]
        },
        size: 12,
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
      drawNote: function(style, text, save) {
        var vm = this
        var key = style + text
        var noteCanvas = this.$els.textpreview
        $(noteCanvas).clearCanvas()
        this.noteStyles[style].forEach(function(cmd) {
          if (cmd[1].text) {
            cmd[1].text = text
          }
          $(noteCanvas)[cmd[0]](cmd[1])
        })
        if (save) {
          noteCanvas.toBlob(function (blob) {
            vm.notes[key] = window.URL.createObjectURL(blob) 
          }, 'image/png')
        }
      },
      getNoteUrl: function(style, text) {
        var key = style + text
        if (!this.notes[key]) { 
          this.drawNote(style, text, true) 
        }
        return this.notes[key] || 'static/images/placeholder.svg'
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
          style = vm.tools.filter(function (t) {
            return t.name === feature.get('toolName')
          })[0].style
        } else {
          feature.set('toolName', vm.tool.name)
          style = vm.tool.style
        }
        feature.setStyle(style || null)
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
      this.ui.defaultPoint = {
        name: 'Point',
        icon: 'static/images/iD-sprite.svg#icon-point',
        interactions: [this.ui.pointInter]
      }
      this.ui.defaultLine = {
        name: 'Line',
        icon: 'static/images/iD-sprite.svg#icon-line',
        interactions: [this.ui.lineInter]
      }
      this.ui.defaultPolygon = {
        name: 'Polygon',
        icon: 'static/images/iD-sprite.svg#icon-area',
        interactions: [this.ui.polyInter]
      }

      // add annotations layer to catalogue list
      this.$root.catalogue.catalogue.push({
        type: 'Annotations',
        id: 'annotations',
        name: 'My Annotations'
      })
    },
    watch: {
      noteContent: function(value, oldValue) {
        var style = 'general'
        this.drawNote(style, value, true)
      }
    }
  }
</script>

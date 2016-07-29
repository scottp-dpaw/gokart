<template>
  <div id="info" v-bind:style="css" v-show="features" v-cloak>
    <div class="row collapse">
      <div class="columns title">
        <h5>{{ featuresLength }} {{ featuresLength | pluralize 'feature' }} <small>{{ coordinate }}</small></h5>
      </div>
      <button class="close-button float-right" aria-label="Dismiss info" type="button" v-on:click="features = false"><span aria-hidden="true">&times;</span></button>
    </div>
    <div class="row">
      <div class="columns content">
        <div v-for="f in features" class="row feature-row" v-bind:class="{'device-selected': selected(f) }" track-by="get('id')">
          <div v-if="f.get('partialId') !== 'resourceInfo'" class="columns">{{ f.getId() }}</div>
          <div v-if="f.get('partialId') === 'resourceInfo'" class="columns">
            <div class="feature-title"><img class="feature-icon" v-bind:src="$root.$refs.app.getBlob(f, ['icon', 'tint'])" /> {{ f.get('label') }} <i><small>seen {{ ago(f.get('seen')) }}</small></i></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
  .feature-icon {
    width: 24px;
    height: 24px;
  }
</style>

<script>
  import { ol, moment } from 'src/vendor.js'
  export default {
    data: function () {
      return {
        enabled: false,
        features: false,
        coordinate: '',
        offset: 20,
        pixel: [0, 0]
      }
    },
    // parts of the template to be computed live
    computed: {
      featuresLength: function () {
        return Object.keys(this.features).length
      },
      // info panel should be positioned near the mouse in the quadrant furthest away from the viewport edges
      css: function () {
        var map = this.$root.map
        var css = {
          'left': this.pixel[0] + this.offset + 'px',
          'top': this.pixel[1] + this.offset + 'px',
          'bottom': map.height - this.pixel[1] + this.offset + 'px',
          'right': map.width - this.pixel[0] + this.offset + 'px',
          'display': 'none'
        }
        if (this.pixel[0] < map.width / 2) {
          delete css.right
        } else {
          delete css.left
        }
        if (this.pixel[1] < map.height / 2) {
          delete css.bottom
        } else {
          delete css.top
        }
        if (this.pixel[0] > 0 && this.enabled) {
          delete css.display
        }
        return css
      }
    },
    // methods callable from inside the template
    methods: {
      ago: function (time) {
        return moment(time).fromNow()
      },
      // update the panel content
      onPointerMove: function (event) {
        if (event.dragging || !this.enabled) {
          return
        }
        var pixel = this.$root.map.olmap.getEventPixel(event.originalEvent)
        var features = []
        this.$root.map.olmap.forEachFeatureAtPixel(pixel, function (f) {
          features.push(f)
        })
        if (features.length > 0) {
          this.features = features
          this.coordinate = ol.coordinate.toStringXY(this.$root.map.olmap.getCoordinateFromPixel(pixel), 3)
          this.pixel = pixel
        } else {
          // hide when no features
          this.pixel.$set(0, 0)
        }
      },
      selected: function (f) {
        return this.$root.annotations.selectedFeatures.getArray().indexOf(f) > -1
      }
    },
    ready: function () {
      this.$on('gk-init', function () {
        // display hover popups
        this.$root.map.olmap.on('pointermove', this.onPointerMove)
      })
    }
  }
</script>

import 'foundation-sites/dist/foundation-flex.css'
import 'font-awesome/css/font-awesome.css'
import 'openlayers/dist/ol-debug.css'
import 'dragula/dist/dragula.css'

import $ from 'jquery'
import 'foundation-sites'
import svg4everybody from 'svg4everybody'
import ol from 'openlayers/dist/ol-debug.js'
import Vue from 'vue'
import App from './sss.vue'


global.$ = $
global.ol = ol

/* eslint-disable no-new */
new Vue({
  el: 'body',
  components: {
    App
  },
  ready: function () {
    $(document).foundation()
    svg4everybody()
    // bind menu side-tabs to reveal the side pane
    var offCanvasLeft = $('#offCanvasLeft')
    $('#menu-tabs').on('change.zf.tabs', function (ev) {
      offCanvasLeft.addClass('reveal-responsive')
      // self.map.updateSize()
    }).on('click', '.tabs-title a[aria-selected=false]', function (ev) {
      offCanvasLeft.addClass('reveal-responsive')
      $(this).attr('aria-selected', true)
      // self.map.updateSize()
    }).on('click', '.tabs-title a[aria-selected=true]', function (ev) {
      offCanvasLeft.removeClass('reveal-responsive')
      $(this).attr('aria-selected', false)
      // self.map.updateSize()
    })
    $('#side-pane-close').on('click', function (ev) {
      offCanvasLeft.removeClass('reveal-responsive')
      $('#menu-tabs').find('.tabs-title a[aria-selected=true]').attr('aria-selected', false)
      // self.map.updateSize()
    })
  }
})

// module for packaging up gokart's third-party dependencies

// produce some terrifying CSS at runtime using browserify-css
import 'tether-shepherd/dist/css/shepherd-theme-dark.css'
import 'foundation-sites/dist/foundation-flex.css'
import 'openlayers/dist/ol-debug.css'
import 'dragula/dist/dragula.css'

// jQuery v2, the krazy glue of the internet
import $ from 'jquery'
// jCanvas mod to canvas operations
require('jcanvas')($, window)
// OpenLayers 3 map widget, including our extensions
import ol from 'src/ol-extras.js'
// Vue.js template engine
import Vue from 'vue'
// Extension for easy cross-component sharing
import VueStash from 'vue-stash'
// Foundation 6 CSS framework
import 'foundation-sites'
// IE9+ support for SVG sprites
import svg4everybody from 'svg4everybody'
// Cross-browser support for saving blobs from a webpage
import { saveAs } from 'filesaverjs'
// QR code generator
import kjua from 'kjua'
// Timestamp parsing library
import moment from 'moment'
// Drag and drop support
import dragula from 'dragula'
// Data storage engine
import localforage from 'localforage'
// Guided tour lib
import Shepherd from 'tether-shepherd'

export {
  $,
  ol,
  Vue,
  VueStash,
  svg4everybody,
  saveAs,
  kjua,
  moment,
  dragula,
  localforage,
  Shepherd
}

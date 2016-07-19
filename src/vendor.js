import 'foundation-sites/dist/foundation-flex.css'
import 'font-awesome/css/font-awesome.css'
import 'openlayers/dist/ol-debug.css'
import 'dragula/dist/dragula.css'

import $ from 'jquery'
require('jcanvas')($, window)
import 'foundation-sites'
import svg4everybody from 'svg4everybody'
import { saveAs } from 'filesaverjs'
import kjua from 'kjua'
import ol from 'openlayers/dist/ol-debug.js'
import moment from 'moment'
import Vue from 'vue'
import VueStash from 'vue-stash'
import dragula from 'dragula'
import localforage from 'localforage' 

export {
  $,
  svg4everybody,
  saveAs,
  kjua,
  ol,
  moment,
  Vue,
  VueStash,
  dragula,
  localforage
}

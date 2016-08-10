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
// Cross-browser support for saving blobs from a webpage
import { saveAs as fileSaveAs} from 'filesaverjs'
// Cross-browser polyfill for canvas.toBlob
require('blueimp-canvas-to-blob')
// Cross-browser polyfill for ES6
import 'babel-polyfill'
// OpenLayers 3 map widget, including our extensions
import ol from 'src/ol-extras.js'
// proj4 reprojection lib
import proj4 from 'proj4'
// Vue.js template engine
import Vue from 'vue'
// Extension for easy cross-component sharing
import VueStash from 'vue-stash'
// Foundation 6 CSS framework
import 'foundation-sites'
// IE9+ support for SVG sprites
import svg4everybody from 'svg4everybody'
// QR code generator
import kjua from 'kjua'
// Timestamp parsing library
import moment from 'moment'
// Drag and drop support
import dragula from 'dragula'
// Data storage engine
import localforage from 'localforage'
// attach elements to eachother
import Tether from 'tether'
// Guided tour lib
import Shepherd from 'tether-shepherd'

var saveAs = function (blob,name,no_auto_bom) {
    if (window.location.protocol == "file:") {
        var formData = new window.FormData();
        formData.append('file', blob, name);
        var req = new window.XMLHttpRequest();
        req.open('POST', gokartService + '/saveas');
        req.responseType = 'text';
        req.onload = function (event) {
            var fetchUrl = req.responseText;
            window.open(fetchUrl,"_system");
        };
        req.send(formData);
    } else {
        fileSaveAs(blob,name,no_auto_bom);
    }
}

export {
  $,
  ol,
  proj4,
  Vue,
  VueStash,
  svg4everybody,
  saveAs,
  kjua,
  moment,
  dragula,
  localforage,
  Tether,
  Shepherd
}

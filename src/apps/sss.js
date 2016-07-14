window.$ = window.jQuery = require('jquery');
import 'foundation-sites'
import svg4everybody from 'svg4everybody'
import Vue from 'vue'
import App from './sss.vue'

/* eslint-disable no-new */
new Vue({
  el: 'body',
  components: { App },
  onready: function () {
    $(document).foundation();
    svg4everybody();
  }
})


<template>
  <div class="tabs-panel" id="menu-tab-layers">
    <div class="row collapse">
      <div class="columns">
        <ul class="tabs" data-tabs id="layers-tabs">
          <li class="tabs-title is-active"><a href="#layers-active" aria-selected="true">Active</a></li>
          <li class="tabs-title"><a href="#layers-catalogue">Browse Layers</a></li>
          <li class="tabs-title"><a href="#layers-export">Download & Print</a></li>
        </ul>
      </div>
    </div>
    <div class="row collapse" id="layers-tab-panels">
      <div class="columns">
        <div class="tabs-content vertical" data-tabs-content="layers-tabs">
          <gk-active v-ref:active></gk-active>
          <gk-catalogue v-ref:catalogue></gk-catalogue>
          <gk-export v-ref:export></gk-export>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
  import Vue from 'vue'
  import gkActive from './layers/active.vue'
  import gkCatalogue from './layers/catalogue.vue'
  import gkExport from './layers/export.vue'

  Vue.filter('filterIf', function (list, prop, value) {
    if (!list) { return }
    return list.filter(function (val) {
      return val && val[prop] === value
    })
  })

  export default { components: { gkActive, gkCatalogue, gkExport } }
</script>

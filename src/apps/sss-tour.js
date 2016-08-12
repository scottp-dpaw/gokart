import { $, Shepherd, Vue } from 'src/vendor.js'

let tour = new Shepherd.Tour({
  defaults: {
    classes: 'shepherd-theme-dark',
    scrollTo: false
  }
})

// Change this to prompt tour again
tour.version = 0.1

global.tour = tour

tour.on('cancel', function () {
  global.gokart.touring = false
})

tour.addStep('welcome', {
  text: 'Would you like a tour of the Spatial Support System? If you exit now, you can always rerun the tour by clicking "Reset SSS" in <b>Layers > Download & Print</b>',
  buttons: [
    {
      text: 'Exit',
      classes: 'shepherd-button-secondary',
      action: tour.cancel
    },
    {
      text: 'Next',
      action: tour.next
    }
  ]
}).addStep('map-controls', {
  text: 'At the top right are common map controls for setting a scale, fullscreen and zooming',
  attachTo: '.ol-zoom bottom',
  when: {
    'show': function () {
      global.gokart.map.animatePan([116, -32])
      global.gokart.map.animateZoom(global.gokart.map.resolutions[9])
    }
  }
}).addStep('map-search', {
    text: 'There is also a search box with support for coordinates and place names. <br/><b>Try out some of these!</b><ul><li>Upper Swan</li><li>32.00858S 115.53978E</li><li>115° 38′ 58.0″ E, 33° 20′ 52.8″ S</li><li>MGA 50 718776mE 6190981mN</li><li>MGA50 3816452</li><li>FD ET 79</li></ul>',
    attachTo: '#map-search left'
}).addStep('menu', {
  text: 'To the left are the interactive panes for <b>Layers</b>, <b>Annotations</b> and <b>Vehicle Tracking</b>.',
  attachTo: '#menu-tab-layers-label right'
}).addStep('layers', {
  text: 'The layers pane lets you find, organise and print what is visible on the map',
  attachTo: '#menu-tab-layers-label right',
}).addStep('catalogue', {
  text: 'The catalogue in <b>Browse Layers</b> lets you add layers to the map. Layers can be found by typing into the search box.',
  attachTo: '#menu-tab-layers-label right',
  when: {
    'before-show': function () {
      $('#layers-catalogue-label').click()
    }
  }
}).addStep('catalogue-toggle', {
  text: 'Clicking a layers switch will add it ontop of other map layers',
  attachTo: '#menu-tab-layers-label right',
  when: {
    'before-show': function () {
      $('#find-layer').val('tenure').change()
      Vue.nextTick(function () {
        $('#layers-catalogue-list .switch-input').click()
        $('#find-layer').val('land').change()
      })
    }
  }
}).addStep('active', {
  text: 'The map layers in Active lets you configure layers already on the map.',
  attachTo: '#menu-tab-layers-label right',
  when: {
    'before-show': function () {
      $('#layers-active-label').click()
    }
  }
}).addStep('active-opacity', {
  text: 'Clicking a layer opens its configuration panel, from which you can adjust opacity and other settings.',
  attachTo: '#menu-tab-layers-label right',
  when: {
    'before-show': function () {
      $('div[data-id="dpaw:resource_tracking_live"]').click()
      Vue.nextTick(function () {
        $('#layer-config input.layer-opacity').val(30).change()
      })
    }
  }
}).addStep('active-remove', {
  text: 'You can also reorder layers using drag and drop, and remove a layer by clicking the red X',
  attachTo: '#menu-tab-layers-label right',
  when: {
    'before-show': function () {
      // vue doesn't pickup <a> clicks from jquery, use dom method
      $('div[data-id="dpaw:resource_tracking_live"] a.remove-layer').get(0).click()
    }
  }
}).addStep('annotations', {
  text: 'The <b>Annotations</b> pane lets you draw features onto the map.',
  attachTo: '#menu-tab-annotations-label right',
  when: {
    'before-show': function () {
      $('#menu-tab-annotations-label').click()
    }
  }
}).addStep('annotations-text', {
  text: 'Some of the tools have additional configuration options. Text notes are even able to be resized.',
  attachTo: '#menu-tab-annotations-label right',
  when: {
    'before-show': function () {
      $('a[title="Text Note"]').get(0).click()
      Vue.nextTick(function () {
        $('textarea.notecontent').height(60).val('Like this one where you\ncan set the text of a note').get(0).click()
        // the click above should cache the feature image ready to place on map
        global.exampleFeature = new global.ol.Feature({ geometry: new global.ol.geom.Point(global.gokart.map.getCenter()) })
      })
    }
  }
}).addStep('annotations-draw', {
  text: 'Clicking on the map will place a feature',
  attachTo: '#menu-tab-annotations-label right',
  when: {
    'before-show': function () {
      Vue.nextTick(function () {
        global.gokart.annotations.features.push(global.exampleFeature)
      })
    }
  }
}).addStep('tracking', {
  text: 'The Tracking pane is used to find and filter the vehicles displayed on the map. (END TOUR, will reload now)',
  attachTo: '#menu-tab-tracking-label right',
  when: {
    'before-show': function () {
      $('#menu-tab-tracking-label').click()
    },
    'hide': function () {
      document.location.reload()
    }
  }
})

export default tour

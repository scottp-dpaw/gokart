import { $, Shepherd } from 'src/vendor.js'

let tour = new Shepherd.Tour({
  defaults: {
    classes: 'shepherd-theme-dark',
    scrollTo: false
  }
})

tour.addStep('welcome', {
  text: 'Would you like a tour of the Spatial Support System?',
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
    text: 'At the top right are common map controls for zooming, setting a scale, and fullscreen',
    attachTo: '.ol-zoom bottom'
}).addStep('menu', {
    text: 'To the left are the interactive panes for Layers, Annotations and Resource Tracking.',
    attachTo: '#menu-tab-layers-label right'
}).addStep('layers', {
    text: 'The layers pane lets you find, organise and print what is visible on the map',
    attachTo: '#menu-tab-layers-label right',
    when: {
        "before-show": function() {
            document.querySelector("#menu-tab-layers-label").click()
        }
    }
}).addStep('catalogue', {
    text: 'The catalogue in Browse Layers lets you add layers to the map. Layers can be found by typing into the search box.',
    attachTo: '#menu-tab-layers-label right',
    when: {
        "before-show": function() {
            document.querySelector("#layers-catalogue-label").click()
        }
    }
}).addStep('catalogue', {
    text: 'Clicking a layers switch will add it ontop of other map layers',
    attachTo: '#menu-tab-layers-label right',
    when: {
        "before-show": function() {
            $("#find-layer").val('BOM Rain').change()
            $("#layers-catalogue-list .switch-input").click()
            $("#find-layer").val('BOM').change()
        }
    }
})

export default tour
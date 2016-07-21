import { $, Shepherd, Vue } from 'src/vendor.js'

let tour = new Shepherd.Tour({
  defaults: {
    classes: 'shepherd-theme-dark',
    scrollTo: false
  }
})

tour.addStep('welcome', {
  text: 'Would you like a tour of the Spatial Support System? If you exit now, you can always rerun the tour by clicking "Reset SSS" in Layers > Download & Print',
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
    attachTo: '.ol-zoom bottom',
    when: {
        "before-show": function() {
            gokart.map.setScale(10000)
        }
    }
}).addStep('menu', {
    text: 'To the left are the interactive panes for Layers, Annotations and Resource Tracking.',
    attachTo: '#menu-tab-layers-label right'
}).addStep('layers', {
    text: 'The layers pane lets you find, organise and print what is visible on the map',
    attachTo: '#menu-tab-layers-label right',
    when: {
        "before-show": function() {
            $("#menu-tab-layers-label").click()
        }
    }
}).addStep('catalogue', {
    text: 'The catalogue in Browse Layers lets you add layers to the map. Layers can be found by typing into the search box.',
    attachTo: '#menu-tab-layers-label right',
    when: {
        "before-show": function() {
            $("#layers-catalogue-label").click()
        }
    }
}).addStep('catalogue-toggle', {
    text: 'Clicking a layers switch will add it ontop of other map layers',
    attachTo: '#menu-tab-layers-label right',
    when: {
        "before-show": function() {
            $("#find-layer").val('radar rain').change()
            Vue.nextTick(function() {
                $("#layers-catalogue-list .switch-input").click()
                $("#find-layer").val('bom').change()
            })
        }
    }
}).addStep('active', {
    text: 'The map layers in Active lets you configure layers already on the map.',
    attachTo: '#menu-tab-layers-label right',
    when: {
        "before-show": function() {
            $("#layers-active-label").click()
        }
    }
}).addStep('active-opacity', {
    text: 'Clicking a layer opens its configuration panel, from which you can adjust opacity and other settings.',
    attachTo: '#menu-tab-layers-label right',
    when: {
        "before-show": function() {
            $("div[data-id='dpaw:resource_tracking_live']").click()
            Vue.nextTick(function() {
                $("#layer-config input.layer-opacity").val(30).change()
            })
            
        }
    }
}).addStep('active-remove', {
    text: 'You can also reorder layers using drag and drop, and remove a layer by clicking the red X',
    attachTo: '#menu-tab-layers-label right',
    when: {
        "before-show": function() {
            // vue doesn't pickup <a> clicks from jquery, use dom method
            $("div[data-id='dpaw:resource_tracking_live'] a.remove-layer").get(0).click()
        }
    }
}).addStep('annotations', {
    text: 'The Annotations pane lets you draw features onto the map.',
    attachTo: '#menu-tab-annotations-label right',
    when: {
        "before-show": function() {
            $("#menu-tab-annotations-label").click()
        }
    }
}).addStep('annotations-text', {
    text: 'Some of the tools have additional configuration options. Text notes are even able to be resized.',
    attachTo: '#menu-tab-annotations-label right',
    when: {
        "before-show": function() {
            $("a[title='Text Note']").get(0).click()
            Vue.nextTick(function() {
                $('textarea.notecontent').height(60).val('Like this one where you\ncan set the text of a note').get(0).click()
                // the click above should cache the feature image ready to place on map
                global.exampleFeature = new ol.Feature({geometry: new ol.geom.Point(gokart.map.olmap.getView().getCenter())})
            })
        }
    }
}).addStep('annotations-draw', {
    text: 'Clicking on the map will place a feature',
    attachTo: '#menu-tab-annotations-label right',
    when: {
        "before-show": function() {
            Vue.nextTick(function() {
                gokart.annotations.features.push(global.exampleFeature)
            })
        }
    }
}).addStep('tracking', {
    text: 'The Tracking pane is used to find and filter the vehicles displayed on the map. (END TOUR, will reload now)',
    attachTo: '#menu-tab-tracking-label right',
    when: {
        "before-show": function() {
            $("#menu-tab-tracking-label").click()
        },
        'hide': function() {
            localforage.removeItem('sssOfflineStore').then(function() {
                document.location.reload()
            })
        }
    }
})

export default tour
<template>
    <input id="map-search" class="map-control" placeholder="Search (places, °, MGA, FD)" @keyup="searchKeyFix($event)"/>
    <button id="map-search-button" class="map-control" @click="runSearch"><i class="fa fa-search"></i></button>
</template>

<style>

#map-search.alert, #map-search-button.alert {
    background-color: rgba(125, 47, 34, 0.7);
}

#map-search:hover.alert, #map-search-button:hover.alert {
    background-color: rgba(125, 47, 34, 0.9);
}

#map-search.success, #map-search-button.success {
    background-color: rgba(53, 94, 26, 0.7);
}

#map-search:hover.success, #map-search-button:hover.success {
    background-color: rgba(53, 94, 26, 0.9);
}

</style>

<script>
  import { $, ol } from 'src/vendor.js'
  export default {
    store: ['defaultWFSSrc', 'gokartService', 'resolutions'],
    data: function () {
      return {}
    },
    methods: {
      searchKeyFix: function (ev) {
        // run a search after pressing enter
        if (ev.keyCode == 13) { this.runSearch() } 
      },
      clearSearchPoint: function () {
        this.features.clear()
      },
      setSearchPoint: function (coords, name) {
        this.features.clear()
        this.features.push(new ol.Feature({
          geometry: new ol.geom.Point(coords),
          name: name
        }))
      },
      runSearch: function () {
        var vm = this
        var map = this.$root.map
        $('#map-search, #map-search-button').removeClass('alert success')
        var query = $("#map-search").get(0).value
        if (!query) { 
          this.clearSearchPoint()
          return 
        }

        var victory = function (coords, name) {
          $('#map-search, #map-search-button').addClass('success')
          map.animatePan(coords)
          map.animateZoom(vm.resolutions[10])
          vm.setSearchPoint(coords, name)
          //console.log([name, coords[0], coords[1]])
        }

        var failure = function (reason) {
          $('#map-search, #map-search-button').addClass('alert')
          //console.log(reason)
        }


        // check for EPSG:4326 coordinates
        var dms = map.parseDMSString(query)
        if (dms) {
          victory(dms, map.getDMS(dms))
          return
        }
    
        // check for MGA coordinates
        var mga = map.parseMGAString(query)
        if (mga) {
          victory(mga.coords, map.getMGA(mga.coords))
          return
        }

        // check for Grid Reference
        var gd = map.parseGridString(query)
        if (gd) {
          if (gd.gridType === 'FD') {
            this.queryFD(gd.gridNorth+' '+gd.gridEast, victory, failure)
            return
          } else {
            this.queryPIL(gd.gridNorth+gd.gridEast, victory, failure)
          }
        }

        // failing all that, ask mapbox
        this.queryGeocode(query, victory, failure)
        
      },
      queryFD: function(fdStr, victory, failure) {
        var vm = this
        $.ajax({
          url: vm.defaultWFSSrc + '?' + $.param({
            version: '1.1.0',
            service: 'WFS',
            request: 'GetFeature',
            outputFormat: 'application/json',
            srsname: 'EPSG:4326',
            typename: 'cddp:fd_grid_points_mapping',
            cql_filter: '(fdgrid = \''+fdStr+'\')'
          }),
          dataType: 'json',
          xhrFields: {
            withCredentials: true
          },
          success: function(data, status, xhr) {
            if (data.features.length) {
              victory(data.features[0].geometry.coordinates, "FD "+fdStr)
            } else {
              failure('No Forest Department Grid reference found for '+fdStr)
            }
          }
        })
      },
      queryPIL: function(pilStr, victory, failure) {
        var vm = this
        $.ajax({
          url: vm.defaultWFSSrc + '?' + $.param({
            version: '1.1.0',
            service: 'WFS',
            request: 'GetFeature',
            outputFormat: 'application/json',
            srsname: 'EPSG:4326',
            typename: 'cddp:pilbara_grid_10km_mapping',
            cql_filter: '(grid = \''+pilStr+'\')'
          }),
          dataType: 'json',
          xhrFields: {
            withCredentials: true
          },
          success: function(data, status, xhr) {
            if (data.features.length) {
              victory(data.features[0].geometry.coordinates, "PIL "+pilStr)
            } else {
              failure('No Pilbara Grid reference found for '+pilStr)
            }
          }
        })
      },
      queryGeocode: function(geoStr, victory, failure) {
        var vm = this
        var center = this.$root.map.getCenter()
        $.ajax({
          url: vm.gokartService
            +'/mapbox/geocoding/v5/mapbox.places/'+geoStr+'.json?' + $.param({
            country: 'au',
            types: 'country,region,postcode,place,locality,address',
            proximity: ''+center[0]+','+center[1]
          }),
          dataType: 'json',
          xhrFields: {
            withCredentials: true
          },
          success: function(data, status, xhr) {
            if (data.features.length) {
              var feature = data.features[0]
              victory(feature.center, feature.text)
            } else {
              failure('No location match found for '+geoStr)
            }
          }
        })
      }
    },
    ready: function () {
      var vm = this
      var map = this.$root.map

      this.style = function (feature, resolution) {
        return new ol.style.Style({
          image: new ol.style.Circle({
            radius: 5,
            fill: new ol.style.Fill({
              color: 'rgb(255, 255, 255)'
            }),
            stroke: new ol.style.Stroke({
              width: 2,
              color: 'rgb(114, 193, 0)'
            }),
          }),
          text: new ol.style.Text({
            offsetX: 12,
            text: feature.get('name'),
            textAlign: 'left',
            font: '12px Helvetica,Roboto,Arial,sans-serif',
            stroke: new ol.style.Stroke({
              color: '#fff',
              width: 4
            })
          })
        })
      }

      this.features = new ol.Collection()
      this.source = new ol.source.Vector({
        features: this.features
      })
      this.overlay = new ol.layer.Vector({
        source: this.source,
        style: this.style
      })

      this.$on('gk-init', function () {
        this.overlay.setMap(map.olmap)
      })
    }
  }


</script>

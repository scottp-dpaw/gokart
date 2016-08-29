var env = {
    envType:"uat",
    appType: (window.location.protocol == "file:")?"cordova":"webapp",
    cswService:"https://oim-uat.dpaw.wa.gov.au/catalogue/api/records",
    wmtsService:"https://kmi-uat.dpaw.wa.gov.au/geoserver/gwc/service/wmts",
    wfsService:"https://kmi-uat.dpaw.wa.gov.au/geoserver/wfs",
    legendSrc:"https://kmi-uat.dpaw.wa.gov.au/geoserver/gwc/service/wms?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png&LAYER=",
    gokartService:"https://gokart-uat.dpaw.wa.gov.au",
    oimService:"https://oim-uat.dpaw.wa.gov.au",
    sssService:"https://sss-uat.dpaw.wa.gov.au",
    staticService:"https://static-uat.dpaw.wa.gov.au"
};

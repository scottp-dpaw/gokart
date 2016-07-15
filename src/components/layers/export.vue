<template>
    <div class="tabs-panel" id="layers-export" v-cloak>
        <div id="map-export-controls">
            <div class="tool-slice row collapse">
                <div class="small-3">
                    <label class="tool-label">Name:</label>
                </div>
                <div class="small-9">
                    <input id="export-name" type="text" v-model="title" />
                </div>
            </div>
            <div class="tool-slice row collapse">
                <div class="small-3">
                    <label class="tool-label">Paper size:</label>
                </div>
                <div class="small-9">
                    <select v-model="paperSize">
                                        <option v-for="size in paperSizes" v-bind:value="$key">ISO {{ $key }} ({{ size[0] }}mm &times; {{ size[1] }}mm)</option>
                                    </select>
                </div>
            </div>
            <div class="tool-slice row collapse">
                <div class="small-3">
                    <label class="tool-label">Download:</label>
                </div>
                <div class="small-9">
                    <div class="expanded button-group">
                        <a class="button" title="JPG for quick and easy printing" @click="print('jpg')"><i class="fa fa-file-image-o"></i> JPG</a>
                        <a class="button" title="Geospatial PDF for use in PDF Maps and Adobe Reader" @click="print('pdf')"><i class="fa fa-print"></i> PDF</a>
                        <a class="button" title="GeoTIFF for use in QGIS on the desktop" @click="print('tif')"><i class="fa fa-picture-o"></i> TIF</a>
                    </div>
                </div>
            </div>
            <div class="hide" id="legendsvg"></div>
        </div>
    </div>
</template>
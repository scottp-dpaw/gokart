<template>
        <div id="resourceInfo" class="hide">
        <div class="columns">
            <div class="feature-title"><img v-bind:src="f.get('icon')" /> {{ f.get('label') }} <small>({{ f.get('deviceid') }})</small></div>
            <small>{{ f.get('time') }}</small>
        </div>
    </div>
</template>
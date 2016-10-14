<template>
    <div id="loading-status-overlay" v-if="loading">
    </div>
    <div id="loading-status" v-if="loading">
      <div class="row" >
        <div class="small-12">
            <a @click="close" class="close"><i class="fa fa-close" aria-hidden="true"></i></a>
        </div>
      </div>
      <div v-for="status in allStatus" class="row" track-by="key" >
        <div class="small-2">
        </div>
        <div class="small-4">
            <a class="component">{{status.key}} </a>
        </div>
        <div class="small-2">
        </div>
        <div class="small-3">
            <a v-if="status.progress >= 0 && status.progress < 100 && !status.waiting" class="float-right"><i class="fa fa-spinner" aria-hidden="true"></i></a>
            <a v-if="status.progress >= 0 && status.progress < 100 && status.waiting" class="float-right"><i class="fa fa-pause" aria-hidden="true"></i></a>
            <a class="action" v-if="status.progress >= 0">{{status.action}}</a>
            <a class="error" v-if="status.progress < 0">{{status.reason}}</a>
        </div>
        <div class="small-1">
        </div>
      </div>
    </div>
</template>

<style>
#loading-status-overlay {
    position: absolute;
    top: 0%;
    left: 0%;
    width: 100%;
    height: 100%;
    background-color: white;
    opacity: 0;
    z-index:2147483646;
}
#loading-status {
    position: absolute;
    top: 10%;
    left: 10%;
    width: 80%;
    background-color: rgba(0,0,0,0);
    opacity: 1;
    z-index:2147483647;
}
#loading-status .error {
    color: #ec5840;
    font-weight: bold;
}
#loading-status .close {
    color: black;
    display:none;
}
</style>

<script>
  import { $,Vue } from 'src/vendor.js'
  export default {
    store: ['catalogueFilters', 'defaultLegendSrc','oimService'],
    data: function () {
      return {
        allStatus:[],
        loading:true,
      }
    },
    computed: {
    },
    methods: {
      close:function() {
          $("#loading-status-overlay").remove()
          $("#loading-status").remove()
      },
      indexOfStatus:function(key) {
        for(var i = 0; i < this.allStatus.length;i++) {
            if (key === this.allStatus[i].key) {
                return i
            }
        }
        return -1
      },
      begin:function(key,action) {
        var i = this.indexOfStatus(key)
        if (i == -1) {
            this.allStatus.push({"key":key,"progress":0,"action":action || "Initialize"})
        } else {
            this.allStatus[i].progress = 0
            this.allStatus[i].action = action || "Initialize"
            Vue.set(this.allStatus,i,this.allStatus[i])
        }
      },
      progress:function(key,progress,action) {
        var i = this.indexOfStatus(key)
        if (i != -1) {
            this.allStatus[i].progress = progress
            this.allStatus[i].action = action || "Initialize"
            this.allStatus[i].waiting = false
            Vue.set(this.allStatus,i,this.allStatus[i])
        }
      },
      wait:function(key,progress,action) {
        var i = this.indexOfStatus(key)
        if (i != -1) {
            this.allStatus[i].progress = progress
            this.allStatus[i].action = action?("Waiting " + action):"Waiting"
            this.allStatus[i].waiting = true
            Vue.set(this.allStatus,i,this.allStatus[i])
        }
      },
      end:function(key) {
        var i = this.indexOfStatus(key)
        if (i != -1) {
            this.allStatus[i].progress = 100
            this.allStatus[i].waiting = false
            this.allStatus[i].action = "OK"
            Vue.set(this.allStatus,i,this.allStatus[i])
        }
      },
      failed:function(key,reason) {
        var i = this.indexOfStatus(key)
        if (i != -1) {
            this.allStatus[i].progress = -1
            this.allStatus[i].reason = reason || ""
            this.allStatus[i].waiting = false
            Vue.set(this.allStatus,i,this.allStatus[i])
        }
      },
      completed:function(){
        this.loading = false
        $("#loading-status .close").show()
      }
    },
    ready: function () {
    }
  }
</script>

<template>
    <div id="loading-status-overlay" v-if="show">
    <div id="loading-status" v-if="show">
      <div class="row" >
        <div class="small-11">
            <h4>Status</h4>
        </div>
        <div class="small-1">
            <a @click="close" class="close"><i class="fa fa-close" aria-hidden="true"></i></a>
        </div>
      </div>
      <div v-for="status in allStatus" class="row" track-by="key" >
        <div class="small-6">
            <a class="component">{{status.key}} </a>
        </div>
        <div class="small-6">
            <a v-if="status.progress >= 0 && status.progress < 100 && !status.waiting" class="float-right"><i class="fa fa-spinner" aria-hidden="true"></i></a>
            <a v-if="status.progress >= 0 && status.progress < 100 && status.waiting" class="float-right"><i class="fa fa-pause" aria-hidden="true"></i></a>
            <a class="action" v-if="status.progress >= 0">{{status.action}}</a>
            <a class="error" v-if="status.progress < 0">{{status.reason}}</a>
        </div>
      </div>
      <div v-if="hasError">
          <hr class="row" style="border-width:4px;">
          <div v-for="(index,error) in errors" class="row"  >
            <div class="small-12">
                <a class="error">{{index + 1}} : {{error}} </a>
            </div>
          </div>
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
    background-color: rgba(0,0,0,0);
    opacity: 1;
    z-index:2147483647;
}
#loading-status {
    position: absolute;
    top: 50%;
    left:50%;
    width:500px;
    border-style:solid;
    padding:10px 10px 10px 10px;
    transform: translate(-50%,-50%);
    background-color: rgba(0,0,0,0.3);
    opacity: 1;
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
        errors:[],
        loading:true,
      }
    },
    computed: {
      hasError:function() {
        return this.errors.length > 0
      },
      show: function() {
        return this.loading || this.errors.length > 0
      }
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
            this.allStatus[i].action = action || "Waiting"
            this.allStatus[i].waiting = true
            Vue.set(this.allStatus,i,this.allStatus[i])
        }
      },
      end:function(key,action) {
        var i = this.indexOfStatus(key)
        if (i != -1) {
            this.allStatus[i].progress = 100
            this.allStatus[i].waiting = false
            this.allStatus[i].action = action || "OK"
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
      },
      failed:function(){
        $("#loading-status .close").show()
      }
    },
    ready: function () {
        var vm = this
        //override console.error
        console.error = (function(){
            var originFunc = console.error
            return function(args) {
                if (arguments.length == 1) {
                    if (typeof arguments[0] === "string") {
                        vm.errors.push(arguments[0])
                    } else {
                        vm.errors.push(JSON.stringify(arguments[0]))
                    }
                } else {
                    vm.errors.push(JSON.stringify(arguments))
                }
                originFunc.apply(this,arguments)
            }
        })()
        //override console.error
        console.assert = (function(){
            var originFunc = console.assert
            return function(args) {
                if (!arguments[0]) {
                    if (arguments.length == 2) {
                        if (typeof arguments[1] === "string") {
                            vm.errors.push(arguments[1])
                        } else {
                            vm.errors.push(JSON.stringify(arguments[1]))
                        }
                    } else {
                        vm.errors.push(JSON.stringify(arguments.slice(1)))
                    }
                }
                originFunc.apply(this,arguments)
            }
        })()
        //customize vue error handler
        Vue.config.errorHandler = (function(){
            var originFunc = Vue.config.errorHandler
            return function(err,vm) {
                vm.errors.push(err)
                return originFunc(err,vm)
            }
        })()
    }
  }
</script>

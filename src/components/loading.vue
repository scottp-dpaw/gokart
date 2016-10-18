<template>
    <div id="loading-status-overlay" v-if="show">
    <div id="loading-status" v-if="show">
      <div class="row" >
        <div class="small-11">
            <h4>Status</h4>
        </div>
        <div class="small-1">
            <a @click="close" class="close" v-show="closable"><i class="fa fa-close" aria-hidden="true"></i></a>
        </div>
      </div>
      <div class="row application" >
          <div class="small-7">
              <a class="name">{{application}} </a>
          </div>
          <div class="small-5">
              <a v-if="appStatus.completedPercentage >= 0 && appStatus.completedPercentage < 100 && !appStatus.waiting" class="float-right"><i class="fa fa-spinner" aria-hidden="true"></i></a>
              <a v-if="appStatus.completedPercentage >= 0 && appStatus.completedPercentage < 100 && appStatus.waiting" class="float-right"><i class="fa fa-pause" aria-hidden="true"></i></a>
              <a class="action">{{appStatus.action}}</a>
              <a class="error" v-if="appStatus.completedPercentage < 0">({{appStatus.reason}})</a>
          </div>
      </div>
      <div v-for="status in components" class="row component" >
        <div class="small-7">
            <a class="name">{{status.name}} </a>
        </div>
        <div class="small-5">
            <a v-if="componentStatus(status).completedPercentage >= 0 && componentStatus(status).completedPercentage < 100 && !componentStatus(status).waiting" class="float-right"><i class="fa fa-spinner" aria-hidden="true"></i></a>
            <a v-if="componentStatus(status).completedPercentage >= 0 && componentStatus(status).completedPercentage < 100 && componentStatus(status).waiting" class="float-right"><i class="fa fa-pause" aria-hidden="true"></i></a>
            <a class="action">{{componentStatus(status).action}}</a>
            <a class="error" v-if="componentStatus(status).completedPercentage < 0">({{componentStatus(status).reason}})</a>
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
    width:600px;
    border-style:solid;
    padding:10px 10px 10px 10px;
    transform: translate(-50%,-50%);
    background-color: rgba(0,0,0,0.3);
    opacity: 1;
}
#loading-status .application{
    font-size: 1.1em
}
#loading-status .component{
    font-size: 1em;
    font-style: italic;
}
#loading-status .component .name{
    padding-left:20px
}
#loading-status .error {
    color: #ec5840;
    font-weight: bold;
}
#loading-status .close {
    color: black;
}
</style>

<script>
  import { $,Vue } from 'src/vendor.js'
  export default {
    store: ['catalogueFilters', 'defaultLegendSrc','oimService'],
    data: function () {
      return {
        app:null,
        components:[],
        appRevision:1,
        componentRevision:1,
        errors:[],
      }
    },
    computed: {
      hasError:function() {
        return this.errors.length > 0
      },
      show: function() {
        return this.appRevision && ( !this.app || this.app.completedPercentage < 100 || this.errors.length > 0)
      },
      closable: function() {
        return this.appRevision && this.app && ( this.app.completedPercentage >= 100 || this.app.completedPercentage < 0 )
      },
      appStatus:function() {
        return  this.appRevision && (this.app || {})
      },
    },
    props:["application"],
    methods: {
      close:function() {
          $("#loading-status-overlay").remove()
          $("#loading-status").remove()
      },
      componentStatus:function(status) {
        return this.componentRevision && status
      },
      register: function(componentId,componentName,action) {
        componentName = componentName || componentId
        var vm = this
        if (!vm.Status) {
            vm.Status = function(componentId,componentName,action) {
                if (componentId === "app") {
                    vm.app = this
                    vm.appRevision += 1
                } else {
                    var index = -1
                    for(var i = 0; i < vm.components.length;i++) {
                        if (componentId === vm.components[i].id) {
                            index = i
                            break
                        }
                    }
                    if (index > 0) {
                        //already registered, replace
                        vm.componets[index] = this
                    } else {
                        //not registered, add it
                        vm.components.push(this)
                    }
                    vm.componentRevision += 1
                    
                }
                this.id = componentId
                this.name = componentName
                this.completedPercentage = 0
                this.action = action || "Initialize"
                this.waiting = false
                return this
            }
            vm.Status.prototype._change = function(action) {
                if (vm.app === this) {
                    //app status
                    vm.appRevision += 1
                } else {
                    //component status
                    vm.componentRevision += 1
                    for(var i = 0; i < vm.components.length;i++) {
                        if (this.id === vm.components[i].id) {
                            Vue.set(vm.components,i,vm.components[i])
                            break
                        }
                    }
                }
            }
            vm.Status.prototype.progress = function(completedPercentage,action) {
                this.completedPercentage = completedPercentage
                this.action = action || "Initialize"
                this.waiting = false
                this._change()
            }
            vm.Status.prototype.wait = function(completedPercentage,action) {
                this.completedPercentage = completedPercentage
                this.action = action || "Initialize"
                this.waiting = true
                this._change()
            }
            vm.Status.prototype.end = function(action) {
                action = action || ((this === vm.app)?"OK":"Initialized")
                this.completedPercentage = 100
                this.action = action
                this.waiting = false
                this._change()
            }
            vm.Status.prototype.failed = function(reason) {
                this.completedPercentage = -1
                this.reason = reason || "Failed"
                this.waiting = false
                this._change()
            }
        }
        return new vm.Status(componentId,componentName,action)
      }
    },
    ready: function () {
        var vm = this
        vm.register("app",this.application,"Initialize")
        var loadingStatus = vm.register("LoadingStatus","Loading Status Component")
        //override console.error
        loadingStatus.progress(10,"Override console.error")
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
        loadingStatus.progress(40,"Override console.assert")
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
        loadingStatus.progress(70,"Override vue error handler")
        //customize vue error handler
        Vue.config.errorHandler = (function(){
            var originFunc = Vue.config.errorHandler
            return function(err,vm) {
                vm.errors.push(err)
                return originFunc(err,vm)
            }
        })()
        loadingStatus.end()
    }
  }
</script>

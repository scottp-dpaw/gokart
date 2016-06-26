"use strict";
// Depends on Vue.js
var forms = [];
Vue.filter("keyTotal", function(dict, key) {
    var total = 0;
    Object.keys(dict).forEach(function(k) {
        total += parseFloat(dict[k][key] || 0); 
    });
    return total;
});
document.addEventListener("DOMContentLoaded", function(event) {
    Array.prototype.forEach.call(document.querySelectorAll("form[action$=postbox]"), function(formel) {
        var htmlinput = document.createElement("input");
        htmlinput.hidden = true;
        htmlinput.name = "htmlclone";
        htmlinput.className = "hideforemail";
        formel.appendChild(htmlinput);
        formel.method = "POST";
        formel.target = "_blank";
        var data = {fields: {}};
        Array.prototype.forEach.call(formel.querySelectorAll("input[name]"), function(input) {
            input.setAttribute("v-model", "fields." + input.name);
        });
        var form = new Vue({
            el: formel,
            data: data,
            watch: {
                fields: { 
                    handler: function (val, oldVal) {
                        var clone = this.$el.cloneNode(true);
                        Array.prototype.forEach.call(clone.querySelectorAll(".hideforemail"), function(el) {
                            el.parentNode.removeChild(el);
                        });
                        Array.prototype.forEach.call(clone.querySelectorAll("input"), function(input) {
                            if (input.hidden || !input.value) { input.parentNode.removeChild(input); }
                            input.outerHTML = input.value;
                        });
                        htmlinput.value = clone.innerHTML;
                    },
                    deep: true
                }
            }
        });
        forms.push(form);
    });
});

"use strict";
// Depends on Vue.js
var forms = [];
Vue.filter("sumAttr", function(dict, attr) {
    var total = 0;
    Object.keys(dict).forEach(function(key) {
        total += parseFloat(dict[key][attr] || 0); 
    });
    return total;
});
document.addEventListener("DOMContentLoaded", function(event) {
    Array.prototype.forEach.call(document.querySelectorAll("form[action$=postbox]"), function(formel) {
        var htmlinput = document.createElement("input");
        htmlinput.hidden = true;
        htmlinput.name = "_htmlclone";
        htmlinput.className = "hideforemail";
        formel.appendChild(htmlinput);
        formel.method = "POST";
        formel.target = "_blank";
        var data = window[formel.dataset.context];
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
                            if (input.parentNode) { input.outerHTML = input.value; }
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

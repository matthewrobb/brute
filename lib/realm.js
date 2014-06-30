var realms = exports,
    vm     = require("vm"),
    lod    = require("lodash");

realms.Realm = Realm;
function Realm(seed) {
    this.context = vm.createContext(lod.assign({}, global, seed));
}

lod.assign(Realm.prototype, {
    exec : function(fn) {
        return vm.runInContext("(" + fn.toString() + ").call(this)", this.context);
    }
});

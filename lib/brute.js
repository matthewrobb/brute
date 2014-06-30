var fs       = require("fs"),
    path     = require("path"),
    lod      = require("lodash"),
    Template = require("./templates"),
    realms    = require("./realm");

function Brute(config) {
    this.config = config;

    this.source   = this.loadData(config.source);
    this.define   = lod.bind(this.define, this);
    this.require  = lod.bind(this.require, this);
    this.registry = {};

    this.realm = new realms.Realm(lod.assign({}, {
        $e      : function(val) { return val },
        $t      : "",
        define  : this.define,
        require : this.require,
        lodash  : lod,
        assign  : lod.assign,
        forEach : lod.forEach
    }, this.source));

    this.scope = this.realm.exec(function() {
        var brute = {
            scope : function(ctx, fn) {
                var _t = $t, _r;
                $t = ""; fn(ctx); _r = $t; $t = _t;
                return _r;
            },
            new   : function() { $t = "" },
            open  : function(name) { $t = brute.files[name] || "" },
            save  : function(name) { brute.files[name] = $t },
            files : {}
        };

        this.scopeEach = function(list, visit) {
            return lodash.map(list, function(item) {
                return brute.scope(item, visit);
            }).join("");
        };

        return this.brute = brute;
    });
}

Brute.prototype = {
    loadData : function(loc) {
        return JSON.parse(fs.readFileSync(loc, "utf8"));
    },
    loadTemplate : function(name) {
        return Template.load(name, this.config["template-dir"], this.realm.context);
    },

    define : function(name, deps, factory) {
        // extract function wrapper and body
        return {
            name    : name,
            deps    : deps || [],
            factory : factory,
            init    : false
        };
    },

    require : function(mods, callback) {
        var imports = mods.map(function(name) {
            var meta = this.registry[name] || this.loadTemplate(name);

            if(!meta.init) {
                this.require(meta.deps, function() {
                    meta.exports = lod.clone(meta.factory.apply(this, arguments));
                    meta.exports.default = meta.exports;
                    meta.init = true;
                });
            }

            return meta.exports;
        }, this);
    
        callback.apply(this.realm.context, imports);
    }
};

exports.run = run;
function run(config) {
    var brute = new Brute(config);

    brute.require([ config.template ], function(result) {
        var files = brute.scope.files;
        lod.forEach(files, function(src, name) {
            fs.writeFileSync(path.resolve(config.output, name), src);
        });
    });
}

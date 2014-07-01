var fs       = require("fs"),
    path     = require("path"),
    lod      = require("lodash"),
    Template = require("./templates"),
    realms    = require("./realm");

function Yawp(config) {
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
        var yawp = {
            scope : function(ctx, fn) {
                var _t = $t, _r;
                $t = ""; fn(ctx); _r = $t; $t = _t;
                return _r;
            },
            new   : function() { $t = "" },
            open  : function(name) { $t = yawp.files[name] || "" },
            save  : function(name) { yawp.files[name] = $t },
            files : {}
        };

        this.scopeEach = function(list, visit) {
            return lodash.map(list, function(item) {
                return yawp.scope(item, visit);
            }).join("");
        };

        return this.yawp = yawp;
    });
}

Yawp.prototype = {
    loadData : function(loc) {
        var stat = fs.lstatSync(loc);

        if(stat.isFile()) {
            return JSON.parse(fs.readFileSync(loc, "utf8"));
        } else if(!stat.isDirectory()) {
            throw new Error("Source must be a file or directory");
        }

        var files   = fs.readdirSync(loc),
            dirname = loc.split(path.sep).pop(),
            ret     = {};

        ret[dirname] = files.map(function(filename) {
            return JSON.parse(fs.readFileSync(path.join(loc, filename), "utf8"));
        });

        return ret;
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
            var meta = this.registry[name],
                exports;

            if(meta && meta.init) {
                return meta.exports;
            } else if(!/^\.{0,2}\//.test(name)) {
                meta = this.registry[name] = { init : true };
                exports = meta.exports = require(name);
                exports.default || (exports.default = exports);
                exports.__esModule = true;
            } else {
                name = name.slice(name.indexOf("/") + 1);
                meta = this.loadTemplate(name);

                if(!meta.init) {
                    this.require(meta.deps, function() {
                        exports = meta.exports = lod.clone(meta.factory.apply(this, arguments));
                        exports.default = exports;
                        meta.init = true;
                    });
                }
            }

            return exports;
        }, this);
    
        callback.apply(this.realm.context, imports);
    }
};

exports.run = run;
function run(config) {
    var yawp = new Yawp(config);

    yawp.require([ config.template ], function(result) {
        var files = yawp.scope.files;
        lod.forEach(files, function(src, name) {
            fs.writeFileSync(path.resolve(config.output, name), src);
        });
    });
}

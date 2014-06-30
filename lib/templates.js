var vm        = require("vm"),
    path      = require("path"),
    fs        = require("fs"),

    lod       = require("lodash"),
    traceur   = require("traceur"),

    Templates = exports,
    Micro     = require("./tpl-compile");

require(traceur.RUNTIME_PATH);

function createScript(raw, options) {
    var tmp = Micro.precompile(raw) + "";
    tmp = tmp.slice(tmp.indexOf("{") + 1, tmp.length - 1);
    tmp = traceur.compile(tmp, {
        asyncFunctions : true,
        modules        : "amd",
        moduleName     : options.name,
        filename       : options.filename
    });
    return vm.createScript(tmp.js);
}

Templates.compile = compile;
function compile(raw, options) {
    options || (options = {});

    var script = createScript(raw, options);
    return script.runInContext(options.realm);
}

Templates.load = load;
function load(name, dir, realm) {
    var filename = path.join(dir, name + ".bt");
    return compile(fs.readFileSync(filename, "utf8"), {
        realm    : realm,
        filename : filename,
        name     : name,
        dir      : dir
    });
}

Templates.exec = exec;
function exec(context, code) {
    return vm.runInContext(code, context);
}

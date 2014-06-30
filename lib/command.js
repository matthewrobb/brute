var path   = require("path"),
    fs     = require("fs"),
    nomnom = require("nomnom"),
    yawp  = require("./yawp"),
    config = {};

// Configuration file
nomnom.option("config", {
    abbr      : "c",
    help      : "Yawp run configuration file",
    default   : ".yawpfile",
    transform : function(loc) {
        if(!loc) return;
        config = JSON.parse(fs.readFileSync(path.resolve(loc), "utf8"));
        return loc;
    }
});

// Json source file
nomnom.option("source", {
    abbr      : "s",
    help      : "Path to JSON source file"
});

// Directory to putput to
nomnom.option("output", {
    abbr      : "o",
    help      : "Path to output file"
});

// Name of initial template
nomnom.option("template", {
    abbr      : "t",
    help      : "Name of main template"
});

// Path to template directory
nomnom.option("template-dir", {
    abbr      : "td",
    help      : "Path to templates directory"
});

function checkConfig(opts) {
    var valid = ["source", "output", "template-dir"];

    valid = valid.every(function(name) {
        var loc;

        if(loc = opts[name]) {
            config[name] = path.resolve(loc);
        } else if(loc = config[name]) {
            config[name] = path.resolve(loc);
        }

        return !!loc;
    });

    return valid;
}

if(checkConfig(nomnom.parse())) {
    yawp.run(config);
}

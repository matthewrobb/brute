(function(Micro) {

    Micro.options = {
        code         : /(?:\n\s*)?<%([\s\S]+?)%>(?:\s*(?=\n))?/g,
        codeString   : /(?:\n\s*)?<%~([\s\S]+?)%>(?:\s*(?=\n))?/g,
        escapedOutput: /<%=([\s\S]+?)%>/g,
        rawOutput    : /<%-([\s\S]+?)%>/g,
        stringEscape : /\\|'|\r|\n|\t|\u2028|\u2029/g,

        stringReplace: {
            '\\'    : '\\\\',
            "'"     : "\\'",
            '\r'    : '\\r',
            '\n'    : '\\n',
            '\t'    : '\\t',
            '\u2028': '\\u2028',
            '\u2029': '\\u2029'
        },

        prepend : "var $b='',$v=function (v){return v || v === 0 ? v : $b;};$t+='",

        append  : "';",

        transforms : {
            rawOutput : function(code, match, options) {
                return "'+\n$v(" + code + ")+\n'";
            },

            escapedOutput : function(code, match, options) {
                return "'+\n$e($v(" + code + "))+\n'";
            },

            codeString : function(code, match, options) {
                return "'+" + code + "\n$t+='";
            },

            code : function(code, match, options) {
                return "';\n" + code + "\n$t+='";
            }
        }
    };

    function assign(target, source) {
        Object.keys(source).forEach(function(key) {
            target[key] = source[key];
        });
        return target;
    }

    function merge(target, source) {
        return assign(assign({}, target), source);
    }

    Micro.compile = function (text, options) {
        /*jshint evil:true */

        var blocks     = [],
            tokenClose = "\uffff",
            tokenOpen  = "\ufffe",
            transforms, source;

        options            = merge(Micro.options, options || {});
        options.transforms = merge(Micro.options.transforms, options.transforms || {});

        // Parse the input text into a string of JavaScript code, with placeholders
        // for code blocks. Text outside of code blocks will be escaped for safe
        // usage within a double-quoted string literal.
        //
        // $b is a blank string, used to avoid creating lots of string objects.
        //
        // $v is a function that returns the supplied value if the value is truthy
        // or the number 0, or returns an empty string if the value is falsy and not
        // 0.
        //
        // $t is the template string.
        source = options.prepend || "";

        // U+FFFE and U+FFFF are guaranteed to represent non-characters, so no
        // valid UTF-8 string should ever contain them. That means we can freely
        // strip them out of the input text (just to be safe) and then use them
        // for our own nefarious purposes as token placeholders!
        //
        // See http://en.wikipedia.org/wiki/Mapping_of_Unicode_characters#Noncharacters
        text = text.replace(/\ufffe|\uffff/g, '');

        // Run each block transformer and push into array
        Object.keys(options.transforms).forEach(function(key) {
            var transform = options.transforms[key],
                pattern   = options[key];

            if(!(transform && pattern)) return;

            text = text.replace(pattern, function(match, code) {
                return tokenOpen + (blocks.push(transform(code, match, options)) - 1) + tokenClose;
            });
        });

        // Do string replacements
        text = text.replace(options.stringEscape, function (match) {
            return options.stringReplace[match] || '';
        })

        // Replace the token placeholders with code.
        .replace(/\ufffe(\d+)\uffff/g, function (match, index) {
            return blocks[parseInt(index, 10)];
        })

        // Remove noop string concatenations that have been left behind.
        .replace(/\n\$t\+='';\n/g, '\n');

        source += text + (options.append + "");

        // If compile() was called from precompile(), return precompiled source.
        if (options.precompile) {
            return "function (data) {\n" + source + "\n}";
        }

        // Otherwise, return an executable function.
        return this.revive(new Function('data', source));
    };

    Micro.precompile = function (text, options) {
        options || (options = {});
        options.precompile = true;

        return this.compile(text, options);
    };

    Micro.render = function (text, data, options) {
        return this.compile(text, options)(data);
    };

    Micro.revive = function (precompiled) {
        return function (data) {
            data || (data = {});
            return precompiled.call(data, data);
        };
    };

})(
    (typeof window !== "undefined" && (window.Micro = {})) || exports
);

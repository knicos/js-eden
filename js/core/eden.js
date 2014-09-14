/*
 * Copyright (c) 2013, Empirical Modelling Group
 * All rights reserved.
 *
 * See LICENSE.txt
 */

function Eden() {
	this.index = 0;
	this.errornumber = 0;
	this.plugins = {};
	this.internals = {};
}

Eden.prototype.internal = function (name) {
	this.internals.__defineGetter__(name, function () {
		return (root.lookup(name)).value();
	});

	this.internals.__defineSetter__(name, function (val) {
		root.lookup(name).assign(val);
	});
};

Eden.formatError = function (e, options) {
	options = options || {};
	return "<div class=\"error-item\">"+
		"## ERROR number " + eden.errornumber + ":<br>"+
		(options.path ? "## " + options.path + "<br>" : "")+
		e.message+
		"</div>\r\n\r\n";
};

Eden.reportError = function (e, options) {
	if (eden.plugins.MenuBar) {
		eden.plugins.MenuBar.updateStatus("Error: "+e.message);
	}
	$('#error-window')
		.addClass('ui-state-error')
		.prepend(Eden.formatError(e, options))
		.dialog({title:"EDEN Errors"});
	eden.errornumber = eden.errornumber + 1;
};

/*
 * synchronously loads an EDEN file from the server,
 * translates it to JavaScript then evals it when it's done
 */
Eden.executeFile = function (path) {
	$.ajax({
		url: path,
		dataType: 'text',
		success: function(data) {
			try {
				eval(Eden.translateToJavaScript(data));
			} catch (e) {
				Eden.reportError(e, {path: path});
				console.error(e);
			}
		},
		cache: false,
		async: false
	});
};

/*
 * Async loads an EDEN file from the server,
 * translates it to JavaScript then evals it when it's done.
 * This variation performs a server side include of all sub-scripts. It is also
 * possible to use this version across domains to load scripts on other servers.
 */
Eden.executeFileSSI = function (path) {
	Eden.loadqueue = [];

	var ajaxfunc = function(path2) {
		$.ajax({
			url: path2,
			dataType: 'text',
			type: 'GET',
			success: function(data) {
				try {
					if (eden.plugins.MenuBar) {
						eden.plugins.MenuBar.updateStatus("Parsing "+path2+"...");
					}
					eval(Eden.translateToJavaScript(data));
					if (eden.plugins.MenuBar) {
						eden.plugins.MenuBar.appendStatus(" [complete]");
					}
				} catch (e) {
					Eden.reportError(e, {path: path2});
					console.error(e);
				}

				if (Eden.loadqueue.length > 0) {
					var pathtoload = Eden.loadqueue.pop();
					if (eden.plugins.MenuBar) {
						eden.plugins.MenuBar.updateStatus("Loading "+pathtoload);
					}
					ajaxfunc(pathtoload);
				}
			},
			cache: false,
			async: true
		});
	};

	if (Eden.loadqueue.length == 0) {
		if (eden.plugins.MenuBar) {
			eden.plugins.MenuBar.updateStatus("Loading - "+path);
		}
		ajaxfunc(path);
	} else {
		Eden.loadqueue.unshift(path);
	}
};

Eden.execute = function (code) {
	var result = "";
	try {
		result = eval(Eden.translateToJavaScript(code));
	} catch(e) {
		Eden.reportError(e);
	}
	return result;
};

function _$() {
	var code = arguments[0];
	for (var i = 1; i < arguments.length; i++) {
		code = code.replace("$"+i, arguments[i]);
	}
	return Eden.execute(code);
}

/*
 * Wraps a parser generated by jison so that it has access to some functions useful
 * in parsing
 *
 * @param {function} parser generated by jison takes a string
 */
Eden.parserWithInitialisation = function parserWithInitialisation(parser) {
	/**
	 * @param {String} source - EDEN code to translate into JavaScript.
	 * @returns {String} JavaScript code as a String.
	 */
	return function (source) {
		source = source.replace(/\r\n/g, '\n');

		/**
		 * This function sets up a bunch of state/functions used in the generated parser. The
		 * `parser.yy` object is exposed as `yy` by jison. (See grammar.jison for usage)
		 */

		var includes = 0;
		parser.yy.includeJS = function (expression) {
			includes++;
			return 'rt.includeJS(' + expression + ', function () {'; 
		};

		parser.yy.withIncludes = function (statementList) {
			var closer = "";
			var i;
			for (i = 0; i < includes; ++i) {
				closer += "});";
			}
			includes = 0;
			return statementList + closer;
		};

		/**
		 * Extract a string from original eden source.
		 * @param {Number} firstLine - Index of the line to start extracting.
		 * @param {Number} firstColumn - Position in the line to start extracting.
		 * @param {Number} firstLine - Index of the line to end extracting.
		 * @param {Number} firstColumn - Position in the line to end extracting.
		 * @returns {String} Extracted source.
		 */
		parser.yy.extractEdenDefinition = function (firstLine, firstColumn, lastLine, lastColumn) {
			var definitionLines = source.split('\n').slice(firstLine - 1, lastLine);
			var definition = "";

			for (var i = 0; i < definitionLines.length; ++i) {
				var line = definitionLines[i];

				var start;
				if (i === 0) {
					start = firstColumn;
				} else {
					start = 0;
				}

				var end;
				if (i === definitionLines.length - 1) {
					end = lastColumn;
				} else {
					end = line.length;
				}

				definition += line.slice(start, end);

				if (i < definitionLines.length - 1) {
					definition += "\n";
				}
			}

			return definition;
		};

		var inDefinition = false;
		var dependencies = {};

		/**
		 * Called in the parser when entering a definition.
		 */
		parser.yy.enterDefinition = function () {
			dependencies = {};
			inDefinition = true;
		};

		/**
		 * Called in the parser when exiting a definition.
		 */
		parser.yy.leaveDefinition = function () {
			inDefinition = false;
		};

		/**
		 * Used by the parser to test whether currently parsing a definition.
		 * @returns {Boolean}
		 */
		parser.yy.inDefinition = function () {
			return inDefinition;
		};

		/**
		 * Used by the parser to record dependencies when parsing a definition.
		 */
		parser.yy.addDependency = function (name) {
			dependencies[name] = 1;
		};

		/**
		 * Used by the parser to generate a list of observables to observe for changes.
		 * @returns {Array.<String>} Array of observable names used in the current definition.
		 */
		parser.yy.getDependencies = function () {
			var dependencyList = [];
			for (var p in dependencies) {
				dependencyList.push(p);
			}
			return dependencyList;
		};

		var observables = {};

		/**
		 * Used by the parser to track observables used in a script.
		 * @param {String} name - Name of observable t
		 * @returns {String} Generated code that results in the Symbol for name.
		 */
		parser.yy.observable = function (name) {
			observables[name] = 1;
			return "o_" + name;
		};

		var dobservables = {};
		var varNum = 0;

		parser.yy.dobservable = function (name) {
			varNum = varNum + 1;
			return "var d_" + varNum + " = context.lookup(" + name + "); d_" + varNum;
		};

		/**
		 * Used by the parser to generate 'var' declarations for the whole script.
		 * These vars store `Symbols` for each observable.
		 *
		 * @returns {String} JavaScript statements defining vars for each observable.
		 */
		parser.yy.printObservableDeclarations = function () {
			var javascriptDeclarations = [];
			for (var observableName in observables) {
				javascriptDeclarations.push(
					"var o_" + observableName + " = context.lookup('" + observableName + "');"
				);
			}

			return javascriptDeclarations.join("\n");
		};

		/**
		 * Used by the parser to store the names of 'auto' and 'para' variables for
		 * a function. These lists are pushed onto each time the parser enters a
		 * function definition.
		 */
		parser.yy.locals = [];
		parser.yy.paras = [];

		/**
		 * Used by the parser instead of Array.prototype.map which isn't
		 * available in some browsers.
		 *
		 * @param {Array}
		 * @returns {Array}
		 */
		parser.yy.map = function map(array, f) {
			if (array.map) {
				return array.map(function (x, i) { return f(x, i); });
			}

			var results = [];
			for (var i = 0; i < array.length; ++i) {
				results.push(f(array[i], i));
			}
			return results;
		};

		return parser.parse(source);
	};
};

/*
 * This is the entry point for eden to JS translation, which attaches some of the
 * necessary functions/initial state to the translator before running it
 */
Eden.translateToJavaScript = Eden.parserWithInitialisation(parser);

Eden.prototype.getDefinition = function (name, symbol) {
	if (symbol.eden_definition) {
		return symbol.eden_definition + ";";
	} else {
		return name + " = " + symbol.cached_value + ";";
	}
};

this.Eden = Eden;

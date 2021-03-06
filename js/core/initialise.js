/*
 * Copyright (c) 2013, Empirical Modelling Group
 * All rights reserved.
 *
 * See LICENSE.txt
 */

var root;
var eden;
var edenUI;

var doneLoading;

/*
 * Implementations of functionality specified in web standards but not yet supported by all of
 * supported JS-EDEN runtime platforms.
 */
if (!("isInteger" in Number)) {
	//Not in IE 11.
	Number.isInteger = function (n) {
		return parseInt(n) === n;
	};
}

/* Allow touch events to act like mouse events */
function touchHandler(event) {
    var touch = event.changedTouches[0];

    var simulatedEvent = document.createEvent("MouseEvent");
        simulatedEvent.initMouseEvent({
        touchstart: "mousedown",
        touchmove: "mousemove",
        touchend: "mouseup"
    }[event.type], true, true, window, 1,
        touch.screenX, touch.screenY,
        touch.clientX, touch.clientY, false,
        false, false, false, 0, null);

    touch.target.dispatchEvent(simulatedEvent);
    if (event.target.className.indexOf("ui-dialog-titlebar") != -1 || event.target.className.indexOf("ui-resizable-handle") != -1) {
		event.preventDefault();
	}
}

//See also plugins/external-html-content/external-html-content.js
var doingNavigateAway = false;
var confirmUnload = function (event) {
	if (!doingNavigateAway) {
		var prompt = "Leaving this page will discard the current script. Your work will not be saved.";
		event.returnValue = prompt;
		return prompt;
	}
};

/**
 * Currently supported URL parameters (HTTP GET):
 * views: One of a several preset values.  Currently either "none" (no canvas, input window or project list created) or "default".
 * menus: true or false.  If false then the menu bar is not displayed and views can only be opened by writing JS-EDEN script.
 * plugins: A comma separated listed of plug-ins to load automatically at start up.
 * include: URL of a construal to load as soon as the environment is loaded.
 * exec: A piece of JS-EDEN code to execute after the included construal has been loaded.
 * lang: Human language to use for parser and UI. E.g. lang=en for English.
*/
function Construit(options,callback) {
	root = new Folder();
	eden = new Eden(root);
	Eden.Statement.init();
	
	var menuBar = (URLUtil.getParameterByName("menu")) ? URLUtil.getParameterByName("menu") != "false" : ((options) ? options.menu : true);
	var developer = URLUtil.getParameterByName("developer") != "" && URLUtil.getParameterByName("developer") != "false";
	var lang = URLUtil.getParameterByName("lang");
	var load = URLUtil.getParameterByName("load");
	var tag = URLUtil.getParameterByName("tag");
	var addr = URLUtil.getParameterByName("addr");
	var embed = URLUtil.getParameterByName("embed");
	var restore = URLUtil.getParameterByName("restore");

	if (embed == "true") {
		Eden.mobile = true;
		if (URLUtil.getParameterByName("menu") == "") menuBar = false;
	}
	//var imports = URLUtil.getArrayParameterByName("import");

	if (developer) {
		menuBar = true;
	}

	if (lang == "") {
		lang = "en";
	}

	var plugins;
	var pluginsStr = "";

	var defaultPlugins = [
		//"PluginManager",
		//"ScriptInput",
		//"SymbolLookUpTable",
		"SymbolViewer"
	];

	if (pluginsStr == "") {
		plugins = defaultPlugins;
	} else {
		/* A leading + sign indicates to load the default plug-ins in addition to the ones listed in
		 * the URL.  However, plus signs and spaces are interchangeable in HTTP GET parameters!
		 */
		var includeDefaultPlugins = (pluginsStr[0] == " ");
		if (includeDefaultPlugins) {
			pluginsStr = pluginsStr.slice(1);
		}
		plugins = pluginsStr.split(",");
		if (includeDefaultPlugins) {
			plugins = plugins.concat(defaultPlugins);
		}

		if (views == "" || views == "default") {
			//plugins.push("Canvas2D");
			//plugins.push("ProjectList");
			//plugins.push("ScriptInput");
		}
	}

	if (menuBar) {
		//plugins.unshift("MenuBar");
	}

	$(document).ready(function () {
		// Browser version checks
		var browser = $.browser;
		var bversion = browser.version.split(".");
		bversion = parseInt(bversion[0]);

		function invalidVersion(msg) {
			$(".loadmessage").html(msg);
		}

		window.addEventListener("popstate",function(e) {
			if (e.state) {
				if (!e.state.restore) {
					Eden.load(e.state.project,e.state.tag, undefined, true);
				} else {
					Eden.restore();
				}
			}
		});

		// Display help page when help buttons clicked
		$(document.body).on("click",".help",function(e) {
			//console.log("Help: " + e.currentTarget.getAttribute("data-page"));
			edenUI.createView("help","HelpView",e.currentTarget.getAttribute("title"),e.currentTarget.getAttribute("data-page"));
		});

		if (browser.msie) {
			if (bversion < 13) invalidVersion("Microsoft Internet Explorer is not supported, use Edge, Firefox or Chrome.");
		} else if (browser.mozilla) {
			if (bversion < 29) invalidVersion("Please upgrade your version of Firefox/Mozilla.");
		} else if (browser.webkit && !browser.chrome) {
			invalidVersion("Your browser is not supported by JS-Eden, please use Edge, Firefox or Chrome.");
		} else if (browser.chrome) {
			if (bversion < 39) invalidVersion("Please upgrade your version of Chrome"); 
		} else if (browser.opera) {
			invalidVersion("Opera is not supported, use Chrome or Firefox.");
		} else {
			invalidVersion("Your browser is not supported by JS-Eden, use Firefox or Chrome.");
		}

		// Reset scroll and hide address bar.
		window.scrollTo(0,1);

		document.addEventListener("touchstart", touchHandler, true);
		document.addEventListener("touchmove", touchHandler, true);
		document.addEventListener("touchend", touchHandler, true);
		document.addEventListener("touchcancel", touchHandler, true);

		edenUI = new EdenUI(eden);
		edenUI.scrollBarSize2 = window.innerHeight - $(window).height();
		//Register the view options
		edenUI.views["ScriptView2"] = {raw: function(name,title) { return new EdenUI.ScriptView(name,title); }, dialog: EdenUI.ScriptView.createDialog, title: "Script View", category: edenUI.viewCategories.interpretation};
		edenUI.views["SVGView"] = {raw: function(name,title) { return new EdenUI.SVG(name,title); }, dialog: EdenUI.SVG.createDialog, title: "Graphic View", category: edenUI.viewCategories.interpretation};
		edenUI.views["HelpView"] = {raw: function(name,title,source) { return new EdenUI.Help(name,title,source); }, dialog: EdenUI.Help.createDialog, title: "Help", category: edenUI.viewCategories.interpretation};

		if (menuBar) {
			edenUI.menu = new EdenUI.MenuBar();
		}

		$(document)
		.on('keydown', null, 'ctrl+m', function () {
			edenUI.cycleNextView();
		})
		.on('keyup', null, 'ctrl', function () {
			edenUI.stopViewCycling();
		})
		.on('keydown', null, 'backspace', function (e) {
			var elem = e.currentTarget;
			if (elem.tagName) {
				var tagName = elem.tagName.toUpperCase();
				if (tagName != "INPUT" && tagName != "TEXTAREA" && !elem.isContentEditable) {
					console.log("PREVENT BACKSPACE FOR: "+tagName);
					e.preventDefault();
				}
			}
		});
		
		if (edenUI.getOptionValue('optConfirmUnload') != "false") {
			window.addEventListener("beforeunload", confirmUnload);
		}

		var loadLanguage = function(lang, callback) {
			$.getScript("js/language/"+lang+".js", function(data) {
				Language.language = lang;
				eval(data);
				callback();
			});
		}

		//Eden.Statement.restore();

		var loadPlugins = function (pluginList, callback) {
			var loadPlugin = function () {
				if (pluginList.length > 0) {
					var plugin = pluginList.shift();
					edenUI.loadPlugin(plugin, loadPlugin);
				} else {
					callback();
				}
			};
			loadPlugin();
		};
		
		doneLoading = function (didload) {
			//eden.captureInitialState();

			window.scrollTo(0, 0); //Chrome remembers position on refresh.
			// Remove spinning loader and message
			edenUI.finishedLoading();

			if (callback) callback(didload);
		}

		if (addr != "none") {
			Eden.Statement.connect((addr == "") ? window.location.hostname : addr);
		}

		loadLanguage(lang, function() {
			loadPlugins(plugins, function () {
				//Eden.Agent.importAgent("lib", undefined, function() {
				//eden.include(librarySource, {name: '/system'}, function () {
					$.getJSON('config.json', function (config) {
						rt.config = config;

						Eden.DB.connect(Eden.DB.repositories[Eden.DB.repoindex], function() {
							//eden.execute2(bootscript);
							
							if (load != "" && tag != "") {
								Eden.load(load,tag,function(){ doneLoading(true); });
							} else if (restore != "") {
								doneLoading(Eden.restore());
							} else {
								doneLoading(false);
							}
						});
						Eden.DB.repoindex = (Eden.DB.repoindex + 1) % Eden.DB.repositories.length;


						/*eden.captureInitialState();

						if (include.length > 0) {
							eden.include(include, doneLoading);
						} else {
							doneLoading();
						}

						console.log("LOADING IMPORTS");

						if (imports.length > 0) {
							function chainedImport(i) {
								console.log("IMPORT: " + imports[i]);
								if (i >= imports.length) {
									doneLoading();
									return;
								}
								Eden.Agent.importAgent(imports[i], undefined, function() {
									chainedImport(i+1);
								});
							}
							chainedImport(0);
						} else {
							doneLoading();
						}*/
					});
				//});
			});
		});
	});
}

/*
 * Copyright (c) 2013, Empirical Modelling Group
 * All rights reserved.
 *
 * See LICENSE.txt
 */

 
 // First of all, prevent missing browser functionality from causing errors.
/*
 * If supported by the browser then JS-EDEN will measure how long it takes to
 * execute the user's code each time they press the submit button in the input
 * window and print the result in the JavaScript console.  If the browser
 * doesn't natively support making timing measurements then the functionality is
 * simply disabled.
*/
if (!("time" in console)) {
	console.time = function (timerName) {
		return;
	};
	console.endTime = function (timerName) {
		return;
	};
}



/**
 * Support function to get the caret position within the syntax highlighted
 * div. Used when clicking or selecting the highlighted script.
 */
function getCaretCharacterOffsetWithin(element) {
	var caretOffset = 0;
	var doc = element.ownerDocument || element.document;
	var win = doc.defaultView || doc.parentWindow;
	var sel;
	if (typeof win.getSelection != "undefined") {
	    sel = win.getSelection();
	    if (sel.rangeCount > 0) {
	        var range = win.getSelection().getRangeAt(0);
	        var preCaretRange = range.cloneRange();
	        preCaretRange.selectNodeContents(element);
	        preCaretRange.setEnd(range.endContainer, range.endOffset);
	        caretOffset = preCaretRange.toString().length;
	    }
	} else if ( (sel = doc.selection) && sel.type != "Control") {
	    var textRange = sel.createRange();
	    var preCaretTextRange = doc.body.createTextRange();
	    preCaretTextRange.moveToElementText(element);
	    preCaretTextRange.setEndPoint("EndToEnd", textRange);
	    caretOffset = preCaretTextRange.text.length;
	}
	return caretOffset;
}



/**
 * Support function to get the start of a selection of the highlighted script.
 */
function getStartCaretCharacterOffsetWithin(element) {
	var caretOffset = 0;
	var doc = element.ownerDocument || element.document;
	var win = doc.defaultView || doc.parentWindow;
	var sel;
	if (typeof win.getSelection != "undefined") {
	    sel = win.getSelection();
	    if (sel.rangeCount > 0) {
	        var range = win.getSelection().getRangeAt(0);
	        var preCaretRange = range.cloneRange();
	        preCaretRange.selectNodeContents(element);
	        preCaretRange.setEnd(range.startContainer, range.startOffset);
	        caretOffset = preCaretRange.toString().length;
	    }
	} else if ( (sel = doc.selection) && sel.type != "Control") {
	    var textRange = sel.createRange();
	    var preCaretTextRange = doc.body.createTextRange();
	    preCaretTextRange.moveToElementText(element);
	    preCaretTextRange.setEndPoint("EndToEnd", textRange);
	    caretOffset = preCaretTextRange.text.length;
	}
	return caretOffset;
}

 
/**
 * JS-Eden Interpreter Window Plugin.
 * Which is better than the one with all the widget cak.
 * @class Input Window Plugin
 */
EdenUI.plugins.ScriptInput = function(edenUI, success) {
	/* Plugin meta information */
	// TODO This should not be here
	EdenUI.plugins.ScriptInput.title = Language.ui.input_window.title;
	EdenUI.plugins.ScriptInput.description = Language.ui.input_window.description;

	var me = this;
	var inputAgent = {name: Symbol.getInputAgentName()};
	

	var closeInput = function(options) {
		var $dialog = options.$dialog;
		$dialog.dialog('close');
		console.log("CLOSE");
		console.log(options);
	}

	var openInput = function(options) {

		var $dialog = options.$dialog;
		$dialog.dialog('open');
		$(options.editor.getInputField()).focus();
	}


	this.createHistory = function(name,mtitle) {

		historydialog = $('<div id="'+name+'"></div>')
			.html("<div class=\"history\">"+"</div>")
			.dialog({
				title: mtitle,
				width: 500,
				height: 500,
				minHeight: 300,
				minWidth: 300

			}).find(".history");
	}

	

	$(document.body).delegate(null, 'drop', function(e) {
		var value = e.originalEvent.dataTransfer.getData("agent");
		if (!value || value == "") {
			console.log(e.originalEvent.dataTransfer.files);
			e.preventDefault();
			return;
		}

		var valsplit = value.split("/");
		var viewname = valsplit.join("");
		eden.root.lookup("_view_"+viewname+"_tabs").assign([value], eden.root.scope);
		edenUI.createView(viewname, "ScriptInput");
		eden.root.lookup("_view_"+viewname+"_agent").assign(value, eden.root.scope);
	}).delegate(null, 'dragover', function(e) {
		e.preventDefault();
	});



	/**
	 * Common input window view constructor.
	 */
	this.createCommon = function (name, mtitle, code, power, embedded) {
		var $dialogContents = $('<div class="inputdialogcontent"><div class="inputhider"><textarea autofocus tabindex="1" class="hidden-textarea"></textarea><div class="agent-tabs"></div><div class="inputCodeArea"><div class="eden_suggestions"></div><div spellcheck="false" contenteditable class="outputcontent"></div></div></div><div class="info-bar"></div><div class="outputbox"></div></div></div>')
		//var $optmenu = $('<ul class="input-options-menu"><li>Mode</li><li>Word-wrap</li><li>Spellcheck</li><li>All Leaves</li><li>All Options</li></ul>');		
		var position = 0;
		var $codearea = $dialogContents.find('.inputCodeArea');
		var codearea = $codearea.get(0);
		var intextarea = $dialogContents.find('.hidden-textarea').get(0);
		var outdiv = $dialogContents.find('.outputcontent').get(0);
		var infobox = $dialogContents.find('.info-bar').get(0);
		var outputbox = $dialogContents.find('.outputbox').get(0);
		var suggestions = $dialogContents.find('.eden_suggestions');
		var tabs = $dialogContents.find('.agent-tabs').get(0);
		suggestions.hide();
		$(infobox).hide();

		var gutter = new EdenScriptGutter($codearea.get(0), infobox);

		var $buttonbar = $('<div class="control-bar noselect"><div class="buttonsDiv"><button class="control-button search-mode" title="Query state">&#xf002;</button><button class="control-button share-agent" title="Share on network">&#xf0e8;</button><button class="control-button previous-input" title="Undo">&#xf112;</button><button class="control-button next-input" title="Redo">&#xf064;</button><button class="control-button control-enabled menu-input">&#xf142;</button></div>');
		$buttonbar.appendTo($dialogContents);
		var buttonbar = $buttonbar.get(0);
		// Create power button
		var $powerbutton = $('<div class="scriptswitch power-off" title="Enable Automation">&#xF011;</div>');
		$buttonbar.append($powerbutton);
		var powerbutton = $powerbutton.get(0);

		var $optionsmenu = $('<div class="options-menu noselect"></div>');
		var optionsmenu = $optionsmenu.get(0);
		$optionsmenu.appendTo($dialogContents);

		function createMenuItem(icon, name, action) {
			var item = $('<div class="options-menu-item"><span class="options-menu-icon">'+icon+'</span><span>'+name+'</span></div>');
			$optionsmenu.append(item);
			item.click(action);
		}

		function hideMenu() {
			$optionsmenu.hide("slide", { direction: "down"}, 200);
		}

		function buildMenu() {
			while (optionsmenu.firstChild) optionsmenu.removeChild(optionsmenu.firstChild);

			createMenuItem((agent.state[obs_showtabs]) ? "&#xf00c;" : "&#xf00d;", "Show Tabs", function(e) { agent.state[obs_showtabs] = !agent.state[obs_showtabs]; buildMenu(); });
			createMenuItem((agent.state[obs_showbuttons]) ? "&#xf00c;" : "&#xf00d;", "Show Controls", function(e) { agent.state[obs_showbuttons] = !agent.state[obs_showbuttons]; buildMenu(); });
			createMenuItem("&#xf0c0;", "Browse Agents", function(e) { showBrowseDialog(); hideMenu(); });
			createMenuItem("&#xf21b;", "Hide Agent", function(e) {
				var tabs = agent.state[obs_tabs];
				var ix = tabs.indexOf(scriptagent.name);
				if (ix >= 0) {
					tabs.splice(ix,1);
					ix--;
					if (ix < 0) ix = 0;
					if (ix < tabs.length) {
						agent.state[obs_agent] = tabs[ix];
					}
					agent.state[obs_tabs] = tabs;
				}
				hideMenu();
			});
			createMenuItem("&#xf1da;", "View History", function(e) { showSubDialog("showHistory", function(status, index) {
				if (status) {
					scriptagent.rollback(index);
				}
			}, scriptagent); hideMenu(); });
			createMenuItem("&#xf0d0;", "Insert Template", function(e) { });
			if (embedded) {
				createMenuItem("&#xf24d;", "Un-embed", function(e) {
					
				});
			}
		}

		var dragstart = 0;
		var dragvalue = 0;
		var draglast = 0;
		var dragline = -1;
		var dragint = false;
		var rebuildtimer;
		var amtyping = false;
		var rebuildinterval = 10;
		var currentlineno = 1;
		var currentcharno = 0;
		var highlighter = new EdenUI.Highlight(outdiv);
		var refreshentire = false;
		var edited = false;
		var dirty = false;
		var tabscrollix = 0;
		var readonly = false;
		var showhidden = false;
		var inspectmode = false;

		var scriptagent;

		if (Eden.Agent.agents["view/script/"+name] === undefined) {
			scriptagent = new Eden.Agent(undefined, "view/script/"+name);
		} else {
			scriptagent = Eden.Agent.agents["view/script/"+name];
		}
		// Load script from agent memory
		intextarea.value = scriptagent.snapshot;
		scriptagent.setEnabled(power);
		scriptagent.setOwned(true);



		function showBrowseDialog() {
			showSubDialog("browseAgents", function(valid, selected){
				if (valid ) {
					var tabs = agent.state[obs_tabs];
					for (var a in selected) {
						if (selected[a]) {
							Eden.Agent.importAgent(a, ["disabled"]);
							if (tabs.indexOf(a) == -1) {
								tabs.push(a);
							}
						}
					}
					agent.state[obs_tabs] = tabs;
				}
			}, agent.state[obs_tabs]);
		}



		function updateShareButton() {
			var sharebut = $buttonbar.find(".share-agent");
			sharebut.removeClass("control-enabled");
		}



		function updateHistoryButtons() {
			var nextbut = $buttonbar.find(".next-input");
			var prevbut = $buttonbar.find(".previous-input");

			if (readonly || !scriptagent.canRedo()) {
				nextbut.removeClass("control-enabled");
			} else {
				nextbut.addClass("control-enabled");
			}

			if (readonly || !scriptagent.canUndo()) {
				prevbut.removeClass("control-enabled");
			} else {
				prevbut.addClass("control-enabled");
			}
		}

		updateShareButton();
		updateHistoryButtons();


		
		function addTab(name, title, current) {
			var tab = document.createElement("div");
			var classname = "agent-tab noselect";
			if (current) {
				classname += " agent-tab-current";
			} else {
				classname += " agent-tab-notcurrent";
			}
			tab.className = classname;
			tab.innerHTML = title;
			tab.draggable = true;
			tab.setAttribute("data-name", name);
			if (tabs.childNodes.length < tabscrollix) {
				tab.style.display = "none";
			}
			tabs.appendChild(tab);
		}



		function autoSaved(ag) {
			if (ag === scriptagent) {
				setSubTitle("[saved]");
				updateHistoryButtons();
			}
		}



		function removedAgent(name,prev) {
			if (scriptagent && scriptagent.name == name) {
				if (tabscrollix > 0) tabscrollix--;
				if (prev) {
					changeAgent(undefined, prev);
				} else {
					for (var a in Eden.Agent.agents) {
						changeAgent(undefined, a);
						return
					}
					changeAgent(undefined, undefined);
				}
			}
		}



		/**
		 * Generate the agent script tabs at the top. Needs to be re-run when
		 * new tabs are added or titles are changed.
		 */
		function rebuildTabs() {
			// Remove existing tabs
			while (tabs.firstChild) tabs.removeChild(tabs.firstChild);

			// Add scroll left
			var left = document.createElement("div");
			left.className = "agent-tableft noselect";
			tabs.appendChild(left);

			// Add tab for each agent
			/*for (var a in Eden.Agent.agents) {
				var ag = Eden.Agent.agents[a];
				if (!showhidden && ag.hidden) continue;
				addTab(a, ag.title, a == scriptagent.name);
			}*/
			var agents = agent.state[obs_tabs];
			if (agents && agents instanceof Array) {
				for (var i=0; i<agents.length; i++) {
					var title = agents[i];
					if (Eden.Agent.agents[agents[i]]) {
						title = Eden.Agent.agents[agents[i]].title;
					}
					addTab(agents[i], title, agents[i] == scriptagent.name);
				}
			}

			// Add new tab button
			var newtab = document.createElement("div");
			newtab.className = "agent-newtab noselect";
			tabs.appendChild(newtab);

			// Add scroll right
			var right = document.createElement("div");
			right.className = "agent-tabright noselect";
			tabs.appendChild(right);
		}

		// Need to rebuild tabs when new agents are created or titles change.
		//rebuildTabs();
		//Eden.Agent.listenTo("create", this, rebuildTabs);
		//Eden.Agent.listenTo("title", this, rebuildTabs);
		Eden.Agent.listenTo("remove", agent, removedAgent);
		Eden.Agent.listenTo("autosave", agent, autoSaved);
		


		/**
		 * If the input window is a dialog then set its title.
		 */
		function setTitle(title) {
			scriptagent.setTitle(title);
			rebuildTabs();

			var p = $dialogContents.get(0).parentNode;
			if (p) {
				p = p.parentNode;
				if (p) {
					$(p).find(".ui-dialog-title").html(title);
				}
			}
		}



		function setSubTitle(text) {
			if (embedded) return;
			var p = $dialogContents.get(0).parentNode;
			if (p) {
				p = p.parentNode;
				if (p) {
					var title = $(p).find(".ui-dialog-subtitle").get(0);
					if (title === undefined) {
						title = document.createElement("span");
						title.className = "ui-dialog-subtitle";
						$(p).find(".ui-dialog-title").get(0).parentNode.appendChild(title);
					}
					title.textContent = scriptagent.name + " " + text;
				}
			}
		}

		setSubTitle("");



		/**
		 * Generate the script text from a list. The list can contain strings
		 * for each line, or a symbol reference to get the current definition.
		 * Used on load and when _script changes.
		 */
		function preloadScript(sym, value) {
			var res = "";
			if (value) {
				if (value instanceof Array) {
					for (var i=0; i < value.length; i++) {
						if (typeof value[i] == "string") {
							res += value[i] + "\n";
						} else if (typeof value[i] == "object") {
							res += value[i].eden_definition+"\n";
						}
					}
				}
				intextarea.value = res;
				updateEntireHighlight();
			}
		}



		/**
		 * Load a file from the server as the script.
		 */
		function loadFile(sym, value) {
			$.get(value, function(data) {
				intextarea.value = data;
				updateEntireHighlight(scriptagent.enabled);
			}, "text");
		}



		function switchPower(sym, value) {
			if (value) powerOn();
			else powerOff();
		}



		function changeAgent(sym, value) {
			if (value && Eden.Agent.agents[value]) {
				if (value == scriptagent.name) return;
				if (readonly == false) scriptagent.setOwned(false);
				scriptagent = Eden.Agent.agents[value];
				setTitle(scriptagent.title);

				if (Eden.Agent.agents[value].owned == false) {
					scriptagent.setOwned(true);
					readonly = false;
					setSubTitle("");
					outdiv.className = "outputcontent";
					outdiv.contentEditable = true;
				} else {
					readonly = true;
					setSubTitle("[readonly]");
					outdiv.className = "outputcontent readonly";
					outdiv.contentEditable = false;
				}

				if (scriptagent.ast) {
					intextarea.value = scriptagent.ast.stream.code;
					highlightContent(scriptagent.ast, -1, 0);
				}

				if (scriptagent.enabled) powerOn();
				else powerOff();

				// If changed in code and not by click
				// then automatically move to correct tab
				/*if (sym) {
					tabscrollix = 0;
					for (var a in Eden.Agent.agents) {
						if (a == scriptagent.name) break;
						tabscrollix++;
					}
					if (tabscrollix > 0) tabscrollix--;
				}*/

				updateHistoryButtons();
				rebuildTabs();
			} else {
				// TODO Allow for there being no agents...
				/*if (value !== undefined) {
					intextarea.value = "";
					readonly = true;
					setTitle("Script View");
					setSubTitle("[No Agents]");
					outdiv.className = "outputcontent readonly";
					outdiv.contentEditable = false;
					outdiv.innerHTML = "";
					updateHistoryButtons();
					rebuildTabs();
				}*/
			}
		}



		function toggleTabs(sym, value) {
			if (value) {
				codearea.style.top = "35px";
			} else {
				codearea.style.top = "0";
			}
		}



		function toggleButtons(sym, value) {
			if (value) {
				buttonbar.style.display = "inherit";
				codearea.style.bottom = "30px";
			} else {
				buttonbar.style.display = "none";
				codearea.style.bottom = "0";
			}
		}



		// Use the agent wrapper for dealing with view interaction via symbols.
		var obs_script = "_view_"+name+"_script";
		var obs_next = "_view_"+name+"_next";
		var obs_prev = "_view_"+name+"_prev";
		var obs_override = "_view_"+name+"_override";
		var obs_file = "_view_"+name+"_file";
		var obs_power = "_view_"+name+"_power";
		var obs_agent = "_view_"+name+"_agent";
		var obs_showtabs = "_view_"+name+"_showtabs";
		var obs_showbuttons = "_view_"+name+"_showbuttons";
		var obs_tabs = "_view_"+name+"_tabs";
		var agent = new Eden.Agent(undefined,"view/script/"+name+"/config");
		agent.declare(obs_agent);
		agent.declare(obs_showtabs);
		agent.declare(obs_script);
		agent.declare(obs_power);
		agent.declare(obs_file);
		agent.declare(obs_override);
		agent.declare(obs_next);
		agent.declare(obs_prev);
		agent.declare(obs_showbuttons);
		agent.declare(obs_tabs);
		//agent.setReadonly([obs_script,obs_next,obs_prev,obs_override, obs_file, obs_power, obs_agent, obs_showtabs]);

		agent.setEnabled(true);

		// Whenever _script is changed, regenerate the contents.
		agent.on(obs_script, preloadScript);
		agent.on(obs_file, loadFile);
		agent.on(obs_power, switchPower);
		agent.on(obs_agent, changeAgent);
		agent.on(obs_showtabs, toggleTabs);
		agent.on(obs_showbuttons, toggleButtons);
		agent.on(obs_tabs, rebuildTabs);

		// Initialise states
		if (agent.state[obs_showtabs] === undefined) {
			agent.state[obs_showtabs] = !embedded;
		}
		//toggleTabs(undefined, agent.state[obs_showtabs]);
		if (agent.state[obs_showbuttons] === undefined) {
			agent.state[obs_showbuttons] = true;
		}
		//toggleButtons(undefined, agent.state[obs_showbuttons]);
		if (agent.state[obs_tabs] === undefined) {
			agent.state[obs_tabs] = ["view/script/"+name];
		}

		// Set source text.
		agent.setSource("## "+name+"\n\
_view_"+name+"_script = "+Eden.edenCodeForValue(agent.state[obs_script])+";\n\
_view_"+name+"_next = "+Eden.edenCodeForValue(agent.state[obs_next])+";\n\
_view_"+name+"_prev = "+Eden.edenCodeForValue(agent.state[obs_prev])+";\n\
_view_"+name+"_override = "+Eden.edenCodeForValue(agent.state[obs_override])+";\n\
_view_"+name+"_power = "+Eden.edenCodeForValue(agent.state[obs_power])+";\n\
_view_"+name+"_agent = "+Eden.edenCodeForValue(agent.state[obs_agent])+";\n\
_view_"+name+"_showtabs = "+Eden.edenCodeForValue(agent.state[obs_showtabs])+";\n\
_view_"+name+"_showbuttons = "+Eden.edenCodeForValue(agent.state[obs_showbuttons])+";\n\
_view_"+name+"_tabs = [\"view/script/"+name+"\"];\n\
");


		function changeOwnership(ag, cause) {
			if (scriptagent.name == ag.name && cause == "net") {
				if (!ag.owned) {
					//ag.setOwned(true);
					//readonly = false;
					//outdiv.className = "outputcontent";
					//outdiv.contentEditable = true;
				} else {
					readonly = true;
					setSubTitle("[readonly]");
					outdiv.className = "outputcontent readonly";
					outdiv.contentEditable = false;
				}
			}
		}
		function agentCreated(ag) {
			if (agent && agent.state[obs_agent] !== undefined) {
				if (ag.name == agent.state[obs_agent] && ag.name != scriptagent.name) {
					changeAgent(undefined, ag.name);
				}
			}
		}
		function agentLoaded(ag) {
			if (agent && agent.state[obs_agent] !== undefined) {
				if (ag.name == agent.state[obs_agent] && ag.name != scriptagent.name) {
					changeAgent(undefined, ag.name);
				} else if (ag.name == scriptagent.name) {
					intextarea.value = ag.getSource();
					highlightContent(scriptagent.ast, -1, 0);
				}
			}
		}
		function agentRollback(ag) {
			if (ag === scriptagent) {
				//console.log("ROLLBACK");
				intextarea.value = scriptagent.snapshot;
				updateEntireHighlight(true);
				updateHistoryButtons();
			}
		}
		Eden.Agent.listenTo("create", agent, agentCreated);
		Eden.Agent.listenTo("loaded", agent, agentLoaded);
		Eden.Agent.listenTo("rollback", agent, agentRollback);
		Eden.Agent.listenTo("owned", agent, changeOwnership);


		/*edenUI.eden.root.addGlobal(function(sym, create) {
			if (highlighter.ast) {
				var whens = highlighter.ast.triggers[sym.name.slice(1)];
				if (whens) {
					//clearExecutedState();
					for (var i=0; i<whens.length; i++) {
						whens[i].execute(eden.root, undefined, highlighter.ast);
					}
					gutter.generate(highlighter.ast,-1);
					clearExecutedState();
				}
			}
		});*/


		var gutterinterval = setInterval(function() {
			if (scriptagent === undefined) return;
			gutter.generate(scriptagent.ast, -1);
			scriptagent.clearExecutedState();
		}, 50);


		buildMenu();



		/**
		 * Re-parse the entire script and then re-highlight the current line
		 * (and one line either size).
		 */
		function updateLineHighlight() {
			scriptagent.setSource(intextarea.value);
			highlighter.ast = scriptagent.ast;
			var lineno = -1; // Note: -1 means update all.
			var pos = -1;
			if (document.activeElement === intextarea) {
				pos = intextarea.selectionEnd;
				lineno = getLineNumber(intextarea);
			}

			runScript(lineno);

			highlightContent(scriptagent.ast, lineno, pos);
			//rebuildNotifications();
		}



		/**
		 * Re-highlight the current line without re-parsing the script.
		 * Used when moving around the script without actually causing a code
		 * change that needs a reparse.
		 */
		function updateLineCachedHighlight() {
			var lineno = -1;
			var pos = -1;
			if (document.activeElement === intextarea) {
				pos = intextarea.selectionEnd;
				lineno = getLineNumber(intextarea);
			}

			highlightContent(highlighter.ast, lineno, pos);
		}



		/**
		 * Parse the script and do a complete re-highlight. This is slow but
		 * is required when there are changes across multiple lines (or there
		 * could be such changes), for example when pasting.
		 */
		function updateEntireHighlight(rerun) {
			scriptagent.setSource(intextarea.value);
			highlighter.ast = scriptagent.ast;
			var pos = -1;
			if (document.activeElement === intextarea) {
				pos = intextarea.selectionEnd;
			}

			if (rerun) {
				runScript(0);
			}

			highlightContent(scriptagent.ast, -1, pos);
		}



		/**
		 * Check if any of the listed symbols are undefined. Used in generating
		 * warnings about use of undefined observables.
		 */
		function checkUndefined(dependencies) {
			var res = [];
			for (var d in dependencies) {
				if (eden.root.lookup(d).value() === undefined) {
					res.push(d);
				}
			}
			return res;
		}



		function hideInfoBox() {
			$(infobox).hide("fast");
		}



		/* UNUSED DUE TO PERFORMANCE BUG */
		function rebuildNotifications() {
			for (var i=0; i<highlighter.ast.lines.length; i++) {
				if (highlighter.ast.lines[i] &&
						highlighter.ast.lines[i].lvalue) {
					eden.root.lookup(highlighter.ast.lines[i].lvalue.observable).addJSObserver(name+"_scriptLines", notifyOutOfDate);
				}
			}
		}



		/**
		 * Add a warning icon to the left of the specified line
		 */
		function addWarningLine(lineno, msg) {
			var $line = $(outdiv.childNodes[lineno-1]);
			$line.addClass("eden-warnline");
			if (msg) {
				outdiv.childNodes[lineno-1].title = msg;
			}
		}



		/**
		 * Add an extension icon to the left of the specified line
		 */
		function addExtendedLine(lineno) {
			var $line = $(outdiv.childNodes[lineno-1]);
			$line.addClass("eden-extendedline");
		}



		/**
		 * Add a link icon to the left of the specified line
		 */
		function addParentLine(lineno) {
			var $line = $(outdiv.childNodes[lineno-1]);
			$line.addClass("eden-parentline");
		}



		/**
		 * Add an error icon to the left of the specified line
		 */
		function addErrorLine(lineno) {
			var $line = $(outdiv.childNodes[lineno-1]);
			$line.addClass("eden-errorline");
		}



		/* UNUSED */
		function notifyOutOfDate(symbol, value) {
			// If power is off, don't show conflict warnings
			if (!scriptagent.enabled) return;

			// Find the symbol in the ast lines and highlight that line
			var count = 0;
			var name = symbol.name.slice(1);
			for (var i=0; i<highlighter.ast.lines.length; i++) {
				var curast = highlighter.ast.lines[i];

				// Ignore number dragging line
				if (i == dragline) continue;

				if (curast && curast.lvalue &&
						curast.lvalue.observable == name) {

					// Any statement with a parent should be ignored
					// TODO: check if statements
					if (curast.parent) continue;

					if (curast.type == "definition") {
						// Compare eden definitions
						if (symbol.eden_definition != highlighter.ast.getSource(curast)) {
							//addWarningLine(i+1, "Definition has been changed elsewhere.");
							commentOutLine(i+1);
						}
					} else if (curast.type == "assignment") {
						var myval = curast.expression.execute(eden.root,undefined);
						// TODO compare eden value string?
						if (!rt.equal(myval,value)) {
							//addWarningLine(i+1, "This line says '"+name+"' = '" + myval + "', but somewhere else it changed to '"+value+"'. Please choose a resolution.");
							commentOutLine(i+1);
						}
					}
					count++;
				}
			}
			if (count > 0) {
				updateEntireHighlight();
			}
		}



		/**
		 * Called by a timeout after a period of inactivity. Displays any
		 * error and warning messages.
		 */
		/*function doneTyping() {
			amtyping = false;

			if (autoexec && highlighter.ast.script.errors.length == 0) {
				// Get current line number
				var lineno = getLineNumber(intextarea)-1;

				// If the current line has a statement
				if (highlighter.ast.lines[lineno]) {
					var ast = highlighter.ast.lines[lineno];

					// If the statement is a definition or assignment
					if (ast.type == "definition" || ast.type == "assignment") {
						var observable = highlighter.ast.lines[lineno].lvalue.observable;
						var sym = eden.root.lookup(observable);
						var val = sym.value();

						// Show a warning if it evaluates to undefined
						// TODO: use _option_showundefined
						if (val === undefined) {
							// Find why it is undefined...
							var undef = checkUndefined(ast.dependencies);

							// One of its dependencies is undefined...
							if (undef.length > 0) {
								var undefstr = "";
								for (var i=0; i<undef.length; i++) {
									undefstr += "<b>"+undef[i]+"</b>";
									if (i != undef.length - 1) undefstr += ",";
								}
								if (undef.length == 1) {
									addWarningLine(currentlineno);
									//showInfoBox("warning", "<b>" + observable + "</b> "+ Language.ui.input_window.is_undef_because +" "+undefstr+" " + Language.ui.input_window.is_undef);
								} else {
									addWarningLine(currentlineno);
									//showInfoBox("warning", "<b>" + observable + "</b> "+ Language.ui.input_window.is_undef_because +" "+undefstr+" " + Language.ui.input_window.are_undef);
								}
							// Its undefined but we don't know why
							} else {
								addWarningLine(currentlineno);
								//showInfoBox("warning", observable + " " + Language.ui.input_window.is_undef);
							}
						// Not undefined
						} else {
							//hideInfoBox();
						}
					} else {
						//hideInfoBox();
					}
				} else {
					//hideInfoBox();
				}
			} else if (highlighter.ast.script.errors.length != 0) {
				//showInfoBox("error", highlighter.ast.script.errors[0].messageText());
				//addErrorLine(highlighter.ast.script.errors[0].line, highlighter.ast.script.errors[0].messageText());
			} else {
				//hideInfoBox();
			}
		}*/



		/**
		 * Replace a particular line with the given content.
		 * Can be used for autocompletion and number dragging.
		 */
		function replaceLine(lineno, content) {
			var lines = intextarea.value.split("\n");
			lines[lineno] = content;
			intextarea.value = lines.join("\n");
		}



		/**
		 * Insert an array of lines into the script at the given line.
		 * Potentially used when expanding definition filters.
		 * CURRENTLY UNUSED
		 */
		function insertLines(lineno, newlines) {
			var lines = intextarea.value.split("\n");
			for (var i=0; i<newlines.length; i++) {
				lines.splice(lineno, 0, newlines[i]);
			}
			intextarea.value = lines.join("\n");
		}



		/**
		 * Prepend ## to a line to comment it out.
		 * CURRENTLY UNUSED.
		 */
		function commentOutLine(lineno) {
			var lines = intextarea.value.split("\n");
			lines[lineno-1] = "##" + lines[lineno-1];
			intextarea.value = lines.join("\n");
		}



		/**
		 * When clicking or using a syntax highlighted element, find which
		 * source line this corresponds to. Used by number dragging.
		 */
		function findElementLineNumber(element) {
			var el = element;
			while (el.parentNode !== outdiv) el = el.parentNode;

			for (var i=0; i<outdiv.childNodes.length; i++) {
				if (outdiv.childNodes[i] === el) return i;
			}
			return -1;
		}



		/**
		 * Update scroll position if cursor is near to an edge.
		 */
		function checkScroll() {
			// Get the cursor
			var el = $(outdiv).find(".fake-caret").get(0);
			if (el === undefined) return;
			var area = $codearea.get(0);

			// How far from left or right?
			var distleft = el.offsetLeft - area.scrollLeft + 25;
			var distright = area.clientWidth + area.scrollLeft - el.offsetLeft - 25;

			// Need to find the current line element
			while (el.parentNode != outdiv) el = el.parentNode;

			// How far is this line from the top or bottom
			var disttop = el.offsetTop - area.scrollTop + 15;
			var distbottom = area.clientHeight + area.scrollTop - el.offsetTop - 15;

			// Move if needed.
			if (distleft < 80) area.scrollLeft = area.scrollLeft - (80-distleft);
			if (distright < 80) area.scrollLeft = area.scrollLeft + (80-distright);
			if (disttop < 40) area.scrollTop = area.scrollTop - (40-disttop);
			if (distbottom < 40) area.scrollTop = area.scrollTop + (40-distbottom);
		}



		/**
		 * Call the highlighter to generate the new highlight output, and then
		 * post process this to allow for extra warnings and number dragging.
		 */
		function highlightContent(ast, lineno, position) {
			highlighter.highlight(ast, lineno, position);
			gutter.generate(ast,lineno);

			// Process the scripts main doxy comment for changes.
			if (ast.mainDoxyComment && (lineno == -1 || (lineno >= 1 && lineno <= ast.mainDoxyComment.endline))) {
				// Find all doc tags
				var taglines = ast.mainDoxyComment.content.match(/@[a-z]+.*\n/ig);
				if (taglines) {
					for (var i=0; i<taglines.length; i++) {
						// Extract tag and content
						var ix = taglines[i].search(/\s/);
						if (ix >= 0) {
							var tag = taglines[i].substring(0,ix);
							var content = taglines[i].substr(ix).trim();

							// Set title tag found
							if (tag == "@title") {
								setTitle(content);
							}
						}
					}
				}
			}

			// Post process lines, adding links and warnings
			for (var i=0; i<ast.lines.length; i++) {
				if (ast.lines[i]) {
					if (ast.lines[i].type == "definition") {
						var sym = eden.root.lookup(ast.lines[i].lvalue.observable);
						if (sym.extend) {
							if (ast.lines[i].lvalue.lvaluep.length > 0) {
								addParentLine(i+1);
							} else {
								addExtendedLine(i+1);
							}
						}
					}
				}
			}

			// Make sure caret remains inactive if we don't have focus
			if (document.activeElement !== intextarea) {
				$(outdiv).find(".fake-caret").addClass("fake-blur-caret");
			}

			/*$(outdiv).on('mouseup', '.eden-extendedline', function(e) {
				if (e.offsetX < 0) {
					var lineno = currentlineno+1;
					var filters = [];
					var curast = highlighter.ast.lines[lineno];
					console.log(curast);
					if (curast) {
						var sym = eden.root.lookup(curast.lvalue.observable);
						for (var e in sym.extend) {
							filters.push(sym.extend[e].source);
						}
						insertLines(lineno+1, filters);
					}
				}
			});*/

			/* Number dragging code, but only if live */
			if (scriptagent.enabled) {
				$(outdiv).find('.eden-number').draggable({
					helper: function(e) { return $("<div class='eden-drag-helper'></div>"); },
					axis: 'x',
					drag: function(e,u) {
						var newval;
						if (dragint) {
							newval = Math.round(dragvalue + ((u.position.left - dragstart) / 2));
						} else {
							newval = dragvalue + ((u.position.left - dragstart) * 0.005);
							newval = newval.toFixed(4);
						}

						// TODO: this is no good for floats
						if (newval != draglast) {
							draglast = newval;
							e.target.innerHTML = "" + newval;

							var content = e.target.parentNode.textContent;
							if (content.charAt(content.length-1) == "\n") {
								content = content.slice(0,-1);
							}
							replaceLine(dragline, content);

							scriptagent.setSource(intextarea.value);
							highlighter.ast = scriptagent.ast;

							// Execute if no errors!
							if (scriptagent.enabled && !scriptagent.hasErrors()) {
								scriptagent.executeLine(dragline);
							}

							highlightContent(scriptagent.ast, dragline, -1);
						}
					},
					start: function(e,u) {
						edited = true;
						// Calculate the line we are on
						dragline = findElementLineNumber(e.target);
						dragstart = u.position.left;
						var content = e.target.textContent;
						if (content.indexOf(".") == -1) {
							dragvalue = parseInt(content);
							dragint = true;
						} else {
							dragvalue = parseFloat(content);
							dragint = false;
						}
						draglast = dragvalue;

						$(e.target).addClass("eden-select");
						$(outdiv).css("cursor","ew-resize");
					},
					stop: function(e,u) {
						$(e.target).removeClass("eden-select");
						$(outdiv).css("cursor","text");
						//updateEntireHighlight();
						dragline = -1;
					},
					cursor: 'move',
					cursorAt: {top: -5, left: -5}
				});
			}
		}



		/**
		 * Return the current line. Also, set currentlineno.
		 */
		function getLineNumber(textarea) {
			var lines = textarea.value.substr(0, textarea.selectionStart).split("\n");
			currentlineno = lines.length;
			currentcharno = lines[lines.length-1].length;
			return currentlineno;
		}



		/**
		 * Turn the power button grey and disable live coding.
		 */
		function powerOff() {
			powerOk();
			$powerbutton.removeClass("power-on").addClass("power-off");
			scriptagent.setEnabled(false);
		}



		/**
		 * Turn the power button green and enable live coding.
		 */
		function powerOn() {
			$powerbutton.removeClass("power-off").addClass("power-on");
			scriptagent.setEnabled(true);
		}



		/**
		 * If we are live coding, turn the power button red.
		 */
		function powerError() {
			if (scriptagent.enabled) {
				$powerbutton.addClass("power-error");
			}
		}



		/**
		 * Remove error status, turning power button green again.
		 */
		function powerOk() {
			if ($powerbutton.hasClass("power-error")) {
				$powerbutton.removeClass("power-error");
			}
		}



		function powerToggle() {
			if (scriptagent.enabled) {
				powerOff();
			} else {
				powerOn();
			}
		}



		/**
		 * Move the caret of the contenteditable div showing the highlighted
		 * script to be the same location as the fake caret in the highlight
		 * itself. This enables shift selection using the browsers internal
		 * mechanism.
		 */
		function setCaretToFakeCaret() {
			var el = $(outdiv).find(".fake-caret").get(0);
			var range = document.createRange();
			var sel = window.getSelection();
			if (el.nextSibling) el = el.nextSibling;
			range.setStart(el, 0);
			range.collapse(true);
			sel.removeAllRanges();
			sel.addRange(range);
			// Finally, delete the fake caret
			$(outdiv).remove(".fake-caret");
		}



		/* Is this needed???? */
		function selectAll() {
			var range = document.createRange();
			range.selectNodeContents(outdiv);
			var sel = window.getSelection();
			sel.removeAllRanges();
			sel.addRange(range);
		}

		/**
		 * Script contents have changed, so re-parse, re-highlight and
		 * if live, re-execute. Used in a short interval timeout from the
		 * raw input/keyup events.
		 */
		function doRebuild() {
			// Regenerate the AST and highlight the code.
			if (refreshentire) {
				updateEntireHighlight();
				refreshentire = false;
			} else { // if (dirty) {
				updateLineHighlight();
			/*} else {
				updateLineCachedHighlight();*/
			}
			// Adjust scroll position if required
			checkScroll();
			dirty = false;
		}



		function runScript(line) {
			// If we should run the statement (there are no errors)
			if (scriptagent.enabled && !scriptagent.hasErrors()) {
				powerOk();
				scriptagent.executeLine(line-1);
				//console.log(highlighter.ast.lines);
			} else if (scriptagent.enabled) {
				powerError();
			}
		}



		function showSubDialog(name, callback, data) {
			if (EdenUI.plugins.ScriptInput.dialogs[name]) {
				EdenUI.plugins.ScriptInput.dialogs[name]($dialogContents, callback, data);
			}
		}



		/**
		 * Set the rebuild timeout. Note: rebuildinterval MUST be less that the
		 * keyboard repeat rate or you will not see a change when holding keys
		 * down.
		 */
		function rebuild() {
			edited = true;

			// Check saved status
			if (scriptagent.isSaved()) {
				setSubTitle("");
			}

			// Using a timer to make rebuild async. Allows input and keyup to
			// trigger a single rebuild which overcomes Chrome input event bug.
			clearTimeout(rebuildtimer);
			rebuildtimer = setTimeout(doRebuild, rebuildinterval);
		}



		/**
		 * Event handler for input change.
		 */
		function onInputChanged(e) {
			dirty = true;

			rebuild();

				/* Suggestions Box */
				//console.log(window.getSelection().getRangeAt(0));
				// Is there an abstract syntax tree node for this line?
				/*var curast = stream.ast.lines[stream.currentline-1];
				if (curast) {
					var pattern = stream.ast.getSource(curast).split("\n")[0];
					//console.log("Fill: " + pattern);

					// Get the current line and its screen position to
					// position the suggestions box correctly.
					var curlineele = $(textarea).find(".eden-currentline");
					var pos = curlineele.position();
					if (pos === undefined) pos = $(textarea).position();
					pos.top += $dialogContents.get(0).scrollTop;
					
					if (curast.type == "definition") {
						var rhs = pattern.split("is")[1].trim();
						//console.log("RHS: " + rhs);
						var sym = eden.root.lookup(curast.lvalue.observable);
						var def = sym.eden_definition;
						if (def) def = def.split("is")[1].trim();
						if (def && def.substr(0,rhs.length) == rhs) {
							//console.log("SUGGEST: " + sym.eden_definition);
							suggestions.text(sym.eden_definition.split("is")[1].trim());
							if (suggestions.is(":visible") == false) {
								suggestions.css("top",""+ (pos.top + 20) +"px");
								suggestions.show("fast");
							}
						} else {
							var regExp = new RegExp("^(" + rhs + ")", "");
							var suggest = "";
							var count = 0;
							var last = "";
							for (var s in eden.root.symbols) {
								if (regExp.test(s)) {
									count++;
									last = s;
									//console.log("SUGGEST: " + s);
									suggest += s + "<br/>";
								}
							}
							if (count > 1 || (count == 1 && rhs.length < last.length)) {
								suggestions.html(suggest);
								if (suggestions.is(":visible") == false) {
									suggestions.css("top",""+ (pos.top + 20) +"px");
									suggestions.show("fast");
								}
							} else {
								suggestions.hide("fast");
							}
						}
					} else {
						suggestions.hide("fast");
					}
				} else {
					suggestions.hide("fast");
				}*/
		}



		function enableInspectMode() {
			//outdiv.style.cursor = "pointer";
			//outdiv.contentEditable = false;
			outdiv.className = "outputcontent inspect";
			inspectmode = true;
			console.log("ENABLE INSPECT");
		}

		function disableInspectMode() {
			//outdiv.style.cursor = "initial";
			//outdiv.contentEditable = true;
			outdiv.className = "outputcontent";
			inspectmode = false;
			console.log("DISABLE INSPECT");
			updateEntireHighlight();
			intextarea.focus();
		}



		/**
		 * Various keys have special actions that require intercepting. Tab key
		 * must insert a tab, shift arrows etc cause selection and require a
		 * focus shift, and adding or deleting lines need to force a full
		 * rehighlight.
		 */
		function onTextKeyDown(e) {
			if (e.keyCode == 18) {
				enableInspectMode();
			} else if (!e.altKey) {
				// If not Ctrl or Shift key then
				if (!e.ctrlKey && e.keyCode != 17 && e.keyCode != 16) {
					// Make TAB key insert TABs instead of changing focus
					if (e.keyCode == 9) {
						e.preventDefault();
						var start = intextarea.selectionStart;
						var end = intextarea.selectionEnd;

						// set textarea value to: text before caret + tab + text after caret
						intextarea.value = intextarea.value.substring(0, start)
									+ "\t"
									+ intextarea.value.substring(end);

						// put caret at right position again
						intextarea.selectionStart =
						intextarea.selectionEnd = start + 1;
						//updateLineHighlight();
						rebuild();
					} else if (e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40 || e.keyCode == 36 || e.keyCode == 35) {
						// Shift arrow selection, move to editable div.
						if (e.shiftKey) {
							setCaretToFakeCaret();
							outdiv.focus();
							return;
						}
					
						// Update fake caret position at key repeat rate
						updateLineCachedHighlight();
						// Adjust scroll position if required
						checkScroll();
					} else if (e.keyCode == 13 || (e.keyCode == 8 && intextarea.value.charCodeAt(intextarea.selectionStart-1) == 10)) {
						// Adding or removing lines requires a full re-highlight at present
						refreshentire = true;
					}

				} else if (e.ctrlKey) {
					if (e.shiftKey) {
						if (e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40 || e.keyCode == 36 || e.keyCode == 35) {
							// Ctrl+Shift arrow selection, move to editable div.
							setCaretToFakeCaret();
							outdiv.focus();
							return;
						}
					} else if (e.keyCode === 38) {
						// up
						onPrevious();
					} else if (e.keyCode === 40) {
						// down
						onNext();
					} else if (e.keyCode === 86) {
						// Pasting so disable live code
						powerOff();
					} else if (e.keyCode === 65) {
						// Ctrl+A to select all.
						e.preventDefault();
						outdiv.focus();
						selectAll();
					}
				}
			}
		}



		/**
		 * Some keys don't change content but still need a rehighlight. And,
		 * in case the input change event is skipped (Chrome!!), make sure a
		 * rebuild does happen.
		 */
		function onTextKeyUp(e) {
			if (e.keyCode == 18) {
				disableInspectMode();
			} else if (!e.altKey) {
				if (!e.ctrlKey && (	e.keyCode == 37 ||	//Arrow keys
									e.keyCode == 38 ||
									e.keyCode == 39 ||
									e.keyCode == 40 ||
									e.keyCode == 36 ||	// Home key
									e.keyCode == 35)) {	// End key
					//var scrollpos = $codearea.get(0).scrollTop;
					updateLineCachedHighlight();
					//$codearea.scrollTop(scrollpos);
				} else if (e.ctrlKey && (e.keyCode == 86 || e.keyCode == 90)) {
					// Paste and undo/redo need to update content
					updateEntireHighlight();
				} else {
					rebuild();
				}
			}
		}



		/**
		 * When focus is on the output and a key is pressed. This occurs when
		 * text is selected that needs replacing.
		 */
		function onOutputKeyDown(e) {
			if (e.keyCode == 18) {
				enableInspectMode();
			} else if (!e.altKey) {
				if (outdiv.style.cursor == "pointer") outdiv.style.cursor = "initial";
				if (e.keyCode == 16 || e.keyCode == 17 || (e.ctrlKey && e.keyCode == 67)) {
					// Ignore Ctrl and Ctrl+C.
				// If not shift selecting...
				} else if (!(e.shiftKey && (e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40 || e.keyCode == 35 || e.keyCode == 36))) {
					var end = getCaretCharacterOffsetWithin(outdiv);
					var start = getStartCaretCharacterOffsetWithin(outdiv);

					intextarea.focus();
					intextarea.selectionEnd = end;
					intextarea.selectionStart = start;
				}
			}
		}



		function onOutputKeyUp(e) {
			if (e.keyCode == 18) {
				disableInspectMode();
			}
		}



		/**
		 * Make the caret look invisible. It must still exist to keep record
		 * of current location for selection purposes.
		 */
		function onTextBlur(e) {
			//$(outdiv).find(".fake-caret").addClass("fake-blur-caret");
			// Finally, delete the fake caret
			$(outdiv).find(".fake-caret").remove();
			hideInfoBox();
			//disableInspectMode();
		}



		/**
		 * Make the caret visible.
		 */
		function onTextFocus(e) {
			//$(outdiv).find(".fake-caret").removeClass("fake-blur-caret");
		}



		function openTab(path) {
			Eden.Agent.importAgent(path, ["disabled"], function(ag) {
				if (ag === undefined) {
					ag = new Eden.Agent(undefined, path, undefined, undefined);
				}
				var tabs = agent.state[obs_tabs];
				if (tabs.indexOf(path) == -1) {
					tabs.push(path);
					agent.state[obs_tabs] = tabs;
				}
				agent.state[obs_agent] = path;
				intextarea.focus();
			});
		}



		/**
		 * Clicking on the highlighted script needs to move the cursor position.
		 * Unless a selection is being made, in which case keep the focus on
		 * the highlighted output instead.
		 */
		function onOutputMouseUp(e) {
			hideInfoBox();
			hideMenu();

			if (inspectmode) {
				if (e.target.className == "eden-path") {
					//console.log();
					disableInspectMode();
					openTab(e.target.parentNode.textContent);
				} else if (e.target.className == "eden-observable") {
					var obs = e.target.getAttribute("data-observable");
					e.target.textContent =  Eden.edenCodeForValue(eden.root.lookup(obs).value());
					e.target.className += " select";
				} else if (e.target.className == "eden-observable select") {
					var obs = e.target.getAttribute("data-observable");
					e.target.textContent = obs;
					e.target.className = "eden-observable";
				}
			} else {
				// To prevent false cursor movement when dragging numbers...
				if (document.activeElement === outdiv) {
					var end = getCaretCharacterOffsetWithin(outdiv);
					var start = getStartCaretCharacterOffsetWithin(outdiv);
					if (start != end) {
						// Fix to overcome current line highlight bug on mouse select.
						refreshentire = true;
					} else {
						// Move caret to clicked location
						var curline = currentlineno;
						intextarea.focus();
						intextarea.selectionEnd = end;
						intextarea.selectionStart = end;		
						highlighter.highlight(highlighter.ast, curline, end);
						updateLineCachedHighlight();
						//checkScroll();
					}
				}
			}
		}



		function onMouseEnter(e) {
			if (inspectmode) {
				//console.log(e.target);
				if (e.target.className == "eden-path") {
					changeClass(e.target.parentNode, "hover", true);
				} else if (e.target.className == "eden-observable") {
					//changeClass(e.target, "hover", true);
				}
			}
		}

		function onMouseLeave(e) {
			if (e.target.className == "eden-path") {
				changeClass(e.target.parentNode, "hover", false);
			} else if (e.target.className == "eden-observable") {
				//changeClass(e.target, "hover", false);
			}
		}



		/*function onGutterClick(e) {
			//console.log(e);
			var lineno = -1;

			for (var i=0; i<gutter.gutter.childNodes.length; i++) {
				if (e.target === gutter.gutter.childNodes[i]) {
					lineno = i+1;
					break;
				}
			}

			if (scriptagent.ast.lines[lineno-1]) {
				if (scriptagent.ast.lines[lineno-1].errors.length > 0) {
					var err = scriptagent.ast.lines[lineno-1].errors[0];
					if (err.line == lineno || err.type == "runtime") {
						var taboffset = (agent.state[obs_showtabs]) ? 35 : 0;
						showInfoBox(e.target.offsetLeft+20, e.target.offsetTop-$codearea.get(0).scrollTop+25+taboffset, "error", err.messageText());
					}
				} else {
					scriptagent.clearExecutedState();
					scriptagent.executeLine(lineno-1);
					gutter.generate(scriptagent.ast, lineno);
				}
			}
		}*/



		/**
		 * Move script to previous in history, or toggle symbol for custom
		 * previous/next functionality.
		 */
		function onPrevious() {
			if (agent[obs_override] == true) {
				agent[obs_prev] = true;
				agent[obs_prev] = false;
			} else if (!readonly && scriptagent.canUndo()) {
				scriptagent.undo();
				intextarea.value = scriptagent.snapshot;
				updateEntireHighlight(true);
				updateHistoryButtons();
			}
		}



		/**
		 * Move script to next in history, or toggle symbol for custom
		 * previous/next functionality.
		 */
		function onNext() {
			if (agent[obs_override] == true) {
				agent[obs_next] = true;
				agent[obs_next] = false;
			} else if (!readonly && scriptagent.canRedo()) {
				scriptagent.redo();
				intextarea.value = scriptagent.snapshot;
				updateEntireHighlight(true);
				updateHistoryButtons();
			}
		}



		function onTabClick(e) {
			var name = e.target.getAttribute("data-name");
			console.log(name);
			agent.state[obs_agent] = name;
			intextarea.focus();
			updateHistoryButtons();
		}



		function onTabLeft() {
			if (tabscrollix > 0) {
				tabscrollix--;
				tabs.childNodes[tabscrollix+1].style.display = "initial";
			}
		}

		function onTabRight() {
			if (tabscrollix < tabs.childNodes.length-3) {
				tabs.childNodes[tabscrollix+1].style.display = "none";
				tabscrollix++;
			}
		}



		function onMenu() {
			$optionsmenu.toggle("slide", { direction: "down"}, 200);
		}



		function onNewTab() {
			showSubDialog("newAgent", function(status, value) {
				if (status) {
					Eden.Agent.importAgent(value, undefined, function(ag) {
						if (ag === undefined) {
							ag = new Eden.Agent(undefined, value, undefined, undefined);
						}
						var tabs = agent.state[obs_tabs];
						if (tabs.indexOf(value) == -1) {
							tabs.push(value);
							agent.state[obs_tabs] = tabs;
						}
						agent.state[obs_agent] = value;
						//changeAgent(undefined, value);
					});
				} else if (value) {
					showBrowseDialog();
				}
			});
		}



		function onTabDragStart(e) {
			var name = e.target.getAttribute("data-name");
			e.originalEvent.dataTransfer.setData("agent", name);
			if (scriptagent.name == name) {
				scriptagent.setOwned(false);
				readonly = true;
				setSubTitle("[readonly]");
				outdiv.className = "outputcontent readonly";
				outdiv.contentEditable = false;
			}
		}

		function onTabDragOver(e) {
			e.preventDefault();
		}

		function onTabDrop(e) {
			e.stopPropagation();
			e.preventDefault();
			var value = e.originalEvent.dataTransfer.getData("agent");
			
			if (!value || value == "") {
				if (window.FileReader) {
					var files = e.originalEvent.dataTransfer.files;
					for (var i=0; i<files.length; i++) {
						var file = files[i];
						if (file.name.match(/.*\.jse|.*\.js-e/)) {
							var agentname = file.name.slice(0,-4);
							agentname = agentname.replace(/[\.\-\/\s]/g, "");
							agentname = "local/file/"+agentname;

							var reader = new FileReader();
							reader.onload = function(e2) {
								var ag = new Eden.Agent(undefined, agentname);
								ag.setSource(e2.target.result);
								var tabs = agent.state[obs_tabs];
								if (tabs.indexOf(agentname) == -1) {
									tabs.push(agentname);
									agent.state[obs_tabs] = tabs;
								}
							}
							reader.readAsText(file);
						}
					}
				}
				return;
			}

			var tabs = agent.state[obs_tabs];
			if (tabs.indexOf(value) == -1) {
				tabs.push(value);
				agent.state[obs_tabs] = tabs;
			}
			agent.state[obs_agent] = value;
		}

		function onTabDragEnd(e) {
			var value = e.target.getAttribute("data-name");
			if (e.originalEvent.dataTransfer.dropEffect != 'none') {
				console.log("DRAGEND: " + value);
				var tabs = agent.state[obs_tabs];
				var ix = tabs.indexOf(value);
				if (ix >= 0) {
					tabs.splice(ix,1);
					ix--;
					if (ix < 0) ix = 0;
					if (ix < tabs.length) {
						agent.state[obs_agent] = tabs[ix];
					}
					agent.state[obs_tabs] = tabs;
				}
			} else if (scriptagent.name == value) {
				scriptagent.setOwned(true);
				readonly = false;
				setSubTitle("");
				outdiv.className = "outputcontent";
				outdiv.contentEditable = true;
			}
		}



		// Set the event handlers
		$dialogContents
		.on('input', '.hidden-textarea', onInputChanged)
		.on('keydown', '.hidden-textarea', onTextKeyDown)
		.on('keyup', '.hidden-textarea', onTextKeyUp)
		.on('keydown', '.outputcontent', onOutputKeyDown)
		.on('keyup', '.outputcontent', onOutputKeyUp)
		.on('blur', '.hidden-textarea', onTextBlur)
		.on('focus', '.hidden-textarea', onTextFocus)
		.on('mouseup', '.outputcontent', onOutputMouseUp)
		.on('mouseenter', 'span', onMouseEnter)
		.on('mouseleave', 'span', onMouseLeave)
		.on('click', '.previous-input', onPrevious)
		.on('click', '.next-input', onNext)
		.on('click', '.menu-input', onMenu)
		//.on('click', '.eden-gutter-item', onGutterClick)
		.on('click', '.agent-tab', onTabClick)
		.on('click', '.agent-tableft', onTabLeft)
		.on('click', '.agent-tabright', onTabRight)
		.on('click', '.agent-newtab', onNewTab)
		.on('dragstart', '.agent-tab', onTabDragStart)
		.on('dragend', '.agent-tab', onTabDragEnd)
		.on('dragover', onTabDragOver)
		.on('drop', onTabDrop);

		//$dialogContents.get(0).ondrop = function(e) { console.log(e); };

		$powerbutton.click(function (e) {
			if (!readonly) {
				scriptagent.setEnabled(!scriptagent.enabled);

				if (scriptagent.enabled) {
					powerOn();
					updateEntireHighlight(true);
					//me.submit(highlighter.ast.script, highlighter.ast);
				} else {
					powerOff();
				}
			}
		});

		// Initialise contents if given some code
		if (code) {
			intextarea.value = EdenUI.plugins.ScriptInput.buildScriptFromList(code);
			updateEntireHighlight();
		}

		var viewdata = {
			contents: $dialogContents,
			update: function(data) {
				if (edited == false) {
					if (data instanceof Symbol) {
						agent.setScope(data.getValueScope(eden.root.scope));
						intextarea.value = EdenUI.plugins.ScriptInput.buildScriptFromList(agent.code);
						updateEntireHighlight();
					} else if (data instanceof Array) {
						intextarea.value = EdenUI.plugins.ScriptInput.buildScriptFromList(data);
						updateEntireHighlight();
					}
				}
			},
			close: function() {
				console.log("CLOSE SCRIPT");
				clearInterval(gutterinterval);
				Eden.Agent.unlisten(agent);
				scriptagent.setOwned(false);
				scriptagent = undefined;
				Eden.Agent.remove(agent);
				agent = undefined;
			},
			setValue: function (value) { powerOff(); intextarea.value = value; updateEntireHighlight(); }
		}

		if (power) powerOn();

		// Initialise highlight content
		updateEntireHighlight();

		return viewdata;
	};



	this.createDialog = function(name, mtitle, code) {
		var simpleName = name.slice(0, -7);
		var viewdata = me.createCommon(simpleName, mtitle, code, false, false);

		var idealheight = 305;
		if (code) {
			var linecount = viewdata.contents.find("textarea").val().split("\n").length;
			idealheight = EdenUI.plugins.ScriptInput.getRequiredHeight(linecount + 1);
		}

		$dialog = $('<div id="'+name+'"></div>')
			.html(viewdata.contents)
			.dialog({
				title: mtitle,
				width: 500,
				height: idealheight,
				minHeight: 203,
				minWidth: 300,
				dialogClass: "input-dialog",
				close: viewdata.close
			});

		viewdata.confirmClose = !("MenuBar" in edenUI.plugins);

		return viewdata;
	};

	this.createEmbedded = function(name, mtitle, code, power) {
		var viewdata = me.createCommon(name, mtitle, code, power, true);
		return viewdata;
	}



	edenUI.views.ScriptInput = {
		dialog: this.createDialog,
		embed: this.createEmbedded,
		title: Language.ui.input_window.title,
		category: edenUI.viewCategories.interpretation,
		menuPriority: 0
	};

	edenUI.views.History = {
		dialog: this.createHistory,
		title: "Input History",
		category: edenUI.viewCategories.history
	};
	
	edenUI.history = this.history;
	
	success();
};

EdenUI.plugins.ScriptInput.buildScriptFromList = function(value) {
	var res = "";
	if (value instanceof Array) {
		for (var i=0; i < value.length; i++) {
			if (typeof value[i] == "string") {
				res += value[i] + "\n";
			} else if (typeof value[i] == "object") {
				if (value[i].definition !== undefined) {
					res += value[i].eden_definition+"\n";
				} else {
					var name = value[i].name.slice(1);
					res += name + " = " + Eden.edenCodeForValue(value[i].value()) + ";\n";
				}
			}
		}
	}
	return res;
};

/**
 * Returns the required height in pixels to display the specified number
 * of lines. Used for embedding an input window.
 */
EdenUI.plugins.ScriptInput.getRequiredHeight = function(lines, embed) {
	if (embed) {
		return 15 + 20 * lines;
	} else {
		return 15 + 30 + 20 * lines + 20;
	}
};



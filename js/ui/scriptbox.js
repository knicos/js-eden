EdenUI.ScriptBox = function(element, options) {
	this.changeCB = undefined;
	this.outer = element;
	this.savecb = undefined;

	// Construct the inner elements required.
	this.contents = $(this.outer);
	this.contents.html('<div class="scriptbox-inputhider"><textarea autofocus tabindex="1" class="hidden-textarea"></textarea><div class="scriptbox-codearea"></div></div><div class="outputbox"></div><div class="info-bar"></div></div>');
	//this.outer.appendChild(this.contents.get(0));

	//this.statements = [""];
	//var dstat = new Eden.Statement();
	this.currentstatement = undefined;
	this.statements = {};

	this.$codearea = this.contents.find('.scriptbox-codearea');
	this.codearea = this.$codearea.get(0);
	this.intextarea = this.contents.find('.hidden-textarea').get(0);
	//this.$codearea.append($('<div class="scriptbox-statement" data-statement="'+(dstat.id)+'"><div class="grippy"></div><div class="scriptbox-sticky stuck"></div><div class="scriptbox-gutter" data-statement="'+dstat.id+'"></div><div spellcheck="false" tabindex="2" contenteditable class="scriptbox-output" data-statement="'+dstat.id+'"></div></div>'));
	this.outdiv = this.contents.find('.scriptbox-output').get(0);
	this.$codearea.sortable({revert: 100, handle: ".grippy",
		distance: 10, axis: "y", scroll: false});
	//this.statements[dstat.id] = this.outdiv.parentNode;
	this.infobox = this.contents.find('.info-bar').get(0);
	this.outputbox = this.contents.find('.outputbox').get(0);
	this.suggestions = this.contents.find('.eden_suggestions');
	this.suggestions.hide();
	$(this.infobox).hide();
	this.highlighter = new EdenUI.Highlight(this.outdiv);

	//changeClass(this.outdiv.parentNode.firstChild, "play", true);

	this.ast = undefined;
	this.refreshentire = false;
	this.dirty = true;
	this.inspectmode = false;
	this.gotomode = false;
	this.rebuildtimer = undefined;
	this.rebuildtimeout = 10;
	this.currentlineno = 1;
	this.currentcharno = 0;
	this.dragint = false;
	this.dragline = -1;
	this.dragvalue = 0;
	this.draglast = 0;
	this.showstars = (options && options.nobuttons !== undefined) ? !options.nobuttons : true;

	this.valuedivs = {};

	var me = this;

	eden.root.addGlobal(function(sym, create) {
		var symname = sym.name.slice(1);
		var stats = Eden.Statement.symbols[symname];
		if (stats) {
			for (var x in stats) {
				//console.log(me.statements[x]);
				if (stats[x] && me.statements[stats[x].id]) {
					//me.statements[stats[i].id].get(0).firstChild;
					//console.log("CHANGE TO STAT " + stats[x].id);
					if (stats[x].id != sym.statid) {
						changeClass(me.statements[stats[x].id].childNodes[(me.showstars)?2:1], "active", false);
						changeClass(me.statements[stats[x].id].childNodes[(me.showstars)?2:1], "last", false);
					} else {
						if (sym.definition) {
							changeClass(me.statements[stats[x].id].childNodes[(me.showstars)?2:1], "active", true);
							changeClass(me.statements[stats[x].id].childNodes[(me.showstars)?2:1], "last", false);
						} else {
							changeClass(me.statements[stats[x].id].childNodes[(me.showstars)?2:1], "last", true);
							changeClass(me.statements[stats[x].id].childNodes[(me.showstars)?2:1], "active", false);
						}
					}
				}
			}
		}
	});

	/**
	 * Event handler for input change.
	 */
	function onInputChanged(e) {
		me.dirty = true;

		me.rebuild();

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
		//me.outdiv.contentEditable = false;
		changeClass(me.outdiv, "inspect", true);
		me.inspectmode = true;
		// TODO Remove caret and merge those spans
		//updateInspectButton();
		//setSubTitle("[inspecting]");
	}

	function enableGotoMode() {
		//me.outdiv.contentEditable = false;
		changeClass(me.outdiv, "goto", true);
		me.gotomode = true;
	}

	function disableGotoMode() {
		changeClass(me.outdiv, "goto", false);
		me.gotomode = false;
		me.updateEntireHighlight();
		me.intextarea.focus();
	}

	function disableInspectMode() {
		changeClass(me.outdiv, "inspect", false);
		me.inspectmode = false;
		me.updateEntireHighlight();
		me.intextarea.focus();
		//updateInspectButton();
		//if (readonly) {
		//	setSubTitle("[readonly]");
		//} else {
		//	setSubTitle("");
			me.outdiv.contentEditable = true;
		//}
	}



	/**
	 * Various keys have special actions that require intercepting. Tab key
	 * must insert a tab, shift arrows etc cause selection and require a
	 * focus shift, and adding or deleting lines need to force a full
	 * rehighlight.
	 */
	function onTextKeyDown(e) {
		// Alt and AltGr for inspect mode.
		//console.log(e.keyCode);

		if (me.ast.script && !me.ast.hasErrors() && e.keyCode == 13 && me.ast.token == "EOF" && me.intextarea.selectionStart >= me.ast.script.end) {
			console.log("BREAK TO NEW BOX");
			me.insertStatement(undefined, true);
			me.setSource("");
			e.preventDefault();
			return;
		}

		//if (e.keyCode == 18 || e.keyCode == 225) {
		if (e.altKey && e.keyCode == 73) {
			me.enableInspectMode();
		} else if (!e.altKey) {
			// Don't allow editing in inspect mode.
			if (me.inspectmode) {
				e.preventDefault();
				return;
			}

			// If not Ctrl or Shift key then
			if (!e.ctrlKey && e.keyCode != 17 && e.keyCode != 16) {
				// Make TAB key insert TABs instead of changing focus
				if (e.keyCode == 9) {
					e.preventDefault();
					var start = me.intextarea.selectionStart;
					var end = me.intextarea.selectionEnd;

					// set textarea value to: text before caret + tab + text after caret
					me.intextarea.value = me.intextarea.value.substring(0, start)
								+ "\t"
								+ me.intextarea.value.substring(end);

					// put caret at right position again
					me.intextarea.selectionStart =
					me.intextarea.selectionEnd = start + 1;
					//updateLineHighlight();
					me.rebuild();
				} else if (e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40 || e.keyCode == 36 || e.keyCode == 35) {
					// Shift arrow selection, move to editable div.
					if (e.shiftKey) {
						me.setCaretToFakeCaret();
						me.outdiv.focus();
						return;
					}
				
					// Update fake caret position at key repeat rate
					me.updateLineCachedHighlight();
					// Adjust scroll position if required
					//checkScroll();
				} else if (e.keyCode == 13 || (e.keyCode == 8 && me.intextarea.value.charCodeAt(me.intextarea.selectionStart-1) == 10)) {
					// Adding or removing lines requires a full re-highlight at present
					me.refreshentire = true;
				}

			} else if (e.ctrlKey) {
				if (e.shiftKey) {
					if (e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40 || e.keyCode == 36 || e.keyCode == 35) {
						// Ctrl+Shift arrow selection, move to editable div.
						me.setCaretToFakeCaret();
						me.outdiv.focus();
						return;
					}
				} else if (e.keyCode === 38) {
					// up
					onPrevious();
				} else if (e.keyCode === 40) {
					// down
					onNext();
				} else if (e.keyCode === 86) {

				} else if (e.keyCode === 65) {
					// Ctrl+A to select all.
					e.preventDefault();
					me.outdiv.focus();
					//me.selectAll();
				} else if (e.keyCode === 17) {
					//console.log(e.keyCode);
					me.enableGotoMode();
				}
			}
		} else {
			// Alt key is pressed so.....
			if (e.keyCode == 187 || e.keyCode == 61) {
				// Alt+Plus: Zoom in
				//agent.state[obs_zoom]++;
				e.preventDefault();
			} else if (e.keyCode == 189 || e.keyCode == 173) {
				// Alt+Minus: Zoom out
				//agent.state[obs_zoom]--;
				e.preventDefault();
			} else if (e.keyCode == 48) {
				//Alt+0
				//agent.state[obs_zoom] = 0;
				e.preventDefault();
			}
		}
	}



	function onTextPaste(e) {
		me.refreshentire = true;
	}



	/**
	 * Some keys don't change content but still need a rehighlight. And,
	 * in case the input change event is skipped (Chrome!!), make sure a
	 * rebuild does happen.
	 */
	function onTextKeyUp(e) {
		// Alt and AltGr for disable inspect mode.
		if (e.keyCode == 17) {
			me.disableGotoMode();
		} else if (e.keyCode == 18 || (e.altKey && e.keyCode == 73)) {
			me.disableInspectMode();
			e.preventDefault();
		} else if (!e.altKey) {
			if (!e.ctrlKey && (	e.keyCode == 37 ||	//Arrow keys
								e.keyCode == 38 ||
								e.keyCode == 39 ||
								e.keyCode == 40 ||
								e.keyCode == 36 ||	// Home key
								e.keyCode == 35)) {	// End key

				me.updateLineCachedHighlight();

				// Force a scroll for home and end AFTER key press...
				if (e.keyCode == 36 || e.keyCode == 35) {
					//checkScroll();
				}
			} else {
				if (!e.ctrlKey && e.keyCode == 8 && me.intextarea.value == "") {
					me.removeStatement();
				} else {
					me.rebuild();
				}
			}
		}
	}



	/**
	 * When focus is on the output and a key is pressed. This occurs when
	 * text is selected that needs replacing.
	 */
	function onOutputKeyDown(e) {
		// Alt and AltGr for inspect mode.
		if (e.altKey && e.keyCode == 73) {
			me.enableInspectMode();
		} else if (!e.altKey) {
			if (me.outdiv.style.cursor == "pointer") me.outdiv.style.cursor = "initial";
			if (e.keyCode == 16 || e.keyCode == 17 || (e.ctrlKey && e.keyCode == 67)) {
				// Ignore Ctrl and Ctrl+C.
			// If not shift selecting...
			} else if (!(e.shiftKey && (e.keyCode == 37 || e.keyCode == 38 || e.keyCode == 39 || e.keyCode == 40 || e.keyCode == 35 || e.keyCode == 36))) {
				var end = getCaretCharacterOffsetWithin(me.outdiv,me.shadow);
				var start = getStartCaretCharacterOffsetWithin(me.outdiv,me.shadow);

				me.intextarea.focus();
				me.intextarea.selectionEnd = end;
				me.intextarea.selectionStart = start;
				if (start != end) me.refreshentire = true;
			}
		}
	}



	function onOutputPaste(e) {
		me.intextarea.focus();
		setTimeout(function() { me.updateEntireHighlight(); }, 0);
	}



	function onOutputKeyUp(e) {
		if (e.keyCode == 18 || (e.altKey && e.keyCode == 73)) {
			me.disableInspectMode();
			e.preventDefault();
		} else if (e.keyCode == 17) {
			me.disableGotoMode();
		}
	}



	/**
	 * Make the caret look invisible. It must still exist to keep record
	 * of current location for selection purposes.
	 */
	function onTextBlur(e) {
		//$(outdiv).find(".fake-caret").addClass("fake-blur-caret");
		// Finally, delete the fake caret
		$(me.outdiv).find(".fake-caret").remove();
		me.hideInfoBox();
		//disableInspectMode();
	}



	/**
	 * Make the caret visible.
	 */
	function onTextFocus(e) {
		//$(outdiv).find(".fake-caret").removeClass("fake-blur-caret");
	}

	/**
	 * Clicking on the highlighted script needs to move the cursor position.
	 * Unless a selection is being made, in which case keep the focus on
	 * the highlighted output instead.
	 */
	function onOutputMouseUp(e) {
		me.hideInfoBox();
		//me.hideMenu();

		/*if (e.currentTarget !== me.outdiv) {
			//Eden.Statement.statements[me.currentstatement].setSource(me.intextarea.value, me.ast);
			var num = parseInt(e.currentTarget.getAttribute("data-statement"));
			me.moveTo(num);
			//return;
		}*/

		if (me.inspectmode) {
			/*var element = e.target;
			if (element.className == "" && element.parentNode.nodeName == "SPAN") {
				element = element.parentNode;
			}
			if (element.className == "eden-path") {
				//console.log();
				me.disableInspectMode();
				var path = element.parentNode.textContent.split("@");
				if (path.length == 1) {
					//openTab(path[0]);
				} else {
					//openTab(path[0], path[1]);
				}
			} else if (element.className == "eden-observable") {
				var obs = element.getAttribute("data-observable");
				element.textContent =  Eden.edenCodeForValue(eden.root.lookup(obs).value());
				element.className += " select";
			} else if (element.className == "eden-observable select") {
				var obs = element.getAttribute("data-observable");
				element.textContent = obs;
				element.className = "eden-observable";
			}
			e.preventDefault();*/
		} else if (me.gotomode) {
			var element = e.target;
			if (element.className == "" && element.parentNode.nodeName == "SPAN") {
				element = element.parentNode;
			}
			if (element.className == "eden-path") {
				//console.log();
				me.disableGotoMode();
				var path = element.parentNode.textContent.split("@");
				if (path.length == 1) {
					//openTab(path[0]);
				} else {
					//openTab(path[0], path[1]);
				}
			} else if (element.className && element.className.indexOf("eden-observable") != -1) {
				var obs = element.getAttribute("data-observable");

				var stat = Eden.Statement.statements[me.currentstatement];
				if ((stat.statement.type == "definition" || stat.statement.type == "assignment") && stat.statement.lvalue.name == obs) {
					console.log("SHOW VALUE FOR " + obs);
					//var sym = eden.root.symbols[obs];
					var valdiv = $('<div class="scriptbox-value"><div class="scriptbox-valueclose">&#xf00d;</div><div class="scriptbox-valuecontent"></div></div>');
					valdiv.find(".scriptbox-valuecontent").html("...");
					me.outdiv.parentNode.appendChild(valdiv[0]);
					me.valuedivs[stat.id] = valdiv;
				} else {
					console.log("GOTO: " + obs);
					var sym = eden.root.symbols[obs];
					if (sym && sym.statid) {
						me.insertStatement(Eden.Statement.statements[sym.statid]);
					}
				}
			}
			e.preventDefault();
		} else {
			// To prevent false cursor movement when dragging numbers...
			if (document.activeElement === me.outdiv) {
				var end = getCaretCharacterOffsetWithin(me.outdiv,me.shadow);
				var start = getStartCaretCharacterOffsetWithin(me.outdiv,me.shadow);
				if (start != end) {
					// Fix to overcome current line highlight bug on mouse select.
					me.refreshentire = true;
				} else {
					// Move caret to clicked location
					var curline = me.currentlineno;
					me.intextarea.focus();
					me.intextarea.selectionEnd = end;
					me.intextarea.selectionStart = end;
					if (me.ast) {		
						me.highlighter.highlight(me.ast, curline, end);
						me.updateLineCachedHighlight();
					}
					//checkScroll();
				}
			}
		}
	}

	function onGutterClick(e) {
		var num = parseInt(e.currentTarget.getAttribute("data-statement"));
		var stat = Eden.Statement.statements[num];

		if (stat.statement && stat.statement.errors.length == 0) {
			stat.statement.execute(eden.root, stat.ast, stat.ast, eden.root.scope);
			if (stat.statement.type == "when") {
				Eden.Statement.active[stat.id] = (Eden.Statement.active[stat.id]) ? false : true;
				changeClass(e.currentTarget, "active", Eden.Statement.active[stat.id]);
			}
		} else {
			if (stat.ast && stat.ast.script) {
				var err = stat.ast.script.errors[0];
				me.showInfoBox(e.target.offsetLeft+20, e.target.offsetTop-me.codearea.scrollTop+25, "error", err.messageText());
			}
		}
		me.updateLineCachedHighlight();
		//changeClass(e.currentTarget,"active",true);
	}

	function onStickyClick(e) {
		if (e.currentTarget.className.indexOf("stuck") >= 0) {
			changeClass(e.currentTarget,"stuck",false);
		} else {
			changeClass(e.currentTarget,"stuck",true);
		}
	}

	function onStatementClick(e) {
		if (me.dragline == -1 && (me.outdiv === undefined || e.currentTarget !== me.outdiv.parentNode)) {
			//Eden.Statement.statements[me.currentstatement].setSource(me.intextarea.value, me.ast);
			var num = parseInt(e.currentTarget.getAttribute("data-statement"));
			me.moveTo(num);
			//return;
			//me.outdiv.focus();
		}
	}

	function onValueClose(e) {
		var node = e.currentTarget.parentNode.parentNode;
		var num = parseInt(node.getAttribute("data-statement"));
		node.removeChild(me.valuedivs[num][0]);
		delete me.valuedivs[num];
	}

	// Set the event handlers
	this.contents
	.on('input', '.hidden-textarea', onInputChanged)
	.on('keydown', '.hidden-textarea', onTextKeyDown)
	.on('keyup', '.hidden-textarea', onTextKeyUp)
	.on('paste', '.hidden-textarea', onTextPaste)
	.on('keydown', '.scriptbox-output', onOutputKeyDown)
	.on('keyup', '.scriptbox-output', onOutputKeyUp)
	.on('paste', '.scriptbox-output', onOutputPaste)
	.on('blur', '.hidden-textarea', onTextBlur)
	.on('focus', '.hidden-textarea', onTextFocus)
	.on('mouseup', '.scriptbox-output', onOutputMouseUp)
	.on('click','.scriptbox-gutter', onGutterClick)
	.on('click','.scriptbox-sticky', onStickyClick)
	.on('click','.scriptbox-valueclose', onValueClose)
	.on('mousedown','.scriptbox-statement', onStatementClick);
	
	this.setSource("");

	setInterval(function() {
		for (var x in me.valuedivs) {
			//console.log("UPDATE: " + x);
			var stat = Eden.Statement.statements[x];
			var valhtml = EdenUI.htmlForStatement(stat,30,30);
			//var valhtml = EdenUI.Highlight.html(val)
			var active = stat.isActive();

			//if (active) {
				me.valuedivs[x].innerHTML = '<div class="eden-line">'+valhtml+'</div>';
				//me.valuedivs[x].removeClass("inactive");
			//} else {
			//	me.valuedivs[x].innerHTML = valhtml;
				//me.valuedivs[x].addClass("inactive");
			//}
		}
	}, 200);
}

/**
 * Move the caret of the contenteditable div showing the highlighted
 * script to be the same location as the fake caret in the highlight
 * itself. This enables shift selection using the browsers internal
 * mechanism.
 */
EdenUI.ScriptBox.prototype.setCaretToFakeCaret = function() {
	var el = $(me.outdiv).find(".fake-caret").get(0);
	var range = document.createRange();
	var sel = window.getSelection();
	if (el.nextSibling) el = el.nextSibling;
	range.setStart(el, 0);
	range.collapse(true);
	sel.removeAllRanges();
	sel.addRange(range);
	// Finally, delete the fake caret
	$(me.outdiv).remove(".fake-caret");
}

EdenUI.ScriptBox.prototype.setChangeCB = function(cb) {
	this.savecb = cb;
}

EdenUI.ScriptBox.prototype.moveTo = function(num) {
	if (num == this.currentstatement) return;
	this.disable();
	this.changeOutput($(this.statements[num]).find(".scriptbox-output").get(0));
	this.currentstatement = num;
	this.enable();
	this.setSource(Eden.Statement.statements[this.currentstatement].source);
}

EdenUI.ScriptBox.prototype.changeOutput = function(newoutput) {
	//this.disable();
	//changeClass(this.outdiv.parentNode.firstChild, "play", false);
	if (this.outdiv) {
		$(this.outdiv).find(".fake-caret").remove();
	}
	this.outdiv = newoutput;
	//changeClass(this.outdiv.parentNode.firstChild, "play", true);
	this.highlighter = new EdenUI.Highlight(this.outdiv);
	//this.enable();
}

EdenUI.ScriptBox.prototype.insertStatement = function(stat, stick) {
	if (this.currentstatement !== undefined) {
		Eden.Statement.statements[this.currentstatement].setSource(this.intextarea.value,this.ast);
	}
	if (stat === undefined) {
		stat = new Eden.Statement();
	}
	var newout = $(this.statements[stat.id]);
	//this.$codearea.append(newout);
	if (this.statements[stat.id] === undefined) {
		var stars = (this.showstars) ? '<div class="scriptbox-sticky'+((stick)?" stuck":"")+'"></div>' : "";
		newout = $('<div class="scriptbox-statement" data-statement="'+(stat.id)+'"><div class="grippy"></div>'+stars+'<div class="scriptbox-gutter" data-statement="'+(stat.id)+'"></div><div spellcheck="false" tabindex="2" contenteditable class="scriptbox-output" data-statement="'+(stat.id)+'"></div></div>');
		if (this.outdiv) newout.insertAfter($(this.outdiv.parentNode));
		else newout.appendTo(this.$codearea);
		this.statements[stat.id] = newout.get(0);
	}
	this.moveTo(stat.id);
	//this.currentstatement = stat.id;
	//this.statements.push("");
	//this.changeOutput(newout.find(".scriptbox-output").get(0));
	//this.setSource(stat.source);
	if (stat.isActive()) {
		if (stat.statement.type == "assignment") {
			changeClass(this.statements[stat.id].childNodes[(this.showstars)?2:1],"last",true);
		} else {
			changeClass(this.statements[stat.id].childNodes[(this.showstars)?2:1],"active",true);
		}
	}

	if (this.savecb) this.savecb.call(this);
}

EdenUI.ScriptBox.prototype.removeStatement = function(num) {
	if (num === undefined) num = this.currentstatement;
	var parent = this.outdiv.parentNode.parentNode;
	if (parent.childNodes.length == 1) return;
	for (var i=0; i<parent.childNodes.length; i++) {
		var node = parent.childNodes[i];
		var snum = parseInt(node.getAttribute("data-statement"));
		if (snum == num) {
			this.statements[num] = undefined;
			if (this.outdiv === node) {
				if (this.outdiv.previousChild) this.changeOutput(this.outdiv.previousChild);
				else if (this.outdiv.nextChild) this.changeOutput(this.outdiv.nextChild);
				else break;
			}
			parent.removeChild(node);

			// Now actually delete the statement
			var stat = Eden.Statement.statements[snum];
			if (stat.source == "") Eden.Statement.statements[snum] = undefined;

			break;
		}
	}

	if (this.valuedivs[num]) delete this.valuedivs[num];

	if (this.savecb) this.savecb.call(this);
}

EdenUI.ScriptBox.prototype.clearEmpty = function() {
	if (this.outdiv === undefined || this.currentstatement === undefined) return;
	var parent = this.outdiv.parentNode.parentNode;
	var dnum;

	node = parent.firstChild;
	while (node) {
		//var node = parent.childNodes[i];
		var cachenext = node.nextSibling;
		//console.log(node);
		var snum = parseInt(node.getAttribute("data-statement"));
		if (Eden.Statement.statements[snum].source == "") {
			if (this.outdiv && this.outdiv.parentNode === node) {
				if (node.previousSibling) {
					dnum = parseInt(node.previousSibling.getAttribute("data-statement"));
				//} else if (node.nextSibling) {
				//	dnum = parseInt(node.nextSibling.getAttribute("data-statement"));
				} else {
					this.currentstatement = undefined;
					this.outdiv = undefined;
					dnum = undefined;
				}
			}
			this.statements[snum] = undefined;
			parent.removeChild(node);

			// Now actually delete the statement
			var stat = Eden.Statement.statements[snum];
			if (stat.source == "") Eden.Statement.statements[snum] = undefined;

			if (this.valuedivs[snum]) delete this.valuedivs[snum];
		}
		node = cachenext;
	}

	if (dnum !== undefined) this.moveTo(dnum);

	//if (parent.childNodes.length == 0) this.insertStatement();

	//if (this.savecb) this.savecb.call(this);
}

EdenUI.ScriptBox.prototype.clearAll = function() {
	if (this.outdiv === undefined) return;
	var parent = this.outdiv.parentNode.parentNode;
	//var dnum;
	node = parent.firstChild;
	while (node) {
		//var node = parent.childNodes[i];
		var cachenext = node.nextSibling;
		//console.log(node);
		var snum = parseInt(node.getAttribute("data-statement"));
		//if (node.childNodes[2].className.indexOf("stuck") == -1) {
			this.statements[snum] = undefined;
			parent.removeChild(node);
			//break;
		//}
		// Now actually delete the statement
		var stat = Eden.Statement.statements[snum];
		if (stat.source == "") Eden.Statement.statements[snum] = undefined;
		node = cachenext;
	}

	//var dstat = new Eden.Statement();
	this.currentstatement = undefined;
	//this.$codearea.append($('<div class="scriptbox-statement" data-statement="'+(dstat.id)+'"><div class="grippy"></div><input type="checkbox" class="scriptbox-check"></input><div class="scriptbox-sticky stuck"></div><div class="scriptbox-gutter" data-statement="'+dstat.id+'"></div><div spellcheck="false" tabindex="2" contenteditable class="scriptbox-output" data-statement="'+dstat.id+'"></div></div>'));
	this.outdiv = undefined;

	this.valuedivs = {};
}

EdenUI.ScriptBox.prototype.unstickAll = function() {
	var parent = this.outdiv.parentNode.parentNode;
	for (var i=0; i<parent.childNodes.length; i++) {
		changeClass(parent.childNodes[i].childNodes[1], "stuck", false);
	}
}

EdenUI.ScriptBox.prototype.stickAll = function() {
	var parent = this.outdiv.parentNode.parentNode;
	for (var i=0; i<parent.childNodes.length; i++) {
		changeClass(parent.childNodes[i].childNodes[1], "stuck", true);
	}
}

EdenUI.ScriptBox.prototype.activateAll = function() {
	var parent = this.outdiv.parentNode.parentNode;
	for (var i=0; i<parent.childNodes.length; i++) {
		var num = parseInt(parent.childNodes[i].getAttribute("data-statement"));
		var stat = Eden.Statement.statements[num];
		if (stat) stat.activate();
	}
}

EdenUI.ScriptBox.prototype.clearUnstuck = function() {
	var parent = this.outdiv.parentNode.parentNode;
	var dnum;

	node = parent.firstChild;
	while (node) {
		//var node = parent.childNodes[i];
		var cachenext = node.nextSibling;
		//console.log(node);
		var snum = parseInt(node.getAttribute("data-statement"));
		if (node.childNodes[1].className.indexOf("stuck") == -1) {
			if (this.outdiv && this.outdiv.parentNode === node) {
				if (node.previousSibling) {
					dnum = parseInt(node.previousSibling.getAttribute("data-statement"));
				//} else if (node.nextSibling) {
				//	dnum = parseInt(node.nextSibling.getAttribute("data-statement"));
				} else {
					this.currentstatement = undefined;
					this.outdiv = undefined;
					dnum = undefined;
				}
			}
			this.statements[snum] = undefined;
			parent.removeChild(node);

			// Now actually delete the statement
			var stat = Eden.Statement.statements[snum];
			if (stat.source == "") Eden.Statement.statements[snum] = undefined;

			if (this.valuedivs[snum]) delete this.valuedivs[snum];
		}
		node = cachenext;
	}

	if (dnum !== undefined) this.moveTo(dnum);

	if (parent.childNodes.length == 0) this.insertStatement();

	if (this.savecb) this.savecb.call(this);
}

EdenUI.ScriptBox.prototype.cloneStuck = function() {
	var parent = this.outdiv.parentNode.parentNode;
	var toinsert = [];

	node = parent.firstChild;
	while (node) {
		//console.log(node);
		var snum = parseInt(node.getAttribute("data-statement"));
		if (node.childNodes[1].className.indexOf("stuck") != -1) {
			toinsert.push(snum);
		}
		node = node.nextSibling;
	}

	for (var i=0; i<toinsert.length; i++) {
		var nstat = new Eden.Statement();
		nstat.setSource(Eden.Statement.statements[toinsert[i]].source);
		this.insertStatement(nstat, true);
	}
}

EdenUI.ScriptBox.prototype.hideInfoBox = function() {
	$(this.infobox).hide("fast");
}

EdenUI.ScriptBox.prototype.enableGotoMode = function() {
	//this.outdiv.contentEditable = false;
	changeClass(this.outdiv, "goto", true);
	this.gotomode = true;
}

EdenUI.ScriptBox.prototype.disableGotoMode = function() {
	changeClass(this.outdiv, "goto", false);
	this.gotomode = false;
	this.updateEntireHighlight();
	this.intextarea.focus();
}

/**
 * Displays the error/warning box.
 */
EdenUI.ScriptBox.prototype.showInfoBox = function(x, y, type, message) {
	console.log("SHOW INFO BOX " + message);
	if (type == "warning") {
		this.infobox.innerHTML = "<div class='info-warnitem'><span>"+message+"</span></div>";
	} else if (type == "error") {
		this.infobox.innerHTML = "<div class='info-erroritem'><span>"+message+"</span></div>";
	}
	var $info = $(this.infobox);
	$info.css("top",""+y+"px");
	$info.css("left", ""+x+"px");
	$(this.infobox).show();
}

EdenUI.ScriptBox.prototype.disable = function() {
	if (!this.outdiv) return;
	changeClass(this.outdiv, "goto", false);
	//console.log("DISABLE: " + this.currentstatement);
	this.valuedivs[this.currentstatement] = this.outdiv;
	var valhtml = EdenUI.htmlForStatement(Eden.Statement.statements[this.currentstatement],30,30);
	this.valuedivs[this.currentstatement].innerHTML = '<div class="eden-line">'+valhtml+'</div>';
	//console.log(this.valuedivs);
	this.gotomode = false;
	//this.outdiv.contentEditable = false;
	changeClass(this.outdiv.parentNode, "readonly", true);
	if (this.ast) {
		//this.highlighter.hideComments();
		//this.highlighter.highlight(this.ast,-1,-1);
	}
}

EdenUI.ScriptBox.prototype.enable = function() {
	if (!this.outdiv) return;
	this.outdiv.contentEditable = true;
	if (this.valuedivs[this.currentstatement]) delete this.valuedivs[this.currentstatement];
	//console.log("ENABLE: " + this.currentstatement);
	changeClass(this.outdiv.parentNode, "readonly", false);
	if (this.ast) {
		//this.highlighter.showComments();
		this.highlighter.highlight(this.ast,-1,-1);
	}
}

EdenUI.ScriptBox.prototype.setSource = function(src) {
	if (this.currentstatement === undefined) return;
	this.intextarea.value = src;
	this.ast = new Eden.AST(src,undefined,true);
	this.highlightContent(this.ast, -1, 0);
	this.intextarea.focus();
	if (this.ast.script && this.ast.script.errors.length == 0) {
		Eden.Statement.statements[this.currentstatement].setSource(src,this.ast);
		changeClass(this.outdiv.parentNode.childNodes[(this.showstars)?2:1],"error",false);
	} else if (src == "") {
		changeClass(this.outdiv.parentNode.childNodes[(this.showstars)?2:1],"error",false);
	} else {
		changeClass(this.outdiv.parentNode.childNodes[(this.showstars)?2:1],"error",true);
	}

	if (this.ast.warnings.length > 0) {
		changeClass(this.outdiv.parentNode,"warning",true);
	}
	//checkScroll();
	this.outdiv.contentEditable = true;
}

/**
 * Re-parse the entire script and then re-highlight the current line
 * (and one line either size).
 */
EdenUI.ScriptBox.prototype.updateLineHighlight = function() {
	var lineno = -1; // Note: -1 means update all.
	var pos = -1;
	if (document.activeElement === this.intextarea) {
		pos = this.intextarea.selectionEnd;
		lineno = this.getLineNumber(this.intextarea);
	}

	this.ast = new Eden.AST(this.intextarea.value, undefined, true);
	//scriptagent.setSource(intextarea.value, false, lineno);
	this.highlighter.ast = this.ast;

	this.runScript(lineno);

	this.highlightContent(this.ast, lineno, pos);
	//rebuildNotifications();

	if (this.ast.script && this.ast.script.errors.length == 0) {
		Eden.Statement.statements[this.currentstatement].setSource(this.intextarea.value,this.ast);
		changeClass(this.outdiv.parentNode.childNodes[(this.showstars)?2:1],"error",false);
	} else {
		changeClass(this.outdiv.parentNode.childNodes[(this.showstars)?2:1],"error",true);
	}
}



/**
 * Re-highlight the current line without re-parsing the script.
 * Used when moving around the script without actually causing a code
 * change that needs a reparse.
 */
EdenUI.ScriptBox.prototype.updateLineCachedHighlight = function() {
	var lineno = -1;
	var pos = -1;
	if (document.activeElement === this.intextarea) {
		pos = this.intextarea.selectionEnd;
		lineno = this.getLineNumber(this.intextarea);
	}

	this.highlightContent(this.ast, lineno, pos);
}



/**
 * Parse the script and do a complete re-highlight. This is slow but
 * is required when there are changes across multiple lines (or there
 * could be such changes), for example when pasting.
 */
EdenUI.ScriptBox.prototype.updateEntireHighlight = function(rerun) {
	this.ast = new Eden.AST(this.intextarea.value, undefined, true);
	this.highlighter.ast = this.ast;
	var pos = -1;
	if (document.activeElement === this.intextarea) {
		pos = this.intextarea.selectionEnd;
	}

	if (rerun) {
		this.runScript(0);
	}

	this.highlightContent(this.ast, -1, pos);

	if (this.ast.script && this.ast.script.errors.length == 0) {
		Eden.Statement.statements[this.currentstatement].setSource(this.intextarea.value,this.ast);
		changeClass(this.outdiv.parentNode.childNodes[(this.showstars)?2:1],"error",false);
	} else {
		changeClass(this.outdiv.parentNode.childNodes[(this.showstars)?2:1],"error",true);
	}
}

/**
 * Call the highlighter to generate the new highlight output, and then
 * post process this to allow for extra warnings and number dragging.
 */
EdenUI.ScriptBox.prototype.highlightContent = function(ast, lineno, position) {
	this.highlighter.highlight(ast, lineno, position);
	//gutter.generate(ast,lineno);

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
						//setTitle(content);
					}
				}
			}
		}
	}

	// Make sure caret remains inactive if we don't have focus
	if (document.activeElement !== this.intextarea) {
		$(this.outdiv).find(".fake-caret").addClass("fake-blur-caret");
	}

	var me = this;

	/* Number dragging code, but only if live */
	//if (!readonly) {
		$(this.outdiv).find('.eden-number').draggable({
			helper: function(e) { return $("<div class='eden-drag-helper'></div>"); },
			axis: 'x',
			distance: 5,
			drag: function(e,u) {
				//if (readonly) return;
				var newval;
				if (me.dragint) {
					newval = Math.round(me.dragvalue + ((u.position.left - me.dragstart) / 2));
				} else {
					newval = me.dragvalue + ((u.position.left - me.dragstart) * 0.005);
					newval = newval.toFixed(4);
				}

				// TODO: this is no good for floats
				if (newval != me.draglast) {
					me.draglast = newval;
					e.target.innerHTML = "" + newval;

					var content = e.target.parentNode.textContent;
					if (content.charAt(content.length-1) == "\n") {
						content = content.slice(0,-1);
					}
					me.replaceLine(me.dragline, content);

					//me.setSource(me.intextarea.value, false, dragline);
					me.ast = new Eden.AST(me.intextarea.value, undefined, true);
					me.highlighter.ast = me.ast;

					//console.log("Dragline: " + dragline);

					// Execute if no errors!
					//if (gutter.lines[dragline] && gutter.lines[dragline].live && !scriptagent.hasErrors()) {
					//	scriptagent.executeLine(dragline);
					//}

					me.highlightContent(me.ast, me.dragline, -1);
					Eden.Statement.statements[me.currentstatement].setSource(me.intextarea.value,me.ast);
				}
			},
			start: function(e,u) {
				//if (readonly) return;
				me.edited = true;
				// Calculate the line we are on
				me.dragline = me.findElementLineNumber(e.target);
				me.dragstart = u.position.left;
				var content = e.target.textContent;
				if (content.indexOf(".") == -1) {
					me.dragvalue = parseInt(content);
					me.dragint = true;
				} else {
					me.dragvalue = parseFloat(content);
					me.dragint = false;
				}
				me.draglast = me.dragvalue;

				$(e.target).addClass("eden-select");
				$(me.outdiv).css("cursor","ew-resize");
			},
			stop: function(e,u) {
				//if (readonly) return;
				$(e.target).removeClass("eden-select");
				$(me.outdiv).css("cursor","text");
				//updateEntireHighlight();
				me.dragline = -1;
			},
			cursor: 'move',
			cursorAt: {top: -5, left: -5}
		// Following line is hack to allow click through editing...
		}).click(function() { $(this).draggable({disabled: true}); }) .blur(function() { $(this).draggable({disabled: false}); });
	//}
}



/**
 * Return the current line. Also, set currentlineno.
 */
EdenUI.ScriptBox.prototype.getLineNumber = function(textarea) {
	var lines = textarea.value.substr(0, textarea.selectionStart).split("\n");
	this.currentlineno = lines.length;
	this.currentcharno = lines[lines.length-1].length;
	return this.currentlineno;
}

/**
 * Script contents have changed, so re-parse, re-highlight and
 * if live, re-execute. Used in a short interval timeout from the
 * raw input/keyup events.
 */
EdenUI.ScriptBox.prototype.doRebuild = function() {
	// Regenerate the AST and highlight the code.
	if (this.refreshentire) {
		this.updateEntireHighlight();
		this.refreshentire = false;
	} else { // if (dirty) {
		this.updateLineHighlight();
	/*} else {
		updateLineCachedHighlight();*/
	}
	// Adjust scroll position if required
	//checkScroll();
	//this.dirty = false;

	Eden.Statement.statements[this.currentstatement].setSource(this.intextarea.value,this.ast);
}

EdenUI.ScriptBox.prototype.runScript = function(line) {
	// If we should run the statement (there are no errors)
	//if (gutter.lines[line-1] && gutter.lines[line-1].live && !scriptagent.hasErrors()) {
	//	scriptagent.executeLine(line-1);
	//}
}

/**
 * Set the rebuild timeout. Note: rebuildinterval MUST be less that the
 * keyboard repeat rate or you will not see a change when holding keys
 * down.
 */
EdenUI.ScriptBox.prototype.rebuild = function() {
	//edited = true;

	// Using a timer to make rebuild async. Allows input and keyup to
	// trigger a single rebuild which overcomes Chrome input event bug.
	clearTimeout(this.rebuildtimer);
	var me = this;
	this.rebuildtimer = setTimeout(function() { me.doRebuild(); }, this.rebuildinterval);
}

/**
 * When clicking or using a syntax highlighted element, find which
 * source line this corresponds to. Used by number dragging.
 */
EdenUI.ScriptBox.prototype.findElementLineNumber = function(element) {
	var el = element;
	while (el.parentNode !== this.outdiv) el = el.parentNode;

	for (var i=0; i<this.outdiv.childNodes.length; i++) {
		if (this.outdiv.childNodes[i] === el) return i;
	}
	return -1;
}

/**
 * Replace a particular line with the given content.
 * Can be used for autocompletion and number dragging.
 */
EdenUI.ScriptBox.prototype.replaceLine = function(lineno, content) {
	var lines = this.intextarea.value.split("\n");
	lines[lineno] = content;
	this.intextarea.value = lines.join("\n");
}




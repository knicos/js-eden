Veden = {};

function SnapPoint(owner, name, mx, cx, my, cy, external, acceptsTypes, acceptsPoints) {
	this.owner = owner;
	this.name = name;
	this.mx = mx;
	this.my = my;
	this.cx = cx;
	this.cy = cy;
	this.element = undefined;
	this.external = external;
	this.types = acceptsTypes;
	this.points = acceptsPoints;
	this.counterpart = undefined;
}

SnapPoint.prototype.getX = function() {
	return this.owner.width*this.mx + this.cx;
}

SnapPoint.prototype.getY = function() {
	return this.owner.height*this.my + this.cy;
}

EdenUI.plugins.Veden = function(edenUI, success) {
	var me = this;
	var selectedElement = 0;
	var currentX = 0;
	var currentY = 0;
	var offsetX = 0;
	var offsetY = 0;
	var currentMatrix = 0;
	var lastsnap = undefined;


	////////////////////////////////////////////////////////////////////////////

	var elementFactory = {
		"statement": Veden.Statement,
		"modifier": Veden.Modifier,
		"number": Veden.Number,
		"observable": Veden.Observable,
		"lvalue": Veden.LValue,
		"operator": Veden.Operator,
		"index": Veden.ListIndex,
		"group": Veden.ExpGroup,
		"when": Veden.When
	}

	////////////////////////////////////////////////////////////////////////////

	function intersect(a, b, padding) {
		var aPos = a.pagePosition();
		var bPos = b.pagePosition();
		var ax1 = aPos.x - padding;
		var ay1 = aPos.y - padding;
		var bx1 = bPos.x - padding;
		var by1 = bPos.y - padding;
		var ax2 = aPos.x + a.width + padding;
		var ay2 = aPos.y + a.height + padding;
		var bx2 = bPos.x + b.width + padding;
		var by2 = bPos.y + b.height + padding;
		return (ax1 < bx2 && ax2 > bx1 && ay1 < by2 && ay2 > by1);
	}

	this.createCommon = function(name,mtitle, code) {
		var elements = [];
		var stream;
		var data;
		var estack;
		var lasty;
		var lastheight;
		var statements;
		var token;
		var scriptagent;
		var agent;
		var readonly = false;
		var svg1;

		function clearSVG() {
			elements = [];
			var e = svg1.get(0);
			while (e.firstChild) e.removeChild(e.firstChild);
		}

		function findElement(domele) {
			for (var i=0; i<elements.length; i++) {
				if (elements[i].element === domele) return elements[i];
			}
			return undefined;
		}

		function findNear(element, dist) {
			var res = [];
			for (var i=0; i<elements.length; i++) {
				if (elements[i] === element) continue;
				if (intersect(elements[i], element, dist)) res.push(elements[i]);
			}
			return res;
		}

		function checkSnaps(element, near) {
			var dist = 10;
			var res = [];

			if (near === undefined) {
				near = findNear(element, dist);
			}

			var elePos = element.pagePosition();

			for (var i=0; i<near.length; i++) {
				var nearPos = near[i].pagePosition();

				for (var x=0; x<element.snappoints.length; x++) {
					for (var y=0; y<near[i].snappoints.length; y++) {
						var xx = element.snappoints[x].getX() + elePos.x;
						var xy = element.snappoints[x].getY() + elePos.y;
						var yx = near[i].snappoints[y].getX() + nearPos.x;
						var yy = near[i].snappoints[y].getY() + nearPos.y;
						var d = ((xx - yx) * (xx - yx) + (xy - yy) * (xy - yy));
						if (d <= dist*dist) {
							if (element.accept(element.snappoints[x].name, near[i].snappoints[y].name, near[i])
								&& near[i].accept(near[i].snappoints[y].name, element.snappoints[x].name, element)) {
								res.push({dist: d, srcsnap: element.snappoints[x],
									destelement: near[i],
									destsnap: near[i].snappoints[y]});
							}
						}
					}
				}
			}
			if (res.length == 0) return undefined;
			res = res.sort(function(a,b) { return a.dist - b.dist });
			return res[0];
		}

		function moveElement(evt){
			if (selectedElement == 0) return;
			evt.preventDefault();
			dx = evt.layerX - currentX;
			dy = evt.layerY - currentY;

			var ele = findElement(selectedElement);
			if (ele) {
				ele.x += dx;
				ele.y += dy;
				var near = findNear(ele, 10);
				ele.detachAll(); // Needed to free up snap point options...
				var snaps = checkSnaps(ele, near);

				// TODO Could desnap from one directly to another and not be
				// properly detached!!!!!

				if (snaps) {
					snaps.destelement.snap(ele, snaps.destsnap, snaps.srcsnap);

					// Now repeat snaps check to find any at distance 0
					snaps = checkSnaps(ele, near);
					while (snaps && snaps.dist == 0) {
						//ele.snap(snaps.destelement, snaps.srcsnap, snaps.destsnap);
						snaps.destelement.snap(ele, snaps.destsnap, snaps.srcsnap);
						snaps = checkSnaps(ele, near);
					}

					/*if (lastsnap && snaps.destsnap !== lastsnap.destsnap) {
						ele.notifyChange();
					}
					lastsnap = snaps;*/
				} else {
					/*if (lastsnap) {
						ele.notifyChange();
					}
					lastsnap = undefined;*/
					//ele.detachAll();
					// Now prevent overlaps... if not allowed
					/*for (var i=0; i<near.length; i++) {
						if (intersect(ele, near[i], 0)) {
							if (near[i].allowedInside.indexOf(ele.type) == -1) {
								ele.x -= dx;
								ele.y -= dy;
							} else {
								//near[i].insert(ele);
							}
						}
					}*/
				}
			}

			currentMatrix[4] = ele.x;
			currentMatrix[5] = ele.y;
			newMatrix = "matrix(" + currentMatrix.join(' ') + ")";
				
			selectedElement.setAttributeNS(null, "transform", newMatrix);
			//currentX = evt.clientX;
			//currentY = evt.clientY;
			if (ele) {
				currentX = ele.x + offsetX;
				currentY = ele.y + offsetY;
			}
		}

		function deselectElement(evt){
			//console.log(elements);
			//evt.preventDefault();
			if(selectedElement != 0){
				var ele = findElement(selectedElement);
				ele.dock();
				selectedElement.removeAttributeNS(null, "onmousemove");
				selectedElement.removeAttributeNS(null, "onmouseout");
				selectedElement.removeAttributeNS(null, "onmouseup");
				selectedElement.removeAttribute("filter");
				selectedElement = 0;
			}
		}

		function selectElement(evt) {
			//evt.preventDefault();
			//if (readonly) return;
			if (selectedElement != 0) return;
			if (evt.target.nodeName == "INPUT") return;
			//console.log(evt);

			selectedElement = evt.target;

			// Get block base element
			while (selectedElement.nodeName != "g") {
				selectedElement = selectedElement.parentNode;
			}

			var ele = findElement(selectedElement);
			ele.undock();

			// Add drop shadow effect
			selectedElement.setAttribute("filter","url(#fdrop)");

			offsetX = evt.layerX - ele.x;
			offsetY = evt.layerY - ele.y;
			currentX = evt.layerX;
			currentY = evt.layerY;
			//console.log("Current: " + currentX+","+currentY);
			currentMatrix = selectedElement.getAttributeNS(null, "transform").slice(7,-1).split(' ');
			  for(var i=0; i<currentMatrix.length; i++) {
				currentMatrix[i] = parseFloat(currentMatrix[i]);
			  }

			selectedElement.parentNode.onmousemove = moveElement;
			//selectedElement.onmouseout = deselectElement;
			selectedElement.parentNode.onmouseup = deselectElement;
		}

		/**
		 * Respond to requests to change the current tab to a particular agent.
		 * This is triggered from the observable _view_[name]_agent which is
		 * set by the UI on tab change etc.
		 */
		function changeAgent(sym, value) {
			// A valid and imported agent is given
			if (value && Eden.Agent.agents[value]) {
				// Already the current tab so continue...
				if (scriptagent && value == scriptagent.name) return;
				// Release ownership of current tab
				if (scriptagent && readonly == false) scriptagent.setOwned(false);
				// Switch to new tab.
				scriptagent = Eden.Agent.agents[value];

				// Not already owned so we can take ownership
				if (Eden.Agent.agents[value].owned == false) {
					scriptagent.setOwned(true);
					readonly = false;
					//changeClass(outdiv, "readonly", false);
					//outdiv.contentEditable = true;
				// Otherwise it needs to be readonly
				} else {
					readonly = true;
					//setSubTitle("[readonly]");
					// The readonly class changes colour scheme
					//changeClass(outdiv, "readonly", true);
					//outdiv.contentEditable = false;
				}

				// We have a parsed source so update contents of script view.
				if (scriptagent.snapshot.length > 0) {
					generate(scriptagent.snapshot);
				} else {
					// Clear the SVG
					clearSVG();
				}

			// Otherwise, no valid agent so try and resolve
			} else {
				// Release ownership of any current tab
				if (scriptagent && readonly == false) scriptagent.setOwned(false);
				// Clear and disable the script view
				// Clear the SVG
				clearSVG();
				readonly = true;
				//outdiv.className = "outputcontent readonly";
				//outdiv.contentEditable = false;
	
				scriptagent = undefined;
				//setTitle(Language.ui.input_window.title);
				//setSubTitle("[No Agents]");

				// Attempt to import the agent without execution and then
				// update the script view if successful.
				if (value) {
					if (Eden.Agent.agents[value] === undefined) {
						Eden.Agent.importAgent(value, "default", ["noexec"], function(ag) {
							if (ag) {
								changeAgent(undefined, value);
							}
						});
					}
				}
			}
		}

		function preloadScript(sym, value) {
			var res = "";
			if (value) {
				console.log("PRELOAD: " + value);
				/*if (Eden.Agent.agents["view/script/"+name] === undefined) {
					scriptagent = new Eden.Agent(undefined, "view/script/"+name, ["noexec"]);
				} else {
					scriptagent = Eden.Agent.agents["view/script/"+name];
				}*/

				Eden.Agent.importAgent("view/veden/"+name, "default", ["noexec","create"], function(ag,msg) {
					if (ag === undefined) {
						console.error("Could not create agent: view/veden/"+name+"@default: "+msg);
						return;
					}
					if (value instanceof Array) {
						for (var i=0; i < value.length; i++) {
							if (typeof value[i] == "string") {
								res += value[i] + "\n";
							} else if (typeof value[i] == "object") {
								res += value[i].eden_definition+"\n";
							}
						}
					} else {
						res = value;
					}
					ag.setSource(res, false, -1);
					
					agent.state[obs_agent] = "view/veden/"+name;
				});
			}
		}

		function changeOwnership(ag, cause) {
			if (scriptagent && ag && scriptagent.name == ag.name && cause == "net") {
				if (!ag.owned) {
					ag.setOwned(true);
					readonly = false;
					//changeClass(outdiv, "readonly", false);
					//outdiv.contentEditable = true;
					//setSubTitle("");
				} else {
					readonly = true;
					//setSubTitle("[readonly]");
					//outdiv.className = "outputcontent readonly";
					//changeClass(outdiv, "readonly", true);
					//outdiv.contentEditable = false;
				}
			}
		}
		function agentCreated(ag) {
			if (agent && agent.state[obs_agent] !== undefined) {
				if (ag.name == agent.state[obs_agent] && (scriptagent === undefined || ag.name != scriptagent.name)) {
					changeAgent(undefined, ag.name);
				}
			}
		}
		function agentLoaded(ag) {
			if (agent && agent.state[obs_agent] !== undefined) {
				if (ag.name == agent.state[obs_agent] && (scriptagent === undefined || ag.name != scriptagent.name)) {
					changeAgent(undefined, ag.name);
				} else if (scriptagent && ag.name == scriptagent.name) {
					clearSVG();
					generate(ag.getSource());

					//intextarea.value = ag.getSource();
					//highlightContent(scriptagent.ast, -1, 0);
					//updateHistoryButtons();

					/*if (scriptagent.canRedo()) {
						showSubDialog("localChanges", function(status) {
							if (status) onFastForward();
						}, scriptagent);
					}*/
				}
			}
		}
		function agentRollback(ag) {
			if (ag === scriptagent) {
				//console.log("ROLLBACK");
				clearSVG();
				generate(scriptagent.snapshot);
				//updateEntireHighlight(true);
				//updateHistoryButtons();
			}
		}

		function agentPatched(ag, patch, lineno) {
			if (ag && scriptagent && ag.name === scriptagent.name && readonly) {
				//intextarea.value = ag.snapshot;
				console.log("PATCH SVG: " + ag.snapshot);
				clearSVG();
				generate(ag.snapshot);
				//highlighter.ast = scriptagent.ast;
				//highlightContent(highlighter.ast, lineno, -1);
			}
		}

		var code_entry = $('<div id=\"'+name+'-content\" class=\"veden-content\"></div>');
		svg1 = $('<svg width="100%" height="100%" version="1.1"\
			 baseProfile="full"\
			 xmlns="http://www.w3.org/2000/svg">\
			<defs>\
    <filter id="fdrop" x="0" y="0" width="200%" height="200%">\
      <feOffset result="offOut" in="SourceGraphic" dx="5" dy="5" />\
	  <feColorMatrix result="matrixOut" in="offOut" type="matrix"\
		values="0.2 0 0 0 0 0 0.2 0 0 0 0 0 0.2 0 0 0 0 0 1 0" />\
      <feGaussianBlur result="blurOut" in="offOut" stdDeviation="5" />\
      <feBlend in="SourceGraphic" in2="blurOut" mode="normal" />\
    </filter>\
  </defs>\
		</svg>');
		code_entry.append(svg1);

		function makeElement(type, data, x, y) {
			var ele = new elementFactory[type](data, x, y);
			elements.push(ele);
			svg1.append(ele.element);
			ele.element.onmousedown = selectElement;
			return ele;
		}

		function pushElement(ele, a, b) {
			ele.undocked = true;
			estack[estack.length-1].snap(ele, a, b);
			ele.dock();
			estack.push(ele);
		}

		function attachElement(dest, ele, a, b) {
			//console.log("Attach: " + ele.type + " to "+dest.type+ " at " + a + "<-"+b);
			ele.undocked = true;
			dest.snap(ele, a, b);
			ele.dock();
			return ele;
		}

		////////////////////////////////////////////////////////////////////////

		function vExpression() {
			var ele;
			var base;

			if (token == "OBSERVABLE") {
				ele = makeElement("observable", data.value, 10, 10);
			} else if (token == "NUMBER") {
				ele = makeElement("number", data.value, 10, 10);
			} else if (token == "(") {
				token = stream.readToken();
				ele = makeElement("group", undefined, 10, 10);
				attachElement(ele, vExpression(), "inside", "left");
			}
			base = ele;

			if (base === undefined) {
				console.error("NO BASE ELEMENT: "+token);
			}

			while (stream.valid() && token != ";" && token != ")") {
				token = stream.readToken();

				if (token == "+") {
					ele = attachElement(ele, makeElement("operator", "\u002B", 10, 10), "right", "left");
				} else if (token == "-") {
					ele = attachElement(ele, makeElement("operator", "\u2212", 10, 10), "right", "left");
				} else if (token == "*") {
					ele = attachElement(ele, makeElement("operator", "\u00D7", 10, 10), "right", "left");
				} else if (token == "/") {
					ele = attachElement(ele, makeElement("operator", "\u00F7", 10, 10), "right", "left");
				} else if (token == "//") {
					ele = attachElement(ele, makeElement("operator", "\u2981", 10, 10), "right", "left");
				} else if (token == "(") {
					token = stream.readToken();
					ele = attachElement(ele, makeElement("group", undefined, 10, 10), "right", "left");
					attachElement(ele, vExpression(), "inside", "left");
				} else if (token == ")") {
					return base;
				}
			}

			return base;
		}

		function vWhen() {
			var ele = makeElement("when", undefined, 10, lasty+lastheight+5);
			var base = ele;

			token = stream.readToken();
			if (token != "(") return;
			token = stream.readToken();

			attachElement(ele, vExpression(), "cond", "left");

			// Read the {
			token = stream.readToken();
			while (stream.valid() && token != "}") {
				token = stream.readToken();
				if (token == "OBSERVABLE") {
					vStatementP(base);
				}
			}

			return ele;
		}

		function vStatementP(base) {
			var ele;

			if (token == "OBSERVABLE") {
				ele = attachElement(base, makeElement("lvalue", data.value, 10, 10), "lvalue", "left");
			} else {
				console.error("Invalid statement, no lvalue");
				return;
			}

			//base = ele;
			token = stream.readToken();

			if (token == "is") {
				ele = attachElement(ele, makeElement("modifier", "is", 10, 10), "right", "left");
			} else if (token == "=") {
				ele = attachElement(ele, makeElement("modifier", "=", 10, 10), "right", "left");
			} else {
				console.error("No modifier: "+token);
				return;
			}

			token = stream.readToken();
			attachElement(ele, vExpression(), "right", "left");
			return base;
		}

		function vStatement() {
			var ele;
			var base;

			base = makeElement("statement", undefined, 0, lasty + lastheight+5);
			vStatementP(base);

			lastheight = base.height;
			lasty = base.y;

			return base;
		}

		function vGlobal() {
			while (stream.valid()) {
				token = stream.readToken();
				if (token == "OBSERVABLE") {
					statements.push(vStatement());
				} else if (token == "when") {
					statements.push(vWhen());
				}
			}
		}

		////////////////////////////////////////////////////////////////////////

		function generate(str) {
			stream = new EdenStream(str);
			data = new EdenSyntaxData();
			stream.data = data;
			estack = [];
			lasty = 10;
			lastheight = 0;
			statements = [];

			vGlobal();
		}

		//generate("turtle_position_x = 100;\nturtle_position_y = 100;\nturtle_size = 1.0;");
		if (code) {} //generate(code);
		else {
			makeElement("operator", "\u002B", 10, 10);
			makeElement("operator", "\u2212", 50, 10);
			makeElement("operator", "\u00D7", 90, 10);
			makeElement("operator", "\u00F7", 130, 10);
			makeElement("operator", "\u2981", 170, 10);
			makeElement("observable", "turtle_position_x", 10, 70);
			makeElement("observable", "turtle_position_y", 150, 70);
			makeElement("observable", "mouse_y", 10, 100);
			makeElement("observable", "screenWidth", 10, 130);
			makeElement("lvalue", "mouse_x", 150, 100);
			makeElement("number", 10, 80, 100);
			makeElement("group", undefined, 10, 160);
			makeElement("group", undefined, 10, 200);
			makeElement("when", undefined, 10, 240);
			makeElement("statement", "is", 10, 280);
			makeElement("modifier", "is", 200, 280);
		}

		// Use the agent wrapper for dealing with view interaction via symbols.
		var obs_script = "_view_"+name+"_script";
		var obs_agent = "_view_"+name+"_agent";
		var obs_zoom = "_view_"+name+"_zoom";
		var agent = new Eden.Agent(undefined,"view/veden/"+name+"/config");
		agent.declare(obs_agent);
		agent.declare(obs_script);
		agent.declare(obs_zoom);

		// Whenever _script is changed, regenerate the contents.
		agent.on(obs_script, preloadScript);
		agent.on(obs_agent, changeAgent);
		//agent.on(obs_zoom, zoom);

		if (agent.state[obs_zoom] === undefined) {
			agent.state[obs_zoom] = 0;
		}

		// If there is explicit code, then use that
		if (code && agent.state[obs_agent] === undefined) {
			//preloadScript(undefined, code);
			agent.state[obs_script] = code;
		} else if (agent.state[obs_agent]) {
			changeAgent(undefined, agent.state[obs_agent]);
		} else {
			//outdiv.className = "outputcontent readonly";
			//outdiv.contentEditable = false;
			//outdiv.innerHTML = "";
		}

		Eden.Agent.listenTo("create", agent, agentCreated);
		Eden.Agent.listenTo("loaded", agent, agentLoaded);
		Eden.Agent.listenTo("rollback", agent, agentRollback);
		Eden.Agent.listenTo("owned", agent, changeOwnership);

		// Need to rebuild tabs when new agents are created or titles change.
		/*Eden.Agent.listenTo("remove", agent, removedAgent);
		Eden.Agent.listenTo("autosave", agent, autoSaved);
		Eden.Agent.listenTo("execute", agent, rebuildTabs);
		Eden.Agent.listenTo("error", agent, rebuildTabs);
		Eden.Agent.listenTo("fixed", agent, rebuildTabs);*/
		Eden.Agent.listenTo("patched", agent, agentPatched);
		Eden.Agent.listenTo("changed", agent, agentPatched);

		return {confirmClose: false, contents: code_entry};
	}

	this.createDialog = function(name, mtitle) {
		var viewdata = me.createCommon(name,mtitle);

		$('<div id="'+name+'"></div>')
			.html(viewdata.contents)
			.dialog({
				title: mtitle,
				width: 600,
				height: 450,
				minHeight: 120,
				minWidth: 230,
				dialogClass: "veden-dialog"
			});
		return viewdata;
	}

	this.createEmbedded = function(name, mtitle, code) {
		var viewdata = me.createCommon(name, mtitle, code);
		return viewdata;
	}

	//Register the DBView options
	edenUI.views["Veden"] = {dialog: this.createDialog, embed: this.createEmbedded, title: "Visual Eden", category: edenUI.viewCategories.interpretation};

	success();
}

/* Plugin meta information */
EdenUI.plugins.Veden.title = "Veden";
EdenUI.plugins.Veden.description = "Visual Eden Code Editor";

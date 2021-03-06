/*
 * Copyright (c) 2013, Empirical Modelling Group
 * All rights reserved.
 *
 * See LICENSE.txt
 */

(function () {

	/*Prevent jQuery from cancelling attempts to reposition a dialog so that it isn't fully within
	 * the boundaries of the browser window.
	 */
	$.extend($.ui.dialog.prototype.options.position, { collision: 'none' });
	
	/**
	 * Helper to return the Symbol for a view property.
	 *
	 * @param {string} viewName
	 * @param {string} propName
	 * @return {Symbol}
	 */
	function view(viewName, propName) {
		return root.lookup("_view_"+viewName+"_"+propName);
	}

	/**
	 * Helper to find the dialog using jQuery and return it.
	 *
	 * @param {string} viewName
	 * @return {jQuery} A jQuery object with the dialog element in it.
	 */
	function dialog(viewName) {
		return $("#"+viewName+"-dialog");
	}

	function ViewSpace(x,y,w,h) {
		this.x = x;
		this.y = y;
		this.w = w;
		this.h = h;
		if (x >= 0 && y >= 0 && w > 0 && h > 0) {
			//ViewSpace.spaces.push(this);
		}
		this.size = w * h;
	}

	ViewSpace.prototype.contains = function(x,y) {
		return this.x <= x && (this.x+this.w) >= x && this.y <= y && (this.y+this.h) >= y;
	}

	ViewSpace.spaces = [];
	new ViewSpace(0,70,1920,1024);

	ViewSpace.extract = function(nx, ny, nw, nh) {
		console.log("Extract: " + nx + "," + ny + " " + nw + "," + nh);
		var vs;
		var toremove = [];
		var oldspaces = ViewSpace.spaces;
		ViewSpace.spaces = [];
		for (var i=0; i<oldspaces.length; i++) {
			if (oldspaces[i].contains(nx,ny)) {
				console.log("EXTRACT");
				vs = oldspaces[i];
				var tl = new ViewSpace(vs.x, vs.y, nx - vs.x, ny - vs.y); // TOP LEFT
				var ml = new ViewSpace(vs.x, ny, nx - vs.x, nh); // MIDDLE LEFT
				var bl = new ViewSpace(vs.x, ny+nh, nx - vs.x, vs.h - (ny - vs.y) - nh); // BOTTOM LEFT
				var tm = new ViewSpace(nx, vs.y, nw, ny - vs.y); // TOP MIDDLE
				var rt = new ViewSpace(nx+nw, vs.y, vs.w - (nx - vs.x) - nw, ny - vs.y); // RIGHT TOP
				var rm = new ViewSpace(nx+nw, ny, vs.w - (nx - vs.x) - nw, nh); // RIGHT MIDDLE
				var rb = new ViewSpace(nx+nw, ny+nh, vs.w - (nx - vs.x) - nw, vs.h - (ny - vs.y) - nh); // RIGHT BOTTOM
				var bm = new ViewSpace(nx, ny + nh, nw, vs.h - (ny - vs.y) - nh); // BOTTOM MIDDLE

				var tmerge = tl.size + tm.size + rt.size;
				var lmerge = tl.size + ml.size + bl.size;
				var rmerge = rt.size + rb.size + rm.size;
				var bmerge = bl.size + rb.size + bm.size;

				var vmerge = lmerge + rmerge;
				var hmerge = tmerge + bmerge;
				if (vmerge > hmerge) {
					var n1 = new ViewSpace(tl.x,tl.y,ml.w,tl.h+ml.h+bl.h);
					var n2 = new ViewSpace(rt.x,rt.y,rm.w,rt.h+rm.h+rb.h);
					if (n1.size > 0) ViewSpace.spaces.push(n1);
					if (n2.size > 0) ViewSpace.spaces.push(n2);
					if (tm.size > 0) ViewSpace.spaces.push(tm);
					if (bm.size > 0) ViewSpace.spaces.push(bm);
				} else {
					var n1 = new ViewSpace(tl.x,tl.y,tl.w+tm.w+rt.w,tm.h);
					var n2 = new ViewSpace(bl.x,bl.y,rb.w+bm.w+bl.w,bm.h);
					if (n1.size > 0) ViewSpace.spaces.push(n1);
					if (n2.size > 0) ViewSpace.spaces.push(n2);
					if (ml.size > 0) ViewSpace.spaces.push(ml);
					if (rm.size > 0) ViewSpace.spaces.push(rm);
				}
			} else {
				ViewSpace.spaces.push(oldspaces[i]);
			}
		}

		// Todo merge spaces if the merge produces a greater size...
		
		// Sort spaces by size.
		ViewSpace.spaces.sort(function(a,b) {
			return a.size < b.size;
		});
		return {x: nx, y: ny, w: nw, h: nh};
	}

	ViewSpace.request = function(nw,nh) {
		var vs;

		// Find smallest that fits
		for (var i=ViewSpace.spaces.length-1; i>=0; i--) {
			var space = ViewSpace.spaces[i];
			if (space.w >= nw && space.h >= nh) {
				vs = space;
				break;
			}
		}

		if (!vs) vs = ViewSpace.spaces[0];

		var nx = vs.x; // + 50; //(this.w / 2 - nw / 2);
		var ny = vs.y; // + 50; //(this.h / 2 - nh / 2);
		if (nx < 0) nx = 0;
		if (ny < 70) ny = 70;
		/*new ViewSpace(vs.x, vs.y, nx - vs.x, vs.h);
		new ViewSpace(nx, vs.y, nw, vs.h - ny - vs.y);
		new ViewSpace(nx+nw, vs.y, vs.w - nx - nw, vs.h);
		new ViewSpace(nx, vs.y + nh, nw, ny - vs.y);
		// Remove self.
		var newspaces = [];
		for (var i=0; i<ViewSpace.spaces.length; i++) if (ViewSpace.spaces[i] !== vs) newspaces.push(ViewSpace.spaces[i]);
		// Sort spaces by size.
		newspaces.sort(function(a,b) {
			return a.size < b.size;
		});
		console.log(newspaces);
		ViewSpace.spaces = newspaces;*/
		return {x: nx, y: ny, w: nw, h: nh};
	}

	// Todo, rebuild spaces for each request
	// Todo, merge neighbour spaces...

	EdenUI.viewSpacing = 10;

	//Dimensions of various UI components.
	EdenUI.prototype.menuBarHeight = 30;
	EdenUI.prototype.dialogBorderWidth = 3.133;
	EdenUI.prototype.titleBarHeight = 34.659 + EdenUI.prototype.dialogBorderWidth;
	EdenUI.prototype.scrollBarSize = 14 + EdenUI.prototype.dialogBorderWidth;
	EdenUI.prototype.scrollBarSize2 = window.innerHeight-$(window).height();
	EdenUI.prototype.dialogFrameWidth = EdenUI.prototype.scrollBarSize + 2 * EdenUI.prototype.dialogBorderWidth;
	EdenUI.prototype.dialogFrameHeight = EdenUI.prototype.titleBarHeight + EdenUI.prototype.dialogBorderWidth;
	EdenUI.prototype.bottomBarHeight = 34.906;

	//Configuration options
	//30 pixels seems like a good grid cell width on a display 1920 pixels wide.
	EdenUI.prototype.gridSizeX = Math.floor(window.innerWidth * 30 / 1920);
	EdenUI.prototype.gridSizeY = Math.floor(window.innerHeight * 30 / 1920);
	//Case when a window is moved off to the left of the screen.
	EdenUI.prototype.minimumWindowWidthShowing = 72 + EdenUI.prototype.dialogBorderWidth;

	EdenUI.prototype.createRawView = function(name, type, title) {
		if (this.viewInstances[name] === undefined) {
			var defaultTitle = (title) ? title : this.views[type].title;
			var viewData = this.views[type].raw(name, defaultTitle);
			this.viewInstances[name] = viewData;
			return viewData;
		} else {
			return this.viewInstances[name];
		}
	}

	EdenUI.prototype.reset = function() {
		this.viewInstances = {};
		this.activeDialogs = {};
		var node = document.body.firstChild;
		while (node) {
			var next = node.nextSibling;
			if (node.className && node.className.startsWith("jseden-view")) {
				document.body.removeChild(node);
			}
			node = next;
		}

		EdenUI.SVG.reset();
		EdenUI.ScriptView.reset();
		EdenUI.MenuBar.reset();
	}

	/**
	 * A view is a window which appears in the JsEden UI.
	 *
	 * This inserts an element for the view window, and also creates observables
	 * and agents that allow for interaction from EDEN.
	 *
	 * Afterwards, the {show,hide}View methods can be used to modify the view.
	 * And the {move,resize}View methods can be used to update a view using the
	 * current values in the view's observables.
	 *
	 * @param {string} name Unique identifier for the view.
	 * @param {string} type Used to group different types of views.
	 */
	EdenUI.prototype.createView = function (name, type, title, option) {
		if (!(type in this.views)) {
			this.eden.error(new Error("View type " + type + " is unavailable.  Check that the associated plug-in is loaded."));
			return;
		}
		if ("name" in this.views[type]) {
			// Single instance view type (e.g. error log)
			name = this.views[type].name;
		}


		var me = this;
		var agent = root.lookup("createView");

		var currentType = this.activeDialogs[name];
		var visibilitySym = view(name, "visibility");
		var visibility = visibilitySym.value();
		var titleSym = view(name, "title");
		//var title = titleSym.value();

		if (currentType == type) {
			if (visibility != "visible") {
				visibilitySym.assign("visible", root.scope, agent);
			}

			this.brieflyHighlightView(name);
			return this.viewInstances[name];
		}

		this.eden.root.beginAutocalcOff();
		if (currentType !== undefined) {
			//if (title == this.views[currentType].title) {
			//	title = undefined;
			//}
			this.destroyView(name, false);
		}

		var desktopTop = this.plugins.MenuBar? this.menuBarHeight : 0;
		var defaultTitle = (title) ? title : this.views[type].title;
		var viewData = this.views[type].dialog(name + "-dialog", defaultTitle, option);
		if (viewData === undefined) {
			viewData = {};
		}
		this.viewInstances[name] = viewData;
		var position = viewData.position;

		var diag = $('<div id="'+viewData.name+'" class="jseden-view"><div class="jseden-viewinner"><div class="jseden-viewbar"><div class="jseden-viewclose">&#xf00d;</div></div><div class="jseden-viewtitle" contenteditable>'+defaultTitle+'</div><div class="jseden-viewcontent"></div></div></div>')
			.draggable({
				handle: ".jseden-viewbar"
			}).resizable()
			.css("position","absolute")
			.on("click",".jseden-viewclose", function() {
				//me.destroyView(vname, false);
				document.body.removeChild($("#"+viewData.name).get(0));
				delete me.viewInstances[name];
				delete me.activeDialogs[name];
			})
			.appendTo($(document.body));

		if (viewData.defaultWidth) diag.css("width",""+viewData.defaultWidth+"px");
		if (viewData.defaultHeight) diag.css("height",""+viewData.defaultHeight+"px");
		if (viewData.background == "dark") {
			diag.addClass("dark");
		}
		//if (viewData.background) diag.css("background",viewData.background);

		// Rebuild view spaces...
		ViewSpace.spaces = [new ViewSpace(10,70,$(document).width()-10,$(document).height()-70)];
		for (var v in this.viewInstances) {
			if (v == name) continue;
			var ele = $("#"+this.viewInstances[v].name);
			var left = parseInt(ele.css("left").replace(/px/,""))-10;
			var top = parseInt(ele.css("top").replace(/px/,""))-10;
			var width = parseInt(ele.css("width").replace(/px/,""))+20;
			var height = parseInt(ele.css("height").replace(/px/,""))+20;
			ViewSpace.extract(left,top,width,height);
		}

		var genpos = ViewSpace.request(viewData.defaultWidth, viewData.defaultHeight);
		console.log(genpos);
		diag.css("left", ""+(genpos.x+10)+"px");
		diag.css("top", ""+(genpos.y+10)+"px");

		// TEMPORARY
		EdenUI.drawspaces = function() {
		ViewSpace.spaces = [new ViewSpace(10,70,$(document).width()-10,$(document).height()-70)];
		for (var v in this.viewInstances) {
			//if (v == name) continue;
			var ele = $("#"+this.viewInstances[v].name);
			var left = parseInt(ele.css("left").replace(/px/,""))-10;
			var top = parseInt(ele.css("top").replace(/px/,""))-10;
			var width = parseInt(ele.css("width").replace(/px/,""))+20;
			var height = parseInt(ele.css("height").replace(/px/,""))+20;
			ViewSpace.extract(left,top,width,height);
		}

		var svg = $(document.body).find("svg")[0];
		if (!svg) {
			svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
			svg.setAttribute("width","100%");
			svg.setAttribute("height","100%");
			svg.setAttribute("style", "position: absolute; left: 0; right: 0; top: 0; bottom: 0;");
			document.body.appendChild(svg);
		}
		while (svg.firstChild) svg.removeChild(svg.firstChild);
		for (var i=0; i<ViewSpace.spaces.length; i++) {
			var ele = document.createElementNS("http://www.w3.org/2000/svg", 'rect');
			ele.setAttribute("x",""+(ViewSpace.spaces[i].x+2)+"px");
			ele.setAttribute("y",""+(ViewSpace.spaces[i].y+2)+"px");
			ele.setAttribute("width",""+(ViewSpace.spaces[i].w-4)+"px");
			ele.setAttribute("height",""+(ViewSpace.spaces[i].h-4)+"px");
			ele.setAttribute("stroke-width", "2px");
			ele.setAttribute("stroke","red");
			ele.setAttribute("fill","transparent");
			svg.appendChild(ele);
		}
		}
		//EdenUI.drawspaces.call(edenUI);

		// END


		diag.on("click",function() {
			var diagjs = diag.get(0);
			var parent = diagjs.parentNode;
			if (parent.lastChild !== diagjs) {
				parent.removeChild(diagjs);
				parent.appendChild(diagjs);
			}
		});
		diag.on("keyup",".jseden-viewtitle",function(e) {
			if (viewData.setTitle(e.currentTarget.textContent)) {
				changeClass(e.currentTarget,"invalid",false);
			} else {
				changeClass(e.currentTarget,"invalid",true);
			}
		});

		viewData.titlechangecb = function() {
			diag.find(".jseden-viewtitle").html(viewData.title);
		}

		diag.find(".jseden-viewcontent").append(viewData.contents);

		//Create and set behaviour for minimize, maximize and close buttons.
		/*var collapseOnDblClick = edenUI.getOptionValue("optCollapseToTitleBar");
		var titleBarAction;
		if (collapseOnDblClick == "true") {
			titleBarAction = "collapse";
		} else {
			titleBarAction = "maximize";
		}*/
		//var diag = dialog(name);
		/*diag.dialog({
			closeOnEscape: false,
			draggable: true,
			position: position,
			beforeClose: function () {
				if (viewData.closing) {
					viewData.closing = false;
					return true;
				}
				return me.closeView(name);
			},
			focus: function () {
				//Disabled pending fix.
				//me.minimizeObscuredViews(name);
			}
		});*/
		//var dialogWindow = this.getDialogWindow(name);
		/*diag.dialogExtend({
			dblclick: titleBarAction,
			minimizable: true,
			maximizable: true,
			beforeMinimize: function (event) {
				$(event.target).parent().removeClass("window-activated");
				var hide = edenUI.getOptionValue("optHideOnMinimize");
				if (hide == "true") {
					me.hideView(name);
					return false;
				} else {
					return true;
				}
			},
			minimize: function () {
				var dialogMin = dialog(name).data('dialog-extend-minimize-controls');
				// dialogExtend sets position: static and top, left, but doesn't need to.
				// override this so we can add position absolute elements into the minimized controls.
				dialogMin.css('position', 'relative');
				dialogMin.css('top', '');
				dialogMin.css('left', '');
			},
			maximize: function (event) {
				var windowElem = dialogWindow[0];
				var contentElem = diag[0];
				windowElem.style.top = desktopTop + "px";
				var height = window.innerHeight - desktopTop - me.scrollBarSize2 - 2 * me.dialogBorderWidth;
				if (edenUI.getOptionValue("optHideOnMinimize") != "true") {
					height = height - me.bottomBarHeight;
				}
				windowElem.style.height = height + "px";
				contentElem.style.height = (height - me.titleBarHeight) + "px";
			},
			restore: function (event) {
				diag.dialog('moveToTop');
				me.brieflyHighlightView(event.target.id.slice(0,-7));
				//The following lines are needed because of bugs in dialogExtend, which might be fixed in the latest version.
				diag.dialog("widget").draggable("option", "containment", [-Number.MAX_VALUE, desktopTop, Number.MAX_VALUE, Number.MAX_VALUE]);
				dialogWindow.draggable("option", {
					grid: [me.gridSizeX, me.gridSizeY]
				});
				dialogWindow.resizable("option", {
					grid: [me.gridSizeX, me.gridSizeY]
				});
			}
		});*/
		this.activeDialogs[name] = type;
		/*dialogWindow.draggable("option", {
			grid: [this.gridSizeX, this.gridSizeY]
		});
		dialogWindow.resizable("option", {
			grid: [this.gridSizeX, this.gridSizeY]
		});*/
		
		/* Initialize observables
		 * _view_xxx_width and _view_xxx_height are the width and height respectively of the usable
		 * client window area.  They don't include the space reserved for the title bar, scroll bars
		 * and resizing widget.  The actual size of the window with these elements included is
		 * bigger than the dimensions described these observables.  Thus:
		 *   _view_b_x = _view_a_x + _view_a_width;
		 * will position the windows with a slight overlap, though no information will be hidden.
		 */
		/*var typeSym = view(name, 'type');
		if (typeSym.value() != type) {
			typeSym.removeJSObserver("changeType");
			typeSym.assign(type, root.scope, creatingAgent);
			typeSym.addJSObserver("changeType", function (sym, newType) {
				if (newType !== undefined && root.lookup("_views_list").value().indexOf(name) !== -1) {
					me.createView(name, newType);
				}
			});
		}
		var viewListSym = root.lookup("_views_list");
		var viewList = viewListSym.value();
		if (Array.isArray(viewList)) {
			if (viewList.indexOf(name) === -1) {
				viewList = viewList.slice();
				viewList.push(name);
				viewListSym.assign(viewList, root.scope, creatingAgent);
			}
		} else {
			viewListSym.assign([name], root.scope, creatingAgent);
		}*/
 
		/*widthSym = view(name, 'width');
		if (widthSym.value() === undefined) {
			//widthSym.assign(diag.dialog("option", "width") - this.scrollBarSize, root.scope, agent);
		}
		var heightSym = view(name, 'height');
		if (heightSym.value() === undefined) {
			//heightSym.assign(diag.dialog("option", "height") - this.titleBarHeight, root.scope, agent);
		}
		var topLeft = diag.closest('.ui-dialog').offset();
		var xSym = view(name, 'x');
		if (xSym.value() === undefined) {
			//xSym.assign(topLeft.left, root.scope, agent);
		}
		var ySym = view(name, 'y');
		if (ySym.value() === undefined) {
			//ySym.assign(topLeft.top - desktopTop, root.scope, agent);
		}*/
		function updateVisibility(sym, state) {
			/*var windowState = diag.dialogExtend("state");
			if (state == "hidden") {
				if (windowState != "minimized") {
					me.minimizeView(name);
				}
			} else if (state == "maximized") {
				if (windowState != "maximized") {
					//me.maximizeView(name);
				}
			} else {
				if (!diag.dialog("isOpen") || windowState == "minimized" || windowState == "collapsed") {
					me.showView(name);
				}
			}*/
		}
		/*if (visibility != "visible") {
			if (visibility === undefined) {
				visibilitySym.assign("visible", root.scope, agent);
			} else {
				//updateVisibility(visibilitySym, visibility);
			}
		}
		visibilitySym.addJSObserver("changeState", updateVisibility);*/

		/* Plug-ins can append status information to their title bar.  Only use if there is genuinely
		 * no space to put the information inside the window (e.g. canvas) or an established precedent for
		 * putting such information into the title bar (e.g. if other views also acquire a zoom facility).
		 */
		/*var theTitleBarInfo = viewData.titleBarInfo;
		delete viewData.titleBarInfo;
		Object.defineProperty(viewData, "titleBarInfo", {
			get: function () { return theTitleBarInfo; },
			set: function (info) {
				theTitleBarInfo = info;
				var title = titleSym.value();
				if (info !== undefined) {
					title = title + " (" + info + ")";
				}
				//diag.dialog("option", "title", title);
			},
			enumerable: true
		});*/
		//Set the title bar text and allow the construal to change it later.
		/*function updateTitleBar(symbol, value) {
			var title = value;
			if (viewData.titleBarInfo !== undefined) {
				title = title + " (" + viewData.titleBarInfo + ")";
			}
			diag.dialog("option", "title", title);
			if (me.plugins.MenuBar) {
				me.plugins.MenuBar.updateViewsMenu();
			}
		}*/
		//titleSym.addJSObserver("updateTitleBar", updateTitleBar);
		/*if (title === undefined) {
			titleSym.assign(defaultTitle, root.scope, agent);
		} else {
			updateTitleBar(titleSym, title);
		}*/

		//Allow mouse drags that position the dialog partially outside of the browser window but not over the menu bar.
		//diag.dialog("widget").draggable("option", "containment", [-Number.MAX_VALUE, desktopTop, Number.MAX_VALUE, Number.MAX_VALUE]);
		/*diag.resizeExtend = 0;
		diag.on("dialogresize", function (event, ui) {
			var momentumX, momentumY;
			if (diag.previousWidth !== undefined) {
				momentumX = ui.size.width - diag.previousWidth;
				momentumY = ui.size.height - diag.previousHeight;
				if (momentumX > momentumY ) {
					diag.momentum = momentumX;
				} else {
					diag.momentum = momentumY;
				}
			}
			diag.previousWidth = ui.size.width;
			diag.previousHeight = ui.size.height;

			var provisionalTop = ui.position.top;
			if (provisionalTop < desktopTop) {
				ui.size.height = ui.size.height - (desktopTop - provisionalTop);
				ui.position.top = desktopTop;
			}
			var scrollX = 0, scrollY = 0;
			if (ui.position.left + ui.size.width < document.body.scrollLeft + me.gridSizeX) {
				ui.size.width = ui.size.width - me.gridSizeX;
				scrollX = -me.gridSizeX;
			}
			if (ui.position.top + ui.size.height < document.body.scrollTop + me.gridSizeY) {
				ui.size.height = ui.size.height - me.gridSizeY;
				scrollY = -me.gridSizeY;
			} else if (ui.position.top < document.body.scrollTop + me.gridSizeY) {
				scrollY = -me.gridSizeY;
			}
			if (diag.momentum >= 35 || diag.resizeExtend == 2) {
				var setTimer = false;
				if (ui.position.left + ui.size.width > document.body.scrollLeft + window.innerWidth - me.gridSizeX) {
					if (diag.resizeExtend == 0) {
						setTimer = true;
					} else {
						ui.size.width = ui.size.width + me.gridSizeX;
						scrollX = me.gridSizeX;
					}
				}
				if (ui.position.top + ui.size.height > document.body.scrollTop + window.innerHeight - me.gridSizeY) {
					if (diag.resizeExtend == 0) {
						setTimer = true;
					} else {
						ui.size.height = ui.size.height + me.gridSizeY;
						scrollY = me.gridSizeY;
					}
				}
				if (setTimer) {
					diag.resizeExtend = 1;
					setTimeout(function () {
						if (diag.resizeExtend == 1) {
							diag.resizeExtend = 2;
						}
					}, 850);
				}
			}
			if (scrollX != 0 || scrollY != 0) {
				window.scrollBy(scrollX, scrollY);
			}
		});

		diag.on("dialogresizestop", function (event, ui) {
			diag.previousWidth = undefined;
			diag.momentum = 0;
			diag.resizeExtend = 0;

			var root = me.eden.root;
			root.beginAutocalcOff();
			view(name, 'width').assign(ui.size.width - me.scrollBarSize, root.scope, Symbol.hciAgent);
			view(name, 'height').assign(ui.size.height - me.titleBarHeight + 2 * me.dialogBorderWidth, root.scope, Symbol.hciAgent);

			var xSym = view(name, "x");
			if (xSym.value() != ui.position.left) {
				xSym.assign(ui.position.left, eden.root.scope, Symbol.hciAgent);
			}
			var ySym = view(name, "y");
			var possibleNewY = ui.position.top - desktopTop;
			if (ySym.value() != possibleNewY) {
				ySym.assign(possibleNewY, eden.root.scope, Symbol.hciAgent);
			}
			root.endAutocalcOff();
		});
		diag.on("dialogdragstop", function (event, ui) {
			var root = me.eden.root;
			root.beginAutocalcOff();
			view(name, 'x').assign(ui.position.left, eden.root.scope, Symbol.hciAgent);
			view(name, 'y').assign(ui.position.top - desktopTop, eden.root.scope, Symbol.hciAgent);
			root.endAutocalcOff();
		});*/


		function viewEdenCode() {
			var code = 'proc _View_'+name+'_position : _view_'+name+'_x, _view_'+name+'_y {\n' +
					'${{ edenUI.moveView("'+name+'"); }}$;\n'+
				'};\n' +
				'proc _View_'+name+'_size : _view_'+name+'_width,_view_'+name+'_height {\n' +
					'${{ edenUI.resizeView("'+name+'"); }}$; \n' +
				'};';

			if (position) {
				code += '_view_'+name+'_position = [\"'+position.join('\", \"')+'\"];\n';
			}

			return code;
		}

		// Now construct eden agents and observables for dialog control.
		//this.eden.execute2(viewEdenCode(), "createView", "", {name: "/createView"}, noop);
		this.eden.root.endAutocalcOff();
		this.emit('createView', [name, type]);
		return viewData;
	};

	/**Simulates clicking a view's close button, prompting the user to confirm their intentions if necessary.
	 *@return {boolean} True if the view's dialog should actually be closed now, or false if we need
	 * to wait for confirmation first.
	 */
	EdenUI.prototype.closeView = function (name) {
		var me = this;
		if (this.viewInstances[name].confirmClose) {
			this.modalDialog(
				"Window Close Action",
				"<p>Removing this window from the work space will cause any unsaved changes associated with it to be lost.  You may need to reload the construal if you wish to see this window again.</p> \
				<p>Are you sure you want to permanently delete this information?  Or would you prefer to hide the window instead?</p>",
				["Close Forever", "Hide"],
				1, //Suggest hiding the window as the default option.
				function (optNum) {
					if (optNum == 0) {
						me.destroyView(name, true);
						edenUI.eden.root.collectGarbage();
					} else if (optNum == 1) {
						if (me.plugins.MenuBar) {
							me.hideView(name);
						} else {
							me.minimizeView(name);
						}
					}
				}
			);
			return false;
		} else {
			this.destroyView(name, true);
			edenUI.eden.root.collectGarbage();
			return true;
		}
	}

	EdenUI.prototype.destroyView = function (name, forgetObservables) {
		if (!(name in this.viewInstances) || this.viewInstances[name].closing) {
			//View already closed, never existed or already closing.
			return;
		}
		this.viewInstances[name].closing = true;

		if (this.viewInstances[name].destroy) {
			//Call clean-up handler.
			this.viewInstances[name].destroy();
		}
		root.lookup("forgetAll").definition.compiled(root)("^_View_" + name + "_", true, false, true);
		if (forgetObservables) {
			root.lookup("forgetAll").definition.compiled(root)("^_view_" + name + "_", true, false, true);
		}
		var theDialog = dialog(name);
		theDialog.dialog('destroy');
		theDialog.remove();
		theDialog.html("");
		delete this.activeDialogs[name];
		delete this.viewInstances[name];

		if (forgetObservables) {
			var viewListSym = root.lookup("_views_list");
			var viewList = viewListSym.value();
			if (Array.isArray(viewList)) {
				var index = viewList.indexOf(name);
				if (index !== -1) {
					var newViewList;
					if (index == 0) {
						newViewList = viewList.slice(1);
					} else {
						newViewList = viewList.slice(0, index).concat(viewList.slice(index + 1));
					}
					viewListSym.assign(newViewList, root.scope);
				}
			}
		}
		
		this.emit('destroyView', [name]);
	};

	EdenUI.prototype.getDialogContent = function (name) {
		return dialog(name);
	};

	EdenUI.prototype.getDialogWindow = function (name) {
		return dialog(name).parent();
	};

	/**
	 * Make the window for a view visible.
	 *
	 * @param {string} name Unique identifier for the view.
	 */
	EdenUI.prototype.showView = function (name) {
		var diag = dialog(name);
		diag.dialog('open').dialog('moveToTop');
		var state = diag.dialogExtend("state");
		if (state != "normal" && state != "maximized") {
			diag.dialogExtend('restore');
		}
		return this.activeDialogs[name];
	};

	EdenUI.prototype.updateView = function (name, data) {
		var view = this.viewInstances[name];
		if (view && view.update) {
			view.update(data);
		}
	}

	/**Highlights a view until the stopHighlightingView method is called.
	 * N.B. More than one view can be highlighted simultaneously, but only one can be raised.
	 * @param {string} name The name of the view that should become the currently highlighted view.
	 * @param {boolean} raise Whether or not display the view (if it is not already displayed) and
	 * ensure that it is not obscured by any other views.
	 */
	EdenUI.prototype.highlightView = function (name, raise) {
		if (raise) {
			this.windowHighlighter.highlight(name);
		} else {
			var element = this.getDialogContent(name).data('dialog-extend-minimize-controls') || this.getDialogWindow(name);
			element.addClass("window-highlighted");
		}
	};

	/**Removes the highlighting effect from a view that was previously highlighted.  If the
	 * view no longer highlighted is the raised one then it will no longer be raised and will return
	 * to its original position in the UI.
	 */
	EdenUI.prototype.stopHighlightingView = function (name, wasRaised, show) {
		if (wasRaised) {
			this.windowHighlighter.stopHighlight(name, show);
			if (show) {
				this.getDialogContent(name).dialog("moveToTop");
			}
		} else {
			var element = this.getDialogContent(name).data('dialog-extend-minimize-controls') || this.getDialogWindow(name);
			element.removeClass("window-highlighted");
		}
	};

	/**Momentarily provides a visual cue to direct the user's gaze towards a particular view.
	 * @param {string} name The name of the view to draw attention to.
	 */
	EdenUI.prototype.brieflyHighlightView = function (name) {
		var dialogWindow = this.getDialogWindow(name);
		dialogWindow.addClass("window-activated");
		setTimeout(function () {
			dialogWindow.removeClass("window-activated");
		}, 600);
	}

	/**
	 * Hide the window for a view.
	 *
	 * @param {string} name Unique identifier for the view.
	 */
	EdenUI.prototype.hideView = function (name) {
		if (!(name in this.viewInstances)) {
			//View has been destroyed or never existed.
			return;
		}
		this.viewInstances[name].closing = true;
		dialog(name).dialog('close');
	};

	/**
	 * Minimize the window for a view.
	 *
	 * @param {string} name Unique identifier for the view.
	 */
	EdenUI.prototype.minimizeView = function (name) {
		var hide = edenUI.getOptionValue("optHideOnMinimize");
		if (hide == "true") {
			this.hideView(name);
		} else {
			if (!(name in this.viewInstances)) {
				//View has been destroyed or never existed.
				return;
			}
			dialog(name).dialogExtend('minimize');
		}
	};

	/**
	 * Prevents a window from becoming completely obscured by another window by minimizing the first
	 * window so that appears in the minimized windows area instead of hidden behind the other window.
	 *
	 * This method is specific to the jQuery dialog UI implementation.  Other implementations are
	 * not required to implement it.  It should not be called from outside of the jQuery UI implementation.
	 *
	 * @private
	 */
	EdenUI.prototype.minimizeObscuredViews = function (name) {
		if (edenUI.getOptionValue("optHideOnMinimize") == "true") {
			return;
		}
		var diag = dialog(name);
		var diagWindow = diag.closest('.ui-dialog');
		if (diagWindow.is(this.windowHighlighter.lastDialog)) {
			return;
		}
		if (diag.dialogExtend("state") != "normal") {
			return;
		}
		var diagElem = diag.get(0);
		var tolerance = 0;
		var topLeft = diagWindow.offset();
		var left = topLeft.left;
		var top = topLeft.top;
		var width = diag.dialog("option", "width") + 2 * EdenUI.prototype.dialogBorderWidth;
		var height = diag.dialog("option", "height") + 2 * EdenUI.prototype.dialogBorderWidth;
		var pinned = diagWindow.hasClass("ui-front");

		var dialogs = $(".ui-dialog-content");
		for (var i = 0; i < dialogs.length; i++) {
			var compareDialog = $(dialogs[i]);
			if (dialogs[i] === diagElem || compareDialog.dialogExtend("state") != "normal") {
				continue;
			}
			var compareWindow = compareDialog.closest('.ui-dialog');
			if (compareWindow.hasClass("ui-front") && !pinned) {
				continue;
			}
			var compareTopLeft = compareWindow.offset();
			var compareLeft = compareTopLeft.left;
			var compareTop = compareTopLeft.top;
			var compareWidth = compareDialog.dialog("option", "width") + 2 * EdenUI.prototype.dialogBorderWidth;
			var compareHeight = compareDialog.dialog("option", "height") + 2 * EdenUI.prototype.dialogBorderWidth;
			
			if (compareLeft >= left - tolerance &&
				compareLeft + compareWidth <= left + width + tolerance &&
				compareTop >= top - tolerance &&
				compareTop + compareHeight <= top + height + tolerance
			) {
				compareDialog.dialogExtend('minimize');
			}
		}
	}

	/**
	 * Move the window for a view so that its position matches its EDEN observables.
	 *
	 * @param {string} name Unique identifier for the view.
	 */
	EdenUI.prototype.moveView = function (name) {
		var diag = dialog(name);
		var xSym = view(name, 'x');
		var ySym = view(name, 'y');
		var x = xSym.value();
		var y = ySym.value();
		var realX, realY;
		var minX = this.minimumWindowWidthShowing - diag.dialog("option", "width");
		if (x < minX) {
			realX = minX;
		} else {
			realX = Math.round(x / this.gridSizeX) * this.gridSizeX;
		}
		if (y < 0) {
			realY = 0;
		} else {
			realY = Math.round(y / this.gridSizeY) * this.gridSizeY;
		}
		xSym.cached_value = realX;
		ySym.cached_value = realY;
		if (this.plugins.MenuBar) {
			realY = realY  + this.menuBarHeight;
		}
		diag.parent().offset({left: realX, top: realY});
	};

	/**
	 * Resize a view so that its size matches its EDEN observables.
	 *
	 * @param {string} name Unique identifier for the view.
	 */
	EdenUI.prototype.resizeView = function (name) {
		var viewData = this.viewInstances[name];
		if (viewData.resizing) {
			return;
		}
		
		var diag = dialog(name);
		var position = diag.parent().position();
		var left = position.left;
		var top = position.top;
		var widthSym = view(name, 'width');
		var newWidth = widthSym.value();
		var heightSym = view(name, 'height');
		var newHeight = heightSym.value();
		var right = left + newWidth + this.scrollBarSize + this.dialogBorderWidth;
		var bottom = top + newHeight + this.titleBarHeight - 1;
		var xMax = window.innerWidth + document.body.scrollLeft;
		var yMax = window.innerHeight + document.body.scrollTop - this.scrollBarSize2;
		var bottomBarY = yMax - this.bottomBarHeight;			
		var hciName = Symbol.hciAgent.name;
		//Round the width.  For some reason the width set by jquery.ui isn't always aligned to the grid.
		var adjustedWidth = Math.round((newWidth + this.scrollBarSize + this.dialogBorderWidth) / this.gridSizeX) * this.gridSizeX - 2 * this.dialogBorderWidth;
		if (widthSym.last_modified_by != hciName) {
			if (adjustedWidth < newWidth + this.scrollBarSize) {
				//...but if the width was set by EDEN code instead of the UI then don't make the window narrower than the width requested.
				adjustedWidth = adjustedWidth + this.gridSizeX;
			}
			if (right <= xMax && left + adjustedWidth + this.dialogBorderWidth > xMax) {
				//...and don't go off of the screen (unless originally requested).
				adjustedWidth = xMax - this.dialogBorderWidth - left;
			}
		}

		//Round the height.  For some reason the height set by jquery.ui isn't always aligned to the grid.
		var adjustedHeight = Math.round((newHeight + this.titleBarHeight) / this.gridSizeY) * this.gridSizeY;
		if (heightSym.last_modified_by != hciName) {
			if (adjustedHeight < newHeight + this.titleBarHeight) {
				//...but if the height was set by EDEN code instead of the UI then don't make the window shorter than the height requested.
				adjustedHeight = adjustedHeight + this.gridSizeY;
			}
			if (bottom <= bottomBarY && top + adjustedHeight > bottomBarY) {
				// ... and don't go into the minimized windows area (unless originally requested).
				adjustedHeight = bottomBarY - top;
			} else if (bottom <= yMax && top + adjustedHeight > yMax) {
				// ... and don't go off the screen (unless originally requested).
				adjustedHeight = yMax - top;
			}
		} else {
			// When resizing is performed by dragging in the UI:
			if (top + adjustedHeight > bottomBarY && top + adjustedHeight < yMax) {
				//Snap to align with the minimized windows area.
				adjustedHeight = bottomBarY - top;
			} else if (top + adjustedHeight > yMax) {
				//Snap to align with the bottom of the browser window.
				adjustedHeight = yMax - top;
			}
		}

		diag.dialog("option", "width", adjustedWidth);
		diag.dialog("option", "height", adjustedHeight);
		//No idea why the following line is needed but it makes things work smoother when the window is positioned more than the value of the CSS height of the body element down the page.
		diag.parent().offset({top: top - document.body.scrollTop});

		newWidth = adjustedWidth - this.scrollBarSize;
		newHeight = adjustedHeight - this.titleBarHeight;

		viewData.resizing = true;
		this.eden.root.beginAutocalcOff();
		if (widthSym.definition === undefined) {
			widthSym.assign(newWidth, eden.root.scope, {name: widthSym.last_modified_by});
		}
		if (heightSym.definition === undefined) {
			heightSym.assign(newHeight, eden.root.scope, {name: heightSym.last_modified_by});
		}
		this.eden.root.endAutocalcOff();

		viewData.resizing = false;
		if ("resize" in viewData) {
			viewData.resize(newWidth, newHeight);
		}
	};

	/**Makes the view less likely to be obscured by other views/other page content.
	 * @param {string} name The view's name.
	 */
	EdenUI.prototype.pinView = function (name) {
		var dialogWindow = this.getDialogWindow(name);
		dialogWindow.addClass("ui-front");
		this.viewInstances[name].pinned = true;
	};

	/**Reduce a view's importance to the same status as other windows.
	 * @param {string} name The view's name.
	 */
	EdenUI.prototype.unpinView = function (name) {
		var dialogWindow = this.getDialogWindow(name);
		dialogWindow.removeClass("ui-front");
		this.viewInstances[name].pinned = false;
		this.windowHighlighter.unpin(dialogWindow);
	};

	EdenUI.prototype.newProject = function () {
		this.eden.reset();
		this.destroyView("jspe", true);
		if ("Canvas2D" in this.plugins) {
			this.eden.executeEden('createCanvas("picture");', "new project", "", Symbol.hciAgent, noop);
		}
		if ("ScriptInput" in this.plugins) {
			this.eden.executeEden('createView("input", "ScriptInput");', "new project", "", Symbol.hciAgent, noop);
		}
		if (this.views.ErrorLog.errorWindow) {
			this.views.ErrorLog.errorWindow.html('');
		}
		Eden.Agent.removeAll();
		this.eden.captureInitialState();
	}

	/**Creates a modal dialogue box that permits the user to choose from a small number of fixed
	 * options.  The user must choose an option before they can have any other interaction
	 * with JS-EDEN.
	 * @param {string} title The text to go in the window's title bar.
	 * @param {string} message The text to display as a prompt message.  Can include HTML.
	 * @param {Array} options An array of strings.  Each one provides the text used to create a
	 * button at the foot of the dialogue box.
	 * @param {Number} defaultOptionNum The number of the option that should be taken if the user
	 * presses the enter or space key. (Can use the tab key to select a different option.)
	 * @param {function} callback A function to call once the user has clicked a button.  The
	 * function should have a single integer parameter.  If n options are provided then the function
	 * will be invoked with a value between 0 and n inclusive.  Values 0 through n-1 correspond to
	 * the options provided in the options argument.  n means that the user has clicked "Cancel",
	 * which is an option that is always provided, regardless of the contents of the options array.
	 */
	EdenUI.prototype.modalDialog = function (title, message, options, defaultOptionNum, callback) {
		var dialog = $('<div id="modal"></div>');
		
		var callCallback = function (i) {
			return function (event) {
				dialog.dialog("destroy");
				dialog.remove();
				callback(i);
			};
		};
		
		var text = $('<div>' + message + '</div>');
		dialog.append(text);
		
		var buttons = [];
		for (var i = 0; i < options.length; i++) {
			var button = {
				text: options[i],
				click: callCallback(i)
			};
			buttons.push(button);
		}
		var cancelValue = options.length;
		var cancelButton = {
			text: "Cancel",
			click: callCallback(cancelValue)
		};
		buttons.push(cancelButton);
		
		dialog.dialog({
			buttons: buttons,
			modal: true,
			resizable: false,
			show: "fade",
			title: title,
			close: function () {
				callback(cancelValue);
			},
			open: function () {
				$(this).parent().find("button")[defaultOptionNum].focus();				
			},
			width: 375
		})
		$(".ui-widget-overlay").css("z-index", 10001);
		dialog.parent().css("z-index", 10002);
	}

}());

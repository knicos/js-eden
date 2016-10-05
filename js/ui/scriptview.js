/**
 * Support function to get the caret position within the syntax highlighted
 * div. Used when clicking or selecting the highlighted script.
 */
function getCaretCharacterOffsetWithin(element, shadow) {
	var caretOffset = 0;
	var doc = element.ownerDocument || element.document;
	var win = shadow || doc.defaultView || doc.parentWindow;
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
function getStartCaretCharacterOffsetWithin(element, shadow) {
	var caretOffset = 0;
	var doc = element.ownerDocument || element.document;
	var win = shadow || doc.defaultView || doc.parentWindow;
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

EdenUI.ScriptView = function(name, title, options) {

	EdenUI.ScriptView.init();

	this.titlechangecb = undefined;
	this.contents = $('<div class="scriptview-inner"><div class="scriptview-box"></div><div class="scriptview-menuicon">&#xf002;</div><div class="scriptview-bar"><div class="searchouter"><input type="text" class="search" placeholder="Search..."></input></div><span title="Search Help" data-page="help/search.html" class="help">&#xf29c;</span><div class="scriptview-buttons"></div></div><div class="scriptview-results"></div></div>');
	this.script = new EdenUI.ScriptBox(this.contents.find(".scriptview-box").get(0), options);
	this.statements = [];
	this.name = name;
	this.title = title;
	this.searchin = this.contents.find(".search");
	this.searchres = this.contents.find(".scriptview-results");
	this.buttons = this.contents.find(".scriptview-buttons");
	this.bar = this.contents.find(".scriptview-bar");
	this.menushow = this.contents.find(".scriptview-menuicon");
	this.lastres = undefined;
	this.lastrem = undefined;
	this.searchreshidden = true;
	this.nobuttons = (options && options.nobuttons !== undefined) ? options.nobuttons : false;

	this.defaultWidth = 625;
	this.defaultHeight = 350;
	this.menushow.hide();

	//this.bar.hide();
	if (!this.nobuttons) {
		var me = this;

		if (mobilecheck()) {
			this.buttons.append($('<button class="scriptview-button enabled mobilemore">&#xf142;</button>'));
			var ctx = new EdenUI.ContextMenu(this.buttons.get(0).childNodes[0]);
			ctx.addItem("&#xf005;", "Star All", true, function(e) { me.script.stickAll(); });
			ctx.addItem("&#xf006;", "Unstar All", true, function(e) { me.script.unstickAll(); });
			ctx.addItem("&#xf05e;", "Clear Unstarred", true, function(e) { me.script.clearUnstuck(); });
			ctx.addItem("&#xf144;", "Play Starred", true, function(e) { me.script.activateAll(); });
			this.buttons.on("click",function(e) {
				me.buttons.get(0).childNodes[0].oncontextmenu(e);
			});
		} else {
			this.buttons.append($('<button class="scriptview-button enabled starall" title="Star All">&#xf005;</button><button class="scriptview-button enabled unstarall" title="Unstar All">&#xf006;</button><button class="scriptview-button enabled clear" title="Remove Unstarred">&#xf05e;</button><button class="scriptview-button enabled playall" title="Activate Starred">&#xf144;</button><button class="scriptview-button enabled clonestar" title="Copy Starred">&#xf24d;</button>'));
		}

		this.menushow.on("click", function() {
			me.bar.show("fast");
			me.menushow.hide();
		});

		this.buttons.on("click",".clear",function(e) {
			me.script.clearUnstuck();
		})
		.on("click", ".unstarall", function(e) {
			me.script.unstickAll();
		})
		.on("click", ".playall", function(e) {
			me.script.activateAll();
		})
		.on("click", ".starall", function(e) {
			me.script.stickAll();
		})
		.on("click", ".clonestar", function(e) {
			me.script.cloneStuck();
		})
		.on("click", ".scriptview-but-save", function(e) {
			me.save();
		});
		this.searchin.on("keyup", function(e) {
			var str = me.searchin.get(0).value;
			if (str != "" && e.keyCode == 13) {
				me.script.clearEmpty();

				for (var i=0; i<me.lastres.active.length; i++) {
					me.script.insertStatement(Eden.Statement.statements[me.lastres.active[i]], false);
				}
				for (var i=0; i<me.lastres.inactive.length; i++) {
					me.script.insertStatement(Eden.Statement.statements[me.lastres.inactive[i]], false);
				}
				for (var i=0; i<me.lastres.agents.length; i++) {
					me.script.insertStatement(Eden.Statement.statements[me.lastres.agents[i]], false);
				}
				me.searchres.hide();
				me.searchreshidden = true;
			} else if (str != "") {
				var res;
				// Init server search
				Eden.Statement.remoteSearch(str,function(results) {
					me.lastrem = results;
					me.updateSearchResults(res, str, results);
				});
				res = Eden.Statement.search(str);
				me.lastres = res;
				me.updateSearchResults(res, str);
			} else {
				me.searchres.hide();
				me.searchreshidden = true;
			}
		});
		this.searchin.on("click", function() {
			if (me.searchin.get(0).value != "" && me.searchreshidden) {
				me.searchres.show('fast');
				me.searchreshidden = false;
			}
		})

		this.searchres.on("click", ".scriptview-result", function(e) {
			var num = parseInt(e.currentTarget.getAttribute("data-statement"));
			if (me.script.statements[num] === undefined) me.script.insertStatement(Eden.Statement.statements[num], true);
			else me.script.moveTo(num);
			me.searchres.hide();
			me.searchreshidden = true;
			//me.bar.hide("fast");
			//me.menushow.show();
		});

		this.searchres.on("click", ".scriptview-resultview", function(e) {
			me.load(e.currentTarget.getAttribute("data-view"));
			me.searchres.hide();
			me.searchreshidden = true;
			//me.bar.hide("fast");
			//me.menushow.show();
		});

		this.searchres.on("click", ".scriptview-resultremote", function(e) {
			var num = parseInt(e.currentTarget.getAttribute("data-remote"));
			var stat = new Eden.Statement();
			stat.rid = me.lastrem.inactive[num].rid;
			Eden.Statement.shared[stat.rid] = stat;
			stat.setSource(me.lastrem.inactive[num].source, undefined, undefined, true);
			me.script.insertStatement(Eden.Statement.statements[stat.id], true);
			//else me.script.moveTo(num);
			me.searchres.hide();
			me.searchreshidden = true;
		});

		this.searchres.on("click", ".scriptview-resultsearch", function(e) {
			me.script.clearEmpty();

			if (me.lastres.all && me.lastres.all.length > 0) {
				for (var i=0; i<me.lastres.all.length; i++) {
					me.script.insertStatement(Eden.Statement.statements[me.lastres.all[i]], false);
				}
			} else {
				for (var i=0; i<me.lastres.active.length; i++) {
					me.script.insertStatement(Eden.Statement.statements[me.lastres.active[i]], false);
				}
				for (var i=0; i<me.lastres.inactive.length; i++) {
					me.script.insertStatement(Eden.Statement.statements[me.lastres.inactive[i]], false);
				}
				for (var i=0; i<me.lastres.agents.length; i++) {
					me.script.insertStatement(Eden.Statement.statements[me.lastres.agents[i]], false);
				}
			}
			me.searchres.hide();
			me.searchreshidden = true;
			//me.bar.hide("fast");
			//me.menushow.show();
		});

		this.script.$codearea.on("click",function() {
			me.searchres.hide();
			me.searchreshidden = true;
			//me.bar.hide("fast");
			//me.menushow.show();
		});
	} else {
		this.bar.hide();
		this.contents.find(".scriptview-box").css("top","0");
	}

	this.load(this.title);
	if (this.script.codearea.childNodes.length == 0) this.script.insertStatement();
	this.save();

	this.script.setChangeCB(function() {
		me.save();
	});
}

EdenUI.ScriptView.init = function() {
	if (EdenUI.ScriptView.savedViews === undefined) {
		var views;
		try {
			if (window.localStorage) {
				views = JSON.parse(window.localStorage.getItem("scriptviews"));
			}
		} catch(e) {

		}
		if (!views) views = {};
		EdenUI.ScriptView.savedViews = views;
	}
}

EdenUI.ScriptView.reset = function() {
	EdenUI.ScriptView.savedViews = {};
}

//EdenUI.ScriptView.savedViews = {};

EdenUI.ScriptView.prototype.setTitle = function(newtitle) {
	if (newtitle == "") return false;
	if (EdenUI.ScriptView.savedViews[newtitle] !== undefined && this.title != newtitle) return false;
	delete EdenUI.ScriptView.savedViews[this.title];
	this.title = newtitle;
	this.save();
	return true;
}

EdenUI.ScriptView.prototype.load = function(name) {
	console.log("LOAD VIEW " + name);
	var listing = EdenUI.ScriptView.savedViews[name];
	if (listing) {
		// Clear all
		this.title = name;
		this.script.clearAll();
		for (var i=0; i<listing.length; i++) {
			this.script.insertStatement(Eden.Statement.statements[listing[i]], true);
		}
		if (this.titlechangecb) this.titlechangecb.call(this);
	}
}

EdenUI.ScriptView.prototype.save = function() {
	if (this.title) {
		name = this.title;
	} else if (name === undefined) {
		name = "Untitled View";
	}

	var listing = [];
	var node = this.script.codearea.firstChild;
	while (node) {
		var num = parseInt(node.getAttribute("data-statement"));
		listing.push(num);
		node = node.nextSibling;
	}

	EdenUI.ScriptView.savedViews[name] = listing;

	try {
		if (window.localStorage) {
			window.localStorage.setItem("scriptviews", JSON.stringify(EdenUI.ScriptView.savedViews));
		}
	} catch(e) {

	}
}

EdenUI.ScriptView.saveData = function() {
	return EdenUI.ScriptView.savedViews;
}

EdenUI.ScriptView.loadData = function(object) {
	EdenUI.ScriptView.savedViews = object;
	try {
		if (window.localStorage) {
			window.localStorage.setItem("scriptviews", JSON.stringify(EdenUI.ScriptView.savedViews));
		}
	} catch(e) {

	}
}

EdenUI.ScriptView.prototype.updateSearchResults = function(res,str,remote) {
	if (res === undefined) res = {active:[],inactive:[],agents:[]};

	var regex = edenUI.regExpFromStr(str);
	res.views = [];
	for (var x in EdenUI.ScriptView.savedViews) {
		if (regex.test(x)) {
			res.views.push(x);
		}	
	}

	if ((remote && remote.inactive.length > 0) || (res && ((res.tags && res.tags.length > 0) || res.active.length > 0 || res.inactive.length > 0 || res.agents.length > 0 || res.views.length > 0))) {
		if (this.searchreshidden) {
			this.searchres.show('fast');
			this.searchreshidden = false;
		}
		var html = "";
		var symmax = 5;

		if (res.views.length > 0) {
			for (var i=0; i<((res.views.length > 3)?3:res.views.length); i++) {
				html += "<div class='scriptview-resultview active' data-view='"+res.views[i]+"'><span class='scriptview-resulticon'>&#xf0f6;</span>"+res.views[i]+"</div>\n";
			}
			html += "<hr>";
		}

		if (res.tags && res.tags.length > 0) {
			var words = str.split(/[ ]+/);
			if (words.length == 1 && (res.tags.length > 1 || res.tags[0] != words[0])) {
				for (var i=0; i<((res.tags.length > 3)?3:res.tags.length); i++) {
					html += "<div class='scriptview-resulttag' data-tag='"+res.tags[i]+"'><span class='scriptview-resulticon'>&#xf292;</span>"+res.tags[i].substring(1)+"</div>\n";
				}
				html += "<hr>";
			}
		}

		/*for (var i=0; i<this.pastSearch.length; i++) {
			if (regex.test(this.pastSearch[i])) {
				html += "<div class='scriptview-result active'><span class='scriptview-resulticon'>&#xf017;</span>"+this.pastSearch[i]+"</div>\n";
			}
		}*/

		if (res.agents.length == 0) symmax += 2;

		if (res.active.length > 0) {
			for (var i=0; i<((res.active.length > symmax)?symmax:res.active.length); i++) {
				var stat = Eden.Statement.statements[res.active[i]];
				//var src = stat.source.substring(stat.statement.start).split("\n")[0];
				var src = stat.ast.getSource(stat.statement).split("\n")[0];
				var com = "";
				if (stat.statement.doxyComment) com = stat.statement.doxyComment.stripped();
				html += "<div class='scriptview-result active' data-statement='"+res.active[i]+"'"+((com!="")?" title='"+com+"'":"")+"><span class='scriptview-resulticon'>&#xf06e;</span>"+src+"</div>\n";
			}
			symmax -= res.active.length;
		}

		if (res.inactive.length > 0) {
			for (var i=0; i<((res.inactive.length > symmax)?symmax:res.inactive.length); i++) {
				var stat = Eden.Statement.statements[res.inactive[i]];
				//var src = stat.source.substring(stat.statement.start).split("\n")[0];
				var src = stat.ast.getSource(stat.statement).split("\n")[0];
				var com = "";
				if (stat.statement.doxyComment) com = stat.statement.doxyComment.stripped();
				html += "<div class='scriptview-result' data-statement='"+res.inactive[i]+"'"+((com!="")?" title='"+com+"'":"")+"><span class='scriptview-resulticon'>&#xf070;</span>"+src+"</div>\n";
			}
			symmax -= res.active.length;
		}

		if (symmax > 0 && remote) {
			for (var i=0; i<((remote.inactive.length > symmax)?symmax:remote.inactive.length); i++) {
				var ast = new Eden.AST(remote.inactive[i].source,undefined,true);
				var src = ast.getSource(ast.script).split("\n")[0];
				html += "<div class='scriptview-resultremote' data-remote='"+i+"'><span class='scriptview-resulticon'>&#xf0c2</span>"+src+"</div>\n";
			}
		}

		if (res.agents.length > 0) {
			if (res.active.length > 0 || res.inactive.length > 0) html += "<hr>";
			for (var i=0; i<((res.agents.length > 3)?3:res.agents.length); i++) {
				var stat = Eden.Statement.statements[res.agents[i]];
				var bsrc = stat.ast.getSource(stat.statement);
				var ixof = bsrc.indexOf("{")
				var src = (ixof >= 0) ? bsrc.substr(0,ixof) : bsrc;
				var com = "";
				if (stat.statement.doxyComment) com = stat.statement.doxyComment.stripped();
				html += "<div class='scriptview-result"+((stat.isActive())?" active":"")+"' data-statement='"+res.agents[i]+"'"+((com!="")?" title='"+com+"'":"")+"><span class='scriptview-resulticon'>&#xf007;</span>"+src+"</div>\n";
			}
		}

		if (res.active.length > 0 || res.inactive.length > 0 || res.agents.length > 0) html += "<hr>";
		html += "<div class='scriptview-resultsearch'><span class='scriptview-resulticon'>&#xf002;</span> All results for \""+str+"\"</div>";

		this.searchres.html(html);
	} else if (res.all && res.all.length > 0) {
		if (this.searchreshidden) {
			this.searchres.show('fast');
			this.searchreshidden = false;
		}
		var html = "";
		var symmax = 5;

		for (var i=0; i<((res.all.length > symmax)?3:res.all.length); i++) {
			var stat = Eden.Statement.statements[res.all[i]];
			//var src = stat.source.substring(stat.statement.start).split("\n")[0];
			var src = stat.ast.getSource(stat.statement).split("\n")[0];
			var com = "";
			if (stat.statement.doxyComment) com = stat.statement.doxyComment.stripped();
			html += "<div class='scriptview-result' data-statement='"+res.all[i]+"'"+((com!="")?" title='"+com+"'":"")+"><span class='scriptview-resulticon'>&#xf070;</span>"+src+"</div>\n";
		}
		html += "<hr>";
		html += "<div class='scriptview-resultsearch'><span class='scriptview-resulticon'>&#xf002;</span> All results for \""+str+"\"</div>";

		this.searchres.html(html);
	} else {
		this.searchres.hide();
		this.searchreshidden = true;
	}
}

EdenUI.ScriptView.createDialog = function(name, mtitle) {
	var viewdata = new EdenUI.ScriptView(name.slice(0,-7),mtitle);
	return viewdata;
}

//================================
// Custom HTML Tag
//================================

EdenUI.ScriptView.xProto = Object.create(HTMLElement.prototype);

EdenUI.ScriptView.xProto.createdCallback = function() {
	var shadow = this.createShadowRoot();
	var sv = new EdenUI.ScriptView(this.getAttribute("data-name"), this.getAttribute("data-title"), {
		nobuttons: this.getAttribute("data-nobuttons")
	});
	sv.shadow = shadow;
	sv.script.shadow = shadow;

	var link;
	link = document.createElement("style");
	link.textContent = "@import \"css/scriptbox.css\";\n@import \"css/highlighter.css\";";
	shadow.appendChild(link);

	shadow.appendChild(sv.contents[0]);

	/*$(shadow).on('keydown', null, 'backspace', function (e) {
		var elem = e.target;
		var tagName = elem.tagName.toUpperCase();
		if (tagName != "INPUT" && tagName != "TEXTAREA" && !elem.isContentEditable) {
			e.preventDefault();
		}
	});*/
}

/*EdenUI.ScriptView.xProduct = document.registerElement("x-construit-script", {
	prototype: EdenUI.ScriptView.xProto
});*/




EdenUI.ScriptView = function(name, title) {

	EdenUI.ScriptView.init();

	this.titlechangecb = undefined;
	this.contents = $('<div class="scriptview-inner"><div class="scriptview-box"></div><div class="scriptview-menuicon">&#xf002;</div><div class="scriptview-bar"><div class="searchouter"><input type="text" class="search" placeholder="Search..."></input></div><div class="scriptview-buttons"></div></div><div class="scriptview-results"></div></div>');
	this.script = new EdenUI.ScriptBox(this.contents.find(".scriptview-box").get(0));
	this.statements = [];
	this.name = name;
	this.title = title;
	this.searchin = this.contents.find(".search");
	this.searchres = this.contents.find(".scriptview-results");
	this.buttons = this.contents.find(".scriptview-buttons");
	this.bar = this.contents.find(".scriptview-bar");
	this.menushow = this.contents.find(".scriptview-menuicon");
	this.lastres = undefined;

	this.defaultWidth = 625;
	this.defaultHeight = 350;

	//this.bar.hide();
	this.menushow.hide();

	if (mobilecheck()) {
		this.buttons.append($('<button class="control-button control-enabled">&#xf142;</button>'));
	} else {
		this.buttons.append($('<button class="scriptview-button enabled starall">&#xf005;</button><button class="scriptview-button enabled unstarall">&#xf006;</button><button class="scriptview-button enabled clear">&#xf05e;</button><button class="scriptview-button enabled playall">&#xf144;</button><button class="scriptview-button enabled hashtag">&#xf292;</button>'));
	}

	var me = this;
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
	.on("click", ".scriptview-but-save", function(e) {
		me.save();
	});
	this.searchin.on("keyup", function(e) {
		var str = me.searchin.get(0).value;
		if (str != "" && e.keyCode == 13) {
			for (var i=0; i<me.lastres.active.length; i++) {
				me.script.insertStatement(Eden.Statement.statements[me.lastres.active[i]], false);
			}
			for (var i=0; i<me.lastres.inactive.length; i++) {
				me.script.insertStatement(Eden.Statement.statements[me.lastres.inactive[i]], false);
			}
			for (var i=0; i<me.lastres.agents.length; i++) {
				me.script.insertStatement(Eden.Statement.statements[me.lastres.agents[i]], false);
			}
			me.searchres.hide('fast');
		} else if (str != "") {
			var res = Eden.Statement.search(str);
			me.lastres = res;
			me.updateSearchResults(res, str);
		} else {
			me.searchres.hide('fast');
		}
	});
	this.searchin.on("click", function() {
		if (me.searchin.get(0).value != "") me.searchres.show('fast');
	})

	this.searchres.on("click", ".scriptview-result", function(e) {
		var num = parseInt(e.currentTarget.getAttribute("data-statement"));
		if (me.script.statements[num] === undefined) me.script.insertStatement(Eden.Statement.statements[num], true);
		else me.script.moveTo(num);
		me.searchres.hide('fast');
		//me.bar.hide("fast");
		//me.menushow.show();
	});

	this.searchres.on("click", ".scriptview-resultview", function(e) {
		me.load(e.currentTarget.getAttribute("data-view"));
		me.searchres.hide('fast');
		//me.bar.hide("fast");
		//me.menushow.show();
	});

	this.searchres.on("click", ".scriptview-resultsearch", function(e) {
		for (var i=0; i<me.lastres.active.length; i++) {
			me.script.insertStatement(Eden.Statement.statements[me.lastres.active[i]], false);
		}
		for (var i=0; i<me.lastres.inactive.length; i++) {
			me.script.insertStatement(Eden.Statement.statements[me.lastres.inactive[i]], false);
		}
		for (var i=0; i<me.lastres.agents.length; i++) {
			me.script.insertStatement(Eden.Statement.statements[me.lastres.agents[i]], false);
		}
		me.searchres.hide('fast');
		//me.bar.hide("fast");
		//me.menushow.show();
	});

	this.script.$codearea.on("click",function() {
		me.searchres.hide('fast');
		//me.bar.hide("fast");
		//me.menushow.show();
	});

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

EdenUI.ScriptView.prototype.updateSearchResults = function(res,str) {
	if (res === undefined) res = {active:[],inactive:[],agents:[]};

	var regex = edenUI.regExpFromStr(str);
	res.views = [];
	for (var x in EdenUI.ScriptView.savedViews) {
		if (regex.test(x)) {
			res.views.push(x);
		}	
	}

	if (res && ((res.tags && res.tags.length > 0) || res.active.length > 0 || res.inactive.length > 0 || res.agents.length > 0 || res.views.length > 0)) {
		this.searchres.show('fast');
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
	} else {
		this.searchres.hide('fast');
	}
}

EdenUI.ScriptView.createDialog = function(name, mtitle) {
	var viewdata = new EdenUI.ScriptView(name.slice(0,-7),mtitle);
	return viewdata;
}


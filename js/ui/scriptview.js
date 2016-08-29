EdenUI.ScriptView = function(name, title) {
	this.contents = $('<div><div class="scriptview-bar"><div class="searchouter"><input type="text" class="search" placeholder="Search..."></input></div></div><div class="scriptview-box"></div><div class="scriptview-results"></div></div>');
	this.script = new EdenUI.ScriptBox(this.contents.find(".scriptview-box").get(0));
	this.statements = [];
	this.name = name;
	this.title = title;
	this.searchin = this.contents.find(".search");
	this.searchres = this.contents.find(".scriptview-results");
	this.lastres = undefined;

	var me = this;
	this.searchin.on("keyup", function() {
		var str = me.searchin.get(0).value;
		if (str != "") {
			var res = Eden.Statement.search(edenUI.regExpFromStr(str));
			me.lastres = res;
			me.updateSearchResults(res, str);
		} else {
			me.searchres.hide('fast');
		}
	});
	this.searchin.on("click", function() {
		me.searchres.show('fast');
	});

	this.searchres.on("click", ".scriptview-result", function(e) {
		var num = parseInt(e.currentTarget.getAttribute("data-statement"));
		if (me.script.statements[num] === undefined) me.script.insertStatement(Eden.Statement.statements[num], false);
		else me.script.moveTo(num);
		me.searchres.hide('fast');
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
	});

	this.script.$codearea.on("click",function() {
		me.searchres.hide('fast');
	});
}

EdenUI.ScriptView.prototype.updateSearchResults = function(res,str) {
	if (res.active.length > 0 || res.inactive.length > 0 || res.agents.length > 0) {
		this.searchres.show('fast');
		var html = "";
		var symmax = 6;

		if (res.active.length > 0) {
			for (var i=0; i<((res.active.length > symmax)?symmax:res.active.length); i++) {
				var stat = Eden.Statement.statements[res.active[i]];
				var src = stat.source.split("\n")[0];
				html += "<div class='scriptview-result active' data-statement='"+res.active[i]+"'><span class='scriptview-resulticon'>&#xf06e;</span>"+src+"</div>\n";
			}
			symmax -= res.active.length;
		}

		if (res.inactive.length > 0) {
			for (var i=0; i<((res.inactive.length > symmax)?symmax:res.inactive.length); i++) {
				var stat = Eden.Statement.statements[res.inactive[i]];
				var src = stat.source.split("\n")[0];
				html += "<div class='scriptview-result' data-statement='"+res.inactive[i]+"'><span class='scriptview-resulticon'>&#xf070;</span>"+src+"</div>\n";
			}
		}

		if (res.agents.length > 0) {
			if (res.active.length > 0 || res.inactive.length > 0) html += "<hr>";
			for (var i=0; i<((res.agents.length > 3)?3:res.agents.length); i++) {
				var stat = Eden.Statement.statements[res.agents[i]];
				var ixof = stat.source.indexOf("{")
				var src = (ixof >= 0) ? stat.source.substr(0,ixof) : stat.source;
				html += "<div class='scriptview-result"+((stat.isActive())?" active":"")+"' data-statement='"+res.agents[i]+"'><span class='scriptview-resulticon'>&#xf007;</span>"+src+"</div>\n";
			}
		}

		html += "<hr>";
		html += "<div class='scriptview-resultsearch'><span class='scriptview-resulticon'>&#xf002;</span> "+str+"</div>";

		this.searchres.html(html);
	} else {
		this.searchres.hide('fast');
	}
}

EdenUI.ScriptView.createDialog = function(name, mtitle) {
	var viewdata = new EdenUI.ScriptView(name.slice(0,-7),mtitle);

	$('<div id="'+name+'"></div>')
		.append(viewdata.contents)
		.dialog({
			title: mtitle,
			width: 800,
			height: 500,
			minHeight: 120,
			minWidth: 230,
			dialogClass: "veden-dialog"
		});
	return viewdata;
}


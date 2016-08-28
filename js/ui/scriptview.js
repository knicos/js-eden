EdenUI.ScriptView = function(name, title) {
	this.contents = $('<div><div class="scriptview-bar"><div class="searchouter"><input type="text" class="search" placeholder="Search..."></input></div></div><div class="scriptview-box"></div><div class="scriptview-results"></div></div>');
	this.script = new EdenUI.ScriptBox(this.contents.find(".scriptview-box").get(0));
	this.statements = [];
	this.name = name;
	this.title = title;
	this.searchin = this.contents.find(".search");
	this.searchres = this.contents.find(".scriptview-results");

	var me = this;
	this.searchin.on("keyup", function() {
		var str = me.searchin.get(0).value;
		if (str != "") {
			var res = Eden.Statement.search(edenUI.regExpFromStr(str));
			me.updateSearchResults(res);
		} else {
			me.searchres.hide('fast');
		}
	});

	this.searchres.on("click", ".scriptview-result", function(e) {
		var num = parseInt(e.currentTarget.getAttribute("data-statement"));
		if (me.script.statements[num] === undefined) me.script.insertStatement(Eden.Statement.statements[num]);
		else me.script.moveTo(num);
		me.searchres.hide('fast');
	});
}

EdenUI.ScriptView.prototype.updateSearchResults = function(res) {
	if (res.length > 0) {
		this.searchres.show('fast');
		var html = "";
		for (var i=0; i<res.length; i++) {
			var stat = Eden.Statement.statements[res[i]];
			var ixof = stat.source.indexOf("{")
			var src = (ixof >= 0) ? stat.source.substr(0,ixof) : stat.source;
			html += "<div class='scriptview-result"+((stat.isActive())?" active":"")+"' data-statement='"+res[i]+"'>"+src+"</div>\n";
		}
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


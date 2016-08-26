EdenUI.ScriptView = function(name, title) {
	this.contents = $('<div><div class="scriptview-bar"><div class="searchouter"><input type="text" class="search" placeholder="Search..."></input></div></div><div class="scriptview-box"></div></div>');
	this.script = new EdenUI.ScriptBox(this.contents.find(".scriptview-box").get(0));
	this.statements = [];
	this.name = name;
	this.title = title;
	
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


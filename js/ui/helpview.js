EdenUI.Help = function(name, title, source) {
	this.name = name;
	this.title = title;
	this.source = source;

	this.contents = $('<div style="line-height: 25px; text-align: justify; position: absolute; top: 0; bottom: 0; right: 0; left: 0; padding: 20px; overflow: auto;"></div>');

	var me = this;
	$.ajax({
		url: source,
		type: "get",
		success: function(data){
			me.contents.html(data);
		},
		error: function(a){
			me.contents.html("Could not load help page.");
		}
	});

	this.defaultWidth = 800;
	this.defaultHeight = 500;
	this.background = "dark";
}

EdenUI.Help.createDialog = function(name, mtitle, source) {
	var viewdata = new EdenUI.Help(name.slice(0,-7),mtitle,source);
	return viewdata;
}



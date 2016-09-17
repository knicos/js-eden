EdenUI.Help = function(name, title, source) {
	this.name = name;
	this.title = title;
	this.source = source;

	this.contents = $('<div class="jseden-viewcontent" style="padding-left: 20px; padding-right: 20px; overflow: auto;"></div>');

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

	this.defaultWidth = 500;
	this.defaultHeight = 500;
}

EdenUI.Help.createDialog = function(name, mtitle, source) {
	var viewdata = new EdenUI.Help(name.slice(0,-7),mtitle,source);
	return viewdata;
}



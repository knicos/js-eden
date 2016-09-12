EdenUI.MobileTabs = function(element, content) {
	this.content = content;
	this.tabs = element;
	this.items = [];
	this.current = undefined;

	// Add scroll left
	var left = document.createElement("div");
	this.left = left;
	left.className = "mobile-tableft noselect";
	this.tabs.appendChild(left);

	// Add scroll right
	var right = document.createElement("div");
	this.right = right;
	right.className = "mobile-tabright noselect";
	this.tabs.appendChild(right);

	// Add scroll right
	this.title = document.createElement("div");
	this.title.className = "mobile-title noselect";
	this.tabs.appendChild(this.title);

	var me = this;

	$(left).on("click", function(e) {
		if (me.current > 0) me.changeTo(me.current-1);
	});

	$(right).on("click", function(e) {
		if (me.current < me.items.length-1) me.changeTo(me.current+1);
	});

	/*$(this.tabs).on("click",".agent-tab",function(e) {
		var name = e.currentTarget.getAttribute("data-name");
		//console.log("Clicked on tab " + name);
		//me.statement.setSource("tabs_"+me.name+"_current = \"" + name+"\";");
		//me.statement.activate();
		eden.root.lookup("tabs_"+me.name+"_current").assign(name, eden.root.scope);
	})
	.on("click", ".agent-newtab", function(e) {
		eden.root.lookup("tabs_"+me.name+"_new").assign(true, eden.root.scope);
	});*/
}

EdenUI.MobileTabs.prototype.add = function(view) {
	this.items.push(view);
	if (this.current === undefined) {
		this.changeTo(0);
	} else {
		if (this.current == 0) $(this.left).hide();
		else $(this.left).show();
		if (this.current == this.items.length-1) $(this.right).hide();
		else $(this.right).show();
	}
}

EdenUI.MobileTabs.prototype.changeTo = function(ix) {
	while (this.content.firstChild) this.content.removeChild(this.content.firstChild);
	this.content.appendChild(this.items[ix].contents[0]);
	this.title.textContent = this.items[ix].title;
	this.current = ix;

	if (this.current == 0) $(this.left).hide();
	else $(this.left).show();
	if (this.current == this.items.length-1) $(this.right).hide();
	else $(this.right).show();
}


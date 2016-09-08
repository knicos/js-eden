EdenUI.MenuBar = function() {
	this.element = $('<div id="menubar-main"><div id="eden-logo"></div><div contenteditable class="jseden-title">My Project</div><div class="menubar-buttons"><button class="menubar-button enabled new" data-obs="menu_new_scriptview" title="New Script View">&#xf121;</button><button class="menubar-button enabled new" data-obs="menu_new_obslist" title="New Observable List">&#xf022;</button><button class="menubar-button enabled new" data-obs="menu_new_graphicview" title="New Graphic View">&#xf03e;</button></div></div>');
	$(document.body).append(this.element);

	this.element.on("click", ".menubar-button", function(e) {
		var obs = e.currentTarget.getAttribute("data-obs");
		eden.root.lookup(obs).assign(true, eden.root.scope);
	});
}

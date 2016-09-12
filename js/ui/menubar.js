EdenUI.MenuBar = function() {
	this.element = $('<div id="menubar-main"><div id="eden-logo"></div><div contenteditable class="jseden-title">My Project</div>'+((!mobilecheck()) ? '<div class="menubar-buttons"><button class="menubar-button enabled share" data-obs="menu_new_scriptview" title="New Script View">&#xf1e0;</button><button class="menubar-button enabled new" data-obs="menu_new_scriptview" title="New Script View">&#xf121;</button><button class="menubar-button enabled new" data-obs="menu_new_obslist" title="New Observable List">&#xf022;</button><button class="menubar-button enabled new" data-obs="menu_new_graphicview" title="New Graphic View">&#xf03e;</button></div>' : '')+'</div>');
	$(document.body).append(this.element);

	// Login Button
	var loginButton = $('<div id="menubar-login"><span class="icon">&#xf05e;</span>Not Connected</div>');
	loginButton.appendTo(this.element);

	var usercontext = new EdenUI.ContextMenu(loginButton.get(0));
	usercontext.addItem("&#xf08b;","Log out", function() { return Eden.DB.isLoggedIn(); }, function() {
		Eden.DB.logOut(function() {
			$("#menubar-login").html('<a href="'+Eden.DB.remoteURL+'/login" target="logintarget"><span class="icon">&#xf090;</span>Login</a>');
		}); 
	}); 

	Eden.DB.listenTo("connected", this, function(url) {
		$("#menubar-login").html('<a href="'+url+'/login" target="logintarget"><span class="icon">&#xf090;</span>Login</a>');
	});

	Eden.DB.listenTo("disconnected", this, function() {
		$("#menubar-login").html('<span class="icon">&#xf05e;</span>Not Connected');
	});

	Eden.DB.listenTo("login", this, function(name) {
		if (name) {
			setTimeout(function() {
				$("#menubar-obscurer").remove();
			}, 1000);
			$("#menubar-login").html('<a href="'+Eden.DB.remoteURL+'/#" target="_blank"><span class="icon">&#xf007;</span>'+name+"</a>");
		}
	});

	$("#menubar-login").click(function() {
		if (Eden.DB.isConnected() && !Eden.DB.isLoggedIn()) {
			var obscurer = $('<div id="menubar-obscurer"></div>');
			obscurer.html("<div class=\"login-subdialog\"><iframe frameborder=\"0\" name=\"logintarget\" width=\"460\" height=\"300\" class=\"menubar-login-iframe\"></iframe><br/><button class=\"button-icon-silver button-cancel\">Cancel</button></div>");
			$(document.body).append(obscurer);
			obscurer.on("click", ".button-cancel", function() {
				obscurer.remove();
			});
		} else if (Eden.DB.isConnected() && Eden.DB.isLoggedIn()) {
			
		}
	});

	this.sharebox = $('<div class="menubar-sharebox"><div class="menubar-sharebox-title">Share</div><div class="menubar-sharebox-content"><div class="projecturl"></div><div class="downloadurl"></div></div></div>');
	this.element.append(this.sharebox);
	this.sharebox.hide();

	var me = this;
	this.element.on("click", ".menubar-button.share", function(e) {
		var title = me.element.find(".jseden-title").get(0).textContent.split(" ").join("");
		var source = "";

		try {
			if (window.localStorage) source = window.localStorage.getItem("statements");
		} catch(e) {

		}


		if (Eden.DB.isLoggedIn()) {
			var user = (Eden.DB.username) ? Eden.DB.username.split(" ").join("") : "nouser";
			var path = "jseden2/"+user+"/"+title;
			var meta = Eden.DB.meta[path];
			if (meta === undefined) meta = new Eden.DB.createMeta(path);
			//console.log(source);

			Eden.DB.upload(path,meta,source,"v1",true,function() {
				var url = "?load="+path+"&tag="+meta.saveID;
				console.log("UPLOAD");
				me.sharebox.find(".projecturl").html('<a href="'+window.location.href+url+'">'+window.location.href+url+'</a>');
			});
		} else {
			me.sharebox.find(".projecturl").html('No URL, not connected');
		}

		source = "data:application/octet-stream," + encodeURIComponent(source);
		me.sharebox.find(".downloadurl").html('<a href="'+source+'" download="'+title+'.js-e">Download</a>');

		me.sharebox.show("fast");
		// Upload to project manager and generate URL.
		// Also generate data url
		// Provide download link
		// Provide share link
	});

	this.element.on("click", ".menubar-button.new", function(e) {
		var obs = e.currentTarget.getAttribute("data-obs");
		eden.root.lookup(obs).assign(true, eden.root.scope);
	});
}

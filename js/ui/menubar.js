EdenUI.MenuBar = function() {
	this.element = $('<div id="menubar-main"><div id="eden-logo"></div><div contenteditable class="jseden-title">Construit!</div>'+((!mobilecheck()) ? '<div class="menubar-buttons"><button class="menubar-button enabled share" data-obs="menu_new_scriptview" title="Save or share">&#xf1e0;</button><button class="menubar-button enabled new" data-obs="menu_new_scriptview" title="New Script View">&#xf121;</button><button class="menubar-button enabled new" data-obs="menu_new_obslist" title="New Observable List">&#xf022;</button><button class="menubar-button enabled new" data-obs="menu_new_graphicview" title="New Graphic View">&#xf03e;</button></div>' : '<div class="menubar-mobilebuttons"><button class="scriptview-button enabled mobilemore">&#xf078;</button></div>')+'</div>');
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
			var obscurer = $('<div id=\"menubar-obscurer\" class=\"login-subdialog modal\" style=\"display: block;\"></div>');
			obscurer.html("<div class=\"modal-content\" style=\"width: 290px;\"><div class=\"menubar-sharebox-title\"><span class=\"menubar-shareicon\">&#xf090;</span>Login</div><iframe frameborder=\"0\" name=\"logintarget\" width=\"250\" height=\"200\" class=\"menubar-login-iframe\"></iframe><br/><button class=\"jseden button-cancel\">Cancel</button></div>");
			$(document.body).append(obscurer);
			obscurer.on("click", ".button-cancel", function() {
				obscurer.remove();
			});
		} else if (Eden.DB.isConnected() && Eden.DB.isLoggedIn()) {
			
		}
	});

	this.sharebox = $('<div class="modal"><div class="modal-content" style="width: 400px;"><div class="menubar-sharebox-title"><span class="menubar-shareicon">&#xf1e0;</span>Save and Share</div><div class="menubar-sharebox-content">Add tags to your project:<div class="projecttags" contenteditable></div><div id="projectuploadbox"></div><br/><br/>Download to file: <span class="downloadurl"></span><br/><br><button class="jseden done" style="margin-top: 20px;">Done</button></div></div></div>');
	this.element.append(this.sharebox);
	this.sharebox.hide();

	var me = this;

	if (mobilecheck()) {
		var ctx = new EdenUI.ContextMenu(this.element.find(".mobilemore").get(0));
		ctx.addItem("&#xf1e0;", "Share", true, function(e) { me.script.stickAll(); });
		ctx.addItem("&#xf121;", "New Script View", true, function(e) { me.script.unstickAll(); });
		ctx.addItem("&#xf022;", "New Observable Lists", true, function(e) { me.script.clearUnstuck(); });
		ctx.addItem("&#xf03e;", "New Graphic View", true, function(e) { me.script.activateAll(); });
		this.element.on("click",".mobilemore",function(e) {
			me.element.find(".mobilemore").get(0).oncontextmenu(e);
		});
	}

	this.sharebox.on("click",".done",function() {
		me.sharebox.hide();
	});

	function updateTags() {
		var tagbox = me.sharebox.find(".projecttags");

		var tagstr = tagbox.get(0).textContent;

		tags = tagstr.toLowerCase().replace(/[\!\'\-\?\&]/g, "").split(" ");
		/*for (var i=0; i<tags.length; i++) {
			if (tags[i].charAt(0) != "#") tags[i] = "#" + tags[i];
		}*/

		if (tags && tags.length > 0) {
			var taghtml = "";
			for (var i=0; i<tags.length; i++) {
				taghtml += "<span class=\"project-tag\">" + tags[i] + "</span>";
				if (i < tags.length-1) taghtml += " ";
			}
			tagbox.html(taghtml);
		}
	}

	this.sharebox.on("keydown",".projecttags",function(e) { if (e.keyCode == 32) {
		var tagbox = me.sharebox.find(".projecttags").get(0);

		var spacer = document.createTextNode(" ");
		tagbox.appendChild(spacer);
		var newElement = document.createElement('span');
		newElement.className = "project-tag";
		newElement.innerHTML = "&#8203;";
		tagbox.appendChild(newElement);

		var range = document.createRange();
		var sel = window.getSelection();
		//var currange = sel.getRangeAt(0);
		//var element = currange.startContainer();
		range.selectNodeContents(newElement);
		range.collapse(false);
		sel.removeAllRanges();
		sel.addRange(range);

		e.preventDefault();
	} });
	this.sharebox.on("blur",".projecttags",updateTags);

	this.sharebox.on("click",".upload", function(e) {
		var title = me.element.find(".jseden-title").get(0).textContent;
		me.sharebox.find("#projectuploadbox").html('<br/><br/>Saved to your projects and shared at:<div class="projecturl">Saving...</div>');
		Eden.DB.saveSource(title, me.projectsource, function(status) {
			if (status.path) {
				var url = "?load="+status.path+"&tag="+status.saveID;
				me.sharebox.find(".projecturl").html(window.location.href+url);
				//function selectElementContents(el) {
				var range = document.createRange();
				range.selectNodeContents(me.sharebox.find(".projecturl").get(0));
				var sel = window.getSelection();
				sel.removeAllRanges();
				sel.addRange(range);
				//}
			} else {
				me.sharebox.find(".projecturl").html('<b>Save failed</b>, not logged in.');
			}
		});
	});

	this.element.on("click", ".menubar-button.share", function(e) {
		var title = me.element.find(".jseden-title").get(0).textContent;

		if (Eden.DB.isLoggedIn()) {
			me.sharebox.find("#projectuploadbox").html('<button class="sharebox-button upload">Upload</button><button class="sharebox-button publish" style="margin-top: 20px;">Publish</button>');
		} else {
			me.sharebox.find("#projectuploadbox").html('');
		}
		me.sharebox.show();

		//Saved to your projects and shared at:<div class="projecturl"></div>

		var tags;

		if (tags === undefined || tags.length == 0) {
			tags = title.toLowerCase().replace(/[\!\'\-\?\&]/g, "").split(" ");
			//console.log(tags);
			//for (var i=0; i<tags.length; i++) tags[i] = "#" + tags[i];
			//Eden.DB.meta[status.path].tags = tags;
			if (Eden.DB.isLoggedIn()) {
				var nametags = Eden.DB.username.toLowerCase().replace(/[\!\'\-\?\&]/g, "").split(" ");
				tags.push.apply(tags,nametags);
			}
		}

		if (tags && tags.length > 0) {
			var taghtml = "";
			for (var i=0; i<tags.length; i++) {
				taghtml += "<span class=\"project-tag\">" + tags[i] + "</span>";
				if (i < tags.length-1) taghtml += " ";
			}
			me.sharebox.find(".projecttags").html(taghtml);
		}

		me.projectsource = Eden.DB.generateSource(title);
		var source = "data:application/octet-stream," + encodeURIComponent(me.projectsource);
		me.sharebox.find(".downloadurl").html('<a href="'+source+'" download="'+title+'.js-e">'+title+'.js-e</a>');
	});

	this.element.on("click", ".menubar-button.new", function(e) {
		var obs = e.currentTarget.getAttribute("data-obs");
		eden.root.lookup(obs).assign(true, eden.root.scope);
	});

	this.element.on("keyup", ".jseden-title", function(e) {
		try {
			if (window.localStorage) {
				window.localStorage.setItem("title", e.currentTarget.textContent);
			}
		} catch(e) {

		}
	});
}

EdenUI.MenuBar.reset = function() {
	$(".jseden-title").html("Construit!");
}

EdenUI.MenuBar.saveTitle = function(title) {
	try {
		if (window.localStorage) {
			window.localStorage.setItem("title", title);
		}
	} catch(e) {

	}
}

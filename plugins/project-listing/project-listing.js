/*
 * Copyright (c) 2013, Empirical Modelling Group
 * All rights reserved.
 *
 * See LICENSE.txt
 */

/**
 * JS-Eden Project Listing Plugin.
 * A plugin to display a list of models hosted online.
 * @class ProjectList Plugin
 */
EdenUI.plugins.ProjectList = function(edenUI, success) {

	var fotdLastUpdated = Date.UTC(2015, 9 - 1, 5); //For some reason months parameter expects numbers 0-11.

	var defaultURL = getParameterByName("projects");
	var prologue = "";

	if ("projectList" in edenUI.branding) {
		if ("prologue" in edenUI.branding.projectList) {
			prologue = '<div class="projectlist-prologue">' + edenUI.branding.projectList.prologue.html + '</div>';
			if ("href" in edenUI.branding.projectList.prologue) {
				prologue = '<a href="' + edenUI.branding.projectList.prologue.href + '" target="project-listing-link" style="text-decoration: none">' + prologue + '</a>';
			}
		}
		if (defaultURL == "" && "data" in edenUI.branding.projectList) {
			defaultURL = edenUI.branding.projectList.data;
		}
	}
	if (defaultURL == "") {
		defaultURL = "models/projects.json";
	}

	var crossDomainTarget;
	var crossDomainURL;
	var crossDomainLoadAsRoot;
	
	this.loadCrossDomain = function (response) {
		if (response.success) {
			if (typeof(crossDomainTarget) == "string") {
				//Copy code into an input window.
				copyToInput(crossDomainTarget, response.success);
			} else {
				//Update list of projects.
				var json = JSON.parse(response.success)
				crossDomainTarget.populateProjectData(json, crossDomainURL, crossDomainLoadAsRoot);
			}
		}
	}

	function ProjectListProjects() {
		this.json = {projects: []};
		this.rootURL = undefined;
		this.atRoot = true;
	}

	ProjectListProjects.prototype.loadProjectData = function (url, asRoot) {
		//Get a list of projects from the server.
		var me = this;
		if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(url)) {
			//Absolute URL.  Might be cross-domain.  Use proxy server.
			crossDomainTarget = this;
			crossDomainURL = url;
			crossDomainLoadAsRoot = asRoot;
			$.ajax({
				url: rt.config.proxyBaseURL + "?url=" + url + "&callback=edenUI.plugins.ProjectList.loadCrossDomain",
				dataType: "script",
			});
		} else {
			$.ajax({
				url: url,
				dataType: "json",
				success: function (data) {
					me.populateProjectData(data, url, asRoot);
				},
				cache: false
			});
		}
	};
	
	ProjectListProjects.prototype.loadProjectCode = function (url) {
		//Retrieve a .js-e file from the server.
		var me = this;
		if (/^[a-zA-Z][a-zA-Z\d+.-]*:\/\//.test(url)) {
			//Absolute URL.  Might be cross-domain.  Use proxy server.
			crossDomainTarget = this.json.target;
			crossDomainURL = url;
			$.ajax({
				url: rt.config.proxyBaseURL + "?url=" + url + "&callback=edenUI.plugins.ProjectList.loadCrossDomain",
				dataType: "script",
			});
		} else {
			$.ajax({
				url: url,
				dataType: "text",
				success: function (data) {
					copyToInput(me.json.target, data);
				},
				cache: false
			});
		}
	};

	ProjectListProjects.prototype.populateProjectData = function (data, url, asRoot) {
		this.json = data;
		if (asRoot) {
			this.rootURL = url;
			this.atRoot = true;
		} else {
			this.atRoot = url == this.rootURL;
			if (!this.atRoot) {
				var rootProject = {
					name: "Return to main list",
					projects: this.rootURL
				};
				this.json.projects.push(rootProject);
			}
		}
		this.updateCollection("");
	};
	
	function openProject(url) {
		EdenUI.plugins.ScriptGenerator.loadBaseConstrual(url);
		if (edenUI.plugins.ScriptInput) {
			edenUI.plugins.ScriptInput.addHistory('include("' + url + '");');
		}
	}

	function copyToInput(viewName, code) {
		edenUI.createView(viewName, "ScriptInput").setValue(code);
		edenUI.eden.root.lookup("_view_" + viewName + "_title").assign(viewName);
		edenUI.showView(viewName);
		edenUI.brieflyHighlightView(viewName);
	}
	
	ProjectListProjects.prototype.projectClick = function (details) {
		// Actually load the project by executing js-e file.
		var projectURL = details.runfile;
		if (projectURL !== undefined) {
			if (this.json.target !== undefined) {
				this.loadProjectCode(projectURL);
			} else if (!edenUI.eden.isInInitialState()) {
				edenUI.modalDialog(
					"Open Project Action",
					"<p>The work space contains an existing construal.</p>\
					<p>You can either abandon the existing construal or choose to merge the project with the existing definitions.</p>\
					<p>Which would you like to do?</p>",
					["Open Project", "Merge"],
					0,
					function (optionNo) {
						if (optionNo == 2) {
							return;
						}
						if (optionNo == 0) {
							edenUI.newProject();
						}
						openProject(projectURL);
					}
				);
			} else {
				edenUI.newProject();
				openProject(projectURL);
			}
		}
		var projectListURL = details.projects;
		if (projectListURL !== undefined) {
			this.loadProjectData(projectListURL, false);
		}
	};

	//Generate the jQuery for a project
	ProjectListProjects.prototype.makeProject = function (projectData) {
		var me = this;
		var project = $('<div class="projectlist-result-element"></div>');

		var projectHTML = '<div class="projectlist-result-name">' + projectData.name + '</div>';
		if (projectData.description !== undefined) {
			projectHTML = projectHTML + '<div class="projectlist-result-metadata">' + projectData.description + '</div>';
		}
		if (projectData.author !== undefined || projectData.year !== undefined) {
			projectHTML = projectHTML + '<div class="projectlist-result-metadata">';
			if (projectData.author !== undefined) {
				projectHTML = projectHTML + "By " + projectData.author;
			}
			if (projectData.year !== undefined) {
				projectHTML = projectHTML + " (" + projectData.year + ")";
			}
			projectHTML = projectHTML + '</div>'
		}
		project.html(projectHTML);
		project.click(function () {me.projectClick(projectData);} );
		return project;
	}

	/**
	 * Update a particular project list with the specified search expression.
	 * This gets called whenever the search input gets changed. It clears the
	 * existing project list and generates new results matching the pattern.
	 * @private
	 */
	ProjectListProjects.prototype.updateCollection = function (pattern) {

		//Clear any existing project search results.
		this.element.parentElement.scrollTop = 0;
		var searchResults = $(this.element).find(".projectlist-results");
		searchResults.html('');
		var isSnippetList = this.json.target !== undefined;

		if (this.json.projects !== undefined) {
			//Search through projects to find those matching the query.
			var re = new RegExp("(^|\\s)"+ pattern, "im");
			var hasMatches = false;
			for (var i = 0; i < this.json.projects.length; i++) {
				//If not a match then skip to next project
				if (
					!re.test(this.json.projects[i].name) &&
					!re.test(this.json.projects[i].description) &&
					!re.test(this.json.projects[i].author) &&
					!re.test(this.json.projects[i].year)
				) {
					continue;
				}
				hasMatches = true;

				var projectData = this.json.projects[i];
				var project = this.makeProject(projectData);
				searchResults.append(project);
			}
		}

		//Add feature of the day option
		if (!isSnippetList && this.rootURL == defaultURL && this.atRoot &&
			(pattern == "" || re.test("Feature of The Day"))
		) {
			var sticker;
			var lastVisited = edenUI.getOptionValue("fotdLastVisited");
			if (lastVisited === null || parseInt(lastVisited) < fotdLastUpdated) {
				sticker = '<img id="fotd-sticker" src="images/new-sticker.png" width="24" height="14" style="vertical-align: 5%" />';
			} else {
				sticker = "";
			}
			var project = this.makeProject({
				name: "Feature of The Day " + sticker,
				description: "Learn about the latest features added to JS-EDEN.",
				author: "JS-EDEN Development Team",
				runfile: "models/guides/feature-of-the-day.js-e"
			});
			searchResults.prepend(project);
		}

		//Add new project option
		if (!isSnippetList && (!hasMatches || re.test("New Project"))) {
			var emptyProject = $(
				'<div class="projectlist-result-element">' +
					'<div class="projectlist-result-name">New Project</div>' + 
					'<div class="projectlist-result-metadata">An empty work space.</div>' +
					'<div class="projectlist-result-metadata">By JS-EDEN Development Team</div>' +
				'</div>'
			).click(function () {
				if (!eden.isInInitialState()) {
					edenUI.modalDialog(
						"Reset Work Space",
						'<p>This action will discard the current script. Your work will not be saved.</p>\
						<p>Are you sure you wish to continue?</p>',
						["Reset Work Space"],
						1,
						function (optionNo) {
							if (optionNo == 0) {
								edenUI.newProject();
							}
						}
					);
				} else {
					edenUI.newProject();
				}
			});
			searchResults.prepend(emptyProject);
		}

	}

	this.createDialog = function(name, mtitle) {
		var viewName = name.slice(0, -7);
		var instance = new ProjectListProjects();

		var content = $('<div class="projectlist-listing"></div>');
		content.append(prologue);

		var searchDiv = $('<div class="projectlist-search-box-outer"></div>');
		var searchBox = $('<input type="text" class="projectlist-search" placeholder="search" />')
		.on("keyup", function (event) {
			instance.updateCollection(event.target.value);
		});
		searchDiv.append(searchBox);
		content.append(searchDiv);

		content.append('<div class="projectlist-results noselect"></div>');

		$('<div id="'+name+'"></div>')
		.html(content)
		.dialog({
			title: mtitle,
			width: 310,
			height: 400,
			minHeight: 120,
			minWidth: 230,
			dialogClass: "unpadded-dialog"
		});
		instance.element = content.get(0);

		var sourceSym = edenUI.eden.root.lookup("_view_" + viewName + "_source");
		if (sourceSym.value() == undefined) {
			sourceSym.assign(defaultURL, edenUI.eden.root.lookup("createView"));
		}
		function reload(sym, url) {
			instance.loadProjectData(url, true);		
		}
		sourceSym.addJSObserver("reload", reload);
		reload(sourceSym, sourceSym.value());
	};

	//Add views supported by this plugin.
	edenUI.views["ProjectList"] = {dialog: this.createDialog, title: "Project List", category: edenUI.viewCategories.interpretation};
	edenUI.eden.include("plugins/project-listing/project-listing.js-e", success);
};

/* Plugin meta information */
EdenUI.plugins.ProjectList.title = "Project List";
EdenUI.plugins.ProjectList.description = "Displays a list of construals.";

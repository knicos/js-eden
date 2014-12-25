/*
 * Copyright (c) 2013, Empirical Modelling Group
 * All rights reserved.
 *
 * See LICENSE.txt
 */

var root;
var eden;

/**
 * Utility function to extract URL query string parameters.
 */
function getParameterByName(name) {
	name = name.replace(/[\[]/,"\\\[").replace(/[\]]/,"\\\]");
	var regexS = "[\\?&]"+name+"=([^&#]*)";
	var regex = new RegExp( regexS );
	var results = regex.exec( window.location.href );
	if (results === null) {
		return "";
	} else {
		return decodeURIComponent(results[1].replace(/\+/g, " "));
	}
}

function initialiseJSEden() {
	root = new Folder();
	eden = new Eden(root);

	$(document).ready(function () {
		edenUI = new EdenUI(eden);

		// Load the Eden library scripts
		eden.include("library/eden.jse", {name: '/system'}, function () {
			var include = getParameterByName("include");

			$.getJSON('config.json', function (config) {
				rt.config = config;

				if (include) {
					eden.include(include);
				}
			});
		});
	});
}

/*
 * Copyright (c) 2015, Empirical Modelling Group
 * All rights reserved.
 *
 * See LICENSE.txt
 */

EdenUI.plugins.ScriptInput.dialogs = {};

EdenUI.plugins.ScriptInput.dialogs.newAgent = function(element, callback) {
	var obscurer = $('<div class="script-obscurer noselect"></div>');
	var content = $('<div class="script-subdialog-newagent noselect"><span class="script-subdialog-title">Create or import agent:</span><br/><input class="script-subdialog-text" type="text" spellcheck="false" list="agentlist" placeholder="model/component/agent"></input><datalist id="agentlist"></datalist><span class="status missing"></span><br><button class="button-icon-green button-add">Add</button><button style="position: absolute; right: 20px" class="button-icon-silver button-cancel">Cancel</button><button style="position: absolute; right: 100px;" class="button-icon-silver button-agents">Browse</button></div>');
	var input = content.find('.script-subdialog-text');
	var status = input.get(0).nextSibling.nextSibling;
	var datalist = content.find('#agentlist');
	var valid = false;

	datalist.empty();
	for (var a in Eden.Agent.agents) {
		var opt = $('<option>'+a+'</option>');
		datalist.append(opt);
	}

	content
	.on("input blur", ".script-subdialog-text", function() {
		var value = input.get(0).value;
		//console.log(value);

		if (value == "") {
			valid = false;
			status.className = "missing";
		} else if (/^[a-z][a-z0-9\/]+$/i.test(value)) {
			if (Eden.Agent.agents[value] === undefined) {
				Eden.DB.getMeta(value, function(path,meta) {
					if (meta) {
						status.className = "download";
						valid = true;
					} else {
						status.className = "addnew";
						valid = true;
					}
				});
			} else {
				if (Eden.Agent.agents[value].owned) {
					status.className = "readonly";
				} else {
					status.className = "edit";
				}
				valid = true;
			}
		} else {
			status.className = "invalid";
			valid = false;
		}
	})
	.on("click", ".button-add", function() {
		if (valid) {
			element.get(0).removeChild(obscurer.get(0));
			callback(true, input.get(0).value);
		}
	})
	.on("click", ".button-agents", function() {
		element.get(0).removeChild(obscurer.get(0));
		callback(false, true);
	})
	.on("click", ".button-cancel", function() {
		element.get(0).removeChild(obscurer.get(0));
		callback(false);
	}); 

	obscurer.append(content);
	element.append(obscurer);
}



EdenUI.plugins.ScriptInput.dialogs.uploadAgent = function(element, callback) {
	var obscurer = $('<div class="script-obscurer noselect"></div>');
	var content = $('<div class="script-subdialog-uploadagent noselect"><span class="script-subdialog-title">Upload agent. Give an optional version name:</span><br/><input class="script-subdialog-text" type="text" spellcheck="false"></input><span class="status missing"></span><br><button class="button-icon-green button-upload">Upload</button><button style="position: absolute; right: 20px" class="button-icon-silver button-cancel">Cancel</button></div>');
	var input = content.find('.script-subdialog-text');
	var status = input.get(0).nextSibling;
	var valid = false;


	content
	.on("input blur", ".script-subdialog-text", function() {
		var value = input.get(0).value;
		console.log(value);

		if (value == "") {
			valid = false;
			status.className = "missing";
		} else if (/^[a-z][a-z0-9]+$/i.test(value)) {
			status.className = "addnew";
			valid = true;
		} else {
			status.className = "invalid";
			valid = false;
		}
	})
	.on("click", ".button-upload", function() {
		if (valid) {
			element.get(0).removeChild(obscurer.get(0));
			callback(true, input.get(0).value);
		}
	})
	.on("click", ".button-cancel", function() {
		element.get(0).removeChild(obscurer.get(0));
		callback(false);
	}); 

	obscurer.append(content);
	element.append(obscurer);
}



function get_time_diff( timestamp )
{
	var datetime = timestamp * 1000;
    var now = Date.now();

    if( isNaN(datetime) )
    {
        return "";
    }

    if (datetime < now) {
        var milisec_diff = now - datetime;
    }else{
        var milisec_diff = datetime - now;
    }

    var days = Math.floor(milisec_diff / 1000 / 60 / (60 * 24));

    var date_diff = new Date( milisec_diff );

	if (days > 5) {
		return "";
	} else {
		var result = "";
		if (days > 0) {
			result += days;
			if (days > 1) {
				result += " days ago";
			} else {
				result += " day ago";
			}
		} else {
			if (date_diff.getHours() > 0) {
				var hours = date_diff.getHours();
				result += hours;
				if (hours > 1) {
					result += " hours ago";
				} else {
					result += " hour ago";
				}
			} else {
				var mins = date_diff.getMinutes();
				if (mins > 0) {
					result += mins;
					if (mins > 1) {
						result += " minutes ago";
					} else {
						result += " minute ago";
					}
				} else {
					var secs = date_diff.getSeconds();
					result += secs;
					if (secs > 1) {
						result += " seconds ago";
					} else {
						result += " seconds ago";
					}
				}
			}
		}
		return result;
	}
}



EdenUI.plugins.ScriptInput.dialogs.showHistory = function(element, callback, data) {
	var obscurer = $('<div class="script-obscurer noselect"></div>');
	var content = $('<div class="script-subdialog-history noselect"><span class="script-subdialog-title">Agent History:</span><br/><div class="script-history-list"></div><div class="script-history-buttons"><button class="button-icon-green button-ok">Load</button><button style="float: right;" class="button-icon-silver button-cancel">Cancel</button></div></div>');
	var hist = content.find(".script-history-list");
	var valid = true;
	var active = data.index;
	var activeelement;

	for (var i=data.history[data.meta.saveID].length-1; i>=0; i--) {
		var item = $('<div class="script-history-item"></div>');
		if (active == i) {
			item.addClass("current");
			item.addClass("original");
			activeelement = item;
		}
		item.get(0).setAttribute("data-index", ""+i);
		var bookmark = $('<div class="script-history-bookmark"></div>');
		var time = $('<div class="script-history-time"></div>');
		var content2 = $('<div contenteditable class="script-history-content"></div>');
		time.html(get_time_diff(data.history[data.meta.saveID][i].time));
		time.get(0).title = data.history[data.meta.saveID][i].time;
		if (data.history[data.meta.saveID][i].bookmark) {
			bookmark.addClass("bookmarked");
		}
		if (data.history[data.meta.saveID][i].title) {
			content2.html(data.history[data.meta.saveID][i].title);
		} else {
			content2.html("[Autosave]");
		}
		item.append(bookmark);
		item.append(content2);
		item.append(time);
		hist.append(item);
	}

	// Add base item.
	var item = $('<div class="script-history-item"></div>');
	if (active == i) {
		item.addClass("current");
		item.addClass("original");
		activeelement = item;
	}
	item.get(0).setAttribute("data-index", "-1");
	var bookmark = $('<div class="script-history-bookmark"></div>');
	var content2 = $('<div contenteditable class="script-history-content">Base Source</div>');
	item.append(bookmark);
	item.append(content2);
	hist.append(item);

	content
	.on("input", ".script-history-content", function(e) {
		var index = parseInt(e.target.parentNode.getAttribute("data-index"));
		data.history[data.meta.saveID][index].title = e.target.textContent;
		data.saveHistory();
		data.makeSnapshot(index);
	})
	.on("click", ".script-history-item", function(e) {
		console.log(e);
		var index = parseInt(e.currentTarget.getAttribute("data-index"));
		active = index;
		if (activeelement) activeelement.removeClass("current");
		activeelement = $(e.currentTarget);
		activeelement.addClass("current");
	})
	.on("click", ".script-history-bookmark", function(e) {
		var index = parseInt(e.target.parentNode.getAttribute("data-index"));
		if (data.history[data.meta.saveID][index].bookmark === undefined) {
			data.history[data.meta.saveID][index].bookmark = true;
		} else {		
			data.history[data.meta.saveID][index].bookmark = !data.history[data.meta.saveID][index].bookmark;
		}

		// Save bookmark
		data.saveHistory();

		if (data.history[data.meta.saveID][index].bookmark) {
			e.target.className = "script-history-bookmark bookmarked";
		} else {
			e.target.className = "script-history-bookmark";
		}
	})
	.on("click", ".button-ok", function() {
		if (valid) {
			element.get(0).removeChild(obscurer.get(0));
			console.log("Rollback to: " + active);
			callback(true, active);
		}
	})
	.on("click", ".button-cancel", function() {
		element.get(0).removeChild(obscurer.get(0));
		callback(false);
	}); 

	obscurer.append(content);
	element.append(obscurer);
}





EdenUI.plugins.ScriptInput.dialogs.browseAgents = function(element, callback, data) {
	var obscurer = $('<div class="script-obscurer noselect"></div>');
	var content = $('<div class="script-subdialog-agents noselect"><span class="script-subdialog-title">Browse Agents:</span><br/><div class="script-agents-list"></div><div class="script-agents-buttons"><button class="button-icon-green button-add">Add</button><button style="float: right;" class="button-icon-silver button-cancel">Cancel</button></div></div>');
	var list = content.find(".script-agents-list");
	var valid = true;

	var selected = {};

	function addAgents(parent, depth, path) {
		Eden.DB.getDirectory(path, function(dir) {
			console.log(dir);
			if (dir === undefined) return;
			for (var a in dir) {
				var npath = (path=="")?a:path+"/"+a;
				var item = $('<div class="script-agents-item"></div>');
				var expand = $('<div class="script-agents-expand" style="width: '+(27+depth*15)+'px"></div>');
				var content = $('<div class="script-agents-content"></div>');
				var checkbox = $('<input type="checkbox"></input>');

				(function(content, path) {
					var meta = Eden.DB.getMeta(path, function(path, meta) {
						if (meta) {
							content.html(a+" - <i>"+meta.title+"</i>");
						} else {
							content.html(a);
						}
					});
				}).call(this, content, npath);

				if (Eden.Agent.agents[npath]) {
					item.addClass("loaded");
				}

				if (data.indexOf(npath) >= 0) {
					checkbox.get(0).checked = true;
				}

				item.get(0).setAttribute("data-path", npath);
				item.get(0).setAttribute("data-depth", ""+(depth+1));
				item.append(expand);
				item.append(checkbox);
				item.append(content);

				if (parent === undefined || parent.nextSibling === undefined) {
					list.append(item);
				} else {
					list.get(0).insertBefore(item.get(0),parent.nextSibling);
				}
				//addAgents(depth+1, root[a].children, npath);
			}
		});
	}
	addAgents(undefined, 0, "");

	function removeAgents(base) {
		var depth = parseInt(base.getAttribute("data-depth"));
		var start = base.nextSibling;
		while (start) {
			var ndepth = parseInt(start.getAttribute("data-depth"));
			if (ndepth > depth) {
				var next = start.nextSibling;
				list.get(0).removeChild(start);
				start = next;
			} else {
				break;
			}
		}
	}

	content
	.on("click", ".script-agents-item", function(e) {
		
	})
	.on("click", ".script-agents-expand", function(e) {
		var path = e.currentTarget.parentNode.getAttribute("data-path");
		var depth = parseInt(e.currentTarget.parentNode.getAttribute("data-depth"));
		if (e.currentTarget.className.indexOf("expanded") < 0) {
			addAgents(e.currentTarget.parentNode, depth, path);
			changeClass(e.currentTarget, "expanded", true);
		} else {
			//addAgents(e.currentTarget, depth, path);
			removeAgents(e.currentTarget.parentNode);
			changeClass(e.currentTarget, "expanded", false);
		}
	})
	.on("change", ".script-agents-item input", function(e) {
		var path = e.currentTarget.parentNode.getAttribute("data-path");
		if (e.currentTarget.checked) {
			selected[path] = true;
		} else {
			selected[path] = false;
		}
	})
	.on("click", ".button-add", function() {
		element.get(0).removeChild(obscurer.get(0));
		callback(true, selected);
	})
	.on("click", ".button-cancel", function() {
		element.get(0).removeChild(obscurer.get(0));
		callback(false);
	});

	obscurer.append(content);
	element.append(obscurer);
}


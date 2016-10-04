EdenUI.htmlForValue = function(value, width, height) {
	function makeLine(scope, viewbox) {
		var x1 = scope.lookup("/start").scope.lookup("/x").value;
		var y1 = scope.lookup("/start").scope.lookup("/y").value;
		var x2 = scope.lookup("/end").scope.lookup("/x").value;
		var y2 = scope.lookup("/end").scope.lookup("/y").value;
		if (x1 < viewbox.x) viewbox.x = x1;
		if (y1 < viewbox.y) viewbox.y = y1;
		if (x2 < viewbox.x) viewbox.x = x2;
		if (y2 < viewbox.y) viewbox.y = y2;
		if (x2 > viewbox.x2) viewbox.x2 = x2;
		if (y2 > viewbox.y2) viewbox.y2 = y2;
		if (x1 > viewbox.x2) viewbox.x2 = x1;
		if (y1 > viewbox.y2) viewbox.y2 = y1;
		return '<path style="stroke: black; stroke-width: 2px" d="M '+x1+' '+y1+' L '+x2+' '+y2+'"></path>';
	}

	function makeViewbox(viewbox) {
		return 'viewBox="'+viewbox.x+' '+viewbox.y+' '+(viewbox.x2-viewbox.x)+' '+(viewbox.y2-viewbox.y)+'"';
	}


	var oval = value;
	var ele;
	var viewbox = {x:10000,y:10000,x2:0,y2:0};
	if (value instanceof BoundValue) {
		var self = value.scope.self();
		switch(value.value) {
		case "[Line object]": ele = makeLine(value.scope, viewbox); return '<svg '+makeViewbox(viewbox)+' style="float: right;" width='+width+' height='+height+'>'+ele+'</svg>';
		case "[Point object]": return '<span class="eden-type">Point</span>';
		}

		if (Array.isArray(value.value) && value.value.length > 0) {
			ele = "";
			switch (value.value[0]) {
			case "[Line object]":	for (var i=0; i<value.value.length; i++) {
										//console.log("ITEM " + i + " = " + value.value[i]);
										switch(value.value[i]) {
											case "[Line object]": ele += makeLine(value.scopes[i], viewbox);
										}
									}
									//console.log(ele);
									return '<svg '+makeViewbox(viewbox)+' style="float: right;" width='+width+' height='+height+'>'+ele+'</svg>';
			}
		}
		value = value.value;
	}

	if (value === undefined) return '<span class="eden-missing">@</span>';
	switch(typeof value) {
	case "number": return '<span class="eden-number">'+value+'</span>';
	case "string": return '<span class="eden-string">"'+value+'"</span>';
	default: return EdenUI.Highlight.html(Eden.edenCodeForValue(oval));
	}
}

EdenUI.htmlForStatement = function(stat, width, height) {
	var val = EdenUI.htmlForValue(stat.value(), width, height);
	if (stat.statement.type == "definition") {
		return stat.statement.lvalue.name + " <span class=\"eden-keyword\">is</span> " + val;
	} else if (stat.statement.type == "assignment") {
		return stat.statement.lvalue.name + " = " + val;
	}
	return undefined;
}


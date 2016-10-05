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

	function makeCircle(scope, viewbox) {
		var x = scope.lookup("/position").scope.lookup("/x").value;
		var y = scope.lookup("/position").scope.lookup("/y").value;
		var r = scope.lookup("/radius").value;
		var colour = scope.lookup("/colour").value;
		if (x-r-5 < viewbox.x) viewbox.x = x-r-5;
		if (y-r-5 < viewbox.y) viewbox.y = y-r-5;
		if (x+r+5 > viewbox.x2) viewbox.x2 = x+r+5;
		if (y+r+5 > viewbox.y2) viewbox.y2 = y+r+5;
		return '<circle style="stroke: black; stroke-width: 2px; fill: '+colour+';" r="'+r+'" cx="'+x+'" cy="'+y+'"></circle>';
	}

	function makeRectangle(scope, viewbox) {
		var x = scope.lookup("/position").scope.lookup("/x").value;
		var y = scope.lookup("/position").scope.lookup("/y").value;
		var w = scope.lookup("/size").scope.lookup("/x").value;
		var h = scope.lookup("/size").scope.lookup("/y").value;
		var colour = scope.lookup("/colour").value;
		if (x < viewbox.x) viewbox.x = x;
		if (y < viewbox.y) viewbox.y = y;
		if (x+w > viewbox.x2) viewbox.x2 = x+w;
		if (y+h > viewbox.y2) viewbox.y2 = y+h;
		return '<rect style="stroke: black; stroke-width: 2px; fill: '+colour+';" width="'+w+'" height="'+h+'" x="'+x+'" y="'+y+'"></rect>';
	}

	function makePoint(scope) {
		var x = value.scope.lookup("/x").value;
		var y = value.scope.lookup("/y").value;
		if (x === undefined) x = "@";
		if (y === undefined) y = "@";
		if (typeof x == "number") x = x.toFixed(2);
		if (typeof y == "number") y = y.toFixed(2);
		return '<span class="eden-type">Point</span>(<span class="eden-number">'+x+'</span>,<span class="eden-number">'+y+'</span>)';
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
		case "[Rectangle object]": ele = makeRectangle(value.scope, viewbox); return '<svg '+makeViewbox(viewbox)+' style="float: right;" width='+width+' height='+height+'>'+ele+'</svg>'; 
		case "[Circle object]": ele = makeCircle(value.scope, viewbox); return '<svg '+makeViewbox(viewbox)+' style="float: right;" width='+width+' height='+height+'>'+ele+'</svg>'; 
		case "[Line object]": ele = makeLine(value.scope, viewbox); return '<svg '+makeViewbox(viewbox)+' style="float: right;" width='+width+' height='+height+'>'+ele+'</svg>';
		case "[Point object]": return makePoint(value.scope);
		}

		if (Array.isArray(value.value) && value.value.length > 0 && value.scopes) {
			ele = "";
			switch (value.value[0]) {
			case "[Rectangle object]":
			case "[Circle object]":
			case "[Line object]":	for (var i=0; i<value.value.length; i++) {
										//console.log("ITEM " + i + " = " + value.value[i]);
										switch(value.value[i]) {
											case "[Rectangle object]": ele += makeRectangle(value.scopes[i], viewbox); break;
											case "[Circle object]": ele += makeCircle(value.scopes[i], viewbox); break;
											case "[Line object]": ele += makeLine(value.scopes[i], viewbox); break;
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
	case "number": return '<span class="eden-number">'+value.toFixed(2)+'</span>';
	case "string": return '<span class="eden-string">"'+value+'"</span>';
	default: return EdenUI.Highlight.html(Eden.edenCodeForValue(oval));
	}
}

EdenUI.htmlForStatement = function(stat, width, height) {
	if (stat.statement.type == "definition") {
		var val = EdenUI.htmlForValue(stat.value(), width, height);
		return stat.statement.lvalue.name + " <span class=\"eden-keyword\">is</span> " + val;
	} else if (stat.statement.type == "assignment") {
		var val = EdenUI.htmlForValue(stat.value(), width, height);
		return stat.statement.lvalue.name + " = " + val;
	} else {
		return EdenUI.Highlight.html(stat.ast.getSource(stat.statement));
	}
	return undefined;
}


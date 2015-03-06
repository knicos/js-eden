//System Symbols
Eden.systemObservableNames = [
	"_authoringMode",
	"_menubar_status",
	"_view_.*",
	"Infinity",
	"PI",
	"autocalc",
	"false",
	"mouseButton",
	"mouseButtons",
	"mouseCaptured",
	"mouseDoubleClicks",
	"mouseDown",
	"mouseDownWindow",
	"mousePosition",
	"mousePressed",
	"mouseUp",
	"mouseWheel",
	"mouseWindow",
	"randomGeneratorState",
	"randomIndex",
	"touchScrollX",
	"true"
];

Eden.systemAgentNames = [
	"_menubar_update",
	"_View_.*",
	"_update_.*",
	"alias",
	"attemptMouseCapture",
	"bindCSSNumericProperty",
	"bindCSSProperty",
	"bindCSSRule",
	"createCanvas",
	"createHTMLView",
	"createView",
	"eager",
	"error",
	"hideView",
	"html",
	"moveView",
	"patch",
	"resizeView",
	"setProperty",
    "showObservables",
	"todo",
	"unbind",
	"withAppendedItem",
	"writeln"
];

Eden.systemFunctionNames = [
	"Arc",
	"BulletSlide",
	"Button",
	"CanvasHTML5_DrawPicture",
	"Checkbox",
	"Circle",
	"Combobox",
	"Div",
	"Ellipse",
	"FillPattern",
	"GreyPixelList",
	"HTMLImage",
	"Image",
	"Line",
	"LinearGradient",
	"LineSequence",
	"Pixel",
	"PixelList",
	"Point",
	"Polygon",
	"RadialGradient",
	"RadioButtons",
	"Rectangle",
	"RegularPolygon",
	"RoundedRectangle",
	"Sector",
	"Shadow",
	"Slide",
	"Slider",
	"Text",
	"Textbox",
	"TitledSlide",
	"Video",
	"abs",
	"acos",
	"apply",
	"array",
	"asin",
	"atan",
	"canvasURL",
	"ceil",
	"centre",
	"char",
	"charCode",
	"choose",
	"concat",
	"cos",
	"decodeHTML",
	"definitionOf",
	"definitionRHS",
	"doDefault",
	"edenCode",
	"execute",
	"exp",
	"floor",
	"forget",
	"forgetAll", 
	"generate_function",
	"hasProperty",
	"hsl",
	"htmlBulletList",
	"htmlNumberedList",
	"imageWithZones",
	"include",
	"include_css",
	"indexOf",
	"int",
	"isBoolean",
	"isCallable",
	"isChar",
	"isDefined",
	"isDependency",
	"isDependent",
	"isFunc",
	"isInt",
	"isList",
	"isNaN",
	"isNumber",
	"isObject",
	"isPointer",
	"isProc",
	"isString",
	"listcat",
	"log",
	"lookup",
	"lowercase",
	"max",
	"min",
	"mod",
	"nameof",
	"pow",
	"properties",
	"rand",
	"random",
	"randomInteger",
	"replaceFirst",
	"require",
	"reverse",
	"rgb",
	"rotate",
	"round",
	"scale",
	"search",
	"sin",
	"sort",
	"sqrt",
	"srand",
	"str",
	"strcat",
	"sublist",
	"substr",
	"tail",
	"tan",
	"time",
	"translate",
	"trim",
	"type",
	"uppercase",
	"xorshiftRandomGenerator"
];
Eden.isitSystemSymbol = function(name){

	if(Eden.isitSystemFunction(name)){
		return true;
	}
	else if(Eden.isitSystemObservable(name)){
		return true;
	}
	else if(Eden.isitSystemAgent(name)){
		return true;
	}
	return false;
}

Eden.isitSystemObservable = function(name){

	var pattern1 = new RegExp("^_view_");

	if(pattern1.test(name)){
		return true;
	}
	
	for(var j=0; j<Eden.systemObservableNames.length; j++){
	
		var pattern = new RegExp("^"+Eden.systemObservableNames[j]+"$");
		
			if(pattern.test(name)){
				return true;
			}
	}
	return false;
}
Eden.isitSystemAgent = function(name){

	var pattern2 = new RegExp("^_View_");
	if(pattern2.test(name)){
		return true;
	}

	for(var j=0; j<Eden.systemAgentNames.length; j++){
	
		var pattern = new RegExp("^"+Eden.systemAgentNames[j]+"$");

			if(pattern.test(name)){
				return true;
			}
	}
	return false;
}
Eden.isitSystemFunction = function(name){

	for(var j=0; j<Eden.systemFunctionNames.length; j++){
	
		var pattern = new RegExp("^"+Eden.systemFunctionNames[j]+"$");
		
			if(pattern.test(name)){
				return true;
			}
	}
	return false;
}

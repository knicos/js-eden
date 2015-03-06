EdenUI.plugins.SG = function(edenUI, success) {

	var me = this;
	var defaultview = "";

	this.html = function(name, content) {
		if (name == "DEFAULT") {
			if (defaultview == "") {
				edenUI.createView(name,"SG");
			}
			$("#"+defaultview+"-content").html(content).onclick;
		} else {
			$("#"+name+"-dialog-content").html(content).onclick;
		}
	}

	this.createDialog = function(name,mtitle) {

		if (defaultview == "") {
			defaultview = name;
		}
		
		code_entry = $('<div id=\"'+name+'-content\" class=\"script-generator-content\">'+SG.generateAllHTML()+'</div>');

		$dialog = $('<div class=\"SG\" id="'+name+'"></div>')
			.html(code_entry)
			.dialog({
				title: mtitle,
				width: 735,
				height: 600,
				minHeight: 120,
				minWidth: 230
			});
	}

	//Register the HTML view options:
	edenUI.views["SG"] = {dialog: this.createDialog, title: "Script Generator"};
	
	SG = {};
	SG.update = function(event){
		//Update All SG with their respective regexs
		
		var views = document.getElementsByClassName("SG");
		for(var j=0; j<views.length; j++){
			var regex = views[j].children[0].children[0].value;
			if(regex==undefined){
				continue;
			}
			views[j].children[0].children[2].innerHTML = SG.generateInnerHTML(regex);
		}
	}
	
	SG.generateAllHTML = function(){
		//generates the regex
		var indiv = '<input onkeyup="SG.update()" type="select" placeholder="Regex to not display"/><button style="float: right;" onclick="SG.update()">Re-generate script</button><div style=\" display:block; \">'+SG.generateInnerHTML()+'</div>';
		return indiv;
	}
	
	
	SG.generateInnerHTML = function(regexX){
		//generates the content

		var HTML = "";
		var symbolsx = SG.arrayFromObject(root.symbols);
		
		var obsDefs = [];
		var obsAssins = [];
		var acts = [];
		var functs = [];
			
		var autocalcOn = "autocalc = 1;"
		var autocalcOff = "autocalc = 0;"
		var picture = root.lookup("picture").eden_definition;
		if(picture==undefined){
			picture = "picture is [];"
		}
		else{
			picture = picture+";";
		}
		var comments = [
			"## This is a JS-EDEN script automatically generated using the environment's script generator feature.",
			"## JS-EDEN is an open source empirical modelling environment based on research, principles and work",
			"## conducted at University of Warwick.",
			"## Web site: https://github.com/emgroup/js-eden",
			"## Firstly, turn off automatic calculation until the construal is fully loaded.",
			"## Include Files:",
			"## Observable Assignments:",
			"## Observable Definitions:",
			"## Action Definitions:",
			"## Function Definitions:",
			"## Picture Definition:",
			"## Turn on automatic calculation and execute any triggered actions pending.",
			"## End of automatically generated script."
		];
		
		var blank = " - ";

		for(var i=0; i<symbolsx.length; i++){
	
			var ofa = "";
			var ofai = 5;
		
			var name = symbolsx[i].name.replace(/\//g,'');
				
			if (symbolsx[i].last_modified_by == "include") {
				continue;
			}
			if (/^(autocalc|picture|randomIndex|randomGeneratorState)$/.test(name)) {
				continue;
			}
			if (/^(mouse|touch)[A-Z]/.test(name) && Eden.isitSystemObservable(name)) {
				continue;
			}
			if (/^_([vV]iew|update)_/.test(name)) {
				continue;
			}

			var def = symbolsx[i].eden_definition;
				if(def==undefined){
					def = blank;
				}
			if((regexX!=undefined)&&(regexX!="")){
				
				var RE = new RegExp(regexX);
					
				if(RE.test(name)){
					continue;
				}
			}

			//check this early
			if(def.indexOf("proc ")==0){
				ofa = "(Action)";
				ofai = 2;
			}
			else if(def.indexOf("func ")==0){
				ofa = "(Function)";
				ofai = 1;
			}
			else{
				ofa = "(Observable)";
				ofai = 0;
			}
			
			var value = symbolsx[i].cached_value;
			var edenForValue;
			if (typeof(value) == "string" && /[^ -~\t\n]/.test(value)) {
				/* Ensure that strings don't contain any special characters that might get mangled
				 * by mistaken character set auto-recognition performed by browsers or code editors.
				 * Stick to ASCII printable only and use XML/HTML entity syntax for the rest. */
				var encoded = value.replace(/[^ -~\t\n]/g, function(str) {
					return '&#'+str.charCodeAt(0) + ';';
				});
				edenForValue = "decodeHTML(" + Eden.edenCodeForValue(encoded) + ")";
			} else {
				edenForValue = Eden.edenCodeForValue(value);
			}
			var htmlForValue= Eden.htmlEscape(edenForValue, true);

			//Reasoning /push to appropriate array
			if(ofai==1){
				functs.push(def);
			}
			else if(ofai==0){
				if (def == blank) {
					obsAssins.push(name + " = " + htmlForValue + ";");
				}
				else{
					obsDefs.push(Eden.htmlEscape(def, true) + ";");
				}
			}
			else if(ofai==2){
				acts.push(def);
			}
			else{
				console.log("oh dear error");
			}
		}
		
		//Script Generation
		var lines = [];
			
		lines.push(comments[0]);
		lines.push("");
		lines.push(comments[1]);
		lines.push(comments[2]);
		lines.push(comments[3]);
		lines.push("");		
		lines.push(comments[4]);
		lines.push(autocalcOff);
		lines.push("");
		lines.push(comments[5]);
		var includeFiles = eden.getIncludedURLs();
		for (var i = 0; i < includeFiles.length; i++) {
			lines.push("include(\"" + includeFiles[i] + "\");");
		}
		lines.push("");
		lines.push(comments[6]);
		for(var i=0; i<obsAssins.length; i++){
			lines.push(obsAssins[i]);
		}
		lines.push("");
		lines.push(comments[7]);
		for(var i=0; i<obsDefs.length; i++){
			lines.push(obsDefs[i]);
		}
		lines.push("");
		lines.push(comments[8]);
		for(var i=0; i<acts.length; i++){
			lines.push(acts[i]);
			if (i !== acts.length - 1) {
				lines.push("");
			}
		}
		lines.push("");
		lines.push(comments[9]);
		for(var i=0; i<functs.length; i++){
			lines.push(functs[i]);
			if (i !== functs.length - 1) {
				lines.push("");
			}
		}
		lines.push("");
		lines.push(comments[10]);
		lines.push(picture);
		lines.push("");
		lines.push(comments[11]);
		lines.push(autocalcOn);
		lines.push("");
		lines.push(comments[12]);

		return "<div style='position: absolute; top: 30px; bottom: 10px; left: 0; right: 10px;'>"+
							"<textarea readonly=true spellcheck=false style='font-family: monospace; background-color: white; color: black; resize: none; width: 100%; height: 100%;'>"+lines.join("\n")+"</textarea>"+
						"</div>";
	}
	
	SG.arrayFromObject = function(object){

		var temp = [];

		$.each(object, function(){
			temp.push(this);
		});
		
		return temp;
	}
	
	SG.propertiesFromObject = function(object){

		var temp = [];

		$.each(object, function(x){
			temp.push(x);
		});
		
		return temp;
	}
	
	SG.toActualString = function(array){
		var returnstring = "[";
		for(var i=0; i<array.length; i++){
			if(typeof array[i]=="string"){
				returnstring = returnstring+"\""+String(array[i])+"\""
			}
			else if(array[i] instanceof Array){
				returnstring = returnstring+SG.toActualString(array[i]);
			}
			else{
				returnstring = returnstring+String(array[i]);
			}
			if(i!=array.length-1){
				returnstring = returnstring +", "
			}
		}
		returnstring = returnstring+"]";
		return returnstring;
	}

	success();
};
/* Plugin meta information */
EdenUI.plugins.SG.title = "Script Generator (SG)";
EdenUI.plugins.SG.description = "A script that represents the model";
EdenUI.plugins.SG.author = "Joe Butler";

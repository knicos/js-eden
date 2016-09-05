EdenUI.SVG = function(name, title, source) {
	this.name = name;
	this.title = title;
	this.source = (source) ? source : "picture";
	this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	this.contents = $('<div class="jseden-viewcontent2"></div>');
	this.svg.setAttribute("width","100%");
	this.svg.setAttribute("height","100%");
	//this.box = this.contents.find(".scriptview-box");
	this.contents.get(0).appendChild(this.svg);

	if (EdenUI.SVG.sources[this.source] === undefined) {
		EdenUI.SVG.sources[this.source] = [];
	}
	EdenUI.SVG.sources[this.source].push(this);
}

EdenUI.SVG.sources = {};

EdenUI.SVG.prototype.createElement = function(index, type) {
	if (this.svg.childNodes[index] && this.svg.childNodes[index].nodeName == type) return;

	var e = document.createElementNS("http://www.w3.org/2000/svg", type);

	if (this.svg.childNodes[index] === undefined) {
		this.svg.appendChild(e);
	} else {
		var next = this.svg.childNodes[index].nextSibling;
		this.svg.removeChild(this.svg.childNodes[index]);
		if (next) {
			this.svg.insertBefore(next, e);
		} else {
			this.svg.appendChild(e);
		}
	}
}

EdenUI.SVG.prototype.updateAttribute = function(index, attrib, value) {
	var node = this.svg.childNodes[index];
	if (node) {
		node.setAttribute(attrib,value);
	}
}

EdenUI.SVG.createElement = function(source, index, type) {
	if (EdenUI.SVG.sources[source] === undefined) return;

	for (var i=0; i<EdenUI.SVG.sources[source].length; i++) {
		EdenUI.SVG.sources[source][i].createElement(index,type);
	}
}

EdenUI.SVG.updateAttribute = function(source, index, attrib, value) {
	if (EdenUI.SVG.sources[source] === undefined) return;

	for (var i=0; i<EdenUI.SVG.sources[source].length; i++) {
		EdenUI.SVG.sources[source][i].updateAttribute(index,attrib,value);
	}
}

EdenUI.SVG.createDialog = function(name, mtitle) {
	var viewdata = new EdenUI.SVG(name.slice(0,-7),mtitle);
	return viewdata;
}

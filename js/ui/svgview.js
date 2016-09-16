EdenUI.SVG = function(name, title, source) {
	EdenUI.SVG.init();

	this.name = name;
	this.title = title;
	this.source = (source) ? source : "picture";
	this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	//this.svg.className = "jseden-svg";
	this.contents = $('<div class="jseden-viewcontent2 jseden-svg"></div>');
	this.svg.setAttribute("width","100%");
	this.svg.setAttribute("height","100%");
	this.svg.setAttribute("style", "background: white;");
	//this.box = this.contents.find(".scriptview-box");
	this.contents.get(0).appendChild(this.svg);

	this.defaultWidth = 500;
	this.defaultHeight = 500;

	this.inspectmode = true;

	if (EdenUI.SVG.sources[this.source] === undefined) {
		EdenUI.SVG.sources[this.source] = [];
	}
	EdenUI.SVG.sources[this.source].push(this);
}

EdenUI.SVG.sources = {};
EdenUI.SVG.inited = false;

EdenUI.SVG.init = function() {
	if (EdenUI.SVG.inited) return;
	EdenUI.SVG.inited = true;

	$(document.body).on("mousemove",".jseden-svg",function(e) {
		eden.root.lookup("mouseX").assign(e.offsetX,eden.root.scope);
		eden.root.lookup("mouseY").assign(e.offsetY,eden.root.scope);
	});
}

EdenUI.SVG.reset = function() {
	EdenUI.SVG.sources = {};
}

EdenUI.SVG.prototype.createElement = function(index, type, name) {
	if (this.svg.childNodes[index] && this.svg.childNodes[index].nodeName == type) return;

	var e = document.createElementNS("http://www.w3.org/2000/svg", type);
	//console.log(name);
	//e.setAttribute("data-observable",(name)?name:"@");
	e.setAttribute("class","svg-item");
	var me = this;
	e.onmouseover = function() {
		if (name && me.inspectmode) {
			console.log(name);
		}
	};

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
	if (index > this.svg.childNodes.length) return;
	var node = this.svg.childNodes[index];
	if (node) {
		node.setAttribute(attrib,value);
	}
}

EdenUI.SVG.prototype.updateContent = function(index, value) {
	var node = this.svg.childNodes[index];
	if (node) {
		node.textContent = value;
	}
}

EdenUI.SVG.createElement = function(source, index, type, name) {
	if (EdenUI.SVG.sources[source] === undefined) return;

	for (var i=0; i<EdenUI.SVG.sources[source].length; i++) {
		EdenUI.SVG.sources[source][i].createElement(index,type,name);
	}
}

EdenUI.SVG.updateAttribute = function(source, index, attrib, value) {
	if (EdenUI.SVG.sources[source] === undefined) return;

	for (var i=0; i<EdenUI.SVG.sources[source].length; i++) {
		EdenUI.SVG.sources[source][i].updateAttribute(index,attrib,value);
	}
}

EdenUI.SVG.updateContent = function(source, index, value) {
	if (EdenUI.SVG.sources[source] === undefined) return;

	for (var i=0; i<EdenUI.SVG.sources[source].length; i++) {
		EdenUI.SVG.sources[source][i].updateContent(index,value);
	}
}

EdenUI.SVG.createDialog = function(name, mtitle) {
	var viewdata = new EdenUI.SVG(name.slice(0,-7),mtitle);
	return viewdata;
}

EdenUI.SVG.thumbnail = function(cb) {
	if (EdenUI.SVG.sources["picture"] === undefined || EdenUI.SVG.sources["picture"].length == 0) {
		if (cb) cb();
		return;
	}

	var svgele = EdenUI.SVG.sources["picture"][0].svg;
	svgele.setAttribute("width",""+svgele.clientWidth);
	svgele.setAttribute("height",""+svgele.clientHeight);
	var svgString = new XMLSerializer().serializeToString(svgele);
	svgele.setAttribute("width","100%");
	svgele.setAttribute("height","100%");

	var imgwidth = svgele.clientWidth;
	var imgheight = svgele.clientHeight;
	var canwidth = 200;
	var canheight = 112;

	var imageAspectRatio = imgwidth / imgheight;
	var canvasAspectRatio = canwidth / canheight;
	var renderableHeight, renderableWidth, xStart, yStart;

	// If image's aspect ratio is less than canvas's we fit on height
	// and place the image centrally along width
	if(imageAspectRatio < canvasAspectRatio) {
		renderableHeight = canheight;
		renderableWidth = imgwidth * (renderableHeight / imgheight);
		xStart = (canwidth - renderableWidth) / 2;
		yStart = 0;
	}

	// If image's aspect ratio is greater than canvas's we fit on width
	// and place the image centrally along height
	else if(imageAspectRatio > canvasAspectRatio) {
		renderableWidth = canwidth
		renderableHeight = imgheight * (renderableWidth / imgwidth);
		xStart = 0;
		yStart = (canheight - renderableHeight) / 2;
	}

	// Happy path - keep aspect ratio
	else {
		renderableHeight = canheight;
		renderableWidth = canwidth;
		xStart = 0;
		yStart = 0;
	}
	//context.drawImage(imageObj, xStart, yStart, renderableWidth, renderableHeight);

	//$(document.body).append($('<div id="png-container" style="margin-top: 200px;"></div>'));

	var canvas = document.createElement("canvas");
	canvas.setAttribute("width","200");
	canvas.setAttribute("height","112");
	var ctx = canvas.getContext("2d");
	var DOMURL = self.URL || self.webkitURL || self;
	var img = new Image();
	var svg = new Blob([svgString], {type: "image/svg+xml;charset=utf-8"});
	var url = DOMURL.createObjectURL(svg);
	img.onload = function() {
		//console.log("SVG: " + svgele.clientWidth + "x" + svgele.clientHeight + " @ " + canvas.width + "," + canvas.height);
		ctx.drawImage(img, xStart, yStart, renderableWidth, renderableHeight);
		var png = canvas.toDataURL("image/png");
		//DOMURL.revokeObjectURL(png);
		if (cb) cb(png);
		//document.querySelector('#png-container').innerHTML = '<img src="'+png+'"/>';
	};
	img.src = url;
}


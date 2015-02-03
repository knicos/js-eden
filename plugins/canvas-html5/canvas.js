/*
 * Copyright (c) 2013, Empirical Modelling Group
 * All rights reserved.
 *
 * See LICENSE.txt
 */

/**
 * JS-Eden Canvas Plugin
 * Allows a html5 canvas to be displayed and used within JS-Eden for drawing.
 * @class CanvasHTML5 Plugin
 */

EdenUI.plugins.CanvasHTML5 = function (edenUI, success) {
	var me = this;

	var cleanupCanvas = function (canvasElement, previousElements, nextElements) {
		var hash;
		for (hash in previousElements) {
			if (hash in nextElements || !previousElements[hash].togarbage) {
				continue;
			}
			canvasElement.removeChild(previousElements[hash]);
		}
	};

	canvases = {};
	contents = {};
	var canvasNameToElements = {};

	this.delay = 40;

	this.drawPicture = function(canvasname, pictureobs) {

		if (!canvasNameToElements[canvasname]) {
			canvasNameToElements[canvasname] = {};
		}

		var previousElements = canvasNameToElements[canvasname];
		var nextElements = {};

		var canvas = canvases[canvasname];

		if (canvas === undefined) {
			//Need to make the canvas view first
			edenUI.createView(canvasname,"CanvasHTML5");
			
			canvases[canvasname] = $("#"+canvasname+"-dialog-canvas")[0];
			contents[canvasname] = $("#"+canvasname+"-dialog-canvascontent")[0];
			canvas = canvases[canvasname];
			canvas.drawing = false;			
		}
	
		if (!canvas.drawing){

			canvas.drawing = true;
			setTimeout(function (){
		
			var picture = root.lookup(pictureobs).value();

		    var context = canvas.getContext('2d');
			context.clearRect(0, 0, canvas.width, canvas.height);
			
		    var content = contents[canvasname];

			var hash;
			for (hash in previousElements) {
				previousElements[hash].togarbage = true;
			}

			if (picture === undefined) { return; }

			for (var i = 0; i < picture.length; i++) {

				if (picture[i] === undefined) { continue; }

				var elHash = picture[i].hash && picture[i].hash();
				var existingEl = elHash && previousElements[elHash];

				if (existingEl) {
					// if already existing hash, no need to draw, just set the element
					picture[i].element = existingEl;
				} else {
					context.save();
					EdenUI.plugins.CanvasHTML5.configureContext(context, picture[i].drawingOptions);
					// expect draw() method to set .element
					picture[i].draw(context, content, pictureobs);
					context.restore();
				}

				var htmlEl = picture[i].element;
				if (htmlEl) { htmlEl.togarbage = false; }
				if (htmlEl && !existingEl) {
					$(content).append(htmlEl);
				}

				if (htmlEl) {
					nextElements[elHash] = htmlEl;
				}
			}
			cleanupCanvas(content, previousElements, nextElements);
			canvasNameToElements[canvasname] = nextElements;
			canvas.drawing = false;
		}, me.delay);
		}
	};

	this.createDialog = function(name,mtitle) {

		code_entry = $('<div id=\"'+name+'-canvascontent\" class=\"canvashtml-content\"></div>');
		code_entry.html("<canvas class=\"canvashtml-canvas\" id=\""+name+"-canvas\" width=\"550px\" height=\"380px\"></canvas>");
		//Remove -dialog name suffix.
		var displayedName = name.slice(0, -7);
		code_entry.find(".canvashtml-canvas").on("mousedown",function(e) {
			pos = $(this).offset();
			x = e.pageX - pos.left;
			y = e.pageY - pos.top;
			var followMouse = root.lookup("mouseFollow").value();
			var mousePos = root.lookup('Point').value().call(this, x, y);
			var mouseButtonsSym = root.lookup("mouseButtons");
			var buttonsDown = mouseButtonsSym.value();
			var buttonsPreviouslyDown = buttonsDown.left || buttonsDown.middle || buttonsDown.right || buttonsDown.button4 || buttonsDown.button5;
			switch (e.button) {
				case 0:
					buttonsDown.left = true;
					break;
				case 1:
					buttonsDown.middle = true;
					break;
				case 2:
					buttonsDown.right = true;
					break;
				case 3:
					buttonsDown.button4 = true;
					break;
				case 4:
					buttonsDown.button5 = true;
					break;
			}
			if (followMouse) {
				root.lookup('mousePressed').netAssign(buttonsDown.left);
				mouseButtonsSym.netAssign(buttonsDown);
				if (!buttonsPreviouslyDown) {
					root.lookup('mouseDownWindow').netAssign(displayedName);
					root.lookup('mouseDown').netAssign(mousePos);
				}
			} else {
				root.lookup('mousePressed').assign(buttonsDown.left);
				mouseButtonsSym.assign(buttonsDown);
				if (!buttonsPreviouslyDown) {
					root.lookup('mouseDownWindow').assign(displayedName);
					root.lookup('mouseDown').assign(mousePos);
				}
			}
		}).on("mouseup",function(e) {
			pos = $(this).offset();
			x = e.pageX - pos.left;
			y = e.pageY - pos.top;
			var followMouse = root.lookup("mouseFollow").value();
			var mousePos = root.lookup('Point').value().call(this, x, y);
			var mouseButtonsSym = root.lookup("mouseButtons");
			var buttonsDown = mouseButtonsSym.value();
			switch (e.button) {
				case 0:
					buttonsDown.left = false;
					break;
				case 1:
					buttonsDown.middle = false;
					break;
				case 2:
					buttonsDown.right = false;
					break;
				case 3:
					buttonsDown.button4 = false;
					break;
				case 4:
					buttonsDown.button5 = false;
					break;
			}
			var someButtonsDown = buttonsDown.left || buttonsDown.middle || buttonsDown.right || buttonsDown.button4 || buttonsDown.button5;
			if (followMouse) {
				root.lookup('mousePressed').netAssign(buttonsDown.left);
				mouseButtonsSym.netAssign(buttonsDown);
				if (!someButtonsDown) {
					root.lookup('mouseUp').netAssign(mousePos);
				}
			} else {
				root.lookup('mousePressed').assign(buttonsDown.left);
				mouseButtonsSym.assign(buttonsDown);
				if (!someButtonsDown) {
					root.lookup('mouseUp').assign(mousePos);
				}
			}
		}).on("contextmenu", function (e) {
			if (!root.lookup("mouseContextMenuEnabled").value()) {
				e.preventDefault();
				e.stopPropagation();
			}
		}).on("mousemove",function(e) {
			pos = $(this).offset();
			x = e.pageX - pos.left;
			y = e.pageY - pos.top;
			var followMouse = root.lookup("mouseFollow").value();
			var mousePos = root.lookup('Point').value().call(this, x, y);
			if (followMouse) {
				root.lookup('mouseWindow').netAssign(displayedName);
				root.lookup('mousePosition').netAssign(root.lookup('Point').value().call(this, x, y));
			} else {
				root.lookup('mouseWindow').assign(displayedName);
				root.lookup('mousePosition').assign(root.lookup('Point').value().call(this, x, y));
			}
		});

		$dialog = $('<div id="'+name+'"></div>')
			.html(code_entry)
			.dialog({
				title: mtitle,
				width: 600,
				height: 450,
				minHeight: 120,
				minWidth: 230,
				resizeStop: function(event,ui) {
					$("#"+name+"-canvas").attr("width", (ui.size.width-50)+"px").attr("height", (ui.size.height-70)+"px");

					// Now need to redraw the canvas.
					edenUI.eden.execute("_update_" + displayedName + "();");
				},
			});
	}

	//Supported canvas views
	edenUI.views["CanvasHTML5"] = {dialog: this.createDialog, title: "Canvas HTML5"};

	edenUI.eden.include("plugins/canvas-html5/canvas.js-e", success);
};

EdenUI.plugins.CanvasHTML5.configureContext = function (context, options) {
	if (options === undefined) {
		return;
	}
		
	if ("dashes" in options) {
		context.setLineDash(options.dashes);
		if ("dashOffset" in options) {
			context.lineDashOffset = options.dashOffset;
		}
	}

	if ("lineWidth" in options) {
		context.lineWidth = options.lineWidth;
	}
	
	if ("shadow" in options) {
		context.shadowColor = options.shadow.colour;
		context.shadowBlur = options.shadow.blur;
		context.shadowOffsetX = options.shadow.xOffset;
		context.shadowOffsetY = options.shadow.yOffset;
	}
}

EdenUI.plugins.CanvasHTML5.FillStyle = function () {
	//Abstract superclass.
}

EdenUI.plugins.CanvasHTML5.setFillStyle = function (context, style) {
	if (style instanceof EdenUI.plugins.CanvasHTML5.FillStyle) {
		context.fillStyle = style.getColour(context);
	} else {
		context.fillStyle = style;
	}
};

EdenUI.plugins.CanvasHTML5.title = "Canvas HTML5";
EdenUI.plugins.CanvasHTML5.description = "Provides an Eden drawable HTML5 canvas";
EdenUI.plugins.CanvasHTML5.author = "Nicolas Pope et. al.";

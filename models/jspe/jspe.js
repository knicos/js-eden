picture2=[];

proc drawPicture2 : picture2 { 
  CanvasHTML5_DrawPicture("jspe","picture2");
};

_view_default_x=10;
_view_default_y=50;
_view_jspe_x=960;
_view_jspe_y=50;
_view_default_width=625;
_view_default_height=600;
_view_jspe_width=625;
_view_jspe_height=600;
_view_default_x=10;
_view_default_y=50;
_view_jspe_x=960;
_view_jspe_y=50;
_view_default_width=625;
_view_default_height=600;
_view_jspe_width=625;
_view_jspe_height=600;
## SlideButton to overcome Button limitations
${{
SlideButton = function (name, label, x, y, enabled) {
	this.name = name;
	this.label = label;
	this.x = x;
	this.y = y;
	this.enabled = enabled;
}
}}$;

func SlideButton { ${{
  var name = arguments[0];
  var label = arguments[1];
  var x = arguments[2];
  var y = arguments[3];
  var enabled = arguments[4];
  return new SlideButton(name, label, x, y, enabled);
}}$; }

${{
SlideButton.prototype.draw = function(context) {
  var me = "jspe_" + this.name;
  var me2 = this.name;
  var but = $("#"+me).get(0);
  if (but === undefined) {
	var dis = "";
	if (this.enabled == true) { dis = ""; }
	else { dis = "disabled=\"true\""; }

	var can = $("#jspe-dialog-canvascontent");
	var buthtml = $("<input type=\"button\" id=\"" + me + "\" value=\"" + this.label + "\" " + dis + " style=\"position: absolute; left: " + this.x + "px; top: " + this.y + "px;\"></input").click(function() {
		root.lookup(me2 + "_clicked").assign(true);
	}).appendTo(can);

	buthtml.get(0).togarbage = false;

	//Initialise
	root.lookup(me2 + "_clicked").assign(false);
  } else {
	but.value = this.label;
	but.togarbage = false;
	if (this.enabled == true) { but.disabled = false; }
	else { but.disabled = true; }
	but.style.left = "" + this.x + "px";
	but.style.top = "" + this.y + "px";
  }
};
}}$;
${{
SlideButton.prototype.toString = function() {
  return "SlideButton(" + this.name + ", " + this.label + ", " + this.x + ", "+this.y+", "+this.enabled+")";
};
}}$;


## Slide
${{
Slide = function (html) {
        this.html = html;
}
}}$;

func Slide { ${{
  var html = arguments[0];
console.log(html);
  return new Slide(html);
}}$; }


${{
Slide.prototype.draw = function(context) {
  var me = "jspe_slide";
  var but = $("#"+me).get(0);

  var jspe = $('#jspe-dialog-canvas');
  var content = this.html.replace(/<jseden>/g,"<div><pre>").replace(/<\/jseden>/g,"</pre><a href=\"#\" onclick=\"execute(this)\">execute</a> <a href=\"#\" onclick=\"copyToInput(this)\">copy to input</a><br /></div>");

  if (but === undefined) {
        var can = $("#jspe-dialog-canvascontent");
	var divstyle = "position: absolute; left: " + ($('#jspe-dialog-canvas').position().left + 20) + "px; top: 40px"; 
	var buthtml = $("<div id=\"" + me + "\" style=\""+divstyle+"\">" + content + "</div>").appendTo(can);

        buthtml.get(0).togarbage = false;

        //Initialise
  } else {
        but.innerHTML = content;
        but.togarbage = false;
	but.style.left = ($('#jspe-dialog-canvas').position().left + 20) + "px";
	but.style.top = "40px";
  }
  $('#jspe_slide').css("width",$('#jspe-dialog-canvas').width());
};
}}$;

${{
Slide.prototype.toString = function() {
  return "Slide("+this.html+")";
};
}}$;

${{
  copyToInput = function(e) {

	document.getElementById("inputCodeArea").value = $(e).siblings('pre').text();
	//Copies to EDEN interpreter window
  }

  execute = function(e) {
	// Evaluates and stores in the symbol table
	eden.plugins.InputWindow.submitEdenCode($(e).siblings('pre').text());
  }
}}$;

proc clearSlides { ${{
  var jspe = document.getElementById("jspe-dialog-canvas");
  jspe.width = jspe.width;

  $("#jspe-dialog-canvascontent > :not(canvas)").each(function() {
	if(/jspe_/.test(this.id)) {
		this.togarbage = true;
	}
  });

}}$; };

proc cleanupSlides { ${{
  $("#jspe-dialog-canvascontent > :not(canvas)").each(function() {
	if (this.togarbage == true) {
		$(this).remove();
	}
  });
}}$; };

proc drawSlides : slides {
  clearSlides();
  ${{
  var slides = context.lookup('slides').value();
  var jspe = $('#jspe-dialog-canvas').get(0).getContext('2d');

  if (slides === undefined) { return; }

  for (var i = 0; i < slides.length; i++) {
  if (slides[i] === undefined) { continue; }
  slides[i].draw(jspe);
  }
  }}$;
  cleanupSlides();
};

jspeleft = ${{ $('#jspe-dialog-canvas').position().left }}$;

buttonPrevEnabled is true;
buttonNextEnabled is true;


buttonPrev is SlideButton("buttonPrev","Previous Slide", jspeleft, 
_view_jspe_height-70, buttonPrevEnabled);

buttonNext is SlideButton("buttonNext","Next Slide", jspeleft + 150, 
_view_jspe_height-70, buttonNextEnabled);

## buttonSave = SlideButton("buttonSave","Add Slide", int(${{ $('#jspe-dialog-canvas').position().left }}$) + 100, ${{ $('#jspe-dialog-canvas').height()+15 }}$, true);

slideList is [];

proc disableButtons : currentSlide {
	buttonPrevEnabled is (currentSlide <= 1) ? false : true;
	buttonNextEnabled is (currentSlide >= slideList#) ? false : true;
}

proc prevSlide : buttonPrev_clicked {
	if (currentSlide > 2) {
		currentSlide--;
	} else {
		currentSlide = 1;
	}
}

proc nextSlide : buttonNext_clicked {
	if (currentSlide < slideList#) {
		currentSlide++;
	} else {
		currentSlide = slideList#;
	}
}


## something like an onclick of some kind which 
slides is [buttonPrev, buttonNext, slideNumber, slideList[currentSlide]];

currentSlide = 0;
## slideNumber is Div("slidenumber",100,100,100,50,"<h3>Slide Number: "+currentSlide+"</h3>","");


${{
$('#canvas_buttonPrev').attr('id', 'jspe_buttonPrev');
$('#canvas_buttonNext').attr('id', 'jspe_buttonNext');
}}$;

currentSlide = 0;

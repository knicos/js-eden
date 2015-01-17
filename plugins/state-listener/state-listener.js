EdenUI.plugins.SL = function(edenUI, success){
	var me = this;
	var defaultview = "";

	this.html = function(name,content) {
	//This doesn't look like its ever being called
		if (name == "DEFAULT") {
			if (defaultview == "") {
				edenUI.createView(name,"SL");
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

		var slHTML = "<div class=\"sldiv\">" +
				"<div><label for=\"sl-ipaddr\">IP Address:</label><input type=\"text\" id=\"sl-ipaddr\" value=\"127.0.0.1\"></input></div>" +
				"<div><label for=\"sl-port\">Port:</label><input type=\"text\" id=\"sl-port\" value=\"8001\"></input></div>" +
				"<div><input type=\"button\" value=\"Connect\" id=\"connectBtn\"></input></div><p id=\"sl-status\"></p>";
		
		$dialog = $('<div id="'+name+'"></div>')
			.html(slHTML)
			.dialog(
				{
					title: mtitle,
					width: 300,
					height: 450,
					minHeight: 120,
					minWidth: 230
				}
			)
			
			$("#connectBtn").click(function(){
				window.WebSocket = window.WebSocket || window.MozWebSocket;
				 
				if (!window.WebSocket) {
					console.log("WebSockets not supported");
					return;
				}
				 
				// open connection
				var url = "ws://" + $("#sl-ipaddr").val() + ":" + $("#sl-port").val() + '/'; 
				var connection = new WebSocket(url);
				eden.listenTo('executeBegin',this,function(origin,code){
					console.log(origin);
					if(origin != "net")
						connection.send(code);	
				});
				eden.listenTo('beforeNetAssign',this,function(symbol, value, origin){
					console.log(origin);
					if (origin != "net") {
						var symRoot = symbol.context.root;
						var edenCodeFunc = symRoot.lookup("edenCode").definition(symRoot);
						connection.send(symbol.name.slice(1) + "=" + edenCodeFunc(value) + ";");
					}
				});
				$("#sl-status").html('<p>Connected to: ' + url + "</p>");
				
				connection.onerror = function (error) {
				// just in there were some problems with conenction...
					$("#sl-status").html('<p>Error connecting to server - please verify server is running at ' + url + ". For usage instructions please read the comments in the <a href='plugins/state-listener/state-listener-server.js'>state-listener-server.js</a> file.</p>");
				};
				 
				// most important part - incoming messages
				connection.onmessage = function (message) {
					$("#sl-status").html('<p>Received: ' + message.data + "</p>");
					eden.execute(message.data,"net","",{name:"/execute"},noop);
					return;

				};
			});
			
			//Initialise 
	}
	
	
	//Register the HTML view options
	edenUI.views["SL"] = {dialog: this.createDialog, title: "State Listener"};
	edenUI.eden.include("plugins/state-listener/state-listener.js-e", success);
};
/* Plugin meta information */
EdenUI.plugins.SL.title = "State Listener (SL)";
EdenUI.plugins.SL.description = "Method of syncronizing observables via TCP";
EdenUI.plugins.SL.author = "Jonny Foss";

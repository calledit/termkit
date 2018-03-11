const CDP = require('chrome-remote-interface');
var blessed = require('blessed');//Scrolling and parents are bugy in blessed
var fs = require('fs');


//Setup Blessed A GUI framework for the terminal
var screen = blessed.screen();

//exit when user preses one of the quit keys
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});


//Setup the GUI
var StyleConfig = require('./include/config.js');
var gui_code = require('./include/gui.js');
var gui = gui_code.browser_gui_setup(screen, blessed, StyleConfig);
var bless_tab_gui = gui_code.tab_gui_setup(gui, blessed, StyleConfig)
var Page, DOMSnapshot, LayerTree, Emulation, Target, Input;

//Helper to convert betwen terminal space and browser space
var terminalConverter = {
    FontSize: 12,//the font size of the console 
    FontAspectRatio: 0.5833333, //The asspect ratio of the console font //We use the Courier font as is is the most comon monospace font
    browserSize: {},

	//gets the simulated pixel width and height of the browser
    getBrowserSize: function(){
        terminalConverter.browserSize.width = Math.round(terminalConverter.FontSize*terminalConverter.FontAspectRatio*gui.view_port.width);
        terminalConverter.browserSize.height = Math.round(terminalConverter.FontSize*gui.view_port.height);

        return(terminalConverter.browserSize);
    },
	
	//gets the x pixel in the browser based on a character x position in the console
    getBrowserX: function(TerminalX){
        return(Math.round(TerminalX*terminalConverter.FontSize*terminalConverter.FontAspectRatio));
    },
	//gets the y pixel in the browser based on a character x position in the console
    getBrowserY: function(TerminalY){
        return(Math.round(TerminalY*terminalConverter.FontSize));
    },
	//gets the x position in the console based on a x pixel in the browser
    getTerminalX: function(browserX){
        return(Math.round(browserX/(terminalConverter.FontSize*terminalConverter.FontAspectRatio)));
    },
	//gets the y position in the console based on a y pixel in the browser
    getTerminalY: function(browserY){
        return(Math.round(browserY/terminalConverter.FontSize));
    }
};

//Caclulate wanted browser size but chrome will use the size it wants unless it is headless
terminalConverter.getBrowserSize();



//Open a conection to chrome
CDP(function(recived_client){
		client = recived_client;
		Page = client.Page;
		Target = client.Target;
		DOMSnapshot = client.DOMSnapshot;
		LayerTree = client.LayerTree
		Input = client.Input
		Emulation = client.Emulation;

		
		Emulation.setVisibleSize({width: terminalConverter.browserSize.width, height: terminalConverter.browserSize.height})
		.then(function(){
			gui.console_box.unshiftLine('Tried to set the VisibleSize to width: '+terminalConverter.browserSize.width+' height: '+terminalConverter.browserSize.height);
			handle_browser_tab(client);
		}).catch(function(err){
			console.log("Failed to set browser size", err);
			process.exit(0);
		});

    }).on('error', function(err){
		// cannot connect to the remote endpoint
		console.error("Could not connect to chrome: ",err);
		console.log("start chrome: google-chrome --headless --remote-debugging-port=9222 ''")
		///Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
});




//User presses ctrl+r for a reload
screen.key(['C-r'], function(ch, key) {
	update_view_port();
	screen.render();
});

screen.key(['pageup'], function(ch, key) {//PgUp
	bless_tab_gui.view_port.scroll(-5);
	screen.render();
});
screen.key(['pagedown'], function(ch, key) {//PgDown
	bless_tab_gui.view_port.scroll(5);
	screen.render();
});

//Debug find key name
/*screen.on('keypress', function(ch, key) {
	console.log('ch', ch, 'key', key)
});*/

screen.key(['backspace'], function(ch, key) {
	//Tell chrome that we want to go back
});

//when the terminal is resized we need to re render
screen.on('resize', function(){
    gui.view_port.height = screen.height - gui.top_menu.height - gui.console_box.height;
    terminalConverter.getBrowserSize();
	update_view_port();
	screen.render();
 
});



//When we press the debug button we show the screen size and try to reset it
bless_tab_gui.debug_button.on('press', function(){
	Promise.all([
		Page.getLayoutMetrics(),
	])
	.then(function(val){
		metr = val[0];
		gui.console_box.unshiftLine('The VisibleSize is width: '+metr.layoutViewport.clientWidth+' height: '+metr.layoutViewport.clientHeight);
		screen.render();
	}).catch(function(err){
		console.log("Failed to get browser size", err);
		process.exit(0);
	});

	//Chrome resets its size to 800x600 so we need to reset it from time to time
	Emulation.setVisibleSize({width: terminalConverter.browserSize.width, height: terminalConverter.browserSize.height})
	.then(function(){
		gui.console_box.unshiftLine('Tired to set the VisibleSize to width: '+terminalConverter.browserSize.width+' height: '+terminalConverter.browserSize.height);
	}).catch(function(err){
		console.log("Failed to set browser size", err);
		process.exit(0);
	});
});


function m(x){
	return x*3.5
}

//writes a html file with render info
function write_debug_file(boxes){
	
	str = "";
	for(x in boxes){
		var box = boxes[x][0];
		var dom = boxes[x][1];
		var dom_style = boxes[x][2];
		var lay = boxes[x][3];
		dim = "width:"+m(box.width)+"px;";
		dim += "height:"+m(box.height)+"px;";
		dim += "left:"+m(box.left)+"px;";
		dim += "top:"+m(box.top)+"px;";
		str += "<div style=\""+dim+"\">"+dom.nodeName+"<!--"+JSON.stringify([box.style, dom, lay])+"--></div>\n";
	}
	fs.writeFileSync('./debug.html', '<html><style>body{font-size:5}div{border: 1px solid black;position:absolute;}</style><body>'+str+'</body></html>');
}

//When the user clicks a element we try to find its location and send a mouse click to the browser
function click_element(lay_nod){
	const options = {
        x: lay_nod.boundingBox.x+(lay_nod.boundingBox.width/2),
        y: lay_nod.boundingBox.y+(lay_nod.boundingBox.height/2),
        button: 'left',
        clickCount: 1
    };
	gui.console_box.unshiftLine('User clicked on x:'+options.x+' y:'+options.y);
	screen.render();

    Promise.resolve().then(() => {
        options.type = 'mousePressed';
        return client.Input.dispatchMouseEvent(options);
    }).then(() => {
        options.type = 'mouseReleased';
        return client.Input.dispatchMouseEvent(options);
    }).catch((err) => {
        console.error(err);
    })
}


//uses a dom snapshot to render to the terminal
function render_from_dom(dom_snap, view_port){

		//Clear old layers
		var childs = []
		for(x in view_port.children){
			childs[x] = view_port.children[x];
		}
		for(x in childs){
			childs[x].detach();
		}

		//Re structre the computed styles to make them faster to access
		var computed_styles = [];
		for(x in dom_snap.computedStyles){
			var cs = dom_snap.computedStyles[x];
			var style = {};
			for(i in cs.properties){
				style[cs.properties[i].name] = cs.properties[i].value;
			}
			computed_styles[x] = style;
		}
		var boxes = [];
		var text_overlay = [];
		//work throgh the layout tree
		for(layout_node in dom_snap.layoutTreeNodes){
			var lay_nod = dom_snap.layoutTreeNodes[layout_node];
			var dom_nod =  dom_snap.domNodes[lay_nod.domNodeIndex]
			var dom_style = false;
			if(typeof(lay_nod.styleIndex) != 'undefined'){
				dom_style = computed_styles[lay_nod.styleIndex];
			}

			//is this a text node we draw text nodes last in a text overlay
			if(lay_nod.inlineTextNodes){
				var fg_rgb = false;
				if(dom_style['color']){
					var fg_rgb = GetRGB(dom_style['color'], 'rgb');
				}
				
				for(in_box in lay_nod.inlineTextNodes){
					var in_text = lay_nod.inlineTextNodes[in_box];
					var text = lay_nod.layoutText.substr(in_text.startCharacterIndex, in_text.numCharacters);
					
					if(text != "\n" && text != " "){//Dont bother drawing whitespace boxes
						var bless_data = {
							left: terminalConverter.getTerminalX(in_text.boundingBox.x),
							top: terminalConverter.getTerminalY(in_text.boundingBox.y),

							width: terminalConverter.getTerminalX(in_text.boundingBox.width),
							height: terminalConverter.getTerminalY(in_text.boundingBox.height),
							content: text,
							style:{transparent:true},
						};
						if(fg_rgb){
							bless_data.style.fg = fg_rgb
						}
						bless_data.parent = view_port;
						text_overlay.push(bless_data)
					}
				}
			}else{
				var draw = false;
				var bless_data = {
					left: terminalConverter.getTerminalX(lay_nod.boundingBox.x),
					top: terminalConverter.getTerminalY(lay_nod.boundingBox.y),

					width: terminalConverter.getTerminalX(lay_nod.boundingBox.width),
					height: terminalConverter.getTerminalY(lay_nod.boundingBox.height),

					style:{}

				};
				
				//try to figure out how to draw this element

				if(dom_nod.nodeName == 'IMG'){
					draw = 'image';
					bless_data.style.bg = "#7f7f7f";
				}
				
				if(dom_style && !draw){
					if(dom_style['background-color'] && dom_style['background-color'] != 'rgba(0, 0, 0, 0)'){
						rgb = GetRGB(dom_style['background-color'], 'rgb');
						draw = 'color';
						bless_data.style.bg = rgb
					}else{
						if(dom_style['background-image'] && dom_style['background-image'] != 'none'){
							//Show checker patern or (asci image is next level stuff)
							bless_data.style.bg = "#7f7f7f";
							draw = 'image';
						}
					}
				}
				if(dom_nod.isClickable && dom_nod.nodeName == "A"){
					draw = 'click';
					bless_data.style.transparent = true;
				}
				bless_data.parent = view_port;
				if(lay_nod.boundingBox.width > 0 && lay_nod.boundingBox.height > 0 && draw){
					bless_box = blessed.box(bless_data);

					if(draw == 'image'){
						FillChecker(bless_box);
					}
					if(draw == 'click'){
						var elm_name = dom_nod.nodeName;
						(function(ln){
						bless_box.on('click', function(){
							gui.console_box.unshiftLine('User clicked');
							click_element(ln);
							screen.render();
						});
						})(lay_nod);
					}
					boxes.push([bless_data, dom_nod, dom_style,lay_nod]);//push to array for debug output
				}
			}
		}
		
		//Add the text overlay
		for(o in text_overlay){
			blessed.box(text_overlay[o]);
		}

		write_debug_file(boxes)

}

//Great to use for debuging when everything is white it is hard to se what is what
function getRandomColor() {
  var letters = '0123456789ABCDEF';
  var color = '#';
  for (var i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}


//Askes the browser for a new snapshot and renders the page
function update_view_port(){
	//Get a snapshot of the DOM 
	DOMSnapshot.getSnapshot({computedStyleWhitelist:['background-color', 'background-image', 'color']})
	.then(function(dom_snap){
			//Take the dom snapshot and make blessed boxes
			render_from_dom(dom_snap, bless_tab_gui.view_port);
			screen.render();
	}).catch(function(err){
		console.error(err);
		client.close();
	});
}

//Navigate to the url in the url bar
function navigate(){
	Page.navigate({url: UrlClean(bless_tab_gui.addres_bar_url_input.value, 'UrlBar')})
	.then(function(){
		Emulation.setVisibleSize({width: terminalConverter.browserSize.width, height: terminalConverter.browserSize.height})
		.then(function(){
			gui.console_box.unshiftLine('Tired to set the VisibleSize to width: '+terminalConverter.browserSize.width+' height: '+terminalConverter.browserSize.height);
			//handle_browser_tab(client);
		}).catch(function(err){
			console.log("Failed to set browser size", err);
			process.exit(0);
		});
	}).catch(function(err){
		console.error(err);
		client.close();
	});
}

var page_load_times = 0;
//setup a page
function handle_browser_tab(){
	
	//when user want to go somewhere go somewhere
	bless_tab_gui.addres_bar_url_input.on('submit', function(){
		navigate();
	});
	
	//whenever a page is loaded draw it
    Page.loadEventFired(function(layers){
		page_load_times++;
        gui.console_box.unshiftLine('page has loaded: '+page_load_times);
		update_view_port();
    });

    //enable events then start
    Promise.all([
        //LayerTree.enable(),//We dont listen for layerTree things but i suspect that would be a good idea
        Page.enable(),
		Page.getLayoutMetrics(),
		Target.getTargets(),
		Emulation.setDeviceMetricsOverride({
			screenWidth: terminalConverter.browserSize.width,
			screenHeight: terminalConverter.browserSize.height,
			width: terminalConverter.browserSize.width,
			height: terminalConverter.browserSize.height,
			mobile: false,
			deviceScaleFactor: 1
		})
    ]).then(function(values){
		gui.console_box.unshiftLine('The VisibleSize is width: '+values[1].layoutViewport.clientWidth+' height: '+values[1].layoutViewport.clientHeight);

		//Excute this script on the page to make the terminals lack of variable font size less of an issue
        Page.addScriptToEvaluateOnNewDocument({source: 
'font_interval=setInterval(function(){if(document.body){elems = document.body.getElementsByTagName("*");for(i in elems){if(elems[i].style){elems[i].style.fontFamily = "courier";elems[i].style.lineHeight= "1";elems[i].style.fontSize = "12px";elems[i].style.verticalAlign = "inherit";}}}else{/*clearInterval(font_interval)*/}},100);'
})
		.then(function(script){
			gui.console_box.unshiftLine('script_id: '+script.identifier);
			screen.render();
		}).catch(function(err){
			console.log("Failed to set browser size", err);
			process.exit(0);
		});

		var url = 'https://github.com/callesg/termkit';//Default URL
		bless_tab_gui.addres_bar_url_input.setValue(url);
		screen.render();
		navigate();
    }).catch(function(err){
        console.error(err);
        client.close();
    });

}
var SelectebleElementTypes = [
	"A",
	"INPUT",
	"BUTTON",
];
//Element.Text != "." && Element.Text != String.fromCharCode(8204) && Element.Text != " "){
var ForbidenStrings = [
	"",
	String.fromCharCode(8203),//ZERO WIDTH SPACE
	String.fromCharCode(8204),//ZERO WIDTH NON-JOINER
	String.fromCharCode(8205),//ZERO WIDTH JOINER
];

//Tries to parse a css color atribute
function GetRGB(ColorText, type){
    if(typeof(type) == 'undefined'){
        type = '';
    }
    Pars = ColorText.split(type+'(');
    if(Pars.length < 2){
        return(false);
    }
    ColorParts = Pars[1].split(')')[0];
    value = ColorParts.split(',');
    if(value[3] == 0){
        return(false);
    }
	for(var x in value){
		value[x] = parseInt(value[x]);
	}
    return(value);
I}

function StrObj(Obj){
    return(JSON.stringify(Obj));
}

function UrlClean(url, From){
	if(typeof(From) != 'undefined'){
		if(From == 'UrlBar' || From == 'Argv'){
			if(url.indexOf('://') == -1){
				url = 'https://'+url;
			}
		}
	}
    return(url);
}




function clone(obj) {
    if (null == obj || "object" != typeof obj) return obj;
    var copy = obj.constructor();
    for (var attr in obj) {
        if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
    }
    return copy;
}

function FillChecker(Box){
	var hi = Box.height;
	var wi = Box.width;
	for(var h=0;hi>h;h+=1){
		var w = 0;
		if(h%2){
			w += 2;
		}
		for(;wi>w;w+=4){
			blessed.box({
				parent: Box.parent,
				top:h+Box.top,
				left:w+Box.left,
				height: 1,
				width: 2,
				style:{
					bg: '#E3E3E3'
				}
			});
		}
	}
	
}

function dump(In){
    console.log(JSON.stringify(In, function (k, v){
		if(k == "_owner"){
			return null;
		}
		return(v);
	}, 4));
}

function TruncUnicode(Text){
	//XXXXXXXXX Make a patch for blessed 
	var JavascriptLen = Text.length;
	var PrintedWidth = wcwidth(Text);
	if(PrintedWidth == JavascriptLen){
		return(Text);
	}
	var RetText = ""
	if(true || PrintedWidth > JavascriptLen){
		for(var k=0;PrintedWidth>k;k++){
			//console.log(wcwidth(Text[k]), Text[k]);
			RetText += "?";
		}
		return(RetText);
	}
/*
	for(var i=0;i<Text.length;i++){
		if(wcwidth(RetText) > 1){
			RetText += "?";
			//console.log(Text[i], unicodeWidth.width(Text[i]))
		}else{
			RetText += Text[i];
		}
	}
*/
	/*while(WantedLength < unicodeWidth.width(RetText)){
		RetText += Text.substr(0,1);
		Text = Text.substr(1);
	}*/
	return(RetText);
}
function dbgclear(){
	for(var k=0;screen.height*2>k;k++){
		console.log("Break");
	}
}

function DbgShowMouseClicks(){
function handleEvent(e){
 var evt = e ? e:window.event;
 var clickX=0, clickY=0;

 if ((evt.clientX || evt.clientY) &&
     document.body &&
     document.body.scrollLeft!=null) {
  clickX = evt.clientX + document.body.scrollLeft;
  clickY = evt.clientY + document.body.scrollTop;
 }
 if ((evt.clientX || evt.clientY) &&
     document.compatMode=='CSS1Compat' && 
     document.documentElement && 
     document.documentElement.scrollLeft!=null) {
  clickX = evt.clientX + document.documentElement.scrollLeft;
  clickY = evt.clientY + document.documentElement.scrollTop;
 }
 if (evt.pageX || evt.pageY) {
  clickX = evt.pageX;
  clickY = evt.pageY;
 }


element = document.querySelectorAll("td.title a")[2];
rect = element.getClientRects()[0]
var FirstAPos = Math.round(rect.left)+"x"+Math.round(rect.top)+" "+Math.round(rect.width)+"x"+Math.round(rect.height);

 alert(evt.type.toUpperCase() + ' mouse event:'
  +' pageX = ' + clickX
  +' pageY = ' + clickY 
  +' clientX = ' + evt.clientX
  +' clientY = '  + evt.clientY 
  +' screenX = ' + evt.screenX 
  +' screenY = ' + evt.screenY
  +'\n Inside Object Size:'+FirstAPos
 )
 return true;
}
document.body.onclick = handleEvent;
}

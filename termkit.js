const CDP = require('chrome-remote-interface');
var blessed = require('blessed');
var fs = require('fs');
//var wcwidth = require('wcwidth');

var screen = blessed.screen();

//exit when user preses one of the quit keys
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

var StyleConfig = require('./include/config.js');

var gui_code = require('./include/gui.js');
var gui = gui_code.browser_gui_setup(screen, blessed, StyleConfig);
var bless_tab_gui = gui_code.tab_gui_setup(gui, blessed, StyleConfig)
var Page, DOMSnapshot, LayerTree, Emulation, Target;


bless_tab_gui.debug_button.on('press', function(){
	Promise.all([
		Page.getLayoutMetrics(),
		Target.getTargets()
	])
	.then(function(val){
		metr = val[0];
		gui.console_box.unshiftLine('The VisibleSize is width: '+metr.layoutViewport.clientWidth+' height: '+metr.layoutViewport.clientHeight);
		screen.render();
		//console.log(val[1])
	}).catch(function(err){
		console.log("Failed to set browser size", err);
		process.exit(0);
	});
	
		Emulation.setVisibleSize({width: terminalConverter.browserSize.width, height: terminalConverter.browserSize.height})
		.then(function(){
			gui.console_box.unshiftLine('Tired to set the VisibleSize to width: '+terminalConverter.browserSize.width+' height: '+terminalConverter.browserSize.height);
			//handle_browser_tab(client);
		}).catch(function(err){
			console.log("Failed to set browser size", err);
			process.exit(0);
		});
	
});



function m(x){
	return x*3.5
}
function write_debug_file(boxes){
	
	str = "";
	for(x in boxes){
		var box = boxes[x];
		dim = "width:"+m(box.width)+"px;";
		dim += "height:"+m(box.height)+"px;";
		dim += "left:"+m(box.left)+"px;";
		dim += "top:"+m(box.top)+"px;";
		str += "<div style=\""+dim+"\">"+box.content+"</div>";
	}
	fs.writeFileSync('./debug.html', '<html><style>body{font-size:5}div{border: 1px solid black;position:absolute;}</style><body>'+str+'</body></html>');
}

function render_from_dom(dom_snap, view_port){

		//console.log(dom_snap);
		//process.exit(0);


		//dom_snap.layoutTreeNodes
			
		//Clear old layers
		for(x in view_port.children){
			view_port.children[x].detach();
		}

		//Draw new layers	
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
		//var last_node = false;
		for(layout_node in dom_snap.layoutTreeNodes){
			var lay_nod = dom_snap.layoutTreeNodes[layout_node];
			var dom_nod =  dom_snap.domNodes[lay_nod.domNodeIndex]
			//console.log(dom_nod)
			lay_nod.boundingBox;
			var bless_data = {
				left: terminalConverter.getTerminalX(lay_nod.boundingBox.x),
				top: terminalConverter.getTerminalY(lay_nod.boundingBox.y),

				width: terminalConverter.getTerminalX(lay_nod.boundingBox.width),
				height: terminalConverter.getTerminalY(lay_nod.boundingBox.height),

				content: ''+layout_node,
				//border:{type:'line'},
				style:{}

			};
			if(typeof(dom_nod.nodeValue) != 'undefined'){
				bless_data.content = dom_nod.nodeValue;
				//console.log(dom_nod.textValue);
			}
			if(typeof(lay_nod.styleIndex) != 'undefined'){
				computedStyles = dom_snap.computedStyles[lay_nod.styleIndex];
				if(computed_styles[lay_nod.styleIndex]['background-color'] != 'rgba(0, 0, 0, 0)'){
					rgb = GetRGB(computed_styles[lay_nod.styleIndex]['background-color'], 'rgb');
					bless_data.style.bg = rgb
/*
					for(o in dom_nod.childNodeIndexes){
						var index = dom_nod.childNodeIndexes[o]
						if(typeof(dom_snap.domNodes[index].layoutNodeIndex) != 'undefined'){
							ChildLayout = dom_snap.layoutTreeNodes[dom_snap.domNodes[index].layoutNodeIndex];
							computed_styles[ChildLayout.styleIndex]['background-color'] = computed_styles[lay_nod.styleIndex]['background-color'];
							//ChildLayout.
						}
					}
*/
					//console.log(rgb);
					//console.log(layout_node, lay_nod.boundingBox, bless_data, computedStyles);
				}else{
					//console.log(computed_styles[lay_nod.styleIndex]['background-color']);
					bless_data.style.transparent = true;
					//bless_data.style.bg = '#ff0000';
				}
				
			}
			bless_data.parent = view_port;
			if(lay_nod.boundingBox.width > 0 && lay_nod.boundingBox.height > 0){
				boxes.push(bless_data);
				lay_nod.bless_box = blessed.box(bless_data);
			}
		}

		write_debug_file(boxes)

}


function update_view_port(){
	//Get a snapshot of the DOM 
	DOMSnapshot.getSnapshot({computedStyleWhitelist:['background-color', 'color']})
	.then(function(dom_snap){
			//Take the dom snapshot and make blessed boxes
			render_from_dom(dom_snap, bless_tab_gui.view_port);
			screen.render();
	}).catch(function(err){
		console.error(err);
		client.close();
	});

}

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
var layer_change_times = 0;
function handle_browser_tab(){

	
	bless_tab_gui.addres_bar_url_input.on('submit', function(){
		navigate();
	});
	//screen.render();

/*
	Page.loadEventFired(function(){
		page_load_times++;
        gui.console_box.unshiftLine('page has loaded: '+page_load_times);
		screen.render();
		//console.log('page has loaded');
    });
*/

	//Capture Layers for this page
	//the layer tree never chnages it is the wrong thing to use
    //LayerTree.layerTreeDidChange(function(layers){
    Page.loadEventFired(function(layers){
		page_load_times++;
        gui.console_box.unshiftLine('page has loaded: '+page_load_times);

		update_view_port();
	//layer_change_times++;
        //gui.console_box.unshiftLine('layerTreeDidChange: '+layer_change_times);
        //gui.console_box.unshiftLine('layerPainted: '+layer_change_times);
		

		//DOMSnapshot.getSnapshot({computedStyleWhitelist:['background-color', 'color']})
		//Target.getTargets().then(function(dom_snap){console.log(dom_snap)}).catch(function(){})
		//Target.getTargets().then(function(dom_snap){console.log(dom_snap)}).catch(function(){})
		
		//console.log(layers.layers);
		//process.exit(0);
		//return;
		//Styles= 
	/*		

			//Draw new layers	
			var layer_by_id = {};
			for(x in layers.layers){
				var layer = layers.layers[x];
				layer_by_id[layer.layerId] = layer;
			}
			
			for(layer_id in layer_by_id){
				var layer = layer_by_id[layer_id];
				var bless_data = {
					parent: bless_tab_gui.view_port,
					left: terminalConverter.getTerminalX(layer.offsetX),
					top: terminalConverter.getTerminalY(layer.offsetY),

					width: terminalConverter.getTerminalX(layer.width),
					height: terminalConverter.getTerminalY(layer.height),

					content: 'layer: '+layer_id,
					border:{type:'line'}
				};
				if(typeof(layer.parentLayerId) != 'undefined'){
					bless_data.parent = layer_by_id[layer.parentLayerId].bless_box;
				}
				//console.log(bless_data);
				layer.bless_box = blessed.box(bless_data);
				
			}
*/
    });

    //enable events then start!
    Promise.all([
        LayerTree.enable(),
        Page.enable(),
		Page.getLayoutMetrics(),
		Target.getTargets(),
		Emulation.setDeviceMetricsOverride({
			screenWidth: terminalConverter.browserSize.width,
			screenHeight: terminalConverter.browserSize.height,
			width: terminalConverter.browserSize.width,
			height: terminalConverter.browserSize.height,
			//width: 0,
			//height: 0,
			mobile: false,
			deviceScaleFactor: 1
		})
    ]).then(function(values){
		//console.log(values[2].visualViewport.clientWidth);
		//console.log(terminalConverter.browserSize);
		//console.log(values[2].layoutViewport);
		//
		//console.log(values[3]);
        //client.close();
		//process.exit(0);

		gui.console_box.unshiftLine('The VisibleSize is width: '+values[2].layoutViewport.clientWidth+' height: '+values[2].layoutViewport.clientHeight);

        //terminalConverter.browserSize.width = values[2].visualViewport.clientWidth;
        //terminalConverter.browserSize.height = values[2].visualViewport.clientHeight;
        //
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

		//var url = 'https://github.com';
		var url = 'https://www.facebook.com/';
		//var url = 'http://news.ycombinator.com/';
		bless_tab_gui.addres_bar_url_input.setValue(url);
		screen.render();
		navigate();
    }).catch(function(err){
        console.error(err);
        client.close();
    });

}

//Open a conection to chrome we start with an active page use the Target Domain to Create and alter tabs
CDP(function(recived_client){
		client = recived_client;
		Page = client.Page;
		Target = client.Target;
		DOMSnapshot = client.DOMSnapshot;
		LayerTree = client.LayerTree
		Emulation = client.Emulation;

		//Create a tab(we dont need to as chrome deos that by itself the first time)
		//
		/*
		
		//first we kill all the old targets
		Target.getTargets().then(function(targets){
			for(x in targets.targetInfos){
			//console.log("old targets:", targets)
				//gui.console_box.unshiftLine('kill target: '.targets.targetInfos[x].targetId);
			console.log("kill target:",targets.targetInfos[x])
				//screen.render();
				Target.closeTarget(targets.targetInfos[x]).then(function(ok){
				if(!ok.success){
					gui.console_box.unshiftLine('failed to close old target');
					screen.render();
				}
				}).catch(function(){})
			}
			//process.exit(0);
		//console.log(dom_snap)
		}).catch(function(){})
		//First we create our target
		Target.createTarget({'url':'https://www.facebook.com/',width: terminalConverter.browserSize.width, height: terminalConverter.browserSize.heigth}).then(function(targetId){

        gui.console_box.unshiftLine('created: '+targetId.targetId);
		//screen.render();
//console.log(targetId.targetId);

//console.log
		//process.exit(0);
	//pacn

				
				Target.attachToTarget(targetId).then(function(){
					Target.activateTarget(targetId).then(function(){
					}).catch(function(err){
						console.error(err);
						client.close();
					});

				}).catch(function(){});
		}).catch(function(err){
			console.error(err);
			client.close();
		});
		*/

		Emulation.setVisibleSize({width: terminalConverter.browserSize.width, height: terminalConverter.browserSize.height})
		.then(function(){
			gui.console_box.unshiftLine('Tired to set the VisibleSize to width: '+terminalConverter.browserSize.width+' height: '+terminalConverter.browserSize.height);
			handle_browser_tab(client);
		}).catch(function(err){
			console.log("Failed to set browser size", err);
			process.exit(0);
		});

    }).on('error', function(err){
		// cannot connect to the remote endpoint
		console.error(err);
		console.log("start chrome: google-chrome --headless --remote-debugging-port=9222 ''")
		///Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222
});


var settings = {
	ScrollMultiplier: 0.5,
	DefaultFontFix: true,
    //HomePage: "http://www.svt.se/"
    //HomePage: "https://github.com/callesg/termkit"
    //HomePage: "https://www.youtube.com/"
    //HomePage: "https://www.facebook.com/"
    HomePage: "https://news.ycombinator.com/"
    //HomePage: "http://en.wikipedia.org/wiki/Portal:Featured_content"
    //HomePage: "http://www.w3schools.com/jsref/jsref_indexof_array.asp"
    //HomePage: "https://www.webkit.org/blog/116/webcore-rendering-iii-layout-basics/"
};


var termKitState = {
    ActiveTab: null
};


var terminalConverter = {
    FontSize: 12,//the font size of the console 
    FontAspectRatio: 0.5833333, //The asspect ratio of the console font //We use the Courier font as is is the most comon monospace font
    browserSize: {},

	//gets the simulated pixel width and height of the browser
    getBrowserSize: function(){
		//console.log("screen height: "+ (gui.view_port.height*19))
		//console.log(gui.view_port.width, gui.view_port.height)
		//process.exit(0);
        terminalConverter.browserSize.width = Math.round(terminalConverter.FontSize*terminalConverter.FontAspectRatio*gui.view_port.width);
        terminalConverter.browserSize.height = Math.round(terminalConverter.FontSize*gui.view_port.height);


		//use a fixed size when debuging some things
		//if(dbg){
			//terminalConverter.browserSize.height = 768;
			//terminalConverter.browserSize.width = 1024;
        //}
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
    },
	//dont Know what this does XXXXX
	getTerminalPos: function(Pos, Size, BrowsPosRelativeTo, IsLayer){
		var PosRelativeTo = [0,0];
        if(typeof(BrowsPosRelativeTo) != 'undefined'){
			PosRelativeTo = [terminalConverter.getTerminalX(BrowsPosRelativeTo[0]), terminalConverter.getTerminalY(BrowsPosRelativeTo[1])];
		}
		var OnlyPos = false;
        if(!Size){
			Size = [0,0];
			OnlyPos = true;
		}
        var Rets = {
            left: terminalConverter.getTerminalX(Pos[0])-PosRelativeTo[0],
            top: terminalConverter.getTerminalY(Pos[1])-PosRelativeTo[1],
            right: terminalConverter.getTerminalX(Pos[0]+ Size[0])-PosRelativeTo[0],
            bottom: terminalConverter.getTerminalY(Pos[1]+ Size[1])-PosRelativeTo[1],
        };
		if(OnlyPos){
			return(Rets);
		}
        Rets.width = Rets.right - Rets.left;
        Rets.height = Rets.bottom - Rets.top;
        if(Rets.width <= 0 || Rets.height <= 0){
			if(IsLayer){
				Rets.width = 0;
				Rets.height = 0;
			}else{
				return(false);
			}
        }
        return(Rets);
    }
};

//Caclulate wanted browser size but chrome will use the size it wants unless it is headless
terminalConverter.getBrowserSize();

var Tabs = [];

//User presses ctrl+r for a reload
screen.key(['C-r'], function(ch, key) {
	
	//clear screen so that the user can sa there has been a refresh
	update_view_port();
	screen.render();
	
/*
    renderTab(Tabs[termKitState.ActiveTab], function(){
        screen.render();
    });
*/
});
screen.key(['pageup'], function(ch, key) {//PgUp
	//BlessChangeScroll(-Math.round(settings.ScrollMultiplier*ViewPort.height), Tabs[termKitState.ActiveTab].ViewPort);
	//BlessChangeScroll(-1, Tabs[termKitState.ActiveTab].ViewPort);
    //screen.render();//Manual scroll does not call render
});
screen.key(['pagedown'], function(ch, key) {//PgDown
	//BlessChangeScroll(Math.round(settings.ScrollMultiplier*ViewPort.height), Tabs[termKitState.ActiveTab].ViewPort);
	//BlessChangeScroll(1, Tabs[termKitState.ActiveTab].ViewPort);
    //screen.render();//Manual scroll does not call render
});

//Debug find key name
/*screen.on('keypress', function(ch, key) {
	console.log('ch', ch, 'key', key)
});*/
screen.key(['backspace'], function(ch, key) {
	//Tabs[termKitState.ActiveTab].PhantomTab.goBack()
	
	//BrowserActions.clearTab(Tabs[termKitState.ActiveTab]);
	//screen.render();

    //renderTab(Tabs[termKitState.ActiveTab], function(){
        //screen.render();
    //});
});

screen.on('resize', function(){
    gui.view_port.height = screen.height - gui.top_menu.height - gui.console_box.height;
    terminalConverter.getBrowserSize();
/*
    for(tbid in Tabs){
        Tabs[tbid].PhantomTab.set('viewportSize', terminalConverter.browserSize);
        renderTab(Tabs[tbid], function(){
            screen.render();
        });
    }
  */  
});

var phantomProccess = null;
var ConsoleMessageId = 0;
var sysEvents = {
    OnPhantomLoaded: function(){
		var UrlToLoadOnStart = settings.HomePage;
		if(typeof(process.argv[2]) != 'undefined'){
			UrlToLoadOnStart = process.argv[2];
		}
        //BrowserActions.newTab(UrlClean(UrlToLoadOnStart, 'Argv'));
        //screen.render();
    },
    OnPhantomNotice: function(){
		ConsoleMessageId += 1;
		var args = Array.prototype.slice.call(arguments);
        ConsoleBox.unshiftLine(""+ConsoleMessageId+" "+args.join(" "));
    },
    OnTermkitNotice: function(){
		ConsoleMessageId += 1;
		var args = Array.prototype.slice.call(arguments);
        ConsoleBox.unshiftLine(""+ConsoleMessageId+" "+args.join(" "));
    },
};


/*
phantom.create({
        binary: "./patched_phantomjs",
        //binary: "./phantomjs",
        onStderr: function(textData){
            sysEvents.OnPhantomNotice('PhantomStdErr: '+textData);
        },
        onStdout: function(textData){
            sysEvents.OnPhantomNotice('PhantomStdOut: '+textData);
        },
        onExit: function(code, signal){
            sysEvents.OnPhantomNotice('PhantomExit: Code:'+code+' Signal:'+signal);
        }
    }, function(phant){
    phantomProccess = phant;
    sysEvents.OnPhantomLoaded();
});
*/


var BrowserActions = {
	clearTab: function(Tab){
		var Kids = [];
		Tab.ViewPort.focus();
		Tab.ViewPort._children = false;
		//Tab.ViewPort._refresh();
		Tab.ViewPort.setText("");
		for(var cid in Tab.ViewPort.children){
			Kids.push(Tab.ViewPort.children[cid]);
		}
		Kids.forEach(function(Kid){
			Kid.detach();
		});
	},
	reloadTab: function(Tab){
		Tab.PhantomTab.reload();
	},
    newTab: function(url){
        var loadWebsite = true;
        if(typeof(url) == 'undefined'){
            loadWebsite = false;
            url = '';
        }
                
        //Get A tab from phantom 
        /*
        phantomProccess.createPage(function(PTab){
            Tab.PhantomTab = PTab;
			Tab.IsLoading = false;
            Tab.PhantomTab.set('onNavigationRequested', function(url, type, willNavigate, main){
				if(main){
					Tab.IsLoading = true;
					sysEvents.OnPhantomNotice("onNavigationRequested:", type, url);
					Tab.BarUrlInput.setValue(url);
					BrowserActions.clearTab(Tab);
					screen.render();
				}
            });
            Tab.PhantomTab.set('onLoadFinished', onLoadFinished);
			function onLoadFinished(status){
				if(Tab.IsLoading){
					Tab.ViewPort.resetScroll();
					sysEvents.OnPhantomNotice("onLoadFinished:", status);
					if(status !== 'success'){
						Tab.ViewPort.setText("Error when loading page: "+status);
						screen.render();
					}else{
						BrowserActions.clearTab(Tab)
						Tab.ViewPort.style.bg = StyleConfig.DefaultTabBgColor;
						screen.render();
						
						renderTab(Tab, function(){
							screen.render();
						});
					}
					Tab.IsLoading = false;
				}else{
					sysEvents.OnPhantomNotice("got onLoadFinished but nothing was loading");
				}
				//Tab.PhantomTab.set('onLoadFinished', onLoadFinished);
			}

			Tab.PhantomTab.set('onAlert', function(msg) {
				sysEvents.OnPhantomNotice(msg);
            });
            
            Tab.PhantomTab.set('viewportSize', terminalConverter.browserSize);
            
            Tabs.push(Tab);
            Tab._id = Tabs.length - 1;
            
            termKitState.ActiveTab = Tab._id;

            Tab.BarUrlInput.setValue(url);
            function OnUrlSubmit(){
				BrowserActions.clearTab(Tab)
                Tab.ViewPort.setText("Loading...");
                Tab.ViewPort.style.bg = '#e86b55';
                screen.render();
                Tab.PhantomTab.open(UrlClean(Tab.BarUrlInput.value, 'UrlBar'), function(status){
                });
            }
            Tab.BarUrlInput.on('submit', OnUrlSubmit);

            if(loadWebsite){
                OnUrlSubmit();
            }else{
                Tab.BarUrlInput.focus();
            }
        });
		*/
    }
};

//sysEvents.OnPhantomLoaded();

function renderTab(Tab, OnDone){
    
	//Reset Focus before removing elements
	//Tab.ViewPort.focusFirst();
    //Remove old children from previus render this may not be so good as we
    //will loose stuff like input state when doing it
    /*for(childId in Tab.ViewPort.children){
        Tab.ViewPort.remove(Tab.ViewPort.children[childId]);
        delete Tab.ViewPort.children[childId];
    }*/
	BrowserActions.clearTab(Tab);


	//Tab.PhantomTab.evaluate(DbgShowMouseClicks,function(){});//For debuging mouse cliking of elements in webkit

	
	//Sometimes it is benefical to alter the page so it is more like the
	//terminal somtimes it is not it depends on the page layout
	if(Tab.AlterTextSizeBox.checked){
		Tab.PhantomTab.evaluate(function() {
			if(!document.body){
				return;
			}
			elems = document.body.getElementsByTagName("*");
			for(i in elems){
				if(elems[i].style){
					elems[i].style.fontFamily = "courier";
					elems[i].style.lineHeight = "1";
					elems[i].style.fontSize = "12px";
					elems[i].style.verticalAlign = 'inherit';
				}
			}
		},function(){});
	}
	
	//Get the dom tree and the render tree then use them to "render" the page.
	JSdomInfo(Tab, function(jsLadderIndex){
		Tab.jsLadderIndex = jsLadderIndex;
		TREErender(Tab, OnDone);
		
	});
}


function findOwner(Element, InheritAttrib, NotInheritable){
	if(typeof(NotInheritable) != 'undefined'){
		if(typeof(Element[InheritAttrib]) != 'undefined'){
			return(Element);
		}
	}else{
		if(typeof(Element.Inheritable) != 'undefined' && typeof(Element.Inheritable[InheritAttrib]) != 'undefined'){
			return(Element);
		}
	}
	
	if(typeof(Element._owner) != 'undefined' && Element._owner != -1){
		return(findOwner(Element._owner, InheritAttrib, NotInheritable));
	}
	return(false);
}

var DebugElementTypes = [
	//"TD",//Causes the main Problem 
];
var StrangTypes = [
	"RenderBR",//BR is not rendereble
	"RenderInline",//Is just a bounding box for text
	"RenderText",//Are not actual elements
	"RenderTableRow",//Table Rows are always posisioned wrongly
];

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

//gets element info from the dom
function JSdomInfo(Tab, OnDone){
	
	var jsLadderIndex = {};
    Tab.PhantomTab.evaluate(function() {
        function allNodes(Node, StyleValuesOrg){
          var RetObj = {type: Node.nodeName, children: []};
          var BgImage = false;
          if(!StyleValuesOrg){
            StyleValuesOrg = {};
          }
          var StyleValues = {};
          for(var styleKey in StyleValuesOrg){
            StyleValues[styleKey] = StyleValuesOrg[styleKey];
          }
          var IntrestingBox = false;
          if(Node.style){
            IntrestingBox = true;
            Cstyle =  window.getComputedStyle(Node, null);
            if(Cstyle.backgroundColor != 'rgba(0, 0, 0, 0)'){
              IntrestingBox = true;
              StyleValues.backgroundColor = Cstyle.backgroundColor;
            }
            if(Cstyle.backgroundImage != 'none'){
              IntrestingBox = true;
              BgImage = Cstyle.backgroundImage;
            }
            if(Cstyle.visibility == 'hidden'){
				RetObj.hidden = true;
            }
            if(Cstyle.backgroundColor == 'rgba(0, 0, 0, 0)' && BgImage){
              //delete StyleValues.backgroundColor;
            }
            StyleValues.color = Cstyle.color;
          }
          if(IntrestingBox){
              RetObj.color = StyleValues.color;
              if(StyleValues.backgroundColor){
                RetObj.backgroundColor = StyleValues.backgroundColor;
              }
              if(BgImage){
                RetObj.backgroundImage = BgImage;
              }
		  }
          for(var num=0; num < Node.childNodes.length; num++){
            var Chd = allNodes(Node.childNodes.item(num), StyleValues)
            if(Chd){
              RetObj.children.push(Chd);
            }
          }
          return(RetObj);
        }

        return(allNodes(this.document));
    },function(NodeTree){

		
        
        walkJsNodeTree(NodeTree, function(Node, FromOwner){
            //console.log(Node.type, Node.text , Node.backgroundColor, Node.backgroundImage, Node.color, Node.rects);
			if(typeof(FromOwner.Ladder) == 'undefined'){
				FromOwner.Ladder = "root";
			}
			if(FromOwner.Ladder == "root" && Node.type == "#document"){
			}else{
				FromOwner.Ladder += ","+Node.type
			}
			Node.Ladder = FromOwner.Ladder;
			if(typeof(jsLadderIndex[Node.Ladder]) == 'undefined'){
				jsLadderIndex[Node.Ladder] = [];
			}
			jsLadderIndex[Node.Ladder].push(Node);
            Node.StyleObj = {};
			if(typeof(FromOwner.Counter) == 'undefined'){
				FromOwner.Counter = 0;
			}else{
				FromOwner.Counter++;
			}
			
			if(Node.backgroundImage){//Somehow i need to convert to image to a usable format
				//For now letts just hope the image is some kind of
				//filter like a gradient that contains a rgb value if
				//not we ignore the image
				var RgVal = GetRGB(Node.backgroundImage, 'rgb');
				//console.log(Node.backgroundImage, RgVal)
				if(RgVal){
					Node.StyleObj.bg = RgVal;
				}
			}
            return(FromOwner);
        });
        OnDone(jsLadderIndex);
    });
}

function walkJsNodeTree(NodeTree, callback, FromOwner){
    if(typeof(FromOwner) == 'undefined'){
        var FromOwner = {};
    }
	if(Array.isArray(NodeTree)){
		NodeTree = {children: NodeTree};
	}else{
		FromOwner = callback(NodeTree, clone(FromOwner));
		if(FromOwner == false){
			return(false);
		}
	}
    for(var childnum in NodeTree.children){
        walkJsNodeTree(NodeTree.children[childnum], callback, FromOwner);
    }
}

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

function PreDump(S, cache, cacheInfo, road){
    if(typeof(cache) == 'undefined'){
        cache = [];
        cacheInfo = [];
        road = [];
    }
    var Dp = {};
    for(var key in S){
        road.push(key);
        var roadJoin = road.join('.');
        var cacheid = cache.indexOf(S[key]);
        if (cacheid == -1) {
            if(typeof(S[key]) == 'object' && S[key] !== null){
                cacheInfo.push([roadJoin]);
                cache.push(S[key]);
                Dp[key] = PreDump(S[key], cache, cacheInfo, road);
            }else if(typeof(S[key]) === 'function'){
                var TmDm = PreDump(S[key], cache, cacheInfo, road);
                var FCont = S[key].toString().replace("\n    [native code]\n", "[native code]")
                if(TmDm.length == 0){
                    Dp[key] = {};
                    Dp[key][FCont] = TmDm;
                }else{
                    Dp[key] = FCont;
                }
            }else{
                Dp[key] = S[key];
            }
        }else{
            Dp[key] = "Cyclic previosly Found in: " + cacheInfo[cacheid].join(',');
            cacheInfo[cacheid].push(roadJoin);
        }
        road.pop(key);
    }
    return(Dp);
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
				parent: Box,
				top:h,
				left:w,
				height: 1,
				width: 2,
				style:{
					bg: '#E3E3E3'
				}
			});
		}
	}
	
}

function BlessGetScroll(Box){
	return(Box.childBase);
}
function BlessChangeScroll(Lines, Box){
	//Box.childBase = Lines;
	//Box.childOffset = Lines;
	Box.setScroll(Box.childBase+Box.childOffset+Lines)
	//Box.setScroll(Box.childBase+Box.childOffset+Lines)
	
	//var NrOfScrollableLines = Box.getScrollHeight();// - Box.height;
	//var PercentChange = Lines/NrOfScrollableLines;
	//('Lines', Lines, 'Tot', NrOfScrollableLines, 'He', Box.height, 'PercentChange', PercentChange)
	//sysEvents.OnPhantomNotice("Before", "InArea", Box.getScrollHeight(), 'Scroll', Lines, 'CurrScroll', Box.getScroll(), 'Perc', Box.getScrollPerc(),'Chnage', PercentChange, 'childBase', Box.childBase,'childOffset', Box.childOffset);
	//Box.scroll(Lines);
	//Box.setScrollPerc(((Box.getScrollPerc()/100)+PercentChange) * 100)
	//Box.childBase = 0;
	//sysEvents.OnPhantomNotice("After", "InArea", Box.getScrollHeight(), 'Scroll', Lines, 'CurrScroll', Box.getScroll(), 'Perc', Box.getScrollPerc(), 'childBase', Box.childBase,'childOffset', Box.childOffset);
}

function dump(In){
    console.log(JSON.stringify(In, function (k, v){
		if(k == "_owner"){
			return null;
		}
		return(v);
	}, 4));
    //console.log(JSON.stringify(In, null, 4));
    //console.log(JSON.stringify(PreDump(In), null, 4));
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

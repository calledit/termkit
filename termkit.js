const CDP = require('chrome-remote-interface');
var blessed = require('blessed');
//var wcwidth = require('wcwidth');
//
/*
CDP((client) => {
    // extract domains
    const {Network, Page} = client;
    // setup handlers
    Network.requestWillBeSent((params) => {
        console.log(params.request.url);
    });
    Page.loadEventFired(() => {
        client.close();
    });
    // enable events then start!
    Promise.all([
        Network.enable(),
        Page.enable()
    ]).then(() => {
        return Page.navigate({url: 'https://github.com'});
    }).catch((err) => {
        console.error(err);
        client.close();
    });
}).on('error', (err) => {
    // cannot connect to the remote endpoint
    console.error(err);
});
*/
/*
var blessed = require('blessed'),
    phantom = require('phantom');
var render_parser = require('./parse_rendertree.js');
*/

var screen = blessed.screen();

//exit when user preses one of the quit keys
screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

var StyleConfig = require('./include/config.js');

var gui = require('./include/gui.js').setup(screen, blessed, StyleConfig);

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
terminalConverter.getBrowserSize();

var Tabs = [];

//User presses ctrl+r for a reload
screen.key(['C-r'], function(ch, key) {
	
	//clear screen so that the user can sa there has been a refresh
	BrowserActions.clearTab(Tabs[termKitState.ActiveTab]);
	screen.render();
	
    renderTab(Tabs[termKitState.ActiveTab], function(){
        screen.render();
    });
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
        BrowserActions.newTab(UrlClean(UrlToLoadOnStart, 'Argv'));
        screen.render();
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

screen.render();

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
        var Tab = {};
		Tab.LastViewPortScroll = 0;
		Tab.SelectebleElements = [];
        Tab.BarForm = blessed.Form({
            parent: gui.top_menu,
            keys: true,
            left: 0,
            top: 1,
            width: '100%',
            height: 1,
            style: {
                'bg': StyleConfig.MenuBgColor
            }
        });
        Tab.BarUrlInput = blessed.Textbox({
            parent: Tab.BarForm,
            keys: true,
            mouse: true,
            inputOnFocus: true,
            left: 1,
            top: 0,
            width: '65%',
            height: 1,
            style: {
                'bg': StyleConfig.InputBgColor,
                'focus':{
                    'bg': StyleConfig.InputFocusBgColor,
                    'fg': StyleConfig.InputFgColor,
                },
                'hover':{
                    'bg': StyleConfig.InputHoverBgColor
                },
            }
        });

        Tab.BarSearchInput = blessed.Textbox({
            parent: Tab.BarForm,
            keys: true,
            mouse: true,
            inputOnFocus: true,
            left: '70%',
            top: 0,
            width: '15%',
            height: 1,
            style: {
                'bg': StyleConfig.InputBgColor,
                'focus':{
                    'fg': StyleConfig.InputFgColor,
                    'bg': StyleConfig.InputFocusBgColor,
                },
                'hover':{
                    'bg': StyleConfig.InputHoverBgColor
                },
            }
        });
        Tab.DumpRenderTreeButton = blessed.Button({
            parent: Tab.BarForm,
            mouse: true,
            left: '94%',
            top: 0,
			align: 'center',
            width:  6,
            height: 1,
			content: 'Dump',
            style: {
                'bg': StyleConfig.MenuButtonBgColor,
                'fg': StyleConfig.MenuButtonFgColor,
                'focus':{
                    'fg': StyleConfig.InputFgColor,
                    'bg': StyleConfig.InputFocusBgColor,
                },
                'hover':{
                    'bg': StyleConfig.InputHoverBgColor
                },
            }
		});
		Tab.DumpRenderTreeButton.on('press', function(){
			if(typeof(Tab.LastRenderTree) != 'undefined'){
				ShowRenderTree(Tab.LastRenderTree);
				dbgclear();
			}else{
				sysEvents.OnPhantomNotice("No Render Tree to dump.");
			}
		});
        Tab.AlterTextSizeBox = blessed.Checkbox({
            parent: Tab.BarForm,
            mouse: true,
			checked: settings.DefaultFontFix,
            left: '85%',
            top: 0,
            width:  13,
            height: 1,
            style: {
                'bg': StyleConfig.MenuBgColor,
                'fg': StyleConfig.MenuFgColor,
                'focus':{
                    'fg': StyleConfig.InputFgColor,
                    'bg': StyleConfig.InputFocusBgColor,
                },
                'hover':{
                    'bg': StyleConfig.InputHoverBgColor
                },
            }
        });
		Tab.AlterTextSizeBox.text = 'Font Fix';
		//We need to reload the entire page to reset the fonts
		Tab.AlterTextSizeBox.on('uncheck', function(){
			BrowserActions.reloadTab(Tab);
		});
		Tab.AlterTextSizeBox.on('check', function(){
			renderTab(Tab, function(){
				screen.render();
			});
		});
		
        Tab.ViewPort = blessed.Form({
            parent: gui.view_port,
            mouse: true,
            keys: true,
            scrollable: true,
			alwaysScroll: true,
			//noOverflow:true,
			//baseLimit: 0,
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            style: {
                'bg': StyleConfig.ViewPortBgColor
            }
        });

		//Scroll phantom when we scroll blessed
		Tab.ViewPort.on('scroll', function(){
			var BlessLinesY = BlessGetScroll(Tab.ViewPort);
			Tab.LastViewPortScroll = terminalConverter.getBrowserY(BlessLinesY);
			Tab.PhantomTab.set('scrollPosition', {top:Tab.LastViewPortScroll,left:0});
		});

        
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

sysEvents.OnPhantomLoaded();

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

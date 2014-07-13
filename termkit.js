var blessed = require('blessed'),
    phantom = require('phantom');
var render_parser = require('./parse_rendertree.js');

var screen = blessed.screen();


screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

var StyleConfig = {
    MenuBgColor: '#C1C1C1',
    ViewPortBgColor: '#FFFFFF',
    InputBgColor: '#FFFFFF',
    InputFgColor: '#000000',
    InputFocusBgColor: 'red',
    InputHoverBgColor: '#F7A3F1',
    ConsoleBgColor: '#777777',
    DefaultTabBgColor: '#FFFFFF',
    DefaultTabFgColor: '#000000',
};

var settings = {
    //HomePage: "https://www.youtube.com/"
    //HomePage: "https://www.facebook.com/"
    HomePage: "https://news.ycombinator.com/"
    //HomePage: "http://www.w3schools.com/jsref/jsref_indexof_array.asp"
    //HomePage: "https://www.webkit.org/blog/116/webcore-rendering-iii-layout-basics/"
};


var termKitState = {
    ActiveTab: null
};



var TopMenu = blessed.box({
    parent: screen,
    left: 0,
    top: 0,
    width: '100%',
    height: 3,
    style: {
        'bg': StyleConfig.MenuBgColor
    }
});

var ConsoleBox = blessed.box({
    parent: screen,
    left: 0,
    top: TopMenu.height,
    bottom: TopMenu.height,
    width: '100%',
    height: 2,
    mouse: true,
    scrollable: true,
    style: {
        'bg': StyleConfig.ConsoleBgColor
    }
});

var ViewPort = blessed.box({
    parent: screen,
    left: 0,
    top: TopMenu.height + ConsoleBox.height ,
    width: '100%',
    height: screen.height - TopMenu.height - ConsoleBox.height,
    style: {
        'bg': StyleConfig.ViewPortBgColor
    }
});

var terminalConverter = {
    FontSize: 12,
    FontAspectRatio: 0.57, //The messured asspec ratio of the font monaco, courier has 0.43
    browserSize: {},
    getBrowserSize: function(){
        terminalConverter.browserSize.width = Math.round(terminalConverter.FontSize*terminalConverter.FontAspectRatio*ViewPort.width);
        terminalConverter.browserSize.height = Math.round(terminalConverter.FontSize*ViewPort.height);
        //terminalConverter.browserSize.height = 768;
        //terminalConverter.browserSize.width = 1024;
        return(terminalConverter.browserSize);
    },
    getTerminalX: function(browserX){
        return(Math.round(browserX/(terminalConverter.FontSize*terminalConverter.FontAspectRatio)));
    },
    getTerminalY: function(browserY){
        return(Math.round(browserY/terminalConverter.FontSize));
    },getTerminalPos: function(Pos, Size, BrowsPosRelativeTo){
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
            return(false);
        }
        return(Rets);
    }
};
terminalConverter.getBrowserSize();

var Tabs = [];

screen.key(['C-r'], function(ch, key) {
    renderTab(Tabs[termKitState.ActiveTab], function(){
        screen.render();
    });
});
screen.key(['backspace'], function(ch, key) {
	Tabs[termKitState.ActiveTab].PhantomTab.goBack()
    renderTab(Tabs[termKitState.ActiveTab], function(){
        screen.render();
    });
});
screen.on('resize', function(){
    ViewPort.height = screen.height - TopMenu.height - ConsoleBox.height;
    terminalConverter.getBrowserSize();
    for(tbid in Tabs){
        Tabs[tbid].PhantomTab.set('viewportSize', terminalConverter.browserSize);
        renderTab(Tabs[tbid], function(){
            screen.render();
        });
    }
    
});

var phantomProccess = null;

var sysEvents = {
    OnPhantomLoaded: function(){
        BrowserActions.newTab(settings.HomePage);
        screen.render();
    },
    OnPhantomNotice: function(NoticeText){
        ConsoleBox.unshiftLine(NoticeText);
    },
    OnTermkitNotice: function(NoticeText){
        ConsoleBox.unshiftLine(NoticeText);
    },
};


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

var BrowserActions = {
	clearTab: function(Tab){
		for(var cid in Tab.ViewPort.children){
			Tab.ViewPort.children[cid].detach();
		}
	},
    newTab: function(url){
        var loadWebsite = true;
        if(typeof(url) == 'undefined'){
            loadWebsite = false;
            url = '';
        }
        var Tab = {};
		Tab.SelectebleElements = [];
        Tab.BarForm = blessed.Form({
            parent: TopMenu,
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
            width: '70%',
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
            left: '75%',
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
        Tab.ViewPort = blessed.box({
            parent: ViewPort,
            mouse: true,
            scrollable: true,
            left: 0,
            top: 0,
            width: '100%',
            height: '100%',
            style: {
                'bg': StyleConfig.ViewPortBgColor
            }
        });
        
        //Get A tab from phantom 
        phantomProccess.createPage(function(PTab){
            Tab.PhantomTab = PTab;

            Tab.PhantomTab.set('onNavigationRequested', function(url, type, willNavigate, main){
				if(main){
					Tab.BarUrlInput.setValue(url);
					BrowserActions.clearTab(Tab);
					screen.render();
					
					setTimeout(function(){
						/*renderTab(Tab, function(){
							screen.render();
						});*/
						
						onLoadFinished('success');//just fing render
					},1500);
				}
            });
            Tab.PhantomTab.set('onLoadFinished', onLoadFinished);
			function onLoadFinished(status){
				if(status !== 'success'){
					Tab.ViewPort.setText("Error when loading page: "+status);
					screen.render();
				}else{
					//setNav(Tab);
					//sysEvents.OnTermkitNotice("Done Loading");
					Tab.ViewPort.setText("");
					Tab.ViewPort.style.bg = StyleConfig.DefaultTabBgColor;
					screen.render();
					
					renderTab(Tab, function(){
						screen.render();
					});
				}
				Tab.PhantomTab.set('onLoadFinished', onLoadFinished);
			}


            /*Causes phanthom to crach
			Tab.PhantomTab.set('onConsoleMessage', function(msg, lineNum, sourceId) {
				console.log(msg);
            });*/

            /*Causes Phantom to crach
			Tab.PhantomTab.set('onError', function(msg) {
				sysEvents.OnPhantomNotice(msg)
			});*/

            
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
                Tab.PhantomTab.open(UrlClean(Tab.BarUrlInput.value), function(status){
                });
            }
            Tab.BarUrlInput.on('submit', OnUrlSubmit);

            if(loadWebsite){
                OnUrlSubmit();
            }else{
                Tab.BarUrlInput.focus();
            }
        });

    }
};

function renderTab(Tab, OnDone){
    
    //Remove old children from previus render this may not be so good as we
    //will loose stuff like input state when doing it
    for(childId in Tab.ViewPort.children){
        Tab.ViewPort.remove(Tab.ViewPort.children[childId]);
        delete Tab.ViewPort.children[childId];
    }
     Tab.PhantomTab.evaluate(function() {
        if(!document.body){
            return;
        }
        elems = document.body.getElementsByTagName("*");
        for(i in elems){
            if(elems[i].style){
                elems[i].style.fontFamily = "monaco";
                elems[i].style.lineHeight = "1";
                elems[i].style.fontSize = "12px";
                elems[i].style.verticalAlign = 'inherit';
            }
        }
    },function(){});

	JSdomInfo(Tab, function(jsLadderIndex){
		Tab.jsLadderIndex = jsLadderIndex;
		TREErender(Tab, OnDone);
		
	});
}


function findOwner(Element){
	if(typeof(Element.blessBox) != 'undefined'){
		return(Element);
	}
	if(typeof(Element._owner) != 'undefined' && Element._owner != -1){
		return(findOwner(Element._owner));
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

//Renders the page based on the focusedFrameRenderTreeDump
function TREErender(Tab, OnDone){
    var testRet = Tab.PhantomTab.get('focusedFrameRenderTreeDump', function(dumpText){
		//console.log(dumpText)
		//process.exit(1);
		var HasStartedAdding = false;
        var RenderTree = render_parser(dumpText, {color: StyleConfig.DefaultTabFgColor, bgcolor: StyleConfig.DefaultTabBgColor}, function(Element, PageDefaultColorValues){


			if(typeof(Element.Ladder) != 'undefined' && typeof(Tab.jsLadderIndex[Element.Ladder]) != 'undefined' && Tab.jsLadderIndex[Element.Ladder].length != 0){
				Element.DomNode = Tab.jsLadderIndex[Element.Ladder].shift();
			}else{
				
				//console.error("Found no dom Node for render tree element it is probably a inline text box:",Element.Ladder);
			}
			
			var BgC = Element.Attrs.bgcolor;
			var BlessStyle = {
				bg: Element.Attrs.bgcolor,
				fg: Element.Attrs.color
			};
			if(typeof(Element.DomNode) != 'undefined'){
				if(typeof(Element.DomNode.StyleObj.bg) != 'undefined'){
					BlessStyle.bg = Element.DomNode.StyleObj.bg;
					Element.BgColor = true;
				}
				if(typeof(Element.DomNode.StyleObj.fg) != 'undefined'){
					BlessStyle.fg = Element.DomNode.StyleObj.fg;
				}
			}
			if(!HasStartedAdding && Element.ElemType == 'BODY'){
				HasStartedAdding = true;
                Tab.ViewPort.style.bg = PageDefaultColorValues.bgcolor;
            }
			var BlessOwner = Tab.ViewPort;
			
			var PosRelativeTo = [0,0];
			var ClosestOwnerWithBlessed = findOwner(Element);
			if(ClosestOwnerWithBlessed){
				PosRelativeTo = ClosestOwnerWithBlessed.Pos;
				BlessOwner = ClosestOwnerWithBlessed.blessBox;
				if(typeof(BlessStyle.bg) == 'undefined'){
					BlessStyle.bg = ClosestOwnerWithBlessed.blessBox.options.style.bg;
				}
				//console.log("Addding as child")
			}

			var BlesSettings = {
				parent: BlessOwner,
				//content: Element.ElemType+":"+[TermPos.left, TermPos.top].join('*')+":"+[TermPos.width, TermPos.height].join('*')+"_"+Element._id,
				style: BlessStyle
			};

			if(SelectebleElementTypes.indexOf(Element.ElemType) != -1){
				Tab.SelectebleElements.push(Element._id)
				Element.Selecteble_id = Element._id;
			}else{
				if(Element._owner && Element._owner.Selecteble_id){
					Element.Selecteble_id = Element._owner.Selecteble_id;
				}
			}
			if(Element.Selecteble_id){
				BlesSettings.clickable = true;
			}
			
			var SpecialType = false;
			
			if(Element.Type == "RenderImage"){
				Element.BgColor = true;
				SpecialType = 'IMG';
				BlessStyle.bg = "#7f7f7f";
			}

			
            if(typeof(Element.Text) == "undefined"){
				//Problems ocure when rendering stuff as it may overwrite its siblings children 
                if(Element.BgColor && HasStartedAdding && StrangTypes.indexOf(Element.Type) == -1 && Element.ElemType != 'none' &&
					DebugElementTypes.indexOf(Element.ElemType) == -1){
					
                    var TermPos = terminalConverter.getTerminalPos(Element.Pos, Element.Size, PosRelativeTo);
                    if(TermPos !== false){
						BlesSettings.left = TermPos.left;
						BlesSettings.top = TermPos.top;
						BlesSettings.width = TermPos.width;
						BlesSettings.height = TermPos.height;
						//console.log("Drawn:", Element.ElemType+":"+[TermPos.left, TermPos.top].join('*')+":"+[TermPos.width, TermPos.height].join('*')+"_"+Element._id)
						if(SpecialType != false){
							BlesSettings.content = SpecialType;
							BlesSettings.valign = 'middle';
							BlesSettings.align = 'center';
						}
						Element.blessBox = blessed.box(BlesSettings);
                    }else{
						//console.log("Size is zero Not drawn:",Element._id+"="+Element.ElemType+":"+Element.Size.join('x'))
					}
				}else{
					//console.log("Not a rendereble element:",Element._id+"="+Element.ElemType+":"+Element.Size.join('x'))
				}
            }else{
                var TermPos = terminalConverter.getTerminalPos(Element.Pos, null, PosRelativeTo);
				BlesSettings.left = TermPos.left;
				BlesSettings.top = TermPos.top;
				BlesSettings.width = Element.Text.length;
				BlesSettings.height = 1;
				BlesSettings.content = Element.Text;
				
				Element.blessBox = blessed.box(BlesSettings);
            }
			if(BlesSettings.clickable && Element.blessBox){
				Element.blessBox.on('click', function(mouse){
					BrowserActions.clearTab(Tab)
					Tab.ViewPort.style.bg = '#e86b55';
					//Tab.PhantomTab.sendEvent('click',Element.Pos[0]+10, Element.Pos[1]+12);
					Tab.PhantomTab.sendEvent('click',Element.Pos[0]+0, Element.Pos[1]+19);//i have tested an the click values that has worked is betwean 12 & 25
					screen.render();
					/*for(var k=0;15>k;k++){
								sysEvents.OnTermkitNotice("submited: "+(Element.Pos[0]+10)+"x"+ ((k*2)+5));
								Tab.PhantomTab.sendEvent('click',Element.Pos[0]+10, (k*2)+5);
								//Tab.PhantomTab.sendEvent('click',Element.Pos[0]+20, (k*2)+5);
					}*/
					//sysEvents.OnTermkitNotice("cliked("+Element.ElemType+") at"+(Element.Pos[0])+"x"+(Element.Pos[1]));
					//Element.blessBox.setContent("Got click");
					//console.log("GotC", Element.Pos[0]+4, Element.Pos[1]+4);
				});
				//Element.blessBox.on('click', (function(Elem){return(function(mouse){
				//	Elem.blessBox.setContent("Got click");
				//})})(Element));
			}

        });
		//console.log(dumpText)
		//dump(RenderTree);
		//ShowRenderTree(RenderTree);
		//dbgclear();
		//process.exit(1);
        OnDone(RenderTree);
    });   

}

function ShowRenderTree(Tree){
	for(var Num in Tree){
		var Indent = "";
		for(var k=0;Tree[Num].Indention>k;k++){
			Indent += "  ";
		}
		console.log(Indent, Tree[Num]._id, Tree[Num].Type, "<"+Tree[Num].ElemType+">", Tree[Num].Pos[0]+"x"+Tree[Num].Pos[1], Tree[Num].What, "at", Tree[Num].Where, "->", Tree[Num].childLayer);
		//console.log(Indent, Tree[Num].What, "at", Tree[Num].Where);
		if(Tree[Num].children && Tree[Num].children.length != 0){
			ShowRenderTree(Tree[Num].children);
		}
	}
}

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

function UrlClean(url){
    return(url);
}


screen.render();


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

function dump(In){
    console.log(JSON.stringify(In, null, 4));
    //console.log(JSON.stringify(PreDump(In), null, 4));
}
function dbgclear(){
	for(var k=0;screen.height*2>k;k++){
		console.log("Break");
	}
}

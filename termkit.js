var blessed = require('blessed'),
    phantom = require('phantom');
var render_parser = require('./parse_rendertree.js');

var screen = blessed.screen();


screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

var StyleConfig = {
    MenuBgColor: '#C1C1C1',
    MenuFgColor: '#000000',
    MenuButtonBgColor: '#4D4D4D',
    MenuButtonFgColor: '#FFFFFF',
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
	ScrollMultiplier: 0.5,
    HomePage: "http://www.svt.se/"
    //HomePage: "https://www.youtube.com/"
    //HomePage: "https://www.facebook.com/"
    //HomePage: "https://news.ycombinator.com/"
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
    getBrowserX: function(TerminalX){
        return(Math.round(TerminalX*terminalConverter.FontSize*terminalConverter.FontAspectRatio));
    },
    getBrowserY: function(TerminalY){
        return(Math.round(TerminalY*terminalConverter.FontSize));
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
	BrowserActions.clearTab(Tabs[termKitState.ActiveTab]);
	screen.render();
	
    renderTab(Tabs[termKitState.ActiveTab], function(){
        screen.render();
    });
});

screen.key(['down'], function(ch, key) {//PgUp
	//BlessChangeScroll(settings.ScrollMultiplier*ViewPort.height, Tabs[termKitState.ActiveTab].ViewPort);
	BlessChangeScroll(1, Tabs[termKitState.ActiveTab].ViewPort);
    screen.render();//Manual scroll does not call render
});
screen.key(['up'], function(ch, key) {//PgDown
	//BlessChangeScroll(-settings.ScrollMultiplier*ViewPort.height, Tabs[termKitState.ActiveTab].ViewPort);
	BlessChangeScroll(-1, Tabs[termKitState.ActiveTab].ViewPort);
    screen.render();//Manual scroll does not call render
});
screen.key(['backspace'], function(ch, key) {
	Tabs[termKitState.ActiveTab].PhantomTab.goBack()
	
	BrowserActions.clearTab(Tabs[termKitState.ActiveTab]);
	screen.render();

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
		var Kids = [];
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
			checked: true,
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
		
        Tab.ViewPort = blessed.box({
            parent: ViewPort,
            mouse: true,
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
						Tab.ViewPort.setText("");
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

    }
};

function renderTab(Tab, OnDone){
    
    //Remove old children from previus render this may not be so good as we
    //will loose stuff like input state when doing it
    for(childId in Tab.ViewPort.children){
        Tab.ViewPort.remove(Tab.ViewPort.children[childId]);
        delete Tab.ViewPort.children[childId];
    }


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
					elems[i].style.fontFamily = "monaco";
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

//Renders the page based on the focusedFrameRenderTreeDump
function TREErender(Tab, OnDone){
    var testRet = Tab.PhantomTab.get('focusedFrameRenderTreeDump', function(dumpText){
		//console.log(dumpText)
		//process.exit(1);
		var HasStartedAdding = false;
		var ZindexMap = [];
		var RootBless = Tab.ViewPort;/*blessed.Box({
			parent:Tab.ViewPort,
			shrink: true,
		});*/
        var RenderTree = render_parser(dumpText, {color: StyleConfig.DefaultTabFgColor, bgcolor: StyleConfig.DefaultTabBgColor}, function(Element, PageDefaultColorValues){

			var DrawBox = false;
			if(Element.BgColor){
				DrawBox = true;
			}

			if(typeof(Element.Ladder) != 'undefined'){
				if(typeof(Tab.jsLadderIndex[Element.Ladder]) != 'undefined' && Tab.jsLadderIndex[Element.Ladder].length != 0){
					Element.DomNode = Tab.jsLadderIndex[Element.Ladder].shift();
				}else{
					//We dont render iframes as that would require us to get
					//a new dom tree and there is problem with owerflow and
					//other things it is not imposible to fix but iframes is
					//generaly only used for ads (and comments) these days.
					if(Element.Ladder.indexOf("IFRAME") != -1){
						return;
					}
					//Ignore svg stuff
					if(Element.Ladder.indexOf("svg") != -1){
						return;
					}
					//console.error("Found no dom Node for render tree element it is probably a inline text box:",Element.Ladder);
				}
			}
			
			var BlessStyle = {
				bg: Element.Attrs.bgcolor,
				fg: Element.Attrs.color
			};
			if(typeof(Element.DomNode) != 'undefined'){
				if(typeof(Element.DomNode.StyleObj.bg) != 'undefined'){
					BlessStyle.bg = Element.DomNode.StyleObj.bg;
					DrawBox = true;
				}else if(typeof(Element.DomNode.backgroundImage) != 'undefined'){
					Element.BgImage = Element.DomNode.backgroundImage;
				}
				
				if(typeof(Element.DomNode.StyleObj.fg) != 'undefined'){
					BlessStyle.fg = Element.DomNode.StyleObj.fg;
				}
			}
			if(!HasStartedAdding && Element.ElemType == 'BODY'){
				HasStartedAdding = true;
                Tab.ViewPort.style.bg = PageDefaultColorValues.bgcolor;
            }

			Element.Inheritable = {};
			var BlessOwner = RootBless;
			
			var PosRelativeTo = [0,0];
			var ClosestLayerOwner = findOwner(Element._owner, 'Layer', true);
			if(ClosestLayerOwner && typeof(ClosestLayerOwner.blessBox) != 'undefined'){
				DrawBox = true;
				PosRelativeTo = ClosestLayerOwner.Pos;
				BlessOwner = ClosestLayerOwner.blessBox;
			}
			
			

			var BlesSettings = {
				parent: BlessOwner,
				style: BlessStyle,
				//shrink: false,
				//scrollable: false,
				//fixed: true,
				//childBase: 0
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
				
				//Selecteble text is underlined so one can know it is selecteble
				if(typeof(Element.Text) != "undefined"){
					BlessStyle.underline = true;
				}
			}
			if(typeof(Element.Inheritable.ZIndex) != 'undefined'){
				//Element.ZIndex = Element.Inheritable.ZIndex;
			}
			if(typeof(Element.ZIndex) != 'undefined'){
				if(typeof(ZindexMap[Element.ZIndex]) == 'undefined'){
					ZindexMap[Element.ZIndex] = [];
				}
				ZindexMap[Element.ZIndex].push(Element);
				//Element.blessBox.setFront();
			}
			
			//Handle special Types that we need "shadow dom" for
			var SpecialType = false;
			
			//I would like to convert images to assci drawings
			if(Element.Type == "RenderImage"){
				DrawBox = true;
				SpecialType = Element.ElemType;
				BlessStyle.bg = "#7f7f7f";
				BlessStyle.fg = "#000000";
			}
			//Background images cause more problems than they solve so they are inactivated
			if(false && typeof(Element.BgImage) != 'undefined'){
				DrawBox = true;
				SpecialType = Element.ElemType;
				BlessStyle.bg = "#7f7f7f";
				BlessStyle.fg = "#000000";
			}
			//We dont render SVG i would ihowever like to render them as images
			if(Element.Type == "RenderSVGRoot"){
				DrawBox = true;
				SpecialType = Element.ElemType;
				BlessStyle.bg = "#7f7f7f";
				BlessStyle.fg = "#000000";
			}
			//We dont render Iframes cause it would require more work
			if(Element.Type == "RenderPartObject"){
				DrawBox = true;
				SpecialType = Element.ElemType;
				BlessStyle.bg = "#7f7f7f";
				BlessStyle.fg = "#000000";
			}
			//we need to render elements that has ZIndex so that they get a blessbox that their kids can attach to
			if(typeof(Element.ZIndex) != 'undefined'){
				//DrawBox = true;
				if(typeof(BlessStyle.bg) == 'undefined'){
					//BlessStyle.bg = "#7f7f7f";
				}
			}

			//Save Inheritable properties
			/*if(typeof(Element.ZIndex) != 'undefined'){
				Element.Inheritable.ZIndex = Element.ZIndex;
			}*/
			var DbugTxt = "Self";
			//Inherit bg from closest owner
			if(typeof(BlessStyle.bg) == 'undefined'){
				var ClosestOwnerWithBg = findOwner(Element, 'bg');
				if(ClosestOwnerWithBg){
					BlessStyle.bg = ClosestOwnerWithBg.Inheritable.bg;
					DbugTxt = ClosestOwnerWithBg._id+"="+ClosestOwnerWithBg.ElemType;
				}else{
					BlessStyle.bg = PageDefaultColorValues.bgcolor;
				}
			}else{
				if(typeof(BlessStyle.bg) != 'undefined'){
					Element.Inheritable.bg = BlessStyle.bg;
				}
			}
			//Inherit fg from closest owner
			if(typeof(BlessStyle.fg) == 'undefined'){
				var ClosestOwnerWithFg = findOwner(Element, 'fg');
				if(ClosestOwnerWithFg){
					BlessStyle.fg = ClosestOwnerWithFg.Inheritable.fg;
				}else{
					BlessStyle.fg = PageDefaultColorValues.color;
				}
			}else{
				if(typeof(BlessStyle.fg) != 'undefined'){
					Element.Inheritable.fg = BlessStyle.fg;
				}
			}
			//Layers will always draw a background so anything inside a layer will get to inherit it
			if(typeof(Element.Layer) != 'undefined' && DrawBox){
				//BlessStyle.bg = "blue";
				//Element.Inheritable.bg = BlessStyle.bg;
			}
			
			//Create blessed elements
            if(typeof(Element.Text) == "undefined"){
				//Problems ocure when rendering stuff as it may overwrite its siblings children 
                if(DrawBox && HasStartedAdding && StrangTypes.indexOf(Element.Type) == -1 && Element.ElemType != 'none' &&
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
						if(typeof(Element.ZIndex) != 'undefined'){
							//Element.blessBox.setIndex(Element.ZIndex);
						}
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
					
					//Figure out where the midle of the element is so we can send a click event to webkit 
					var ClickX = Element.Pos[0];
					var ClickY = Element.Pos[1];
					//sysEvents.OnTermkitNotice("cliked object pos: "+(ClickX)+"x"+(ClickY));//Where did we click
					ClickY -= Tab.LastViewPortScroll;
					//sysEvents.OnTermkitNotice("Adjusted for Tab.LastViewPortScroll: "+(ClickY));//Where did we click
					var InheritSize = findOwner(Element, 'Size', true);
					if(InheritSize){
						//sysEvents.OnTermkitNotice("Outside Owner Size:", InheritSize.Size[0], InheritSize.Size[1]);//If clicking does not work
						if(typeof(Element.TextWidth) != 'undefined'){
							ClickX += Math.round(Element.TextWidth/2);
						}else{
							ClickX += Math.round(InheritSize.Size[0]/2);
						}
						ClickY += Math.round(InheritSize.Size[1]/2);
					}
					
					//sysEvents.OnTermkitNotice("cliking("+Element.ElemType+") at"+(ClickX)+"x"+(ClickY));//Where did we acctually click
					Tab.PhantomTab.sendEvent('click', ClickX, ClickY);
					screen.render();
				});
			}

        });

		for(var ZIndex in ZindexMap){
			var ElLen = ZindexMap[ZIndex].length-1;
			for(var num in ZindexMap[ZIndex]){
				var backNum = ElLen-num;
				if(ZindexMap[ZIndex][backNum].blessBox){
					//ZindexMap[ZIndex][backNum].blessBox.setFront()
				}
			}
		}
		//console.log(dumpText)
		//dump(RenderTree);
		Tab.LastRenderTree = RenderTree; 
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
		var hLay = '';
		if(typeof(Tree[Num].Layer) != 'undefined'){
			hLay = 'hasLayer';
		}
		console.log(Indent, Tree[Num]._id, Tree[Num].Type, "<"+Tree[Num].ElemType+">", Tree[Num].Pos[0]+"x"+Tree[Num].Pos[1], Tree[Num].What, "at", Tree[Num].Where,
"->", hLay);
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
    console.log(JSON.stringify(In, null, 4));
    //console.log(JSON.stringify(PreDump(In), null, 4));
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

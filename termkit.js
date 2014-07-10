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
    HomePage: "https://www.facebook.com/"
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
    getTerminalX: function(browserX){
        return(Math.round(browserX/(terminalConverter.FontSize*terminalConverter.FontAspectRatio)));
    },
    getTerminalY: function(browserY){
        return(Math.round(browserY/terminalConverter.FontSize));
    },getTerminalPos: function(Pos, Size){
        var Rets = {
            left: terminalConverter.getTerminalX(Pos[0]),
            top: terminalConverter.getTerminalY(Pos[1]),
            right: terminalConverter.getTerminalX(Pos[0]+ Size[0]),
            bottom: terminalConverter.getTerminalY(Pos[1]+ Size[1]),
        };
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
    newTab: function(url){
        var loadWebsite = true;
        if(typeof(url) == 'undefined'){
            loadWebsite = false;
            url = '';
        }
        var Tab = {};
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
            /*Tab.PhantomTab.set('onConsoleMessage', function(msg, lineNum, sourceId) {
                document.write(msg)
                //console.log('CONSOLE: ' + msg);
                //process.exit(1);
            }, function(){});
*/
            /*Tab.PhantomTab.set('onError', function(msg, trace) {

              var msgStack = ['ERROR: ' + msg];

              if (trace && trace.length) {
                msgStack.push('TRACE:');
                trace.forEach(function(t) {
                  msgStack.push(' -> ' + t.file + ': ' + t.line + (t.function ? ' (in function "' + t.function +'")' : ''));
                });
              }

              //console.error(msgStack.join('\n'));
                //process.exit(1);

            });*/
            
            Tab.PhantomTab.set('viewportSize', terminalConverter.browserSize);
            
            Tabs.push(Tab);
            Tab._id = Tabs.length - 1;
            
            termKitState.ActiveTab = Tab._id;

            Tab.BarUrlInput.setValue(url);
            function OnUrlSubmit(){
                Tab.ViewPort.setText("Loading...");
                Tab.ViewPort.style.bg = '#e86b55';
                screen.render();
                Tab.PhantomTab.open(UrlClean(Tab.BarUrlInput.value), function(status){
                    if(status !== 'success'){
                        Tab.ViewPort.setText("Error when loading page: "+status);
                        screen.render();
                    
                    }else{
                        sysEvents.OnTermkitNotice("Done Loading");
                        Tab.ViewPort.setText("");
                        Tab.ViewPort.style.bg = StyleConfig.DefaultTabBgColor;
                        screen.render();
                        
                        renderTab(Tab, function(){
                            screen.render();
                        });

                    }
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
    TREErender(Tab, OnDone);
    //JSrender(Tab, OnDone);
}

//Renders the page based on the focusedFrameRenderTreeDump
function TREErender(Tab, OnDone){
    var testRet = Tab.PhantomTab.get('focusedFrameRenderTreeDump', function(dumpText){
	//console.log(dumpText)
        render_parser(dumpText, {color: StyleConfig.DefaultTabFgColor, bgcolor: StyleConfig.DefaultTabBgColor}, function(Element, PageDefaultColorValues){
	    //console.log(Element)
	    //return;
            if(Element.ElemType == 'BODY'){
                Tab.ViewPort.style.bg = PageDefaultColorValues.bgcolor;
            }
            if(typeof(Element.Text) == "undefined"){
                if(Element.BgColor){
                    var TermPos = terminalConverter.getTerminalPos(Element.Pos, Element.Size);
                    if(TermPos !== false){
                        box = blessed.box({
                            parent: Tab.ViewPort,
                            left: TermPos.left,
                            top: TermPos.top,
                            width: TermPos.width,
                            height: TermPos.height,
                            style: {
                                'bg': Element.Attrs.bgcolor,
                                'fg': Element.Attrs.color
                            }
                        });
                        //box.setText(Element.Type+"_"+StrObj(Element.Pos)+"_"+StrObj(Element.Size)+"_"+StrObj(TermPos));
                    }
                }
            }else{
                box = blessed.box({
                    parent: Tab.ViewPort,
                    left: terminalConverter.getTerminalX(Element.Pos[0]),
                    top: terminalConverter.getTerminalY(Element.Pos[1]),
                    width: Element.Text.length,
                    height: 1,
                    style: {
                        'bg': Element.Attrs.bgcolor,
                        'fg': Element.Attrs.color
                    }
                });
                box.setText(Element.Text);
                //box.setText(StrObj(Element.Where));
                //box.setText(Element.Pos[0]+"x"+Element.Pos[1]+"");
                //console.log(Element.Pos[0]+"x"+Element.Pos[1],'Text', Element.Text);
            }
        });
        OnDone();
    });   

}

//Renders the page based on info from getClientRects
function JSrender(Tab, OnDone){
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
              delete StyleValues.backgroundColor;
            }
            StyleValues.color = Cstyle.color;
          }
          if(IntrestingBox || Node.nodeType == 3){
            var Rects = [];
            if(IntrestingBox){
                var Rect = Node.getBoundingClientRect();
                if(Rect && !(Rect.left == 0 && Rect.top == 0 && Rect.right == 0 && Rect.bottom == 0)){
                    Rects = [Rect]
                }
            }else{
                var range = document.createRange();
                range.selectNode(Node)
                Rects = range.getClientRects();
            }
            if(Rects.length > 0){
              RetObj.rects = Rects;
              RetObj.color = StyleValues.color;
              if(StyleValues.backgroundColor){
                RetObj.backgroundColor = StyleValues.backgroundColor;
              }
              if(BgImage){
                RetObj.backgroundImage = BgImage;
              }
              if(Node.nodeType == 3){
                RetObj.text = Node.nodeValue
              }
            }
          }
          for(var num=0; num < Node.childNodes.length; num++){
            var Chd = allNodes(Node.childNodes.item(num), StyleValues)
            if(Chd){
              RetObj.children.push(Chd);
            }
          }
          if(!RetObj.rects && RetObj.children.length == 0){
            return(false);
          }
          return(RetObj);
        }

        return(allNodes(this.document));
    },function(NodeTree){
        //dump(NodeTree);
        
        walkJsNodeTree(NodeTree, function(Node, FromOwner){
            //console.log(Node.type, Node.text , Node.backgroundColor, Node.backgroundImage, Node.color, Node.rects);
            if(Node.rects){
                ElPos = [Node.rects[0].left, Node.rects[0].top]
                ElSize = [Node.rects[0].width, Node.rects[0].height]
                var TermPos = terminalConverter.getTerminalPos(ElPos, ElSize);
                if(TermPos !== false){

                    var StyleObj = {};
                    if(Node.backgroundColor){
                        StyleObj.bg = GetRGB(Node.backgroundColor);
                    }else if(FromOwner.LastBgColor){//If the ower has an image has background we wont get anything so we just use the last color we saw
                        StyleObj.bg = FromOwner.LastBgColor;
                    }
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
                        if(RgVal){
                            StyleObj.bg = RgVal;
                        }
                        
                    }
                    if(Node.color){
                        StyleObj.fg = GetRGB(Node.color);
                    }
                    if(StyleObj.bg){
                        FromOwner.LastBgColor = StyleObj.bg;
                    }
                    box = blessed.box({
                        parent: Tab.ViewPort,
                        left: TermPos.left,
                        top: TermPos.top,
                        width: TermPos.width,
                        height: TermPos.height,
                        style: StyleObj
                    });
                    if(Node.text){
                        box.setText(Node.text);
                    }
                    //box.setText(StrObj(FromOwner.LastBgColor));
                    //box.setText(Node.type+"_"+FromOwner.Counter);
                }
            }
            return(FromOwner);
        });
        OnDone();
    });
}
function walkJsNodeTree(NodeTree, callback, FromOwner){
    if(typeof(FromOwner) == 'undefined'){
        var FromOwner = {};
    }
    FromOwner = callback(NodeTree, clone(FromOwner));
    for(var childnum in NodeTree.children){
        walkJsNodeTree(NodeTree.children[childnum], callback, FromOwner);
    }
}

function GetRGB(ColorText, type){
    if(typeof(type) == 'undefined'){
        type = '';
    }
    Pars = ColorText.split(type+'(');
    if(Pars.length != 2){
        return(false);
    }
    ColorParts = Pars[1].split(')')[0];
    value = ColorParts.split(',');
    if(value[3] == 0){
        return(false);
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
    console.log(JSON.stringify(PreDump(In), null, 4));
}

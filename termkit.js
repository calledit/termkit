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
    //HomePage: "https://www.facebook.com/"
    //HomePage: "https://news.ycombinator.com/"
    HomePage: "http://www.w3schools.com/jsref/jsref_indexof_array.asp"
    //HomePage: "https://www.webkit.org/blog/116/webcore-rendering-iii-layout-basics/"
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
        onStderr: function(textData){
            sysEvents.OnPhantomNotice(textData);
        },
        onStdout: function(textData){
            sysEvents.OnPhantomNotice(textData);
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
            
            Tab.PhantomTab.set('viewportSize', terminalConverter.browserSize);
            
            Tabs.push(Tab);
            Tab._id = Tabs.length - 1;

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
    
    var testRet = Tab.PhantomTab.get('focusedFrameRenderTreeDump', function(dumpText){
        render_parser(dumpText, {color: StyleConfig.DefaultTabFgColor, bgcolor: StyleConfig.DefaultTabBgColor}, function(Element, PageDefaultColorValues){
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
                //console.log('Text', Element);
            }
        });
        OnDone();
    });   
}

function StrObj(Obj){
    return(JSON.stringify(Obj));
}

function UrlClean(url){
    return(url);
}


screen.render();


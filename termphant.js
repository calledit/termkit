//var phantom = require('node-phantom');
//__dirname = '/home/self/phantomcurse';
//var process = {env:{}};
//require('./phantomjs-nodify');

sl=require('setlocale');
sl.setlocale(sl.LC_ALL, '');
var nc = require('ncurses');
//grep '-' xterm-256color.yaml |grep -o '".*'|sort|grep -o ',.*' |sed 's/[",]//g'|tr '\n' ','|sed 's/,/","/g'
var termColors = require("./terminal_colors.js");
for(i in termColors){
	termColors[i] = hexToRgb(termColors[i]);
}
function hexToRgb(hex) {
	var bigint = parseInt(hex, 16);
	var r = (bigint >> 16) & 255;
	var g = (bigint >> 8) & 255;
	var b = bigint & 255;

	return [r , g , b];
}
var phantholder = require('phantom');
//console.log(termColors)
//return;
nc.showCursor = false;
var MenuBar = {
	'window': new nc.Window(3,nc.cols),
	'url':''
};
var CurrentTabID = 0;
var tabs = [];
//MenuBar.resize(3,nc.cols);
var w = new nc.Window(nc.lines-3,nc.cols);
w.move(3,0);
//nc.colorBg(nc.colors.YELLOW);
colorPairs = 0;
TerminalColorPairs = [];
function GetColorPair(textColor, backColor){
    if(typeof(TerminalColorPairs[textColor+'_'+backColor]) == 'undefined'){
        NextColorPair = 1;
        for(colorPair in TerminalColorPairs){
            NextColorPair += 1;
            
        }
        //console.log(NextColorPair,textColor, backColor)
        TerminalColorPairs[textColor+'_'+backColor] = NextColorPair;
        nc.colorPair(NextColorPair, parseInt(textColor), parseInt(backColor));
        return(NextColorPair);
    }
    return(TerminalColorPairs[textColor+'_'+backColor]);
}

url = "http://hackaday.com/";
url = "https://www.facebook.com/";
url = "http://www.youtube.com/";
url = "https://news.ycombinator.com/";
url = "https://www.facebook.com/";
url = "https://news.ycombinator.com/";
url = "http://hackaday.com/";
settings = {
	HomePage: "https://www.facebook.com/"
};

//url = "http://upload.wikimedia.org/wikipedia/en/1/15/Xterm_256color_chart.svg";
//url = "http://1337.xkqr.org/kinds-of-programming/";

function input_box(){
    MenuBar.window.attrset(nc.colorPair(MenuBarTextColorPair));
    //MenuBar.addstr(1, 4, url);
}


MenuBarTextColorPair = GetColorPair(nc.colors.BLACK, 15);
MenuBarBacgoundColorPair = GetColorPair(7, 7);
MenuBar.window.attrset(nc.colorPair(MenuBarBacgoundColorPair));
//MenuBar.border();
//MenuBar.hline(MenuBar.width);
//MenuBar.cursor(1,0);
//MenuBar.hline(MenuBar.width);
//MenuBar.cursor(2,0);
//MenuBar.hline(MenuBar.width);
//MenuBar.refresh();
drawBox({top:0,left:0,right:MenuBar.window.width,bottom:3},MenuBar.window)
//input_box();
MenuBar.window.refresh();

function drawBox(Rect,win){
	wid = Rect.right-Rect.left;
	hi = Rect.bottom-Rect.top;
    for(line = 0;line<hi;line++){
        win.cursor(Rect.top+line,Rect.left);
		win.print("<");
        printres = win.hline(wid-2);
		if(printres != 0){
			ShowUser("res: "+printres)
		}
		win.cursor(Rect.top+line,Rect.right-1);
		win.print(">");
		if((line*wid)%2 == 0){
			//win.refresh();
		}
    }
}
function intersectRect(r1, r2) {
  return !(r2.left > r1.left+r1.width || 
           r2.left+r2.width < r1.left || 
           r2.top > r1.top+r1.height ||
           r2.top+r2.height < r1.top);
}
//MenuBar.refresh();

function colordiff(v1, v2){
    var i,
        d = 0;

    for (i = 0; i < v1.length; i++) {
        d += (v1[i] - v2[i])*(v1[i] - v2[i]);
    }
    return Math.sqrt(d);
};
function BestColorMatch(RgbColor){
    var BestDiff = 99999999999999
    var BestID = 15;
    for(colid in termColors){
        var Diff = colordiff(termColors[colid], RgbColor);
        if(Diff < BestDiff){
            BestDiff = Diff;
            BestID = colid;
        }
    }
    return(BestID);
}

//nc.colorBg(nc.colors.BLACK);
//w.resize(nc.lines-3,nc.cols);
/*
 var color = 0, pair = 1, breakout = false;
  for (var col=0; col<nc.cols; col+=3) {
    for (var ln=0; ln<nc.lines; ln++) {
      if (color === nc.numColors) {
        color = 0
        pair = 1
        //break;
      }
      nc.colorPair(pair, nc.colors.BLACK, color);
      w.attrset(nc.colorPair(pair++));
      w.addstr(ln, col, pad(color++));
    }
    if (breakout)
      break;
  }*/
CurrentPage = false;
TerminalFontSize = 12;
//0.43 is the aspect ratio of courier a comon static width font
TerminalFontAspectRatio = 0.43;
TerminalPixelWidth = Math.round(TerminalFontSize*TerminalFontAspectRatio*w.width);
TerminalPixelHeight = Math.round(TerminalFontSize*w.height);
//TerminalFontAspectRatio = (TerminalPixelHeight/w.height)/(TerminalPixelWidth/w.width);

Size_converterY = 1/TerminalFontSize;
Size_converterX = 1/(TerminalFontSize*TerminalFontAspectRatio);

BrowserSize = {width:TerminalPixelWidth,height:TerminalPixelHeight};
//console.log(TerminalPixelWidth)
//console.log(TerminalPixelHeight)
//return;
scrollPosition = { top: 0, left: 0 };


w.on('inputChar', function (c, i, isKey) {

    if(CurrentPage){
    screenChnage = false;
    if (i === nc.keys.PPAGE) {//page up
        if(scrollPosition.top == 0){
            screenChnage = false;
        }else{
            scrollPosition.top -= 70;
            if(scrollPosition.top<0){
                //nc.bell();
                scrollPosition.top = 0;
            }
            CurrentPage.set('scrollPosition', scrollPosition);
			RedrawNcurcesScreen(CurrentPage);
            screenChnage = true;
        }
    }else if(i === nc.keys.NPAGE){//page down
        CurrentPage.evaluate(function(){if(document.body)return(document.body.offsetHeight);return 0;},function(height){
            if(scrollPosition.top+BrowserSize.height<height){
                scrollPosition.top += 70;
                CurrentPage.set('scrollPosition', scrollPosition);
                RedrawNcurcesScreen(CurrentPage);
            }else{
                //nc.bell();
            }
        });
    }else if(i === nc.keys.F6){
        //MenuBar.window.attrset(nc.colorPair(MenuBarTextColorPair));
        //MenuBar.window.addstr(1, 1, "F6Pressed");
        tabs[CurrentTabID].txtinput = 'http';
		ShowUser(tabs[CurrentTabID].txtinput);
		//LoadPage("https://news.ycombinator.com/", CurrentTabID);
		tabs[CurrentTabID].mode = 'textinput';
		tabs[CurrentTabID].OnEnter = function(Url){
			LoadPage(Url, CurrentTabID);
		};
		tabs[CurrentTabID].OnChange = function(Url){
			ShowUser(Url);
		};
		
		
		
        //nc.echo = true;
    }else if(tabs[CurrentTabID].mode == 'textinput'){
		if(i === nc.keys.NEWLINE){
			var Tx = tabs[CurrentTabID].txtinput;
			var fn = tabs[CurrentTabID].OnEnter;
			tabs[CurrentTabID].mode = 'std';
			tabs[CurrentTabID].txtinput = '';
			tabs[CurrentTabID].OnEnter = function(text){};
			tabs[CurrentTabID].OnChange = function(text){};
			fn(Tx);
		}else if(!isKey){
			tabs[CurrentTabID].txtinput += c
			tabs[CurrentTabID].OnChange(tabs[CurrentTabID].txtinput);
		}
	}
    //if(screenChnage)
    //    RedrawNcurcesScreen(CurrentPage);
}
});

function ShowUser(msg){
    MenuBar.window.attrset(nc.colorPair(MenuBarTextColorPair));
    MenuBar.window.addstr(1, 1,  msg);
    //MenuBar.window.refresh()
    return(true);
}

function LoadPage(url, tabID){
	tabs[tabID].phweb.open(url, function (status) {
		if (status !== 'success') {
			//console.log('Unable to access network');
		} else {
			ShowUser(url);
			RedrawNcurcesScreen(tabs[tabID].phweb);
		}
		//phant.exit();
	});

}

phantholder.create(function(phant){
    phant.createPage(function(tabwebpage){
		CreatedTab = tabs.push({phweb:tabwebpage,mode:'std',txtinput:'', txtcursloc:0, currsorLocation:0, OnEnter:function(text){}, OnChange:function(text){}}) - 1;
		CurrentTabID = CreatedTab;
        CurrentPage = tabwebpage;
        tabwebpage.set('viewportSize', BrowserSize)
        tabwebpage.set('scrollPosition', scrollPosition);
		
		LoadPage(settings.HomePage, CreatedTab);
        //webpage.set('onAlert',function(msg){return(1);}, ShowUser);//(msg){
        //webpage.get('onAlert',function(msg){console.log('Whatis OnAlert:',msg.toString());});//(msg){
                //MenuBar.addstr(1, 0, 'CONSOLE: ' + msg + ' (from line #' + 1 + ' in "' + 2 + '")');
        //});
    });
});

function GetIntresstingNodes() {
	//setTimeout('alert("2_'+0+'")',10);
	function clone(obj) {
		if (null == obj || "object" != typeof obj) return obj;
		var copy = obj.constructor();
		for (var attr in obj) {
			if (obj.hasOwnProperty(attr)) copy[attr] = obj[attr];
		}
		return copy;
	}
	function GetRGB(ColorText){
		Pars = ColorText.split('(');
		if(Pars.length != 2){
			console.error("color is not in known format");
		}
		ColorParts = Pars[1].split(')')[0];
		value = ColorParts.split(',');
		if(value[3] == 0){
			return(false);
		}
		return(value);
I	}
	function GetBGRgb(element,ParentStyle){
		if(element.bgColor){
			value = element.bgColor;
		}else{
			return(GetRGB(ParentStyle.backgroundColor));
		}
		var HashTagPos = value.search('#');
		if(HashTagPos != -1){
			//console.log(HashTagPos);
			return(hexToRgb(value.substr(HashTagPos+1)));
		}
	}
	function hexToRgb(hex) {
		var bigint = parseInt(hex, 16);
		var r = (bigint >> 16) & 255;
		var g = (bigint >> 8) & 255;
		var b = bigint & 255;

		return [r , g , b];
	}
	function ProccessAllNodes(ParrentElement, level, InheritProps){
		var range = document.createRange();
		var ParentStyle = null;
		if(ParrentElement.style){
			ParentStyle = window.getComputedStyle(ParrentElement,null);
		}
		if(typeof(InheritProps) == 'undefined'){
			InheritProps = {'backgroundColor':[255,255,255],'color':[0,0,0]}
			IntersstingNodes.BodybackgroundColor = InheritProps.backgroundColor.slice();
		}
		if(ParentStyle){
			BGcoll = GetBGRgb(ParrentElement, ParentStyle);
			if(ParrentElement.nodeName == "BODY"){
				if(BGcoll === false){
					BGcoll = InheritProps.backgroundColor;
				}
				InheritProps.backgroundColor = BGcoll;
				//console.log(window.outerWidth)
				//echo();
				IntersstingNodes.BodybackgroundColor = BGcoll;
				
			}else if(BGcoll !== false){
				InheritProps.backgroundColor = BGcoll;
				//range.selectNodeContents(ParrentElement);
				//var Rect = range.getBoundingClientRect();
				var Rect = ParrentElement.getBoundingClientRect();
				if(!Rect || (Rect.left == 0 && Rect.top == 0 && Rect.right == 0 && Rect.bottom == 0 )){
					//node Not visible like script or title
				}else{
					IntersstingNodes.block.push({'level': level, 'pos':Rect, 'backgroundColor':InheritProps.backgroundColor.slice()});
				}
			}
			InheritProps.color = GetRGB(ParentStyle.color)
		}
		for(var elementnum = 0; elementnum < ParrentElement.childNodes.length; elementnum++){
			if(ParrentElement.childNodes[elementnum].nodeType == 3){
				var Text = ParrentElement.childNodes[elementnum].nodeValue;
				var TextLength = Text.length;
				range.selectNode(ParrentElement.childNodes[elementnum]);
				var Rects = range.getClientRects();
				var AllTextWidth = 0;
				for(var Rid=0;Rid<Rects.length;Rid++){
					AllTextWidth += Rects[Rid].width;
				}
				for(var Rid=0;Rid<Rects.length;Rid++){
					var NumChars = Math.round(Rects[Rid].width/AllTextWidth*TextLength);//We might loose chars here
					IntersstingNodes.text.push({'level': level+1, 'pos':Rects[Rid], 'backgroundColor':InheritProps.backgroundColor.slice(), 'color':InheritProps.color.slice(), 'text': Text.substr(0, NumChars)});
					Text = Text.substr(NumChars);
				}
				if(!Rect || (Rect.left == 0 && Rect.top == 0 && Rect.right == 0 && Rect.bottom == 0 )){
					//node Not visible like script or title
				}else{
				}
			}else{
				ProccessAllNodes(ParrentElement.childNodes[elementnum], level+1, clone(InheritProps));
			}
		}
	}
	var IntersstingNodes = {'text':[], 'block':[]};
	ProccessAllNodes(document, 0);
	//IntersstingNodes.text.sort(function(b, a){return b.level-a.level});
	//IntersstingNodes.block.sort(function(b, a){return b.level-a.level});
	return(IntersstingNodes);
}
function TranslateRect(Rect){
	ORect = []
	ORect.left = parseInt(Math.round(Rect.left *Size_converterX));
	ORect.right = parseInt(Math.round(Rect.right*Size_converterX));
	ORect.top = parseInt(Math.round(Rect.top *Size_converterY));
	ORect.bottom = parseInt(Math.round(Rect.bottom*Size_converterY));
	ORect.width =  ORect.right - ORect.left;
	ORect.height =  ORect.bottom - ORect.top;
	return(ORect);
}

function UseInterstingNodes(Nodes){
	
	var windowRect = {top:0,left:0,right:w.width,bottom:w.height}
	var BodybackgroundColor = BestColorMatch(Nodes.BodybackgroundColor);
	BgColorPair = GetColorPair(BodybackgroundColor,BodybackgroundColor);
	w.attrset(nc.colorPair(BgColorPair));
	drawBox(windowRect,w)
	//w.refresh();
	//w.clear()
//console.log(windowRect);
//return;
	blocks = Nodes.block;
	//blocks = [];
	for(key in blocks){
		blockRect = TranslateRect(blocks[key].pos);
		if(key == 5){
			//ShowUser(blockRect.left);
			//ShowUser(blockRect.left+"_"+blockRect.right+"_"+w.width);
		}else if(key>5){
			//break;
			
			
		}
		if(key < 5){
			//continue;
		}
		//console.log(blockRect.top, blockRect.height)
		//exit();
		if(true || intersectRect(windowRect, blockRect)){
			
			if(blockRect.bottom > w.height){
				blockRect.bottom = w.height;
			}
			if(blockRect.right > w.width){
				blockRect.right = w.width;
			}
			if(blockRect.top < 0){
				blockRect.top = 0;
			}
			if(blockRect.left < 0){
				blockRect.left = 0;
			}
			//ShowUser(blockRect.left+"_"+blockRect.right+"_"+w.width);
			//blockRect.top = Math.max(blockRect.top,0);
			//blockRect.left = Math.max(blockRect.left,0);
		//if(col>0 && col < w.width){
		//    if(ln>0 && ln < w.height){
				var backgroundColor = parseInt(BestColorMatch(blocks[key].backgroundColor));
				//MenuBar.attrset(nc.colorPair(MenuBarBacgoundColorPair));
				//MenuBar.addstr(0, 0, '_'+backgroundColor+' :');
				//MenuBar.refresh();
				//MenuBar.clear()
				//console.log(results[key].backgroundColor);
				ColorPair = GetColorPair(backgroundColor, backgroundColor);
				w.attrset(nc.colorPair(ColorPair));
				drawBox(blockRect,w)
		//    }
		}
	}
	results = Nodes.text;
//results = []
	colorPairs = 4;
	for(key in results){
		blockRect = TranslateRect(results[key].pos);
		var OrgText = results[key].text;
		/*
		MultiLines = [];
		while(results[key].text.length>blockRect.width){
			if(blockRect.width <= 0){
				//console.log("width:0");
				blockRect.width = 1;
				//return;
			}
			MultiLines.push(results[key].text.substr(0,blockRect.width))
			results[key].text = results[key].text.substr(blockRect.width);
		}*/
		//if(results[key].text.length != 0)
			//MultiLines.push(results[key].text)
		if(blockRect.top < 0 || blockRect.left < 0){
			continue;
		}
		var backgroundColor = parseInt(BestColorMatch(results[key].backgroundColor));
		var color = parseInt(BestColorMatch(results[key].color));
		ColorPair = GetColorPair(color, backgroundColor);
		w.attrset(nc.colorPair(ColorPair));
		//console.log(typeof(blockRect.top)+"_"+blockRect.top)
		w.addstr(blockRect.top, blockRect.left, OrgText);
	}
	//nc.redraw()
	w.refresh();
	w.clear()
	setTimeout(function(){
	//w.refresh();
	},1500)
}
	

function RedrawNcurcesScreen(tabwebpage){
	///a small pice of shit to get webkit to only render curier
	tabwebpage.evaluate(function() {
		if(!document.body){
			return;
		}
		elems = document.body.getElementsByTagName("*");
		for(i in elems){
			if(elems[i].style){
				elems[i].style.fontFamily = "monaco";
				elems[i].style.lineHeight = "1";
				elems[i].style.fontSize = "12px";
			}
		}
	},function(){});

	tabwebpage.evaluate(GetIntresstingNodes, UseInterstingNodes);

}

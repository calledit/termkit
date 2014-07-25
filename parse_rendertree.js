module.exports = function(focusedFrameRenderTreeDump, DefaultOwnerVal, callback){
                DefaultOwnerValues.bgcolor = DefaultOwnerVal.bgcolor;
                DefaultOwnerValues.color = DefaultOwnerVal.color;
                
                var RenderTreeDump = focusedFrameRenderTreeDump.split("\n");
                var SpacesFinder = new RegExp('^[ ]*');
                var RenderLayers = [];
                var CurrentIndention = 0;
                var CurrentLevel = [];
                var PharseLevels = [];
				ElementIndex = [];
				LayerPosSizeIndex = {};
				var IdCounter = 0;
                for(LineNum in RenderTreeDump){
                    var Line = RenderTreeDump[LineNum];
                    var LPos = Line.indexOf("haslayer");
					var hasLayer = false;
					if(LPos == 0){
						hasLayer = true;
						Line = Line.substr(8);
					}
                    var AtPos = Line.indexOf(" at ");
                    if(AtPos != -1){
                        var Indention = Line.match(SpacesFinder)[0].length;
                        var Thing = {
							'_id':-1,
							'_owner':-1,
                            'Where': Line.substr(AtPos + 4),
                            'What': Line.substring(Indention, AtPos),
                            'Indention': Indention / 2,
                            'Attrs': {},
                        };
						if(hasLayer){
							Thing.Layer = 1;//This should be the layer zindex
						}
                        
                        var typeEnd = Thing.What.indexOf(" ");
                        Thing.PosType = 'normal';
                        Thing.ElemType = 'none';
                        Thing.Addr = null;
                        if(typeEnd == -1){
                            typeEnd = Thing.What.length;
                        }else{
                            var WhatStuff = Thing.What.substr(typeEnd+1);
                            var posTypeStart = WhatStuff.indexOf("(");
                            var posTypeEnd = WhatStuff.indexOf(")");
                            if(posTypeStart != -1 && posTypeEnd != -1){
                                Thing.PosType = WhatStuff.substring(posTypeStart+1, posTypeEnd);
                                WhatStuff = WhatStuff.substr(posTypeEnd+1);
                            }

                            var AddrStart = WhatStuff.indexOf("0x");
							if(AddrStart != -1){
								WhatStuff = WhatStuff.substr(AddrStart);
								var AddrEnd = WhatStuff.indexOf(" ");
								if(AddrEnd == -1){
													AddrEnd = WhatStuff.length;
								}
								Thing.Addr = parseInt(WhatStuff.substr(0, AddrEnd));
							}
                            var zIStart = WhatStuff.indexOf("zI: ");
							if(zIStart != -1){
								zIText = WhatStuff.substr(zIStart+4);
								var zIEnd = zIText.indexOf(" ");
								if(zIEnd == -1){
									zIEnd = zIText.length;
								}
								Thing.ZIndex = parseInt(zIText.substr(0, zIEnd));
							}

                            var elemTypeStart = WhatStuff.indexOf("{");
                            var elemTypeEnd = WhatStuff.indexOf("}");
                            if(elemTypeStart != -1 && elemTypeEnd != -1){
                                Thing.ElemType = WhatStuff.substring(elemTypeStart+1, elemTypeEnd);
                                WhatStuff = WhatStuff.substr(elemTypeEnd+1);
                            }
                        
                        }
                        Thing.Type = Thing.What.substr(0, typeEnd);
                        var LocationInfo = [];
                        var WhereStr = Thing.Where;
                        if("text run" == Thing.What){
                            var ColPos = WhereStr.indexOf(": ");
							var WidthPosStr = WhereStr.substr(0, ColPos);
							Thing.TextWidth = WidthPosStr.split('width ')[1];
							Thing.TextWidth = parseInt(Thing.TextWidth);
                            LocationInfo = WhereStr.substr(0, ColPos+2).split(' ');
                            Thing.Text = WhereStr.substring(ColPos+3, WhereStr.length - 1);
                            
                            Thing.Text = UnEscapeDumpText(Thing.Text);
                        }else{
							var OrgWS = WhereStr;
                            var SqPos = WhereStr.indexOf(" [");
                            while(SqPos != -1){
                                WhereStr = WhereStr.substring(SqPos + 2, WhereStr.length);
                            	SqPos = WhereStr.indexOf("]");
								if(SqPos != -1){
									var AtText = WhereStr.substr(0, SqPos);
									WhereStr = WhereStr.substring(SqPos + 1, WhereStr.length);
									
									var Parts = AtText.split("=");
									if(Parts.length == 2){
										Thing.Attrs[Parts[0]] = Parts[1];
									}
									
									SqPos = WhereStr.indexOf(" [");
								}
                            }
                            LocationInfo = OrgWS.split(' ');
                            Thing.Size = LocationInfo[2].split('x');
                            Thing.Size = [parseInt(Thing.Size[0]), parseInt(Thing.Size[1])];
                        }
                        LocationInfo[0] = LocationInfo[0].substr(1, LocationInfo[0].length-2).split(',')
                        Thing.RelPos = [parseInt(LocationInfo[0][0]), parseInt(LocationInfo[0][1])];
						Thing._id = IdCounter++;
                        PharseLevels.push(Thing);
                        ElementIndex[Thing._id] = Thing;
                    }
                }
		/*PharseLevels.sort(function(a, b){return a.Addr-b.Addr});
		for(Ln in PharseLevels){
			var Indent = "";
			for(var k=0;PharseLevels[Ln].Indention>k;k++){
				Indent += " ";
			}
			console.log(PharseLevels[Ln].Addr,Indent, PharseLevels[Ln].What, "at", PharseLevels[Ln].Where);
		}*/
		//return;
                var Levels = GetLevel(0, PharseLevels, 0, callback);
return(Levels);
}


function UnEscapeDumpText(Text){
    var NextBack = Text.indexOf("\\");
    var ResText = '';
    while(NextBack != -1){
        ResText += Text.substr(0, NextBack);
        var EscapeType = Text.charAt(NextBack + 1);
        Text = Text.substr(NextBack + 2);
        if(EscapeType == "x"){
            var HexEnd = Text.indexOf('}');
            var Hex = Text.substring(1,HexEnd);
            ResText += String.fromCharCode(parseInt(Hex, 16));
            Text = Text.substr(HexEnd+1);
        }else{
            ResText += EscapeType;
        }
        NextBack = Text.indexOf("\\");
    }
    return(ResText + Text);
}

var ElementIndex = [];

var positionIrelevantElements = [
    'RenderTableRow',
    'RenderText',
    //'layer',
];
var LayerPosSizeIndex = {};
var DefaultOwnerValues = {//These are overriden on initiantion
    color: 'green',
    bgcolor: 'red'
};


function GetLevel(Level, PharseLevels, Owner, callback){
    var Stuff = [];
    var LayerCount = 0;
    while(PharseLevels.length != 0){
        var TxtLine = PharseLevels.shift();
		//console.log('All: Line:', '_id:', TxtLine._id, 'Type:', TxtLine.Type, 'Owner:', TxtLine._owner)
		
        if(TxtLine.Indention == Level){
			var PrevLadd = "root";
			if(typeof(Owner) != 'undefined' && typeof(Owner.Ladder) != 'undefined'){
				PrevLadd = Owner.Ladder;
			}
			if(PrevLadd == "root" && TxtLine.ElemType == "none"){
			}else{
				TxtLine.Ladder = PrevLadd+","+TxtLine.ElemType;
			}

			if(TxtLine.Type != "layer"){//Is not a layer
				if(typeof(Owner) == 'undefined'){//Is Root (The root is always a layer so this should not hapen)
					
				}else{
					TxtLine._owner = Owner;
				}
			}else{//Is a layer
			}
			if(TxtLine.Text){
				var PosRelTo = [TxtLine._owner.Pos[0], TxtLine._owner.Pos[1]];
				TxtLine.Pos = [TxtLine.RelPos[0] + PosRelTo[0], TxtLine.RelPos[1] + PosRelTo[1]];
			}else{
				TxtLine.Pos = [TxtLine.RelPos[0], TxtLine.RelPos[1]];
			}


			if(typeof(Owner) != 'undefined' && typeof(Owner.Attrs) != 'undefined'){
				if(typeof(TxtLine.Attrs.color) == 'undefined'){
					TxtLine.Attrs.color = Owner.Attrs.color;
				}
				if(typeof(TxtLine.Size) == 'undefined'){
					TxtLine.Size = Owner.Size;
				}
			}
			if("BODY" ==  TxtLine.ElemType){
				if(typeof(TxtLine.Attrs.bgcolor) != 'undefined'){
					DefaultOwnerValues.bgcolor = TxtLine.Attrs.bgcolor;
					Owner.Attrs.bgcolor = DefaultOwnerValues.bgcolor;
				}
				if(typeof(TxtLine.Attrs.color) != 'undefined'){
					DefaultOwnerValues.color = TxtLine.Attrs.color;
					Owner.Attrs.color = DefaultOwnerValues.color;
				}
			}

            if(typeof(TxtLine.Attrs.bgcolor) == 'undefined'){
                TxtLine.BgColor = false;
            }else{
                TxtLine.BgColor = true;
            }

            //delete TxtLine.RelPos;
            //delete TxtLine.Where;
            callback(TxtLine, DefaultOwnerValues);
            Stuff.push(TxtLine);
        }else if(TxtLine.Indention > Level){
            PharseLevels.unshift(TxtLine);
			//console.log("NewLevel:",Level,Stuff[Stuff.length-1])
            Stuff[Stuff.length-1].children = GetLevel(TxtLine.Indention, PharseLevels, Stuff[Stuff.length-1], callback);
			//console.log("EndLevel:",Level,Stuff[Stuff.length-1])
        }else{
            PharseLevels.unshift(TxtLine);
            return(Stuff);
        }
    }
    return(Stuff);
}

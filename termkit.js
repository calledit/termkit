var blessed = require('blessed'),
    phantom = require('phantom');

var screen = blessed.screen();

screen.key(['escape', 'q', 'C-c'], function(ch, key) {
  return process.exit(0);
});

var StyleConfig = {
    MenuBgColor: '#C1C1C1',
    ViewPortBgColor: '#FFFFFF',
    InputBgColor: '#FFFFFF',
    InputFocusBgColor: 'red',
    InputHoverBgColor: '#F7A3F1'
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

var ViewPort = blessed.box({
    parent: screen,
    left: 0,
    top: 3,
    width: '100%',
    height: screen.height - TopMenu.height,
    style: {
        'bg': StyleConfig.ViewPortBgColor
    }
});

var Tabs = [];


var BrowserActions = {
    newTab: function(url){
        if(typeof(url) == 'undefined'){
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
                    'bg': StyleConfig.InputFocusBgColor
                },
                'hover':{
                    'bg': StyleConfig.InputHoverBgColor
                },
            }
        })
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
                    'bg': StyleConfig.InputFocusBgColor
                },
                'hover':{
                    'bg': StyleConfig.InputHoverBgColor
                },
            }
        })
        
        Tab.BarForm.focus();
        Tabs.push(Tab);
        Tab._id = Tabs.length - 1;
        return(Tab);
    }
};

BrowserActions.newTab();

screen.render();


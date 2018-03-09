
module.exports = {
	//Setup the browser main GUI
	browser_gui_setup: function(screen, blessed, StyleConfig){
		
		var gui = {};

		//the top menu is there the address bar is located
		gui.top_menu = blessed.box({
			parent: screen,
			left: 0,
			top: 0,
			width: '100%',
			height: 3,
			style: {
				'bg': StyleConfig.MenuBgColor
			}
		});

		//The debug console is right under the top menu
		gui.console_box = blessed.box({
			parent: screen,
			left: 0,
			top: gui.top_menu.height,
			bottom: 3,
			width: '100%',
			height: 2,
			mouse: true,
			scrollable: true,
			style: {
				'bg': StyleConfig.ConsoleBgColor,
				'fg': StyleConfig.ConsoleFgColor
			}
		});

		//The view port is where the webpage is displayed
		gui.view_port = blessed.box({
			parent: screen,
			left: 0,
			top: gui.top_menu.height + gui.console_box.height ,
			width: '100%',
			height: screen.height - gui.top_menu.height - gui.console_box.height,
			style: {
				'bg': StyleConfig.ViewPortBgColor
			}
		});
		return gui;
	},
	//Setup the browser main GUI
	tab_gui_setup: function(gui, blessed, StyleConfig){
		var tab_gui = {};
		//Tab.LastViewPortScroll = 0;
		//Tab.SelectebleElements = [];
        tab_gui.addres_bar_form = blessed.Form({
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
        tab_gui.addres_bar_url_input = blessed.Textbox({
            parent: tab_gui.addres_bar_form,
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

        tab_gui.addres_bar_search_input = blessed.Textbox({
            parent: tab_gui.addres_bar_form,
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
        tab_gui.debug_button = blessed.Button({
            parent: tab_gui.addres_bar_form,
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

		tab_gui.debug_button.on('press', function(){

		});

        tab_gui.alter_text_size_box = blessed.Checkbox({
            parent: tab_gui.addres_bar_form,
            mouse: true,
			checked: false,
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
		tab_gui.alter_text_size_box.text = 'Font Fix';

		//We need to reload the entire page to reset the fonts
		tab_gui.alter_text_size_box.on('uncheck', function(){
			//BrowserActions.reloadTab(Tab);
		});

		tab_gui.alter_text_size_box.on('check', function(){
			//alter the fonts on the page an re render
		});
		
        tab_gui.view_port = blessed.Form({
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
		tab_gui.view_port.on('scroll', function(){
			
		});

		return tab_gui;
	}
};



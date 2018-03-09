
module.exports = {
	//Setup the GUI
	setup: function(screen, blessed, StyleConfig){
		
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
				'bg': StyleConfig.ConsoleBgColor
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
	}
};



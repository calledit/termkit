# WebKit based browser for the terminal.
Based on nodejs, chrome-remote-interface, and blessed

To enter a new url press the urlbar with our mouse
scroll with your mouse scroll wheel

## Status

Simple pages renders and are somewhat readable :)

## Looking for contributors
Please come and help with the project. 

## Similar project

https://github.com/tombh/texttop/tree/webext-rewrite


![Github screenshot](/misc/Github_rewrite.png)

## Install
```bash
git clone https://github.com/callesg/termkit.git
cd termkit
#Get dependencys
./build.sh

#start chrome with Chrome DevTools Protocol in another tab
#On OSX
/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --remote-debugging-port=9222 --headless
#On linux
google-chrome --headless --remote-debugging-port=9222

#start termkit
node termkit.js

#Your terminal emulator needs mouse support
#To scroll use your mouse scroll wheel. To browse to a website use the address bar or click on links. (the clicking is not perfect and does not always work TODO someone FIX clicking)
#Sometimes website are not renderd properly at load time, use Ctr+R to refresh the render.
#When you scroll hold your mouse to the side, if you scroll and the currsor is above a link the page will not scroll.
#Exit the browser with Esc or Q

#TODO someone add keyboard support

```


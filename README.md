# WebKit based browser for the terminal.
Based on nodejs, phantomjs, and blessed

To enter a new url press the URL-bar with your mouse.
Scroll with your mouse scroll wheel

## Status

The browser is functional forms are not yet implemented

### Switch to a more solid base
It would be preferable if termkit integrated directly with the layout engine.
Instead of through phantomjs as it is right now. That might take some more
extensive work.
 


![Facebook screenshot](/misc/Facebook.png)

![Github screenshot](/misc/Github.png)

## Install
```bash
git clone https://github.com/callesg/termkit.git
cd termkit
#Clone a copy of phantom js patch and build it
./build.sh
```


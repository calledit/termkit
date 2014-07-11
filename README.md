# WebKit based browser for the terminal.
Based on nodejs, phantomjs, and blessed

To enter a new url press the urlbar with our mouse
scroll with your mouse scroll wheel


![Facebook screenshot](/misc/Facebook.png)

![Github screenshot](/misc/Github.png)

## Install
```bash
git clone https://github.com/callesg/termkit.git
cd termkit
npm install phantom blessed

#Then get a copy of phantom js
cd ..
git clone https://github.com/ariya/phantomjs.git
cd phantomjs
#Apply patch to phantomjs and webkit
git apply ../termkit/renderTreeDump.patch
#build phantomjs
./build.sh

#Move the binary in to place
mv bin/phantomjs ../termkit/patched_phantomjs
```


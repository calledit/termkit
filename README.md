# WebKit based browser for the terminal.
Based on nodejs, phantomjs, and ncurses

To enter a new url press F6 to get to the url bar.
PageUp and Down to scroll, 

There seams to be somthing weird with ncurses(https://github.com/mscdex/node-ncurses/issues/38) sometimes when aloot of stuff is
printed some printed lines just goes away.

![Facebook screenshot](/misc/Facebook.png)

![Github screenshot](/misc/Github.png)

npm install phantom blessed

Uses A patched version of phantom js
```diff
diff --git a/src/webpage.cpp b/src/webpage.cpp
index 5dde3c6..fddfaa2 100644
--- a/src/webpage.cpp
+++ b/src/webpage.cpp
@@ -1610,6 +1610,10 @@ QString WebPage::currentFrameName() const //< deprecated
 {
     return this->frameName();
 }
+QString WebPage::focusedFrameRenderTreeDump()
+{
+    return m_customWebPage->currentFrame()->renderTreeDump();
+}
 
 QString WebPage::focusedFrameName() const
 {
diff --git a/src/webpage.h b/src/webpage.h
index df2b83a..dabf748 100644
--- a/src/webpage.h
+++ b/src/webpage.h
@@ -239,6 +239,13 @@ public slots:
     void release();
     void close();
 
+    /**
+     *  Returns the currently focused Frame's render tree
+     * @brief focusedFrameName
+     * @return DUmp of frame render tree
+     */
+    QString focusedFrameRenderTreeDump();
+
     QVariant evaluateJavaScript(const QString &code);
     bool render(const QString &fileName, const QVariantMap &map = QVariantMap());
     /**
```

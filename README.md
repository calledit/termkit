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
index 5dde3c6..10be31e 100644
--- a/src/webpage.cpp
+++ b/src/webpage.cpp
@@ -1610,6 +1610,10 @@ QString WebPage::currentFrameName() const //< deprecated
 {
     return this->frameName();
 }
+QString WebPage::focusedFrameRenderTreeDump() const
+{
+    return m_customWebPage->currentFrame()->renderTreeDump();
+}
 
 QString WebPage::focusedFrameName() const
 {
diff --git a/src/webpage.h b/src/webpage.h
index df2b83a..6645b45 100644
--- a/src/webpage.h
+++ b/src/webpage.h
@@ -79,6 +79,7 @@ class WebPage : public QObject, public QWebFrame::PrintCallback
     Q_PROPERTY(QString frameName READ frameName)
     Q_PROPERTY(int framesCount READ framesCount)
     Q_PROPERTY(QString focusedFrameName READ focusedFrameName)
+    Q_PROPERTY(QString focusedFrameRenderTreeDump READ focusedFrameRenderTreeDump)
 
 public:
     WebPage(QObject *parent, const QUrl &baseUrl = QUrl());
@@ -234,11 +235,19 @@ public:
      */
     QString focusedFrameName() const;
 
+    /**
+     *  Returns the currently focused Frame's render tree
+     * @brief focusedFrameName
+     * @return DUmp of frame render tree
+     */
+    QString focusedFrameRenderTreeDump() const;
+
 public slots:
     void openUrl(const QString &address, const QVariant &op, const QVariantMap &settings);
     void release();
     void close();
 
+
     QVariant evaluateJavaScript(const QString &code);
     bool render(const QString &fileName, const QVariantMap &map = QVariantMap());
     /**
```

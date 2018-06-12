nw.Window.open('./main.html', {
    'id': 'kissgui',
    'height': 680,
    'width': 920,
    'position': 'center',
    'resizable': true
}, function(c){
    nw.global.mainWin = c;
    c.on("close", function(){
        nw.App.closeAllWindows();
        c.close(true);
    });
});
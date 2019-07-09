var pkg = require('./package.json');

nw.Window.open('./main.html', {
    'id': 'kissgui',
    'title': 'KISS-GUI ' + pkg.version,
    'height': 600,
    'width': 970,
    "min_width": 900,
    "min_height": 600,
    'position': 'center',
    'resizable': true
});
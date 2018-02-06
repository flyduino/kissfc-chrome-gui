/**
 * Github interface library.
 */
function loadGithubReleases(url, callback) {
    // alert(request.getResponseHeader('some_header'));
    // Link: <https://api.github.com/resource?page=2>; rel="next",
    // <https://api.github.com/resource?page=5>; rel="last"
    $.ajax({
        dataType : "json",
        url : url,
        success : function(data, textStatus, request) {
            var temp = [];
            var link = request.getResponseHeader('Link');
            Array.prototype.push.apply(temp, data);
            if (link == null) {
                callback(temp);
            } else {
                console.log("TODO: Paging!");
                callback(temp);
            }
        }
    });
}

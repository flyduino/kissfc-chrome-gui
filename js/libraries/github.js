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
            var link = request.getResponseHeader('Link');
            Array.prototype.push.apply(firmwares, data);
            if (link == null) {
                callback(firmwares);
            } else {
                console.log("TODO: Paging!");
                callback(firmwares);
            }
        }
    });
}

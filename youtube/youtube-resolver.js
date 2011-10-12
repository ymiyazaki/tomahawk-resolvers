var YoutubeResolver = Tomahawk.extend(TomahawkResolver,
{
    settings:
    {
            name: 'Youtube',
            weight: 70,
            timeout: 10
    },
    decodeUrl: function (url) {
        // Some crazy replacement going on overhere! lol
        return url.replace(/%25252C/g, ",").replace(/%20/g, " ").replace(/%3A/g, ":").replace(/%252F/g, "/").replace(/%253F/g, "?").replace(/%252C/g, ",").replace(/%253D/g, "=").replace(/%2526/g, "&").replace(/%26/g, "&").replace(/%3D/g, "=");

    },
    parseVideoUrlFromYtPage: function (html) {
        var magic = "url_encoded_fmt_stream_map=";
        var magicFmt = "18";
        var magicLimit = "fallback_host";
        var pos = html.indexOf(magic) + magic.length;
        html = html.slice(pos);
        html = html.slice(html.indexOf(magicFmt + magicLimit) + (magic + magicLimit).length);
        finalUrl = html.slice(0, html.indexOf(magicLimit));
        return "http://o-o.preferred." + this.decodeUrl(finalUrl);
    },
    searchYoutube: function( qid, query, limit, title, artist ) {
        var apiQuery = "http://gdata.youtube.com/feeds/api/videos?q=" + query + "&v=2&alt=jsonc&quality=medium&max-results=" + limit;
        apiQuery = apiQuery.replace(/\%20/g, '\+');

        var that = this;
        Tomahawk.log("Doing async request:" + apiQuery + "title:" + title + " artist:" + artist + "qid:" + qid);
        Tomahawk.asyncRequest(apiQuery, function(xhr) {
            var myJsonObject = JSON.parse(xhr.responseText);
            if (myJsonObject.data.totalItems === 0)
                return;

            var count = limit;
            var results = [];
            for (i = 0; i < myJsonObject.data.totalItems && i < limit; i++) {
                // Need some more validation here
                // This doesnt help it seems, or it just throws the error anyhow, and skips?
                if(myJsonObject.data.items[i] === undefined)
                    continue;
                if(myJsonObject.data.items[i].duration === undefined)
                    continue;
                var result = new Object();
                if (artist !== "") {
                    result.artist = artist;
                }
                if (title !== "") {
                    result.track = title;
                } else {
                    result.track = myJsonObject.data.items[i].title;
                }

                //result.year = ;
                result.source = that.settings.name;
                result.mimetype = "video/h264";
                //result.bitrate = 128;
                result.duration = myJsonObject.data.items[i].duration;
                result.score = 0.85;
                var d = new Date(Date.parse(myJsonObject.data.items[i].uploaded));
                result.year = d.getFullYear();

                Tomahawk.log("Getting video url from youtube." );
                (function(i, qid, result) {
                    var xmlHttpRequest = new XMLHttpRequest();
                    xmlHttpRequest.open('GET', myJsonObject.data.items[i].player['default'], true);
                    xmlHttpRequest.onreadystatechange = function() {
                        if (xmlHttpRequest.readyState !== 4) {// We only care when the request is finished
                            return;
                        }

                        count = count - 1;
                        Tomahawk.log("Got video response from youtube.");
                        if (xmlHttpRequest.status == 200) {
                            result.url = that.parseVideoUrlFromYtPage(xmlHttpRequest.responseText);
                            if (result.url.indexOf("<html>") == -1 ) { // dumb check for bad parsing
                                results.push(result);
                            }
                        } else if (xmlHttpRequest.readyState === 4) {
                            Tomahawk.log("Failed to do GET request to: " + url);
                            Tomahawk.log("Status Code was: " + xmlHttpRequest.status);
                        }


                        if (count === 0) { // we're done
                            Tomahawk.log("Sending results back to Tomahawk, with qid:" + qid + "and results:" + results);
                            var toReturn = {
                                results: results,
                                qid: qid
                            };
                            Tomahawk.addTrackResults(toReturn);
                        }
                    };
                    xmlHttpRequest.send(null);
                })(i, qid, result);
            }
        });
    },
    resolve: function(qid, artist, album, title)
    {
        if (artist !== "") {
            query = encodeURIComponent(artist) + "+";
        }
        if (title !== "") {
            query += encodeURIComponent(title);
        }
        Tomahawk.log("Resolving:" + qid + " :" + title + " - " + artist);
        this.searchYoutube(qid, query, 1, title, artist);
    },
    search: function( qid, searchString )
    {
        this.searchYoutube(qid, searchString, 20, "", "");
    }
});

Tomahawk.resolver.instance = YoutubeResolver;

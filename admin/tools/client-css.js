if (console) console.log('file: client-css.js');
__.define(
    [
        'jquery'
    ],
    function ($) {
        var p = {
            baseUrl: 'chrome-extension://' + chrome.runtime.id,
            css: [],
            fixCSSImageUrl: function (cssText, cssSourceUrl) {
                return cssText.replace(/"images\//g, '"' + cssSourceUrl.substr(0, cssSourceUrl.lastIndexOf('/')) + '/images/');
            },
            scopeCSS: function (cssText, scopeSelectors) {
                var length = 0;
                var comma = '-.-. --- -- -- .-';
                var selector = '... . .-.. . -.-. - --- .-.';
                var escapedComma = comma.replace(/\./g, '\\.');
                var escapedSelector = selector.replace(/\./g, '\\.');
                while (cssText.length !== length) {
                    length = cssText.length;
                    cssText = cssText.replace(/([^\}\{]+),\s*([^\}\{]+\{)/g, '$1[' + comma + ']$2');//finds and replaces commas in comma separated selectors e.g. .class, .class2 {delcarations}
                }
                cssText = cssText.replace(/\n*([^\}\{]+\{)/g, '\n[' + selector + ']$1');//adds a placeholder before each first selector
                cssText = cssText.replace(new RegExp('\\s*\\[' + escapedComma + '\\]', 'g'), ', ' + scopeSelectors + ' ').replace(new RegExp('\\[' + escapedSelector + '\\]', 'g'), scopeSelectors + ' ');//swaps out placeholders
                return cssText;
            }
        };
        var pub = {
            prefetch: function (url, callback) {
                if (url.charAt(0) !== '/') url = '/' + url;
                var absoluteUrl = p.baseUrl + url;
                $.ajax(absoluteUrl)
                    .done(function (data, status, xhr) {
                        p.css[url] = p.fixCSSImageUrl(xhr.responseText, absoluteUrl);
                        p.css[url] = p.scopeCSS(p.css[url], '.ws-scoped');
                        if (callback) callback(p.css[url]);
                    });
            },
            append: function (url) {
                if (url.charAt(0) !== '/') url = '/' + url;
                if (!p.css[url]) {
                    pub.prefetch(url, function () {
                        pub.append(url);
                    });
                }
                else if ($('head').find('style[ws-url="' + url + '"]').length === 0) {
                    $('head').append($("<style ws-url='" + url + "'>" + p.css[url] + "</style>"));
                }
            }
        };
        return pub;
    }
);
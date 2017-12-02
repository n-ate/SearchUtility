if (console) console.log('file: dom-fragment.js');
__.define([], function () {

    var p = {
        // Mapping between tag names and css default values lookup tables. This allows to exclude default values in the result.
        defaultStylesByTagName: {},

        // Styles inherited from style sheets will not be rendered for elements with these tag names
        noStyleTags: { "BASE": true, "HEAD": true, "HTML": true, "META": true, "NOFRAME": true, "NOSCRIPT": true, "PARAM": true, "SCRIPT": true, "STYLE": true, "TITLE": true },

        // This list determines which css default values lookup tables are precomputed at load time
        // Lookup tables for other tag names will be automatically built at runtime if needed
        tagNames: ["A", "ABBR", "ADDRESS", "AREA", "ARTICLE", "ASIDE", "AUDIO", "B", "BASE", "BDI", "BDO", "BLOCKQUOTE", "BODY", "BR", "BUTTON", "CANVAS", "CAPTION", "CENTER", "CITE", "CODE", "COL", "COLGROUP", "COMMAND", "DATALIST", "DD", "DEL", "DETAILS", "DFN", "DIV", "DL", "DT", "EM", "EMBED", "FIELDSET", "FIGCAPTION", "FIGURE", "FONT", "FOOTER", "FORM", "H1", "H2", "H3", "H4", "H5", "H6", "HEAD", "HEADER", "HGROUP", "HR", "HTML", "I", "IFRAME", "IMG", "INPUT", "INS", "KBD", "KEYGEN", "LABEL", "LEGEND", "LI", "LINK", "MAP", "MARK", "MATH", "MENU", "META", "METER", "NAV", "NOBR", "NOSCRIPT", "OBJECT", "OL", "OPTION", "OPTGROUP", "OUTPUT", "P", "PARAM", "PRE", "PROGRESS", "Q", "RP", "RT", "RUBY", "S", "SAMP", "SCRIPT", "SECTION", "SELECT", "SMALL", "SOURCE", "SPAN", "STRONG", "STYLE", "SUB", "SUMMARY", "SUP", "SVG", "TABLE", "TBODY", "TD", "TEXTAREA", "TFOOT", "TH", "THEAD", "TIME", "TITLE", "TR", "TRACK", "U", "UL", "VAR", "VIDEO", "WBR"],

        computeDefaultStyleByTagName: function (tagName) {
            var defaultStyle = {};
            var element = document.body.appendChild(document.createElement(tagName));
            var computedStyle = getComputedStyle(element);
            for (var i = 0; i < computedStyle.length; i++) {
                defaultStyle[computedStyle[i]] = computedStyle[computedStyle[i]];
            }
            document.body.removeChild(element);
            return defaultStyle;
        },

        getDefaultStyleByTagName: function (tagName) {
            tagName = tagName.toUpperCase();
            if (!p.defaultStylesByTagName[tagName]) {
                p.defaultStylesByTagName[tagName] = p.computeDefaultStyleByTagName(tagName);
            }
            return p.defaultStylesByTagName[tagName];
        }
    };

    var pub = {
        serializeWithStyles: function (el) {
            if (el.nodeType !== Node.ELEMENT_NODE) { throw new TypeError(); }
            var cssTexts = [];
            var elements = el.querySelectorAll("*");
            for (var i = 0; i < elements.length; i++) {
                var e = elements[i];
                if (!p.noStyleTags[e.tagName]) {
                    var computedStyle = getComputedStyle(e);
                    var defaultStyle = p.getDefaultStyleByTagName(e.tagName);
                    cssTexts[i] = e.style.cssText;
                    for (var ii = 0; ii < computedStyle.length; ii++) {
                        var cssPropName = computedStyle[ii];
                        if (computedStyle[cssPropName] !== defaultStyle[cssPropName]) {
                            e.style[cssPropName] = computedStyle[cssPropName];
                        }
                    }
                }
            }
            var result = el.outerHTML;
            for (var i = 0; i < elements.length; i++) {
                elements[i].style.cssText = cssTexts[i];
            }
            return result;
        },
        captureFragments: function ($container) {
            var results = [];
            $container.each(function () {
                results.push(pub.serializeWithStyles(this));
            });
            return results;
        }
    };
    
    // Precompute the lookup tables.
    for (var i = 0; i < p.tagNames.length; i++) {
        if (!p.noStyleTags[p.tagNames[i]]) {
            p.defaultStylesByTagName[p.tagNames[i]] = p.computeDefaultStyleByTagName(p.tagNames[i]);
        }
    }

    return pub;
});
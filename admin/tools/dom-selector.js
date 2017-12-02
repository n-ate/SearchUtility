if (console) console.log('file: dom-selector.js');
__.define(
    [
        'jquery',
        'client-ui'
    ],
    function ($, ui) {
        var p = {
            containers: {
                $modals: (function () { $('body').append("<div ds-container='modals'></div>"); return $('div[ds-container=modals]'); })(),
                $highlights: (function () { $('body').append("<div ds-container='highlights' style='pointer-events:none;margin:0;padding:0'></div>"); return $('div[ds-container=highlights]'); })()
            },
            modals: {
                $soloSelect: null,
                $multiSelect: null
            },
            makeSelectionCallback: null,
            onUserSelectHandlers: [],
            colors: ['black', 'rgba(255,0,0,0.35)', 'rgba(255,255,0,0.35)', 'rgba(0,0,255,0.35)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.05)', 'rgba(0,0,0,0.05)'],
            backgrounds: [
                'background:radial-gradient(ellipse at center, rgba(0,0,0,0) 0, rgba(0,0,0,0.3) 100%);',
                'background:radial-gradient(ellipse at center, rgba(255,0,0,0) 0, rgba(255,0,0,0.35) 100%);',
                'background:radial-gradient(ellipse at center, rgba(255,255,0,0) 0, rgba(255,255,0,0.35) 100%);',
                'background:radial-gradient(ellipse at center, rgba(0,0,255,0) 0, rgba(0,0,255,0.35) 100%);',
                'background:repeating-linear-gradient(20deg, transparent, transparent 5px, rgba(0,0,0,0.15) 7px, rgba(0,0,0,0.05) 12px);',
                'background:repeating-linear-gradient(80deg, transparent, transparent 5px, rgba(0,0,0,0.15) 7px, rgba(0,0,0,0.05) 12px);',
                'background:repeating-linear-gradient(140deg, transparent, transparent 5px, rgba(0,0,0,0.15) 7px, rgba(0,0,0,0.05) 12px);'
            ],
            getBoundsAsCoordinates: function (el) {
                var body = document.body.getBoundingClientRect();
                var bounds = el.getBoundingClientRect();
                return {
                    x1: bounds.x - body.x,
                    x2: bounds.x - body.x + bounds.width,
                    y1: bounds.y - body.y,
                    y2: bounds.y - body.y + bounds.height
                };
            },
            getClippedBounds: function (el) {
                var bounds, rect, prev, ancestor = el.parentNode;
                bounds = p.getBoundsAsCoordinates(el);
                while (ancestor.nodeName !== 'BODY') {
                    if (getComputedStyle(ancestor).overflow !== 'visible') {// exclude ancestor with overflow:visible //TODO: determine overhead and make conditional
                        rect = p.getBoundsAsCoordinates(ancestor);
                        prev = bounds;
                        if (bounds.x1 < rect.x1) bounds.x1 = rect.x1;
                        if (bounds.x2 > rect.x2) bounds.x2 = rect.x2;
                        if (bounds.y1 < rect.y1) bounds.y1 = rect.y1;
                        if (bounds.y2 > rect.y2) bounds.y2 = rect.y2;
                    }
                    ancestor = ancestor.parentNode;
                }
                return bounds;
            },
            createHighlight: function (classAttr, color, background, text) {
                var $highlight = $("<div class='" + classAttr + "' style='position:absolute;border-radius:4px;box-shadow:0 0 11px 2px " + color
                    + " inset;display:flex;align-items:center;justify-content:center;color:rgba(255,255,255,0.8);text-shadow:1px 1px 2px #000, 0 0 25px "
                    + color + ", 0 0 5px " + color + ";font-weight:bold;font-family:Tahoma,arial;font-size:20px;z-index:9999;margin:0;padding:0;"
                    + background + "'>" + (text || '') + "</div>");
                p.containers.$highlights.append($highlight);
                return $highlight;
            },
            ensurePrimaryHighlight: function () {
                var $highlight = $('.ds-primary-highlight');
                if ($highlight.length === 0) $highlight = p.createHighlight('ds-primary-highlight', p.colors[0], p.backgrounds[0]);
                return $highlight;
            },
            updateElementPlacement: function ($el, placement) {
                $el.css('left', placement.x1 + 'px');
                $el.css('top', placement.y1 + 'px');
                $el.css('width', (placement.x2 - placement.x1) + 'px');
                $el.css('height', (placement.y2 - placement.y1) + 'px');
            },
            getAllPermutations: function (arr) {
                if (arr.length === 0) return [];
                if (arr.length === 1) return [arr];
                var result = [];
                var one = arr.shift();
                result.push([one]);
                var permutations = p.getAllPermutations(arr);
                for (var i = 0; i < permutations.length; i++) {
                    result.push(permutations[i]);
                    result.push([one].concat(permutations[i]));
                }
                return result;
            },
            findSimilarElementSets: function ($el) {
                var result = [], r, $matches, classes, permutations, v, cssQuery, uniqueSet, setsMatch;
                classes = $el.get(0).className.match(/\S+/g) || [];
                permutations = p.getAllPermutations(classes).reverse();
                for (v = 0; v < permutations.length && result.length < p.colors.length; v++) {
                    cssQuery = '.' + permutations[v].join('.');
                    $matches = $(cssQuery + '[ds-block=true]').not($el);
                    if ($matches.length > 0 && $matches.length < 101) {
                        uniqueSet = true;
                        for (r = 0; r < result.length; r++) {// set of results
                            if (result[r].length === $matches.length) {//results[r] may be the same as $matches
                                setsMatch = true;
                                result[r].set.each(function (i, el) {//compare sets for uniqueness
                                    if (!$matches.is(el)) {
                                        setsMatch = false;
                                        return false;
                                    }
                                });
                                if (setsMatch) {
                                    uniqueSet = false;
                                    if (cssQuery.length > result[r].query.length) result[r].query = cssQuery;
                                }
                            }
                        }
                        if (uniqueSet) result.push({ query: cssQuery, set: $matches });
                    }
                }
                return result;
            },
            updateHighlighting: function (el) {
                var bounds = p.getClippedBounds(el);
                var $highlight = p.ensurePrimaryHighlight();
                p.updateElementPlacement($highlight, bounds);
                if (p.multi) {
                    var sets = p.findSimilarElementSets($(el));
                    for (var i = 0; i < sets.length; i++) {
                        sets[i].set.each(function (num, node) {
                            bounds = p.getClippedBounds(node);
                            $highlight = p.createHighlight('ds-secondary-highlight', p.colors[i + 1], p.backgrounds[i + 1], num + 1);//first color is primary-highlight
                            $highlight.attr('ds-query', sets[i].query);
                            p.updateElementPlacement($highlight, bounds);
                        });
                    }
                }
            },
            userHover: function (e) {
                $('.ds-secondary-highlight').remove();
                if (this.nodeName === 'BODY') return;
                p.updateHighlighting(this);
            },
            userUnhover: function (e) {
                var $parent = $(this).closest('[ds-block=true]');
                if ($parent.length > 0) {
                    $('.ds-secondary-highlight').remove();
                    p.updateHighlighting($parent.get(0));
                }
            },
            userSelect: function (e) {
                //if ($(this).is('[ds-block]')) {
                e.stopImmediatePropagation();
                var classes = (this.className.match(/\S+/g) || []).map(c => { return '.' + c; });
                var id = this.id;
                if (classes || id) {//ignore user click - the user can try clicking again                        
                    let cssQuery = [];
                    cssQuery.push(this.nodeName.toLowerCase());
                    if (classes.length > 0) cssQuery.push.apply(cssQuery, classes);
                    else cssQuery.push('#' + this.id);
                    for (var i = 0; i < p.onUserSelectHandlers.length; i++) p.onUserSelectHandlers[i](cssQuery.join(''), cssQuery);
                    // setTimeout(function () {
                    //     p.containers.$highlights.children()
                    //         .fadeOut(5000, function () {
                    //             p.containers.$highlights.empty();
                    //         });
                    // }, 5000);
                }
                return false;
                //}
            },
            createLabelsHtml: function (names, checked) {
                checked = checked ? " checked='checked'" : "";
                return names.map(n => {
                    let id = (Math.random() + 1).toString(36).slice(-5);
                    return "<label for='" + id + "'>" +
                        n +
                        "  <input type='checkbox' name='" + n + "' id='" + id + "'" + checked + " />" +
                        "</label>";
                }).join(' ');
            },
            ensureUpdateSelectionModal: function () {
                if (!p.modals.$soloSelect) {
                    p.modals.$soloSelect = ui.dialog(
                        'Update Selection Query',
                        "<p>Selection resulted in the following query.</p>" +
                        "<div ds-container='selection-query' ds-value='' style='font-weight:bold'></div>" +
                        "<label style='float:right;padding:0;font-weight:normal' for='ds-ResultsCount'>" +
                        "count " +
                        "<input style='border:0;box-shadow:none;vertical-align:inherit;padding:0;height:auto;font-weight:bold' id='ds-ResultsCount' type='text' readonly />" +
                        "</label>" +
                        "<p>Query returns the following results.</p>" +
                        "<div ds-container='selection-results' style='overflow-x:hidden'></div>",
                        {
                            minHeight: 300, width: 700, autoOpen: false, resizable: true,
                            buttons: [
                                {
                                    text: 'confirm query',
                                    click: function () {
                                        $(this).dialog('close');
                                        p.makeSelectionCallback(
                                            p.modals.$soloSelect.data('ds-value').join('')
                                        );
                                    }
                                }
                            ]
                        }
                    ).$dialog;
                }
            },
            showUpdateSelectionModal: function (appliedSelectors, otherSelectors) {
                p.ensureUpdateSelectionModal();
                let query = appliedSelectors.join('');
                let $results = $(query);
                let $container = p.modals.$soloSelect.find('[ds-container=selection-results]');
                $container.empty();
                if ($container.data('uiAccordion')) $container.accordion('destroy');
                p.modals.$soloSelect
                    .data('ds-value', appliedSelectors)
                    .data('ds-other', otherSelectors)
                    .find('[ds-container=selection-query]')
                    .text(query);
                p.modals.$soloSelect.find('#ds-ResultsCount').val($results.length);
                $results.each(function () {
                    let html = this.outerHTML;
                    let $h3 = $("<h3 style='white-space:nowrap;text-overflow:ellipsis;overflow:hidden' alt='" + html.replace(/'/g, '\'') + "'></h3>");
                    $h3.text(html);
                    $container.append($h3);
                    let checkedOpt = p.createLabelsHtml(appliedSelectors, true);
                    let otherOpt = p.createLabelsHtml(otherSelectors);
                    let attributes = Array.from(this.attributes)
                        .filter(a => { return a.specified && a.nodeName !== 'class' && a.nodeName !== 'style' && a.textContent; })
                        .map(a => { return "[" + a.nodeName + "=" + a.textContent + "]"; })
                        .filter(a => {
                            for (let i = 0; i < appliedSelectors.length; i++) if (a === appliedSelectors[i]) return false;
                            return true;
                        });;
                    let attrOpt = p.createLabelsHtml(attributes);
                    let $div = $("<div>" + checkedOpt + otherOpt + attrOpt + "</div>");
                    $container.append($div);
                    $h3.add($div)
                        .data('ds-element', this)
                        .on('mouseenter.dom-selector', function () {
                            p.updateHighlighting($(this).data('ds-element'));
                        });
                });
                $container.find('input')
                    .checkboxradio()
                    .on('change.dom-select', function () {
                        let checkedOpt = p.modals.$soloSelect.data('ds-value');
                        let otherOpt = p.modals.$soloSelect.data('ds-other');
                        if (this.checked) {
                            checkedOpt.push(this.name);
                            otherOpt = otherOpt.filter(o => { return o !== this.name; });
                        }
                        else {
                            checkedOpt = checkedOpt.filter(o => { return o !== this.name; });
                            if (this.name.indexOf('[') !== 0) otherOpt.push(this.name);//perserve non-attr selector options
                        }
                        p.showUpdateSelectionModal(checkedOpt, otherOpt);
                    });
                p.modals.$soloSelect.dialog('open');
                $container.accordion();
            }
        };

        var pub = {
            soloSelect: function (callback) {
                p.makeSelectionCallback = callback;
                var $vis = $(':visible');
                var $block = $vis.filter(function (i, el) {
                    if ($(this).is('[ds-container]')) return false;
                    else {
                        var isBlock = getComputedStyle(this).display.indexOf('block') > -1 && el.nodeName !== 'BODY' && el.nodeName !== 'HTML';
                        $(this).attr('ds-block', isBlock ? 'true' : 'false');
                        return isBlock;
                    }
                });
                p.multi = false;
                $block.on('mouseenter.dom-selector', p.userHover);
                $block.on('mouseleave.dom-selector', p.userUnhover);
                $block.on('click.dom-selector', p.userSelect);
                pub.onUserSelect(function (query, appliedSelectors) {
                    $block.off('mouseenter.dom-selector');
                    $block.off('mouseleave.dom-selector');
                    $block.off('click.dom-selector');
                    p.showUpdateSelectionModal(appliedSelectors, []);
                });
            },
            multiSelect: function (callback) {
                p.makeSelectionCallback = callback;
                var $vis = $(':visible');
                var $block = $vis.filter(function (i, el) {
                    if ($(this).is('[ds-container]')) return false;
                    else {
                        var isBlock = getComputedStyle(this).display.indexOf('block') > -1 && el.nodeName !== 'BODY' && el.nodeName !== 'HTML';
                        $(this).attr('ds-block', isBlock ? 'true' : 'false');
                        return isBlock;
                    }
                });
                p.multi = true;
                $block.on('mouseenter.dom-selector', p.userHover);
                $block.on('mouseleave.dom-selector', p.userUnhover);
                $block.on('mousedown.dom-selector', p.userSelect);
                pub.onUserSelect(function (query) {
                    $block.off('mouseenter.dom-selector');
                    $block.off('mouseleave.dom-selector');
                    $block.off('mousedown.dom-selector');
                    callback(query);
                });
            },
            onUserSelect: function (handler) {
                p.onUserSelectHandlers.push(handler)
            }
        };
        return pub;
    }
);


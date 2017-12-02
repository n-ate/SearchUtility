if (console) console.log('file: cost-per-weight.js');
__.define(
    [
        'jquery',
        'client-tab'
    ],
    function ($, tab) {
        var pub = {
            id: '184881DBE6734DF5B5EA40B9A2AE36CB',
            version: '0.0.0.1',
            category: 'Cost per weight',
            description: 'Search by the least cost per unit of weight.',
            steps: [
                {
                    title: 'Choose Page',
                    id: 'url',
                    required: true,
                    button: {
                        title: 'Open',
                        action: function (value) { tab.navigate($('#url').val()); },
                        clientAction: tab.getInjectableString(//NOTE: clientAction executes in an "isolated world" as a content script. It cannot access wizard parent scopes, because it is made into a string and injected into the client.
                            function () {
                                require(['client-ui'], function (ui) {
                                    ui.notify('Choose Page', 'Navigate to the desired search page and click &quot;Confirm Search Page&quot;.');
                                    ui.button(
                                        'Confirm Search Page',
                                        function () {
                                            var that = this;
                                            require(['jquery', 'client-ui'], function ($, ui) {
                                                $(that).remove();
                                                ui.sendRequest(location.href);
                                            });
                                        },
                                        'ws-center ws-top');
                                });
                            }
                        )
                    },
                    valueAction: 'navigate'
                    //clientCompleted: function (data) { console.log('save url: ' + data); return data; }
                },
                {
                    title: 'Input Title',
                    id: 'title',
                    required: true,
                    valueAction: 'title'
                },
                {
                    title: 'Input Notes',
                    id: 'notes',
                    multiline: true,
                    valueAction: 'note'
                },
                {
                    title: 'Identify Search Box',
                    id: 'domQuerySearch',
                    required: true,
                    button: {
                        title: 'Identify',
                        action: function () { tab.show(); },
                        clientAction: tab.getInjectableString(//NOTE: clientAction executes in an "isolated world" as a content script. It cannot access wizard parent scopes, because it is made into a string and injected into the client.
                            function () {
                                require(['client-ui', 'dom-selector'], function (ui, dom) {
                                    dom.soloSelect(function (pattern) {
                                        require(['jquery', 'client-ui'], function ($, ui) {
                                            $(pattern).val('apple');
                                            let success = $(pattern).val() === 'apple';
                                            ui.sendRequest({ value: pattern, test: success });
                                        });
                                    });
                                    ui.notify('Select Search Box', 'Use the cursor to highlight the product search box. Make your selection by clicking.');
                                });
                            }
                        )
                    },
                    valueAction: 'search-input'
                },
                {
                    title: 'Identify Search Button',
                    id: 'domQuerySearchBtn',
                    required: true,
                    button: {
                        title: 'Identify',
                        action: function () { tab.show(); },
                        clientAction: tab.getInjectableString(//NOTE: clientAction executes in an "isolated world" as a content script. It cannot access wizard parent scopes, because it is made into a string and injected into the client.
                            function () {
                                require(['client-ui', 'dom-selector'], function (ui, dom) {
                                    dom.soloSelect(function (pattern) {
                                        require(['client-ui'], function (ui) {
                                            ui.sendRequest(pattern);
                                        });
                                        require(['jquery'], function ($) {
                                            $(pattern).click();
                                        });
                                    });
                                    ui.notify('Select Search Button', 'Use the cursor to highlight the product search submit button. Make your selection by clicking.');
                                });
                            }
                        )
                    },
                    valueAction: 'search-button'
                },
                {
                    title: 'Identify Search Complete',
                    id: 'domQuerySearchComplete',
                    required: true,
                    button: {
                        title: 'Identify',
                        action: function () { tab.show(); },
                        clientAction: tab.getInjectableString(//NOTE: clientAction executes in an "isolated world" as a content script. It cannot access wizard parent scopes, because it is made into a string and injected into the client.
                            function () {
                                require(['client-ui', 'dom-selector'], function (ui, dom) {
                                    dom.soloSelect(function (pattern) {
                                        require(['jquery', 'client-ui'], function ($, ui) {
                                            let testFailed = ($(pattern).text().indexOf('apple') < 0);
                                            ui.sendRequest({ value: pattern, test: !testFailed });
                                        });
                                    });
                                    ui.notify('Select Search Echo Text', 'Use the cursor to highlight the search echo text. Make your selection by clicking.');
                                });
                            }
                        )
                    },
                    valueAction: 'text-confirmation'
                },
                {
                    title: 'Identify Products',
                    id: 'domQueryProducts',
                    required: true,
                    button: {
                        title: 'Identify',
                        action: function () { tab.show(); },
                        clientAction: tab.getInjectableString(//NOTE: clientAction executes in an "isolated world" as a content script. It cannot access wizard parent scopes, because it is made into a string and injected into the client.
                            function () {
                                require(['client-ui', 'dom-selector'], function (ui, dom) {
                                    ui.notify('Select Products', 'Use the cursor to highlight a product. Then choose the correct style box that highlights all of the products on the page.');
                                    dom.multiSelect(function (pattern) {
                                        require(['client-ui'], function (ui) {
                                            ui.sendRequest(pattern);
                                        });
                                    });
                                });
                            }
                        )
                    },
                    valueAction: 'search-results'
                }
            ]
        };
        return pub;
    }
);
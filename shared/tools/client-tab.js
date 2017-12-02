if (console) console.log('file: client-tab.js');
/** creates, navigates, switches to, and closes the "client" tab **/
__.define(['jquery'], function ($) {
    chrome.runtime.onMessage.addListener(function (data, sender, sendResponse) {
        if (p.tab && p.tab.id === sender.tab.id) {
            console.log('received client data: ' + data);
            let identifier = p.clientWizardStep || p.tab.id;
            for (var i = 0; i < p.onClientDataHandlers.length; i++) p.onClientDataHandlers[i](identifier, data);
        }
    });

    chrome.tabs.onUpdated.addListener(function (tabId, changeInfo, tab) {
        if (p.tab && p.tab.id === tabId && tab.status !== p.lastStatus) {//correct tab and not a duplicate status
            if (tab.status === 'complete') {
                console.log('tab update complete: ' + tab.url);
                p.tabLoaded = true;
                p.lastStatus = tab.status;
                pub.ready(function () {
                    console.log('url: ' + tab.url);
                    if (p.clientWizardStep) pub.injectCode(p.clientWizardStep.button.clientAction);
                    for (var i = 0; i < p.onClientUpdated.length; i++) if (p.onClientUpdated[i]) p.onClientUpdated[i]();
                });
            }
            else {//'loading' status
                console.log('tab update loading: ' + tab.url);
                p.tabLoaded = false;
                p.loaded = false;
                p.loading = false;
                p.lastStatus = tab.status;
            }
        }
    });

    var p = {
        tab: null,
        loading: false,//resources
        loaded: false,//resources
        tabLoaded: false,
        callbacks: [],
        clientWizardStep: null,
        lastStatus: '',
        onClientDataHandlers: [],
        onClientUpdated: [],
        isURL: function (value) {
            var pattern = /^(?:(?:https?|ftp):\/\/)(?:\S+(?::\S*)?@)?(?:(?!(?:10|127)(?:\.\d{1,3}){3})(?!(?:169\.254|192\.168)(?:\.\d{1,3}){2})(?!172\.(?:1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2})(?:[1-9]\d?|1\d\d|2[01]\d|22[0-3])(?:\.(?:1?\d{1,2}|2[0-4]\d|25[0-5])){2}(?:\.(?:[1-9]\d?|1\d\d|2[0-4]\d|25[0-4]))|(?:(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)(?:\.(?:[a-z\u00a1-\uffff0-9]-*)*[a-z\u00a1-\uffff0-9]+)*(?:\.(?:[a-z\u00a1-\uffff]{2,}))\.?)(?::\d{2,5})?(?:[/?#]\S*)?$/i //https://gist.github.com/dperini/729294
            return pattern.test(value);
        },
        onRemoved: function (tabId) {
            if (p.tab && p.tab.id === tabId) {
                p.tab = null;
                p.loading = false;
                p.loaded = false;
            }
        },
        onRemovedRegistered: false
    };

    var pub = {
        ready: function (callback) {
            if (!p.loaded) {
                if (callback) p.callbacks.push(callback);
                if (!p.loading) {
                    if (p.tab && p.tabLoaded) { //tab is created
                        p.loading = true;
                        chrome.tabs.executeScript(p.tab.id, { file: '/shared/require.js', runAt: 'document_start' }, function () {
                            console.log('  script injected: require.js');
                            chrome.tabs.executeScript(p.tab.id, { code: "requirejs.config({ baseUrl: 'chrome-extension://" + chrome.runtime.id + "/' });", runAt: 'document_start' }, function () {
                                console.log('  script injected: requirejs configuration');
                                p.loading = false;
                                p.loaded = true;
                                while (p.callbacks.length > 0) {
                                    p.callbacks.pop()();//execute callbacks
                                }
                            });
                        });
                    }
                    else { //tab isn't created
                        setTimeout(pub.ready);
                    }
                }
            }
            else { //already loaded
                if (callback) callback();
            }
        },
        onClientData: function (jsHandler) {
            p.onClientDataHandlers.push(jsHandler);
        },
        onUpdated: function (jsHandler) {
            p.onClientUpdated.push(jsHandler);
        },
        injectCode: function (jsCode, callback, runAt) {
            chrome.tabs.executeScript(p.tab.id, { code: jsCode, runAt: runAt || 'document_start' }, function () {
                var index = jsCode.indexOf('\n');
                jsCode = (index > -1 ? jsCode.substr(index) : jsCode).trim();
                console.log('  script injected: ' + (jsCode.length > 150 ? jsCode.substr(0, 150) + '..' : jsCode));
                if (callback) callback();
            });
        },
        setClientWizardStep: function (step) {
            p.clientWizardStep = step;
            pub.injectCode(step.button.clientAction);
        },
        getInjectableString: function (jsFunction, args) {
            return '(' + jsFunction.toString() + ').apply(window, ' + JSON.stringify(args) + ');';
        },
        navigate: function (url, callback) {//NOTE: creates tab if none exists
            if (!p.isURL(url)) url = 'https://www.google.com/search?q=' + encodeURIComponent(url);
            console.log('url: ' + url);
            if (p.tab) chrome.tabs.update(p.tab.id, { active: true, url: url }, callback);
            else {
                if (!p.onRemovedRegistered) {
                    chrome.tabs.onRemoved.addListener(p.onRemoved);
                    p.onRemovedRegistered = true;
                }
                chrome.tabs.create(
                    { url: url },
                    function (createdTab) {
                        console.log('tab created');
                        p.tab = createdTab;
                        pub.ready();
                        if (callback) callback();
                    }
                );
            }
        },
        ensureLocation: function (url, callback) {
            if (p.tab) {
                chrome.tabs.get(p.tab.id, function (tab) {
                    if (tab.url !== url) pub.navigate(url, callback);
                    else if (callback) callback();
                });
            }
            else pub.navigate(url, callback);
        },
        show: function () {
            chrome.tabs.update(p.tab.id, { active: true });
        },
        close: function () {
            if (p.tab) chrome.tabs.remove(p.tab.id);
        }
    };

    pub.onClientData.remove = function (jsHandler) {
        let i = p.onClientUpdated.indexOf(jsHandler);
        if (i > -1) p.onClientUpdated.splice(i, 1);
    };
    pub.onUpdated.remove = function (jsHandler) {
        let i = p.onClientUpdated.indexOf(jsHandler);
        if (i > -1) p.onClientUpdated.splice(i, 1);
    };
    return pub;
});

    // var func = arguments.callee;
    // while (func) {
    //   console.log(func.toString().substr(0, 150));
    //   func = func.caller;
    // }
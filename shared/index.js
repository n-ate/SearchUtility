if (console) console.log('file: shared/index.js');
require(
    [
        'jquery-ui',
        'roles',
        'io-read',
        'client-tab'
    ],
    function ($, roles, read, tab) {
        roles.isAdmin(function (admin) {
            $(function () {
                if (admin) $('body').prepend('<a href="../admin/index.html">Admin Home</a>');
                $('a').button();
            });
        });
        read.getDataSets(function (data) {
            $(function () {
                let $availableSearches = $('#AvailableSearches');
                for (let i = 0; i < data.jsonRows.length; i++) {
                    let rowId = data.jsonRows[i].rowid;
                    let version = data.jsonRows[i].wizardVersion;
                    let category = data.jsonRows[i].category;
                    let description = data.jsonRows[i].description;
                    let json;
                    try { json = JSON.parse(data.jsonRows[i].value); } catch (ex) { }
                    if (json) {
                        var title = '(no title)',
                            notes = '';
                        for (let i = 0; i < json.length; i++) {
                            if (json[i].action === 'title') title = json[i].value;
                            else if (json[i].action === 'note') notes = json[i].value;
                        }
                        $availableSearches.append("<label alt='" + notes + "' for='checkbox-" + rowId + "'>" + title + "</label><input type='checkbox' id='checkbox-" + rowId + "'>");
                    }
                }
                $availableSearches.find('input').checkboxradio().on('change', function () {
                    if ($(this).is(':checked')) $('button').removeClass('ui-state-disabled');
                    else if (!$availableSearches.find('input').is(':checked')) $('button').addClass('ui-state-disabled');
                });
            });
        });

        $(function () {
            //Search//
            $('button').button().addClass('ui-state-disabled').css('pointer-events', 'auto').on('click', function () {
                if ($(this).hasClass('ui-state-disabled')) {
                    $("<p>At least one search option must be selected.</p>").dialog({ modal: true });
                }
                else {
                    let rowIds = [];
                    let searchValue = $('input[type=search]').val();
                    $('#AvailableSearches').find(':checked').each(function () { rowIds.push(this.id.split('-')[1]); });
                    for (let i = 0; i < rowIds.length; i++) {
                        read.getDataSet(rowIds[i], function (data) {
                            let $availableSearches = $('#AvailableSearches');
                            for (let i = 0; i < data.jsonRows.length; i++) {
                                let wizardId = data.jsonRows[i].wizardId;
                                let version = data.jsonRows[i].version;
                                let steps;
                                try { steps = JSON.parse(data.jsonRows[i].value); } catch (ex) { }
                                if (steps) {
                                    performAction(searchValue, steps, 0);
                                }
                                else throw 'could not deserialize steps';
                            }
                        });
                    }
                }
            });;
            $('input[type=search]').keypress(function (e) {
                if (e.charCode === 13) $('button').click();//return key triggers button press
            });
        });




        function performAction(searchValue, steps, index) {
            if (index === steps.length) return;
            let step = steps[index];
            let next = index + 1;
            switch (step.action) {
                case 'navigate':
                    tab.navigate(step.value, function () {
                        performAction(searchValue, steps, next);
                    });
                    break;
                case 'title': //no work
                case 'note': //no work
                    performAction(searchValue, steps, next);
                    break;
                case 'search-input':
                    tab.ready(function () {
                        tab.injectCode(//NOTE: injected Code executes in an "isolated world" as a content script. It cannot access parent scopes above this, because it is made into a string and injected into the client.
                            tab.getInjectableString(
                                function (domQuery, search) {
                                    require(['jquery'], function ($) {
                                        $(function () {
                                            $(domQuery).val(search);
                                        });
                                    });
                                },
                                [step.value, searchValue]
                            ),
                            function () {
                                performAction(searchValue, steps, next);
                            }
                        );
                    });
                    break;
                case 'search-button':
                    tab.ready(function () {
                        tab.injectCode(//NOTE: injected Code executes in an "isolated world" as a content script. It cannot access parent scopes above this, because it is made into a string and injected into the client.
                            tab.getInjectableString(
                                function (domQuery) {
                                    require(['jquery'], function ($) {
                                        $(function () {
                                            $(domQuery).click();
                                        });
                                    });
                                },
                                [step.value]
                            ),
                            function () {
                                setTimeout(function () { performAction(searchValue, steps, next); }, 400);//wait 200ms because of submit - can't use tab.onClientUpdated, because results may be fetched without page load
                            }
                        );
                    });
                    break;
                case 'text-confirmation':
                    var confirmTime = (new Date()).getTime() + 20000;
                    function testForConfirmationText() {
                        tab.ready(function () {
                            tab.injectCode(//NOTE: injected Code executes in an "isolated world" as a content script. It cannot access parent scopes above this, because it is made into a string and injected into the client.
                                tab.getInjectableString(function (domQuery, search) {
                                    require(['jquery', 'client-ui'], function ($, ui) {
                                        $(function () {
                                            let testFailed = ($(domQuery).text().indexOf(search) < 0);
                                            ui.sendRequest(!testFailed);
                                        });
                                    });
                                }, [step.value, searchValue])
                            );
                        });
                    }
                    function clientData(identifier, data) {
                        if (data === true) textConfirmCompleted(true);
                        else if((new Date()).getTime() > confirmTime) textConfirmCompleted(false);
                        else testForConfirmationText();
                    }
                    function clientUpated() { testForConfirmationText(); }
                    function textConfirmCompleted(success) {
                        tab.onClientData.remove(clientData);
                        tab.onUpdated.remove(clientUpated);
                        if (success) performAction(searchValue, steps, next);
                        else console.log('Failed to confirm search text in time alloted.');
                    }
                    tab.onClientData(clientData);
                    tab.onUpdated(clientUpated);
                    testForConfirmationText();
                    break;
                case 'search-results':
                    tab.onClientData(function (identifier, html) {
                        chrome.tabs.getCurrent(function (tab) {
                            chrome.tabs.update(tab.id, { active: true });
                        });
                        for (let i = 0; i < html.length; i++) {
                            $('#SearchResults').append("<li>" + html[i] + "<br class='clearfix'/></li>");
                        }
                        //tab.close();
                    });
                    tab.ready(function () {
                        tab.injectCode(//NOTE: injected Code executes in an "isolated world" as a content script. It cannot access parent scopes above this, because it is made into a string and injected into the client.
                            tab.getInjectableString(
                                function (domQuery) {
                                    require(['jquery', 'client-ui', 'dom-fragment'], function ($, ui, frag) {
                                        $(function () {
                                            let fragments = frag.captureFragments($(domQuery));
                                            ui.sendRequest(fragments);
                                        });
                                    });
                                },
                                [step.value]
                            ),
                            function () {
                                performAction(searchValue, steps, next);
                            }
                        );
                    });
                    break;
                default: throw 'unrecognized valueAction: ' + step.action;
            }
        }

    }
);
// // Saves options to chrome.storage.sync.
// function save_options() {
//   var color = document.getElementById('color').value;
//   var likesColor = document.getElementById('like').checked;
//   chrome.storage.sync.set({
//     favoriteColor: color,
//     likesColor: likesColor
//   }, function() {
//     // Update status to let user know options were saved.
//     var status = document.getElementById('status');
//     status.textContent = 'Options saved.';
//     setTimeout(function() {
//       status.textContent = '';
//     }, 750);
//   });
// }

// // Restores select box and checkbox state using the preferences
// // stored in chrome.storage.
// function restore_options() {
//   // Use default value color = 'red' and likesColor = true.
//   chrome.storage.sync.get({
//     favoriteColor: 'red',
//     likesColor: true
//   }, function(items) {
//     document.getElementById('color').value = items.favoriteColor;
//     document.getElementById('like').checked = items.likesColor;
//   });
// }
// document.addEventListener('DOMContentLoaded', restore_options);
// document.getElementById('save').addEventListener('click',
//     save_options);
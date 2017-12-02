if (console) console.log('file: play-wizard.js');
require(
    [
        'jquery-ui',
        'wizards',
        'client-tab',
        'io-read',
        'io-write'
    ],
    function ($, wizards, tab, read, write) {
        $(function () {
            $('button').button();//command buttons
            var query = location.search.substr(1).split('+');
            var wizard = wizards.getById(query[0]);

            function fillWizard(wizard) {
                $('title').text($('title').text().replace('{}', wizard.category));
                $('h1').text($('h1').text().replace('{}', wizard.category));
            }
            fillWizard(wizard);

            function buildSteps(wizard) {
                var $steps = $('#Steps');
                for (var i = 0; i < wizard.steps.length; i++) {
                    $steps.append(
                        "<li ws-stepId='" + wizard.steps[i].id + "'>" +
                        "    <label for='" + wizard.steps[i].id + "'>" + wizard.steps[i].title + "</label>" +
                        (wizard.steps[i].multiline ? "<textarea" : "<input") + (wizard.steps[i].required ? " required" : "") + " id='" + wizard.steps[i].id + "' />" +
                        "</li>"
                    );
                    if (wizard.steps[i].button) {
                        var $li = $('li[ws-stepId=' + wizard.steps[i].id + ']');
                        $li.append("<button>" + wizard.steps[i].button.title + "</button>");
                        $li.find('button').click(function () {
                            var step = wizard.steps.getById($(this).closest('[ws-stepId]').attr('ws-stepId'));
                            if (step.button.action) step.button.action();
                            if (step.button.clientAction) tab.ready(function () { tab.setClientWizardStep(step); });//set action on the client
                        });
                    }
                }
                $steps.find('textarea, input')
                    .focus(function () { $(this).removeClass('ui-state-error'); })
                    .blur(function () { $(this).removeClass('ui-state-highlight'); });
                $steps.find('button').button();
                $steps.find('input').keypress(function (e) {
                    if (e.charCode === 13) $(this).closest('li').find('button').click();//return key triggers button press
                });
                $steps.find('li:first-child').find('input, textarea').focus();//focus on first field
            }
            buildSteps(wizard);

            function fillSteps(wizard, rowId) {
                read.getDataSet(rowId, function (response) {
                    var obj = null;
                    try { obj = JSON.parse(response.jsonRows[0].value); } catch (ex) { }
                    if (obj) {
                        let tabOpened = false;
                        for (let i = 0; i < obj.length; i++) {
                            $('#Steps #' + obj[i].id).val(obj[i].value);
                            if (!tabOpened && obj[i].action === 'navigate' && obj[i].value.length > 8) {
                                let step = wizard.steps.getById(obj[i].id);
                                if (step.button && step.button.action) {
                                    step.button.action();
                                    tabOpened = true;
                                    chrome.tabs.getCurrent(function (tab) {
                                        chrome.tabs.update(tab.id, { active: true });
                                    });
                                }
                            }
                        }
                    }
                });
            }
            if (query[1] !== 'CREATE') fillSteps(wizard, query[1]);

            tab.onClientData(function (wizardStep, data) {
                chrome.tabs.getCurrent(function (tab) {
                    chrome.tabs.update(tab.id, { active: true });
                });
                if (typeof data === 'string') $('#' + wizardStep.id).val(data);
                else {
                    $('#' + wizardStep.id).val(data.value);
                    console.log('test: ' + data.test);
                }
            });

            $('#Cancel').click(function () {
                tab.close();
                location.assign('wizard-data-sets.html?' + wizard.id);
            });
            $('#Test').click(function () {
                //TODO: implement test
            });
            $('#Save').click(function () {
                var $steps = $('#Steps *[required]');
                var valid = true;
                $steps.each(function (i, el) {
                    var $this = $(this);
                    if ($this.val() === '') {//TODO: implement wizard checks
                        $this.addClass('ui-state-highlight ui-state-error');//mark required fields
                        valid = false;
                    }
                });
                if (valid) {
                    var args = location.search.substr(1).split('+');
                    var rowId = args[1] === 'CREATE' ? null : args[1];
                    var json = [];
                    $('[ws-stepid]').each(function () {
                        var $step = $(this);
                        let id = $step.attr('ws-stepid');
                        json.push({
                            id: id,
                            value: $step.find('input, textarea').val(),
                            action: wizard.steps.getById(id).valueAction
                        });
                        //[] = $step.find('input, textarea').val();//this looks like nonsense--acidental delete??
                        json[$step.attr('ws-stepid') + 'Action'] = $step.find('input, textarea').val();
                    });
                    write.saveDataSet(rowId, wizard.id, wizard.version, wizard.category, wizard.description, JSON.stringify(json), function (response) {
                        if (response.rows.length === 1) {
                            tab.close();
                            location.assign('wizard-data-sets.html?' + wizard.id);
                        }
                        else if (console) {
                            console.log('SaveDataSet() Unexpected response: ');
                            console.log(response);
                        }
                    });
                }
            });
        });
    }
);
                    //chrome.tabs.sendMessage(tab.id, 'start', {}/*, function responseCallback*/);
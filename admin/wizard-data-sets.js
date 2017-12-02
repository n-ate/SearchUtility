if (console) console.log('file: wizard-data-sets.js');
require(
    [
        'jquery-ui',
        'wizards',
        'io-read',
        'io-write'
    ],
    function ($, wizards, read, write) {
        $(function () {
            var $wizardDS = $('#WizardDataSets');
            var query = location.search.substr(1);
            var wizard;
            for (let i = 0; i < wizards.length; i++) {
                if (wizards[i].id === query) wizard = wizards[i];
            }
            if (wizard) {
                read.getDataSets(wizard.id, function (data) {
                    if (data.jsonRows) {
                        for (let i = 0; i < data.jsonRows.length; i++) {
                            let id = data.jsonRows[i].rowid;
                            let version = data.jsonRows[i].wizardVersion;
                            let category = data.jsonRows[i].category;
                            let description = data.jsonRows[i].description;
                            let obj;
                            try { obj = JSON.parse(data.jsonRows[i].value); } catch (ex) { }
                            if (obj) {
                                var title = '(no title)',
                                    notes = '(no notes)';
                                for (let i = 0; i < obj.length; i++) {
                                    if (obj[i].action === 'title') title = obj[i].value;
                                    else if (obj[i].action === 'note') notes = obj[i].value;
                                }
                                $wizardDS.append(
                                    $(
                                        "<h3>" + title + "</h3>" +
                                        "<div>" +
                                        "    <p>" + notes + "</p>" +
                                        "    <a href='play-wizard.html?" + wizard.id + "+" + id + "'>edit data set</a>" +
                                        "</div>"
                                    )
                                );
                            }
                            else if (console) console.log('Bad dataset object.');
                        }
                    }
                    $wizardDS.accordion();
                });
            }
            else $wizardDS.accordion();
            $('button').button().click(function () {
                location.assign('play-wizard.html?' + wizard.id + '+CREATE');
            });
            $('a').button();
        });
    }
);
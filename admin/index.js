if (console) console.log('file: admin index.js');
require(
    [
        'jquery-ui',
        'wizards'
    ],
    function ($, wizards) {
        if (!$.ui) {
            console.log('failed to load jquery-ui');
        }
        $(function () {
            var $wizards = $('#Wizards');
            for (var i = 0; i < wizards.length; i++) {
                $wizards.append(
                    $(
                        "<h3>" + wizards[i].category + "</h3>" +
                        "<div>" +
                        "    <p>" + wizards[i].description + "</p>" +
                        "    <a href='wizard-data-sets.html?" + wizards[i].id + "'>Data Sets</a>" +
                        "</div>"
                    )
                );
            }
            $wizards.accordion();
            $('a').button();
        });
    }
);
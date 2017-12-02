if (console) console.log('file: wizards.js');
__.define(
    [
        'wizards/cost-per-weight'
    ],

    /*  Possible ValueAction values: navigate, title, note, search-input, search-results

    */
    function (productShopping) {
        var p = {
            getById: function (id) {
                for (var i = 0; i < this.length; i++) {
                    if (this[i].id === id) return this[i];
                }
                return null;
            },
            addMethodsToWizardCollections: function () {
                pub.getById = p.getById.bind(pub);//add getById to wizards array
                for (var i = 0; i < pub.length; i++) {//add getById to each steps array
                    pub[i].steps.getById = p.getById.bind(pub[i].steps);
                }
            }
        };

        var pub = [
            productShopping
        ];

        p.addMethodsToWizardCollections();
        return pub;
    }
);
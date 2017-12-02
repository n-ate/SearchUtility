if (console) console.log('file: io-write.js');
__.define(
    [
        'io',
        'io-read'
    ],
    function (io, read, c) {
        io.setup('../admin/read-write-certificate.json', false, function () { });

        var p = {
        };

        var pub = {
            ensureReady: function (callback) {
                if (!Object.getOwnPropertyNames(io.tables).length) {
                    if (!arguments[1] || arguments[1] < 60) {
                        var check = arguments[1] || 1;
                        setTimeout(function () { pub.ensureReady(callback, check + 1) }, 50);
                    }
                    else throw 'unable to verify database';
                }
                else callback();
            },
            saveDataSet: function (rowId, wizardId, wizardVersion, category, description, json, callback) {
                pub.ensureReady(function () {
                    if (rowId) io.sql("UPDATE " + io.tables['Wizards:Datasets'].tableId + " SET wizardId='" + wizardId + "', wizardVersion='" + wizardVersion + "', category='" + category + "', description='" + description + "', value='" + json + "' WHERE ROWID = '" + rowId + "'", callback);
                    else io.sql("INSERT INTO " + io.tables['Wizards:Datasets'].tableId + " (wizardId, wizardVersion, category, description, value) VALUES ('" + wizardId + "','" + wizardVersion + "','" + category + "','" + description + "','" + json + "')", callback);
                });
            }
        };
        return pub;
    }
);
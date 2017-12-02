if (console) console.log('file: io-read.js');
__.define(
    [
        'io'
    ],
    function (io) {
        io.setup('../shared/read-certificate.json', true, function () { });

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
            /**
             * @param {String|{callback: function}} wizardId 
             * @param {function|undefined} [callback]
             * @returns {object} gapi response
             */
            getDataSets: function (wizardId, callback) {
                pub.ensureReady(function () {
                    let tableId = io.tables['Wizards:Datasets'].tableId;
                    let columns = io.getColumns(tableId);
                    let colNames = [];
                    for(let i = 0; i< columns.length; i++) colNames.push(columns[i].name);
                    if (callback) io.sql("SELECT ROWID, " + colNames.join(',') + " FROM " + tableId + " WHERE wizardId='" + wizardId + "'", callback);
                    else io.sql("SELECT ROWID, " + colNames.join(',') + " FROM " + tableId, wizardId);//wizardId is callback
                });
            },
            getDataSet: function (rowId, callback) {
                pub.ensureReady(function () {
                    io.sql("SELECT * FROM " + io.tables['Wizards:Datasets'].tableId + " WHERE ROWID=" + rowId + " LIMIT 1", callback);
                });
            },
            getAdmins: function (callback) {
                pub.ensureReady(function () {
                    io.sql("SELECT * FROM " + io.tables['Administrators'].tableId, callback);
                });
            }
        };

        return pub;
    }
);
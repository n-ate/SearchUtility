if (console) console.log('file: roles.js');
__.define(
    [
        'io-read'
    ],
    function (read) {
        var p = {
        };

        var pub = {
            isAdmin: function (callback) {
                chrome.identity.getProfileUserInfo(function (user) {
                    read.getAdmins(function (list) {
                        if (list.rows) {
                            for (var i = 0; i < list.rows.length; i++) {
                                if (list.jsonRows[i]['identity'] === user.id) {
                                    callback(true);
                                    return;
                                }
                            }
                        }
                        callback(false);
                    });
                });
            }
        };

        return pub;
    }
);
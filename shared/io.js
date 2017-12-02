if (console) console.log('file: io.js');
__.define(
    [
        'jsrsasign'
    ],
    function (sign) {
        var p = {
            cert: null,//cert to use to make tokens
            token: {
                cert: null,//cert used to make the latest token
                writeCapable: null,
                latest: null,
                latestClaims: null,
                ensureAuthReadCallbacks: [],
                ensureAuthWriteCallbacks: [],
                get valid() { return !!(p.token.latest && p.token.latestClaims && p.token.latestClaims.exp * 1000 > (new Date()).getTime()); },
                ensureAuth: function (callback, writeCapable) {
                    if (writeCapable) p.token.ensureAuthWriteCallbacks.push(callback);
                    else p.token.ensureAuthReadCallbacks.push(callback);
                    if (!p.token.serviceOn) p.token.service();
                },
                serviceOn: false,
                service: function () {
                    var tokenRequestInProgress = false;
                    var runtimeChangeStart = arguments[0] || new Date();
                    p.token.serviceOn = true;
                    //trigger valid callbacks
                    if (p.token.valid) {
                        while (p.token.ensureAuthReadCallbacks.length) p.token.ensureAuthReadCallbacks.pop()(p.token.latest);
                        if (p.token.writeCapable) while (p.token.ensureAuthWriteCallbacks.length) p.token.ensureAuthWriteCallbacks.pop()(p.token.latest);
                    }
                    //cert is available for token creation and ( the latest token is not valid or the cert has changed )
                    if (p.cert && (p.cert !== p.token.cert || !p.token.valid)) {
                        var cert = p.cert;
                        var claims = p.getClaims('https://www.googleapis.com/auth/fusiontables');// + (cert.readonly ? '.readonly' : ''));
                        var writeCapable = !p.cert.readonly;
                        tokenRequestInProgress = true;
                        p.token.latest = null;//remove invalid token
                        p.token.latestClaims = null;//remove associated claims
                        p.postJWT(p.getJWT(claims), function (data) {//make token request
                            p.token.latest = data.access_token;
                            p.token.latestClaims = claims;
                            p.token.writeCapable = writeCapable;
                            p.token.cert = cert;
                            p.token.service();//continue service
                        });
                    }
                    //throw if service makes no progress in 8 seconds
                    if ((new Date()) - runtimeChangeStart > 8000) {
                        if (p.token.ensureAuthReadCallbacks.length) throw 'EnsureAuth for read access failed after 8 seconds';
                        if (p.token.ensureAuthWriteCallbacks.length) throw 'EnsureAuth for write access failed after 8 seconds';
                    }
                    //manage service (status and execution)
                    if (!tokenRequestInProgress) {
                        if (p.token.ensureAuthReadCallbacks.length || p.token.ensureAuthWriteCallbacks.length) {
                            setTimeout(function () { p.token.service(runtimeChangeStart); }, 30);//untriggered callbacks, continue service
                        }
                        else p.token.serviceOn = false;//no more callbacks, service is off
                    }
                }
            },
            setupCert: function (jsonCert, readonly) {
                if (typeof jsonCert === 'object') {
                    if (!jsonCert.hasOwnProperty('client_email')) throw 'invalid json cert. Expected cert property: client_email';
                    if (!jsonCert.hasOwnProperty('private_key')) throw 'invalid json cert. Expected cert property: private_key';
                    p.cert = { email: jsonCert.client_email, privateKey: jsonCert.private_key, readonly: readonly };
                }
                else throw 'invalid setup parameter certObjectOrUrl. must be json cert or url reference to json cert';
            },
            parseJsonResponse: function (text) {
                let obj = JSON.parse(text);
                if (obj.kind) {
                    switch (obj.kind) {
                        case 'fusiontables#tableList': break;
                        case 'fusiontables#sqlresponse':
                            obj.jsonRows = [];
                            if (obj.rows) {
                                for (let r = 0; r < obj.rows.length; r++) {
                                    let jsonRow = {};
                                    for (let c = 0; c < obj.columns.length; c++) {
                                        jsonRow[obj.columns[c]] = obj.rows[r][c];
                                    }
                                    obj.jsonRows.push(jsonRow);
                                }
                            }
                            break;
                        default: if (console) console.log('unrecognized kind: ' + obj.kind);
                    }
                }
                return obj;
            },
            ajax: function (method, action, callback, payload, contentType) {
                if (action.indexOf('http') !== 0 && action.indexOf('..') !== 0) action = 'https://www.googleapis.com/fusiontables/v2/' + action;
                var xhttp = new XMLHttpRequest();
                xhttp.onreadystatechange = function () {
                    if (this.readyState == 4) {
                        if (this.status == 200 && callback) callback(p.parseJsonResponse(this.responseText), action);
                        else if (this.status == 204 && callback) callback(true, action);
                        else {
                            if (callback) callback(false, action);
                            else if (console) console.log(action + ': ' + this.responseText);
                        }
                    }
                };
                xhttp.onerror = function () {
                    //TODO: handle errors, offline results in spamming for authorization
                }
                xhttp.timeout = 10000; //10 seconds
                xhttp.ontimeout = function (e) {
                };
                method = method.toUpperCase();
                if (method === 'GET') action += (action.indexOf('?') > 0 ? '&' : '?') + '__=' + (new Date()).getTime();
                xhttp.open(method, action, true);
                xhttp.setRequestHeader('Content-type', contentType || 'application/json');
                if (p.token.valid) xhttp.setRequestHeader('authorization', 'Bearer ' + p.token.latest);
                if (payload) xhttp.send(payload);
                else xhttp.send();
            },
            postJWT: function (jwt, callback) {
                var parameters = 'grant_type=' + encodeURIComponent('urn:ietf:params:oauth:grant-type:jwt-bearer') + '&assertion=' + encodeURIComponent(jwt);
                p.ajax('POST', 'https://www.googleapis.com/oauth2/v4/token', callback, parameters, 'application/x-www-form-urlencoded');
            },
            getClaims: function (scope) {
                var issued = Math.floor(new Date().getTime() / 1000);
                var claims = {
                    iss: p.cert.email,
                    scope: scope,
                    aud: 'https://www.googleapis.com/oauth2/v4/token',
                    exp: issued + 3600,//configuration ignored by google oauth2 api
                    iat: issued
                };
                return claims;
            },
            getJWT: function (claims) {
                var key = sign.getKey(p.cert.privateKey);
                var headers = { alg: 'RS256', typ: 'JWT' };

                var jwt = sign.createJWT(headers.alg, headers, JSON.stringify(claims), key);
                p.token.latestClaims = claims;
                return jwt;
            }
        };

        var pub = {
            tables: {},
            setup: function (url, readonly, callback) {
                p.ajax('GET', url, function (data) {
                    if (!p.cert || !readonly) {//no cert yet, or there is a cert, but this one can read and write
                        p.setupCert(data, !!readonly);
                    }
                    else if (console) console.log('skipping setup, setup already performed with read/write capable certificate');
                    callback();
                });
                pub.listTables(function (list) {
                    if (list.items) {
                        for (let i = 0; i < list.items.length; i++) {
                            pub.tables[list.items[i].name] = list.items[i];
                            pub.tables[list.items[i].tableId] = list.items[i];
                        }
                    }
                });
            },
            getTables: function (nameOrId, callback) {
                var result = [];
                pub.listTables(function (list) {
                    if (list.items) {
                        for (var i = 0; i < list.items.length; i++) {
                            if (list.items[i].name === nameOrId || list.items[i].tableId === nameOrId) result.push(list.items[i]);
                        }
                    }
                    callback.apply(window, result);
                });
            },
            deleteTable: function (id, callback) {
                var attempt = arguments[2] || 0;
                p.token.ensureAuth(function () {
                    p.ajax('DELETE', 'tables/' + id, function (success, action) {
                        if (success) callback(success, action);
                        else if (attempt < 2) setTimeout(function () { pub.deleteTable(id, callback, attempt + 1); }, 500); //retry
                        else {
                            console.log('silent fail: could not delete table: ' + id);
                            callback(success, action);
                        }
                    });
                }, true);
            },
            deleteTables: function (nameOrId, callback) {
                pub.getTables(nameOrId, function () {
                    var context = {
                        tables: arguments,
                        index: -1,
                        deleted: 0,
                        callback: callback
                    };
                    var aggregator = function (success) {
                        this.index++;
                        if (success) this.deleted++;
                        if (this.index === this.tables.length) this.callback(this.deleted);
                        else pub.deleteTable(this.tables[this.index].tableId, aggregator);
                    }.bind(context);
                    aggregator();
                });
            },
            listTables: function (callback) {
                p.token.ensureAuth(function () {
                    p.ajax('GET', 'tables', callback);
                });
            },
            createTable: function (name, description, columns, callback) {
                var table =
                    {
                        name: name,
                        columns: columns,
                        description: description,
                        isExportable: true
                    };
                p.token.ensureAuth(function () {
                    p.ajax('POST', 'tables', callback, JSON.stringify(table));
                }, true);
            },
            updateTable: function (table, callback) {
                p.token.ensureAuth(function () {
                    p.ajax('PUT', 'tables/' + table.tableId, callback, JSON.stringify(table));
                }, true);
            },
            /*columns*/
            getColumns: function (nameOrId, callback) {
                if (pub.tables[nameOrId]) return pub.tables[nameOrId].columns;
                return null;
            },
            deleteColumn: function (tableId, columnId, callback) {
                var attempt = arguments[3] || 0;
                p.token.ensureAuth(function () {
                    p.ajax('DELETE', 'tables/' + tableId + '/columns/' + columnId, function (success, action) {
                        if (success) callback(success, action);
                        else if (attempt < 2) setTimeout(function () { pub.deleteColumn(tableId, columnId, callback, attempt + 1); }, 500); //retry
                        else {
                            console.log('silent fail: could not delete column: ' + columnId);
                            callback(success, action);
                        }
                    });
                }, true);
            },
            deleteColumns: function (tableId, nameOrId, callback) {
                pub.getColumns(tableId, nameOrId, function () {
                    var context = {
                        columns: arguments,
                        index: -1,
                        deleted: 0,
                        callback: callback
                    };
                    var aggregator = function (success) {
                        this.index++;
                        if (success) this.deleted++;
                        if (this.index === this.columns.length) this.callback(this.deleted);
                        else pub.deleteColumn(tableId, this.columns[this.index].columnId, aggregator);
                    }.bind(context);
                    aggregator();
                });
            },
            listColumns: function (tableId, callback) {
                p.token.ensureAuth(function () {
                    p.ajax('GET', 'tables/' + tableId + '/columns', callback);
                });
            },
            createColumn: function (tableId, callback, name, type, description) {
                var column = { name: name, type: type || 'STRING', description: description };
                p.token.ensureAuth(function () {
                    p.ajax('POST', 'tables/' + tableId + '/columns', callback, JSON.stringify(column));
                }, true);
            },
            /*sql*/
            sql: function (query, callback) {
                var selectIndex = query.toLowerCase().indexOf('select');
                var method = selectIndex > -1 && selectIndex < 10 ? 'GET' : 'POST';
                p.token.ensureAuth(function () {
                    p.ajax(method, 'query?sql=' + encodeURIComponent(query), callback);
                }, method === 'POST');
            }
        };
        return pub;
    }
);
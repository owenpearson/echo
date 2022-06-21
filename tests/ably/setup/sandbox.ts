import path from "path";
import fs from 'fs';
import { httpReqFunction } from "../../../src/channel/ably/utils";

let restHost = 'sandbox-rest.ably.io';
const tlsPort = 443;
const toBase64 = (text: string) => Buffer.from(text, 'binary').toString('base64');

const loadJsonData = (dataPath, callback) => {
    fs.readFile(path.join(__dirname, dataPath), (err, data: Buffer) => {
        if (err) {
            callback(err);
            return;
        }
        try {
            data = JSON.parse(data.toString());
        } catch (e) {
            callback(e);
            return;
        }
        callback(null, data);
    });
}

const httpReq = httpReqFunction();

function prefixDomainWithEnvironment(domain, environment) {
    if (environment.toLowerCase() === 'production') {
        return domain;
    } else {
        return environment + '-' + domain;
    }
}

const creatNewApp = (callback) => {
    loadJsonData('test-app-setup.json', function (err, testData) {
        if (err) {
            callback(err);
            return;
        }
        var postData = JSON.stringify(testData.post_apps);
        var postOptions = {
            host: restHost,
            port: tlsPort,
            path: '/apps',
            method: 'POST',
            scheme: 'https',
            headers: { Accept: 'application/json', 'Content-Type': 'application/json', 'Content-Length': postData.length },
            body: postData,
        };

        httpReq(postOptions, function (err, res) {
            if (err) {
                callback(err);
            } else {
                if (typeof res === 'string') res = JSON.parse(res);
                if (res.keys.length != testData.post_apps.keys.length) {
                    callback('Failed to create correct number of keys for app');
                } else if (res.namespaces.length != testData.post_apps.namespaces.length) {
                    callback('Failed to create correct number of namespaces for app');
                } else {
                    var testApp = {
                        accountId: res.accountId,
                        appId: res.appId,
                        keys: res.keys,
                        cipherConfig: testData.cipher,
                    };
                    callback(null, testApp);
                }
            }
        });
    });
}

const deleteApp = (app, callback) => {
    var authKey = app.keys[0].keyStr,
        authHeader = toBase64(authKey);

    var delOptions = {
        host: restHost,
        port: tlsPort,
        method: 'DELETE',
        path: '/apps/' + app.appId,
        scheme: 'https',
        headers: { Authorization: 'Basic ' + authHeader },
    };

    httpReq(delOptions, function (err) {
        callback(err);
    });
}

export { creatNewApp as setup, deleteApp as tearDown }
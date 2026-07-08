const patchRequestCredentials = `
;(function(window) {
    if(window.__W7_WUJIE_REQUEST_CREDENTIALS_PATCHED__){
        return;
    }
    window.__W7_WUJIE_REQUEST_CREDENTIALS_PATCHED__ = true;

    function getRequestUrl(input) {
        if(!input){
            return '';
        }
        if(typeof input === 'string'){
            return input;
        }
        if(typeof window.URL === 'function' && input instanceof window.URL){
            return input.href;
        }
        return input.url || input.href || '';
    }

    function shouldIncludeCredentials(input) {
        var url = getRequestUrl(input);
        if(!url){
            return false;
        }
        return !/^(data:|blob:|javascript:|about:)/i.test(url);
    }

    var rawFetch = window.fetch;
    if(typeof rawFetch === 'function'){
        window.fetch = function(input, init) {
            var inputCredentials = input && typeof input === 'object' ? input.credentials : undefined;
            var initCredentials = init && init.credentials;
            var shouldKeepCredentials = initCredentials === 'omit' || (!init && inputCredentials === 'omit');
            var nextInit = init;

            if(!shouldKeepCredentials && shouldIncludeCredentials(input) && (!initCredentials || initCredentials === 'same-origin')){
                nextInit = Object.assign({}, init || {}, { credentials: 'include' });
            }
            return rawFetch.call(this, input, nextInit);
        };
    }

    var RawXMLHttpRequest = window.XMLHttpRequest;
    if(typeof RawXMLHttpRequest === 'function'){
        var WrappedXMLHttpRequest = function() {
            var xhr = new RawXMLHttpRequest();
            var rawOpen = xhr.open;
            var rawSend = xhr.send;

            xhr.open = function() {
                xhr.__W7_WUJIE_REQUEST_URL__ = arguments[1];
                return rawOpen.apply(xhr, arguments);
            };
            xhr.send = function() {
                if(shouldIncludeCredentials(xhr.__W7_WUJIE_REQUEST_URL__)){
                    try {
                        xhr.withCredentials = true;
                    } catch (e) {}
                }
                return rawSend.apply(xhr, arguments);
            };
            return xhr;
        };

        WrappedXMLHttpRequest.prototype = RawXMLHttpRequest.prototype;
        Object.keys(RawXMLHttpRequest).forEach(function(key) {
            try {
                WrappedXMLHttpRequest[key] = RawXMLHttpRequest[key];
            } catch (e) {}
        });
        ['UNSENT', 'OPENED', 'HEADERS_RECEIVED', 'LOADING', 'DONE'].forEach(function(key) {
            try {
                WrappedXMLHttpRequest[key] = RawXMLHttpRequest[key];
            } catch (e) {}
        });
        window.XMLHttpRequest = WrappedXMLHttpRequest;
    }
})(window);`;

export function createWujieRequestCredentialsPlugin() {
    return {
        jsBeforeLoaders: [{
            content: patchRequestCredentials,
        }],
    };
}

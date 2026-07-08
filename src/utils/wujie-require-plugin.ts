function normalizeSrc(src) {
    return String(src || '').replace(/^https?:/, '');
}

function isW7RequireScript(src) {
    return /(?:^|\/|\.\/)resource\/js\/require\.js(?:\?|$)/.test(normalizeSrc(src));
}

function isW7JqueryScript(src) {
    return /(?:^|\/|\.\/)resource\/js\/lib\/jquery-1\.11\.1\.min\.js(?:\?|$)/.test(normalizeSrc(src));
}

function exposeRequireGlobals(code, url) {
    if(!isW7RequireScript(url)){
        return code;
    }

    return `${code}
;(function(window) {
    try {
        var requirejsFn = typeof requirejs === 'function' ? requirejs : (typeof window.requirejs === 'function' ? window.requirejs : null);
        var requireFn = typeof require === 'function' ? require : (typeof window.require === 'function' ? window.require : null);
        var defineFn = typeof define === 'function' ? define : (typeof window.define === 'function' ? window.define : null);

        if(requirejsFn && typeof window.requirejs !== 'function'){
            window.requirejs = requirejsFn;
        }
        if(typeof window.requirejs === 'function' && !requireFn){
            requireFn = window.requirejs;
        }
        if(requireFn && typeof window.require !== 'function'){
            window.require = requireFn;
        }
        if(defineFn && typeof window.define !== 'function'){
            window.define = defineFn;
        }

        if(typeof window.require === 'function'){
            window.__W7_WUJIE_REQUIRE_READY__ = true;
            window.__W7_WUJIE_RELEASE_READY__ && window.__W7_WUJIE_RELEASE_READY__();
        }
    } catch (e) {}
})(window);`;
}

function queueJqueryReady(code, url) {
    if(!isW7JqueryScript(url)){
        return code;
    }

    return `${code}
;(function(window) {
    var $ = window.jQuery;
    if(!$ || !$.fn || $.__W7_WUJIE_READY_QUEUE__){
        return;
    }
    var originalReady = $.fn.ready;
    var queue = [];
    if(typeof window.require !== 'function' && typeof window.requirejs === 'function'){
        window.require = window.requirejs;
    }
    var locked = typeof window.require !== 'function';
    $.fn.ready = function(fn) {
        if(locked && typeof fn === 'function'){
            queue.push({ target: this, fn: fn });
            return this;
        }
        return originalReady.apply(this, arguments);
    };
    window.__W7_WUJIE_RELEASE_READY__ = function() {
        if(!locked){
            return;
        }
        if(typeof window.require !== 'function' && typeof window.requirejs === 'function'){
            window.require = window.requirejs;
        }
        locked = false;
        var tasks = queue.slice();
        queue.length = 0;
        tasks.forEach(function(task) {
            originalReady.call(task.target, task.fn);
        });
    };
    $.__W7_WUJIE_READY_QUEUE__ = true;
    if(window.__W7_WUJIE_REQUIRE_READY__){
        window.__W7_WUJIE_RELEASE_READY__();
    }
})(window);`;
}

function loadRequireRuntimeJs(code, url) {
    return exposeRequireGlobals(queueJqueryReady(code, url), url);
}

export function createWujieRequirePlugin() {
    return {
        jsLoader: loadRequireRuntimeJs,
        jsAfterLoaders: [{
            content: `
;try {
    if(typeof window.require !== 'function' && typeof window.requirejs === 'function') window.require = window.requirejs;
    window.__W7_WUJIE_RELEASE_READY__ && window.__W7_WUJIE_RELEASE_READY__();
} catch (e) {}`,
        }],
    };
}

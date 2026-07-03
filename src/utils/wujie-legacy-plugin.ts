function normalizeSrc(src) {
    return String(src || '').replace(/^https?:/, '');
}

function isW7RequireScript(src) {
    return /(?:^|\/|\.\/)resource\/js\/require\.js(?:\?|$)/.test(normalizeSrc(src));
}

function isW7JqueryScript(src) {
    return /(?:^|\/|\.\/)resource\/js\/lib\/jquery-1\.11\.1\.min\.js(?:\?|$)/.test(normalizeSrc(src));
}

function normalizeSelfTargets(code) {
    return code
        .replace(/\starget\s*=\s*(["'])_?self\1/gi, ' target="_self"')
        .replace(/\starget\s*=\s*_?self(?=[\s>])/gi, ' target="_self"');
}

function loadLegacyHtml(code) {
    return normalizeSelfTargets(code);
}

function isSelfTarget(value) {
    return /^_?self$/i.test(String(value || '').trim());
}

function shouldNormalizeSelfTarget(value) {
    return isSelfTarget(value) && String(value || '').trim() !== '_self';
}

function patchAnchorTarget(node) {
    if(!node || node.nodeType !== 1){
        return;
    }

    const patch = (anchor) => {
        if(shouldNormalizeSelfTarget(anchor.getAttribute('target'))){
            anchor.setAttribute('target', '_self');
        }
    };

    if(String(node.tagName || '').toLowerCase() === 'a'){
        patch(node);
    }

    if(typeof node.querySelectorAll === 'function'){
        node.querySelectorAll('a[target]').forEach(patch);
    }
}

function exposeRequireGlobals(code, url) {
    if(!isW7RequireScript(url)){
        return code;
    }

    return `${code}
;try {
    window.requirejs = window.requirejs || requirejs;
    window.require = window.require || require;
    window.define = window.define || define;
} catch (e) {}`;
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
    var locked = true;
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
        locked = false;
        var tasks = queue.slice();
        queue.length = 0;
        tasks.forEach(function(task) {
            originalReady.call(task.target, task.fn);
        });
    };
    $.__W7_WUJIE_READY_QUEUE__ = true;
})(window);`;
}

function loadLegacyJs(code, url) {
    return exposeRequireGlobals(queueJqueryReady(code, url), url);
}

export function createWujieLegacyPlugin() {
    return {
        htmlLoader: loadLegacyHtml,
        jsLoader: loadLegacyJs,
        jsAfterLoaders: [{
            content: `
;try {
    window.__W7_WUJIE_RELEASE_READY__ && window.__W7_WUJIE_RELEASE_READY__();
} catch (e) {}`,
        }, {
            content: `
;(function() {
    function isSelfTarget(value) {
        return /^_?self$/i.test(String(value || '').trim());
    }

    function shouldNormalizeSelfTarget(value) {
        return isSelfTarget(value) && String(value || '').trim() !== '_self';
    }

    function closestAnchor(node) {
        while(node && node !== document){
            if(node.nodeType === 1 && String(node.tagName || '').toLowerCase() === 'a'){
                return node;
            }
            node = node.parentNode;
        }
        return null;
    }

    function shouldNavigateBySelf(anchor, event) {
        if(!anchor || !isSelfTarget(anchor.getAttribute('target'))){
            return false;
        }
        if(event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey){
            return false;
        }
        if(anchor.hasAttribute('download')){
            return false;
        }
        var href = anchor.getAttribute('href');
        if(!href || /^\\s*(javascript:|mailto:|tel:)/i.test(href)){
            return false;
        }
        return !!anchor.href;
    }

    function patchAnchor(anchor) {
        if(anchor && shouldNormalizeSelfTarget(anchor.getAttribute('target'))){
            anchor.setAttribute('target', '_self');
        }
    }
    function patchAnchors(root) {
        if(!root || root.nodeType !== 1){
            return;
        }
        if(String(root.tagName || '').toLowerCase() === 'a'){
            patchAnchor(root);
        }
        if(typeof root.querySelectorAll === 'function'){
            root.querySelectorAll('a[target]').forEach(patchAnchor);
        }
    }
    patchAnchors(document.documentElement);
    if(!window.__W7_WUJIE_SELF_OPEN_HANDLER__){
        window.__W7_WUJIE_SELF_OPEN_HANDLER__ = true;
        document.addEventListener('click', function(event) {
            var anchor = closestAnchor(event.target);
            if(!shouldNavigateBySelf(anchor, event)){
                return;
            }
            event.preventDefault();
            window.location.href = anchor.href;
        }, false);
    }
    if(window.MutationObserver && !window.__W7_WUJIE_ANCHOR_OBSERVER__){
        window.__W7_WUJIE_ANCHOR_OBSERVER__ = new MutationObserver(function(records) {
            records.forEach(function(record) {
                if(record.type === 'attributes'){
                    patchAnchors(record.target);
                    return;
                }
                record.addedNodes && record.addedNodes.forEach(patchAnchors);
            });
        });
        window.__W7_WUJIE_ANCHOR_OBSERVER__.observe(document.documentElement, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['target'],
        });
    }
})();`,
        }],
        patchElementHook: patchAnchorTarget,
        appendOrInsertElementHook: patchAnchorTarget,
    };
}

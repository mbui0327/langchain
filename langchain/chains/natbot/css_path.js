/*
 * Copyright (C) 2015 Pavel Savshenko
 * Copyright (C) 2011 Google Inc.  All rights reserved.
 * Copyright (C) 2007, 2008 Apple Inc.  All rights reserved.
 * Copyright (C) 2008 Matt Lilek <webkit@mattlilek.com>
 * Copyright (C) 2009 Joseph Pecoraro
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions
 * are met:
 *
 * 1.  Redistributions of source code must retain the above copyright
 *     notice, this list of conditions and the following disclaimer.
 * 2.  Redistributions in binary form must reproduce the above copyright
 *     notice, this list of conditions and the following disclaimer in the
 *     documentation and/or other materials provided with the distribution.
 * 3.  Neither the name of Apple Computer, Inc. ("Apple") nor the names of
 *     its contributors may be used to endorse or promote products derived
 *     from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY APPLE AND ITS CONTRIBUTORS "AS IS" AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL APPLE OR ITS CONTRIBUTORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF
 * THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

var UTILS = {};
UTILS.cssPath = function (node, optimized) {
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    var steps = [];
    var contextNode = node;
    // console.log(node);
    while (contextNode) {
        var step = UTILS._cssPathStep(contextNode, !!optimized, contextNode === node);
        // console.log(step);
        if (!step) break; // Error - bail out early.
        steps.push(step);
        if (step.optimized) break;
        contextNode = contextNode.parentNode;
    }
    steps.reverse();
    return steps.join(" > ");
};

UTILS._cssPathStep = function (node, optimized, isTargetNode) {
    if (node.nodeType !== Node.ELEMENT_NODE) return null;

    var id = node.getAttribute("id");
    if (optimized) {
        if (id) return new UTILS.DOMNodePathStep(idSelector(id), true);
        var nodeNameLower = node.nodeName.toLowerCase();
        if (nodeNameLower === "body" || nodeNameLower === "head" || nodeNameLower === "html")
            return new UTILS.DOMNodePathStep(node.nodeName.toLowerCase(), true);
    }
    var nodeName = node.nodeName.toLowerCase();

    // if (id) return new UTILS.DOMNodePathStep(nodeName.toLowerCase() + idSelector(id), true);
    // if (id) return new UTILS.DOMNodePathStep(nodeName.toLowerCase() + idSelector(id), false);
    var parent = node.parentNode;
    if (!parent || parent.nodeType === Node.DOCUMENT_NODE)
        return new UTILS.DOMNodePathStep(nodeName.toLowerCase(), true);

    /**
     * @param {UTILS.DOMNode} node
     * @return {Array.<string>}
     */
    function prefixedElementClassNames(node) {
        var classAttribute = node.getAttribute("class");
        if (!classAttribute) return [];
        // if (node.nodeName.toLowerCase() == "span") {
            // console.log(
            //     "classAttribute: ",
            //     classAttribute,
            //     classAttribute
            //         .split(/\s+/g)
            //         // .filter(Boolean)
            //         .map(function (name) {
            //             // The prefix is required to store "__proto__" in a object-based map.
            //             return "$" + name;
            //         })
            // );
        // }
        return (
            classAttribute
                .split(/\s+/g)
                // .filter(Boolean)
                .map(function (name) {
                    // The prefix is required to store "__proto__" in a object-based map.
                    return "$" + name;
                })
        );
    }

    /**
     * @param {string} id
     * @return {string}
     */
    function idSelector(id) {
        return "#" + escapeIdentifierIfNeeded(id);
    }

    /**
     * @param {string} ident
     * @return {string}
     */
    function escapeIdentifierIfNeeded(ident) {
        if (isCSSIdentifier(ident)) return ident;
        var shouldEscapeFirst = /^(?:[0-9]|-[0-9-]?)/.test(ident);
        var lastIndex = ident.length - 1;
        return ident.replace(/./g, function (c, i) {
            return (shouldEscapeFirst && i === 0) || !isCSSIdentChar(c)
                ? escapeAsciiChar(c, i === lastIndex)
                : c;
        });
    }

    /**
     * @param {string} c
     * @param {boolean} isLast
     * @return {string}
     */
    function escapeAsciiChar(c, isLast) {
        return "\\" + toHexByte(c) + (isLast ? "" : " ");
    }

    /**
     * @param {string} c
     */
    function toHexByte(c) {
        var hexByte = c.charCodeAt(0).toString(16);
        if (hexByte.length === 1) hexByte = "0" + hexByte;
        return hexByte;
    }

    /**
     * @param {string} c
     * @return {boolean}
     */
    function isCSSIdentChar(c) {
        if (/[a-zA-Z0-9_-]/.test(c)) return true;
        return c.charCodeAt(0) >= 0xa0;
    }

    /**
     * @param {string} value
     * @return {boolean}
     */
    function isCSSIdentifier(value) {
        return /^-?[a-zA-Z_][a-zA-Z0-9_-]*$/.test(value);
    }

    var prefixedOwnClassNamesArray = prefixedElementClassNames(node);
    // var needsClassNames = false;
    var needsClassNames = true;
    var needsNthChild = false;
    var ownIndex = -1;
    var siblings = parent.children;
    // console.log(nodeName);
    // if (nodeName == "li") {
    //     console.log("Own class: ", prefixedOwnClassNamesArray);
    //     console.log("Sibbling: ", siblings);
    // }

    // if (nodeName == "span") {
    //     console.log(
    //         "span bfore sibling process prefixedOwnClassNamesArray: ",
    //         prefixedOwnClassNamesArray,
    //         prefixedOwnClassNamesArray.length
    //     );
    // }

    for (var i = 0; (ownIndex === -1 || !needsNthChild) && i < siblings.length; ++i) {
        var sibling = siblings[i];
        if (sibling === node) {
            ownIndex = i;
            continue;
        }
        if (needsNthChild) continue;
        if (sibling.nodeName.toLowerCase() !== nodeName.toLowerCase()) continue;

        needsClassNames = true;
        var ownClassNames = prefixedOwnClassNamesArray.slice();
        var ownClassNameCount = prefixedOwnClassNamesArray.length;

        if (ownClassNameCount === 0) {
            needsNthChild = true;
            continue;
        }
        var siblingClassNamesArray = prefixedElementClassNames(sibling);
        // if (nodeName == "span") {
        //     console.log(
        //         "siblingClassNamesArray, ownClassNameCount: ",
        //         siblingClassNamesArray,
        //         ownClassNameCount
        //     );
        // }
        for (var j = 0; j < siblingClassNamesArray.length; ++j) {
            var siblingClass = siblingClassNamesArray[j];
            // if (nodeName == "span") {
            //     console.log(
            //         "siblingClass inside for loop: ",
            //         siblingClass,
            //         ownClassNames,
            //         ownClassNames.indexOf(siblingClass)
            //     );
            // }
            var classIndex = ownClassNames.indexOf(siblingClass);
            if (classIndex == -1) continue;
            ownClassNames.splice(classIndex, 1);
            // if (nodeName == "span") {
            //     console.log("ownClassNames after delete: ", ownClassNames, ownClassNameCount-1);
            // }
            if (!--ownClassNameCount) {
                needsNthChild = true;
                break;
            }
        }
    }

    // if (nodeName == "span") {
    //     console.log(
    //         "span after sibling process prefixedOwnClassNamesArray: ",
    //         prefixedOwnClassNamesArray,
    //         ownClassNameCount,
    //         needsNthChild
    //     );
    // }

    var result = nodeName.toLowerCase();
    
    if (id) result += idSelector(id);

    if (
        isTargetNode &&
        nodeName.toLowerCase() === "input" &&
        node.getAttribute("type") &&
        !node.getAttribute("id") &&
        !node.getAttribute("class")
    )
        result += '[type="' + node.getAttribute("type") + '"]';

    if (needsClassNames) {
        for (var prefixedName in prefixedOwnClassNamesArray) {
            try {
                // console.log(
                //     prefixedName,
                //     prefixedOwnClassNamesArray[prefixedName],
                //     prefixedOwnClassNamesArray[prefixedName].substring(1),
                //     escapeIdentifierIfNeeded(prefixedOwnClassNamesArray[prefixedName].substring(1))
                // );
                className = escapeIdentifierIfNeeded(
                    prefixedOwnClassNamesArray[prefixedName].substring(1)
                );
                if (className != "") {
                    result += "." + className;
                }
            } catch (exception) {
                // console.error(exception)
            }
        }
    }

    if (needsNthChild) {
        result += ":nth-child(" + (ownIndex + 1) + ")";
    }

    return new UTILS.DOMNodePathStep(result, false);
};

/**
 * @constructor
 * @param {string} value
 * @param {boolean} optimized
 */
UTILS.DOMNodePathStep = function (value, optimized) {
    this.value = value;
    this.optimized = optimized || false;
};

UTILS.DOMNodePathStep.prototype = {
    /**
     * @return {string}
     */
    toString: function () {
        return this.value;
    },
};

function getIndex(node) {
    let i = 1;
    let tagName = node.tagName;

    while (node.previousSibling) {
        node = node.previousSibling;
        if (node.nodeType === 1 && tagName.toLowerCase() == node.tagName.toLowerCase()) {
            i++;
        }
    }
    return i;
}

function generateSelector(context) {
    let index, pathSelector, localName;

    if (context == "null") throw "not an dom reference";
    // call getIndex function
    index = getIndex(context);

    while (context.tagName) {
        // selector path
        pathSelector = context.localName + (pathSelector ? ">" + pathSelector : "");
        context = context.parentNode;
    }
    // selector path for nth of type
    pathSelector = pathSelector + `:nth-of-type(${index})`;
    return pathSelector;
}

Events = ["click", "mouseover", "keydown", "keyup", "mousemove"];

Events.map((event) => window.removeEventListener(event, datajam_eventhandler));
Events.map((event) => window.addEventListener(event, datajam_eventhandler));

let anchorSelectionFirstTarget;
let mousePosition;
let selectedArea;
const SELECT_ANCHORS = "select_anchors";
const ADD_ANCHORS = "add_anchors";
const SELECT_LIST = "select_list";
const REMOVE_SELECTIONS = "remove_selections";
const ANCHOR_ADD_KEY = "KeyA";
const SELECTION_REMOVE_KEY = "KeyD";
let anchorSelectionEvent;

function datajam_eventhandler(event) {
    select_main_instance_elements(event);
    select_other_instances(event);
    // console.log("Key map: ", keyMap);
}

function select_other_instances(event) {
    // if (event.shiftKey && event.type == "click") {
    //     //selector = generateSelector(event.target);
    //     selector = UTILS.cssPath(event.target);
    //     console.log({ event: SELECT_LIST, target: selector });
    // }

    if (event.shiftKey && event.type == "mousemove") {
        selector = UTILS.cssPath(event.target);
        console.log({ event: SELECT_LIST, target: selector });
    }
}

function select_main_instance_elements(event) {
    if (event.code == "ControlLeft" && event.type == "keydown") {
        selectedArea = {};
        anchorSelectionEvent = SELECT_ANCHORS;
    } else if (["ControlLeft", ANCHOR_ADD_KEY].includes(event.code) && event.type == "keyup") {
        if (anchorSelectionEvent && anchorSelectionFirstTarget) {
            selectedArea["end"] = mousePosition;
            selectedBoundingBox = getBoudingBox(selectedArea);
            targetElement = getParentOfRect(anchorSelectionFirstTarget, selectedBoundingBox);
            selector = UTILS.cssPath(targetElement);
            console.log({
                event: anchorSelectionEvent,
                target: selector,
            });
            anchorSelectionEvent = null;
            anchorSelectionFirstTarget = null;
        }
    } else if (event.ctrlKey && event.type == "mousemove") {
        mousePosition = { x: event.clientX, y: event.clientY };
        if (anchorSelectionEvent && !anchorSelectionFirstTarget) {
            selectedArea["start"] = mousePosition;
            anchorSelectionFirstTarget = event.target;
        }
    } else if (event.code == ANCHOR_ADD_KEY && event.type == "keydown" && event.ctrlKey) {
        anchorSelectionEvent = ADD_ANCHORS;
    } else if (event.code == SELECTION_REMOVE_KEY && event.type == "keydown" && event.ctrlKey) {
        console.log({
            event: REMOVE_SELECTIONS,
            target: null
        });
    }
}

function getBoudingBox(area) {
    let boundingBox = {};

    boundingBox["left"] = Math.min(area["start"]["x"], area["end"]["x"]);
    boundingBox["right"] = Math.max(area["start"]["x"], area["end"]["x"]);

    boundingBox["top"] = Math.min(area["start"]["y"], area["end"]["y"]);
    boundingBox["bottom"] = Math.max(area["start"]["y"], area["end"]["y"]);

    return boundingBox;
}

function getParentOfRect(targetElement, rect) {
    elemRect = targetElement.getBoundingClientRect();

    while (
        (elemRect["left"] > rect["left"] ||
            elemRect["right"] < rect["right"] ||
            elemRect["top"] > rect["top"] ||
            elemRect["bottom"] < rect["bottom"]) &&
        targetElement.parentElement != null
    ) {
        // console.log("Elem: ", {'left': elemRect.left, 'right': elemRect.right, 'top': elemRect.top, 'bottom': elemRect.bottom});
        // console.log("Rect: ", rect);
        // console.log("Parent: ", targetElement.parentElement);
        targetElement = targetElement.parentElement;
        elemRect = targetElement.getBoundingClientRect();
    }
    // console.log("Elem: ", {
    //     left: elemRect.left,
    //     right: elemRect.right,
    //     top: elemRect.top,
    //     bottom: elemRect.bottom,
    // });
    // console.log("Rect: ", rect);
    // console.log("Parent: ", targetElement.parentElement);
    return targetElement;
}

function isFullyCover(targetElementRect, area) {
    targetElementRect[x] < area;
}

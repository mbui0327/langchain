Events = ["click", "mouseover", "keydown", "keyup", "mousemove"];

Events.map((event) => window.removeEventListener(event, datajam_eventhandler));
Events.map((event) => window.addEventListener(event, datajam_eventhandler));

let elementSelecting = false;
let selectionStarted = false;
let multipleSelectionFirstTarget;
let mousePosition;
let selectedArea;

function datajam_eventhandler(event) {
    if (event.type == "click" && event.metaKey) {
        //selector = generateSelector(event.target);
        selector = UTILS.cssPath(event.target);
        console.log({ event: "select", target: selector });
        event.stopPropagation();
        event.preventDefault();
    } else if (event.type == "mouseover" && event.shiftKey) {
        //selector = generateSelector(event.target);
        selector = UTILS.cssPath(event.target);
        console.log({ event: "select_list", target: selector });
        event.stopPropagation();
        event.preventDefault();
    } else if (event.type == "keydown" && event.ctrlKey) {
        selectedArea = {};
        elementSelecting = true;
        selectionStarted = false;
        // console.log("selectingStarted");
        event.stopPropagation();
        event.preventDefault();
    } else if (event.type == "keyup") {
        if (elementSelecting && selectionStarted) {
            selectedArea["end"] = mousePosition;
            selectedBoundingBox = getBoudingBox(selectedArea);            
            targetElement = getParentOfRect(multipleSelectionFirstTarget, selectedBoundingBox);
            selector = UTILS.cssPath(targetElement);
            // console.log("end position", mousePosition);
            elementSelecting = false;
            console.log({
                event: "select_multiple",
                target: selector,
                // boundingBox: selectedBoundingBox,
            });
            event.stopPropagation();
            event.preventDefault();
        }
    } else if (event.type == "mousemove" && event.ctrlKey) {
        mousePosition = { x: event.clientX, y: event.clientY };
        if (elementSelecting && !selectionStarted) {
            selectedArea["start"] = mousePosition;            
            multipleSelectionFirstTarget = event.target;
            // console.log("start position", mousePosition);
            selectionStarted = true;
            event.stopPropagation();
            event.preventDefault();
        }
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

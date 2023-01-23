# flake8: noqa
# type: ignore
import time
from sys import platform

black_listed_elements = {
    "html",
    "head",
    "title",
    "meta",
    "iframe",
    "body",
    "script",
    "style",
    "path",
    # "svg",
    "br",
    "::marker",
}


class Crawler(object):
    def __init__(self):
        try:
            # from playwright.sync_api import sync_playwright
            from playwright.async_api import async_playwright
        except ImportError:
            raise ValueError(
                "Could not import playwright python package. "
                "Please it install it with `pip install playwright`."
            )
        self.browser = async_playwright().chromium.launch(headless=False)
        self.page = self.browser.new_page()
        self.page.set_viewport_size({"width": 1280, "height": 1080})

    async def __new__(cls, *a, **kw):
        instance = super().__new__(cls)
        await instance.__init__(*a, **kw)
        return instance

    async def __init__(self):
        from playwright.async_api import async_playwright
        playwright = await async_playwright().start()
        self.browser = await playwright.chromium.launch_persistent_context(
            "/Users/bachbui/Library/Application Support/Google/Chrome/Profile 10", headless=False, executable_path="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome")
        # self.browser = await playwright.chromium.launch(headless=False)
        self.page = await self.browser.new_page()
        # await self.page.set_viewport_size({"width": 1280, "height": 1080})

    async def close_browser(self):
        await self.browser.close()

    async def go_to_page(self, url):
        await self.page.goto(url=url if "://" in url else "http://" + url)
        self.client = await self.page.context.new_cdp_session(self.page)
        self.page_element_buffer = {}

    async def scroll(self, direction):
        if direction == "up":
            await self.page.evaluate(
                "(document.scrollingElement || document.body).scrollTop = (document.scrollingElement || document.body).scrollTop - window.innerHeight;"
            )
        elif direction == "down":
            await self.page.evaluate(
                "(document.scrollingElement || document.body).scrollTop = (document.scrollingElement || document.body).scrollTop + window.innerHeight;"
            )

    async def remove_highlight(self):
        remove_highlight = """
var old_elems = document.getElementsByClassName("highlight");
while (old_elems.length > 0) {
    old_elems[0].remove();
}
"""
        await self.page.evaluate(remove_highlight)

    async def highlight_elements(self, ids = None):
        highlight_template = """
var elem = document.createElement('div');
elem.className = 'highlight';
elem.style.border = "2px dotted #0000FF";
elem.style.left = "{left}px";
elem.style.top = "{top}px";
elem.style.width = "{width}px";
elem.style.height = "{height}px";
elem.style.zIndex = 100;
elem.style.position = "absolute";
elem.style.pointerEvents = "none";
var text = document.createElement('div');
text.style.backgroundColor = "#808080";
text.style.color = "white";
text.innerHTML = {node_index};
text.style.width = "45px";
text.style.paddingLeft = "2px";
elem.appendChild(text);
var body = document.getElementsByTagName("body")[0];
body.appendChild(elem);
"""
        if ids and isinstance(ids, list):
            for idx in ids:
                element = self.page_element_buffer[idx]
                highlight = highlight_template.format(
                    idx=idx,
                    node_index=element['node_index'],
                    left=element['origin_x'],
                    top=element['origin_y'],
                    width=2 * (element['center_x']-element['origin_x']),
                    height=2 * (element['center_y']-element['origin_y'])
                )
                await self.page.evaluate(highlight)
        else:
            for idx, element in self.page_element_buffer.items():
                if element['node_name'] in ["button", "input", "a"]:
                    highlight = highlight_template.format(
                        idx=idx,
                        node_index=element['node_index'],
                        left=element['origin_x'],
                        top=element['origin_y'],
                        width=2 * (element['center_x']-element['origin_x']),
                        height=2 * (element['center_y']-element['origin_y'])
                    )
                    await self.page.evaluate(highlight)

    async def set_focus_elem_click_handler(self):   
        import os  
        dirname = os.path.dirname(__file__)
        css_path_file = os.path.join(dirname, "css_path.js")   
        with open(css_path_file, "r") as f:
            script = f.read()
            await self.page.evaluate(script)

        css_path_file = os.path.join(dirname, "selection_handler.js")
        with open(css_path_file, "r") as f:
            script = f.read()
            await self.page.evaluate(script)
        

    async def click(self, id):
        # Inject javascript into the page which removes the target= attribute from all links
        js = """
		links = document.getElementsByTagName("a");
		for (var i = 0; i < links.length; i++) {
			links[i].removeAttribute("target");
		}
        // window.scrollY        
		"""

        js_get_viewport = """
        () => { return { width: window.innerWidth, height: window.innerHeight } }
        """

        js_set_scroll = """
        window.scrollTo({{top: {top}, left: {left}, behavior: 'smooth'}});
        """

        viewport = await self.page.evaluate(js_get_viewport)
        element = self.page_element_buffer.get(int(id))
        element_center_x = element.get("center_x")
        element_center_y = element.get("center_y")
        
        scroll_left = int(element_center_x / viewport['width']) * viewport['width']
        ## adjust to position the element at the center of the page #
        if scroll_left > 0:
            scroll_left -= viewport['width']/2 - element_center_x % scroll_left
        
        scroll_top = int(element_center_y / viewport['height']) * viewport['height']
        ## adjust to position the element at the center of the page #
        if scroll_top > 0:
            scroll_top -= viewport['height']/2 - element_center_y % scroll_top

        print("Scroll left and top: ", scroll_left, scroll_top)
        if element:
            await self.page.evaluate(js_set_scroll.format(top=scroll_top, left=scroll_left))
            x = element_center_x - scroll_left
            y = element_center_y - scroll_top
            time.sleep(0.2)
            await self.page.mouse.click(x, y)
        else:
            print("Could not find element")

    async def type(self, id, text):
        await self.click(id)
        await self.page.keyboard.type(text)

    async def enter(self):
        await self.page.keyboard.press("Enter")

    async def crawl(self):
        page = self.page
        # refresh this every time we crawl
        self.page_element_buffer = {}
        page_element_buffer = self.page_element_buffer
        start = time.time()

        page_state_as_text = []

        device_pixel_ratio = await page.evaluate("window.devicePixelRatio")
        # if platform == "darwin" and device_pixel_ratio == 1:  # lies
        #     device_pixel_ratio = 2

        win_scroll_x = await page.evaluate("window.scrollX")
        win_scroll_y = await page.evaluate("window.scrollY")
        win_upper_bound = await page.evaluate("window.pageYOffset")
        win_left_bound = await page.evaluate("window.pageXOffset")
        win_width = await page.evaluate("window.screen.width")
        win_height = await page.evaluate("window.screen.height")
        win_right_bound = win_left_bound + win_width
        win_lower_bound = win_upper_bound + win_height
        document_offset_height = await page.evaluate("document.body.offsetHeight")
        document_scroll_height = await page.evaluate("document.body.scrollHeight")

        # 		percentage_progress_start = (win_upper_bound / document_scroll_height) * 100
        # 		percentage_progress_end = (
        # 			(win_height + win_upper_bound) / document_scroll_height
        # 		) * 100
        percentage_progress_start = 1
        percentage_progress_end = 2

        page_state_as_text.append(
            {
                "x": 0,
                "y": 0,
                "text": "[scrollbar {:0.2f}-{:0.2f}%]".format(
                    round(percentage_progress_start, 2), round(percentage_progress_end)
                ),
            }
        )

        tree = await self.client.send(
            "DOMSnapshot.captureSnapshot",
            {"computedStyles": [], "includeDOMRects": True, "includePaintOrder": True},
        )
        strings = tree["strings"]
        document = tree["documents"][0]
        nodes = document["nodes"]
        # print("String:\n", strings)
        # print("Docs:\n", tree["documents"])

        self.backend_node_id = nodes["backendNodeId"]
        attributes = nodes["attributes"]
        node_value = nodes["nodeValue"]
        parents = nodes["parentIndex"]
        node_types = nodes["nodeType"]
        node_names = nodes["nodeName"]
        is_clickable = set(nodes["isClickable"]["index"])
        # print("String:\n", strings)
        # print("Node name:\n", node_names)
        # print("Node type:\n", [(strings[node], parent)
        #                        for node, parent in zip(node_names, parents)])
        # print("Node parent:\n", parents)
        # print("Node value:\n", [(strings[node]) for node in node_value])

        # print("Node value:\n", node_value)

        text_value = nodes["textValue"]
        text_value_index = text_value["index"]
        text_value_values = text_value["value"]

        input_value = nodes["inputValue"]
        input_value_index = input_value["index"]
        input_value_values = input_value["value"]

        input_checked = nodes["inputChecked"]
        layout = document["layout"]
        layout_node_index = layout["nodeIndex"]
        bounds = layout["bounds"]

        cursor = 0
        html_elements_text = []

        clickable_ancestor_child_nodes = {}
        elements_in_view_port = []

        anchor_ancestry = {"-1": (False, None)}
        button_ancestry = {"-1": (False, None)}

        def convert_name(node_name, has_click_handler):
            return node_name
            if node_name == "a":
                return "link"
            if node_name == "input":
                return "input"
            if node_name == "img":
                return "img"
            if (
                node_name == "button" or has_click_handler
            ):  # found pages that needed this quirk
                return "button"
            else:
                return "text"

        def find_attributes(attributes, keys):
            values = {}

            for [key_index, value_index] in zip(*(iter(attributes),) * 2):
                if value_index < 0:
                    continue
                key = strings[key_index]
                value = strings[value_index]

                if key in keys:
                    values[key] = value
                    keys.remove(key)

                    if not keys:
                        return values

            return values

        CLICKABLE_TAGS = ['a', 'button']

        def update_clickable_descendant_tree(clickable_descendant_tree, node_id, node_name, parent_id):
            parent_id_str = str(parent_id)
            if not parent_id_str in clickable_descendant_tree:
                parent_name = strings[node_names[parent_id]].lower()
                grand_parent_id = parent[parent_id]

                update_clickable_descendant_tree(
                    clickable_descendant_tree, parent_id, parent_name, grand_parent_id
                )

            is_parent_desc_clickable, parent_clickable_id = clickable_descendant_tree[parent_id_str]

            # even if the anchor is nested in another anchor, we set the "root" for all descendants to be ::Self
            if node_name in CLICKABLE_TAGS:
                value = (True, node_id)
            elif is_parent_desc_clickable:
                # reuse the parent's anchor_id (which could be much higher in the tree)
                value = (True, parent_clickable_id)
            else:
                # not a descendant of an anchor, most likely it will become text, an interactive element or discarded
                value = (False, None)

            clickable_descendant_tree[str(node_id)] = value

            return value

        node_in_progress = []
        for index, node_name_index in enumerate(node_names):
            # print(index, node_name_index, parents[index])
            parent_index = parents[index]
            node_name = strings[node_name_index].lower()

            is_ancestor_clickable, clickable_id = update_clickable_descendant_tree(
                anchor_ancestry, index, node_name, parent_index
            )

            # is_ancestor_of_button, button_id = update_clickable_descendant_tree(
            #     button_ancestry, index, node_name, parent_index
            # )

            try:
                cursor = layout_node_index.index(
                    index
                )  # todo replace this with proper cursoring, ignoring the fact this is O(n^2) for the moment
            except:
                continue

            if node_name in black_listed_elements:
                continue

            [x, y, width, height] = bounds[cursor]
            x /= device_pixel_ratio
            y /= device_pixel_ratio
            width /= device_pixel_ratio
            height /= device_pixel_ratio

            elem_left_bound = x
            elem_top_bound = y
            elem_right_bound = x + width
            elem_lower_bound = y + height

            partially_is_in_viewport = (
                elem_left_bound < win_right_bound
                and elem_right_bound >= win_left_bound
                and elem_top_bound < win_lower_bound
                and elem_lower_bound >= win_upper_bound
            )

            # if not partially_is_in_viewport:
            #     continue

            meta_data = []

            # inefficient to grab the same set of keys for kinds of objects, but it's fine for now
            element_attributes = find_attributes(
                attributes[index], ["type", "placeholder", "aria-label", "title", "alt", "class"]
            )

            if is_ancestor_clickable:
                clickable_ancestor_node_id = str(clickable_id)
                clickable_ancestor_node = clickable_ancestor_child_nodes.setdefault(
                    clickable_ancestor_node_id, [])                
            else:
                clickable_ancestor_node_id = None
                clickable_ancestor_node = None
                

            if node_name == "#text" and is_ancestor_clickable:
                text = strings[node_value[index]]
                if text == "|" or text == "•":
                    continue
                clickable_ancestor_node.append({"type": "text", "value": text})
            else:
                if (
                    node_name == "input" and element_attributes.get("type") == "submit"
                ) or node_name == "button":
                    node_name = "button"
                    element_attributes.pop(
                        "type", None
                    )  # prevent [button ... (button)..]

                for key in element_attributes:
                    if is_ancestor_clickable:
                        clickable_ancestor_node.append(
                            {
                                "type": "attribute",
                                "key": key,
                                "value": element_attributes[key],
                            }
                        )
                    else:
                        meta_data.append(f'{key}="{element_attributes[key]}"')

            element_node_value = None

            if node_value[index] >= 0:
                element_node_value = strings[node_value[index]]
                if element_node_value == "|":
                    # commonly used as a seperator, does not add much context - lets save ourselves some token space
                    continue
            elif (
                node_name == "input"
                and index in input_value_index
                and element_node_value is None
            ):
                node_input_text_index = input_value_index.index(index)
                text_index = input_value_values[node_input_text_index]
                if node_input_text_index >= 0 and text_index >= 0:
                    element_node_value = strings[text_index]

            # remove nodes that are descendant of clickable
            # if is_ancestor_clickable and (node_name not in CLICKABLE_TAGS):
            #     continue

            elements_in_view_port.append(
                {
                    "node_index": str(index),
                    "backend_node_id": self.backend_node_id[index],
                    "node_name": node_name,
                    "node_value": element_node_value,
                    "node_meta": meta_data,
                    "is_clickable": index in is_clickable,
                    "origin_x": int(x),
                    "origin_y": int(y),
                    "center_x": int(x + (width / 2)),
                    "center_y": int(y + (height / 2)),
                    "parent_index": str(parent_index),
                }
            )

        # lets filter further to remove anything that does not hold any text nor has click handlers + merge text from leaf#text nodes with the parent
        elements_of_interest = []
        id_counter = 0

        for element in elements_in_view_port:            
            node_index = element.get("node_index")
            parent_index = element.get("parent_index")
            node_name = element.get("node_name")
            node_value = element.get("node_value")
            is_clickable = element.get("is_clickable")
            origin_x = element.get("origin_x")
            origin_y = element.get("origin_y")
            center_x = element.get("center_x")
            center_y = element.get("center_y")
            node_name_index = element.get("node_name_index")
            meta_data = element.get("node_meta")

            inner_text = f"{node_value} " if node_value else ""
            meta = ""            
            # if node_index in clickable_ancestor_child_nodes:
            #     for child in clickable_ancestor_child_nodes.get(node_index):
            #         entry_type = child.get("type")
            #         entry_value = child.get("value")

            #         if entry_type == "attribute":
            #             entry_key = child.get("key")
            #             meta_data.append(f'{entry_key}="{entry_value}"')
            #         else:
            #             inner_text += f"({entry_type}){entry_value} "

            if meta_data:
                meta_string = " ".join(meta_data)
                meta = f" {meta_string}"

            if inner_text != "":
                inner_text = f"{inner_text.strip()}"

            converted_node_name = convert_name(node_name, is_clickable)

            # print("name=%s, index=%s, text=%s, meta=%s, parent=%s, last=%s" % (node_name, node_index, inner_text.strip(), meta, parent_index,
            #     node_in_progress[-1]["node_index"] if len(node_in_progress) > 0 else None ))

            page_element_buffer[int(node_index)] = element
            ## close out if the current node's parent is not the last one in the queue #
            if len(node_in_progress) > 0:
                while len(node_in_progress) > 0 and node_in_progress[-1]["node_index"] != parent_index:
                    elements_of_interest.append(
                        node_in_progress[-1]["element_end_string"])
                    node_in_progress.pop()

            elements_of_interest.append(f"""<{converted_node_name} id="{node_index}" {meta}>{inner_text}""")

            node_in_progress.append(
                {"node_index": node_index, "element_end_string": f"""</{converted_node_name}>"""})

        print("Parsing time: {:0.2f} seconds".format(time.time() - start))
        return elements_of_interest
